const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../fieldops.db'));

console.log('🔧 Updating staff management schema...');

// Add new columns to users table for staff lifecycle
try {
  // Add status column if not exists
  db.exec(`
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' 
    CHECK(status IN ('active', 'inactive', 'suspended'));
  `);
  console.log('✅ Added status column');
} catch (e) {
  console.log('ℹ️ Status column already exists');
}

try {
  // Add hire_date column
  db.exec(`
    ALTER TABLE users ADD COLUMN hire_date TEXT DEFAULT (date('now'));
  `);
  console.log('✅ Added hire_date column');
} catch (e) {
  console.log('ℹ️ hire_date column already exists');
}

try {
  // Add termination_date column
  db.exec(`
    ALTER TABLE users ADD COLUMN termination_date TEXT;
  `);
  console.log('✅ Added termination_date column');
} catch (e) {
  console.log('ℹ️ termination_date column already exists');
}

try {
  // Add last_login column
  db.exec(`
    ALTER TABLE users ADD COLUMN last_login TEXT;
  `);
  console.log('✅ Added last_login column');
} catch (e) {
  console.log('ℹ️ last_login column already exists');
}

try {
  // Add created_by column (who onboarded this staff)
  db.exec(`
    ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id);
  `);
  console.log('✅ Added created_by column');
} catch (e) {
  console.log('ℹ️ created_by column already exists');
}

try {
  // Add notes column for termination/suspension reasons
  db.exec(`
    ALTER TABLE users ADD COLUMN notes TEXT;
  `);
  console.log('✅ Added notes column');
} catch (e) {
  console.log('ℹ️ notes column already exists');
}

// Create staff activity log table
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    performed_by INTEGER NOT NULL,
    reason TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
  );
`);
console.log('✅ Created staff_activity_log table');

// Create staff sessions table for access control
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (staff_id) REFERENCES users(id)
  );
`);
console.log('✅ Created staff_sessions table');

// Update existing active staff to have proper status
db.exec(`
  UPDATE users 
  SET status = 'active' 
  WHERE status IS NULL;
`);

console.log('✅ Staff management schema updated successfully!');

// Show current staff
const staff = db.prepare('SELECT id, full_name, email, role, status FROM users').all();
console.log('\n📋 Current Staff:');
console.table(staff);

db.close();
