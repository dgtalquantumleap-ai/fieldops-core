/**
 * FieldOps Core - Admin Dashboard Application
 * Production-ready operations management system
 * 
 * Architecture:
 * - Centralized API service layer
 * - Global state management with subscribers
 * - Reusable UI components
 * - Proper error handling and logging
 */

// ============================================================
// APP INITIALIZATION
// ============================================================

let socket = null;
let charts = { revenue: null, status: null };

/**
 * Setup filter event listeners
 */
function setupFilterListeners() {
    // Job filter
    const jobFilter = document.getElementById('job-filter');
    if (jobFilter) {
        jobFilter.addEventListener('change',  (e) => {
            applyJobFilter(e.target.value);
        });
    }
    
    // Invoice filter
    const invoiceFilter = document.getElementById('invoice-filter');
    if (invoiceFilter) {
        invoiceFilter.addEventListener('change', (e) => {
            applyInvoiceFilter(e.target.value);
        });
    }
    
    // Staff filter
    const staffFilter = document.getElementById('staff-filter');
    if (staffFilter) {
        staffFilter.addEventListener('change', (e) => {
            store.setState({ filters: { ...store.getState('filters'), staff: e.target.value } });
            loadStaff();
        });
    }
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    // Add Customer Form
    const addCustomerForm = document.getElementById('add-customer-form');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createCustomer();
        });
    }
    
    // Create Job Form
    const createJobForm = document.getElementById('create-job-form');
    if (createJobForm) {
        createJobForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createJob();
        });
    }
    
    // Create Invoice Form
    const createInvoiceForm = document.getElementById('create-invoice-form');
    if (createInvoiceForm) {
        createInvoiceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createInvoice();
        });
    }
    
    // Add Automation Form
    const addAutomationForm = document.getElementById('add-automation-form');
    if (addAutomationForm) {
        addAutomationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createAutomation();
        });
    }
}

/**
 * Setup modal listeners
 */
function setupModalListeners() {
    // Modal overlay click to close
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAllModals);
    }
}

/**
 * Show modal by ID
 */
function showModal(modalId) {
    if (!modalId) return;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.add('active');
    }
}

/**
 * Close modal by ID
 */
function closeModal(modalId) {
    if (!modalId) return;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Check if any modals are still visible
    const visibleModals = document.querySelectorAll('.modal.active');
    if (visibleModals.length === 0) {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }
}

/**
 * Close all modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Show Add Customer Modal
 */
function showAddCustomerModal() {
    showModal('add-customer-modal');
}

/**
 * Show Create Job Modal - fetches fresh data before opening
 */
async function showCreateJobModal() {
    showModal('create-job-modal');
    await populateJobSelects();
}

/**
 * Show Create Invoice Modal
 */
function showCreateInvoiceModal() {
    // Populate job select
    populateInvoiceSelects();
    showModal('create-invoice-modal');
}

/**
 * Show Add Automation Modal
 */
function showAddAutomationModal() {
    showModal('add-automation-modal');
}

/**
 * Show Add/Onboard Staff Modal
 */
function showAddStaffModal() {
    showModal('onboard-staff-modal');
}

/**
 * Initialize the application
 */
async function initializeApp() {
    logger.info('🚀 Initializing Admin Dashboard...');
    
    // Verify authentication
    const token = localStorage.getItem('token');
    if (!token) {
        logger.warn('Authentication required');
        window.location.href = '/admin/login.html';
        return;
    }
    
    try {
        // Validate token security
        if (!security.validateAuth()) {
            window.location.href = '/admin/login.html';
            return;
        }
        
        // Initialize Socket.IO
        initializeSocket();
        
        // Setup event listeners
        setupFilterListeners();
        setupFormHandlers();
        setupModalListeners();
        
        // Load initial dashboard
        await loadDashboard();
        
        // Set up auto-refresh
        setupAutoRefresh();
        
        // Set min date for job input
        setupDateInputs();
        
        logger.info('✅ Dashboard initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize dashboard:', error);
        ui.notify.error('Failed to initialize dashboard. Please refresh the page.');
    }
}

// ============================================================
// SOCKET.IO INTEGRATION
// ============================================================

/**
 * Initialize real-time socket connection
 */
function initializeSocket() {
    try {
        socket = io();
        
        socket.on('connect', () => {
            logger.info('🔌 Connected to server');
            socket.emit('join-room', 'admin');
        });
        
        socket.on('new-booking', (data) => {
            logger.info('📅 New booking received:', data);
            ui.notify.success('New booking received!');
            handleBookingUpdate(data);
        });
        
        socket.on('job-updated', (data) => {
            logger.info('🔄 Job updated:', data);
            handleJobUpdate(data);
        });
        
        socket.on('disconnect', () => {
            logger.warn('⚠️ Disconnected from server');
        });
        
        socket.on('error', (error) => {
            logger.error('Socket error:', error);
        });
    } catch (error) {
        logger.error('Socket.IO initialization failed:', error);
    }
}

