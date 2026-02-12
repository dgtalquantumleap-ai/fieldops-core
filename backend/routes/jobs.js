const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT j.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as staff_name, u.email as staff_email,
                   s.name as service_name, s.price as service_price, s.description as service_description
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.assigned_to = u.id
            LEFT JOIN services s ON j.service_id = s.id
            ORDER BY j.created_at DESC
        `);
        const jobs = stmt.all();
        res.json(jobs);
    } catch (error) {
        console.error('Jobs API error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes } = req.body;
        const stmt = db.prepare(
            'INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        const result = stmt.run(customer_id, service_id, assigned_to, job_date, job_time, location, notes);
        res.status(201).json({ id: result.lastInsertRowid, customer_id, service_id, assigned_to, job_date, job_time, location, notes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const job = db.prepare(`
            SELECT j.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as staff_name, u.email as staff_email,
                   s.name as service_name, s.price as service_price, s.description as service_description
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.assigned_to = u.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.id = ?
        `).get(req.params.id);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update job
router.patch('/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        const { customer_id, service_id, assigned_to, job_date, job_time, location, notes, status } = req.body;
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        
        if (customer_id !== undefined) {
            updates.push('customer_id = ?');
            values.push(customer_id);
        }
        if (service_id !== undefined) {
            updates.push('service_id = ?');
            values.push(service_id);
        }
        if (assigned_to !== undefined) {
            updates.push('assigned_to = ?');
            values.push(assigned_to);
        }
        if (job_date !== undefined) {
            updates.push('job_date = ?');
            values.push(job_date);
        }
        if (job_time !== undefined) {
            updates.push('job_time = ?');
            values.push(job_time);
        }
        if (location !== undefined) {
            updates.push('location = ?');
            values.push(location);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(jobId);
        
        const updateJob = db.prepare(`
            UPDATE jobs 
            SET ${updates.join(', ')}
            WHERE id = ?
        `);
        
        const result = updateJob.run(...values);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const updatedJob = db.prepare(`
            SELECT j.*, 
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   u.name as staff_name, u.email as staff_email,
                   s.name as service_name, s.price as service_price, s.description as service_description
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.assigned_to = u.id
            LEFT JOIN services s ON j.service_id = s.id
            WHERE j.id = ?
        `).get(jobId);
        
        console.log(`📋 Job updated: ${updatedJob.customer_name} - ${updatedJob.service_name}`);
        
        res.json({
            success: true,
            job: updatedJob,
            message: 'Job updated successfully'
        });
        
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const stmt = db.prepare('UPDATE jobs SET status = ? WHERE id = ?');
        stmt.run(status, req.params.id);
        const getStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
        const job = getStmt.get(req.params.id);
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;