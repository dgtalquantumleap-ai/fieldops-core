const nodemailer = require('nodemailer');
require('dotenv').config();

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
    const { name, email, service, date, time, address } = bookingData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Booking Confirmation - Stilt Heights',
        html: `
            <h2>Booking Confirmed!</h2>
            <p>Hi ${name},</p>
            <p>Your booking has been confirmed. Here are the details:</p>
            <ul>
                <li><strong>Service:</strong> ${service}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time || '09:00'}</li>
                <li><strong>Location:</strong> ${address}</li>
            </ul>
            <p>We'll see you soon!</p>
            <p>Best regards,<br>Stilt Heights Team</p>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Customer confirmation sent to ${email}`);
    } catch (error) {
        console.error('Failed to send customer confirmation:', error);
        throw error;
    }
};

// Send admin notification email
const sendAdminNotification = async (bookingData) => {
    const { name, email, phone, service, date, time, address, notes } = bookingData;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Booking: ${service} - ${name}`,
        html: `
            <h2>New Booking Received!</h2>
            <p>A new booking has been made:</p>
            <ul>
                <li><strong>Customer:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Phone:</strong> ${phone}</li>
                <li><strong>Service:</strong> ${service}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time || '09:00'}</li>
                <li><strong>Location:</strong> ${address}</li>
                <li><strong>Notes:</strong> ${notes || 'None'}</li>
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
        subject: `Invoice ${invoice_number} from Stilt Heights`,
        html: `
            <h2>Invoice Generated</h2>
            <p>Hi ${customer_name},</p>
            <p>Your invoice for the completed service is now available:</p>
            <ul>
                <li><strong>Invoice Number:</strong> ${invoice_number}</li>
                <li><strong>Service:</strong> ${service_name}</li>
                <li><strong>Amount:</strong> $${amount}</li>
                <li><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString()}</li>
            </ul>
            <p>Payment is due within 30 days. Thank you for your business!</p>
            <p>Best regards,<br>Stilt Heights Team</p>
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

module.exports = {
    sendCustomerConfirmation,
    sendAdminNotification,
    sendSMS,
    sendInvoiceNotification
};
