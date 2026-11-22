// Home page only. Each tour folder (peace-park/, miyajima/) has its own service worker,
// so this one ignores everything except the home page and its two cover photos.
const CACHE = "tours-home-v2";
const LOCAL = ["./", "./index.html", "./peace-park/img/a-bomb-dome.jpg", "./miyajima/img/otorii-low-tide.jpg"];
const OWN = new Set(LOCAL.map(u => new URL(u, self.registration.scope).href));

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCAL.map(u => new Request(u, {cache: "reload"})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // remove this worker's old caches (incl. the Peace Park cache from when it lived here); keep the tours' own caches
    for (const k of await caches.keys())
      if (k !== CACHE && !k.startsWith("miyajima-") && !/^peace-park-v([7-9]|\d\d)/.test(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const href = new URL(req.url).href.split("#")[0].split("?")[0];
  if (!OWN.has(href)) return; // tour folders: handled by their own workers
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, {cache: "no-cache"});
        if (res.ok) (await caches.open(CACHE)).put("./index.html", res.clone());
        return res;
      } catch {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => (await caches.match(req)) || fetch(req))());
});