/**
 * Handle real-time booking updates
 */
function handleBookingUpdate(data) {
    if (!data) return;
    
    // Add activity notification
    if (data.customer && data.job) {
        addActivityNotification(
            'New Booking',
            `${data.customer.name || 'Customer'} - ${data.job.service_name || 'Service'}`,
            '📅'
        );
    }
    
    // Refresh dashboard if visible
    if (store.getState('currentSection') === 'dashboard') {
        loadDashboard();
    }
}

/**
 * Handle real-time job updates
 */
function handleJobUpdate(data) {
    if (!data || !data.job) return;
    
    // Add activity notification
    addActivityNotification(
        'Job Updated',
        `Status: ${data.job.status || 'Unknown'}`,
        '🔄'
    );
    
    // Refresh current section if needed
    const currentSection = store.getState('currentSection');
    if (currentSection === 'dashboard') loadDashboard();
    if (currentSection === 'jobs') loadJobs();
}

// ============================================================
// NAVIGATION
// ============================================================

/**
 * Show specific section
 */
function showSection(sectionName) {
    if (!sectionName) return;
    
    try {
        // Update UI
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (!targetSection) {
            logger.error(`Section not found: ${sectionName}`);
            return;
        }
        targetSection.classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`[href="#${sectionName}"]`);
        if (navItem) navItem.classList.add('active');
        
        // Update state
        store.setState({ currentSection: sectionName });
        
        // Scroll to top of content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        // Also scroll window to top for mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Load section data
        loadSectionData(sectionName);
        
        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.remove('active');
        }
    } catch (error) {
        logger.error(`Failed to show section ${sectionName}:`, error);
        ui.notify.error('Failed to load section');
    }
}

/**
 * Load data for specific section
 */
async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'customers':
            await loadCustomers();
            break;
        case 'jobs':
            await loadJobs();
            break;
        case 'staff':
            await loadStaff();
            break;
        case 'invoices':
            await loadInvoices();
            break;
        case 'automations':
            await loadAutomations();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

// ============================================================
// DASHBOARD
// ============================================================

/**
 * Load dashboard data
 */
async function loadDashboard() {
    store.setLoading('dashboard', true);
    
    try {
        const response = await API.dashboard.getMetrics();
        
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to load dashboard');
        }
        
        const { jobs, invoices, customers } = response.data;
        
        // Calculate metrics
        const metrics = calculateDashboardMetrics(jobs, invoices);
        
        // Update state
        store.setState({
            jobs,
            invoices,
            customers
        });
        
        // Update UI
        updateDashboardMetrics(metrics);
        updateRevenueChart(jobs, invoices);
        updateStatusChart(jobs);
        updateActivityFeed(jobs);
        
        logger.info('✅ Dashboard loaded');
    } catch (error) {
        logger.error('Dashboard load failed:', error);
        ui.notify.error('Failed to load dashboard');
    } finally {
        store.setLoading('dashboard', false);
    }
}

/**
 * Calculate dashboard metrics
 */
function calculateDashboardMetrics(jobs, invoices) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayJobs = jobs.filter(job => job?.job_date === today) || [];
    const yesterdayJobs = jobs.filter(job => job?.job_date === yesterday) || [];
    const pendingJobs = jobs.filter(job => job?.status === 'Scheduled') || [];
    const completedJobs = jobs.filter(job => job?.status === 'Completed') || [];
    
    const paidInvoices = invoices.filter(inv =>
        inv?.status && inv.status.toLowerCase() === 'paid'
    ) || [];
    
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv?.amount || 0), 0);
    
    return {
        todayJobs: todayJobs.length,
        yesterdayJobs: yesterdayJobs.length,
        pendingJobs: pendingJobs.length,
        completedJobs: completedJobs.length,
        totalRevenue: totalRevenue
    };
}

/**
 * Update dashboard metric cards
 */
function updateDashboardMetrics(metrics) {
    const cards = {
        'today-jobs-count': metrics.todayJobs,
        'pending-jobs-count': metrics.pendingJobs,
        'completed-jobs-count': metrics.completedJobs,
        'revenue-count': utils.format.currency(metrics.totalRevenue)
    };
    
    Object.entries(cards).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Animate update
        if (element.textContent !== String(value)) {
            element.style.transform = 'scale(1.1)';
            element.textContent = value;
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

/**
 * Update revenue chart
 */
function updateRevenueChart(jobs, invoices) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) {
        logger.warn('Revenue chart element not found');
        return;
    }
    
    // Calculate last 7 days revenue
    const last7Days = [];
    const revenueData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = (invoices || [])
            .filter(inv => {
                if (!inv?.status || !inv?.issued_at) return false;
                return inv.status.toLowerCase() === 'paid' &&
                    inv.issued_at.startsWith(dateStr);
            })
            .reduce((sum, inv) => sum + (inv?.amount || 0), 0);
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        revenueData.push(dayRevenue);
    }
    
    // Destroy existing chart
    if (charts.revenue) charts.revenue.destroy();
    
    try {
        charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Revenue',
                    data: revenueData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb'
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
                            callback: value => utils.format.currency(value)
                        }
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Failed to render revenue chart:', error);
    }
}

