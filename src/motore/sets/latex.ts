// Insiemi di soluzioni in LaTeX, con le convenzioni italiane: punto e virgola tra gli estremi
// (con i decimali la virgola sarebbe ambigua: [1,5; 3]), ∪ tra i pezzi, k ∈ ℤ per le soluzioni periodiche.

import { exactValue } from "../algebra/normalize";
import { simplify } from "../algebra/simplify";
import { EngineError } from "../errors";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { sameStructure } from "../expr/walk";
import { Rational } from "../numbers/rational";
import { canonicalSet, compareEndpoints } from "./operations";
import type { Endpoint, Interval, PeriodicSet, RealSet, SolutionSet } from "./types";

const PI: Expr = { kind: "const", name: "pi" };
const endpointToLatex = (endpoint: Endpoint): string => (endpoint === "-inf" ? "-\\infty" : endpoint === "+inf" ? "+\\infty" : toLatex(endpoint));
/** Vero se il pezzo è un punto isolato. Non lancia mai: serve anche per mostrare un insieme ancora incompleto. */
function isPoint(piece: Interval): boolean {
  if (typeof piece.lower === "string" || typeof piece.upper === "string") return false;
  if (sameStructure(piece.lower, piece.upper)) return true;
  try {
    return compareEndpoints(piece.lower, piece.upper) === 0;
  } catch (error) {
    if (error instanceof EngineError) return false;
    throw error;
  }
}
const symbolToLatex = (variable: string): string => toLatex({ kind: "sym", name: variable });

export interface SetLatexOptions {
  /** La lettera dell'incognita, usata dove serve (soluzioni periodiche, scrittura con le disuguaglianze). Se manca: x. */
  readonly variable?: string;
  /** Vero per mostrare l'insieme com'è scritto, senza portarlo prima in forma canonica (anteprima di quello che scrive Andrea). */
  readonly asWritten?: boolean;
}

function realSetToLatex(set: RealSet): string {
  if (set.pieces.length === 0) return "\\emptyset";
  const parts: string[] = [];
  let pointsRun: string[] = [];
  const flush = (): void => {
    if (pointsRun.length > 0) parts.push(`\\left\\{${pointsRun.join("; ")}\\right\\}`);
    pointsRun = [];
  };
  for (const piece of set.pieces) {
    if (isPoint(piece)) {
      pointsRun.push(endpointToLatex(piece.lower));
      continue;
    }
    flush();
    if (piece.lower === "-inf" && piece.upper === "+inf") parts.push("\\mathbb{R}");
    else parts.push(`\\left${piece.lowerClosed ? "[" : "("}${endpointToLatex(piece.lower)}; ${endpointToLatex(piece.upper)}\\right${piece.upperClosed ? "]" : ")"}`);
  }
  flush();
  return parts.join(" \\cup ");
}

/** Il termine k·periodo come si scrive a mano: 2kπ, kπ, kπ/2, 3k. */
function periodTermLatex(period: Expr): string {
  const withCoefficient = (value: Rational, tail: string): string => {
    const top = `${value.n === 1n ? "" : value.n.toString()}k${tail}`;
    return value.d === 1n ? top : `\\frac{${top}}{${value.d}}`;
  };
  const overPi = exactValue({ kind: "div", num: period, den: PI });
  if (overPi?.isRational() && overPi.sign() > 0) return withCoefficient(overPi.toRational(), "\\pi");
  const plain = exactValue(period);
  if (plain?.isRational() && plain.sign() > 0) return withCoefficient(plain.toRational(), "");
  return toLatex(simplify({ kind: "mul", factors: [{ kind: "sym", name: "k" }, period] }));
}

/** L'estremo a + k·periodo. */
function shiftedLatex(endpoint: Endpoint, periodTerm: string): string {
  if (typeof endpoint === "string") return endpointToLatex(endpoint);
  const isZero = exactValue(endpoint)?.isZero() ?? false;
  return isZero ? periodTerm : `${toLatex(endpoint)} + ${periodTerm}`;
}

const less = (closed: boolean): string => (closed ? "\\le" : "<");
const greater = (closed: boolean): string => (closed ? "\\ge" : ">");

/** Un pezzo scritto come condizione sull'incognita: x = a, x > a, a < x ≤ b. `show` scrive un estremo. */
function pieceCondition(piece: Interval, x: string, show: (endpoint: Endpoint) => string): string {
  if (piece.lower === "-inf" && piece.upper === "+inf") return `\\forall ${x} \\in \\mathbb{R}`;
  if (isPoint(piece)) return `${x} = ${show(piece.lower)}`;
  if (piece.lower === "-inf") return `${x} ${less(piece.upperClosed)} ${show(piece.upper)}`;
  if (piece.upper === "+inf") return `${x} ${greater(piece.lowerClosed)} ${show(piece.lower)}`;
  return `${show(piece.lower)} ${less(piece.lowerClosed)} ${x} ${less(piece.upperClosed)} ${show(piece.upper)}`;
}

function periodicToLatex(set: PeriodicSet, variable: string): string {
  const term = periodTermLatex(set.period);
  const x = symbolToLatex(variable);
  const conditions = set.base.pieces.map((piece) => pieceCondition(piece, x, (endpoint) => shiftedLatex(endpoint, term)));
  return `${conditions.join(" \\lor ")},\\ k \\in \\mathbb{Z}`;
}

/**
 * L'insieme in LaTeX: gli insiemi di numeri reali come intervalli ([1; 3) ∪ {5}, ∅, ℝ), le soluzioni
 * periodiche come condizioni sull'incognita (x = π/6 + 2kπ, k ∈ ℤ).
 */
export function setToLatex(set: SolutionSet, options: SetLatexOptions = {}): string {
  if (set.kind === "periodic") {
    // La base resta dove l'ha messa chi ha scritto l'insieme (−π/3 + 2kπ non diventa 5π/3 + 2kπ).
    if (set.base.pieces.length === 0) return "\\emptyset";
    return periodicToLatex(set, options.variable ?? "x");
  }
  return realSetToLatex(options.asWritten ? set : (canonicalSet(set) as RealSet));
}

/** L'insieme scritto con le disuguaglianze: x < 2 ∨ x ≥ 5, 1 < x ≤ 3, x = 2, ∀x ∈ ℝ, ∄x ∈ ℝ. */
export function setToInequalityLatex(set: SolutionSet, options: SetLatexOptions = {}): string {
  const variable = options.variable ?? "x";
  if (set.kind === "periodic" && set.base.pieces.length > 0) return periodicToLatex(set, variable);
  const real = set.kind === "periodic" ? set.base : options.asWritten ? set : (canonicalSet(set) as RealSet);
  const x = symbolToLatex(variable);
  if (real.pieces.length === 0) return `\\nexists\\, ${x} \\in \\mathbb{R}`;
  return real.pieces.map((piece) => pieceCondition(piece, x, endpointToLatex)).join(" \\lor ");
}

