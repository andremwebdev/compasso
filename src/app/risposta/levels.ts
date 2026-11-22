// Quali livelli della tastiera matematica mostrare per un esercizio, e quale aprire per primo
// (specifica, sezione 7: «la tastiera apre per primo il livello che serve al tipo di esercizio»).

import type { AnswerSpec } from "../../esercizi";
import type { Expr } from "../../motore/expr";
import type { KeyboardLevel } from "./keys";

export interface KeyboardSetup {
  /** Le linguette, nell'ordine. */
  readonly levels: readonly KeyboardLevel[];
  /** Il livello aperto all'inizio. */
  readonly initial: KeyboardLevel;
}

/** Livelli sempre presenti; «Matrici» c'è solo con le caselle, «ℂ» solo negli esercizi sui complessi. */
const COMMON: readonly KeyboardLevel[] = ["base", "funzioni", "insiemi", "analisi"];

/** La tastiera per una risposta scritta. */
export function keyboardFor(answer: AnswerSpec): KeyboardSetup {
  switch (answer.kind) {
    case "set":
      return { levels: COMMON, initial: "insiemi" };
    case "limit":
      return { levels: COMMON, initial: "analisi" };
    case "matrix":
      return { levels: ["lineare", ...COMMON], initial: "lineare" };
    case "number":
    case "expression": {
      if (answer.complex) return { levels: [...COMMON, "complessi"], initial: "complessi" };
      // Primitive ed equazioni differenziali: servono le costanti c, c₁, c₂ del livello Funzioni.
      const needsFunctions = (answer.kind === "expression" && answer.check !== undefined) || usesFunctions(answer.correct);
      return { levels: COMMON, initial: needsFunctions ? "funzioni" : "base" };
    }
    case "choice":
    case "truefalse":
    case "ordering":
      return { levels: COMMON, initial: "base" };
  }
}

/** Vero se nella risposta giusta c'è qualcosa che si scrive con il livello Funzioni. */
export function usesFunctions(expr: Expr): boolean {
  switch (expr.kind) {
    case "num":
      return false;
    case "sym":
      // Le costanti arbitrarie c, c₁, c₂ stanno nel livello Funzioni.
      return /^c(_\d)?$/.test(expr.name);
    case "const":
      return expr.name !== "i";
    case "fn":
      // Il fattoriale sta nel livello Base (combinatoria); gradi, primi e secondi in Funzioni, con π.
      return expr.name === "factorial" ? usesFunctions(expr.arg) : true;
    case "log":
    case "abs":
      return true;
    case "add":
      return expr.terms.some(usesFunctions);
    case "mul":
      return expr.factors.some(usesFunctions);
    case "neg":
    case "root":
      return usesFunctions(expr.arg);
    case "div":
      return usesFunctions(expr.num) || usesFunctions(expr.den);
    case "pow":
      return usesFunctions(expr.base) || usesFunctions(expr.exp);
  }
}
