// Staff Management Functions

// Load staff with filters
async function loadStaffManagement() {
    try {
        const filter = document.getElementById('staff-filter')?.value || 'all';
        
        let url = `${API_URL}/staff-management`;
        if (filter && filter !== 'all') {
            url += `?status=${filter}`;
        }
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!res.ok) throw new Error('Failed to load staff');
        
        const staff = await res.json();
        renderStaffList(staff);
        loadStaffStats();
    } catch (error) {
        console.error('Error loading staff:', error);
        showNotification('Failed to load staff', 'error');
    }
}

// Render staff list
function renderStaffList(staff) {
    const list = document.getElementById('staff-management-list');
    if (!list) return;
    
    if (staff.length === 0) {
        list.innerHTML = '<div class="no-data">No staff members found</div>';
        return;
    }
    
    list.innerHTML = staff.map(member => `
        <div class="staff-card ${member.status}">
            <div class="staff-header">
                <div>
                    <h3>${member.name}</h3>
                    <p class="staff-role">${member.role}</p>
                </div>
                <span class="status-badge status-${member.status}">${member.status}</span>
            </div>
            
            <div class="staff-details">
                <p><strong>Email:</strong> ${member.email}</p>
                <p><strong>Phone:</strong> ${member.phone || 'N/A'}</p>
                <p><strong>Hired:</strong> ${formatDate(member.created_at)}</p>
                ${member.last_login ? `<p><strong>Last Login:</strong> ${formatDate(member.last_login)}</p>` : ''}
                ${member.termination_date ? `<p><strong>Terminated:</strong> ${formatDate(member.termination_date)}</p>` : ''}
            </div>
            
            <div class="staff-stats">
                <div class="stat">
                    <span class="stat-value">${member.total_jobs || 0}</span>
                    <span class="stat-label">Total Jobs</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${member.completed_jobs || 0}</span>
                    <span class="stat-label">Completed</span>
                </div>
            </div>
            
            <div class="staff-actions">
                <button class="btn-small" onclick="viewStaffDetails(${member.id})">Details</button>
                
                ${member.status === 'active' ? `
                    <button class="btn-small btn-warning" onclick="suspendStaff(${member.id})">Suspend</button>
                    <button class="btn-small btn-danger" onclick="terminateStaff(${member.id})">Terminate</button>
                ` : ''}
                
                ${member.status === 'suspended' ? `
                    <button class="btn-small btn-success" onclick="reactivateStaff(${member.id})">Reactivate</button>
                    <button class="btn-small btn-danger" onclick="terminateStaff(${member.id})">Terminate</button>
                ` : ''}
                
                <button class="btn-small" onclick="resetStaffPassword(${member.id})">Reset Password</button>
            </div>
        </div>
    `).join('');
}

// Load staff statistics
async function loadStaffStats() {
    try {
        const res = await fetch(`${API_URL}/staff-management/stats/overview`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!res.ok) throw new Error('Failed to load staff stats');
        
        const stats = await res.json();
        
        // Update stat cards
        document.getElementById('total-staff-count').textContent = stats.total || 0;
        document.getElementById('active-staff-count').textContent = stats.active || 0;
        document.getElementById('suspended-staff-count').textContent = stats.suspended || 0;
        document.getElementById('terminated-staff-count').textContent = stats.terminated || 0;
        
    } catch (error) {
        console.error('Error loading staff stats:', error);
    }
}

// Onboard new staff
async function onboardStaff() {
    const formData = {
        name: document.getElementById('onboard-name').value,
        email: document.getElementById('onboard-email').value,
        phone: document.getElementById('onboard-phone').value,
        role: document.getElementById('onboard-role').value,
        password: document.getElementById('onboard-password').value
    };
    
    if (!formData.name || !formData.email || !formData.role || !formData.password) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/staff-management/onboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: JSON.stringify(formData)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Onboarding failed');
        }
        
        const result = await res.json();
        
        showNotification(`${result.staff.name} onboarded successfully!`, 'success');
        
        // Show temporary password to admin
        alert(`Staff Member Onboarded!

Name: ${result.staff.name}
Email: ${result.staff.email}
Temporary Password: ${result.temporaryPassword}

⚠️ IMPORTANT: Share this password securely with the staff member. They should change it on first login.`);
        
        closeModal('onboard-staff-modal');
        loadStaffManagement();
    } catch (error) {
        console.error('Onboarding error:', error);
        showNotification(error.message, 'error');
    }
}

// Suspend staff
async function suspendStaff(staffId) {
    const reason = prompt('Reason for suspension:');
    if (!reason) return;
    
    if (!confirm('Are you sure you want to suspend this staff member? They will lose access immediately.')) {
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/staff-management/${staffId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: JSON.stringify({ reason })
        });
        
        if (!res.ok) throw new Error('Suspension failed');
        
        const result = await res.json();
        showNotification(result.message, 'success');
        loadStaffManagement();
    } catch (error) {
        console.error('Suspension error:', error);
        showNotification('Failed to suspend staff member', 'error');
    }
}

