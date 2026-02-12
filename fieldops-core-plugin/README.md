# FieldOps Core WordPress Plugin Installation Guide

## 🎯 Overview

This guide will help you install and configure the FieldOps Core WordPress plugin for Stilt Heights. The plugin integrates your WordPress website with the FieldOps Core operations system, providing seamless booking management, testimonials, CEO stories, and real-time updates.

## 📋 Prerequisites

- WordPress 5.0 or higher
- PHP 7.4 or higher
- FieldOps Core backend running on `http://localhost:3000`
- Admin access to WordPress dashboard
- FTP access or cPanel file manager

## 🚀 Installation Steps

### Step 1: Download Plugin Files

1. Download the FieldOps Core plugin files from the `backend/wordpress/` directory
2. Create a zip file containing all plugin files:
   - `fieldops-core-plugin.php` (main plugin file)
   - `shortcodes.php` (shortcode definitions)
   - `assets/css/fieldops-core.css` (styles)
   - `assets/js/fieldops-core.js` (JavaScript)

### Step 2: Upload to WordPress

**Option A: WordPress Admin Dashboard**
1. Log in to your WordPress admin panel
2. Go to **Plugins → Add New**
3. Click **Upload Plugin**
4. Choose the plugin zip file
5. Click **Install Now**
6. Click **Activate Plugin**

**Option B: FTP/cPanel**
1. Extract the plugin files
2. Upload to `/wp-content/plugins/fieldops-core/`
3. Go to WordPress admin → Plugins
4. Find "FieldOps Core Integration" and click **Activate**

### Step 3: Configure Plugin Settings

1. Go to **FieldOps Core → Settings**
2. Configure the following settings:

#### **API Configuration**
- **FieldOps API URL**: `http://localhost:3000/api`
- **API Timeout**: 30 seconds
- **Enable Real-time Updates**: Check this box

#### **Business Information**
- **Company Name**: Stilt Heights
- **Phone**: 825-994-6606
- **Email**: dgtalquantumleap@gmail.com
- **Address**: Metropolitan Area

#### **Booking Settings**
- **Auto-respond**: Enable email confirmations
- **Default Service**: Regular Housekeeping
- **Booking Hours**: 8AM-6PM

### Step 4: Test Integration

1. Go to **FieldOps Core → Status**
2. Verify all connections are green
3. Test the booking form
4. Check testimonials display
5. Verify CEO stories

## 📝 Using Shortcodes

### Booking Form
```php
[fieldops_booking_form title="Book Your Cleaning Service" show_services="true" show_date_time="true"]
```

**Parameters:**
- `title`: Form title
- `show_services`: Show service selection (true/false)
- `show_date_time`: Show date/time fields (true/false)
- `show_notes`: Show notes field (true/false)
- `button_text`: Submit button text
- `redirect_url`: URL to redirect after submission

### Testimonials
```php
[fieldops_testimonials limit="6" layout="grid" columns="3" show_rating="true"]
```

**Parameters:**
- `limit`: Number of testimonials to show
- `layout`: grid, carousel, or list
- `columns`: Number of columns (for grid layout)
- `show_avatar`: Show customer avatars (true/false)
- `show_rating`: Show star ratings (true/false)
- `show_service`: Show service type (true/false)
- `show_date`: Show testimonial date (true/false)

### CEO Stories
```php
[fieldops_ceo_stories limit="4" layout="timeline" featured_only="true"]
```

**Parameters:**
- `limit`: Number of stories to show
- `layout`: timeline, grid, or list
- `featured_only`: Show only featured stories (true/false)
- `show_image`: Show story images (true/false)
- `show_date`: Show story date (true/false)
- `order`: asc or desc

### Services
```php
[fieldops_services show_price="true" show_description="true" layout="grid" columns="3"]
```

**Parameters:**
- `show_price`: Show service prices (true/false)
- `show_description`: Show service descriptions (true/false)
- `layout`: grid or list
- `columns`: Number of columns (for grid layout)
- `button_text`: Book button text

### Quick Quote
```php
[fieldops_quick_quote title="Get a Quick Quote" show_service="true" show_message="true"]
```

**Parameters:**
- `title`: Form title
- `button_text`: Submit button text
- `show_service`: Show service selection (true/false)
- `show_message`: Show message field (true/false)

### Contact Information
```php
[fieldops_contact_info show_phone="true" show_email="true" show_address="true" show_hours="true"]
```

**Parameters:**
- `show_phone`: Show phone number (true/false)
- `show_email`: Show email address (true/false)
- `show_address`: Show service area (true/false)
- `show_hours`: Show business hours (true/false)
- `phone`: Custom phone number
- `email`: Custom email address
- `address`: Custom address
- `hours`: Custom business hours

## 🎨 Customization

### CSS Customization

Add custom CSS to your theme's `style.css`:

```css
/* Custom FieldOps Core styles */
.fieldops-booking-form {
    background: #your-color;
    border-radius: 12px;
}

.fieldops-testimonial-card {
    border-left: 4px solid #your-brand-color;
}

.fieldops-btn-primary {
    background: #your-brand-color;
}
```

