#!/usr/bin/env node
/**
 * DIAGNOSTIC SCRIPT
 * Checks system health and identifies issues
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, 'fieldops.db');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         FIELDOPS DIAGNOSTIC - SYSTEM HEALTH CHECK         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let issues = [];
let warnings = [];
let successes = [];

// CHECK 1: Database exists and connects
console.log('🔍 Checking database...');
try {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  console.log('   ✅ Database connected');
  successes.push('Database connection working');

  // CHECK 2: Check tables exist
  console.log('\n🔍 Checking database tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();

  const requiredTables = ['users', 'customers', 'services', 'jobs', 'invoices'];
  const tableNames = tables.map(t => t.name);

  requiredTables.forEach(table => {
    if (tableNames.includes(table)) {
      console.log(`   ✅ Table: ${table}`);
    } else {
      console.log(`   ❌ MISSING: ${table}`);
      issues.push(`Missing table: ${table}`);
    }
  });

  // CHECK 3: Check admin user exists
  console.log('\n🔍 Checking admin user...');
  try {
    const adminCheck = db.prepare(`
      SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1
    `).get();

    if (adminCheck) {
      console.log(`   ✅ Admin user found: ${adminCheck.email}`);
      successes.push(`Admin user exists: ${adminCheck.email}`);
    } else {
      console.log('   ⚠️  No admin user found');
      warnings.push('Admin user needs to be created');
    }
  } catch (e) {
    console.log(`   ❌ Error checking admin: ${e.message}`);
    issues.push(`Error checking admin user: ${e.message}`);
  }

  // CHECK 4: Check services exist
  console.log('\n🔍 Checking services...');
  try {
    const services = db.prepare(`SELECT COUNT(*) as count FROM services`).get();
    if (services.count > 0) {
      console.log(`   ✅ Found ${services.count} service(s)`);
      
      const serviceList = db.prepare(`SELECT id, name, price FROM services LIMIT 5`).all();
      serviceList.forEach(s => {
        console.log(`      - ${s.name} ($${s.price})`);
      });
      successes.push(`${services.count} services available`);
    } else {
      console.log('   ⚠️  No services found');
      warnings.push('Sample services need to be added');
    }
  } catch (e) {
    console.log(`   ⚠️  Error checking services`);
    warnings.push('Services table exists but is empty or has issues');
  }

  // CHECK 5: Check environment variables
  console.log('\n🔍 Checking environment variables...');
  const envVars = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL', 'PORT'];
  let env_ok = true;
  envVars.forEach(env => {
    if (process.env[env]) {
      console.log(`   ✅ ${env} set`);
    } else {
      console.log(`   ❌ ${env} NOT SET`);
      issues.push(`Missing environment variable: ${env}`);
      env_ok = false;
    }
  });
  if (env_ok) {
    successes.push('All required environment variables set');
  }

  // CHECK 6: Check users table
  console.log('\n🔍 Checking user accounts...');
  try {
    const userCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get();
    if (userCount.count > 0) {
      console.log(`   ✅ Found ${userCount.count} user(s)`);
      
      const users = db.prepare(`SELECT id, name, email, role FROM users LIMIT 10`).all();
      users.forEach(u => {
        console.log(`      - ${u.email} (${u.role})`);
      });
    } else {
      console.log('   ⚠️  No users found');
      warnings.push('No user accounts - admin needs to be created');
    }
  } catch (e) {
    console.log(`   ⚠️  Error checking users`);
  }

  db.close();

} catch (err) {
  console.log(`   ❌ Database error: ${err.message}`);
  issues.push(`Database connection failed: ${err.message}`);
}

// SUMMARY
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                      DIAGNOSTIC SUMMARY                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (successes.length > 0) {
  console.log('✅ SUCCESSFUL CHECKS:');
  successes.forEach(s => console.log(`   • ${s}`));
  console.log();
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (things to set up):');
  warnings.forEach(w => console.log(`   • ${w}`));
  console.log();
}

if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES (must fix):');
  issues.forEach(i => console.log(`   • ${i}`));
  console.log();
  console.log('🚨 ACTION REQUIRED:');
  console.log('   Run: node emergency-fix.js');
  console.log();
  process.exit(1);
} else {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SYSTEM IS READY FOR USE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 Next steps:');
  console.log('   1. Start server: npm run dev');
  console.log('   2. Admin dashboard: http://localhost:3000/admin');
  console.log('   3. Booking page: http://localhost:3000/booking.html\n');
}
