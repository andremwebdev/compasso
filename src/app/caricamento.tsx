// Il caricamento dei moduli visto dall'interfaccia. Le schermate che mostrano il testo di una lezione o
// generano esercizi chiedono prima i moduli che servono (useModules o <WithModules>): finché non sono
// arrivati compare «Caricamento…». Tutto il resto (navigazione, Oggi, elenchi) usa l'indice leggero.

import { signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { moduleOf, type GeneratorCode, type LessonCode, type ModuleCode } from "../codici";
import { areModulesLoaded, ensureModules, onModuleLoaded } from "../moduli/caricamento";
import { contentIndex } from "../moduli/indice";

/** Cresce di uno a ogni modulo caricato: chi lo legge si ridisegna quando arriva un modulo. */
export const modulesVersion = signal(0);
onModuleLoaded(() => {
  modulesVersion.value += 1;
});

/** I moduli che hanno almeno una lezione scritta (servono a flashcard, dimostrazioni, glossario). */
export const modulesWithLessons: readonly ModuleCode[] = contentIndex.filter((module) => module.lessons.length > 0).map((module) => module.code);

/** I moduli dei codici indicati (lezioni, generatori, definizioni, teoremi, flashcard). */
export const modulesOf = (codes: Iterable<string>): ModuleCode[] => [...new Set([...codes].map((code) => moduleOf(code as LessonCode | GeneratorCode)))];

export interface ModulesState {
  readonly ready: boolean;
  readonly failed: boolean;
  readonly retry: () => void;
}

/** Chiede i moduli indicati e dice se sono pronti. */
export function useModules(codes: readonly ModuleCode[]): ModulesState {
  void modulesVersion.value;
  const key = [...new Set(codes)].sort().join(",");
  const ready = areModulesLoaded(codes);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    setFailed(false);
    ensureModules(codes).catch(() => {
      if (alive) setFailed(true);
    });
    return () => {
      alive = false;
    };
    // key riassume codes: lo stesso elenco in un array nuovo non deve ricaricare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, ready]);
  return { ready, failed, retry: () => setAttempt((n) => n + 1) };
}

/** Mostra il contenuto solo quando i moduli sono caricati; intanto «Caricamento…». */
export function WithModules({ modules, children }: { readonly modules: readonly ModuleCode[]; readonly children: () => ComponentChildren }) {
  const state = useModules(modules);
  if (state.ready) return <>{children()}</>;
  if (state.failed) {
    return (
      <div class="notice">
        <p>Non riesco a caricare questa parte dell'app.</p>
        <button type="button" class="button" onClick={state.retry}>
          Riprova
        </button>
      </div>
    );
  }
  return (
    <p class="muted loading" role="status">
      Caricamento…
    </p>
  );
}
