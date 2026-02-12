/**
 * FieldOps Contact Form Integration
 * Connects existing WordPress contact form to FieldOps API
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        
        // Find the contact form
        const contactForm = document.querySelector('form') || 
                           document.querySelector('.contact-form') ||
                           document.querySelector('[class*="contact"]');
        
        if (!contactForm) {
            console.log('FieldOps: Contact form not found');
            return;
        }
        
        console.log('FieldOps: Contact form found, integrating...');
        
        // Add FieldOps integration to form submission
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = {};
            
            // Extract common field names
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // Map common field variations to standard names
            const contactData = {
                name: data.name || data.Name || data.full_name || data.fullName || '',
                email: data.email || data.Email || data.email_address || data.emailAddress || '',
                phone: data.phone || data.Phone || data.phone_number || data.phoneNumber || data.tel || '',
                message: data.message || data.Message || data.comments || data.Comments || data.details || '',
                service_type: 'General Inquiry', // Default service type
                source: 'Website Contact Form',
                website: 'stiltheights.com',
                urgency: 'Normal',
                status: 'New Lead'
            };
            
            // Validate required fields
            if (!contactData.name && !contactData.email) {
                alert('Please provide at least your name or email address.');
                return;
            }
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"], input[type="submit"]');
            const originalText = submitButton ? submitButton.value || submitButton.textContent : '';
            
            if (submitButton) {
                submitButton.disabled = true;
                if (submitButton.tagName === 'INPUT') {
                    submitButton.value = 'Sending...';
                } else {
                    submitButton.textContent = 'Sending...';
                }
            }
            
            // Send to FieldOps API
            fetch('http://localhost:3000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contactData)
            })
            .then(response => response.json())
            .then(result => {
                console.log('FieldOps: Success', result);
                
                // Show success message
                showSuccessMessage(contactForm, contactData);
                
                // Reset form
                contactForm.reset();
                
                // Restore button
                if (submitButton) {
                    submitButton.disabled = false;
                    if (submitButton.tagName === 'INPUT') {
                        submitButton.value = originalText;
                    } else {
                        submitButton.textContent = originalText;
                    }
                }
            })
            .catch(error => {
                console.error('FieldOps: Error', error);
                
                // Show error message but still submit form normally
                showErrorMessage(contactForm, error);
                
                // Restore button
                if (submitButton) {
                    submitButton.disabled = false;
                    if (submitButton.tagName === 'INPUT') {
                        submitButton.value = originalText;
                    } else {
                        submitButton.textContent = originalText;
                    }
                }
                
                // Optionally submit form normally as backup
                // contactForm.submit();
            });
        });
        
        // Add FieldOps branding
        addFieldOpsBranding(contactForm);
    });
    
    // Show success message
    function showSuccessMessage(form, data) {
        const message = document.createElement('div');
        message.style.cssText = `
            background: #10b981;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            font-weight: 500;
        `;
        message.innerHTML = `
            <strong>Thank you ${data.name || ''}!</strong><br>
            Your request has been received. We'll contact you shortly to schedule your cleaning service.
        `;
        
        // Insert after form
        form.parentNode.insertBefore(message, form.nextSibling);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
    
    // Show error message
    function showErrorMessage(form, error) {
        const message = document.createElement('div');
        message.style.cssText = `
            background: #f59e0b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            font-weight: 500;
        `;
        message.innerHTML = `
            <strong>Message Received!</strong><br>
            We've received your request and will contact you soon. If you don't hear from us within 24 hours, please call (825) 994-6606.
        `;
        
        // Insert after form
        form.parentNode.insertBefore(message, form.nextSibling);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
    
    // Add FieldOps branding
    function addFieldOpsBranding(form) {
        const branding = document.createElement('div');
        branding.style.cssText = `
            text-align: center;
            margin: 10px 0;
            font-size: 12px;
            color: #6b7280;
        `;
        branding.innerHTML = `
            <span style="opacity: 0.7;">Powered by FieldOps Professional Management</span>
        `;
        
        // Insert before form
        form.parentNode.insertBefore(branding, form);
    }
    
})();
