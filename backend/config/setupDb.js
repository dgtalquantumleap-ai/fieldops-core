const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/fieldops.db' 
  : path.join(__dirname, '../../fieldops.db');

const setupDatabase = () => {
    try {
        const db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        
        console.log('📦 Setting up database...\n');

        // Create users table
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
        console.log('✅ Users table ready');

        // Create customers table
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
        console.log('✅ Customers table ready');

        // Create services table
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
        console.log('✅ Services table ready');

        // Create jobs table (UNIFIED SCHEMA - uses assigned_to)
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
                estimated_duration REAL DEFAULT 2,
                deleted_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (assigned_to) REFERENCES users(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        `);
        console.log('✅ Jobs table ready');

        // Create job_media table
        db.exec(`
            CREATE TABLE IF NOT EXISTS job_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER,
                file_path TEXT NOT NULL,
                media_type TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            )
        `);
        console.log('✅ Job Media table ready');

        // Create invoices table
        db.exec(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER,
                customer_id INTEGER,
                invoice_number TEXT UNIQUE NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'unpaid',
                issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                paid_date DATETIME,
                notes TEXT,
                deleted_at DATETIME,
                FOREIGN KEY (job_id) REFERENCES jobs(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);
        console.log('✅ Invoices table ready');

        // Create payments table
        db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER,
                amount REAL NOT NULL,
                payment_method TEXT,
                paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id)
            )
        `);
        console.log('✅ Payments table ready');

        // Create push_subscriptions table for free Web Push notifications
        db.exec(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Push subscriptions table ready');

        // Create indexes for performance
        console.log('\n🔍 Creating indexes for better performance...');
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
            CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
            CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
            CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
            CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            CREATE INDEX IF NOT EXISTS idx_job_media_job ON job_media(job_id);
        `);
        console.log('✅ Indexes created');

        // Run migrations for columns added after initial schema
        const jobCols = db.prepare('PRAGMA table_info(jobs)').all().map(c => c.name);
        if (!jobCols.includes('estimated_duration')) {
            db.exec('ALTER TABLE jobs ADD COLUMN estimated_duration REAL DEFAULT 2');
            console.log('✅ Migration: added estimated_duration to jobs');
        }

        // Insert default services if empty
        const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
        if (serviceCount === 0) {
            console.log('\n📝 Inserting default services...');
            db.exec(`
                INSERT INTO services (name, price, description, duration, is_active) VALUES
                ('Standard Cleaning', 150.00, 'Complete home cleaning service', 120, 1),
                ('Deep Cleaning', 250.00, 'Thorough deep cleaning service', 180, 1),
                ('Window Cleaning', 100.00, 'Interior and exterior window cleaning', 90, 1),
                ('Carpet Cleaning', 120.00, 'Professional carpet cleaning', 150, 1),
                ('Move-in/Move-out', 300.00, 'Comprehensive cleaning for moving', 240, 1);
            `);
            console.log('✅ Default services added');
        } else {
            console.log(`✅ Services already exist (${serviceCount} services)`);
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log(`📁 Database location: ${dbPath}\n`);
        
        db.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database setup error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure database file is not locked');
        console.error('2. Check file permissions');
        console.error('3. Try deleting fieldops.db and running again');
        process.exit(1);
    }
};

// Run setup
setupDatabase();
