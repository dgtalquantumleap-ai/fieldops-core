# FieldOps Admin Dashboard - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Understanding the Structure

The refactored Admin App is organized into clean, modular services:

```
┌─────────────────────────┐
│  app-refactored.js      │ ← Main app logic
├─────────────────────────┤
│ Service Layer (js/services/)
│ ├─ api.js              │ ← All API calls
│ ├─ state.js            │ ← Global state store
│ ├─ ui.js               │ ← UI components
│ ├─ utils.js            │ ← Helper functions
│ ├─ forms.js            │ ← Form handling
│ ├─ logger.js           │ ← Logging
│ ├─ security.js         │ ← Security
│ ├─ performance.js      │ ← Optimization
│ └─ error-boundary.js   │ ← Error handling
└─────────────────────────┘
```

### 2. Common Tasks Cheat Sheet

#### Show a notification
```javascript
ui.notify.success('Operation successful');
ui.notify.error('Something went wrong');
ui.notify.warning('Please be careful');
ui.notify.info('Here\'s some information');
```

#### Get or update state
```javascript
// Get all state
const state = store.getState();

// Get specific value
const jobs = store.getState('jobs');

// Update state
store.setState({ jobs: newJobsList });

// Subscribe to changes
store.subscribe('jobs', (newJobs) => {
    console.log('Jobs updated:', newJobs);
});
```

#### Make API calls
```javascript
// Get all customers
const response = await API.customers.getAll();
if (response.success) {
    console.log(response.data); // Array of customers
}

// Create a new customer
const result = await API.customers.create({
    name: 'John Doe',
    phone: '555-1234',
    email: 'john@example.com'
});

// Update a customer
await API.customers.update(customerId, {
    name: 'Jane Doe'
});

// Delete a customer
await API.customers.delete(customerId);
```

#### Format data
```javascript
// Dates
utils.format.date('2026-02-17') // Feb 17, 2026

// Times
utils.format.time('2026-02-17T14:30:00') // 2:30 PM

// Currency
utils.format.currency(100.50) // $100.50

// Percentages
utils.format.percentage(85.5) // 85.5%

// Trends
utils.format.trend(100, 80) // +25%
```

#### Validate user input
```javascript
// Validate email
if (!utils.validate.email(inputValue)) {
    console.log('Invalid email');
}

// Validate form with schema
const validation = utils.validate.validateForm(
    { name: 'John', email: 'john@example.com' },
    {
        name: { required: true },
        email: { required: true, email: true }
    }
);

if (!validation.isValid) {
    console.log('Errors:', validation.errors);
}
```

#### Manipulate DOM safely
```javascript
// Get element
const el = utils.dom.get('element-id');

// Add/remove CSS classes
utils.dom.addClass('element-id', 'active');
utils.dom.removeClass('element-id', 'active');
utils.dom.toggleClass('element-id', 'active');

// Set content
utils.dom.setContent('element-id', 'Hello World');

// Set HTML (safer than innerHTML)
utils.dom.setHTML('element-id', '<p>Hello</p>');
```

#### Handle forms
```javascript
// Get form data as object
const formData = ui.form.getFormData('form-id');

// Set form values
ui.form.setFormData('form-id', {
    name: 'John',
    email: 'john@example.com'
});

// Show form errors
ui.form.setErrors('form-id', {
    name: 'Name is required',
    email: 'Invalid email'
});

// Clear form errors
ui.form.clearErrors('form-id');

// Reset form to empty
ui.form.reset('form-id');
```

#### Show loading/empty/error states
```javascript
// Show loading spinner
ui.loading.show('container-id');

// Show empty state
ui.loading.empty('container-id', 'No data found');

// Show error state with retry button
ui.loading.error('container-id', 'Failed to load');

// Retry function
function retryLoad() {
    loadData();
}
```

#### Log messages
```javascript
logger.debug('This is a debug message');
logger.info('This is informational');
logger.warn('This is a warning');
logger.error('This is an error', errorObject);

// Get error logs
const errorLogs = logger.getErrorLogs();
console.log(errorLogs);
```

---

## 📋 Common Development Scenarios

### Adding a New Tab

**Step 1:** Add HTML section
```html
<section id="mytab" class="content-section">
    <div class="section-header">
        <h2>My New Tab</h2>
    </div>
    <div id="mytab-list" class="list">
        <!-- Content renders here -->
    </div>
</section>
```

**Step 2:** Add navigation link
```html
<a href="#mytab" class="nav-item" onclick="showSection('mytab')">
    <span class="nav-icon">🎯</span>
    <span>My Tab</span>
</a>
```

**Step 3:** Add load function in app.js
```javascript
async function loadMyTab() {
    ui.loading.show('mytab-list');
    try {
        const response = await API.mytab.getAll();
        if (response.success) {
            renderMyList(response.data);
        } else {
            throw new Error('Failed to load');
        }
    } catch (error) {
        logger.error('Failed to load my tab:', error);
        ui.loading.error('mytab-list', 'Failed to load');
    }
}

function renderMyList(items) {
    const list = document.getElementById('mytab-list');
    list.innerHTML = items.map(item => `
        <div class="item-card">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
        </div>
    `).join('');
}
```

**Step 4:** Wire to navigation
```javascript
// In loadSectionData() switch statement
case 'mytab':
    await loadMyTab();
    break;
```

### Creating a New API Endpoint

