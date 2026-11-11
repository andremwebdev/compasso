// Dai polinomi in più variabili ai polinomi in una variabile.
//
// Irriducibilità e MCD in più variabili sono algoritmi pesanti. Qui si usa una scorciatoia sicura:
// si restringe il polinomio a una retta (ogni variabile diventa a·t + b, con a e b interi) e si
// lavora in una variabile sola.
// - Se f = g·h con g e h non costanti, anche la restrizione si spezza (quando conserva il grado).
//   Quindi: restrizione irriducibile e dello stesso grado ⇒ f irriducibile.
// - Se f e g hanno un fattore comune, lo hanno anche le restrizioni. Quindi: restrizioni prime tra
//   loro ⇒ f e g primi tra loro.
// Il viceversa vale per quasi tutte le rette: si provano più rette, scelte da un Rng che dipende
// solo dai polinomi (il risultato è sempre lo stesso).

import { gcd } from "../numbers/integers";
import type { Rational } from "../numbers/rational";
import { Rng } from "../random/rng";
import type { NormalContext, Poly } from "./poly";
import { upAdd, upDegree, upGcd, upIsIrreducible, upMul, upoly, upPow, type UPoly } from "./upoly";

const LINES_TO_TRY = 8;

/**
 * Vero se il polinomio ha coefficienti razionali e solo atomi «liberi» (variabili, π, e):
 * è la condizione per poterlo studiare come polinomio sui razionali.
 */
export function isRationalPolynomial(poly: Poly, ctx: NormalContext): boolean {
  for (const { mono, coeff } of poly.terms.values()) {
    if (!coeff.isRational()) return false;
    for (const [key] of mono) {
      const atom = ctx.atoms.get(key);
      if (!atom || !atom.independent || atom.reduce) return false;
    }
  }
  return true;
}

/** Restringe il polinomio alla retta data: ogni atomo diventa un polinomio di primo grado in t. */
function restrict(poly: Poly, line: ReadonlyMap<string, UPoly>): UPoly {
  let result: UPoly = [];
  for (const { mono, coeff } of poly.terms.values()) {
    let term: UPoly = upoly(coeff.toRational());
    for (const [key, exp] of mono) term = upMul(term, upPow(line.get(key) as UPoly, exp));
    result = upAdd(result, term);
  }
  return result;
}

/** Le rette da provare. Con una sola variabile la retta è la variabile stessa: nessuna perdita. */
function* lines(polys: readonly Poly[]): Generator<ReadonlyMap<string, UPoly>> {
  const keys = [...new Set(polys.flatMap((poly) => [...poly.atomKeys()]))].sort();
  if (keys.length <= 1) {
    yield new Map(keys.map((key) => [key, upoly(0, 1)]));
    return;
  }
  const rng = new Rng(`retta|${polys.map((poly) => poly.key()).join("|")}`);
  for (let attempt = 0; attempt < LINES_TO_TRY; attempt++) {
    yield new Map(keys.map((key) => [key, upoly(rng.int(-5, 5), rng.intExcept(-4, 4))]));
  }
}

/** Il polinomio come polinomio in una variabile, se ha al più un atomo; altrimenti null. */
export function toUnivariate(poly: Poly, ctx: NormalContext): UPoly | null {
  if (!isRationalPolynomial(poly, ctx) || poly.atomKeys().size > 1) return null;
  return restrict(poly, lines([poly]).next().value as ReadonlyMap<string, UPoly>);
}

/**
 * Irriducibilità sui razionali di un polinomio di grado almeno 1 (a meno di fattori numerici).
 * null se il polinomio non è a coefficienti razionali in atomi liberi: in quel caso non si decide.
 */
export function isIrreducible(poly: Poly, ctx: NormalContext): boolean | null {
  if (!isRationalPolynomial(poly, ctx)) return null;
  const degree = poly.totalDegree();
  if (degree < 1) return null;
  for (const line of lines([poly])) {
    const restricted = restrict(poly, line);
    if (upDegree(restricted) === degree && upIsIrreducible(restricted)) return true;
  }
  return false;
}

/** Vero se i due polinomi non hanno fattori comuni non costanti; null se non si può decidere. */
export function areCoprime(a: Poly, b: Poly, ctx: NormalContext): boolean | null {
  if (!isRationalPolynomial(a, ctx) || !isRationalPolynomial(b, ctx)) return null;
  if (a.totalDegree() < 1 || b.totalDegree() < 1) return true;
  for (const line of lines([a, b])) {
    const ra = restrict(a, line);
    const rb = restrict(b, line);
    if (upDegree(ra) === a.totalDegree() && upDegree(rb) === b.totalDegree() && upDegree(upGcd(ra, rb)) === 0) return true;
  }
  return false;
}

/** Il MCD dei coefficienti, se sono tutti interi; altrimenti null. Serve a vedere se c'è un numero da raccogliere. */
export function integerContent(polys: readonly Poly[]): bigint | null {
  let content = 0n;
  for (const poly of polys) {
    for (const { coeff } of poly.terms.values()) {
      if (!coeff.isRational()) return null;
      const value: Rational = coeff.toRational();
      if (!value.isInteger()) return null;
      content = gcd(content, value.n);
    }
  }
  return content;
}
