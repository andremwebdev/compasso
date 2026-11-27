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
      // Le chiusure sono scritte con la x: per un'altra incognita (il parametro k di V1.M05.A08) si usa la sua lettera.
      const unfinished = SET_ENDINGS.some((ending) => parseSolutionSet(text + ending.replace(/x/g, field.variable), { variable: field.variable }).ok);
      return unfinished ? { kind: "typing" } : { kind: "error", message: parsed.error.message };
    }
    case "limit": {
      const parsed = parseLimitValue(text);
      return parsed.ok ? { kind: "ok", latex: limitToLatex(parsed.value), complete: parsed.complete } : { kind: "error", message: parsed.error.message };
    }
  }
}

/**
 * L'anteprima di una griglia: la matrice (o il vettore) intera, con □ nelle caselle vuote o non
 * ancora leggibili. Se una casella non si legge, il motivo dice quale.
 */
export function gridPreview(field: FieldKind, cells: readonly (readonly string[])[]): Preview {
  if (cells.every((line) => line.every((cell) => cell.trim() === ""))) return { kind: "empty" };
  let complete = true;
  const rows: string[] = [];
  for (const [r, line] of cells.entries()) {
    const entries: string[] = [];
    for (const [c, cell] of line.entries()) {
      const preview = previewText(field, cell);
      switch (preview.kind) {
        case "ok":
          entries.push(preview.latex);
          complete &&= preview.complete;
          break;
        case "error":
          return { kind: "error", message: cells.length === 1 || line.length === 1 ? `Casella ${(line.length === 1 ? r : c) + 1}: ${preview.message}` : `Riga ${r + 1}, colonna ${c + 1}: ${preview.message}` };
        case "empty":
        case "typing":
          entries.push("\\square");
          complete = false;
          break;
      }
    }
    rows.push(entries.join(" & "));
  }
  return { kind: "ok", latex: `\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}`, complete };
}
