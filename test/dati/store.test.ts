// Strato dei dati: IndexedDB (provata con fake-indexeddb), ripiego su localStorage, versione e migrazioni.

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  DATA_VERSION, DataVersionError, migrateData, openIndexedDbStore, openJsonStore, openStore, skillSummaries, type AttemptRecord, type DataStore,
  type LessonProgress, type TextStorage,
} from "../../src/dati";

const attempt = (id: string, patch: Partial<AttemptRecord> = {}): AttemptRecord => ({
  id,
  at: `2026-11-12T10:00:0${id.length}.000Z`,
  skill: "V1.M06.A04",
  generator: "V1.M06.A04.g1",
  seed: 7,
  level: 1,
  lesson: null,
  question: null,
  outcome: "wrong",
  error: "DISEQ.ESTREMI",
  distraction: false,
  hints: 1,
  millis: 42_000,
  context: "esercizi",
  ...patch,
});

const progress: LessonProgress = { code: "V1.M06.L04", reached: 3, completed: false, startedAt: "2026-11-12T09:00:00.000Z", updatedAt: "2026-11-12T09:05:00.000Z", completedAt: null };

/** Un localStorage finto, in memoria. */
function fakeStorage(initial: Record<string, string> = {}): TextStorage & { readonly items: Record<string, string> } {
  const items = { ...initial };
  return { items, getItem: (key) => items[key] ?? null, setItem: (key, value) => void (items[key] = value) };
}

/** Le stesse prove per le due realizzazioni: devono comportarsi allo stesso modo. */
function behavesLikeAStore(open: () => Promise<DataStore>): void {
  it("registra i tentativi e li restituisce in ordine di data", async () => {
    const store = await open();
    await store.addAttempt(attempt("bb"));
    await store.addAttempt(attempt("a"));
    expect((await store.attempts()).map((item) => item.id)).toEqual(["a", "bb"]);
  });

  it("«segna come distrazione» cambia solo quell'etichetta", async () => {
    const store = await open();
    await store.addAttempt(attempt("a"));
    await store.setDistraction("a", true);
    expect(await store.attempts()).toEqual([{ ...attempt("a"), distraction: true }]);
    await store.setDistraction("non-esiste", true);
    expect((await store.attempts()).length).toBe(1);
  });

  it("salva il punto raggiunto in una lezione e lo sovrascrive", async () => {
    const store = await open();
    await store.saveLessonProgress(progress);
    await store.saveLessonProgress({ ...progress, reached: 5, completed: true, completedAt: "2026-11-12T09:20:00.000Z" });
    expect(await store.lessonProgress()).toEqual([{ ...progress, reached: 5, completed: true, completedAt: "2026-11-12T09:20:00.000Z" }]);
  });

  it("esporta tutto con il numero di versione dei dati", async () => {
    const store = await open();
    await store.addAttempt(attempt("a"));
    await store.saveLessonProgress(progress);
    expect(store.version).toBe(DATA_VERSION);
    expect(await store.exportData()).toEqual({ version: DATA_VERSION, attempts: [attempt("a")], lessons: [progress] });
  });
}

describe("dati in IndexedDB", () => {
  behavesLikeAStore(() => openIndexedDbStore(new IDBFactory()));

  it("i dati restano dopo aver chiuso e riaperto", async () => {
    const factory = new IDBFactory();
    const first = await openIndexedDbStore(factory);
    await first.addAttempt(attempt("a"));
    await first.saveLessonProgress(progress);
    const second = await openIndexedDbStore(factory);
    expect(second.kind).toBe("indexeddb");
    expect(await second.attempts()).toEqual([attempt("a")]);
    expect(await second.lessonProgress()).toEqual([progress]);
  });

  it("dati di una versione futura non si aprono e non si toccano", async () => {
    const factory = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const request = factory.open("compasso", DATA_VERSION + 1);
      request.onupgradeneeded = () => request.result.createObjectStore("futuro");
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    await expect(openIndexedDbStore(factory)).rejects.toBeInstanceOf(DataVersionError);
    await expect(openStore({ indexedDB: factory, localStorage: fakeStorage() })).rejects.toBeInstanceOf(DataVersionError);
  });
});

