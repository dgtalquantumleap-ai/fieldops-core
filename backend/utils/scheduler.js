/**
 * Automated Scheduling System
 * Handles recurring tasks: follow-ups, payment reminders, job reminders, re-engagement.
 */

const cron = require('node-cron');
const db = require('../config/database');
const aiAutomation = require('./aiAutomation');
const notifications = require('./notifications');

let isInitialized = false;

function initSchedulers() {
    if (isInitialized) {
        console.log('⚠️ Schedulers already initialized');
        return;
    }

    console.log('🔄 Initializing automated schedulers...');

    // ============================================
    // SCHEDULER 1: 24-Hour Post-Job Follow-ups
    // Runs every hour
    // ============================================
    cron.schedule('0 * * * *', async () => {
        console.log('📋 [Scheduler] Checking for 24-hour follow-ups...');
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, c.name as customer_name, c.email as customer_email,
                       u.name as staff_name, s.name as service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.status = 'Completed'
                  AND j.updated_at < NOW() - INTERVAL '24 hours'
                  AND j.updated_at > NOW() - INTERVAL '25 hours'
                  AND (j.follow_up_sent IS NULL OR j.follow_up_sent = false)
            `);

            if (jobs.length > 0) {
                console.log(`✅ Found ${jobs.length} jobs needing follow-up`);
                for (const job of jobs) {
                    try {
                        const aiMessage = await aiAutomation.generateFollowUpMessage({
                            customer_name: job.customer_name || 'Valued Customer',
                            customer_email: job.customer_email || '',
                            service_name: job.service_name || 'Our Service',
                            staff_name: job.staff_name || 'Our Team'
                        });

                        if (job.customer_email) {
                            await notifications.sendEmail({
                                to: job.customer_email,
                                subject: `⭐ How was your ${job.service_name}? - Leave a Review`,
                                body: aiMessage
                            });
                            console.log(`📧 Follow-up sent to ${job.customer_name}`);
                        }

                        await db.query('UPDATE jobs SET follow_up_sent = true WHERE id = $1', [job.id]);
                    } catch (error) {
                        console.error(`❌ Follow-up failed for job ${job.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Follow-up scheduler error:', error.message);
        }
    });

    // ============================================
    // SCHEDULER 2: Payment Reminders (3 days before due)
    // Runs daily at 9 AM
    // ============================================
    cron.schedule('0 9 * * *', async () => {
        console.log('📋 [Scheduler] Checking for upcoming payment reminders...');
        try {
            const { rows: invoices } = await db.query(`
                SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE (i.issued_at + INTERVAL '30 days')::DATE = (NOW() + INTERVAL '3 days')::DATE
                  AND i.status = 'unpaid'
                  AND (i.reminder_sent_3day IS NULL OR i.reminder_sent_3day = false)
                  AND i.deleted_at IS NULL
            `);

            if (invoices.length > 0) {
                console.log(`✅ Found ${invoices.length} invoices due in 3 days`);
                for (const invoice of invoices) {
                    try {
                        const aiReminder = await aiAutomation.generateInvoiceReminder({
                            customer_name: invoice.customer_name || 'Customer',
                            invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
                            amount: invoice.amount || 0,
                            due_date: invoice.due_date
                        });

                        if (invoice.customer_email) {
                            await notifications.sendEmail({
                                to: invoice.customer_email,
                                subject: `💳 Payment Reminder: Invoice Due in 3 Days`,
                                body: aiReminder
                            });
                            console.log(`📧 Payment reminder sent to ${invoice.customer_name}`);
                        }

                        await db.query('UPDATE invoices SET reminder_sent_3day = true WHERE id = $1', [invoice.id]);
                    } catch (error) {
                        console.error(`❌ Payment reminder failed for invoice ${invoice.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Payment reminder scheduler error:', error.message);
        }
    });

    // ============================================
    // SCHEDULER 3: Job Start Reminders (Day before)
    // Runs daily at 2 PM
    // ============================================
    cron.schedule('0 14 * * *', async () => {
        console.log('📋 [Scheduler] Checking for upcoming job reminders...');
        try {
            const { rows: jobs } = await db.query(`
                SELECT j.*, c.name as customer_name, c.phone as customer_phone,
                       c.email as customer_email, u.name as staff_name,
                       u.email as staff_email, s.name as service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.job_date::DATE = (NOW() + INTERVAL '1 day')::DATE
                  AND j.status IN ('Scheduled', 'In Progress')
                  AND (j.reminder_sent IS NULL OR j.reminder_sent = false)
                  AND j.deleted_at IS NULL
            `);

            if (jobs.length > 0) {
                console.log(`✅ Found ${jobs.length} jobs scheduled for tomorrow`);
                for (const job of jobs) {
                    try {
                        if (job.customer_email) {
                            await notifications.sendEmail({
                                to: job.customer_email,
                                subject: `📅 Reminder: Your ${job.service_name} is Tomorrow`,
                                html: `<p>Hi ${job.customer_name},</p><p>Just a reminder that your <strong>${job.service_name}</strong> service is scheduled for <strong>${job.job_date}</strong> at <strong>${job.job_time || '09:00'}</strong> at ${job.location}.</p><p>If you need to reschedule, please contact us as soon as possible.</p><p>Best regards,<br>Stilt Heights Team</p>`
                            });
                            console.log(`📧 Job reminder sent to ${job.customer_name}`);
                        }

                        if (job.staff_email) {
                            await notifications.sendEmail({
                                to: job.staff_email,
                                subject: `📅 Reminder: Job Tomorrow at ${job.job_time || '09:00'}`,
                                html: `<p>Hi ${job.staff_name},</p><p>You have a <strong>${job.service_name}</strong> job scheduled for <strong>${job.job_date}</strong> at <strong>${job.job_time || '09:00'}</strong> with ${job.customer_name} at ${job.location}.</p><p>Please be on time!</p>`
                            });
                            console.log(`📧 Job reminder sent to staff ${job.staff_name}`);
                        }

                        await db.query('UPDATE jobs SET reminder_sent = true WHERE id = $1', [job.id]);
                    } catch (error) {
                        console.error(`❌ Job reminder failed for job ${job.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Job reminder scheduler error:', error.message);
        }
    });

    // ============================================
    // SCHEDULER 4: Re-engagement (30 days inactive)
    // Runs weekly on Monday at 10 AM
    // ============================================
    cron.schedule('0 10 * * 1', async () => {
        console.log('📋 [Scheduler] Checking for inactive customers...');
        try {
            const { rows: customers } = await db.query(`
                SELECT c.* FROM customers c
                WHERE c.deleted_at IS NULL
                  AND c.email IS NOT NULL
                  AND (c.last_engagement_sent IS NULL OR c.last_engagement_sent < NOW() - INTERVAL '30 days')
                  AND NOT EXISTS (
                      SELECT 1 FROM jobs j
                      WHERE j.customer_id = c.id
                        AND j.created_at > NOW() - INTERVAL '30 days'
                  )
            `);

            if (customers.length > 0) {
                console.log(`✅ Found ${customers.length} inactive customers`);
                for (const customer of customers) {
                    try {
                        await notifications.sendEmail({
                            to: customer.email,
                            subject: '🎉 We Miss You! 15% Off Your Next Cleaning',
                            html: `<p>Hi ${customer.name},</p><p>We haven't seen you in a while! We'd love to serve you again.</p><p>Book now and enjoy <strong>15% off</strong> your next service.</p><p>Best regards,<br>Stilt Heights Team</p>`
                        });

                        await db.query(
                            'UPDATE customers SET last_engagement_sent = NOW() WHERE id = $1',
                            [customer.id]
                        );

                        console.log(`📧 Re-engagement email sent to ${customer.name}`);
                    } catch (error) {
                        console.error(`❌ Re-engagement failed for customer ${customer.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Re-engagement scheduler error:', error.message);
        }
    });

    isInitialized = true;
    console.log('✅ All schedulers initialized successfully');
}

function stopSchedulers() {
    cron.getTasks().forEach(task => task.stop());
    isInitialized = false;
    console.log('⏹️ All schedulers stopped');
}

module.exports = { initSchedulers, stopSchedulers };
