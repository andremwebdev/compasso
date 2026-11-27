// Strumenti comuni ai generatori di equazioni (V1.M05): valori esatti con le radici quadrate (Surd),
// insiemi di soluzioni scritti come punti, e la verifica indipendente «dai candidati»: le soluzioni
// sono gli zeri reali di uno o più polinomi (trovati dal motore) che rendono vera l'equazione di partenza.

import { surdToExpr } from "../../motore/algebra/expand";
import { exprToUPoly, expand } from "../../motore/algebra/expand";
import type { UPoly } from "../../motore/algebra/upoly";
import { realZeros } from "../../motore/display";
import { EngineError } from "../../motore/errors";
import { add, mul, neg, num, pow, sub, toLatex, type Expr } from "../../motore/expr";
import { Rational } from "../../motore/numbers/rational";
import { Surd } from "../../motore/numbers/surd";
import { allReals, emptySet, points, setsEqual, setToLatex, type RealSet, type SolutionSet } from "../../motore/sets";

/**
 * Il valore esatto dell'espressione quando la variabile vale `value`; null dove non è definita
 * (denominatore nullo, radice di un numero negativo) o dove il valore non si scrive con una sola
 * radice quadrata (radice di un numero irrazionale). Lancia EngineError per funzioni che non conosce.
 */
export function surdAt(expr: Expr, variable: string, value: Surd): Surd | null {
  const visit = (node: Expr): Surd | null => {
    switch (node.kind) {
      case "num":
        return Surd.from(node.value);
      case "sym":
        if (node.name !== variable) throw new EngineError(`surdAt: variabile inattesa «${node.name}».`);
        return value;
      case "neg": {
        const inner = visit(node.arg);
        return inner && inner.neg();
      }
      case "add": {
        let total = Surd.ZERO;
        for (const term of node.terms) {
          const part = visit(term);
          if (!part) return null;
          total = total.add(part);
        }
        return total;
      }
      case "mul": {
        let total = Surd.ONE;
        for (const factor of node.factors) {
          const part = visit(factor);
          if (!part) return null;
          total = total.mul(part);
        }
        return total;
      }
      case "div": {
        const top = visit(node.num);
        const bottom = visit(node.den);
        if (!top || !bottom || bottom.isZero()) return null;
        return top.div(bottom);
      }
      case "pow": {
        const base = visit(node.base);
        if (node.exp.kind !== "num" || !node.exp.value.isInteger()) throw new EngineError("surdAt: esponente non intero.");
        const exponent = node.exp.value.toInteger();
        if (!base || (exponent < 0 && base.isZero())) return null;
        return base.pow(exponent);
      }
      case "root": {
        if (node.index !== 2) throw new EngineError("surdAt: solo radici quadrate.");
        const inner = visit(node.arg);
        if (!inner || inner.sign() < 0 || !inner.isRational()) return null;
        return Surd.sqrt(inner.toRational());
      }
      case "abs": {
        const inner = visit(node.arg);
        return inner && (inner.sign() < 0 ? inner.neg() : inner);
      }
      case "const":
      case "fn":
      case "log":
        throw new EngineError("surdAt: l'espressione non è algebrica.");
    }
  };
  return visit(expr);
}

/** Vero se x = value rende uguali i due membri, tutti e due definiti (conti esatti). */
export function satisfies(left: Expr, right: Expr, value: Surd, variable = "x"): boolean {
  const l = surdAt(left, variable, value);
  const r = surdAt(right, variable, value);
  return l !== null && r !== null && l.eq(r);
}

/** Il valore esatto di un'espressione costante (radici quadrate comprese). */
export function constantValue(expr: Expr): Surd {
  const value = surdAt(expr, "x", Surd.ZERO);
  if (!value) throw new EngineError("constantValue: numero non rappresentabile.");
  return value;
}

