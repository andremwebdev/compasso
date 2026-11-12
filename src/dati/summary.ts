// Riassunti ricavati dal registro dei tentativi. Per ora solo i conteggi per abilità: la formula
// della padronanza (specifica, sezione 7) arriva con il motore dei progressi, e partirà da qui.

import type { SkillCode } from "../codici";
import type { AttemptRecord } from "./types";

export interface SkillSummary {
  readonly skill: SkillCode;
  /** Tentativi che contano: esclusi le domande lampo e quelli segnati come distrazione. */
  readonly attempts: number;
  readonly correct: number;
  /** Il livello più alto in cui c'è almeno una risposta giusta (0 se nessuna). */
  readonly bestLevel: number;
  /** Data e ora dell'ultimo tentativo. */
  readonly lastAt: string;
}

/** I conteggi per abilità, in ordine di codice. Le domande lampo si registrano ma qui non contano. */
export function skillSummaries(attempts: readonly AttemptRecord[]): SkillSummary[] {
  const bySkill = new Map<SkillCode, SkillSummary>();
  for (const attempt of attempts) {
    if (!attempt.skill || attempt.context === "lampo") continue;
    const before = bySkill.get(attempt.skill) ?? { skill: attempt.skill, attempts: 0, correct: 0, bestLevel: 0, lastAt: attempt.at };
    const counts = !(attempt.outcome === "wrong" && attempt.distraction);
    const right = attempt.outcome === "correct";
    bySkill.set(attempt.skill, {
      skill: attempt.skill,
      attempts: before.attempts + (counts ? 1 : 0),
      correct: before.correct + (right ? 1 : 0),
      bestLevel: right ? Math.max(before.bestLevel, attempt.level ?? 0) : before.bestLevel,
      lastAt: attempt.at > before.lastAt ? attempt.at : before.lastAt,
    });
  }
  return [...bySkill.values()].sort((a, b) => a.skill.localeCompare(b.skill));
}
