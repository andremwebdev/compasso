// Logica ricavata dai dati: date, padronanza e ripasso, flashcard, serie di giorni, diario, backup.

import { describe, expect, it } from "vitest";
import {
  addDays, aggregateLevel, backupDue, backupFileText, cardSchedules, daysBetween, diaryCategories, diaryEntries, dueCards, dueSkills, emptyData,
  mergeData, nextAutoLevel, readBackupFile, skillMasteries, startingLevel, streakInfo, trendOf, weakestErrors, weekStart,
  type AttemptRecord, type DayRecord, type KnownCheck, type StoredData,
} from "../../src/dati";

/** Un istante a mezzogiorno locale di una data: così la data locale non cambia con il fuso. */
const noon = (date: string): string => new Date(`${date}T12:00:00`).toISOString();
const now = (date: string): Date => new Date(`${date}T18:00:00`);

let counter = 0;
const attempt = (date: string, patch: Partial<AttemptRecord> = {}): AttemptRecord => ({
  id: `t${(counter += 1)}`,
  at: noon(date),
  skill: "V1.M06.A04",
  generator: "V1.M06.A04.g1",
  seed: 1,
  level: 2,
  lesson: null,
  question: null,
  outcome: "correct",
  error: null,
  distraction: false,
  hints: 0,
  millis: 30_000,
  context: "esercizi",
  ...patch,
});
const wrong = (date: string, error: string, patch: Partial<AttemptRecord> = {}): AttemptRecord => attempt(date, { outcome: "wrong", error, ...patch });

describe("date di calendario", () => {
  it("somme di giorni, distanze e inizio settimana (lunedì)", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // ora legale: nessun salto
    expect(daysBetween("2026-11-01", "2026-11-20")).toBe(19);
    expect(weekStart("2026-11-20")).toBe("2026-11-16"); // venerdì → lunedì
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // domenica
  });
});

