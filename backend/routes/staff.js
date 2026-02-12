const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get jobs assigned to staff (for mobile staff app)
router.get('/jobs', async (req, res) => {
    try {
        // For now, return all jobs since we don't have staff assignment logic yet
        // In a real system, you'd filter by assigned_to = staff_id
        const stmt = db.prepare(`
            SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as service_name, s.price as service_price
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.status != 'Completed'
            ORDER BY j.job_date ASC, j.job_time ASC
        `);
        const jobs = stmt.all();
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all staff members
router.get('/', async (req, res) => {
    try {
        const stmt = db.prepare("SELECT * FROM users WHERE role != 'admin' ORDER BY name");
        const staff = stmt.all();
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign job to staff
router.patch('/jobs/:jobId/assign', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { staff_id } = req.body;
        
        const updateJob = db.prepare('UPDATE jobs SET assigned_to = ? WHERE id = ?');
        const result = updateJob.run(staff_id, jobId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        
        // Emit real-time update to staff
        const io = req.app.get('io');
        io.to('staff').emit('job-assigned', { job });
        
        res.json({
            success: true,
            job,
            message: 'Job assigned successfully'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update job status (for staff app)
router.patch('/jobs/:jobId/status', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status } = req.body;
        
        if (!['Scheduled', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const updateJob = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
        const result = updateJob.run(status, jobId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        
        // Emit real-time update
        const io = req.app.get('io');
        io.to('staff').emit('job-updated', { job });
        io.to('admin').emit('job-updated', { job });
        
        // Log activity
        const { emitRealTimeUpdate, logActivity, triggerAutomations } = require('../utils/realtime');
        logActivity(null, 'Staff', 'updated status to', 'job', jobId, status);
        
        // Trigger automations for job completion
        if (status === 'Completed') {
            const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(job.customer_id);
            const service = db.prepare('SELECT * FROM services WHERE id = ?').get(job.service_id);
            
            await triggerAutomations('Job Completed', {
                customer_name: customer.name,
                customer_email: customer.email,
                service_name: service.name,
                job_id: jobId
            }, io);
        }
        
        res.json({
            success: true,
            job,
            message: `Job status updated to ${status}`
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff member by ID
router.get('/:id', async (req, res) => {
    try {
        const staff = db.prepare('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new staff member
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, role, password, notes } = req.body;
        
        // Validate required fields
        if (!name || !email || !role || !password) {
            return res.status(400).json({ error: 'Name, email, role, and password are required' });
        }
        
        // Check if email already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Hash password (simple hash for demo - in production use bcrypt)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new staff member
        const insertStaff = db.prepare(`
            INSERT INTO users (name, email, phone, password, role, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        const result = insertStaff.run(name, email, phone, hashedPassword, role, 1);
        
        // Get created staff member
        const newStaff = db.prepare('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        
        console.log(`👤 New staff member added: ${name} (${role})`);
        
        // Emit real-time update
        const io = req.app.get('io');
        io.to('admin').emit('staff-added', { staff: newStaff });
        
        res.json({
            success: true,
            staff: newStaff,
            message: 'Staff member added successfully'
        });
        
    } catch (error) {
        console.error('Add staff error:', error);
        res.status(500).json({ error: 'Failed to add staff member' });
    }
});

// Update staff member
router.patch('/:id', async (req, res) => {
    try {
        const staffId = req.params.id;
        const { name, email, phone, role, is_active } = req.body;
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        
        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (phone) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (role) {
            updates.push('role = ?');
            values.push(role);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(staffId);
        
        const updateStaff = db.prepare(`
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = ?
        `);
        
        const result = updateStaff.run(...values);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        const updatedStaff = db.prepare('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?').get(staffId);
        
        console.log(`👤 Staff member updated: ${updatedStaff.name}`);
        
        res.json({
            success: true,
            staff: updatedStaff,
            message: 'Staff member updated successfully'
        });
        
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// Delete staff member
router.delete('/:id', async (req, res) => {
    try {
        const staffId = req.params.id;
        
        // Check if staff has assigned jobs
        const assignedJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE assigned_to = ?').get(staffId);
        if (assignedJobs.count > 0) {
            return res.status(400).json({ error: 'Cannot delete staff member with assigned jobs' });
        }
        
        // Delete staff member
        const deleteStaff = db.prepare('DELETE FROM users WHERE id = ?');
        const result = deleteStaff.run(staffId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        console.log(`👤 Staff member deleted: ID ${staffId}`);
        
        res.json({
            success: true,
            message: 'Staff member deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ error: 'Failed to delete staff member' });
    }
});

module.exports = router;
