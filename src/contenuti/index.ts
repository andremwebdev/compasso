// Le lezioni dell'app. L'elenco non sta più qui: ogni lezione si aggiunge nel file del suo modulo
// (src/moduli/vN/mNN.ts). Da qui si leggono:
//   - i codici e i titoli delle lezioni scritte, dall'indice leggero (sempre disponibili);
//   - il testo di una lezione, solo se il suo modulo è caricato (ensureModules in src/moduli/caricamento.ts).
// I file Markdown entrano nel codice come testo e vengono letti con parseLesson solo quando servono.

import { moduleOf, type LessonCode } from "../codici";
import { loadedModule } from "../moduli/caricamento";
import { contentIndex, type LessonInfo } from "../moduli/indice";
import { parseLesson, type Lesson } from "./formato";

const infos = new Map<string, LessonInfo>(contentIndex.flatMap((module) => module.lessons.map((lesson) => [lesson.code, lesson] as const)));

/** I codici delle lezioni scritte, in ordine di programma. */
export const lessonCodes: readonly LessonCode[] = [...infos.keys()].sort() as LessonCode[];

/** Codice, titolo, prerequisiti e termini di una lezione scritta (anche se il modulo non è caricato). */
export const lessonInfo = (code: string): LessonInfo | undefined => infos.get(code);

/** Il testo Markdown di una lezione; undefined se non esiste o se il suo modulo non è ancora caricato. */
export function lessonSource(code: string): string | undefined {
  if (!infos.has(code)) return undefined;
  const module = loadedModule(moduleOf(code as LessonCode));
  return (module?.lessons as Record<string, string | undefined> | undefined)?.[code];
}

const parsed = new Map<string, Lesson | null>();

/**
 * La lezione letta dal suo file; null se il codice non esiste, se il file non si legge (un test lo
 * esclude) o se il suo modulo non è ancora caricato.
 */
export function loadLesson(code: string): Lesson | null {
  const cached = parsed.get(code);
  if (cached !== undefined) return cached;
  const source = lessonSource(code);
  if (source === undefined) return null;
  const lesson = parseLesson(source).lesson;
  parsed.set(code, lesson);
  return lesson;
}
