/**
 * FieldOps Core - State Management
 * Centralized state management with subscribers pattern
 * 
 * @module state
 */

class StateManager {
    constructor() {
        this.state = {
            // Dashboard data
            jobs: [],
            invoices: [],
            customers: [],
            staff: [],
            automations: [],
            
            // UI state
            currentSection: 'dashboard',
            loading: {},
            selectedItem: null,
            
            // Auth
            isAuthenticated: !!localStorage.getItem('token'),
            user: JSON.parse(localStorage.getItem('user') || 'null'),
            
            // Filters
            filters: {
                jobs: 'all',
                invoices: 'all',
                staff: 'all'
            }
        };
        
        this.subscribers = {};
    }

    /**
     * Get state or specific part of state
     */
    getState(path = null) {
        if (!path) return { ...this.state };
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * Update state immutably
     */
    setState(updates, path = '') {
        const fullPath = path ? `${path}.` : '';
        
        Object.keys(updates).forEach(key => {
            const updatePath = fullPath + key;
            this._setNestedState(this.state, updatePath.split('.'), updates[key]);
            this._notifySubscribers(updatePath);
        });
    }

    /**
     * Set loading state for a section
     */
    setLoading(section, isLoading) {
        this.state.loading[section] = isLoading;
        this._notifySubscribers(`loading.${section}`);
    }

    /**
     * Check if section is loading
     */
    isLoading(section) {
        return this.state.loading[section] || false;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(path, callback) {
        if (!this.subscribers[path]) {
            this.subscribers[path] = [];
        }
        this.subscribers[path].push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.subscribers[path].indexOf(callback);
            if (index > -1) {
                this.subscribers[path].splice(index, 1);
            }
        };
    }

    /**
     * Set nested state value
     * @private
     */
    _setNestedState(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    /**
     * Notify subscribers of state changes
     * @private
     */
    _notifySubscribers(path) {
        if (this.subscribers[path]) {
            const newValue = this.getState(path);
            this.subscribers[path].forEach(callback => {
                try {
                    callback(newValue);
                } catch (error) {
                    logger.error(`Error in state subscriber for ${path}:`, error);
                }
            });
        }
    }
}

// Export globally
window.store = new StateManager();
