const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all automations
router.get('/', async (req, res) => {
    try {
        const automations = db.prepare(`
            SELECT * FROM automations 
            ORDER BY created_at ASC
        `).all();
        
        res.json(automations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add automation (direct POST)
router.post('/', async (req, res) => {
    try {
        const { trigger_event, message_template, channel, enabled } = req.body;
        
        if (!trigger_event || !message_template) {
            return res.status(400).json({ error: 'trigger_event and message_template are required' });
        }
        
        const insertAutomation = db.prepare(`
            INSERT INTO automations (trigger_event, message_template, channel, enabled, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `);
        
        const result = insertAutomation.run(trigger_event, message_template, channel || 'email', enabled ? 1 : 0);
        
        const newAutomation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
        
        console.log(`🤖 New automation created: ${trigger_event} via ${channel}`);
        
        res.json({
            success: true,
            automation: newAutomation,
            message: 'Automation created successfully'
        });
        
    } catch (error) {
        console.error('Add automation error:', error);
        res.status(500).json({ error: 'Failed to create automation' });
    }
});

// Create automation
router.post('/create', async (req, res) => {
    try {
        const { trigger_event, message_template, channel, enabled } = req.body;
        
        if (!trigger_event || !message_template) {
            return res.status(400).json({ error: 'trigger_event and message_template are required' });
        }
        
        const insertAutomation = db.prepare(`
            INSERT INTO automations (trigger_event, message_template, channel, enabled, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `);
        
        const result = insertAutomation.run(
            trigger_event,
            message_template,
            channel || 'WhatsApp',
            enabled !== undefined ? (enabled ? 1 : 0) : 1
        );
        
        const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(result.lastInsertRowid);
        
        console.log(`🤖 Automation created: ${trigger_event}`);
        
        res.json({
            success: true,
            automation,
            message: 'Automation created successfully'
        });
        
    } catch (error) {
        console.error('Automation creation error:', error);
        res.status(500).json({ error: 'Failed to create automation' });
    }
});

// Update automation
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { trigger_event, message_template, channel, enabled } = req.body;
        
        const updateFields = [];
        const values = [];
        
        if (trigger_event) {
            updateFields.push('trigger_event = ?');
            values.push(trigger_event);
        }
        if (message_template) {
            updateFields.push('message_template = ?');
            values.push(message_template);
        }
        if (channel) {
            updateFields.push('channel = ?');
            values.push(channel);
        }
        if (enabled !== undefined) {
            updateFields.push('enabled = ?');
            values.push(enabled);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        const updateAutomation = db.prepare(`
            UPDATE automations 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `);
        
        const result = updateAutomation.run(...values);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Automation not found' });
        }
        
        const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(id);
        
        console.log(`🤖 Automation updated: ${automation.trigger_event}`);
        
        res.json({
            success: true,
            automation,
            message: 'Automation updated successfully'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete automation
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = db.prepare('DELETE FROM automations WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Automation not found' });
        }
        
        console.log(`🗑️ Automation deleted: ${id}`);
        
        res.json({
            success: true,
            message: 'Automation deleted successfully'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger automation
router.post('/trigger', async (req, res) => {
    try {
        const { trigger_event, data } = req.body;
        
        if (!trigger_event) {
            return res.status(400).json({ error: 'trigger_event is required' });
        }
        
        // Get enabled automations for this trigger
        const automations = db.prepare(`
            SELECT * FROM automations 
            WHERE trigger_event = ? AND enabled = 1
        `).all(trigger_event);
        
        if (automations.length === 0) {
            return res.json({
                success: true,
                message: 'No automations found for this trigger',
                triggered: 0
            });
        }
        
        // Process message template with data
        const processTemplate = (template, data) => {
            return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return data[key] || match;
            });
        };
        
        // Send notifications (simplified - you'd integrate with your notification system)
        const notifications = require('../utils/notifications');
        
        for (const automation of automations) {
            const processedMessage = processTemplate(automation.message_template, data);
            
            try {
                // Here you would send based on channel
                if (automation.channel === 'Email' && data.customer_email) {
                    await notifications.sendCustomerConfirmation({
                        ...data,
                        email: data.customer_email,
                        customMessage: processedMessage
                    });
                }
                
                console.log(`🤖 Automation triggered: ${trigger_event} via ${automation.channel}`);
                
            } catch (notifError) {
                console.log(`Automation notification error:`, notifError);
            }
        }
        
        res.json({
            success: true,
            message: `Triggered ${automations.length} automation(s)`,
            triggered: automations.length
        });
        
    } catch (error) {
        console.error('Automation trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger automation' });
    }
});

// Get available triggers
router.get('/triggers', async (req, res) => {
    try {
        const triggers = [
            { value: 'Job Created', label: 'When a new job is created' },
            { value: 'Job Completed', label: 'When a job is marked completed' },
            { value: 'Payment Due', label: 'When payment is due' },
            { value: 'Job Assigned', label: 'When a job is assigned to staff' },
            { value: 'Customer Booking', label: 'When a customer makes a booking' }
        ];
        
        res.json(triggers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
