const express = require('express');
const router = express.Router();
const {
  generateBookingEmail,
  generateJobSummary,
  generateInvoiceReminder,
  generateJobAssignmentMessage,
  generateFollowUpMessage
} = require('../utils/aiAutomation');

/**
 * Test: Generate booking email
 * POST /api/ai-test/booking-email
 */
router.post('/booking-email', async (req, res) => {
  try {
    const { name, email, service, date, time, address } = req.body;
    
    const emailBody = await generateBookingEmail({
      name: name || 'John Doe',
      email: email || 'john@example.com',
      service: service || 'Standard Cleaning',
      date: date || '2025-02-20',
      time: time || '10:00 AM',
      address: address || '123 Main St'
    });
    
    res.json({
      success: true,
      email: emailBody,
      message: 'Booking email generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

/**
 * Test: Generate job summary
 * POST /api/ai-test/job-summary
 */
router.post('/job-summary', async (req, res) => {
  try {
    const { customer_name, service_name, address, duration } = req.body;
    
    const summary = await generateJobSummary({
      customer_name: customer_name || 'Jane Smith',
      service_name: service_name || 'Deep Cleaning',
      address: address || '456 Oak Ave',
      duration: duration || 120
    });
    
    res.json({
      success: true,
      summary,
      message: 'Job summary generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

/**
 * Test: Generate invoice reminder
 * POST /api/ai-test/invoice-reminder
 */
router.post('/invoice-reminder', async (req, res) => {
  try {
    const { customer_name, invoice_number, amount, due_date } = req.body;
    
    const reminder = await generateInvoiceReminder({
      customer_name: customer_name || 'Customer',
      invoice_number: invoice_number || 'INV-001',
      amount: amount || '150.00',
      due_date: due_date || '2025-02-27'
    });
    
    res.json({
      success: true,
      reminder,
      message: 'Invoice reminder generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

/**
 * Test: Generate job assignment message
 * POST /api/ai-test/job-assignment
 */
router.post('/job-assignment', async (req, res) => {
  try {
    const { customer_name, service_name, job_date, job_time, location } = req.body;
    
    const message = await generateJobAssignmentMessage({
      customer_name: customer_name || 'Customer',
      service_name: service_name || 'Window Cleaning',
      job_date: job_date || 'Tomorrow',
      job_time: job_time || '10:00 AM',
      location: location || 'Your address'
    });
    
    res.json({
      success: true,
      message,
      message_type: 'whatsapp_assignment',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

/**
 * Test: Generate follow-up message
 * POST /api/ai-test/follow-up
 */
router.post('/follow-up', async (req, res) => {
  try {
    const { customer_name, customer_email, service_name, staff_name } = req.body;
    
    const message = await generateFollowUpMessage({
      customer_name: customer_name || 'Customer',
      customer_email: customer_email || 'customer@example.com',
      service_name: service_name || 'Service',
      staff_name: staff_name || 'Your Staff'
    });
    
    res.json({
      success: true,
      message,
      message_type: 'follow_up_review_request',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

/**
 * Test: Generate custom text
 * POST /api/ai-test/generate-text
 */
router.post('/generate-text', async (req, res) => {
  try {
    const { prompt, maxTokens, temperature } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
        code: 'MISSING_PROMPT'
      });
    }
    
    const text = await generateText(prompt, {
      maxTokens: maxTokens || 500,
      temperature: temperature || 0.7
    });
    
    res.json({
      success: true,
      text,
      prompt,
      parameters: {
        maxTokens: maxTokens || 500,
        temperature: temperature || 0.7
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'AI_GENERATION_FAILED'
    });
  }
});

module.exports = router;
