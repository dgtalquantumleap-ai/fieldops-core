# FieldOps Core - Admin Dashboard Architecture

## 1. Design Principles

### Single Responsibility Principle
Each service module has a single, well-defined responsibility:
- **API**: Handle all server communication
- **State**: Manage global application state
- **Logger**: Handle logging and error tracking
- **UI**: Provide reusable UI components
- **Security**: Protect against vulnerabilities

### Separation of Concerns
- **Presentation Layer**: HTML templates, CSS styling
- **Business Logic**: App-refactored.js application logic
- **Data Layer**: API service, state management
- **Infrastructure**: Logger, security, performance services

### DRY (Don't Repeat Yourself)
- Utility functions centralized in utils.js
- API endpoints follow consistent patterns
- Form handling uses shared FormHandler class
- Validation rules defined in schemas

### Fail-Safe Design
- Global error boundary catches all errors
- Graceful degradation for missing UI elements
- Fallback values for API responses
- Recovery mechanisms for network failures

## 2. Technology Stack

### Frontend Framework
- **Vanilla JavaScript** - No framework dependencies
- **Chart.js** - Data visualization
- **Socket.IO** - Real-time updates
- **CSS3** - Responsive styling

### Architecture Pattern
- **Service-Oriented Architecture** - Modular services
- **Pub/Sub Pattern** - State management
- **Observer Pattern** - Event handling
- **Factory Pattern** - Component creation

## 3. Data Flow Architecture

### State Management Flow

```
┌─────────────────────────────────────────────┐
│        Application Component                 │
│         (showSection, loadData)              │
└──────────────┬──────────────────────────────┘
               │
               ├─ Call API Service
               │        ↓
               │  Fetch from Server
               │        ↓
               │  Parse & Validate
               │
               ├─ Update Global State
               │  store.setState()
               │        ↓
               │  Notify Subscribers
               │
               ├─ Render UI
               │  renderXXX()
               │        ↓
               │  DOM Manipulation
               │
               └─ Emit Notifications
                  ui.notify.success()
```

### Real-Time Update Flow

```
Server Event (Socket.IO)
    ↓
Socket Handler (handleXXXUpdate)
    ↓
Update State if Needed
    ↓
Reload Section if Active
    ↓
Add Activity Notification
    ↓
User Notified Immediately
```

## 4. API Service Design

### Request Pipeline

```
API Call Request
    ↓
Get Auth Headers (Token)
    ↓
Fetch with Retry Logic (3x)
    ├─ Network Error → Retry
    ├─ 5xx Error → Retry
    ├─ 401 Unauthorized → Redirect to Login
    └─ Other Errors → Return Error Response
    ↓
Parse JSON Response
    ↓
Normalize Data (array-like format)
    ↓
Return APIResponse Object
    {
        success: boolean,
        data: any,
        error: Error|null,
        status: number
    }
```

### Error Handling Strategy

| Error Type | Handling | User Feedback |
|-----------|----------|---------------|
| Network | Retry 3x with backoff | "Connection failed, retrying..." |
| 4xx (Validation) | Return error data | Show validation errors |
| 401 (Auth) | Redirect to login | Automatic redirect |
| 5xx (Server) | Retry 3x | "Server error, retrying..." |
| Unknown | Log & notify user | "Failed to load" |

## 5. State Management Architecture

### State Structure

```javascript
{
    // Data
    jobs: [],
    invoices: [],
    customers: [],
    staff: [],
    automations: [],
    
    // UI State
    currentSection: 'dashboard',
    loading: {
        dashboard: false,
        jobs: false,
        ...
    },
    selectedItem: null,
    
    // User Auth
    isAuthenticated: true,
    user: { id, name, role },
    
    // Filters
    filters: {
        jobs: 'all',
        invoices: 'all',
        staff: 'all'
    }
}
```

### State Update Pattern

```javascript
// Immutable update pattern
store.setState({
    jobs: newJobsList  // Complete replacement
});

// Partial updates use local state
const filters = store.getState('filters');
store.setState({
    filters: { ...filters, jobs: 'completed' }
});

// Subscribe to changes
store.subscribe('jobs', (newJobs) => {
    renderJobsList(newJobs);
});
```

