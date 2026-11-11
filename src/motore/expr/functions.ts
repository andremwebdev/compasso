// Tabella delle funzioni elementari. Per aggiungere una funzione basta una riga qui
// (più il nome in FunctionName): parser, LaTeX e valutazione numerica la vedono da soli.

import type { FunctionName } from "./types";

export interface FunctionDef {
  /** Come si scrive in LaTeX. */
  readonly latex: string;
  /** Altri modi in cui Andrea può scriverla (il nome canonico è sempre accettato). */
  readonly aliases: readonly string[];
  /** Valore numerico; NaN dove la funzione non è definita. */
  readonly evaluate: (x: number) => number;
}

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
};

export const functionNames = Object.keys(functionTable) as FunctionName[];
