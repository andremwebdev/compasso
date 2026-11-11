// Codici fissi di Compasso (specifica, sezione 4): forma e controllo.
// Un codice non si rinomina mai: progressi, prerequisiti, collegamenti e diario puntano ai codici.

/** Modulo: V1.M06 */
export type ModuleCode = `V${number}.M${number}`;
/** Lezione: V1.M06.L04 */
export type LessonCode = `${ModuleCode}.L${number}`;
/** Abilità: V1.M06.A04 */
export type SkillCode = `${ModuleCode}.A${number}`;
/** Generatore: V1.M06.A04.g1 */
export type GeneratorCode = `${SkillCode}.g${number}`;
/** Definizione: V2.M04.D01 */
export type DefinitionCode = `${ModuleCode}.D${number}`;
/** Teorema: V2.M06.T03 */
export type TheoremCode = `${ModuleCode}.T${number}`;
/** Flashcard manuale: V2.M06.F05 */
export type FlashcardCode = `${ModuleCode}.F${number}`;
/** Visualizzazione: VIS.circonferenza-goniometrica */
export type VisualizationCode = `VIS.${string}`;
/** Termine del glossario: segno-di-una-frazione */
export type GlossaryTerm = string;

const MODULE = String.raw`V[1-9]\d*\.M\d{2}`;

const patterns = {
  module: new RegExp(`^${MODULE}$`),
  lesson: new RegExp(`^${MODULE}\\.L\\d{2}$`),
  skill: new RegExp(`^${MODULE}\\.A\\d{2}$`),
  generator: new RegExp(`^${MODULE}\\.A\\d{2}\\.g[1-9]\\d*$`),
  definition: new RegExp(`^${MODULE}\\.D\\d{2}$`),
  theorem: new RegExp(`^${MODULE}\\.T\\d{2}$`),
  flashcard: new RegExp(`^${MODULE}\\.F\\d{2}$`),
  visualization: /^VIS\.[a-z0-9]+(-[a-z0-9]+)*$/,
  glossaryTerm: /^[a-z0-9]+(-[a-z0-9]+)*$/,
} as const;

export const isModuleCode = (code: string): code is ModuleCode => patterns.module.test(code);
export const isLessonCode = (code: string): code is LessonCode => patterns.lesson.test(code);
export const isSkillCode = (code: string): code is SkillCode => patterns.skill.test(code);
export const isGeneratorCode = (code: string): code is GeneratorCode => patterns.generator.test(code);
export const isDefinitionCode = (code: string): code is DefinitionCode => patterns.definition.test(code);
export const isTheoremCode = (code: string): code is TheoremCode => patterns.theorem.test(code);
export const isFlashcardCode = (code: string): code is FlashcardCode => patterns.flashcard.test(code);
export const isVisualizationCode = (code: string): code is VisualizationCode => patterns.visualization.test(code);
export const isGlossaryTerm = (code: string): code is GlossaryTerm => patterns.glossaryTerm.test(code);

/** Il modulo a cui appartiene un codice di lezione, abilità, generatore, definizione, teorema o flashcard. */
export function moduleOf(code: LessonCode | SkillCode | GeneratorCode | DefinitionCode | TheoremCode | FlashcardCode): ModuleCode {
  return code.split(".").slice(0, 2).join(".") as ModuleCode;
}

/** L'abilità di un generatore: V1.M06.A04.g1 → V1.M06.A04. */
export function skillOf(code: GeneratorCode): SkillCode {
  return code.split(".").slice(0, 3).join(".") as SkillCode;
}