### JavaScript Customization

Add custom JavaScript to your theme's `functions.js`:

```javascript
jQuery(document).on('fieldops:booking:success', function(event, data) {
    // Custom booking success logic
    console.log('Booking successful:', data);
});

jQuery(document).on('fieldops:realtime:new-booking', function(event, data) {
    // Custom real-time update logic
    console.log('New booking:', data);
});
```

## 📱 Page Setup Examples

### Home Page
```php
<!-- Hero Section -->
<section class="hero">
    <h1>Professional Cleaning Services</h1>
    <p>Experience the difference with our tailored cleaning solutions</p>
    [fieldops_booking_form title="Book Your Service Today"]
</section>

<!-- Testimonials -->
<section class="testimonials">
    <h2>What Our Customers Say</h2>
    [fieldops_testimonials limit="3" layout="carousel"]
</section>

<!-- Services -->
<section class="services">
    <h2>Our Services</h2>
    [fieldops_services columns="3"]
</section>
```

### About Page
```php
<!-- CEO Stories -->
<section class="ceo-story">
    <h2>Our Journey</h2>
    [fieldops_ceo_stories limit="4" layout="timeline"]
</section>

<!-- Contact Info -->
<section class="contact">
    <h2>Get in Touch</h2>
    [fieldops_contact_info]
</section>
```

### Contact Page
```php
<!-- Quick Quote Form -->
<section class="quote">
    <h2>Get a Quick Quote</h2>
    [fieldops_quick_quote]
</section>

<!-- Contact Information -->
<section class="contact-details">
    <h2>Contact Information</h2>
    [fieldops_contact_info]
</section>
```

## 🔧 Advanced Configuration

### Custom Post Types

The plugin creates custom post types:

1. **Testimonials** (`fieldops_testimonial`)
2. **CEO Stories** (`fieldops_ceo_story`)
3. **Scheduling** (`fieldops_scheduling`)

### Custom Fields

#### Testimonial Fields
- Customer Name
- Customer Email
- Customer Phone
- Customer Address
- Rating (1-5)
- Approved Status

#### CEO Story Fields
- Author
- Story Date
- Featured Status
- Story Image

#### Scheduling Fields
- Service
- Date
- Time
- Location
- Duration
- Price

### REST API Endpoints

The plugin registers REST API endpoints:

- `/wp-json/fieldops/v1/testimonials`
- `/wp-json/fieldops/v1/ceo-stories`
- `/wp-json/fieldops/v1/booking`
- `/wp-json/fieldops/v1/services`
- `/wp-json/fieldops/v1/status`

### Webhooks

Configure webhooks for real-time updates:

1. Go to **FieldOps Core → Settings → Webhooks**
2. Add webhook URLs for:
   - New bookings
   - Job updates
   - Photo uploads
   - Status changes

## 🚨 Troubleshooting

### Common Issues

#### Plugin Not Activating
- Check PHP version (requires 7.4+)
- Check WordPress version (requires 5.0+)
- Verify file permissions (755 for directories, 644 for files)

#### Booking Form Not Working
- Check FieldOps API URL in settings
- Verify FieldOps backend is running
- Check browser console for JavaScript errors

#### Testimonials Not Loading
- Check testimonials in WordPress admin
- Verify API connection status
- Check if testimonials are approved

#### Real-time Updates Not Working
- Check WebSocket connection
- Verify real-time updates are enabled
- Check browser console for connection errors

### Debug Mode

Enable debug mode by adding to `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', true);
```

Check debug logs in `/wp-content/debug.log`.

## 📞 Support

### FieldOps Core Support
- **Email**: support@fieldops-core.com
- **Documentation**: https://docs.fieldops-core.com
- **Community**: https://community.fieldops-core.com

### WordPress Support
- **WordPress Forums**: https://wordpress.org/support/
- **Plugin Support**: https://wordpress.org/support/plugin/fieldops-core/

## 🔄 Updates

### Automatic Updates
- Plugin supports automatic updates
- Updates include new features and bug fixes
- Always backup before updating

### Manual Updates
1. Download latest version
2. Deactivate current plugin
3. Replace plugin files
4. Reactivate plugin
5. Run database updates if prompted

## 🎯 Next Steps

1. **Install Plugin**: Follow the installation steps above
2. **Configure Settings**: Set up API and business information
3. **Create Pages**: Add shortcodes to your pages
4. **Test Integration**: Verify all features work
5. **Customize**: Adjust styles and functionality as needed
6. **Monitor**: Check real-time updates and performance

## 📚 Additional Resources

- [FieldOps Core Documentation](https://docs.fieldops-core.com)
- [WordPress Plugin Development Guide](https://developer.wordpress.org/plugins/)
- [WordPress Shortcode API](https://developer.wordpress.org/plugins/shortcodes/)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)

---

**Congratulations!** Your FieldOps Core WordPress plugin is now installed and ready to use. Your Stilt Heights website is now fully integrated with the FieldOps Core operations system! 🎉
