// Verifica automatica dei generatori (specifica, sezione 12). Per ogni livello prova migliaia di
// semi e fa i nove controlli della specifica. Un generatore entra nell'app solo se il rapporto non
// ha problemi: il test di ogni generatore chiama verifyGenerator e pretende `problems` vuoto.
//
// È uno strumento dei test: l'app non lo usa.

import katex from "katex";
import type { ErrorCode } from "../errori";
import { isErrorCode } from "../errori";
import { limitsEqual, limitToLatex, type LimitValue } from "../motore/calculus/limit";
import { compare } from "../motore/equivalence/equivalence";
import { evaluate } from "../motore/expr/evaluate";
import { evaluateComplex } from "../motore/expr/evaluate-complex";
import { toLatex } from "../motore/expr/latex";
import type { Expr } from "../motore/expr/types";
import { children, isConstant } from "../motore/expr/walk";
import { checkForms } from "../motore/form/constraints";
import { matricesEquivalent, matrixSize, matrixToLatex, type Matrix } from "../motore/linalg/matrix";
import { Rng } from "../motore/random/rng";
import { canonicalSet, isCanonicalSet, setsEqual, setToLatex, type SolutionSet } from "../motore/sets";
import { draftProblems, errorCodesOf } from "./generate";
import type { AnswerSpec, CleanLimits, Exercise, ExpectedWrong, GeneratorDefinition, Level } from "./schema";

/** I nove controlli della specifica, sezione 12. */
export const verificationChecks = {
  1: "il generatore produce un esercizio senza errori e in pochi millisecondi",
  2: "lo stesso seme dà due volte lo stesso esercizio",
  3: "la risposta giusta è davvero giusta (verifica indipendente)",
  4: "la risposta giusta rispetta i vincoli di forma richiesti",
  5: "le risposte sbagliate previste sono diverse dalla giusta e tra loro, come valore",
  6: "ogni codice di errore esiste nel catalogo ed è dichiarato dal generatore",
  7: "i numeri restano entro i limiti di pulizia dichiarati",
  8: "testo, risposte, passaggi e indizi si disegnano con KaTeX",
  9: "ci sono i passaggi della soluzione e due indizi",
} as const;

export type CheckNumber = keyof typeof verificationChecks;

export interface VerificationProblem {
  readonly check: CheckNumber;
  /** Livello e seme dell'esercizio (per riprodurlo); null se il problema riguarda il generatore nel suo insieme. */
  readonly level: Level | null;
  readonly seed: number | null;
  readonly message: string;
}

export interface VerifyOptions {
  /** Quanti semi provare per ogni livello. Se manca: 2000 (specifica, sezione 12). */
  readonly seeds?: number;
  /** Il primo seme. Se manca: 0. */
  readonly firstSeed?: number;
  /** I livelli da provare. Se mancano: tutti quelli del generatore. */
  readonly levels?: readonly Level[];
  /** Tempo massimo per un esercizio, in millisecondi. Se manca: 50 («qualche decina di millisecondi»). */
  readonly maxMillis?: number;
  /** Tempo medio massimo, in millisecondi. Se manca: 5. */
  readonly maxAverageMillis?: number;
  /** Quanti problemi tenere, al massimo, per ogni controllo (il conteggio resta completo). Se manca: 5. */
  readonly keep?: number;
  /** Orologio usato per misurare i tempi (in millisecondi). Se manca: performance.now. */
  readonly now?: () => number;
  /** Quanti esercizi diversi deve dare almeno ogni livello (si guarda da 1.000 semi in su). Se manca: 100. */
  readonly minDistinct?: number;
  /** La parte dei semi che al massimo può dare lo stesso identico esercizio (da 1.000 semi in su). Se manca: 0,04. */
  readonly maxShare?: number;
}

export interface VerificationReport {
  readonly generator: string;
  /** Esercizi generati e controllati. */
  readonly exercises: number;
  /** I problemi trovati (al più `keep` per controllo). Il generatore è verificato solo se è vuoto. */
  readonly problems: readonly VerificationProblem[];
  /** Quanti esercizi hanno fallito ogni controllo. */
  readonly failures: Readonly<Record<CheckNumber, number>>;
  /** Cose da guardare che non bocciano il generatore: verifica indipendente mancante, errori dichiarati mai prodotti, poca varietà (pochi esercizi diversi, o uno stesso esercizio che esce troppo spesso). */
  readonly warnings: readonly string[];
  readonly averageMillis: number;
  readonly maxMillis: number;
  readonly ok: boolean;
}

