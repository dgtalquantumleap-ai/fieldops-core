// Add this to backend/routes/auth.js after the login route

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

module.exports = router;
