# FieldOps API Documentation

## Overview
FieldOps provides a comprehensive REST API for managing field service operations including customers, jobs, staff, scheduling, and analytics.

## Base URL
```
Production: https://fieldops-production-6b97.up.railway.app/api
Development: http://localhost:3000/api
```

## Authentication
All protected endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting
API endpoints are rate-limited to prevent abuse:
- Public endpoints: 100 requests per hour
- Authenticated endpoints: 1000 requests per hour
- Admin endpoints: 500 requests per hour

---

# Authentication Endpoints

## POST /auth/login
Login to receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

---

# Customer Management

## GET /customers
Get all customers with pagination and search.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `search` (string): Search term
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "555-123-4567",
      "address": "123 Main St",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## POST /customers
Create a new customer.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-123-4567",
  "address": "123 Main St",
  "notes": "Preferred morning appointments"
}
```

## GET /customers/:id
Get customer details with job history.

## PUT /customers/:id
Update customer information.

## DELETE /customers/:id
Delete customer (admin only).

---

# Job Management

## GET /jobs
Get all jobs with filtering and search.

**Query Parameters:**
- `status` (string): Filter by status (scheduled, in_progress, completed, cancelled)
- `staff_id` (number): Filter by assigned staff
- `customer_id` (number): Filter by customer
- `date_from` (string): Start date (YYYY-MM-DD)
- `date_to` (string): End date (YYYY-MM-DD)
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "service_id": 1,
      "assigned_to": 1,
      "job_date": "2024-01-15",
      "job_time": "09:00",
      "location": "123 Main St",
      "status": "scheduled",
      "estimated_duration": 2,
      "final_price": 150.00,
      "customer": {
        "name": "Jane Smith",
        "phone": "555-123-4567"
      },
      "service": {
        "name": "Standard Cleaning",
        "duration": 2
      },
      "staff": {
        "name": "John Doe",
        "role": "Staff"
      }
    }
  ]
}
```

## POST /jobs
Create a new job.

**Request Body:**
```json
{
  "customer_id": 1,
  "service_id": 1,
  "job_date": "2024-01-15",
  "job_time": "09:00",
  "location": "123 Main St",
  "estimated_duration": 2,
  "notes": "Customer prefers morning appointments"
}
```

## GET /jobs/:id
Get job details with full relationships.

## PUT /jobs/:id
Update job information.

## PATCH /jobs/:id/status
Update job status.

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Started cleaning at 9:05 AM"
}
```

## DELETE /jobs/:id
Delete job (admin only).

---

# Staff Management

## GET /staff
Get all staff members with performance metrics.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Staff",
      "phone": "555-987-6543",
      "is_active": true,
      "performance": {
        "total_jobs": 45,
        "completed_jobs": 42,
        "completion_rate": 93.3,
        "avg_duration": 2.1
      }
    }
  ]
}
```

## POST /staff
Create new staff member (admin only).

## GET /staff/:id
Get staff member details with job history.

## PUT /staff/:id
Update staff information.

## PATCH /staff/:id/status
Update staff active status.

## GET /staff/:id/performance
Get staff performance analytics.

---

# Service Management

## GET /services
Get all available services.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Standard Cleaning",
      "description": "Complete home cleaning service",
      "price": 150.00,
      "duration": 2,
      "category": "Cleaning",
      "is_active": true
    }
  ]
}
```

## GET /services/enhanced
Get services with analytics and performance data.

## POST /services/enhanced
Create enhanced service with detailed configuration (admin only).

## PUT /services/enhanced/:id
Update enhanced service (admin only).

## GET /services/analytics
Get comprehensive service analytics.

## POST /services/:id/duplicate
Duplicate service configuration (admin only).

---

# Scheduling System

## POST /scheduling/validate
Validate booking request and get optimal staff assignment.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone": "555-123-4567",
  "email": "jane@example.com",
  "address": "123 Main St",
  "service": "Standard Cleaning",
  "date": "2024-01-15",
  "time": "09:00",
  "notes": "First time customer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "timeSlot": {
      "available": true
    },
    "service": {
      "id": 1,
      "name": "Standard Cleaning",
      "price": 150.00
    },
    "recommendedStaff": {
      "id": 1,
      "name": "John Doe",
      "role": "Staff",
      "score": 95
    },
    "alternatives": [
      {
        "id": 2,
        "name": "Jane Smith",
        "score": 85
      }
    ],
    "capacity": {
      "utilization": 45,
      "available": 3
    }
  }
}
```

## POST /scheduling/confirm-booking
Confirm booking with staff assignment.

## GET /scheduling/staff-availability
Get staff availability for specific date.

## GET /scheduling/time-slots
Get available time slots for date.

---

# Invoice Management

## GET /invoices
Get all invoices with filtering.

**Query Parameters:**
- `status` (string): Filter by status (paid, unpaid, overdue)
- `customer_id` (number): Filter by customer
- `date_from` (string): Start date
- `date_to` (string): End date

## POST /invoices
Create new invoice.

## GET /invoices/:id
Get invoice details with payment history.

## PATCH /invoices/:id/pay
Mark invoice as paid.

## GET /invoices/:id/pdf
Download invoice PDF.

---

# Automation Management

## GET /automations
Get all automation rules.

## POST /automations
Create new automation rule.

