// Aiuti comuni ai test del motore: lettura veloce, disegno con KaTeX, espressioni casuali.

import katex from "katex";
import { expect } from "vitest";
import { abs, add, cos, div, e, frac, ln, mul, neg, num, pi, pow, sin, sqrt, sym, tan, type Expr } from "../../src/motore/expr";
import { parseExpression } from "../../src/motore/parser";
import type { Rng } from "../../src/motore/random/rng";

/** Legge un'espressione; il test fallisce se il testo non è valido. */
export function parse(text: string, options: { complex?: boolean } = {}): Expr {
  const result = parseExpression(text, options);
  if (!result.ok || !result.complete) throw new Error(`Testo di prova non valido: ${text}`);
  return result.value;
}

/** Controlla che il LaTeX si disegni con KaTeX in modalità rigorosa. */
export function draws(latex: string): void {
  expect(() => katex.renderToString(latex, { throwOnError: true, strict: "error" }), latex).not.toThrow();
}

/** Controlla le formule di un testo ricco ($...$ e $$...$$). */
export function drawsText(text: string): void {
  const parts = text.split(/\$\$?/);
  expect(parts.length % 2, `dollari non bilanciati: ${text}`).toBe(1);
  parts.forEach((part, index) => {
    if (index % 2 === 1) draws(part);
  });
}

/** Copia profonda di un'espressione: oggetti nuovi, stessa struttura. */
export function clone(expr: Expr): Expr {
  return JSON.parse(JSON.stringify(expr, (_, value) => (typeof value === "bigint" ? `${value}n` : value)), (key, value) => {
    if (key === "value" && value && typeof value === "object" && "n" in value) return frac(BigInt(value.n.slice(0, -1)), BigInt(value.d.slice(0, -1))).value;
    return value;
  }) as Expr;
}

/** Un'espressione casuale nelle variabili date, per i controlli a tappeto. */
export function randomExpr(rng: Rng, depth: number, variables: readonly string[] = ["x"]): Expr {
  const leaf = (): Expr => {
    const kind = rng.int(0, 9);
    if (kind <= 3) return sym(rng.pick(variables));
    if (kind <= 6) return num(rng.int(-6, 6));
    if (kind === 7) return frac(rng.int(-5, 5), rng.int(1, 6));
    if (kind === 8) return sqrt(rng.int(2, 12));
    return rng.pick([pi, e]);
  };
  if (depth <= 0) return leaf();
  const sub = (): Expr => randomExpr(rng, depth - 1, variables);
  switch (rng.int(0, 13)) {
    case 0:
    case 1:
      return add(sub(), sub());
    case 2:
      return add(sub(), sub(), sub());
    case 3:
    case 4:
      return mul(sub(), sub());
    case 5:
      return mul(sub(), sub(), sub());
    case 6:
      return div(sub(), sub());
    case 7:
      return neg(sub());
    case 8:
      return pow(sub(), rng.int(-2, 3));
    case 9:
      return sqrt(sub());
    case 10:
      return rng.pick([sin, cos, tan, ln])(sub());
    case 11:
      return abs(sub());
    case 12:
      return pow(e, sub());
    default:
      return leaf();
  }
}
