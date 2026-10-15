const CACHE_NAME = "subin-app-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/main.js",
  "./js/router.js",
  "./js/ui.js",
  "./js/db.js",
  "./js/tts.js",
  "./js/records.js",
  "./js/reward.js",
  "./js/data/korean-default.js",
  "./js/data/english-default.js",
  "./js/screens/home.js",
  "./js/screens/koreanSelect.js",
  "./js/screens/koreanPlay.js",
  "./js/screens/koreanGrade.js",
  "./js/screens/koreanResult.js",
  "./js/screens/koreanReview.js",
  "./js/screens/englishUnits.js",
  "./js/screens/englishStudy.js",
  "./js/screens/englishQuiz.js",
  "./js/screens/records.js",
  "./js/screens/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => (request.mode === "navigate" ? caches.match("./index.html") : undefined));
    })
  );
});
