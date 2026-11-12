// I dati di Andrea: registro dei tentativi e progressi delle lezioni. Ogni salvataggio porta il
// numero di versione dei dati (DATA_VERSION): quando la struttura cambia, il numero sale e si
// scrive un passaggio di migrazione in migrate.ts.

import type { GeneratorCode, LessonCode, SkillCode } from "../codici";

/** Versione della struttura dei dati. Si aumenta di uno a ogni cambiamento della struttura. */
export const DATA_VERSION = 1;

/** Dove è stato fatto un tentativo. */
export type AttemptContext = "lampo" | "lezione" | "esercizi" | "oggi" | "simulazione" | "minitest";

/** Un tentativo: una riga del registro (specifica, sezione 7). */
export interface AttemptRecord {
  /** Identificatore unico della riga. */
  readonly id: string;
  /** Data e ora, in formato ISO. */
  readonly at: string;
  readonly skill: SkillCode | null;
  readonly generator: GeneratorCode | null;
  readonly seed: number | null;
  readonly level: 1 | 2 | 3 | null;
  /** Per le domande lampo scritte a mano: la lezione e la riga del blocco. */
  readonly lesson: LessonCode | null;
  readonly question: number | null;
  readonly outcome: "correct" | "wrong" | "skipped";
  /** Codice di errore del catalogo oppure NON_CLASSIFICATO; null se la risposta è giusta o non data. */
  readonly error: string | null;
  /** «Segna come distrazione»: l'errore non pesa sulla diagnosi. */
  readonly distraction: boolean;
  /** Indizi usati: 0, 1 o 2. */
  readonly hints: number;
  /** Tempo impiegato, in millisecondi. */
  readonly millis: number;
  readonly context: AttemptContext;
}

/** A che punto è una lezione. */
export interface LessonProgress {
  readonly code: LessonCode;
  /** Quanti tratti della lezione sono stati aperti (si riprende da qui). */
  readonly reached: number;
  readonly completed: boolean;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

/** Tutto quello che è salvato, in una forma sola: serve al ripiego su localStorage, alle migrazioni e (poi) al backup. */
export interface StoredData {
  readonly version: number;
  readonly attempts: readonly AttemptRecord[];
  readonly lessons: readonly LessonProgress[];
}

/** I dati di un'installazione nuova. */
export const emptyData = (): StoredData => ({ version: DATA_VERSION, attempts: [], lessons: [] });
