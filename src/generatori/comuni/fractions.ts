// Frazioni algebriche scritte a fattori (V1.M04.L09 e L10): un numero davanti e i fattori di
// numeratore e denominatore. Servono ai generatori delle frazioni algebriche per semplificare come si fa
// a mano (fattori uguali sopra e sotto, fattori opposti con un −1) e per rifare i conti con un errore
// tipico (differenza di quadrati scritta come quadrato, trinomio con i segni sbagliati).

import { div, mul, neg, num, type Expr } from "../../motore/expr";
import { Rational } from "../../motore/numbers/rational";
import { points, setComplement, type SolutionSet } from "../../motore/sets";
import { mono, polyEq, polyExpr, polyMul, polyNeg, reduce, type Mono, type Poly } from "./monomials";

/** Un lato della frazione: un numero davanti e i fattori (polinomi in x e y). */
export interface Side {
  readonly c: number;
  readonly factors: readonly Poly[];
}

export const X = (c: number, e = 1): Mono => mono(c, e, 0);
export const Y = (c: number, e = 1): Mono => mono(c, 0, e);
export const K = (c: number): Mono => mono(c);
/** Il binomio x − r. */
export const lin = (r: number): Poly => [X(1), K(-r)];
/** Il binomio r − x, scritto con il numero prima. */
export const linOpposite = (r: number): Poly => [K(r), X(-1)];
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Il prodotto sviluppato di un lato. */
export const expandedSide = (side: Side): Poly => reduce(side.factors.reduce<Poly>((p, f) => polyMul(p, f), [K(side.c)]));

/** Un prodotto di fattori scritto: numero davanti (se non è 1), poi i fattori; lo stesso fattore come potenza. */
export function sideExpr(c: number, factors: readonly Poly[]): Expr {
  const merged: { poly: Poly; power: number }[] = [];
  // Le potenze di x davanti, come si scrive a mano: x²(x + 5), non (x + 5)x².
  const ordered = [...factors.filter((f) => f.length === 1), ...factors.filter((f) => f.length !== 1)];
  for (const f of ordered) {
    const twin = merged.findIndex((m) => polyEq(m.poly, f));
    if (twin >= 0) merged[twin] = { poly: f, power: (merged[twin] as { power: number }).power + 1 };
    else merged.push({ poly: f, power: 1 });
  }
  const parts: Expr[] = [];
  if (c !== 1 || merged.length === 0) parts.push(num(c));
  for (const m of merged) parts.push(m.power === 1 ? polyExpr(m.poly) : { kind: "pow", base: polyExpr(m.poly), exp: num(m.power) });
  return parts.length === 1 ? (parts[0] as Expr) : mul(...parts);
}

/**
 * Semplifica: toglie i fattori uguali sopra e sotto (e quelli opposti, contando un −1), riduce i numeri.
 * Con `opposedAsEqual` due fattori opposti si tolgono senza il −1 (è l'errore tipico).
 */
export function simplifyFraction(n: Side, d: Side, opposedAsEqual = false): Expr {
  const top = [...n.factors];
  const bottom: Poly[] = [];
  let sign = 1;
  for (const f of d.factors) {
    const same = top.findIndex((t) => polyEq(t, f));
    if (same >= 0) {
      top.splice(same, 1);
      continue;
    }
    const opposite = top.findIndex((t) => polyEq(t, polyNeg(f)));
    if (opposite >= 0) {
      top.splice(opposite, 1);
      if (!opposedAsEqual) sign = -sign;
      continue;
    }
    bottom.push(f);
  }
  const g = gcd(n.c, d.c);
  let [cn, cd] = [n.c / g, d.c / g];
  if (cd < 0) [cn, cd] = [-cn, -cd];
  if (cn < 0) [cn, sign] = [-cn, -sign];
  const numerator = sideExpr(cn, top);
  const value = bottom.length === 0 && cd === 1 ? numerator : div(numerator, sideExpr(cd, bottom));
  return sign < 0 ? neg(value) : value;
}

/** Gli zeri reali dei fattori di primo grado in x (x − r, r − x, x); x² + b non ne ha. */
export function zerosOf(factors: readonly Poly[]): Rational[] {
  const out: Rational[] = [];
  for (const f of factors) {
    const linear = f.filter((m) => m.x === 1 && m.y === 0);
    const constant = f.filter((m) => m.x === 0 && m.y === 0);
    if (f.length > 2 || linear.length !== 1 || f.some((m) => m.y > 0 || m.x > 1)) continue;
    const a = (linear[0] as Mono).c;
    const b = constant[0]?.c ?? Rational.ZERO;
    const zero = b.neg().div(a);
    if (!out.some((z) => z.eq(zero))) out.push(zero);
  }
  return out.sort((p, q) => p.cmp(q));
}

/** I reali tolti gli zeri dati (le condizioni di esistenza). */
export const domainOf = (zeros: readonly Rational[]): SolutionSet => setComplement(points(...zeros));

/** Un trinomio (x − a)(x − b) del lato scomposto con i segni sbagliati: (x + a)(x + b). */
export function flipTrinomial(side: Side): Side | null {
  const linear = side.factors.map((f, k) => ({ f, k })).filter(({ f }) => f.length === 2 && f[0]?.x === 1 && f[0].c.eq(1) && f[1]?.x === 0 && f[1].y === 0 && (f[0]?.y ?? 0) === 0);
  if (linear.length < 2) return null;
  const [p, q] = [linear[0] as { f: Poly; k: number }, linear[1] as { f: Poly; k: number }];
  // Solo se i due binomi non sono opposti tra loro (x − r e x + r: lì è una differenza di quadrati).
  if (polyEq(polyMul(p.f, q.f).filter((m) => m.x === 1), [])) return null;
  const flip = (f: Poly): Poly => f.map((m) => (m.x === 0 ? { ...m, c: m.c.neg() } : m));
  return { c: side.c, factors: side.factors.map((f, k) => (k === p.k || k === q.k ? flip(f) : f)) };
}

/** Una differenza di quadrati (x − r)(x + r) del lato scritta come (x − r)² oppure (x + r)². */
export function squaresInsteadOfDifference(side: Side): Side[] {
  for (let i = 0; i < side.factors.length; i++) {
    for (let j = i + 1; j < side.factors.length; j++) {
      const [a, b] = [side.factors[i] as Poly, side.factors[j] as Poly];
      const differenceOfSquares = a.length === 2 && b.length === 2 && polyEq([a[0] as Mono], [b[0] as Mono]) && polyEq([a[1] as Mono], polyNeg([b[1] as Mono]));
      if (differenceOfSquares) {
        // a e b differiscono solo nel segno del secondo termine: (x − r)(x + r). Al posto di uno si scrive l'altro.
        return [
          { c: side.c, factors: side.factors.map((f, k) => (k === j ? a : f)) },
          { c: side.c, factors: side.factors.map((f, k) => (k === i ? b : f)) },
        ];
      }
    }
  }
  return [];
}
