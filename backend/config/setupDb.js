const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log('📦 Setting up PostgreSQL database...\n');

        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'staff',
                is_active INTEGER DEFAULT 1,
                status TEXT DEFAULT 'active',
                availability_status TEXT DEFAULT 'available',
                termination_date DATE,
                last_login TIMESTAMP,
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Users table ready');

        // Customers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                address TEXT,
                notes TEXT,
                last_engagement_sent TIMESTAMP,
                deleted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Customers table ready');

        // Services table
        await client.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                price REAL NOT NULL,
                description TEXT,
                duration INTEGER DEFAULT 60,
                category TEXT DEFAULT 'General',
                difficulty_level TEXT DEFAULT 'Medium',
                required_skills TEXT,
                equipment_needed TEXT,
                pricing_model TEXT DEFAULT 'fixed',
                min_price REAL,
                max_price REAL,
                price_per_hour REAL,
                tags TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Services table ready');

        // Jobs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS jobs (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id),
                assigned_to INTEGER REFERENCES users(id),
                service_id INTEGER REFERENCES services(id),
                job_date TEXT NOT NULL,
                job_time TEXT,
                location TEXT,
                status TEXT DEFAULT 'Scheduled',
                notes TEXT,
                estimated_duration REAL DEFAULT 2,
                final_price REAL,
                follow_up_sent INTEGER DEFAULT 0,
                reminder_sent INTEGER DEFAULT 0,
                deleted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            )
        `);
        console.log('✅ Jobs table ready');

        // Job media table
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_media (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                file_path TEXT NOT NULL,
                media_type TEXT,
                uploaded_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Job media table ready');

        // Invoices table
        await client.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                customer_id INTEGER REFERENCES customers(id),
                invoice_number TEXT UNIQUE NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'unpaid',
                issued_at TIMESTAMP DEFAULT NOW(),
                paid_date TIMESTAMP,
                notes TEXT,
                reminder_sent_3day INTEGER DEFAULT 0,
                deleted_at TIMESTAMP
            )
        `);
        console.log('✅ Invoices table ready');

        // Payments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id),
                amount REAL NOT NULL,
                payment_method TEXT,
                paid_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Payments table ready');

        // Push subscriptions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Push subscriptions table ready');

        // Activity log table
        await client.query(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                user_name TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                entity_name TEXT,
                details TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Activity log table ready');

        // Automations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS automations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                trigger_event TEXT NOT NULL,
                message_template TEXT NOT NULL,
                channel TEXT DEFAULT 'email',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Automations table ready');

        // Settings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Settings table ready');

        // Job reviews table
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_reviews (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                customer_id INTEGER REFERENCES customers(id),
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Job reviews table ready');

        // Expenses table
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT DEFAULT 'General',
                expense_date DATE DEFAULT CURRENT_DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Expenses table ready');

        // Staff activity log table (for staff-management module)
        await client.query(`
            CREATE TABLE IF NOT EXISTS staff_activity_log (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES users(id),
                action TEXT NOT NULL,
                performed_by INTEGER REFERENCES users(id),
                reason TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Staff activity log table ready');

        // Staff sessions table (for session revocation)
        await client.query(`
            CREATE TABLE IF NOT EXISTS staff_sessions (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES users(id),
                token TEXT,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Staff sessions table ready');

        // Indexes
        console.log('\n🔍 Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to)',
            'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)',
            'CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
            'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
            'CREATE INDEX IF NOT EXISTS idx_job_media_job ON job_media(job_id)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)',
            'CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_event)',
        ];
        for (const idx of indexes) {
            await client.query(idx);
        }
        console.log('✅ Indexes created');

        // Default services if empty
        const { rows } = await client.query('SELECT COUNT(*) as count FROM services');
        if (parseInt(rows[0].count) === 0) {
            console.log('\n📝 Inserting default services...');
            await client.query(`
                INSERT INTO services (name, price, description, duration, is_active) VALUES
                ('Standard Cleaning', 150.00, 'Complete home cleaning service', 120, 1),
                ('Deep Cleaning', 250.00, 'Thorough deep cleaning service', 180, 1),
                ('Window Cleaning', 100.00, 'Interior and exterior window cleaning', 90, 1),
                ('Carpet Cleaning', 120.00, 'Professional carpet cleaning', 150, 1),
                ('Move-in/Move-out', 300.00, 'Comprehensive cleaning for moving', 240, 1)
                ON CONFLICT (name) DO NOTHING
            `);
            console.log('✅ Default services added');
        } else {
            console.log(`✅ Services already exist (${rows[0].count} services)`);
        }

        console.log('\n✅ PostgreSQL database setup completed successfully!\n');
    } catch (error) {
        console.error('\n❌ Database setup error:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
};

setupDatabase();
