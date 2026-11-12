// Opzioni di scelta multipla e ordine di presentazione dei riordini.
// Qualunque esercizio con almeno tre risposte sbagliate previste si può mostrare come scelta
// multipla (serve alla simulazione TOL): le sbagliate previste diventano le opzioni sbagliate.

import { limitToLatex } from "../motore/calculus/limit";
import { toLatex } from "../motore/expr/latex";
import { matrixToLatex } from "../motore/linalg/matrix";
import { Rng } from "../motore/random/rng";
import { setToLatex } from "../motore/sets";
import type { Exercise, RichText } from "./schema";

export interface ChoiceOption {
  /** Indice da rimandare in Response: 0 è la risposta giusta, k ≥ 1 è la k-esima sbagliata prevista. */
  readonly index: number;
  readonly content: RichText;
}

const MIN_WRONG = 3;
const MAX_WRONG = 4;

/** I contenuti delle opzioni nell'ordine canonico (giusta, poi sbagliate); null se l'esercizio non ne ha. */
function optionContents(exercise: Exercise): RichText[] | null {
  const { answer } = exercise;
  const math = (latex: string): RichText => `$${latex}$`;
  switch (answer.kind) {
    case "choice":
      return [answer.correct, ...answer.wrong.map((wrong) => wrong.value)];
    case "number":
    case "expression":
      return [answer.correct, ...answer.wrong.map((wrong) => wrong.value)].map((value) => math(toLatex(value)));
    case "limit":
      return [answer.correct, ...answer.wrong.map((wrong) => wrong.value)].map((value) => math(limitToLatex(value)));
    case "matrix":
      return [answer.correct, ...answer.wrong.map((wrong) => wrong.value)].map((value) => math(matrixToLatex(value)));
    case "set":
      return [answer.correct, ...answer.wrong.map((wrong) => wrong.value)].map((value) => math(setToLatex(value, { variable: answer.variable })));
    case "truefalse":
    case "ordering":
      return null;
  }
}

/**
 * Le opzioni di scelta multipla dell'esercizio, mescolate in modo deterministico (stesso esercizio,
 * stesso ordine). null se l'esercizio non si può mostrare come scelta multipla.
 */
export function choiceOptions(exercise: Exercise): ChoiceOption[] | null {
  const contents = optionContents(exercise);
  if (!contents || contents.length - 1 < MIN_WRONG) return null;
  const options = contents.slice(0, MAX_WRONG + 1).map((content, index) => ({ index, content }));
  return Rng.forExercise(exercise.generator, exercise.level, exercise.seed).fork("opzioni").shuffle(options);
}

/**
 * L'ordine iniziale di un riordino: gli elementi fissi restano al loro posto, gli altri sono mescolati
 * (mai nell'ordine giusto). Restituisce gli indici degli elementi nell'ordine in cui mostrarli.
 */
export function orderingStart(exercise: Exercise): number[] {
  const { answer } = exercise;
  if (answer.kind !== "ordering") return [];
  const movable = answer.items.map((item, index) => (item.fixed ? -1 : index)).filter((index) => index >= 0);
  const rng = Rng.forExercise(exercise.generator, exercise.level, exercise.seed).fork("riordino");
  let shuffled = rng.shuffle(movable);
  for (let attempt = 0; attempt < 20 && shuffled.every((value, k) => value === movable[k]); attempt++) {
    shuffled = rng.shuffle(movable);
  }
  // Se dopo venti tentativi è ancora in ordine (può succedere solo con pochissimi elementi), si ruota di un posto.
  if (shuffled.every((value, k) => value === movable[k])) shuffled = [...movable.slice(1), movable[0] as number];
  let next = 0;
  return answer.items.map((item, index) => (item.fixed ? index : (shuffled[next++] as number)));
}
