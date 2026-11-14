// Riassunti ricavati dal registro dei tentativi. Per ora solo i conteggi per abilità: la formula
// della padronanza (specifica, sezione 7) arriva con il motore dei progressi, e partirà da qui.

import type { SkillCode } from "../codici";
import type { AttemptRecord } from "./types";

export interface SkillSummary {
  readonly skill: SkillCode;
  /** Tentativi che contano: tutti tranne le domande lampo. Una distrazione resta un errore (specifica, sezioni 5 e 9). */
  readonly attempts: number;
  readonly correct: number;
  /** Quanti degli errori sono segnati come distrazione: il diario li terrà separati da quelli di concetto. */
  readonly distractions: number;
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
    const before = bySkill.get(attempt.skill) ?? { skill: attempt.skill, attempts: 0, correct: 0, distractions: 0, bestLevel: 0, lastAt: attempt.at };
    const right = attempt.outcome === "correct";
    bySkill.set(attempt.skill, {
      skill: attempt.skill,
      attempts: before.attempts + 1,
      correct: before.correct + (right ? 1 : 0),
      distractions: before.distractions + (attempt.outcome === "wrong" && attempt.distraction ? 1 : 0),
      bestLevel: right ? Math.max(before.bestLevel, attempt.level ?? 0) : before.bestLevel,
      lastAt: attempt.at > before.lastAt ? attempt.at : before.lastAt,
    });
  }
  // Confronto semplice tra codici: l'ordine non deve dipendere dalla lingua del dispositivo.
  return [...bySkill.values()].sort((a, b) => (a.skill < b.skill ? -1 : a.skill > b.skill ? 1 : 0));
}
