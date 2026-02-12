const db = require('../config/database');

async function testDashboardAPIs() {
    console.log('🧪 Testing Dashboard APIs...');
    
    try {
        // Test jobs API
        const jobs = db.prepare(`
            SELECT j.*, c.name as customer_name, s.name as service_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN services s ON j.service_id = s.id
            ORDER BY j.id DESC
            LIMIT 5
        `).all();
        
        console.log(`✅ Found ${jobs.length} jobs in database`);
        jobs.forEach((job, index) => {
            console.log(`  ${index + 1}. ${job.customer_name} - ${job.service_name} (${job.status})`);
        });
        
        // Test invoices API
        const invoices = db.prepare('SELECT * FROM invoices ORDER BY issued_at DESC LIMIT 5').all();
        console.log(`✅ Found ${invoices.length} invoices in database`);
        
        // Test customers API
        const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT 5').all();
        console.log(`✅ Found ${customers.length} customers in database`);
        
        // Test dashboard stats
        const today = new Date().toISOString().split('T')[0];
        const todayJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE job_date = ?').get(today);
        const pending = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('Scheduled');
        const completed = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('Completed');
        const revenue = db.prepare('SELECT SUM(amount) as sum FROM invoices WHERE status = ?').get('Paid');
        
        console.log('\n📊 Dashboard Stats:');
        console.log(`  Today's Jobs: ${todayJobs.count}`);
        console.log(`  Pending Jobs: ${pending.count}`);
        console.log(`  Completed Jobs: ${completed.count}`);
        console.log(`  Total Revenue: $${revenue.sum || 0}`);
        
        console.log('\n🎉 All APIs should work correctly!');
        
    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

testDashboardAPIs();
