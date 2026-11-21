// Offline backup: caches the page, photos and Leaflet. Map tiles stay online-only.
const CACHE = "peace-park-v4";
const LOCAL = [
  "./", "./index.html", "./img/CREDITS.md",
  "./img/01.jpg", "./img/01b.jpg", "./img/02.jpg", "./img/02b.jpg", "./img/03.jpg", "./img/04.jpg", "./img/05.jpg", "./img/06.jpg", "./img/07.jpg", "./img/08.jpg", "./img/09.jpg", "./img/10.jpg", "./img/11.jpg", "./img/12.jpg", "./img/13.jpg", "./img/14.jpg", "./img/15.jpg", "./img/16.jpg"
];
const CDN = [
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCAL);
    // CDN files are best-effort so one network hiccup can't break the install
    await Promise.all(CDN.map(u => c.add(new Request(u, {mode: "cors"})).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("tile.openstreetmap.org")) return; // tiles: network only

  // Page: network first so updates show up, cache when offline
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put("./index.html", res.clone());
        return res;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Photos, Leaflet: cache first
  if (url.origin === location.origin || CDN.includes(req.url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
