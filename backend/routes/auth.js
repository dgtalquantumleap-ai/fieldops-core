const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user in database
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role = 'staff' } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email, and password are required' 
            });
        }
        
        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const result = db.prepare(`
            INSERT INTO users (name, email, password, phone, role)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, email, hashedPassword, phone, role);
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: result.lastInsertRowid,
                name,
                email,
                role
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Emergency endpoint to create admin user in production
router.post('/create-admin', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Check if admin already exists
        const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
        if (existingAdmin) {
            // Update password for existing admin
            const hashedPassword = await bcrypt.hash(password, 10);
            db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, email);
            
            return res.json({
                success: true,
                message: 'Admin password updated successfully',
                email: email
            });
        }
        
        // Create new admin user
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = db.prepare(`
            INSERT INTO users (name, email, password, phone, role)
            VALUES (?, ?, ?, ?, ?)
        `).run(name || 'System Administrator', email, hashedPassword, '', 'admin');
        
        res.json({
            success: true,
            message: 'Admin user created successfully',
            email: email,
            id: result.lastInsertRowid
        });
        
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
