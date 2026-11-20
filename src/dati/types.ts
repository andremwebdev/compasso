// I dati di Andrea: registro dei tentativi, progressi delle lezioni, giorni di studio, ripassi delle
// flashcard, controlli «Lo so già», impostazioni e stato del backup. Ogni salvataggio porta il
// numero di versione dei dati (DATA_VERSION): quando la struttura cambia, il numero sale e si
// scrive un passaggio di migrazione in migrate.ts.

import type { GeneratorCode, LessonCode, ModuleCode, SkillCode } from "../codici";

/** Versione della struttura dei dati. Si aumenta di uno a ogni cambiamento della struttura. */
export const DATA_VERSION = 2;

/** Dove è stato fatto un tentativo. «controllo» è il controllo «Lo so già» di un modulo. */
export type AttemptContext = "lampo" | "lezione" | "esercizi" | "oggi" | "simulazione" | "minitest" | "controllo";

/** Un tentativo: una riga del registro (specifica, sezione 9). */
export interface AttemptRecord {
  /** Identificatore unico della riga. */
  readonly id: string;
  /** Data e ora, in formato ISO. */
  readonly at: string;
  readonly skill: SkillCode | null;
  readonly generator: GeneratorCode | null;
  readonly seed: number | null;
  readonly level: 1 | 2 | 3 | null;
  /** Per le domande lampo scritte a mano: la lezione e la riga del blocco. */
  readonly lesson: LessonCode | null;
  readonly question: number | null;
  readonly outcome: "correct" | "wrong" | "skipped";
  /** Codice di errore del catalogo oppure NON_CLASSIFICATO; null se la risposta è giusta o non data. */
  readonly error: string | null;
  /** «Segna come distrazione»: l'errore non pesa sulla diagnosi. */
  readonly distraction: boolean;
  /** Indizi usati: 0, 1 o 2. */
  readonly hints: number;
  /** Tempo impiegato, in millisecondi. */
  readonly millis: number;
  readonly context: AttemptContext;
}

/** A che punto è una lezione. */
export interface LessonProgress {
  readonly code: LessonCode;
  /** Quanti tratti della lezione sono stati aperti (si riprende da qui). */
  readonly reached: number;
  readonly completed: boolean;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

/** I tre binari: un volume ciascuno (specifica, sezione 3). */
export type TrackId = "V1" | "V2" | "V3";
export const TRACKS: readonly TrackId[] = ["V1", "V2", "V3"];

/** Le durate della sessione di Oggi, in minuti. */
export type SessionMinutes = 20 | 40 | 60;
export const SESSION_MINUTES: readonly SessionMinutes[] = [20, 40, 60];

export type ThemeChoice = "system" | "light" | "dark";

/** Le impostazioni (sezione Tu). */
export interface Settings {
  readonly theme: ThemeChoice;
  /** Binari attivi, almeno uno, nell'ordine dei volumi. */
  readonly tracks: readonly TrackId[];
  /** La durata proposta per prima nella scelta di Oggi. */
  readonly defaultMinutes: SessionMinutes;
}

/** Un giorno in cui la sessione di Oggi è stata completata: serve alla serie e all'alternanza dei binari. */
export interface DayRecord {
  /** Data locale del dispositivo, AAAA-MM-GG. */
  readonly date: string;
  readonly minutes: SessionMinutes;
  /** Il binario della lezione nuova di quel giorno. */
  readonly track: TrackId | null;
  readonly completedAt: string;
}

/** Un ripasso di una flashcard: l'autovalutazione di Andrea. 0 = non la sapevo, 1 = a fatica, 2 = subito. */
export interface FlashcardReview {
  readonly id: string;
  readonly at: string;
  /** Codice della flashcard: definizione, teorema o flashcard manuale. */
  readonly card: string;
  readonly grade: 0 | 1 | 2;
}

/** Un controllo «Lo so già» su un modulo. */
export interface KnownCheck {
  readonly id: string;
  readonly at: string;
  readonly module: ModuleCode;
  readonly passed: boolean;
  /** Le abilità coinvolte (se superato: tutte quelle del modulo, che partono da «consolidato») e quelle con almeno un errore. */
  readonly skills: readonly SkillCode[];
  readonly failed: readonly SkillCode[];
}

/** Lo stato del backup, per il promemoria. */
export interface BackupInfo {
  /** Data e ora dell'ultima esportazione; null se mai fatta. */
  readonly lastAt: string | null;
  /** Lezioni completate al momento dell'ultima esportazione. */
  readonly lessonsAtLast: number;
}

/** La sessione di Oggi in corso: si riprende da qui se l'app si chiude a metà. */
export interface TodaySession {
  readonly date: string;
  readonly minutes: SessionMinutes;
  readonly track: TrackId | null;
  /** La lezione nuova del giorno (null se il binario non ne ha). */
  readonly lesson: LessonCode | null;
  /** Fase raggiunta: 0 ripasso, 1 lezione, 2 esercizi sulla lezione, 3 punti deboli, 4 chiusura. */
  readonly phase: number;
  /** Esercizi già fatti nella fase in corso. */
  readonly doneInPhase: number;
  readonly startedAt: string;
}

/** Tutto quello che è salvato, in una forma sola: ripiego su localStorage, migrazioni, backup. */
export interface StoredData {
  readonly version: number;
  readonly attempts: readonly AttemptRecord[];
  readonly lessons: readonly LessonProgress[];
  readonly days: readonly DayRecord[];
  readonly reviews: readonly FlashcardReview[];
  readonly checks: readonly KnownCheck[];
  readonly settings: Settings;
  readonly backup: BackupInfo;
  readonly session: TodaySession | null;
}

/** Le impostazioni di un'installazione nuova: si parte dal Volume 1 (decisione di Andrea, 20 novembre 2026). */
export const defaultSettings = (): Settings => ({ theme: "system", tracks: ["V1"], defaultMinutes: 40 });

export const emptyBackup = (): BackupInfo => ({ lastAt: null, lessonsAtLast: 0 });

/** I dati di un'installazione nuova. */
export const emptyData = (): StoredData => ({
  version: DATA_VERSION,
  attempts: [],
  lessons: [],
  days: [],
  reviews: [],
  checks: [],
  settings: defaultSettings(),
  backup: emptyBackup(),
  session: null,
});
