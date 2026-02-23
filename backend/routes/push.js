const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/vapid-public-key', (_req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(503).json({ success: false, error: 'Push notifications not configured' });
    }
    res.json({ success: true, publicKey: key });
});

router.post('/subscribe', async (req, res) => {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ success: false, error: 'Invalid subscription object' });
    }

    try {
        await db.query(`
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(endpoint) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh  = EXCLUDED.p256dh,
                auth    = EXCLUDED.auth
        `, [req.user.id, endpoint, keys.p256dh, keys.auth]);

        console.log(`📲 Push subscription saved for user ${req.user.id}`);
        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('Push subscribe error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save subscription' });
    }
});

router.delete('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        return res.status(400).json({ success: false, error: 'Endpoint required' });
    }

    await db.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
        [req.user.id, endpoint]
    );

    res.json({ success: true, message: 'Unsubscribed' });
});

module.exports = router;
