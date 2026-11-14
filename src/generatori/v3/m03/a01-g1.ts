// V3.M03.A01.g1 — Calcolo del determinante. GENERATORE DI RIFERIMENTO per le risposte di tipo
// «numero» in forma esatta (insieme a V3.M02.A01.g1, che fa da modello per le risposte «matrice»).
//
// La matrice si sceglie in modo che i conti restino piccoli: elementi interi, determinante non nullo
// e non troppo grande (se una scelta non va bene se ne estrae un'altra, sempre con lo stesso rng).
// Le risposte sbagliate rifanno il calcolo con l'errore: segni dei complementi dimenticati, prodotto
// della sola diagonale. La verifica indipendente ricalcola il determinante con la riduzione di Gauss
// (prodotto dei pivot, con il segno cambiato a ogni scambio di righe), mentre la risposta nasce dallo
// sviluppo di Laplace.
//
// Livello 1: ordine 2.  Livello 2: ordine 3.  Livello 3: ordine 4 con una linea piena di zeri da sfruttare.

import { defineGenerator, exact, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { num, toLatex, type Expr } from "../../../motore/expr";
import { gaussElimination, matrix, type Matrix } from "../../../motore/linalg";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];
type Grid = readonly (readonly number[])[];

const LIMITS = { maxInteger: 99, maxDenominator: 1 } as const;

// ───────────────────────────── conti sui numeri interi ─────────────────────────────

const without = (grid: Grid, row: number, col: number): Grid => grid.filter((_, r) => r !== row).map((line) => line.filter((_, c) => c !== col));

/** Il determinante, con lo sviluppo di Laplace lungo la prima riga. */
function laplace(grid: Grid): number {
  if (grid.length === 1) return grid[0]?.[0] ?? 0;
  return (grid[0] ?? []).reduce((total, entry, col) => total + (col % 2 === 1 ? -1 : 1) * entry * laplace(without(grid, 0, col)), 0);
}

/** La linea (riga o colonna) con più zeri: è quella lungo cui conviene sviluppare. A parità vince la prima riga. */
function bestLine(grid: Grid): { readonly row: number } | { readonly col: number } {
  const n = grid.length;
  const zeros = (line: readonly number[]): number => line.filter((entry) => entry === 0).length;
  let best: { readonly row: number } | { readonly col: number } = { row: 0 };
  let most = zeros(grid[0] ?? []);
  for (let k = 0; k < n; k++) {
    if (zeros(grid[k] ?? []) > most) [best, most] = [{ row: k }, zeros(grid[k] ?? [])];
  }
  for (let k = 0; k < n; k++) {
    const column = grid.map((line) => line[k] ?? 0);
    if (zeros(column) > most) [best, most] = [{ col: k }, zeros(column)];
  }
  return best;
}

/** Gli addendi dello sviluppo lungo una linea: segno, elemento, minore. */
function expansion(grid: Grid, line: { readonly row: number } | { readonly col: number }) {
  return grid.map((_, k) => {
    const row = "row" in line ? line.row : k;
    const col = "row" in line ? k : line.col;
    return { row, col, sign: (row + col) % 2 === 0 ? 1 : -1, entry: grid[row]?.[col] ?? 0, minor: without(grid, row, col) };
  });
}

/** L'errore tipico: lo sviluppo lungo la linea scelta con tutti i segni «più» (i minori sono calcolati bene). Ordine 2: a·d + b·c. */
const withoutSigns = (grid: Grid): number => expansion(grid, bestLine(grid)).reduce((total, term) => total + term.entry * laplace(term.minor), 0);

const diagonalProduct = (grid: Grid): number => grid.reduce((product, line, k) => product * (line[k] ?? 0), 1);

// ───────────────────────────── costruzione ─────────────────────────────

/** Estrae matrici finché una rispetta la condizione (al più 200 tentativi: con queste condizioni ne bastano pochi). */
function draw(rng: Rng_, make: () => Grid, accept: (grid: Grid) => boolean): Grid {
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = make();
    if (accept(grid)) return grid;
  }
  throw new Error("V3.M03.A01.g1: nessuna matrice adatta trovata.");
}

