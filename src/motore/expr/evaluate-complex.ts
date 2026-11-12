// Valutazione numerica complessa di un'espressione. Serve al confronto numerico delle espressioni
// che contengono l'unità immaginaria fuori dalla forma polinomiale (e^{iπ}, forme trigonometriche).
// Dove l'espressione è reale e definita nei reali dà lo stesso valore di evaluate.

import { literalRational, realPower, type Environment } from "./evaluate";
import { functionTable } from "./functions";
import type { Expr } from "./types";

/** Numero complesso approssimato. */
export interface ComplexValue {
  readonly re: number;
  readonly im: number;
}

const NOT_A_NUMBER: ComplexValue = { re: NaN, im: NaN };
const real = (value: number): ComplexValue => ({ re: value, im: 0 });
const isReal = (z: ComplexValue): boolean => z.im === 0;
const defined = (z: ComplexValue): boolean => Number.isFinite(z.re) && Number.isFinite(z.im);

const addC = (a: ComplexValue, b: ComplexValue): ComplexValue => ({ re: a.re + b.re, im: a.im + b.im });
const mulC = (a: ComplexValue, b: ComplexValue): ComplexValue => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });

function divC(a: ComplexValue, b: ComplexValue): ComplexValue {
  const norm = b.re * b.re + b.im * b.im;
  if (norm === 0) return NOT_A_NUMBER;
  return { re: (a.re * b.re + a.im * b.im) / norm, im: (a.im * b.re - a.re * b.im) / norm };
}

const expC = (z: ComplexValue): ComplexValue => ({ re: Math.exp(z.re) * Math.cos(z.im), im: Math.exp(z.re) * Math.sin(z.im) });

/** Logaritmo principale: ln|z| + i·arg(z), con arg in (−π, π]. */
function logC(z: ComplexValue): ComplexValue {
  if (z.re === 0 && z.im === 0) return NOT_A_NUMBER;
  return { re: Math.log(Math.hypot(z.re, z.im)), im: Math.atan2(z.im, z.re) };
}

/** Potenza principale z^w = e^(w·Log z). */
function powC(z: ComplexValue, w: ComplexValue): ComplexValue {
  if (z.re === 0 && z.im === 0) return w.re > 0 ? real(0) : NOT_A_NUMBER;
  if (isReal(w) && Number.isInteger(w.re) && Math.abs(w.re) <= 64) {
    let result = real(1);
    for (let k = 0; k < Math.abs(w.re); k++) result = mulC(result, z);
    return w.re < 0 ? divC(real(1), result) : result;
  }
  return expC(mulC(w, logC(z)));
}

const sinC = (z: ComplexValue): ComplexValue => ({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
const cosC = (z: ComplexValue): ComplexValue => ({ re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) });

/**
 * Valore complesso dell'espressione nel punto dato (le variabili hanno valori reali).
 * Le due parti sono NaN dove l'espressione non è definita.
 */
export function evaluateComplex(expr: Expr, env: Environment = {}): ComplexValue {
  const value = visit(expr, env);
  return defined(value) ? value : NOT_A_NUMBER;
}

function visit(expr: Expr, env: Environment): ComplexValue {
  switch (expr.kind) {
    case "num":
      return real(expr.value.toNumber());
    case "sym":
      return real(env[expr.name] ?? NaN);
    case "const":
      return expr.name === "i" ? { re: 0, im: 1 } : real(expr.name === "pi" ? Math.PI : Math.E);
    case "add":
      return expr.terms.reduce((sum, term) => addC(sum, visit(term, env)), real(0));
    case "neg": {
      const arg = visit(expr.arg, env);
      return { re: -arg.re, im: -arg.im };
    }
    case "mul":
      return expr.factors.reduce((product, factor) => mulC(product, visit(factor, env)), real(1));
    case "div":
      return divC(visit(expr.num, env), visit(expr.den, env));
    case "pow": {
      const base = visit(expr.base, env);
      const exponent = visit(expr.exp, env);
      if (isReal(base) && isReal(exponent)) {
        // Base ed esponente reali: se la potenza esiste nei reali vale quella ((−8)^(1/3) = −2).
        const direct = realPower(base.re, exponent.re, literalRational(expr.exp));
        if (!Number.isNaN(direct)) return real(direct);
      }
      return powC(base, exponent);
    }
    case "root": {
      const arg = visit(expr.arg, env);
      if (isReal(arg)) {
        if (arg.re >= 0) return real(Math.pow(arg.re, 1 / expr.index));
        // Indice dispari: la radice reale; radice quadrata di un negativo: i·√|x|.
        if (expr.index % 2 === 1) return real(-Math.pow(-arg.re, 1 / expr.index));
        if (expr.index === 2) return { re: 0, im: Math.sqrt(-arg.re) };
      }
      return powC(arg, real(1 / expr.index));
    }
    case "abs": {
      const arg = visit(expr.arg, env);
      return real(Math.hypot(arg.re, arg.im));
    }
    case "fn": {
      const arg = visit(expr.arg, env);
      switch (expr.name) {
        case "sin":
          return sinC(arg);
        case "cos":
          return cosC(arg);
        case "tan":
          return divC(sinC(arg), cosC(arg));
        case "cot":
          return divC(cosC(arg), sinC(arg));
        case "ln":
          return logC(arg);
        case "arcsin":
        case "arccos":
        case "arctan":
          // Le funzioni inverse si usano solo con argomento reale.
          return isReal(arg) ? real(functionTable[expr.name].evaluate(arg.re)) : NOT_A_NUMBER;
      }
    }
    case "log":
      return divC(logC(visit(expr.arg, env)), logC(visit(expr.base, env)));
  }
}
