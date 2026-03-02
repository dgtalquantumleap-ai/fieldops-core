/**
 * Automated Scheduling System
 * Features: follow-ups, appointment reminders (24h + 2h), overdue invoice chase,
 * daily morning briefing, recurring job creation, customer rating requests,
 * re-engagement. All schedulers respect notification settings stored in DB.
 */

const cron = require('node-cron');
const db = require('../config/database');
const aiAutomation = require('./aiAutomation');
const notifications = require('./notifications');
const branding = require('../config/branding');

let isInitialized = false;

// ── Helper: read a notification setting ──────────────────────
async function getSetting(key, defaultVal = 'true') {
    try {
        const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
        return rows[0] ? rows[0].value : defaultVal;
    } catch (_) { return defaultVal; }
}
async function isEnabled(key) { return (await getSetting(key)) === 'true'; }

function initSchedulers() {
    if (isInitialized) { console.log('⚠️ Schedulers already initialized'); return; }
    console.log('🔄 Initializing automated schedulers...');

    // ════════════════════════════════════════════════
    // SCHEDULER 1: 24-Hour Post-Job Follow-ups
    // Runs every hour
    // ════════════════════════════════════════════════
    cron.schedule('0 * * * *', async () => {
        if (!await isEnabled('notif_customer_rating')) return;
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, c.name AS customer_name, c.email AS customer_email,
                       u.name AS staff_name, s.name AS service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.status = 'Completed'
                  AND j.updated_at < NOW() - INTERVAL '24 hours'
                  AND j.updated_at > NOW() - INTERVAL '25 hours'
                  AND (j.follow_up_sent IS NULL OR j.follow_up_sent = 0)
            `);
            for (const job of jobs) {
                try {
                    if (job.customer_email) {
                        const APP_URL = process.env.APP_URL || 'http://localhost:3000';
                        const { createReviewToken } = require('../routes/reviews');
                        const token = await createReviewToken(job.id, job.customer_id);
                        const rateLink = `${APP_URL}/rate-us.html?token=${token}`;
                        await notifications.sendEmail({
                            to: job.customer_email,
                            subject: `⭐ How was your ${job.service_name}? Leave a Review`,
                            html: `<h2>Hi ${job.customer_name},</h2>
                                   <p>Thank you for choosing ${branding.name}! We hope you loved your <strong>${job.service_name}</strong>.</p>
                                   <p>Could you spare 30 seconds to rate your experience?</p>
                                   <p><a href="${rateLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;margin:10px 0;">⭐ Rate Your Service</a></p>
                                   <p>Your feedback helps us improve and grow. Thank you!</p>`
                        });
                    }
                    await db.query('UPDATE jobs SET follow_up_sent = 1, rating_request_sent = 1 WHERE id = $1', [job.id]);
                } catch (e) { console.error(`❌ Follow-up failed for job ${job.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ Follow-up scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 2: 3-Day Payment Reminder
    // Runs daily at 9 AM
    // ════════════════════════════════════════════════
    cron.schedule('0 9 * * *', async () => {
        if (!await isEnabled('notif_overdue_invoice')) return;
        try {
            const { rows: invoices } = await db.query(`
                SELECT i.*, c.name AS customer_name, c.email AS customer_email
                FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
                WHERE (i.issued_at + INTERVAL '30 days')::DATE = (NOW() + INTERVAL '3 days')::DATE
                  AND i.status = 'unpaid'
                  AND (i.reminder_sent_3day IS NULL OR i.reminder_sent_3day = 0)
                  AND i.deleted_at IS NULL
            `);
            for (const inv of invoices) {
                try {
                    if (inv.customer_email) {
                        await notifications.sendEmail({
                            to: inv.customer_email,
                            subject: `💳 Payment Reminder: Invoice ${inv.invoice_number} Due in 3 Days`,
                            html: `<p>Hi ${inv.customer_name},</p>
                                   <p>This is a friendly reminder that invoice <strong>${inv.invoice_number}</strong> for <strong>$${inv.amount}</strong> is due in 3 days.</p>
                                   <p>Please contact us to arrange payment. Thank you!</p>`
                        });
                    }
                    await db.query('UPDATE invoices SET reminder_sent_3day = 1 WHERE id = $1', [inv.id]);
                } catch (e) { console.error(`❌ Payment reminder failed for invoice ${inv.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ Payment reminder scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 3: Overdue Invoice Chase (7+ days unpaid)
    // Runs daily at 10 AM
    // ════════════════════════════════════════════════
    cron.schedule('0 10 * * *', async () => {
        if (!await isEnabled('notif_overdue_invoice')) return;
        try {
            const days = parseInt(await getSetting('notif_overdue_invoice_days', '7'));
            const { rows: invoices } = await db.query(`
                SELECT i.*, c.name AS customer_name, c.email AS customer_email
                FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
                WHERE i.status = 'unpaid'
                  AND i.issued_at < NOW() - ($1 || ' days')::INTERVAL
                  AND i.deleted_at IS NULL
                  AND c.email IS NOT NULL
            `, [days]);
            for (const inv of invoices) {
                try {
                    await notifications.sendEmail({
                        to: inv.customer_email,
                        subject: `⚠️ Overdue: Invoice ${inv.invoice_number} — Action Required`,
                        html: `<p>Hi ${inv.customer_name},</p>
                               <p>Invoice <strong>${inv.invoice_number}</strong> for <strong>$${inv.amount}</strong> is now overdue.</p>
                               <p>Please contact us at <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a> to settle this at your earliest convenience.</p>
                               <p>Thank you, ${branding.name}</p>`
                    });
                    await db.query("UPDATE invoices SET status = 'overdue' WHERE id = $1", [inv.id]);
                } catch (e) { console.error(`❌ Overdue chase failed for invoice ${inv.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ Overdue invoice scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 4: 24-Hour Appointment Reminder (runs at 2 PM daily)
    // ════════════════════════════════════════════════
    cron.schedule('0 14 * * *', async () => {
        if (!await isEnabled('notif_appt_reminder_24h')) return;
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, c.name AS customer_name, c.phone AS customer_phone,
                       c.email AS customer_email, u.name AS staff_name, u.email AS staff_email,
                       s.name AS service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.job_date::DATE = (NOW() + INTERVAL '1 day')::DATE
                  AND j.status IN ('Scheduled','In Progress')
                  AND (j.reminder_sent IS NULL OR j.reminder_sent = 0)
                  AND j.deleted_at IS NULL
            `);
            for (const job of jobs) {
                try {
                    if (job.customer_email) {
                        await notifications.sendEmail({
                            to: job.customer_email,
                            subject: `📅 Reminder: Your ${job.service_name} is Tomorrow`,
                            html: `<h2>Hi ${job.customer_name},</h2>
                                   <p>Just a reminder that your <strong>${job.service_name}</strong> is scheduled for <strong>tomorrow, ${job.job_date}</strong> at <strong>${job.job_time || '09:00'}</strong> at ${job.location}.</p>
                                   <p>If you need to reschedule, please call us as soon as possible.</p>
                                   <p>See you tomorrow! — ${branding.name}</p>`
                        });
                    }
                    if (job.staff_email) {
                        await notifications.sendEmail({
                            to: job.staff_email,
                            subject: `📅 Tomorrow: ${job.service_name} at ${job.job_time || '09:00'}`,
                            html: `<p>Hi ${job.staff_name}, you have a job tomorrow:</p>
                                   <ul><li><strong>Service:</strong> ${job.service_name}</li>
                                   <li><strong>Time:</strong> ${job.job_time || '09:00'}</li>
                                   <li><strong>Customer:</strong> ${job.customer_name} (${job.customer_phone})</li>
                                   <li><strong>Address:</strong> ${job.location}</li></ul>`
                        });
                    }
                    await db.query('UPDATE jobs SET reminder_sent = 1 WHERE id = $1', [job.id]);
                } catch (e) { console.error(`❌ 24h reminder failed for job ${job.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ 24h reminder scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 5: 2-Hour Appointment Reminder
    // Runs every 30 minutes
    // ════════════════════════════════════════════════
    cron.schedule('*/30 * * * *', async () => {
        if (!await isEnabled('notif_appt_reminder_2h')) return;
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, c.name AS customer_name, c.email AS customer_email, s.name AS service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.job_date::DATE = NOW()::DATE
                  AND j.status = 'Scheduled'
                  AND j.deleted_at IS NULL
                  AND c.email IS NOT NULL
                  AND (j.job_time IS NOT NULL)
                  AND TO_TIMESTAMP(j.job_date || ' ' || j.job_time, 'YYYY-MM-DD HH24:MI')
                      BETWEEN NOW() + INTERVAL '1h55m' AND NOW() + INTERVAL '2h5m'
                  AND (j.reminder_2h_sent IS NULL OR j.reminder_2h_sent = 0)
            `);
            for (const job of jobs) {
                try {
                    await notifications.sendEmail({
                        to: job.customer_email,
                        subject: `🔔 Your ${job.service_name} starts in 2 hours`,
                        html: `<p>Hi ${job.customer_name},</p>
                               <p>Your <strong>${job.service_name}</strong> at ${job.location} starts in about <strong>2 hours</strong> at <strong>${job.job_time}</strong>.</p>
                               <p>Our team is on the way! — ${branding.name}</p>`
                    });
                    await db.query('UPDATE jobs SET reminder_2h_sent = 1 WHERE id = $1', [job.id]);
                } catch (e) { console.error(`❌ 2h reminder failed for job ${job.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ 2h reminder scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 6: Daily Morning Briefing (7 AM)
    // ════════════════════════════════════════════════
    cron.schedule('0 7 * * *', async () => {
        if (!await isEnabled('notif_daily_briefing')) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const [jobsRes, invoiceRes] = await Promise.all([
                db.query(`
                    SELECT j.*, c.name AS customer_name, s.name AS service_name, u.name AS staff_name
                    FROM jobs j
                    LEFT JOIN customers c ON j.customer_id = c.id
                    LEFT JOIN services s ON j.service_id = s.id
                    LEFT JOIN users u ON j.assigned_to = u.id
                    WHERE j.job_date = $1 AND j.deleted_at IS NULL AND j.status != 'Cancelled'
                    ORDER BY j.job_time ASC
                `, [today]),
                db.query(`
                    SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
                    FROM invoices WHERE status='unpaid' AND deleted_at IS NULL
                `),
            ]);
            const jobs = jobsRes.rows;
            const { count: unpaidCount, total: unpaidTotal } = invoiceRes.rows[0];
            const unassigned = jobs.filter(j => !j.staff_name).length;

            let jobHtml = jobs.length === 0
                ? '<p>No jobs scheduled for today.</p>'
                : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
                     <tr style="background:#1e40af;color:#fff"><th>Time</th><th>Customer</th><th>Service</th><th>Staff</th></tr>
                     ${jobs.map(j => `<tr><td>${j.job_time||'TBD'}</td><td>${j.customer_name}</td><td>${j.service_name}</td><td>${j.staff_name||'⚠️ Unassigned'}</td></tr>`).join('')}
                   </table>`;

            await notifications.sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: `☀️ Daily Briefing — ${today} (${jobs.length} jobs)`,
                html: `<h2>Good morning! Here's your day at a glance.</h2>
                       <p>📅 <strong>${jobs.length} jobs</strong> today${unassigned > 0 ? ` — ⚠️ <strong>${unassigned} unassigned</strong>` : ' — all assigned ✅'}</p>
                       ${jobHtml}
                       <br>
                       <p>💰 Outstanding invoices: <strong>${unpaidCount}</strong> totalling <strong>$${parseFloat(unpaidTotal).toFixed(2)}</strong></p>
                       <p style="color:#64748b;font-size:12px">${branding.name} Operations — FieldOps</p>`
            });
        } catch (e) { console.error('❌ Daily briefing scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 7: Recurring Job Creation (midnight)
    // Creates next occurrence for recurring jobs
    // ════════════════════════════════════════════════
    cron.schedule('0 0 * * *', async () => {
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, s.name AS service_name
                FROM jobs j LEFT JOIN services s ON j.service_id = s.id
                WHERE j.recurrence_rule IS NOT NULL
                  AND j.recurrence_rule != ''
                  AND j.deleted_at IS NULL
                  AND j.status != 'Cancelled'
                  AND (j.recurrence_end_date IS NULL OR j.recurrence_end_date::DATE >= NOW()::DATE)
                  AND NOT EXISTS (
                      SELECT 1 FROM jobs child
                      WHERE child.parent_job_id = j.id
                        AND child.job_date::DATE >= NOW()::DATE
                        AND child.deleted_at IS NULL
                  )
            `);
            for (const job of jobs) {
                try {
                    const nextDate = getNextOccurrence(job.job_date, job.recurrence_rule);
                    if (!nextDate) continue;
                    if (job.recurrence_end_date && nextDate > job.recurrence_end_date) continue;
                    await db.query(`
                        INSERT INTO jobs (customer_id, service_id, assigned_to, job_date, job_time, location, notes,
                                          status, estimated_duration, recurrence_rule, parent_job_id, recurrence_end_date, created_at, updated_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,'Scheduled',$8,$9,$10,$11,NOW(),NOW())
                    `, [job.customer_id, job.service_id, job.assigned_to, nextDate, job.job_time,
                        job.location, job.notes, job.estimated_duration, job.recurrence_rule, job.id, job.recurrence_end_date]);
                    console.log(`🔁 Recurring job created for ${nextDate} (parent #${job.id})`);
                } catch (e) { console.error(`❌ Recurring job creation failed for job ${job.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ Recurring jobs scheduler error:', e.message); }
    });

    // ════════════════════════════════════════════════
    // SCHEDULER 8: Re-engagement (30-day inactive, Monday 10AM)
    // ════════════════════════════════════════════════
    cron.schedule('0 10 * * 1', async () => {
        if (!await isEnabled('notif_reengagement')) return;
        try {
            const { rows: customers } = await db.query(`
                SELECT c.* FROM customers c
                WHERE c.deleted_at IS NULL AND c.email IS NOT NULL
                  AND (c.last_engagement_sent IS NULL OR c.last_engagement_sent < NOW() - INTERVAL '30 days')
                  AND NOT EXISTS (
                      SELECT 1 FROM jobs j WHERE j.customer_id = c.id AND j.created_at > NOW() - INTERVAL '30 days'
                  )
            `);
            for (const customer of customers) {
                try {
                    await notifications.sendEmail({
                        to: customer.email,
                        subject: '🎉 We Miss You! Book Your Next Cleaning',
                        html: `<p>Hi ${customer.name},</p>
                               <p>It's been a while since your last service with ${branding.name}.</p>
                               <p>We'd love to have you back — book online anytime at your convenience.</p>
                               <p>Best regards, ${branding.name} Team</p>`
                    });
                    await db.query('UPDATE customers SET last_engagement_sent = NOW() WHERE id = $1', [customer.id]);
                } catch (e) { console.error(`❌ Re-engagement failed for customer ${customer.id}:`, e.message); }
            }
        } catch (e) { console.error('❌ Re-engagement scheduler error:', e.message); }
    });

    isInitialized = true;
    console.log('✅ All schedulers initialized successfully');
}

// ── Helper: compute next recurrence date ──────────────────────
function getNextOccurrence(lastDate, rule) {
    const d = new Date(lastDate);
    if (isNaN(d.getTime())) return null;
    switch (rule) {
        case 'weekly':      d.setDate(d.getDate() + 7);  break;
        case 'biweekly':    d.setDate(d.getDate() + 14); break;
        case 'monthly':     d.setMonth(d.getMonth() + 1); break;
        case 'quarterly':   d.setMonth(d.getMonth() + 3); break;
        default: return null;
    }
    return d.toISOString().split('T')[0];
}

function stopSchedulers() {
    cron.getTasks().forEach(task => task.stop());
    isInitialized = false;
    console.log('⏹️ All schedulers stopped');
}

module.exports = { initSchedulers, stopSchedulers };
