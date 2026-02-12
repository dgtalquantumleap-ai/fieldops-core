const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const stmt = db.prepare(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)'
        );
        const result = stmt.run(
            userData.name, 
            userData.email, 
            userData.phone, 
            hashedPassword, 
            userData.role || 'staff'
        );
        return { id: result.lastInsertRowid, ...userData, password: hashedPassword };
    }

    static async findByEmail(email) {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }

    static async findAll() {
        const stmt = db.prepare('SELECT id, name, email, phone, role, is_active FROM users');
        return stmt.all();
    }
}

module.exports = User;