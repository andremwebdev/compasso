// Il controllo «Lo so già» di un modulo (specifica, sezione 3): 5 esercizi sulle abilità del modulo
// che hanno un generatore. Superato con almeno 4 risposte giuste: le abilità del modulo partono da
// «consolidato» ed entrano nel ripasso. Se no, si mostrano le abilità sbagliate e le loro lezioni.

import type { ModuleCode, SkillCode } from "../../codici";
import { findModule, skillsOfModule } from "../../contenuti/programma";
import type { KnownCheck } from "../../dati";
import type { Level } from "../../esercizi";
import type { SeriesResult } from "../componenti/ExerciseSeries";
import { generatorsOfModule } from "../programma";
import type { PracticePlan } from "../state";

/** I livelli dei cinque esercizi: da verifica, poi due casi particolari. */
export const CHECK_LEVELS: readonly Level[] = [2, 2, 2, 3, 3];
/** Risposte giuste che servono per superare il controllo. */
export const CHECK_PASS = 4;

/** La serie del controllo: i generatori del modulo a turno, ai livelli di CHECK_LEVELS. */
export function knownCheckPlan(module: ModuleCode): PracticePlan {
  const pool = generatorsOfModule(module);
  const items = CHECK_LEVELS.flatMap((level, index) => {
    const generator = pool[index % Math.max(pool.length, 1)];
    if (!generator) return [];
    // Se il generatore non ha quel livello, il più alto che ha.
    const chosen = (generator.levels.includes(level) ? level : Math.max(...generator.levels)) as Level;
    return [{ generator: generator.code, level: chosen }];
  });
  return { title: `Lo so già: ${findModule(module)?.title ?? module}`, items, endless: false, context: "controllo", lesson: null, check: module };
}

/** L'esito del controllo, da salvare: superato o no, con le abilità sbagliate. */
export function checkRecord(module: ModuleCode, results: readonly SeriesResult[], id: string, at: string): KnownCheck {
  const correct = results.filter((result) => result.outcome === "correct").length;
  const failed = [...new Set(results.filter((result) => result.outcome !== "correct").map((result) => result.skill))] as SkillCode[];
  const passed = correct >= CHECK_PASS;
  // Superato: tutte le abilità del modulo partono da «consolidato», non solo quelle provate.
  const skills = passed ? skillsOfModule(module) : [...new Set(results.map((result) => result.skill))];
  return { id, at, module, passed, skills, failed };
}
