const db = require('./backend/config/database');

console.log('=== Checking Existing Automations ===');

try {
    // Check existing automations
    const automations = db.prepare("SELECT * FROM automations").all();
    console.log(`Total automations: ${automations.length}`);
    
    automations.forEach((automation, index) => {
        console.log(`  ${index + 1}. ID: ${automation.id}, Trigger: ${automation.trigger_event}, Channel: ${automation.channel}, Enabled: ${automation.enabled}`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
