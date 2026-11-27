// Monomi e polinomi nelle lettere x e y, scritti come su un quaderno: servono ai generatori del calcolo
// letterale (V1.M04), che devono rifare i conti con un errore tipico preciso (esponenti moltiplicati,
// segno non distribuito, un termine non diviso) e poi mostrare il risultato in forma normale.
// Solo x e y perché sono le lettere della tastiera Base del telefono.

import { add, mul, neg, num, pow, sym, type Expr } from "../../motore/expr";
import { Rational, type RationalLike } from "../../motore/numbers/rational";

const x = sym("x");
const y = sym("y");

/** Un monomio c·xᵃ·yᵇ (a, b naturali). */
export interface Mono {
  readonly c: Rational;
  readonly x: number;
  readonly y: number;
}

/** Un polinomio: i suoi termini, nell'ordine in cui si scrivono. */
export type Poly = readonly Mono[];

/** Il monomio c·xᵃ·yᵇ. */
export const mono = (c: RationalLike, a = 0, b = 0): Mono => ({ c: Rational.from(c), x: a, y: b });

/** Grado del monomio (somma degli esponenti). */
export const degree = (m: Mono): number => m.x + m.y;

const sameLetters = (m: Mono, n: Mono): boolean => m.x === n.x && m.y === n.y;

/** La parte letterale xᵃyᵇ come espressione, o null se il monomio è un numero. */
function letters(m: Mono): Expr | null {
  const parts: Expr[] = [];
  if (m.x === 1) parts.push(x);
  if (m.x > 1) parts.push(pow(x, m.x));
  if (m.y === 1) parts.push(y);
  if (m.y > 1) parts.push(pow(y, m.y));
  if (parts.length === 0) return null;
  return parts.length === 1 ? (parts[0] as Expr) : mul(...parts);
}

/** Il monomio scritto a mano: x e non 1x, −x²y e non −1x²y, ½x come frazione davanti. */
export function monoExpr(m: Mono): Expr {
  const part = letters(m);
  if (part === null) return num(m.c);
  if (m.c.eq(1)) return part;
  if (m.c.eq(-1)) return neg(part);
  return part.kind === "mul" ? mul(num(m.c), ...part.factors) : mul(num(m.c), part);
}

/** Il polinomio scritto nell'ordine dato, con i segni davanti ai termini. Il polinomio nullo è 0. */
export function polyExpr(p: Poly): Expr {
  const terms = p.filter((m) => !m.c.isZero());
  if (terms.length === 0) return num(0);
  return terms.length === 1 ? monoExpr(terms[0] as Mono) : add(...terms.map(monoExpr));
}

/** Ordine della forma normale: grado decrescente, poi esponente di x decrescente. */
const byDegree = (m: Mono, n: Mono): number => degree(n) - degree(m) || n.x - m.x;

/** Riduce: somma i termini simili, toglie gli zeri, ordina per grado decrescente. */
export function reduce(p: Poly): Poly {
  const out: Mono[] = [];
  for (const m of p) {
    const k = out.findIndex((n) => sameLetters(m, n));
    if (k >= 0) out[k] = { ...(out[k] as Mono), c: (out[k] as Mono).c.add(m.c) };
    else out.push(m);
  }
  return out.filter((m) => !m.c.isZero()).sort(byDegree);
}

/** Somma di polinomi, ridotta. */
export const polyAdd = (...ps: Poly[]): Poly => reduce(ps.flat());
/** Opposto di un polinomio (ogni termine cambia segno). */
export const polyNeg = (p: Poly): Poly => p.map((m) => ({ ...m, c: m.c.neg() }));
/** Differenza a − b, ridotta. */
export const polySub = (a: Poly, b: Poly): Poly => polyAdd(a, polyNeg(b));

/** Prodotto di due monomi: coefficienti moltiplicati, esponenti sommati. */
export const monoMul = (m: Mono, n: Mono): Mono => ({ c: m.c.mul(n.c), x: m.x + n.x, y: m.y + n.y });
/** Potenza di un monomio: coefficiente elevato, esponenti moltiplicati. */
export const monoPow = (m: Mono, k: number): Mono => ({ c: m.c.pow(k), x: m.x * k, y: m.y * k });
/** Quoziente di monomi (il divisore deve dividere il dividendo): esponenti sottratti. */
export const monoDiv = (m: Mono, n: Mono): Mono => ({ c: m.c.div(n.c), x: m.x - n.x, y: m.y - n.y });

/** Ogni termine del primo per ogni termine del secondo, poi si riduce. */
export const polyMul = (a: Poly, b: Poly): Poly => reduce(a.flatMap((m) => b.map((n) => monoMul(m, n))));
/** Un polinomio per un monomio, termine per termine (non ridotto: l'ordine dei termini resta). */
export const polyTimes = (p: Poly, m: Mono): Poly => p.map((n) => monoMul(n, m));
/** Potenza di un polinomio, per prodotti ripetuti. */
export const polyPow = (p: Poly, k: number): Poly => Array.from({ length: k - 1 }, () => p).reduce<Poly>((acc, q) => polyMul(acc, q), reduce(p));

/** Vero se i due polinomi, ridotti, hanno gli stessi termini. */
export function polyEq(a: Poly, b: Poly): boolean {
  const [p, q] = [reduce(a), reduce(b)];
  return p.length === q.length && p.every((m, k) => sameLetters(m, q[k] as Mono) && m.c.eq((q[k] as Mono).c));
}

/** Valore esatto del polinomio per x e y dati (serve alle verifiche indipendenti). */
export function polyAt(p: Poly, xv: RationalLike, yv: RationalLike): Rational {
  const [a, b] = [Rational.from(xv), Rational.from(yv)];
  return p.reduce((s, m) => s.add(m.c.mul(a.pow(m.x)).mul(b.pow(m.y))), Rational.ZERO);
}
