/** Registra il service worker: serve solo alla versione da telefono, per l'uso offline. */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    // Percorso relativo: l'app sta in una sottocartella di GitHub Pages (/compasso/).
    navigator.serviceWorker.register("./sw.js").catch((error: unknown) => {
      console.error("Registrazione del service worker non riuscita", error);
    });
  });
}
