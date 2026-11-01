// Service worker mínimo: la app siempre pide datos a Supabase, solo se cachea la "cáscara".
const CACHE = 'comedor-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Supabase/CDN: sin tocar
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(h => h || fetch(req)));
});

// Avisos push (cambios de las familias) con la app cerrada
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Comedor Basurto', {
    body: d.body || 'Hay cambios nuevos', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  const conAccion = url.indexOf('accion=') !== -1;   // p. ej. el recordatorio del viernes abre el resumen
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) {
      if (!('focus' in w)) continue;
      if (conAccion && 'navigate' in w) return w.navigate(url).then(c => (c || w).focus()).catch(() => clients.openWindow(url));
      return w.focus();
    }
    return clients.openWindow(url);
  }));
});
