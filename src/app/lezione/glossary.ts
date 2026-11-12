// Il glossario ricavato dalle lezioni: ogni termine con il suo nome, la definizione breve e la lezione
// che lo definisce (blocchi «definizione» con un termine e blocchi «glossario»).

import { lessonCodes, loadLesson } from "../../contenuti";

export interface GlossaryItem {
  readonly term: string;
  readonly name: string;
  readonly body: string;
  readonly lesson: string;
}

let cache: Map<string, GlossaryItem> | null = null;

/** Il termine del glossario con questo codice, se una lezione lo definisce. */
export function glossaryItem(term: string): GlossaryItem | undefined {
  if (!cache) {
    cache = new Map();
    for (const code of lessonCodes) {
      for (const block of loadLesson(code)?.blocks ?? []) {
        if (block.kind === "definition" && block.term) cache.set(block.term, { term: block.term, name: block.name, body: block.body, lesson: code });
        if (block.kind === "glossary") cache.set(block.term, { term: block.term, name: block.name, body: block.body, lesson: code });
      }
    }
  }
  return cache.get(term);
}
