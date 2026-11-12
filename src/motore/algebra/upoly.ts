// Polinomi in una variabile a coefficienti razionali: divisione, MCD, radici razionali,
// irriducibilità e scomposizione sui razionali. È la base dei vincoli di forma («scomposta»,
// «ridotta ai minimi termini») e, nella sessione 2, di Ruffini, divisione e scomposizione con i passaggi.

import { EngineError } from "../errors";
import { absBig, divisors, gcd, lcm } from "../numbers/integers";
import { Rational, type RationalLike } from "../numbers/rational";

/** Coefficienti dal grado 0 in su, senza zeri in coda. Il polinomio nullo è la lista vuota. */
export type UPoly = readonly Rational[];

/** Costruisce un polinomio dai coefficienti in ordine di grado crescente: upoly(1, 0, 2) è 2t² + 1. */
export function upoly(...coefficients: RationalLike[]): UPoly {
  return trim(coefficients.map((c) => Rational.from(c)));
}

function trim(coefficients: Rational[]): UPoly {
  let length = coefficients.length;
  while (length > 0 && (coefficients[length - 1] as Rational).isZero()) length -= 1;
  return coefficients.slice(0, length);
}

/** Grado; −1 per il polinomio nullo. */
export function upDegree(p: UPoly): number {
  return p.length - 1;
}

const at = (p: UPoly, index: number): Rational => p[index] ?? Rational.ZERO;

export function upAdd(a: UPoly, b: UPoly): UPoly {
  return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, k) => at(a, k).add(at(b, k))));
}

export function upScale(p: UPoly, factor: RationalLike): UPoly {
  const f = Rational.from(factor);
  return trim(p.map((c) => c.mul(f)));
}

export function upSub(a: UPoly, b: UPoly): UPoly {
  return upAdd(a, upScale(b, -1));
}

export function upMul(a: UPoly, b: UPoly): UPoly {
  if (a.length === 0 || b.length === 0) return [];
  const result: Rational[] = Array.from({ length: a.length + b.length - 1 }, () => Rational.ZERO);
  a.forEach((ca, i) => {
    b.forEach((cb, j) => {
      result[i + j] = (result[i + j] as Rational).add(ca.mul(cb));
    });
  });
  return trim(result);
}

export function upPow(p: UPoly, exp: number): UPoly {
  let result: UPoly = upoly(1);
  for (let k = 0; k < exp; k++) result = upMul(result, p);
  return result;
}

/** Divisione con resto: a = quoziente·b + resto, con grado del resto minore del grado di b. */
export function upDivMod(a: UPoly, b: UPoly): { quotient: UPoly; remainder: UPoly } {
  if (b.length === 0) throw new EngineError("Divisione per il polinomio nullo.");
  const remainder = [...a];
  const quotient: Rational[] = Array.from({ length: Math.max(0, a.length - b.length + 1) }, () => Rational.ZERO);
  const lead = b[b.length - 1] as Rational;
  for (let k = a.length - b.length; k >= 0; k--) {
    const factor = (remainder[k + b.length - 1] as Rational).div(lead);
    quotient[k] = factor;
    if (factor.isZero()) continue;
    b.forEach((cb, j) => {
      remainder[k + j] = (remainder[k + j] as Rational).sub(factor.mul(cb));
    });
  }
  return { quotient: trim(quotient), remainder: trim(remainder) };
}

/** Massimo comune divisore, con coefficiente direttivo 1 (il polinomio nullo se entrambi sono nulli). */
export function upGcd(a: UPoly, b: UPoly): UPoly {
  let x = a;
  let y = b;
  while (y.length > 0) {
    [x, y] = [y, upDivMod(x, y).remainder];
  }
  return x.length === 0 ? x : upScale(x, (x[x.length - 1] as Rational).inv());
}

