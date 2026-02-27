const nodemailer = require('nodemailer');
const branding = require('../config/branding');
require('dotenv').config();

// ── Notification logger ──────────────────────────────────────
async function logNotification({ type, email, name, subject, status, error, jobId }) {
    try {
        const db = require('../config/database');
        const recipient = name && email ? `${name} <${email}>` : (email || name || null);
        await db.query(
            `INSERT INTO notification_log
             (type, recipient, subject, status, error, job_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [type || 'email', recipient, subject || null,
             status || 'sent', error || null, jobId || null]
        );
    } catch (_) { /* non-critical — never block email on log failure */ }
}

// Simple HTML escaper — prevents HTML injection via user-supplied fields in emails
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c]));

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send customer confirmation email
const sendCustomerConfirmation = async (bookingData) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Customer confirmation skipped: EMAIL_USER / EMAIL_PASS not configured');
        return;
    }
    const { name, email, service, date, time, address } = bookingData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Booking Confirmation — ${branding.name}`,
        html: `
            <h2>Booking Confirmed!</h2>
            <p>Hi ${esc(name)},</p>
            <p>Your booking has been confirmed. Here are the details:</p>
            <ul>
                <li><strong>Service:</strong> ${esc(service)}</li>
                <li><strong>Date:</strong> ${esc(date)}</li>
                <li><strong>Time:</strong> ${esc(time || '09:00')}</li>
                <li><strong>Location:</strong> ${esc(address)}</li>
            </ul>
            <p>We'll see you soon!</p>
            <p>Best regards,<br>${esc(branding.name)} Team</p>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Customer confirmation sent to ${email}`);
        await logNotification({ type: 'booking_confirmation', email, name, subject: 'Booking Confirmation' });
    } catch (error) {
        await logNotification({ type: 'booking_confirmation', email, name, subject: 'Booking Confirmation', status: 'failed', error: error.message });
        console.error('Failed to send customer confirmation:', error);
        throw error;
    }
};

// Send admin notification email
const sendAdminNotification = async (bookingData) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Admin notification skipped: EMAIL_USER / EMAIL_PASS not configured');
        return;
    }
    const { name, email, phone, service, date, time, address, notes } = bookingData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Booking: ${service} - ${name}`,
        html: `
            <h2>New Booking Received!</h2>
            <p>A new booking has been made:</p>
            <ul>
                <li><strong>Customer:</strong> ${esc(name)}</li>
                <li><strong>Email:</strong> ${esc(email)}</li>
                <li><strong>Phone:</strong> ${esc(phone)}</li>
                <li><strong>Service:</strong> ${esc(service)}</li>
                <li><strong>Date:</strong> ${esc(date)}</li>
                <li><strong>Time:</strong> ${esc(time || '09:00')}</li>
                <li><strong>Location:</strong> ${esc(address)}</li>
                <li><strong>Notes:</strong> ${esc(notes || 'None')}</li>
            </ul>
            <p>Please check your system for the full booking details.</p>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Admin notification sent to ${process.env.ADMIN_EMAIL}`);
    } catch (error) {
        console.error('Failed to send admin notification:', error);
        throw error;
    }
};

// Send SMS (placeholder - you would integrate with Twilio or similar service)
const sendSMS = async (phoneNumber, message) => {
    console.log(`📱 SMS to ${phoneNumber}: ${message}`);
    // TODO: Implement SMS service integration
    return Promise.resolve();
};

// Send invoice notification
const sendInvoiceNotification = async (invoiceData) => {
    const { customer_name, email, invoice_number, amount, due_date, service_name } = invoiceData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email || process.env.ADMIN_EMAIL,
        subject: `Invoice ${invoice_number} from ${branding.name}`,
        html: `
            <h2>Invoice Generated</h2>
            <p>Hi ${esc(customer_name)},</p>
            <p>Your invoice for the completed service is now available:</p>
            <ul>
                <li><strong>Invoice Number:</strong> ${esc(invoice_number)}</li>
                <li><strong>Service:</strong> ${esc(service_name)}</li>
                <li><strong>Amount:</strong> $${esc(amount)}</li>
                <li><strong>Due Date:</strong> ${esc(new Date(due_date).toLocaleDateString())}</li>
            </ul>
            <p>Payment is due within 30 days. Thank you for your business!</p>
            <p>Best regards,<br>${esc(branding.name)} Team</p>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Invoice notification sent for ${invoice_number}`);
    } catch (error) {
        console.error('Failed to send invoice notification:', error);
        throw error;
    }
};

/**
 * Generic email sender
 * @param {Object} opts - { to, subject, body (plain text) or html }
 */
const sendEmail = async ({ to, subject, body, html }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email skipped: EMAIL_USER / EMAIL_PASS not configured');
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: html || `<pre style="font-family:sans-serif">${body || ''}</pre>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}`);
        await logNotification({ type: 'email', email: to, subject, status: 'sent' });
    } catch (error) {
        await logNotification({ type: 'email', email: to, subject, status: 'failed', error: error.message });
        console.error(`Failed to send email to ${to}:`, error.message);
        throw error;
    }
};

module.exports = {
    sendCustomerConfirmation,
    sendAdminNotification,
    sendSMS,
    sendInvoiceNotification,
    sendEmail
};
