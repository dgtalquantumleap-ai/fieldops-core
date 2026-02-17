// Enhanced Staff App with Real-time Updates and Photo Management
let socket;
let currentJob = null;
let currentPhotoTab = 'before';
let jobs = [];

// Auth guard - redirect to login if not authenticated
(function() {
  const token = localStorage.getItem('staffToken');
  if (!token) { window.location.href = '/staff/login.html'; }
})();

function staffAuthHeaders() {
  const token = localStorage.getItem('staffToken');
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔌 Connected to real-time updates');
        socket.emit('join-room', 'staff');
    });
    
    socket.on('job-updated', (data) => {
        console.log('🔄 Job updated:', data);
        if (currentJob && currentJob.id === data.job.id) {
            currentJob = data.job;
            updateJobDetail();
        }
        loadJobs(); // Refresh jobs list
    });
    
    socket.on('new-booking', (data) => {
        console.log('📅 New booking received');
        loadJobs(); // Refresh jobs list
        showNotification('New booking assigned!', 'success');
    });
}

// Load staff jobs
async function loadJobs() {
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) return;
    
    try {
        jobsList.innerHTML = '<div style="text-align:center; padding:2rem;"><p>Loading jobs...</p></div>';
        
        const response = await fetch('/api/staff/jobs', {
            headers: staffAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        jobs = await response.json();
        renderJobs();
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobsList.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;"><p>❌ Error loading jobs</p><p style="font-size:0.9rem; margin-top:0.5rem;">${error.message}</p><button onclick="loadJobs()" style="margin-top:1rem; padding:0.5rem 1rem; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer;">Retry</button></div>`;
    }
}

// Render jobs list
function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    if (!jobs || jobs.length === 0) {
        jobsList.innerHTML = `
            <div style="text-align:center; padding:3rem 1.5rem; color:#64748B;">
                <div style="font-size:3rem; margin-bottom:1rem;">✅</div>
                <h3 style="color:#1E293B; margin-bottom:0.5rem;">No Jobs Today</h3>
                <p style="font-size:0.9rem;">Check back later or contact your supervisor.</p>
            </div>
        `;
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = jobs.filter(job => job.job_date === today);
    const upcomingJobs = jobs.filter(job => job.job_date > today);
    
    let html = '';
    
    if (todayJobs.length > 0) {
        html += '<div class="jobs-section"><h3>Today\'s Jobs</h3>';
        todayJobs.forEach(job => {
            html += createJobCard(job);
        });
        html += '</div>';
    }
    
    if (upcomingJobs.length > 0) {
        html += '<div class="jobs-section"><h3>Upcoming Jobs</h3>';
        upcomingJobs.forEach(job => {
            html += createJobCard(job);
        });
        html += '</div>';
    }
    
    jobsList.innerHTML = html;
}

// Create job card HTML
function createJobCard(job) {
    const statusColors = {
        'scheduled': 'blue',
        'in-progress': 'orange',
        'completed': 'green',
        'cancelled': 'gray'
    };
    
    const statusColor = statusColors[job.status] || 'gray';
    const time = job.job_time || 'TBD';
    
    return `
        <div class="job-card" onclick="openJobDetail(${job.id})">
            <div class="job-card-header">
                <div class="job-status-badge status-${statusColor}">${job.status}</div>
                <div class="job-time">${time}</div>
            </div>
            <h4>${job.service_name}</h4>
            <p class="customer-name">${job.customer_name}</p>
            <p class="location">📍 ${job.location}</p>
        </div>
    `;
}

// Open job detail
async function openJobDetail(jobId) {
    if (!jobId) return;
    
    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            headers: staffAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        currentJob = await response.json();
        
        // Update modal content with safe text content
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value || '');
        };
        
        updateElement('modal-service-name', currentJob.service_name);
        updateElement('modal-customer-name', currentJob.customer_name);
        updateElement('modal-job-date', formatDate(currentJob.job_date));
        updateElement('modal-job-time', currentJob.job_time || 'TBD');
        updateElement('modal-job-location', currentJob.location);
        
        updateJobDetail();
        await loadJobPhotos();
        
        // Show modal
        const modal = document.getElementById('job-detail-modal');
        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading job details:', error);
        showNotification('Error loading job details: ' + error.message, 'error');
    }
}

// Update job detail UI
function updateJobDetail() {
    const statusBadge = document.getElementById('modal-job-status');
    const startBtn = document.getElementById('btn-start-job');
    const completeBtn = document.getElementById('btn-complete-job');
    
    statusBadge.textContent = currentJob.status;
    statusBadge.className = `job-status-badge status-${getStatusColor(currentJob.status)}`;
    
    // Show/hide action buttons based on status
    startBtn.style.display = currentJob.status === 'Scheduled' ? 'block' : 'none';
    completeBtn.style.display = currentJob.status === 'In Progress' ? 'block' : 'none';
}

