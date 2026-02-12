// FieldOps Core - Modern Operations System for Stilt Heights
const API_URL = '/api';
let socket;
let revenueChart, statusChart;
let currentSection = 'dashboard';

// Initialize Socket.IO for real-time updates
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔌 Connected to Stilt Heights Operations System');
        socket.emit('join-room', 'admin');
    });
    
    socket.on('new-booking', (data) => {
        console.log('📅 New booking received:', data);
        showNotification('New Stilt Heights booking received!', 'success');
        if (currentSection === 'dashboard') loadDashboard();
        addActivityItem('New Booking', `${data.customer?.name} - ${data.job?.service_name}`, '📅');
    });
    
    socket.on('job-updated', (data) => {
        console.log('🔄 Job updated:', data);
        if (currentSection === 'dashboard') loadDashboard();
        if (currentSection === 'jobs') loadJobs();
        addActivityItem('Job Updated', `Status changed to ${data.job?.status}`, '🔄');
    });
    
    socket.on('photo-uploaded', (data) => {
        console.log('📸 Photo uploaded:', data);
        addActivityItem('Photo Uploaded', `Job ${data.job_id} - ${data.media_type}`, '📸');
    });
}

// Navigation
function showSection(sectionName) {
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionName}"]`).classList.add('active');
    
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

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Dashboard Loading
async function loadDashboard() {
    try {
        console.log('🔄 Loading dashboard from:', API_URL);
        // Don't call showLoading for dashboard - it has multiple components
        
        // Load all data in parallel
        console.log('📡 Fetching dashboard data...');
        const [jobsRes, invoicesRes, customersRes] = await Promise.all([
            fetch(`${API_URL}/jobs`),
            fetch(`${API_URL}/invoices`),
            fetch(`${API_URL}/customers`)
        ]);
        
        console.log('📊 Jobs API status:', jobsRes.status);
        console.log('📊 Invoices API status:', invoicesRes.status);
        console.log('📊 Customers API status:', customersRes.status);
        
        const jobs = await jobsRes.json();
        console.log('📋 Jobs loaded:', jobs.length);
        
        // Handle invoices API (might not exist yet)
        let invoices = [];
        if (invoicesRes.ok) {
            invoices = await invoicesRes.json();
            console.log('💰 Invoices loaded:', invoices.length);
        } else {
            console.log('⚠️ Invoices API not available, using empty array');
        }
        
        // Handle customers API
        let customers = [];
        if (customersRes.ok) {
            customers = await customersRes.json();
            console.log('👥 Customers loaded:', customers.length);
        } else {
            console.log('⚠️ Customers API not available, using empty array');
        }
        
        // Calculate metrics
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const todayJobs = jobs.filter(job => job.job_date === today);
        const yesterdayJobs = jobs.filter(job => job.job_date === yesterday);
        const pendingJobs = jobs.filter(job => job.status === 'scheduled');
        const completedJobs = jobs.filter(job => job.status === 'completed');
        
        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid');
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const pendingRevenue = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        console.log('📈 Dashboard metrics calculated:');
        console.log('  Today jobs:', todayJobs.length);
        console.log('  Pending jobs:', pendingJobs.length);
        console.log('  Completed jobs:', completedJobs.length);
        console.log('  Paid invoices:', paidInvoices.length);
        console.log('  Unpaid invoices:', unpaidInvoices.length);
        console.log('  Total revenue:', totalRevenue);
        console.log('  Pending revenue:', pendingRevenue);
        
        // Update stats with animation
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
        // Don't show error for dashboard as it has multiple components
    }
}

