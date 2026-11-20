// Ripasso a intervalli delle flashcard (specifica, sezione 9): Andrea si autovaluta con tre pulsanti.
// «Subito» sale di un gradino (una volta al giorno), «a fatica» resta sul gradino, «non la sapevo»
// riparte da capo. Gli intervalli sono gli stessi delle abilità (REVIEW_STEPS).

import { addDays, dateOf } from "./dates";
import { REVIEW_STEPS } from "./mastery";
import type { FlashcardReview } from "./types";

export const GRADE_LABELS = ["Non la sapevo", "A fatica", "Subito"] as const;

export interface CardSchedule {
  readonly card: string;
  /** Quando la flashcard torna nel ripasso. */
  readonly due: string;
  readonly reviews: number;
  readonly lastGrade: 0 | 1 | 2;
}

/** La scadenza di ogni flashcard già ripassata almeno una volta. */
export function cardSchedules(reviews: readonly FlashcardReview[]): Map<string, CardSchedule> {
  const byCard = new Map<string, FlashcardReview[]>();
  for (const review of reviews) {
    const list = byCard.get(review.card);
    if (list) list.push(review);
    else byCard.set(review.card, [review]);
  }
  const out = new Map<string, CardSchedule>();
  for (const [card, list] of byCard) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    let step = -1;
    let lastStepDate: string | null = null;
    let date = "";
    let grade: 0 | 1 | 2 = 0;
    for (const review of list) {
      date = dateOf(review.at);
      grade = review.grade;
      if (review.grade === 0) {
        step = -1;
        lastStepDate = null;
      } else if (review.grade === 1) {
        step = Math.max(step, 0);
      } else if (lastStepDate !== date) {
        step = Math.min(step + 1, REVIEW_STEPS.length - 1);
        lastStepDate = date;
      }
    }
    out.set(card, { card, due: addDays(date, step < 0 ? 1 : (REVIEW_STEPS[step] ?? 1)), reviews: list.length, lastGrade: grade });
  }
  return out;
}

/**
 * Le flashcard da ripassare oggi tra quelle date (di solito: quelle delle lezioni completate).
 * Le mai viste vengono per prime; poi le scadute, dalla più in ritardo.
 */
export function dueCards(cards: readonly string[], schedules: ReadonlyMap<string, CardSchedule>, today: string): string[] {
  const unseen = cards.filter((card) => !schedules.has(card));
  const due = cards
    .filter((card) => {
      const schedule = schedules.get(card);
      return schedule !== undefined && schedule.due <= today;
    })
    .sort((a, b) => (schedules.get(a)?.due ?? "").localeCompare(schedules.get(b)?.due ?? ""));
  return [...unseen, ...due];
}