/** Un problema trovato su un esercizio. */
interface Finding {
  readonly check: CheckNumber;
  readonly message: string;
}

// ───────────────────────────── strumenti ─────────────────────────────

/** Impronta di un valore: stessa impronta, stesso contenuto. I numeri esatti (bigint) si scrivono come testo. */
function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_, item: unknown) => (typeof item === "bigint" ? `${item}n` : typeof item === "function" ? "ƒ" : item));
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Le formule LaTeX già disegnate senza errori: non serve ridisegnarle. */
const drawn = new Set<string>();

/** Disegna una formula con KaTeX in modalità rigorosa; restituisce l'errore, oppure null. */
function drawProblem(latex: string): string | null {
  if (drawn.has(latex)) return null;
  try {
    katex.renderToString(latex, { throwOnError: true, strict: "error" });
  } catch (error) {
    return messageOf(error);
  }
  if (drawn.size < 200000) drawn.add(latex);
  return null;
}

/** Le formule di un testo ricco ($...$ e $$...$$); `unbalanced` se resta un dollaro spaiato. */
function mathSegments(text: string): { formulas: string[]; unbalanced: boolean } {
  const formulas: string[] = [];
  // Un dollaro vero si scrive \$: non apre una formula.
  const rest = text.replace(/\\\$/g, "").replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, display: string | undefined, inline: string | undefined) => {
    formulas.push((display ?? inline) as string);
    return "";
  });
  return { formulas, unbalanced: rest.includes("$") };
}

function richTextProblem(text: string, what: string): string | null {
  const { formulas, unbalanced } = mathSegments(text);
  if (unbalanced) return `${what}: c'è un $ spaiato o una formula vuota.`;
  for (const formula of formulas) {
    const problem = drawProblem(formula);
    if (problem) return `${what}: la formula «${formula}» non si disegna (${problem}).`;
  }
  return null;
}

/** I numeri scritti in un'espressione che escono dai limiti di pulizia. */
function uncleanNumbers(expr: Expr, limits: CleanLimits): string[] {
  const found: string[] = [];
  const visit = (node: Expr): void => {
    if (node.kind === "num") {
      const { n, d } = node.value.abs();
      // Un decimale (1,25) si giudica per grandezza, non per il suo denominatore.
      const tooBig = node.decimals === undefined ? n > BigInt(limits.maxInteger) || d > BigInt(limits.maxDenominator) : node.value.abs().toNumber() > limits.maxInteger;
      if (tooBig) found.push(toLatex(node));
    }
    children(node).forEach(visit);
  };
  visit(expr);
  return found;
}

/** Le espressioni che compongono un valore di risposta. */
function expressionsOf(answer: AnswerSpec, value: unknown): Expr[] {
  switch (answer.kind) {
    case "number":
    case "expression":
      return [value as Expr];
    case "set": {
      const set = value as SolutionSet;
      const pieces = set.kind === "realset" ? set.pieces : set.base.pieces;
      const endpoints = pieces.flatMap((piece) => [piece.lower, piece.upper]).filter((endpoint): endpoint is Expr => typeof endpoint !== "string");
      return set.kind === "periodic" ? [...endpoints, set.period] : endpoints;
    }
    case "limit": {
      const limit = value as LimitValue;
      return limit.kind === "finite" ? [limit.value] : [];
    }
    case "matrix":
      return (value as Matrix).rows.flat();
    case "choice":
    case "truefalse":
    case "ordering":
      return [];
  }
}

/** Il valore di una risposta in LaTeX (per il controllo del disegno); null per i testi, che si controllano come testi. */
function valueLatex(answer: AnswerSpec, value: unknown): string | null {
  switch (answer.kind) {
    case "number":
    case "expression":
      return toLatex(value as Expr);
    case "set":
      return setToLatex(value as SolutionSet, { variable: answer.variable });
    case "limit":
      return limitToLatex(value as LimitValue);
    case "matrix":
      return matrixToLatex(value as Matrix);
    case "choice":
    case "truefalse":
    case "ordering":
      return null;
  }
}

/** La risposta giusta e le sbagliate previste, come valori dello stesso tipo. */
function answerValues(answer: AnswerSpec): { correct: unknown; wrong: readonly ExpectedWrong<unknown>[] } | null {
  switch (answer.kind) {
    case "choice":
    case "number":
    case "expression":
    case "set":
    case "limit":
    case "matrix":
      return { correct: answer.correct, wrong: answer.wrong };
    case "truefalse":
    case "ordering":
      return null;
  }
}

