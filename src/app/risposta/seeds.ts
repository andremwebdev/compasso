// Semi per gli esercizi nuovi. Un seme scelto a caso può ridare un esercizio appena visto: i generatori
// con pochi esercizi possibili (la scomposizione al livello 3 ne ha meno di duecento) lo fanno spesso.
// «Esercizio simile» e «Avanti» devono proporre un esercizio diverso da quelli della serie in corso.

import { generateExercise, type GeneratorDefinition, type Level } from "../../esercizi";

/**
 * Un seme che dà un esercizio non ancora visto in questa serie (si riconosce dal testo). Dopo `tries`
 * tentativi a vuoto si tiene l'ultimo: con un generatore piccolo e una serie lunga può non essercene uno nuovo.
 */
export function freshSeed(generator: GeneratorDefinition, level: Level, seen: ReadonlySet<string>, random: () => number, tries = 12): number {
  let seed = random();
  for (let attempt = 1; attempt < tries && seen.has(generateExercise(generator, level, seed).prompt); attempt++) seed = random();
  return seed;
}
