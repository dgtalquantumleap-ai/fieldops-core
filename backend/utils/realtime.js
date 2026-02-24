const db = require('../config/database');

// Simple HTML escaper for user-supplied template values
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c]));

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

// Activity logging helper (async, fire-and-forget safe)
const logActivity = (userId, userName, action, entityType, entityId, details) => {
    db.query(
        `INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, userName, action, entityType, entityId, details]
    ).catch(error => {
        console.error('Activity logging error:', error.message);
    });
};

// Automation trigger helper
const triggerAutomations = async (triggerEvent, data, io) => {
    try {
        const { rows: automations } = await db.query(
            'SELECT * FROM automations WHERE trigger_event = $1 AND is_active = true',
            [triggerEvent]
        );

        if (automations.length === 0) return;

        const processTemplate = (template, data) =>
            template.replace(/\{\{(\w+)\}\}/g, (match, key) => esc(data[key] ?? match));

        const notifications = require('./notifications');

        for (const automation of automations) {
            const processedMessage = processTemplate(automation.message_template, data);
            try {
                if (automation.channel === 'Email' && data.customer_email) {
                    await notifications.sendEmail({
                        to: data.customer_email,
                        subject: `FieldOps: ${triggerEvent}`,
                        body: processedMessage
                    });
                }

                emitRealTimeUpdate(io, 'automation-triggered', {
                    trigger: triggerEvent,
                    message: processedMessage,
                    channel: automation.channel
                }, 'admin');
            } catch (notifError) {
                console.warn('Automation notification error:', notifError.message);
            }
        }
    } catch (error) {
        console.error('Automation trigger error:', error.message);
    }
};

module.exports = {
    emitRealTimeUpdate,
    logActivity,
    triggerAutomations
};
