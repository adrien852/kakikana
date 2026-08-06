// KakiKana service worker — offline-first
const VERSION = "kakikana-v1.1.0";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "vendor/hanzi-writer.min.js",
  "data/strokes.js",
  "data/kana.js",
  "data/kanji_a.js",
  "data/kanji_b.js",
  "data/kanji_c.js",
  "data/i18n.js",
  "js/engine.js",
  "js/voice.js",
  "js/drawing.js",
  "js/session.js",
  "js/library.js",
  "js/exam.js",
  "js/settings.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith("kakikana-v") && k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// App shell: cache-first. Whisper/CDN assets: cache-first too once fetched (they're immutable versioned URLs).
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // runtime cache for the offline voice pack (transformers.js + model weights)
  const isModelCDN = /cdn\.jsdelivr\.net|huggingface\.co|hf\.co/.test(url.host);

  e.respondWith(
    caches.match(e.request, { ignoreSearch: !isModelCDN }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp && resp.ok && (isModelCDN || url.origin === location.origin)) {
          const copy = resp.clone();
          caches.open(isModelCDN ? "kakikana-models" : VERSION).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => {
        // offline navigation fallback
        if (e.request.mode === "navigate") return caches.match("index.html");
        throw new Error("offline");
      });
    })
  );
});
