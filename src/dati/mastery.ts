// Padronanza delle abilità e ripasso a intervalli (specifica, sezione 9). Tutto si ricava dal
// registro dei tentativi e dai controlli «Lo so già»: niente stato a parte, così l'unione di due
// backup dà gli stessi livelli che si avrebbero studiando su un solo dispositivo.
// La formula è descritta in REGOLE.md («Padronanza e ripasso»); la fase 8 la tarerà sui dati veri.

import type { SkillCode } from "../codici";
import { addDays, ageInDays, dateOf, daysBetween } from "./dates";
import type { AttemptRecord, KnownCheck } from "./types";

/** I quattro livelli, dal più basso. Mai percentuali (specifica, sezione 9). */
export const MASTERY_LEVELS = ["nuovo", "apprendimento", "consolidato", "padroneggiato"] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

/** Come si mostrano i livelli ad Andrea. */
export const MASTERY_LABELS: Readonly<Record<MasteryLevel, string>> = {
  nuovo: "Nuovo",
  apprendimento: "In apprendimento",
  consolidato: "Consolidato",
  padroneggiato: "Padroneggiato",
};

/** Merito di una risposta giusta per livello di difficoltà e per indizi usati. */
const LEVEL_CREDIT = { 1: 0.7, 2: 0.9, 3: 1 } as const;
const HINT_FACTOR = [1, 0.75, 0.5] as const;
/** Il peso di un risultato si dimezza ogni 30 giorni: i recenti contano di più. */
const HALF_LIFE_DAYS = 30;
/** Un'abilità non toccata da più di 60 giorni scende di un livello (decadimento). */
const DECAY_DAYS = 60;
/** Intervalli del ripasso, in giorni: una risposta giusta sale di un gradino (una volta al giorno), una sbagliata riparte da capo. */
export const REVIEW_STEPS = [1, 3, 7, 16, 35, 90] as const;
/** Superare «Lo so già» vale come quattro risposte giuste di livello 2 e porta il ripasso al terzo gradino (7 giorni). */
const KNOWN_VIRTUAL_ATTEMPTS = 4;
const KNOWN_STEP = 2;

export interface SkillMastery {
  readonly skill: SkillCode;
  readonly level: MasteryLevel;
  /** Tentativi che contano (domande lampo escluse), più quelli virtuali di «Lo so già». */
  readonly evidence: number;
  /** Data dell'ultima attività sull'abilità; null se mai toccata. */
  readonly lastDate: string | null;
  /** Quando torna nel ripasso; null se l'abilità non è mai stata toccata. */
  readonly due: string | null;
}

/** Un risultato che entra nel calcolo: un tentativo vero o uno virtuale di «Lo so già». */
interface Result {
  readonly at: string;
  readonly correct: boolean;
  readonly level: 1 | 2 | 3;
  readonly hints: number;
  readonly known?: boolean;
}

/** I tentativi che contano per la padronanza: tutti tranne le domande lampo. */
export const countsForMastery = (attempt: AttemptRecord): boolean => attempt.context !== "lampo" && attempt.skill !== null;

