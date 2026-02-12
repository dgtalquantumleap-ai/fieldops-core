<?php
/**
 * FieldOps Core Shortcodes
 * Shortcodes for easy integration into WordPress pages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('This file cannot be accessed directly.');
}

// Booking Form Shortcode
function fieldops_booking_form_shortcode($atts) {
    $atts = shortcode_atts(array(
        'title' => __('Book Your Cleaning Service', 'fieldops-core'),
        'show_services' => 'true',
        'show_date_time' => 'true',
        'show_notes' => 'true',
        'button_text' => __('Book Now', 'fieldops-core'),
        'redirect_url' => '',
        'success_message' => __('Thank you! We\'ll contact you within 24 hours.', 'fieldops-core'),
        'error_message' => __('Please try again or call us directly.', 'fieldops-core')
    ), $atts, 'fieldops_booking_form');
    
    ob_start();
    ?>
    <div class="fieldops-booking-form" id="fieldops-booking-<?php echo uniqid(); ?>">
        <div class="fieldops-form-header">
            <h3><?php echo esc_html($atts['title']); ?></h3>
            <p><?php _e('Fill out the form below to book your cleaning service', 'fieldops-core'); ?></p>
        </div>
        
        <form class="fieldops-form" id="fieldops-booking-form">
            <div class="fieldops-form-row">
                <div class="fieldops-form-group">
                    <label for="fieldops-name"><?php _e('Name *', 'fieldops-core'); ?></label>
                    <input type="text" id="fieldops-name" name="name" required>
                </div>
                <div class="fieldops-form-group">
                    <label for="fieldops-phone"><?php _e('Phone *', 'fieldops-core'); ?></label>
                    <input type="tel" id="fieldops-phone" name="phone" required>
                </div>
            </div>
            
            <div class="fieldops-form-row">
                <div class="fieldops-form-group">
                    <label for="fieldops-email"><?php _e('Email', 'fieldops-core'); ?></label>
                    <input type="email" id="fieldops-email" name="email">
                </div>
                <div class="fieldops-form-group">
                    <label for="fieldops-address"><?php _e('Address *', 'fieldops-core'); ?></label>
                    <input type="text" id="fieldops-address" name="address" required>
                </div>
            </div>
            
            <?php if ($atts['show_services'] === 'true'): ?>
            <div class="fieldops-form-group">
                <label for="fieldops-service"><?php _e('Service Type *', 'fieldops-core'); ?></label>
                <select id="fieldops-service" name="service" required>
                    <option value=""><?php _e('Select a service', 'fieldops-core'); ?></option>
                </select>
            </div>
            <?php endif; ?>
            
            <?php if ($atts['show_date_time'] === 'true'): ?>
            <div class="fieldops-form-row">
                <div class="fieldops-form-group">
                    <label for="fieldops-date"><?php _e('Preferred Date *', 'fieldops-core'); ?></label>
                    <input type="date" id="fieldops-date" name="date" required>
                </div>
                <div class="fieldops-form-group">
                    <label for="fieldops-time"><?php _e('Preferred Time *', 'fieldops-core'); ?></label>
                    <select id="fieldops-time" name="time" required>
                        <option value=""><?php _e('Select time', 'fieldops-core'); ?></option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                    </select>
                </div>
            </div>
            <?php endif; ?>
            
            <?php if ($atts['show_notes'] === 'true'): ?>
            <div class="fieldops-form-group">
                <label for="fieldops-notes"><?php _e('Additional Notes', 'fieldops-core'); ?></label>
                <textarea id="fieldops-notes" name="notes" rows="3" placeholder="<?php _e('Any special requirements or preferences?', 'fieldops-core'); ?>"></textarea>
            </div>
            <?php endif; ?>
            
            <div class="fieldops-form-actions">
                <button type="submit" class="fieldops-btn fieldops-btn-primary" id="fieldops-submit-btn">
                    <span class="fieldops-btn-text"><?php echo esc_html($atts['button_text']); ?></span>
                    <span class="fieldops-btn-loading" style="display: none;"><?php _e('Processing...', 'fieldops-core'); ?></span>
                </button>
                <button type="button" class="fieldops-btn fieldops-btn-secondary" id="fieldops-reset-btn"><?php _e('Clear Form', 'fieldops-core'); ?></button>
            </div>
        </form>
        
        <div class="fieldops-form-message" id="fieldops-form-message" style="display: none;"></div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        // Set minimum date to today
        var today = new Date().toISOString().split('T')[0];
        $('#fieldops-date').attr('min', today).val(today);
        
        // Load services
        $.ajax({
            url: fieldops_core.ajax_url,
            type: 'POST',
            data: {
                action: 'fieldops_get_services',
                nonce: fieldops_core.nonce
            },
            success: function(response) {
                if (response.success) {
                    var serviceSelect = $('#fieldops-service');
                    serviceSelect.empty();
                    serviceSelect.append('<option value=""><?php _e('Select a service', 'fieldops-core'); ?></option>');
                    
                    $.each(response.data, function(index, service) {
                        serviceSelect.append('<option value="' + service.name + '">' + service.name + '</option>');
                    });
                }
            }
        });
        
        // Form submission
        $('#fieldops-booking-form').on('submit', function(e) {
            e.preventDefault();
            
            var submitBtn = $('#fieldops-submit-btn');
            var btnText = submitBtn.find('.fieldops-btn-text');
            var btnLoading = submitBtn.find('.fieldops-btn-loading');
            
            // Show loading state
            btnText.hide();
            btnLoading.show();
            submitBtn.prop('disabled', true);
            
            var formData = {
                action: 'fieldops_booking_form',
                nonce: fieldops_core.nonce,
                name: $('#fieldops-name').val(),
                phone: $('#fieldops-phone').val(),
                email: $('#fieldops-email').val(),
                address: $('#fieldops-address').val(),
                service: $('#fieldops-service').val(),
                date: $('#fieldops-date').val(),
                time: $('#fieldops-time').val(),
                notes: $('#fieldops-notes').val()
            };
            
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        showMessage('<?php echo esc_js($atts['success_message']); ?>', 'success');
                        $('#fieldops-booking-form')[0].reset();
                        
                        <?php if ($atts['redirect_url']): ?>
                        setTimeout(function() {
                            window.location.href = '<?php echo esc_js($atts['redirect_url']); ?>';
                        }, 2000);
                        <?php endif; ?>
                    } else {
                        showMessage(response.data || '<?php echo esc_js($atts['error_message']); ?>', 'error');
                    }
                },
                error: function() {
                    showMessage('<?php echo esc_js($atts['error_message']); ?>', 'error');
                },
                complete: function() {
                    btnText.show();
                    btnLoading.hide();
                    submitBtn.prop('disabled', false);
                }
            });
        });
        
        // Reset form
        $('#fieldops-reset-btn').on('click', function() {
            $('#fieldops-booking-form')[0].reset();
            var today = new Date().toISOString().split('T')[0];
            $('#fieldops-date').val(today);
        });
        
        function showMessage(message, type) {
            var messageDiv = $('#fieldops-form-message');
            messageDiv.removeClass('fieldops-success fieldops-error').addClass('fieldops-' + type);
            messageDiv.html('<div class="fieldops-message-content">' + message + '</div>').show();
            
            setTimeout(function() {
                messageDiv.fadeOut();
            }, 5000);
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_booking_form', 'fieldops_booking_form_shortcode');

// Testimonials Shortcode
function fieldops_testimonials_shortcode($atts) {
    $atts = shortcode_atts(array(
        'limit' => '6',
        'service' => '',
        'rating' => '',
        'show_avatar' => 'true',
        'show_rating' => 'true',
        'show_service' => 'true',
        'show_date' => 'true',
        'layout' => 'grid', // grid, carousel, list
        'columns' => '3'
    ), $atts, 'fieldops_testimonials');
    
    ob_start();
    ?>
    <div class="fieldops-testimonials fieldops-testimonials-<?php echo esc_attr($atts['layout']); ?>" id="fieldops-testimonials-<?php echo uniqid(); ?>">
        <div class="fieldops-testimonials-loading">
            <div class="fieldops-spinner"></div>
            <p><?php _e('Loading testimonials...', 'fieldops-core'); ?></p>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        $.ajax({
            url: fieldops_core.ajax_url,
            type: 'POST',
            data: {
                action: 'fieldops_get_testimonials',
                nonce: fieldops_core.nonce
            },
            success: function(response) {
                if (response.success) {
                    var testimonials = response.data;
                    var container = $('#fieldops-testimonials-<?php echo uniqid(); ?>');
                    var html = '';
                    
                    if (testimonials.length === 0) {
                        html = '<div class="fieldops-no-testimonials"><p><?php _e('No testimonials available.', 'fieldops-core'); ?></p></div>';
                    } else {
                        html = '<div class="fieldops-testimonials-grid" style="grid-template-columns: repeat(<?php echo esc_attr($atts['columns']); ?>, 1fr);">';
                        
                        $.each(testimonials.slice(0, <?php echo intval($atts['limit']); ?>), function(index, testimonial) {
                            html += '<div class="fieldops-testimonial-card">';
                            
                            <?php if ($atts['show_avatar'] === 'true'): ?>
                            html += '<div class="fieldops-testimonial-avatar">' + testimonial.avatar + '</div>';
                            <?php endif; ?>
                            
                            html += '<div class="fieldops-testimonial-content">';
                            html += '<div class="fieldops-testimonial-text">' + testimonial.content + '</div>';
                            
                            <?php if ($atts['show_rating'] === 'true'): ?>
                            html += '<div class="fieldops-testimonial-rating">' + generateStars(testimonial.rating) + '</div>';
                            <?php endif; ?>
                            
                            html += '</div>';
                            
                            html += '<div class="fieldops-testimonial-footer">';
                            html += '<div class="fieldops-testimonial-author">';
                            html += '<strong>' + testimonial.customer_name + '</strong>';
                            
                            <?php if ($atts['show_service'] === 'true'): ?>
                            html += '<span>' + testimonial.service + '</span>';
                            <?php endif; ?>
                            
                            html += '</div>';
                            
                            <?php if ($atts['show_date'] === 'true'): ?>
                            html += '<div class="fieldops-testimonial-date">' + formatDate(testimonial.date) + '</div>';
                            <?php endif; ?>
                            
                            html += '</div>';
                            html += '</div>';
                        });
                        
                        html += '</div>';
                    }
                    
                    container.html(html);
                }
            },
            error: function() {
                $('#fieldops-testimonials-<?php echo uniqid(); ?>').html('<div class="fieldops-error"><p><?php _e('Failed to load testimonials.', 'fieldops-core'); ?></p></div>');
            }
        });
        
        function generateStars(rating) {
            var stars = '';
            for (var i = 1; i <= 5; i++) {
                stars += i <= rating ? '⭐' : '☆';
            }
            return stars;
        }
        
        function formatDate(dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_testimonials', 'fieldops_testimonials_shortcode');

// CEO Stories Shortcode
function fieldops_ceo_stories_shortcode($atts) {
    $atts = shortcode_atts(array(
        'limit' => '4',
        'featured_only' => 'true',
        'show_image' => 'true',
        'show_date' => 'true',
        'layout' => 'timeline', // timeline, grid, list
        'order' => 'asc' // asc, desc
    ), $atts, 'fieldops_ceo_stories');
    
    ob_start();
    ?>
    <div class="fieldops-ceo-stories fieldops-ceo-stories-<?php echo esc_attr($atts['layout']); ?>" id="fieldops-ceo-stories-<?php echo uniqid(); ?>">
        <div class="fieldops-stories-loading">
            <div class="fieldops-spinner"></div>
            <p><?php _e('Loading our story...', 'fieldops-core'); ?></p>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        $.ajax({
            url: fieldops_core.ajax_url,
            type: 'POST',
            data: {
                action: 'fieldops_get_ceo_stories',
                nonce: fieldops_core.nonce
            },
            success: function(response) {
                if (response.success) {
                    var stories = response.data;
                    var container = $('#fieldops-ceo-stories-<?php echo uniqid(); ?>');
                    var html = '';
                    
                    if (stories.length === 0) {
                        html = '<div class="fieldops-no-stories"><p><?php _e('No stories available.', 'fieldops-core'); ?></p></div>';
                    } else {
                        html = '<div class="fieldops-stories-timeline">';
                        
                        $.each(stories.slice(0, <?php echo intval($atts['limit']); ?>), function(index, story) {
                            html += '<div class="fieldops-story-item">';
                            html += '<div class="fieldops-story-header">';
                            html += '<div class="fieldops-story-date">' + formatDate(story.date) + '</div>';
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
                    
                    container.html(html);
                }
            },
            error: function() {
                $('#fieldops-ceo-stories-<?php echo uniqid(); ?>').html('<div class="fieldops-error"><p><?php _e('Failed to load stories.', 'fieldops-core'); ?></p></div>');
            }
        });
        
        function formatDate(dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_ceo_stories', 'fieldops_ceo_stories_shortcode');

// Services Shortcode
function fieldops_services_shortcode($atts) {
    $atts = shortcode_atts(array(
        'show_price' => 'true',
        'show_description' => 'true',
        'layout' => 'grid', // grid, list
        'columns' => '3',
        'button_text' => __('Book Now', 'fieldops-core')
    ), $atts, 'fieldops_services');
    
    ob_start();
    ?>
    <div class="fieldops-services fieldops-services-<?php echo esc_attr($atts['layout']); ?>" id="fieldops-services-<?php echo uniqid(); ?>">
        <div class="fieldops-services-loading">
            <div class="fieldops-spinner"></div>
            <p><?php _e('Loading services...', 'fieldops-core'); ?></p>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
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
                    var container = $('#fieldops-services-<?php echo uniqid(); ?>');
                    var html = '';
                    
                    if (services.length === 0) {
                        html = '<div class="fieldops-no-services"><p><?php _e('No services available.', 'fieldops-core'); ?></p></div>';
                    } else {
                        html = '<div class="fieldops-services-grid" style="grid-template-columns: repeat(<?php echo esc_attr($atts['columns']); ?>, 1fr);">';
                        
                        $.each(services, function(index, service) {
                            html += '<div class="fieldops-service-card">';
                            html += '<div class="fieldops-service-icon">' + getServiceIcon(service.name) + '</div>';
                            html += '<h3>' + service.name + '</h3>';
                            
                            <?php if ($atts['show_description'] === 'true'): ?>
                            html += '<p>' + (service.description || '<?php _e('Professional cleaning service', 'fieldops-core'); ?>') + '</p>';
                            <?php endif; ?>
                            
                            <?php if ($atts['show_price'] === 'true'): ?>
                            html += '<div class="fieldops-service-price">$' + (service.price || 80) + '/hr</div>';
                            <?php endif; ?>
                            
                            html += '<button class="fieldops-btn fieldops-btn-primary" onclick="bookService(\'' + service.name + '\')"><?php echo esc_js($atts['button_text']); ?></button>';
                            html += '</div>';
                        });
                        
                        html += '</div>';
                    }
                    
                    container.html(html);
                }
            },
            error: function() {
                $('#fieldops-services-<?php echo uniqid(); ?>').html('<div class="fieldops-error"><p><?php _e('Failed to load services.', 'fieldops-core'); ?></p></div>');
            }
        });
        
        function getServiceIcon(serviceName) {
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
        }
        
        function bookService(serviceName) {
            // Scroll to booking form or open booking page
            var bookingForm = $('.fieldops-booking-form').first();
            if (bookingForm.length) {
                bookingForm[0].scrollIntoView({ behavior: 'smooth' });
                // Pre-select service
                $('#fieldops-service').val(serviceName);
            } else {
                // Open booking page
                window.open('/booking', '_blank');
            }
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_services', 'fieldops_services_shortcode');

// Quick Quote Shortcode
function fieldops_quick_quote_shortcode($atts) {
    $atts = shortcode_atts(array(
        'title' => __('Get a Quick Quote', 'fieldops-core'),
        'button_text' => __('Get Quote', 'fieldops-core'),
        'show_service' => 'true',
        'show_message' => 'true'
    ), $atts, 'fieldops_quick_quote');
    
    ob_start();
    ?>
    <div class="fieldops-quick-quote" id="fieldops-quick-quote-<?php echo uniqid(); ?>">
        <div class="fieldops-form-header">
            <h3><?php echo esc_html($atts['title']); ?></h3>
        </div>
        
        <form class="fieldops-form" id="fieldops-quick-quote-form">
            <div class="fieldops-form-group">
                <label for="fieldops-qq-name"><?php _e('Name *', 'fieldops-core'); ?></label>
                <input type="text" id="fieldops-qq-name" name="name" required>
            </div>
            
            <div class="fieldops-form-group">
                <label for="fieldops-qq-phone"><?php _e('Phone *', 'fieldops-core'); ?></label>
                <input type="tel" id="fieldops-qq-phone" name="phone" required>
            </div>
            
            <?php if ($atts['show_service'] === 'true'): ?>
            <div class="fieldops-form-group">
                <label for="fieldops-qq-service"><?php _e('Service', 'fieldops-core'); ?></label>
                <select id="fieldops-qq-service" name="service">
                    <option value=""><?php _e('Select a service', 'fieldops-core'); ?></option>
                </select>
            </div>
            <?php endif; ?>
            
            <?php if ($atts['show_message'] === 'true'): ?>
            <div class="fieldops-form-group">
                <label for="fieldops-qq-message"><?php _e('Message', 'fieldops-core'); ?></label>
                <textarea id="fieldops-qq-message" name="message" rows="3"></textarea>
            </div>
            <?php endif; ?>
            
            <div class="fieldops-form-actions">
                <button type="submit" class="fieldops-btn fieldops-btn-primary" id="fieldops-qq-submit-btn">
                    <span class="fieldops-btn-text"><?php echo esc_html($atts['button_text']); ?></span>
                    <span class="fieldops-btn-loading" style="display: none;"><?php _e('Processing...', 'fieldops-core'); ?></span>
                </button>
            </div>
        </form>
        
        <div class="fieldops-form-message" id="fieldops-qq-message" style="display: none;"></div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        // Load services
        $.ajax({
            url: fieldops_core.ajax_url,
            type: 'POST',
            data: {
                action: 'fieldops_get_services',
                nonce: fieldops_core.nonce
            },
            success: function(response) {
                if (response.success) {
                    var serviceSelect = $('#fieldops-qq-service');
                    serviceSelect.empty();
                    serviceSelect.append('<option value=""><?php _e('Select a service', 'fieldops-core'); ?></option>');
                    
                    $.each(response.data, function(index, service) {
                        serviceSelect.append('<option value="' + service.name + '">' + service.name + '</option>');
                    });
                }
            }
        });
        
        // Form submission
        $('#fieldops-quick-quote-form').on('submit', function(e) {
            e.preventDefault();
            
            var submitBtn = $('#fieldops-qq-submit-btn');
            var btnText = submitBtn.find('.fieldops-btn-text');
            var btnLoading = submitBtn.find('.fieldops-btn-loading');
            
            // Show loading state
            btnText.hide();
            btnLoading.show();
            submitBtn.prop('disabled', true);
            
            var formData = {
                action: 'fieldops_booking_form',
                nonce: fieldops_core.nonce,
                name: $('#fieldops-qq-name').val(),
                phone: $('#fieldops-qq-phone').val(),
                service: $('#fieldops-qq-service').val(),
                message: $('#fieldops-qq-message').val(),
                source: 'Quick Quote Form'
            };
            
            $.ajax({
                url: fieldops_core.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        showMessage('<?php _e('Quote request received! We\'ll contact you within 24 hours.', 'fieldops-core'); ?>', 'success');
                        $('#fieldops-quick-quote-form')[0].reset();
                    } else {
                        showMessage(response.data || '<?php _e('Failed to send quote request. Please try again.', 'fieldops-core'); ?>', 'error');
                    }
                },
                error: function() {
                    showMessage('<?php _e('Network error. Please try again.', 'fieldops-core'); ?>', 'error');
                },
                complete: function() {
                    btnText.show();
                    btnLoading.hide();
                    submitBtn.prop('disabled', false);
                }
            });
        });
        
        function showMessage(message, type) {
            var messageDiv = $('#fieldops-qq-message');
            messageDiv.removeClass('fieldops-success fieldops-error').addClass('fieldops-' + type);
            messageDiv.html('<div class="fieldops-message-content">' + message + '</div>').show();
            
            setTimeout(function() {
                messageDiv.fadeOut();
            }, 5000);
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_quick_quote', 'fieldops_quick_quote_shortcode');

// Contact Info Shortcode
function fieldops_contact_info_shortcode($atts) {
    $atts = shortcode_atts(array(
        'show_phone' => 'true',
        'show_email' => 'true',
        'show_address' => 'true',
        'show_hours' => 'true',
        'phone' => '825-994-6606',
        'email' => 'dgtalquantumleap@gmail.com',
        'address' => 'Metropolitan Area',
        'hours' => 'Mon-Fri: 8AM-6PM'
    ), $atts, 'fieldops_contact_info');
    
    ob_start();
    ?>
    <div class="fieldops-contact-info">
        <?php if ($atts['show_phone'] === 'true'): ?>
        <div class="fieldops-contact-item">
            <div class="fieldops-contact-icon">📞</div>
            <div class="fieldops-contact-details">
                <h4><?php _e('Phone', 'fieldops-core'); ?></h4>
                <p><a href="tel:<?php echo esc_attr($atts['phone']); ?>"><?php echo esc_html($atts['phone']); ?></a></p>
            </div>
        </div>
        <?php endif; ?>
        
        <?php if ($atts['show_email'] === 'true'): ?>
        <div class="fieldops-contact-item">
            <div class="fieldops-contact-icon">📧</div>
            <div class="fieldops-contact-details">
                <h4><?php _e('Email', 'fieldops-core'); ?></h4>
                <p><a href="mailto:<?php echo esc_attr($atts['email']); ?>"><?php echo esc_html($atts['email']); ?></a></p>
            </div>
        </div>
        <?php endif; ?>
        
        <?php if ($atts['show_address'] === 'true'): ?>
        <div class="fieldops-contact-item">
            <div class="fieldops-contact-icon">📍</div>
            <div class="fieldops-contact-details">
                <h4><?php _e('Service Area', 'fieldops-core'); ?></h4>
                <p><?php echo esc_html($atts['address']); ?></p>
            </div>
        </div>
        <?php endif; ?>
        
        <?php if ($atts['show_hours'] === 'true'): ?>
        <div class="fieldops-contact-item">
            <div class="fieldops-contact-icon">🕒</div>
            <div class="fieldops-contact-details">
                <h4><?php _e('Business Hours', 'fieldops-core'); ?></h4>
                <p><?php echo esc_html($atts['hours']); ?></p>
            </div>
        </div>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('fieldops_contact_info', 'fieldops_contact_info_shortcode');

?>
