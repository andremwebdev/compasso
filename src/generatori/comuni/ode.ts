// Pezzi comuni ai generatori di equazioni differenziali (V2.M12): scrittura delle equazioni e
// verifica indipendente per sostituzione simbolica.

import type { CauchyCondition } from "../../esercizi";
import { ODE_SYMBOLS } from "../../esercizi";
import { derive } from "../../motore/calculus/derive";
import { equivalent } from "../../motore/equivalence/equivalence";
import { add, neg, num, sym, toLatex, type Expr } from "../../motore/expr";
import { substitute, variables } from "../../motore/expr/walk";

export const Y = sym(ODE_SYMBOLS.y);
export const DY = sym(ODE_SYMBOLS.first);
export const DDY = sym(ODE_SYMBOLS.second);

/** I nomi con cui le derivate compaiono nel testo. */
const NAMES: Record<string, string> = { [ODE_SYMBOLS.y]: "y", [ODE_SYMBOLS.first]: "y'", [ODE_SYMBOLS.second]: "y''" };

/**
 * Combinazione lineare scritta a mano: [[1, "y''"], [−3, "y'"], [2, "y"]] → «y'' − 3y' + 2y».
 * I coefficienti sono interi oppure LaTeX già pronti (come \frac{2}{x}).
 */
export function combinationLatex(terms: readonly (readonly [coefficient: number | string, name: string])[]): string {
  let out = "";
  for (const [coefficient, name] of terms) {
    if (coefficient === 0) continue;
    if (typeof coefficient === "string") {
      out += out === "" ? `${coefficient}${name}` : ` + ${coefficient}${name}`;
      continue;
    }
    const size = Math.abs(coefficient);
    const body = `${size === 1 ? "" : size}${name}`;
    out += out === "" ? `${coefficient < 0 ? "-" : ""}${body}` : ` ${coefficient < 0 ? "-" : "+"} ${body}`;
  }
  return out === "" ? "0" : out;
}

export { NAMES as DERIVATIVE_NAMES };

/** L'equazione (con le condizioni di Cauchy, se ci sono) come display LaTeX. */
export function problemLatex(equation: string, conditions: readonly CauchyCondition[]): string {
  if (conditions.length === 0) return equation;
  const lines = conditions.map((condition) => `y${condition.order === 1 ? "'" : ""}(${toLatex(condition.at)}) = ${toLatex(condition.value)}`);
  return `\\begin{cases} ${[equation, ...lines].join(" \\\\ ")} \\end{cases}`;
}

/** Il testo dell'esercizio. */
export function odePrompt(equation: string, conditions: readonly CauchyCondition[], order: 1 | 2): string {
  const shown = problemLatex(equation, conditions);
  if (conditions.length > 0) return `Risolvi il problema di Cauchy:\n\n$$${shown}$$\n\nScrivi $y$ in funzione di $x$.`;
  const constants = order === 1 ? "una costante arbitraria (per esempio $c$)" : "due costanti arbitrarie (per esempio $c_1$ e $c_2$)";
  return `Trova l'integrale generale dell'equazione differenziale:\n\n$$${shown}$$\n\nScrivi $y$ in funzione di $x$, con ${constants}.`;
}

/**
 * Verifica simbolica, indipendente dalla verifica numerica della valutazione: la funzione,
 * sostituita con le sue derivate nell'equazione `left = right`, la rende un'identità; ha il numero
 * dichiarato di lettere oltre a x; rispetta le condizioni di Cauchy.
 */
export function solvesSymbolically(solution: Expr, left: Expr, right: Expr, constants: number, conditions: readonly CauchyCondition[]): boolean {
  const first = derive(solution, "x");
  const second = derive(first, "x");
  const env = { [ODE_SYMBOLS.y]: solution, [ODE_SYMBOLS.first]: first, [ODE_SYMBOLS.second]: second };
  if (!equivalent(substitute(add(left, neg(right)), env), num(0))) return false;
  if (variables(solution).filter((name) => name !== "x").length !== constants) return false;
  return conditions.every((condition) => equivalent(substitute(condition.order === 0 ? solution : first, { x: condition.at }), condition.value));
}
