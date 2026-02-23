const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

// Initialize admin user if none exists (runs once on startup)
const initializeAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
        console.warn('⚠️  No ADMIN_EMAIL env var — admin user not auto-created.');
        return;
    }

    try {
        const { rows } = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1"
        );
        if (parseInt(rows[0].count) > 0) {
            console.log('✅ Admin user already exists');
            return;
        }

        const adminPassword = process.env.ADMIN_PASSWORD || (
            Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4)
        );
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminPhone = process.env.ADMIN_PHONE || null;

        await pool.query(
            `INSERT INTO users (name, email, password, role, phone, is_active, created_at)
             VALUES ($1, $2, $3, 'admin', $4, 1, NOW())
             ON CONFLICT (email) DO NOTHING`,
            ['System Administrator', adminEmail, hashedPassword, adminPhone]
        );

        console.log('\n🔐 ADMIN USER CREATED:');
        console.log(`   Email: ${adminEmail}`);
        if (!process.env.ADMIN_PASSWORD) {
            console.log(`   Temporary Password: ${adminPassword}`);
            console.log('   ⚠️  IMPORTANT: Set ADMIN_PASSWORD env var or change this password!\n');
        }
    } catch (error) {
        // Table may not exist yet if db:setup hasn't run
        if (!error.message.includes('does not exist')) {
            console.error('❌ Failed to init admin user:', error.message);
        }
    }
};

// Run after a short delay to let setupDb finish if starting fresh
setTimeout(initializeAdminUser, 2000);

console.log('✅ PostgreSQL pool initialised — waiting for DATABASE_URL connection');

module.exports = pool;
