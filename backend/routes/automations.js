const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all automations
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM automations ORDER BY created_at ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create automation
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { trigger_event, message_template, channel, enabled } = req.body;

        if (!trigger_event || !message_template) {
            return res.status(400).json({ error: 'trigger_event and message_template are required' });
        }

        const result = await db.query(
            `INSERT INTO automations (trigger_event, message_template, channel, is_active, created_at)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [trigger_event, message_template, channel || 'Email', enabled !== false ? true : false]
        );

        const automation = (await db.query('SELECT * FROM automations WHERE id = $1', [result.rows[0].id])).rows[0];
        console.log(`🤖 Automation created: ${trigger_event}`);

        res.json({ success: true, automation, message: 'Automation created successfully' });
    } catch (error) {
        console.error('Automation creation error:', error);
        res.status(500).json({ error: 'Failed to create automation' });
    }
});

// Update automation
router.patch('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { trigger_event, message_template, channel, enabled } = req.body;

        const updates = ['updated_at = NOW()'];
        const values = [];
        let idx = 1;

        if (trigger_event)       { updates.push(`trigger_event = $${idx++}`);     values.push(trigger_event); }
        if (message_template)    { updates.push(`message_template = $${idx++}`);  values.push(message_template); }
        if (channel)             { updates.push(`channel = $${idx++}`);           values.push(channel); }
        if (enabled !== undefined) { updates.push(`is_active = $${idx++}`);       values.push(enabled ? true : false); }

        if (updates.length === 1) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const result = await db.query(
            `UPDATE automations SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Automation not found' });

        const automation = (await db.query('SELECT * FROM automations WHERE id = $1', [id])).rows[0];
        console.log(`🤖 Automation updated: ${automation.trigger_event}`);

        res.json({ success: true, automation, message: 'Automation updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete automation
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM automations WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Automation not found' });
        console.log(`🗑️ Automation deleted: ${req.params.id}`);
        res.json({ success: true, message: 'Automation deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manually trigger an automation
router.post('/trigger', requireAdmin, async (req, res) => {
    try {
        const { trigger_event, data } = req.body;
        if (!trigger_event) return res.status(400).json({ error: 'trigger_event is required' });

        const { rows: automations } = await db.query(
            'SELECT * FROM automations WHERE trigger_event = $1 AND is_active = true',
            [trigger_event]
        );

        if (automations.length === 0) {
            return res.json({ success: true, message: 'No automations found for this trigger', triggered: 0 });
        }

        const processTemplate = (template, data) =>
            template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);

        const notifications = require('../utils/notifications');

        for (const automation of automations) {
            const processedMessage = processTemplate(automation.message_template, data || {});
            try {
                if (automation.channel === 'Email' && data?.customer_email) {
                    await notifications.sendEmail({
                        to: data.customer_email,
                        subject: `FieldOps: ${trigger_event}`,
                        body: processedMessage
                    });
                }
                console.log(`🤖 Automation triggered: ${trigger_event} via ${automation.channel}`);
            } catch (notifError) {
                console.warn('Automation notification error:', notifError.message);
            }
        }

        res.json({ success: true, message: `Triggered ${automations.length} automation(s)`, triggered: automations.length });
    } catch (error) {
        console.error('Automation trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger automation' });
    }
});

// Get available trigger types
router.get('/triggers', (_req, res) => {
    res.json([
        { value: 'Booking Confirmed', label: 'When a customer makes a booking' },
        { value: 'Job Scheduled',     label: 'When a job is scheduled' },
        { value: 'Job Completed',     label: 'When a job is marked completed' },
        { value: 'Payment Due',       label: 'When payment is due' },
        { value: 'Job Assigned',      label: 'When a job is assigned to staff' },
    ]);
});

module.exports = router;
