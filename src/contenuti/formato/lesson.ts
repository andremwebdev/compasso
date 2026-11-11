// Formato delle lezioni (specifica, sezione 4): i tipi di quello che si ottiene leggendo un file
// Markdown di lezione. La sintassi è descritta in REGOLE.md, «Come scrivere una lezione».

import type {
  DefinitionCode, FlashcardCode, GeneratorCode, GlossaryTerm, LessonCode, SkillCode, TheoremCode, VisualizationCode,
} from "../../codici";
import type { ErrorCode } from "../../errori";

/** Testo in Markdown con formule tra $...$ e rimandi tra [[...]]. */
export type RichText = string;

/** L'intestazione di una lezione. */
export interface LessonMeta {
  readonly code: LessonCode;
  readonly title: string;
  /** Cosa saprai fare alla fine: una frase. */
  readonly goal: string;
  readonly prerequisites: readonly LessonCode[];
  /** Durata stimata in minuti (10-20). */
  readonly minutes: number;
  /** Abilità che la lezione introduce. */
  readonly skills: readonly SkillCode[];
  /** Termini del glossario che la lezione definisce. */
  readonly terms: readonly GlossaryTerm[];
}

/** Un passaggio di una dimostrazione, con le eventuali versioni sbagliate per le modalità interattive. */
export interface ProofStep {
  readonly text: RichText;
  /** La giustificazione del passaggio. */
  readonly reason: RichText;
  /** Un passaggio fisso non si sposta nella modalità «riordina». */
  readonly fixed: boolean;
  /** Versioni sbagliate (al più due), ognuna con il motivo per cui è sbagliata. */
  readonly wrong: readonly { readonly text: RichText; readonly reason: RichText }[];
}

/** Un'opzione di una domanda lampo scritta a mano. */
export interface QuestionOption {
  readonly content: RichText;
  readonly correct: boolean;
  /** L'errore tipico di chi sceglie questa opzione sbagliata, se ce n'è uno. */
  readonly error?: ErrorCode;
}

export type QuestionSource =
  | { readonly type: "generator"; readonly generator: GeneratorCode; readonly level: 1 | 2 | 3 }
  | { readonly type: "manual"; readonly prompt: RichText; readonly options: readonly QuestionOption[]; readonly explanation: RichText };

interface BlockBase {
  /** Riga del file in cui il blocco comincia (per i messaggi di errore). */
  readonly line: number;
}

export type LessonBlock =
  /** Testo normale tra un blocco speciale e l'altro. */
  | (BlockBase & { readonly kind: "text"; readonly body: RichText })
  | (BlockBase & { readonly kind: "definition"; readonly id: DefinitionCode; readonly name: string; readonly term?: GlossaryTerm; readonly body: RichText })
  | (BlockBase & { readonly kind: "theorem"; readonly id: TheoremCode; readonly name: string; readonly body: RichText })
  | (BlockBase & { readonly kind: "proof"; readonly of: TheoremCode; readonly intro: RichText; readonly steps: readonly ProofStep[] })
  | (BlockBase & { readonly kind: "example"; readonly title?: string; readonly body: RichText })
  | (BlockBase & { readonly kind: "warning"; readonly error: ErrorCode; readonly body: RichText })
  | (BlockBase & { readonly kind: "question"; readonly source: QuestionSource })
  | (BlockBase & { readonly kind: "visualization"; readonly id: VisualizationCode; readonly params: Readonly<Record<string, string>> })
  | (BlockBase & { readonly kind: "flashcard"; readonly id: FlashcardCode; readonly front: RichText; readonly back: RichText })
  /** Termine del glossario spiegato senza un riquadro di definizione: il corpo è la definizione breve. */
  | (BlockBase & { readonly kind: "glossary"; readonly term: GlossaryTerm; readonly name: string; readonly body: RichText })
  | (BlockBase & { readonly kind: "summary"; readonly body: RichText });

export interface Lesson {
  readonly meta: LessonMeta;
  readonly blocks: readonly LessonBlock[];
}

/** Un problema trovato leggendo una lezione. */
export interface LessonProblem {
  readonly line: number;
  readonly message: string;
}

/** Nomi dei blocchi speciali nei file (in italiano) e tipo corrispondente. */
export const blockNames = {
  definizione: "definition",
  teorema: "theorem",
  dimostrazione: "proof",
  esempio: "example",
  attenzione: "warning",
  domanda: "question",
  visualizzazione: "visualization",
  flashcard: "flashcard",
  glossario: "glossary",
  riepilogo: "summary",
} as const satisfies Record<string, LessonBlock["kind"]>;
