// Generatore di prova per la risposta `ordering` (non è un contenuto dell'app e non sta in
// src/generatori): «Metti in ordine i passaggi per calcolare l'espressione». Serve ai test della
// schermata di esercizio e della verifica automatica finché non c'è il primo generatore di riordino
// vero (V1.M11.A08, indicazioni in REGOLE.md).
//
// Costruito all'indietro: prima i numeri, poi i passaggi nell'ordine giusto, ognuno con il risultato
// del precedente dentro, così l'ordine giusto è uno solo. Il primo passaggio (l'espressione di
// partenza) è fisso. Chi esegue le operazioni in un altro ordine fa CALC.PRECEDENZA.
// Livelli: 1 = a + b·c² (potenza, prodotto, somma); 2 = a + b·c² − d (quattro operazioni);
// 3 = (a + b·c)² (parentesi, poi la potenza fuori).

import { defineGenerator, type ExerciseDraft, type Level } from "../../../src/esercizi";
import { add, evaluate, mul, num, pow, toLatex, type Expr } from "../../../src/motore/expr";
import { Rng } from "../../../src/motore/random/rng";

/** Il modello: l'espressione e le operazioni nell'ordine giusto, ognuna con il suo risultato. */
export interface OrderingModel {
  readonly expr: Expr;
  /** Ogni operazione: come si scrive (in LaTeX, già con i numeri) e quanto vale. */
  readonly operations: readonly { readonly name: string; readonly latex: string; readonly value: number }[];
}

export function buildOrderingModel(level: Level, rng: Rng): OrderingModel {
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 5);
  switch (level) {
    case 1: {
      const power = c * c;
      const product = b * power;
      return {
        expr: add(a, mul(b, pow(c, 2))),
        operations: [
          { name: "Potenza", latex: `${c}^{2} = ${power}`, value: power },
          { name: "Prodotto", latex: `${b} \\cdot ${power} = ${product}`, value: product },
          { name: "Somma", latex: `${a} + ${product} = ${a + product}`, value: a + product },
        ],
      };
    }
    case 2: {
      const d = rng.int(2, 9);
      const power = c * c;
      const product = b * power;
      return {
        expr: add(a, mul(b, pow(c, 2)), num(-d)),
        operations: [
          { name: "Potenza", latex: `${c}^{2} = ${power}`, value: power },
          { name: "Prodotto", latex: `${b} \\cdot ${power} = ${product}`, value: product },
          { name: "Somma", latex: `${a} + ${product} = ${a + product}`, value: a + product },
          { name: "Sottrazione", latex: `${a + product} - ${d} = ${a + product - d}`, value: a + product - d },
        ],
      };
    }
    case 3: {
      const product = b * c;
      const inner = a + product;
      return {
        expr: pow(add(a, mul(b, c)), 2),
        operations: [
          { name: "Prodotto tra parentesi", latex: `${b} \\cdot ${c} = ${product}`, value: product },
          { name: "Somma tra parentesi", latex: `${a} + ${product} = ${inner}`, value: inner },
          { name: "Potenza", latex: `${inner}^{2} = ${inner * inner}`, value: inner * inner },
        ],
      };
    }
  }
}

export function orderingDraft(model: OrderingModel): ExerciseDraft {
  const expression = toLatex(model.expr);
  return {
    prompt: `Metti in ordine i passaggi per calcolare $${expression}$.`,
    answer: {
      kind: "ordering",
      items: [
        { content: `Espressione di partenza: $${expression}$.`, fixed: true },
        ...model.operations.map((operation) => ({ content: `${operation.name}: $${operation.latex}$.` })),
      ],
      error: "CALC.PRECEDENZA",
    },
    steps: model.operations.map((operation) => ({ text: `${operation.name}: $${operation.latex}$.` })),
    hints: ["Quale operazione viene prima: potenze, prodotti o somme?", "Ogni passaggio usa il risultato di quello prima: cerca quello che lavora solo sui numeri di partenza."],
  };
}

export default defineGenerator({
  code: "V1.M03.A99.g1",
  skill: "V1.M03.A99",
  lesson: "V1.M03.L01",
  title: "Ordine delle operazioni (generatore di prova)",
  levels: [1, 2, 3],
  errors: ["CALC.PRECEDENZA"],
  limits: { maxInteger: 10_000, maxDenominator: 1 },
  generate: ({ level, rng }) => orderingDraft(buildOrderingModel(level, rng)),
  // Verifica indipendente: il risultato dell'ultimo passaggio è il valore dell'espressione calcolato dal motore.
  verify: (exercise) => {
    const model = buildOrderingModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const last = model.operations[model.operations.length - 1];
    return last !== undefined && exercise.answer.kind === "ordering" && evaluate(model.expr) === last.value;
  },
});
