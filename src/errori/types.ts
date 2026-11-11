// Tipi del catalogo unico degli errori tipici (specifica, sezione 5).

/** Le dodici categorie del catalogo, con il nome mostrato ad Andrea. */
export const errorCategories = {
  CALC: "Calcolo",
  ALG: "Algebra",
  COND: "Condizioni e domini",
  DISEQ: "Disequazioni",
  LOG: "Logica e lettura",
  FUNZ: "Funzioni e grafici",
  TRIG: "Trigonometria",
  GEO: "Geometria",
  STAT: "Combinatoria, probabilità e statistica",
  AN: "Analisi",
  ALIN: "Algebra lineare",
  FORMA: "Forma della risposta",
} as const;

export type ErrorCategory = keyof typeof errorCategories;

/**
 * Una voce del catalogo.
 *
 * Il codice è fisso: progressi, diario e generatori puntano ai codici, quindi un codice
 * non si rinomina mai. Nei testi `explanation` e `example` la matematica sta tra `$...$`
 * (LaTeX, disegnato con KaTeX); il resto è testo normale in italiano.
 */
export interface ErrorEntry {
  /** Codice nella forma CATEGORIA.NOME, ad esempio DISEQ.VERSO_NON_INVERTITO. */
  code: `${ErrorCategory}.${string}`;
  /** Nome breve, mostrato ad Andrea. */
  name: string;
  category: ErrorCategory;
  /** Perché è sbagliato e come evitarlo. */
  explanation: string;
  /** Esempio concreto con la risposta sbagliata e quella giusta. */
  example: string;
  /**
   * Dove rimanda la voce: un modulo (V1.M04), una lezione (V1.M04.L03) oppure "tutte"
   * per gli errori di forma, validi in ogni lezione. Finché le lezioni non esistono si usa il modulo.
   */
  reference: string;
}
