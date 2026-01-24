const CACHE_NAME = "abogado-laboral-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/critical.css",
  "./css/style.css",
  "./js/main.js",
  "./js/html2pdf.bundle.min.js",
  "./img/logo-principal.webp",
];

// 1. Install Event: Cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all: app shell and content");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

// 2. Fetch Event: Serve from Cache, fall back to Network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      // Clone the request because it's a stream and can only be consumed once
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response because it's a stream
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Cache new requests dynamically (optional, but good for other assets)
          // For now, we only cache what's in ASSETS_TO_CACHE via install,
          // but we could uncomment this to cache everything visited.
          // cache.put(event.request, responseToCache);
        });

        return response;
      });
    }),
  );
});

// 3. Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