**Request Body:**
```json
{
  "name": "Customer Booking Confirmation",
  "trigger_event": "Customer Booking",
  "channel": "Email",
  "message_template": "Hello {{customer_name}}, your {{service_name}} booking for {{job_date}} at {{job_time}} is confirmed.",
  "enabled": true
}
```

## PUT /automations/:id
Update automation rule.

## DELETE /automations/:id
Delete automation rule.

## POST /automations/:id/test
Test automation rule.

---

# Analytics & Reporting

## GET /analytics/dashboard
Get comprehensive dashboard analytics.

**Query Parameters:**
- `period` (number): Days to analyze (default: 30)
- `date_from` (string): Start date
- `date_to` (string): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total_jobs": 150,
      "completed_jobs": 142,
      "total_revenue": 21300.00,
      "avg_job_value": 150.00
    },
    "customers": {
      "unique_customers": 85,
      "total_bookings": 150,
      "repeat_rate": 0.65,
      "new_customers": 12
    },
    "staff": {
      "active_staff": 5,
      "total_assignments": 150,
      "completed_assignments": 142,
      "avg_completion_rate": 94.7
    },
    "services": [
      {
        "name": "Standard Cleaning",
        "bookings": 85,
        "completions": 82,
        "avg_revenue": 150.00,
        "completion_rate": 96.5
      }
    ]
  }
}
```

## GET /analytics/revenue
Get detailed revenue analytics.

## GET /analytics/customers
Get customer analytics and insights.

## GET /analytics/staff
Get staff performance analytics.

## GET /analytics/predictions
Get business predictions and forecasts.

---

# Settings Management

## GET /settings/business
Get business information settings.

## PUT /settings/business
Update business information.

## GET /settings/labels
Get UI label customizations.

## PUT /settings/labels
Update UI labels.

---

# Admin Audit & Monitoring

## GET /admin-audit/audit-logs
Get comprehensive audit logs.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `action` (string): Filter by action
- `entity_type` (string): Filter by entity type
- `user_id` (number): Filter by user
- `date_from` (string): Start date
- `date_to` (string): End date

## GET /admin-audit/audit-summary
Get audit summary statistics.

## GET /admin-audit/system-health
Get system health metrics.

## DELETE /admin-audit/audit-logs
Clear audit logs (admin only).

---

# Media Management

## POST /media/upload
Upload file (photo, document, etc.).

**Request Body (multipart/form-data):**
- `file`: File to upload
- `job_id`: Associated job ID
- `category`: File category (before, after, document)

## GET /media/:job_id
Get all media for a job.

## DELETE /media/:id
Delete media file.

---

# Real-time Events

The FieldOps API supports real-time updates via Socket.io. Connect to:

```
ws://your-domain.com
```

## Events

### Client → Server
- `join-room`: Join specific room (admin, staff)
- `job-status-changed`: Update job status

### Server → Client
- `new-booking`: New booking received
- `job-updated`: Job status updated
- `job-scheduled`: Job scheduled with staff
- `job-assigned`: Job assigned to staff
- `automation-triggered`: Automation triggered

---

# Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `DUPLICATE_RESOURCE`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

# SDK Examples

## JavaScript/Node.js

```javascript
const API_BASE = 'https://fieldops-production-6b97.up.railway.app/api';

class FieldOpsAPI {
  constructor(token) {
    this.token = token;
    this.base = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = `${this.base}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    return response.json();
  }

  async getJobs(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/jobs?${params}`);
  }

  async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }

  async updateJobStatus(jobId, status, notes = '') {
    return this.request(`/jobs/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  }
}

// Usage
const api = new FieldOpsAPI('your-jwt-token');
const jobs = await api.getJobs({ status: 'scheduled' });
```

## Python

```python
import requests
import json

class FieldOpsAPI:
    def __init__(self, token, base_url='https://fieldops-production-6b97.up.railway.app/api'):
        self.token = token
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

    def request(self, endpoint, method='GET', data=None):
        url = f'{self.base_url}{endpoint}'
        
        if method == 'GET':
            response = requests.get(url, headers=self.headers, params=data)
        elif method == 'POST':
            response = requests.post(url, headers=self.headers, json=data)
        elif method == 'PUT':
            response = requests.put(url, headers=self.headers, json=data)
        elif method == 'PATCH':
            response = requests.patch(url, headers=self.headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=self.headers)
        
        return response.json()

    def get_jobs(self, filters=None):
        return self.request('/jobs', data=filters)

    def create_job(self, job_data):
        return self.request('/jobs', method='POST', data=job_data)

# Usage
api = FieldOpsAPI('your-jwt-token')
jobs = api.get_jobs({'status': 'scheduled'})
```

---

# Testing

## Postman Collection
Import the provided Postman collection for easy API testing.

## Environment Variables
- `API_BASE`: Base URL for API
- `JWT_TOKEN`: Authentication token

## Sample Tests
```bash
# Login
curl -X POST https://fieldops-production-6b97.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get jobs
curl -X GET https://fieldops-production-6b97.up.railway.app/api/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create job
curl -X POST https://fieldops-production-6b97.up.railway.app/api/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"service_id":1,"job_date":"2024-01-15","job_time":"09:00","location":"123 Main St"}'
```

---

# Support

For API support and questions:
- Email: api-support@fieldops.com
- Documentation: https://docs.fieldops.com
- Status Page: https://status.fieldops.com

---

*Last updated: January 2024*
*Version: 1.0.0*
