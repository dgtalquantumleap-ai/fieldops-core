/**
 * FieldOps Core - Form Handler Module
 * Centralized form handling with validation and submission
 * 
 * @module forms
 */

class FormHandler {
    /**
     * Initialize form handler for a form
     */
    static initialize(formId, validationSchema, submitHandler) {
        const form = document.getElementById(formId);
        if (!form) {
            logger.warn(`Form not found: ${formId}`);
            return;
        }
        
        // Clear previous listeners
        form.onsubmit = null;
        
        // Set up submission handler
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = ui.form.getFormData(formId);
            if (!formData) return;
            
            // Validate
            const validation = utils.validate.validateForm(formData, validationSchema);
            if (!validation.isValid) {
                ui.form.setErrors(formId, validation.errors);
                return;
            }
            
            // Clear previous errors
            ui.form.clearErrors(formId);
            
            // Execute handler
            try {
                await submitHandler(formData);
            } catch (error) {
                logger.error(`Error in form handler for ${formId}:`, error);
                ui.notify.error('An error occurred. Please try again.');
            }
        });
        
        // Clear errors on input
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('input', () => {
                const errorEl = field.parentNode.querySelector('.form-error');
                if (errorEl) {
                    errorEl.remove();
                    field.style.borderColor = '';
                }
            });
        });
    }

    /**
     * Validate a single field
     */
    static validateField(value, rules) {
        if (rules.required && !utils.validate.required(value)) {
            return 'This field is required';
        }
        
        if (rules.email && value && !utils.validate.email(value)) {
            return 'Please enter a valid email';
        }
        
        if (rules.minLength && value && !utils.validate.minLength(value, rules.minLength)) {
            return `Minimum ${rules.minLength} characters required`;
        }
        
        if (rules.positive && value && !utils.validate.positive(value)) {
            return 'Must be a positive number';
        }
        
        return null;
    }

    /**
     * Disable form temporarily (during submission)
     */
    static disable(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = true;
            button.textContent = 'Processing...';
        }
        
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.disabled = true;
        });
    }

    /**
     * Enable form again (after submission)
     */
    static enable(formId, originalButtonText = 'Submit') {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = false;
            button.textContent = originalButtonText;
        }
        
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.disabled = false;
        });
    }
}

// ============================================================
// FORM INITIALIZATION HANDLERS
// ============================================================

/**
 * Initialize all form handlers when page loads
 */
document.addEventListener('DOMContentLoaded', () => {
    // Customer form
    FormHandler.initialize(
        'add-customer-form',
        {
            'customer-name': { required: true },
            'customer-phone': { required: true },
            'customer-email': { email: true }
        },
        async (formData) => {
            FormHandler.disable('add-customer-form');
            try {
                const response = await API.customers.create({
                    name: formData['customer-name'],
                    phone: formData['customer-phone'],
                    email: formData['customer-email'] || null,
                    address: formData['customer-address'] || null,
                    notes: formData['customer-notes'] || null
                });
                
                if (response.success) {
                    ui.notify.success('Customer added successfully');
                    ui.modal.hide('add-customer-modal');
                    ui.form.reset('add-customer-form');
                    loadCustomers();
                } else {
                    ui.notify.error('Failed to add customer');
                }
            } finally {
                FormHandler.enable('add-customer-form', 'Add Customer');
            }
        }
    );
    
    // Job form
    FormHandler.initialize(
        'create-job-form',
        {
            'job-customer': { required: true },
            'job-service': { required: true },
            'job-date': { required: true },
            'job-time': { required: true },
            'job-location': { required: true }
        },
        async (formData) => {
            FormHandler.disable('create-job-form');
            try {
                const response = await API.jobs.create({
                    customer_id: parseInt(formData['job-customer']),
                    service_name: formData['job-service'],
                    staff_id: formData['job-staff'] ? parseInt(formData['job-staff']) : null,
                    job_date: formData['job-date'],
                    job_time: formData['job-time'],
                    location: formData['job-location'],
                    notes: formData['job-notes'] || null
                });
                
                if (response.success) {
                    ui.notify.success('Job created successfully');
                    ui.modal.hide('create-job-modal');
                    ui.form.reset('create-job-form');
                    loadJobs();
                } else {
                    ui.notify.error('Failed to create job');
                }
            } finally {
                FormHandler.enable('create-job-form', 'Create Job');
            }
        }
    );
    
    // Staff form
    FormHandler.initialize(
        'onboard-staff-form',
        {
            'onboard-name': { required: true },
            'onboard-email': { required: true, email: true },
            'onboard-role': { required: true },
            'onboard-password': { required: true, minLength: 6 }
        },
        async (formData) => {
            FormHandler.disable('onboard-staff-form');
            try {
                const response = await API.staff.create({
                    name: formData['onboard-name'],
                    email: formData['onboard-email'],
                    phone: formData['onboard-phone'] || null,
                    role: formData['onboard-role'],
                    password: formData['onboard-password']
                });
                
                if (response.success) {
                    ui.notify.success('Staff member onboarded successfully');
                    ui.modal.hide('onboard-staff-modal');
                    ui.form.reset('onboard-staff-form');
                    loadStaff();
                } else {
                    ui.notify.error('Failed to onboard staff member');
                }
            } finally {
                FormHandler.enable('onboard-staff-form', 'Onboard Staff');
            }
        }
    );
    
    // Invoice form
    FormHandler.initialize(
        'create-invoice-form',
        {
            'invoice-job': { required: true },
            'invoice-amount': { required: true, positive: true }
        },
        async (formData) => {
            FormHandler.disable('create-invoice-form');
            try {
                const response = await API.invoices.create({
                    job_id: parseInt(formData['invoice-job']),
                    amount: parseFloat(formData['invoice-amount']),
                    notes: formData['invoice-notes'] || null
                });
                
                if (response.success) {
                    ui.notify.success('Invoice created successfully');
                    ui.modal.hide('create-invoice-modal');
                    ui.form.reset('create-invoice-form');
                    loadInvoices();
                } else {
                    ui.notify.error('Failed to create invoice');
                }
            } finally {
                FormHandler.enable('create-invoice-form', 'Create Invoice');
            }
        }
    );
    
    // Automation form
    FormHandler.initialize(
        'add-automation-form',
        {
            'automation-trigger': { required: true },
            'automation-channel': { required: true },
            'automation-message': { required: true }
        },
        async (formData) => {
            FormHandler.disable('add-automation-form');
            try {
                const response = await API.automations.create({
                    trigger_event: formData['automation-trigger'],
                    channel: formData['automation-channel'],
                    message_template: formData['automation-message'],
                    enabled: formData['automation-enabled'] === 'on'
                });
                
                if (response.success) {
                    ui.notify.success('Automation created successfully');
                    ui.modal.hide('add-automation-modal');
                    ui.form.reset('add-automation-form');
                    loadAutomations();
                } else {
                    ui.notify.error('Failed to create automation');
                }
            } finally {
                FormHandler.enable('add-automation-form', 'Add Automation');
            }
        }
    );
});

// Export globally
window.FormHandler = FormHandler;
