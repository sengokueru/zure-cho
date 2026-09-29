// 公開のたびに版数を上げること（上げないと古い版が配信され続ける）
const PREFIX = 'zure-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + 'v7';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  // 画面(HTML)はネット優先：更新がすぐ届く。オフライン時だけキャッシュ
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(r);
        if (!res.ok) return (await cache.match('index.html')) || res;
        try { await cache.put('index.html', res.clone()); } catch (_) { /* 容量不足でもオンライン表示は続ける */ }
        return res;
      } catch (err) {
        return (await cache.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(r)).then(m => m || fetch(r)));
});
