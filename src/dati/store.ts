// Il magazzino dei dati: registro dei tentativi e progressi delle lezioni.
// Due realizzazioni con la stessa interfaccia: IndexedDB (quella normale) e un ripiego che tiene
// tutto in un solo valore JSON (localStorage, oppure solo memoria se nemmeno quello è disponibile).
// openStore() sceglie la prima che funziona.

import { DataVersionError, migrateData } from "./migrate";
import { DATA_VERSION, type AttemptRecord, type LessonProgress, type StoredData } from "./types";

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
  /** Tutti i dati in una forma sola (per il backup e per i test). */
  exportData(): Promise<StoredData>;
}

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
  // Le versioni successive aggiungono qui i loro passi: if (from < 2) { … }
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
        exportData: async () => ({ version: db.version, attempts: await attempts(), lessons: await read<LessonProgress>("lessons") }),
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
  return {
    kind: storage ? "localstorage" : "memory",
    version: data.version,
    addAttempt: async (attempt) => save({ ...data, attempts: [...data.attempts.filter((item) => item.id !== attempt.id), attempt] }),
    setDistraction: async (id, distraction) => save({ ...data, attempts: data.attempts.map((item) => (item.id === id ? { ...item, distraction } : item)) }),
    attempts: async () => [...data.attempts].sort((a, b) => a.at.localeCompare(b.at)),
    saveLessonProgress: async (progress) => save({ ...data, lessons: [...data.lessons.filter((item) => item.code !== progress.code), progress] }),
    lessonProgress: async () => [...data.lessons],
    exportData: async () => data,
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
