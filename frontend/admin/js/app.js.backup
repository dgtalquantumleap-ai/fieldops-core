// FieldOps Core - Modern Operations System for Stilt Heights
// PRODUCTION-READY VERSION WITH FULL FIXES
const API_URL = '/api';
let socket;
let revenueChart, statusChart;
let currentSection = 'dashboard';

// ============================================
// AUTH HEADERS - PROPERLY FIXED
// ============================================
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('⚠️ No authentication token found');
        window.location.href = '/admin/login.html';
        return {};
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

// ============================================
// SOCKET.IO INITIALIZATION
// ============================================
function initializeSocket() {
    try {
        socket = io();
        
        socket.on('connect', () => {
            console.log('🔌 Connected to Stilt Heights Operations System');
            socket.emit('join-room', 'admin');
        });
        
        socket.on('new-booking', (data) => {
            console.log('📅 New booking received:', data);
            showNotification('New booking received!', 'success');
            if (currentSection === 'dashboard') loadDashboard();
            if (data && data.customer && data.job) {
                addActivityItem('New Booking', `${data.customer.name || 'Unknown'} - ${data.job.service_name || 'Service'}`, '📅');
            }
        });
        
        socket.on('job-updated', (data) => {
            console.log('🔄 Job updated:', data);
            if (currentSection === 'dashboard') loadDashboard();
            if (currentSection === 'jobs') loadJobs();
            if (data && data.job) {
                addActivityItem('Job Updated', `Status changed to ${data.job.status || 'Unknown'}`, '🔄');
            }
        });
    } catch (err) {
        console.error('❌ Socket.io initialization failed:', err);
    }
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionName) {
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        if (section) section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionName);
    if (targetSection) targetSection.classList.add('active');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item) item.classList.remove('active');
    });
    const navItem = document.querySelector(`[href="#${sectionName}"]`);
    if (navItem) navItem.classList.add('active');
    
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
    if (sidebar) sidebar.classList.toggle('active');
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        console.log('🔄 Loading dashboard...');
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return; // Auth failed
        
        const [jobsRes, invoicesRes, customersRes] = await Promise.all([
            fetch(`${API_URL}/jobs`, { headers }),
            fetch(`${API_URL}/invoices`, { headers }),
            fetch(`${API_URL}/customers`, { headers })
        ]);
        
        const jobsData = await jobsRes.json();
        const jobs = Array.isArray(jobsData) ? jobsData : (jobsData.data || []);
        
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
        
        const todayJobs = jobs.filter(job => job && job.job_date === today);
        const yesterdayJobs = jobs.filter(job => job && job.job_date === yesterday);
        const pendingJobs = jobs.filter(job => job && job.status === 'Scheduled');
        const completedJobs = jobs.filter(job => job && job.status === 'Completed');
        
        // Handle invoice status case-insensitivity with null checks
        const paidInvoices = invoices.filter(inv => 
            inv && inv.status && inv.status.toLowerCase() === 'paid'
        );
        const unpaidInvoices = invoices.filter(inv => 
            inv && inv.status && inv.status.toLowerCase() === 'unpaid'
        );
        
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        // Update stats with null checks
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
        showNotification('Failed to load dashboard', 'error');
    }
}

