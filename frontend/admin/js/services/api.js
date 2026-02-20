/**
 * FieldOps Core - API Service Layer
 * Centralized API communication with error handling, retry logic, and consistent response handling
 * 
 * @module api
 */

const API_BASE_URL = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * API Response wrapper for consistent error handling
 * @typedef {Object} APIResponse
 * @property {boolean} success - Whether the request succeeded
 * @property {any} data - Response data
 * @property {Error|null} error - Error object if failed
 * @property {number} status - HTTP status code
 */

/**
 * Get authentication headers with token
 * @returns {Object} Headers object with Authorization bearer token
 * @throws {Error} If no token is found
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        logger.error('Auth failed: No token found in localStorage');
        window.location.href = '/admin/login.html';
        throw new Error('Authentication token not found');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Execute an API request with retry logic
 * @private
 */
async function fetchWithRetry(url, options = {}, attempt = 0) {
    try {
        const response = await fetch(url, options);
        
        // Handle authentication errors
        if (response.status === 401) {
            logger.error('Authentication failed: Redirecting to login');
            localStorage.clear();
            window.location.href = '/admin/login.html';
            throw new Error('Unauthorized');
        }
        
        // Handle server errors with retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
            logger.warn(`Server error (${response.status}), retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
            return fetchWithRetry(url, options, attempt + 1);
        }
        
        return response;
    } catch (error) {
        // Retry on network errors
        if (attempt < MAX_RETRIES) {
            logger.warn(`Network error, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`, error);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
            return fetchWithRetry(url, options, attempt + 1);
        }
        throw error;
    }
}

/**
 * Parse and validate API response
 * @private
 */
async function parseResponse(response) {
    if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    return null;
}

/**
 * Normalize API response to array format
 * @private
 */
function normalizeData(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.items)) return data.items;
        return [data];
    }
    return [];
}

/**
 * Dashboard API calls
 */
const dashboardAPI = {
    /**
     * Get dashboard metrics (jobs, invoices, customers)
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getMetrics() {
        try {
            const headers = getAuthHeaders();
            const [jobsRes, invoicesRes, customersRes] = await Promise.all([
                fetchWithRetry(`${API_BASE_URL}/jobs`, { headers }),
                fetchWithRetry(`${API_BASE_URL}/invoices`, { headers }),
                fetchWithRetry(`${API_BASE_URL}/customers`, { headers })
            ]);
            
            const jobs = await parseResponse(jobsRes);
            const invoices = await parseResponse(invoicesRes);
            const customers = await parseResponse(customersRes);
            
            return {
                success: true,
                data: {
                    jobs: normalizeData(jobs),
                    invoices: normalizeData(invoices),
                    customers: normalizeData(customers)
                },
                status: 200
            };
        } catch (error) {
            logger.error('Failed to fetch dashboard metrics:', error);
            return {
                success: false,
                data: null,
                error,
                status: error.status || 500
            };
        }
    }
};

/**
 * Customer API calls
 */
const customerAPI = {
    /**
     * Get all customers
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/customers`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch customers:', error);
            return {
                success: false,
                data: [],
                error,
                status: 500
            };
        }
    },
    
    /**
     * Get customer by ID
     * @async
     * @param {number} id - Customer ID
     * @returns {Promise<APIResponse>}
     */
    async getById(id) {
        if (!id) throw new Error('Customer ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/customers/${id}`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to fetch customer ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Create new customer
     * @async
     * @param {Object} customer - Customer data
     * @returns {Promise<APIResponse>}
     */
    async create(customer) {
        if (!customer || !customer.name || !customer.phone) {
            throw new Error('Customer name and phone are required');
        }
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/customers`, {
                method: 'POST',
                headers,
                body: JSON.stringify(customer)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to create customer:', error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Update customer
     * @async
     * @param {number} id - Customer ID
     * @param {Object} updates - Customer data to update
     * @returns {Promise<APIResponse>}
     */
    async update(id, updates) {
        if (!id) throw new Error('Customer ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/customers/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to update customer ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Delete customer
     * @async
     * @param {number} id - Customer ID
     * @returns {Promise<APIResponse>}
     */
    async delete(id) {
        if (!id) throw new Error('Customer ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/customers/${id}`, {
                method: 'DELETE',
                headers
            });
            
            return {
                success: response.ok,
                data: null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to delete customer ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    }
};

/**
 * Job API calls
 */
const jobAPI = {
    /**
     * Get all jobs
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/jobs`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch jobs:', error);
            return {
                success: false,
                data: [],
                error,
                status: 500
            };
        }
    },
    
    /**
     * Get job by ID
     * @async
     * @param {number} id - Job ID
     * @returns {Promise<APIResponse>}
     */
    async getById(id) {
        if (!id) throw new Error('Job ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/jobs/${id}`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to fetch job ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Create new job
     * @async
     * @param {Object} job - Job data
     * @returns {Promise<APIResponse>}
     */
    async create(job) {
        if (!job || !job.customer_id || !job.service_id || !job.job_date) {
            throw new Error('Customer, service, and date are required');
        }
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/jobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify(job)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to create job:', error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Update job
     * @async
     * @param {number} id - Job ID
     * @param {Object} updates - Job data to update
     * @returns {Promise<APIResponse>}
     */
    async update(id, updates) {
        if (!id) throw new Error('Job ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/jobs/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to update job ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Update job status
     * @async
     * @param {number} id - Job ID
     * @param {string} status - New status
     * @returns {Promise<APIResponse>}
     */
    async updateStatus(id, status) {
        if (!id || !status) throw new Error('Job ID and status are required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/jobs/${id}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status })
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to update job ${id} status:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    }
};

/**
 * Staff API calls
 */
const staffAPI = {
    /**
     * Get all staff
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/staff`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch staff:', error);
            return {
                success: false,
                data: [],
                error,
                status: 500
            };
        }
    },
    
    /**
     * Get staff member by ID
     * @async
     * @param {number} id - Staff ID
     * @returns {Promise<APIResponse>}
     */
    async getById(id) {
        if (!id) throw new Error('Staff ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/staff/${id}`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to fetch staff ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Create new staff member
     * @async
     * @param {Object} staff - Staff data
     * @returns {Promise<APIResponse>}
     */
    async create(staff) {
        if (!staff || !staff.name || !staff.email) {
            throw new Error('Staff name and email are required');
        }
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/staff`, {
                method: 'POST',
                headers,
                body: JSON.stringify(staff)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to create staff member:', error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Update staff member
     * @async
     * @param {number} id - Staff ID
     * @param {Object} updates - Staff data to update
     * @returns {Promise<APIResponse>}
     */
    async update(id, updates) {
        if (!id) throw new Error('Staff ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/staff/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to update staff ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    }
};

/**
 * Invoice API calls
 */
const invoiceAPI = {
    /**
     * Get all invoices
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/invoices`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch invoices:', error);
            return {
                success: false,
                data: [],
                error,
                status: 500
            };
        }
    },
    
    /**
     * Get invoice by ID
     * @async
     * @param {number} id - Invoice ID
     * @returns {Promise<APIResponse>}
     */
    async getById(id) {
        if (!id) throw new Error('Invoice ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/invoices/${id}`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to fetch invoice ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Create new invoice
     * @async
     * @param {Object} invoice - Invoice data
     * @returns {Promise<APIResponse>}
     */
    async create(invoice) {
        if (!invoice || !invoice.customer_id || !invoice.amount) {
            throw new Error('Customer and amount are required');
        }
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/invoices`, {
                method: 'POST',
                headers,
                body: JSON.stringify(invoice)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to create invoice:', error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Mark invoice as paid
     * @async
     * @param {number} id - Invoice ID
     * @returns {Promise<APIResponse>}
     */
    async markAsPaid(id) {
        if (!id) throw new Error('Invoice ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/invoices/${id}/pay`, {
                method: 'PATCH',
                headers
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to mark invoice ${id} as paid:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Download invoice PDF
     * @param {number} id - Invoice ID
     */
    downloadPDF(id) {
        if (!id) throw new Error('Invoice ID is required');
        window.open(`${API_BASE_URL}/invoices/${id}/pdf`, '_blank');
    }
};

/**
 * Automation API calls
 */
const automationAPI = {
    /**
     * Get all automations
     * @async
     * @returns {Promise<APIResponse>}
     */
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/automations`, { headers });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch automations:', error);
            return {
                success: false,
                data: [],
                error,
                status: 500
            };
        }
    },
    
    /**
     * Create new automation
     * @async
     * @param {Object} automation - Automation data
     * @returns {Promise<APIResponse>}
     */
    async create(automation) {
        if (!automation || !automation.trigger_event || !automation.channel) {
            throw new Error('Trigger event and channel are required');
        }
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/automations`, {
                method: 'POST',
                headers,
                body: JSON.stringify(automation)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to create automation:', error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    },
    
    /**
     * Update automation
     * @async
     * @param {number} id - Automation ID
     * @param {Object} updates - Automation data to update
     * @returns {Promise<APIResponse>}
     */
    async update(id, updates) {
        if (!id) throw new Error('Automation ID is required');
        
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/automations/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });
            const data = await parseResponse(response);
            
            return {
                success: response.ok,
                data: data || null,
                status: response.status
            };
        } catch (error) {
            logger.error(`Failed to update automation ${id}:`, error);
            return {
                success: false,
                data: null,
                error,
                status: 500
            };
        }
    }
};

/**
 * Services API calls
 */
const servicesAPI = {
    async getAll() {
        try {
            const headers = getAuthHeaders();
            const response = await fetchWithRetry(`${API_BASE_URL}/booking/services`, { headers });
            const data = await parseResponse(response);
            return {
                success: response.ok,
                data: normalizeData(data),
                status: response.status
            };
        } catch (error) {
            logger.error('Failed to fetch services:', error);
            return { success: false, data: [], error, status: 500 };
        }
    }
};

// Export API modules (for use with module systems) and expose globally
window.API = {
    dashboard: dashboardAPI,
    customers: customerAPI,
    jobs: jobAPI,
    staff: staffAPI,
    invoices: invoiceAPI,
    automations: automationAPI,
    services: servicesAPI
};
