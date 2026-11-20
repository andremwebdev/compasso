import { updateReady } from "./state";

/** Registra il service worker: serve solo alla versione da telefono, per l'uso offline. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    // Percorso relativo: l'app sta in una sottocartella di GitHub Pages (/compasso/).
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        // Una versione nuova scaricata in background si usa dalla riapertura successiva (niente
        // skipWaiting): qui si avvisa soltanto. Al primo avvio non c'è niente da avvisare.
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) updateReady.value = true;
          });
        });
      })
      .catch((error: unknown) => {
        console.error("Registrazione del service worker non riuscita", error);
      });
  });
}
