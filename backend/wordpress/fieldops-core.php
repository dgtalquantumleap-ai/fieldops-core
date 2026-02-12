<?php
/**
 * WordPress Plugin: FieldOps Core Integration
 * Plugin Name: FieldOps Core Integration
 * Description: Integrates Stilt Heights website with FieldOps Core operations system
 * Version: 1.0.0
 * Author: FieldOps Core Team
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('This file cannot be accessed directly.');
}

// Plugin activation hook
register_activation_hook(function() {
    // Create database tables if they don't exist
    require_once('includes/database-setup.php');
    
    // Flush rewrite rules
    flush_rewrite_rules();
    
    // Add custom endpoints
    add_fieldops_endpoints();
    
    // Schedule cron job for sync
    if (!wp_next_scheduled('fieldops_sync')) {
        wp_schedule_event(time(), 'daily', 'fieldops_sync_services');
    }
});

// Database setup function
function fieldops_database_setup() {
    global $wpdb;
    
    // Create custom tables
    $charset_collate = $wpdb->get_charset_collate();
    
    $table_testimonials = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}fieldops_testimonials (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        customer_name varchar(255) NOT NULL,
        service_name varchar(255) NOT NULL,
        rating int(1) DEFAULT 5,
        content text NOT NULL,
        date date DEFAULT CURRENT_TIMESTAMP,
        approved tinyint(1) DEFAULT 1,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP
    ) $charset_collate;";
    
    $table_ceo_stories = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}fieldops_ceo_stories (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        author varchar(255) NOT NULL,
        content text NOT NULL,
        date date DEFAULT CURRENT_TIMESTAMP,
        featured tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP
    ) $charset_collate;";
    
    $table_wp_sync = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}fieldops_wp_sync (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        last_sync datetime DEFAULT CURRENT_TIMESTAMP,
        sync_status varchar(50) DEFAULT 'pending',
        sync_data text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP
    ) $charset_collate;";
    
    require_once(ABSPATH . '/wp-admin/includes/upgrade.php');
    dbDelta($table_testimonials);
    dbDelta($table_ceo_stories);
    dbDelta($table_wp_sync);
    
    // Add default testimonials
    add_default_testimonials();
    add_default_ceo_stories();
    
    // Flush rewrite rules again after table creation
    flush_rewrite_rules();
}

// Add default testimonials
function add_default_testimonials() {
    global $wpdb;
    
    $default_testimonials = [
        [
            'Sarah Johnson', 'Regular Housekeeping', 5, 'Stilt Heights transformed our home! Their attention to detail and professional approach exceeded our expectations. Highly recommended!', '2024-01-15', 1],
            ['Michael Chen', 'Commercial Cleaning', 5, 'As a business owner, I needed reliable cleaning services. Stilt Heights delivers consistent quality every time. Our office has never looked better!', '2024-01-10', 1],
            ['Emily Rodriguez', 'Move In & Out Cleaning', 5, 'The move-in cleaning service was exceptional. They made our new home spotless and ready for move-in day. Worth every penny!', '2024-01-05', 1],
            ['David Thompson', 'Event Cleanup', 5, 'After our company event, the venue was a mess. Stilt Heights came in and made it look like we never had a party. Amazing service!', '2023-12-20', 1],
            ['Lisa Martinez', 'One-time Deep Cleaning', 5, 'I needed a deep clean before family visited. Stilt Heights went above and beyond. My house has never been this clean!', '2023-12-15', 1]
    ];
    
    foreach ($default_testimonials as $testimonial) {
        $wpdb->insert(
            $table_testimonials,
            [
                $testimonial[0], // customer_name
                $testimonial[1], // service_name
                $testimonial[2], // rating
                $testimonial[3], // content
                $testimonial[4], // date
                $testimonial[5], // approved
                current_time('mysql'), // created_at
                current_time('mysql')  // updated_at
            ]
        );
    }
}

// Add default CEO stories
function add_default_ceo_stories() {
    global $wpdb;
    
    $default_stories = [
        [
            'Our Journey Begins', 'John Heights', 'Stilt Heights started with a simple mission: to provide exceptional cleaning services that people could trust. I saw how many cleaning companies cut corners, and I knew there was a better way. We started with just two employees and a commitment to quality.', '2020-01-15', 1],
        ['Building Trust Through Quality', 'John Heights', 'Our first year taught us that quality speaks for itself. We didn\'t advertise much - our customers did it for us. Word of mouth spread because we showed up on time, did exceptional work, and treated every home like it was our own.', '2021-06-20', 1],
        ['Growing Our Family', 'John Heights', 'Today, Stilt Heights is a family of 20+ professionals who share the same values: integrity, excellence, and customer satisfaction. Every team member is trained not just in cleaning techniques, but in customer service and communication.', '2022-11-10', 1],
        ['Looking to the Future', 'John Heights', 'We\'re not just cleaning houses - we\'re building relationships. Our goal is to become the most trusted cleaning service in the region, known for reliability, quality, and exceptional customer care.', '2023-12-01', 0]
    ];
    
    foreach ($default_stories as $story) {
        $wpdb->insert(
            $table_ceo_stories,
            [
                $story[0], // title
                $story[1], // author
                $story[2], // content
                $story[3], // date
                $story[4], // featured
                current_time('mysql'), // created_at
                current_time('mysql')  // updated_at
            ]
        );
    }
}

// Add custom rewrite rules
function flush_rewrite_rules() {
    add_rewrite_rule(
        '^wp-content/plugins/fieldops-core/.*',
        'index.php',
        'wp-content/plugins/fieldops-core/index.php',
        'top',
        1,
        false
    );
    
    add_rewrite_rule(
        '^wp-content/plugins/fieldops-core/testimonials/.*',
        'wp-content/plugins/fieldops-core/testimonials/index.php',
        'wp-content/plugins/fieldops-core/testimonials/index.php',
        'top',
        1,
        false
    );
    
    add_rewrite_rule(
        '^wp-content/plugins/fieldops-core/ceo-stories/.*',
        'wp-content/plugins/fieldops-core/ceo-stories/index.php',
        'wp-content/plugins/fieldops-core/ceo-stories/index.php',
        'top',
        1,
        false
    );
    
    add_rewrite_rule(
        '^wp-content/plugins/fieldops-core/scheduling/.*',
        'wp-content/plugins/fieldops-core/scheduling/index.php',
        'wp-content/plugins/fieldops-core/scheduling/index.php',
        'top',
        1,
        false
    );
    
    flush_rewrite_rules();
}

// Add custom API endpoints
function add_fieldops_endpoints() {
    // Register REST API endpoints
    add_action('wp_api_fieldops_testimonials', 'handle_testimonials_api', 10, 1);
    add_action('wp_api_fieldops_ceo_stories', 'handle_ceo_stories_api', 10, 1);
    add_action('wp_api_fieldops_booking', 'handle_booking_api', 10, 1);
    add_action('wp_api_fieldops_sync', 'handle_sync_api', 10, 1);
    add_action('wp_api_fieldops_status', 'handle_status_api', 10, 1);
    add_action('wp_api_fieldops_webhook', 'handle_webhook_api', 10, 1);
}

// API Handlers
function handle_testimonials_api($request) {
    global $wpdb;
    
    $testimonials = $wpdb->get_results(
        "SELECT * FROM {$wpdb->prefix}fieldops_testimonials WHERE approved = 1 ORDER BY date DESC"
    );
    
    wp_send_json($testimonials);
}

function handle_ceo_stories_api($request) {
    global $wpdb;
    
    $stories = $wpdb->get_results(
        "SELECT * FROM {$wpdb->prefix}fieldops_ceo_stories WHERE featured = 1 ORDER BY date ASC"
    );
    
    wp_send_json($stories);
}

function handle_booking_api($request) {
    $data = json_decode($request->get_body(), true);
    
    // Validate required fields
    $required_fields = ['name', 'phone', 'service', 'date', 'time', 'address'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            wp_send_json(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    // Call FieldOps API
    $fieldops_url = 'http://localhost:3000/api/wp/booking';
    
    $response = wp_remote_post($fieldops_url, array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type: application/json'
        ),
        'body' => json_encode($data)
    ));
    
    $result = json_decode($response['body'], true);
    
    if ($result['success']) {
        wp_send_json([
            'success' => true,
            'message' => 'Booking created successfully!',
            'booking_id' => $result['booking_id'],
            'customer_id' => $result['customer_id']
        ]);
    } else {
        wp_send_json([
            'error' => $result['error'] || 'Failed to create booking'
        ]);
    }
}

function handle_sync_api($request) {
    $data = json_decode($request->get_body(), true);
    
    if (!isset($data['services']) {
        wp_send_json(['error' => 'No services provided']);
        return;
    }
    
    $synced_services = [];
    
    foreach ($data['services'] as $service) {
        // Check if service already exists
        $existing = $wpdb->get_row(
            "SELECT id FROM {$wpdb->prefix}services WHERE name = ?",
            [$service['name']]
        );
        
        if (!$existing) {
            // Create new service
            $service_id = $wpdb->insert(
                "{$wpdb->prefix}services",
                [
                    'name' => $service['name'],
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from WordPress'
                ]
            );
            
            $synced_services[] = [
                'id' => $service_id,
                'name' => $service['name'],
                'price' => $service['price'] ?? 80,
                'description' => $service['description'] || 'Service from WordPress',
                'status' => 'created'
            ];
        } else {
            // Update existing service
            $wpdb->update(
                "{$wpdb->prefix}services",
                [
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from WordPress'
                ],
                ['name' => $service['name']]
            );
            
            $synced_services[] = [
                'id' => $existing['id'],
                'name' => $service['name'],
                'price' => $service['price'] ?? 80,
                'description' => $service['description'] || 'Service from WordPress',
                'status' => 'updated'
            ];
        }
    }
    
    // Update sync status
    $wpdb->update(
        "{$wpdb->prefix}fieldops_wp_sync",
        [
            'last_sync' => current_time('mysql'),
            'sync_status' => 'completed',
            'sync_data' => json_encode($synced_services)
        ],
        ['last_sync' => current_time('mysql')]
    );
    
    wp_send_json([
        'success' => true,
        'message' => `Synced ${count($synced_services)} services`,
        'services' => $synced_services
    ]);
}

function handle_status_api($request) {
    global $wpdb;
    
    $services = $wpdb->get_var('SELECT COUNT(*) as count FROM services', ARRAY_AGGREGATE([['services', 'customers', 'jobs', 'invoices'], 'COUNT(*) as count FROM jobs', 'COUNT(*) as count FROM invoices'), 'COUNT(*) as count FROM customers'));
    
    wp_send_json([
        'connected' => true,
        'integration' => 'WordPress',
        'stats' => [
            'services' => $services['count'],
            'customers' => $customers['count'],
            'jobs' => $jobs['count'],
            'invoices' => $invoices['count']
        ],
        'features' => [
            'booking_integration' => true,
            'testimonial_sync' => true,
            'service_sync' => true,
            'real_time_updates' => true
        ]
    ]);
}

function handle_webhook_api($request) {
    $data = json_decode($request->get_body(), true);
    
    $action = $data['action'] ?? 'unknown';
    
    switch ($action) {
        case 'new_order':
            handle_woocommerce_order($data);
            break;
            
        case 'customer_created':
            handle_wordpress_customer($data);
            break;
            
        case 'service_updated':
            handle_service_update($data);
            break;
            
        default:
            wp_send_json(['error' => 'Unknown webhook action: ' . $action]);
    }
}

// Helper functions
function handle_woocommerce_order($order_data) {
    // Convert WooCommerce order to FieldOps booking
    $booking_data = [
        'name' => ($order_data['billing']['first_name'] ?? '') . ' ' . ($order_data['billing']['last_name'] ?? ''),
        'phone' => $order_data['billing']['phone'] ?? '',
        'email' => $order_data['billing']['email'] ?? '',
        'address' => ($order_data['billing']['address_1'] ?? '') . ', 
                     ($order_data['billing']['city'] ?? '') . ', 
                     ($order_data['billing']['state'] ?? '') . ' ' . 
                     ($order_data['billing']['postcode'] ?? ''),
        'service' => $order_data['line_items'][0]['name'] ?? 'General Cleaning',
        'date' => date('Y-m-d', strtotime($order_data['date_created'])),
        'time' => date('H:i', strtotime($order_data['date_created'])),
        'notes' => "WooCommerce Order #" . ($order_data['id'] ?? 'Unknown')
    ];
    
    // Call FieldOps API
    $fieldops_url = 'http://localhost:3000/api/wp/booking';
    
    $response = wp_remote_post($fieldops_url, array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type: application/json'
        ),
        'body' => json_encode($booking_data)
    ));
    
    $result = json_decode($response['body'], true);
    
    if ($result['success']) {
        // Create WordPress post
        $post_id = wp_insert_post([
            'post_title' => 'New Cleaning Service Request',
        'post_content' => "Thank you for choosing Stilt Heights! We'll contact you within 24 hours.",
        'post_status' => 'publish',
        'meta_input' => [
            'fieldops_booking_id' => $result['booking_id'],
            'fieldops_customer_id' => $result['customer_id']
        ],
        ]);
        
        wp_send_json([
            'success' => true,
            'message' => 'Booking created and WordPress post created',
            'booking_id' => $result['booking_id'],
            'post_id' => $post_id
        ]);
    } else {
        wp_send_json([
            'error' => $result['error'] || 'Failed to create booking'
        ]);
    }
}

function handle_wordpress_customer($customer_data) {
    // Create WordPress customer
    $user_data = [
        'user_login' => $customer_data['username'] ?? '',
        'user_email' => $customer_data['email'] ?? '',
        'user_pass' => $customer_data['password'] ?? '',
        'first_name' => $customer_data['first_name'] ?? '',
        'last_name' => $customer_data['last_name'] ?? '',
        'user_phone' => $customer_data['phone'] ?? '',
        'role' => 'customer'
    ];
    
    $user_id = wp_insert_user($user_data);
    
    if ($user_id) {
        // Create customer in FieldOps
        $customer_data = [
            'name' => ($customer_data['first_name'] ?? '') . ' ' . ($customer_data['last_name'] ?? ''),
            'phone' => $customer_data['phone'] ?? '',
            'email' => $customer_data['email'] ?? '',
            'address' => '',
            'notes' => 'WordPress customer'
        ];
        
        $customer_id = $wpdb->insert(
            "{$wpdb->prefix}customers",
            $customer_data
        );
        
        wp_send_json([
            'success' => true,
            'message' => 'Customer created in both systems',
            'wp_user_id' => $user_id,
            'fieldops_customer_id' => $customer_id
        ]);
    } else {
        wp_send_json(['error' => 'Failed to create customer']);
    }
}

function handle_service_update($service_data) {
    // Update service in FieldOps
    $wpdb->update(
        "{$wpdb->prefix}services",
        [
            'price' => $service_data['price'] ?? 80,
            'description' => $service_data['description'] ?? 'Service from WordPress'
        ],
        ['name' => $service_data['name']]
    );
    
    wp_send_json([
        'success' => true,
        'message' => 'Service updated in FieldOps'
    ]);
}

// Add admin menu items
function add_fieldops_admin_menu() {
    add_menu_page('fieldops-core', 'FieldOps Core', 'manage_fieldops', 'dashicon', 'dashicons-admin', 6);
    add_submenu_page('fieldops-core', 'fieldops-testimonials', 'Testimonials', 'dashicons-testimonials', 6);
    add_submenu_page('fieldops-core', 'fieldops-ceo-stories', 'CEO Stories', 'dashicons-ceo', 6);
    add_submenu_page('fieldops-core', 'fieldops-scheduling', 'Scheduling', 'dashicons-calendar', 6);
    add_submenu_page('fieldops-core', 'fieldops-settings', 'Settings', 'dashicons-settings', 6);
    add_submenu_page('fieldops-core', 'fieldops-sync', 'Sync Services', 'dashicons-sync', 6);
}

// Add CSS for admin interface
function add_fieldops_admin_styles() {
    wp_enqueue_style('fieldops-admin-styles', 'fieldops-admin-styles', 'fieldops-admin-styles-print');
}

// Add JavaScript for admin interface
function add_fieldops_admin_scripts() {
    wp_enqueue_script('fieldops-admin-scripts', 'fieldops-admin-scripts');
}

// Initialize plugin
function init_fieldops_core() {
    // Load admin styles and scripts
    add_fieldops_admin_styles();
    add_fieldops_admin_scripts();
    
    // Add admin menu
    add_fieldops_admin_menu();
    
    // Schedule sync cron job
    if (!wp_next_scheduled('fieldops_sync')) {
        wp_schedule_event(time(), 'daily', 'fieldops_sync_services');
    }
}

// Schedule sync services cron job
function fieldops_sync_services() {
    global $wpdb;
    
    // Get services from FieldOps
    $fieldops_url = 'http://localhost:3000/api/booking/services';
    
    $response = wp_remote_get($fieldops_url);
    $services = json_decode($response['body'], true);
    
    // Update WordPress services
    foreach ($services as $service) {
        $existing = $wpdb->get_row(
            "SELECT id FROM {$wpdb->prefix}services WHERE name = ?",
            [$service['name']]
        );
        
        if (!$existing) {
            // Create new service
            $service_id = $wpdb->insert(
                "{$wpdb->prefix}services",
                [
                    'name' => $service['name'],
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from FieldOps'
                ]
            );
        } else {
            // Update existing service
            $wpdb->update(
                "{$wpdb->prefix}services",
                [
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from FieldOps'
                ],
                ['name' => $service['name']]
            );
        }
    }
    
    // Update sync status
    $wpdb->update(
        "{$wpdb->prefix}fieldops_wp_sync",
        [
            'last_sync' => current_time('mysql'),
            'sync_status' => 'completed'
        ]
    );
}

// Create custom post types
function create_fieldops_post_types() {
    register_post_type('fieldops_testimonial', [
        'labels' => ['Title', 'Customer Name', 'Service', 'Rating', 'Content', 'Date', 'Approved'],
        'public' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'menu_icon' => 'dashicons-testimonials',
        'menu_position' => 6
    ]);
    
    register_post_type('fieldops_ceo_story', [
        'labels' => ['Title', 'Author', 'Content', 'Date', 'Featured'],
        'public' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'menu_icon' => 'dashicons-ceo',
        'menu_position' => 6
    ]);
    
    register_post_type('fieldops_scheduling', [
        'labels' => ['Title', 'Description', 'Date', 'Time', 'Location', 'Service'],
        'public' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'excerpt', 'custom-fields'],
        'menu_icon' => 'dashicons-calendar',
        'menu_position' => 6
    ]);
}

// Create custom fields
function create_fieldops_custom_fields() {
    // Add custom fields for testimonials
    register_field('fieldops_testimonial', [
        'customer_avatar' => [
            'name' => 'Customer Avatar',
            'type' => 'text',
            'description' => 'Customer avatar URL',
            'required' => false
        ],
        'before_photo_url' => [
            'name' => 'Before Photo URL',
            'type' => 'url',
            'description' => 'Before photo URL',
            'required' => false
        ],
        'after_photo_url' => [
            'name' => 'After Photo URL',
            'type' => 'url',
            'description' => 'After photo URL',
            'required' => false
        ]
    ]);
    
    // Add custom fields for CEO stories
    register_field('fieldops_ceo_story', [
        'story_image' => [
            'name' => 'Story Image URL',
            'type' => 'url',
            'description' => 'Story image URL',
            'required' => false
        ],
        'story_video' => [
            'name' => 'Story Video URL',
            'type' => 'url',
            'description' => 'Story video URL',
            'required' => false
        ]
    ]);
    
    // Add custom fields for scheduling
    register_field('fieldops_scheduling', [
        'booking_form_url' => [
            'name' => 'Booking Form URL',
            'type' => 'url',
            'description' => 'Custom booking form URL',
            'required' => false
        ],
        'calendar_embed' => [
            'name' => 'Calendar Embed Code',
            'type' => 'textarea',
            'description' => 'Calendar embed code',
            'required' => false
        ]
    ]);
}

// Create custom meta boxes
function create_fieldops_meta_boxes() {
    add_meta_box('fieldops_testimonial', [
        'title' => 'Customer Information',
        'fields' => ['customer_name', 'service_name', 'rating', 'approved'],
        'context' => 'side'
    ]);
    
    add_meta_box('fieldops_ceo_story', [
        'title' => 'Story Information',
        'fields' => ['title', 'author', 'date', 'featured'],
        'context' => 'side'
    ]);
}

// REST API registration
function register_fieldops_api() {
    register_rest_route('fieldops/testimonials', [
        'methods' => ['GET'],
        'accepts' => ['application/json'],
        'callback' => 'handle_testimonials_api'
    ]);
    
    register_rest_route('fieldops/ceo-stories', [
        'methods' => ['GET'],
        'accepts' => ['application/json'],
        'callback' => 'handle_ceo_stories_api'
    ]);
    
    register_rest_route('fieldops/booking', [
        'methods' => ['POST'],
        'accepts' => ['application/json'],
        'callback' => 'handle_booking_api'
    ]);
    
    register_rest_route('fieldops/sync', [
        'methods' => ['POST'],
        'accepts' => ['application/json'],
        'callback' => 'handle_sync_api'
    ]);
    
    register_rest_route('fieldops/status', [
        'methods' => ['GET'],
        'accepts' => ['application/json'],
        'callback' => 'handle_status_api'
    ]);
    
    register_rest_route('fieldops/webhook', [
        'methods' => ['POST'],
        'accepts' => ['application/json'],
        'callback' => 'handle_webhook_api'
    ]);
}

// Initialize the plugin
add_action('init', 'init_fieldops_core');

// Schedule sync services cron job
function fieldops_sync_services() {
    global $wpdb;
    
    // Get services from FieldOps
    $fieldops_url = 'http://localhost:3000/api/booking/services';
    
    $response = wp_remote_get($fieldops_url);
    $services = json_decode($response['body'], true);
    
    // Update WordPress services
    foreach ($services as $service) {
        $existing = $wpdb->get_row(
            "SELECT id FROM {$wpdb->prefix}services WHERE name = ?",
            [$service['name']]
        );
        
        if (!$existing) {
            // Create new service
            $service_id = $wpdb->insert(
                "{$wpdb->prefix}services",
                [
                    'name' => $service['name'],
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from FieldOps'
                ]
            );
        } else {
            // Update existing service
            $wpdb->update(
                "{$wpdb->prefix}services",
                [
                    'price' => $service['price'] ?? 80,
                    'description' => $service['description'] || 'Service from WordPress'
                ],
                ['name' => $service['name']]
            );
        }
    }
    
    // Update sync status
    $wpdb->update(
        "{$wpdb->prefix}fieldops_wp_sync",
        [
            'last_sync' => current_time('mysql'),
            'sync_status' => 'completed'
        ]
    );
}

// Export functions for external use
function get_fieldops_booking_url() {
    return 'http://localhost:3000/api/booking';
}

function get_fieldops_services_url() {
    return 'http://localhost:3000/api/booking/services';
}

function get_fieldops_testimonials_url() {
    return 'http://localhost:3000/api/wp/testimonials';
}

function get_fieldops_ceo_stories_url() {
    return 'http://localhost:3000/api/wp/ceo-stories';
}

function get_fieldops_status_url() {
    return 'http://localhost:3000/api/wp/status';
}

module.exports = {
    get_fieldops_booking_url,
    get_fieldops_services_url,
    get_fieldops_testimonials_url,
    get_fieldops_ceo_stories_url,
    get_fieldops_status_url
};
