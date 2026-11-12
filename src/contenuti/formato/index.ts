// Formato delle lezioni: punto di accesso.

export * from "./lesson";
export { parseLesson, lessonReferences, blockTexts, type LessonParseResult, type LessonReferences } from "./parse";
export { splitInline, unbalancedMath, type InlineSegment } from "./inline";
export {
  formatContentReport, lessonPath, verifyContents,
  type ContentCatalog, type ContentFile, type ContentProblem, type ContentReport, type GlossaryEntry,
} from "./verify";
