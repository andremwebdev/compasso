// V3.M02.A01.g1 — Sistemi lineari con il metodo di Gauss. GENERATORE DI RIFERIMENTO per le risposte
// di tipo «matrice» (qui un vettore colonna: la soluzione del sistema).
//
// All'indietro: si sceglie la soluzione (interi piccoli) e si costruisce la matrice dei coefficienti
// come prodotto L·U di una triangolare inferiore con 1 sulla diagonale e di una triangolare superiore:
// così la riduzione di Gauss fa solo conti interi. I termini noti sono A·x. I passaggi sono quelli
// registrati dal motore (gaussElimination). La verifica indipendente controlla A·x = b.
//
// Livello 1: due equazioni.  Livello 2: tre equazioni.  Livello 3: tre equazioni con uno scambio di
// righe obbligato (il primo coefficiente è 0) e un pivot diverso da ±1.

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { simplify } from "../../../motore/algebra/simplify";
import { systemToLatex } from "../../../motore/display";
import { add, literalRational, mul, num, relation, sym, toLatex, type Expr } from "../../../motore/expr";
import {
  augment, columnVector, gaussElimination, matMul, matricesEquivalent, matrix, rank, rowOperationToLatex, type Matrix, type RowOperation,
} from "../../../motore/linalg";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongMatrices } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];
type Grid = number[][];

const LIMITS = { maxInteger: 40, maxDenominator: 6 } as const;
const NAMES = ["x", "y", "z"] as const;

/** Una risposta sbagliata: l'errore e il vettore che ne esce. */
interface Slip {
  readonly error: "ALIN.GAUSS_TERMINE_NOTO" | "CALC.SEGNO_TRASPORTO";
  readonly values: Rational[];
}

interface Model {
  /** Matrice dei coefficienti, termini noti e soluzione: A·x = b. */
  readonly a: Grid;
  readonly b: number[];
  readonly solution: number[];
  /** Le risposte che si ottengono con gli errori tipici, già controllate: numeri puliti e tutte diverse. */
  readonly slips: readonly Slip[];
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const product = (left: Grid, right: Grid): Grid => left.map((row) => (right[0] ?? []).map((_, c) => row.reduce((total, value, k) => total + value * (right[k]?.[c] ?? 0), 0)));
const apply = (a: Grid, x: readonly number[]): number[] => a.map((row) => row.reduce((total, value, k) => total + value * (x[k] ?? 0), 0));

function buildModel(level: number, rng: Rng_): Model {
  const n = level === 1 ? 2 : 3;
  for (let attempt = 0; attempt < 300; attempt++) {
    // 1. La soluzione.
    const solution = Array.from({ length: n }, () => rng.int(-4, 4));
    // 2. L (1 sulla diagonale) e U (pivot ±1; al livello 3 l'ultimo può essere 2 o 3).
    const lower: Grid = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? 1 : r > c ? rng.intExcept(-2, 3) : 0)));
    const upper: Grid = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? rng.sign() : r < c ? rng.int(-3, 3) : 0)));
    if (level === 3) {
      (upper[2] as number[])[2] = rng.pick([2, 3, -2]);
      (upper[1] as number[])[2] = rng.intExcept(-3, 3);
      // Riga 2 senza il multiplo della riga 1, poi scambiata con la riga 1: il primo coefficiente del sistema è 0.
      (lower[1] as number[])[0] = 0;
    }
    let a = product(lower, upper);
    if (level === 3) a = [a[1] as number[], a[0] as number[], a[2] as number[]];
    const b = apply(a, solution);
    // 3. Numeri puliti e nessun caso banale: soluzione non nulla, pochi zeri, coefficienti piccoli.
    const entries = a.flat();
    if (solution.filter((value) => value === 0).length > 1 || new Set(solution).size === 1) continue;
    if (entries.some((value) => Math.abs(value) > 9) || b.some((value) => Math.abs(value) > 30)) continue;
    if (entries.filter((value) => value === 0).length > 1) continue;
    // 4. Gli errori tipici devono dare risposte con numeri puliti, diverse dalla giusta e tra loro.
    const slips = typicalSlips(upper, solution, b);
    if (slips) return { a, b, solution, slips };
  }
  throw new Error("V3.M02.A01.g1: nessun sistema adatto trovato.");
}

// ───────────────────────────── conti esatti ─────────────────────────────

