<?php
/**
 * Plugin Name: FieldOps Core Integration
 * Plugin URI: https://fieldops-core.com
 * Description: Integrates Stilt Heights WordPress site with FieldOps Core operations system
 * Version: 1.0.0
 * Author: FieldOps Core Team
 * License: GPL v2 or later
 * Text Domain: fieldops-core
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit('This file cannot be accessed directly.');
}

// Plugin constants
define('FIELDOPS_CORE_VERSION', '1.0.0');
define('FIELDOPS_CORE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FIELDOPS_CORE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('FIELDOPS_CORE_API_URL', 'http://localhost:3000/api');

// Include required files
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/database-setup.php';
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/api-handlers.php';
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/admin-interface.php';
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/shortcodes.php';
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/widgets.php';
require_once FIELDOPS_CORE_PLUGIN_DIR . 'includes/cron-jobs.php';

// Plugin activation
register_activation_hook(__FILE__, 'fieldops_core_activate');

function fieldops_core_activate() {
    // Create database tables
    fieldops_create_tables();
    
    // Set default options
    fieldops_set_default_options();
    
    // Flush rewrite rules
    flush_rewrite_rules();
    
    // Schedule cron jobs
    fieldops_schedule_cron_jobs();
}

// Plugin deactivation
register_deactivation_hook(__FILE__, 'fieldops_core_deactivate');

function fieldops_core_deactivate() {
    // Clear scheduled cron jobs
    wp_clear_scheduled_hook('fieldops_sync_services');
    wp_clear_scheduled_hook('fieldops_sync_testimonials');
    wp_clear_scheduled_hook('fieldops_sync_ceo_stories');
    
    // Flush rewrite rules
    flush_rewrite_rules();
}

// Initialize plugin
add_action('plugins_loaded', 'fieldops_core_init');

function fieldops_core_init() {
    // Load text domain
    load_plugin_textdomain('fieldops-core', false, dirname(plugin_basename(__FILE__)) . '/languages');
    
    // Register post types
    fieldops_register_post_types();
    
    // Register taxonomies
    fieldops_register_taxonomies();
    
    // Register shortcodes
    fieldops_register_shortcodes();
    
    // Register widgets
    fieldops_register_widgets();
    
    // Register REST API endpoints
    fieldops_register_api_endpoints();
    
    // Add admin menu
    add_action('admin_menu', 'fieldops_admin_menu');
    
    // Enqueue scripts and styles
    add_action('wp_enqueue_scripts', 'fieldops_enqueue_scripts');
    add_action('admin_enqueue_scripts', 'fieldops_admin_enqueue_scripts');
}

// Register custom post types
function fieldops_register_post_types() {
    // Testimonials post type
    register_post_type('fieldops_testimonial', array(
        'labels' => array(
            'name' => __('Testimonials', 'fieldops-core'),
            'singular_name' => __('Testimonial', 'fieldops-core'),
            'menu_name' => __('Testimonials', 'fieldops-core'),
            'name_admin_bar' => __('Testimonial', 'fieldops-core'),
            'add_new' => __('Add New', 'fieldops-core'),
            'add_new_item' => __('Add New Testimonial', 'fieldops-core'),
            'new_item' => __('New Testimonial', 'fieldops-core'),
            'edit_item' => __('Edit Testimonial', 'fieldops-core'),
            'view_item' => __('View Testimonial', 'fieldops-core'),
            'all_items' => __('All Testimonials', 'fieldops-core'),
            'search_items' => __('Search Testimonials', 'fieldops-core'),
            'parent_item_colon' => __('Parent Testimonial:', 'fieldops-core'),
            'not_found' => __('No testimonials found.', 'fieldops-core'),
            'not_found_in_trash' => __('No testimonials found in Trash.', 'fieldops-core'),
            'featured_image' => __('Customer Photo', 'fieldops-core'),
            'set_featured_image' => __('Set customer photo', 'fieldops-core'),
            'remove_featured_image' => __('Remove customer photo', 'fieldops-core'),
            'use_featured_image' => __('Use as customer photo', 'fieldops-core'),
        ),
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_admin_bar' => true,
        'show_in_rest' => true,
        'capability_type' => 'post',
        'hierarchical' => false,
        'has_archive' => true,
        'rewrite' => array('slug' => 'testimonials'),
        'query_var' => true,
        'menu_icon' => 'dashicons-testimonial',
        'menu_position' => 25,
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'),
    ));
    
    // CEO Stories post type
    register_post_type('fieldops_ceo_story', array(
        'labels' => array(
            'name' => __('CEO Stories', 'fieldops-core'),
            'singular_name' => __('CEO Story', 'fieldops-core'),
            'menu_name' => __('CEO Stories', 'fieldops-core'),
            'name_admin_bar' => __('CEO Story', 'fieldops-core'),
            'add_new' => __('Add New', 'fieldops-core'),
            'add_new_item' => __('Add New Story', 'fieldops-core'),
            'new_item' => __('New Story', 'fieldops-core'),
            'edit_item' => __('Edit Story', 'fieldops-core'),
            'view_item' => __('View Story', 'fieldops-core'),
            'all_items' => __('All Stories', 'fieldops-core'),
            'search_items' => __('Search Stories', 'fieldops-core'),
            'parent_item_colon' => __('Parent Story:', 'fieldops-core'),
            'not_found' => __('No stories found.', 'fieldops-core'),
            'not_found_in_trash' => __('No stories found in Trash.', 'fieldops-core'),
            'featured_image' => __('Story Image', 'fieldops-core'),
            'set_featured_image' => __('Set story image', 'fieldops-core'),
            'remove_featured_image' => __('Remove story image', 'fieldops-core'),
            'use_featured_image' => __('Use as story image', 'fieldops-core'),
        ),
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_admin_bar' => true,
        'show_in_rest' => true,
        'capability_type' => 'post',
        'hierarchical' => false,
        'has_archive' => true,
        'rewrite' => array('slug' => 'ceo-stories'),
        'query_var' => true,
        'menu_icon' => 'dashicons-businessperson',
        'menu_position' => 26,
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'),
    ));
    
    // Scheduling post type
    register_post_type('fieldops_scheduling', array(
        'labels' => array(
            'name' => __('Scheduling', 'fieldops-core'),
            'singular_name' => __('Schedule', 'fieldops-core'),
            'menu_name' => __('Scheduling', 'fieldops-core'),
            'name_admin_bar' => __('Schedule', 'fieldops-core'),
            'add_new' => __('Add New', 'fieldops-core'),
            'add_new_item' => __('Add New Schedule', 'fieldops-core'),
            'new_item' => __('New Schedule', 'fieldops-core'),
            'edit_item' => __('Edit Schedule', 'fieldops-core'),
            'view_item' => __('View Schedule', 'fieldops-core'),
            'all_items' => __('All Schedules', 'fieldops-core'),
            'search_items' => __('Search Schedules', 'fieldops-core'),
            'parent_item_colon' => __('Parent Schedule:', 'fieldops-core'),
            'not_found' => __('No schedules found.', 'fieldops-core'),
            'not_found_in_trash' => __('No schedules found in Trash.', 'fieldops-core'),
        ),
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_admin_bar' => true,
        'show_in_rest' => true,
        'capability_type' => 'post',
        'hierarchical' => false,
        'has_archive' => true,
        'rewrite' => array('slug' => 'scheduling'),
        'query_var' => true,
        'menu_icon' => 'dashicons-calendar-alt',
        'menu_position' => 27,
        'supports' => array('title', 'editor', 'custom-fields'),
    ));
}

// Register taxonomies
function fieldops_register_taxonomies() {
    // Service taxonomy
    register_taxonomy('fieldops_service', array('fieldops_testimonial', 'fieldops_scheduling'), array(
        'labels' => array(
            'name' => __('Services', 'fieldops-core'),
            'singular_name' => __('Service', 'fieldops-core'),
            'menu_name' => __('Services', 'fieldops-core'),
            'all_items' => __('All Services', 'fieldops-core'),
            'edit_item' => __('Edit Service', 'fieldops-core'),
            'view_item' => __('View Service', 'fieldops-core'),
            'update_item' => __('Update Service', 'fieldops-core'),
            'add_new_item' => __('Add New Service', 'fieldops-core'),
            'new_item_name' => __('New Service Name', 'fieldops-core'),
            'parent_item' => __('Parent Service', 'fieldops-core'),
            'parent_item_colon' => __('Parent Service:', 'fieldops-core'),
            'search_items' => __('Search Services', 'fieldops-core'),
            'popular_items' => __('Popular Services', 'fieldops-core'),
            'separate_items_with_commas' => __('Separate services with commas', 'fieldops-core'),
            'add_or_remove_items' => __('Add or remove services', 'fieldops-core'),
            'choose_from_most_used' => __('Choose from the most used services', 'fieldops-core'),
            'not_found' => __('No services found.', 'fieldops-core'),
        ),
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'service'),
    ));
    
    // Rating taxonomy
    register_taxonomy('fieldops_rating', array('fieldops_testimonial'), array(
        'labels' => array(
            'name' => __('Ratings', 'fieldops-core'),
            'singular_name' => __('Rating', 'fieldops-core'),
            'menu_name' => __('Ratings', 'fieldops-core'),
            'all_items' => __('All Ratings', 'fieldops-core'),
            'edit_item' => __('Edit Rating', 'fieldops-core'),
            'view_item' => __('View Rating', 'fieldops-core'),
            'update_item' => __('Update Rating', 'fieldops-core'),
            'add_new_item' => __('Add New Rating', 'fieldops-core'),
            'new_item_name' => __('New Rating Name', 'fieldops-core'),
            'parent_item' => __('Parent Rating', 'fieldops-core'),
            'parent_item_colon' => __('Parent Rating:', 'fieldops-core'),
            'search_items' => __('Search Ratings', 'fieldops-core'),
            'popular_items' => __('Popular Ratings', 'fieldops-core'),
            'separate_items_with_commas' => __('Separate ratings with commas', 'fieldops-core'),
            'add_or_remove_items' => __('Add or remove ratings', 'fieldops-core'),
            'choose_from_most_used' => __('Choose from the most used ratings', 'fieldops-core'),
            'not_found' => __('No ratings found.', 'fieldops-core'),
        ),
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'rating'),
    ));
}

// Add admin menu
function fieldops_admin_menu() {
    add_menu_page(
        __('FieldOps Core', 'fieldops-core'),
        __('FieldOps Core', 'fieldops-core'),
        'manage_options',
        'fieldops-core',
        'fieldops_admin_dashboard',
        'dashicons-admin-generic',
        6
    );
    
    add_submenu_page(
        'fieldops-core',
        __('Dashboard', 'fieldops-core'),
        __('Dashboard', 'fieldops-core'),
        'manage_options',
        'fieldops-core',
        'fieldops_admin_dashboard'
    );
    
    add_submenu_page(
        'fieldops-core',
        __('Settings', 'fieldops-core'),
        __('Settings', 'fieldops-core'),
        'manage_options',
        'fieldops-settings',
        'fieldops_admin_settings'
    );
    
    add_submenu_page(
        'fieldops-core',
        __('Sync', 'fieldops-core'),
        __('Sync Services', 'fieldops-core'),
        'manage_options',
        'fieldops-sync',
        'fieldops_admin_sync'
    );
    
    add_submenu_page(
        'fieldops-core',
        __('Status', 'fieldops-core'),
        __('Integration Status', 'fieldops-core'),
        'manage_options',
        'fieldops-status',
        'fieldops_admin_status'
    );
}

// Enqueue scripts and styles
function fieldops_enqueue_scripts() {
    wp_enqueue_style(
        'fieldops-core-frontend',
        FIELDOPS_CORE_PLUGIN_URL . 'assets/css/frontend.css',
        array(),
        FIELDOPS_CORE_VERSION
    );
    
    wp_enqueue_script(
        'fieldops-core-frontend',
        FIELDOPS_CORE_PLUGIN_URL . 'assets/js/frontend.js',
        array('jquery'),
        FIELDOPS_CORE_VERSION,
        true
    );
    
    // Localize script
    wp_localize_script('fieldops-core-frontend', 'fieldops_core', array(
        'api_url' => FIELDOPS_CORE_API_URL,
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('fieldops_core_nonce'),
        'strings' => array(
            'loading' => __('Loading...', 'fieldops-core'),
            'error' => __('Error occurred', 'fieldops-core'),
            'success' => __('Success!', 'fieldops-core'),
            'booking_sent' => __('Booking request sent successfully!', 'fieldops-core'),
            'booking_error' => __('Failed to send booking request', 'fieldops-core'),
        )
    ));
}

function fieldops_admin_enqueue_scripts($hook) {
    if (strpos($hook, 'fieldops-') !== false) {
        wp_enqueue_style(
            'fieldops-core-admin',
            FIELDOPS_CORE_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            FIELDOPS_CORE_VERSION
        );
        
        wp_enqueue_script(
            'fieldops-core-admin',
            FIELDOPS_CORE_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery', 'wp-color-picker'),
            FIELDOPS_CORE_VERSION,
            true
        );
        
        // Localize script
        wp_localize_script('fieldops-core-admin', 'fieldops_core_admin', array(
            'api_url' => FIELDOPS_CORE_API_URL,
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('fieldops_core_admin_nonce'),
            'strings' => array(
                'confirm_sync' => __('Are you sure you want to sync services?', 'fieldops-core'),
                'sync_success' => __('Services synced successfully!', 'fieldops-core'),
                'sync_error' => __('Failed to sync services', 'fieldops-core'),
                'confirm_delete' => __('Are you sure you want to delete this?', 'fieldops-core'),
            )
        ));
    }
}

// Add custom meta boxes
function fieldops_add_meta_boxes() {
    // Testimonial meta boxes
    add_meta_box(
        'fieldops_testimonial_details',
        __('Customer Details', 'fieldops-core'),
        'fieldops_testimonial_meta_box',
        'fieldops_testimonial',
        'side',
        'default'
    );
    
    add_meta_box(
        'fieldops_testimonial_rating',
        __('Rating', 'fieldops-core'),
        'fieldops_testimonial_rating_meta_box',
        'fieldops_testimonial',
        'side',
        'default'
    );
    
    // CEO Story meta boxes
    add_meta_box(
        'fieldops_ceo_story_details',
        __('Story Details', 'fieldops-core'),
        'fieldops_ceo_story_meta_box',
        'fieldops_ceo_story',
        'side',
        'default'
    );
    
    // Scheduling meta boxes
    add_meta_box(
        'fieldops_scheduling_details',
        __('Schedule Details', 'fieldops-core'),
        'fieldops_scheduling_meta_box',
        'fieldops_scheduling',
        'normal',
        'default'
    );
}

// Meta box callbacks
function fieldops_testimonial_meta_box($post) {
    wp_nonce_field('fieldops_testimonial_meta_box', 'fieldops_testimonial_meta_box_nonce');
    
    $customer_name = get_post_meta($post->ID, '_customer_name', true);
    $customer_email = get_post_meta($post->ID, '_customer_email', true);
    $customer_phone = get_post_meta($post->ID, '_customer_phone', true);
    $customer_address = get_post_meta($post->ID, '_customer_address', true);
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="customer_name">' . __('Customer Name:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="customer_name" name="customer_name" value="' . esc_attr($customer_name) . '" size="25" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="customer_email">' . __('Customer Email:', 'fieldops-core') . '</label>';
    echo '<input type="email" id="customer_email" name="customer_email" value="' . esc_attr($customer_email) . '" size="25" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="customer_phone">' . __('Customer Phone:', 'fieldops-core') . '</label>';
    echo '<input type="tel" id="customer_phone" name="customer_phone" value="' . esc_attr($customer_phone) . '" size="25" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="customer_address">' . __('Customer Address:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="customer_address" name="customer_address" value="' . esc_attr($customer_address) . '" size="25" />';
    echo '</div>';
}

function fieldops_testimonial_rating_meta_box($post) {
    $rating = get_post_meta($post->ID, '_rating', true);
    $rating = $rating ? $rating : 5;
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="rating">' . __('Rating:', 'fieldops-core') . '</label>';
    echo '<select id="rating" name="rating">';
    for ($i = 1; $i <= 5; $i++) {
        echo '<option value="' . $i . '" ' . selected($rating, $i, false) . '>' . $i . ' ' . _n('Star', 'Stars', $i, 'fieldops-core') . '</option>';
    }
    echo '</select>';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="approved">' . __('Approved:', 'fieldops-core') . '</label>';
    echo '<input type="checkbox" id="approved" name="approved" value="1" ' . checked(get_post_meta($post->ID, '_approved', true), 1, false) . ' />';
    echo '</div>';
}

function fieldops_ceo_story_meta_box($post) {
    wp_nonce_field('fieldops_ceo_story_meta_box', 'fieldops_ceo_story_meta_box_nonce');
    
    $author = get_post_meta($post->ID, '_author', true);
    $date = get_post_meta($post->ID, '_story_date', true);
    $featured = get_post_meta($post->ID, '_featured', true);
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="author">' . __('Author:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="author" name="author" value="' . esc_attr($author) . '" size="25" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="story_date">' . __('Story Date:', 'fieldops-core') . '</label>';
    echo '<input type="date" id="story_date" name="story_date" value="' . esc_attr($date) . '" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="featured">' . __('Featured:', 'fieldops-core') . '</label>';
    echo '<input type="checkbox" id="featured" name="featured" value="1" ' . checked($featured, 1, false) . ' />';
    echo '</div>';
}

function fieldops_scheduling_meta_box($post) {
    wp_nonce_field('fieldops_scheduling_meta_box', 'fieldops_scheduling_meta_box_nonce');
    
    $service = get_post_meta($post->ID, '_service', true);
    $date = get_post_meta($post->ID, '_schedule_date', true);
    $time = get_post_meta($post->ID, '_schedule_time', true);
    $location = get_post_meta($post->ID, '_location', true);
    $duration = get_post_meta($post->ID, '_duration', true);
    $price = get_post_meta($post->ID, '_price', true);
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="service">' . __('Service:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="service" name="service" value="' . esc_attr($service) . '" size="50" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="schedule_date">' . __('Date:', 'fieldops-core') . '</label>';
    echo '<input type="date" id="schedule_date" name="schedule_date" value="' . esc_attr($date) . '" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="schedule_time">' . __('Time:', 'fieldops-core') . '</label>';
    echo '<input type="time" id="schedule_time" name="schedule_time" value="' . esc_attr($time) . '" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="location">' . __('Location:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="location" name="location" value="' . esc_attr($location) . '" size="50" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="duration">' . __('Duration:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="duration" name="duration" value="' . esc_attr($duration) . '" size="25" />';
    echo '</div>';
    
    echo '<div class="fieldops-meta-field">';
    echo '<label for="price">' . __('Price:', 'fieldops-core') . '</label>';
    echo '<input type="text" id="price" name="price" value="' . esc_attr($price) . '" size="25" />';
    echo '</div>';
}

// Save post meta
function fieldops_save_post_meta($post_id, $post, $update) {
    if (!current_user_can('edit_post', $post_id)) {
        return $post_id;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return $post_id;
    }
    
    // Save testimonial meta
    if ($post->post_type === 'fieldops_testimonial') {
        if (!isset($_POST['fieldops_testimonial_meta_box_nonce']) || !wp_verify_nonce($_POST['fieldops_testimonial_meta_box_nonce'], 'fieldops_testimonial_meta_box')) {
            return $post_id;
        }
        
        update_post_meta($post_id, '_customer_name', sanitize_text_field($_POST['customer_name']));
        update_post_meta($post_id, '_customer_email', sanitize_email($_POST['customer_email']));
        update_post_meta($post_id, '_customer_phone', sanitize_text_field($_POST['customer_phone']));
        update_post_meta($post_id, '_customer_address', sanitize_text_field($_POST['customer_address']));
        update_post_meta($post_id, '_rating', intval($_POST['rating']));
        update_post_meta($post_id, '_approved', isset($_POST['approved']) ? 1 : 0);
    }
    
    // Save CEO story meta
    if ($post->post_type === 'fieldops_ceo_story') {
        if (!isset($_POST['fieldops_ceo_story_meta_box_nonce']) || !wp_verify_nonce($_POST['fieldops_ceo_story_meta_box_nonce'], 'fieldops_ceo_story_meta_box')) {
            return $post_id;
        }
        
        update_post_meta($post_id, '_author', sanitize_text_field($_POST['author']));
        update_post_meta($post_id, '_story_date', sanitize_text_field($_POST['story_date']));
        update_post_meta($post_id, '_featured', isset($_POST['featured']) ? 1 : 0);
    }
    
    // Save scheduling meta
    if ($post->post_type === 'fieldops_scheduling') {
        if (!isset($_POST['fieldops_scheduling_meta_box_nonce']) || !wp_verify_nonce($_POST['fieldops_scheduling_meta_box_nonce'], 'fieldops_scheduling_meta_box')) {
            return $post_id;
        }
        
        update_post_meta($post_id, '_service', sanitize_text_field($_POST['service']));
        update_post_meta($post_id, '_schedule_date', sanitize_text_field($_POST['schedule_date']));
        update_post_meta($post_id, '_schedule_time', sanitize_text_field($_POST['schedule_time']));
        update_post_meta($post_id, '_location', sanitize_text_field($_POST['location']));
        update_post_meta($post_id, '_duration', sanitize_text_field($_POST['duration']));
        update_post_meta($post_id, '_price', sanitize_text_field($_POST['price']));
    }
    
    return $post_id;
}

// Hook meta boxes and save functions
add_action('add_meta_boxes', 'fieldops_add_meta_boxes');
add_action('save_post', 'fieldops_save_post_meta', 10, 3);

// Add plugin action links
function fieldops_plugin_action_links($links) {
    $links[] = '<a href="' . admin_url('admin.php?page=fieldops-settings') . '">' . __('Settings', 'fieldops-core') . '</a>';
    $links[] = '<a href="' . admin_url('admin.php?page=fieldops-status') . '">' . __('Status', 'fieldops-core') . '</a>';
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'fieldops_plugin_action_links');

// Add row actions for custom post types
function fieldops_post_row_actions($actions, $post) {
    if ($post->post_type === 'fieldops_testimonial') {
        $actions['sync_to_fieldops'] = '<a href="' . admin_url('admin-ajax.php?action=fieldops_sync_testimonial&post_id=' . $post->ID . '&nonce=' . wp_create_nonce('fieldops_sync_testimonial')) . '">' . __('Sync to FieldOps', 'fieldops-core') . '</a>';
    }
    
    if ($post->post_type === 'fieldops_ceo_story') {
        $actions['sync_to_fieldops'] = '<a href="' . admin_url('admin-ajax.php?action=fieldops_sync_ceo_story&post_id=' . $post->ID . '&nonce=' . wp_create_nonce('fieldops_sync_ceo_story')) . '">' . __('Sync to FieldOps', 'fieldops-core') . '</a>';
    }
    
    return $actions;
}
add_filter('post_row_actions', 'fieldops_post_row_actions', 10, 2);

// AJAX handlers
add_action('wp_ajax_fieldops_sync_testimonial', 'fieldops_ajax_sync_testimonial');
add_action('wp_ajax_fieldops_sync_ceo_story', 'fieldops_ajax_sync_ceo_story');
add_action('wp_ajax_fieldops_booking_form', 'fieldops_ajax_booking_form');
add_action('wp_ajax_fieldops_get_services', 'fieldops_ajax_get_services');
add_action('wp_ajax_fieldops_get_testimonials', 'fieldops_ajax_get_testimonials');
add_action('wp_ajax_fieldops_get_ceo_stories', 'fieldops_ajax_get_ceo_stories');

// AJAX callback functions
function fieldops_ajax_sync_testimonial() {
    check_ajax_referer('fieldops_sync_testimonial', 'nonce');
    
    $post_id = intval($_POST['post_id']);
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'fieldops_testimonial') {
        wp_send_json_error('Invalid testimonial');
    }
    
    $testimonial_data = array(
        'customer_name' => get_post_meta($post_id, '_customer_name', true),
        'service_name' => get_the_terms($post_id, 'fieldops_service')[0]->name ?? 'General Cleaning',
        'rating' => get_post_meta($post_id, '_rating', true),
        'content' => $post->post_content,
        'date' => get_post_meta($post_id, '_story_date', true) ?: get_the_date('Y-m-d', $post_id),
        'approved' => get_post_meta($post_id, '_approved', true),
        'avatar' => get_the_post_thumbnail_url($post_id, 'thumbnail') ?: '👤'
    );
    
    // Send to FieldOps API
    $response = wp_remote_post(FIELDOPS_CORE_API_URL . '/wp/testimonials', array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type: application/json'
        ),
        'body' => json_encode($testimonial_data)
    ));
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($result['success']) {
        update_post_meta($post_id, '_fieldops_synced', 1);
        update_post_meta($post_id, '_fieldops_sync_date', current_time('mysql'));
        wp_send_json_success('Testimonial synced successfully!');
    } else {
        wp_send_json_error($result['error'] ?? 'Failed to sync testimonial');
    }
}

function fieldops_ajax_sync_ceo_story() {
    check_ajax_referer('fieldops_sync_ceo_story', 'nonce');
    
    $post_id = intval($_POST['post_id']);
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'fieldops_ceo_story') {
        wp_send_json_error('Invalid CEO story');
    }
    
    $story_data = array(
        'title' => $post->post_title,
        'author' => get_post_meta($post_id, '_author', true),
        'content' => $post->post_content,
        'date' => get_post_meta($post_id, '_story_date', true) ?: get_the_date('Y-m-d', $post_id),
        'featured' => get_post_meta($post_id, '_featured', true),
        'image' => get_the_post_thumbnail_url($post_id, 'large') ?: ''
    );
    
    // Send to FieldOps API
    $response = wp_remote_post(FIELDOPS_CORE_API_URL . '/wp/ceo-stories', array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type: application/json'
        ),
        'body' => json_encode($story_data)
    ));
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($result['success']) {
        update_post_meta($post_id, '_fieldops_synced', 1);
        update_post_meta($post_id, '_fieldops_sync_date', current_time('mysql'));
        wp_send_json_success('CEO story synced successfully!');
    } else {
        wp_send_json_error($result['error'] ?? 'Failed to sync CEO story');
    }
}

function fieldops_ajax_booking_form() {
    check_ajax_referer('fieldops_core_nonce', 'nonce');
    
    $booking_data = array(
        'name' => sanitize_text_field($_POST['name']),
        'phone' => sanitize_text_field($_POST['phone']),
        'email' => sanitize_email($_POST['email']),
        'address' => sanitize_text_field($_POST['address']),
        'service' => sanitize_text_field($_POST['service']),
        'date' => sanitize_text_field($_POST['date']),
        'time' => sanitize_text_field($_POST['time']),
        'notes' => sanitize_textarea_field($_POST['notes']),
        'source' => 'WordPress Website'
    );
    
    // Send to FieldOps API
    $response = wp_remote_post(FIELDOPS_CORE_API_URL . '/wp/booking', array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type: application/json'
        ),
        'body' => json_encode($booking_data)
    ));
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($result['success']) {
        wp_send_json_success(array(
            'message' => 'Booking created successfully!',
            'booking_id' => $result['booking_id'],
            'customer_id' => $result['customer_id']
        ));
    } else {
        wp_send_json_error($result['error'] ?? 'Failed to create booking');
    }
}

function fieldops_ajax_get_services() {
    check_ajax_referer('fieldops_core_nonce', 'nonce');
    
    $response = wp_remote_get(FIELDOPS_CORE_API_URL . '/booking/services');
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $services = json_decode(wp_remote_retrieve_body($response), true);
    wp_send_json_success($services);
}

function fieldops_ajax_get_testimonials() {
    check_ajax_referer('fieldops_core_nonce', 'nonce');
    
    $response = wp_remote_get(FIELDOPS_CORE_API_URL . '/wp/testimonials');
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $testimonials = json_decode(wp_remote_retrieve_body($response), true);
    wp_send_json_success($testimonials);
}

function fieldops_ajax_get_ceo_stories() {
    check_ajax_referer('fieldops_core_nonce', 'nonce');
    
    $response = wp_remote_get(FIELDOPS_CORE_API_URL . '/wp/ceo-stories');
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $stories = json_decode(wp_remote_retrieve_body($response), true);
    wp_send_json_success($stories);
}

?>
