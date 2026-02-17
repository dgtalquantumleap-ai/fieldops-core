/**
 * FieldOps Core - Error Boundary
 * Global error handling and recovery
 * 
 * @module errorBoundary
 */

class ErrorBoundary {
    constructor() {
        this.errorHandlers = [];
        this.init();
    }

    /**
     * Initialize error boundary
     */
    init() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });
        
        // Handle promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
        
        // Handle bad XHR requests
        document.addEventListener('error', (event) => {
            if (event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement) {
                logger.error(`Failed to load resource: ${event.target.src || event.target.href}`);
            }
        }, true);
    }

    /**
     * Register error handler
     */
    onError(handler) {
        this.errorHandlers.push(handler);
    }

    /**
     * Handle errors
     */
    handleError(error) {
        logger.error('Global error caught:', error);
        
        // Notify user
        const message = error?.message || 'An unexpected error occurred';
        ui.notify.error(message);
        
        // Call registered handlers
        this.errorHandlers.forEach(handler => {
            try {
                handler(error);
            } catch (err) {
                logger.error('Error in error handler:', err);
            }
        });
        
        // Track error for debugging
        this.trackError(error);
    }

    /**
     * Track errors for monitoring
     */
    trackError(error) {
        const errorData = {
            timestamp: new Date().toISOString(),
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Store in sessionStorage
        try {
            const errors = JSON.parse(sessionStorage.getItem('appErrors') || '[]');
            errors.push(errorData);
            if (errors.length > 20) errors.shift();
            sessionStorage.setItem('appErrors', JSON.stringify(errors));
        } catch (e) {
            logger.warn('Failed to store error data:', e);
        }
        
        // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
    }

    /**
     * Get stored errors for debugging
     */
    getErrors() {
        try {
            return JSON.parse(sessionStorage.getItem('appErrors') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Clear stored errors
     */
    clearErrors() {
        sessionStorage.removeItem('appErrors');
    }

    /**
     * Display error page
     */
    displayErrorPage(title = 'Error', message = 'Something went wrong') {
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h1 style="color: #1e293b; margin-bottom: 0.5rem;">${title}</h1>
                    <p style="color: #64748b; margin-bottom: 2rem;">${message}</p>
                    <button onclick="location.reload()" style="
                        padding: 0.75rem 1.5rem;
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
    }
}

// Export globally
window.errorBoundary = new ErrorBoundary();

// Register default error handlers
errorBoundary.onError((error) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        });
    }
});
