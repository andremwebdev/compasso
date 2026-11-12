// Derivata simbolica (specifica, sezione 6): somma, prodotto, quoziente, potenza, composizione e
// tutte le funzioni elementari della tabella. Serve ai generatori di derivate e a verificare le
// primitive: il motore non integra, deriva la primitiva e la confronta con la funzione integranda.

import { simplify } from "../algebra/simplify";
import { equivalent } from "../equivalence/equivalence";
import { abs, add, cos, div, fn, ln, mul, neg, num, pow, root, sin, sqrt, sub } from "../expr/build";
import type { Expr, FunctionName } from "../expr/types";
import { some } from "../expr/walk";

/** Le regole di derivazione, con il nome da mostrare nei passaggi. */
export const derivativeRules = {
  constant: "derivata di una costante",
  variable: "derivata della variabile",
  sum: "derivata di una somma",
  constantMultiple: "costante per funzione",
  product: "derivata del prodotto",
  quotient: "derivata del quoziente",
  power: "derivata di una potenza",
  exponential: "derivata dell'esponenziale",
  generalPower: "derivata di una potenza con base ed esponente variabili",
  root: "derivata di una radice",
  absolute: "derivata del valore assoluto",
  function: "derivata di una funzione elementare",
  logarithm: "derivata del logaritmo",
  chain: "derivata della funzione composta",
} as const;

export type DerivativeRule = keyof typeof derivativeRules;

/** Una regola applicata a una parte dell'espressione. */
export interface DerivativeStep {
  readonly rule: DerivativeRule;
  /** La parte derivata. */
  readonly expr: Expr;
  /** La sua derivata, pulita. */
  readonly derivative: Expr;
}

const ZERO = num(0);
const ONE = num(1);

/** Derivata esterna di una funzione elementare, calcolata nell'argomento u (senza il fattore u′). */
function outerDerivative(name: FunctionName, u: Expr): Expr {
  switch (name) {
    case "sin":
      return cos(u);
    case "cos":
      return neg(sin(u));
    case "tan":
      return div(1, pow(cos(u), 2));
    case "cot":
      return neg(div(1, pow(sin(u), 2)));
    case "arcsin":
      return div(1, sqrt(sub(1, pow(u, 2))));
    case "arccos":
      return neg(div(1, sqrt(sub(1, pow(u, 2)))));
    case "arctan":
      return div(1, add(1, pow(u, 2)));
    case "ln":
      return div(1, u);
  }
}

class Deriver {
  readonly steps: DerivativeStep[] = [];

  constructor(private readonly variable: string) {}

  private depends(expr: Expr): boolean {
    return some(expr, (node) => node.kind === "sym" && node.name === this.variable);
  }

  private isVariable(expr: Expr): boolean {
    return expr.kind === "sym" && expr.name === this.variable;
  }

  /** Derivata non pulita di un nodo; registra la regola usata. */
  derive(expr: Expr): Expr {
    if (!this.depends(expr)) return ZERO;
    if (this.isVariable(expr)) return ONE;
    const position = this.steps.length;
    const [rule, result] = this.apply(expr);
    // La regola del nodo va prima di quelle usate per le sue parti.
    this.steps.splice(position, 0, { rule, expr, derivative: simplify(result) });
    return result;
  }

  /** Moltiplica per la derivata dell'argomento, se l'argomento non è la variabile stessa (regola della catena). */
  private chain(outer: Expr, inner: Expr, rule: DerivativeRule): [DerivativeRule, Expr] {
    if (this.isVariable(inner)) return [rule, outer];
    return ["chain", mul(outer, this.derive(inner))];
  }

  private apply(expr: Expr): [DerivativeRule, Expr] {
    switch (expr.kind) {
      case "num":
      case "const":
        return ["constant", ZERO];
      case "sym":
        return ["variable", ONE];
      case "add":
        return ["sum", add(...expr.terms.map((term) => this.derive(term)))];
      case "neg":
        return ["constantMultiple", neg(this.derive(expr.arg))];
      case "mul": {
        const constants = expr.factors.filter((factor) => !this.depends(factor));
        const moving = expr.factors.filter((factor) => this.depends(factor));
        if (moving.length === 1) return ["constantMultiple", mul(...constants, this.derive(moving[0] as Expr))];
        const terms = moving.map((factor, index) => mul(...constants, this.derive(factor), ...moving.filter((_, other) => other !== index)));
        return ["product", add(...terms)];
      }
      case "div": {
        const { num: f, den: g } = expr;
        if (!this.depends(g)) return ["constantMultiple", div(this.derive(f), g)];
        if (!this.depends(f)) return ["quotient", neg(div(mul(f, this.derive(g)), pow(g, 2)))];
        return ["quotient", div(sub(mul(this.derive(f), g), mul(f, this.derive(g))), pow(g, 2))];
      }
      case "pow": {
        const { base: u, exp: v } = expr;
        if (!this.depends(v)) return this.chain(mul(v, pow(u, sub(v, 1))), u, "power");
        if (!this.depends(u)) {
          const outer = u.kind === "const" && u.name === "e" ? expr : mul(expr, ln(u));
          return this.chain(outer, v, "exponential");
        }
        // f^g = e^(g·ln f): la derivata è f^g·(g′·ln f + g·f′/f).
        return ["generalPower", mul(expr, add(mul(this.derive(v), ln(u)), div(mul(v, this.derive(u)), u)))];
      }
      case "root": {
        const outer = div(1, mul(expr.index, expr.index === 2 ? expr : pow(root(expr.index, expr.arg), expr.index - 1)));
        return this.chain(outer, expr.arg, "root");
      }
      case "abs":
        return this.chain(div(expr.arg, abs(expr.arg)), expr.arg, "absolute");
      case "fn":
        return this.chain(outerDerivative(expr.name, expr.arg), expr.arg, "function");
      case "log": {
        if (this.depends(expr.base)) return ["logarithm", this.derive(div(fn("ln", expr.arg), fn("ln", expr.base)))];
        return this.chain(div(1, mul(expr.arg, ln(expr.base))), expr.arg, "logarithm");
      }
    }
  }
}

/** Derivata dell'espressione rispetto alla variabile, pulita con simplify. */
export function derive(expr: Expr, variable = "x"): Expr {
  return simplify(new Deriver(variable).derive(expr));
}

/** Derivata n-esima. */
export function deriveTimes(expr: Expr, times: number, variable = "x"): Expr {
  let result = expr;
  for (let k = 0; k < times; k++) result = derive(result, variable);
  return result;
}

/**
 * Derivata con l'elenco delle regole usate, dalla più esterna alla più interna: serve a comporre i
 * passaggi di una soluzione («regola del prodotto, poi della catena…»).
 */
export function deriveWithSteps(expr: Expr, variable = "x"): { readonly result: Expr; readonly steps: readonly DerivativeStep[] } {
  const deriver = new Deriver(variable);
  const result = simplify(deriver.derive(expr));
  return { result, steps: deriver.steps };
}

/**
 * Vero se `primitive` è una primitiva di `integrand`: la si deriva e si confronta. La costante di
 * integrazione non conta, perché sparisce derivando.
 */
export function isAntiderivative(primitive: Expr, integrand: Expr, variable = "x"): boolean {
  return equivalent(derive(primitive, variable), integrand);
}
