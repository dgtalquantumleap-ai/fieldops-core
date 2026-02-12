const db = require('./backend/config/database');

console.log('=== Testing Payment SQL Query ===');

try {
    const invoiceId = 4;
    console.log(`Testing invoice ID: ${invoiceId}`);
    
    // Test the update query
    const updateInvoice = db.prepare(`
        UPDATE invoices 
        SET status = 'Paid', paid_date = datetime('now'), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    console.log('Executing update query...');
    const result = updateInvoice.run(invoiceId);
    console.log('Update result:', result);
    
    // Check if the invoice was updated
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    console.log('Updated invoice:', invoice);
    
} catch (error) {
    console.error('SQL Error:', error.message);
    console.error('Full error:', error);
}
