const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
        const customers = stmt.all();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Check if customer has jobs
        const customerJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE customer_id = ?').get(customerId);
        if (customerJobs.count > 0) {
            return res.status(400).json({ error: 'Cannot delete customer with associated jobs' });
        }
        
        // Delete customer
        const deleteCustomer = db.prepare('DELETE FROM customers WHERE id = ?');
        const result = deleteCustomer.run(customerId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        console.log(`👤 Customer deleted: ID ${customerId}`);
        
        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

module.exports = router;