/** Gli elementi di una matrice del motore come frazioni (qui sono sempre numeri). */
function rationals(m: Matrix): Rational[][] {
  return m.rows.map((row) => row.map((entry) => literalRational(entry) ?? Rational.ZERO));
}

/**
 * Sostituzione all'indietro su una matrice a scala [U | c]. Con `slipAt` il trasporto dei termini già
 * noti nella riga indicata è fatto senza cambiare segno (l'errore tipico); null se un pivot è nullo.
 */
function backSubstitute(rows: readonly (readonly Rational[])[], slipAt = -1): Rational[] | null {
  const n = rows.length;
  const values: Rational[] = Array.from({ length: n }, () => Rational.ZERO);
  for (let r = n - 1; r >= 0; r--) {
    const row = rows[r] as readonly Rational[];
    const pivot = row[r] as Rational;
    if (pivot.isZero()) return null;
    let known = Rational.ZERO;
    for (let c = r + 1; c < n; c++) known = known.add((row[c] as Rational).mul(values[c] as Rational));
    const right = row[n] as Rational;
    values[r] = (r === slipAt ? right.add(known) : right.sub(known)).div(pivot);
  }
  return values;
}

const isClean = (values: readonly Rational[]): boolean => values.every((value) => value.abs().n <= BigInt(LIMITS.maxInteger) && value.d <= BigInt(LIMITS.maxDenominator));
const vector = (values: readonly Rational[]): Matrix => columnVector(values.map((value) => num(value)));

/**
 * Le risposte degli errori tipici, oppure null se per questi numeri non vanno bene (numeri brutti o
 * risposte che coincidono). La riduzione di Gauss di A = L·U dà proprio U, con i termini noti U·x:
 * lo controlla un test, confrontando con la riduzione registrata dal motore.
 */
function typicalSlips(upper: Grid, solution: readonly number[], b: readonly number[]): Slip[] | null {
  const n = upper.length;
  const reducedKnown = apply(upper, solution);
  const withKnown = (known: readonly number[]): Rational[][] => upper.map((row, r) => [...row, known[r] ?? 0].map((value) => Rational.of(value)));
  const candidates: { error: Slip["error"]; values: Rational[] | null }[] = [
    // Operazioni fatte solo sui coefficienti: la matrice a scala è giusta, ma i termini noti sono rimasti quelli di partenza.
    { error: "ALIN.GAUSS_TERMINE_NOTO", values: backSubstitute(withKnown(b)) },
    // Sostituzione all'indietro con i termini portati a secondo membro senza cambiare segno: nell'ultima incognita trovata…
    { error: "CALC.SEGNO_TRASPORTO", values: backSubstitute(withKnown(reducedKnown), 0) },
  ];
  // …oppure in quella di mezzo (e l'errore si trascina nella prima).
  if (n === 3) candidates.push({ error: "CALC.SEGNO_TRASPORTO", values: backSubstitute(withKnown(reducedKnown), 1) });
  const seen = new Set<string>([solution.join(";")]);
  const slips: Slip[] = [];
  for (const { error, values } of candidates) {
    if (!values || !isClean(values)) return null;
    const key = values.map((value) => value.toString()).join(";");
    if (seen.has(key)) return null;
    seen.add(key);
    slips.push({ error, values });
  }
  return slips;
}

// ───────────────────────────── scrittura ─────────────────────────────

/** L'equazione a·x + b·y + c·z = d. */
function equation(coefficients: readonly number[], right: number) {
  const terms: Expr[] = coefficients.flatMap((value, k) => (value === 0 ? [] : [mul(value, sym(NAMES[k] as string))]));
  return relation(simplify(add(...terms)), "=", right);
}

/** La matrice completa con la barra prima dei termini noti. */
function augmentedLatex(m: Matrix): string {
  const columns = (m.rows[0]?.length ?? 1) - 1;
  const body = m.rows.map((row) => row.map(toLatex).join(" & ")).join(" \\\\ ");
  return `\\left(\\begin{array}{${"c".repeat(columns)}|c} ${body} \\end{array}\\right)`;
}

function describeOperation(operation: RowOperation): string {
  switch (operation.kind) {
    case "swap":
      return "Il pivot non può essere $0$: scambia le due righe.";
    case "scale":
      return "Dividi la riga per il suo pivot.";
    case "combine":
      return `Annulla l'elemento sotto il pivot nella riga ${operation.target + 1}: l'operazione vale per **tutta** la riga, termine noto compreso.`;
  }
}

