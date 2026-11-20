// Le flashcard (specifica, sezione 4): automatiche da ogni definizione e da ogni teorema, più quelle
// scritte a mano con il blocco «flashcard». Il codice della flashcard è quello del blocco (D, T o F):
// nessuna flashcard si scrive due volte.

import type { LessonCode, TheoremCode } from "../../codici";
import { lessonCodes, loadLesson } from "../../contenuti";
import type { Lesson, ProofStep } from "../../contenuti/formato";

export interface Card {
  readonly id: string;
  readonly lesson: LessonCode;
  readonly kind: "definizione" | "teorema" | "manuale";
  /** Davanti e dietro, in testo ricco. */
  readonly front: string;
  readonly back: string;
}

/** Le flashcard di una lezione, nell'ordine in cui compaiono. */
export function cardsOfLesson(lesson: Lesson): Card[] {
  const code = lesson.meta.code;
  return lesson.blocks.flatMap((block): Card[] => {
    switch (block.kind) {
      case "definition":
        return [{ id: block.id, lesson: code, kind: "definizione", front: `Definisci: **${block.name}**.`, back: block.body }];
      case "theorem":
        return [{ id: block.id, lesson: code, kind: "teorema", front: `Enuncia il teorema: **${block.name}**.`, back: block.body }];
      case "flashcard":
        return [{ id: block.id, lesson: code, kind: "manuale", front: block.front, back: block.back }];
      default:
        return [];
    }
  });
}

let cache: Map<string, Card> | null = null;

/** Tutte le flashcard delle lezioni scritte. */
export function allCards(): Card[] {
  if (!cache) {
    cache = new Map();
    for (const code of lessonCodes) {
      const lesson = loadLesson(code);
      if (lesson) for (const card of cardsOfLesson(lesson)) cache.set(card.id, card);
    }
  }
  return [...cache.values()];
}

/** La flashcard con questo codice. */
export const findCard = (id: string): Card | undefined => {
  allCards();
  return cache?.get(id);
};

/** Una dimostrazione di una lezione scritta, con il suo teorema. */
export interface ProofEntry {
  readonly lesson: LessonCode;
  readonly theorem: TheoremCode;
  readonly name: string;
  readonly statement: string;
  readonly intro: string;
  readonly steps: readonly ProofStep[];
}

/** Le dimostrazioni di una lezione (blocco «dimostrazione» con il teorema a cui si riferisce). */
export function proofsOfLesson(lesson: Lesson): ProofEntry[] {
  return lesson.blocks.flatMap((block): ProofEntry[] => {
    if (block.kind !== "proof") return [];
    const theorem = lesson.blocks.find((other) => other.kind === "theorem" && other.id === block.of);
    if (!theorem || theorem.kind !== "theorem") return [];
    return [{ lesson: lesson.meta.code, theorem: block.of, name: theorem.name, statement: theorem.body, intro: block.intro, steps: block.steps }];
  });
}

/** Tutte le dimostrazioni delle lezioni scritte. */
export function allProofs(): ProofEntry[] {
  return lessonCodes.flatMap((code) => {
    const lesson = loadLesson(code);
    return lesson ? proofsOfLesson(lesson) : [];
  });
}
