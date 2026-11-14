// Anteprima in tempo reale di quello che Andrea sta scrivendo: il testo passa dallo stesso parser
// che userà la valutazione, e il risultato si ridisegna in LaTeX. Se il testo è incompleto il parser
// mette dei quadratini (□) al posto dei pezzi mancanti; se non si legge, dà il motivo in italiano.

import type { AnswerSpec } from "../../esercizi";
import { limitToLatex, parseLimitValue } from "../../motore/calculus/limit";
import { toLatex } from "../../motore/expr";
import { parseExpression } from "../../motore/parser";
import { parseSolutionSet } from "../../motore/parser/sets";
import { setToLatex } from "../../motore/sets";

export type Preview =
  /** Niente da mostrare (campo vuoto). */
  | { readonly kind: "empty" }
  /** Il testo si legge: `complete` è falso se mancano dei pezzi (si può mostrare, non confermare). */
  | { readonly kind: "ok"; readonly latex: string; readonly complete: boolean }
  /** Il testo non è ancora leggibile, ma può diventarlo continuando a scrivere (un intervallo aperto a metà). */
  | { readonly kind: "typing" }
  /** Il testo non si legge: il motivo, in italiano. */
  | { readonly kind: "error"; readonly message: string };

/** Che cosa si scrive in un campo: dipende dal tipo di risposta dell'esercizio. */
export type FieldKind =
  | { readonly kind: "expression"; readonly complex: boolean }
  | { readonly kind: "set"; readonly variable: string }
  | { readonly kind: "limit" };

/** Il tipo di campo per una risposta scritta; null se l'esercizio non si risponde scrivendo in un campo solo. */
export function fieldKindOf(answer: AnswerSpec): FieldKind | null {
  switch (answer.kind) {
    case "number":
    case "expression":
      return { kind: "expression", complex: answer.complex ?? false };
    case "set":
      return { kind: "set", variable: answer.variable };
    case "limit":
      return { kind: "limit" };
    case "matrix":
      // Ogni casella di una matrice è un'espressione.
      return { kind: "expression", complex: false };
    case "choice":
    case "truefalse":
    case "ordering":
      return null;
  }
}

/**
 * Modi plausibili di finire un insieme scritto a metà: «(-∞» → «(-∞; 0)», «x <» → «x < 0», «… ∪» → «… ∪ (0; 1)»,
 * «{1,5» → «{1,5; 0}», «x = 3; x» → «x = 3; x = 0», «[2» → «[2; +∞)», «-4 <» → «-4 < x».
 * Le chiusure con +∞ servono perché un estremo sinistro positivo non si chiude con 0 («[2; 0)» è un
 * intervallo al contrario). Un test scrive le risposte delle disequazioni fratte un carattere alla
 * volta e controlla che nessun pezzo sia dato per sbagliato: se il parser cambia, l'elenco va riallineato.
 */
const SET_ENDINGS = ["0", ")", "]", "}", "0)", "; 0)", "0; 1)", " (0; 1)", " x > 0", " > 0", "∞)", "; +∞)", "+∞)", "0}", "; 0}", "5; 0}", " = 0", "1 = 0", "x", " x", "1; +∞)", "/9)", "/9]"] as const;

/** L'anteprima del testo scritto in un campo. Non lancia mai. */
export function previewText(field: FieldKind, text: string): Preview {
  if (text.trim() === "") return { kind: "empty" };
  switch (field.kind) {
    case "expression": {
      const parsed = parseExpression(text, { complex: field.complex });
      return parsed.ok ? { kind: "ok", latex: toLatex(parsed.value), complete: parsed.complete } : { kind: "error", message: parsed.error.message };
    }
    case "set": {
      const parsed = parseSolutionSet(text, { variable: field.variable });
      // «asWritten»: l'anteprima mostra l'insieme come è stato scritto, senza riordinarlo.
      if (parsed.ok) return { kind: "ok", latex: setToLatex(parsed.value, { variable: field.variable, asWritten: true }), complete: parsed.complete };
      // Il parser degli insiemi non completa da solo i pezzi mancanti: se basta una chiusura plausibile
      // perché il testo si legga, Andrea sta ancora scrivendo e non è un errore.
      const unfinished = SET_ENDINGS.some((ending) => parseSolutionSet(text + ending, { variable: field.variable }).ok);
      return unfinished ? { kind: "typing" } : { kind: "error", message: parsed.error.message };
    }
    case "limit": {
      const parsed = parseLimitValue(text);
      return parsed.ok ? { kind: "ok", latex: limitToLatex(parsed.value), complete: parsed.complete } : { kind: "error", message: parsed.error.message };
    }
  }
}
