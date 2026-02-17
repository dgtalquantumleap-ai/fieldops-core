const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = './backend/fieldops.db';

console.log('🗄️ Creating staff_unavailability table...');

const db = new sqlite3.Database(dbPath);

// Create staff_unavailability table
db.run(`
    CREATE TABLE IF NOT EXISTS staff_unavailability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
`, (err) => {
    if (err) {
        console.error('❌ Error creating staff_unavailability:', err);
    } else {
        console.log('✅ staff_unavailability table created');
    }
});

// Create staff_specialties table
db.run(`
    CREATE TABLE IF NOT EXISTS staff_specialties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        specialty TEXT NOT NULL,
        proficiency_level INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
`, (err) => {
    if (err) {
        console.error('❌ Error creating staff_specialties:', err);
    } else {
        console.log('✅ staff_specialties table created');
    }
});

// Create staff_work_hours table
db.run(`
    CREATE TABLE IF NOT EXISTS staff_work_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
`, (err) => {
    if (err) {
        console.error('❌ Error creating staff_work_hours:', err);
    } else {
        console.log('✅ staff_work_hours table created');
    }
});

// Update staff table with new columns
db.run(`ALTER TABLE staff ADD COLUMN years_experience INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding years_experience:', err);
    } else {
        console.log('✅ years_experience column added');
    }
});

db.run(`ALTER TABLE staff ADD COLUMN work_hours_start TIME DEFAULT '09:00'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding work_hours_start:', err);
    } else {
        console.log('✅ work_hours_start column added');
    }
});

db.run(`ALTER TABLE staff ADD COLUMN work_hours_end TIME DEFAULT '17:00'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding work_hours_end:', err);
    } else {
        console.log('✅ work_hours_end column added');
    }
});

db.run(`ALTER TABLE staff ADD COLUMN specialties TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding specialties:', err);
    } else {
        console.log('✅ specialties column added');
    }
});

// Create indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_staff_unavailability_dates ON staff_unavailability(staff_id, start_date, end_date)`, (err) => {
    if (err) {
        console.error('❌ Error creating idx_staff_unavailability_dates:', err);
    } else {
        console.log('✅ idx_staff_unavailability_dates index created');
    }
});

db.run(`CREATE INDEX IF NOT EXISTS idx_staff_work_hours_staff ON staff_work_hours(staff_id)`, (err) => {
    if (err) {
        console.error('❌ Error creating idx_staff_work_hours_staff:', err);
    } else {
        console.log('✅ idx_staff_work_hours_staff index created');
    }
});

db.run(`CREATE INDEX IF NOT EXISTS idx_staff_specialties_staff ON staff_specialties(staff_id, specialty)`, (err) => {
    if (err) {
        console.error('❌ Error creating idx_staff_specialties_staff:', err);
    } else {
        console.log('✅ idx_staff_specialties_staff index created');
    }
});

console.log('✅ All scheduling tables and indexes created successfully');

db.close();
