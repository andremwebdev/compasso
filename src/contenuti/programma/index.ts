// Il programma dei tre volumi (dalle scalette): serve alla navigazione di Teoria, ai binari di Oggi,
// ai prerequisiti, al controllo «Lo so già» e all'aggregato della padronanza.

import type { LessonCode, ModuleCode, SkillCode } from "../../codici";
import { programme } from "./data";
import type { PlannedLesson, PlannedModule, PlannedVolume } from "./parse";

export { parseProgramme, programmeSource, type PlannedLesson, type PlannedModule, type PlannedSkill, type PlannedVolume } from "./parse";
export { programme };

const modules = new Map<string, PlannedModule>();
const lessons = new Map<string, PlannedLesson>();
const lessonModule = new Map<string, PlannedModule>();
const skillLesson = new Map<string, PlannedLesson>();
for (const volume of programme) {
  for (const module of volume.modules) {
    modules.set(module.code, module);
    for (const lesson of module.lessons) {
      lessons.set(lesson.code, lesson);
      lessonModule.set(lesson.code, module);
      for (const skill of lesson.skills) skillLesson.set(skill.code, lesson);
    }
  }
}

/** Il volume con questo codice (V1, V2, V3). */
export const findVolume = (code: string): PlannedVolume | undefined => programme.find((volume) => volume.code === code);
/** Il modulo con questo codice. */
export const findModule = (code: string): PlannedModule | undefined => modules.get(code);
/** La lezione prevista con questo codice (scritta o no). */
export const findPlannedLesson = (code: string): PlannedLesson | undefined => lessons.get(code);
/** Il modulo di una lezione. */
export const moduleOfLesson = (code: LessonCode): PlannedModule | undefined => lessonModule.get(code);
/** La lezione che introduce un'abilità. */
export const lessonOfSkill = (code: SkillCode): PlannedLesson | undefined => skillLesson.get(code);
/** La descrizione di un'abilità. */
export const skillText = (code: SkillCode): string | undefined => skillLesson.get(code)?.skills.find((skill) => skill.code === code)?.text;
/** Tutte le abilità di un modulo, nell'ordine delle lezioni. */
export const skillsOfModule = (code: ModuleCode): SkillCode[] => (modules.get(code)?.lessons ?? []).flatMap((lesson) => lesson.skills.map((skill) => skill.code));
/** Tutte le lezioni previste di un volume, in ordine. */
export const lessonsOfVolume = (code: string): PlannedLesson[] => (findVolume(code)?.modules ?? []).flatMap((module) => module.lessons);
