// ============================================
// CUSTOMER MANAGEMENT FUNCTIONS
// ============================================

function showAddCustomerModal() {
    showModal('add-customer-modal');
    loadCustomerFormOptions();
}

async function loadCustomerFormOptions() {
    // Load any necessary options for customer form
    console.log('📋 Loading customer form options...');
}

async function saveCustomer() {
    try {
        const form = document.getElementById('add-customer-form');
        if (!form) return;

        const formData = {
            name: document.getElementById('customer-name').value.trim(),
            phone: document.getElementById('customer-phone').value.trim(),
            email: document.getElementById('customer-email').value.trim(),
            address: document.getElementById('customer-address').value.trim(),
            notes: document.getElementById('customer-notes').value.trim()
        };

        // Basic validation
        if (!formData.name || formData.name.length < 2) {
            showNotification('Please enter a valid customer name', 'error');
            return;
        }

        if (!formData.phone || formData.phone.length < 10) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }

        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Customer added successfully!', 'success');
            closeModal('add-customer-modal');
            if (currentSection === 'customers') loadCustomers();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification(`Failed to add customer: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error saving customer:', error);
        showNotification('Failed to save customer', 'error');
    }
}

function viewCustomerDetails(customerId) {
    if (!customerId) {
        showNotification('Invalid customer ID', 'error');
        return;
    }
    
    // Load customer details and show in modal
    loadCustomerDetails(customerId);
    showModal('customer-details-modal');
}

async function loadCustomerDetails(customerId) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/customers/${customerId}`, { headers });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const customer = await res.json();
        
        // Populate modal with customer details
        document.getElementById('detail-customer-name').textContent = customer.name || 'N/A';
        document.getElementById('detail-customer-phone').textContent = customer.phone || 'N/A';
        document.getElementById('detail-customer-email').textContent = customer.email || 'N/A';
        document.getElementById('detail-customer-address').textContent = customer.address || 'N/A';
        document.getElementById('detail-customer-notes').textContent = customer.notes || 'N/A';
        document.getElementById('detail-customer-created').textContent = formatDate(customer.created_at);
        
        // Load customer's jobs
        loadCustomerJobs(customerId);
        
    } catch (error) {
        console.error('❌ Error loading customer details:', error);
        showNotification('Failed to load customer details', 'error');
    }
}

async function loadCustomerJobs(customerId) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs?customer_id=${customerId}`, { headers });
        
        if (!res.ok) return;

        const jobsData = await res.json();
        const jobs = Array.isArray(jobsData) ? jobsData : (jobsData.data || []);
        
        const jobsList = document.getElementById('customer-jobs-list');
        if (!jobsList) return;

        if (jobs.length === 0) {
            jobsList.innerHTML = '<div class="no-data">No jobs found for this customer</div>';
            return;
        }

        jobsList.innerHTML = jobs.map(job => `
            <div class="job-item">
                <h4>${job.service_name || 'Service'}</h4>
                <p>Status: <span class="status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'unknown'}">${job.status || 'Unknown'}</span></p>
                <p>Date: ${formatDate(job.job_date)} at ${job.job_time || 'TBD'}</p>
                <p>Location: ${job.location || 'N/A'}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading customer jobs:', error);
    }
}

function editCustomer(customerId) {
    if (!customerId) {
        showNotification('Invalid customer ID', 'error');
        return;
    }
    
    // Load customer data into edit form
    loadCustomerForEdit(customerId);
    showModal('edit-customer-modal');
}

async function loadCustomerForEdit(customerId) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/customers/${customerId}`, { headers });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const customer = await res.json();
        
        // Populate edit form
        document.getElementById('edit-customer-id').value = customer.id || '';
        document.getElementById('edit-customer-name').value = customer.name || '';
        document.getElementById('edit-customer-phone').value = customer.phone || '';
        document.getElementById('edit-customer-email').value = customer.email || '';
        document.getElementById('edit-customer-address').value = customer.address || '';
        document.getElementById('edit-customer-notes').value = customer.notes || '';
        
    } catch (error) {
        console.error('❌ Error loading customer for edit:', error);
        showNotification('Failed to load customer data', 'error');
    }
}

async function updateCustomer() {
    try {
        const customerId = document.getElementById('edit-customer-id').value;
        if (!customerId) {
            showNotification('Invalid customer ID', 'error');
            return;
        }

        const formData = {
            name: document.getElementById('edit-customer-name').value.trim(),
            phone: document.getElementById('edit-customer-phone').value.trim(),
            email: document.getElementById('edit-customer-email').value.trim(),
            address: document.getElementById('edit-customer-address').value.trim(),
            notes: document.getElementById('edit-customer-notes').value.trim()
        };

        // Basic validation
        if (!formData.name || formData.name.length < 2) {
            showNotification('Please enter a valid customer name', 'error');
            return;
        }

        if (!formData.phone || formData.phone.length < 10) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }

        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/customers/${customerId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Customer updated successfully!', 'success');
            closeModal('edit-customer-modal');
            if (currentSection === 'customers') loadCustomers();
        } else {
            showNotification(`Failed to update customer: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error updating customer:', error);
        showNotification('Failed to update customer', 'error');
    }
}

