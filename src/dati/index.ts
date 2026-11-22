// Dati di Andrea: registro dei tentativi, progressi, versione e migrazioni; padronanza, ripasso,
// serie di giorni, diario degli errori e backup, tutti ricavati dai dati salvati.

export {
  DATA_VERSION, defaultSettings, emptyBackup, emptyData, SESSION_MINUTES, TRACKS,
  type AttemptContext, type AttemptRecord, type ProofAttempt, type ProofMode, type BackupInfo, type DayRecord, type FlashcardReview, type KnownCheck, type LessonProgress,
  type SessionMinutes, type Settings, type StoredData, type ThemeChoice, type TodaySession, type TrackId,
} from "./types";
export { DataVersionError, migrateData, readSettings } from "./migrate";
export { openIndexedDbStore, openJsonStore, openStore, type DataStore, type TextStorage } from "./store";
export { skillSummaries, type SkillSummary } from "./summary";
export { addDays, dateOf, dayNumber, daysBetween, localDate, weekStart } from "./dates";
export {
  aggregateLevel, countsForMastery, dueSkills, MASTERY_LABELS, MASTERY_LEVELS, masteryOf, nextAutoLevel, REVIEW_STEPS, skillMasteries, startingLevel,
  type MasteryLevel, type SkillMastery,
} from "./mastery";
export { cardSchedules, dueCards, GRADE_LABELS, type CardSchedule } from "./flashcards";
export { FREE_DAYS_PER_WEEK, streakInfo, type StreakInfo } from "./streak";
export { diaryCategories, diaryEntries, trendOf, viewOf, weakestErrors, type CategoryEntry, type DiaryEntry, type DiaryView, type Trend } from "./diary";
export { BACKUP_EVERY_DAYS, BACKUP_EVERY_LESSONS, backupDue, backupFileName, backupFileText, mergeData, readBackupFile, type BackupReadResult } from "./backup";
