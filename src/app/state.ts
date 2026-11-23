// Stato dell'app: sezione aperta, schermata aperta (con la cronologia del browser, così il tasto
// «indietro» funziona), dati di Andrea in segnali. Le schermate che leggono un segnale si ridisegnano
// da sole quando cambia.

import { computed, effect, signal } from "@preact/signals";
import type { GeneratorCode, LessonCode, ModuleCode, TheoremCode } from "../codici";
import {
  DATA_VERSION, DataVersionError, defaultSettings, emptyBackup, localDate, openStore, skillMasteries, type AttemptContext, type AttemptRecord, type BackupInfo,
  type DataStore, type DayRecord, type FlashcardReview, type KnownCheck, type LessonProgress, type Settings, type StoredData, type TextStorage,
  type TodaySession, type TrackId,
} from "../dati";
import type { Level } from "../esercizi";
import type { SectionId } from "./sections";

/** Sezione attualmente aperta. All'avvio si parte sempre da "Oggi". */
export const currentSection = signal<SectionId>("oggi");

/** Un esercizio previsto in una serie: il generatore e il livello, oppure la difficoltà automatica. */
export interface PracticeItem {
  readonly generator: GeneratorCode;
  readonly level: Level | "auto";
}

/** Una serie di esercizi da fare. */
export interface PracticePlan {
  readonly title: string;
  /** Gli esercizi, in ordine. Con `endless` la serie ripete l'ultimo finché Andrea vuole. */
  readonly items: readonly PracticeItem[];
  readonly endless: boolean;
  readonly context: AttemptContext;
  /** La lezione da cui si è partiti, se si è partiti da una lezione. */
  readonly lesson: LessonCode | null;
  /** Se la serie è il controllo «Lo so già» di un modulo. */
  readonly check: ModuleCode | null;
}

/** Che cosa c'è sullo schermo dentro la sezione. */
export type Screen =
  | { readonly kind: "home" }
  | { readonly kind: "volume"; readonly code: TrackId }
  | { readonly kind: "module"; readonly code: ModuleCode }
  | { readonly kind: "lesson"; readonly code: LessonCode }
  | { readonly kind: "glossary" }
  | { readonly kind: "practice"; readonly plan: PracticePlan; readonly key: string }
  | { readonly kind: "flashcards"; readonly title: string; readonly cards: readonly string[] }
  | { readonly kind: "proof"; readonly lesson: LessonCode; readonly theorem: TheoremCode }
  | { readonly kind: "mastery" }
  | { readonly kind: "diary" };

export const screen = signal<Screen>({ kind: "home" });

interface HistoryEntry {
  readonly compasso: true;
  readonly section: SectionId;
  readonly screen: Screen;
}

const isEntry = (value: unknown): value is HistoryEntry => typeof value === "object" && value !== null && (value as { compasso?: unknown }).compasso === true;

function scrollTop(): void {
  try {
    window.scrollTo(0, 0);
  } catch {
    // Dove lo scorrimento non esiste (prove automatiche) non serve.
  }
}

/** Apre una schermata (e la sezione, se data), la aggiunge alla cronologia e riporta la pagina in cima. */
export function open(next: Screen, section?: SectionId): void {
  if (section) currentSection.value = section;
  screen.value = next;
  try {
    history.pushState({ compasso: true, section: currentSection.value, screen: next } satisfies HistoryEntry, "");
  } catch {
    // Cronologia non disponibile: si naviga lo stesso, senza tasto indietro.
  }
  scrollTop();
}

/** Torna alla schermata precedente della cronologia; se non c'è, alla pagina iniziale della sezione. */
export function goBack(fallback: Screen = { kind: "home" }): void {
  try {
    if (isEntry(history.state) && history.length > 1) {
      history.back();
      return;
    }
  } catch {
    // Senza cronologia si usa la schermata di ripiego.
  }
  open(fallback);
}

