// Operazioni esatte sulle matrici (specifica, sezione 6): somma, prodotto, trasposta, determinante,
// inversa, rango, nucleo, sistemi lineari. Gli elementi possono essere numeri esatti, numeri
// complessi o espressioni con parametri.

import { ratioToExpr } from "../algebra/expand";
import { normalize } from "../algebra/normalize";
import { NormalContext, Ratio } from "../algebra/poly";
import { EngineError } from "../errors";
import { toExpr, type ExprLike } from "../expr/build";
import type { Expr } from "../expr/types";
import { gcd, lcm } from "../numbers/integers";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import { eliminate } from "./gauss";
import { fromGrid, isZero, tidy, toGrid, type Grid } from "./grid";
import { matrixSize, type Matrix } from "./matrix";

const ZERO: Expr = { kind: "num", value: Rational.ZERO };
const ONE: Expr = { kind: "num", value: Rational.ONE };

export function isSquare(m: Matrix): boolean {
  const { rows, cols } = matrixSize(m);
  return rows === cols;
}

function requireSquare(m: Matrix, what: string): number {
  if (!isSquare(m)) throw new EngineError(`${what} esiste solo per le matrici quadrate.`);
  return m.rows.length;
}

/** Matrice identità di ordine n. */
export function identity(n: number): Matrix {
  if (!Number.isInteger(n) || n < 1) throw new EngineError("L'ordine di una matrice identità è un intero positivo.");
  return { kind: "matrix", rows: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? ONE : ZERO))) };
}

/** Matrice nulla con le dimensioni date. */
export function zeroMatrix(rows: number, cols: number): Matrix {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) throw new EngineError("Dimensioni non valide.");
  return { kind: "matrix", rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => ZERO)) };
}

export function transpose(m: Matrix): Matrix {
  const { cols } = matrixSize(m);
  return { kind: "matrix", rows: Array.from({ length: cols }, (_, c) => m.rows.map((row) => row[c] as Expr)) };
}

/** Combina due matrici delle stesse dimensioni elemento per elemento. */
function elementwise(a: Matrix, b: Matrix, sign: 1 | -1): Matrix {
  const sa = matrixSize(a);
  const sb = matrixSize(b);
  if (sa.rows !== sb.rows || sa.cols !== sb.cols) throw new EngineError("Per sommare due matrici servono le stesse dimensioni.");
  const ctx = new NormalContext();
  const ga = toGrid(a, ctx);
  const gb = toGrid(b, ctx);
  const cells = ga.map((row, r) => row.map((cell, c) => (sign === 1 ? cell.add(gb[r]?.[c] as Ratio, ctx) : cell.sub(gb[r]?.[c] as Ratio, ctx))));
  return fromGrid(cells, ctx);
}

export function matAdd(a: Matrix, b: Matrix): Matrix {
  return elementwise(a, b, 1);
}

export function matSub(a: Matrix, b: Matrix): Matrix {
  return elementwise(a, b, -1);
}

/** Prodotto di una matrice per un numero (o un'espressione). */
export function matScale(factor: ExprLike, m: Matrix): Matrix {
  const ctx = new NormalContext();
  const k = normalize(toExpr(factor), ctx);
  return fromGrid(toGrid(m, ctx).map((row) => row.map((cell) => tidy(cell.mul(k, ctx), ctx))), ctx);
}

function multiplyGrids(a: Grid, b: Grid, ctx: NormalContext): Grid {
  const cols = b[0]?.length ?? 0;
  return a.map((row) =>
    Array.from({ length: cols }, (_, c) => row.reduce<Ratio>((sum, cell, k) => sum.add(cell.mul(b[k]?.[c] as Ratio, ctx), ctx), Ratio.ZERO)),
  );
}

/** Prodotto righe per colonne: le colonne di `a` devono essere quante le righe di `b`. */
export function matMul(a: Matrix, b: Matrix): Matrix {
  if (matrixSize(a).cols !== matrixSize(b).rows) {
    throw new EngineError("Prodotto non definito: le colonne della prima matrice devono essere quante le righe della seconda.");
  }
  const ctx = new NormalContext();
  return fromGrid(multiplyGrids(toGrid(a, ctx), toGrid(b, ctx), ctx), ctx);
}

