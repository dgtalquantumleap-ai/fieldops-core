const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { paginate } = require('../utils/dbHelper');
const { requireAuth } = require('../middleware/auth');

// Staff app: get jobs assigned to this staff member
router.get('/jobs', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   s.name as service_name, s.price as service_price
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.assigned_to = $1 AND j.status NOT IN ('Completed','Cancelled')
            ORDER BY j.job_date ASC, j.job_time ASC
        `, [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all staff members
router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await paginate(
            "SELECT id, name, email, phone, role, is_active, availability_status, created_at FROM users WHERE role != 'admin' ORDER BY name",
            "SELECT COUNT(*) as count FROM users WHERE role != 'admin'",
            page, limit
        );
        if (!result.success) return res.status(result.status || 500).json(result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch staff', code: 'FETCH_ERROR' });
    }
});

// Assign job to staff
router.patch('/jobs/:jobId/assign', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { staff_id } = req.body;
        const result = await db.query('UPDATE jobs SET assigned_to = $1 WHERE id = $2', [staff_id, jobId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
        const job = (await db.query('SELECT * FROM jobs WHERE id = $1', [jobId])).rows[0];
        const io = req.app.get('io');
        if (io) io.to('staff').emit('job-assigned', { job });
        res.json({ success: true, job, message: 'Job assigned successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update job status (for staff app)
router.patch('/jobs/:jobId/status', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status } = req.body;
        if (!['Scheduled','In Progress','Completed','Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const result = await db.query('UPDATE jobs SET status = $1 WHERE id = $2', [status, jobId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
        const job = (await db.query('SELECT * FROM jobs WHERE id = $1', [jobId])).rows[0];
        const io = req.app.get('io');
        if (io) { io.to('staff').emit('job-updated', { job }); io.to('admin').emit('job-updated', { job }); }

        if (status === 'Completed') {
            const { triggerAutomations } = require('../utils/realtime');
            const customer = (await db.query('SELECT * FROM customers WHERE id = $1', [job.customer_id])).rows[0];
            const service  = (await db.query('SELECT * FROM services WHERE id = $1', [job.service_id])).rows[0];
            await triggerAutomations('Job Completed', { customer_name: customer?.name, customer_email: customer?.email, service_name: service?.name, job_id: jobId }, io);
        }

        res.json({ success: true, job, message: `Job status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update staff availability status
router.patch('/:id/availability', requireAuth, async (req, res) => {
    try {
        const staffId = req.params.id;
        const { availability_status } = req.body;
        if (!['available','unavailable','on_leave'].includes(availability_status)) {
            return res.status(400).json({ error: 'Invalid availability_status. Use: available, unavailable, on_leave' });
        }
        if (req.user.role !== 'admin' && String(req.user.id) !== String(staffId)) {
            return res.status(403).json({ error: 'Not authorised' });
        }
        const result = await db.query('UPDATE users SET availability_status = $1 WHERE id = $2', [availability_status, staffId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Staff member not found' });
        const updated = (await db.query('SELECT id, name, availability_status FROM users WHERE id = $1', [staffId])).rows[0];
        const io = req.app.get('io');
        if (io) io.to('admin').emit('staff-availability-changed', { staff: updated });
        res.json({ success: true, staff: updated, message: `Availability set to ${availability_status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff member by ID
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, email, phone, role, is_active, availability_status, created_at FROM users WHERE id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Staff member not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new staff member
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;
        if (!name || !email || !role || !password) return res.status(400).json({ error: 'Name, email, role, and password are required' });

        const existing = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (name, email, phone, password, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, 1, NOW()) RETURNING id',
            [name, email, phone, hashedPassword, role]
        );
        const newStaff = (await db.query('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = $1', [result.rows[0].id])).rows[0];

        const io = req.app.get('io');
        if (io) io.to('admin').emit('staff-added', { staff: newStaff });
        res.json({ success: true, staff: newStaff, message: 'Staff member added successfully' });
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
        const updates = []; const values = []; let idx = 1;

        if (name)              { updates.push(`name = $${idx++}`);      values.push(name); }
        if (email)             { updates.push(`email = $${idx++}`);     values.push(email); }
        if (phone)             { updates.push(`phone = $${idx++}`);     values.push(phone); }
        if (role)              { updates.push(`role = $${idx++}`);      values.push(role); }
        if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
        values.push(staffId);

        const result = await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Staff member not found' });

        const updatedStaff = (await db.query('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = $1', [staffId])).rows[0];
        res.json({ success: true, staff: updatedStaff, message: 'Staff member updated successfully' });
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// Delete staff member (soft delete — mark inactive)
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query("UPDATE users SET is_active = 0 WHERE id = $1 AND role != 'admin'", [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Staff member not found', code: 'NOT_FOUND' });
        res.json({ success: true, message: 'Staff member deleted successfully' });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete staff member', code: 'DELETE_ERROR' });
    }
});

module.exports = router;
