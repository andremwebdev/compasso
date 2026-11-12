// Funzioni di visita dell'albero: figli, ricerca, variabili, sostituzione.

import { PLACEHOLDER, type Expr } from "./types";

/** I figli diretti di un nodo, nell'ordine in cui compaiono. */
export function children(expr: Expr): readonly Expr[] {
  switch (expr.kind) {
    case "num":
    case "sym":
    case "const":
      return [];
    case "add":
      return expr.terms;
    case "mul":
      return expr.factors;
    case "neg":
    case "abs":
    case "root":
    case "fn":
      return [expr.arg];
    case "div":
      return [expr.num, expr.den];
    case "pow":
      return [expr.base, expr.exp];
    case "log":
      return [expr.base, expr.arg];
  }
}

/** Ricostruisce un nodo con i figli trasformati da `f` (stesso tipo, stessa forma). */
export function mapChildren(expr: Expr, f: (child: Expr) => Expr): Expr {
  switch (expr.kind) {
    case "num":
    case "sym":
    case "const":
      return expr;
    case "add":
      return { ...expr, terms: expr.terms.map(f) };
    case "mul":
      return { ...expr, factors: expr.factors.map(f) };
    case "neg":
    case "abs":
    case "root":
    case "fn":
      return { ...expr, arg: f(expr.arg) };
    case "div":
      return { ...expr, num: f(expr.num), den: f(expr.den) };
    case "pow":
      return { ...expr, base: f(expr.base), exp: f(expr.exp) };
    case "log":
      return { ...expr, base: f(expr.base), arg: f(expr.arg) };
  }
}

/** Vero se il nodo o un suo discendente soddisfa il test. */
export function some(expr: Expr, test: (node: Expr) => boolean): boolean {
  return test(expr) || children(expr).some((child) => some(child, test));
}

/** I nomi delle variabili che compaiono, in ordine alfabetico (il segnaposto del parser non conta). */
export function variables(expr: Expr): string[] {
  const names = new Set<string>();
  const visit = (node: Expr): void => {
    if (node.kind === "sym" && node.name !== PLACEHOLDER) names.add(node.name);
    children(node).forEach(visit);
  };
  visit(expr);
  return [...names].sort();
}

/** Vero se non contiene variabili: è una costante (può contenere π, e, radici, funzioni). */
export function isConstant(expr: Expr): boolean {
  return !some(expr, (node) => node.kind === "sym");
}

/** Vero se contiene un numero scritto come decimale. */
export function containsDecimal(expr: Expr): boolean {
  return some(expr, (node) => node.kind === "num" && node.decimals !== undefined);
}

/** Vero se l'espressione è incompleta (contiene il segnaposto del parser). */
export function isIncomplete(expr: Expr): boolean {
  return some(expr, (node) => node.kind === "sym" && node.name === PLACEHOLDER);
}

/** Sostituisce le variabili indicate con le espressioni date. */
export function substitute(expr: Expr, replacements: Readonly<Record<string, Expr>>): Expr {
  if (expr.kind === "sym") return replacements[expr.name] ?? expr;
  return mapChildren(expr, (child) => substitute(child, replacements));
}

/** Uguaglianza di struttura: stessi nodi nello stesso ordine (x+1 e 1+x sono diversi). */
export function sameStructure(a: Expr, b: Expr): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "num":
      return a.value.eq((b as typeof a).value) && a.decimals === (b as typeof a).decimals;
    case "sym":
    case "const":
      return a.name === (b as typeof a).name;
    case "root":
      if (a.index !== (b as typeof a).index) return false;
      break;
    case "fn":
      if (a.name !== (b as typeof a).name) return false;
      break;
    default:
      break;
  }
  const ca = children(a);
  const cb = children(b);
  return ca.length === cb.length && ca.every((child, index) => sameStructure(child, cb[index] as Expr));
}

/**
 * Chiave di struttura: due espressioni hanno la stessa chiave se e solo se sono scritte allo stesso
 * modo (stessi nodi nello stesso ordine). Serve a raggruppare fattori e termini uguali.
 */
export function exprKey(expr: Expr): string {
  switch (expr.kind) {
    case "num":
      return expr.decimals === undefined ? `#${expr.value.toString()}` : `#${expr.value.toString()}d${expr.decimals}`;
    case "sym":
      return expr.name;
    case "const":
      return `@${expr.name}`;
    case "add":
      return `add(${expr.terms.map(exprKey).join(",")})`;
    case "mul":
      return `mul(${expr.factors.map(exprKey).join(",")})`;
    case "neg":
      return `neg(${exprKey(expr.arg)})`;
    case "abs":
      return `abs(${exprKey(expr.arg)})`;
    case "root":
      return `root${expr.index}(${exprKey(expr.arg)})`;
    case "fn":
      return `${expr.name}(${exprKey(expr.arg)})`;
    case "div":
      return `div(${exprKey(expr.num)},${exprKey(expr.den)})`;
    case "pow":
      return `pow(${exprKey(expr.base)},${exprKey(expr.exp)})`;
    case "log":
      return `log(${exprKey(expr.base)},${exprKey(expr.arg)})`;
  }
}
