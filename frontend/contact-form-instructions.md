# FieldOps Contact Form Integration

## 🎯 **What This Does**

Connects your existing WordPress contact form to FieldOps Core API for automated lead management and customer creation.

## 🚀 **How to Install**

### **Step 1: Add JavaScript to Your WordPress Page**

1. **Edit your Contact page** in WordPress
2. **Add a "Code" or "Custom HTML" block**
3. **Paste this code** (at the bottom of the page):

```html
<script src="http://localhost:3000/contact-form-integration.js"></script>
```

### **Alternative: Add to Theme**
Add to your theme's footer.php or use a plugin like "Insert Headers and Footers":

```html
<script>
// FieldOps Contact Form Integration
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const contactForm = document.querySelector('form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(contactForm);
                const data = {
                    name: formData.get('name') || formData.get('Name') || '',
                    email: formData.get('email') || formData.get('Email') || '',
                    phone: formData.get('phone') || formData.get('Phone') || '',
                    message: formData.get('message') || formData.get('Message') || '',
                    service_type: 'General Inquiry',
                    source: 'Website Contact Form',
                    website: 'stiltheights.com'
                };
                
                fetch('http://localhost:3000/api/bookings', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(result => {
                    alert('Thank you! We\'ll contact you soon to schedule your service.');
                    contactForm.reset();
                })
                .catch(error => {
                    console.log('Backup: Form submitted normally');
                    contactForm.submit();
                });
            });
        }
    });
})();
</script>
```

## 🎯 **What Happens When Customer Submits**

### **Customer Experience:**
1. **Fills out your familiar contact form**
2. **Clicks "Send Message"**
3. **Sees "Thank you" confirmation**
4. **Gets professional follow-up**

### **Backend Processing:**
1. **Form data captured** automatically
2. **Customer created** in FieldOps (if new)
3. **Lead/booking created** in FieldOps
4. **Staff notified** for follow-up
5. **Professional workflow** initiated

## 🎨 **Features**

### ✅ **Smart Field Detection**
- Automatically finds name, email, phone, message fields
- Handles different field name variations
- Works with any WordPress form

### ✅ **Professional Integration**
- FieldOps branding added subtly
- Success/error messages
- Loading states during submission

### ✅ **Error Handling**
- Graceful fallback to normal form submission
- User-friendly error messages
- No lost submissions

### ✅ **Mobile Responsive**
- Works on all devices
- Touch-friendly buttons
- Optimized display

## 🔧 **Configuration Options**

### **Custom Service Types**
Edit the `service_type` in the script:
```javascript
service_type: 'General Inquiry', // Change to: 'Cleaning Request', 'Quote Request', etc.
```

### **Custom Success Message**
Modify the success text:
```javascript
alert('Thank you! We\'ll contact you soon to schedule your service.');
```

### **Custom Styling**
Add CSS to customize messages:
```css
.fieldops-success {
    background: #10b981;
    color: white;
    padding: 15px;
    border-radius: 8px;
}
```

## 🎯 **Benefits for Stilt Heights**

### **✅ Professional Operations**
- **Automated lead capture** - No manual data entry
- **Customer management** - All in one system
- **Follow-up tracking** - Never miss a lead
- **Professional workflow** - Consistent process

### **✅ Customer Experience**
- **Familiar interface** - Your existing form
- **Instant confirmation** - Professional response
- **Quick follow-up** - Automated notifications
- **Mobile-friendly** - Works everywhere

### **✅ Business Growth**
- **Lead conversion** - Better tracking
- **Customer data** - Centralized management
- **Staff efficiency** - Automated assignments
- **Professional image** - Modern technology

## 🚀 **Testing**

### **Test the Integration:**
1. **Go to your contact page**
2. **Fill out the form** with test data
3. **Click "Send Message"**
4. **Check for success message**
5. **Verify in FieldOps** (check customers/bookings)

### **Debug Mode:**
Open browser console (F12) to see:
- "FieldOps: Contact form found, integrating..."
- "FieldOps: Success" or "FieldOps: Error"

## 🎉 **You're Ready!**

Once installed, your existing contact form will automatically:
- ✅ **Capture leads** in FieldOps
- ✅ **Create customers** automatically
- ✅ **Notify staff** for follow-up
- ✅ **Track all interactions**

**Professional contact form integration - complete!** 🚀
