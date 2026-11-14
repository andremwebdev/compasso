// Polinomi scritti termine per termine, nell'ordine scelto dal generatore: servono ai generatori di
// limiti (V2.M03, V2.M04), dove conta come è scritto il polinomio (in ordine di grado o in disordine)
// e che cosa resta in parentesi dopo aver raccolto la potenza di grado massimo.

import { add, div, mul, neg, num, pow, sub, type Expr } from "../../motore/expr";

/** Un termine c·v^deg. Un polinomio è l'elenco dei suoi termini, nell'ordine in cui si scrive. */
export interface Term {
  readonly coef: number;
  readonly deg: number;
}
export type Poly = readonly Term[];

/** Il termine di grado massimo: è quello che decide un limite all'infinito. */
export const leading = (poly: Poly): Term => poly.reduce((best, term) => (term.deg > best.deg ? term : best));
/** Il primo termine scritto. */
export const first = (poly: Poly): Term => poly[0] as Term;
export const byDegree = (poly: Poly): Term[] => [...poly].sort((s, t) => t.deg - s.deg);

/** «head ± piece» con il segno scritto davanti: 3 − 2/n, non 3 + (−2)/n. */
export const plusSigned = (head: Expr, sign: number, piece: Expr): Expr => (sign < 0 ? sub(head, piece) : add(head, piece));
/** a/m con il segno davanti alla frazione. */
export const signedFraction = (a: number, m: Expr): Expr => (a < 0 ? neg(div(-a, m)) : div(a, m));
/** k·expr senza il coefficiente 1: n, 3n. */
export const times = (k: number, expr: Expr): Expr => (k === 1 ? expr : k === -1 ? neg(expr) : mul(k, expr));

/** Le funzioni che scrivono termini e polinomi in una variabile. */
export function termWriter(variable: Expr) {
  const power = (deg: number): Expr => (deg === 1 ? variable : pow(variable, deg));
  const termExpr = ({ coef, deg }: Term): Expr => {
    if (deg === 0) return num(coef);
    if (coef === 1) return power(deg);
    if (coef === -1) return neg(power(deg));
    return mul(coef, power(deg));
  };
  const polyExpr = (poly: Poly): Expr => (poly.length === 1 ? termExpr(first(poly)) : add(...poly.map(termExpr)));
  /** Il polinomio diviso per v^deg, termine per termine: a + c/v + d/v². È quello che resta in parentesi dopo aver raccolto. */
  const collected = (poly: Poly, deg: number): Expr => {
    const terms = byDegree(poly);
    const pieces = terms.slice(1).map((term) => signedFraction(term.coef, power(deg - term.deg)));
    return pieces.length === 0 ? num(first(terms).coef) : add(num(first(terms).coef), ...pieces);
  };
  return { power, termExpr, polyExpr, collected };
}
