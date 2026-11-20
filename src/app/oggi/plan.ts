// La sessione di Oggi (specifica, sezione 3): durata scelta ogni giorno (20, 40 o 60 minuti), cinque
// fasi sempre nello stesso ordine, con la taratura iniziale dei tempi; binari che si alternano giorno
// per giorno. Qui ci sono solo i conti: la schermata è in Oggi.tsx.

import type { DayRecord, SessionMinutes, TrackId } from "../../dati";
import type { Level } from "../../esercizi";

export const PHASE_NAMES = ["Ripasso", "Lezione nuova", "Esercizi sulla lezione", "Punti deboli", "Chiusura"] as const;
export const CLOSING_PHASE = 4;

/** Minuti di ogni fase per durata (specifica, sezione 3: taratura iniziale, da rivedere con l'uso). */
export const PHASE_MINUTES: Readonly<Record<SessionMinutes, readonly [number, number, number, number, number]>> = {
  20: [5, 9, 4, 1, 1],
  40: [8, 16, 9, 5, 2],
  60: [10, 22, 15, 10, 3],
};

/** Stime per riempire una fase: un esercizio vale circa 2 minuti, una flashcard mezzo. */
export const EXERCISE_MINUTES = 2;
export const FLASHCARD_MINUTES = 0.5;

/** I minuti di ogni fase; senza lezione nuova il suo tempo passa agli esercizi. */
export function phaseMinutes(minutes: SessionMinutes, hasLesson: boolean): [number, number, number, number, number] {
  const [review, lesson, exercises, weak, closing] = PHASE_MINUTES[minutes];
  return hasLesson ? [review, lesson, exercises, weak, closing] : [review, 0, exercises + lesson, weak, closing];
}

/** Quanti esercizi stanno in una fase di `budget` minuti (almeno uno). */
export const exerciseCount = (budget: number): number => Math.max(1, Math.round(budget / EXERCISE_MINUTES));

/**
 * Il ripasso: quante flashcard e quanti esercizi in scadenza. Metà del tempo alle flashcard, il resto
 * agli esercizi; quello che una delle due parti non usa passa all'altra.
 */
export function reviewPlan(budget: number, dueCards: number, dueSkills: number): { cards: number; exercises: number } {
  const firstCards = Math.min(dueCards, Math.floor(budget / 2 / FLASHCARD_MINUTES));
  const exercises = Math.min(dueSkills, Math.floor((budget - firstCards * FLASHCARD_MINUTES) / EXERCISE_MINUTES));
  const cards = Math.min(dueCards, Math.floor((budget - exercises * EXERCISE_MINUTES) / FLASHCARD_MINUTES));
  return { cards, exercises };
}

/** Livelli a difficoltà crescente per `n` esercizi: un terzo a livello 1, un terzo a 2, il resto a 3. */
export function rampLevels(n: number): Level[] {
  return Array.from({ length: n }, (_, i) => (n === 1 ? 2 : ((1 + Math.floor((3 * i) / n)) as Level)));
}

/**
 * Il binario del giorno. Se l'ultima sessione ha lasciato una lezione a metà, si continua quella
 * (la lezione che non sta nel tempo continua il giorno dopo). Altrimenti i binari attivi si alternano:
 * dopo il binario dell'ultima sessione viene il successivo.
 */
export function trackForToday(tracks: readonly TrackId[], days: readonly DayRecord[], today: string, hasLessonInProgress: (track: TrackId) => boolean): TrackId | null {
  if (tracks.length === 0) return null;
  const last = [...days].filter((day) => day.date < today && day.track !== null && tracks.includes(day.track)).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!last?.track) return tracks[0] ?? null;
  if (hasLessonInProgress(last.track)) return last.track;
  return tracks[(tracks.indexOf(last.track) + 1) % tracks.length] ?? null;
}
