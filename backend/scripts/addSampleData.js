// backend/scripts/addSampleData.js
// Add sample customers, staff, and jobs for testing

const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function addSampleData() {
    try {
        console.log('🔄 Adding sample data...');

        // Add sample staff members
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const staff1 = db.prepare(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)'
        ).run('John Cleaner', 'john@fieldops.com', '+1234567890', hashedPassword, 'staff');

        const staff2 = db.prepare(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)'
        ).run('Sarah Worker', 'sarah@fieldops.com', '+1234567891', hashedPassword, 'staff');

        console.log('✅ Staff members added');

        // Add sample customers
        const customer1 = db.prepare(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
        ).run(
            'Green Valley Apartments',
            '+1555-0101',
            'manager@greenvalley.com',
            '123 Main Street, Downtown',
            'Weekly cleaning contract - Building A & B'
        );

        const customer2 = db.prepare(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
        ).run(
            'City Office Plaza',
            '+1555-0102',
            'facilities@cityplaza.com',
            '456 Business Ave, Suite 200',
            'Monthly deep cleaning - 10 offices'
        );

        const customer3 = db.prepare(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
        ).run(
            'Johnson Residence',
            '+1555-0103',
            'mjohnson@email.com',
            '789 Oak Street',
            'Bi-weekly house cleaning'
        );

        console.log('✅ Customers added');

        // Get service IDs
        const services = db.prepare('SELECT * FROM services').all();
        const deepClean = services.find(s => s.name === 'Deep Clean');
        const regularClean = services.find(s => s.name === 'Regular Clean');

        // Add sample jobs
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Today's job
        db.prepare(
            'INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            customer1.lastInsertRowid,
            regularClean.id,
            staff1.lastInsertRowid,
            today,
            '09:00',
            'Building A - Lobby & Hallways',
            'scheduled',
            'Focus on entrance area'
        );

        // Tomorrow's job
        db.prepare(
            'INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            customer2.lastInsertRowid,
            deepClean.id,
            staff2.lastInsertRowid,
            tomorrow,
            '14:00',
            'Suite 200 - All Offices',
            'scheduled',
            'Post-renovation cleaning'
        );

        // Pending job
        db.prepare(
            'INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            customer3.lastInsertRowid,
            regularClean.id,
            staff1.lastInsertRowid,
            tomorrow,
            '10:00',
            '789 Oak Street',
            'scheduled',
            'Regular bi-weekly service'
        );

        // Add a completed job with invoice
        const completedJob = db.prepare(
            'INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, status, notes, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            customer1.lastInsertRowid,
            regularClean.id,
            staff1.lastInsertRowid,
            new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
            '09:00',
            'Building B - Common Areas',
            'completed',
            'Job completed successfully',
            new Date().toISOString()
        );

        // Add invoice for completed job
        db.prepare(
            'INSERT INTO invoices (job_id, customer_id, amount, status) VALUES (?, ?, ?, ?)'
        ).run(
            completedJob.lastInsertRowid,
            customer1.lastInsertRowid,
            80.00,
            'paid'
        );

        console.log('✅ Jobs and invoices added');

        console.log('\n🎉 Sample data added successfully!');
        console.log('\n📊 Summary:');
        console.log('   - 2 Staff members (john@fieldops.com / sarah@fieldops.com)');
        console.log('   - 3 Customers');
        console.log('   - 4 Jobs (1 today, 2 tomorrow, 1 completed)');
        console.log('   - 1 Paid invoice ($80)');
        console.log('\n🔑 Staff login password: password123');
        console.log('🔑 Admin login: admin@fieldops.com / admin123\n');

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding sample data:', error);
        process.exit(1);
    }
}

addSampleData();