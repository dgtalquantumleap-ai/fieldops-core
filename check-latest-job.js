const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fieldops.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking the most recent job...');

// Get the most recent job
db.get(`
    SELECT j.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM jobs j 
    LEFT JOIN customers c ON j.customer_id = c.id 
    ORDER BY j.created_at DESC 
    LIMIT 1
`, (err, job) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    if (job) {
        console.log('✅ Most recent job:');
        console.log(`  - Job ID: ${job.id}`);
        console.log(`  - Customer: ${job.customer_name}`);
        console.log(`  - Email: ${job.customer_email}`);
        console.log(`  - Phone: ${job.customer_phone}`);
        console.log(`  - Service: ${job.service_name}`);
        console.log(`  - Date: ${job.job_date}`);
        console.log(`  - Time: ${job.job_time}`);
        console.log(`  - Location: ${job.location}`);
        console.log(`  - Status: ${job.status}`);
        console.log(`  - Created: ${job.created_at}`);
        console.log(`  - Notes: ${job.notes}`);
        
        // Check if this could be the "olumide" booking
        if (job.customer_name && job.customer_name.toLowerCase().includes('olumide')) {
            console.log('\n🎯 This might be the olumide booking you mentioned!');
        } else {
            console.log('\n❌ This doesn\'t appear to be the olumide booking.');
        }
    } else {
        console.log('❌ No jobs found in the database');
    }
    
    db.close();
});
