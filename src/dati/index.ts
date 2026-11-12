// Dati di Andrea: registro dei tentativi, progressi delle lezioni, versione e migrazioni.

export { DATA_VERSION, emptyData, type AttemptContext, type AttemptRecord, type LessonProgress, type StoredData } from "./types";
export { DataVersionError, migrateData } from "./migrate";
export { openIndexedDbStore, openJsonStore, openStore, type DataStore, type TextStorage } from "./store";
export { skillSummaries, type SkillSummary } from "./summary";
