// Legacy worker kept as a no-op so older installations can be removed by the
// client cleanup in components/sw-register.tsx. It intentionally does not
// intercept requests or write to the Cache Storage API.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});