/** Minimo comune multiplo, con coefficiente direttivo 1 (il polinomio nullo se uno dei due è nullo). */
export function upLcm(a: UPoly, b: UPoly): UPoly {
  if (a.length === 0 || b.length === 0) return [];
  const product = upDivMod(upMul(a, b), upGcd(a, b)).quotient;
  return upScale(product, (product[product.length - 1] as Rational).inv());
}

/** Valore del polinomio in un punto (regola di Horner, che è anche la regola di Ruffini). */
export function upEval(p: UPoly, x: RationalLike): Rational {
  const point = Rational.from(x);
  return p.reduceRight<Rational>((sum, c) => sum.mul(point).add(c), Rational.ZERO);
}

export function upDerivative(p: UPoly): UPoly {
  return trim(p.slice(1).map((c, k) => c.mul(k + 1)));
}

/**
 * Scrive p = content · primitive, dove `primitive` ha coefficienti interi con MCD 1 e
 * coefficiente direttivo positivo. Esempio: 2t²/3 − 4/3 = (2/3)·(t² − 2).
 */
export function upPrimitive(p: UPoly): { content: Rational; primitive: UPoly } {
  if (p.length === 0) return { content: Rational.ZERO, primitive: [] };
  const commonDen = p.reduce((acc, c) => lcm(acc, c.d), 1n);
  const integers = p.map((c) => (c.n * commonDen) / c.d);
  const common = integers.reduce((acc, c) => gcd(acc, c), 0n);
  const sign = (integers[integers.length - 1] as bigint) < 0n ? -1n : 1n;
  return {
    content: Rational.of(sign * common, commonDen),
    primitive: integers.map((c) => Rational.of(c / (sign * common))),
  };
}

/** Oltre questo valore dei coefficienti estremi la ricerca delle radici razionali è troppo lenta. */
const ROOT_SEARCH_LIMIT = 10n ** 8n;

/** Le radici razionali, distinte, in ordine crescente (teorema delle radici razionali: ±p/q con p | a₀ e q | aₙ). */
export function upRationalRoots(p: UPoly): Rational[] {
  const { primitive } = upPrimitive(p);
  if (primitive.length <= 1) return [];
  const roots: Rational[] = [];
  let reduced = primitive;
  if (at(reduced, 0).isZero()) {
    roots.push(Rational.ZERO);
    while (at(reduced, 0).isZero()) reduced = reduced.slice(1);
  }
  if (reduced.length > 1) {
    const constant = absBig(at(reduced, 0).n);
    const lead = absBig((reduced[reduced.length - 1] as Rational).n);
    if (constant > ROOT_SEARCH_LIMIT || lead > ROOT_SEARCH_LIMIT) throw new EngineError("Coefficienti troppo grandi per cercare le radici.");
    const seen = new Set<string>();
    for (const numerator of divisors(constant)) {
      for (const denominator of divisors(lead)) {
        for (const candidate of [Rational.of(numerator, denominator), Rational.of(-numerator, denominator)]) {
          const key = candidate.toString();
          if (seen.has(key)) continue;
          seen.add(key);
          if (upEval(reduced, candidate).isZero()) roots.push(candidate);
        }
      }
    }
  }
  return roots.sort((a, b) => a.cmp(b));
}

const KRONECKER_LIMIT = 40000;

/**
 * Cerca un fattore di secondo grado a coefficienti interi di un polinomio primitivo senza radici
 * razionali (metodo di Kronecker): se g divide f, allora g(k) divide f(k) per ogni intero k.
 * Si scelgono tre interi k, si provano tutte le terne di divisori e si interpola.
 */
