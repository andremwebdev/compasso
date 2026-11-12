// Elenco dei generatori dell'app: ogni generatore nuovo si aggiunge QUI, in una riga.
// Da questo elenco l'app trova un generatore dal suo codice, e la verifica dei contenuti sa quali
// generatori (e con quali livelli) una lezione può citare. Un test controlla che ogni file di
// src/generatori/ sia in elenco e stia nel posto che corrisponde al suo codice.

import type { GeneratorCode, SkillCode } from "../codici";
import type { GeneratorDefinition } from "../esercizi";
import v1m04a07g1 from "./v1/m04/a07-g1";
import v1m06a04g1 from "./v1/m06/a04-g1";
import v2m06a03g1 from "./v2/m06/a03-g1";
import v3m02a01g1 from "./v3/m02/a01-g1";
import v3m03a01g1 from "./v3/m03/a01-g1";

/** Tutti i generatori, nell'ordine del programma (volume, modulo, abilità). */
export const generators: readonly GeneratorDefinition[] = [v1m04a07g1, v1m06a04g1, v2m06a03g1, v3m02a01g1, v3m03a01g1];

const byCode: ReadonlyMap<string, GeneratorDefinition> = new Map(generators.map((generator) => [generator.code, generator]));

/** Il generatore con questo codice, oppure undefined. */
export function findGenerator(code: string): GeneratorDefinition | undefined {
  return byCode.get(code);
}

/** I generatori di un'abilità (di norma uno solo). */
export function generatorsOfSkill(skill: SkillCode): GeneratorDefinition[] {
  return generators.filter((generator) => generator.skill === skill);
}

/** Per la verifica dei contenuti: codice del generatore → livelli che supporta. */
export function generatorLevels(): Record<GeneratorCode, readonly number[]> {
  return Object.fromEntries(generators.map((generator) => [generator.code, generator.levels]));
}
