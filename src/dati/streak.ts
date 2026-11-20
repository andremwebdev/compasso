// Serie di giorni (specifica, sezione 9). Un giorno conta se la sessione di Oggi è stata completata.
// Un giorno saltato è coperto da un giorno libero se nella settimana (lunedì-domenica) ne restano
// (al più due) e se il giorno prima non era già libero; altrimenti la serie riparte da zero.
// I giorni liberi tengono viva la serie ma non la allungano: la serie conta i giorni di studio.

import { addDays, weekStart } from "./dates";
import type { DayRecord } from "./types";

export const FREE_DAYS_PER_WEEK = 2;

export interface StreakInfo {
  /** Giorni di studio della serie in corso. */
  readonly current: number;
  /** La serie più lunga di sempre. */
  readonly longest: number;
  /** Giorni liberi usati nella settimana di oggi. */
  readonly freeUsedThisWeek: number;
  /** Le date coperte da un giorno libero (per mostrarle). */
  readonly freeDates: readonly string[];
  /** Vero se la sessione di oggi è già completata. */
  readonly doneToday: boolean;
}

/** La serie al giorno `today`, ricavata dai giorni completati. */
export function streakInfo(days: readonly DayRecord[], today: string): StreakInfo {
  const done = new Set(days.map((day) => day.date));
  const sorted = [...done].sort();
  const first = sorted[0];
  if (first === undefined || first > today) return { current: 0, longest: 0, freeUsedThisWeek: 0, freeDates: [], doneToday: false };
  const freeByWeek = new Map<string, number>();
  const freeDates: string[] = [];
  let current = 0;
  let longest = 0;
  let previousFree = false;
  for (let date = first; date <= today; date = addDays(date, 1)) {
    if (done.has(date)) {
      current += 1;
      previousFree = false;
    } else if (date === today) {
      // Oggi non è ancora finito: la serie resta com'è.
    } else {
      const week = weekStart(date);
      const used = freeByWeek.get(week) ?? 0;
      if (current > 0 && used < FREE_DAYS_PER_WEEK && !previousFree) {
        freeByWeek.set(week, used + 1);
        freeDates.push(date);
        previousFree = true;
      } else {
        current = 0;
        previousFree = false;
      }
    }
    longest = Math.max(longest, current);
  }
  return { current, longest, freeUsedThisWeek: freeByWeek.get(weekStart(today)) ?? 0, freeDates, doneToday: done.has(today) };
}
