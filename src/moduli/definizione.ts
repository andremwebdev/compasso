// Che cosa contiene un modulo: le sue lezioni (testo Markdown) e i suoi generatori.
// Ogni modulo ha il suo file in src/moduli/vN/mNN.ts, ed è lì che si aggiungono le righe di una
// lezione o di un generatore nuovi (REGOLE.md). Nella versione telefono ogni file di modulo diventa
// un file JavaScript a parte, caricato solo quando serve (specifica, sezione 12).

import type { LessonCode, ModuleCode } from "../codici";
import type { GeneratorDefinition } from "../esercizi";

export interface ModuleContent {
  readonly code: ModuleCode;
  /** Il testo Markdown di ogni lezione del modulo, per codice. */
  readonly lessons: Readonly<Record<LessonCode, string>>;
  /** I generatori delle abilità del modulo, in ordine di abilità. */
  readonly generators: readonly GeneratorDefinition[];
  /** Le figure SVG delle lezioni (blocco «figura»): percorso relativo a src/contenuti → testo SVG. */
  readonly figures: Readonly<Record<string, string>>;
}

/** Dichiara il contenuto di un modulo (serve solo a dare il tipo giusto al file del modulo). Le figure sono facoltative. */
export function defineModule(
  code: ModuleCode,
  content: Omit<ModuleContent, "code" | "figures"> & { readonly figures?: ModuleContent["figures"] },
): ModuleContent {
  return { code, ...content, figures: content.figures ?? {} };
}
