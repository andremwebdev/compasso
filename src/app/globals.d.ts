// Costanti sostituite da esbuild al momento della compilazione (scripts/build.mjs).

/** Versione che si sta compilando: "telefono" (PWA a più file) oppure "pc" (file unico). */
declare const __TARGET__: "telefono" | "pc";

/** L'indice leggero dei contenuti (src/moduli/indice.ts), calcolato dalla compilazione e da Vitest. */
declare const __CONTENT_INDEX__: readonly import("../moduli/indice").ModuleInfo[];

/** Solo nel service worker: elenco dei file da salvare per l'uso offline. */
declare const __PRECACHE__: string[];

/** Solo nel service worker: identificatore della versione, cambia a ogni modifica dei file. */
declare const __CACHE_VERSION__: string;
