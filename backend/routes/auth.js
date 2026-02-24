const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, is_active: user.is_active },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        // Role is always 'staff' on public registration — use /create-admin for admin accounts
        const role = 'staff';

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        }

        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows[0]) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, hashedPassword, phone, role]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.rows[0].id, name, email, role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Emergency endpoint to create/reset admin — requires SETUP_SECRET env var
router.post('/create-admin', async (req, res) => {
    try {
        const { email, password, name, setup_secret } = req.body;

        const requiredSecret = process.env.SETUP_SECRET;
        if (!requiredSecret || setup_secret !== requiredSecret) {
            return res.status(403).json({ success: false, error: 'Forbidden: invalid or missing setup_secret' });
        }

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required' });
        }

        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const existing = rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existing) {
            await db.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
            return res.json({ success: true, message: 'Admin password updated', email });
        }

        const result = await db.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, '', 'admin') RETURNING id",
            [name || 'System Administrator', email, hashedPassword]
        );

        res.json({ success: true, message: 'Admin user created', email, id: result.rows[0].id });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