function updateStatWithAnimation(elementId, value, trend = null) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`❌ Element not found: ${elementId}`);
        return;
    }
    
    const oldValue = element.textContent || '';
    
    if (oldValue !== value) {
        element.style.transform = 'scale(1.1)';
        element.textContent = value;
        
        // Add trend indicator if provided
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

// Chart Functions
function updateRevenueChart(jobs, invoices) {
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    
    // Generate last 7 days data
    const last7Days = [];
    const revenueData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = invoices
            .filter(inv => inv.status === 'paid' && inv.issued_at && inv.issued_at.startsWith(dateStr))
            .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        revenueData.push(dayRevenue);
    }
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
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
            plugins: {
                legend: {
                    display: false
                }
            },
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
    const ctx = document.getElementById('status-chart').getContext('2d');
    
    const statusCounts = {
        'Scheduled': jobs.filter(job => job.status === 'Scheduled').length,
        'In Progress': jobs.filter(job => job.status === 'In Progress').length,
        'Completed': jobs.filter(job => job.status === 'Completed').length,
        'Cancelled': jobs.filter(job => job.status === 'Cancelled').length
    };
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#2563eb',
                    '#f59e0b',
                    '#10b981',
                    '#64748b'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateActivityFeed(recentJobs) {
    const feed = document.getElementById('activity-feed');
    
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
    const newItem = document.createElement('div');
    newItem.className = 'activity-item';
    newItem.innerHTML = `
        <div class="activity-icon" style="background: #2563eb; color: white;">
            ${icon}
        </div>
        <div class="activity-content">
            <div class="activity-title">${title}</div>
            <div class="activity-time">${description}</div>
        </div>
    `;
    
    feed.insertBefore(newItem, feed.firstChild);
    
    // Remove old items if too many
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

// Customer Management
async function loadCustomers() {
    try {
        console.log('🔄 Loading customers...');
        showLoading('customers-list');
        
        const res = await fetch(`${API_URL}/customers`);
        console.log('📡 Customers API status:', res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        const customers = Array.isArray(data) ? data : (data.customers || []);
        console.log('👥 Customers loaded:', customers.length);
        
        const list = document.getElementById('customers-list');
        if (!list) {
            console.error('❌ customers-list element not found');
            return;
        }
        
        if (customers.length === 0) {
            list.innerHTML = '<div class="no-data">No customers found</div>';
            hideLoading('customers-list');
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
                    <button class="btn-small" onclick="viewCustomerDetails(${customer.id})">View Details</button>
                    <button class="btn-small" onclick="editCustomer(${customer.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Customers rendered successfully');
        hideLoading('customers-list');
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        const list = document.getElementById('customers-list');
        if (list) {
            list.innerHTML = `<div class="error-message">Failed to load customers: ${error.message}</div>`;
        }
    }
}

// Job Management
async function loadJobs() {
    try {
        console.log('🔄 Loading jobs from:', `${API_URL}/jobs`);
        showLoading('jobs-list');
        
        const res = await fetch(`${API_URL}/jobs`);
        console.log('📡 Jobs API response status:', res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const jobs = await res.json();
        console.log('📋 Jobs loaded:', jobs.length, 'jobs found');
        
        // Store jobs globally for filtering
        window.allJobs = Array.isArray(jobs) ? jobs : [];
        
        const list = document.getElementById('jobs-list');
        if (!list) {
            console.error('❌ jobs-list element not found');
            return;
        }
        
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
                    <button class="btn-small" onclick="viewJobDetails(${job.id})">View Details</button>
                    <button class="btn-small" onclick="editJob(${job.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Jobs rendered successfully');
        hideLoading('jobs-list');
        
        // Add filter functionality
        const filterSelect = document.getElementById('job-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                filterJobs(this.value);
            });
        }
    } catch (error) {
        console.error('❌ Error loading jobs:', error);
        showError('jobs-list', `Failed to load jobs: ${error.message}`);
    }
}

// Filter jobs
function filterJobs(filter) {
    // Store all jobs globally for filtering
    if (!window.allJobs) {
        window.allJobs = [];
        // Load all jobs if not already stored
        fetch(`${API_URL}/jobs`)
            .then(res => res.json())
            .then(data => {
                window.allJobs = Array.isArray(data) ? data : [];
                applyJobFilter(filter);
            })
            .catch(error => console.error('Error loading jobs for filtering:', error));
        return;
    }
    
    applyJobFilter(filter);
}

function applyJobFilter(filter) {
    const list = document.getElementById('jobs-list');
    if (!list || !window.allJobs) return;
    
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
        case 'all':
        default:
            filteredJobs = window.allJobs;
            break;
    }
    
    if (filteredJobs.length === 0) {
        list.innerHTML = '<div class="no-data">No jobs found for this filter</div>';
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
                <button class="btn-small" onclick="viewJobDetails(${job.id})">View Details</button>
                <button class="btn-small" onclick="editJob(${job.id})">Edit</button>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ Filtered jobs: ${filteredJobs.length} jobs shown`);
}

// Staff Management
async function loadStaff() {
    try {
        console.log('🔄 Loading staff...');
        showLoading('staff-list');
        
        const res = await fetch(`${API_URL}/staff`);
        console.log('📡 Staff API status:', res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        const staff = Array.isArray(data) ? data : (data.staff || []);
        console.log('👥 Staff loaded:', staff.length);
        
        const list = document.getElementById('staff-list');
        if (!list) {
            console.error('❌ staff-list element not found');
            return;
        }
        
        if (staff.length === 0) {
            list.innerHTML = '<div class="no-data">No staff found</div>';
            hideLoading('staff-list');
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
                    <button class="btn-small" onclick="viewStaffDetails(${member.id})">View Details</button>
                    <button class="btn-small" onclick="editStaff(${member.id})">Edit</button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Staff rendered successfully');
        hideLoading('staff-list');
    } catch (error) {
        console.error('❌ Error loading staff:', error);
        const list = document.getElementById('staff-list');
        if (list) {
            list.innerHTML = `<div class="error-message">Failed to load staff: ${error.message}</div>`;
        }
    }
}

// Invoice Management
async function loadInvoices() {
    try {
        console.log('🔄 Loading invoices...');
        showLoading('invoices-list');
        
        const res = await fetch(`${API_URL}/invoices`);
        console.log('📡 Invoices API status:', res.status);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('📊 Raw API response:', data);
        const invoices = Array.isArray(data) ? data : (data.invoices || []);
        console.log('💰 Processed invoices:', invoices.length);
        console.log('💰 Invoice sample:', invoices[0]);
        
        const list = document.getElementById('invoices-list');
        if (!list) {
            console.error('❌ invoices-list element not found');
            return;
        }
        
        if (invoices.length === 0) {
            list.innerHTML = '<div class="no-data">No invoices found</div>';
            hideLoading('invoices-list');
            return;
        }
        
        list.innerHTML = invoices.map(invoice => `
            <div class="invoice-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${invoice.invoice_number || `INV-${invoice.id}`}</h3>
                    <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                </div>
                <p><strong>Customer:</strong> ${invoice.customer_name || 'N/A'}</p>
                <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
                <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
                <p><strong>Job Date:</strong> ${formatDate(invoice.job_date)}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="viewInvoiceDetails(${invoice.id})">View Details</button>
                    <button class="btn-small" onclick="downloadInvoice(${invoice.id})">Download</button>
                    ${invoice.status === 'Unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark as Paid</button>` : ''}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Invoices rendered successfully');
        hideLoading('invoices-list');
        
        // Add filter functionality
        const filterSelect = document.getElementById('invoice-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                filterInvoices(this.value);
            });
        }
    } catch (error) {
        console.error('❌ Error loading invoices:', error);
        const list = document.getElementById('invoices-list');
        if (list) {
            list.innerHTML = `<div class="error-message">Failed to load invoices: ${error.message}</div>`;
        }
    }
}

