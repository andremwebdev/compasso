// Il magazzino dei dati: registro dei tentativi, progressi delle lezioni, giorni di studio, ripassi,
// controlli «Lo so già», impostazioni, stato del backup e sessione di Oggi.
// Due realizzazioni con la stessa interfaccia: IndexedDB (quella normale) e un ripiego che tiene
// tutto in un solo valore JSON (localStorage, oppure solo memoria se nemmeno quello è disponibile).
// openStore() sceglie la prima che funziona.

import { DataVersionError, migrateData, readStoredParts } from "./migrate";
import {
  DATA_VERSION, type AttemptRecord, type BackupInfo, type DayRecord, type FlashcardReview, type KnownCheck, type LessonProgress, type Settings,
  type StoredData, type TodaySession,
} from "./types";

export interface DataStore {
  /** Dove finiscono i dati: serve a dirlo ad Andrea nella sezione «Tu». */
  readonly kind: "indexeddb" | "localstorage" | "memory";
  /** La versione dei dati salvati. */
  readonly version: number;
  addAttempt(attempt: AttemptRecord): Promise<void>;
  /** Cambia l'etichetta «distrazione» di un tentativo già registrato. */
  setDistraction(id: string, distraction: boolean): Promise<void>;
  attempts(): Promise<AttemptRecord[]>;
  saveLessonProgress(progress: LessonProgress): Promise<void>;
  lessonProgress(): Promise<LessonProgress[]>;
  addDay(day: DayRecord): Promise<void>;
  addReview(review: FlashcardReview): Promise<void>;
  addCheck(check: KnownCheck): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  saveBackup(info: BackupInfo): Promise<void>;
  /** La sessione di Oggi in corso; null la cancella. */
  saveSession(session: TodaySession | null): Promise<void>;
  /** Tutti i dati in una forma sola (per il backup, per l'avvio e per i test). */
  exportData(): Promise<StoredData>;
  /** Sostituisce tutti i dati (importazione e unione di un backup). */
  replaceAll(data: StoredData): Promise<void>;
}

/** I magazzini di IndexedDB che contengono elenchi, con la chiave di ogni elemento. */
const LIST_STORES = ["attempts", "lessons", "days", "reviews", "checks"] as const;

const DB_NAME = "compasso";
const STORAGE_KEY = "compasso.dati";

// ───────────────────────────── IndexedDB ─────────────────────────────

const done = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operazione sui dati non riuscita."));
  });

/** Crea o aggiorna la struttura della base di dati, dalla versione `from` a DATA_VERSION. */
function upgrade(db: IDBDatabase, from: number): void {
  if (from < 1) {
    // Versione 1: un magazzino per i tentativi (con indice per data) e uno per le lezioni.
    db.createObjectStore("attempts", { keyPath: "id" }).createIndex("at", "at");
    db.createObjectStore("lessons", { keyPath: "code" });
  }
  if (from < 2) {
    // Versione 2: giorni di studio, ripassi delle flashcard, controlli «Lo so già» e un magazzino
    // «meta» per i valori singoli (impostazioni, backup, sessione di Oggi).
    db.createObjectStore("days", { keyPath: "date" });
    db.createObjectStore("reviews", { keyPath: "id" });
    db.createObjectStore("checks", { keyPath: "id" });
    db.createObjectStore("meta", { keyPath: "key" });
  }
  // Versione 3: nessun magazzino nuovo (i tentativi sulle dimostrazioni stanno con gli altri).
  // Le versioni successive aggiungono qui i loro passi: if (from < 4) { … }
}