function resultsBySkill(attempts: readonly AttemptRecord[], checks: readonly KnownCheck[]): Map<SkillCode, Result[]> {
  const map = new Map<SkillCode, Result[]>();
  const push = (skill: SkillCode, result: Result): void => {
    const list = map.get(skill);
    if (list) list.push(result);
    else map.set(skill, [result]);
  };
  for (const attempt of attempts) {
    if (!countsForMastery(attempt) || !attempt.skill) continue;
    // «Non lo so» e distrazioni contano come esercizi non riusciti.
    push(attempt.skill, { at: attempt.at, correct: attempt.outcome === "correct", level: attempt.level ?? 1, hints: attempt.hints });
  }
  for (const check of checks) {
    if (!check.passed) continue;
    for (const skill of check.skills) {
      for (let i = 0; i < KNOWN_VIRTUAL_ATTEMPTS; i += 1) push(skill, { at: check.at, correct: true, level: 2, hints: 0, known: true });
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return map;
}

/** Il gradino del ripasso e la data di scadenza, ripercorrendo i risultati in ordine. */
function schedule(results: readonly Result[]): { step: number; due: string | null } {
  let step = -1;
  let lastDate: string | null = null;
  let lastStepDate: string | null = null;
  for (const result of results) {
    const date = dateOf(result.at);
    lastDate = date;
    if (result.known) {
      step = Math.max(step, KNOWN_STEP);
      lastStepDate = date;
    } else if (!result.correct) {
      step = -1;
      lastStepDate = null;
    } else if (lastStepDate !== date) {
      // Più risposte giuste nello stesso giorno salgono di un gradino solo.
      step = Math.min(step + 1, REVIEW_STEPS.length - 1);
      lastStepDate = date;
    }
  }
  if (lastDate === null) return { step, due: null };
  return { step, due: addDays(lastDate, step < 0 ? 1 : (REVIEW_STEPS[step] ?? 1)) };
}

/** Il livello di padronanza di un'abilità a partire dai suoi risultati. */
function levelOf(results: readonly Result[], now: Date, today: string): MasteryLevel {
  if (results.length === 0) return "nuovo";
  let weighted = 0;
  let total = 0;
  for (const result of results) {
    const weight = 0.5 ** (ageInDays(result.at, now) / HALF_LIFE_DAYS);
    const credit = result.correct ? LEVEL_CREDIT[result.level] * (HINT_FACTOR[Math.min(result.hints, 2)] ?? 0.5) : 0;
    weighted += weight * credit;
    total += weight;
  }
  const score = total > 0 ? weighted / total : 0;
  const correctAt = (level: number): number => results.filter((r) => r.correct && r.level >= level).length;
  let index = 1;
  if (score >= 0.65 && results.length >= 4 && correctAt(2) >= 1) index = 2;
  if (score >= 0.85 && results.length >= 6 && correctAt(3) >= 2) index = 3;
  // Decadimento: un'abilità non toccata da molto scende di un livello (mai sotto «in apprendimento»).
  const last = results.at(-1);
  if (last && daysBetween(dateOf(last.at), today) > DECAY_DAYS && index > 1) index -= 1;
  return MASTERY_LEVELS[index] ?? "apprendimento";
}

/**
 * Padronanza e scadenza del ripasso di ogni abilità toccata (dai tentativi o da «Lo so già»).
 * Le abilità mai toccate non compaiono: sono «nuove».
 */
export function skillMasteries(attempts: readonly AttemptRecord[], checks: readonly KnownCheck[], now: Date, today: string): Map<SkillCode, SkillMastery> {
  const out = new Map<SkillCode, SkillMastery>();
  for (const [skill, results] of resultsBySkill(attempts, checks)) {
    const last = results.at(-1);
    out.set(skill, {
      skill,
      level: levelOf(results, now, today),
      evidence: results.length,
      lastDate: last ? dateOf(last.at) : null,
      due: schedule(results).due,
    });
  }
  return out;
}

/** Il livello di un'abilità (nuovo se mai toccata). */
export const masteryOf = (map: ReadonlyMap<SkillCode, SkillMastery>, skill: SkillCode): MasteryLevel => map.get(skill)?.level ?? "nuovo";

/** Le abilità con il ripasso scaduto, dalla più in ritardo. */
export function dueSkills(map: ReadonlyMap<SkillCode, SkillMastery>, today: string): SkillMastery[] {
  return [...map.values()].filter((m) => m.due !== null && m.due <= today).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? "") || (a.skill < b.skill ? -1 : 1));
}

/**
 * Il livello aggregato di un gruppo di abilità (lezione, modulo, volume): il livello medio,
 * arrotondato per difetto. Un gruppo senza abilità toccate è «nuovo».
 */
export function aggregateLevel(levels: readonly MasteryLevel[]): MasteryLevel {
  if (levels.length === 0 || levels.every((level) => level === "nuovo")) return "nuovo";
  const average = levels.reduce((sum, level) => sum + MASTERY_LEVELS.indexOf(level), 0) / levels.length;
  return MASTERY_LEVELS[Math.max(1, Math.floor(average))] ?? "apprendimento";
}

/** Il livello di partenza della difficoltà automatica (specifica, sezione 3). */
export function startingLevel(level: MasteryLevel): 1 | 2 | 3 {
  return level === "nuovo" ? 1 : level === "apprendimento" ? 2 : 3;
}

/**
 * Difficoltà automatica dentro una serie: dopo due errori di fila il livello scende di uno, dopo
 * tre risposte giuste di fila sale di uno, restando tra i livelli che il generatore offre.
 * `recent` sono gli esiti (giusta = true) dall'ultimo cambio di livello: chi chiama lo azzera quando il livello cambia.
 */
export function nextAutoLevel(current: 1 | 2 | 3, recent: readonly boolean[], available: readonly number[]): 1 | 2 | 3 {
  const tail = (n: number, value: boolean): boolean => recent.length >= n && recent.slice(-n).every((r) => r === value);
  let next = current;
  if (tail(2, false)) next = Math.max(1, current - 1) as 1 | 2 | 3;
  else if (tail(3, true)) next = Math.min(3, current + 1) as 1 | 2 | 3;
  if (available.includes(next)) return next;
  // Il generatore non ha quel livello: il più vicino tra quelli che ha.
  const sorted = [...available].sort((a, b) => Math.abs(a - next) - Math.abs(b - next));
  return (sorted[0] ?? current) as 1 | 2 | 3;
}
