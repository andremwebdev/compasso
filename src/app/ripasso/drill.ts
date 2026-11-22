// Le tre modalità delle dimostrazioni interattive (specifica, sezione 4), ricavate dai passaggi:
// riordina (i passaggi fissi restano al loro posto), trova lo sbagliato (un passaggio è sostituito
// da una sua versione sbagliata), completa (un passaggio è nascosto e va scelto tra la versione giusta
// e quelle sbagliate). Il caso viene da `random`, così i test lo fissano.

import type { ProofStep } from "../../contenuti/formato";
import { moveItem } from "../risposta/ordering";

export type DrillMode = "riordina" | "sbagliato" | "completa";

export const DRILL_MODES: readonly { id: DrillMode; label: string }[] = [
  { id: "riordina", label: "Riordina" },
  { id: "sbagliato", label: "Trova lo sbagliato" },
  { id: "completa", label: "Completa" },
];

/** Mescola un elenco (Fisher-Yates). */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Un ordine mescolato degli indici dei passaggi: i fissi restano al loro posto, gli altri si
 * mescolano finché l'ordine non è diverso da quello giusto (se si può).
 */
export function shuffledOrder(steps: readonly ProofStep[], random: () => number): number[] {
  const free = steps.map((step, index) => (step.fixed ? -1 : index)).filter((index) => index >= 0);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const mixed = shuffle(free, random);
    let k = 0;
    const order = steps.map((step, index) => (step.fixed ? index : (mixed[k++] ?? index)));
    if (!isInOrder(order) || free.length < 2) return order;
  }
  return steps.map((_, index) => index);
}

/** Vero se l'ordine è quello giusto. */
export const isInOrder = (order: readonly number[]): boolean => order.every((value, index) => value === index);

/** Sposta l'elemento in posizione `from` di uno su o giù, saltando i passaggi fissi (come la risposta `ordering`). */
export const moveStep = (order: readonly number[], steps: readonly ProofStep[], from: number, direction: -1 | 1): number[] =>
  moveItem(order, steps, from, direction);

/** Trova lo sbagliato: quale passaggio è sostituito e con quale versione sbagliata. */
export interface WrongTask {
  readonly index: number;
  readonly wrong: { readonly text: string; readonly reason: string };
}

export function wrongTask(steps: readonly ProofStep[], random: () => number): WrongTask | null {
  const candidates = steps.map((step, index) => ({ step, index })).filter(({ step }) => step.wrong.length > 0);
  const chosen = candidates[Math.floor(random() * candidates.length)];
  if (!chosen) return null;
  const wrong = chosen.step.wrong[Math.floor(random() * chosen.step.wrong.length)];
  return wrong ? { index: chosen.index, wrong } : null;
}

/** Completa: il passaggio nascosto e le scelte (la giusta e le sbagliate, mescolate). */
export interface CompleteTask {
  readonly index: number;
  readonly options: readonly { readonly text: string; readonly correct: boolean; readonly reason: string }[];
}

export function completeTask(steps: readonly ProofStep[], random: () => number): CompleteTask | null {
  const candidates = steps.map((step, index) => ({ step, index })).filter(({ step }) => step.wrong.length > 0);
  const chosen = candidates[Math.floor(random() * candidates.length)];
  if (!chosen) return null;
  const options = [{ text: chosen.step.text, correct: true, reason: chosen.step.reason }, ...chosen.step.wrong.map((w) => ({ text: w.text, correct: false, reason: w.reason }))];
  return { index: chosen.index, options: shuffle(options, random) };
}
