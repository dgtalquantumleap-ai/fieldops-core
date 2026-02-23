const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { paginate } = require('../utils/dbHelper');
const { body, validationResult } = require('express-validator');

const validateCustomer = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone').trim().matches(/^[\d\s\-\(\)\+]+$/).withMessage('Invalid phone number format')
        .custom(value => {
            if (value.replace(/\D/g, '').length < 10) throw new Error('Phone must be at least 10 digits');
            return true;
        }),
    body('email').optional().trim().isEmail().withMessage('Invalid email format'),
    body('address').optional().trim().isLength({ max: 200 }).withMessage('Address must not exceed 200 characters'),
];

router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await paginate(
            'SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC',
            'SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL',
            page, limit
        );
        if (!result.success) return res.status(result.status || 500).json(result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch customers', code: 'FETCH_ERROR' });
    }
});

router.post('/', validateCustomer, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false, error: 'Validation failed',
            details: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
    }
    try {
        const { name, phone, email, address, notes } = req.body;
        const result = await db.query(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, phone, email, address, notes]
        );
        res.status(201).json({ id: result.rows[0].id, name, phone, email, address, notes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { name, phone, email, address, notes } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (name      !== undefined) { updates.push(`name = $${idx++}`);    values.push(name); }
        if (phone     !== undefined) { updates.push(`phone = $${idx++}`);   values.push(phone); }
        if (email     !== undefined) { updates.push(`email = $${idx++}`);   values.push(email); }
        if (address   !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
        if (notes     !== undefined) { updates.push(`notes = $${idx++}`);   values.push(notes); }

        if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        values.push(customerId);
        const result = await db.query(
            `UPDATE customers SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Customer not found' });

        const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        console.log(`👤 Customer updated: ${rows[0].name}`);
        res.json({ success: true, customer: rows[0], message: 'Customer updated successfully' });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found', code: 'NOT_FOUND' });
        }
        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete customer', code: 'DELETE_ERROR' });
    }
});

module.exports = router;
