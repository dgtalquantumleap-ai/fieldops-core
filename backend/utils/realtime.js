const db = require('../config/database');

// Real-time update helper
const emitRealTimeUpdate = (io, event, data, room = null) => {
    if (!io) return;
    if (room) {
        io.to(room).emit(event, data);
    } else {
        io.emit(event, data);
    }
    console.log(`🔌 Real-time update: ${event} to ${room || 'all clients'}`);
};

// Activity logging helper
const logActivity = (userId, userName, action, entityType, entityId, details) => {
    try {
        const insertActivity = db.prepare(`
            INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        insertActivity.run(userId, userName, action, entityType, entityId, details);
    } catch (error) {
        console.error('Activity logging error:', error);
    }
};

// Automation trigger helper
const triggerAutomations = async (triggerEvent, data, io) => {
    try {
        const automations = db.prepare(`
            SELECT * FROM automations 
            WHERE trigger_event = ? AND is_active = 1
        `).all(triggerEvent);
        
        if (automations.length === 0) return;
        
        // Process message template with data
        const processTemplate = (template, data) => {
            return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return data[key] || match;
            });
        };
        
        const notifications = require('./notifications');
        
        for (const automation of automations) {
            const processedMessage = processTemplate(automation.message_template, data);
            
            try {
                if (automation.channel === 'Email' && data.customer_email) {
                    await notifications.sendCustomerConfirmation({
                        ...data,
                        email: data.customer_email,
                        customMessage: processedMessage
                    });
                }
                
                // Emit real-time notification
                emitRealTimeUpdate(io, 'automation-triggered', {
                    trigger: triggerEvent,
                    message: processedMessage,
                    channel: automation.channel
                }, 'admin');
                
            } catch (notifError) {
                console.log(`Automation notification error:`, notifError);
            }
        }
    } catch (error) {
        console.error('Automation trigger error:', error);
    }
};

module.exports = {
    emitRealTimeUpdate,
    logActivity,
    triggerAutomations
};
