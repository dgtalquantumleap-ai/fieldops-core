const db = require('./backend/config/database');

console.log('=== Testing Automation Insert ===');

try {
    // Test simple insert
    const testAutomation = {
        trigger_event: 'Job Created',
        message_template: 'Test message',
        channel: 'Email',
        enabled: true
    };
    
    console.log('Testing insert with:', testAutomation);
    
    const insertAutomation = db.prepare(`
        INSERT INTO automations (trigger_event, message_template, channel, enabled, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    const result = insertAutomation.run(
        testAutomation.trigger_event,
        testAutomation.message_template,
        testAutomation.channel,
        testAutomation.enabled ? 1 : 0
    );
    
    console.log('Insert result:', result);
    
    // Get the inserted record
    const newAutomation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
    console.log('New automation:', newAutomation);
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
}