// Reactivate staff
async function reactivateStaff(staffId) {
    const reason = prompt('Reason for reactivation:');
    if (!reason) return;
    
    try {
        const res = await fetch(`${API_URL}/staff-management/${staffId}/reactivate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: JSON.stringify({ reason })
        });
        
        if (!res.ok) throw new Error('Reactivation failed');
        
        const result = await res.json();
        showNotification(result.message, 'success');
        loadStaffManagement();
    } catch (error) {
        console.error('Reactivation error:', error);
        showNotification('Failed to reactivate staff member', 'error');
    }
}

// Terminate staff
async function terminateStaff(staffId) {
    const reason = prompt('Reason for termination (required):');
    if (!reason) return;
    
    const termDate = prompt('Termination date (YYYY-MM-DD) or leave blank for today:');
    
    if (!confirm('⚠️ FINAL WARNING: This staff member will be permanently terminated and removed from all active jobs. This cannot be easily undone. Continue?')) {
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/staff-management/${staffId}/terminate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: JSON.stringify({ 
                reason,
                termination_date: termDate || undefined
            })
        });
        
        if (!res.ok) throw new Error('Termination failed');
        
        const result = await res.json();
        showNotification(`${result.message}. ${result.unassigned_jobs} jobs unassigned.`, 'success');
        loadStaffManagement();
    } catch (error) {
        console.error('Termination error:', error);
        showNotification('Failed to terminate staff member', 'error');
    }
}

// Reset staff password
async function resetStaffPassword(staffId) {
    const newPassword = prompt('Enter new temporary password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/staff-management/${staffId}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` 
            },
            body: JSON.stringify({ new_password: newPassword })
        });
        
        if (!res.ok) throw new Error('Password reset failed');
        
        const result = await res.json();
        alert(`Password reset successfully!

New Temporary Password: ${result.temporary_password}

⚠️ Share this securely with the staff member. All their active sessions have been logged out.`);
        showNotification('Password reset successfully', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showNotification('Failed to reset password', 'error');
    }
}

// View staff details
async function viewStaffDetails(staffId) {
    try {
        const res = await fetch(`${API_URL}/staff-management/${staffId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!res.ok) throw new Error('Failed to load staff details');
        
        const staffData = await res.json();
        showStaffDetailsModal(staffData);
    } catch (error) {
        console.error('Error loading staff details:', error);
        showNotification('Failed to load staff details', 'error');
    }
}

// Show staff details modal
function showStaffDetailsModal(staff) {
    const modal = document.getElementById('staff-details-modal');
    if (!modal) return;
    
    // Update modal content
    document.getElementById('detail-staff-name').textContent = staff.name;
    document.getElementById('detail-staff-email').textContent = staff.email;
    document.getElementById('detail-staff-phone').textContent = staff.phone || 'N/A';
    document.getElementById('detail-staff-role').textContent = staff.role;
    document.getElementById('detail-staff-status').textContent = staff.status;
    document.getElementById('detail-staff-hire-date').textContent = formatDate(staff.created_at);
    document.getElementById('detail-staff-last-login').textContent = staff.last_login ? formatDate(staff.last_login) : 'Never';
    document.getElementById('detail-staff-termination-date').textContent = staff.termination_date ? formatDate(staff.termination_date) : 'N/A';
    document.getElementById('detail-staff-notes').textContent = staff.notes || 'No notes';
    
    // Update job statistics
    if (staff.jobStats) {
        document.getElementById('detail-total-jobs').textContent = staff.jobStats.total_jobs || 0;
        document.getElementById('detail-completed-jobs').textContent = staff.jobStats.completed_jobs || 0;
        document.getElementById('detail-scheduled-jobs').textContent = staff.jobStats.scheduled_jobs || 0;
        document.getElementById('detail-in-progress-jobs').textContent = staff.jobStats.in_progress_jobs || 0;
    }
    
    // Update activity log
    const activityLog = document.getElementById('staff-activity-log');
    if (activityLog && staff.activityLog) {
        activityLog.innerHTML = staff.activityLog.map(activity => `
            <div class="activity-item">
                <div class="activity-header">
                    <span class="activity-action">${activity.action}</span>
                    <span class="activity-date">${formatDate(activity.created_at)}</span>
                </div>
                <div class="activity-details">
                    <p><strong>By:</strong> ${activity.performed_by_name}</p>
                    ${activity.reason ? `<p><strong>Reason:</strong> ${activity.reason}</p>` : ''}
                    ${activity.details ? `<p><strong>Details:</strong> ${activity.details}</p>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    showModal('staff-details-modal');
}

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('authToken') || '';
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper function to show notifications (if not already defined)
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(notification);
    }
    
    // Set message and style based on type
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? '#10b981' : 
                                      type === 'error' ? '#ef4444' : 
                                      type === 'warning' ? '#f59e0b' : '#3b82f6';
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
