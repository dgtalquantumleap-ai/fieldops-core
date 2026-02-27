/**
 * Notifications Route — /api/notifications
 * Handles notification settings and notification log
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const notifications = require('../utils/notifications');

// Default notification settings
const DEFAULTS = {
    notif_new_booking:           'true',
    notif_job_complete:          'true',
    notif_daily_briefing:        'true',
    notif_daily_briefing_time:   '07:00',
    notif_overdue_invoice:       'true',
    notif_overdue_invoice_days:  '7',
    notif_appt_reminder_24h:     'true',
    notif_appt_reminder_2h:      'true',
    notif_customer_rating:       'true',
    notif_reengagement:          'true',
    notif_waiting_list:          'true',
};

// GET /api/notifications/settings
router.get('/settings', async (_req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT key, value FROM settings WHERE key LIKE 'notif_%'"
        );
        const merged = { ...DEFAULTS };
        rows.forEach(r => { merged[r.key] = r.value; });
        res.json({ success: true, data: merged });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/notifications/settings
router.put('/settings', async (req, res) => {
    try {
        const entries = Object.entries(req.body).filter(([k]) => k.startsWith('notif_'));
        await Promise.all(entries.map(([key, value]) =>
            db.query(
                `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [key, String(value)]
            )
        ));
        res.json({ success: true, message: 'Notification settings saved' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/notifications/log
router.get('/log', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = (parseInt(req.query.page || 1) - 1) * limit;
        const [rows, total] = await Promise.all([
            db.query(
                'SELECT * FROM notification_log ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            db.query('SELECT COUNT(*) AS count FROM notification_log'),
        ]);
        res.json({ success: true, data: rows.rows, total: parseInt(total.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/notifications/test — send a test email to admin
router.post('/test', async (req, res) => {
    try {
        await notifications.sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: '✅ FieldOps Test Notification',
            html: '<h2>Test notification</h2><p>Your notification settings are working correctly!</p>'
        });
        res.json({ success: true, message: `Test email sent to ${process.env.ADMIN_EMAIL}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