// Filter invoices
function filterInvoices(filter) {
    // Store all invoices globally for filtering
    if (!window.allInvoices) {
        window.allInvoices = [];
        // Load all invoices if not already stored
        fetch(`${API_URL}/invoices`)
            .then(res => res.json())
            .then(data => {
                window.allInvoices = Array.isArray(data) ? data : (data.invoices || []);
                applyInvoiceFilter(filter);
            })
            .catch(error => console.error('Error loading invoices for filtering:', error));
        return;
    }
    
    applyInvoiceFilter(filter);
}

function applyInvoiceFilter(filter) {
    const list = document.getElementById('invoices-list');
    if (!list || !window.allInvoices) return;
    
    let filteredInvoices = window.allInvoices;
    
    switch(filter) {
        case 'paid':
            filteredInvoices = window.allInvoices.filter(inv => inv.status === 'Paid');
            break;
        case 'unpaid':
            filteredInvoices = window.allInvoices.filter(inv => inv.status === 'Unpaid');
            break;
        case 'all':
        default:
            filteredInvoices = window.allInvoices;
            break;
    }
    
    if (filteredInvoices.length === 0) {
        list.innerHTML = '<div class="no-data">No invoices found for this filter</div>';
        return;
    }
    
    list.innerHTML = filteredInvoices.map(invoice => `
        <div class="invoice-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3>${invoice.invoice_number || `INV-${invoice.id}`}</h3>
                <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
            </div>
            <p><strong>Customer:</strong> ${invoice.customer_name || 'N/A'}</p>
            <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
            <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
            <p><strong>Job Date:</strong> ${formatDate(invoice.job_date)}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-small" onclick="viewInvoiceDetails(${invoice.id})">View Details</button>
                <button class="btn-small" onclick="downloadInvoice(${invoice.id})">Download</button>
                ${invoice.status === 'Unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark as Paid</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Show Create Invoice Modal
function showCreateInvoiceModal() {
    showModal('create-invoice-modal');
    loadInvoiceFormOptions();
}

// Load options for invoice form
async function loadInvoiceFormOptions() {
    try {
        // Load completed jobs that don't have invoices yet
        const jobsRes = await fetch(`${API_URL}/jobs`);
        const jobs = await jobsRes.json();
        
        // Get existing invoices to exclude jobs that already have invoices
        const invoicesRes = await fetch(`${API_URL}/invoices`);
        const invoices = await invoicesRes.json();
        const invoicedJobIds = invoices.map(inv => inv.job_id);
        
        // Filter completed jobs without invoices
        const availableJobs = jobs.filter(job => 
            job.status === 'Completed' && !invoicedJobIds.includes(job.id)
        );
        
        const jobSelect = document.getElementById('invoice-job');
        jobSelect.innerHTML = '<option value="">Select Completed Job</option>' + 
            availableJobs.map(job => `
                <option value="${job.id}" 
                        data-customer="${job.customer_name}" 
                        data-service="${job.service_name}" 
                        data-amount="${job.service_price || 0}">
                    ${job.customer_name} - ${job.service_name} ($${job.service_price || 0})
                </option>
            `).join('');
        
        // Add change event listener
        jobSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            document.getElementById('invoice-customer').value = selectedOption.dataset.customer || '';
            document.getElementById('invoice-service').value = selectedOption.dataset.service || '';
            document.getElementById('invoice-amount').value = selectedOption.dataset.amount || '';
        });
        
    } catch (error) {
        console.error('Error loading invoice form options:', error);
    }
}

// Add Staff Form Handler
document.getElementById('add-staff-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('staff-name').value,
        email: document.getElementById('staff-email').value,
        phone: document.getElementById('staff-phone').value,
        role: document.getElementById('staff-role').value,
        password: document.getElementById('staff-password').value,
        notes: document.getElementById('staff-notes').value
    };
    
    try {
        const res = await fetch(`${API_URL}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Staff member added successfully!', 'success');
            closeModal('add-staff-modal');
            if (currentSection === 'staff') loadStaff();
        } else {
            const error = await res.json();
            showNotification(`Failed to add staff: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding staff:', error);
        showNotification('Error adding staff', 'error');
    }
});

// Add Automation Form Handler
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Automation added successfully!', 'success');
            closeModal('add-automation-modal');
            if (currentSection === 'automations') loadAutomations();
        } else {
            const error = await res.json();
            showNotification(`Failed to add automation: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding automation:', error);
        showNotification('Error adding automation', 'error');
    }
});

