// Passaggi di una procedura (specifica, sezione 6: «registrare i passaggi»): un'idea per passaggio,
// con il testo in italiano e, se serve, una formula a centro pagina. I generatori li usano per
// comporre la soluzione passo passo.

export interface Step {
  /** Testo in italiano, con le formule in riga tra $...$. */
  readonly text: string;
  /** Formula LaTeX da mostrare a centro pagina, sotto il testo. */
  readonly formula?: string;
}

/** Il risultato di una procedura insieme ai suoi passaggi. */
export interface WithSteps<T> {
  readonly result: T;
  readonly steps: readonly Step[];
}

/** Il passaggio come testo unico, con la formula a centro pagina tra $$...$$: è la forma usata nelle soluzioni degli esercizi. */
export function stepText(step: Step): string {
  return step.formula === undefined ? step.text : `${step.text}\n\n$$${step.formula}$$`;
}