/** Collega la cronologia del browser: il tasto indietro riapre la schermata precedente. Si chiama una volta, all'avvio. */
export function connectHistory(): void {
  try {
    history.replaceState({ compasso: true, section: currentSection.value, screen: screen.value } satisfies HistoryEntry, "");
    window.addEventListener("popstate", (event) => {
      if (!isEntry(event.state)) return;
      currentSection.value = event.state.section;
      screen.value = event.state.screen;
      scrollTop();
    });
  } catch {
    // Niente cronologia: resta il pulsante in alto.
  }
}

// ───────────────────────────── dati ─────────────────────────────

/** Il magazzino dei dati, quando è aperto. */
export const dataStore = signal<DataStore | null>(null);
/** Un problema con i dati da dire ad Andrea (dati di una versione futura, scrittura non riuscita). */
export const dataProblem = signal<string | null>(null);
export const attempts = signal<readonly AttemptRecord[]>([]);
export const lessonProgress = signal<Readonly<Record<string, LessonProgress>>>({});
export const days = signal<readonly DayRecord[]>([]);
export const reviews = signal<readonly FlashcardReview[]>([]);
export const checks = signal<readonly KnownCheck[]>([]);
export const settings = signal<Settings>(defaultSettings());
export const backupInfo = signal<BackupInfo>(emptyBackup());
export const todaySession = signal<TodaySession | null>(null);
/** Vero quando il service worker ha scaricato una versione nuova, che si attiva con «Aggiorna». */
export const updateReady = signal(false);
/** Vero quando i dati salvati sono stati letti (prima, Oggi non sa ancora se c'è una sessione in corso). */
export const dataLoaded = signal(false);

/** La data di oggi sul dispositivo. Si rilegge a ogni uso: l'app può restare aperta oltre la mezzanotte. */
export const today = (): string => localDate(new Date());

/** Padronanza e ripasso di ogni abilità toccata, ricalcolati quando cambiano tentativi o controlli. */
export const masteries = computed(() => skillMasteries(attempts.value, checks.value, new Date(), today()));

/** localStorage, se si può usare (in un file aperto con doppio clic certi browser lo vietano). */
function safeLocalStorage(): TextStorage | undefined {
  try {
    const storage = window.localStorage;
    storage.getItem("compasso.prova");
    return storage;
  } catch {
    return undefined;
  }
}

function safeIndexedDb(): IDBFactory | undefined {
  try {
    return window.indexedDB ?? undefined;
  } catch {
    return undefined;
  }
}

/** Mette nei segnali tutti i dati. */
function showData(data: StoredData): void {
  attempts.value = data.attempts;
  lessonProgress.value = Object.fromEntries(data.lessons.map((progress) => [progress.code, progress]));
  days.value = data.days;
  reviews.value = data.reviews;
  checks.value = data.checks;
  settings.value = data.settings;
  backupInfo.value = data.backup;
  todaySession.value = data.session;
}

/** Apre i dati e li carica nei segnali. Si chiama una volta, all'avvio. */
export async function loadData(): Promise<void> {
  try {
    const store = await openStore({ indexedDB: safeIndexedDb(), localStorage: safeLocalStorage() });
    dataStore.value = store;
    const data = await store.exportData();
    // Quello che è stato fatto prima che l'archivio fosse aperto non si perde: si aggiunge ora.
    const early = attempts.value.filter((attempt) => !data.attempts.some((saved) => saved.id === attempt.id));
    for (const attempt of early) await store.addAttempt(attempt);
    showData({ ...data, attempts: [...data.attempts, ...early] });
  } catch (error) {
    dataProblem.value = error instanceof DataVersionError ? error.message : "Non riesco ad aprire i dati salvati: per ora i progressi non vengono registrati.";
  } finally {
    dataLoaded.value = true;
  }
}

/** Una scrittura non riuscita (spazio finito, archivio chiuso dal sistema): Andrea deve saperlo, non perdere dati in silenzio. */
function reportSaveProblem(): void {
  dataProblem.value = "Non riesco a salvare i progressi su questo dispositivo: quello che fai ora potrebbe andare perso alla chiusura.";
}

