// Migrazioni dei dati: portano un salvataggio vecchio alla versione attuale, un passo alla volta.
// Quando DATA_VERSION sale da n a n+1, qui si aggiunge il passo «n» (e un test con dati della versione n).

import {
  DATA_VERSION, defaultSettings, emptyBackup, emptyData, SESSION_MINUTES, TRACKS, type BackupInfo, type SessionMinutes, type Settings,
  type StoredData, type TodaySession, type TrackId,
} from "./types";

/** I dati sono di una versione più nuova di quella che l'app conosce: non si toccano. */
export class DataVersionError extends Error {
  constructor(readonly found: number) {
    super(`I dati salvati sono della versione ${found}, ma questa app conosce solo fino alla versione ${DATA_VERSION}. Aggiorna l'app prima di continuare.`);
    this.name = "DataVersionError";
  }
}

/** Un passo di migrazione: riceve i dati della versione n e li restituisce nella versione n + 1. */
type Step = (data: Record<string, unknown>) => Record<string, unknown>;

/** I passi, per versione di partenza. */
const STEPS: Readonly<Record<number, Step>> = {
  // 1 → 2: arrivano giorni di studio, ripassi delle flashcard, controlli «Lo so già», impostazioni,
  // stato del backup e sessione di Oggi. I dati vecchi restano come sono.
  1: (data) => ({ ...data, version: 2, days: [], reviews: [], checks: [], settings: defaultSettings(), backup: emptyBackup(), session: null }),
  // 2 → 3: arrivano i tentativi sulle dimostrazioni (contesto «dimostrazione», campo facoltativo
  // `proof`). I tentativi vecchi non ne hanno bisogno: restano come sono.
  2: (data) => ({ ...data, version: 3 }),
};

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Impostazioni lette da un salvataggio: un campo mancante o strano prende il valore predefinito. */
export function readSettings(value: unknown): Settings {
  const base = defaultSettings();
  if (!isRecord(value)) return base;
  const theme = value["theme"] === "light" || value["theme"] === "dark" || value["theme"] === "system" ? value["theme"] : base.theme;
  const tracks = TRACKS.filter((track) => list<unknown>(value["tracks"]).includes(track));
  const minutes = SESSION_MINUTES.find((m) => m === value["defaultMinutes"]) ?? base.defaultMinutes;
  return { theme, tracks: tracks.length > 0 ? tracks : base.tracks, defaultMinutes: minutes };
}

function readBackup(value: unknown): BackupInfo {
  if (!isRecord(value)) return emptyBackup();
  return {
    lastAt: typeof value["lastAt"] === "string" ? value["lastAt"] : null,
    lessonsAtLast: typeof value["lessonsAtLast"] === "number" ? value["lessonsAtLast"] : 0,
  };
}

function readSession(value: unknown): TodaySession | null {
  if (!isRecord(value) || typeof value["date"] !== "string" || typeof value["startedAt"] !== "string") return null;
  const minutes = SESSION_MINUTES.find((m) => m === value["minutes"]);
  if (minutes === undefined) return null;
  const track = TRACKS.find((t) => t === value["track"]) ?? null;
  return {
    date: value["date"],
    minutes: minutes as SessionMinutes,
    track: track as TrackId | null,
    lesson: typeof value["lesson"] === "string" ? (value["lesson"] as TodaySession["lesson"]) : null,
    phase: typeof value["phase"] === "number" ? Math.min(Math.max(Math.trunc(value["phase"]), 0), 4) : 0,
    doneInPhase: typeof value["doneInPhase"] === "number" ? Math.max(Math.trunc(value["doneInPhase"]), 0) : 0,
    startedAt: value["startedAt"],
  };
}

/**
 * Porta alla versione attuale dei dati letti da un salvataggio (di qualunque versione passata).
 * Dati assenti o illeggibili danno un salvataggio vuoto; dati di una versione futura lanciano DataVersionError.
 */
export function migrateData(raw: unknown): StoredData {
  if (!isRecord(raw)) return emptyData();
  let data = raw;
  let version = typeof data["version"] === "number" ? data["version"] : 0;
  if (version > DATA_VERSION) throw new DataVersionError(version);
  if (version < 1) return emptyData();
  while (version < DATA_VERSION) {
    const step = STEPS[version];
    if (!step) throw new Error(`Manca la migrazione dei dati dalla versione ${version}.`);
    data = step(data);
    version += 1;
  }
  return {
    version: DATA_VERSION,
    attempts: list(data["attempts"]),
    lessons: list(data["lessons"]),
    days: list(data["days"]),
    reviews: list(data["reviews"]),
    checks: list(data["checks"]),
    settings: readSettings(data["settings"]),
    backup: readBackup(data["backup"]),
    session: readSession(data["session"]),
  };
}

/** Per chi legge i dati da IndexedDB, dove ogni parte sta in un magazzino suo. */
export const readStoredParts = { settings: readSettings, backup: readBackup, session: readSession };
