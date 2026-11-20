// I generatori dell'app. L'elenco non sta più qui: ogni generatore si aggiunge nel file del suo modulo
// (src/moduli/vN/mNN.ts). Da qui si leggono:
//   - i dati leggeri di ogni generatore (codice, abilità, lezione, titolo, livelli, errori), dall'indice:
//     bastano per elenchi, Oggi, «Lo so già» e diario, senza caricare nulla;
//   - il generatore vero (con generate), solo se il suo modulo è caricato (ensureModules).

import { moduleOf, type GeneratorCode, type SkillCode } from "../codici";
import type { GeneratorDefinition } from "../esercizi";
import { loadedModule, loadedModules } from "../moduli/caricamento";
import { contentIndex, type GeneratorInfo } from "../moduli/indice";

export type { GeneratorInfo } from "../moduli/indice";

/** I dati leggeri di tutti i generatori, nell'ordine del programma (volume, modulo, abilità). */
export const generatorInfos: readonly GeneratorInfo[] = contentIndex.flatMap((module) => module.generators);

const infoByCode: ReadonlyMap<string, GeneratorInfo> = new Map(generatorInfos.map((info) => [info.code, info]));

/** I dati leggeri del generatore con questo codice, oppure undefined. */
export const findGeneratorInfo = (code: string): GeneratorInfo | undefined => infoByCode.get(code);

/** I dati leggeri dei generatori di un'abilità (di norma uno solo). */
export const generatorInfosOfSkill = (skill: SkillCode): GeneratorInfo[] => generatorInfos.filter((info) => info.skill === skill);

/** Il generatore con questo codice, se il suo modulo è caricato; altrimenti undefined. */
export function findGenerator(code: string): GeneratorDefinition | undefined {
  if (!infoByCode.has(code)) return undefined;
  return loadedModule(moduleOf(code as GeneratorCode))?.generators.find((generator) => generator.code === code);
}

/** I generatori dei moduli caricati finora, nell'ordine del programma. */
export function loadedGenerators(): GeneratorDefinition[] {
  const order = new Map(generatorInfos.map((info, index) => [info.code, index]));
  return loadedModules()
    .flatMap((module) => module.generators)
    .sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));
}

/** Per la verifica dei contenuti: codice del generatore → livelli che supporta. */
export function generatorLevels(): Record<GeneratorCode, readonly number[]> {
  return Object.fromEntries(generatorInfos.map((info) => [info.code, info.levels]));
}
