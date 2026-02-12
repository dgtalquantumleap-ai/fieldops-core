// Stilt Heights Booking Integration with FieldOps Core
const API_URL = 'http://localhost:3000/api';

// Initialize booking form
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Load services
    loadServices();
    
    // Setup form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
});

// Load available services
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/booking/services`);
        const services = await response.json();
        
        const serviceSelect = document.getElementById('service');
        if (serviceSelect) {
            // Keep the existing options and add dynamic ones
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.name;
                option.textContent = service.name;
                serviceSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Handle booking form submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/booking/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showBookingSuccess(formData);
            
            // Clear form
            clearForm();
            
            // Scroll to success message
            scrollToSuccessMessage();
        } else {
            showBookingError(result.error || 'Failed to submit booking');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showBookingError('Network error. Please try again.');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Show booking success message
function showBookingSuccess(bookingData) {
    const successMessage = document.createElement('div');
    successMessage.className = 'booking-success';
    successMessage.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <h3>Booking Confirmed!</h3>
            <p>Thank you ${bookingData.name}, your cleaning service has been scheduled.</p>
            <div class="booking-details">
                <p><strong>Service:</strong> ${bookingData.service}</p>
                <p><strong>Date:</strong> ${formatDate(bookingData.date)}</p>
                <p><strong>Time:</strong> ${bookingData.time}</p>
                <p><strong>Location:</strong> ${bookingData.address}</p>
            </div>
            <p class="confirmation-note">You'll receive a confirmation email shortly with all the details.</p>
            <button class="btn-primary" onclick="closeSuccessMessage()">Got it!</button>
        </div>
    `;
    
    // Insert after the booking form
    const bookingForm = document.getElementById('booking-form');
    bookingForm.parentNode.insertBefore(successMessage, bookingForm.nextSibling);
    
    // Scroll to success message
    successMessage.scrollIntoView({ behavior: 'smooth' });
}

// Show booking error message
function showBookingError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'booking-error';
    errorMessage.innerHTML = `
        <div class="error-content">
            <div class="error-icon">❌</div>
            <h3>Booking Failed</h3>
            <p>${message}</p>
            <p>Please check your information and try again, or call us directly at <strong>8259946606</strong>.</p>
            <button class="btn-primary" onclick="closeErrorMessage()">Try Again</button>
        </div>
    `;
    
    // Insert after the booking form
    const bookingForm = document.getElementById('booking-form');
    bookingForm.parentNode.insertBefore(errorMessage, bookingForm.nextSibling);
    
    // Scroll to error message
    errorMessage.scrollIntoView({ behavior: 'smooth' });
}

// Close success message
function closeSuccessMessage() {
    const successMessage = document.querySelector('.booking-success');
    if (successMessage) {
        successMessage.remove();
    }
}

// Close error message
function closeErrorMessage() {
    const errorMessage = document.querySelector('.booking-error');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Clear form
function clearForm() {
    const form = document.getElementById('booking-form');
    if (form) {
        form.reset();
        
        // Reset date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = today;
        }
    }
}

// Scroll to booking section
function scrollToBooking() {
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Scroll to services section
function scrollToServices() {
    const servicesSection = document.querySelector('.services-overview');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Scroll to success message
function scrollToSuccessMessage() {
    const successMessage = document.querySelector('.booking-success');
    if (successMessage) {
        successMessage.scrollIntoView({ behavior: 'smooth' });
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Add smooth scrolling to navigation links
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Add CSS for booking messages
const bookingStyles = `
    .booking-success, .booking-error {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin: 2rem 0;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #10b981;
        animation: slideIn 0.3s ease-out;
    }
    
    .booking-error {
        border-left-color: #ef4444;
    }
    
    .success-content, .error-content {
        text-align: center;
    }
    
    .success-icon, .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .booking-success h3 {
        color: #10b981;
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .booking-error h3 {
        color: #ef4444;
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .booking-details {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: left;
    }
    
    .booking-details p {
        margin: 0.5rem 0;
        font-size: 0.875rem;
    }
    
    .confirmation-note {
        color: #64748b;
        font-size: 0.875rem;
        margin: 1rem 0;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = bookingStyles;
document.head.appendChild(styleSheet);
