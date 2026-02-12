const db = require('./backend/config/database');

console.log('=== Checking Invoice Schema ===');

try {
    // Get invoice table structure
    const schema = db.prepare("PRAGMA table_info(invoices)").all();
    console.log('Invoice table structure:');
    schema.forEach(col => {
        console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
    });
    
    // Check existing invoices
    const invoices = db.prepare("SELECT * FROM invoices LIMIT 3").all();
    console.log('\nSample invoices:');
    invoices.forEach(inv => {
        console.log(`  ID ${inv.id}: ${inv.status}, Amount: $${inv.amount}, Paid: ${inv.paid_date || 'NULL'}`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
