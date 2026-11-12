// Valutazione numerica (reale) di un'espressione in un punto. Serve per confrontare risposte e per
// i grafici, mai per calcolare risultati da mostrare: quelli restano esatti.

import type { Rational } from "../numbers/rational";
import { functionTable } from "./functions";
import type { Expr } from "./types";

/** Valori delle variabili. */
export type Environment = Readonly<Record<string, number>>;

/**
 * Valore dell'espressione nel punto dato; NaN se lì non è definita nei reali
 * (denominatore nullo, radice pari di un negativo, logaritmo di un non positivo, variabile senza valore…).
 */
export function evaluate(expr: Expr, env: Environment = {}): number {
  const value = evaluateNode(expr, env);
  return Number.isFinite(value) ? value : NaN;
}

function evaluateNode(expr: Expr, env: Environment): number {
  switch (expr.kind) {
    case "num":
      return expr.value.toNumber();
    case "sym":
      return env[expr.name] ?? NaN;
    case "const":
      // L'unità immaginaria non ha valore reale: la valutazione complessa è un modulo a parte.
      return expr.name === "pi" ? Math.PI : expr.name === "e" ? Math.E : NaN;
    case "add":
      return expr.terms.reduce((sum, term) => sum + evaluateNode(term, env), 0);
    case "neg":
      return -evaluateNode(expr.arg, env);
    case "mul":
      return expr.factors.reduce((product, factor) => product * evaluateNode(factor, env), 1);
    case "div": {
      const den = evaluateNode(expr.den, env);
      return den === 0 ? NaN : evaluateNode(expr.num, env) / den;
    }
    case "pow":
      return realPower(evaluateNode(expr.base, env), evaluateNode(expr.exp, env), literalRational(expr.exp));
    case "root": {
      const arg = evaluateNode(expr.arg, env);
      if (arg >= 0) return Math.pow(arg, 1 / expr.index);
      // Radice di indice dispari di un negativo: definita nei reali (∛(−8) = −2).
      return expr.index % 2 === 1 ? -Math.pow(-arg, 1 / expr.index) : NaN;
    }
    case "abs":
      return Math.abs(evaluateNode(expr.arg, env));
    case "fn":
      return functionTable[expr.name].evaluate(evaluateNode(expr.arg, env));
    case "log": {
      const base = evaluateNode(expr.base, env);
      const arg = evaluateNode(expr.arg, env);
      return base > 0 && base !== 1 && arg > 0 ? Math.log(arg) / Math.log(base) : NaN;
    }
  }
}

/** Potenza reale. Con base negativa è definita solo se l'esponente è un razionale con denominatore dispari. */
export function realPower(base: number, exp: number, exactExp: Rational | null): number {
  if (Number.isNaN(base) || Number.isNaN(exp)) return NaN;
  if (base === 0) return exp > 0 ? 0 : NaN;
  if (base > 0) return Math.pow(base, exp);
  if (Number.isInteger(exp)) return Math.pow(base, exp);
  if (exactExp && exactExp.d % 2n === 1n) {
    const magnitude = Math.pow(-base, exp);
    return exactExp.n % 2n === 0n ? magnitude : -magnitude;
  }
  return NaN;
}

/**
 * Se l'espressione è un razionale scritto in modo esplicito (3, −2, 1/3, −(2/5)), lo restituisce;
 * altrimenti null. Serve a riconoscere esponenti come 1/3 senza fare calcoli simbolici.
 */
export function literalRational(expr: Expr): Rational | null {
  switch (expr.kind) {
    case "num":
      return expr.value;
    case "neg": {
      const inner = literalRational(expr.arg);
      return inner ? inner.neg() : null;
    }
    case "div": {
      const n = literalRational(expr.num);
      const d = literalRational(expr.den);
      return n && d && !d.isZero() ? n.div(d) : null;
    }
    default:
      return null;
  }
}