// Create Invoice Form Handler
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            showNotification('Invoice created successfully!', 'success');
            closeModal('create-invoice-modal');
            loadInvoices(); // Refresh invoice list
        } else {
            const error = await res.json();
            showNotification(`Failed to create invoice: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        showNotification('Error creating invoice', 'error');
    }
});

// Mark Invoice as Paid
async function markAsPaid(invoiceId) {
    if (!confirm('Mark this invoice as paid?')) return;
    
    try {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/pay`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            showNotification('Invoice marked as paid!', 'success');
            loadInvoices(); // Refresh invoice list
        } else {
            showNotification('Failed to mark invoice as paid', 'error');
        }
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        showNotification('Error marking invoice as paid', 'error');
    }
}

// View Customer Details
function viewCustomerDetails(customerId) {
    console.log(`👤 Viewing customer details for ID: ${customerId}`);
    
    // Fetch customer details including job history and invoices
    Promise.all([
        fetch(`${API_URL}/customers/${customerId}`),
        fetch(`${API_URL}/jobs?customer_id=${customerId}`),
        fetch(`${API_URL}/invoices?customer_id=${customerId}`)
    ]).then(([customerRes, jobsRes, invoicesRes]) => {
        if (!customerRes.ok) {
            showNotification('Failed to load customer details', 'error');
            return;
        }
        
        return Promise.all([
            customerRes.json(),
            jobsRes.ok ? jobsRes.json() : [],
            invoicesRes.ok ? invoicesRes.json() : []
        ]);
    }).then(([customer, jobs, invoices]) => {
        // Create detailed view modal
        const modalContent = `
            <div class="modal-header">
                <h3>Customer Details</h3>
                <button class="close-btn" onclick="closeModal('view-details-modal')">×</button>
            </div>
            <div class="modal-body">
                <div class="customer-details">
                    <div class="detail-section">
                        <h4>Customer Information</h4>
                        <p><strong>Name:</strong> ${customer.name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                        <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
                        <p><strong>Notes:</strong> ${customer.notes || 'N/A'}</p>
                        <p><strong>Created:</strong> ${formatDate(customer.created_at)}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Job History (${jobs.length} jobs)</h4>
                        ${jobs.length === 0 ? '<p>No jobs found</p>' : jobs.map(job => `
                            <div class="job-item">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span class="status-badge status-${job.status.toLowerCase().replace(' ', '-')}">${job.status}</span>
                                    <span class="job-date">${formatDate(job.job_date)} at ${job.job_time || 'TBD'}</span>
                                </div>
                                <p><strong>Service:</strong> ${job.service_name || 'N/A'}</p>
                                <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
                                <p><strong>Notes:</strong> ${job.notes || 'N/A'}</p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="detail-section">
                        <h4>Invoices (${invoices.length} invoices)</h4>
                        ${invoices.length === 0 ? '<p>No invoices found</p>' : invoices.map(invoice => `
                            <div class="invoice-item">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                                    <span class="invoice-number">${invoice.invoice_number || `INV-${invoice.id}`}</span>
                                </div>
                                <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
                                <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
                                <p><strong>Job Date:</strong> ${formatDate(invoice.job_date)}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('view-details-modal')">Close</button>
            </div>
        `;
        
        // Create modal if it doesn't exist
        if (!document.getElementById('view-details-modal')) {
            const modal = document.createElement('div');
            modal.id = 'view-details-modal';
            modal.className = 'modal';
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
        } else {
            document.getElementById('view-details-modal').innerHTML = modalContent;
        }
        
        showModal('view-details-modal');
    }).catch(error => {
        console.error('Error loading customer details:', error);
        showNotification('Failed to load customer details', 'error');
    });
}

// View Job Details
function viewJobDetails(jobId) {
    console.log(`📋 Viewing job details for ID: ${jobId}`);
    
    fetch(`${API_URL}/jobs/${jobId}`)
        .then(response => response.json())
        .then(job => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Job Details</h3>
                    <button class="close-btn" onclick="closeModal('view-details-modal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="job-details">
                        <div class="detail-section">
                            <h4>Job Information</h4>
                            <p><strong>Customer:</strong> ${job.customer_name || 'N/A'}</p>
                            <p><strong>Service:</strong> ${job.service_name || 'N/A'}</p>
                            <p><strong>Staff:</strong> ${job.staff_name || 'Unassigned'}</p>
                            <p><strong>Date:</strong> ${formatDate(job.job_date)} at ${job.job_time || 'TBD'}</p>
                            <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${job.status.toLowerCase().replace(' ', '-')}">${job.status}</span></p>
                            <p><strong>Notes:</strong> ${job.notes || 'N/A'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Actions</h4>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-small" onclick="editJob(${job.id})">Edit Job</button>
                                <button class="btn-small btn-success" onclick="markJobCompleted(${job.id})">Mark Completed</button>
                                <button class="btn-small btn-danger" onclick="markJobCancelled(${job.id})">Cancel Job</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('view-details-modal')">Close</button>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('view-details-modal')) {
                const modal = document.createElement('div');
                modal.id = 'view-details-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('view-details-modal').innerHTML = modalContent;
            }
            
            showModal('view-details-modal');
        })
        .catch(error => {
            console.error('Error loading job details:', error);
            showNotification('Failed to load job details', 'error');
        });
}

// View Staff Details
function viewStaffDetails(staffId) {
    console.log(`👤 Viewing staff details for ID: ${staffId}`);
    
    fetch(`${API_URL}/staff/${staffId}`)
        .then(response => response.json())
        .then(staff => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Staff Details</h3>
                    <button class="close-btn" onclick="closeModal('view-details-modal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="staff-details">
                        <div class="detail-section">
                            <h4>Staff Information</h4>
                            <p><strong>Name:</strong> ${staff.name || 'N/A'}</p>
                            <p><strong>Email:</strong> ${staff.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${staff.phone || 'N/A'}</p>
            <p><strong>Role:</strong> ${staff.role || 'Staff'}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${staff.is_active ? 'active' : 'inactive'}">${staff.is_active ? 'Active' : 'Inactive'}</span></p>
                            <p><strong>Created:</strong> ${formatDate(staff.created_at)}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Actions</h4>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-small" onclick="editStaff(${staff.id})">Edit Staff</button>
                                <button class="btn-small ${staff.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleStaffStatus(${staff.id})">${staff.is_active ? 'Deactivate' : 'Activate'}</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('view-details-modal')">Close</button>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('view-details-modal')) {
                const modal = document.createElement('div');
                modal.id = 'view-details-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('view-details-modal').innerHTML = modalContent;
            }
            
            showModal('view-details-modal');
        })
        .catch(error => {
            console.error('Error loading staff details:', error);
            showNotification('Failed to load staff details', 'error');
        });
}

