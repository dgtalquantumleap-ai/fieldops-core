const webpush = require('web-push');
const db = require('../config/database');

// Configure VAPID — runs once on require
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@fieldops.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('⚠️  VAPID keys not set — push notifications disabled. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env');
}

/**
 * Send a push notification to a single user (all their subscribed devices)
 * @param {number} userId
 * @param {object} payload  { title, body, tag, url }
 */
async function sendToUser(userId, payload) {
    if (!process.env.VAPID_PUBLIC_KEY) return;

    const { rows: subscriptions } = await db.query(
        'SELECT * FROM push_subscriptions WHERE user_id = $1',
        [userId]
    );

    if (!subscriptions.length) return;

    const message = JSON.stringify({
        title: payload.title || 'Stilt Heights',
        body: payload.body || '',
        tag: payload.tag || 'fieldops',
        url: payload.url || '/staff/index.html'
    });

    const results = await Promise.allSettled(
        subscriptions.map(sub => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            return webpush.sendNotification(pushSub, message).catch(async err => {
                // 410 Gone = subscription expired, remove it
                if (err.statusCode === 410) {
                    await db.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                    console.log(`🗑️  Removed expired push subscription for user ${userId}`);
                } else {
                    console.warn(`⚠️  Push failed for user ${userId}:`, err.message);
                }
            });
        })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    if (sent) console.log(`📲 Push sent to ${sent} device(s) for user ${userId}`);
}

/**
 * Notify an assigned staff member about a new job
 */
async function notifyJobAssigned(staffUserId, jobDetails) {
    await sendToUser(staffUserId, {
        title: '📋 New Job Assigned',
        body: `${jobDetails.service} for ${jobDetails.customerName} on ${jobDetails.date} at ${jobDetails.time}`,
        tag: `job-assigned-${jobDetails.jobId}`,
        url: '/staff/index.html'
    });
}

/**
 * Notify staff about a job update (reschedule, cancellation, etc.)
 */
async function notifyJobUpdated(staffUserId, jobDetails) {
    await sendToUser(staffUserId, {
        title: '🔄 Job Updated',
        body: `${jobDetails.service} — Status: ${jobDetails.status}`,
        tag: `job-updated-${jobDetails.jobId}`,
        url: '/staff/index.html'
    });
}

module.exports = { sendToUser, notifyJobAssigned, notifyJobUpdated };