type Sameness = "same" | "different" | "undecided";

/** Dice se due valori di risposta sono lo stesso valore (non lo stesso testo). */
function sameValue(answer: AnswerSpec, a: unknown, b: unknown): Sameness {
  switch (answer.kind) {
    case "choice":
      return (a as string).replace(/\s+/g, " ").trim() === (b as string).replace(/\s+/g, " ").trim() ? "same" : "different";
    case "number":
      if (answer.mode.kind === "approx") {
        // Con l'approssimazione due valori entro la tolleranza sono indistinguibili per chi risponde.
        const distance = Math.abs(evaluate(a as Expr) - evaluate(b as Expr));
        return Number.isNaN(distance) ? "undecided" : distance <= answer.mode.tolerance ? "same" : "different";
      }
      return sameExpression(a as Expr, b as Expr);
    case "expression":
      return sameExpression(a as Expr, b as Expr);
    case "set":
      return setsEqual(a as SolutionSet, b as SolutionSet) ? "same" : "different";
    case "limit":
      return limitsEqual(a as LimitValue, b as LimitValue) ? "same" : "different";
    case "matrix":
      return matricesEquivalent(a as Matrix, b as Matrix) ? "same" : "different";
    case "truefalse":
    case "ordering":
      return "different";
  }
}

function sameExpression(a: Expr, b: Expr): Sameness {
  const result = compare(a, b);
  return result.method === "undecided" ? "undecided" : result.equivalent ? "same" : "different";
}

// ───────────────────────────── i controlli su un esercizio ─────────────────────────────

/** Controllo 3: la risposta giusta esiste, ha senso, e supera la verifica indipendente del generatore. */
function checkCorrect(definition: GeneratorDefinition, exercise: Exercise): string | null {
  const { answer } = exercise;
  switch (answer.kind) {
    case "number": {
      if (!isConstant(answer.correct)) return "la risposta giusta di tipo numero contiene delle lettere.";
      const value = answer.complex ? evaluateComplex(answer.correct).re : evaluate(answer.correct);
      if (Number.isNaN(value)) return `la risposta giusta $${toLatex(answer.correct)}$ non è un numero definito.`;
      break;
    }
    case "expression":
      if (compare(answer.correct, answer.correct).method === "undecided") return `la risposta giusta $${toLatex(answer.correct)}$ non è definita in nessun punto di prova.`;
      break;
    case "set":
      canonicalSet(answer.correct);
      break;
    case "limit":
      if (answer.correct.kind === "finite" && (!isConstant(answer.correct.value) || Number.isNaN(evaluate(answer.correct.value)))) {
        return "il valore del limite non è un numero definito.";
      }
      break;
    case "matrix":
      if (matrixSize(answer.correct).rows === 0) return "la matrice giusta è vuota.";
      break;
    case "choice":
      if (answer.correct.trim() === "") return "l'opzione giusta è vuota.";
      break;
    case "truefalse":
    case "ordering":
      break;
  }
  if (definition.verify && definition.verify(exercise) !== true) return "la verifica indipendente del generatore (verify) non conferma la risposta giusta.";
  return null;
}

/** Controllo 4: la risposta giusta è nella forma che l'esercizio chiede. */
function checkCorrectForm(answer: AnswerSpec): string | null {
  if ((answer.kind === "number" || answer.kind === "expression") && answer.form) {
    const result = checkForms(answer.correct, answer.form);
    if (!result.ok) return `la risposta giusta $${toLatex(answer.correct)}$ non rispetta la forma richiesta: ${result.reason}`;
  }
  if (answer.kind === "set" && answer.canonicalForm && !isCanonicalSet(answer.correct)) return "l'insieme giusto non è scritto in forma canonica, ma l'esercizio la richiede.";
  return null;
}