/** Aggiunge un tentativo al registro. */
export function recordAttempt(attempt: AttemptRecord): void {
  attempts.value = [...attempts.value, attempt];
  dataStore.value?.addAttempt(attempt).catch(reportSaveProblem);
}

/** Mette o toglie l'etichetta «distrazione» a un tentativo. */
export function markDistraction(id: string, distraction: boolean): void {
  attempts.value = attempts.value.map((attempt) => (attempt.id === id ? { ...attempt, distraction } : attempt));
  dataStore.value?.setDistraction(id, distraction).catch(reportSaveProblem);
}

/** Salva il punto raggiunto in una lezione. */
export function saveLessonProgress(progress: LessonProgress): void {
  lessonProgress.value = { ...lessonProgress.value, [progress.code]: progress };
  dataStore.value?.saveLessonProgress(progress).catch(reportSaveProblem);
}

/** Segna completata la sessione di un giorno. */
export function recordDay(day: DayRecord): void {
  days.value = [...days.value.filter((other) => other.date !== day.date), day];
  dataStore.value?.addDay(day).catch(reportSaveProblem);
}

/** Registra l'autovalutazione di una flashcard. */
export function recordReview(review: FlashcardReview): void {
  reviews.value = [...reviews.value, review];
  dataStore.value?.addReview(review).catch(reportSaveProblem);
}

/** Registra un controllo «Lo so già». */
export function recordCheck(check: KnownCheck): void {
  checks.value = [...checks.value, check];
  dataStore.value?.addCheck(check).catch(reportSaveProblem);
}

export function saveSettings(next: Settings): void {
  settings.value = next;
  dataStore.value?.saveSettings(next).catch(reportSaveProblem);
}

export function saveBackupInfo(next: BackupInfo): void {
  backupInfo.value = next;
  dataStore.value?.saveBackup(next).catch(reportSaveProblem);
}

export function saveTodaySession(next: TodaySession | null): void {
  todaySession.value = next;
  dataStore.value?.saveSession(next).catch(reportSaveProblem);
}

/** Sostituisce tutti i dati (importazione o unione di un backup). */
export async function replaceAllData(data: StoredData): Promise<void> {
  const store = dataStore.value;
  if (store) await store.replaceAll(data);
  showData(data);
}

/** Tutti i dati come sono ora (per l'esportazione). */
export async function currentData(): Promise<StoredData> {
  const store = dataStore.value;
  if (store) return store.exportData();
  return {
    version: DATA_VERSION,
    attempts: attempts.value,
    lessons: Object.values(lessonProgress.value),
    days: days.value,
    reviews: reviews.value,
    checks: checks.value,
    settings: settings.value,
    backup: backupInfo.value,
    session: todaySession.value,
  };
}

/**
 * Il colore della carta nei due temi (`--carta` in styles.css; un test controlla che coincidano):
 * colora la barra di stato del telefono, attraverso i meta «theme-color» della pagina.
 */
export const THEME_COLORS = { light: "#f4efe0", dark: "#0d1a31" } as const;

/** Il tema scelto nelle impostazioni, applicato alla pagina (con «sistema» decide il telefono). */
export function connectTheme(): void {
  effect(() => {
    const theme = settings.value.theme;
    try {
      if (theme === "system") delete document.documentElement.dataset["theme"];
      else document.documentElement.dataset["theme"] = theme;
      // I due meta valgono uno per il tema chiaro e uno per lo scuro del telefono: con un tema scelto
      // a mano, tutti e due prendono il colore di quel tema.
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        const media = meta.getAttribute("media") ?? "";
        const systemTheme = media.includes("dark") ? "dark" : "light";
        meta.content = THEME_COLORS[theme === "system" ? systemTheme : theme];
      }
    } catch {
      // Senza documento (prove automatiche) non serve.
    }
  });
}

/** Un identificatore nuovo per una riga del registro. */
export const newId = (): string => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

/** Un seme a caso per un esercizio nuovo. */
export const randomSeed = (): number => Math.floor(Math.random() * 1_000_000);
