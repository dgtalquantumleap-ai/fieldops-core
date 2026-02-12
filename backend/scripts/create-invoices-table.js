const db = require('../config/database');

// Create invoices table
const createInvoicesTable = `
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Partial')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`;

try {
    db.exec(createInvoicesTable);
    console.log('✅ Invoices table created successfully');
} catch (error) {
    console.error('❌ Error creating invoices table:', error);
}

module.exports = db;
