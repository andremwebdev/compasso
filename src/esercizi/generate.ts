// Dalla definizione di un generatore all'esercizio: controllo della definizione e creazione.

import { isGeneratorCode, isLessonCode, skillOf } from "../codici";
import { isErrorCode } from "../errori";
import { EngineError } from "../motore/errors";
import { Rng } from "../motore/random/rng";
import type { AnswerSpec, Exercise, ExerciseDraft, GeneratorDefinition, Level } from "./schema";

/**
 * Dichiara un generatore. Controlla subito quello che i tipi non possono garantire del tutto
 * (forma dei codici, abilità coerente con il codice, errori esistenti, livelli validi).
 */
export function defineGenerator(definition: GeneratorDefinition): GeneratorDefinition {
  const { code } = definition;
  const problem = (message: string): never => {
    throw new EngineError(`Generatore ${code}: ${message}`);
  };
  if (!isGeneratorCode(code)) problem("il codice non ha la forma V1.M06.A04.g1.");
  if (definition.skill !== skillOf(code)) problem(`l'abilità deve essere ${skillOf(code)}.`);
  if (!isLessonCode(definition.lesson)) problem("la lezione di riferimento non ha la forma V1.M06.L04.");
  if (definition.title.trim() === "") problem("manca il titolo.");
  if (definition.levels.length === 0 || new Set(definition.levels).size !== definition.levels.length) {
    problem("i livelli devono essere almeno uno e senza ripetizioni.");
  }
  if (definition.levels.some((level) => ![1, 2, 3].includes(level))) problem("i livelli ammessi sono 1, 2 e 3.");
  for (const error of definition.errors) {
    if (!isErrorCode(error)) problem(`il codice di errore ${error} non esiste nel catalogo.`);
  }
  if (new Set(definition.errors).size !== definition.errors.length) problem("i codici di errore sono ripetuti.");
  if (!(definition.limits.maxInteger >= 1) || !(definition.limits.maxDenominator >= 1)) problem("i limiti di pulizia non sono validi.");
  return Object.freeze({ ...definition });
}

/** I codici di errore usati dalle risposte sbagliate previste di una risposta. */
export function errorCodesOf(answer: AnswerSpec): string[] {
  switch (answer.kind) {
    case "choice":
    case "number":
    case "expression":
    case "set":
    case "limit":
    case "matrix":
      return answer.wrong.map((wrong) => wrong.error);
    case "truefalse":
    case "ordering":
      return answer.error ? [answer.error] : [];
  }
}

/** Una regola di base dello schema non rispettata da un esercizio. */
export interface DraftProblem {
  /** Quale parte dell'esercizio riguarda: serve alla verifica automatica per sapere di quale controllo si tratta. */
  readonly rule: "prompt" | "steps" | "hints" | "errors" | "choice" | "tolerance" | "ordering";
  readonly message: string;
}

/** Controlla le regole di base dello schema su quello che un generatore ha restituito. */
export function draftProblems(definition: GeneratorDefinition, draft: ExerciseDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];
  if (typeof draft.prompt !== "string" || draft.prompt.trim() === "") problems.push({ rule: "prompt", message: "il testo dell'esercizio è vuoto." });
  if (!Array.isArray(draft.steps) || draft.steps.length === 0 || draft.steps.some((step) => step.text.trim() === "")) {
    problems.push({ rule: "steps", message: "mancano i passaggi della soluzione." });
  }
  if (!Array.isArray(draft.hints) || draft.hints.length !== 2 || draft.hints.some((hint) => hint.trim() === "")) {
    problems.push({ rule: "hints", message: "servono due indizi." });
  }
  for (const error of errorCodesOf(draft.answer)) {
    if (!definition.errors.includes(error as never)) {
      problems.push({ rule: "errors", message: `il codice di errore ${error} non è tra quelli dichiarati dal generatore.` });
    }
  }
  const { answer } = draft;
  if (answer.kind === "choice" && (answer.wrong.length < 3 || answer.wrong.length > 4)) {
    problems.push({ rule: "choice", message: "una scelta multipla ha 3 o 4 opzioni sbagliate." });
  }
  if (answer.kind === "number" && answer.mode.kind === "approx" && !(answer.mode.tolerance > 0)) {
    problems.push({ rule: "tolerance", message: "la tolleranza dell'approssimazione deve essere positiva." });
  }
  if (answer.kind === "ordering" && answer.items.filter((item) => !item.fixed).length < 2) {
    problems.push({ rule: "ordering", message: "in un riordino servono almeno due elementi da spostare." });
  }
  return problems;
}

/**
 * Crea un esercizio: stesso generatore, stesso livello e stesso seme danno sempre lo stesso esercizio.
 * Controlla le regole di base dello schema; un generatore che le viola lancia un errore che dice
 * generatore, livello e seme.
 */
export function generateExercise(definition: GeneratorDefinition, level: Level, seed: number): Exercise {
  const where = `${definition.code}, livello ${level}, seme ${seed}`;
  const problem = (message: string): never => {
    throw new EngineError(`${where}: ${message}`);
  };
  if (!definition.levels.includes(level)) problem("livello non supportato dal generatore.");
  if (!Number.isSafeInteger(seed) || seed < 0) problem("il seme deve essere un intero non negativo.");

  const draft = definition.generate({ level, seed, rng: Rng.forExercise(definition.code, level, seed) });
  const [first] = draftProblems(definition, draft);
  if (first) problem(first.message);
  return { ...draft, generator: definition.code, level, seed };
}
