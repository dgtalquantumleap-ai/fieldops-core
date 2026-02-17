/**
 * FieldOps Core - Security Module
 * Prevents common vulnerabilities and ensures data protection
 * 
 * @module security
 */

class SecurityManager {
    /**
     * Sanitize HTML to prevent XSS attacks
     */
    static sanitizeHTML(html) {
        if (!html) return '';
        
        const div = document.createElement('div');
        div.textContent = html; // textContent escapes HTML
        return div.innerHTML;
    }

    /**
     * Sanitize user input
     */
    static sanitizeInput(input) {
        if (!input) return '';
        
        return input
            .toString()
            .replace(/[<>]/g, '')
            .trim();
    }

    /**
     * Validate token format
     */
    static isValidToken(token) {
        if (!token || typeof token !== 'string') return false;
        
        // Should be JWT format: xxx.yyy.zzz
        const parts = token.split('.');
        return parts.length === 3;
    }

    /**
     * Check if token is likely expired
     */
    static isTokenExpired(token) {
        if (!this.isValidToken(token)) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp) {
                return Date.now() >= payload.exp * 1000;
            }
            return false;
        } catch (error) {
            logger.warn('Failed to parse token:', error);
            return true;
        }
    }

    /**
     * Validate authentication  
     */
    static validateAuth() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            logger.warn('No authentication token found');
            return false;
        }
        
        if (!this.isValidToken(token)) {
            logger.error('Invalid token format');
            localStorage.removeItem('token');
            return false;
        }
        
        if (this.isTokenExpired(token)) {
            logger.warn('Token expired');
            localStorage.removeItem('token');
            return false;
        }
        
        return true;
    }

    /**
     * Prevent CSRF attacks by validating same-origin
     */
    static validateOrigin(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            return urlObj.origin === window.location.origin;
        } catch {
            logger.warn('Invalid URL:', url);
            return false;
        }
    }

    /**
     * Safe JSON parse
     */
    static safeJsonParse(json, fallback = null) {
        try {
            return JSON.parse(json);
        } catch (error) {
            logger.warn('Failed to parse JSON:', error);
            return fallback;
        }
    }

    /**
     * Safe JSON stringify
     */
    static safeJsonStringify(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            logger.error('Failed to stringify JSON:', error);
            return fallback;
        }
    }

    /**
     * Encrypt sensitive data for storage (basic)
     * Note: This is not for highly sensitive data. Use backend encryption.
     */
    static encryptStorage(key, value) {
        try {
            // Simple base64 encoding (NOT cryptically secure)
            const encrypted = btoa(JSON.stringify(value));
            localStorage.setItem(key, encrypted);
        } catch (error) {
            logger.error('Failed to encrypt storage:', error);
        }
    }

    /**
     * Decrypt sensitive data from storage (basic)
     */
    static decryptStorage(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            return JSON.parse(atob(encrypted));
        } catch (error) {
            logger.error('Failed to decrypt storage:', error);
            return null;
        }
    }

    /**
     * Clear sensitive data on logout
     */
    static clearSensitiveData() {
        const sensitiveKeys = ['token', 'user', 'temp_password'];
        sensitiveKeys.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
    }

    /**
     * Check for common security headers in API responses
     */
    static checkSecurityHeaders(response) {
        const securityHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'x-xss-protection': '1; mode=block'
        };
        
        let hasIssues = false;
        Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
            const value = response.headers.get(header);
            if (!value) {
                logger.warn(`Missing security header: ${header}`);
                hasIssues = true;
            }
        });
        
        return !hasIssues;
    }
}

/**
 * Content Security Policy enforcement
 */
window.addEventListener('securitypolicyviolation', (e) => {
    logger.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy
    });
});

// Export globally
window.security = SecurityManager;