**Step 1:** Add to api.js
```javascript
const mytabAPI = {
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(
                `${API_BASE_URL}/mytab`,
                { headers }
            );
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch mytab:', error);
            return { success: false, data: [], error, status: 500 };
        }
    }
};
```

**Step 2:** Export in window.API
```javascript
window.API.mytab = mytabAPI;
```

**Step 3:** Use in app.js
```javascript
const response = await API.mytab.getAll();
```

### Creating a Form

**Step 1:** Add form to HTML modal
```html
<div id="add-mytab-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Add My Item</h3>
            <button class="close-btn" onclick="ui.modal.hide('add-mytab-modal')">×</button>
        </div>
        <div class="modal-body">
            <form id="add-mytab-form">
                <div class="form-group">
                    <label for="mytab-name">Name *</label>
                    <input type="text" id="mytab-name" name="mytab-name" required placeholder="Enter name">
                </div>
                <div class="form-group">
                    <label for="mytab-description">Description</label>
                    <textarea id="mytab-description" name="mytab-description" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="ui.modal.hide('add-mytab-modal')">Cancel</button>
                    <button type="submit" class="btn-primary">Add</button>
                </div>
            </form>
        </div>
    </div>
</div>
```

**Step 2:** Configure form handler in forms.js
```javascript
FormHandler.initialize(
    'add-mytab-form',
    {
        'mytab-name': { required: true },
        'mytab-description': {}
    },
    async (formData) => {
        FormHandler.disable('add-mytab-form');
        try {
            const response = await API.mytab.create({
                name: formData['mytab-name'],
                description: formData['mytab-description']
            });
            
            if (response.success) {
                ui.notify.success('Item added successfully');
                ui.modal.hide('add-mytab-modal');
                loadMyTab();
            } else {
                ui.notify.error('Failed to add item');
            }
        } finally {
            FormHandler.enable('add-mytab-form', 'Add');
        }
    }
);
```

**Step 3:** Show form on button click
```javascript
function showAddMyTabModal() {
    ui.modal.show('add-mytab-modal');
}
```

---

## 🔍 Debugging Tips

### Monitor API Calls
1. Open Browser DevTools
2. Go to Network tab
3. Try an operation
4. Look for API requests
5. Check request headers and response

### Check Application State
```javascript
// In browser console
console.log(store.getState());
```

### View Error Logs
```javascript
// In browser console
console.log(logger.getErrorLogs());
```

### Monitor Performance
```javascript
// In browser console
console.log(perf.getWebVitals());
```

### Test API Endpoints
```javascript
// In browser console
const result = await API.customers.getAll();
console.log(result);
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Inline Fetch Calls
```javascript
// DON'T do this
fetch('/api/customers')
    .then(res => res.json())
    .then(data => console.log(data));

// DO this instead
const response = await API.customers.getAll();
```

### ❌ Direct DOM Manipulation
```javascript
// DON'T do this
document.getElementById('list').innerHTML = html;

// DO this instead
utils.dom.setHTML('list', html);
// or better
store.setState({ items: newItems });
// Then re-render from state
```

### ❌ Global Variables
```javascript
// DON'T do this
window.globalList = [];

// DO this instead
store.setState({ items: [] });
```

### ❌ Console.logs in Production
```javascript
// DON'T do this
console.log('Debug message');

// DO this instead
logger.debug('Debug message');
```

### ❌ Missing Error Handling
```javascript
// DON'T do this
const data = await API.customers.getAll();
renderData(data); // If data is null, this breaks

// DO this instead
const response = await API.customers.getAll();
if (response.success) {
    renderData(response.data);
} else {
    ui.notify.error('Failed to load');
}
```

---

## 🎯 Module Reference Quick Access

| Need | Use | Example |
|------|-----|---------|
| Show message | `ui.notify` | `ui.notify.success('Saved')` |
| Get data from API | `API.*` | `await API.customers.getAll()` |
| Store/retrieve state | `store` | `store.setState({ jobs: [] })` |
| Format data | `utils.format` | `utils.format.date('2026-02-17')` |
| Validate input | `utils.validate` | `utils.validate.email(email)` |
| DOM operations | `utils.dom` | `utils.dom.get('el-id')` |
| Show loading | `ui.loading` | `ui.loading.show('container')` |
| Log messages | `logger` | `logger.error('msg', err)` |
| Handle forms | `ui.form` | `ui.form.getFormData('form')` |
| Show modal | `ui.modal` | `ui.modal.show('modal-id')` |
| Secure data | `security` | `security.sanitizeHTML(html)` |

---

##✨ Best Practices Checklist

- ✅ Use API service for all data calls
- ✅ Update state, don't use global vars
- ✅ Handle errors with try-catch
- ✅ Show user feedback (notify/loading)
- ✅ Validate user input before submit
- ✅ Log important events with logger
- ✅ Use utils helpers for common ops
- ✅ Sanitize user input for security
- ✅ Clear errors when user corrects
- ✅ Disable forms during submission

---

## 📞 Need Help?

1. **Check the docs**
   - REFACTORING_GUIDE.md
   - ARCHITECTURE.md
   - Code comments in service files

2. **Debug with tools**
   - Browser console
   - Network tab
   - Application state (`store.getState()`)
   - Error logs (`logger.getErrorLogs()`)

3. **Look at examples**
   - app-refactored.js has all tab implementations
   - forms.js has all form examples
   - HTML has all modal templates

---

**Last Updated:** February 17, 2026  
**Version:** 1.0 - Production Ready  
Happy Coding! 🚀
