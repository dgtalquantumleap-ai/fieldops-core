const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fieldops.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking for olumide Akinsola booking...');

// Check customers table
console.log('\n=== Checking Customers Table ===');
db.all('SELECT * FROM customers WHERE name LIKE ?', ['%olumide%'], (err, rows) => {
    if (err) {
        console.error('❌ Error checking customers:', err);
        return;
    }
    
    if (rows.length > 0) {
        console.log('✅ Found customer(s):');
        rows.forEach(row => {
            console.log(`  - ID: ${row.id}, Name: ${row.name}, Email: ${row.email}, Phone: ${row.phone}`);
        });
    } else {
        console.log('❌ No customer found with name containing "olumide"');
    }
    
    // Check jobs table for any jobs with similar customer names
    console.log('\n=== Checking Jobs Table ===');
    db.all('SELECT j.*, c.name as customer_name FROM jobs j LEFT JOIN customers c ON j.customer_id = c.id WHERE c.name LIKE ?', ['%olumide%'], (err, rows) => {
        if (err) {
            console.error('❌ Error checking jobs:', err);
            return;
        }
        
        if (rows.length > 0) {
            console.log('✅ Found job(s) for olumide:');
            rows.forEach(row => {
                console.log(`  - Job ID: ${row.id}, Customer: ${row.customer_name}, Service: ${row.service_name}, Date: ${row.job_date}`);
            });
        } else {
            console.log('❌ No jobs found for customer with name containing "olumide"');
        }
        
        // Check all recent jobs to see if there might be a similar name
        console.log('\n=== Recent Jobs (Last 24 Hours) ===');
        db.all(`
            SELECT j.*, c.name as customer_name 
            FROM jobs j 
            LEFT JOIN customers c ON j.customer_id = c.id 
            WHERE j.created_at >= datetime('now', '-1 day')
            ORDER BY j.created_at DESC 
            LIMIT 10
        `, (err, rows) => {
            if (err) {
                console.error('❌ Error checking recent jobs:', err);
                return;
            }
            
            console.log(`Found ${rows.length} recent jobs:`);
            rows.forEach(row => {
                console.log(`  - ${row.customer_name}: ${row.service_name} on ${row.job_date} at ${row.job_time || 'TBD'}`);
            });
            
            db.close();
        });
    });
});