function quadraticFactor(primitive: UPoly): UPoly | null {
  if (upDegree(primitive) < 4) return null;
  const candidates = [0, 1, -1, 2, -2, 3, -3]
    .map((k) => ({ k, value: absBig(upEval(primitive, k).n) }))
    .filter(({ value }) => value !== 0n && value <= ROOT_SEARCH_LIMIT)
    .map(({ k, value }) => ({ k, divs: divisors(value) }))
    .sort((a, b) => a.divs.length - b.divs.length)
    .slice(0, 3);
  const [p0, p1, p2] = candidates;
  if (!p0 || !p1 || !p2) throw new EngineError("Polinomio non adatto alla ricerca dei fattori.");
  if (p0.divs.length * p1.divs.length * p2.divs.length * 4 > KRONECKER_LIMIT) {
    throw new EngineError("Troppi casi per cercare i fattori di secondo grado.");
  }
  const lead = (primitive[primitive.length - 1] as Rational).n;
  const signed = (divs: bigint[]): bigint[] => divs.flatMap((d) => [d, -d]);
  for (const d0 of p0.divs) {
    for (const d1 of signed(p1.divs)) {
      // Differenze divise: g(t) = d0 + s·(t − k0) + a·(t − k0)(t − k1).
      const s = Rational.of(d1 - d0, p1.k - p0.k);
      for (const d2 of signed(p2.divs)) {
        const a = Rational.of(d2 - d0, p2.k - p0.k).sub(s).div(p2.k - p1.k);
        if (a.isZero() || !a.isInteger() || lead % a.n !== 0n) continue;
        const candidate = upAdd(
          upoly(Rational.of(d0).sub(s.mul(p0.k)), s),
          upScale(upMul(upoly(-p0.k, 1), upoly(-p1.k, 1)), a),
        );
        if (!candidate.every((c) => c.isInteger())) continue;
        if (upDivMod(primitive, candidate).remainder.length === 0) return upPrimitive(candidate).primitive;
      }
    }
  }
  return null;
}

/**
 * Vero se il polinomio (di grado almeno 1) è irriducibile sui razionali.
 * Completo fino al grado 5; dal grado 6 un polinomio senza fattori di primo e secondo grado è
 * considerato irriducibile.
 */
export function upIsIrreducible(p: UPoly): boolean {
  const degree = upDegree(p);
  if (degree < 1) return false;
  if (degree === 1) return true;
  if (upRationalRoots(p).length > 0) return false;
  if (degree <= 3) return true;
  return quadraticFactor(upPrimitive(p).primitive) === null;
}

export interface UFactorization {
  /** Costante moltiplicativa. */
  readonly constant: Rational;
  /** Fattori primitivi (coefficienti interi, direttivo positivo) con la loro molteplicità, in ordine di grado. */
  readonly factors: readonly { readonly poly: UPoly; readonly multiplicity: number }[];
}

/** Scomposizione sui razionali: p = constant · Π fattoreᵐ. Stessi limiti di upIsIrreducible. */
export function upFactor(p: UPoly): UFactorization {
  const { content, primitive } = upPrimitive(p);
  const found: UPoly[] = [];
  let rest = primitive;
  const divideOut = (factor: UPoly): void => {
    for (;;) {
      const { quotient, remainder } = upDivMod(rest, factor);
      if (remainder.length > 0) return;
      found.push(factor);
      rest = quotient;
    }
  };
  for (const root of upRationalRoots(rest)) divideOut(upoly(-root.n, root.d));
  for (let factor = quadraticFactor(rest); factor !== null; factor = quadraticFactor(rest)) divideOut(factor);
  // Quello che resta è irriducibile (nei limiti dichiarati) oppure una costante.
  let constant = content;
  if (upDegree(rest) >= 1) {
    const last = upPrimitive(rest);
    found.push(last.primitive);
    constant = constant.mul(last.content);
  } else if (rest.length === 1) {
    constant = constant.mul(rest[0] as Rational);
  }
  const grouped = new Map<string, { poly: UPoly; multiplicity: number }>();
  for (const poly of found) {
    const key = poly.join(",");
    const entry = grouped.get(key);
    if (entry) entry.multiplicity += 1;
    else grouped.set(key, { poly, multiplicity: 1 });
  }
  const factors = [...grouped.values()].sort((a, b) => upDegree(a.poly) - upDegree(b.poly) || a.poly.join(",").localeCompare(b.poly.join(",")));
  return { constant, factors };
}
