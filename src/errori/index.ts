// Catalogo unico degli errori tipici: punto di accesso.

import { errorCatalog, type ErrorCode } from "./catalog";
import type { ErrorEntry } from "./types";

export { errorCatalog, type ErrorCode } from "./catalog";
export { errorCategories, type ErrorCategory, type ErrorEntry } from "./types";

/**
 * Risposta sbagliata che non corrisponde a nessun errore del catalogo.
 * Non è una voce del catalogo: è uno stato speciale (specifica, sezione 5).
 */
export const UNCLASSIFIED = "NON_CLASSIFICATO";

const byCode: ReadonlyMap<string, ErrorEntry> = new Map(errorCatalog.map((entry) => [entry.code, entry]));

/** Dice se una stringa è il codice di una voce del catalogo. */
export function isErrorCode(code: string): code is ErrorCode {
  return byCode.has(code);
}

/** Cerca una voce per codice; restituisce undefined se il codice non esiste. */
export function findError(code: string): ErrorEntry | undefined {
  return byCode.get(code);
}

/** Le voci di una categoria, nell'ordine del catalogo. */
export function errorsInCategory(category: ErrorEntry["category"]): ErrorEntry[] {
  return errorCatalog.filter((entry) => entry.category === category);
}
