const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key so the frontend can subscribe
 */
router.get('/vapid-public-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(503).json({ success: false, error: 'Push notifications not configured' });
    }
    res.json({ success: true, publicKey: key });
});

/**
 * POST /api/push/subscribe
 * Save a push subscription for the authenticated user
 * Body: { endpoint, keys: { p256dh, auth } }
 */
router.post('/subscribe', (req, res) => {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ success: false, error: 'Invalid subscription object' });
    }

    try {
        // Upsert — update if the endpoint already exists for this user
        db.prepare(`
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
                user_id = excluded.user_id,
                p256dh  = excluded.p256dh,
                auth    = excluded.auth
        `).run(req.user.id, endpoint, keys.p256dh, keys.auth);

        console.log(`📲 Push subscription saved for user ${req.user.id} (${req.user.email})`);
        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('Push subscribe error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save subscription' });
    }
});

/**
 * DELETE /api/push/unsubscribe
 * Remove a push subscription
 * Body: { endpoint }
 */
router.delete('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        return res.status(400).json({ success: false, error: 'Endpoint required' });
    }

    db.prepare(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
    ).run(req.user.id, endpoint);

    res.json({ success: true, message: 'Unsubscribed' });
});

module.exports = router;