/** Controllo 5: nessuna sbagliata prevista vale quanto la giusta, e le sbagliate sono tutte diverse tra loro. */
function checkWrongAnswers(answer: AnswerSpec): string | null {
  const values = answerValues(answer);
  if (!values) return null;
  const { correct, wrong } = values;
  for (let i = 0; i < wrong.length; i++) {
    const candidate = wrong[i] as ExpectedWrong<unknown>;
    const versusCorrect = sameValue(answer, candidate.value, correct);
    if (versusCorrect === "same") return `la risposta sbagliata prevista n. ${i + 1} (${candidate.error}) vale quanto la risposta giusta.`;
    if (versusCorrect === "undecided") return `non si riesce a confrontare la risposta sbagliata prevista n. ${i + 1} (${candidate.error}) con la giusta.`;
    for (let j = 0; j < i; j++) {
      const versusOther = sameValue(answer, candidate.value, (wrong[j] as ExpectedWrong<unknown>).value);
      if (versusOther === "same") return `le risposte sbagliate previste n. ${j + 1} e n. ${i + 1} hanno lo stesso valore.`;
      if (versusOther === "undecided") return `non si riesce a confrontare le risposte sbagliate previste n. ${j + 1} e n. ${i + 1}.`;
    }
  }
  return null;
}

/** Controllo 6: codici di errore esistenti e dichiarati. */
function checkErrorCodes(definition: GeneratorDefinition, answer: AnswerSpec): string | null {
  for (const code of errorCodesOf(answer)) {
    if (!isErrorCode(code)) return `il codice di errore ${code} non esiste nel catalogo.`;
    if (!definition.errors.includes(code as ErrorCode)) return `il codice di errore ${code} non è tra quelli dichiarati dal generatore.`;
  }
  return null;
}

/** Controllo 7: numeri entro i limiti di pulizia, nella risposta giusta e nelle sbagliate previste. */
function checkCleanNumbers(definition: GeneratorDefinition, answer: AnswerSpec): string | null {
  const values = answerValues(answer);
  if (!values) return null;
  const { maxInteger, maxDenominator } = definition.limits;
  const describe = (numbers: string[]): string => `${numbers.map((number) => `$${number}$`).join(", ")} (limiti: interi fino a ${maxInteger}, denominatori fino a ${maxDenominator})`;
  const inCorrect = expressionsOf(answer, values.correct).flatMap((expr) => uncleanNumbers(expr, definition.limits));
  if (inCorrect.length > 0) return `nella risposta giusta ci sono numeri fuori dai limiti di pulizia: ${describe(inCorrect)}.`;
  for (let i = 0; i < values.wrong.length; i++) {
    const candidate = values.wrong[i] as ExpectedWrong<unknown>;
    const inWrong = expressionsOf(answer, candidate.value).flatMap((expr) => uncleanNumbers(expr, definition.limits));
    if (inWrong.length > 0) return `nella risposta sbagliata prevista n. ${i + 1} (${candidate.error}) ci sono numeri fuori dai limiti di pulizia: ${describe(inWrong)}.`;
  }
  return null;
}

/** Controllo 8: tutto quello che Andrea vede si disegna. */
function checkDrawing(exercise: Exercise): string | null {
  const texts: [string, string][] = [
    ["il testo dell'esercizio", exercise.prompt],
    ...exercise.steps.map((step, index): [string, string] => [`il passaggio n. ${index + 1}`, step.text]),
    ...exercise.hints.map((hint, index): [string, string] => [`l'indizio n. ${index + 1}`, hint]),
  ];
  const { answer } = exercise;
  if (answer.kind === "ordering") answer.items.forEach((item, index) => texts.push([`l'elemento n. ${index + 1} del riordino`, item.content]));
  const values = answerValues(answer);
  const formulas: [string, string][] = [];
  if (values) {
    const all: [string, unknown][] = [["la risposta giusta", values.correct], ...values.wrong.map((wrong, index): [string, unknown] => [`la risposta sbagliata prevista n. ${index + 1}`, wrong.value])];
    for (const [what, value] of all) {
      const latex = valueLatex(answer, value);
      if (latex === null) texts.push([what, value as string]);
      else formulas.push([what, latex]);
    }
  }
  for (const [what, text] of texts) {
    const problem = richTextProblem(text, what);
    if (problem) return problem;
  }
  for (const [what, latex] of formulas) {
    const problem = drawProblem(latex);
    if (problem) return `${what} non si disegna: «${latex}» (${problem}).`;
  }
  return null;
}

/** Controllo 9: passaggi e due indizi distinti. */
function checkStepsAndHints(exercise: Exercise): string | null {
  if (!Array.isArray(exercise.steps) || exercise.steps.length === 0) return "mancano i passaggi della soluzione.";
  if (exercise.steps.some((step) => typeof step.text !== "string" || step.text.trim() === "")) return "un passaggio della soluzione è vuoto.";
  if (!Array.isArray(exercise.hints) || exercise.hints.length !== 2) return "servono esattamente due indizi.";
  if (exercise.hints.some((hint) => typeof hint !== "string" || hint.trim() === "")) return "un indizio è vuoto.";
  if (exercise.hints[0].trim() === exercise.hints[1].trim()) return "i due indizi sono uguali: devono essere progressivi.";
  return null;
}

