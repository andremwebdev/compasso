// Diario degli errori (specifica, sezione 5): frequenza di ogni errore e di ogni categoria, con i
// recenti che pesano di più (peso che si dimezza ogni 30 giorni), andamento degli ultimi 30 giorni
// rispetto ai 30 precedenti, viste separate per errori di concetto, di forma e distrazioni.
// Le domande lampo non entrano: controllano la comprensione mentre si legge.

import { ageInDays } from "./dates";
import type { AttemptRecord } from "./types";

/** Le tre viste del diario. NON_CLASSIFICATO sta con gli errori di concetto. */
export type DiaryView = "concetto" | "forma" | "distrazione";
export type Trend = "migliora" | "stabile" | "peggiora";

const HALF_LIFE_DAYS = 30;

export interface DiaryEntry {
  /** Codice di errore del catalogo, oppure NON_CLASSIFICATO. */
  readonly code: string;
  /** Categoria (CALC, ALG…) o null per NON_CLASSIFICATO. */
  readonly category: string | null;
  /** Frequenza pesata: ogni errore vale 1 oggi, 1/2 dopo 30 giorni, 1/4 dopo 60. */
  readonly weight: number;
  readonly count: number;
  readonly last30: number;
  readonly previous30: number;
  readonly trend: Trend;
  readonly lastAt: string;
}

export interface CategoryEntry {
  readonly category: string;
  readonly weight: number;
  readonly count: number;
  readonly trend: Trend;
}

/** In quale vista va un tentativo sbagliato. */
export function viewOf(attempt: AttemptRecord): DiaryView {
  if (attempt.distraction) return "distrazione";
  return attempt.error?.startsWith("FORMA.") ? "forma" : "concetto";
}

/** Migliora, stabile o peggiora: una differenza di un errore (o di un quinto) è rumore. */
export function trendOf(last30: number, previous30: number): Trend {
  const margin = Math.max(1, 0.2 * Math.max(last30, previous30));
  if (last30 - previous30 > margin) return "peggiora";
  if (previous30 - last30 > margin) return "migliora";
  return "stabile";
}

/** Gli errori che entrano nel diario. */
const diaryErrors = (attempts: readonly AttemptRecord[]): AttemptRecord[] =>
  attempts.filter((attempt) => attempt.outcome === "wrong" && attempt.error !== null && attempt.context !== "lampo");

/** Le voci del diario per una vista (o tutte), dalla più frequente. */
export function diaryEntries(attempts: readonly AttemptRecord[], now: Date, view?: DiaryView): DiaryEntry[] {
  const groups = new Map<string, { weight: number; count: number; last30: number; previous30: number; lastAt: string }>();
  for (const attempt of diaryErrors(attempts)) {
    if (view && viewOf(attempt) !== view) continue;
    const code = attempt.error ?? "NON_CLASSIFICATO";
    const age = ageInDays(attempt.at, now);
    const group = groups.get(code) ?? { weight: 0, count: 0, last30: 0, previous30: 0, lastAt: attempt.at };
    group.weight += 0.5 ** (age / HALF_LIFE_DAYS);
    group.count += 1;
    if (age < 30) group.last30 += 1;
    else if (age < 60) group.previous30 += 1;
    if (attempt.at > group.lastAt) group.lastAt = attempt.at;
    groups.set(code, group);
  }
  return [...groups.entries()]
    .map(([code, g]) => ({
      code,
      category: code.includes(".") ? (code.split(".")[0] ?? null) : null,
      weight: g.weight,
      count: g.count,
      last30: g.last30,
      previous30: g.previous30,
      trend: trendOf(g.last30, g.previous30),
      lastAt: g.lastAt,
    }))
    .sort((a, b) => b.weight - a.weight || (a.code < b.code ? -1 : 1));
}

/** Le categorie, dalla più frequente, ricavate dalle voci. */
export function diaryCategories(entries: readonly DiaryEntry[]): CategoryEntry[] {
  const groups = new Map<string, { weight: number; count: number; last30: number; previous30: number }>();
  for (const entry of entries) {
    const key = entry.category ?? "NON_CLASSIFICATO";
    const g = groups.get(key) ?? { weight: 0, count: 0, last30: 0, previous30: 0 };
    g.weight += entry.weight;
    g.count += entry.count;
    g.last30 += entry.last30;
    g.previous30 += entry.previous30;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([category, g]) => ({ category, weight: g.weight, count: g.count, trend: trendOf(g.last30, g.previous30) }))
    .sort((a, b) => b.weight - a.weight || (a.category < b.category ? -1 : 1));
}

/** Gli errori di concetto più frequenti (per la fase «Punti deboli» di Oggi): solo quelli del catalogo. */
export function weakestErrors(attempts: readonly AttemptRecord[], now: Date, limit = 3): string[] {
  return diaryEntries(attempts, now, "concetto")
    .filter((entry) => entry.category !== null)
    .slice(0, limit)
    .map((entry) => entry.code);
}
