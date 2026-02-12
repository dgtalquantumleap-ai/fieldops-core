const db = require('./backend/config/database');

console.log('=== Adding paid_date Column to Invoices ===');

try {
    // Add paid_date column if it doesn't exist
    try {
        db.prepare("ALTER TABLE invoices ADD COLUMN paid_date DATETIME").run();
        console.log('✅ paid_date column added successfully');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('✅ paid_date column already exists');
        } else {
            throw error;
        }
    }
    
    // Verify the column was added
    const schema = db.prepare("PRAGMA table_info(invoices)").all();
    const hasPaidDate = schema.some(col => col.name === 'paid_date');
    console.log('paid_date column exists:', hasPaidDate);
    
    // Check updated schema
    console.log('\nUpdated invoice table structure:');
    schema.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
