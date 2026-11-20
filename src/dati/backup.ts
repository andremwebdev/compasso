// Backup (specifica, sezione 9): esporta in un file, importa da un file, unisce due dispositivi senza
// perdere nulla, ricorda quando è il momento di farne uno.

import { daysBetween } from "./dates";
import { DataVersionError, migrateData } from "./migrate";
import type { BackupInfo, DayRecord, LessonProgress, StoredData } from "./types";

/** Il contrassegno dei file di backup di Compasso. */
const APP_MARK = "compasso";

/** Il nome del file di backup, con la data. */
export const backupFileName = (today: string): string => `compasso-backup-${today}.json`;

/** Il contenuto del file di backup. */
export function backupFileText(data: StoredData, exportedAt: string): string {
  return JSON.stringify({ app: APP_MARK, exportedAt, data });
}

export type BackupReadResult = { readonly ok: true; readonly data: StoredData; readonly exportedAt: string | null } | { readonly ok: false; readonly message: string };

/** Legge un file di backup: controlla che sia di Compasso e lo porta alla versione attuale dei dati. */
export function readBackupFile(text: string): BackupReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "Il file non è un backup di Compasso: non si riesce a leggerlo." };
  }
  if (typeof parsed !== "object" || parsed === null || (parsed as Record<string, unknown>)["app"] !== APP_MARK) {
    return { ok: false, message: "Il file non è un backup di Compasso." };
  }
  const record = parsed as Record<string, unknown>;
  try {
    const data = migrateData(record["data"]);
    return { ok: true, data, exportedAt: typeof record["exportedAt"] === "string" ? record["exportedAt"] : null };
  } catch (error) {
    if (error instanceof DataVersionError) return { ok: false, message: error.message };
    return { ok: false, message: "Il backup è rovinato: non si riesce a leggerlo." };
  }
}

/** Le stesse cose di due liste, una volta sola: a parità di chiave resta quella di `first`. */
function unionBy<T>(first: readonly T[], second: readonly T[], key: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of [...first, ...second]) if (!seen.has(key(item))) seen.set(key(item), item);
  return [...seen.values()];
}

/** Lo stato di una lezione fatto su due dispositivi: vale il punto più avanti. */
function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  const completedAt = [a.completedAt, b.completedAt].filter((x): x is string => x !== null).sort()[0] ?? null;
  return {
    code: a.code,
    reached: Math.max(a.reached, b.reached),
    completed: a.completed || b.completed,
    startedAt: a.startedAt < b.startedAt ? a.startedAt : b.startedAt,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
    completedAt,
  };
}

/**
 * Unisce i dati di due dispositivi senza perdere nulla: tentativi, ripassi e controlli si sommano
 * (i duplicati si scartano), le lezioni prendono il punto più avanti, i giorni di studio si uniscono.
 * Impostazioni e sessione di Oggi restano quelle di questo dispositivo.
 */
export function mergeData(local: StoredData, other: StoredData): StoredData {
  const lessons = new Map<string, LessonProgress>();
  for (const lesson of [...local.lessons, ...other.lessons]) {
    const before = lessons.get(lesson.code);
    lessons.set(lesson.code, before ? mergeLesson(before, lesson) : lesson);
  }
  const days = new Map<string, DayRecord>();
  for (const day of [...local.days, ...other.days]) {
    const before = days.get(day.date);
    if (!before || day.completedAt < before.completedAt) days.set(day.date, day);
  }
  const backup: BackupInfo = (local.backup.lastAt ?? "") >= (other.backup.lastAt ?? "") ? local.backup : other.backup;
  // A parità di identificatore resta il tentativo di questo dispositivo, ma una «distrazione»
  // segnata su uno dei due non si perde.
  const otherDistractions = new Set(other.attempts.filter((a) => a.distraction).map((a) => a.id));
  return {
    version: local.version,
    attempts: unionBy(local.attempts, other.attempts, (a) => a.id)
      .map((a) => (otherDistractions.has(a.id) && !a.distraction ? { ...a, distraction: true } : a))
      .sort((a, b) => a.at.localeCompare(b.at)),
    lessons: [...lessons.values()],
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    reviews: unionBy(local.reviews, other.reviews, (r) => r.id).sort((a, b) => a.at.localeCompare(b.at)),
    checks: unionBy(local.checks, other.checks, (c) => c.id).sort((a, b) => a.at.localeCompare(b.at)),
    settings: local.settings,
    backup,
    session: local.session,
  };
}

/** Ogni quante lezioni completate e dopo quanti giorni ricordare il backup. */
export const BACKUP_EVERY_LESSONS = 10;
export const BACKUP_EVERY_DAYS = 7;

/**
 * Vero se è il momento di ricordare il backup: ogni 10 lezioni completate, oppure se l'ultimo ha più
 * di 7 giorni. Mai fatto: appena c'è qualcosa da perdere (una lezione o una sessione completata).
 */
export function backupDue(info: BackupInfo, completedLessons: number, studyDays: number, today: string): boolean {
  if (info.lastAt === null) return completedLessons > 0 || studyDays > 0;
  if (completedLessons - info.lessonsAtLast >= BACKUP_EVERY_LESSONS) return true;
  return daysBetween(info.lastAt.slice(0, 10), today) > BACKUP_EVERY_DAYS;
}
