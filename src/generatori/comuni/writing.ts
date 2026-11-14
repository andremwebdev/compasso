// Scrivere le espressioni «come su un quaderno» (REGOLE.md, «Scrittura a mano»): coefficienti
// frazionari, somme senza termini nulli, prodotti senza parentesi inutili. Serve ai generatori di
// Analisi che costruiscono primitive e soluzioni pezzo per pezzo.

import { add, div, frac, mul, neg, num, pow, sym, toLatex, type Expr } from "../../motore/expr";

const x = sym("x");

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Vero se l'espressione è il numero zero. */
export const isZero = (expr: Expr): boolean => expr.kind === "num" && expr.value.sign() === 0;

/** Separa il coefficiente intero dal resto: 6x·f → [6, x·f]; −f → [−1, f]; 4 → [4, null]. I prodotti annidati si sciolgono. */
function splitCoefficient(expr: Expr): [coefficient: number, rest: Expr | null] {
  if (expr.kind === "neg") {
    const [c, rest] = splitCoefficient(expr.arg);
    return [-c, rest];
  }
  if (expr.kind === "num") return expr.value.isInteger() ? [Number(expr.value.n), null] : [1, expr];
  if (expr.kind !== "mul") return [1, expr];
  let coefficient = 1;
  const factors: Expr[] = [];
  for (const factor of expr.factors) {
    const [c, rest] = splitCoefficient(factor);
    coefficient *= c;
    if (rest) factors.push(...(rest.kind === "mul" ? rest.factors : [rest]));
  }
  return [coefficient, factors.length === 0 ? null : factors.length === 1 ? (factors[0] as Expr) : mul(...factors)];
}

/** k·rest con il coefficiente davanti e senza prodotti annidati. */
function withCoefficient(k: number, rest: Expr | null): Expr {
  if (k === 0) return num(0);
  if (!rest) return num(k);
  const body = Math.abs(k) === 1 ? rest : mul(Math.abs(k), ...(rest.kind === "mul" ? rest.factors : [rest]));
  return k < 0 ? neg(body) : body;
}

/** k·expr scritto a mano: expr, −expr, 3·expr; zero se k = 0. Un coefficiente già presente si moltiplica. */
export function times(k: number, expr: Expr): Expr {
  const [c, rest] = splitCoefficient(expr);
  return withCoefficient(k * c, rest);
}

/** Il prodotto dei fattori scritto a mano: un solo coefficiente davanti, nessuna parentesi inutile. */
export const product = (...factors: (Expr | number)[]): Expr => times(1, mul(...factors));

/**
 * (p/q)·(c₁·e₁ + c₂·e₂ + …)·factor scritto a mano: il fattore comune dei coefficienti esce dalla
 * parentesi e si semplifica con q, e il primo termine della parentesi è positivo.
 * (4x² + 4x + 2)·e^{−2x}/(−8) diventa −(2x² + 2x + 1)·e^{−2x}/4.
 */
export function combination(p: number, q: number, parts: readonly (readonly [coefficient: number, term: Expr])[], factor?: Expr): Expr {
  const kept = parts.filter(([c]) => c !== 0);
  if (kept.length === 0) return num(0);
  const common = kept.reduce((g, [c]) => gcd(g, Math.abs(c)), 0) * Math.sign((kept[0] as readonly [number, Expr])[0]);
  const bracket = sum(...kept.map(([c, term]) => times(c / common, term)));
  return scaled(p * common, q, factor ? product(bracket, factor) : bracket);
}

/** (p/q)·expr scritto a mano: la frazione è ridotta, il meno sta davanti, il denominatore sotto tutta l'espressione. */
export function scaled(p: number, q: number, expr: Expr): Expr {
  const [c, rest] = splitCoefficient(expr);
  const top = p * c;
  if (top === 0) return num(0);
  const sign = Math.sign(top) * Math.sign(q);
  const g = gcd(Math.abs(top), Math.abs(q));
  const [n, d] = [Math.abs(top) / g, Math.abs(q) / g];
  if (!rest) return frac(sign * n, d);
  const body = d === 1 ? withCoefficient(n, rest) : div(withCoefficient(n, rest), d);
  return sign < 0 ? neg(body) : body;
}

/** La somma dei termini non nulli (zero se non ne resta nessuno). */
export function sum(...terms: Expr[]): Expr {
  // Una somma dentro la somma si scioglie nei suoi termini: niente parentesi inutili.
  const kept = terms.flatMap((term) => (term.kind === "add" ? term.terms : [term])).filter((term) => !isZero(term));
  return kept.length === 0 ? num(0) : kept.length === 1 ? (kept[0] as Expr) : add(...kept);
}

/** xⁿ scritto a mano: 1, x, x². */
export const power = (n: number): Expr => (n === 0 ? num(1) : n === 1 ? x : pow(x, n));

/** a·x + b scritto a mano. */
export const linear = (a: number, b: number): Expr => sum(times(a, x), num(b));

/** a·x + b come argomento di una funzione: con a negativo e b positivo si scrive b − |a|x (1 − 2x, non −2x + 1). */
export const inside = (a: number, b: number): Expr => (a < 0 && b > 0 ? sum(num(b), times(a, x)) : linear(a, b));

/** uⁿ senza l'esponente 1. */
export const powerOf = (base: Expr, n: number): Expr => (n === 1 ? base : pow(base, n));

/** (a·x + b)·f senza parentesi inutili: x·f, 3x·f, (2x − 1)·f. */
export function linearTimes(a: number, b: number, f: Expr): Expr {
  if (b !== 0) return mul(linear(a, b), f);
  if (a === 0) return num(0);
  const body = Math.abs(a) === 1 ? mul(x, f) : mul(Math.abs(a), x, f);
  return a < 0 ? neg(body) : body;
}

/** n/bottom con il meno davanti alla frazione. */
export const over = (n: number, bottom: Expr): Expr => (n === 0 ? num(0) : n < 0 ? neg(div(num(-n), bottom)) : div(num(n), bottom));

/** Il LaTeX di ∫ f dx; una somma va tra parentesi. */
export function integralLatex(f: Expr, bounds?: { readonly from: string; readonly to: string }): string {
  const body = f.kind === "add" || f.kind === "neg" ? `\\left(${toLatex(f)}\\right)` : toLatex(f);
  return `\\int${bounds ? `_{${bounds.from}}^{${bounds.to}}` : ""} ${body}\\,dx`;
}
