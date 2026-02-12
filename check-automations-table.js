const db = require('./backend/config/database');

console.log('=== Checking Automations Table Structure ===');

try {
    // Get table structure
    const schema = db.prepare("PRAGMA table_info(automations)").all();
    console.log('Automations table structure:');
    schema.forEach(col => {
        console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
    });
    
    // Check existing automations
    const automations = db.prepare("SELECT * FROM automations LIMIT 3").all();
    console.log('\nSample automations:');
    automations.forEach(automation => {
        console.log(`  ID ${automation.id}: ${automation.trigger_event} - ${automation.channel}`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