/** Apre IndexedDB. Rifiuta se il browser non la offre, se è bloccata o se i dati sono di una versione futura. */
export function openIndexedDbStore(factory: IDBFactory, name = DB_NAME): Promise<DataStore> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, DATA_VERSION);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onblocked = () => reject(new Error("La base di dati è aperta in un'altra scheda con una versione vecchia."));
    request.onerror = () => {
      // VersionError: la base di dati esiste già con un numero di versione più alto.
      const error = request.error;
      reject(error?.name === "VersionError" ? new DataVersionError(Number.NaN) : (error ?? new Error("IndexedDB non disponibile.")));
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      const read = <T>(store: string): Promise<T[]> => done(db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>);
      const write = (store: string, value: unknown): Promise<void> => done(db.transaction(store, "readwrite").objectStore(store).put(value)).then(() => undefined);
      const attempts = async (): Promise<AttemptRecord[]> => (await read<AttemptRecord>("attempts")).sort((a, b) => a.at.localeCompare(b.at));
      const meta = async (key: string): Promise<unknown> =>
        ((await done(db.transaction("meta", "readonly").objectStore("meta").get(key) as IDBRequest<{ value: unknown } | undefined>)) ?? { value: undefined }).value;
      const setMeta = (key: string, value: unknown): Promise<void> => write("meta", { key, value });
      const exportData = async (): Promise<StoredData> => ({
        version: db.version,
        attempts: await attempts(),
        lessons: await read<LessonProgress>("lessons"),
        days: await read<DayRecord>("days"),
        reviews: await read<FlashcardReview>("reviews"),
        checks: await read<KnownCheck>("checks"),
        settings: readStoredParts.settings(await meta("settings")),
        backup: readStoredParts.backup(await meta("backup")),
        session: readStoredParts.session(await meta("session")),
      });
      resolve({
        kind: "indexeddb",
        version: db.version,
        addAttempt: (attempt) => write("attempts", attempt),
        setDistraction: async (id, distraction) => {
          const found = await done(db.transaction("attempts", "readonly").objectStore("attempts").get(id) as IDBRequest<AttemptRecord | undefined>);
          if (found) await write("attempts", { ...found, distraction });
        },
        attempts,
        saveLessonProgress: (progress) => write("lessons", progress),
        lessonProgress: () => read<LessonProgress>("lessons"),
        addDay: (day) => write("days", day),
        addReview: (review) => write("reviews", review),
        addCheck: (check) => write("checks", check),
        saveSettings: (settings) => setMeta("settings", settings),
        saveBackup: (info) => setMeta("backup", info),
        saveSession: (session) => setMeta("session", session),
        exportData,
        replaceAll: (data) =>
          new Promise<void>((resolveAll, rejectAll) => {
            // Una sola transazione: o si sostituisce tutto, o niente.
            const tx = db.transaction([...LIST_STORES, "meta"], "readwrite");
            for (const name of LIST_STORES) {
              const store = tx.objectStore(name);
              store.clear();
              for (const item of data[name]) store.put(item);
            }
            const metaStore = tx.objectStore("meta");
            metaStore.put({ key: "settings", value: data.settings });
            metaStore.put({ key: "backup", value: data.backup });
            metaStore.put({ key: "session", value: data.session });
            tx.oncomplete = () => resolveAll();
            tx.onerror = () => rejectAll(tx.error ?? new Error("Sostituzione dei dati non riuscita."));
            tx.onabort = () => rejectAll(tx.error ?? new Error("Sostituzione dei dati annullata."));
          }),
      });
    };
  });
}

// ───────────────────────────── ripiego: un solo valore JSON ─────────────────────────────

/** Quello che serve del localStorage (così nei test se ne può passare uno finto). */
export interface TextStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Magazzino che tiene tutto in memoria e, se c'è, lo ricopia in un TextStorage a ogni modifica.
 * Lancia DataVersionError se i dati salvati sono di una versione futura.
 */
export function openJsonStore(storage: TextStorage | null, key = STORAGE_KEY): DataStore {
  let data: StoredData = migrateData(readJson(storage, key));
  const save = (next: StoredData): void => {
    data = next;
    try {
      storage?.setItem(key, JSON.stringify(next));
    } catch {
      // Spazio finito o scrittura vietata: i dati restano in memoria fino alla chiusura.
    }
  };
  const byKey = <T>(items: readonly T[], item: T, key: (value: T) => string): T[] => [...items.filter((other) => key(other) !== key(item)), item];
  return {
    kind: storage ? "localstorage" : "memory",
    version: data.version,
    addAttempt: async (attempt) => save({ ...data, attempts: byKey(data.attempts, attempt, (item) => item.id) }),
    setDistraction: async (id, distraction) => save({ ...data, attempts: data.attempts.map((item) => (item.id === id ? { ...item, distraction } : item)) }),
    attempts: async () => [...data.attempts].sort((a, b) => a.at.localeCompare(b.at)),
    saveLessonProgress: async (progress) => save({ ...data, lessons: byKey(data.lessons, progress, (item) => item.code) }),
    lessonProgress: async () => [...data.lessons],
    addDay: async (day) => save({ ...data, days: byKey(data.days, day, (item) => item.date) }),
    addReview: async (review) => save({ ...data, reviews: byKey(data.reviews, review, (item) => item.id) }),
    addCheck: async (check) => save({ ...data, checks: byKey(data.checks, check, (item) => item.id) }),
    saveSettings: async (settings) => save({ ...data, settings }),
    saveBackup: async (backup) => save({ ...data, backup }),
    saveSession: async (session) => save({ ...data, session }),
    exportData: async () => ({ ...data, attempts: [...data.attempts].sort((a, b) => a.at.localeCompare(b.at)) }),
    replaceAll: async (next) => save({ ...next, version: DATA_VERSION }),
  };
}

function readJson(storage: TextStorage | null, key: string): unknown {
  try {
    const text = storage?.getItem(key);
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── scelta ─────────────────────────────

/**
 * Apre il magazzino dei dati: IndexedDB se funziona, altrimenti localStorage, altrimenti solo memoria.
 * Se i dati sono di una versione futura l'errore passa a chi chiama: non si deve scrivere sopra.
 */
export async function openStore(env: { indexedDB?: IDBFactory | undefined; localStorage?: TextStorage | undefined } = {}): Promise<DataStore> {
  if (env.indexedDB) {
    try {
      return await openIndexedDbStore(env.indexedDB);
    } catch (error) {
      if (error instanceof DataVersionError) throw error;
      // IndexedDB c'è ma non si apre (file aperto con doppio clic in certi browser, navigazione privata): si ripiega.
    }
  }
  return openJsonStore(env.localStorage ?? null);
}
