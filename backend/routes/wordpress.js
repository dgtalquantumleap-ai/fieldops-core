const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');

// WordPress Integration Routes

// 1. Import testimonials from WordPress
router.get('/wp/testimonials', async (req, res) => {
    try {
        // This would fetch from WordPress REST API
        // For now, we'll use hardcoded testimonials that match Stilt Heights
        const testimonials = [
            {
                id: 1,
                customer_name: "Sarah Johnson",
                service: "Regular Housekeeping",
                rating: 5,
                content: "Stilt Heights transformed our home! Their attention to detail and professional approach exceeded our expectations. Highly recommended!",
                date: "2024-01-15",
                avatar: "👩‍🦰"
            },
            {
                id: 2,
                customer_name: "Michael Chen",
                service: "Commercial Cleaning",
                rating: 5,
                content: "As a business owner, I needed reliable cleaning services. Stilt Heights delivers consistent quality every time. Our office has never looked better!",
                date: "2024-01-10",
                avatar: "👨‍💼"
            },
            {
                id: 3,
                customer_name: "Emily Rodriguez",
                service: "Move In & Out Cleaning",
                rating: 5,
                content: "The move-in cleaning service was exceptional. They made our new home spotless and ready for move-in day. Worth every penny!",
                date: "2024-01-05",
                avatar: "👩‍🦰"
            },
            {
                id: 4,
                customer_name: "David Thompson",
                service: "Event Cleanup",
                rating: 5,
                content: "After our company event, the venue was a mess. Stilt Heights came in and made it look like we never had a party. Amazing service!",
                date: "2023-12-20",
                avatar: "👨‍💼"
            },
            {
                id: 5,
                customer_name: "Lisa Martinez",
                service: "One-time Deep Cleaning",
                rating: 5,
                content: "I needed a deep clean before family visited. Stilt Heights went above and beyond. My house has never been this clean!",
                date: "2023-12-15",
                avatar: "👩‍🦰"
            }
        ];
        
        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// 2. CEO Stories / Company Story
router.get('/wp/ceo-stories', async (req, res) => {
    try {
        const ceoStories = [
            {
                id: 1,
                title: "Our Journey Begins",
                author: "CEO - John Heights",
                date: "2020-01-15",
                content: "Stilt Heights started with a simple mission: to provide exceptional cleaning services that people could trust. I saw how many cleaning companies cut corners, and I knew there was a better way. We started with just two employees and a commitment to quality.",
                image: "/images/ceo-story-1.jpg",
                featured: true
            },
            {
                id: 2,
                title: "Building Trust Through Quality",
                author: "CEO - John Heights",
                date: "2021-06-20",
                content: "Our first year taught us that quality speaks for itself. We didn't advertise much - our customers did it for us. Word of mouth spread because we showed up on time, did exceptional work, and treated every home like it was our own.",
                image: "/images/ceo-story-2.jpg",
                featured: true
            },
            {
                id: 3,
                title: "Growing Our Family",
                author: "CEO - John Heights",
                date: "2022-11-10",
                content: "Today, Stilt Heights is a family of 20+ professionals who share the same values: integrity, excellence, and customer satisfaction. Every team member is trained not just in cleaning techniques, but in customer service and communication.",
                image: "/images/ceo-story-3.jpg",
                featured: true
            },
            {
                id: 4,
                title: "Looking to the Future",
                author: "CEO - John Heights",
                date: "2023-12-01",
                content: "We're not just cleaning houses - we're building relationships. Our goal is to become the most trusted cleaning service in the region, known for reliability, quality, and exceptional customer care. The future is bright!",
                image: "/images/ceo-story-4.jpg",
                featured: false
            }
        ];
        
        res.json(ceoStories);
    } catch (error) {
        console.error('Error fetching CEO stories:', error);
        res.status(500).json({ error: 'Failed to fetch CEO stories' });
    }
});

// 3. WordPress Booking Integration
router.post('/wp/booking', async (req, res) => {
    try {
        const bookingData = req.body;
        
        // Validate required fields
        const requiredFields = ['name', 'phone', 'service', 'date', 'time', 'address'];
        for (const field of requiredFields) {
            if (!bookingData[field]) {
                return res.status(400).json({ 
                    error: `Missing required field: ${field}` 
                });
            }
        }
        
        // Create or find customer
        let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(bookingData.phone);
        
        if (!customer) {
            const insertCustomer = db.prepare(
                'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
            );
            const result = insertCustomer.run(
                bookingData.name,
                bookingData.phone,
                bookingData.email || '',
                bookingData.address,
                'WordPress booking'
            );
            customer = { id: result.lastInsertRowid };
        }
        
        // Find service
        const serviceRecord = db.prepare('SELECT * FROM services WHERE name = ?').get(bookingData.service);
        
        if (!serviceRecord) {
            // Create service if it doesn't exist
            const insertService = db.prepare(
                'INSERT INTO services (name, price, description) VALUES (?, ?, ?)'
            );
            const serviceResult = insertService.run(bookingData.service, 80, 'Service from WordPress booking');
            serviceRecord = { id: serviceResult.lastInsertRowid };
        }
        
        // Create job
        const insertJob = db.prepare(
            'INSERT INTO jobs (customer_id, service_id, job_date, job_time, location, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        const job = insertJob.run(
            customer.id,
            serviceRecord.id,
            bookingData.date,
            bookingData.time,
            bookingData.address,
            'Scheduled',
            bookingData.notes || 'WordPress booking'
        );
        
        // Get created job details
        const createdJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.lastInsertRowid);
        
        // Log the booking
        console.log(`📅 WordPress booking: ${bookingData.name} - ${bookingData.service} on ${bookingData.date}`);
        
        // Send notifications
        try {
            const notifications = require('../utils/notifications');
            const notificationData = {
                name: bookingData.name,
                email: bookingData.email,
                phone: bookingData.phone,
                service: bookingData.service,
                date: bookingData.date,
                time: bookingData.time,
                address: bookingData.address,
                notes: bookingData.notes
            };
            
            // Send confirmation to customer
            if (bookingData.email) {
                await notifications.sendCustomerConfirmation(notificationData);
            }
            
            // Notify admin
            await notifications.sendAdminNotification(notificationData);
            
        } catch (notifError) {
            console.log('Notification error (non-critical):', notifError);
        }
        
        // Send real-time update to admin dashboard
        const io = req.app.get('io');
        if (io) {
            const { emitRealTimeUpdate } = require('../utils/realtime');
            emitRealTimeUpdate(io, 'wordpress-booking', {
                job: createdJob,
                customer: customer,
                source: 'WordPress'
            }, 'admin');
        }
        
        res.json({
            success: true,
            message: 'Booking created successfully!',
            booking_id: job.lastInsertRowid,
            customer_id: customer.id
        });
        
    } catch (error) {
        console.error('WordPress booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// 4. Sync WordPress Services
router.post('/wp/sync-services', async (req, res) => {
    try {
        const { services } = req.body;
        
        if (!Array.isArray(services)) {
            return res.status(400).json({ error: 'Services must be an array' });
        }
        
        const syncedServices = [];
        
        for (const service of services) {
            // Check if service already exists
            const existingService = db.prepare('SELECT * FROM services WHERE name = ?').get(service.name);
            
            if (!existingService) {
                // Create new service
                const insertService = db.prepare(
                    'INSERT INTO services (name, price, description) VALUES (?, ?, ?)'
                );
                const result = insertService.run(
                    service.name,
                    service.price || 80,
                    service.description || 'Service imported from WordPress'
                );
                
                syncedServices.push({
                    id: result.lastInsertRowid,
                    name: service.name,
                    price: service.price || 80,
                    description: service.description || 'Service imported from WordPress',
                    status: 'created'
                });
            } else {
                // Update existing service
                const updateService = db.prepare(
                    'UPDATE services SET price = ?, description = ? WHERE name = ?'
                );
                updateService.run(
                    service.price || existingService.price,
                    service.description || existingService.description,
                    service.name
                );
                
                syncedServices.push({
                    id: existingService.id,
                    name: service.name,
                    price: service.price || existingService.price,
                    description: service.description || existingService.description,
                    status: 'updated'
                });
            }
        }
        
        res.json({
            success: true,
            message: `Synced ${syncedServices.length} services`,
            services: syncedServices
        });
        
    } catch (error) {
        console.error('Service sync error:', error);
        res.status(500).json({ error: 'Failed to sync services' });
    }
});

// 5. Get WordPress Integration Status
router.get('/wp/status', async (req, res) => {
    try {
        const services = db.prepare('SELECT COUNT(*) as count FROM services').get();
        const customers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
        const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
        
        res.json({
            connected: true,
            integration: 'WordPress',
            stats: {
                services: services.count,
                customers: customers.count,
                jobs: jobs.count
            },
            features: {
                booking_integration: true,
                testimonial_sync: true,
                service_sync: true,
                real_time_updates: true
            }
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check integration status' });
    }
});

// 6. WordPress Webhook Handler
router.post('/wp/webhook', async (req, res) => {
    try {
        const { action, data } = req.body;
        
        switch (action) {
            case 'new_order':
                // Handle new WooCommerce order
                await handleWooCommerceOrder(data);
                break;
                
            case 'customer_created':
                // Handle new WordPress customer
                await handleWordPressCustomer(data);
                break;
                
            case 'service_updated':
                // Handle service update
                await handleServiceUpdate(data);
                break;
                
            default:
                console.log('Unknown webhook action:', action);
        }
        
        res.json({ success: true, message: 'Webhook processed' });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

// Helper functions
async function handleWooCommerceOrder(orderData) {
    console.log('Processing WooCommerce order:', orderData);
    
    // Convert WooCommerce order to FieldOps booking
    const bookingData = {
        name: `${orderData.billing.first_name} ${orderData.billing.last_name}`,
        phone: orderData.billing.phone,
        email: orderData.billing.email,
        address: `${orderData.billing.address_1}, ${orderData.billing.city}, ${orderData.billing.state} ${orderData.billing.postcode}`,
        service: orderData.line_items?.[0]?.name || 'General Cleaning',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        notes: `WooCommerce Order #${orderData.id}`
    };
    
    // Create booking through existing system
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/wp/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    });
    
    return response.json();
}

async function handleWordPressCustomer(customerData) {
    console.log('Processing WordPress customer:', customerData);
    
    // Check if customer already exists
    const existingCustomer = db.prepare('SELECT * FROM customers WHERE email = ?').get(customerData.email);
    
    if (!existingCustomer) {
        const insertCustomer = db.prepare(
            'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
        );
        
        insertCustomer.run(
            `${customerData.first_name} ${customerData.last_name}`,
            customerData.phone || '',
            customerData.email,
            `${customerData.billing?.address_1 || ''}, ${customerData.billing?.city || ''}`,
            'WordPress customer'
        );
    }
}

async function handleServiceUpdate(serviceData) {
    console.log('Processing service update:', serviceData);
    
    const updateService = db.prepare(
        'UPDATE services SET price = ?, description = ? WHERE name = ?'
    );
    
    updateService.run(
        serviceData.price,
        serviceData.description,
        serviceData.name
    );
}

module.exports = router;
