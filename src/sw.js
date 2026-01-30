const CACHE_NAME = "germanpro-v2-cache";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./logic.js",
  "./manifest.json"
];

// 1. Install Event (Cache Core Files)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Fetch Event (Serve from Cache if Offline)
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});