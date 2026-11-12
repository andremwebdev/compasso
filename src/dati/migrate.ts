// Migrazioni dei dati: portano un salvataggio vecchio alla versione attuale, un passo alla volta.
// Quando DATA_VERSION sale da n a n+1, qui si aggiunge il passo «n» (e un test con dati della versione n).

import { DATA_VERSION, emptyData, type StoredData } from "./types";

/** I dati sono di una versione più nuova di quella che l'app conosce: non si toccano. */
export class DataVersionError extends Error {
  constructor(readonly found: number) {
    super(`I dati salvati sono della versione ${found}, ma questa app conosce solo fino alla versione ${DATA_VERSION}. Aggiorna l'app prima di continuare.`);
    this.name = "DataVersionError";
  }
}

/** Un passo di migrazione: riceve i dati della versione n e li restituisce nella versione n + 1. */
type Step = (data: Record<string, unknown>) => Record<string, unknown>;

/** I passi, per versione di partenza. Oggi non ce ne sono: la versione 1 è la prima. */
const STEPS: Readonly<Record<number, Step>> = {};

/**
 * Porta alla versione attuale dei dati letti da un salvataggio (di qualunque versione passata).
 * Dati assenti o illeggibili danno un salvataggio vuoto; dati di una versione futura lanciano DataVersionError.
 */
export function migrateData(raw: unknown): StoredData {
  if (typeof raw !== "object" || raw === null) return emptyData();
  let data = raw as Record<string, unknown>;
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
    attempts: Array.isArray(data["attempts"]) ? (data["attempts"] as StoredData["attempts"]) : [],
    lessons: Array.isArray(data["lessons"]) ? (data["lessons"] as StoredData["lessons"]) : [],
  };
}
