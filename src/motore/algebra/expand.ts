// Dalla forma normale di nuovo a un'espressione scritta: è così che si sviluppa un prodotto
// (expand) e che matrici, numeri complessi e polinomi tornano a essere espressioni da mostrare.

import { EngineError } from "../errors";
import type { Expr } from "../expr/types";
import { gcd, lcm } from "../numbers/integers";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import { normalize } from "./normalize";
import { NormalContext, Poly, Ratio, type Term } from "./poly";
import { simplify } from "./simplify";
import { toUnivariate } from "./specialize";
import { upDivMod, upGcd, upDegree, type UPoly } from "./upoly";

const KEY_I = "ⅈ";

const numberExpr = (value: Rational): Expr => ({ kind: "num", value });
const sumExpr = (terms: Expr[]): Expr => (terms.length === 0 ? numberExpr(Rational.ZERO) : terms.length === 1 ? (terms[0] as Expr) : { kind: "add", terms });

function rawSurd(value: Surd): Expr {
  return sumExpr(
    value.terms.map(([radicand, coefficient]): Expr =>
      radicand === 1n
        ? numberExpr(coefficient)
        : { kind: "mul", factors: [numberExpr(coefficient), { kind: "root", index: 2, arg: numberExpr(Rational.of(radicand)) }] },
    ),
  );
}

/** Un numero con radici quadrate come espressione pulita: 3 + 2√5, √2/2. */
export function surdToExpr(value: Surd): Expr {
  return simplify(rawSurd(value));
}

/** Il numero complesso re + im·i come espressione in forma algebrica pulita: 1 + 2i, −i, (√3/2)i. */
export function complexToExpr(re: Surd, im: Surd): Expr {
  if (im.isZero()) return surdToExpr(re);
  const unit: Expr = { kind: "const", name: "i" };
  const imaginary = simplify({ kind: "mul", factors: [rawSurd(im), unit] });
  return re.isZero() ? imaginary : simplify({ kind: "add", terms: [rawSurd(re), imaginary] });
}

/**
 * Ordine di scrittura dei termini: grado decrescente, poi ordine alfabetico delle lettere (x², xy, y²).
 * L'unità immaginaria non conta nel grado e va per ultima: così un numero complesso si scrive a + bi.
 */
function compareTerms(a: Term, b: Term, keys: readonly string[]): number {
  const degree = (term: Term): number => term.mono.reduce((sum, [key, exp]) => sum + (key === KEY_I ? 0 : exp), 0);
  const power = (term: Term, key: string): number => term.mono.find(([k]) => k === key)?.[1] ?? 0;
  const byDegree = degree(b) - degree(a);
  if (byDegree !== 0) return byDegree;
  for (const key of keys) {
    if (key !== KEY_I && power(a, key) !== power(b, key)) return power(b, key) - power(a, key);
  }
  return power(a, KEY_I) - power(b, KEY_I);
}

/** Un polinomio della forma normale come espressione sviluppata e pulita. */
export function polyToExpr(poly: Poly, ctx: NormalContext): Expr {
  const keys = [...poly.atomKeys()].sort();
  const terms = [...poly.terms.values()].sort((a, b) => compareTerms(a, b, keys));
  const raw = terms.map(({ mono, coeff }): Expr => {
    const factors: Expr[] = [rawSurd(coeff)];
    for (const [key, exp] of mono) {
      const atom = ctx.atoms.get(key);
      if (!atom) throw new EngineError(`Atomo sconosciuto nella forma normale: ${key}.`);
      factors.push(exp === 1 ? atom.expr : { kind: "pow", base: atom.expr, exp: numberExpr(Rational.of(exp)) });
    }
    return factors.length === 1 ? (factors[0] as Expr) : { kind: "mul", factors };
  });
  return simplify(sumExpr(raw));
}

function fromUnivariate(p: UPoly, key: string): Poly {
  return p.reduce<Poly>((sum, c, k) => sum.add(Poly.term(k === 0 ? [] : [[key, k]], Surd.from(c))), Poly.ZERO);
}

