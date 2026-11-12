import { render } from "preact";
import { App } from "./App";
import { registerServiceWorker } from "./register-sw";
import { loadData } from "./state";

const root = document.getElementById("app");
if (!root) throw new Error("Elemento #app non trovato nella pagina");
render(<App />, root);

// I dati di Andrea si aprono subito: le schermate si aggiornano da sole quando arrivano.
void loadData();

// La versione PC è un file aperto con doppio clic: lì il service worker non esiste.
if (__TARGET__ === "telefono") registerServiceWorker();
