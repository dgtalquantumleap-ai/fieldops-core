const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { paginate } = require('../utils/dbHelper');

router.get('/', async (req, res) => {
    try {
        const { page, limit } = req.query;
        
        const baseQuery = 'SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC';
        const countQuery = 'SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL';
        
        const result = paginate(baseQuery, countQuery, page, limit);
        
        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch customers',
            code: 'FETCH_ERROR'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;
        const stmt = db.prepare(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(name, phone, email, address, notes);
        res.status(201).json({ id: result.lastInsertRowid, name, phone, email, address, notes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
    try {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update customer
router.patch('/:id', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { name, phone, email, address, notes } = req.body;
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        
        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            values.push(address);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(customerId);
        
        const updateCustomer = db.prepare(`
            UPDATE customers 
            SET ${updates.join(', ')}
            WHERE id = ?
        `);
        
        const result = updateCustomer.run(...values);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        
        console.log(`👤 Customer updated: ${updatedCustomer.name}`);
        
        res.json({
            success: true,
            customer: updatedCustomer,
            message: 'Customer updated successfully'
        });
        
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Soft delete customer
        const result = db.prepare(
            "UPDATE customers SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
        ).run(customerId);
        
        if (result.changes === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Customer not found',
                code: 'NOT_FOUND'
            });
        }
        
        console.log(`👤 Customer deleted: ID ${customerId}`);
        
        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete customer',
            code: 'DELETE_ERROR'
        });
    }
});

module.exports = router;