// Load job photos
async function loadJobPhotos() {
    if (!currentJob || !currentJob.id) return;
    
    try {
        const response = await fetch(`/api/media/job/${currentJob.id}/grouped`, {
            headers: staffAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const photos = await response.json();
        
        updatePhotoTabs(photos);
        renderPhotos(photos[currentPhotoTab] || []);
    } catch (error) {
        console.error('Error loading photos:', error);
        showNotification('Error loading photos: ' + error.message, 'error');
    }
}

// Update photo tabs
function updatePhotoTabs(photos) {
    const beforeTab = document.querySelector('.photo-tab:nth-child(1)');
    const afterTab = document.querySelector('.photo-tab:nth-child(2)');
    
    beforeTab.textContent = `Before (${photos.Before.length})`;
    afterTab.textContent = `After (${photos.After.length})`;
}

// Render photos
function renderPhotos(photos) {
    const photoGrid = document.getElementById('photo-grid');
    
    if (photos.length === 0) {
        photoGrid.innerHTML = `
            <div class="photo-upload-btn" onclick="takePhoto('${currentPhotoTab}')">
                <span class="camera-icon">📸</span>
                <span>Take ${currentPhotoTab} Photo</span>
            </div>
        `;
        return;
    }
    
    let html = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.file_url}" alt="${photo.media_type}" onclick="viewPhoto('${photo.file_url}')">
            <button class="photo-delete" onclick="deletePhoto(${photo.id})">×</button>
        </div>
    `).join('');
    
    html += `
        <div class="photo-upload-btn" onclick="takePhoto('${currentPhotoTab}')">
            <span class="camera-icon">📸</span>
            <span>Add ${currentPhotoTab} Photo</span>
        </div>
    `;
    
    photoGrid.innerHTML = html;
}

// Switch photo tab
function switchPhotoTab(tab, event) {
    if (!tab) return;
    
    currentPhotoTab = tab;
    
    // Update tab styling
    document.querySelectorAll('.photo-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Reload photos for new tab
    loadJobPhotos();
}

// Take photo
function takePhoto(type) {
    const input = document.getElementById('photo-input');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadPhoto(file, type);
        }
    };
    input.click();
}

// Upload photo
async function uploadPhoto(file, type) {
    if (!file || !currentJob || !currentJob.id || !type) {
        showNotification('Invalid photo upload data', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('job_id', currentJob.id);
    formData.append('media_type', type);
    formData.append('uploaded_by', 'Staff');
    
    try {
        const response = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('staffToken') },
            body: formData
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Photo uploaded successfully', 'success');
            await loadJobPhotos(); // Refresh photos
            
            // Emit real-time update if socket is connected
            if (socket && socket.connected) {
                socket.emit('photo-uploaded', {
                    job_id: currentJob.id,
                    media_type: type,
                    file_url: result.media.file_url
                });
            }
        } else {
            showNotification('Failed to upload photo: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        showNotification('Error uploading photo: ' + error.message, 'error');
    }
}

// Delete photo
async function deletePhoto(photoId) {
    if (!photoId) return;
    if (!confirm('Delete this photo?')) return;
    
    try {
        const response = await fetch(`/api/media/${photoId}`, {
            method: 'DELETE',
            headers: staffAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Photo deleted', 'success');
            await loadJobPhotos(); // Refresh photos
        } else {
            showNotification('Failed to delete photo: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        showNotification('Error deleting photo: ' + error.message, 'error');
    }
}

// Start job
async function startJob() {
    if (!currentJob || !currentJob.id) return;
    
    try {
        const response = await fetch(`/api/jobs/${currentJob.id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                ...Object.fromEntries(Object.entries(staffAuthHeaders()).filter(([k]) => k !== 'Content-Type'))
            },
            body: JSON.stringify({ status: 'In Progress' })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentJob = result.job;
            updateJobDetail();
            showNotification('Job started', 'success');
            
            // Emit real-time update if socket is connected
            if (socket && socket.connected) {
                socket.emit('job-status-changed', {
                    job_id: currentJob.id,
                    status: 'In Progress'
                });
            }
        }
    } catch (error) {
        console.error('Error starting job:', error);
        showNotification('Error starting job: ' + error.message, 'error');
    }
}

// Complete job
async function completeJob() {
    if (!currentJob || !currentJob.id) return;
    
    try {
        const response = await fetch(`/api/jobs/${currentJob.id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                ...Object.fromEntries(Object.entries(staffAuthHeaders()).filter(([k]) => k !== 'Content-Type'))
            },
            body: JSON.stringify({ status: 'Completed' })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/staff/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentJob = result.job;
            updateJobDetail();
            showNotification('Job completed!', 'success');
            
            // Emit real-time updates if socket is connected
            if (socket && socket.connected) {
                socket.emit('job-status-changed', {
                    job_id: currentJob.id,
                    status: 'Completed'
                });
                
                // Trigger automations
                socket.emit('job-completed', {
                    job_id: currentJob.id,
                    customer_name: currentJob.customer_name,
                    service_name: currentJob.service_name
                });
            }
        }
    } catch (error) {
        console.error('Error completing job:', error);
        showNotification('Error completing job: ' + error.message, 'error');
    }
}

// Open navigation
function openNavigation() {
    if (currentJob && currentJob.location) {
        window.open(`https://maps.google.com/?q=${encodeURIComponent(currentJob.location)}`, '_blank');
    }
}

// Close job detail
function closeJobDetail() {
    document.getElementById('job-detail-modal').style.display = 'none';
    currentJob = null;
}

// View photo
function viewPhoto(url) {
    window.open(url, '_blank');
}

// Utility functions
function getStatusColor(status) {
    const colors = {
        'Scheduled': 'blue',
        'In Progress': 'orange',
        'Completed': 'green',
        'Cancelled': 'gray'
    };
    return colors[status] || 'gray';
}

function formatDate(dateString) {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showNotification(message, type) {
    // Simple notification implementation
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
        z-index: 1000;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    if (confirm('Logout from staff app?')) {
        window.location.href = '/staff/login.html';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    loadJobs();
});