// View Invoice Details
function viewInvoiceDetails(invoiceId) {
    console.log(`💰 Viewing invoice details for ID: ${invoiceId}`);
    
    fetch(`${API_URL}/invoices/${invoiceId}`)
        .then(response => response.json())
        .then(invoice => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Invoice Details</h3>
                    <button class="close-btn" onclick="closeModal('view-details-modal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="invoice-details">
                        <div class="detail-section">
                            <h4>Invoice Information</h4>
                            <p><strong>Invoice Number:</strong> ${invoice.invoice_number || `INV-${invoice.id}`}</p>
                            <p><strong>Customer:</strong> ${invoice.customer_name || 'N/A'}</p>
                            <p><strong>Amount:</strong> $${(invoice.amount || 0).toFixed(2)}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span></p>
                            <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_at)}</p>
                            <p><strong>Job Date:</strong> ${formatDate(invoice.job_date)}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Actions</h4>
                            <div style="display: flex; gap: 0.5rem;">
                                ${invoice.status === 'Unpaid' ? `<button class="btn-small btn-success" onclick="markAsPaid(${invoice.id})">Mark as Paid</button>` : ''}
                                <button class="btn-small" onclick="downloadInvoice(${invoice.id})">Download PDF</button>
                                <button class="btn-small" onclick="editInvoice(${invoice.id})">Edit Invoice</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('view-details-modal')">Close</button>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('view-details-modal')) {
                const modal = document.createElement('div');
                modal.id = 'view-details-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('view-details-modal').innerHTML = modalContent;
            }
            
            showModal('view-details-modal');
        })
        .catch(error => {
            console.error('Error loading invoice details:', error);
            showNotification('Failed to load invoice details', 'error');
        });
}