/** Gli zeri reali esatti di un'espressione polinomiale, crescenti; null se il motore non li sa trovare. */
export function polynomialZeros(expr: Expr, variable = "x"): Surd[] | null {
  try {
    return realZeros(expand(expr), variable).map(constantValue);
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

/** Il polinomio (sviluppato) dell'espressione; null se non è un polinomio. */
export const polynomialOf = (expr: Expr): UPoly | null => exprToUPoly(expand(expr));

/** I numeri in ordine crescente, senza ripetizioni. */
export function sortedDistinct(values: readonly Surd[]): Surd[] {
  const sorted = [...values].sort((a, b) => a.cmp(b));
  return sorted.filter((value, index) => index === 0 || !value.eq(sorted[index - 1] as Surd));
}

/** L'insieme delle soluzioni {a; b; …}, in ordine crescente (vuoto se non ce ne sono). */
export function pointSet(values: readonly Surd[]): RealSet {
  const distinct = sortedDistinct(values);
  return distinct.length === 0 ? emptySet : points(...distinct.map(surdToExpr));
}

export { allReals, emptySet };

/**
 * Verifica comune: le soluzioni sono gli zeri dei polinomi candidati (un'equazione di partenza
 * ridotta a «polinomio = 0» per un'altra strada) che rendono vera l'equazione di partenza.
 * Restituisce l'insieme ottenuto così, oppure null se un polinomio non si sa risolvere.
 */
export function solutionsFromCandidates(candidates: readonly Expr[], holds: (value: Surd) => boolean): RealSet | null {
  const zeros: Surd[] = [];
  for (const candidate of candidates) {
    const found = polynomialZeros(candidate);
    if (!found) return null;
    zeros.push(...found);
  }
  return pointSet(zeros.filter(holds));
}

/** Vero se i due insiemi sono uguali. */
export const sameSet = (a: SolutionSet, b: SolutionSet): boolean => setsEqual(a, b);

/** «S = {…}» in LaTeX. */
export const solutionLatex = (set: SolutionSet): string => `S = ${setToLatex(set)}`;

/** Un numero razionale è «pulito» se ha numeratore e denominatore piccoli (per le risposte sbagliate). */
export function isClean(value: Rational, maxInteger = 40, maxDenominator = 12): boolean {
  const top = value.n < 0n ? -value.n : value.n;
  return top <= BigInt(maxInteger) && value.d <= BigInt(maxDenominator);
}

/** Vero se tutti i numeri dell'insieme (parte razionale e coefficienti delle radici) sono puliti. */
export function cleanSurds(values: readonly Surd[], maxInteger = 40, maxDenominator = 12): boolean {
  return values.every(
    (value) =>
      Math.abs(value.toNumber()) <= maxInteger &&
      surdDenominator(value) <= maxDenominator &&
      value.terms.every(([radicand, coefficient]) => radicand <= BigInt(maxInteger) && isClean(coefficient, maxInteger, maxDenominator)),
  );
}

/** Il denominatore comune dei coefficienti di un numero con radici. */
function surdDenominator(value: Surd): number {
  let d = 1;
  for (const [, coefficient] of value.terms) d = lcmNumber(d, Number(coefficient.d));
  return d;
}

function lcmNumber(a: number, b: number): number {
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
  return (a / g(a, b)) * b;
}

/** Il binomio x − r (x + |r| se r è negativo); x se r è zero. */
export function xMinus(r: Rational | number, variable: Expr = { kind: "sym", name: "x" }): Expr {
  const value = Rational.from(r);
  if (value.isZero()) return variable;
  return value.sign() > 0 ? sub(variable, num(value)) : add(variable, num(value.neg()));
}

/** c·x^k scritto a mano: x, −x, 3x², senza il coefficiente 1. */
export function monomial(coefficient: Rational | number, degree: number, variable: Expr = { kind: "sym", name: "x" }): Expr {
  const c = Rational.from(coefficient);
  if (degree === 0) return num(c);
  const power = degree === 1 ? variable : pow(variable, degree);
  if (c.eq(1)) return power;
  if (c.eq(-1)) return neg(power);
  return mul(num(c), power);
}

/** Il LaTeX di un numero esatto con radici. */
export const surdLatex = (value: Surd): string => toLatex(surdToExpr(value));

/** Un passaggio della soluzione: testo e, se c'è, una formula a centro pagina. */
export const step = (text: string, formula?: string): { readonly text: string } => ({ text: formula === undefined ? text : `${text}\n\n$$${formula}$$` });
