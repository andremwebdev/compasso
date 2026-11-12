// Elenco delle lezioni dell'app: ogni lezione nuova si aggiunge QUI, in una riga.
// I file Markdown entrano nell'app come testo (scripts/build.mjs li carica così) e vengono letti con
// parseLesson solo quando servono. Un test controlla che ogni file di src/contenuti/ sia in elenco.
//
// Nota per la fase 5: quando i contenuti crescono, questo elenco si divide per modulo, in modo che la
// versione da telefono carichi un modulo alla volta (specifica, sezione 12).

import type { LessonCode } from "../codici";
import { parseLesson, type Lesson } from "./formato";
import v1m06l04 from "./v1/m06/l04.md";

/** Il testo Markdown di ogni lezione, per codice. */
export const lessonSources: Readonly<Record<LessonCode, string>> = {
  "V1.M06.L04": v1m06l04,
};

/** I codici delle lezioni presenti, in ordine di programma. */
export const lessonCodes = Object.keys(lessonSources).sort() as LessonCode[];

const parsed = new Map<string, Lesson | null>();

/** La lezione letta dal suo file; null se il codice non esiste (o se il file non si legge: un test lo esclude). */
export function loadLesson(code: string): Lesson | null {
  if (!parsed.has(code)) {
    const source = (lessonSources as Record<string, string | undefined>)[code];
    parsed.set(code, source === undefined ? null : parseLesson(source).lesson);
  }
  return parsed.get(code) ?? null;
}
