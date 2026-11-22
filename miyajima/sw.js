// Miyajima tour offline backup: caches the page, photos and MapLibre. Map tiles stay online-only.
const CACHE = "miyajima-v1";
const LOCAL = [
  "./", "./index.html", "./img/CREDITS.md",
  "./img/daiganji.jpg", "./img/daishoin.jpg", "./img/deer.jpg", "./img/ferry-pier.jpg", "./img/five-storied-pagoda.jpg", "./img/itsukushima-shrine.jpg", "./img/misen-summit.jpg", "./img/momijidani.jpg", "./img/omotesando.jpg", "./img/otorii-high-tide.jpg", "./img/otorii-low-tide.jpg", "./img/reikado.jpg", "./img/ropeway.jpg", "./img/senjokaku.jpg", "./img/tahoto.jpg"
];
const CDN = [
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache:"reload" skips the browser HTTP cache so a new version never stores stale files
    await c.addAll(LOCAL.map(u => new Request(u, {cache: "reload"})));
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
        const res = await fetch(req, {cache: "no-cache"}); // revalidate with the server every time
        if (res.ok) (await caches.open(CACHE)).put("./index.html", res.clone());
        return res;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Photos, MapLibre: cache first
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
