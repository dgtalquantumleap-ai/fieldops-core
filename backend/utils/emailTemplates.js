const nodemailer = require('nodemailer');
require('dotenv').config();

const APP_URL = process.env.APP_URL || 'https://fieldops-production-6b97.up.railway.app';

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * BOOKING CONFIRMATION EMAIL TEMPLATE
 */
const bookingConfirmationEmail = (data) => {
  const {
    customer_name = 'Valued Customer',
    service_name = 'Service',
    job_date = 'TBD',
    job_time = 'TBD',
    address = 'TBD',
    job_id = '0000',
    support_link = `${APP_URL}/admin`,
    company_name = 'Stilt Heights',
    company_phone = '(555) 123-4567',
    company_email = 'info@stiltheights.com',
    company_website = 'www.stiltheights.com'
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        
        <!-- Main Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header with Gradient -->
            <div style="background: linear-gradient(135deg, #0066cc 0%, #00d4aa 100%); padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
                    ✓ Booking Confirmed
                </h1>
                <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    Your service booking is locked in
                </p>
            </div>

            <!-- Welcome Section -->
            <div style="padding: 40px 30px; border-bottom: 1px solid #f0f0f0;">
                <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                    Hi ${customer_name},
                </p>
                <p style="margin: 0; color: #666666; font-size: 15px; line-height: 1.7;">
                    Thank you for booking with us! We're excited to serve you. Your booking has been confirmed and our team is ready to deliver excellent service.
                </p>
            </div>

            <!-- Booking Details Card -->
            <div style="padding: 30px 30px; background-color: #f9f9f9; border-left: 4px solid #00d4aa;">
                <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600;">
                    Booking Details
                </h2>
                
                <!-- Detail Rows -->
                <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Service
                    </p>
                    <p style="margin: 0; color: #333333; font-size: 15px;">
                        ${service_name}
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Date & Time
                    </p>
                    <p style="margin: 0; color: #333333; font-size: 15px;">
                        ${job_date} at ${job_time}
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Service Location
                    </p>
                    <p style="margin: 0; color: #333333; font-size: 15px;">
                        ${address}
                    </p>
                </div>

                <div style="margin-bottom: 0;">
                    <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Reference Number
                    </p>
                    <p style="margin: 0; color: #0066cc; font-size: 15px; font-weight: 600;">
                        JOB-${job_id}
                    </p>
                </div>
            </div>

            <!-- What to Expect -->
            <div style="padding: 30px 30px; border-bottom: 1px solid #f0f0f0;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 16px; font-weight: 600;">
                    What to Expect
                </h2>
                <ul style="margin: 0; padding: 0; list-style: none; color: #666666;">
                    <li style="margin-bottom: 12px; padding-left: 25px; position: relative; font-size: 14px; line-height: 1.6;">
                        <span style="position: absolute; left: 0; color: #00d4aa; font-weight: bold;">✓</span>
                        Our team will arrive at the scheduled time with all necessary equipment
                    </li>
                    <li style="margin-bottom: 12px; padding-left: 25px; position: relative; font-size: 14px; line-height: 1.6;">
                        <span style="position: absolute; left: 0; color: #00d4aa; font-weight: bold;">✓</span>
                        Professional service delivered with attention to detail
                    </li>
                    <li style="margin-bottom: 12px; padding-left: 25px; position: relative; font-size: 14px; line-height: 1.6;">
                        <span style="position: absolute; left: 0; color: #00d4aa; font-weight: bold;">✓</span>
                        You'll receive a confirmation notification once service is complete
                    </li>
                    <li style="padding-left: 25px; position: relative; font-size: 14px; line-height: 1.6;">
                        <span style="position: absolute; left: 0; color: #00d4aa; font-weight: bold;">✓</span>
                        An invoice will be sent within 24 hours of service completion
                    </li>
                </ul>
            </div>

            <!-- CTA Button -->
            <div style="padding: 30px 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px;">
                    Need to reschedule or have questions?
                </p>
                <a href="${support_link}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #00d4aa 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; transition: all 0.3s ease;">
                    Contact Support
                </a>
            </div>

            <!-- Footer -->
            <div style="padding: 30px 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                    <strong>${company_name}</strong>
                </p>
                <p style="margin: 0 0 15px 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    ${company_phone}<br>
                    ${company_email}<br>
                    ${company_website}
                </p>
                <p style="margin: 0; color: #cccccc; font-size: 11px;">
                    © 2026 ${company_name}. All rights reserved.
                </p>
            </div>

        </div>

    </body>
    </html>
  `;
};

/**
 * INVOICE EMAIL TEMPLATE
 */
const invoiceEmail = (data) => {
  const {
    customer_name = 'Valued Customer',
    customer_email = 'customer@example.com',
    customer_phone = '(555) 123-4567',
    invoice_number = 'INV-000001',
    issued_date = new Date().toLocaleDateString(),
    due_date = 'TBD',
    service_name = 'Professional Service',
    job_date = 'TBD',
    amount = '0.00',
    payment_status = 'Unpaid',
    payment_status_color = '#fff3cd',
    payment_status_accent = '#ffc107',
    payment_link = `${APP_URL}/admin`,
    company_name = 'Stilt Heights',
    company_phone = '(555) 123-4567',
    company_email = 'info@stiltheights.com',
    company_website = 'www.stiltheights.com',
    company_address = '123 Main St, City, State 12345',
    payment_portal_link = `${APP_URL}/admin`,
    notes = ''
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice_number}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        
        <!-- Main Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header with Gradient -->
            <div style="background: linear-gradient(135deg, #0066cc 0%, #00d4aa 100%); padding: 30px 30px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                            ${company_name}
                        </h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">
                            Professional Service Delivery
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0 0 5px 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Invoice
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                            ${invoice_number}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Invoice Info Section -->
            <div style="padding: 30px 30px; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 8px 0; color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                            Bill To
                        </p>
                        <p style="margin: 0 0 3px 0; color: #333333; font-size: 15px; font-weight: 600;">
                            ${customer_name}
                        </p>
                        <p style="margin: 0 0 3px 0; color: #666666; font-size: 13px;">
                            ${customer_email}
                        </p>
                        <p style="margin: 0; color: #666666; font-size: 13px;">
                            ${customer_phone}
                        </p>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <div style="margin-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Invoice Date
                            </p>
                            <p style="margin: 0; color: #333333; font-size: 14px;">
                                ${issued_date}
                            </p>
                        </div>
                        <div>
                            <p style="margin: 0 0 5px 0; color: #999999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Due Date
                            </p>
                            <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600;">
                                ${due_date}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Service Details Table -->
            <div style="padding: 0 30px 30px 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #0066cc; background-color: #f9f9f9;">
                            <th style="padding: 12px 0; text-align: left; color: #333333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Description
                            </th>
                            <th style="padding: 12px 0; text-align: center; color: #333333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Date
                            </th>
                            <th style="padding: 12px 0; text-align: right; color: #333333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 15px 0; color: #333333; font-size: 14px;">
                                ${service_name}
                            </td>
                            <td style="padding: 15px 0; text-align: center; color: #666666; font-size: 14px;">
                                ${job_date}
                            </td>
                            <td style="padding: 15px 0; text-align: right; color: #0066cc; font-size: 14px; font-weight: 600;">
                                $${amount}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Subtotal / Total Section -->
                <div style="margin-top: 20px; text-align: right;">
                    <div style="display: inline-block; min-width: 250px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
                            <span style="color: #666666; font-size: 13px;">Subtotal:</span>
                            <span style="color: #333333; font-size: 13px;">$${amount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; color: #0066cc;">
                            <span>Total Due:</span>
                            <span>$${amount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Status -->
            <div style="margin: 0 30px; padding: 15px 20px; background-color: ${payment_status_color}; border-left: 4px solid ${payment_status_accent}; border-radius: 3px;">
                <p style="margin: 0; color: #333333; font-size: 14px;">
                    <strong>Payment Status:</strong> ${payment_status}
                </p>
            </div>

            <!-- Payment Instructions -->
            <div style="padding: 30px 30px; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 16px; font-weight: 600;">
                    Payment Instructions
                </h2>
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Thank you for your business. Please make payment by ${due_date} to avoid late fees. 
                    You can pay in the following ways:
                </p>
                <ul style="margin: 0; padding: 0; list-style: none; color: #666666;">
                    <li style="margin-bottom: 10px; padding-left: 20px; position: relative; font-size: 13px;">
                        <span style="position: absolute; left: 0; color: #00d4aa;">→</span>
                        Online: ${payment_portal_link}
                    </li>
                    <li style="padding-left: 20px; position: relative; font-size: 13px;">
                        <span style="position: absolute; left: 0; color: #00d4aa;">→</span>
                        Check or money order to: ${company_address}
                    </li>
                </ul>
            </div>

            <!-- CTA Button -->
            <div style="padding: 30px 30px; text-align: center;">
                <a href="${payment_link}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #00d4aa 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-size: 15px; font-weight: 600; transition: all 0.3s ease;">
                    Pay Invoice Now
                </a>
            </div>

            <!-- Notes Section (if applicable) -->
            ${notes ? `
            <div style="padding: 30px 30px; background-color: #f9f9f9; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;">
                <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 14px; font-weight: 600;">
                    Notes
                </h3>
                <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.6;">
                    ${notes}
                </p>
            </div>
            ` : ''}

            <!-- Footer -->
            <div style="padding: 30px 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                    <strong>${company_name}</strong>
                </p>
                <p style="margin: 0 0 15px 0; color: #999999; font-size: 12px; line-height: 1.6;">
                    ${company_phone}<br>
                    ${company_email}<br>
                    ${company_website}
                </p>
                <p style="margin: 0 0 10px 0; color: #cccccc; font-size: 11px;">
                    Questions about this invoice? <a href="mailto:${company_email}" style="color: #0066cc; text-decoration: none;">Contact us</a>
                </p>
                <p style="margin: 0; color: #cccccc; font-size: 11px;">
                    © 2026 ${company_name}. All rights reserved. Invoice #${invoice_number}
                </p>
            </div>

        </div>

    </body>
    </html>
  `;
};

/**
 * Send Booking Confirmation Email
 */
const sendBookingConfirmation = async (customerData) => {
  try {
    const htmlContent = bookingConfirmationEmail(customerData);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerData.email,
      subject: `Booking Confirmed - ${customerData.service_name}`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send booking email:', error.message);
    throw error;
  }
};

/**
 * Send Invoice Email
 */
const sendInvoiceEmail = async (invoiceData) => {
  try {
    const htmlContent = invoiceEmail(invoiceData);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: invoiceData.customer_email,
      subject: `Invoice ${invoiceData.invoice_number} - Payment Due`,
      html: htmlContent,
      attachments: invoiceData.pdfAttachment ? [invoiceData.pdfAttachment] : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invoice email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send invoice email:', error.message);
    throw error;
  }
};

module.exports = {
  bookingConfirmationEmail,
  invoiceEmail,
  sendBookingConfirmation,
  sendInvoiceEmail
};