/**
 * Update status chart
 */
function updateStatusChart(jobs) {
    const ctx = document.getElementById('status-chart');
    if (!ctx) {
        logger.warn('Status chart element not found');
        return;
    }
    
    const statusCounts = {
        'Scheduled': (jobs || []).filter(j => j?.status === 'Scheduled').length,
        'In Progress': (jobs || []).filter(j => j?.status === 'In Progress').length,
        'Completed': (jobs || []).filter(j => j?.status === 'Completed').length,
        'Cancelled': (jobs || []).filter(j => j?.status === 'Cancelled').length
    };
    
    if (charts.status) charts.status.destroy();
    
    try {
        charts.status = new Chart(ctx, {
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
    } catch (error) {
        logger.error('Failed to render status chart:', error);
    }
}

/**
 * Update activity feed
 */
function updateActivityFeed(jobs) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    
    if (!jobs || jobs.length === 0) {
        feed.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }
    
    feed.innerHTML = jobs.slice(0, 5).map(job => {
        if (!job) return '';
        
        const status = job.status || 'Unknown';
        const color = utils.status.getColor(status);
        const icon = utils.status.getIcon(status);
        const customerName = job.customer_name || 'Unknown';
        const serviceName = job.service_name || 'Service';
        const time = utils.format.time(job.created_at);
        
        return `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${color}; color: white;">
                    ${icon}
                </div>
                <div class="activity-content">
                    <div class="activity-title">${customerName} - ${serviceName}</div>
                    <div class="activity-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Add activity notification
 */
function addActivityNotification(title, description, icon) {
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
    
    // Keep only last 10 items
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

// ============================================================
// CUSTOMERS
// ============================================================

/**
 * Load customers
 */
async function loadCustomers() {
    ui.loading.show('customers-list');
    
    try {
        const response = await API.customers.getAll();
        const customers = response.success ? response.data : [];
        
        store.setState({ customers });
        renderCustomersList(customers);
        
        logger.info('✅ Customers loaded');
    } catch (error) {
        logger.error('Failed to load customers:', error);
        ui.loading.error('customers-list', 'Failed to load customers');
    }
}

/**
 * Render customers list
 */
function renderCustomersList(customers) {
    const list = document.getElementById('customers-list');
    if (!list) return;
    
    if (!customers || customers.length === 0) {
        ui.loading.empty('customers-list', 'No customers found');
        return;
    }
    
    list.innerHTML = customers.map(customer => {
        if (!customer) return '';
        
        const name = customer.name || 'Unknown';
        const phone = customer.phone || 'N/A';
        const email = customer.email || 'N/A';
        const address = customer.address || 'N/A';
        const id = customer.id || 0;
        
        return `
            <div class="customer-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${name}</h3>
                    <span class="status-badge status-active">Active</span>
                </div>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Address:</strong> ${address}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn-small" onclick="viewCustomerDetails(${id})">View</button>
                    <button class="btn-small" onclick="editCustomer(${id})">Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Create new customer
 */
async function createCustomer() {
    const formData = ui.form.getFormData('add-customer-form');
    if (!formData) {
        logger.warn('No form data collected');
        return;
    }
    
    // Validate form
    const schema = {
        'customer-name': { required: true },
        'customer-phone': { required: true }
    };
    
    const validation = utils.validate.validateForm(
        {
            'customer-name': formData['customer-name'],
            'customer-phone': formData['customer-phone']
        },
        schema
    );
    
    if (!validation.isValid) {
        ui.form.setErrors('add-customer-form', validation.errors);
        return;
    }
    
    try {
        ui.loading.show('add-customer-modal');
        
        const response = await API.customers.create({
            name: formData['customer-name'],
            phone: formData['customer-phone'],
            email: formData['customer-email'] || null,
            address: formData['customer-address'] || null,
            notes: formData['customer-notes'] || null
        });
        
        if (response.success) {
            ui.notify.success('Customer created successfully');
            // Reset form and close modal
            document.getElementById('add-customer-form')?.reset();
            ui.form.clearErrors('add-customer-form');
            closeModal('add-customer-modal');
            // Reload customers list
            await loadCustomers();
        } else {
            ui.notify.error(response.error?.message || 'Failed to create customer');
        }
    } catch (error) {
        logger.error('Failed to create customer:', error);
        ui.notify.error('Failed to create customer: ' + (error.message || 'Unknown error'));
    } finally {
        ui.loading.hide('add-customer-modal');
    }
}

// ============================================================
// JOBS
// ============================================================

/**
 * Load jobs
 */
async function loadJobs() {
    ui.loading.show('jobs-list');
    
    try {
        const response = await API.jobs.getAll();
        const jobs = response.success ? response.data : [];
        
        store.setState({ jobs });
        
        const filter = store.getState('filters.jobs');
        renderJobsList(filterJobs(jobs, filter));
        
        logger.info('✅ Jobs loaded');
    } catch (error) {
        logger.error('Failed to load jobs:', error);
        ui.loading.error('jobs-list', 'Failed to load jobs');
    }
}

/**
 * Render jobs list
 */
function renderJobsList(jobs) {
    const list = document.getElementById('jobs-list');
    if (!list) return;
    
    if (!jobs || jobs.length === 0) {
        ui.loading.empty('jobs-list', 'No jobs found');
        return;
    }
    
    list.innerHTML = jobs.map(job => {
        if (!job) return '';
        
        const customerName = job.customer_name || 'Unknown';
        const serviceName = job.service_name || 'Service';
        const status = job.status || 'Unknown';
        const staffName = job.staff_name || 'Unassigned';
        const date = utils.format.date(job.job_date);
        const time = job.job_time || 'TBD';
        const location = job.location || 'N/A';
        const id = job.id || 0;
        
        const statusClass = utils.status.getBadgeClass(status);
        
        return `
            <div class="job-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${customerName} - ${serviceName}</h3>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <p><strong>Staff:</strong> ${staffName}</p>
                <p><strong>Date:</strong> ${date} at ${time}</p>
                <p><strong>Location:</strong> ${location}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn-small" onclick="viewJobDetails(${id})">View</button>
                    <button class="btn-small" onclick="editJob(${id})">Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter jobs by status
 */
function filterJobs(jobs, filter) {
    if (!jobs) return [];
    if (filter === 'all') return jobs;
    
    const statusMap = {
        'scheduled': 'Scheduled',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    
    return jobs.filter(job => job?.status === statusMap[filter]);
}

/**
 * Apply job filter
 */
function applyJobFilter(filter) {
    const jobs = store.getState('jobs');
    store.setState({ filters: { ...store.getState('filters'), jobs: filter } });
    renderJobsList(filterJobs(jobs, filter));
}

/**
 * Create new job
 */
async function createJob() {
    const formData = ui.form.getFormData('create-job-form');
    if (!formData) {
        logger.warn('No form data collected');
        return;
    }
    
    // Validate
    const validation = utils.validate.validateForm(
        {
            'job-customer': formData['job-customer'],
            'job-service': formData['job-service'],
            'job-date': formData['job-date'],
            'job-time': formData['job-time'],
            'job-location': formData['job-location']
        },
        {
            'job-customer': { required: true },
            'job-service': { required: true },
            'job-date': { required: true },
            'job-time': { required: true },
            'job-location': { required: true }
        }
    );
    
    if (!validation.isValid) {
        ui.form.setErrors('create-job-form', validation.errors);
        return;
    }
    
    try {
        ui.loading.show('create-job-modal');
        
        const response = await API.jobs.create({
            customer_id: parseInt(formData['job-customer']),
            service_id: parseInt(formData['job-service']),
            assigned_to: formData['job-staff'] ? parseInt(formData['job-staff']) : null,
            job_date: formData['job-date'],
            job_time: formData['job-time'],
            location: formData['job-location'],
            notes: formData['job-notes'] || null
        });
        
        if (response.success) {
            ui.notify.success('Job created successfully');
            // Reset form and close modal
            document.getElementById('create-job-form')?.reset();
            ui.form.clearErrors('create-job-form');
            closeModal('create-job-modal');
            // Reload jobs
            await loadJobs();
            // Also reload dashboard
            if (store.getState('currentSection') === 'dashboard') {
                await loadDashboard();
            }
        } else {
            ui.notify.error(response.error?.message || 'Failed to create job');
        }
    } catch (error) {
        logger.error('Failed to create job:', error);
        ui.notify.error('Failed to create job: ' + (error.message || 'Unknown error'));
    } finally {
        ui.loading.hide('create-job-modal');
    }
}

/**
 * Populate customer and staff selects for job creation
 */
async function populateJobSelects() {
    // Always fetch fresh data so dropdowns are never empty
    const [customersRes, staffRes, servicesRes] = await Promise.all([
        API.customers.getAll(),
        API.staff.getAll(),
        API.services.getAll()
    ]);

    const customers = customersRes.success ? customersRes.data : (store.getState('customers') || []);
    const staff = staffRes.success ? staffRes.data : (store.getState('staff') || []);
    const services = servicesRes.success ? servicesRes.data : [];

    // Store for other uses
    if (customers.length) store.setState({ customers });
    if (staff.length) store.setState({ staff });

    const customerSelect = document.getElementById('job-customer');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
            if (customer && customer.id) {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name || 'Unknown'} (${customer.phone || ''})`;
                customerSelect.appendChild(option);
            }
        });
    }

    const serviceSelect = document.getElementById('job-service');
    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Select Service</option>';
        services.forEach(svc => {
            if (svc && svc.id) {
                const option = document.createElement('option');
                option.value = svc.id;
                option.textContent = `${svc.name} ($${svc.price || 0})`;
                serviceSelect.appendChild(option);
            }
        });
    }

    const staffSelect = document.getElementById('job-staff');
    if (staffSelect) {
        staffSelect.innerHTML = '<option value="">Unassigned</option>';
        staff.forEach(member => {
            if (member && member.id) {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.name || 'Unknown'} (${member.role || 'Staff'})`;
                staffSelect.appendChild(option);
            }
        });
    }
}

/**
 * Populate job and service selects for invoice creation
 */
function populateInvoiceSelects() {
    const jobs = store.getState('jobs') || [];
    
    const jobSelect = document.getElementById('invoice-job');
    if (jobSelect) {
        jobSelect.innerHTML = '<option value="">Select Job</option>';
        jobs.forEach(job => {
            if (job && job.id && job.status !== 'Cancelled') {
                const option = document.createElement('option');
                option.value = job.id;
                const customerName = job.customer_name || 'Unknown';
                const serviceName = job.service_name || 'Service';
                option.textContent = `${customerName} - ${serviceName} (${job.job_date || 'TBD'})`;
                jobSelect.appendChild(option);
            }
        });
    }
}

// ============================================================
// STAFF MANAGEMENT
// ============================================================

/**
 * Load and display staff statistics
 */
function updateStaffStatistics(staff) {
    if (!staff || !Array.isArray(staff)) {
        logger.warn('Invalid staff data for statistics');
        return;
    }
    
    const totalCount = staff.length;
    const activeCount = staff.filter(s => s?.is_active === true).length;
    const suspendedCount = staff.filter(s => s?.status === 'Suspended' || (s?.is_active === false && s?.status !== 'Terminated')).length;
    const terminatedCount = staff.filter(s => s?.status === 'Terminated').length;
    
    const updates = {
        'total-staff-count': totalCount,
        'active-staff-count': activeCount,
        'suspended-staff-count': suspendedCount,
        'terminated-staff-count': terminatedCount
    };
    
    Object.entries(updates).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    });
}

/**
 * Load staff
 */
async function loadStaff() {
    ui.loading.show('staff-list');
    
    try {
        const response = await API.staff.getAll();
        const staff = response.success ? response.data : [];
        
        store.setState({ staff });
        
        // Update statistics
        updateStaffStatistics(staff);
        
        // Render list
        renderStaffList(staff);
        
        logger.info('✅ Staff loaded');
    } catch (error) {
        logger.error('Failed to load staff:', error);
        ui.loading.error('staff-list', 'Failed to load staff');
    }
}

/**
 * Render staff list
 */
function renderStaffList(staff) {
    const list = document.getElementById('staff-list');
    if (!list) return;
    
    if (!staff || staff.length === 0) {
        ui.loading.empty('staff-list', 'No staff found');
        return;
    }
    
    list.innerHTML = staff.map(member => {
        if (!member) return '';
        
        const name = member.name || 'Unknown';
        const email = member.email || 'N/A';
        const role = member.role || 'Staff';
        const phone = member.phone || 'N/A';
        const status = member.is_active ? 'Active' : 'Inactive';
        const statusClass = member.is_active ? 'status-active' : 'status-inactive';
        const id = member.id || 0;
        
        return `
            <div class="staff-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${name}</h3>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Role:</strong> ${role}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn-small" onclick="viewStaffDetails(${id})">View</button>
                    <button class="btn-small" onclick="editStaff(${id})">Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Onboard staff member
 */
async function onboardStaff() {
    const formData = ui.form.getFormData('onboard-staff-form');
    if (!formData) {
        logger.warn('No form data collected');
        return;
    }
    
    const validation = utils.validate.validateForm(
        {
            'onboard-name': formData['onboard-name'],
            'onboard-email': formData['onboard-email'],
            'onboard-role': formData['onboard-role'],
            'onboard-password': formData['onboard-password']
        },
        {
            'onboard-name': { required: true },
            'onboard-email': { required: true, email: true },
            'onboard-role': { required: true },
            'onboard-password': { required: true, minLength: 6 }
        }
    );
    
    if (!validation.isValid) {
        ui.form.setErrors('onboard-staff-form', validation.errors);
        return;
    }
    
    try {
        ui.loading.show('onboard-staff-modal');
        
        const response = await API.staff.create({
            name: formData['onboard-name'],
            email: formData['onboard-email'],
            phone: formData['onboard-phone'] || null,
            role: formData['onboard-role'],
            password: formData['onboard-password']
        });
        
        if (response.success) {
            ui.notify.success('Staff member onboarded successfully');
            // Reset form and close modal
            document.getElementById('onboard-staff-form')?.reset();
            ui.form.clearErrors('onboard-staff-form');
            closeModal('onboard-staff-modal');
            // Reload staff
            await loadStaff();
        } else {
            ui.notify.error(response.error?.message || 'Failed to onboard staff member');
        }
    } catch (error) {
        logger.error('Failed to onboard staff:', error);
        ui.notify.error('Failed to onboard staff member: ' + (error.message || 'Unknown error'));
    } finally {
        ui.loading.hide('onboard-staff-modal');
    }
}

// ============================================================
// INVOICES
// ============================================================

/**
 * Load invoices
 */
async function loadInvoices() {
    ui.loading.show('invoices-list');
    
    try {
        const response = await API.invoices.getAll();
        const invoices = response.success ? response.data : [];
        
        store.setState({ invoices });
        
        const filter = store.getState('filters.invoices');
        renderInvoicesList(filterInvoices(invoices, filter));
        
        logger.info('✅ Invoices loaded');
    } catch (error) {
        logger.error('Failed to load invoices:', error);
        ui.loading.error('invoices-list', 'Failed to load invoices');
    }
}

/**
 * Render invoices list
 */
function renderInvoicesList(invoices) {
    const list = document.getElementById('invoices-list');
    if (!list) return;
    
    if (!invoices || invoices.length === 0) {
        ui.loading.empty('invoices-list', 'No invoices found');
        return;
    }
    
    list.innerHTML = invoices.map(invoice => {
        if (!invoice) return '';
        
        const number = invoice.invoice_number || `INV-${invoice.id || 'N/A'}`;
        const status = invoice.status || 'Unknown';
        const customerName = invoice.customer_name || 'N/A';
        const amount = utils.format.currency(invoice.amount || 0);
        const date = utils.format.date(invoice.issued_at);
        const id = invoice.id || 0;
        const statusClass = utils.status.getBadgeClass(status);
        
        const isPaid = status.toLowerCase() === 'paid';
        const markPaidBtn = !isPaid
            ? `<button class="btn-small btn-success" onclick="markInvoiceAsPaid(${id})">Mark Paid</button>`
            : '';
        
        return `
            <div class="invoice-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h3>${number}</h3>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Amount:</strong> ${amount}</p>
                <p><strong>Issue Date:</strong> ${date}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn-small" onclick="viewInvoiceDetails(${id})">View</button>
                    <button class="btn-small" onclick="downloadInvoicePDF(${id})">Download</button>
                    ${markPaidBtn}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter invoices by status
 */
function filterInvoices(invoices, filter) {
    if (!invoices) return [];
    if (filter === 'all') return invoices;
    
    const statusMap = {
        'paid': 'Paid',
        'unpaid': 'Unpaid'
    };
    
    return invoices.filter(inv =>
        inv?.status && inv.status.toLowerCase() === statusMap[filter].toLowerCase()
    );
}

/**
 * Apply invoice filter
 */
function applyInvoiceFilter(filter) {
    const invoices = store.getState('invoices');
    store.setState({ filters: { ...store.getState('filters'), invoices: filter } });
    renderInvoicesList(filterInvoices(invoices, filter));
}

/**
 * Mark invoice as paid
 */
async function markInvoiceAsPaid(invoiceId) {
    if (!invoiceId) return;
    if (!await ui.modal.confirm('Mark this invoice as paid?')) return;
    
    try {
        const response = await API.invoices.markAsPaid(invoiceId);
        
        if (response.success) {
            ui.notify.success('Invoice marked as paid');
            loadInvoices();
        } else {
            ui.notify.error('Failed to mark invoice as paid');
        }
    } catch (error) {
        logger.error('Failed to mark invoice as paid:', error);
        ui.notify.error('Error marking invoice as paid');
    }
}

/**
 * Download invoice PDF
 */
function downloadInvoicePDF(invoiceId) {
    if (!invoiceId) return;
    try {
        API.invoices.downloadPDF(invoiceId);
    } catch (error) {
        logger.error('Failed to download invoice:', error);
        ui.notify.error('Failed to download invoice');
    }
}

/**
 * Create new invoice
 */
async function createInvoice() {
    const formData = ui.form.getFormData('create-invoice-form');
    if (!formData) {
        logger.warn('No form data collected');
        return;
    }
    
    const validation = utils.validate.validateForm(
        {
            'invoice-job': formData['invoice-job'],
            'invoice-amount': formData['invoice-amount']
        },
        {
            'invoice-job': { required: true },
            'invoice-amount': { required: true, positive: true }
        }
    );
    
    if (!validation.isValid) {
        ui.form.setErrors('create-invoice-form', validation.errors);
        return;
    }
    
    try {
        ui.loading.show('create-invoice-modal');
        
        const response = await API.invoices.create({
            job_id: parseInt(formData['invoice-job']),
            amount: parseFloat(formData['invoice-amount']),
            notes: formData['invoice-notes'] || null
        });
        
        if (response.success) {
            ui.notify.success('Invoice created successfully');
            // Reset form and close modal
            document.getElementById('create-invoice-form')?.reset();
            ui.form.clearErrors('create-invoice-form');
            closeModal('create-invoice-modal');
            // Reload invoices
            await loadInvoices();
        } else {
            ui.notify.error(response.error?.message || 'Failed to create invoice');
        }
    } catch (error) {
        logger.error('Failed to create invoice:', error);
        ui.notify.error('Failed to create invoice: ' + (error.message || 'Unknown error'));
    } finally {
        ui.loading.hide('create-invoice-modal');
    }
}

// ============================================================
// AUTOMATIONS
// ============================================================

/**
 * Load automations
 */
async function loadAutomations() {
    ui.loading.show('automations-list');
    
    try {
        const response = await API.automations.getAll();
        const automations = response.success ? response.data : [];
        
        store.setState({ automations });
        renderAutomationsList(automations);
        
        logger.info('✅ Automations loaded');
    } catch (error) {
        logger.error('Failed to load automations:', error);
        ui.loading.error('automations-list', 'Failed to load automations');
    }
}

/**
 * Render automations list
 */
function renderAutomationsList(automations) {
    const list = document.getElementById('automations-list');
    if (!list) return;
    
    if (!automations || automations.length === 0) {
        ui.loading.empty('automations-list', 'No automations found');
        return;
    }
    
    list.innerHTML = automations.map(automation => {
        if (!automation) return '';
        
        const trigger = automation.trigger_event || 'Unknown';
        const channel = automation.channel || 'N/A';
        const message = automation.message_template
            ? automation.message_template.substring(0, 100) + '...'
            : 'N/A';
        const enabled = automation.enabled ? 'Enabled' : 'Disabled';
        const statusClass = automation.enabled ? 'status-active' : 'status-inactive';
        const id = automation.id || 0;
        
        return `
            <div class="automation-card">
                <h3>${trigger}</h3>
                <p><strong>Channel:</strong> ${channel}</p>
                <p><strong>Message:</strong> ${message}</p>
                <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${enabled}</span></p>
                <div style="margin-top: 1rem;">
                    <button class="btn-small" onclick="editAutomation(${id})">Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Create automation
 */
async function createAutomation() {
    const formData = ui.form.getFormData('add-automation-form');
    if (!formData) {
        logger.warn('No form data collected');
        return;
    }
    
    const validation = utils.validate.validateForm(
        {
            'automation-trigger': formData['automation-trigger'],
            'automation-channel': formData['automation-channel'],
            'automation-message': formData['automation-message']
        },
        {
            'automation-trigger': { required: true },
            'automation-channel': { required: true },
            'automation-message': { required: true }
        }
    );
    
    if (!validation.isValid) {
        ui.form.setErrors('add-automation-form', validation.errors);
        return;
    }
    
    try {
        ui.loading.show('add-automation-modal');
        
        const response = await API.automations.create({
            trigger_event: formData['automation-trigger'],
            channel: formData['automation-channel'],
            message_template: formData['automation-message'],
            enabled: document.getElementById('automation-enabled')?.checked || false
        });
        
        if (response.success) {
            ui.notify.success('Automation created successfully');
            // Reset form and close modal
            document.getElementById('add-automation-form')?.reset();
            ui.form.clearErrors('add-automation-form');
            closeModal('add-automation-modal');
            // Reload automations
            await loadAutomations();
        } else {
            ui.notify.error(response.error?.message || 'Failed to create automation');
        }
    } catch (error) {
        logger.error('Failed to create automation:', error);
        ui.notify.error('Failed to create automation: ' + (error.message || 'Unknown error'));
    } finally {
        ui.loading.hide('add-automation-modal');
    }
}

// ============================================================
// SETTINGS
// ============================================================

/**
 * Load settings
 */
function loadSettings() {
    // Load settings from localStorage if available
    const businessName = localStorage.getItem('businessName') || 'Stilt Heights';
    const businessPhone = localStorage.getItem('businessPhone') || '';
    const businessEmail = localStorage.getItem('businessEmail') || '';
    
    const nameInput = document.getElementById('business-name');
    const phoneInput = document.getElementById('business-phone');
    const emailInput = document.getElementById('business-email');
    
    if (nameInput) nameInput.value = businessName;
    if (phoneInput) phoneInput.value = businessPhone;
    if (emailInput) emailInput.value = businessEmail;
    
    logger.info('✓ Settings page loaded');
}

/**
 * Save business settings
 */
async function saveBusinessSettings() {
    const nameInput = document.getElementById('business-name');
    const phoneInput = document.getElementById('business-phone');
    const emailInput = document.getElementById('business-email');
    
    const name = nameInput?.value?.trim();
    const phone = phoneInput?.value?.trim();
    const email = emailInput?.value?.trim();
    
    if (!name || !phone) {
        ui.notify.warning('Please fill in business name and phone');
        return;
    }
    
    // Validate email if provided
    if (email && !utils.validate.email(email)) {
        ui.notify.warning('Please enter a valid email address');
        return;
    }
    
    try {
        // Save to localStorage
        localStorage.setItem('businessName', name);
        localStorage.setItem('businessPhone', phone);
        localStorage.setItem('businessEmail', email);
        
        // Update UI elements that display business name
        document.querySelectorAll('.business-name').forEach(el => {
            el.textContent = name;
        });
        
        ui.notify.success('Business settings saved successfully');
        logger.info('Business settings updated');
    } catch (error) {
        logger.error('Failed to save settings:', error);
        ui.notify.error('Failed to save settings: ' + (error.message || 'Unknown error'));
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Setup date inputs
 */
function setupDateInputs() {
    const jobDateInput = utils.dom.get('job-date');
    if (jobDateInput) {
        const today = new Date().toISOString().split('T')[0];
        jobDateInput.value = today;
        jobDateInput.min = today;
    }
}

/**
 * Setup auto-refresh
 */
function setupAutoRefresh() {
    setInterval(() => {
        if (store.getState('currentSection') === 'dashboard') {
            loadDashboard();
        }
    }, 30000); // Refresh every 30 seconds
}

/**
 * Logout
 */
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/admin/login.html';
}

// ============================================================
// MODAL FUNCTIONS (AI & Advanced Features)
// ============================================================

/**
 * Show AI Follow-up Modal
 */
function showFollowUpModal() {
    ui.notify.info('AI Follow-up feature coming soon');
}

/**
 * Show Staff Notification Modal
 */
function showStaffNotificationModal() {
    ui.notify.info('Staff Notification feature coming soon');
}

/**
 * Show Custom AI Modal
 */
function showCustomAIModal() {
    ui.notify.info('Custom AI Message feature coming soon');
}

/**
 * Show AI Templates
 */
function showAITemplates() {
    ui.notify.info('AI Templates feature coming soon');
}

/**
 * Open Scheduling Plugin
 */
function openSchedulingPlugin() {
    ui.notify.info('Scheduling Plugin integration coming soon');
}

/**
 * Load Staff Management (legacy compatibility)
 */
function loadStaffManagement() {
    loadStaff();
}

/**
 * Edit Service
 */
function editService(button) {
    ui.notify.info('Service editing coming soon');
}

/**
 * Add New Service
 */
function addNewService() {
    ui.notify.info('Add service feature coming soon');
}

/**
 * Save Label Settings
 */
function saveLabelSettings() {
    const jobsLabel = document.getElementById('jobs-label')?.value || 'Jobs';
    const customersLabel = document.getElementById('customers-label')?.value || 'Customers';
    const staffLabel = document.getElementById('staff-label')?.value || 'Staff';
    
    localStorage.setItem('jobsLabel', jobsLabel);
    localStorage.setItem('customersLabel', customersLabel);
    localStorage.setItem('staffLabel', staffLabel);
    
    ui.notify.success('Label settings saved');
}

// Placeholder functions (implement as needed)
function viewCustomerDetails(id) { 
    logger.debug('View customer:', id);
    ui.notify.info('Customer details view coming soon');
}

function editCustomer(id) { 
    logger.debug('Edit customer:', id);
    ui.notify.info('Customer editing coming soon');
}

function viewJobDetails(id) { 
    logger.debug('View job:', id);
    ui.notify.info('Job details view coming soon');
}

function editJob(id) { 
    logger.debug('Edit job:', id);
    ui.notify.info('Job editing coming soon');
}

function viewStaffDetails(id) { 
    logger.debug('View staff:', id);
    ui.notify.info('Staff details view coming soon');
}

function editStaff(id) { 
    logger.debug('Edit staff:', id);
    ui.notify.info('Staff editing coming soon');
}

function viewInvoiceDetails(id) { 
    logger.debug('View invoice:', id);
    ui.notify.info('Invoice details view coming soon');
}

function editAutomation(id) { 
    logger.debug('Edit automation:', id);
    ui.notify.info('Automation editing coming soon');
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', initializeApp);

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }
});
