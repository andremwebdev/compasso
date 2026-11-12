// Risposte sbagliate previste: tiene solo quelle che hanno senso (REGOLE.md, regola 7).
// Un errore tipico, fatto sui numeri di un certo esercizio, può dare per caso la risposta giusta o lo
// stesso risultato di un altro errore: quella risposta si scarta, perché non permetterebbe di
// riconoscere l'errore. L'ordine dei candidati conta: a parità di valore resta il primo.

import type { ExpectedWrong } from "../../esercizi";
import { compare } from "../../motore/equivalence/equivalence";
import type { Expr } from "../../motore/expr";
import { matricesEquivalent, type Matrix } from "../../motore/linalg";
import { setsEqual, type SolutionSet } from "../../motore/sets";

/** Un candidato: null quando per questi numeri l'errore non si può fare. */
export type WrongCandidate<V> = ExpectedWrong<V> | null;

/** Tiene i candidati diversi dalla risposta giusta e tra loro, nell'ordine dato. */
export function distinctWrong<V>(correct: V, candidates: readonly WrongCandidate<V>[], same: (a: V, b: V) => boolean): ExpectedWrong<V>[] {
  const kept: ExpectedWrong<V>[] = [];
  for (const candidate of candidates) {
    if (!candidate || same(candidate.value, correct)) continue;
    if (kept.some((other) => same(other.value, candidate.value))) continue;
    kept.push(candidate);
  }
  return kept;
}

/** Per le risposte di tipo insieme. */
export const distinctWrongSets = (correct: SolutionSet, candidates: readonly WrongCandidate<SolutionSet>[]): ExpectedWrong<SolutionSet>[] =>
  distinctWrong(correct, candidates, setsEqual);

/** Per numeri ed espressioni: un confronto «non deciso» vale come «uguali», così il candidato dubbio si scarta. */
export const distinctWrongExpressions = (correct: Expr, candidates: readonly WrongCandidate<Expr>[]): ExpectedWrong<Expr>[] =>
  distinctWrong(correct, candidates, (a, b) => {
    const result = compare(a, b);
    return result.equivalent || result.method === "undecided";
  });

/** Per matrici e vettori. */
export const distinctWrongMatrices = (correct: Matrix, candidates: readonly WrongCandidate<Matrix>[]): ExpectedWrong<Matrix>[] =>
  distinctWrong(correct, candidates, matricesEquivalent);
