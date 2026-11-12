// Una lezione si legge a tratti: ogni tratto finisce con una domanda lampo (o con la fine della
// lezione). Il tratto successivo si apre dopo aver risposto: così la spiegazione arriva a blocchi
// brevi, con le domande in mezzo (specifica, sezione 3), e si riprende dal tratto dove ci si era fermati.

import type { Lesson, LessonBlock } from "../../contenuti/formato";

/** I blocchi di una lezione divisi in tratti. Le flashcard non si mostrano nel testo: vanno nel mazzo. */
export function lessonChunks(lesson: Lesson): LessonBlock[][] {
  const chunks: LessonBlock[][] = [];
  let current: LessonBlock[] = [];
  for (const block of lesson.blocks) {
    if (block.kind === "flashcard" || block.kind === "glossary") continue;
    current.push(block);
    if (block.kind === "question") {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
