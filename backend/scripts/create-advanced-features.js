const db = require('../config/database');

// Create job media table for photo management
const createJobMediaTable = `
CREATE TABLE IF NOT EXISTS job_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('Before', 'After', 'Progress')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
`;

// Create automations table
const createAutomationsTable = `
CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_event TEXT NOT NULL CHECK (trigger_event IN ('Job Created', 'Job Completed', 'Payment Due', 'Job Assigned', 'Customer Booking')),
    message_template TEXT NOT NULL,
    channel TEXT DEFAULT 'WhatsApp' CHECK (channel IN ('WhatsApp', 'SMS', 'Email')),
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Create activity log table
const createActivityLogTable = `
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

try {
    db.exec(createJobMediaTable);
    db.exec(createAutomationsTable);
    db.exec(createActivityLogTable);
    
    console.log('✅ Advanced features tables created successfully');
    
    // Insert default automation templates
    const existingAutomations = db.prepare('SELECT COUNT(*) as count FROM automations').get();
    
    if (existingAutomations.count === 0) {
        const defaultAutomations = [
            {
                trigger_event: 'Job Created',
                message_template: 'Hi {{customer_name}}, your {{service_name}} is scheduled for {{job_date}} at {{job_time}}. We\'ll see you at {{location}}!',
                channel: 'WhatsApp',
                enabled: 1
            },
            {
                trigger_event: 'Job Completed',
                message_template: 'Hi {{customer_name}}, your {{service_name}} has been completed. Invoice {{invoice_number}} will be sent shortly.',
                channel: 'Email',
                enabled: 1
            },
            {
                trigger_event: 'Customer Booking',
                message_template: 'New booking received: {{customer_name}} - {{service_name}} on {{job_date}}. Please check the system for details.',
                channel: 'WhatsApp',
                enabled: 1
            }
        ];
        
        const insertAutomation = db.prepare(`
            INSERT INTO automations (trigger_event, message_template, channel, enabled)
            VALUES (?, ?, ?, ?)
        `);
        
        defaultAutomations.forEach(automation => {
            insertAutomation.run(
                automation.trigger_event,
                automation.message_template,
                automation.channel,
                automation.enabled
            );
        });
        
        console.log('✅ Default automation templates created');
    }
    
} catch (error) {
    console.error('❌ Error creating advanced features tables:', error);
}

module.exports = db;
