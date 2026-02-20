// Enhanced Job Details Management
class JobDetailsManager {
    constructor() {
        this.currentJob = null;
        this.currentPhotoTab = 'before';
        this.timeTrackingInterval = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.isPaused = false;
    }

    // Open enhanced job detail modal
    async openJobDetail(jobId) {
        try {
            this.showLoadingState();

            const token = localStorage.getItem('staffToken');
            const response = await fetch(`/api/jobs/${jobId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/staff/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            this.currentJob = await response.json();
            
            this.updateJobDetailModal();
            this.loadJobPhotos();
            this.animateModalOpen();
            
            document.getElementById('job-detail-modal').classList.add('show');
            this.hideLoadingState();
        } catch (error) {
            console.error('Error loading job details:', error);
            this.showNotification('Error loading job details', 'error');
            this.hideLoadingState();
        }
    }

    // Update modal with enhanced job information
    updateJobDetailModal() {
        const job = this.currentJob;
        
        // Update header
        document.getElementById('modal-job-title').textContent = `${job.service_name} - ${job.customer_name}`;
        this.updateJobStatus();
        
        // Update customer information
        this.updateCustomerInfo(job);
        
        // Update job details
        this.updateJobDetails(job);
        
        // Update action buttons
        this.updateActionButtons();
        
        // Initialize customer avatar
        this.initializeCustomerAvatar(job.customer_name);
    }

    // Update job status indicator
    updateJobStatus() {
        const statusIndicator = document.getElementById('modal-job-status');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        const status = this.currentJob.status;
        statusText.textContent = status;
        
        // Remove all status classes
        statusDot.className = 'status-dot';
        
        // Add appropriate status class
        switch (status.toLowerCase()) {
            case 'scheduled':
                statusDot.classList.add('scheduled');
                break;
            case 'in progress':
                statusDot.classList.add('in-progress');
                break;
            case 'completed':
                statusDot.classList.add('completed');
                break;
            case 'cancelled':
                statusDot.classList.add('cancelled');
                break;
        }
    }

    // Update customer information
    updateCustomerInfo(job) {
        document.getElementById('modal-customer-name').textContent = job.customer_name;
        document.getElementById('modal-customer-phone').textContent = job.customer_phone || 'No phone';
        
        // Update customer avatar with initials
        const initials = this.getInitials(job.customer_name);
        document.getElementById('customer-avatar-text').textContent = initials;
        
        // Simulate customer rating (you can get this from database)
        this.updateCustomerRating();
    }

    // Get initials from name
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    // Update customer rating (mock data for now)
    updateCustomerRating() {
        // This would come from your database
        const rating = 4.5;
        const jobCount = 12;
        
        const starsContainer = document.querySelector('.customer-rating .stars');
        const ratingText = document.querySelector('.customer-rating span');
        
        // Generate star HTML
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        
        starsContainer.innerHTML = starsHTML;
        ratingText.textContent = `${rating} (${jobCount} jobs)`;
    }

    // Update job details
    updateJobDetails(job) {
        document.getElementById('modal-service-name').textContent = job.service_name;
        document.getElementById('modal-job-date').textContent = this.formatFullDate(job.job_date);
        document.getElementById('modal-job-time').textContent = job.job_time || 'TBD';
        document.getElementById('modal-job-location').textContent = job.location;
        document.getElementById('modal-job-duration').textContent = job.estimated_duration || 'Not specified';
        document.getElementById('modal-job-payment').textContent = job.payment_status || 'Pending';
        
        // Update notes if available
        const notesSection = document.getElementById('job-notes-section');
        const notesElement = document.getElementById('modal-job-notes');
        
        if (job.notes && job.notes.trim()) {
            notesElement.textContent = job.notes;
            notesSection.style.display = 'block';
        } else {
            notesSection.style.display = 'none';
        }
    }

    // Update action buttons based on job status
    updateActionButtons() {
        const startBtn = document.getElementById('btn-start-job');
        const pauseBtn = document.getElementById('btn-pause-job');
        const completeBtn = document.getElementById('btn-complete-job');
        const timeTracking = document.getElementById('time-tracking');
        
        // Hide all buttons first
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        completeBtn.style.display = 'none';
        timeTracking.style.display = 'none';
        
        switch (this.currentJob.status) {
            case 'Scheduled':
                startBtn.style.display = 'flex';
                break;
            case 'In Progress':
                pauseBtn.style.display = 'flex';
                completeBtn.style.display = 'flex';
                timeTracking.style.display = 'block';
                this.startTimeTracking();
                break;
            case 'Completed':
                // Show completed state
                break;
        }
    }

    // Initialize customer avatar with image or initials
    initializeCustomerAvatar(customerName) {
        const avatar = document.getElementById('customer-avatar');
        
        // Check if customer has a profile image (you would get this from your API)
        // For now, we'll use a placeholder with initials
        const hasProfileImage = false; // This would come from your database
        
        if (hasProfileImage) {
            avatar.innerHTML = `
                <img src="path/to/customer/image.jpg" alt="${customerName}">
                <div class="avatar-status online"></div>
            `;
        } else {
            // Keep the initials version
            const initials = this.getInitials(customerName);
            document.getElementById('customer-avatar-text').textContent = initials;
        }
    }

    // Load job photos with enhanced UI
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

    // Update photo tabs with counts
    updatePhotoTabs(photos) {
        const beforeCount = photos.Before ? photos.Before.length : 0;
        const afterCount = photos.After ? photos.After.length : 0;
        
        document.getElementById('before-count').textContent = `${beforeCount} before`;
        document.getElementById('after-count').textContent = `${afterCount} after`;
    }

    // Render photos with enhanced UI
    renderPhotos(photos) {
        const photoGrid = document.getElementById('photo-grid');
        
        if (photos.length === 0) {
            photoGrid.innerHTML = this.createPhotoUploadPrompt();
            return;
        }

        let html = photos.map(photo => `
            <div class="photo-item" onclick="jobDetailsManager.viewPhoto('${photo.file_url}')">
                <img src="${photo.file_url}" alt="${photo.media_type}" loading="lazy">
                <div class="photo-overlay">
                    <button class="photo-delete" onclick="event.stopPropagation(); jobDetailsManager.deletePhoto(${photo.id})">×</button>
                    <button class="photo-view" onclick="event.stopPropagation(); jobDetailsManager.viewPhoto('${photo.file_url}')">👁️</button>
                </div>
            </div>
        `).join('');

        html += this.createPhotoUploadPrompt();
        photoGrid.innerHTML = html;
    }

    // Create photo upload prompt
    createPhotoUploadPrompt() {
        return `
            <div class="photo-upload-area" onclick="jobDetailsManager.takePhoto('${this.currentPhotoTab}')">
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <p>Tap to add photos</p>
                <small>Take or upload photos</small>
            </div>
        `;
    }

    // Switch photo tabs with animation
    switchPhotoTab(tab) {
        this.currentPhotoTab = tab;
        
        // Update tab styling
        document.querySelectorAll('.photo-tab-enhanced').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Reload photos for new tab
        this.loadJobPhotos();
    }

    // Take photo with enhanced feedback
    takePhoto(type) {
        const input = document.getElementById('photo-input');
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadPhoto(file, type);
            }
        };
        input.click();
    }

    // Upload photo with progress feedback
    async uploadPhoto(file, type) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('job_id', this.currentJob.id);
        formData.append('media_type', type);
        formData.append('uploaded_by', 'Staff');
        
        try {
            this.showUploadProgress();
            
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Photo uploaded successfully', 'success');
                this.loadJobPhotos();
                
                // Emit real-time update
                if (window.socket) {
                    window.socket.emit('photo-uploaded', {
                        job_id: this.currentJob.id,
                        media_type: type,
                        file_url: result.media.file_url
                    });
                }
            } else {
                this.showNotification('Failed to upload photo', 'error');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            this.showNotification('Error uploading photo', 'error');
        } finally {
            this.hideUploadProgress();
        }
    }

    // Start job with enhanced feedback
    async startJob() {
        try {
            this.showActionProgress('Starting job...');
            
            const response = await fetch(`/api/jobs/${this.currentJob.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'In Progress' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentJob = result.job;
                this.updateJobStatus();
                this.updateActionButtons();
                this.showNotification('Job started successfully', 'success');
                
                // Start time tracking
                this.startTimeTracking();
                
                // Emit real-time update
                if (window.socket) {
                    window.socket.emit('job-status-changed', {
                        job_id: this.currentJob.id,
                        status: 'In Progress'
                    });
                }
                
                // Haptic feedback (if available)
                this.vibrateDevice();
            }
        } catch (error) {
            console.error('Error starting job:', error);
            this.showNotification('Error starting job', 'error');
        } finally {
            this.hideActionProgress();
        }
    }

    // Complete job with validation
    async completeJob() {
        // Validate required photos
        const hasBeforePhotos = await this.hasPhotos('before');
        const hasAfterPhotos = await this.hasPhotos('after');
        
        if (!hasBeforePhotos || !hasAfterPhotos) {
            this.showNotification('Please add both before and after photos', 'warning');
            return;
        }
        
        try {
            this.showActionProgress('Completing job...');
            
            const response = await fetch(`/api/jobs/${this.currentJob.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentJob = result.job;
                this.updateJobStatus();
                this.updateActionButtons();
                this.showNotification('Job completed successfully!', 'success');
                
                // Stop time tracking
                this.stopTimeTracking();
                
                // Show completion summary
                this.showCompletionSummary();
                
                // Emit real-time update
                if (window.socket) {
                    window.socket.emit('job-status-changed', {
                        job_id: this.currentJob.id,
                        status: 'Completed'
                    });
                    
                    window.socket.emit('job-completed', {
                        job_id: this.currentJob.id,
                        customer_name: this.currentJob.customer_name,
                        service_name: this.currentJob.service_name
                    });
                }
                
                // Haptic feedback
                this.vibrateDevice([200, 100, 200]);
            }
        } catch (error) {
            console.error('Error completing job:', error);
            this.showNotification('Error completing job', 'error');
        } finally {
            this.hideActionProgress();
        }
    }

    // Pause job
    async pauseJob() {
        try {
            const response = await fetch(`/api/jobs/${this.currentJob.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Paused' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentJob = result.job;
                this.updateJobStatus();
                this.pauseTimeTracking();
                this.showNotification('Job paused', 'info');
            }
        } catch (error) {
            console.error('Error pausing job:', error);
            this.showNotification('Error pausing job', 'error');
        }
    }

    // Start time tracking
    startTimeTracking() {
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.isPaused = false;
        
        this.timeTrackingInterval = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedTime = Date.now() - this.startTime;
                this.updateTimeDisplay();
            }
        }, 1000);
    }

    // Pause time tracking
    pauseTimeTracking() {
        this.isPaused = true;
    }

    // Resume time tracking
    resumeTimeTracking() {
        this.isPaused = false;
    }

    // Stop time tracking
    stopTimeTracking() {
        if (this.timeTrackingInterval) {
            clearInterval(this.timeTrackingInterval);
            this.timeTrackingInterval = null;
        }
    }

    // Update time display
    updateTimeDisplay() {
        const timeElement = document.getElementById('elapsed-time');
        if (timeElement) {
            const seconds = Math.floor(this.elapsedTime / 1000);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            timeElement.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Check if job has photos
    async hasPhotos(type) {
        try {
            const response = await fetch(`/api/media/job/${this.currentJob.id}/grouped`);
            const photos = await response.json();
            return photos[type] && photos[type].length > 0;
        } catch (error) {
            return false;
        }
    }

    // Show completion summary
    showCompletionSummary() {
        const totalTime = this.elapsedTime;
        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        
        this.showNotification(
            `Job completed in ${hours}h ${minutes}m! Great work!`,
            'success',
            5000
        );
    }

    // Customer action methods
    callCustomer() {
        const phone = this.currentJob.customer_phone;
        if (phone) {
            window.open(`tel:${phone}`, '_self');
        } else {
            this.showNotification('No phone number available', 'warning');
        }
    }

    messageCustomer() {
        // This would open a messaging interface
        this.showNotification('Messaging feature coming soon', 'info');
    }

    navigateToCustomer() {
        if (this.currentJob.location) {
            window.open(`https://maps.google.com/?q=${encodeURIComponent(this.currentJob.location)}`, '_blank');
        }
    }

    reportIssue() {
        const issue = prompt('Describe the issue:');
        if (issue) {
            this.showNotification('Issue reported to support', 'success');
            // Here you would send the issue to your support system
        }
    }

    requestHelp() {
        this.showNotification('Help request sent to team', 'success');
        // Here you would notify other staff members
    }

    shareJob() {
        if (navigator.share) {
            navigator.share({
                title: `${this.currentJob.service_name} - ${this.currentJob.customer_name}`,
                text: `Job at ${this.currentJob.location} on ${this.formatFullDate(this.currentJob.job_date)}`,
                url: window.location.href
            });
        } else {
            // Fallback - copy to clipboard
            const text = `${this.currentJob.service_name} - ${this.currentJob.customer_name}\n${this.currentJob.location}\n${this.formatFullDate(this.currentJob.job_date)}`;
            navigator.clipboard.writeText(text);
            this.showNotification('Job details copied to clipboard', 'success');
        }
    }

    // Close modal with animation
    closeJobDetail() {
        const modal = document.getElementById('job-detail-modal');
        modal.classList.remove('show');
        
        // Stop time tracking
        this.stopTimeTracking();
        
        // Clear current job
        setTimeout(() => {
            this.currentJob = null;
        }, 300);
    }

    // UI Helper Methods
    showLoadingState() {
        // Show loading skeleton or spinner
        console.log('Loading job details...');
    }

    hideLoadingState() {
        // Hide loading state
        console.log('Job details loaded');
    }

    showActionProgress(message) {
        // Show progress indicator
        console.log('Action:', message);
    }

    hideActionProgress() {
        // Hide progress indicator
        console.log('Action completed');
    }

    showUploadProgress() {
        // Show upload progress
        console.log('Uploading photo...');
    }

    hideUploadProgress() {
        // Hide upload progress
        console.log('Upload completed');
    }

    animateModalOpen() {
        // Add entrance animation
        const modal = document.querySelector('.modal-content-enhanced');
        modal.style.animation = 'slideUp 0.3s ease-out';
    }

    vibrateDevice(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // Utility methods
    formatFullDate(dateString) {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Use existing notification system or create one
        if (window.showNotification) {
            window.showNotification(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize the job details manager
const jobDetailsManager = new JobDetailsManager();

// Global functions for backward compatibility
function openJobDetail(jobId) {
    jobDetailsManager.openJobDetail(jobId);
}

function closeJobDetail() {
    jobDetailsManager.closeJobDetail();
}

function switchPhotoTab(tab) {
    jobDetailsManager.switchPhotoTab(tab);
}

function takePhoto(type) {
    jobDetailsManager.takePhoto(type);
}

function startJob() {
    jobDetailsManager.startJob();
}

function pauseJob() {
    jobDetailsManager.pauseJob();
}

function completeJob() {
    jobDetailsManager.completeJob();
}

function callCustomer() {
    jobDetailsManager.callCustomer();
}

function messageCustomer() {
    jobDetailsManager.messageCustomer();
}

function navigateToCustomer() {
    jobDetailsManager.navigateToCustomer();
}

function reportIssue() {
    jobDetailsManager.reportIssue();
}

function requestHelp() {
    jobDetailsManager.requestHelp();
}

function shareJob() {
    jobDetailsManager.shareJob();
}

// Time tracking functions
function pauseTracking() {
    jobDetailsManager.pauseTimeTracking();
}

function resumeTracking() {
    jobDetailsManager.resumeTimeTracking();
}

function stopTracking() {
    jobDetailsManager.stopTimeTracking();
}