/** Potenza di una matrice quadrata con esponente intero non negativo. */
export function matPower(m: Matrix, exponent: number): Matrix {
  const n = requireSquare(m, "La potenza");
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 64) throw new EngineError("Esponente non valido per la potenza di una matrice.");
  const ctx = new NormalContext();
  const base = toGrid(m, ctx);
  let result = toGrid(identity(n), ctx);
  for (let k = 0; k < exponent; k++) result = multiplyGrids(result, base, ctx);
  return fromGrid(result, ctx);
}

/** Somma degli elementi sulla diagonale. */
export function trace(m: Matrix): Expr {
  requireSquare(m, "La traccia");
  const ctx = new NormalContext();
  const cells = toGrid(m, ctx);
  return ratioToExpr(cells.reduce<Ratio>((sum, row, k) => sum.add(row[k] as Ratio, ctx), Ratio.ZERO), ctx);
}

/**
 * Determinante su una griglia, con lo sviluppo di Laplace lungo le righe (senza divisioni: resta
 * esatto anche con i parametri). I minori si calcolano una volta sola per insieme di colonne.
 */
export function gridDeterminant(cells: Grid, ctx: NormalContext): Ratio {
  const n = cells.length;
  if (n > 8) throw new EngineError("Determinante: matrice troppo grande.");
  const memo = new Map<number, Ratio>();
  const minor = (row: number, used: number): Ratio => {
    if (row === n) return Ratio.ONE;
    const known = memo.get(used);
    if (known) return known;
    let total = Ratio.ZERO;
    let position = 0;
    for (let col = 0; col < n; col++) {
      if (used & (1 << col)) continue;
      const entry = (cells[row] as Ratio[])[col] as Ratio;
      if (!isZero(entry)) {
        const term = entry.mul(minor(row + 1, used | (1 << col)), ctx);
        total = position % 2 === 0 ? total.add(term, ctx) : total.sub(term, ctx);
      }
      position += 1;
    }
    memo.set(used, total);
    return total;
  };
  return tidy(minor(0, 0), ctx);
}

export function determinant(m: Matrix): Expr {
  requireSquare(m, "Il determinante");
  const ctx = new NormalContext();
  return ratioToExpr(gridDeterminant(toGrid(m, ctx), ctx), ctx);
}

/** La matrice senza la riga e la colonna indicate (indici da 0). */
export function minorMatrix(m: Matrix, row: number, col: number): Matrix {
  const { rows, cols } = matrixSize(m);
  if (rows < 2 || cols < 2 || row < 0 || row >= rows || col < 0 || col >= cols) throw new EngineError("Minore non definito.");
  return { kind: "matrix", rows: m.rows.filter((_, r) => r !== row).map((line) => line.filter((_, c) => c !== col)) };
}

/** Un addendo dello sviluppo di Laplace: segno · elemento · det(minore). */
export interface LaplaceTerm {
  readonly row: number;
  readonly col: number;
  readonly sign: 1 | -1;
  readonly entry: Expr;
  readonly minor: Matrix;
  readonly minorDeterminant: Expr;
}

/** Sviluppo di Laplace lungo una riga o una colonna (indici da 0): i dati per mostrare i passaggi. */
export function laplaceExpansion(m: Matrix, along: { readonly row: number } | { readonly col: number }): LaplaceTerm[] {
  const n = requireSquare(m, "Lo sviluppo di Laplace");
  if (n < 2) throw new EngineError("Lo sviluppo di Laplace richiede una matrice di ordine almeno 2.");
  return Array.from({ length: n }, (_, k) => {
    const row = "row" in along ? along.row : k;
    const col = "row" in along ? k : along.col;
    const minor = minorMatrix(m, row, col);
    return { row, col, sign: (row + col) % 2 === 0 ? 1 : -1, entry: m.rows[row]?.[col] as Expr, minor, minorDeterminant: determinant(minor) };
  });
}

/** Rango: il numero di pivot della riduzione di Gauss. */
export function rank(m: Matrix): number {
  const ctx = new NormalContext();
  return eliminate(toGrid(m, ctx), ctx, {}).pivotColumns.length;
}

/** Matrice inversa, oppure null se la matrice non è invertibile. */
export function inverse(m: Matrix): Matrix | null {
  const n = requireSquare(m, "L'inversa");
  const ctx = new NormalContext();
  const unit = toGrid(identity(n), ctx);
  const cells = toGrid(m, ctx).map((row, r) => [...row, ...(unit[r] as Ratio[])]);
  const { pivotColumns } = eliminate(cells, ctx, { reduced: true, columns: n });
  if (pivotColumns.length < n) return null;
  return fromGrid(cells.map((row) => row.slice(n)), ctx);
}