## 6. Validation Architecture

### Three-Layer Validation

```
┌─────────────────────────────────────┐
│    Client-Side Validation (Layer 1)  │
│  JavaScript validation, user feedback │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    API Request Validation (Layer 2)   │
│  Server validates request structure   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│   Business Logic Validation (Layer 3) │
│  Server validates business rules      │
└──────────────┬──────────────────────┘
               ↓
           Persisted
```

### Validation Schema Pattern

```javascript
const schema = {
    'field-name': {
        required: true,
        email: true,
        minLength: 5,
        positive: true
    }
};

const validation = utils.validate.validateForm(formData, schema);
if (!validation.isValid) {
    ui.form.setErrors('form-id', validation.errors);
}
```

## 7. Security Architecture

### Authentication Flow

```
Login
    ↓
User Credentials
    ↓
Backend Auth
    ↓
JWT Token Generated
    ↓
Token Stored in localStorage
    ↓
Token Included in API Requests
    ├─ Authorization: Bearer {token}
    └─ Validated on Every Request
    ↓
Token Expiry → Redirect to Login
```

### Data Protection Layers

```
Frontend Security
├─ XSS Prevention
│  └─ HTML Sanitization
│  └─ Input Escaping
├─ CSRF Protection  
│  └─ Origin Validation
│  └─ Token in Headers
├─ Secure Storage
│  └─ localStorage for non-sensitive
│  └─ sessionStorage for temp data
│  └─ Memory for secrets
└─ Session Management
   └─ Token validation
   └─ Expiry handling
   └─ Logout clearing
```

## 8. Error Handling Architecture

### Error Propagation Flow

```
Error Occurs
    ↓
try-catch Block
    ├─ logger.error()
    └─ return error response
    ↓
UI Handler
    ├─ ui.notify.error()
    ├─ ui.loading.error()
    └─  Form.setErrors()
    ↓
Global Error Boundary
    ├─ Catches uncaught errors
    ├─ Tracks error data
    └─ Notifies user
    ↓
User Sees Error Message
```

### Error Types and Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| InvalidInputError | User provides bad data | Show validation errors |
| NetworkError | No internet/timeout | Retry with backoff |
| ServerError | Backend failure | Retry & notify user |
| AuthError | Token expired/invalid | Redirect to login |
| UnexpectedError | Code bug | Log & show generic message |

## 9. Performance Architecture

### Performance Optimization Layers

```
┌──────────────────────┐
│ Application Layer    │
│ (Smart Rendering)    │
└──────────┬───────────┘
           │
┌──────────┴────────────┐
│ Caching Layer         │
│ - API Response Cache  │
│ - Memoization         │
└──────────┬────────────┘
           │
┌──────────┴────────────┐
│ Request Layer         │
│ - Debouncing         │
│ - Throttling         │
│ - Deduplication      │
└──────────┬────────────┘
           │
┌──────────┴────────────┐
│ Browser APIs         │
│ - LocalStorage       │
│ - SessionStorage     │
└──────────────────────┘
```

### Optimization Strategies

1. **Request Cache** - API responses cached with TTL
2. **Memoization** - Expensive computations memoized
3. **Debouncing** - Search/filter requests delayed 300ms
4. **Throttling** - Scroll events throttled to 300ms
5. **Lazy Loading** - Images loaded on demand
6. **Virtual Scrolling** - Large lists virtualized
7. **Smart Refresh** - Dashboard auto-refresh every 30s

## 10. Real-Time Updates Architecture

### Socket.IO Integration

```
Client Connection
    ↓
Socket.io Connects
    ├─ emit: 'join-room', 'admin'
    └─ listen: connect, disconnect, error
    ↓
Server Event Received
    ├─ 'new-booking'
    ├─ 'job-updated'
    └─ Custom events
    ↓
Handler Processes
    ├─ Update state if needed
    ├─ Reload affected section
    └─ Add activity notification
    ↓
User Sees Update Immediately
```

## 11. UI Component Architecture

### Component Pattern

