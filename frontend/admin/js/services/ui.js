/**
 * FieldOps Core - UI Components Library
 * Reusable UI components for notifications, modals, loading states
 * 
 * @module ui
 */

/**
 * Notification system
 */
const notifications = {
    /**
     * Show notification
     */
    show(message, type = 'info', duration = 3000) {
        if (!message) return;
        
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${type}`;
        
        const backgroundColor = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#2563eb'
        }[type] || '#2563eb';
        
        notificationEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 2000;
            background: ${backgroundColor};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        notificationEl.textContent = message;
        document.body.appendChild(notificationEl);
        
        if (duration > 0) {
            setTimeout(() => {
                notificationEl.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notificationEl.remove(), 300);
            }, duration);
        }
    },

    /**
     * Success notification
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    },

    /**
     * Error notification
     */
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    },

    /**
     * Warning notification
     */
    warning(message, duration = 3000) {
        this.show(message, 'warning', duration);
    },

    /**
     * Info notification
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
};

/**
 * Modal management
 */
const modals = {
    /**
     * Show modal
     */
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            logger.warn(`Modal not found: ${modalId}`);
            return;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Hide modal
     */
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            logger.warn(`Modal not found: ${modalId}`);
            return;
        }
        
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) form.reset();
    },

    /**
     * Hide all modals
     */
    hideAll() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    },

    /**
     * Confirm dialog
     */
    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            if (!window.confirm(message)) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    },

    /**
     * Prompt dialog
     */
    prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            const result = window.prompt(message, defaultValue);
            resolve(result);
        });
    }
};

/**
 * Loading states
 */
const loading = {
    /**
     * Show loading spinner
     */
    show(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-spinner" style="
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 2rem;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e2e8f0;
                    border-top: 4px solid #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
        `;
        
        // Ensure animation keyframes exist
        this._ensureKeyframes();
    },

    /**
     * Show empty state
     */
    empty(containerId, message = 'No data found') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state" style="
                text-align: center;
                padding: 3rem 1rem;
                color: #64748b;
            ">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
                <p style="font-size: 1rem;">${message}</p>
            </div>
        `;
    },

    /**
     * Show error state
     */
    error(containerId, message = 'Failed to load data', retry = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let retryBtn = '';
        if (typeof retry === 'function') {
            retryBtn = '<button style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="' + retry.toString() + '()">Retry</button>';
        }
        
        container.innerHTML = `
            <div class="error-state" style="
                text-align: center;
                padding: 3rem 1rem;
                color: #ef4444;
                background: #fef2f2;
                border-radius: 8px;
            ">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
                <p style="font-size: 1rem;">${message}</p>
                ${retryBtn}
            </div>
        `;
    },

    /**
     * Ensure animation keyframes
     * @private
     */
    _ensureKeyframes() {
        if (document.getElementById('loading-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'loading-animations';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
};

/**
 * Table utilities
 */
const table = {
    /**
     * Render table from data array
     */
    render(containerId, columns, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            loading.empty(containerId);
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        
        // Headers
        html += '<thead><tr>';
        columns.forEach(col => {
            html += `<th style="
                padding: 12px;
                border-bottom: 2px solid #e2e8f0;
                text-align: left;
                font-weight: 600;
            ">${col.label}</th>`;
        });
        html += '</tr></thead>';
        
        // Rows
        html += '<tbody>';
        data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                const value = col.render 
                    ? col.render(row[col.key], row)
                    : row[col.key];
                html += `<td style="
                    padding: 12px;
                    border-bottom: 1px solid #e2e8f0;
                ">${value || '-'}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        
        container.innerHTML = html;
    }
};

/**
 * Form handling
 */
const forms = {
    /**
     * Get form data as object
     */
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return null;
        
        const formData = new FormData(form);
        const obj = {};
        
        for (const [key, value] of formData.entries()) {
            if (obj[key]) {
                if (!Array.isArray(obj[key])) {
                    obj[key] = [obj[key]];
                }
                obj[key].push(value);
            } else {
                obj[key] = value;
            }
        }
        
        return obj;
    },

    /**
     * Set form data from object
     */
    setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else if (input.type === 'radio') {
                    form.querySelector(`[name="${key}"][value="${data[key]}"]`).checked = true;
                } else {
                    input.value = data[key];
                }
            }
        });
    },

    /**
     * Reset form
     */
    reset(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    },

    /**
     * Set form errors
     */
    setErrors(formId, errors) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Clear previous errors
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        
        // Show new errors
        Object.keys(errors).forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.style.borderColor = '#ef4444';
                const errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                errorEl.textContent = errors[field];
                errorEl.style.color = '#ef4444';
                errorEl.style.fontSize = '0.875rem';
                errorEl.style.marginTop = '0.25rem';
                input.parentNode.insertBefore(errorEl, input.nextSibling);
            }
        });
    },

    /**
     * Clear errors
     */
    clearErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
        });
    }
};

// Export UI components globally
window.ui = {
    notify: notifications,
    modal: modals,
    loading,
    table,
    form: forms
};
