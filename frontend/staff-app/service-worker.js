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

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
// DB version 2 adds the photo-uploads store alongside pending-requests

function openSyncDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('fieldops-staff-sync', 2);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pending-requests')) {
                const os = db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
                os.createIndex('timestamp', 'timestamp');
            }
            if (!db.objectStoreNames.contains('photo-uploads')) {
                const os = db.createObjectStore('photo-uploads', { keyPath: 'id', autoIncrement: true });
                os.createIndex('timestamp', 'timestamp');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getPendingPhotosFromDB() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('photo-uploads', 'readonly');
        tx.objectStore('photo-uploads').getAll().onsuccess = (e) => resolve(e.target.result || []);
        tx.onerror = () => reject(tx.error);
    });
}

async function markPhotoSynced(id) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('photo-uploads', 'readwrite');
        tx.objectStore('photo-uploads').delete(id).onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getPendingJobUpdatesFromDB() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pending-requests', 'readonly');
        tx.objectStore('pending-requests').getAll().onsuccess = (e) => {
            const all = e.target.result || [];
            resolve(all.filter(r => r.url && r.url.includes('/api/jobs/') && r.method === 'PATCH'));
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function markJobUpdateSynced(id) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pending-requests', 'readwrite');
        tx.objectStore('pending-requests').delete(id).onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ─── Sync: Photos ─────────────────────────────────────────────────────────────
async function syncPhotosToServer() {
    const pendingPhotos = await getPendingPhotosFromDB();
    for (const photo of pendingPhotos) {
        try {
            const formData = new FormData();
            formData.append('job_id', photo.job_id);
            formData.append('photo', photo.blob, photo.filename || 'photo.jpg');
            formData.append('media_type', photo.category || 'before');

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + (photo.token || '') },
                body: formData
            });

            if (response.ok) {
                await markPhotoSynced(photo.id);
                self.clients.matchAll().then(clients => {
                    clients.forEach(c => c.postMessage({ type: 'PHOTO_SYNCED', photoId: photo.id }));
                });
            }
        } catch (err) {
            console.warn('Photo sync item failed:', err.message);
        }
    }
}

// ─── Sync: Job status updates ─────────────────────────────────────────────────
async function syncJobStatusToServer() {
    const pendingJobs = await getPendingJobUpdatesFromDB();
    for (const item of pendingJobs) {
        try {
            // Replay the original stored request (headers include Authorization)
            const response = await fetch(item.url, {
                method: item.method,
                headers: Object.fromEntries(item.headers || []),
                body: item.body
            });
            if (response.ok) {
                await markJobUpdateSynced(item.id);
            }
        } catch (err) {
            console.warn('Job sync item failed:', err.message);
        }
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const options = {
        body: data.body || 'New job assignment',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏠</text></svg>',
        tag: data.tag || 'fieldops-job-notification',
        requireInteraction: false,
        data: { url: data.url || '/staff/index.html' },
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
    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/staff/index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('/staff/') && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(targetUrl);
        })
    );
});

// Helper: Save failed API requests to IndexedDB for background sync replay
async function indexedDB_saveForSync(request) {
    try {
        const db = await openSyncDB();

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
