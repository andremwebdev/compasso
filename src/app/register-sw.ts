// Registrazione del service worker e aggiornamento dell'app installata (versione da telefono).
// L'app cerca una versione nuova all'apertura e ogni volta che torna in primo piano; quando la
// versione nuova è scaricata tutta compare l'avviso, e «Aggiorna» la attiva e ricarica la pagina.

import { updateReady } from "./state";

/** Lo stesso messaggio di sw.ts: attiva la versione nuova in attesa. */
const SKIP_WAITING = "compasso:attiva-versione-nuova";

let registration: ServiceWorkerRegistration | null = null;
let updateRequested = false;

/** Avvisa se c'è una versione nuova già scaricata e in attesa (anche da un'apertura precedente). */
function noticeWaiting(reg: ServiceWorkerRegistration): void {
  // Senza un controller è la prima installazione: non c'è niente di vecchio da aggiornare.
  if (reg.waiting && navigator.serviceWorker.controller) updateReady.value = true;
}

/** Chiede al browser di controllare se sul sito c'è un sw.js diverso (cioè una versione nuova). */
// Costa una sola richiesta (sw.js, pochi KB): non serve diradare i controlli.
function checkForUpdate(): void {
  const reg = registration;
  if (!reg || !navigator.onLine) return;
  reg.update().catch(() => {
    // Rete assente o sito irraggiungibile: si riprova alla prossima occasione.
  });
}

/** Registra il service worker: serve solo alla versione da telefono, per l'uso offline. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  // Quando la versione nuova prende il comando (dopo «Aggiorna») la pagina si ricarica, una volta.
  // Al primo avvio il controller arriva senza che Andrea abbia chiesto niente: lì non si ricarica.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateRequested) return;
    updateRequested = false;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    // Percorso relativo: l'app sta in una sottocartella di GitHub Pages (/compasso/).
    // updateViaCache "none": sw.js si chiede sempre al sito, mai alla cache HTTP del browser.
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        noticeWaiting(reg);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") noticeWaiting(reg);
          });
        });
        // All'apertura: controllo subito.
        checkForUpdate();
      })
      .catch((error: unknown) => {
        console.error("Registrazione del service worker non riuscita", error);
      });
  });

  // L'app installata su iPhone resta sospesa invece di chiudersi: si controlla anche quando torna in primo piano.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) checkForUpdate();
  });
}

/**
 * «Aggiorna»: attiva la versione nuova già scaricata; la pagina si ricarica quando prende il comando.
 * Se non c'è niente in attesa (o il passaggio non arriva), ricarica comunque.
 */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  updateRequested = true;
  waiting.postMessage(SKIP_WAITING);
  window.setTimeout(() => {
    if (updateRequested) window.location.reload();
  }, 4000);
}
