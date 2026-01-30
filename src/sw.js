const CACHE_NAME = "germanpro-v8-network-first"; 
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./logic.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// 1. Install: Cache core files immediately
self.addEventListener("install", (e) => {
  self.skipWaiting(); // Force new SW to take over immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Activate: Delete old caches instantly
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); 
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// 3. THE MAGIC FIX: "Network First" Strategy
// Try to get fresh code from the internet. If that fails (offline), use the cache.
self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If we got a valid response from the network, update the cache!
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If network fails (offline), return the cached version
        return caches.match(e.request);
      })
  );
});