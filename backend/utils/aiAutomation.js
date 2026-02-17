const { HfInference } = require("@huggingface/inference");

// Initialize Hugging Face
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

/**
 * Generate text using Hugging Face
 * @param {string} prompt - The prompt to send to AI
 * @param {object} options - Max tokens, temperature, etc.
 */
const generateText = async (prompt, options = {}) => {
  try {
    console.log('🤖 Generating text with AI...');
    
    const response = await hf.textGeneration({
      model: process.env.HUGGING_FACE_MODEL || "mistral-7b-instruct-v0.2",
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.95,
        repetition_penalty: options.repetitionPenalty || 1.2,
      }
    });
    
    console.log('✅ AI text generated successfully');
    return response.generated_text || response;
  } catch (error) {
    console.error('❌ AI Generation Error:', error.message);
    throw error;
  }
};

/**
 * Generate professional booking confirmation email
 */
const generateBookingEmail = async (bookingData) => {
  const {
    name = "Customer",
    email = "customer@example.com", 
    service = "Cleaning Service",
    date = "TBD",
    time = "TBD",
    address = "TBD"
  } = bookingData;

  const prompt = `Generate a professional and warm booking confirmation email for a cleaning service company.

Details:
- Customer Name: ${name}
- Email: ${email}
- Service: ${service}
- Date: ${date}
- Time: ${time}
- Address: ${address}

Requirements:
- Professional tone but friendly
- Include all booking details
- Thank them for choosing us
- Mention what to expect next
- Ask them to contact if they have questions
- Keep it concise (150-250 words)
- Do NOT include a subject line
- Do NOT use markdown formatting
- Just plain text email body`;

  try {
    const email = await generateText(prompt, { maxTokens: 400 });
    return email.trim();
  } catch (error) {
    console.error('Failed to generate booking email:', error.message);
    // Fallback to template
    return `Dear ${name},\n\nThank you for booking our ${service} service for ${date} at ${time}.\n\nWe look forward to serving you!\n\nBest regards,\nFieldOps Team`;
  }
};

/**
 * Generate job completion summary email
 */
const generateJobSummary = async (jobData) => {
  const {
    customer_name = "Customer",
    service_name = "Service", 
    address = "Address",
    duration = 120,
    notes = ""
  } = jobData;

  const prompt = `Create a brief, professional job completion summary email.

Job Details:
- Customer: ${customer_name}
- Service: ${service_name}
- Location: ${address}
- Duration: ${duration} minutes
- Notes: ${notes}

Requirements:
- 2-3 sentences
- Professional tone
- Highlight key achievements
- Thank them
- Encourage future bookings
- Plain text only (no markdown)`;

  try {
    const summary = await generateText(prompt, { maxTokens: 200 });
    return summary.trim();
  } catch (error) {
    console.error('Failed to generate summary:', error.message);
    return `Thank you for choosing us for ${service_name}! We've completed the service at ${address}. We appreciate your business!`;
  }
};

/**
 * Generate invoice payment reminder (short, SMS-friendly)
 */
const generateInvoiceReminder = async (invoiceData) => {
  const {
    customer_name = "Customer",
    invoice_number = "INV-001",
    amount = "100",
    due_date = "TBD"
  } = invoiceData;

  const prompt = `Generate a short, friendly payment reminder message (under 160 characters).

Invoice Details:
- Customer: ${customer_name}
- Invoice: ${invoice_number}
- Amount: $${amount}
- Due Date: ${due_date}

Requirements:
- Very brief and friendly
- Under 160 characters
- Can be used for SMS/WhatsApp
- Include invoice number
- Include amount
- Professional but conversational`;

  try {
    const reminder = await generateText(prompt, { maxTokens: 100 });
    return reminder.trim().substring(0, 160);
  } catch (error) {
    console.error('Failed to generate reminder:', error.message);
    return `Hi ${customer_name}, reminder: Invoice ${invoice_number} for $${amount} is due ${due_date}. Please reply with payment confirmation.`;
  }
};

/**
 * Generate WhatsApp notification for job assignment
 */
const generateJobAssignmentMessage = async (jobData) => {
  const {
    customer_name = "Customer",
    service_name = "Cleaning",
    job_date = "Tomorrow",
    job_time = "10:00 AM",
    location = "Your address"
  } = jobData;

  const prompt = `Generate a friendly WhatsApp message for staff about a job assignment.

Job Details:
- Customer: ${customer_name}
- Service: ${service_name}
- Date: ${job_date}
- Time: ${job_time}
- Location: ${location}

Requirements:
- Friendly and casual tone
- Use WhatsApp/text style
- Include all key details
- Under 200 characters
- Encourage them to confirm`;

  try {
    const message = await generateText(prompt, { maxTokens: 150 });
    return message.trim();
  } catch (error) {
    console.error('Failed to generate assignment message:', error.message);
    return `Hey! New job: ${service_name} for ${customer_name} on ${job_date} at ${job_time} at ${location}. Can you confirm?`;
  }
};

/**
 * Generate customer follow-up message (ask for reviews/feedback)
 */
const generateFollowUpMessage = async (jobData) => {
  const {
    customer_name = "Customer",
    customer_email = "customer@example.com",
    service_name = "Service",
    staff_name = "Your Staff"
  } = jobData;

  const prompt = `Generate a follow-up message asking for customer review/feedback.

Service Details:
- Customer: ${customer_name}
- Service: ${service_name}
- Staff: ${staff_name}

Requirements:
- Professional but warm
- Ask them how the service was
- Invite them to leave review
- Thank them for business
- Mention how to contact
- 150-200 words`;

  try {
    const message = await generateText(prompt, { maxTokens: 300 });
    return message.trim();
  } catch (error) {
    console.error('Failed to generate follow-up:', error.message);
    return `Hi ${customer_name},\n\nWe hope you enjoyed our ${service_name} service! We'd love to hear your feedback. Please feel free to reach out if you have any questions.\n\nThanks for choosing us!`;
  }
};

module.exports = {
  generateText,
  generateBookingEmail,
  generateJobSummary,
  generateInvoiceReminder,
  generateJobAssignmentMessage,
  generateFollowUpMessage
};
