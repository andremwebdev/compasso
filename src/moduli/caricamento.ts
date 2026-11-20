// I moduli caricati. Nella versione telefono il contenuto di un modulo (lezioni e generatori) arriva
// solo quando qualcuno lo chiede con ensureModules; prima l'app conosce soltanto l'indice leggero.
// Ogni funzione che legge una lezione o un generatore guarda qui dentro.

import type { ModuleCode } from "../codici";
import type { ModuleContent } from "./definizione";
import { moduleLoaders } from "./index";

const loaded = new Map<ModuleCode, ModuleContent>();
const pending = new Map<ModuleCode, Promise<void>>();
const listeners = new Set<() => void>();

/** Carica i moduli indicati (quelli già caricati non costano nulla). Un codice sconosciuto si ignora. */
export function ensureModules(codes: Iterable<ModuleCode>): Promise<void> {
  const waits: Promise<void>[] = [];
  for (const code of new Set(codes)) {
    if (loaded.has(code)) continue;
    let wait = pending.get(code);
    if (!wait) {
      const loader = (moduleLoaders as Partial<Record<ModuleCode, (typeof moduleLoaders)[ModuleCode]>>)[code];
      if (!loader) continue;
      wait = loader().then(
        (module) => {
          pending.delete(code);
          loaded.set(code, module.default);
          for (const listener of listeners) listener();
        },
        (error: unknown) => {
          // Si potrà riprovare (ad esempio quando torna la rete, se il file non era ancora salvato).
          pending.delete(code);
          throw error;
        },
      );
      pending.set(code, wait);
    }
    waits.push(wait);
  }
  return Promise.all(waits).then(() => undefined);
}

/** Vero se il modulo è già caricato. */
export const isModuleLoaded = (code: ModuleCode): boolean => loaded.has(code);

/** Vero se tutti i moduli indicati sono caricati. */
export const areModulesLoaded = (codes: Iterable<ModuleCode>): boolean => [...codes].every((code) => loaded.has(code) || !(code in moduleLoaders));

/** Il contenuto di un modulo caricato. */
export const loadedModule = (code: ModuleCode): ModuleContent | undefined => loaded.get(code);

/** Tutti i moduli caricati finora. */
export const loadedModules = (): ModuleContent[] => [...loaded.values()];

/** Avvisa quando arriva un modulo nuovo; restituisce la funzione per smettere. */
export function onModuleLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
