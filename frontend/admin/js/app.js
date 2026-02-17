// FieldOps Core - Modern Operations System for Stilt Heights
// CORRECTED AND OPTIMIZED VERSION
const API_URL = '/api';
let socket;
let revenueChart, statusChart;
let currentSection = 'dashboard';

// ============================================
// AUTH HEADERS - FIXED
// ============================================
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    };
}

// ============================================
// SOCKET.IO INITIALIZATION
// ============================================
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔌 Connected to Stilt Heights Operations System');
        socket.emit('join-room', 'admin');
    });
    
    socket.on('new-booking', (data) => {
        console.log('📅 New booking received:', data);
        showNotification('New booking received!', 'success');
        if (currentSection === 'dashboard') loadDashboard();
        addActivityItem('New Booking', `${data.customer?.name} - ${data.job?.service_name}`, '📅');
    });
    
    socket.on('job-updated', (data) => {
        console.log('🔄 Job updated:', data);
        if (currentSection === 'dashboard') loadDashboard();
        if (currentSection === 'jobs') loadJobs();
        addActivityItem('Job Updated', `Status changed to ${data.job?.status}`, '🔄');
    });
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionName) {
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName)?.classList.add('active');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionName}"]`)?.classList.add('active');
    
    currentSection = sectionName;
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'automations':
            loadAutomations();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('active');
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        console.log('🔄 Loading dashboard...');
        
        const [jobsRes, invoicesRes, customersRes] = await Promise.all([
            fetch(`${API_URL}/jobs`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/invoices`, { headers: getAuthHeaders() }),
            fetch(`${API_URL}/customers`, { headers: getAuthHeaders() })
        ]);
        
        const jobs = await jobsRes.json();
        let invoices = [];
        let customers = [];
        
        if (invoicesRes.ok) {
            const invoiceData = await invoicesRes.json();
            invoices = Array.isArray(invoiceData) ? invoiceData : (invoiceData.data || []);
        }
        
        if (customersRes.ok) {
            const customerData = await customersRes.json();
            customers = Array.isArray(customerData) ? customerData : (customerData.data || []);
        }
        
        // Calculate metrics
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const todayJobs = jobs.filter(job => job.job_date === today);
        const yesterdayJobs = jobs.filter(job => job.job_date === yesterday);
        const pendingJobs = jobs.filter(job => job.status === 'Scheduled');
        const completedJobs = jobs.filter(job => job.status === 'Completed');
        
        // Handle invoice status case-insensitivity
        const paidInvoices = invoices.filter(inv => 
            inv.status?.toLowerCase() === 'paid'
        );
        const unpaidInvoices = invoices.filter(inv => 
            inv.status?.toLowerCase() === 'unpaid'
        );
        
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        // Update stats
        updateStatWithAnimation('today-jobs-count', todayJobs.length, calcTrend(todayJobs.length, yesterdayJobs.length));
        updateStatWithAnimation('pending-jobs-count', pendingJobs.length);
        updateStatWithAnimation('completed-jobs-count', completedJobs.length);
        updateStatWithAnimation('revenue-count', `$${totalRevenue.toLocaleString()}`);
        
        // Update charts
        updateRevenueChart(jobs, invoices);
        updateStatusChart(jobs);
        
        // Update activity feed
        updateActivityFeed(jobs.slice(0, 5));
        
        console.log('✅ Dashboard loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
    }
}

function updateStatWithAnimation(elementId, value, trend = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (element.textContent !== String(value)) {
        element.style.transform = 'scale(1.1)';
        element.textContent = value;
        
        const trendElement = document.getElementById(elementId + '-trend');
        if (trendElement && trend) {
            trendElement.textContent = trend;
            trendElement.style.color = trend.startsWith('+') ? '#10b981' : '#ef4444';
        }
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }
}

// ============================================
// CHARTS
// ============================================
function updateRevenueChart(jobs, invoices) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    
    const last7Days = [];
    const revenueData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = invoices
            .filter(inv => inv.status?.toLowerCase() === 'paid' && 
                          inv.issued_at?.startsWith(dateStr))
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        revenueData.push(dayRevenue);
    }
    
    if (revenueChart) revenueChart.destroy();
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Revenue',
                data: revenueData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateStatusChart(jobs) {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;
    
    const statusCounts = {
        'Scheduled': jobs.filter(job => job.status === 'Scheduled').length,
        'In Progress': jobs.filter(job => job.status === 'In Progress').length,
        'Completed': jobs.filter(job => job.status === 'Completed').length,
        'Cancelled': jobs.filter(job => job.status === 'Cancelled').length
    };
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#64748b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function updateActivityFeed(recentJobs) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    
    if (recentJobs.length === 0) {
        feed.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }
    
    feed.innerHTML = recentJobs.map(job => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${getStatusColor(job.status)}; color: white;">
                ${getStatusIcon(job.status)}
            </div>
            <div class="activity-content">
                <div class="activity-title">${job.customer_name || 'Unknown'} - ${job.service_name || 'Service'}</div>
                <div class="activity-time">${formatTime(job.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function addActivityItem(title, description, icon) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'activity-item';
    newItem.innerHTML = `
        <div class="activity-icon" style="background: #2563eb; color: white;">${icon}</div>
        <div class="activity-content">
            <div class="activity-title">${title}</div>
            <div class="activity-time">${description}</div>
        </div>
    `;
    
    feed.insertBefore(newItem, feed.firstChild);
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

// ============================================
// CUSTOMERS
// ============================================
async function loadCustomers() {
    try {
        console.log('🔄 Loading customers...');
        showLoading('customers-list');
        
        const res = await fetch(`${API_URL}/customers`, { headers: getAuthHeaders() });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const customers = Array.isArray(data) ? data : (data.data || []);
        
        const list = document.getElementById('customers-list');
        if (!list) return;
        
        if (customers.length === 0) {
            list.innerHTML = '<div class="no-data">No customers found</div>';
            return;
        }
        
        list.innerHTML = customers.map(customer => `
            <div class="customer-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${customer.name || 'Unknown'}</h3>
                    <span class="status-badge status-active">Active</span>
                </div>
                <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewCustomerDetails(${customer.id})">View</button>
                    <button class="btn-small" onclick="editCustomer(${customer.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('customers-list');
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        const list = document.getElementById('customers-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load customers</div>`;
    }
}

// ============================================
// JOBS
// ============================================
async function loadJobs() {
    try {
        console.log('🔄 Loading jobs...');
        showLoading('jobs-list');
        
        const res = await fetch(`${API_URL}/jobs`, { headers: getAuthHeaders() });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const jobs = await res.json();
        window.allJobs = Array.isArray(jobs) ? jobs : [];
        
        const list = document.getElementById('jobs-list');
        if (!list) return;
        
        if (jobs.length === 0) {
            list.innerHTML = '<div class="no-data">No jobs found</div>';
            return;
        }
        
        list.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${job.customer_name || 'Unknown'} - ${job.service_name || 'Service'}</h3>
                    <span class="status-badge status-${job.status.toLowerCase().replace(' ', '-')}">${job.status}</span>
                </div>
                <p><strong>Staff:</strong> ${job.staff_name || 'Unassigned'}</p>
                <p><strong>Date:</strong> ${formatDate(job.job_date)} at ${job.job_time || 'TBD'}</p>
                <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewJobDetails(${job.id})">View</button>
                    <button class="btn-small" onclick="editJob(${job.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('jobs-list');
    } catch (error) {
        console.error('❌ Error loading jobs:', error);
        const list = document.getElementById('jobs-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load jobs</div>`;
    }
}

function filterJobs(filter) {
    if (!window.allJobs) return;
    
    const list = document.getElementById('jobs-list');
    if (!list) return;
    
    let filteredJobs = window.allJobs;
    
    switch(filter) {
        case 'scheduled':
            filteredJobs = window.allJobs.filter(job => job.status === 'Scheduled');
            break;
        case 'in-progress':
            filteredJobs = window.allJobs.filter(job => job.status === 'In Progress');
            break;
        case 'completed':
            filteredJobs = window.allJobs.filter(job => job.status === 'Completed');
            break;
        case 'cancelled':
            filteredJobs = window.allJobs.filter(job => job.status === 'Cancelled');
            break;
    }
    
    if (filteredJobs.length === 0) {
        list.innerHTML = '<div class="no-data">No jobs found</div>';
        return;
    }
    
    list.innerHTML = filteredJobs.map(job => `
        <div class="job-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${job.customer_name || 'Unknown'} - ${job.service_name || 'Service'}</h3>
                <span class="status-badge status-${job.status.toLowerCase().replace(' ', '-')}">${job.status}</span>
            </div>
            <p><strong>Staff:</strong> ${job.staff_name || 'Unassigned'}</p>
            <p><strong>Date:</strong> ${formatDate(job.job_date)} at ${job.job_time || 'TBD'}</p>
            <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewJobDetails(${job.id})">View</button>
                <button class="btn-small" onclick="editJob(${job.id})">Edit</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// STAFF
// ============================================
async function loadStaff() {
    try {
        console.log('🔄 Loading staff...');
        showLoading('staff-list');
        
        const res = await fetch(`${API_URL}/staff`, { headers: getAuthHeaders() });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const staff = Array.isArray(data) ? data : (data.data || []);
        
        const list = document.getElementById('staff-list');
        if (!list) return;
        
        if (staff.length === 0) {
            list.innerHTML = '<div class="no-data">No staff found</div>';
            return;
        }
        
        list.innerHTML = staff.map(member => `
            <div class="staff-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${member.name || 'Unknown'}</h3>
                    <span class="status-badge status-${member.is_active ? 'active' : 'inactive'}">${member.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p><strong>Email:</strong> ${member.email || 'N/A'}</p>
                <p><strong>Role:</strong> ${member.role || 'Staff'}</p>
                <p><strong>Phone:</strong> ${member.phone || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewStaffDetails(${member.id})">View</button>
                    <button class="btn-small" onclick="editStaff(${member.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('staff-list');
    } catch (error) {
        console.error('❌ Error loading staff:', error);
        const list = document.getElementById('staff-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load staff</div>`;
    }
}

// ============================================
// INVOICES
// ============================================
async function loadInvoices() {
    try {
        console.log('🔄 Loading invoices...');
        showLoading('invoices-list');
        
        const res = await fetch(`${API_URL}/invoices`, { headers: getAuthHeaders() });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        window.allInvoices = Array.isArray(data) ? data : (data.data || []);
        
        const list = document.getElementById('invoices-list');
        if (!list) return;
        
        if (window.allInvoices.length === 0) {
            list.innerHTML = '<div class="no-data">No invoices found</div>';
            return;
        }
        
        list.innerHTML = window.allInvoices.map(invoice => `
            <div class="invoice-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${invoice.invoice_number || `INV-${invoice.id}`}</h3>
                    <span class="status-badge status-${invoice.status?.toLowerCase()}">${invoice.status}</span>
                </div>
                <p><strong>Customer:</strong> ${invoice.customer_name || 'N/A'}</p>
                <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
                <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewInvoiceDetails(${invoice.id})">View</button>
                    <button class="btn-small" onclick="downloadInvoice(${invoice.id})">Download</button>
                    ${invoice.status?.toLowerCase() === 'unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark Paid</button>` : ''}
                </div>
            </div>
        `).join('');
        
        hideLoading('invoices-list');
    } catch (error) {
        console.error('❌ Error loading invoices:', error);
        const list = document.getElementById('invoices-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load invoices</div>`;
    }
}

function filterInvoices(filter) {
    if (!window.allInvoices) return;
    
    const list = document.getElementById('invoices-list');
    if (!list) return;
    
    let filteredInvoices = window.allInvoices;
    
    switch(filter) {
        case 'paid':
            filteredInvoices = window.allInvoices.filter(inv => inv.status?.toLowerCase() === 'paid');
            break;
        case 'unpaid':
            filteredInvoices = window.allInvoices.filter(inv => inv.status?.toLowerCase() === 'unpaid');
            break;
    }
    
    if (filteredInvoices.length === 0) {
        list.innerHTML = '<div class="no-data">No invoices found</div>';
        return;
    }
    
    list.innerHTML = filteredInvoices.map(invoice => `
        <div class="invoice-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${invoice.invoice_number || `INV-${invoice.id}`}</h3>
                <span class="status-badge status-${invoice.status?.toLowerCase()}">${invoice.status}</span>
            </div>
            <p><strong>Customer:</strong> ${invoice.customer_name || 'N/A'}</p>
            <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
            <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewInvoiceDetails(${invoice.id})">View</button>
                <button class="btn-small" onclick="downloadInvoice(${invoice.id})">Download</button>
                ${invoice.status?.toLowerCase() === 'unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark Paid</button>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// AUTOMATIONS
// ============================================
async function loadAutomations() {
    try {
        console.log('🔄 Loading automations...');
        showLoading('automations-list');
        
        const res = await fetch(`${API_URL}/automations`, { headers: getAuthHeaders() });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const automations = await res.json();
        const list = document.getElementById('automations-list');
        if (!list) return;
        
        if (automations.length === 0) {
            list.innerHTML = '<div class="no-data">No automations found</div>';
            return;
        }
        
        list.innerHTML = automations.map(automation => `
            <div class="automation-card">
                <h3>${automation.trigger_event}</h3>
                <p><strong>Channel:</strong> ${automation.channel}</p>
                <p><strong>Message:</strong> ${automation.message_template.substring(0, 100)}...</p>
                <p><strong>Status:</strong> <span class="status-badge ${automation.enabled ? 'status-active' : 'status-inactive'}">${automation.enabled ? 'Enabled' : 'Disabled'}</span></p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="editAutomation(${automation.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('automations-list');
    } catch (error) {
        console.error('❌ Error loading automations:', error);
        const list = document.getElementById('automations-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load automations</div>`;
    }
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    console.log('✓ Settings loaded');
}

// ============================================
// FORM HANDLERS
// ============================================
document.getElementById('create-job-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        customer_id: parseInt(document.getElementById('job-customer').value),
        service_id: parseInt(document.getElementById('job-service').value),
        assigned_to: parseInt(document.getElementById('job-staff').value) || null,
        job_date: document.getElementById('job-date').value,
        job_time: document.getElementById('job-time').value,
        location: document.getElementById('job-location').value,
        notes: document.getElementById('job-notes').value
    };
    
    try {
        const res = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Job created successfully!', 'success');
            closeModal('create-job-modal');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        } else {
            showNotification('Failed to create job', 'error');
        }
    } catch (error) {
        console.error('Error creating job:', error);
        showNotification('Error creating job', 'error');
    }
});

document.getElementById('add-customer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        email: document.getElementById('customer-email').value,
        address: document.getElementById('customer-address').value,
        notes: document.getElementById('customer-notes').value
    };
    
    try {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Customer added successfully!', 'success');
            closeModal('add-customer-modal');
            if (currentSection === 'customers') loadCustomers();
        } else {
            showNotification('Failed to add customer', 'error');
        }
    } catch (error) {
        console.error('Error adding customer:', error);
        showNotification('Error adding customer', 'error');
    }
});

document.getElementById('add-staff-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('staff-name').value,
        email: document.getElementById('staff-email').value,
        phone: document.getElementById('staff-phone').value,
        role: document.getElementById('staff-role').value,
        password: document.getElementById('staff-password').value
    };
    
    try {
        const res = await fetch(`${API_URL}/staff`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Staff member added successfully!', 'success');
            closeModal('add-staff-modal');
            if (currentSection === 'staff') loadStaff();
        } else {
            const error = await res.json();
            showNotification(`Failed: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding staff:', error);
        showNotification('Error adding staff', 'error');
    }
});

document.getElementById('create-invoice-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        job_id: document.getElementById('invoice-job').value,
        amount: parseFloat(document.getElementById('invoice-amount').value),
        notes: document.getElementById('invoice-notes').value
    };
    
    try {
        const res = await fetch(`${API_URL}/invoices/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Invoice created successfully!', 'success');
            closeModal('create-invoice-modal');
            loadInvoices();
        } else {
            const error = await res.json();
            showNotification(`Failed: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        showNotification('Error creating invoice', 'error');
    }
});

document.getElementById('add-automation-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        trigger_event: document.getElementById('automation-trigger').value,
        channel: document.getElementById('automation-channel').value,
        message_template: document.getElementById('automation-message').value,
        enabled: document.getElementById('automation-enabled').checked
    };
    
    try {
        const res = await fetch(`${API_URL}/automations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Automation added successfully!', 'success');
            closeModal('add-automation-modal');
            if (currentSection === 'automations') loadAutomations();
        } else {
            const error = await res.json();
            showNotification(`Failed: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding automation:', error);
        showNotification('Error adding automation', 'error');
    }
});

// ============================================
// ACTION HANDLERS
// ============================================
async function markAsPaid(invoiceId) {
    if (!confirm('Mark this invoice as paid?')) return;
    
    try {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/pay`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            showNotification('Invoice marked as paid!', 'success');
            loadInvoices();
        } else {
            showNotification('Failed to mark invoice as paid', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error marking invoice as paid', 'error');
    }
}

async function markJobCompleted(jobId) {
    if (!confirm('Mark this job as completed?')) return;
    
    try {
        const res = await fetch(`${API_URL}/jobs/${jobId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'Completed' })
        });
        
        if (res.ok) {
            showNotification('Job marked as completed!', 'success');
            closeModal('view-details-modal');
            if (currentSection === 'jobs') loadJobs();
            if (currentSection === 'dashboard') loadDashboard();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error marking job as completed', 'error');
    }
}

function markJobCancelled(jobId) {
    if (!confirm('Cancel this job?')) return;
    
    fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Cancelled' })
    })
    .then(res => res.json())
    .then(data => {
        showNotification('Job cancelled!', 'success');
        closeModal('view-details-modal');
        if (currentSection === 'jobs') loadJobs();
    })
    .catch(error => showNotification('Error cancelling job', 'error'));
}

async function downloadInvoice(invoiceId) {
    window.open(`${API_URL}/invoices/${invoiceId}/pdf`, '_blank');
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getStatusColor(status) {
    const colors = {
        'Scheduled': '#2563eb',
        'In Progress': '#f59e0b',
        'Completed': '#10b981',
        'Cancelled': '#64748b'
    };
    return colors[status] || '#64748b';
}

function getStatusIcon(status) {
    const icons = {
        'Scheduled': '📅',
        'In Progress': '⏰',
        'Completed': '✅',
        'Cancelled': '❌'
    };
    return icons[status] || '📋';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function showLoading(section) {
    const element = document.getElementById(section);
    if (element) element.innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoading(section) {
    console.log(`✓ Loading completed: ${section}`);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 2000;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function calcTrend(current, previous) {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const pct = Math.round(((current - previous) / previous) * 100);
    return (pct >= 0 ? '+' : '') + pct + '%';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/admin/login.html';
}

// ============================================
// PLACEHOLDER FUNCTIONS (implement as needed)
// ============================================
function viewCustomerDetails(id) { console.log('View customer:', id); }
function viewJobDetails(id) { console.log('View job:', id); }
function viewStaffDetails(id) { console.log('View staff:', id); }
function viewInvoiceDetails(id) { console.log('View invoice:', id); }
function editCustomer(id) { console.log('Edit customer:', id); }
function editJob(id) { console.log('Edit job:', id); }
function editStaff(id) { console.log('Edit staff:', id); }
function editAutomation(id) { console.log('Edit automation:', id); }
function showCreateJobModal() { showModal('create-job-modal'); }
function showAddCustomerModal() { showModal('add-customer-modal'); }
function showAddStaffModal() { showModal('add-staff-modal'); }
function showAddAutomationModal() { showModal('add-automation-modal'); }
function refreshDashboard() { loadDashboard(); }

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing admin dashboard...');
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    
    initializeSocket();
    loadDashboard();
    
    const jobDateInput = document.getElementById('job-date');
    if (jobDateInput) {
        const today = new Date().toISOString().split('T')[0];
        jobDateInput.value = today;
        jobDateInput.min = today;
    }
    
    console.log('✅ Admin dashboard initialized');
});

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (currentSection === 'dashboard') {
        loadDashboard();
    }
}, 30000);