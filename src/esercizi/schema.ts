// Schema dei generatori e degli esercizi (specifica, sezioni 4 e 7), tradotto in tipi.
//
// Un generatore che non rispetta lo schema non compila: è la rete di sicurezza per i molti modelli
// che scriveranno generatori. Le regole che i tipi non possono esprimere le controlla
// generateExercise (generate.ts) a ogni esercizio e, più a fondo, la verifica automatica.

import type { GeneratorCode, LessonCode, SkillCode } from "../codici";
import type { ErrorCode, UNCLASSIFIED } from "../errori";
import type { LimitValue } from "../motore/calculus/limit";
import type { Expr } from "../motore/expr/types";
import type { FormConstraint } from "../motore/form/constraints";
import type { Matrix } from "../motore/linalg/matrix";
import type { Rng } from "../motore/random/rng";
import type { SolutionSet } from "../motore/sets/types";

/** Testo in Markdown con le formule in LaTeX tra $...$ (in riga) o $$...$$ (a centro pagina). */
export type RichText = string;

/**
 * Livelli di difficoltà, uguali per tutti i generatori:
 * 1 = applicazione diretta, numeri semplici, uno o due passaggi;
 * 2 = livello tipico di verifica e di TOL, più passaggi;
 * 3 = casi particolari, parametri, più tecniche insieme, livello d'esame.
 */
export type Level = 1 | 2 | 3;

/** Una risposta sbagliata prevista: il risultato che si ottiene facendo un errore tipico preciso. */
export interface ExpectedWrong<V> {
  /** L'errore tipico che produce questa risposta. Deve essere tra quelli dichiarati dal generatore. */
  readonly error: ErrorCode;
  readonly value: V;
}

// ───────────────────────────── tipi di risposta ─────────────────────────────

/** Scelta multipla «pura»: le opzioni sono testi. Le sbagliate sono 3 o 4 (4 o 5 opzioni in tutto). */
export interface ChoiceAnswer {
  readonly kind: "choice";
  readonly correct: RichText;
  readonly wrong: readonly ExpectedWrong<RichText>[];
}

/** Come si valuta una risposta numerica. */
export type EvaluationMode =
  /** Forma esatta (il caso normale): 1,414 non è √2. */
  | { readonly kind: "exact" }
  /** Approssimazione: si accetta uno scarto fino a `tolerance`. Il testo dell'esercizio deve dirlo. */
  | { readonly kind: "approx"; readonly tolerance: number };

export const exact: EvaluationMode = { kind: "exact" };
/** approx(0.005) per «arrotonda a due decimali». */
export const approx = (tolerance: number): EvaluationMode => ({ kind: "approx", tolerance });

/** Un numero: un'espressione costante (intero, frazione, radicale, multiplo di π…). */
export interface NumberAnswer {
  readonly kind: "number";
  readonly correct: Expr;
  readonly wrong: readonly ExpectedWrong<Expr>[];
  readonly mode: EvaluationMode;
  /** Vincoli di forma, se il testo li chiede («riduci ai minimi termini», «razionalizza»). */
  readonly form?: readonly FormConstraint[];
  /** Vero se la risposta è un numero complesso: la lettera i è l'unità immaginaria. */
  readonly complex?: boolean;
}

/** Un'espressione con lettere: si valuta per equivalenza, più gli eventuali vincoli di forma. */
export interface ExpressionAnswer {
  readonly kind: "expression";
  readonly correct: Expr;
  readonly wrong: readonly ExpectedWrong<Expr>[];
  /** Vincoli di forma, se il testo li chiede («scomponi», «sviluppa»). Senza vincoli vale qualunque forma equivalente. */
  readonly form?: readonly FormConstraint[];
  readonly complex?: boolean;
}

/** Un intervallo o un insieme di soluzioni: si confronta per struttura (estremi, inclusione, periodo). */
export interface SetAnswer {
  readonly kind: "set";
  readonly correct: SolutionSet;
  readonly wrong: readonly ExpectedWrong<SolutionSet>[];
  /** La variabile di cui si cercano i valori (di solito x). */
  readonly variable: string;
}

/** Il valore di un limite: un numero, +∞, −∞ oppure «non esiste». */
export interface LimitAnswer {
  readonly kind: "limit";
  readonly correct: LimitValue;
  readonly wrong: readonly ExpectedWrong<LimitValue>[];
}

/** Una matrice o un vettore: elemento per elemento, in forma esatta. */
export interface MatrixAnswer {
  readonly kind: "matrix";
  readonly correct: Matrix;
  readonly wrong: readonly ExpectedWrong<Matrix>[];
}

/** Vero o falso. */
export interface TrueFalseAnswer {
  readonly kind: "truefalse";
  readonly correct: boolean;
  /** L'errore tipico di chi risponde il contrario, se ce n'è uno preciso. */
  readonly error?: ErrorCode;
}

/** Riordino: gli elementi sono elencati nell'ordine giusto; l'app li mostra mescolati. */
export interface OrderingAnswer {
  readonly kind: "ordering";
  readonly items: readonly OrderingItem[];
  readonly error?: ErrorCode;
}

export interface OrderingItem {
  readonly content: RichText;
  /** Un elemento fisso resta al suo posto e non si può spostare. */
  readonly fixed?: boolean;
}

