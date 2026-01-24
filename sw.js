const CACHE_NAME = "abogado-laboral-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./nosotros.html",
  "./servicios.html",
  "./herramientas.html",
  "./contacto.html",
  "./css/critical.css",
  "./css/style.css",
  "./js/main.js",
  "./js/html2pdf.bundle.min.js",
  "./img/logo-principal.webp",
  "./img/header-contacto.webp",
  "./img/favicon.webp",
];

// 1. Install Event: Cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all: app shell and content");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting(); // Force activation independently of client status
});

// 2. Fetch Event: Cache First Strategy for Static Assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Strategy for Images & Fonts: Cache First, Fallback to Network
  if (
    url.pathname.match(/\.(webp|jpg|jpeg|png|gif|svg|woff2|woff|ttf)$/) ||
    url.pathname.includes("/css/") ||
    url.pathname.includes("/js/")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response; // Return from cache
        }
        return fetch(event.request).then((networkResponse) => {
          // Check for valid response
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }
          // Cache the new asset dynamically
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      }),
    );
    return;
  }

  // Strategy for HTML: Network First (Freshness), Fallback to Cache (Offline)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      }),
    );
    return;
  }

  // Default: Cache First for everything else in ASSETS_TO_CACHE
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim(); // Take control of all clients immediately
});