function solutionSteps(model: Model, complete: Matrix, reduction: ReturnType<typeof gaussElimination>): SolutionStep[] {
  const n = model.a.length;
  const steps: SolutionStep[] = [
    { text: `Scrivi la matrice completa del sistema: i coefficienti e, dopo la barra, i termini noti.\n\n$$${augmentedLatex(complete)}$$` },
  ];
  for (const step of reduction.steps) {
    steps.push({ text: `${describeOperation(step.operation)}\n\n$$${rowOperationToLatex(step.operation)} \\qquad ${augmentedLatex(step.matrix)}$$` });
  }
  const rows = rationals(reduction.matrix);
  const equations = rows.map((row) => equation(row.slice(0, n).map((value) => value.toInteger()), (row[n] as Rational).toInteger()));
  steps.push({ text: `La matrice è a scala. Riscrivi il sistema, che è equivalente a quello di partenza:\n\n$$${systemToLatex(equations)}$$` });
  const found = model.solution.map((value, k) => `${NAMES[k]} = ${value}`);
  steps.push({
    text: `Risolvi dal basso verso l'alto (sostituzione all'indietro): prima $${found[n - 1]}$, poi ${found
      .slice(0, n - 1)
      .reverse()
      .map((item) => `$${item}$`)
      .join(", poi ")}. Quando porti un termine a secondo membro, cambia il suo segno.`,
  });
  const checked = Math.max(0, model.a.findIndex((row) => row.every((value) => value !== 0)));
  const check = model.a[checked] as number[];
  const sum = check.map((value, k) => `${value < 0 ? `\\left(${value}\\right)` : value} \\cdot ${(model.solution[k] ?? 0) < 0 ? `\\left(${model.solution[k]}\\right)` : model.solution[k]}`).join(" + ");
  steps.push({ text: `Controlla sostituendo nella ${["prima", "seconda", "terza"][checked]} equazione del sistema di partenza: $${sum} = ${model.b[checked]}$. Torna.` });
  return steps;
}

function draftOf(model: Model): ExerciseDraft {
  const n = model.a.length;
  const complete = augment(matrix(model.a), columnVector(model.b));
  const reduction = gaussElimination(complete, { columns: n });
  const correct = columnVector(model.solution);
  const names = NAMES.slice(0, n).map((name) => `$${name}$`).join(", ");
  return {
    prompt: `Risolvi il sistema lineare con il metodo di Gauss:\n\n$$${systemToLatex(model.a.map((row, r) => equation(row, model.b[r] ?? 0)))}$$\n\nScrivi la soluzione nelle caselle, nell'ordine ${names}.`,
    answer: { kind: "matrix", correct, wrong: distinctWrongMatrices(correct, model.slips.map((slip) => ({ error: slip.error, value: vector(slip.values) }))) },
    steps: solutionSteps(model, complete, reduction),
    hints: [
      "Il metodo di Gauss lavora sulla matrice completa (coefficienti e termini noti): con le operazioni sulle righe la si porta a scala, cioè con degli zeri sotto la diagonale. Poi il sistema si risolve dal basso.",
      (model.a[0]?.[0] ?? 0) === 0
        ? "Il primo coefficiente della prima equazione è $0$: non può fare da pivot. Comincia scambiando la prima riga con una che abbia il primo coefficiente diverso da zero."
        : "Usa il primo coefficiente della prima riga come pivot: a ogni riga sotto sottrai il multiplo della prima che annulla il suo primo coefficiente. Ricorda di fare l'operazione anche sul termine noto.",
    ],
  };
}

/** Per i test: il sistema di un esercizio (matrice dei coefficienti, termini noti, soluzione). */
export const systemOf = (level: number, seed: number): { readonly a: Grid; readonly b: number[]; readonly solution: number[] } =>
  buildModel(level, Rng.forExercise("V3.M02.A01.g1", level, seed));

export default defineGenerator({
  code: "V3.M02.A01.g1",
  skill: "V3.M02.A01",
  lesson: "V3.M02.L01",
  title: "Sistemi lineari con il metodo di Gauss",
  levels: [1, 2, 3],
  errors: ["ALIN.GAUSS_TERMINE_NOTO", "CALC.SEGNO_TRASPORTO"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: la soluzione, sostituita nel sistema, deve dare i termini noti (A·x = b),
  // e il sistema deve avere una sola soluzione (rango pieno).
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "matrix") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const a = matrix(model.a);
    return rank(a) === model.a.length && matricesEquivalent(matMul(a, answer.correct), columnVector(model.b));
  },
});
