// Enhanced Staff App - Modern UI/UX with Advanced Features
class StaffApp {
    constructor() {
        this.socket = null;
        this.currentJob = null;
        this.currentPhotoTab = 'before';
        this.jobs = [];
        this.notifications = [];
        this.stats = {
            today: 0,
            pending: 0,
            completed: 0,
            earnings: 0
        };
        this.filters = {
            status: 'all',
            date: 'today'
        };
        this.init();
    }

    // Initialize the app
    init() {
        this.initializeSocket();
        this.loadUserData();
        this.setupEventListeners();
        this.loadJobs();
        this.loadStats();
        this.startRealTimeUpdates();
    }

    // Socket.IO initialization with enhanced features
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to real-time updates');
            this.socket.emit('join-room', 'staff');
            this.showNotification('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.showNotification('Connection lost', 'warning');
        });

        // Enhanced real-time events
        this.socket.on('job-updated', (data) => {
            this.handleJobUpdate(data);
        });

        this.socket.on('new-booking', (data) => {
            this.handleNewBooking(data);
        });

        this.socket.on('team-message', (data) => {
            this.handleTeamMessage(data);
        });

        this.socket.on('customer-message', (data) => {
            this.handleCustomerMessage(data);
        });
    }

    // Load user data and personalize experience
    async loadUserData() {
        try {
            const response = await fetch('/api/staff/profile');
            const userData = await response.json();
            
            // Update UI with user data
            document.querySelector('.staff-name').textContent = userData.name;
            document.querySelector('.staff-role').textContent = userData.role;
            
            // Set theme preference
            if (userData.theme) {
                document.body.setAttribute('data-theme', userData.theme);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Pull-to-refresh
        let startY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].pageY;
            const diff = currentY - startY;
            
            if (diff > 100) {
                document.body.classList.add('pulling');
            }
        });

        document.addEventListener('touchend', () => {
            if (document.body.classList.contains('pulling')) {
                this.refreshData();
                document.body.classList.remove('pulling');
            }
            isPulling = false;
        });

        // Search functionality
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filterJobs(e.target.value);
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });
    }

    // Load jobs with enhanced filtering
    async loadJobs() {
        try {
            this.showLoading('jobs-list');
            
            const response = await fetch('/api/staff/jobs');
            this.jobs = await response.json();
            
            this.renderJobs();
            this.updateStats();
            this.hideLoading('jobs-list');
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showError('jobs-list', 'Error loading jobs');
        }
    }

    // Enhanced job rendering with modern cards
    renderJobs() {
        const container = document.getElementById('jobs-list');
        
        if (this.jobs.length === 0) {
            container.innerHTML = this.createEmptyState();
            return;
        }

        const filteredJobs = this.getFilteredJobs();
        
        if (filteredJobs.length === 0) {
            container.innerHTML = this.createNoResultsState();
            return;
        }

        const groupedJobs = this.groupJobsByDate(filteredJobs);
        let html = '';

        Object.entries(groupedJobs).forEach(([date, jobs]) => {
            html += this.createJobSection(date, jobs);
        });

        container.innerHTML = html;
    }

    // Group jobs by date for better organization
    groupJobsByDate(jobs) {
        const grouped = {};
        
        jobs.forEach(job => {
            const date = this.formatJobDate(job.job_date);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(job);
        });

        return grouped;
    }

    // Create enhanced job section
    createJobSection(date, jobs) {
        const isToday = date === 'Today';
        const isPast = date === 'Past';
        
        let html = `
            <div class="job-section ${isToday ? 'today-section' : ''}">
                <div class="section-header">
                    <h3>${date}</h3>
                    <span class="job-count">${jobs.length} job${jobs.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="jobs-grid">
        `;

        jobs.forEach(job => {
            html += this.createEnhancedJobCard(job);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Create modern job card with enhanced information
    createEnhancedJobCard(job) {
        const statusColors = {
            'Scheduled': 'blue',
            'In Progress': 'orange',
            'Completed': 'green',
            'Cancelled': 'gray'
        };

        const statusColor = statusColors[job.status] || 'gray';
        const time = job.job_time || 'TBD';
        const isUrgent = this.isUrgentJob(job);
        const hasPhotos = job.photo_count > 0;

        return `
            <div class="job-card enhanced ${isUrgent ? 'urgent' : ''}" onclick="staffApp.openJobDetail(${job.id})">
                <div class="job-card-header">
                    <div class="job-status-badge status-${statusColor}">
                        ${job.status}
                    </div>
                    <div class="job-time">
                        <span class="time-icon">⏰</span>
                        ${time}
                    </div>
                </div>
                
                <div class="job-content">
                    <h4 class="service-name">${job.service_name}</h4>
                    <p class="customer-name">${job.customer_name}</p>
                    
                    <div class="job-location">
                        <span class="location-icon">📍</span>
                        <span>${job.location}</span>
                    </div>
                    
                    <div class="job-meta">
                        ${hasPhotos ? `<span class="photo-count">📸 ${job.photo_count}</span>` : ''}
                        ${job.estimated_duration ? `<span class="duration">⏱️ ${job.estimated_duration}</span>` : ''}
                        ${job.priority === 'high' ? '<span class="priority-badge">High Priority</span>' : ''}
                    </div>
                </div>
                
                <div class="job-actions">
                    ${this.getJobActionButtons(job)}
                </div>
            </div>
        `;
    }

    // Get contextual action buttons for job
    getJobActionButtons(job) {
        switch (job.status) {
            case 'Scheduled':
                return `
                    <button class="btn-action btn-primary" onclick="event.stopPropagation(); staffApp.startJob(${job.id})">
                        Start Job
                    </button>
                    <button class="btn-action btn-secondary" onclick="event.stopPropagation(); staffApp.navigate(${job.id})">
                        🗺️ Navigate
                    </button>
                `;
            case 'In Progress':
                return `
                    <button class="btn-action btn-success" onclick="event.stopPropagation(); staffApp.completeJob(${job.id})">
                        Complete
                    </button>
                    <button class="btn-action btn-secondary" onclick="event.stopPropagation(); staffApp.addPhotos(${job.id})">
                        📸 Photos
                    </button>
                `;
            case 'Completed':
                return `
                    <button class="btn-action btn-secondary" onclick="event.stopPropagation(); staffApp.viewDetails(${job.id})">
                        View Details
                    </button>
                `;
            default:
                return '';
        }
    }

    // Enhanced job detail modal
    async openJobDetail(jobId) {
        try {
            this.showLoading('job-detail-content');
            
            const response = await fetch(`/api/jobs/${jobId}`);
            this.currentJob = await response.json();
            
            this.updateJobDetailModal();
            this.loadJobPhotos();
            this.loadJobHistory();
            
            document.getElementById('job-detail-modal').classList.add('show');
            this.hideLoading('job-detail-content');
        } catch (error) {
            console.error('Error loading job details:', error);
            this.showNotification('Error loading job details', 'error');
        }
    }

    // Update job detail modal with enhanced information
    updateJobDetailModal() {
        const job = this.currentJob;
        
        // Basic information
        document.getElementById('modal-service-name').textContent = job.service_name;
        document.getElementById('modal-customer-name').textContent = job.customer_name;
        document.getElementById('modal-customer-phone').textContent = job.customer_phone || 'N/A';
        document.getElementById('modal-job-date').textContent = this.formatFullDate(job.job_date);
        document.getElementById('modal-job-time').textContent = job.job_time || 'TBD';
        document.getElementById('modal-job-location').textContent = job.location;
        document.getElementById('modal-job-notes').textContent = job.notes || 'No notes';
        
        // Status and actions
        this.updateJobStatus();
        this.updateActionButtons();
        
        // Additional information
        this.updateJobMetadata();
    }

    // Load job statistics and analytics
    async loadStats() {
        try {
            const response = await fetch('/api/staff/stats');
            const stats = await response.json();
            
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Update statistics display
    updateStatsDisplay(stats) {
        document.getElementById('today-jobs').textContent = stats.today || 0;
        document.getElementById('pending-jobs').textContent = stats.pending || 0;
        document.getElementById('completed-jobs').textContent = stats.completed || 0;
        document.getElementById('weekly-earnings').textContent = `$${stats.earnings || 0}`;
        
        // Animate the numbers
        this.animateNumbers();
    }

    // Animate statistics numbers
    animateNumbers() {
        const statElements = document.querySelectorAll('.stat-value');
        
        statElements.forEach(element => {
            const finalValue = parseInt(element.textContent);
            let currentValue = 0;
            const increment = finalValue / 20;
            
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    element.textContent = finalValue;
                    clearInterval(timer);
                } else {
                    element.textContent = Math.floor(currentValue);
                }
            }, 50);
        });
    }

    // Enhanced notification system
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Handle real-time job updates
    handleJobUpdate(data) {
        const jobIndex = this.jobs.findIndex(job => job.id === data.job.id);
        
        if (jobIndex !== -1) {
            this.jobs[jobIndex] = data.job;
            
            if (this.currentJob && this.currentJob.id === data.job.id) {
                this.currentJob = data.job;
                this.updateJobDetailModal();
            }
            
            this.renderJobs();
            this.updateStats();
        }
        
        this.showNotification(`Job "${data.job.service_name}" updated`, 'info');
    }

    // Handle new booking notifications
    handleNewBooking(data) {
        this.loadJobs();
        this.updateStats();
        
        this.showNotification(`New booking: ${data.job.customer_name} - ${data.job.service_name}`, 'success', 5000);
        
        // Update notification badge
        this.updateNotificationBadge();
    }

    // Enhanced photo management
    async loadJobPhotos() {
        try {
            const response = await fetch(`/api/media/job/${this.currentJob.id}/grouped`);
            const photos = await response.json();
            
            this.updatePhotoTabs(photos);
            this.renderPhotos(photos[this.currentPhotoTab] || []);
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }

    // Enhanced photo rendering with preview
    renderPhotos(photos) {
        const photoGrid = document.getElementById('photo-grid');
        
        if (photos.length === 0) {
            photoGrid.innerHTML = this.createPhotoUploadPrompt();
            return;
        }

        let html = photos.map(photo => `
            <div class="photo-item" onclick="staffApp.viewPhoto('${photo.file_url}')">
                <img src="${photo.file_url}" alt="${photo.media_type}" loading="lazy">
                <div class="photo-overlay">
                    <button class="photo-delete" onclick="event.stopPropagation(); staffApp.deletePhoto(${photo.id})">×</button>
                    <button class="photo-view" onclick="event.stopPropagation(); staffApp.viewPhoto('${photo.file_url}')">👁️</button>
                </div>
            </div>
        `).join('');

        html += this.createPhotoUploadPrompt();
        photoGrid.innerHTML = html;
    }

    // Create photo upload prompt
    createPhotoUploadPrompt() {
        return `
            <div class="photo-upload-btn" onclick="staffApp.takePhoto('${this.currentPhotoTab}')">
                <div class="upload-icon">📸</div>
                <div class="upload-text">Add ${this.currentPhotoTab} Photo</div>
            </div>
        `;
    }

    // Enhanced photo upload with progress
    async uploadPhoto(file, type) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('job_id', this.currentJob.id);
        formData.append('media_type', type);
        formData.append('uploaded_by', 'Staff');
        
        try {
            this.showProgress('uploading-photo');
            
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Photo uploaded successfully', 'success');
                this.loadJobPhotos();
                
                // Emit real-time update
                this.socket.emit('photo-uploaded', {
                    job_id: this.currentJob.id,
                    media_type: type,
                    file_url: result.media.file_url
                });
            } else {
                this.showNotification('Failed to upload photo', 'error');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            this.showNotification('Error uploading photo', 'error');
        } finally {
            this.hideProgress('uploading-photo');
        }
    }

    // Enhanced job status management
    async startJob(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'In Progress' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Job started successfully', 'success');
                
                // Start time tracking
                this.startTimeTracking(jobId);
                
                // Emit real-time update
                this.socket.emit('job-status-changed', {
                    job_id: jobId,
                    status: 'In Progress'
                });
                
                // Open job detail
                this.openJobDetail(jobId);
            }
        } catch (error) {
            console.error('Error starting job:', error);
            this.showNotification('Error starting job', 'error');
        }
    }

    // Enhanced job completion with validation
    async completeJob(jobId) {
        // Validate required photos
        const hasBeforePhotos = await this.hasPhotos(jobId, 'before');
        const hasAfterPhotos = await this.hasPhotos(jobId, 'after');
        
        if (!hasBeforePhotos || !hasAfterPhotos) {
            this.showNotification('Please add both before and after photos', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Job completed successfully!', 'success');
                
                // Stop time tracking
                this.stopTimeTracking(jobId);
                
                // Emit real-time update
                this.socket.emit('job-status-changed', {
                    job_id: jobId,
                    status: 'Completed'
                });
                
                // Trigger completion automations
                this.socket.emit('job-completed', {
                    job_id: jobId,
                    customer_name: this.currentJob.customer_name,
                    service_name: this.currentJob.service_name
                });
                
                // Show completion summary
                this.showCompletionSummary(jobId);
            }
        } catch (error) {
            console.error('Error completing job:', error);
            this.showNotification('Error completing job', 'error');
        }
    }

    // Utility functions
    formatJobDate(dateString) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (dateString === today) return 'Today';
        if (dateString === yesterday) return 'Yesterday';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        }
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    formatFullDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    }

    isUrgentJob(job) {
        // Check if job is marked as urgent or is within 2 hours
        if (job.priority === 'high') return true;
        
        const jobDateTime = new Date(`${job.job_date} ${job.job_time || '00:00'}`);
        const now = new Date();
        const diffHours = (jobDateTime - now) / (1000 * 60 * 60);
        
        return diffHours > 0 && diffHours <= 2;
    }

    getFilteredJobs() {
        let filtered = [...this.jobs];
        
        // Apply status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(job => 
                job.status.toLowerCase() === this.filters.status.toLowerCase()
            );
        }
        
        // Apply date filter
        if (this.filters.date === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(job => job.job_date === today);
        }
        
        // Apply search
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(job => 
                job.service_name.toLowerCase().includes(searchLower) ||
                job.customer_name.toLowerCase().includes(searchLower) ||
                job.location.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered;
    }

    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No jobs assigned</h3>
                <p>You don't have any jobs scheduled. Check back later!</p>
            </div>
        `;
    }

    createNoResultsState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No jobs found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
    }

    // Loading states
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    hideLoading(containerId) {
        // Loading will be replaced by actual content
    }

    showProgress(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideProgress(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn-action btn-primary" onclick="staffApp.refreshData()">Retry</button>
                </div>
            `;
        }
    }

    // Refresh data
    async refreshData() {
        await Promise.all([
            this.loadJobs(),
            this.loadStats()
        ]);
        
        this.showNotification('Data refreshed', 'success');
    }

    // Start real-time updates
    startRealTimeUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.loadStats();
        }, 30000);
        
        // Check for new jobs every minute
        setInterval(() => {
            this.loadJobs();
        }, 60000);
    }

    // Logout with confirmation
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clean up socket connection
            if (this.socket) {
                this.socket.disconnect();
            }
            
            // Redirect to login
            window.location.href = '/staff/login.html';
        }
    }
}

// Initialize the app
let staffApp;
document.addEventListener('DOMContentLoaded', () => {
    staffApp = new StaffApp();
});

// Global functions for backward compatibility
function openJobDetail(jobId) {
    staffApp.openJobDetail(jobId);
}

function closeJobDetail() {
    document.getElementById('job-detail-modal').classList.remove('show');
    staffApp.currentJob = null;
}

function takePhoto(type) {
    const input = document.getElementById('photo-input');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await staffApp.uploadPhoto(file, type);
        }
    };
    input.click();
}

function switchPhotoTab(tab) {
    staffApp.currentPhotoTab = tab;
    
    // Update tab styling
    document.querySelectorAll('.photo-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload photos for new tab
    staffApp.loadJobPhotos();
}

function logout() {
    staffApp.logout();
}
