// L'indice leggero dei contenuti: per ogni modulo, i codici delle lezioni e dei generatori con i pochi
// dati che servono a navigazione, Oggi, Esercizi e diario (titoli, abilità, livelli, errori, termini
// del glossario, codici delle flashcard). Non contiene né il testo delle lezioni né il codice dei generatori.
//
// Non si scrive a mano: lo calcola la compilazione dai file dei moduli (scripts/indice-contenuti.mjs,
// con indexModule di ./indicizza.ts) e lo inserisce nell'app come costante; Vitest fa lo stesso.

import type { GlossaryTerm, LessonCode, ModuleCode } from "../codici";
import type { GeneratorDefinition } from "../esercizi";

/** Di un generatore, quello che serve senza caricarne il codice. */
export type GeneratorInfo = Pick<GeneratorDefinition, "code" | "skill" | "lesson" | "title" | "levels" | "errors">;

/** Di una lezione scritta, quello che serve senza caricarne il testo. */
export interface LessonInfo {
  readonly code: LessonCode;
  readonly title: string;
  /** I prerequisiti dichiarati nell'intestazione del file. */
  readonly prerequisites: readonly LessonCode[];
  /** I termini del glossario che la lezione definisce. */
  readonly terms: readonly { readonly term: GlossaryTerm; readonly name: string }[];
  /** I codici delle flashcard della lezione (definizioni, teoremi, flashcard scritte a mano), in ordine. */
  readonly cards: readonly string[];
}

export interface ModuleInfo {
  readonly code: ModuleCode;
  readonly lessons: readonly LessonInfo[];
  readonly generators: readonly GeneratorInfo[];
}

/** L'indice di tutti i moduli, nell'ordine del registro (src/moduli/index.ts). */
export const contentIndex: readonly ModuleInfo[] = __CONTENT_INDEX__;