function buildGrid(level: number, rng: Rng_): Grid {
  const size = level + 1;
  const range = level === 1 ? 6 : level === 2 ? 4 : 3;
  const make = (): Grid => {
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => rng.int(-range, range)));
    if (level === 3) {
      // Una riga o una colonna con due soli elementi non nulli: lo sviluppo ha due addendi.
      const index = rng.int(0, 3);
      const kept = rng.sample([0, 1, 2, 3], 2);
      const alongRow = rng.bool();
      for (let k = 0; k < 4; k++) {
        const value = kept.includes(k) ? rng.intExcept(-3, 3) : 0;
        if (alongRow) (grid[index] as number[])[k] = value;
        else (grid[k] as number[])[index] = value;
      }
    }
    return grid;
  };
  return draw(rng, make, (grid) => {
    const det = laplace(grid);
    const values = [det, withoutSigns(grid), diagonalProduct(grid), -det];
    // Determinante non nullo, numeri entro i limiti, e i tre errori tipici devono dare risultati tutti diversi.
    if (det === 0 || values.some((value) => Math.abs(value) > LIMITS.maxInteger)) return false;
    if (new Set(values).size !== values.length) return false;
    // Non troppi zeri (a parte la linea scelta al livello 3): il calcolo non deve essere banale.
    const zeros = grid.flat().filter((entry) => entry === 0).length;
    return level === 3 ? zeros <= 4 : zeros <= 1;
  });
}

// ───────────────────────────── scrittura ─────────────────────────────

