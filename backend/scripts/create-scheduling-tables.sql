-- Add staff unavailability table for scheduling
CREATE TABLE IF NOT EXISTS staff_unavailability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Add staff specialties table for skill matching
CREATE TABLE IF NOT EXISTS staff_specialties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    specialty TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 1, -- 1-5 scale
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Add work hours preference table
CREATE TABLE IF NOT EXISTS staff_work_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0-6 (Sunday=0)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Update staff table to include new fields
ALTER TABLE staff ADD COLUMN years_experience INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN work_hours_start TIME DEFAULT '09:00';
ALTER TABLE staff ADD COLUMN work_hours_end TIME DEFAULT '17:00';
ALTER TABLE staff ADD COLUMN specialties TEXT DEFAULT '';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_unavailability_dates ON staff_unavailability(staff_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_work_hours_staff ON staff_work_hours(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_specialties_staff ON staff_specialties(staff_id, specialty);
