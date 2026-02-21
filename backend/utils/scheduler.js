/**
 * Automated Scheduling System
 * Handles recurring tasks like follow-ups, reminders, etc.
 * 
 * Install: npm install node-cron
 * Usage: scheduler.initSchedulers(db, aiAutomation, notifications)
 */

const cron = require('node-cron');
const db = require('../config/database');
const aiAutomation = require('./aiAutomation');
const notifications = require('./notifications');

let isInitialized = false;

/**
 * Initialize all schedulers
 * Call once in server.js after database connection
 */
function initSchedulers() {
    if (isInitialized) {
        console.log('⚠️ Schedulers already initialized');
        return;
    }

    console.log('🔄 Initializing automated schedulers...');

    // ============================================
    // SCHEDULER 1: 24-Hour Post-Job Follow-ups
    // ============================================
    // Runs every hour: Sends follow-up to customers
    cron.schedule('0 * * * *', async () => {
        console.log('📋 [Scheduler] Checking for 24-hour follow-ups...');
        
        try {
            const jobsCompleted24hAgo = db.prepare(`
                SELECT j.*, c.name as customer_name, c.email as customer_email, 
                       u.name as staff_name, s.name as service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE j.status = 'Completed'
                AND j.updated_at < datetime('now', '-24 hours')
                AND j.updated_at > datetime('now', '-25 hours')
                AND j.follow_up_sent = 0
            `).all();

            if (jobsCompleted24hAgo.length > 0) {
                console.log(`✅ Found ${jobsCompleted24hAgo.length} jobs needing follow-up`);

                for (const job of jobsCompleted24hAgo) {
                    try {
                        // Generate AI follow-up message
                        const aiMessage = await aiAutomation.generateFollowUpMessage({
                            customer_name: job.customer_name || 'Valued Customer',
                            customer_email: job.customer_email || '',
                            service_name: job.service_name || 'Our Service',
                            staff_name: job.staff_name || 'Our Team'
                        });

                        // Send email if customer has email
                        if (job.customer_email) {
                            await notifications.sendEmail({
                                to: job.customer_email,
                                subject: `⭐ How was your ${job.service_name}? - Leave a Review`,
                                body: aiMessage
                            });

                            console.log(`📧 Follow-up sent to ${job.customer_name}`);
                        }

                        // Mark follow-up as sent
                        db.prepare('UPDATE jobs SET follow_up_sent = 1 WHERE id = ?').run(job.id);

                    } catch (error) {
                        console.error(`❌ Follow-up failed for job ${job.id}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Follow-up scheduler error:', error);
        }
    });

    // ============================================
    // SCHEDULER 2: Payment Reminders (3 days before due)
    // ============================================
    // Runs daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('📋 [Scheduler] Checking for upcoming payment reminders...');
        
        try {
            const invoicesDueSoon = db.prepare(`
                SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                WHERE date(i.issued_at, '+30 days') = date('now', '+3 days')
                AND i.status = 'unpaid'
                AND i.reminder_sent_3day = 0
            `).all();

            if (invoicesDueSoon.length > 0) {
                console.log(`✅ Found ${invoicesDueSoon.length} invoices due in 3 days`);

                for (const invoice of invoicesDueSoon) {
                    try {
                        // Generate AI reminder
                        const aiReminder = await aiAutomation.generateInvoiceReminder({
                            customer_name: invoice.customer_name || 'Customer',
                            invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
                            amount: invoice.total || 0,
                            due_date: invoice.due_date
                        });

                        // Send via email
                        if (invoice.customer_email) {
                            await notifications.sendEmail({
                                to: invoice.customer_email,
                                subject: `💳 Payment Reminder: Invoice Due in 3 Days`,
                                body: aiReminder
                            });
                            
                            console.log(`📧 Payment reminder sent to ${invoice.customer_name}`);
                        }

                        // Mark reminder as sent
                        db.prepare(
                            'UPDATE invoices SET reminder_sent_3day = 1 WHERE id = ?'
                        ).run(invoice.id);

                    } catch (error) {
                        console.error(`❌ Payment reminder failed for invoice ${invoice.id}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Payment reminder scheduler error:', error);
        }
    });

    // ============================================
    // SCHEDULER 3: Job Start Reminders (Day before)
    // ============================================
    // Runs daily at 2 PM
    cron.schedule('0 14 * * *', async () => {
        console.log('📋 [Scheduler] Checking for upcoming job reminders...');
        
        try {
            const jobsTomorrow = db.prepare(`
                SELECT j.*, c.name as customer_name, c.phone as customer_phone,
                       c.email as customer_email, u.name as staff_name, s.name as service_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                LEFT JOIN users u ON j.assigned_to = u.id
                LEFT JOIN services s ON j.service_id = s.id
                WHERE date(j.job_date) = date('now', '+1 day')
                AND j.status IN ('Scheduled', 'In Progress')
                AND j.reminder_sent = 0
            `).all();

            if (jobsTomorrow.length > 0) {
                console.log(`✅ Found ${jobsTomorrow.length} jobs scheduled for tomorrow`);

                for (const job of jobsTomorrow) {
                    try {
                        // Send customer reminder
                        if (job.customer_email) {
                            const customerReminder = `Hi ${job.customer_name},\n\n` +
                                `Just a friendly reminder that ${job.staff_name} will be at ${job.location} ` +
                                `tomorrow at ${job.job_date} for your ${job.service_name} service.\n\n` +
                                `If you need to reschedule, please let us know ASAP.\n\n` +
                                `Cheers,\nFieldOps Team`;

                            await notifications.sendEmail({
                                to: job.customer_email,
                                subject: `📅 Reminder: Your ${job.service_name} is Tomorrow`,
                                body: customerReminder
                            });

                            console.log(`📧 Job reminder sent to customer ${job.customer_name}`);
                        }

                        // Send staff reminder
                        if (job.assigned_to) {
                            const staffEmail = db.prepare(
                                'SELECT email FROM users WHERE id = ?'
                            ).get(job.assigned_to)?.email;

                            if (staffEmail) {
                                const staffReminder = `Hey ${job.staff_name},\n\n` +
                                    `You have a ${job.service_name} scheduled for ` +
                                    `${job.job_date} at ${job.job_time} with ${job.customer_name} ` +
                                    `at ${job.location}.\n\n` +
                                    `Make sure you're prepared and on time!\n\nThanks!`;

                                await notifications.sendEmail({
                                    to: staffEmail,
                                    subject: `📅 Reminder: Job Tomorrow at ${job.job_time}`,
                                    body: staffReminder
                                });

                                console.log(`📧 Job reminder sent to staff ${job.staff_name}`);
                            }
                        }

                        // Mark reminder as sent
                        db.prepare('UPDATE jobs SET reminder_sent = 1 WHERE id = ?').run(job.id);

                    } catch (error) {
                        console.error(`❌ Job reminder failed for job ${job.id}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Job reminder scheduler error:', error);
        }
    });

    // ============================================
    // SCHEDULER 4: Re-engagement Campaign (30 days inactive)
    // ============================================
    // Runs weekly on Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
        console.log('📋 [Scheduler] Checking for inactive customers...');
        
        try {
            const inactiveCustomers = db.prepare(`
                SELECT c.* FROM customers c
                WHERE c.deleted_at IS NULL
                AND (
                    SELECT COUNT(*) FROM jobs j 
                    WHERE j.customer_id = c.id 
                    AND j.created_at > datetime('now', '-30 days')
                ) = 0
                AND (
                    SELECT COUNT(*) FROM customers c2
                    WHERE c2.id = c.id 
                    AND (c2.last_engagement_sent IS NULL OR c2.last_engagement_sent < datetime('now', '-30 days'))
                ) > 0
            `).all();

            if (inactiveCustomers.length > 0) {
                console.log(`✅ Found ${inactiveCustomers.length} inactive customers`);

                for (const customer of inactiveCustomers) {
                    try {
                        if (customer.email) {
                            const reEngagementMsg = 
                                `Hi ${customer.name},\n\n` +
                                `We miss you! It's been a while since we've served you.\n\n` +
                                `We'd love to help with your next cleaning project. ` +
                                `Book now and get 15% off your next service!\n\n` +
                                `Link: [BOOKING_URL]\n\nThanks,\nFieldOps Team`;

                            await notifications.sendEmail({
                                to: customer.email,
                                subject: '🎉 We Miss You! 15% Off Your Next Cleaning',
                                body: reEngagementMsg
                            });

                            // Update last engagement sent
                            db.prepare(
                                "UPDATE customers SET last_engagement_sent = datetime('now') WHERE id = ?"
                            ).run(customer.id);

                            console.log(`📧 Re-engagement email sent to ${customer.name}`);
                        }
                    } catch (error) {
                        console.error(`❌ Re-engagement email failed for customer ${customer.id}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Re-engagement scheduler error:', error);
        }
    });

    isInitialized = true;
    console.log('✅ All schedulers initialized successfully');
}

/**
 * Stop all schedulers (for testing/cleanup)
 */
function stopSchedulers() {
    cron.getTasks().forEach(task => task.stop());
    isInitialized = false;
    console.log('⏹️ All schedulers stopped');
}

module.exports = {
    initSchedulers,
    stopSchedulers
};
