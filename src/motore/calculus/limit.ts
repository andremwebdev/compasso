// Valori di un limite (specifica, sezione 6): un numero, +∞, −∞ oppure «non esiste».

import { equivalent } from "../equivalence/equivalence";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { parseExpression, type ParseOptions, type ParseResult } from "../parser/parse";

export type LimitValue =
  | { readonly kind: "finite"; readonly value: Expr }
  | { readonly kind: "+inf" }
  | { readonly kind: "-inf" }
  | { readonly kind: "none" };

export const plusInfinity: LimitValue = { kind: "+inf" };
export const minusInfinity: LimitValue = { kind: "-inf" };
/** Il limite non esiste. */
export const noLimit: LimitValue = { kind: "none" };
export const finiteLimit = (value: Expr): LimitValue => ({ kind: "finite", value });

const PLUS = new Set(["+∞", "∞", "+inf", "inf", "+infinito", "infinito", "+oo", "oo", "piùinfinito", "piuinfinito"]);
const MINUS = new Set(["-∞", "-inf", "-infinito", "-oo", "menoinfinito"]);
const NONE = new Set(["∄", "nonesiste", "nessuno", "ne", "n.e."]);

/** Legge un valore di limite: «+∞», «-inf», «non esiste», oppure un'espressione. */
export function parseLimitValue(text: string, options: ParseOptions = {}): ParseResult<LimitValue> {
  const compact = text.toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-");
  if (PLUS.has(compact)) return { ok: true, value: plusInfinity, complete: true };
  if (MINUS.has(compact)) return { ok: true, value: minusInfinity, complete: true };
  if (NONE.has(compact)) return { ok: true, value: noLimit, complete: true };
  const parsed = parseExpression(text, options);
  return parsed.ok ? { ok: true, value: finiteLimit(parsed.value), complete: parsed.complete } : parsed;
}

export function limitsEqual(a: LimitValue, b: LimitValue): boolean {
  if (a.kind === "finite" && b.kind === "finite") return equivalent(a.value, b.value);
  return a.kind === b.kind;
}

export function limitToLatex(value: LimitValue): string {
  switch (value.kind) {
    case "finite":
      return toLatex(value.value);
    case "+inf":
      return "+\\infty";
    case "-inf":
      return "-\\infty";
    case "none":
      return "\\text{non esiste}";
  }
}