// Edit Functions
function editCustomer(customerId) {
    console.log(`✏️ Editing customer ID: ${customerId}`);
    
    // Fetch customer data and populate edit modal
    fetch(`${API_URL}/customers/${customerId}`)
        .then(response => response.json())
        .then(customer => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Edit Customer</h3>
                    <button class="close-btn" onclick="closeModal('edit-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="edit-customer-form">
                        <input type="hidden" id="edit-customer-id" value="${customer.id}">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="edit-customer-name" value="${customer.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="edit-customer-email" value="${customer.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="edit-customer-phone" value="${customer.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="edit-customer-address" value="${customer.address || ''}">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="edit-customer-notes" rows="3">${customer.notes || ''}</textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('edit-modal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Customer</button>
                        </div>
                    </form>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('edit-modal')) {
                const modal = document.createElement('div');
                modal.id = 'edit-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('edit-modal').innerHTML = modalContent;
            }
            
            // Add form handler
            document.getElementById('edit-customer-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    name: document.getElementById('edit-customer-name').value,
                    email: document.getElementById('edit-customer-email').value,
                    phone: document.getElementById('edit-customer-phone').value,
                    address: document.getElementById('edit-customer-address').value,
                    notes: document.getElementById('edit-customer-notes').value
                };
                
                try {
                    const response = await fetch(`${API_URL}/customers/${customerId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        showNotification('Customer updated successfully!', 'success');
                        closeModal('edit-modal');
                        if (currentSection === 'customers') loadCustomers();
                    } else {
                        const error = await response.json();
                        showNotification(`Failed to update customer: ${error.error}`, 'error');
                    }
                } catch (error) {
                    console.error('Error updating customer:', error);
                    showNotification('Error updating customer', 'error');
                }
            });
            
            showModal('edit-modal');
        })
        .catch(error => {
            console.error('Error loading customer for edit:', error);
            showNotification('Failed to load customer details', 'error');
        });
}

function editJob(jobId) {
    console.log(`✏️ Editing job ID: ${jobId}`);
    
    fetch(`${API_URL}/jobs/${jobId}`)
        .then(response => response.json())
        .then(job => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Edit Job</h3>
                    <button class="close-btn" onclick="closeModal('edit-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="edit-job-form">
                        <input type="hidden" id="edit-job-id" value="${job.id}">
                        <div class="form-group">
                            <label>Customer *</label>
                            <select id="edit-job-customer" required>
                                <option value="">Select Customer</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Service *</label>
                            <select id="edit-job-service" required>
                                <option value="">Select Service</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Staff</label>
                            <select id="edit-job-staff">
                                <option value="">Select Staff</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date *</label>
                            <input type="date" id="edit-job-date" value="${job.job_date}" required>
                        </div>
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" id="edit-job-time" value="${job.job_time || ''}">
                        </div>
                        <div class="form-group">
                            <label>Location</label>
                            <input type="text" id="edit-job-location" value="${job.location || ''}">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="edit-job-status">
                                <option value="Scheduled" ${job.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="In Progress" ${job.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${job.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${job.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="edit-job-notes" rows="3">${job.notes || ''}</textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('edit-modal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Job</button>
                        </div>
                    </form>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('edit-modal')) {
                const modal = document.createElement('div');
                modal.id = 'edit-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('edit-modal').innerHTML = modalContent;
            }
            
            // Load form options
            loadJobFormOptions('edit');
            
            // Set current values
            setTimeout(() => {
                document.getElementById('edit-job-customer').value = job.customer_id || '';
                document.getElementById('edit-job-service').value = job.service_id || '';
                document.getElementById('edit-job-staff').value = job.assigned_to || '';
            }, 500);
            
            // Add form handler
            document.getElementById('edit-job-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    customer_id: parseInt(document.getElementById('edit-job-customer').value),
                    service_id: parseInt(document.getElementById('edit-job-service').value),
                    assigned_to: parseInt(document.getElementById('edit-job-staff').value) || null,
                    job_date: document.getElementById('edit-job-date').value,
                    job_time: document.getElementById('edit-job-time').value,
                    location: document.getElementById('edit-job-location').value,
                    status: document.getElementById('edit-job-status').value,
                    notes: document.getElementById('edit-job-notes').value
                };
                
                try {
                    const response = await fetch(`${API_URL}/jobs/${jobId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        showNotification('Job updated successfully!', 'success');
                        closeModal('edit-modal');
                        if (currentSection === 'jobs') loadJobs();
                        if (currentSection === 'dashboard') loadDashboard();
                    } else {
                        const error = await response.json();
                        showNotification(`Failed to update job: ${error.error}`, 'error');
                    }
                } catch (error) {
                    console.error('Error updating job:', error);
                    showNotification('Error updating job', 'error');
                }
            });
            
            showModal('edit-modal');
        })
        .catch(error => {
            console.error('Error loading job for edit:', error);
            showNotification('Failed to load job details', 'error');
        });
}

