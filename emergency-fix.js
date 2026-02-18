#!/usr/bin/env node
/**
 * EMERGENCY FIX SCRIPT
 * Sets up everything needed for the system to work
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.join(__dirname, 'fieldops.db');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              EMERGENCY FIX - SYSTEM SETUP                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // STEP 1: Create all tables
  console.log('📦 STEP 1: Creating database tables...\n');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ Users table created');

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      notes TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ Customers table created');

  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 60,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ Services table created');

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      assigned_to INTEGER,
      service_id INTEGER,
      job_date TEXT NOT NULL,
      job_time TEXT,
      location TEXT,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);
  console.log('   ✅ Jobs table created');

  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      customer_id INTEGER,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  console.log('   ✅ Invoices table created');

  // STEP 2: Create admin user
  console.log('\n📝 STEP 2: Setting up admin user...\n');

  const adminEmail = 'admin@stiltheights.com';
  const adminPassword = 'Admin@12345678';
  const adminName = 'Administrator';

  // Check if admin already exists
  const existingAdmin = db.prepare(`
    SELECT id, email FROM users WHERE email = ? AND role = 'admin'
  `).get(adminEmail);

  if (existingAdmin) {
    console.log(`   ⚠️  Admin user already exists: ${adminEmail}`);
    
    // Update password to ensure it's correct
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`)
      .run(hashedPassword, existingAdmin.id);
    console.log(`   ✅ Admin password reset to default`);
  } else {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    db.prepare(`
      INSERT INTO users (name, email, password, role, is_active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run(adminName, adminEmail, hashedPassword);
    
    console.log(`   ✅ Admin user created: ${adminEmail}`);
  }

  // STEP 3: Create sample services
  console.log('\n🧹 STEP 3: Adding sample services...\n');

  const sampleServices = [
    { name: 'Deep Cleaning', price: 250, duration: 180 },
    { name: 'Regular Cleaning', price: 150, duration: 120 },
    { name: 'Window Cleaning', price: 100, duration: 90 },
    { name: 'Carpet Cleaning', price: 200, duration: 150 },
    { name: 'Post-Construction Cleaning', price: 350, duration: 240 }
  ];

  const existingServices = db.prepare(`SELECT name FROM services`).all();
  const existingServiceNames = existingServices.map(s => s.name);

  sampleServices.forEach(service => {
    if (existingServiceNames.includes(service.name)) {
      console.log(`   ℹ️  Already exists: ${service.name}`);
    } else {
      db.prepare(`
        INSERT INTO services (name, price, description, duration, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(
        service.name,
        service.price,
        `Professional ${service.name.toLowerCase()} service`,
        service.duration
      );
      console.log(`   ✅ Added: ${service.name} ($${service.price})`);
    }
  });

  // STEP 4: Create sample staff member
  console.log('\n👤 STEP 4: Setting up sample staff...\n');

  const staffEmail = 'staff@stiltheights.com';
  const staffPassword = 'Staff@12345678';
  const staffName = 'John Smith';

  const existingStaff = db.prepare(`
    SELECT id FROM users WHERE email = ? AND role = 'staff'
  `).get(staffEmail);

  if (existingStaff) {
    console.log(`   ℹ️  Staff member already exists: ${staffEmail}`);
  } else {
    const hashedPassword = bcrypt.hashSync(staffPassword, 10);
    db.prepare(`
      INSERT INTO users (name, email, phone, password, role, is_active)
      VALUES (?, ?, ?, ?, 'staff', 1)
    `).run(staffName, staffEmail, '555-123-4567', hashedPassword);
    
    console.log(`   ✅ Staff member created: ${staffEmail}`);
    console.log(`      Password: ${staffPassword}`);
  }

  // FINAL SUMMARY
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SETUP COMPLETE! ✅                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📌 ADMIN CREDENTIALS:');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}\n`);

  console.log('📌 STAFF CREDENTIALS (for testing):');
  console.log(`   Email:    ${staffEmail}`);
  console.log(`   Password: ${staffPassword}\n`);

  console.log('🚀 NEXT STEPS:');
  console.log('   1. Start the server: npm run dev');
  console.log('   2. Open admin: http://localhost:3000/admin');
  console.log('   3. Login with admin credentials above');
  console.log('   4. Test booking: http://localhost:3000/booking.html\n');

  db.close();

} catch (err) {
  console.error('\n❌ ERROR:', err.message);
  console.error('\nTroubleshooting:');
  console.error('1. Make sure you\'re in the right directory');
  console.error('2. Check that node_modules are installed: npm install');
  console.error('3. Check .env file exists with JWT_SECRET set');
  process.exit(1);
}
