// Stato dell'app: sezione aperta, schermata aperta, dati di Andrea (registro e progressi).
// I dati stanno in segnali: le schermate che li leggono si ridisegnano da sole quando cambiano.

import { signal } from "@preact/signals";
import type { GeneratorCode, LessonCode } from "../codici";
import { DataVersionError, openStore, type AttemptContext, type AttemptRecord, type DataStore, type LessonProgress, type TextStorage } from "../dati";
import type { Level } from "../esercizi";
import type { SectionId } from "./sections";

/** Sezione attualmente aperta. All'avvio si parte sempre da "Oggi". */
export const currentSection = signal<SectionId>("oggi");

/** Che cosa c'è sullo schermo dentro la sezione: la sua pagina iniziale, una lezione, una serie di esercizi. */
export type Screen =
  | { readonly kind: "home" }
  | { readonly kind: "lesson"; readonly code: LessonCode }
  | {
      readonly kind: "practice";
      readonly generator: GeneratorCode;
      /** I livelli degli esercizi, in ordine; con un solo livello la serie continua finché Andrea vuole. */
      readonly levels: readonly Level[];
      readonly endless: boolean;
      readonly context: AttemptContext;
      /** La lezione da cui si è partiti, se si è partiti da una lezione. */
      readonly lesson: LessonCode | null;
    };

export const screen = signal<Screen>({ kind: "home" });

/** Apre una schermata e riporta la pagina in cima. */
export function open(next: Screen, section?: SectionId): void {
  if (section) currentSection.value = section;
  screen.value = next;
  try {
    window.scrollTo(0, 0);
  } catch {
    // Dove lo scorrimento non esiste (prove automatiche) non serve.
  }
}

// ───────────────────────────── dati ─────────────────────────────

/** Il magazzino dei dati, quando è aperto. */
export const dataStore = signal<DataStore | null>(null);
/** Un problema con i dati da dire ad Andrea (dati di una versione futura). */
export const dataProblem = signal<string | null>(null);
export const attempts = signal<readonly AttemptRecord[]>([]);
export const lessonProgress = signal<Readonly<Record<string, LessonProgress>>>({});

/** localStorage, se si può usare (in un file aperto con doppio clic certi browser lo vietano). */
function safeLocalStorage(): TextStorage | undefined {
  try {
    const storage = window.localStorage;
    storage.getItem("compasso.prova");
    return storage;
  } catch {
    return undefined;
  }
}

function safeIndexedDb(): IDBFactory | undefined {
  try {
    return window.indexedDB ?? undefined;
  } catch {
    return undefined;
  }
}

/** Apre i dati e li carica nei segnali. Si chiama una volta, all'avvio. */
export async function loadData(): Promise<void> {
  try {
    const store = await openStore({ indexedDB: safeIndexedDb(), localStorage: safeLocalStorage() });
    dataStore.value = store;
    attempts.value = await store.attempts();
    lessonProgress.value = Object.fromEntries((await store.lessonProgress()).map((progress) => [progress.code, progress]));
  } catch (error) {
    dataProblem.value = error instanceof DataVersionError ? error.message : "Non riesco ad aprire i dati salvati: per ora i progressi non vengono registrati.";
  }
}

/** Aggiunge un tentativo al registro. */
export function recordAttempt(attempt: AttemptRecord): void {
  attempts.value = [...attempts.value, attempt];
  void dataStore.value?.addAttempt(attempt);
}

/** Mette o toglie l'etichetta «distrazione» a un tentativo. */
export function markDistraction(id: string, distraction: boolean): void {
  attempts.value = attempts.value.map((attempt) => (attempt.id === id ? { ...attempt, distraction } : attempt));
  void dataStore.value?.setDistraction(id, distraction);
}

/** Salva il punto raggiunto in una lezione. */
export function saveLessonProgress(progress: LessonProgress): void {
  lessonProgress.value = { ...lessonProgress.value, [progress.code]: progress };
  void dataStore.value?.saveLessonProgress(progress);
}

/** Un identificatore nuovo per una riga del registro. */
export const newId = (): string => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

/** Un seme a caso per un esercizio nuovo. */
export const randomSeed = (): number => Math.floor(Math.random() * 1_000_000);
