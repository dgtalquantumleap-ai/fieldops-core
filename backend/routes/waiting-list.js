/**
 * Waiting List Route — /api/waiting-list
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const notifications = require('../utils/notifications');

// GET all waiting list entries (admin)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM waiting_list';
        const params = [];
        if (status && status !== 'all') {
            query += ' WHERE status = $1';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST — add to waiting list (called from booking route)
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, service, preferred_date, preferred_time, notes } = req.body;
        if (!name || !phone || !service) {
            return res.status(400).json({ success: false, error: 'name, phone, and service are required' });
        }
        const result = await db.query(
            `INSERT INTO waiting_list (name, phone, email, address, service, preferred_date, preferred_time, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [name, phone, email || null, address || null, service, preferred_date || null, preferred_time || null, notes || null]
        );
        const entry = result.rows[0];

        // Notify admin
        notifications.sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `⏳ Waiting List: ${name} wants ${service}`,
            html: `<h3>New Waiting List Entry</h3>
                   <p><strong>Name:</strong> ${name}</p>
                   <p><strong>Phone:</strong> ${phone}</p>
                   <p><strong>Service:</strong> ${service}</p>
                   <p><strong>Preferred Date:</strong> ${preferred_date || 'Flexible'}</p>
                   <p><strong>Preferred Time:</strong> ${preferred_time || 'Flexible'}</p>
                   <p>Log in to the admin dashboard to contact them and schedule a slot.</p>`
        }).catch(() => {});

        res.status(201).json({ success: true, data: entry, message: 'Added to waiting list' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /:id — update status (contacted, booked, removed)
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'contacted', 'booked', 'removed'];
        if (!valid.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        const result = await db.query(
            'UPDATE waiting_list SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Entry not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM waiting_list WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Entry not found' });
        res.json({ success: true, message: 'Entry removed' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
