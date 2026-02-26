const CACHE_NAME = 'germanpro-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // 🛡️ IGNORE POST REQUESTS (Like the AI Call)
    if (event.request.method !== 'GET') {
        return; 
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});