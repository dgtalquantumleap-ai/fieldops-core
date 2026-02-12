/**
 * FieldOps Core WordPress Plugin JavaScript
 * Frontend functionality for FieldOps Core integration
 */

(function($) {
    'use strict';

    // Initialize FieldOps Core
    var FieldOpsCore = {
        init: function() {
            this.setupBookingForms();
            this.setupTestimonials();
            this.setupCEOStories();
            this.setupServices();
            this.setupQuickQuotes();
            this.setupContactInfo();
            this.setupRealTimeUpdates();
        },

        // Setup booking forms
        setupBookingForms: function() {
            $('.fieldops-booking-form').each(function() {
                var $form = $(this);
                var $submitBtn = $form.find('.fieldops-submit-btn');
                var $resetBtn = $form.find('.fieldops-reset-btn');
                var $message = $form.find('.fieldops-form-message');

                // Set minimum date to today
                var today = new Date().toISOString().split('T')[0];
                $form.find('input[type="date"]').attr('min', today).val(today);

                // Load services
                FieldOpsCore.loadServices($form);

                // Form submission
                $form.on('submit', function(e) {
                    e.preventDefault();
                    FieldOpsCore.submitBookingForm($form, $submitBtn, $message);
                });

                // Reset form
                $resetBtn.on('click', function() {
                    $form[0].reset();
                    $form.find('input[type="date"]').val(today);
                });
            });
        },

        // Submit booking form
        submitBookingForm: function($form, $submitBtn, $message) {
            var $btnText = $submitBtn.find('.fieldops-btn-text');
            var $btnLoading = $submitBtn.find('.fieldops-btn-loading');

            // Show loading state
            $btnText.hide();
            $btnLoading.show();
            $submitBtn.prop('disabled', true);

            var formData = {
                action: 'fieldops_booking_form',
                nonce: fieldops_core.nonce,
                name: $form.find('input[name="name"]').val(),
                phone: $form.find('input[name="phone"]').val(),
                email: $form.find('input[name="email"]').val(),
                address: $form.find('input[name="address"]').val(),
                service: $form.find('select[name="service"]').val(),
                date: $form.find('input[name="date"]').val(),
                time: $form.find('select[name="time"]').val(),
                notes: $form.find('textarea[name="notes"]').val(),
                source: 'WordPress Website'
            };

            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        FieldOpsCore.showMessage($message, response.data || 'Booking created successfully!', 'success');
                        $form[0].reset();
                        
                        // Reset date to today
                        var today = new Date().toISOString().split('T')[0];
                        $form.find('input[type="date"]').val(today);
                        
                        // Trigger custom event
                        $(document).trigger('fieldops:booking:success', [response.data]);
                    } else {
                        FieldOpsCore.showMessage($message, response.data || 'Failed to create booking', 'error');
                    }
                },
                error: function() {
                    FieldOpsCore.showMessage($message, 'Network error. Please try again.', 'error');
                },
                complete: function() {
                    $btnText.show();
                    $btnLoading.hide();
                    $submitBtn.prop('disabled', false);
                }
            });
        },

        // Load services
        loadServices: function($container) {
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: {
                    action: 'fieldops_get_services',
                    nonce: fieldops_core.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var $serviceSelect = $container.find('select[name="service"]');
                        $serviceSelect.empty();
                        $serviceSelect.append('<option value="">' + fieldops_core.strings.select_service + '</option>');
                        
                        $.each(response.data, function(index, service) {
                            $serviceSelect.append('<option value="' + service.name + '">' + service.name + '</option>');
                        });
                    }
                }
            });
        },

        // Setup testimonials
        setupTestimonials: function() {
            $('.fieldops-testimonials').each(function() {
                var $container = $(this);
                var limit = parseInt($container.data('limit')) || 6;
                var layout = $container.data('layout') || 'grid';

                FieldOpsCore.loadTestimonials($container, limit, layout);
            });
        },

        // Load testimonials
        loadTestimonials: function($container, limit, layout) {
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: {
                    action: 'fieldops_get_testimonials',
                    nonce: fieldops_core.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var testimonials = response.data.slice(0, limit);
                        var html = '';

                        if (testimonials.length === 0) {
                            html = '<div class="fieldops-no-testimonials"><p>' + fieldops_core.strings.no_testimonials + '</p></div>';
                        } else {
                            html = '<div class="fieldops-testimonials-grid">';
                            
                            $.each(testimonials, function(index, testimonial) {
                                html += '<div class="fieldops-testimonial-card">';
                                html += '<div class="fieldops-testimonial-avatar">' + testimonial.avatar + '</div>';
                                html += '<div class="fieldops-testimonial-content">';
                                html += '<div class="fieldops-testimonial-text">' + testimonial.content + '</div>';
                                html += '<div class="fieldops-testimonial-rating">' + FieldOpsCore.generateStars(testimonial.rating) + '</div>';
                                html += '</div>';
                                html += '<div class="fieldops-testimonial-footer">';
                                html += '<div class="fieldops-testimonial-author">';
                                html += '<strong>' + testimonial.customer_name + '</strong>';
                                html += '<span>' + testimonial.service + '</span>';
                                html += '</div>';
                                html += '<div class="fieldops-testimonial-date">' + FieldOpsCore.formatDate(testimonial.date) + '</div>';
                                html += '</div>';
                                html += '</div>';
                            });
                            
                            html += '</div>';
                        }

                        $container.html(html);
                    }
                },
                error: function() {
                    $container.html('<div class="fieldops-error"><p>' + fieldops_core.strings.error_loading_testimonials + '</p></div>');
                }
            });
        },

        // Setup CEO stories
        setupCEOStories: function() {
            $('.fieldops-ceo-stories').each(function() {
                var $container = $(this);
                var limit = parseInt($container.data('limit')) || 4;
                var layout = $container.data('layout') || 'timeline';

                FieldOpsCore.loadCEOStories($container, limit, layout);
            });
        },

        // Load CEO stories
        loadCEOStories: function($container, limit, layout) {
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: {
                    action: 'fieldops_get_ceo_stories',
                    nonce: fieldops_core.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var stories = response.data.slice(0, limit);
                        var html = '';

                        if (stories.length === 0) {
                            html = '<div class="fieldops-no-stories"><p>' + fieldops_core.strings.no_stories + '</p></div>';
                        } else {
                            html = '<div class="fieldops-stories-timeline">';
                            
                            $.each(stories, function(index, story) {
                                html += '<div class="fieldops-story-item">';
                                html += '<div class="fieldops-story-header">';
                                html += '<div class="fieldops-story-date">' + FieldOpsCore.formatDate(story.date) + '</div>';
                                html += '<h3>' + story.title + '</h3>';
                                html += '</div>';
                                html += '<div class="fieldops-story-content">';
                                html += '<p>' + story.content + '</p>';
                                html += '</div>';
                                html += '<div class="fieldops-story-author">- ' + story.author + '</div>';
                                html += '</div>';
                            });
                            
                            html += '</div>';
                        }

                        $container.html(html);
                    }
                },
                error: function() {
                    $container.html('<div class="fieldops-error"><p>' + fieldops_core.strings.error_loading_stories + '</p></div>');
                }
            });
        },

        // Setup services
        setupServices: function() {
            $('.fieldops-services').each(function() {
                var $container = $(this);
                var layout = $container.data('layout') || 'grid';
                var columns = parseInt($container.data('columns')) || 3;

                FieldOpsCore.loadServices($container, layout, columns);
            });
        },

        // Load services
        loadServices: function($container, layout, columns) {
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: {
                    action: 'fieldops_get_services',
                    nonce: fieldops_core.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var services = response.data;
                        var html = '';

                        if (services.length === 0) {
                            html = '<div class="fieldops-no-services"><p>' + fieldops_core.strings.no_services + '</p></div>';
                        } else {
                            html = '<div class="fieldops-services-grid" style="grid-template-columns: repeat(' + columns + ', 1fr);">';
                            
                            $.each(services, function(index, service) {
                                html += '<div class="fieldops-service-card">';
                                html += '<div class="fieldops-service-icon">' + FieldOpsCore.getServiceIcon(service.name) + '</div>';
                                html += '<h3>' + service.name + '</h3>';
                                html += '<p>' + (service.description || fieldops_core.strings.default_service_description) + '</p>';
                                html += '<div class="fieldops-service-price">$' + (service.price || 80) + '/hr</div>';
                                html += '<button class="fieldops-btn fieldops-btn-primary" onclick="FieldOpsCore.bookService(\'' + service.name + '\')">' + fieldops_core.strings.book_now + '</button>';
                                html += '</div>';
                            });
                            
                            html += '</div>';
                        }

                        $container.html(html);
                    }
                },
                error: function() {
                    $container.html('<div class="fieldops-error"><p>' + fieldops_core.strings.error_loading_services + '</p></div>');
                }
            });
        },

        // Setup quick quotes
        setupQuickQuotes: function() {
            $('.fieldops-quick-quote').each(function() {
                var $form = $(this);
                var $submitBtn = $form.find('#fieldops-qq-submit-btn');
                var $message = $form.find('#fieldops-qq-message');

                // Load services
                FieldOpsCore.loadServices($form);

                // Form submission
                $form.find('form').on('submit', function(e) {
                    e.preventDefault();
                    FieldOpsCore.submitQuickQuote($form, $submitBtn, $message);
                });
            });
        },

        // Submit quick quote
        submitQuickQuote: function($form, $submitBtn, $message) {
            var $btnText = $submitBtn.find('.fieldops-btn-text');
            var $btnLoading = $submitBtn.find('.fieldops-btn-loading');

            // Show loading state
            $btnText.hide();
            $btnLoading.show();
            $submitBtn.prop('disabled', true);

            var formData = {
                action: 'fieldops_booking_form',
                nonce: fieldops_core.nonce,
                name: $form.find('input[name="name"]').val(),
                phone: $form.find('input[name="phone"]').val(),
                service: $form.find('select[name="service"]').val(),
                message: $form.find('textarea[name="message"]').val(),
                source: 'Quick Quote Form'
            };

            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        FieldOpsCore.showMessage($message, fieldops_core.strings.quote_success, 'success');
                        $form[0].reset();
                        
                        // Trigger custom event
                        $(document).trigger('fieldops:quote:success', [response.data]);
                    } else {
                        FieldOpsCore.showMessage($message, response.data || fieldops_core.strings.quote_error, 'error');
                    }
                },
                error: function() {
                    FieldOpsCore.showMessage($message, fieldops_core.strings.network_error, 'error');
                },
                complete: function() {
                    $btnText.show();
                    $btnLoading.hide();
                    $submitBtn.prop('disabled', false);
                }
            });
        },

        // Setup contact info
        setupContactInfo: function() {
            $('.fieldops-contact-info').each(function() {
                var $container = $(this);
                
                // Add click handlers for phone numbers
                $container.find('a[href^="tel:"]').on('click', function() {
                    $(document).trigger('fieldops:contact:phone', [$(this).text()]);
                });
                
                // Add click handlers for emails
                $container.find('a[href^="mailto:"]').on('click', function() {
                    $(document).trigger('fieldops:contact:email', [$(this).text()]);
                });
            });
        },

        // Setup real-time updates
        setupRealTimeUpdates: function() {
            // Connect to FieldOps WebSocket if available
            if (typeof io !== 'undefined') {
                var socket = io(fieldops_core.api_url.replace('/api', ''));
                
                socket.on('connect', function() {
                    console.log('FieldOps Core connected to real-time updates');
                });
                
                socket.on('new-booking', function(data) {
                    FieldOpsCore.handleRealTimeUpdate('new-booking', data);
                });
                
                socket.on('job-updated', function(data) {
                    FieldOpsCore.handleRealTimeUpdate('job-updated', data);
                });
                
                socket.on('photo-uploaded', function(data) {
                    FieldOpsCore.handleRealTimeUpdate('photo-uploaded', data);
                });
            }
        },

        // Handle real-time updates
        handleRealTimeUpdate: function(type, data) {
            console.log('FieldOps Core real-time update:', type, data);
            
            // Trigger custom events
            $(document).trigger('fieldops:realtime:' + type, [data]);
            
            // Show notification
            FieldOpsCore.showNotification(FieldOpsCore.getUpdateMessage(type, data));
        },

        // Get update message
        getUpdateMessage: function(type, data) {
            var messages = {
                'new-booking': 'New booking received: ' + (data.customer?.name || 'Unknown'),
                'job-updated': 'Job updated: ' + (data.job?.status || 'Unknown'),
                'photo-uploaded': 'Photo uploaded for job #' + (data.job_id || 'Unknown')
            };
            
            return messages[type] || 'FieldOps Core update received';
        },

        // Show notification
        showNotification: function(message) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('FieldOps Core', {
                    body: message,
                    icon: fieldops_core.plugin_url + '/assets/images/icon.png'
                });
            } else {
                // Fallback to browser notification
                FieldOpsCore.showBrowserNotification(message);
            }
        },

        // Show browser notification
        showBrowserNotification: function(message) {
            var notification = $('<div class="fieldops-notification">' + message + '</div>');
            notification.css({
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: '#2563eb',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '500',
                zIndex: 10000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            });
            
            $('body').append(notification);
            
            setTimeout(function() {
                notification.fadeOut(function() {
                    notification.remove();
                });
            }, 3000);
        },

        // Show message
        showMessage: function($container, message, type) {
            $container.removeClass('fieldops-success fieldops-error')
                     .addClass('fieldops-' + type)
                     .html('<div class="fieldops-message-content">' + message + '</div>')
                     .show();
            
            setTimeout(function() {
                $container.fadeOut();
            }, 5000);
        },

        // Generate stars
        generateStars: function(rating) {
            var stars = '';
            for (var i = 1; i <= 5; i++) {
                stars += i <= rating ? '⭐' : '☆';
            }
            return stars;
        },

        // Get service icon
        getServiceIcon: function(serviceName) {
            var icons = {
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
        },

        // Format date
        formatDate: function(dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        },

        // Book service
        bookService: function(serviceName) {
            // Scroll to booking form or open booking page
            var $bookingForm = $('.fieldops-booking-form').first();
            if ($bookingForm.length) {
                $bookingForm[0].scrollIntoView({ behavior: 'smooth' });
                // Pre-select service
                $bookingForm.find('select[name="service"]').val(serviceName);
            } else {
                // Open booking page
                window.open('/booking', '_blank');
            }
        }
    };

    // Initialize on document ready
    $(document).ready(function() {
        FieldOpsCore.init();
    });

    // Make FieldOpsCore available globally
    window.FieldOpsCore = FieldOpsCore;

})(jQuery);