const barred = (grid: Grid): string => `\\begin{vmatrix} ${grid.map((line) => line.join(" & ")).join(" \\\\ ")} \\end{vmatrix}`;
const round = (grid: Grid): string => `\\begin{pmatrix} ${grid.map((line) => line.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const signed = (value: number): string => (value < 0 ? `\\left(${value}\\right)` : `${value}`);

/** Il determinante di ordine 2 scritto per esteso: a·d − b·c. */
function twoByTwo(grid: Grid): string {
  const [[a, b], [c, d]] = grid as [[number, number], [number, number]];
  return `${signed(a)} \\cdot ${signed(d)} - ${signed(b)} \\cdot ${signed(c)}`;
}

/** Un determinante di ordine 3 sviluppato lungo la sua linea con più zeri: gli addendi «segno · elemento · minore di ordine 2». */
function threeByThree(grid: Grid): string {
  const parts = expansion(grid, bestLine(grid))
    .filter((term) => term.entry !== 0)
    .map((term) => `${term.sign > 0 ? "+" : "-"} ${signed(term.entry)} \\cdot ${signed(laplace(term.minor))}`);
  // Una linea di soli zeri: il determinante è nullo e non c'è niente da sommare.
  return parts.length === 0 ? "0" : parts.join(" ").replace(/^\+ /, "");
}

/** «la seconda riga», «la terza colonna». */
function describeLine(line: { readonly row: number } | { readonly col: number }): string {
  const ordinals = ["prima", "seconda", "terza", "quarta"];
  return "row" in line ? `la ${ordinals[line.row]} riga` : `la ${ordinals[line.col]} colonna`;
}

function solutionSteps(grid: Grid, det: number): SolutionStep[] {
  if (grid.length === 2) {
    return [
      { text: "Per una matrice di ordine 2 il determinante è il prodotto degli elementi della diagonale principale **meno** il prodotto degli elementi dell'altra diagonale." },
      { text: `Sostituisci, con le parentesi attorno ai numeri negativi:\n\n$$\\det A = ${twoByTwo(grid)} = ${det}$$` },
    ];
  }
  const line = bestLine(grid);
  const name = describeLine(line);
  const terms = expansion(grid, line).filter((term) => term.entry !== 0);
  const steps: SolutionStep[] = [
    {
      text:
        `Sviluppa con la regola di Laplace lungo ${name}${grid.length === 4 ? ", che ha più zeri: gli elementi nulli non danno addendi" : ""}. ` +
        "Ogni elemento va moltiplicato per il determinante della matrice che resta togliendo la sua riga e la sua colonna, con il segno $(-1)^{i+j}$: più se riga e colonna hanno somma pari, meno se dispari." +
        (grid.length === 4 ? " I minori di ordine 3 si calcolano allo stesso modo, ognuno lungo la sua riga o colonna con più zeri: negli sviluppi qui sotto ogni addendo è un elemento per il suo minore di ordine 2, con il segno." : ""),
    },
  ];
  const parts: string[] = [];
  for (const term of terms) {
    const minorValue = laplace(term.minor);
    const position = `(${term.row + 1}, ${term.col + 1})`;
    const how = term.minor.length === 2 ? `${twoByTwo(term.minor)} = ${minorValue}` : `${threeByThree(term.minor)} = ${minorValue}`;
    steps.push({
      text:
        term.minor.length === 2
          ? `Elemento $${term.entry}$, posto $${position}$, segno $${term.sign > 0 ? "+" : "-"}$. Il suo minore vale:\n\n$$${barred(term.minor)} = ${how}$$`
          : // Un minore di ordine 3 e il suo sviluppo stanno su due righe: insieme uscirebbero dallo schermo del telefono.
            `Elemento $${term.entry}$, posto $${position}$, segno $${term.sign > 0 ? "+" : "-"}$. Il suo minore:\n\n$$${barred(term.minor)}$$\n\n` +
            `Sviluppato lungo ${describeLine(bestLine(term.minor))} vale:\n\n$$${how}$$`,
    });
    parts.push(`${term.sign > 0 ? "+" : "-"} ${signed(term.entry)} \\cdot ${signed(minorValue)}`);
  }
  steps.push({ text: `Somma gli addendi con i loro segni:\n\n$$\\det A = ${parts.join(" ").replace(/^\+ /, "")} = ${det}$$` });
  return steps;
}

function draftOf(grid: Grid): ExerciseDraft {
  const det = laplace(grid);
  const correct = num(det);
  const wrong = distinctWrongExpressions(correct, [
    // Segni dei complementi dimenticati (ordine 2: «a·d + b·c»).
    { error: "ALIN.DET_SEGNI", value: num(withoutSigns(grid)) },
    // Solo il prodotto della diagonale principale, come se la matrice fosse triangolare.
    { error: "ALIN.DET_DIAGONALE", value: num(diagonalProduct(grid)) },
    // Segni tutti scambiati (ordine 2: «b·c − a·d»).
    { error: "ALIN.DET_SEGNI", value: num(-det) },
  ]);
  return {
    prompt: `Calcola il determinante della matrice $A = ${round(grid)}$.`,
    answer: { kind: "number", correct, wrong, mode: exact },
    steps: solutionSteps(grid, det),
    hints: [
      grid.length === 2
        ? "Per l'ordine 2 c'è una formula diretta con le due diagonali. Quale dei due prodotti va sottratto?"
        : "Il determinante non è il prodotto della diagonale, a meno che la matrice sia triangolare. Per l'ordine 3 o 4 serve lo sviluppo di Laplace: lungo quale riga o colonna conviene farlo?",
      grid.length === 2
        ? "$\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$: scrivi i due prodotti con le parentesi attorno ai numeri negativi, poi sottrai."
        : "Scegli la riga o la colonna con più zeri. Per ogni elemento non nullo: cancella la sua riga e la sua colonna, calcola il determinante che resta e mettici davanti il segno a scacchiera $+\\,-\\,+$.",
    ],
  };
}

/** Il determinante con la riduzione di Gauss: prodotto dei pivot, con un cambio di segno per ogni scambio. */
function determinantByGauss(m: Matrix): Rational | null {
  const reduced = gaussElimination(m);
  let product = reduced.swaps % 2 === 0 ? Rational.ONE : Rational.ONE.neg();
  for (let k = 0; k < m.rows.length; k++) {
    const pivot: Expr | undefined = reduced.matrix.rows[k]?.[k];
    if (!pivot || pivot.kind !== "num") return null;
    product = product.mul(pivot.value);
  }
  return product;
}

export default defineGenerator({
  code: "V3.M03.A01.g1",
  skill: "V3.M03.A01",
  lesson: "V3.M03.L01",
  title: "Calcolo del determinante",
  levels: [1, 2, 3],
  errors: ["ALIN.DET_SEGNI", "ALIN.DET_DIAGONALE"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildGrid(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "number" || answer.correct.kind !== "num") return false;
    const grid = buildGrid(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Il testo deve mostrare proprio questa matrice.
    if (!exercise.prompt.includes(round(grid))) return false;
    const byGauss = determinantByGauss(matrix(grid));
    return byGauss !== null && byGauss.eq(answer.correct.value) && toLatex(answer.correct) === `${laplace(grid)}`;
  },
});
