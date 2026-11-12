// Numeri complessi nelle tre forme (specifica, sezione 6): algebrica a + bi, trigonometrica
// ρ(cos θ + i sin θ), esponenziale ρ·e^(iθ); passaggio da una all'altra, potenze, radici n-esime.
//
// Il valore esatto è un Complex (numbers/complex.ts); le tre forme sono espressioni, così si
// mostrano, si confrontano e se ne controlla la forma come per ogni altra risposta.
// Convenzioni: l'argomento principale sta in (−π, π]; gli angoli sono multipli razionali di π.

import { complexToExpr, rationalizeComplex, surdToExpr } from "../algebra/expand";
import { normalize } from "../algebra/normalize";
import { NormalContext } from "../algebra/poly";
import { simplify } from "../algebra/simplify";
import { EngineError } from "../errors";
import { toExpr, type ExprLike } from "../expr/build";
import type { Expr } from "../expr/types";
import { mapChildren } from "../expr/walk";
import { argumentOf, Complex, normalizeAngle, notableUnit } from "../numbers/complex";
import { iroot } from "../numbers/integers";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";

const KEY_I = "ⅈ";
const PI: Expr = { kind: "const", name: "pi" };
const E: Expr = { kind: "const", name: "e" };
const I: Expr = { kind: "const", name: "i" };
const numberExpr = (value: Rational): Expr => ({ kind: "num", value });

/** Il numero complesso in forma algebrica: 1 + 2i, −i, 3. */
export function complexExpr(z: Complex): Expr {
  return complexToExpr(z.re, z.im);
}

/** L'angolo qπ come espressione: 0, π, π/6, 5π/6, −π/3. */
export function angleExpr(angle: Rational): Expr {
  return simplify({ kind: "mul", factors: [numberExpr(angle), PI] });
}

