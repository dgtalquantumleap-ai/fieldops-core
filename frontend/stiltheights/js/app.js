// Stilt Heights Website with WordPress Integration
const API_URL = 'https://fieldops-core-production.up.railway.app/api';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadTestimonials();
    loadCEOStories();
    loadPricingPlans();
    setupQuickQuoteForm();
    setupSmoothScrolling();
});

// Load services from FieldOps API
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/booking/services`);
        const services = await response.json();
        
        const servicesGrid = document.getElementById('services-grid');
        if (servicesGrid) {
            servicesGrid.innerHTML = services.map(service => `
                <div class="service-card">
                    <div class="service-icon">${getServiceIcon(service.name)}</div>
                    <h3>${service.name}</h3>
                    <p>${service.description || 'Professional cleaning service'}</p>
                    <div class="service-price">$${service.price || 80}/hr</div>
                    <button class="btn-primary" onclick="bookService('${service.name}')">Book Now</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading services:', error);
        // Fallback to static services
        loadStaticServices();
    }
}

// Load testimonials from WordPress integration
async function loadTestimonials() {
    try {
        const response = await fetch(`${API_URL}/wp/testimonials`);
        const testimonials = await response.json();
        
        const testimonialsGrid = document.getElementById('testimonials-grid');
        if (testimonialsGrid) {
            testimonialsGrid.innerHTML = testimonials.map(testimonial => `
                <div class="testimonial-card">
                    <div class="testimonial-header">
                        <div class="testimonial-avatar">${testimonial.avatar}</div>
                        <div class="testimonial-rating">
                            ${generateStars(testimonial.rating)}
                        </div>
                    </div>
                    <div class="testimonial-content">
                        <p>"${testimonial.content}"</p>
                    </div>
                    <div class="testimonial-footer">
                        <div class="testimonial-author">
                            <strong>${testimonial.customer_name}</strong>
                            <span>${testimonial.service}</span>
                        </div>
                        <div class="testimonial-date">${formatDate(testimonial.date)}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading testimonials:', error);
        // Fallback to static testimonials
        loadStaticTestimonials();
    }
}

// Load CEO stories
async function loadCEOStories() {
    try {
        const response = await fetch(`${API_URL}/wp/ceo-stories`);
        const stories = await response.json();
        
        const storyTimeline = document.getElementById('story-timeline');
        if (storyTimeline) {
            storyTimeline.innerHTML = stories.map(story => `
                <div class="story-item ${story.featured ? 'featured' : ''}">
                    <div class="story-date">${formatDate(story.date)}</div>
                    <h3>${story.title}</h3>
                    <p>${story.content}</p>
                    <div class="story-author">- ${story.author}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading CEO stories:', error);
        // Fallback to static stories
        loadStaticCEOStories();
    }
}

// Load pricing plans
async function loadPricingPlans() {
    try {
        // For now, use static pricing plans
        const pricingGrid = document.getElementById('pricing-grid');
        if (pricingGrid) {
            pricingGrid.innerHTML = `
                <div class="pricing-card">
                    <div class="pricing-header">
                        <h3>Regular Housekeeping</h3>
                        <div class="price">$200<span>/mo</span></div>
                    </div>
                    <div class="pricing-features">
                        <p>✓ Weekly cleaning</p>
                        <p>✓ Kitchen & bathrooms</p>
                        <p>✓ Living areas</p>
                        <p>✓ Dusting & vacuuming</p>
                        <p>✓ Trash removal</p>
                    </div>
                    <button class="btn-primary" onclick="bookService('Regular Housekeeping')">Get Started</button>
                </div>
                
                <div class="pricing-card featured">
                    <div class="pricing-header">
                        <h3>One-time Cleaning</h3>
                        <div class="price">$80<span>/hr</span></div>
                    </div>
                    <div class="pricing-features">
                        <p>✓ Deep cleaning</p>
                        <p>✓ All rooms included</p>
                        <p>✓ Kitchen & bathrooms</p>
                        <p>✓ Windows & mirrors</p>
                        <p>✓ Floor cleaning</p>
                    </div>
                    <button class="btn-primary" onclick="bookService('One-time Cleaning')">Book Now</button>
                </div>
                
                <div class="pricing-card">
                    <div class="pricing-header">
                        <h3>Commercial Cleaning</h3>
                        <div class="price">$120<span>/hr</span></div>
                    </div>
                    <div class="pricing-features">
                        <p>✓ Office spaces</p>
                        <p>✓ Restrooms & kitchens</p>
                        <p>✓ Common areas</p>
                        <p>✓ Trash removal</p>
                        <p>✓ Flexible scheduling</p>
                    </div>
                    <button class="btn-primary" onclick="bookService('Commercial Cleaning')">Get Quote</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading pricing:', error);
    }
}

// Setup quick quote form
function setupQuickQuoteForm() {
    const form = document.getElementById('quick-quote-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('quick-name').value,
                phone: document.getElementById('quick-phone').value,
                service: document.getElementById('quick-service').value,
                message: document.getElementById('quick-message').value,
                source: 'Website Quick Quote'
            };
            
            try {
                // Send to FieldOps API
                const response = await fetch(`${API_URL}/wp/booking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showQuoteSuccess(formData);
                    form.reset();
                } else {
                    showQuoteError(result.error || 'Failed to submit request');
                }
            } catch (error) {
                console.error('Quote submission error:', error);
                showQuoteError('Network error. Please try again.');
            }
        });
    }
    
    // Load services into quick quote form
    loadServicesIntoQuickQuote();
}

