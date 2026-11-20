// Calcola l'indice leggero (./indice.ts) dai file dei moduli. Lo usano la compilazione
// (scripts/indice-contenuti.mjs) e Vitest (vitest.config.ts), mai l'app.

import { parseLesson } from "../contenuti/formato";
import type { ModuleContent } from "./definizione";
import { moduleLoaders } from "./index";
import type { LessonInfo, ModuleInfo } from "./indice";

/** L'indice di un modulo. Una lezione che non si legge resta fuori (la verifica dei contenuti lo segnala). */
export function indexModule(content: ModuleContent): ModuleInfo {
  const lessons = Object.values(content.lessons).flatMap((source): LessonInfo[] => {
    const lesson = parseLesson(source).lesson;
    if (!lesson) return [];
    const terms = lesson.blocks.flatMap((block) =>
      (block.kind === "definition" && block.term) || block.kind === "glossary" ? [{ term: block.term!, name: block.name }] : [],
    );
    // Come cardsOfLesson (src/app/ripasso/cards.ts): un test controlla che diano gli stessi codici.
    const cards = lesson.blocks.flatMap((block) => (block.kind === "definition" || block.kind === "theorem" || block.kind === "flashcard" ? [block.id] : []));
    return [{ code: lesson.meta.code, title: lesson.meta.title, prerequisites: lesson.meta.prerequisites, terms, cards }];
  });
  lessons.sort((a, b) => a.code.localeCompare(b.code));
  const generators = content.generators.map(({ code, skill, lesson, title, levels, errors }) => ({ code, skill, lesson, title, levels, errors }));
  return { code: content.code, lessons, generators };
}

/** L'indice di tutti i moduli del registro, nel suo ordine. */
export async function indexAllModules(): Promise<ModuleInfo[]> {
  const contents = await Promise.all(Object.values(moduleLoaders).map((load) => load().then((module) => module.default)));
  return contents.map(indexModule);
}
