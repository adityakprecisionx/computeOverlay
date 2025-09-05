// Simple service worker to prevent 404 errors
// This is a minimal service worker that does nothing but prevents 404s

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let all requests pass through without interception
  // This prevents the 404 error while not interfering with the app
});
