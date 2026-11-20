// Strato dei dati: IndexedDB (provata con fake-indexeddb), ripiego su localStorage, versione e migrazioni.

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  DATA_VERSION, DataVersionError, defaultSettings, emptyData, migrateData, openIndexedDbStore, openJsonStore, openStore, skillSummaries,
  type AttemptRecord, type DataStore, type LessonProgress, type StoredData, type TextStorage,
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
    expect(await store.exportData()).toEqual({ ...emptyData(), attempts: [attempt("a")], lessons: [progress] });
  });

  it("salva giorni, ripassi, controlli, impostazioni, backup e sessione di Oggi", async () => {
    const store = await open();
    const day = { date: "2026-11-20", minutes: 40, track: "V1", completedAt: "2026-11-20T18:00:00.000Z" } as const;
    const review = { id: "r1", at: "2026-11-20T18:01:00.000Z", card: "V1.M06.D02", grade: 2 } as const;
    const check = { id: "c1", at: "2026-11-20T18:02:00.000Z", module: "V1.M04", passed: true, skills: ["V1.M04.A07"], failed: [] } as const;
    const settings = { theme: "dark", tracks: ["V1", "V3"], defaultMinutes: 20 } as const;
    const session = { date: "2026-11-21", minutes: 60, track: "V3", lesson: null, phase: 2, doneInPhase: 1, startedAt: "2026-11-21T07:00:00.000Z" } as const;
    await store.addDay(day);
    await store.addDay({ ...day, minutes: 60 });
    await store.addReview(review);
    await store.addCheck(check);
    await store.saveSettings(settings);
    await store.saveBackup({ lastAt: "2026-11-20T18:03:00.000Z", lessonsAtLast: 1 });
    await store.saveSession(session);
    expect(await store.exportData()).toEqual({
      ...emptyData(),
      days: [{ ...day, minutes: 60 }],
      reviews: [review],
      checks: [check],
      settings,
      backup: { lastAt: "2026-11-20T18:03:00.000Z", lessonsAtLast: 1 },
      session,
    });
    await store.saveSession(null);
    expect((await store.exportData()).session).toBeNull();
  });

  it("sostituisce tutti i dati in un colpo (importazione e unione di un backup)", async () => {
    const store = await open();
    await store.addAttempt(attempt("a"));
    await store.saveLessonProgress(progress);
    const next: StoredData = { ...emptyData(), attempts: [attempt("bb")], days: [{ date: "2026-11-19", minutes: 20, track: null, completedAt: "2026-11-19T20:00:00.000Z" }] };
    await store.replaceAll(next);
    expect(await store.exportData()).toEqual(next);
    expect(await store.attempts()).toEqual([attempt("bb")]);
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
      expect(migrateData(raw)).toEqual(emptyData());
    }
  });

  it("i dati della versione attuale passano invariati", () => {
    const data: StoredData = { ...emptyData(), attempts: [attempt("a")], lessons: [progress], settings: { theme: "light", tracks: ["V2", "V3"], defaultMinutes: 60 } };
    expect(migrateData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it("dalla versione 1: tentativi e lezioni restano, il resto parte vuoto con le impostazioni predefinite", () => {
    const v1 = { version: 1, attempts: [attempt("a")], lessons: [progress] };
    expect(migrateData(JSON.parse(JSON.stringify(v1)))).toEqual({ ...emptyData(), attempts: [attempt("a")], lessons: [progress] });
    expect(defaultSettings()).toEqual({ theme: "system", tracks: ["V1"], defaultMinutes: 40 });
  });

  it("impostazioni strane prendono i valori predefiniti", () => {
    const data = migrateData({ ...emptyData(), settings: { theme: "viola", tracks: ["V9"], defaultMinutes: 45 } });
    expect(data.settings).toEqual(defaultSettings());
  });

  it("una base IndexedDB della versione 1 si apre e tiene i suoi dati", async () => {
    const factory = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const request = factory.open("compasso", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("attempts", { keyPath: "id" }).createIndex("at", "at");
        db.createObjectStore("lessons", { keyPath: "code" });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["attempts", "lessons"], "readwrite");
        tx.objectStore("attempts").put(attempt("a"));
        tx.objectStore("lessons").put(progress);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      request.onerror = () => reject(request.error);
    });
    const store = await openIndexedDbStore(factory);
    expect(store.version).toBe(DATA_VERSION);
    expect(await store.exportData()).toEqual({ ...emptyData(), attempts: [attempt("a")], lessons: [progress] });
    await store.addDay({ date: "2026-11-20", minutes: 40, track: "V1", completedAt: "2026-11-20T18:00:00.000Z" });
    expect((await store.exportData()).days.length).toBe(1);
  });

  it("dati di una versione futura vengono rifiutati", () => {
    expect(() => migrateData({ version: DATA_VERSION + 1, attempts: [], lessons: [] })).toThrow(DataVersionError);
  });
});

describe("riassunto per abilità", () => {
  // Revisione 4b: prima le distrazioni non entravano nel conto. La specifica (sezioni 3, 5 e 9) dice che
  // una distrazione resta un errore per la padronanza: cambia solo il posto in cui il diario la mostra.
  it("le domande lampo non contano; le distrazioni restano errori, contate a parte", () => {
    const log = [
      attempt("a", { context: "lampo", outcome: "correct", error: null }),
      attempt("bb", { outcome: "correct", error: null, level: 2 }),
      attempt("ccc", { outcome: "wrong", distraction: true }),
      attempt("dddd", { outcome: "wrong" }),
      attempt("eeeee", { outcome: "skipped", error: null, skill: "V1.M04.A07", generator: "V1.M04.A07.g1" }),
    ];
    expect(skillSummaries(log)).toEqual([
      { skill: "V1.M04.A07", attempts: 1, correct: 0, distractions: 0, bestLevel: 0, lastAt: attempt("eeeee").at },
      { skill: "V1.M06.A04", attempts: 3, correct: 1, distractions: 1, bestLevel: 2, lastAt: attempt("dddd").at },
    ]);
  });
});
