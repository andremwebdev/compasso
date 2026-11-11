// Errori del motore matematico.

/**
 * Errore lanciato dal motore quando gli si chiede qualcosa di impossibile
 * (divisione per zero, numeri fuori dai limiti, operazione non ancora implementata).
 * Non è mai un errore di Andrea: indica un difetto di un generatore o del motore stesso.
 */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

/** Segnaposto per le parti progettate ma implementate in una sessione successiva. */
export function notImplemented(what: string, when: string): never {
  throw new EngineError(`Non ancora implementato: ${what} (${when}).`);
}
