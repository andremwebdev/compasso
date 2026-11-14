// Strumenti comuni ai generatori di limiti (V2.M03, V2.M04, V2.M08): come si scrive un limite, le
// risposte sbagliate previste senza doppioni, e la prova numerica usata dalle verifiche indipendenti.
//
// La prova numerica NON calcola limiti (il motore non lo fa, specifica sezione 6): guarda i valori
// della funzione sempre più vicino al punto e dice se sono compatibili con il valore che il
// generatore ha scelto costruendo l'esercizio all'indietro. È una strada diversa dalla costruzione.

import type { ExpectedWrong } from "../../esercizi";
import type { LimitValue } from "../../motore/calculus/limit";
import { compare } from "../../motore/equivalence/equivalence";
import { evaluate, toLatex, type Expr } from "../../motore/expr";
import { distinctWrong, type WrongCandidate } from "./wrong";

/** Dove tende la variabile. */
export type Approach =
  | { readonly kind: "+inf" }
  | { readonly kind: "-inf" }
  | { readonly kind: "point"; readonly at: Expr; readonly side: "both" | "left" | "right" };

export const toPlusInfinity: Approach = { kind: "+inf" };
export const toMinusInfinity: Approach = { kind: "-inf" };
export const toPoint = (at: Expr, side: "both" | "left" | "right" = "both"): Approach => ({ kind: "point", at, side });

/** «+\infty», «0», «2^{+}»: quello che sta dopo la freccia. */
export function approachLatex(approach: Approach): string {
  switch (approach.kind) {
    case "+inf":
      return "+\\infty";
    case "-inf":
      return "-\\infty";
    case "point": {
      const at = toLatex(approach.at);
      return approach.side === "both" ? at : `${at}^{${approach.side === "right" ? "+" : "-"}}`;
    }
  }
}

/** Il limite scritto in LaTeX: \lim_{x \to 0} seguito dall'espressione. */
export function limitLatex(variable: string, approach: Approach, expr: Expr): string {
  // Una somma va tra parentesi: senza, non si capisce fin dove arriva il limite.
  const body = expr.kind === "add" ? `\\left(${toLatex(expr)}\\right)` : toLatex(expr);
  return `\\lim_{${variable} \\to ${approachLatex(approach)}} ${body}`;
}

/** Due valori di limite sono lo stesso valore? Un confronto «non deciso» tra numeri vale come «uguali». */
function sameLimit(a: LimitValue, b: LimitValue): boolean {
  if (a.kind !== "finite" || b.kind !== "finite") return a.kind === b.kind;
  const result = compare(a.value, b.value);
  return result.equivalent || result.method === "undecided";
}

/** Per le risposte di tipo limite: tiene i candidati diversi dalla risposta giusta e tra loro, nell'ordine dato. */
export const distinctWrongLimits = (correct: LimitValue, candidates: readonly WrongCandidate<LimitValue>[]): ExpectedWrong<LimitValue>[] =>
  distinctWrong(correct, candidates, sameLimit);

// ───────────────────────────── prova numerica ─────────────────────────────

export interface ProbeOptions {
  /** Vero per le successioni: la variabile assume solo valori interi, e si guardano posti pari e dispari. */
  readonly integer?: boolean;
  /**
   * Le due distanze a cui guardare, dalla più lontana alla più vicina: valori della variabile per un
   * limite all'infinito (10⁴ e 10⁶ se non si dice altro; 40 e 80 quando ci sono esponenziali), scarti
   * dal punto per un limite al finito (10⁻³ e 10⁻⁵).
   */
  readonly scales?: readonly [number, number];
}

/** Quello che i numeri suggeriscono: un valore, un infinito, nessun limite, oppure niente di chiaro. */
export type NumericLimit =
  | { readonly kind: "finite"; readonly value: number }
  | { readonly kind: "+inf" }
  | { readonly kind: "-inf" }
  | { readonly kind: "none" }
  | { readonly kind: "unknown" };

const HUGE = 500;
const close = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance * (1 + Math.abs(b));

/** Lungo un cammino: il valore lontano e quello vicino dicono «infinito», «circa v» oppure niente. */
function alongPath(far: number, near: number): NumericLimit {
  if (Number.isNaN(near) || Number.isNaN(far)) return { kind: "unknown" };
  // Infinito: valori grandi che continuano a crescere molto (un limite finito grande, come e¹², resta fermo).
  if (!Number.isFinite(near) || (Math.abs(near) > HUGE && Math.abs(near) >= 10 * Math.abs(far))) return { kind: near > 0 ? "+inf" : "-inf" };
  return close(far, near, 0.05) ? { kind: "finite", value: near } : { kind: "unknown" };
}

/** I valori della funzione vicino al punto, cammino per cammino (destra e sinistra, posti pari e dispari). */
export function probeLimit(expr: Expr, variable: string, approach: Approach, options: ProbeOptions = {}): NumericLimit {
  const at = (value: number): number => evaluate(expr, { [variable]: value });
  let paths: (readonly [number, number])[];
  if (approach.kind === "point") {
    const point = evaluate(approach.at);
    const [far, near] = options.scales ?? [1e-3, 1e-5];
    const sides = approach.side === "both" ? [-1, 1] : approach.side === "left" ? [-1] : [1];
    paths = sides.map((side) => [point + side * far, point + side * near] as const);
  } else {
    const [far, near] = options.scales ?? [1e4, 1e6];
    const sign = approach.kind === "+inf" ? 1 : -1;
    const shifts = options.integer ? [0, 1] : [0];
    paths = shifts.map((shift) => [sign * (far + shift), sign * (near + shift)] as const);
  }
  const seen = paths.map(([far, near]) => alongPath(at(far), at(near)));
  const first = seen[0];
  if (!first || seen.some((path) => path.kind === "unknown")) return { kind: "unknown" };
  const agree = seen.every((path) => (path.kind === "finite" && first.kind === "finite" ? close(path.value, first.value, 1e-3) : path.kind === first.kind));
  return agree ? first : { kind: "none" };
}

/** Vero se i valori numerici vicino al punto confermano il valore di limite dichiarato. */
export function confirmsLimit(expr: Expr, variable: string, approach: Approach, expected: LimitValue, options: ProbeOptions = {}): boolean {
  const seen = probeLimit(expr, variable, approach, options);
  if (expected.kind !== "finite") return seen.kind === expected.kind;
  return seen.kind === "finite" && close(seen.value, evaluate(expected.value), 2e-3);
}
