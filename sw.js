// Los cambios de la app llegan solos. Cambiá este número solo si modificás este archivo.
const VERSION = 'recetario-v1';
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "config.js",
  "manifest.webmanifest",
  "recetas.json",
  "vendor/supabase.js",
  "fuentes/dm-sans-latin-400-normal.woff2",
  "fuentes/dm-sans-latin-500-normal.woff2",
  "fuentes/dm-sans-latin-600-normal.woff2",
  "fuentes/eb-garamond-latin-500-normal.woff2",
  "fuentes/eb-garamond-latin-600-normal.woff2",
  "iconos/apple-touch-icon.png",
  "iconos/favicon.png",
  "iconos/icon-192.png",
  "iconos/icon-512.png",
  "iconos/maskable-512.png",
  "fotos/berenjenas-roquefort-nueces-1.jpg",
  "fotos/bondiola-desmechada-1.jpg",
  "fotos/budin-de-banana-1.jpg",
  "fotos/confitura-de-pimientos-1.jpg",
  "fotos/confitura-de-pimientos-2.jpg",
  "fotos/ensalada-crudo-peras-1.jpg",
  "fotos/ensalada-rucula-lentejas-1.jpg",
  "fotos/guiso-de-lentejas-1.jpg",
  "fotos/guiso-de-lentejas-2.jpg",
  "fotos/hamburguesas-cheese-bacon-1.jpg",
  "fotos/mac-and-cheese-1.jpg",
  "fotos/mayonesa-de-rucula-1.jpg",
  "fotos/menjunje-de-verduras-1.jpg",
  "fotos/mollejas-con-panceta-1.jpg",
  "fotos/noquis-con-hongos-1.jpg",
  "fotos/omelette-de-calabaza-1.jpg",
  "fotos/papas-y-calabaza-verdeo-1.jpg",
  "fotos/papatouille-1.jpg",
  "fotos/penne-parissiene-1.jpg",
  "fotos/pescado-a-la-crema-1.jpg",
  "fotos/pescado-a-la-crema-2.jpg",
  "fotos/picada-fresca-1.jpg",
  "fotos/picada-fresca-2.jpg",
  "fotos/picada-mar-y-tierra-1.jpg",
  "fotos/pimientos-asados-1.jpg",
  "fotos/pollo-a-la-suiza-1.jpg",
  "fotos/risotto-de-hongos-1.jpg",
  "fotos/roll-de-pollo-hojaldrado-1.jpg",
  "fotos/roll-de-pollo-hojaldrado-2.jpg",
  "fotos/salmon-con-eneldo-1.jpg",
  "fotos/salmon-con-eneldo-2.jpg",
  "fotos/salsa-bolognesa-1.jpg",
  "fotos/salsa-bolognesa-2.jpg",
  "fotos/salsa-de-ciboulette-1.jpg",
  "fotos/spaghetti-al-wok-1.jpg",
  "fotos/spaghetti-puttanesca-1.jpg"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('message', e => { if (e.data === 'activar') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'recetario-fotos').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Fotos subidas a Supabase: primero la copia guardada, así se ven sin internet.
  if (url.pathname.includes('/storage/v1/object/public/')) {
    e.respondWith(caches.open('recetario-fotos').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return; // datos de Supabase: siempre por red
  // Fotos, fuentes e íconos casi no cambian: primero la copia guardada.
  if (/\/(fotos|fuentes|iconos|vendor)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // Código y recetas incluidas: primero internet (así cada cambio que subas llega solo),
  // y si no hay conexión, la última copia guardada.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