function updateStatWithAnimation(elementId, value, trend = null) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ Element not found: ${elementId}`);
        return;
    }
    
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
    if (!ctx) {
        console.warn('⚠️ Revenue chart element not found');
        return;
    }
    
    const last7Days = [];
    const revenueData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = (invoices || [])
            .filter(inv => inv && inv.status && inv.status.toLowerCase() === 'paid' && 
                          inv.issued_at && inv.issued_at.startsWith(dateStr))
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        revenueData.push(dayRevenue);
    }
    
    if (revenueChart) revenueChart.destroy();
    
    try {
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
    } catch (err) {
        console.error('❌ Chart.js error:', err);
    }
}

function updateStatusChart(jobs) {
    const ctx = document.getElementById('status-chart');
    if (!ctx) {
        console.warn('⚠️ Status chart element not found');
        return;
    }
    
    const statusCounts = {
        'Scheduled': (jobs || []).filter(job => job && job.status === 'Scheduled').length,
        'In Progress': (jobs || []).filter(job => job && job.status === 'In Progress').length,
        'Completed': (jobs || []).filter(job => job && job.status === 'Completed').length,
        'Cancelled': (jobs || []).filter(job => job && job.status === 'Cancelled').length
    };
    
    if (statusChart) statusChart.destroy();
    
    try {
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
    } catch (err) {
        console.error('❌ Chart.js error:', err);
    }
}

function updateActivityFeed(recentJobs) {
    const feed = document.getElementById('activity-feed');
    if (!feed) {
        console.warn('⚠️ Activity feed element not found');
        return;
    }
    
    if (!recentJobs || recentJobs.length === 0) {
        feed.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }
    
    feed.innerHTML = recentJobs.map(job => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${getStatusColor(job && job.status ? job.status : 'Unknown')}; color: white;">
                ${getStatusIcon(job && job.status ? job.status : 'Unknown')}
            </div>
            <div class="activity-content">
                <div class="activity-title">${(job && job.customer_name) || 'Unknown'} - ${(job && job.service_name) || 'Service'}</div>
                <div class="activity-time">${formatTime(job && job.created_at ? job.created_at : '')}</div>
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
            <div class="activity-title">${title || 'Activity'}</div>
            <div class="activity-time">${description || 'No description'}</div>
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
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/customers`, { headers });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const customers = Array.isArray(data) ? data : (data && data.data) ? data.data : [];
        
        const list = document.getElementById('customers-list');
        if (!list) return;
        
        if (customers.length === 0) {
            list.innerHTML = '<div class="no-data">No customers found</div>';
            return;
        }
        
        list.innerHTML = customers.map(customer => `
            <div class="customer-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${(customer && customer.name) || 'Unknown'}</h3>
                    <span class="status-badge status-active">Active</span>
                </div>
                <p><strong>Phone:</strong> ${(customer && customer.phone) || 'N/A'}</p>
                <p><strong>Email:</strong> ${(customer && customer.email) || 'N/A'}</p>
                <p><strong>Address:</strong> ${(customer && customer.address) || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewCustomerDetails(${customer && customer.id ? customer.id : 0})">View</button>
                    <button class="btn-small" onclick="editCustomer(${customer && customer.id ? customer.id : 0})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('customers-list');
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        const list = document.getElementById('customers-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load customers: ${error.message}</div>`;
    }
}

// ============================================
// JOBS
// ============================================
async function loadJobs() {
    try {
        console.log('🔄 Loading jobs...');
        showLoading('jobs-list');
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/jobs`, { headers });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const jobsData = await res.json();
        const jobs = Array.isArray(jobsData) ? jobsData : [];
        window.allJobs = jobs;
        
        const list = document.getElementById('jobs-list');
        if (!list) return;
        
        if (jobs.length === 0) {
            list.innerHTML = '<div class="no-data">No jobs found</div>';
            return;
        }
        
        list.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${(job && job.customer_name) || 'Unknown'} - ${(job && job.service_name) || 'Service'}</h3>
                    <span class="status-badge status-${job && job.status ? job.status.toLowerCase().replace(' ', '-') : 'unknown'}">${(job && job.status) || 'Unknown'}</span>
                </div>
                <p><strong>Staff:</strong> ${(job && job.staff_name) || 'Unassigned'}</p>
                <p><strong>Date:</strong> ${formatDate(job && job.job_date ? job.job_date : '')} at ${(job && job.job_time) || 'TBD'}</p>
                <p><strong>Location:</strong> ${(job && job.location) || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewJobDetails(${job && job.id ? job.id : 0})">View</button>
                    <button class="btn-small" onclick="editJob(${job && job.id ? job.id : 0})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('jobs-list');
    } catch (error) {
        console.error('❌ Error loading jobs:', error);
        const list = document.getElementById('jobs-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load jobs: ${error.message}</div>`;
    }
}

