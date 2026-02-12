const db = require('../config/database');

async function checkTableStructure() {
    console.log('🔍 Checking table structures...');
    
    try {
        // Check jobs table structure
        const jobsSchema = db.prepare("PRAGMA table_info(jobs)").all();
        console.log('\n📋 Jobs table structure:');
        jobsSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Check invoices table structure
        const invoicesSchema = db.prepare("PRAGMA table_info(invoices)").all();
        console.log('\n📋 Invoices table structure:');
        invoicesSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Check customers table structure
        const customersSchema = db.prepare("PRAGMA table_info(customers)").all();
        console.log('\n📋 Customers table structure:');
        customersSchema.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
    } catch (error) {
        console.error('Error checking table structure:', error);
    }
}

checkTableStructure();
