const db = require('./database');

const setupDatabase = () => {
    try {
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

        db.exec(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                address TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER REFERENCES customers(id),
                service_id INTEGER REFERENCES services(id),
                assigned_to INTEGER REFERENCES users(id),
                job_date TEXT NOT NULL,
                job_time TEXT,
                location TEXT,
                status TEXT DEFAULT 'scheduled',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS job_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER REFERENCES jobs(id),
                file_path TEXT NOT NULL,
                media_type TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER REFERENCES jobs(id),
                customer_id INTEGER REFERENCES customers(id),
                amount REAL NOT NULL,
                status TEXT DEFAULT 'unpaid',
                issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER REFERENCES invoices(id),
                amount REAL NOT NULL,
                payment_method TEXT,
                paid_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
        if (serviceCount.count === 0) {
            const insertService = db.prepare('INSERT INTO services (name, price, description) VALUES (?, ?, ?)');
            insertService.run('Deep Clean', 150.00, 'Complete deep cleaning service');
            insertService.run('Regular Clean', 80.00, 'Standard cleaning service');
            insertService.run('Window Cleaning', 50.00, 'Interior and exterior window cleaning');
            insertService.run('Carpet Cleaning', 120.00, 'Professional carpet cleaning');
            console.log('✅ Sample services added');
        }

        console.log('✅ Database tables created successfully');
        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup error:', error);
        process.exit(1);
    }
};

setupDatabase();