// Load services into quick quote form
async function loadServicesIntoQuickQuote() {
    try {
        const response = await fetch(`${API_URL}/booking/services`);
        const services = await response.json();
        
        const serviceSelect = document.getElementById('quick-service');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select a service</option>' + 
                services.map(service => `<option value="${service.name}">${service.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading services for quick quote:', error);
    }
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Helper functions
function getServiceIcon(serviceName) {
    const icons = {
        'Regular Housekeeping': '🏠',
        'One-time Cleaning': '🧼',
        'Commercial Cleaning': '🏢',
        'Event Cleanup': '🎉',
        'Dish Washing': '🍽️',
        'Carpet Cleaning': '🟦',
        'Window Cleaning': '🪟',
        'Move In & Out Cleaning': '📦',
        'Laundry Services': '👔',
        'Trash Removal': '🗑️',
        'Outdoor Furniture': '🪑',
        'Dry Cleaning': '👔',
        'Appliance Deep Clean': '🔌'
    };
    return icons[serviceName] || '🧹';
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
    }
    
    if (hasHalfStar) {
        stars += '⭐';
    }
    
    for (let i = stars.length; i < 5; i++) {
        stars += '☆';
    }
    
    return stars;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Booking functions
function bookService(serviceName) {
    // Scroll to booking section or open booking modal
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Open booking page
        window.open('/booking.html', '_blank');
    }
}

function scrollToBooking() {
    bookService('');
}

function scrollToServices() {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Success and error messages
function showQuoteSuccess(quoteData) {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <h3>Quote Request Received!</h3>
            <p>Thank you ${quoteData.name}, we'll get back to you within 24 hours with your custom quote for ${quoteData.service}.</p>
            <div class="quote-details">
                <p><strong>Phone:</strong> ${quoteData.phone}</p>
                <p><strong>Service:</strong> ${quoteData.service}</p>
                ${quoteData.message ? `<p><strong>Message:</strong> ${quoteData.message}</p>` : ''}
            </div>
            <button class="btn-primary" onclick="closeMessage(this)">Got it!</button>
        </div>
    `;
    
    document.body.appendChild(successMessage);
    successMessage.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
        }
    }, 10000);
}

