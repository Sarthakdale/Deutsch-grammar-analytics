const CACHE_NAME = "germanpro-v6-instant"; // Bump this version manually when you push to production
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./logic.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// 1. Install Event: Force the new SW to take over IMMEDIATELY
self.addEventListener("install", (e) => {
  self.skipWaiting(); // <--- THIS STOPS THE WAITING
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Activate Event: Clean up old caches & take control of open tabs
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Delete old versions automatically
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // <--- TELLS THE PAGE "I AM IN CHARGE NOW"
    })
  );
});

// 3. Fetch Event: Serve from Cache, but fall back to Network
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});