/** Se tutti gli elementi sono razionali, riscala il vettore a interi senza fattori comuni. */
function clearDenominators(column: Ratio[]): Ratio[] {
  const values = column.map((cell) => cell.constant());
  if (!values.every((value): value is Surd => value !== null && value.isRational())) return column;
  const rationals = values.map((value) => value.toRational());
  const scale = rationals.reduce((acc, value) => lcm(acc, value.d), 1n);
  const content = rationals.reduce((acc, value) => gcd(acc, (value.n * scale) / value.d), 0n);
  if (content === 0n) return column;
  return rationals.map((value) => Ratio.constant(Surd.from(value.mul(Rational.of(scale, content)))));
}

/** Base del nucleo a partire dalla forma a scala ridotta: un vettore per ogni colonna senza pivot. */
function kernelBasis(reduced: Grid, pivotColumns: readonly number[], unknowns: number): Ratio[][] {
  const basis: Ratio[][] = [];
  for (let free = 0; free < unknowns; free++) {
    if (pivotColumns.includes(free)) continue;
    const vector: Ratio[] = Array.from({ length: unknowns }, () => Ratio.ZERO);
    vector[free] = Ratio.ONE;
    pivotColumns.forEach((col, row) => {
      vector[col] = ((reduced[row] as Ratio[])[free] as Ratio).neg();
    });
    basis.push(clearDenominators(vector));
  }
  return basis;
}

/** Una base del nucleo (le soluzioni di A·x = 0), come vettori colonna; lista vuota se il nucleo è solo lo zero. */
export function nullSpace(m: Matrix): Matrix[] {
  const ctx = new NormalContext();
  const cells = toGrid(m, ctx);
  const { pivotColumns } = eliminate(cells, ctx, { reduced: true });
  return kernelBasis(cells, pivotColumns, matrixSize(m).cols).map((vector) => fromGrid(vector.map((cell) => [cell]), ctx));
}

export type LinearSolution =
  /** Una sola soluzione. */
  | { readonly kind: "unique"; readonly solution: Matrix }
  /** Nessuna soluzione (sistema impossibile). */
  | { readonly kind: "none" }
  /** Infinite soluzioni: una soluzione particolare più le combinazioni lineari delle direzioni. */
  | { readonly kind: "infinite"; readonly particular: Matrix; readonly directions: readonly Matrix[]; readonly freeColumns: readonly number[] };

/** Risolve il sistema lineare A·x = b (teorema di Rouché-Capelli); b è un vettore colonna. */
export function solveLinearSystem(a: Matrix, b: Matrix): LinearSolution {
  const { rows, cols } = matrixSize(a);
  const sb = matrixSize(b);
  if (sb.cols !== 1 || sb.rows !== rows) throw new EngineError("Il termine noto deve essere un vettore colonna con tante righe quante la matrice.");
  const ctx = new NormalContext();
  const right = toGrid(b, ctx);
  const cells = toGrid(a, ctx).map((row, r) => [...row, (right[r] as Ratio[])[0] as Ratio]);
  const { pivotColumns } = eliminate(cells, ctx, { reduced: true, columns: cols });
  // Una riga «0 = numero non nullo» rende il sistema impossibile.
  for (let r = pivotColumns.length; r < rows; r++) {
    if (!isZero((cells[r] as Ratio[])[cols] as Ratio)) return { kind: "none" };
  }
  const particular: Ratio[] = Array.from({ length: cols }, () => Ratio.ZERO);
  pivotColumns.forEach((col, row) => {
    particular[col] = (cells[row] as Ratio[])[cols] as Ratio;
  });
  const column = (vector: Ratio[]): Matrix => fromGrid(vector.map((cell) => [cell]), ctx);
  if (pivotColumns.length === cols) return { kind: "unique", solution: column(particular) };
  const freeColumns = Array.from({ length: cols }, (_, c) => c).filter((c) => !pivotColumns.includes(c));
  return { kind: "infinite", particular: column(particular), directions: kernelBasis(cells, pivotColumns, cols).map(column), freeColumns };
}