function filterJobs(filter) {
    if (!window.allJobs || window.allJobs.length === 0) {
        console.warn('⚠️ No jobs data available');
        return;
    }
    
    const list = document.getElementById('jobs-list');
    if (!list) return;
    
    let filteredJobs = window.allJobs;
    
    switch(filter) {
        case 'scheduled':
            filteredJobs = window.allJobs.filter(job => job && job.status === 'Scheduled');
            break;
        case 'in-progress':
            filteredJobs = window.allJobs.filter(job => job && job.status === 'In Progress');
            break;
        case 'completed':
            filteredJobs = window.allJobs.filter(job => job && job.status === 'Completed');
            break;
        case 'cancelled':
            filteredJobs = window.allJobs.filter(job => job && job.status === 'Cancelled');
            break;
    }
    
    if (filteredJobs.length === 0) {
        list.innerHTML = '<div class="no-data">No jobs found</div>';
        return;
    }
    
    list.innerHTML = filteredJobs.map(job => `
        <div class="job-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${(job && job.customer_name) || 'Unknown'} - ${(job && job.service_name) || 'Service'}</h3>
                <span class="status-badge status-${job && job.status ? job.status.toLowerCase().replace(' ', '-') : 'unknown'}">${(job && job.status) || 'Unknown'}</span>
            </div>
            <p><strong>Staff:</strong> ${(job && job.staff_name) || 'Unassigned'}</p>
            <p><strong>Date:</strong> ${formatDate(job && job.job_date ? job.job_date : '')} at ${(job && job.job_time) || 'TBD'}</p>
            <p><strong>Location:</strong> ${(job && job.location) || 'N/A'}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewJobDetails(${job && job.id ? job.id : 0})">View</button>
                <button class="btn-small" onclick="editJob(${job && job.id ? job.id : 0})">Edit</button>
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
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/staff`, { headers });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const staff = Array.isArray(data) ? data : (data && data.data) ? data.data : [];
        
        const list = document.getElementById('staff-list');
        if (!list) return;
        
        if (staff.length === 0) {
            list.innerHTML = '<div class="no-data">No staff found</div>';
            return;
        }
        
        list.innerHTML = staff.map(member => `
            <div class="staff-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${(member && member.name) || 'Unknown'}</h3>
                    <span class="status-badge status-${member && member.is_active ? 'active' : 'inactive'}">${member && member.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p><strong>Email:</strong> ${(member && member.email) || 'N/A'}</p>
                <p><strong>Role:</strong> ${(member && member.role) || 'Staff'}</p>
                <p><strong>Phone:</strong> ${(member && member.phone) || 'N/A'}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewStaffDetails(${member && member.id ? member.id : 0})">View</button>
                    <button class="btn-small" onclick="editStaff(${member && member.id ? member.id : 0})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('staff-list');
    } catch (error) {
        console.error('❌ Error loading staff:', error);
        const list = document.getElementById('staff-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load staff: ${error.message}</div>`;
    }
}