function editStaff(staffId) {
    console.log(`✏️ Editing staff ID: ${staffId}`);
    
    fetch(`${API_URL}/staff/${staffId}`)
        .then(response => response.json())
        .then(staff => {
            const modalContent = `
                <div class="modal-header">
                    <h3>Edit Staff Member</h3>
                    <button class="close-btn" onclick="closeModal('edit-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="edit-staff-form">
                        <input type="hidden" id="edit-staff-id" value="${staff.id}">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="edit-staff-name" value="${staff.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="edit-staff-email" value="${staff.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="edit-staff-phone" value="${staff.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="edit-staff-role">
                                <option value="staff" ${staff.role === 'staff' ? 'selected' : ''}>Staff</option>
                                <option value="manager" ${staff.role === 'manager' ? 'selected' : ''}>Manager</option>
                                <option value="admin" ${staff.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="edit-staff-status">
                                <option value="1" ${staff.is_active ? 'selected' : ''}>Active</option>
                                <option value="0" ${!staff.is_active ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="edit-staff-notes" rows="3">${staff.notes || ''}</textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('edit-modal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Staff</button>
                        </div>
                    </form>
                </div>
            `;
            
            // Create modal if it doesn't exist
            if (!document.getElementById('edit-modal')) {
                const modal = document.createElement('div');
                modal.id = 'edit-modal';
                modal.className = 'modal';
                modal.innerHTML = modalContent;
                document.body.appendChild(modal);
            } else {
                document.getElementById('edit-modal').innerHTML = modalContent;
            }
            
            // Add form handler
            document.getElementById('edit-staff-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    name: document.getElementById('edit-staff-name').value,
                    email: document.getElementById('edit-staff-email').value,
                    phone: document.getElementById('edit-staff-phone').value,
                    role: document.getElementById('edit-staff-role').value,
                    is_active: document.getElementById('edit-staff-status').value === '1',
                    notes: document.getElementById('edit-staff-notes').value
                };
                
                try {
                    const response = await fetch(`${API_URL}/staff/${staffId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        showNotification('Staff updated successfully!', 'success');
                        closeModal('edit-modal');
                        if (currentSection === 'staff') loadStaff();
                    } else {
                        const error = await response.json();
                        showNotification(`Failed to update staff: ${error.error}`, 'error');
                    }
                } catch (error) {
                    console.error('Error updating staff:', error);
                    showNotification('Error updating staff', 'error');
                }
            });
            
            showModal('edit-modal');
        })
        .catch(error => {
            console.error('Error loading staff for edit:', error);
            showNotification('Failed to load staff details', 'error');
        });
}

function editInvoice(invoiceId) {
    console.log(`✏️ Editing invoice ID: ${invoiceId}`);
    showNotification('Invoice editing coming soon', 'info');
}

// Action Functions
function markJobCompleted(jobId) {
    if (!confirm('Mark this job as completed?')) return;
    
    fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Job marked as completed!', 'success');
        closeModal('view-details-modal');
        if (currentSection === 'jobs') loadJobs();
        if (currentSection === 'dashboard') loadDashboard();
    })
    .catch(error => {
        console.error('Error marking job as completed:', error);
        showNotification('Error marking job as completed', 'error');
    });
}

function markJobCancelled(jobId) {
    if (!confirm('Cancel this job?')) return;
    
    fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Job cancelled!', 'success');
        closeModal('view-details-modal');
        if (currentSection === 'jobs') loadJobs();
        if (currentSection === 'dashboard') loadDashboard();
    })
    .catch(error => {
        console.error('Error cancelling job:', error);
        showNotification('Error cancelling job', 'error');
    });
}

function toggleStaffStatus(staffId) {
    const action = event.target.textContent;
    if (!confirm(`${action} this staff member?`)) return;
    
    // Get current staff status and toggle it
    fetch(`${API_URL}/staff/${staffId}`)
        .then(response => response.json())
        .then(staff => {
            const newStatus = !staff.is_active;
            
            return fetch(`${API_URL}/staff/${staffId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newStatus })
            });
        })
        .then(response => response.json())
        .then(data => {
            showNotification(`Staff ${newStatus ? 'activated' : 'deactivated'}!`, 'success');
            closeModal('view-details-modal');
            if (currentSection === 'staff') loadStaff();
        })
        .catch(error => {
            console.error('Error toggling staff status:', error);
            showNotification('Error updating staff status', 'error');
        });
}

// Automations Management
async function loadAutomations() {
    try {
        showLoading('automations-list');
        const res = await fetch(`${API_URL}/automations`);
        const automations = await res.json();
        const list = document.getElementById('automations-list');
        
        list.innerHTML = automations.map(automation => `
            <div class="automation-card">
                <h3>${automation.trigger_event}</h3>
                <p><strong>Channel:</strong> ${automation.channel}</p>
                <p><strong>Message:</strong> ${automation.message_template.substring(0, 100)}...</p>
                <p><strong>Status:</strong> <span class="status-badge ${automation.enabled ? 'status-completed' : 'status-cancelled'}">${automation.enabled ? 'Enabled' : 'Disabled'}</span></p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="editAutomation(${automation.id})">Edit</button>
                    <button class="btn-small" onclick="toggleAutomation(${automation.id})">${automation.enabled ? 'Disable' : 'Enable'}</button>
                </div>
            </div>
        `).join('');
        
        hideLoading('automations');
    } catch (error) {
        console.error('Error loading automations:', error);
        showError('automations', 'Failed to load automations');
    }
}

// Settings
function loadSettings() {
    // Settings are loaded from the HTML
    console.log('Settings loaded');
}

// Modal Functions
function showCreateJobModal() {
    showModal('create-job-modal');
    loadJobFormOptions();
}

function showAddCustomerModal() {
    showModal('add-customer-modal');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.getElementById('modal-overlay').classList.remove('active');
}

