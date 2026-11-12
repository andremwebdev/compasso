// Conti esatti sulle matrici: ogni elemento diventa una forma normale (quoziente di polinomi con
// coefficienti esatti), così numeri razionali, radicali, numeri complessi e parametri si trattano
// tutti allo stesso modo. Uso interno della cartella linalg.

import { rationalizeComplex, ratioToExpr } from "../algebra/expand";
import { normalize } from "../algebra/normalize";
import type { NormalContext, Ratio } from "../algebra/poly";
import type { Matrix } from "./matrix";

export type Grid = Ratio[][];

export function toGrid(m: Matrix, ctx: NormalContext): Grid {
  return m.rows.map((row) => row.map((entry) => tidy(normalize(entry, ctx), ctx)));
}

export function fromGrid(cells: Grid, ctx: NormalContext): Matrix {
  return { kind: "matrix", rows: cells.map((row) => row.map((cell) => ratioToExpr(cell, ctx))) };
}

/** Un quoziente con denominatore complesso a + bi si riporta subito alla forma senza denominatore. */
export const tidy = rationalizeComplex;

export const isZero = (ratio: Ratio): boolean => ratio.num.isZero();
export const isOne = (ratio: Ratio): boolean => ratio.constant()?.eq(1) ?? false;

export function divide(a: Ratio, b: Ratio, ctx: NormalContext): Ratio {
  return tidy(a.div(b, ctx), ctx);
}
