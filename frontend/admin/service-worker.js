// Service Worker for FieldOps Admin Dashboard PWA
const CACHE_NAME = 'fieldops-admin-v1';
const STATIC_ASSETS = [
    '/admin/index.html',
    '/admin/css/styles.css',
    '/admin/js/app-refactored.js',
    '/admin/js/services/api.js',
    '/admin/js/services/error-boundary.js',
    '/admin/js/services/forms.js',
    '/admin/js/services/logger.js',
    '/admin/js/services/performance.js',
    '/admin/js/services/security.js',
    '/admin/js/services/state.js',
    '/admin/js/services/ui.js',
    '/admin/js/services/utils.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Some assets failed to cache:', err);
                // Continue even if some assets fail
                return Promise.resolve();
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network-first strategy for API, cache-first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests - network first with cache fallback (only cache GET)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok && request.method === 'GET') {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cachedResponse => {
                        return cachedResponse || new Response(
                            JSON.stringify({ error: 'Offline mode - data may be outdated' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
    }
    // Static assets - cache first
    else if (request.method === 'GET') {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clonedResponse);
                    });
                    return response;
                }).catch(() => {
                    // Return offline page or cached response
                    return caches.match(request);
                });
            })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-jobs') {
        event.waitUntil(syncJobsToServer());
    }
});

async function syncJobsToServer() {
    try {
        const db = await openIndexedDB();
        const pendingJobs = await getPendingJobs(db);
        
        for (const job of pendingJobs) {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(job)
            });
            
            if (response.ok) {
                await markJobSynced(db, job.id);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
        throw error; // Retry
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/admin/assets/icon-192.png',
        badge: '/admin/assets/badge-72.png',
        tag: data.tag || 'fieldops-notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action) {
        clients.matchAll().then(clientList => {
            clientList.forEach(client => {
                client.postMessage({
                    type: 'NOTIFICATION_ACTION',
                    action: event.action,
                    data: event.notification.tag
                });
            });
        });
    } else {
        clients.matchAll().then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                if (clientList[i].url === '/' && 'focus' in clientList[i])
                    return clientList[i].focus();
            }
            if (clients.openWindow) return clients.openWindow('/admin/index.html');
        });
    }
});