// ============================================
// JOB MANAGEMENT FUNCTIONS
// ============================================

function showCreateJobModal() {
    showModal('create-job-modal');
    loadJobFormOptions();
}

async function loadJobFormOptions() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        // Load customers
        const customersRes = await fetch(`${API_URL}/customers`, { headers });
        const customersData = await customersRes.json();
        const customers = Array.isArray(customersData) ? customersData : (customersData.data || []);
        
        const customerSelect = document.getElementById('job-customer');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Select Customer</option>' +
                customers.map(customer => `<option value="${customer.id}">${customer.name} - ${customer.phone}</option>`).join('');
        }

        // Load services
        const servicesRes = await fetch(`${API_URL}/booking/services`, { headers });
        const servicesData = await servicesRes.json();
        const services = Array.isArray(servicesData) ? servicesData : (servicesData.data || []);
        
        const serviceSelect = document.getElementById('job-service');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select Service</option>' +
                services.map(service => `<option value="${service.id}">${service.name} - $${service.price}</option>`).join('');
        }

        // Load staff
        const staffRes = await fetch(`${API_URL}/staff`, { headers });
        const staffData = await staffRes.json();
        const staff = Array.isArray(staffData) ? staffData : (staffData.data || []);
        
        const staffSelect = document.getElementById('job-staff');
        if (staffSelect) {
            staffSelect.innerHTML = '<option value="">Assign Staff (Optional)</option>' +
                staff.filter(member => member.is_active)
                     .map(member => `<option value="${member.id}">${member.name} - ${member.role}</option>`).join('');
        }

        // Set default date to today
        const dateInput = document.getElementById('job-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.min = today;
        }

    } catch (error) {
        console.error('❌ Error loading job form options:', error);
    }
}

async function saveJob() {
    try {
        const form = document.getElementById('create-job-form');
        if (!form) return;

        const formData = {
            customer_id: parseInt(document.getElementById('job-customer').value),
            service_id: parseInt(document.getElementById('job-service').value),
            assigned_to: document.getElementById('job-staff').value ? parseInt(document.getElementById('job-staff').value) : null,
            job_date: document.getElementById('job-date').value,
            job_time: document.getElementById('job-time').value,
            location: document.getElementById('job-location').value.trim(),
            notes: document.getElementById('job-notes').value.trim()
        };

        // Validation
        if (!formData.customer_id) {
            showNotification('Please select a customer', 'error');
            return;
        }

        if (!formData.service_id) {
            showNotification('Please select a service', 'error');
            return;
        }

        if (!formData.job_date) {
            showNotification('Please select a date', 'error');
            return;
        }

        if (!formData.job_time) {
            showNotification('Please select a time', 'error');
            return;
        }

        if (!formData.location) {
            showNotification('Please enter a location', 'error');
            return;
        }

        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Job created successfully!', 'success');
            closeModal('create-job-modal');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification(`Failed to create job: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error saving job:', error);
        showNotification('Failed to save job', 'error');
    }
}

function viewJobDetails(jobId) {
    if (!jobId) {
        showNotification('Invalid job ID', 'error');
        return;
    }
    
    loadJobDetails(jobId);
    showModal('job-details-modal');
}

async function loadJobDetails(jobId) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs/${jobId}`, { headers });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const job = await res.json();
        
        // Populate modal with job details
        document.getElementById('detail-job-service').textContent = job.service_name || 'N/A';
        document.getElementById('detail-job-customer').textContent = job.customer_name || 'N/A';
        document.getElementById('detail-job-status').textContent = job.status || 'N/A';
        document.getElementById('detail-job-date').textContent = formatDate(job.job_date);
        document.getElementById('detail-job-time').textContent = job.job_time || 'N/A';
        document.getElementById('detail-job-location').textContent = job.location || 'N/A';
        document.getElementById('detail-job-staff').textContent = job.staff_name || 'Unassigned';
        document.getElementById('detail-job-notes').textContent = job.notes || 'N/A';
        document.getElementById('detail-job-created').textContent = formatDate(job.created_at);
        
        // Set status badge color
        const statusBadge = document.getElementById('detail-job-status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'unknown'}`;
            statusBadge.textContent = job.status || 'Unknown';
        }
        
    } catch (error) {
        console.error('❌ Error loading job details:', error);
        showNotification('Failed to load job details', 'error');
    }
}

