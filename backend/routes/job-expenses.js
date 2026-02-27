/**
 * Job Expenses Route — /api/job-expenses
 * Staff can log supplies/costs per job; admin can view all.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/job-expenses?job_id=X  — expenses for a specific job
router.get('/', async (req, res) => {
    try {
        const { job_id } = req.query;
        let query = `
            SELECT e.*, u.name AS staff_name
            FROM job_expenses e
            LEFT JOIN users u ON e.staff_id = u.id
        `;
        const params = [];
        if (job_id) {
            query += ' WHERE e.job_id = $1';
            params.push(job_id);
        }
        query += ' ORDER BY e.created_at DESC';
        const { rows } = await db.query(query, params);
        const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
        res.json({ success: true, data: rows, total: parseFloat(total.toFixed(2)) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/job-expenses  — log a new expense
router.post('/', async (req, res) => {
    try {
        const { job_id, description, amount, category } = req.body;
        if (!job_id || !description || amount == null) {
            return res.status(400).json({ success: false, error: 'job_id, description, and amount are required' });
        }
        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({ success: false, error: 'amount must be a non-negative number' });
        }
        const result = await db.query(
            `INSERT INTO job_expenses (job_id, staff_id, description, amount, category)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [job_id, req.user?.id || null, description, parseFloat(amount), category || 'Supplies']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/job-expenses/:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM job_expenses WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Expense not found' });
        res.json({ success: true, message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
