const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use /app for Railway deployment, fallback to local development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/fieldops.db' 
  : path.join(__dirname, '../../fieldops.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60, -- minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    staff_id INTEGER,
    service_id INTEGER,
    job_date TEXT NOT NULL,
    job_time TEXT,
    location TEXT,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
  
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    customer_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_date DATETIME,
    notes TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// Add missing columns if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE jobs ADD COLUMN service_id INTEGER`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE jobs ADD COLUMN job_date TEXT`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE jobs ADD COLUMN job_time TEXT`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE jobs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
} catch (e) {
  // Column already exists
}

// Insert default services if services table is empty
const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
if (serviceCount === 0) {
  console.log('📝 Inserting default services...');
  db.exec(`
    INSERT INTO services (name, price, description, duration) VALUES
    ('Standard Cleaning', 150.00, 'Complete home cleaning service', 120),
    ('Deep Cleaning', 250.00, 'Thorough deep cleaning service', 180),
    ('Window Cleaning', 100.00, 'Interior and exterior window cleaning', 90),
    ('Carpet Cleaning', 120.00, 'Professional carpet cleaning', 150),
    ('Move-in/Move-out', 300.00, 'Comprehensive cleaning for moving', 240);
  `);
}

// Create admin user only if no admin exists and ADMIN_EMAIL is set
const adminEmail = process.env.ADMIN_EMAIL;
if (adminEmail) {
  // Check if admin user exists (handle both old and new schema)
  let adminCount;
  try {
    adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1').get().count;
  } catch (e) {
    // Fallback for old schema without is_active column
    adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin"').get().count;
  }
  
  if (adminCount === 0) {
    console.log('📝 Creating initial admin user...');
    const bcrypt = require('bcrypt');
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    
    // Try to insert with new schema first, fallback to old schema
    try {
      db.prepare(`
        INSERT INTO users (name, email, password, role, phone) 
        VALUES (?, ?, ?, 'admin', ?)
      `).run('System Administrator', adminEmail, hashedPassword, '555-0000');
    } catch (e) {
      console.error('Failed to create admin user:', e.message);
    }
    
    console.log('\n🔐 ADMIN USER CREATED:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!\n');
  }
} else {
  console.log('⚠️  WARNING: No ADMIN_EMAIL environment variable set. Admin user not created.');
}

console.log('✅ SQLite Database connected at:', dbPath);

module.exports = db;