/**
 * I controlli dal 3 al 9 su un esercizio già generato. Un controllo che lancia un errore conta come
 * fallito, con il messaggio dell'errore.
 */
export function verifyExercise(definition: GeneratorDefinition, exercise: Exercise): { readonly check: CheckNumber; readonly message: string }[] {
  const findings: Finding[] = [];
  const run = (check: CheckNumber, test: () => string | null): void => {
    let message: string | null;
    try {
      message = test();
    } catch (error) {
      message = `il controllo si è interrotto: ${messageOf(error)}`;
    }
    if (message) findings.push({ check, message });
  };
  run(3, () => checkCorrect(definition, exercise));
  run(4, () => checkCorrectForm(exercise.answer));
  run(5, () => checkWrongAnswers(exercise.answer));
  run(6, () => checkErrorCodes(definition, exercise.answer));
  run(7, () => checkCleanNumbers(definition, exercise.answer));
  run(8, () => checkDrawing(exercise));
  run(9, () => checkStepsAndHints(exercise));
  return findings;
}

// ───────────────────────────── la verifica di un generatore ─────────────────────────────

/** Verifica un generatore: tutti i livelli, migliaia di semi, i nove controlli della specifica. */
export function verifyGenerator(definition: GeneratorDefinition, options: VerifyOptions = {}): VerificationReport {
  const seeds = options.seeds ?? 2000;
  const firstSeed = options.firstSeed ?? 0;
  const levels = options.levels ?? definition.levels;
  const maxMillis = options.maxMillis ?? 50;
  const maxAverageMillis = options.maxAverageMillis ?? 5;
  const keep = options.keep ?? 5;
  const now = options.now ?? (() => performance.now());
  const minDistinct = options.minDistinct ?? 100;
  const maxShare = options.maxShare ?? 0.04;

  const problems: VerificationProblem[] = [];
  const failures: Record<CheckNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const warnings: string[] = [];
  const report = (check: CheckNumber, level: Level | null, seed: number | null, message: string): void => {
    failures[check] += 1;
    // I problemi del generatore nel suo insieme si tengono sempre; di quelli dei singoli esercizi bastano i primi.
    const kept = problems.filter((problem) => problem.check === check && problem.seed !== null).length;
    if (seed === null || kept < keep) problems.push({ check, level, seed, message });
  };

  // Controllo 6, sulla dichiarazione: i codici dichiarati devono esistere.
  for (const code of definition.errors) {
    if (!isErrorCode(code)) report(6, null, null, `il codice di errore dichiarato ${code} non esiste nel catalogo.`);
  }

  const produced = new Set<string>();
  let exercises = 0;
  let totalMillis = 0;
  let slowest = 0;

  /** Genera una volta, misurando il tempo. Non controlla le regole di base: lo fa chi chiama. */
  const generate = (level: Level, seed: number): { exercise: Exercise; millis: number } => {
    const start = now();
    const draft = definition.generate({ level, seed, rng: Rng.forExercise(definition.code, level, seed) });
    const millis = now() - start;
    return { exercise: { ...draft, generator: definition.code, level, seed }, millis };
  };

  for (const level of levels) {
    if (!definition.levels.includes(level)) {
      report(1, level, null, "livello non supportato dal generatore.");
      continue;
    }
    // Quante volte esce ogni esercizio (stesso testo, stessa risposta).
    const variety = new Map<string, number>();
    for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
      // Controllo 1: l'esercizio nasce senza errori, rispetta lo schema, in pochi millisecondi.
      let first: { exercise: Exercise; millis: number };
      try {
        first = generate(level, seed);
      } catch (error) {
        report(1, level, seed, `il generatore si è interrotto: ${messageOf(error)}`);
        continue;
      }
      exercises += 1;
      const { exercise } = first;
      let structural = false;
      for (const problem of draftProblems(definition, exercise)) {
        // Passaggi, indizi e codici di errore hanno il loro controllo (9 e 6): qui restano le altre regole.
        if (problem.rule === "steps" || problem.rule === "hints" || problem.rule === "errors") continue;
        report(1, level, seed, problem.message);
        structural = true;
      }

      // Controllo 2: stesso seme, stesso esercizio. La seconda generazione serve anche a misurare meglio il tempo.
      let millis = first.millis;
      try {
        const second = generate(level, seed);
        millis = Math.min(millis, second.millis);
        if (fingerprint(second.exercise) !== fingerprint(exercise)) report(2, level, seed, "generando due volte con lo stesso seme si ottengono due esercizi diversi.");
      } catch (error) {
        report(2, level, seed, `la seconda generazione si è interrotta: ${messageOf(error)}`);
      }
      // Un picco isolato può essere una pausa del sistema: prima di segnalarlo si riprova.
      for (let attempt = 0; attempt < 3 && millis > maxMillis; attempt++) {
        try {
          millis = Math.min(millis, generate(level, seed).millis);
        } catch {
          break;
        }
      }
      totalMillis += millis;
      slowest = Math.max(slowest, millis);
      if (millis > maxMillis) report(1, level, seed, `generare l'esercizio richiede ${millis.toFixed(1)} ms (limite: ${maxMillis} ms).`);

      if (!structural) {
        for (const finding of verifyExercise(definition, exercise)) report(finding.check, level, seed, finding.message);
      }
      for (const code of errorCodesOf(exercise.answer)) produced.add(code);
      const print = fingerprint({ prompt: exercise.prompt, answer: exercise.answer });
      variety.set(print, (variety.get(print) ?? 0) + 1);
    }
    if (seeds >= 50 && variety.size > 0 && variety.size < Math.min(10, seeds / 10)) {
      warnings.push(`Livello ${level}: su ${seeds} semi escono solo ${variety.size} esercizi diversi.`);
    } else if (seeds >= 1000 && variety.size > 0) {
      // Varietà: «Esercizio simile» e il ripasso devono dare esercizi nuovi, non sempre gli stessi dieci.
      const most = Math.max(...variety.values());
      if (variety.size < minDistinct) {
        warnings.push(`Livello ${level}: su ${seeds} semi escono solo ${variety.size} esercizi diversi (ne servono almeno ${minDistinct}): allarga i numeri o aggiungi una forma.`);
      }
      if (most / seeds > maxShare) {
        warnings.push(
          `Livello ${level}: uno stesso esercizio esce ${most} volte su ${seeds} semi (più del ${Math.round(maxShare * 100)}%): la forma che lo produce ha pochi esercizi possibili e troppo peso. Dalle meno peso o più scelta.`,
        );
      }
    }
  }

  const averageMillis = exercises > 0 ? totalMillis / exercises : 0;
  if (averageMillis > maxAverageMillis) report(1, null, null, `in media generare un esercizio richiede ${averageMillis.toFixed(2)} ms (limite: ${maxAverageMillis} ms).`);
  if (!definition.verify) warnings.push("Manca la verifica indipendente (verify): la risposta giusta è controllata solo per coerenza.");
  if (seeds >= 200) {
    const unused = definition.errors.filter((code) => !produced.has(code));
    if (unused.length > 0) warnings.push(`Codici di errore dichiarati ma mai prodotti: ${unused.join(", ")}.`);
  }
  return { generator: definition.code, exercises, problems, failures, warnings, averageMillis, maxMillis: slowest, ok: problems.length === 0 };
}

/** Il rapporto in italiano, da mostrare quando un test fallisce: per ogni problema dice livello e seme per riprodurlo. */
export function formatReport(report: VerificationReport): string {
  const lines = [
    `Verifica di ${report.generator}: ${report.exercises} esercizi, ${report.averageMillis.toFixed(2)} ms in media (massimo ${report.maxMillis.toFixed(1)} ms).`,
    report.ok ? "Nessun problema: tutti e nove i controlli sono superati." : "Problemi trovati:",
  ];
  for (const check of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
    if (report.failures[check] === 0) continue;
    lines.push(`  Controllo ${check} (${verificationChecks[check]}): ${report.failures[check]} casi.`);
    for (const problem of report.problems.filter((item) => item.check === check)) {
      const where = problem.level === null ? "generatore" : problem.seed === null ? `livello ${problem.level}` : `livello ${problem.level}, seme ${problem.seed}`;
      lines.push(`    - ${where}: ${problem.message}`);
    }
  }
  for (const warning of report.warnings) lines.push(`  Avviso: ${warning}`);
  return lines.join("\n");
}
