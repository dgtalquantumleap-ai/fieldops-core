const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { log } = require('../middleware/logging');
const aiAutomation = require('../utils/aiAutomation');
const notifications = require('../utils/notifications');

/**
 * POST /api/ai-automations/follow-up - Send AI follow-up to customer
 * Body: { customer_id, service_name, staff_name, message_type }
 */
router.post('/follow-up', requireAuth, async (req, res) => {
    try {
        const { customer_id, service_name, staff_name, message_type = 'review_request' } = req.body;
        
        if (!customer_id) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID is required',
                code: 'MISSING_CUSTOMER_ID'
            });
        }
        
        // Get customer details
        const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(customer_id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found',
                code: 'CUSTOMER_NOT_FOUND'
            });
        }
        
        if (!customer.email) {
            return res.status(400).json({
                success: false,
                error: 'Customer email is required',
                code: 'MISSING_EMAIL'
            });
        }
        
        // Generate AI follow-up message
        try {
            const aiMessage = await aiAutomation.generateFollowUpMessage({
                customer_name: customer.name,
                customer_email: customer.email,
                service_name: service_name || 'Our Service',
                staff_name: staff_name || 'Our Team'
            });
            
            // Send AI-generated follow-up
            await notifications.sendEmail({
                to: customer.email,
                subject: `Thank you from FieldOps`,
                body: aiMessage
            });
            
            log.success(req.id, 'AI follow-up sent', {
                customer_id,
                customer_name: customer.name,
                message_type
            });
            
            res.json({
                success: true,
                message: 'AI follow-up message sent successfully',
                customer_name: customer.name,
                email: customer.email
            });
            
        } catch (aiError) {
            log.error(req.id, 'AI follow-up generation failed', aiError);
            res.status(500).json({
                success: false,
                error: 'Failed to generate AI follow-up message',
                code: 'AI_GENERATION_FAILED'
            });
        }
        
    } catch (error) {
        log.error(req.id, 'Follow-up error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send follow-up',
            code: 'FOLLOW_UP_ERROR'
        });
    }
});

/**
 * POST /api/ai-automations/staff-notification - Send AI staff notification
 * Body: { staff_id, customer_name, service_name, job_date, job_time, location }
 */
router.post('/staff-notification', requireAuth, async (req, res) => {
    try {
        const { staff_id, customer_name, service_name, job_date, job_time, location } = req.body;
        
        if (!staff_id || !customer_name || !service_name) {
            return res.status(400).json({
                success: false,
                error: 'Staff ID, customer name, and service name are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        // Get staff details
        const staff = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(staff_id);
        if (!staff) {
            return res.status(404).json({
                success: false,
                error: 'Staff member not found',
                code: 'STAFF_NOT_FOUND'
            });
        }
        
        if (!staff.email) {
            return res.status(400).json({
                success: false,
                error: 'Staff email is required',
                code: 'MISSING_EMAIL'
            });
        }
        
        // Generate AI staff notification
        try {
            const aiMessage = await aiAutomation.generateJobAssignmentMessage({
                customer_name,
                service_name,
                job_date: job_date || 'Tomorrow',
                job_time: job_time || '10:00 AM',
                location: location || 'Customer location'
            });
            
            // Send AI-generated staff notification
            await notifications.sendEmail({
                to: staff.email,
                subject: `New Job Assignment - FieldOps`,
                body: aiMessage
            });
            
            log.success(req.id, 'AI staff notification sent', {
                staff_id,
                staff_name: staff.name,
                customer_name,
                service_name
            });
            
            res.json({
                success: true,
                message: 'AI staff notification sent successfully',
                staff_name: staff.name,
                email: staff.email
            });
            
        } catch (aiError) {
            log.error(req.id, 'AI staff notification generation failed', aiError);
            res.status(500).json({
                success: false,
                error: 'Failed to generate AI staff notification',
                code: 'AI_GENERATION_FAILED'
            });
        }
        
    } catch (error) {
        log.error(req.id, 'Staff notification error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send staff notification',
            code: 'STAFF_NOTIFICATION_ERROR'
        });
    }
});

/**
 * GET /api/ai-automations/templates - Get available AI message templates
 */
router.get('/templates', requireAuth, async (req, res) => {
    try {
        const templates = {
            booking_confirmation: {
                name: 'Booking Confirmation',
                description: 'Professional email confirming customer booking',
                function: 'generateBookingEmail'
            },
            job_completion: {
                name: 'Job Completion Summary',
                description: 'Brief summary sent when job is completed',
                function: 'generateJobSummary'
            },
            invoice_reminder: {
                name: 'Invoice Payment Reminder',
                description: 'Friendly reminder for invoice payment',
                function: 'generateInvoiceReminder'
            },
            staff_assignment: {
                name: 'Staff Job Assignment',
                description: 'WhatsApp-style message for staff job assignment',
                function: 'generateJobAssignmentMessage'
            },
            customer_follow_up: {
                name: 'Customer Follow-up',
                description: 'Follow-up message asking for review/feedback',
                function: 'generateFollowUpMessage'
            }
        };
        
        res.json({
            success: true,
            templates
        });
        
    } catch (error) {
        log.error(req.id, 'Get templates error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get templates',
            code: 'TEMPLATES_ERROR'
        });
    }
});

/**
 * POST /api/ai-automations/custom - Generate custom AI message
 * Body: { template_type, data }
 */
router.post('/custom', requireAuth, async (req, res) => {
    try {
        const { template_type, data } = req.body;
        
        if (!template_type || !data) {
            return res.status(400).json({
                success: false,
                error: 'Template type and data are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        // Generate AI message based on template type
        let aiMessage;
        try {
            switch (template_type) {
                case 'booking_confirmation':
                    aiMessage = await aiAutomation.generateBookingEmail(data);
                    break;
                case 'job_completion':
                    aiMessage = await aiAutomation.generateJobSummary(data);
                    break;
                case 'invoice_reminder':
                    aiMessage = await aiAutomation.generateInvoiceReminder(data);
                    break;
                case 'staff_assignment':
                    aiMessage = await aiAutomation.generateJobAssignmentMessage(data);
                    break;
                case 'customer_follow_up':
                    aiMessage = await aiAutomation.generateFollowUpMessage(data);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid template type',
                        code: 'INVALID_TEMPLATE_TYPE'
                    });
            }
            
            res.json({
                success: true,
                message: aiMessage,
                template_type,
                timestamp: new Date().toISOString()
            });
            
        } catch (aiError) {
            log.error(req.id, 'Custom AI generation failed', aiError);
            res.status(500).json({
                success: false,
                error: 'Failed to generate AI message',
                code: 'AI_GENERATION_FAILED'
            });
        }
        
    } catch (error) {
        log.error(req.id, 'Custom AI error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate custom AI message',
            code: 'CUSTOM_AI_ERROR'
        });
    }
});

module.exports = router;
