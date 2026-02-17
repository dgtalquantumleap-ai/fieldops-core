/**
 * FieldOps Core - Utility Functions
 * Common helper functions for formatting, validation, and DOM manipulation
 * 
 * @module utils
 */

/**
 * Formatting utilities
 */
const formatters = {
    /**
     * Format date string to readable format
     */
    date(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (err) {
            logger.warn(`Failed to format date: ${dateString}`, err);
            return 'Invalid date';
        }
    },

    /**
     * Format time string to readable format
     */
    time(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (err) {
            logger.warn(`Failed to format time: ${dateString}`, err);
            return 'Invalid time';
        }
    },

    /**
     * Format currency
     */
    currency(amount) {
        if (amount === null || amount === undefined) return '$0.00';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(parseFloat(amount) || 0);
        } catch (err) {
            return `$${parseFloat(amount || 0).toFixed(2)}`;
        }
    },

    /**
     * Format percentage
     */
    percentage(value, decimals = 1) {
        if (value === null || value === undefined) return '0%';
        return (parseFloat(value) || 0).toFixed(decimals) + '%';
    },

    /**
     * Format trend indicator
     */
    trend(current, previous) {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const pct = Math.round(((current - previous) / previous) * 100);
        return (pct >= 0 ? '+' : '') + pct + '%';
    }
};

/**
 * Validation utilities
 */
const validators = {
    /**
     * Validate email format
     */
    email(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate phone format (basic)
     */
    phone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
        return phoneRegex.test(phone.replace(/\D/g, '').length >= 7 ? phone : '');
    },

    /**
     * Validate required field
     */
    required(value) {
        return value && value.toString().trim().length > 0;
    },

    /**
     * Validate minimum length
     */
    minLength(value, length) {
        return value && value.toString().length >= length;
    },

    /**
     * Validate number is positive
     */
    positive(value) {
        return parseFloat(value) > 0;
    },

    /**
     * Validate date is in future
     */
    futureDate(dateString) {
        try {
            return new Date(dateString) > new Date();
        } catch {
            return false;
        }
    },

    /**
     * Validate form with schema
     */
    validateForm(formData, schema) {
        const errors = {};
        
        Object.keys(schema).forEach(field => {
            const rules = schema[field];
            const value = formData[field];
            
            if (rules.required && !this.required(value)) {
                errors[field] = `${field} is required`;
            }
            
            if (rules.email && value && !this.email(value)) {
                errors[field] = `${field} must be a valid email`;
            }
            
            if (rules.minLength && value && !this.minLength(value, rules.minLength)) {
                errors[field] = `${field} must be at least ${rules.minLength} characters`;
            }
            
            if (rules.positive && value && !this.positive(value)) {
                errors[field] = `${field} must be a positive number`;
            }
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

/**
 * DOM utilities
 */
const dom = {
    /**
     * Get element safely
     */
    get(selector) {
        const el = document.getElementById(selector) || document.querySelector(selector);
        if (!el) {
            logger.warn(`Element not found: ${selector}`);
        }
        return el;
    },

    /**
     * Get or throw if not found
     */
    require(selector) {
        const el = this.get(selector);
        if (!el) throw new Error(`Element not found: ${selector}`);
        return el;
    },

    /**
     * Query all matching elements
     */
    getAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Set element content safely
     */
    setContent(selector, content) {
        const el = this.get(selector);
        if (el) {
            el.textContent = content;
        }
    },

    /**
     * Set element HTML safely
     */
    setHTML(selector, html) {
        const el = this.get(selector);
        if (el) {
            el.innerHTML = html;
        }
    },

    /**
     * Add CSS class
     */
    addClass(selector, className) {
        const el = this.get(selector);
        if (el) el.classList.add(className);
    },

    /**
     * Remove CSS class
     */
    removeClass(selector, className) {
        const el = this.get(selector);
        if (el) el.classList.remove(className);
    },

    /**
     * Toggle CSS class
     */
    toggleClass(selector, className) {
        const el = this.get(selector);
        if (el) el.classList.toggle(className);
    },

    /**
     * Check if element has class
     */
    hasClass(selector, className) {
        const el = this.get(selector);
        return el ? el.classList.contains(className) : false;
    },

    /**
     * Set element attribute
     */
    setAttr(selector, attr, value) {
        const el = this.get(selector);
        if (el) el.setAttribute(attr, value);
    },

    /**
     * Get element attribute
     */
    getAttr(selector, attr) {
        const el = this.get(selector);
        return el ? el.getAttribute(attr) : null;
    }
};

/**
 * Status utilities
 */
const statusHelpers = {
    colors: {
        'Scheduled': '#2563eb',
        'In Progress': '#f59e0b',
        'Completed': '#10b981',
        'Cancelled': '#64748b',
        'paid': '#10b981',
        'unpaid': '#ef4444',
        'active': '#10b981',
        'inactive': '#64748b',
        'suspended': '#f59e0b'
    },

    icons: {
        'Scheduled': '📅',
        'In Progress': '⏰',
        'Completed': '✅',
        'Cancelled': '❌',
        'paid': '✅',
        'unpaid': '⏳',
        'active': '🟢',
        'inactive': '🔴',
        'suspended': '🟡'
    },

    /**
     * Get status color
     */
    getColor(status) {
        return this.colors[status] || '#64748b';
    },

    /**
     * Get status icon
     */
    getIcon(status) {
        return this.icons[status] || '❓';
    },

    /**
     * Get status badge class
     */
    getBadgeClass(status) {
        return `status-${(status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
    }
};

/**
 * Array utilities
 */
const arrays = {
    /**
     * Group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) result[group] = [];
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Sort array by key
     */
    sortBy(array, key, ascending = true) {
        return [...array].sort((a, b) => {
            if (ascending) {
                return a[key] > b[key] ? 1 : -1;
            }
            return a[key] < b[key] ? 1 : -1;
        });
    },

    /**
     * Filter array by multiple conditions
     */
    filter(array, conditions) {
        return array.filter(item => {
            return Object.keys(conditions).every(key => {
                return item[key] === conditions[key];
            });
        });
    },

    /**
     * Find first matching item
     */
    find(array, condition) {
        return array.find(item => {
            return Object.keys(condition).every(key => {
                return item[key] === condition[key];
            });
        });
    },

    /**
     * Remove item from array
     */
    remove(array, item) {
        const index = array.indexOf(item);
        if (index > -1) array.splice(index, 1);
        return array;
    }
};

// Export utilities globally
window.utils = {
    format: formatters,
    validate: validators,
    dom,
    status: statusHelpers,
    array: arrays
};
