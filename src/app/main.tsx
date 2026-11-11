import { render } from "preact";
import { App } from "./App";
import { registerServiceWorker } from "./register-sw";

const root = document.getElementById("app");
if (!root) throw new Error("Elemento #app non trovato nella pagina");
render(<App />, root);

// La versione PC è un file aperto con doppio clic: lì il service worker non esiste.
if (__TARGET__ === "telefono") registerServiceWorker();
