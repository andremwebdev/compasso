// Conti esatti sulle matrici: ogni elemento diventa una forma normale (quoziente di polinomi con
// coefficienti esatti), così numeri razionali, radicali, numeri complessi e parametri si trattano
// tutti allo stesso modo. Uso interno della cartella linalg.

import { ratioToExpr } from "../algebra/expand";
import { normalize } from "../algebra/normalize";
import { NormalContext, Poly, Ratio } from "../algebra/poly";
import { Surd } from "../numbers/surd";
import type { Matrix } from "./matrix";

const KEY_I = "ⅈ";

export type Grid = Ratio[][];

export function toGrid(m: Matrix, ctx: NormalContext): Grid {
  return m.rows.map((row) => row.map((entry) => tidy(normalize(entry, ctx), ctx)));
}

export function fromGrid(cells: Grid, ctx: NormalContext): Matrix {
  return { kind: "matrix", rows: cells.map((row) => row.map((cell) => ratioToExpr(cell, ctx))) };
}

/** Un quoziente con denominatore complesso a + bi si riporta subito alla forma senza denominatore. */
export function tidy(ratio: Ratio, ctx: NormalContext): Ratio {
  if (ratio.isPoly()) return ratio;
  const keys = ratio.den.atomKeys();
  if (keys.size !== 1 || !keys.has(KEY_I)) return ratio;
  const real = ratio.den.terms.get("")?.coeff ?? Surd.ZERO;
  const imaginary = ratio.den.terms.get(KEY_I)?.coeff ?? Surd.ZERO;
  const conjugate = Poly.constant(real).sub(Poly.term([[KEY_I, 1]], imaginary));
  const norm = real.mul(real).add(imaginary.mul(imaginary));
  return Ratio.fromPoly(ratio.num.mul(conjugate, ctx).scale(norm.inv()));
}

export const isZero = (ratio: Ratio): boolean => ratio.num.isZero();
export const isOne = (ratio: Ratio): boolean => ratio.constant()?.eq(1) ?? false;

export function divide(a: Ratio, b: Ratio, ctx: NormalContext): Ratio {
  return tidy(a.div(b, ctx), ctx);
}
