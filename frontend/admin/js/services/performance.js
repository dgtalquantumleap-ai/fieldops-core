/**
 * FieldOps Core - Performance Optimization Module
 * Memoization, debouncing, lazy loading, and caching
 * 
 * @module performance
 */

class Cache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
    }

    /**
     * Set cache value with TTL (Time To Live)
     */
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value);
        
        if (ttlSeconds > 0) {
            if (this.ttl.has(key)) {
                clearTimeout(this.ttl.get(key));
            }
            
            const timeout = setTimeout(() => {
                this.cache.delete(key);
                this.ttl.delete(key);
                logger.debug(`Cache expired: ${key}`);
            }, ttlSeconds * 1000);
            
            this.ttl.set(key, timeout);
        }
    }

    /**
     * Get cache value
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Delete cache entry
     */
    delete(key) {
        if (this.ttl.has(key)) {
            clearTimeout(this.ttl.get(key));
            this.ttl.delete(key);
        }
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.ttl.forEach(timeout => clearTimeout(timeout));
        this.cache.clear();
        this.ttl.clear();
    }
}

/**
 * Memoization - Cache function results
 */
function memoize(fn, ttl = 300) {
    const cache = {};
    
    return function(...args) {
        const key = JSON.stringify(args);
        const cached = cache[key];
        
        if (cached && Date.now() - cached.timestamp < ttl * 1000) {
            logger.debug('Memoized result used');
            return cached.result;
        }
        
        const result = fn(...args);
        cache[key] = { result, timestamp: Date.now() };
        
        return result;
    };
}

/**
 * Debounce - Delay function execution
 */
function debounce(fn, delay = 300) {
    let timeoutId;
    
    return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

/**
 * Throttle - Limit function execution frequency
 */
function throttle(fn, interval = 300) {
    let lastCall = 0;
    
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= interval) {
            fn(...args);
            lastCall = now;
        }
    };
}

/**
 * Lazy load images
 */
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

/**
 * Virtual scrolling for large lists
 */
class VirtualScroll {
    constructor(container, items, itemHeight, renderFn) {
        this.container = container;
        this.items = items;
        this.itemHeight = itemHeight;
        this.renderFn = renderFn;
        this.scrollTop = 0;
        
        this.init();
    }

    init() {
        this.container.style.overflow = 'auto';
        this.container.style.height = '500px';
        
        const totalHeight = this.items.length * this.itemHeight;
        const viewport = document.createElement('div');
        viewport.style.height = totalHeight + 'px';
        viewport.style.position = 'relative';
        
        this.viewport = viewport;
        this.container.appendChild(viewport);
        
        this.container.addEventListener('scroll', () => this.onScroll());
        this.render();
    }

    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.container.clientHeight / this.itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + 1, this.items.length);
        
        const visibleItems = this.items.slice(startIndex, endIndex);
        
        const content = visibleItems.map((item, i) => {
            const offset = (startIndex + i) * this.itemHeight;
            return `
                <div style="position: absolute; top: ${offset}px; left: 0; right: 0; height: ${this.itemHeight}px;">
                    ${this.renderFn(item)}
                </div>
            `;
        }).join('');
        
        this.viewport.innerHTML = content;
    }
}

/**
 * Performance monitoring
 */
const performance$ = {
    /**
     * Measure function execution time
     */
    measure(label, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        if (duration > 100) {
            logger.warn(`Slow operation "${label}": ${duration.toFixed(2)}ms`);
        } else {
            logger.debug(`Operation "${label}": ${duration.toFixed(2)}ms`);
        }
        
        return result;
    },

    /**
     * Get Core Web Vitals
     */
    getWebVitals() {
        const vitals = {
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
            lcp: null,
            cls: 0,
            fid: null
        };
        
        // LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    vitals.lcp = entries[entries.length - 1].renderTime || entries[entries.length - 1].loadTime;
                });
                
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                logger.debug('LCP monitoring not supported');
            }
        }
        
        return vitals;
    },

    /**
     * Log performance metrics
     */
    logMetrics() {
        const vitals = this.getWebVitals();
        logger.info('Web Vitals:', vitals);
    }
};

// Export globally
window.cache = new Cache();
window.memoize = memoize;
window.debounce = debounce;
window.throttle = throttle;
window.lazyLoadImages = lazyLoadImages;
window.VirtualScroll = VirtualScroll;
window.perf = performance$;

// Initialize lazy loading on page load
document.addEventListener('DOMContentLoaded', lazyLoadImages);
