// Riconoscere risposte equivalenti (specifica, sezione 6).
//
// Due strade, nell'ordine:
// 1. confronto esatto: le due espressioni si portano in forma normale e si controlla che la
//    differenza sia zero. Se tutti gli atomi sono indipendenti (variabili, π, e, i), una differenza
//    non nulla prova anche che NON sono equivalenti;
// 2. confronto numerico: si valutano entrambe in punti scelti a caso (sempre gli stessi per la stessa
//    coppia di espressioni: il motore è deterministico), ignorando i punti dove una delle due non è
//    definita. Copre le identità che la forma normale non conosce (sin²x + cos²x = 1, proprietà dei logaritmi…).

import { NormalContext } from "../algebra/poly";
import { normalize } from "../algebra/normalize";
import { EngineError } from "../errors";
import { evaluate, type Environment } from "../expr/evaluate";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { variables } from "../expr/walk";
import { Rng } from "../random/rng";

export interface EquivalenceResult {
  readonly equivalent: boolean;
  /**
   * Come si è deciso: "exact" con le forme normali, "numeric" con i valori nei punti di prova,
   * "undecided" se non si sono trovati abbastanza punti dove entrambe sono definite (vale come non equivalente).
   */
  readonly method: "exact" | "numeric" | "undecided";
}

/** Tolleranza relativa del confronto numerico. */
const TOLERANCE = 1e-8;
/** Punti validi richiesti per dichiarare due espressioni equivalenti. */
const REQUIRED_POINTS = 12;
/** Ampiezze degli intervalli da cui si pescano i punti: prima quelle piccole, poi quelle grandi (per i domini lontani dall'origine). */
const NEAR_SCALES = [1, 2, 4, 8, 0.5];
const FAR_SCALES = [30, 100, 1000];

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Confronto esatto: true/false se si riesce a decidere, null altrimenti. */
function compareExactly(a: Expr, b: Expr): boolean | null {
  try {
    const ctx = new NormalContext();
    const difference = normalize(a, ctx).sub(normalize(b, ctx), ctx);
    if (difference.num.isZero()) return true;
    const allIndependent = [...ctx.atoms.values()].every((atom) => atom.independent);
    return allIndependent ? false : null;
  } catch (error) {
    // Divisione per zero o espressione troppo complessa: decide il confronto numerico.
    if (error instanceof EngineError) return null;
    throw error;
  }
}

function compareNumerically(a: Expr, b: Expr): EquivalenceResult {
  const names = [...new Set([...variables(a), ...variables(b)])].sort();
  if (names.length === 0) {
    const va = evaluate(a);
    const vb = evaluate(b);
    if (Number.isNaN(va) || Number.isNaN(vb)) return { equivalent: false, method: "undecided" };
    return { equivalent: close(va, vb), method: "numeric" };
  }

  // I punti dipendono solo dalle due espressioni: stesso confronto, stesso risultato, sempre.
  const rng = new Rng(`equivalenza|${toLatex(a)}|${toLatex(b)}`);
  let valid = 0;
  const tryScales = (scales: readonly number[], attempts: number): boolean => {
    for (let attempt = 0; attempt < attempts && valid < REQUIRED_POINTS; attempt++) {
      const scale = scales[attempt % scales.length] as number;
      const env: Record<string, number> = {};
      for (const name of names) env[name] = rng.real(-scale, scale);
      const va = evaluate(a, env as Environment);
      const vb = evaluate(b, env as Environment);
      if (Number.isNaN(va) || Number.isNaN(vb)) continue;
      valid += 1;
      if (!close(va, vb)) return false;
    }
    return true;
  };

  if (!tryScales(NEAR_SCALES, 80)) return { equivalent: false, method: "numeric" };
  if (valid < REQUIRED_POINTS && !tryScales(FAR_SCALES, 60)) return { equivalent: false, method: "numeric" };
  // Con pochi punti validi (dominio comune molto stretto) ci si accontenta di quattro; sotto, non si decide.
  if (valid >= 4) return { equivalent: true, method: "numeric" };
  return { equivalent: false, method: "undecided" };
}

/** Confronta due espressioni e dice anche come è stata presa la decisione. */
export function compare(a: Expr, b: Expr): EquivalenceResult {
  const exact = compareExactly(a, b);
  if (exact !== null) return { equivalent: exact, method: "exact" };
  return compareNumerically(a, b);
}

/** Vero se le due espressioni sono equivalenti (uguali ovunque sono entrambe definite). */
export function equivalent(a: Expr, b: Expr): boolean {
  return compare(a, b).equivalent;
}