/** Toglie i denominatori numerici e i fattori interi comuni; il primo termine scritto del denominatore diventa positivo. */
function cleanFraction(num: Poly, den: Poly): [Poly, Poly] {
  const coefficients = [...num.terms.values(), ...den.terms.values()].map((term) => term.coeff);
  if (!coefficients.every((c) => c.isRational())) return [num, den];
  const rationals = coefficients.map((c) => c.toRational());
  const scale = rationals.reduce((acc, c) => lcm(acc, c.d), 1n);
  const content = rationals.reduce((acc, c) => gcd(acc, (c.n * scale) / c.d), 0n);
  const keys = [...den.atomKeys()].sort();
  const lead = [...den.terms.values()].sort((a, b) => compareTerms(a, b, keys))[0] as Term;
  const factor = Surd.from(Rational.of(lead.coeff.sign() < 0 ? -scale : scale, content));
  return [num.scale(factor), den.scale(factor)];
}

/** Un quoziente della forma normale come espressione: sviluppata, con i numeri complessi in forma a + bi. */
export function ratioToExpr(ratio: Ratio, ctx: NormalContext): Expr {
  if (ratio.isPoly()) return polyToExpr(ratio.num.scale((ratio.den.constant() as Surd).inv()), ctx);
  let { num, den } = ratio;
  const denKeys = den.atomKeys();
  if (denKeys.size === 1 && denKeys.has(KEY_I)) {
    // Denominatore a + bi: si moltiplica per il coniugato.
    const real = den.terms.get("")?.coeff ?? Surd.ZERO;
    const imaginary = den.terms.get(KEY_I)?.coeff ?? Surd.ZERO;
    const conjugate = Poly.constant(real).sub(Poly.term([[KEY_I, 1]], imaginary));
    const norm = real.mul(real).add(imaginary.mul(imaginary));
    return polyToExpr(num.mul(conjugate, ctx).scale(norm.inv()), ctx);
  }
  // Una sola lettera e coefficienti razionali: si semplificano i fattori comuni.
  const keys = new Set([...num.atomKeys(), ...denKeys]);
  const un = keys.size === 1 ? toUnivariate(num, ctx) : null;
  const ud = keys.size === 1 ? toUnivariate(den, ctx) : null;
  if (un && ud) {
    const common = upGcd(un, ud);
    if (upDegree(common) >= 1) {
      const key = [...keys][0] as string;
      num = fromUnivariate(upDivMod(un, common).quotient, key);
      den = fromUnivariate(upDivMod(ud, common).quotient, key);
      const constant = den.constant();
      if (constant) return polyToExpr(num.scale(constant.inv()), ctx);
    }
  }
  [num, den] = cleanFraction(num, den);
  return simplify({ kind: "div", num: polyToExpr(num, ctx), den: polyToExpr(den, ctx) });
}

/**
 * Sviluppa un'espressione: prodotti e potenze di somme diventano una somma di monomi, con i termini
 * simili sommati. Una frazione algebrica diventa un solo quoziente di polinomi sviluppati.
 * Lancia EngineError se l'espressione è troppo complessa o contiene una divisione per zero.
 */
export function expand(expr: Expr): Expr {
  const ctx = new NormalContext();
  return ratioToExpr(normalize(expr, ctx), ctx);
}

/** Un polinomio in una variabile come espressione, in ordine di grado decrescente. */
export function upolyToExpr(p: UPoly, variable = "x"): Expr {
  const x: Expr = { kind: "sym", name: variable };
  const terms: Expr[] = [];
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k] as Rational;
    if (c.isZero()) continue;
    terms.push(k === 0 ? numberExpr(c) : { kind: "mul", factors: [numberExpr(c), { kind: "pow", base: x, exp: numberExpr(Rational.of(k)) }] });
  }
  return simplify(sumExpr(terms));
}

/** L'espressione come polinomio a coefficienti razionali nella variabile data; null se non lo è. */
export function exprToUPoly(expr: Expr, variable = "x"): UPoly | null {
  const ctx = new NormalContext();
  let ratio: Ratio;
  try {
    ratio = normalize(expr, ctx);
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
  const constant = ratio.den.constant();
  if (!constant) return null;
  const poly = ratio.num.scale(constant.inv());
  if ([...poly.atomKeys()].some((key) => key !== variable)) return null;
  return toUnivariate(poly, ctx);
}
