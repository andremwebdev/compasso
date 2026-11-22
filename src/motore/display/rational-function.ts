// Funzioni razionali di una variabile, f(x) = N(x)/D(x), con numeratore e denominatore tenuti
// separati e MAI semplificati: un fattore comune resta, perché dove si annulla la funzione non è
// definita. Servono alle visualizzazioni (f(x) − k come una sola frazione, per la tabella dei segni).

import { exprToUPoly, upolyToExpr } from "../algebra/expand";
import { tryNormalize } from "../algebra/normalize";
import { NormalContext } from "../algebra/poly";
import { toUnivariate } from "../algebra/specialize";
import { upDegree, upScale, upSub, type UPoly } from "../algebra/upoly";
import type { Expr } from "../expr/types";
import { variables } from "../expr/walk";
import { gcd, lcm } from "../numbers/integers";
import { Rational, type RationalLike } from "../numbers/rational";

/** Una funzione razionale N/D: coefficienti interi senza fattori comuni, coefficiente direttore di D positivo. */
export interface RationalFunction {
  readonly kind: "rationalfunction";
  readonly variable: string;
  readonly num: UPoly;
  readonly den: UPoly;
}

/** Il numeratore o il denominatore è il polinomio nullo? */
const isZeroPoly = (p: UPoly): boolean => upDegree(p) < 0;

/**
 * Porta N e D a coefficienti interi, senza un fattore numerico comune a tutti, con il coefficiente
 * direttore di D positivo. Il rapporto N/D non cambia: si moltiplicano tutti e due per lo stesso numero.
 */
function tidy(num: UPoly, den: UPoly, variable: string): RationalFunction {
  const all = [...num, ...den].filter((c) => !c.isZero());
  const common = all.reduce((acc, c) => lcm(acc, c.d), 1n);
  let content = 0n;
  for (const c of all) content = gcd(content, c.mul(common).n);
  const lead = den[upDegree(den)] as Rational;
  const factor = Rational.of(common, content === 0n ? 1n : content).mul(lead.sign() < 0 ? -1 : 1);
  return { kind: "rationalfunction", variable, num: upScale(num, factor), den: upScale(den, factor) };
}

/**
 * La funzione come N/D se è una frazione di polinomi in `variable` (anche scritta come somma di
 * frazioni: si riduce allo stesso denominatore senza semplificare); altrimenti null.
 */
export function rationalFunction(f: Expr, variable = "x"): RationalFunction | null {
  if (variables(f).some((name) => name !== variable)) return null;
  const ctx = new NormalContext();
  const ratio = tryNormalize(f, ctx);
  if (!ratio) return null;
  if ([...ratio.num.atomKeys(), ...ratio.den.atomKeys()].some((key) => key !== variable)) return null;
  const num = toUnivariate(ratio.num, ctx);
  const den = toUnivariate(ratio.den, ctx);
  if (!num || !den || isZeroPoly(den)) return null;
  return tidy(num, den, variable);
}

/** f − k come una sola frazione: (N − k·D)/D, riordinata come le altre. */
export function subtractConstant(f: RationalFunction, k: RationalLike): RationalFunction {
  return tidy(upSub(f.num, upScale(f.den, k)), f.den, f.variable);
}

/** La funzione è costante (N proporzionale a D)? */
export function isConstantFunction(f: RationalFunction): boolean {
  const lead = upDegree(f.den);
  const ratio = (f.num[lead] ?? Rational.ZERO).div(f.den[lead] as Rational);
  return isZeroPoly(upSub(f.num, upScale(f.den, ratio)));
}

/** Gradi di numeratore e denominatore (il polinomio nullo ha grado −1). */
export function rationalDegrees(f: RationalFunction): { readonly num: number; readonly den: number } {
  return { num: upDegree(f.num), den: upDegree(f.den) };
}

/** Numeratore e denominatore come espressioni del motore. */
export function rationalParts(f: RationalFunction): { readonly num: Expr; readonly den: Expr } {
  return { num: upolyToExpr(f.num, f.variable), den: upolyToExpr(f.den, f.variable) };
}

/** Un polinomio scritto come espressione, letto come polinomio in `variable` (null se non lo è). */
export const asPolynomial = (expr: Expr, variable = "x"): UPoly | null => exprToUPoly(expr, variable);
