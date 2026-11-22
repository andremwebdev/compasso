// Tabella delle funzioni elementari. Per aggiungere una funzione basta una riga qui
// (più il nome in FunctionName): parser, LaTeX e valutazione numerica la vedono da soli.
// Le funzioni «dopo l'argomento» (fattoriale, gradi, primi, secondi) si scrivono con un simbolo
// (5!, 30°, 15′, 20″): il parser le legge come operatori, non come parole.

import type { FunctionName } from "./types";

export interface FunctionDef {
  /** Come si scrive in LaTeX. */
  readonly latex: string;
  /** Altri modi in cui Andrea può scriverla (il nome canonico è sempre accettato). */
  readonly aliases: readonly string[];
  /** Valore numerico; NaN dove la funzione non è definita. */
  readonly evaluate: (x: number) => number;
  /** Se c'è, la funzione si scrive dopo l'argomento con questo simbolo (LaTeX): 5!, 30^{\circ}. */
  readonly postfix?: string;
}

/** Coefficienti dell'approssimazione di Lanczos (g = 7, n = 9) per la funzione Gamma. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Γ(x) per x reale: NaN negli interi non positivi (poli). */
function gamma(x: number): number {
  if (Number.isInteger(x) && x <= 0) return NaN;
  // Riflessione: Γ(x)·Γ(1 − x) = π / sin(πx).
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const z = x - 1;
  let sum = LANCZOS[0] as number;
  for (let k = 1; k < LANCZOS.length; k++) sum += (LANCZOS[k] as number) / (z + k);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * sum;
}

/**
 * Fattoriale: per gli interi da 0 in su il prodotto esatto (finché è rappresentabile), altrove Γ(x + 1).
 * Fuori dai naturali serve solo al confronto numerico: n!/(n − 1)! e n coincidono anche nei reali.
 */
function factorial(x: number): number {
  if (Number.isInteger(x) && x >= 0 && x <= 170) {
    let product = 1;
    for (let k = 2; k <= x; k++) product *= k;
    return product;
  }
  return gamma(x + 1);
}

const DEGREE = Math.PI / 180;

export const functionTable: Readonly<Record<FunctionName, FunctionDef>> = {
  sin: { latex: "\\sin", aliases: ["sen"], evaluate: Math.sin },
  cos: { latex: "\\cos", aliases: [], evaluate: Math.cos },
  tan: { latex: "\\tan", aliases: ["tg"], evaluate: (x) => (Math.abs(Math.cos(x)) < 1e-12 ? NaN : Math.tan(x)) },
  cot: {
    latex: "\\cot",
    aliases: ["cotg", "ctg", "cotan"],
    evaluate: (x) => (Math.abs(Math.sin(x)) < 1e-12 ? NaN : Math.cos(x) / Math.sin(x)),
  },
  arcsin: { latex: "\\arcsin", aliases: ["arcsen", "asin"], evaluate: (x) => (Math.abs(x) > 1 ? NaN : Math.asin(x)) },
  arccos: { latex: "\\arccos", aliases: ["acos"], evaluate: (x) => (Math.abs(x) > 1 ? NaN : Math.acos(x)) },
  arctan: { latex: "\\arctan", aliases: ["arctg", "atan"], evaluate: Math.atan },
  ln: { latex: "\\ln", aliases: [], evaluate: (x) => (x > 0 ? Math.log(x) : NaN) },
  factorial: { latex: "!", aliases: [], evaluate: factorial, postfix: "!" },
  deg: { latex: "^{\\circ}", aliases: [], evaluate: (x) => x * DEGREE, postfix: "^{\\circ}" },
  arcmin: { latex: "'", aliases: [], evaluate: (x) => (x * DEGREE) / 60, postfix: "'" },
  arcsec: { latex: "''", aliases: [], evaluate: (x) => (x * DEGREE) / 3600, postfix: "''" },
};

/** Vero se la funzione si scrive dopo l'argomento (5!, 30°). */
export const isPostfixFunction = (name: FunctionName): boolean => functionTable[name].postfix !== undefined;

/** Le tre unità di misura degli angoli in gradi sessagesimali. */
export const ANGLE_UNITS: ReadonlySet<FunctionName> = new Set(["deg", "arcmin", "arcsec"]);

export const functionNames = Object.keys(functionTable) as FunctionName[];