function showQuoteError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
        <div class="error-content">
            <div class="error-icon">❌</div>
            <h3>Request Failed</h3>
            <p>${message}</p>
            <p>Please try again or call us directly at <strong>825-994-6606</strong>.</p>
            <button class="btn-primary" onclick="closeMessage(this)">Try Again</button>
        </div>
    `;
    
    document.body.appendChild(errorMessage);
    errorMessage.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorMessage.parentNode) {
            errorMessage.parentNode.removeChild(errorMessage);
        }
    }, 10000);
}

function closeMessage(element) {
    const message = element.closest('.success-message, .error-message');
    if (message) {
        message.remove();
    }
}

// Fallback functions for static content
function loadStaticServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (servicesGrid) {
        servicesGrid.innerHTML = `
            <div class="service-card">
                <div class="service-icon">🏠</div>
                <h3>Residential Cleaning</h3>
                <p>Complete home cleaning solutions tailored to your needs</p>
                <div class="service-price">$80/hr</div>
                <button class="btn-primary" onclick="bookService('Residential Cleaning')">Book Now</button>
            </div>
            <div class="service-card">
                <div class="service-icon">🏢</div>
                <h3>Commercial Cleaning</h3>
                <p>Professional cleaning for offices and commercial spaces</p>
                <div class="service-price">$120/hr</div>
                <button class="btn-primary" onclick="bookService('Commercial Cleaning')">Book Now</button>
            </div>
            <div class="service-card">
                <div class="service-icon">🎉</div>
                <h3>Event Cleanup</h3>
                <p>Pre and post-event cleaning services</p>
                <div class="service-price">$150/hr</div>
                <button class="btn-primary" onclick="bookService('Event Cleanup')">Book Now</button>
            </div>
            <div class="service-card">
                <div class="service-icon">🧼</div>
                <h3>One-time Cleaning</h3>
                <p>Deep cleaning for special occasions</p>
                <div class="service-price">$80/hr</div>
                <button class="btn-primary" onclick="bookService('One-time Cleaning')">Book Now</button>
            </div>
            <div class="service-card">
                <div class="service-icon">🔄</div>
                <h3>Regular Cleaning</h3>
                <p>Ongoing maintenance cleaning services</p>
                <div class="service-price">$200/mo</div>
                <button class="btn-primary" onclick="bookService('Regular Cleaning')">Book Now</button>
            </div>
            <div class="service-card">
                <div class="service-icon">🏡</div>
                <h3>Housekeeping</h3>
                <p>Comprehensive housekeeping solutions</p>
                <div class="service-price">$180/mo</div>
                <button class="btn-primary" onclick="bookService('Housekeeping')">Book Now</button>
            </div>
        `;
    }
}

function loadStaticTestimonials() {
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid) {
        testimonialsGrid.innerHTML = `
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <div class="testimonial-avatar">👩‍🦰</div>
                    <div class="testimonial-rating">⭐⭐⭐⭐⭐</div>
                </div>
                <div class="testimonial-content">
                    <p>"Stilt Heights transformed our home! Their attention to detail and professional approach exceeded our expectations. Highly recommended!"</p>
                </div>
                <div class="testimonial-footer">
                    <div class="testimonial-author">
                        <strong>Sarah Johnson</strong>
                        <span>Regular Housekeeping</span>
                    </div>
                    <div class="testimonial-date">January 15, 2024</div>
                </div>
            </div>
            
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <div class="testimonial-avatar">👨‍💼</div>
                    <div class="testimonial-rating">⭐⭐⭐⭐⭐</div>
                </div>
                <div class="testimonial-content">
                    <p>"As a business owner, I needed reliable cleaning services. Stilt Heights delivers consistent quality every time. Our office has never looked better!"</p>
                </div>
                <div class="testimonial-footer">
                    <div class="testimonial-author">
                        <strong>Michael Chen</strong>
                        <span>Commercial Cleaning</span>
                    </div>
                    <div class="testimonial-date">January 10, 2024</div>
                </div>
            </div>
            
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <div class="testimonial-avatar">👩‍🦰</div>
                    <div class="testimonial-rating">⭐⭐⭐⭐⭐</div>
                </div>
                <div class="testimonial-content">
                    <p>"The move-in cleaning service was exceptional. They made our new home spotless and ready for move-in day. Worth every penny!"</p>
                </div>
                <div class="testimonial-footer">
                    <div class="testimonial-author">
                        <strong>Emily Rodriguez</strong>
                        <span>Move In & Out Cleaning</span>
                    </div>
                    <div class="testimonial-date">January 5, 2024</div>
                </div>
            </div>
        `;
    }
}

function loadStaticCEOStories() {
    const storyTimeline = document.getElementById('story-timeline');
    if (storyTimeline) {
        storyTimeline.innerHTML = `
            <div class="story-item featured">
                <div class="story-date">January 15, 2020</div>
                <h3>Our Journey Begins</h3>
                <p>Stilt Heights started with a simple mission: to provide exceptional cleaning services that people could trust. I saw how many cleaning companies cut corners, and I knew there was a better way. We started with just two employees and a commitment to quality.</p>
                <div class="story-author">- John Heights, Founder & CEO</div>
            </div>
            
            <div class="story-item featured">
                <div class="story-date">June 20, 2021</div>
                <h3>Building Trust Through Quality</h3>
                <p>Our first year taught us that quality speaks for itself. We didn't advertise much - our customers did it for us. Word of mouth spread because we showed up on time, did exceptional work, and treated every home like it was our own.</p>
                <div class="story-author">- John Heights, Founder & CEO</div>
            </div>
            
            <div class="story-item featured">
                <div class="story-date">November 10, 2022</div>
                <h3>Growing Our Family</h3>
                <p>Today, Stilt Heights is a family of 20+ professionals who share the same values: integrity, excellence, and customer satisfaction. Every team member is trained not just in cleaning techniques, but in customer service and communication.</p>
                <div class="story-author">- John Heights, Founder & CEO</div>
            </div>
            
            <div class="story-item">
                <div class="story-date">December 1, 2023</div>
                <h3>Looking to the Future</h3>
                <p>We're not just cleaning houses - we're building relationships. Our goal is to become the most trusted cleaning service in the region, known for reliability, quality, and exceptional customer care. The future is bright!</p>
                <div class="story-author">- John Heights, Founder & CEO</div>
            </div>
        `;
    }
}

// Add CSS for success/error messages
const messageStyles = `
    .success-message, .error-message {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 500px;
        animation: slideIn 0.3s ease-out;
    }
    
    .success-message {
        border-left: 4px solid #10b981;
    }
    
    .error-message {
        border-left: 4px solid #ef4444;
    }
    
    .success-content, .error-content {
        text-align: center;
    }
    
    .success-icon, .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .success-content h3 {
        color: #10b981;
        margin-bottom: 1rem;
    }
    
    .error-content h3 {
        color: #ef4444;
        margin-bottom: 1rem;
    }
    
    .quote-details {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: left;
    }
    
    .quote-details p {
        margin: 0.5rem 0;
        font-size: 0.875rem;
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
styleSheet.textContent = messageStyles;
document.head.appendChild(styleSheet);