/** Se l'espressione vale qπ con q razionale, restituisce q; altrimenti null. */
export function angleOf(expr: Expr): Rational | null {
  try {
    const ctx = new NormalContext();
    const value = normalize({ kind: "div", num: expr, den: PI }, ctx).constant();
    return value && value.isRational() ? value.toRational() : null;
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

/** Sostituisce seno, coseno, tangente ed esponenziali di angoli notevoli con il loro valore esatto. */
function withNotableValues(expr: Expr): Expr {
  const inner = mapChildren(expr, withNotableValues);
  if (inner.kind === "fn" && (inner.name === "sin" || inner.name === "cos" || inner.name === "tan" || inner.name === "cot")) {
    const angle = angleOf(inner.arg);
    const unit = angle ? notableUnit(angle) : null;
    if (unit) {
      if (inner.name === "sin") return surdToExpr(unit.im);
      if (inner.name === "cos") return surdToExpr(unit.re);
      if (inner.name === "tan" && !unit.re.isZero()) return surdToExpr(unit.im.div(unit.re));
      if (inner.name === "cot" && !unit.im.isZero()) return surdToExpr(unit.re.div(unit.im));
    }
  }
  if (inner.kind === "pow" && inner.base.kind === "const" && inner.base.name === "e") {
    // e^(iθ) = cos θ + i sin θ.
    const angle = angleOf({ kind: "div", num: inner.exp, den: I });
    const unit = angle ? notableUnit(angle) : null;
    if (unit) return complexExpr(unit);
  }
  return inner;
}

/**
 * Il valore esatto di un'espressione costante come numero complesso, in qualunque forma sia scritta
 * (algebrica, trigonometrica o esponenziale con angoli multipli di π/12). null se non si riesce.
 */
export function exactComplex(expr: Expr): Complex | null {
  try {
    const ctx = new NormalContext();
    const ratio = rationalizeComplex(normalize(withNotableValues(expr), ctx), ctx);
    if (!ratio.isPoly()) return null;
    const poly = ratio.num;
    if ([...poly.atomKeys()].some((key) => key !== KEY_I)) return null;
    return new Complex(poly.terms.get("")?.coeff ?? Surd.ZERO, poly.terms.get(KEY_I)?.coeff ?? Surd.ZERO);
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

/** Modulo e argomento di un numero complesso. */
export interface PolarForm {
  /** Il modulo ρ, come espressione pulita. */
  readonly modulus: Expr;
  /** L'argomento principale in (−π, π], come multiplo razionale di π. */
  readonly angle: Rational;
}

/** Modulo e argomento principale di z; null per lo zero e quando l'argomento non è un multiplo di π/12. */
export function polarForm(z: Complex): PolarForm | null {
  const angle = argumentOf(z);
  if (!angle) return null;
  const exact = z.modulus();
  const modulus = exact ? surdToExpr(exact) : simplify({ kind: "root", index: 2, arg: surdToExpr(z.norm()) });
  return { modulus, angle };
}

const isOne = (expr: Expr): boolean => expr.kind === "num" && expr.value.eq(1);

/** Forma trigonometrica ρ(cos θ + i sin θ); il modulo 1 non si scrive. */
export function trigonometricForm(modulus: ExprLike, angle: Rational): Expr {
  const theta = angleExpr(angle);
  const bracket: Expr = {
    kind: "add",
    terms: [{ kind: "fn", name: "cos", arg: theta }, { kind: "mul", factors: [I, { kind: "fn", name: "sin", arg: theta }] }],
  };
  const rho = toExpr(modulus);
  return isOne(rho) ? bracket : { kind: "mul", factors: [rho, bracket] };
}

/** Forma esponenziale ρ·e^(iθ); il modulo 1 non si scrive. */
export function exponentialForm(modulus: ExprLike, angle: Rational): Expr {
  const turn: Expr = { kind: "mul", factors: [I, angleExpr(angle.abs())] };
  const exponent: Expr = angle.isZero() ? numberExpr(Rational.ZERO) : angle.sign() < 0 ? { kind: "neg", arg: turn } : turn;
  const power: Expr = { kind: "pow", base: E, exp: exponent };
  const rho = toExpr(modulus);
  return isOne(rho) ? power : { kind: "mul", factors: [rho, power] };
}

/** Radice n-esima esatta di un razionale positivo, se è un numero con radici quadrate; altrimenti null. */
function surdRoot(value: Rational, index: number): Surd | null {
  const exactRoot = (n: bigint, k: number): bigint | null => {
    const r = iroot(n, k);
    return r ** BigInt(k) === n ? r : null;
  };
  // Prima la radice n-esima esatta; poi, per n pari, la radice (n/2)-esima sotto radice quadrata.
  for (const [k, squareRoot] of [[index, false], [index / 2, true]] as const) {
    if (!Number.isInteger(k) || k < 1) continue;
    const n = exactRoot(value.n, k);
    const d = exactRoot(value.d, k);
    if (n !== null && d !== null) return squareRoot ? Surd.sqrt(Rational.of(n, d)) : Surd.from(Rational.of(n, d));
  }
  return null;
}

/** Una radice n-esima di un numero complesso. */
export interface ComplexRoot {
  /** Il modulo ⁿ√ρ, uguale per tutte le radici. */
  readonly modulus: Expr;
  /** L'argomento (θ + 2kπ)/n, come multiplo razionale di π. */
  readonly angle: Rational;
  /** La radice in forma algebrica esatta, quando modulo e argomento lo permettono; altrimenti null. */
  readonly value: Complex | null;
}

/**
 * Le n radici n-esime di z: stesso modulo ⁿ√ρ, argomenti (θ + 2kπ)/n per k = 0, …, n−1, con θ
 * argomento principale. null se z è zero o se il suo argomento non è un multiplo di π/12.
 */
export function complexRoots(z: Complex, n: number): ComplexRoot[] | null {
  if (!Number.isInteger(n) || n < 2 || n > 24) throw new EngineError("complexRoots: l'indice deve essere un intero tra 2 e 24.");
  const theta = argumentOf(z);
  if (!theta) return null;
  const norm = z.norm();
  // |z| = √(a² + b²), quindi ⁿ√|z| è la radice di indice 2n di a² + b².
  const modulus = simplify({ kind: "root", index: 2 * n, arg: surdToExpr(norm) });
  const exactModulus = norm.isRational() ? surdRoot(norm.toRational(), 2 * n) : null;
  return Array.from({ length: n }, (_, k) => {
    const angle = theta.add(2 * k).div(n);
    const unit = notableUnit(angle);
    const value = unit && exactModulus ? new Complex(unit.re.mul(exactModulus), unit.im.mul(exactModulus)) : null;
    return { modulus, angle, value };
  });
}

/** Potenza con la formula di De Moivre, in modulo e argomento: ρⁿ e nθ riportato in (−π, π]. */
export function polarPower(modulus: ExprLike, angle: Rational, exponent: number): PolarForm {
  if (!Number.isInteger(exponent)) throw new EngineError("polarPower: l'esponente deve essere intero.");
  return {
    modulus: simplify({ kind: "pow", base: toExpr(modulus), exp: numberExpr(Rational.of(exponent)) }),
    angle: normalizeAngle(angle.mul(exponent)),
  };
}
