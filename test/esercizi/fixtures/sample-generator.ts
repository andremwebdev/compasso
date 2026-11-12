// Generatore minimo di prova per la verifica automatica (non è un contenuto dell'app e non sta in
// src/generatori): «Risolvi −a·x + b > c», una disequazione di primo grado con coefficiente negativo.
// È scritto come un generatore vero: all'indietro, con le risposte sbagliate ottenute facendo
// davvero l'errore tipico, e con una verifica indipendente.

import { defineGenerator, type ExerciseDraft, type GeneratorDefinition } from "../../../src/esercizi";
import { add, frac, literalRational, mul, neg, num, relation, sym, toLatex, type Expr } from "../../../src/motore/expr";
import { Rational } from "../../../src/motore/numbers/rational";
import { simplify } from "../../../src/motore/algebra/simplify";
import { atMost, greaterThan, lessThan, setContains, setToInequalityLatex } from "../../../src/motore/sets";
import { Rng } from "../../../src/motore/random/rng";
import { stepText } from "../../../src/motore/steps";

const x = sym("x");

/** I numeri dell'esercizio: la soluzione è x < bound, la disequazione è −a·x + b > c. */
export interface SampleNumbers {
  readonly a: number;
  readonly b: number;
  readonly c: Expr;
  readonly bound: Expr;
}

export function sampleNumbers(level: number, pick: { int: (min: number, max: number) => number; intExcept: (min: number, max: number) => number }): SampleNumbers {
  // 1. Prima la soluzione (mai zero: l'errore di segno darebbe per caso la risposta giusta)…
  const bound = level === 1 ? num(pick.intExcept(-6, 6)) : frac(pick.intExcept(-9, 9), pick.int(2, 4));
  // 2. …poi l'esercizio intorno: c = b − a·bound, così −a·x + b > c equivale a x < bound.
  const a = pick.int(2, level === 1 ? 5 : 6);
  const b = pick.int(-6, 6);
  return { a, b, bound, c: simplify(add(b, neg(mul(a, bound)))) };
}

export function sampleDraft({ a, b, c, bound }: SampleNumbers): ExerciseDraft {
  const left = simplify(add(mul(-a, x), b));
  const inequality = relation(left, ">", c);
  const isolated = relation(mul(-a, x), ">", simplify(add(c, -b)));
  const correct = lessThan(bound);
  return {
    prompt: `Risolvi la disequazione $${toLatex(inequality)}$.`,
    answer: {
      kind: "set",
      variable: "x",
      correct,
      wrong: [
        // 3. Le risposte sbagliate: ognuna è un errore tipico preciso, fatto sui numeri dell'esercizio.
        { error: "DISEQ.VERSO_NON_INVERTITO", value: greaterThan(bound) },
        { error: "DISEQ.ESTREMI", value: atMost(bound) },
        { error: "CALC.MENO_PARENTESI", value: lessThan(simplify(neg(bound))) },
      ],
    },
    steps: [
      { text: stepText({ text: `Porta il termine noto a destra: sottrai $${b}$ da entrambi i membri.`, formula: toLatex(isolated) }) },
      { text: `Dividi per $${-a}$: è un numero **negativo**, quindi il verso della disequazione si inverte.` },
      { text: stepText({ text: "La soluzione è:", formula: setToInequalityLatex(correct) }) },
    ],
    hints: ["È una disequazione di primo grado: isola il termine con la $x$.", `Attenzione al segno del coefficiente di $x$ (qui è $${-a}$) quando dividi.`],
  };
}

export const sampleDefinition: GeneratorDefinition = {
  code: "V1.M06.A99.g1",
  skill: "V1.M06.A99",
  lesson: "V1.M06.L01",
  title: "Disequazioni di primo grado con coefficiente negativo (generatore di prova)",
  levels: [1, 2],
  errors: ["DISEQ.VERSO_NON_INVERTITO", "DISEQ.ESTREMI", "CALC.MENO_PARENTESI"],
  limits: { maxInteger: 60, maxDenominator: 4 },
  generate: ({ level, rng }) => sampleDraft(sampleNumbers(level, rng)),
  // Verifica indipendente: non confronta la risposta con quella costruita, ma prova la disequazione
  // di partenza in punti dentro la soluzione dichiarata, fuori e sul bordo.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const piece = answer.correct.pieces[0];
    const edge = piece && typeof piece.upper !== "string" ? literalRational(piece.upper) : null;
    // I coefficienti della disequazione si rileggono dagli stessi numeri usati per scriverne il testo.
    const numbers = sampleNumbers(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const c = literalRational(numbers.c);
    if (!edge || !c || answer.correct.pieces.length !== 1) return false;
    // Conti esatti, con le frazioni: sul bordo un numero in virgola mobile potrebbe sbagliare.
    const holds = (value: Rational): boolean => value.mul(-numbers.a).add(numbers.b).cmp(c) > 0;
    const inside = [edge.sub(1), edge.sub(Rational.of(1, 1000))];
    const outside = [edge, edge.add(Rational.of(1, 1000)), edge.add(1)];
    return (
      inside.every((value) => holds(value) && setContains(answer.correct, num(value))) &&
      outside.every((value) => !holds(value) && !setContains(answer.correct, num(value)))
    );
  },
};

/** Il generatore di prova, dichiarato come si dichiarano i generatori veri. */
export default defineGenerator(sampleDefinition);
