// Service Worker for FieldOps Staff App PWA
const CACHE_NAME = 'fieldops-staff-v1';
const STATIC_ASSETS = [
    '/staff/index.html',
    '/staff/login.html',
    '/staff/css/staff.css',
    '/staff/css/job-details-enhanced.css',
    '/staff/css/mobile.css',
    '/staff/js/staff-app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Some assets failed to cache:', err);
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

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests - network first with offline fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) return cachedResponse;
                        
                        // Queue for background sync if it's a POST/PUT/DELETE
                        if (request.method !== 'GET') {
                            indexedDB_saveForSync(request);
                        }
                        
                        return new Response(
                            JSON.stringify({ 
                                offline: true, 
                                error: 'No internet connection - changes will sync when online' 
                            }),
                            { 
                                status: 503, 
                                headers: { 'Content-Type': 'application/json' } 
                            }
                        );
                    });
                })
        );
    }
    // Socket.IO - network only
    else if (url.pathname.includes('socket.io')) {
        event.respondWith(fetch(request));
    }
    // Static assets - cache first
    else if (request.method === 'GET') {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                if (cachedResponse) {
                    // Check if cache is stale
                    const cacheTime = cachedResponse.headers.get('x-cache-time');
                    if (cacheTime && Date.now() - parseInt(cacheTime) > CACHE_DURATION) {
                        // Fetch fresh copy
                        return fetch(request).then(freshResponse => {
                            if (freshResponse.ok) {
                                const clonedResponse = freshResponse.clone();
                                const newResponse = new Response(clonedResponse.body, clonedResponse);
                                newResponse.headers.set('x-cache-time', Date.now().toString());
                                
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(request, newResponse);
                                });
                            }
                            return freshResponse;
                        }).catch(() => cachedResponse);
                    }
                    return cachedResponse;
                }
                
                return fetch(request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const clonedResponse = response.clone();
                    const newResponse = new Response(clonedResponse.body, clonedResponse);
                    newResponse.headers.set('x-cache-time', Date.now().toString());
                    
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, newResponse);
                    });
                    return response;
                }).catch(() => {
                    return caches.match('/staff/index.html');
                });
            })
        );
    }
});

// Background sync - sync photos when connection restored
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-photos') {
        event.waitUntil(syncPhotosToServer());
    }
    if (event.tag === 'sync-jobs') {
        event.waitUntil(syncJobStatusToServer());
    }
});

async function syncPhotosToServer() {
    try {
        const pendingPhotos = await getPendingPhotosFromDB();
        
        for (const photo of pendingPhotos) {
            const formData = new FormData();
            formData.append('job_id', photo.job_id);
            formData.append('photo', photo.blob);
            formData.append('category', photo.category);
            
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                },
                body: formData
            });
            
            if (response.ok) {
                await markPhotoSynced(photo.id);
                // Notify client
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'PHOTO_SYNCED',
                            photoId: photo.id
                        });
                    });
                });
            }
        }
    } catch (error) {
        console.error('Photo sync failed:', error);
        throw error;
    }
}

async function syncJobStatusToServer() {
    try {
        const pendingJobs = await getPendingJobUpdatesFromDB();
        
        for (const job of pendingJobs) {
            const response = await fetch(`/api/jobs/${job.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('staffToken')
                },
                body: JSON.stringify({
                    status: job.status,
                    notes: job.notes
                })
            });
            
            if (response.ok) {
                await markJobUpdateSynced(job.id);
            }
        }
    } catch (error) {
        console.error('Job sync failed:', error);
        throw error;
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const options = {
        body: data.body || 'New job assignment',
        icon: '/staff/assets/icon-192.png',
        badge: '/staff/assets/badge-72.png',
        tag: data.tag || 'fieldops-job-notification',
        requireInteraction: data.requireInteraction || false,
        actions: [
            { action: 'view', title: 'View Job' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Stilt Heights', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        clients.matchAll().then(clientList => {
            for (let client of clientList) {
                if (client.url === '/staff/index.html' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/staff/index.html');
            }
        });
    }
});

// Helper: Save failed requests to IndexedDB for sync
async function indexedDB_saveForSync(request) {
    try {
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('fieldops-staff-sync', 1);
            req.onupgradeneeded = () => {
                const os = req.result.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
                os.createIndex('timestamp', 'timestamp');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const tx = db.transaction('pending-requests', 'readwrite');
        const store = tx.objectStore('pending-requests');
        
        const data = {
            method: request.method,
            url: request.url,
            headers: Array.from(request.headers.entries()),
            body: await request.clone().text(),
            timestamp: Date.now()
        };
        
        store.add(data);
    } catch (error) {
        console.error('Failed to save request for sync:', error);
    }
}