```javascript
// Notification Component
ui.notify.show(message, type, duration)
├─ Creates element
├─ Sets styles
├─ Appends to DOM
└─ Self-removes after duration

// Modal Component  
ui.modal.show(id)
├─ Adds active class
├─ Disables body scroll
└─ Prevents background interaction

// Loading Component
ui.loading.show(id)
├─ Shows spinner
├─ Centers content
└─ Blocks user input
```

### Component Hierarchy

```
Application
├─ Header
│  └─ Notifications
├─ Sidebar
│  ├─ Navigation
│  └─ User Profile
├─ Main Content
│  ├─ dashboards/jobs/customers...
│  ├─ Loading States
│  ├─ Empty States
│  └─ Error States
└─ Modals
   ├─ Forms
   ├─ Confirmations
   └─ Details
```

## 12. Extensibility

### Adding New Features

```
New Feature
    ↓
Define State
    └─ Update store schema
    ↓
Create API Service
    └─ Update api.js with CRUD endpoints
    ↓
Add UI Components
    └─ Create section in HTML
    ├─ Add navigation link
    └─ Add modals/forms
    ↓
Implement Logic
    └─ Load/render/submit functions in app.js
    ├─ Initialize forms
    ├─ Wire up listeners
    └─ Add socket handlers
    ↓
Feature Complete
```

### Pluggable Services Pattern

Services can be extended without modifying core:

```javascript
// Extend API
window.API.newModule = {
    async getAll() { /* ... */ }
};

// Add custom error handler
errorBoundary.onError((error) => {
    // Custom monitoring
});

// Extend validation
validators.custom = (value) => {
    // Custom validation logic
};
```

## 13. Testing Architecture

### Test Pyramid

```
        ▲
       / \
      /   \  E2E Tests
     /     \ (Complete workflows)
    /───────\
   /         \
  /           \ Integration Tests
 /             \ (Module interactions)
/______________\
|               |
|              | Unit Tests
|               | (Individual functions)
│_______________│
```

### Testable Code Patterns

```javascript
// Pure function (testable)
function calculateMetrics(jobs, invoices) {
    return {
        revenue: invoices.reduce(...),
        jobCount: jobs.length
    };
}

// Service call (testable with mocking)
async function loadCustomers() {
    const response = await API.customers.getAll();
    return response.data;
}

// UI function (testable through DOM)
function renderList(data) {
    const html = data.map(item => `<div>...</div>`);
    container.innerHTML = html.join('');
}
```

## 14. Monitoring and Observability

### Logging Strategy

```
Development (DEBUG level)
├─ All logs including debug
├─ Console verbose
└─ Full error stacks

Staging (WARN level)  
├─ Warnings and errors
├─ Console minimal
└─ Error tracking enabled

Production (ERROR level)
├─ Only errors
├─ No console output
└─ Error tracking to service
```

### Metrics Collection

```javascript
// Track user actions
logger.info('User performed action');

// Track errors
logger.error('Failed operation', error);

// Monitor performance
perf.measure('operation', () => { /* ... */ });

// Get diagnostics
console.log(logger.getErrorLogs());
console.log(errorBoundary.getErrors());
console.log(perf.getWebVitals());
```

## 15. Quality Metrics

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Lighthouse Score | 95+ | TBD | 🔄 |
| Time to Interactive | <3s | TBD | 🔄 |
| Core Web Vitals Pass | 100% | TBD | 🔄 |
| Error Rate | <0.1% | TBD | 🔄 |
| API Success Rate | >99% | TBD | 🔄 |
| Test Coverage | >80% | TBD | 🔄 |

## Summary

This refactored architecture provides:

✅ **Scalability** - Easy to add new features
✅ **Maintainability** - Clear separation of concerns  
✅ **Reliability** - Comprehensive error handling
✅ **Security** - Multiple layers of protection
✅ **Performance** - Optimized rendering and caching
✅ **Testability** - Modular design enables testing
✅ **Extensibility** - Pluggable service modules
✅ **Observability** - Detailed logging and monitoring

---

**Architecture Version:** 1.0
**Last Updated:** February 17, 2026
**Status:** Production Ready
