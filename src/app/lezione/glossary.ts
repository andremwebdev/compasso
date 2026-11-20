// Il glossario ricavato dalle lezioni: ogni termine con il suo nome, la definizione breve e la lezione
// che lo definisce (blocchi «definizione» con un termine e blocchi «glossario»).
// Quale lezione definisce un termine lo dice l'indice leggero; la definizione si legge dalla lezione,
// quindi serve il suo modulo caricato (loadGlossaryItem lo carica, se manca).

import { moduleOf, type LessonCode } from "../../codici";
import { lessonCodes, loadLesson } from "../../contenuti";
import { ensureModules, loadedModules } from "../../moduli/caricamento";
import { contentIndex } from "../../moduli/indice";

export interface GlossaryItem {
  readonly term: string;
  readonly name: string;
  readonly body: string;
  readonly lesson: string;
}

/** Termine → lezione che lo definisce, dall'indice (senza caricare nulla). */
const termLessons = new Map<string, LessonCode>(contentIndex.flatMap((module) => module.lessons.flatMap((lesson) => lesson.terms.map((item) => [item.term, lesson.code] as const))));

/** Quanti termini definiscono le lezioni scritte. */
export const glossaryTermCount = (): number => termLessons.size;

let cache: Map<string, GlossaryItem> | null = null;
let cachedModules = -1;

/** Il termine del glossario con questo codice, se una lezione già caricata lo definisce. */
export function glossaryItem(term: string): GlossaryItem | undefined {
  const modules = loadedModules().length;
  if (!cache || cachedModules !== modules) {
    cache = new Map();
    cachedModules = modules;
    for (const code of lessonCodes) {
      for (const block of loadLesson(code)?.blocks ?? []) {
        if (block.kind === "definition" && block.term) cache.set(block.term, { term: block.term, name: block.name, body: block.body, lesson: code });
        if (block.kind === "glossary") cache.set(block.term, { term: block.term, name: block.name, body: block.body, lesson: code });
      }
    }
  }
  return cache.get(term);
}

/** Il termine del glossario, dopo aver caricato il modulo della lezione che lo definisce. */
export async function loadGlossaryItem(term: string): Promise<GlossaryItem | undefined> {
  const lesson = termLessons.get(term);
  if (!lesson) return undefined;
  await ensureModules([moduleOf(lesson)]);
  return glossaryItem(term);
}

/** Tutti i termini del glossario delle lezioni caricate, in ordine alfabetico del nome. */
export function allGlossaryItems(): GlossaryItem[] {
  glossaryItem("");
  return [...(cache?.values() ?? [])].sort((a, b) => a.name.localeCompare(b.name, "it"));
}