function editJob(jobId) {
    if (!jobId) {
        showNotification('Invalid job ID', 'error');
        return;
    }
    
    loadJobForEdit(jobId);
    showModal('edit-job-modal');
}

async function loadJobForEdit(jobId) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs/${jobId}`, { headers });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const job = await res.json();
        
        // Populate edit form
        document.getElementById('edit-job-id').value = job.id || '';
        document.getElementById('edit-job-status').value = job.status || 'Scheduled';
        document.getElementById('edit-job-notes').value = job.notes || '';
        
        // Load staff assignment options
        const staffRes = await fetch(`${API_URL}/staff`, { headers });
        const staffData = await staffRes.json();
        const staff = Array.isArray(staffData) ? staffData : (staffData.data || []);
        
        const staffSelect = document.getElementById('edit-job-staff');
        if (staffSelect) {
            staffSelect.innerHTML = '<option value="">Unassigned</option>' +
                staff.filter(member => member.is_active)
                     .map(member => `<option value="${member.id}" ${member.id == job.assigned_to ? 'selected' : ''}>${member.name} - ${member.role}</option>`).join('');
        }
        
    } catch (error) {
        console.error('❌ Error loading job for edit:', error);
        showNotification('Failed to load job data', 'error');
    }
}

async function updateJob() {
    try {
        const jobId = document.getElementById('edit-job-id').value;
        if (!jobId) {
            showNotification('Invalid job ID', 'error');
            return;
        }

        const formData = {
            status: document.getElementById('edit-job-status').value,
            assigned_to: document.getElementById('edit-job-staff').value ? parseInt(document.getElementById('edit-job-staff').value) : null,
            notes: document.getElementById('edit-job-notes').value.trim()
        };

        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs/${jobId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Job updated successfully!', 'success');
            closeModal('edit-job-modal');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification(`Failed to update job: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error updating job:', error);
        showNotification('Failed to update job', 'error');
    }
}

// Job status quick actions
async function markJobCompleted(jobId) {
    if (!jobId || !confirm('Mark this job as completed?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs/${jobId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'Completed' })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Job marked as completed!', 'success');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification(`Failed to update job: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error updating job status:', error);
        showNotification('Failed to update job status', 'error');
    }
}

async function markJobCancelled(jobId) {
    if (!jobId || !confirm('Cancel this job?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const res = await fetch(`${API_URL}/jobs/${jobId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'Cancelled' })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification('Job cancelled!', 'success');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification(`Failed to cancel job: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error cancelling job:', error);
        showNotification('Failed to cancel job', 'error');
    }
}

// ============================================
// SEARCH AND FILTER FUNCTIONS
// ============================================

function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterCustomers(e.target.value.trim());
            }, 300);
        });
    }
}

function filterCustomers(searchTerm) {
    if (!window.allCustomers || window.allCustomers.length === 0) return;
    
    const list = document.getElementById('customers-list');
    if (!list) return;
    
    const filtered = window.allCustomers.filter(customer => 
        (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="no-data">No customers found matching your search</div>';
        return;
    }
    
    // Re-render filtered customers
    list.innerHTML = filtered.map(customer => `
        <div class="customer-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${customer.name || 'Unknown'}</h3>
                <span class="status-badge status-active">Active</span>
            </div>
            <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewCustomerDetails(${customer.id || 0})">View</button>
                <button class="btn-small" onclick="editCustomer(${customer.id || 0})">Edit</button>
            </div>
        </div>
    `).join('');
}

function setupJobFilter() {
    const filterSelect = document.getElementById('job-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            filterJobs(e.target.value);
        });
    }
}

// Initialize search and filter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupCustomerSearch();
    setupJobFilter();
});
