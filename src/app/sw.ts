// Service worker della versione da telefono: salva tutti i file e li serve anche offline.
// Si compila a parte (scripts/build.mjs) perché ha bisogno dell'elenco dei file e della versione.
// Aggiornamento: ogni pubblicazione ha una copia con un nome nuovo (compasso-<versione>); la versione
// nuova si scarica tutta, poi aspetta che Andrea tocchi «Aggiorna»; solo allora si attiva e
// cancella le copie vecchie. I dati di Andrea (IndexedDB, localStorage) non si toccano mai.

declare const self: ServiceWorkerGlobalScope;

const PREFIX = "compasso-";
const CACHE = PREFIX + __CACHE_VERSION__;

/** Messaggio che la pagina manda quando Andrea tocca «Aggiorna» (vedi register-sw.ts). */
const SKIP_WAITING = "compasso:attiva-versione-nuova";

/**
 * Scarica un file per la copia nuova, saltando ogni cache intermedia: la cache HTTP del browser
 * ("reload") e quella della rete di GitHub Pages (il parametro ?v= cambia a ogni versione).
 * Si salva sotto l'indirizzo senza parametro, quello che la pagina chiede.
 */
async function download(cache: Cache, url: string): Promise<void> {
  const fresh = new URL(url, self.registration.scope);
  fresh.searchParams.set("v", __CACHE_VERSION__);
  const response = await fetch(fresh.href, { cache: "reload" });
  if (!response.ok) throw new Error(`Scaricamento di ${url} non riuscito (${response.status})`);
  await cache.put(new URL(url, self.registration.scope).href, response);
}

self.addEventListener("install", (event) => {
  // Se manca anche un solo file, l'installazione fallisce e resta la versione di prima, intera.
  // Niente skipWaiting qui: la versione nuova si attiva quando Andrea tocca «Aggiorna».
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      try {
        await Promise.all(__PRECACHE__.map((url) => download(cache, url)));
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === SKIP_WAITING) void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Si arriva qui solo dopo un'installazione riuscita: la copia nuova è completa, le vecchie si
  // possono cancellare. Si cancellano solo le cache di Compasso: IndexedDB non si tocca.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Prima la copia di questa versione (offline, e file tutti della stessa pubblicazione), altrimenti la rete.
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((hit) => hit ?? fetch(event.request)),
  );
});

export {};