// ============================================
// INVOICES
// ============================================
async function loadInvoices() {
    try {
        console.log('🔄 Loading invoices...');
        showLoading('invoices-list');
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/invoices`, { headers });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        window.allInvoices = Array.isArray(data) ? data : (data && data.data) ? data.data : [];
        
        const list = document.getElementById('invoices-list');
        if (!list) return;
        
        if (window.allInvoices.length === 0) {
            list.innerHTML = '<div class="no-data">No invoices found</div>';
            return;
        }
        
        list.innerHTML = window.allInvoices.map(invoice => `
            <div class="invoice-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${(invoice && invoice.invoice_number) || `INV-${invoice && invoice.id ? invoice.id : 'N/A'}`}</h3>
                    <span class="status-badge status-${invoice && invoice.status ? invoice.status.toLowerCase() : 'unknown'}">${(invoice && invoice.status) || 'Unknown'}</span>
                </div>
                <p><strong>Customer:</strong> ${(invoice && invoice.customer_name) || 'N/A'}</p>
                <p><strong>Amount:</strong> $${invoice && invoice.amount ? (invoice.amount).toFixed(2) : '0.00'}</p>
                <p><strong>Issue Date:</strong> ${formatDate(invoice && invoice.issued_at ? invoice.issued_at : '')}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewInvoiceDetails(${invoice && invoice.id ? invoice.id : 0})">View</button>
                    <button class="btn-small" onclick="downloadInvoice(${invoice && invoice.id ? invoice.id : 0})">Download</button>
                    ${invoice && invoice.status && invoice.status.toLowerCase() === 'unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark Paid</button>` : ''}
                </div>
            </div>
        `).join('');
        
        hideLoading('invoices-list');
    } catch (error) {
        console.error('❌ Error loading invoices:', error);
        const list = document.getElementById('invoices-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load invoices: ${error.message}</div>`;
    }
}

function filterInvoices(filter) {
    if (!window.allInvoices || window.allInvoices.length === 0) {
        console.warn('⚠️ No invoices data available');
        return;
    }
    
    const list = document.getElementById('invoices-list');
    if (!list) return;
    
    let filteredInvoices = window.allInvoices;
    
    switch(filter) {
        case 'paid':
            filteredInvoices = window.allInvoices.filter(inv => inv && inv.status && inv.status.toLowerCase() === 'paid');
            break;
        case 'unpaid':
            filteredInvoices = window.allInvoices.filter(inv => inv && inv.status && inv.status.toLowerCase() === 'unpaid');
            break;
    }
    
    if (filteredInvoices.length === 0) {
        list.innerHTML = '<div class="no-data">No invoices found</div>';
        return;
    }
    
    list.innerHTML = filteredInvoices.map(invoice => `
        <div class="invoice-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${(invoice && invoice.invoice_number) || `INV-${invoice && invoice.id ? invoice.id : 'N/A'}`}</h3>
                <span class="status-badge status-${invoice && invoice.status ? invoice.status.toLowerCase() : 'unknown'}">${(invoice && invoice.status) || 'Unknown'}</span>
            </div>
            <p><strong>Customer:</strong> ${(invoice && invoice.customer_name) || 'N/A'}</p>
            <p><strong>Amount:</strong> $${invoice && invoice.amount ? (invoice.amount).toFixed(2) : '0.00'}</p>
            <p><strong>Issue Date:</strong> ${formatDate(invoice && invoice.issued_at ? invoice.issued_at : '')}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewInvoiceDetails(${invoice && invoice.id ? invoice.id : 0})">View</button>
                <button class="btn-small" onclick="downloadInvoice(${invoice && invoice.id ? invoice.id : 0})">Download</button>
                ${invoice && invoice.status && invoice.status.toLowerCase() === 'unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark Paid</button>` : ''}
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
        
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/automations`, { headers });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const automationsData = await res.json();
        const automations = Array.isArray(automationsData) ? automationsData : [];
        
        const list = document.getElementById('automations-list');
        if (!list) return;
        
        if (automations.length === 0) {
            list.innerHTML = '<div class="no-data">No automations found</div>';
            return;
        }
        
        list.innerHTML = automations.map(automation => `
            <div class="automation-card">
                <h3>${(automation && automation.trigger_event) || 'Unknown'}</h3>
                <p><strong>Channel:</strong> ${(automation && automation.channel) || 'N/A'}</p>
                <p><strong>Message:</strong> ${automation && automation.message_template ? automation.message_template.substring(0, 100) + '...' : 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-badge ${automation && automation.enabled ? 'status-active' : 'status-inactive'}">${automation && automation.enabled ? 'Enabled' : 'Disabled'}</span></p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="editAutomation(${automation && automation.id ? automation.id : 0})">Edit</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('automations-list');
    } catch (error) {
        console.error('❌ Error loading automations:', error);
        const list = document.getElementById('automations-list');
        if (list) list.innerHTML = `<div class="error-message">Failed to load automations: ${error.message}</div>`;
    }
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    console.log('✓ Settings page loaded');
}

// ============================================
// ACTION HANDLERS
// ============================================
async function markAsPaid(invoiceId) {
    if (!invoiceId || !confirm('Mark this invoice as paid?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/pay`, {
            method: 'PATCH',
            headers
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
    if (!jobId || !confirm('Mark this job as completed?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const res = await fetch(`${API_URL}/jobs/${jobId}/status`, {
            method: 'PATCH',
            headers,
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
    if (!jobId || !confirm('Cancel this job?')) return;
    
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    
    fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers,
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
    if (!invoiceId) return;
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
    try {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
        return 'N/A';
    }
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
        return 'N/A';
    }
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