export type AnswerSpec =
  | ChoiceAnswer
  | NumberAnswer
  | ExpressionAnswer
  | SetAnswer
  | LimitAnswer
  | MatrixAnswer
  | TrueFalseAnswer
  | OrderingAnswer;

export type AnswerKind = AnswerSpec["kind"];

// ───────────────────────────── esercizio ─────────────────────────────

/** Un passaggio della soluzione. */
export interface SolutionStep {
  readonly text: RichText;
}

/** Quello che un generatore restituisce. */
export interface ExerciseDraft {
  /** Testo dell'esercizio. Deve rendere chiaro se serve la forma esatta o un'approssimazione, e quale forma è richiesta. */
  readonly prompt: RichText;
  /** Tipo di risposta, risposta giusta, risposte sbagliate previste, modalità di valutazione, vincoli di forma. */
  readonly answer: AnswerSpec;
  /** Passaggi della soluzione, almeno uno. */
  readonly steps: readonly SolutionStep[];
  /** Due indizi progressivi: il primo orienta, il secondo dice come cominciare. */
  readonly hints: readonly [RichText, RichText];
}

/** Un esercizio completo: la bozza del generatore più la sua identità (generatore, livello, seme). */
export interface Exercise extends ExerciseDraft {
  readonly generator: GeneratorCode;
  readonly level: Level;
  readonly seed: number;
}

// ───────────────────────────── generatore ─────────────────────────────

/** Quello che un generatore riceve. */
export interface GeneratorContext {
  readonly level: Level;
  readonly seed: number;
  /** Generatore casuale dell'esercizio: l'unica fonte di casualità ammessa. */
  readonly rng: Rng;
}

/** Limiti di «pulizia» dei numeri che compaiono nelle risposte: la verifica automatica li controlla. */
export interface CleanLimits {
  /** Valore assoluto massimo di numeratori e interi. */
  readonly maxInteger: number;
  /** Denominatore massimo delle frazioni. */
  readonly maxDenominator: number;
}

export interface GeneratorDefinition {
  /** Codice fisso del generatore: V1.M06.A04.g1. */
  readonly code: GeneratorCode;
  /** Abilità che allena: deve essere il codice del generatore senza «.g1». */
  readonly skill: SkillCode;
  /** Lezione di riferimento. */
  readonly lesson: LessonCode;
  /** Titolo breve dell'abilità, mostrato ad Andrea («Disequazioni fratte»). */
  readonly title: string;
  /** Livelli supportati. */
  readonly levels: readonly Level[];
  /** Codici di errore che il generatore può produrre nelle risposte sbagliate previste. */
  readonly errors: readonly ErrorCode[];
  readonly limits: CleanLimits;
  /**
   * Costruisce l'esercizio all'indietro: prima la soluzione, poi l'esercizio intorno.
   * Deterministica: usa solo `rng`, mai Math.random né l'ora.
   */
  readonly generate: (context: GeneratorContext) => ExerciseDraft;
  /**
   * Verifica indipendente della risposta giusta, con una strada diversa da quella usata per
   * costruirla (sostituire le soluzioni, derivare la primitiva, controllare che A·x = b).
   * Restituisce true se è giusta. Usata dalla verifica automatica.
   */
  readonly verify?: (exercise: Exercise) => boolean;
}

// ───────────────────────────── risposta di Andrea e valutazione ─────────────────────────────

/** Quello che Andrea ha risposto. */
export type Response =
  /** Testo scritto con la tastiera matematica: per numero, espressione, insieme, limite. */
  | { readonly kind: "text"; readonly text: string }
  /** Opzione scelta: l'indice restituito da choiceOptions (0 è sempre la giusta, ma l'ordine mostrato è mescolato). */
  | { readonly kind: "choice"; readonly index: number }
  /** Griglia di caselle, per righe. */
  | { readonly kind: "matrix"; readonly cells: readonly (readonly string[])[] }
  | { readonly kind: "truefalse"; readonly value: boolean }
  /** L'ordine dato agli elementi: order[k] è l'indice (nell'elenco originale) dell'elemento messo al posto k. */
  | { readonly kind: "ordering"; readonly order: readonly number[] }
  /** «Non lo so». */
  | { readonly kind: "skip" };

/** Perché una risposta è sbagliata. */
export type WrongCause =
  /** Coincide con una risposta sbagliata prevista: errore tipico riconosciuto. */
  | "expected"
  /** Valore giusto ma scritto come decimale: FORMA.DECIMALE. */
  | "decimal"
  /** Equivalente ma non nella forma richiesta: FORMA.NON_RICHIESTA. */
  | "form"
  /** Nessuna corrispondenza: NON_CLASSIFICATO. */
  | "unclassified";

export type Evaluation =
  | { readonly outcome: "correct" }
  | {
      readonly outcome: "wrong";
      /** Codice da salvare nel registro dei tentativi. */
      readonly error: ErrorCode | typeof UNCLASSIFIED;
      readonly cause: WrongCause;
      /** Messaggio specifico (quale forma serve, «valore giusto, ma serve la forma esatta»). */
      readonly message?: string;
    }
  /** Risposta non data («Non lo so»). */
  | { readonly outcome: "skipped" }
  /** Testo non interpretabile o incompleto: non si registra, si chiede ad Andrea di correggerlo. */
  | { readonly outcome: "invalid"; readonly message: string; readonly position?: number };
