/**
 * FieldOps Core - Logger Module
 * Structured logging with proper error handling and no production console.logs
 * 
 * @module logger
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Detect environment: development if localhost, otherwise production
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const CURRENT_LOG_LEVEL = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

class Logger {
    /**
     * Debug level log (development only)
     */
    debug(message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }

    /**
     * Info level log
     */
    info(message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
            console.log(`[INFO] ${message}`, data || '');
        }
    }

    /**
     * Warning level log
     */
    warn(message, data = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${message}`, data || '');
        }
    }

    /**
     * Error level log with tracking
     */
    error(message, error = null) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${message}`, error || '');
        }
        // TODO: Send to error tracking service (e.g., Sentry)
        this.trackError(message, error);
    }

    /**
     * Track errors for monitoring
     * @private
     */
    trackError(message, error) {
        // This can be extended to send errors to a monitoring service
        // For now, just log locally
        const errorLog = {
            timestamp: new Date().toISOString(),
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null
        };
        
        // Store in sessionStorage for debugging (limited to ~5MB)
        try {
            const logs = JSON.parse(sessionStorage.getItem('errorLogs') || '[]');
            logs.push(errorLog);
            // Keep only last 50 errors
            if (logs.length > 50) logs.shift();
            sessionStorage.setItem('errorLogs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to store error log:', e);
        }
    }

    /**
     * Get stored error logs for debugging
     */
    getErrorLogs() {
        try {
            return JSON.parse(sessionStorage.getItem('errorLogs') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear error logs
     */
    clearErrorLogs() {
        sessionStorage.removeItem('errorLogs');
    }
}

// Export globally
window.logger = new Logger();
