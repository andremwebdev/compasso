// Riduzione di Gauss con registrazione dei passaggi (specifica, sezione 6): ogni operazione
// elementare sulle righe è un dato, con la matrice che si ottiene dopo averla applicata.

import { ratioToExpr } from "../algebra/expand";
import { NormalContext, Ratio } from "../algebra/poly";
import { EngineError } from "../errors";
import { rationalToLatex, toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { divide, fromGrid, isOne, isZero, toGrid, type Grid } from "./grid";
import { matrixSize, type Matrix } from "./matrix";

/** Operazione elementare sulle righe (indici da 0). */
export type RowOperation =
  /** Scambio di due righe. */
  | { readonly kind: "swap"; readonly first: number; readonly second: number }
  /** La riga viene moltiplicata per un fattore non nullo. */
  | { readonly kind: "scale"; readonly row: number; readonly factor: Expr }
  /** Alla riga `target` si somma `factor` volte la riga `source`. */
  | { readonly kind: "combine"; readonly target: number; readonly source: number; readonly factor: Expr };

export interface GaussStep {
  readonly operation: RowOperation;
  /** La matrice dopo l'operazione. */
  readonly matrix: Matrix;
}

export interface GaussOptions {
  /** Vero per arrivare alla forma ridotta (Gauss-Jordan): pivot uguali a 1 e zeri anche sopra. */
  readonly reduced?: boolean;
  /** Quante colonne possono contenere un pivot: in una matrice completa [A | b] sono le colonne di A. Se manca: tutte. */
  readonly columns?: number;
}

export interface GaussResult {
  /** La matrice a scala (o a scala ridotta). */
  readonly matrix: Matrix;
  readonly steps: readonly GaussStep[];
  /** Le colonne dei pivot, una per riga non nulla. */
  readonly pivotColumns: readonly number[];
  readonly rank: number;
  /** Numero di scambi di righe: ogni scambio cambia segno al determinante. */
  readonly swaps: number;
}

/** Riduzione su una griglia di forme normali (modificata sul posto). `record` riceve ogni operazione. */
export function eliminate(
  cells: Grid,
  ctx: NormalContext,
  options: GaussOptions,
  record?: (operation: RowOperation) => void,
): { pivotColumns: number[]; swaps: number } {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const limit = Math.min(options.columns ?? cols, cols);
  const at = (r: number, c: number): Ratio => (cells[r] as Ratio[])[c] as Ratio;
  const combine = (target: number, source: number, factor: Ratio): void => {
    const sourceRow = cells[source] as Ratio[];
    cells[target] = (cells[target] as Ratio[]).map((cell, c) => cell.add(factor.mul(sourceRow[c] as Ratio, ctx), ctx));
    record?.({ kind: "combine", target, source, factor: ratioToExpr(factor, ctx) });
  };

  const pivotColumns: number[] = [];
  let swaps = 0;
  let row = 0;
  for (let col = 0; col < limit && row < rows; col++) {
    let pivotRow = row;
    while (pivotRow < rows && isZero(at(pivotRow, col))) pivotRow += 1;
    if (pivotRow === rows) continue;
    if (pivotRow !== row) {
      [cells[row], cells[pivotRow]] = [cells[pivotRow] as Ratio[], cells[row] as Ratio[]];
      swaps += 1;
      record?.({ kind: "swap", first: row, second: pivotRow });
    }
    for (let below = row + 1; below < rows; below++) {
      if (isZero(at(below, col))) continue;
      combine(below, row, divide(at(below, col), at(row, col), ctx).neg());
    }
    pivotColumns.push(col);
    row += 1;
  }

  if (options.reduced) {
    for (let index = pivotColumns.length - 1; index >= 0; index--) {
      const col = pivotColumns[index] as number;
      const pivot = at(index, col);
      if (!isOne(pivot)) {
        const factor = divide(Ratio.ONE, pivot, ctx);
        cells[index] = (cells[index] as Ratio[]).map((cell) => divide(cell, pivot, ctx));
        record?.({ kind: "scale", row: index, factor: ratioToExpr(factor, ctx) });
      }
      for (let above = index - 1; above >= 0; above--) {
        if (!isZero(at(above, col))) combine(above, index, at(above, col).neg());
      }
    }
  }
  return { pivotColumns, swaps };
}

/**
 * Riduzione di Gauss di una matrice, con i passaggi. Il pivot è il primo elemento non nullo della
 * colonna: le righe si scambiano solo quando serve. Con i parametri, un pivot conta come non nullo
 * se non è identicamente zero (i valori particolari dei parametri li discute il generatore).
 */
export function gaussElimination(m: Matrix, options: GaussOptions = {}): GaussResult {
  const ctx = new NormalContext();
  const cells = toGrid(m, ctx);
  const steps: GaussStep[] = [];
  const { pivotColumns, swaps } = eliminate(cells, ctx, options, (operation) => {
    steps.push({ operation, matrix: fromGrid(cells, ctx) });
  });
  return { matrix: fromGrid(cells, ctx), steps, pivotColumns, rank: pivotColumns.length, swaps };
}

/** Il coefficiente davanti al nome di una riga: segno a parte, niente «1», parentesi se è una somma. */
function coefficient(factor: Expr): { negative: boolean; text: string } {
  if (factor.kind === "neg") return { negative: true, text: coefficient(factor.arg).text };
  if (factor.kind === "num") {
    const magnitude = factor.value.abs();
    return { negative: factor.value.sign() < 0, text: magnitude.eq(1) ? "" : rationalToLatex(magnitude) };
  }
  return { negative: false, text: factor.kind === "add" ? `\\left(${toLatex(factor)}\\right)` : toLatex(factor) };
}

const rowName = (index: number): string => `R_{${index + 1}}`;

/** Un'operazione elementare in LaTeX, con le righe numerate da 1: «R_2 → R_2 − 3R_1». */
export function rowOperationToLatex(operation: RowOperation): string {
  switch (operation.kind) {
    case "swap":
      return `${rowName(operation.first)} \\leftrightarrow ${rowName(operation.second)}`;
    case "scale": {
      const { negative, text } = coefficient(operation.factor);
      return `${rowName(operation.row)} \\to ${negative ? "-" : ""}${text}${rowName(operation.row)}`;
    }
    case "combine": {
      const { negative, text } = coefficient(operation.factor);
      return `${rowName(operation.target)} \\to ${rowName(operation.target)} ${negative ? "-" : "+"} ${text}${rowName(operation.source)}`;
    }
  }
}

/** Mette due matrici con lo stesso numero di righe una accanto all'altra: [A | B]. */
export function augment(a: Matrix, b: Matrix): Matrix {
  if (matrixSize(a).rows !== matrixSize(b).rows) throw new EngineError("Per affiancare due matrici serve lo stesso numero di righe.");
  return { kind: "matrix", rows: a.rows.map((row, r) => [...row, ...(b.rows[r] as readonly Expr[])]) };
}