// Form Handlers
document.getElementById('create-job-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        customer_id: document.getElementById('job-customer').value,
        service_id: document.getElementById('job-service').value,
        assigned_to: document.getElementById('job-staff').value,
        job_date: document.getElementById('job-date').value,
        job_time: document.getElementById('job-time').value,
        location: document.getElementById('job-location').value,
        notes: document.getElementById('job-notes').value
    };
    
    try {
        const res = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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

// Load form options
async function loadJobFormOptions() {
    try {
        // Load customers
        const customersRes = await fetch(`${API_URL}/customers`);
        const customers = await customersRes.json();
        const customerSelect = document.getElementById('job-customer');
        customerSelect.innerHTML = '<option value="">Select Customer</option>' + 
            customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // Load services
        const servicesRes = await fetch(`${API_URL}/booking/services`);
        const services = await servicesRes.json();
        const serviceSelect = document.getElementById('job-service');
        serviceSelect.innerHTML = '<option value="">Select Service</option>' + 
            services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        // Load staff
        const staffRes = await fetch(`${API_URL}/staff`);
        const staff = await staffRes.json();
        const staffSelect = document.getElementById('job-staff');
        staffSelect.innerHTML = '<option value="">Unassigned</option>' + 
            staff.map(s => `<option value="${s.id}">${s.full_name || s.name}</option>`).join('');
        
    } catch (error) {
        console.error('Error loading form options:', error);
    }
}

// Utility Functions
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// UI Helper Functions
function showLoading(section) {
    const element = document.getElementById(section);
    if (!element) {
        console.warn(`⚠️ Cannot show loading for missing element: ${section}`);
        return;
    }
    element.innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoading(section) {
    // Loading will be replaced by actual content - no action needed
    console.log(`🔄 Loading completed for: ${section}`);
}

function showError(section, message) {
    const element = document.getElementById(section);
    if (!element) {
        console.warn(`⚠️ Cannot show error for missing element: ${section}`);
        return;
    }
    element.innerHTML = `<div class="error-message">${message}</div>`;
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
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Action Functions
function refreshDashboard() {
    showNotification('Refreshing dashboard...', 'info');
    loadDashboard();
}

function openSchedulingPlugin() {
  window.open('/booking.html', '_blank');
}

function showAddStaffModal() {
    showModal('add-staff-modal');
}

function showAddAutomationModal() {
    showModal('add-automation-modal');
}

function showNotifications() {
    showNotification('Notifications coming soon', 'info');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/admin/login.html';
}

function saveBusinessSettings() {
  const settings = {
    business_name: document.getElementById('business-name').value,
    business_phone: document.getElementById('business-phone').value,
    business_email: document.getElementById('business-email').value,
  };
  fetch(`${API_URL}/settings`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(settings)
  }).then(res => {
    showNotification(res.ok ? 'Settings saved!' : 'Failed to save settings', res.ok ? 'success' : 'error');
  });
}

async function loadSettings() {
  const res = await fetch(`${API_URL}/settings`, { headers: authHeaders() });
  if (!res.ok) return;
  const s = await res.json();
  if (s.business_name)  document.getElementById('business-name').value  = s.business_name;
  if (s.business_phone) document.getElementById('business-phone').value = s.business_phone;
  if (s.business_email) document.getElementById('business-email').value = s.business_email;
}

function saveLabelSettings() {
    showNotification('Label settings applied!', 'success');
}

function downloadInvoice(invoiceId) {
  window.open(`${API_URL}/invoices/${invoiceId}/pdf`, '_blank');
}

function editService(element) {
    showNotification('Edit service functionality coming soon', 'info');
}

function addNewService() {
    showNotification('Add service functionality coming soon', 'info');
}

// Auth guard - redirect to login if not authenticated
(function() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/admin/login.html'; }
})();

// API helper functions
function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
  };
}

// Trend calculation helper
function calcTrend(current, previous) {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const pct = Math.round(((current - previous) / previous) * 100);
  return (pct >= 0 ? '+' : '') + pct + '%';
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Stilt Heights Operations...');
    
    // Load settings first
    loadSettings();
    
    // Verify all required elements exist
    const requiredElements = [
        'dashboard', 'customers-list', 'jobs-list', 'staff-list', 
        'invoices-list', 'automations-list', 'activity-feed',
        'today-jobs-count', 'pending-jobs-count', 'completed-jobs-count', 'revenue-count'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('❌ Missing DOM elements:', missingElements);
        return;
    }
    
    console.log('✅ All required DOM elements found');
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Load initial dashboard
    loadDashboard();
    
    // Set today's date as default for job creation
    const today = new Date().toISOString().split('T')[0];
    const jobDateInput = document.getElementById('job-date');
    if (jobDateInput) {
        jobDateInput.value = today;
        jobDateInput.min = today;
    }
    
    console.log('🎯 Stilt Heights Operations System initialization complete');
});

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (currentSection === 'dashboard') {
        loadDashboard();
    }
}, 30000);

