// Matrici e vettori con elementi esatti: tipo, costruzione, confronto, LaTeX.
// Le operazioni sono in operations.ts, la riduzione di Gauss in gauss.ts, gli autovalori in eigen.ts.

import { equivalent } from "../equivalence/equivalence";
import { EngineError } from "../errors";
import { toExpr, type ExprLike } from "../expr/build";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";

/** Matrice per righe. Un vettore è una matrice con una sola colonna (o una sola riga). */
export interface Matrix {
  readonly kind: "matrix";
  readonly rows: readonly (readonly Expr[])[];
}

/** Costruisce una matrice da una tabella di righe; tutte le righe devono avere la stessa lunghezza. */
export function matrix(rows: readonly (readonly ExprLike[])[]): Matrix {
  const width = rows[0]?.length ?? 0;
  if (rows.length === 0 || width === 0 || rows.some((row) => row.length !== width)) {
    throw new EngineError("Una matrice deve avere almeno un elemento e righe della stessa lunghezza.");
  }
  return { kind: "matrix", rows: rows.map((row) => row.map(toExpr)) };
}

export function columnVector(entries: readonly ExprLike[]): Matrix {
  return matrix(entries.map((entry) => [entry]));
}

export function rowVector(entries: readonly ExprLike[]): Matrix {
  return matrix([entries]);
}

export function matrixSize(m: Matrix): { rows: number; cols: number } {
  return { rows: m.rows.length, cols: m.rows[0]?.length ?? 0 };
}

/** Uguaglianza elemento per elemento (ogni coppia di elementi deve essere equivalente). */
export function matricesEquivalent(a: Matrix, b: Matrix): boolean {
  const sa = matrixSize(a);
  const sb = matrixSize(b);
  if (sa.rows !== sb.rows || sa.cols !== sb.cols) return false;
  return a.rows.every((row, r) => row.every((entry, c) => equivalent(entry, b.rows[r]?.[c] as Expr)));
}

export function matrixToLatex(m: Matrix): string {
  const body = m.rows.map((row) => row.map(toLatex).join(" & ")).join(" \\\\ ");
  return `\\begin{pmatrix} ${body} \\end{pmatrix}`;
}
