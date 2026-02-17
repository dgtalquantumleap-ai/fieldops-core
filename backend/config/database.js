const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use /app for Railway deployment, fallback to local development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/fieldops.db' 
  : path.join(__dirname, '../../fieldops.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Validate that database has been initialized with required tables
const validateDatabase = () => {
  try {
    // Check if core tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('users', 'customers', 'services', 'jobs', 'invoices')
    `).all();
    
    const tableNames = tables.map(t => t.name);
    const requiredTables = ['users', 'customers', 'services', 'jobs', 'invoices'];
    const missing = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missing.length > 0) {
      console.warn('\n⚠️  WARNING: Missing tables: ' + missing.join(', '));
      console.warn('   Database has not been initialized.');
      console.warn('   Run this command: npm run db:setup\n');
      return false;
    }
    
    // Check for required columns in jobs table
    const jobsInfo = db.prepare('PRAGMA table_info(jobs)').all();
    const jobColumns = jobsInfo.map(col => col.name);
    
    if (!jobColumns.includes('assigned_to')) {
      console.warn('⚠️  WARNING: jobs table missing "assigned_to" column');
      console.warn('   Run: npm run db:setup (to reinitialize)\n');
      return false;
    }
    
    console.log('✅ Database validation successful');
    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
    return false;
  }
};

// Validate on startup
validateDatabase();

// Initialize admin user if needed
const initializeAdminUser = () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.warn('⚠️  No ADMIN_EMAIL environment variable set. Admin user not created.');
    return;
  }
  
  try {
    // Check if admin user already exists (handle both old and new schema)
    let adminCount;
    try {
      adminCount = db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1"
      ).get().count;
    } catch (e) {
      // Fallback for old schema without is_active column
      adminCount = db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      ).get().count;
    }
    
    if (adminCount > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Create new admin user with random temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                         Math.random().toString(36).slice(-4);
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    const adminPhone = process.env.ADMIN_PHONE || null;
    
    // Try to insert with new schema first, fallback to old schema
    try {
      db.prepare(`
        INSERT INTO users (name, email, password, role, phone, is_active, created_at)
        VALUES (?, ?, ?, 'admin', ?, 1, datetime('now'))
      `).run('System Administrator', adminEmail, hashedPassword, adminPhone);
    } catch (e) {
      // Fallback for old schema
      db.prepare(`
        INSERT INTO users (name, email, password, role, phone, created_at)
        VALUES (?, ?, ?, 'admin', ?, datetime('now'))
      `).run('System Administrator', adminEmail, hashedPassword, adminPhone);
    }
    
    console.log('\n🔐 ADMIN USER CREATED:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!\n');
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      console.log('✅ Admin user already exists');
    } else {
      console.error('❌ Failed to create admin user:', error.message);
    }
  }
};

// Initialize admin user
initializeAdminUser();

console.log(`✅ SQLite Database connected at: ${dbPath}`);

module.exports = db;
