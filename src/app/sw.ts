// Service worker della versione da telefono: salva tutti i file e li serve anche offline.
// Si compila a parte (scripts/build.mjs) perché ha bisogno dell'elenco dei file e della versione.

declare const self: ServiceWorkerGlobalScope;

const PREFIX = "compasso-";
const CACHE = PREFIX + __CACHE_VERSION__;

self.addEventListener("install", (event) => {
  // "reload" evita di salvare copie vecchie tenute dalla cache HTTP del browser.
  // Niente skipWaiting: la versione nuova entra in uso alla riapertura successiva dell'app.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(__PRECACHE__.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  // Cancella le cache delle versioni precedenti.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Prima la copia salvata (offline), altrimenti la rete.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit ?? fetch(event.request)),
  );
});

export {};