describe("dati nel ripiego (localStorage o memoria)", () => {
  behavesLikeAStore(async () => openJsonStore(fakeStorage()));
  behavesLikeAStore(async () => openJsonStore(null));

  it("i dati restano dopo aver riaperto, con la versione scritta nel salvataggio", async () => {
    const storage = fakeStorage();
    const first = openJsonStore(storage);
    await first.addAttempt(attempt("a"));
    expect(JSON.parse(storage.items["compasso.dati"] ?? "{}").version).toBe(DATA_VERSION);
    expect(await openJsonStore(storage).attempts()).toEqual([attempt("a")]);
    expect(openJsonStore(storage).kind).toBe("localstorage");
    expect(openJsonStore(null).kind).toBe("memory");
  });

  it("un salvataggio rovinato non blocca l'app: si riparte da vuoto", async () => {
    expect(await openJsonStore(fakeStorage({ "compasso.dati": "{non è json" })).attempts()).toEqual([]);
  });

  it("uno spazio pieno non fa perdere i dati della sessione", async () => {
    const full: TextStorage = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
    const store = openJsonStore(full);
    await store.addAttempt(attempt("a"));
    expect((await store.attempts()).length).toBe(1);
  });
});

describe("scelta del magazzino", () => {
  it("usa IndexedDB se c'è, altrimenti localStorage, altrimenti la memoria", async () => {
    expect((await openStore({ indexedDB: new IDBFactory(), localStorage: fakeStorage() })).kind).toBe("indexeddb");
    expect((await openStore({ localStorage: fakeStorage() })).kind).toBe("localstorage");
    expect((await openStore()).kind).toBe("memory");
  });

  it("se IndexedDB c'è ma non si apre, ripiega su localStorage", async () => {
    const broken = { open: () => { throw new Error("SecurityError"); } } as unknown as IDBFactory;
    expect((await openStore({ indexedDB: broken, localStorage: fakeStorage() })).kind).toBe("localstorage");
  });
});

describe("migrazioni", () => {
  it("dati assenti o senza versione danno un salvataggio vuoto alla versione attuale", () => {
    for (const raw of [null, undefined, "testo", 3, {}, { version: 0, attempts: [attempt("a")] }]) {
      expect(migrateData(raw)).toEqual({ version: DATA_VERSION, attempts: [], lessons: [] });
    }
  });

  it("i dati della versione attuale passano invariati", () => {
    const data = { version: DATA_VERSION, attempts: [attempt("a")], lessons: [progress] };
    expect(migrateData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it("dati di una versione futura vengono rifiutati", () => {
    expect(() => migrateData({ version: DATA_VERSION + 1, attempts: [], lessons: [] })).toThrow(DataVersionError);
  });
});

describe("riassunto per abilità", () => {
  it("le domande lampo non contano, le distrazioni non pesano", () => {
    const log = [
      attempt("a", { context: "lampo", outcome: "correct", error: null }),
      attempt("bb", { outcome: "correct", error: null, level: 2 }),
      attempt("ccc", { outcome: "wrong", distraction: true }),
      attempt("dddd", { outcome: "wrong" }),
      attempt("eeeee", { outcome: "skipped", error: null, skill: "V1.M04.A07", generator: "V1.M04.A07.g1" }),
    ];
    expect(skillSummaries(log)).toEqual([
      { skill: "V1.M04.A07", attempts: 1, correct: 0, bestLevel: 0, lastAt: attempt("eeeee").at },
      { skill: "V1.M06.A04", attempts: 2, correct: 1, bestLevel: 2, lastAt: attempt("dddd").at },
    ]);
  });
});