describe("padronanza", () => {
  const level = (attempts: AttemptRecord[], today = "2026-11-20", checks: KnownCheck[] = []) =>
    skillMasteries(attempts, checks, now(today), today).get("V1.M06.A04")?.level ?? "nuovo";

  it("nessun tentativo: nuovo; le domande lampo non contano", () => {
    expect(level([])).toBe("nuovo");
    expect(level([attempt("2026-11-20", { context: "lampo" })])).toBe("nuovo");
  });

  it("i tentativi sulle dimostrazioni non hanno abilità e non entrano nella padronanza (decisione 119)", () => {
    const proof = attempt("2026-11-20", { context: "dimostrazione", skill: null, generator: null, seed: null, level: null, lesson: "V2.M06.L99", proof: { theorem: "V2.M06.T03", mode: "completa" } });
    expect([...skillMasteries([proof, proof], [], now("2026-11-20"), "2026-11-20").keys()]).toEqual([]);
  });

  it("pochi tentativi o molti errori: in apprendimento", () => {
    expect(level([attempt("2026-11-20")])).toBe("apprendimento");
    expect(level(["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((d) => wrong(d, "DISEQ.ESTREMI")))).toBe("apprendimento");
  });

  it("giuste a livello 2: consolidato; con giuste a livello 3 e senza indizi: padroneggiato", () => {
    const four = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((d) => attempt(d));
    expect(level(four)).toBe("consolidato");
    const six = [...four, attempt("2026-11-20", { level: 3 }), attempt("2026-11-20", { level: 3 })];
    expect(level(six)).toBe("padroneggiato");
  });

  it("gli indizi e il livello 1 riducono il merito; «Non lo so» e le distrazioni sono errori", () => {
    const withHints = Array.from({ length: 6 }, () => attempt("2026-11-20", { level: 3, hints: 2 }));
    expect(level(withHints)).toBe("apprendimento");
    const easy = Array.from({ length: 6 }, () => attempt("2026-11-20", { level: 1 }));
    expect(level(easy)).toBe("apprendimento");
    const mixed = [...Array.from({ length: 6 }, () => attempt("2026-11-20")), attempt("2026-11-20", { outcome: "skipped" }), wrong("2026-11-20", "DISEQ.ESTREMI", { distraction: true })];
    expect(level(mixed)).toBe("consolidato");
    const worse = [...mixed, attempt("2026-11-20", { outcome: "skipped" }), wrong("2026-11-20", "DISEQ.ESTREMI", { distraction: true })];
    expect(level(worse)).toBe("apprendimento");
  });

  it("i risultati recenti contano più dei vecchi", () => {
    const oldWrong = Array.from({ length: 4 }, () => wrong("2026-08-01", "DISEQ.ESTREMI"));
    const recentRight = Array.from({ length: 3 }, () => attempt("2026-11-20"));
    expect(level([...oldWrong, ...recentRight])).toBe("consolidato");
    const oldRight = Array.from({ length: 3 }, () => attempt("2026-08-01"));
    const recentWrong = Array.from({ length: 4 }, () => wrong("2026-11-20", "DISEQ.ESTREMI"));
    expect(level([...oldRight, ...recentWrong])).toBe("apprendimento");
  });

  it("decadimento: un'abilità non toccata da più di 60 giorni scende di un livello", () => {
    const six = [...Array.from({ length: 4 }, () => attempt("2026-08-01")), ...Array.from({ length: 2 }, () => attempt("2026-08-01", { level: 3 }))];
    expect(level(six, "2026-08-02")).toBe("padroneggiato");
    expect(level(six, "2026-11-20")).toBe("consolidato");
  });

  it("«Lo so già» superato: si parte da consolidato e si entra nel ripasso a 7 giorni", () => {
    const check: KnownCheck = { id: "c", at: noon("2026-11-20"), module: "V1.M06", passed: true, skills: ["V1.M06.A04"], failed: [] };
    const map = skillMasteries([], [check], now("2026-11-20"), "2026-11-20");
    expect(map.get("V1.M06.A04")).toMatchObject({ level: "consolidato", due: "2026-11-27" });
    expect(skillMasteries([], [{ ...check, passed: false }], now("2026-11-20"), "2026-11-20").size).toBe(0);
  });

  it("ripasso: una giusta al giorno sale di un gradino, una sbagliata riparte da capo", () => {
    const due = (attempts: AttemptRecord[]) => skillMasteries(attempts, [], now("2026-11-20"), "2026-11-20").get("V1.M06.A04")?.due;
    expect(due([attempt("2026-11-10")])).toBe("2026-11-11");
    expect(due([attempt("2026-11-10"), attempt("2026-11-10"), attempt("2026-11-10")])).toBe("2026-11-11");
    expect(due([attempt("2026-11-10"), attempt("2026-11-11"), attempt("2026-11-14")])).toBe("2026-11-21");
    expect(due([attempt("2026-11-10"), attempt("2026-11-11"), wrong("2026-11-14", "DISEQ.ESTREMI")])).toBe("2026-11-15");
    const map = skillMasteries([attempt("2026-11-10"), attempt("2026-11-20", { skill: "V1.M04.A07", generator: "V1.M04.A07.g1" })], [], now("2026-11-20"), "2026-11-20");
    expect(dueSkills(map, "2026-11-20").map((m) => m.skill)).toEqual(["V1.M06.A04"]);
  });

  it("livello aggregato e difficoltà automatica", () => {
    expect(aggregateLevel([])).toBe("nuovo");
    expect(aggregateLevel(["nuovo", "nuovo"])).toBe("nuovo");
    expect(aggregateLevel(["nuovo", "padroneggiato"])).toBe("apprendimento");
    expect(aggregateLevel(["consolidato", "padroneggiato"])).toBe("consolidato");
    expect([startingLevel("nuovo"), startingLevel("apprendimento"), startingLevel("consolidato"), startingLevel("padroneggiato")]).toEqual([1, 2, 3, 3]);
    expect(nextAutoLevel(2, [false, false], [1, 2, 3])).toBe(1);
    expect(nextAutoLevel(2, [true, true, true], [1, 2, 3])).toBe(3);
    expect(nextAutoLevel(2, [true, true], [1, 2, 3])).toBe(2);
    expect(nextAutoLevel(3, [true, true, true], [1, 2, 3])).toBe(3);
    expect(nextAutoLevel(2, [true, true, true], [1, 2])).toBe(2);
  });
});

describe("flashcard", () => {
  const review = (date: string, card: string, grade: 0 | 1 | 2) => ({ id: `${card}-${date}-${grade}-${(counter += 1)}`, at: noon(date), card, grade });

  it("subito sale, a fatica resta, non la sapevo riparte", () => {
    const schedules = cardSchedules([review("2026-11-10", "A", 2), review("2026-11-11", "A", 2), review("2026-11-14", "A", 1), review("2026-11-10", "B", 0)]);
    expect(schedules.get("A")).toMatchObject({ due: "2026-11-17", reviews: 3, lastGrade: 1 });
    expect(schedules.get("B")?.due).toBe("2026-11-11");
  });

  it("da ripassare: prima le mai viste, poi le scadute", () => {
    const schedules = cardSchedules([review("2026-11-10", "A", 2), review("2026-11-20", "B", 2)]);
    expect(dueCards(["A", "B", "C"], schedules, "2026-11-20")).toEqual(["C", "A"]);
  });
});

describe("serie di giorni", () => {
  const days = (...dates: string[]): DayRecord[] => dates.map((date) => ({ date, minutes: 40, track: "V1", completedAt: noon(date) }));

  it("giorni di fila; oggi non ancora fatto non rompe la serie", () => {
    expect(streakInfo(days("2026-11-18", "2026-11-19"), "2026-11-20")).toMatchObject({ current: 2, longest: 2, doneToday: false });
    expect(streakInfo(days("2026-11-18", "2026-11-19", "2026-11-20"), "2026-11-20")).toMatchObject({ current: 3, doneToday: true });
    expect(streakInfo([], "2026-11-20")).toMatchObject({ current: 0, longest: 0 });
  });

  it("un giorno saltato è coperto da un giorno libero, che non allunga la serie", () => {
    const info = streakInfo(days("2026-11-16", "2026-11-18", "2026-11-19"), "2026-11-20");
    expect(info).toMatchObject({ current: 3, freeUsedThisWeek: 1, freeDates: ["2026-11-17"] });
  });

  it("mai due giorni liberi di fila: la serie riparte da zero", () => {
    const info = streakInfo(days("2026-11-16", "2026-11-19"), "2026-11-20");
    expect(info).toMatchObject({ current: 1, longest: 1 });
  });

  it("al più due giorni liberi a settimana (da lunedì a domenica)", () => {
    // Lun 16 studio, mar 17 libero, mer 18 studio, gio 19 libero, ven 20 studio, sab 21 saltato: terzo della settimana.
    const info = streakInfo(days("2026-11-16", "2026-11-18", "2026-11-20"), "2026-11-22");
    expect(info).toMatchObject({ current: 0, longest: 3 });
    // Domenica 22: la settimana ha già due giorni liberi, la serie riparte; lunedì 23 non c'è serie da coprire.
    const next = streakInfo(days("2026-11-16", "2026-11-18", "2026-11-20", "2026-11-21", "2026-11-24"), "2026-11-24");
    expect(next).toMatchObject({ current: 1, longest: 4 });
  });
});

describe("diario degli errori", () => {
  const log = [
    wrong("2026-11-20", "DISEQ.ESTREMI"),
    wrong("2026-11-19", "DISEQ.ESTREMI"),
    wrong("2026-11-18", "DISEQ.ESTREMI"),
    wrong("2026-09-01", "COND.DENOMINATORE"),
    wrong("2026-09-02", "COND.DENOMINATORE"),
    wrong("2026-09-03", "COND.DENOMINATORE"),
    wrong("2026-11-20", "FORMA.DECIMALE"),
    wrong("2026-11-20", "DISEQ.SEGNO_DENOMINATORE", { distraction: true }),
    wrong("2026-11-20", "NON_CLASSIFICATO"),
    wrong("2026-11-20", "DISEQ.ESTREMI", { context: "lampo" }),
    // Decisione 119: le dimostrazioni non entrano nel diario (nessun codice del catalogo).
    wrong("2026-11-20", "NON_CLASSIFICATO", { context: "dimostrazione", skill: null, generator: null, seed: null, level: null, lesson: "V2.M06.L99", proof: { theorem: "V2.M06.T03", mode: "riordina" } }),
  ];

  it("i recenti pesano di più; le viste sono separate; le domande lampo e le dimostrazioni non entrano", () => {
    const concept = diaryEntries(log, now("2026-11-20"), "concetto");
    expect(concept.map((e) => e.code)).toEqual(["DISEQ.ESTREMI", "NON_CLASSIFICATO", "COND.DENOMINATORE"]);
    expect(concept[0]?.count).toBe(3);
    expect(diaryEntries(log, now("2026-11-20"), "forma").map((e) => e.code)).toEqual(["FORMA.DECIMALE"]);
    expect(diaryEntries(log, now("2026-11-20"), "distrazione").map((e) => e.code)).toEqual(["DISEQ.SEGNO_DENOMINATORE"]);
    expect(weakestErrors(log, now("2026-11-20"))).toEqual(["DISEQ.ESTREMI", "COND.DENOMINATORE"]);
  });

  it("andamento: ultimi 30 giorni contro i 30 precedenti", () => {
    const concept = diaryEntries(log, now("2026-11-20"), "concetto");
    expect(concept.find((e) => e.code === "DISEQ.ESTREMI")).toMatchObject({ last30: 3, previous30: 0, trend: "peggiora" });
    expect(concept.find((e) => e.code === "COND.DENOMINATORE")).toMatchObject({ last30: 0, previous30: 0, trend: "stabile" });
    expect([trendOf(1, 0), trendOf(0, 3), trendOf(5, 5)]).toEqual(["stabile", "migliora", "stabile"]);
    const categories = diaryCategories(diaryEntries(log, now("2026-11-20")));
    expect(categories[0]?.category).toBe("DISEQ");
  });
});

describe("backup", () => {
  const data: StoredData = {
    ...emptyData(),
    attempts: [attempt("2026-11-19", { id: "a" }), attempt("2026-11-20", { id: "b" })],
    lessons: [{ code: "V1.M06.L04", reached: 2, completed: false, startedAt: noon("2026-11-18"), updatedAt: noon("2026-11-19"), completedAt: null }],
    days: [{ date: "2026-11-19", minutes: 40, track: "V1", completedAt: noon("2026-11-19") }],
  };

  it("esporta e reimporta senza perdere nulla; un file estraneo o rovinato viene rifiutato", () => {
    const back = readBackupFile(backupFileText(data, "2026-11-20T18:00:00.000Z"));
    expect(back).toEqual({ ok: true, data, exportedAt: "2026-11-20T18:00:00.000Z" });
    expect(readBackupFile("{ non json").ok).toBe(false);
    expect(readBackupFile(JSON.stringify({ app: "altro", data })).ok).toBe(false);
    const future = readBackupFile(JSON.stringify({ app: "compasso", data: { ...data, version: 99 } }));
    expect(future.ok).toBe(false);
    // Un backup della versione 1 si legge e si porta alla versione attuale.
    const v1 = readBackupFile(JSON.stringify({ app: "compasso", data: { version: 1, attempts: data.attempts, lessons: data.lessons } }));
    expect(v1.ok && v1.data.attempts.length).toBe(2);
  });

  it("unisce due dispositivi: tentativi senza doppioni, lezione al punto più avanti, giorni uniti", () => {
    const other: StoredData = {
      ...emptyData(),
      attempts: [attempt("2026-11-20", { id: "b", distraction: true }), attempt("2026-11-21", { id: "c" })],
      lessons: [{ code: "V1.M06.L04", reached: 5, completed: true, startedAt: noon("2026-11-19"), updatedAt: noon("2026-11-21"), completedAt: noon("2026-11-21") }],
      days: [{ date: "2026-11-21", minutes: 20, track: "V1", completedAt: noon("2026-11-21") }],
      settings: { theme: "dark", tracks: ["V2"], defaultMinutes: 60 },
    };
    const merged = mergeData(data, other);
    expect(merged.attempts.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(merged.attempts.find((a) => a.id === "b")?.distraction).toBe(true);
    expect(merged.lessons).toEqual([{ code: "V1.M06.L04", reached: 5, completed: true, startedAt: noon("2026-11-18"), updatedAt: noon("2026-11-21"), completedAt: noon("2026-11-21") }]);
    expect(merged.days.map((d) => d.date)).toEqual(["2026-11-19", "2026-11-21"]);
    expect(merged.settings).toEqual(data.settings);
    // Unire due volte non cambia nulla.
    expect(mergeData(merged, other)).toEqual(merged);
  });

  it("promemoria: mai fatto con qualcosa da perdere, ogni 10 lezioni, dopo 7 giorni", () => {
    expect(backupDue({ lastAt: null, lessonsAtLast: 0 }, 0, 0, "2026-11-20")).toBe(false);
    expect(backupDue({ lastAt: null, lessonsAtLast: 0 }, 0, 1, "2026-11-20")).toBe(true);
    expect(backupDue({ lastAt: "2026-11-15T10:00:00.000Z", lessonsAtLast: 3 }, 12, 5, "2026-11-20")).toBe(false);
    expect(backupDue({ lastAt: "2026-11-15T10:00:00.000Z", lessonsAtLast: 3 }, 13, 5, "2026-11-20")).toBe(true);
    expect(backupDue({ lastAt: "2026-11-12T10:00:00.000Z", lessonsAtLast: 3 }, 3, 5, "2026-11-20")).toBe(true);
  });
});
