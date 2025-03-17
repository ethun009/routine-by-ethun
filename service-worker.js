const CACHE_NAME = 'routine-tracker-v1';
const OFFLINE_URL = 'index.html';

const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/script.js',
    './manifest.json',
    './assets/icons/icon.png',
    './assets/icons/badge.png',
    './assets/icons/icon-192x192.png',
    './assets/icons/icon-512x512.png',
    './assets/sounds/notification.mp3',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];

// Install event - cache all initial resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(clients.claim());
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return the offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: 'assets/icons/icon.png',
            badge: 'assets/icons/badge.png',
            sound: 'assets/sounds/notification.mp3',
            vibrate: [200, 100, 200],
            tag: 'routine-notification',
            renotify: true
        };
        
        event.waitUntil(
            self.registration.showNotification('Daily Routine', options)
        );
    }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    let client = clientList[0];
                    client.focus();
                    return client.navigate('/');
                }
                return clients.openWindow('/');
            })
    );
}); 