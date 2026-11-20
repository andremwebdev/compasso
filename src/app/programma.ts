// Il programma visto dall'app: quali lezioni sono scritte, a che punto è ognuna, quali moduli sono
// segnati «Lo so già», quali prerequisiti mancano, qual è la prossima lezione di un binario.

import type { LessonCode, ModuleCode, SkillCode } from "../codici";
import { lessonCodes, loadLesson } from "../contenuti";
import { findPlannedLesson, lessonsOfVolume, moduleOfLesson, skillsOfModule, type PlannedLesson } from "../contenuti/programma";
import { aggregateLevel, masteryOf, type MasteryLevel, type SkillMastery, type TrackId } from "../dati";
import type { GeneratorDefinition } from "../esercizi";
import { generators } from "../generatori";
import { checks, lessonProgress } from "./state";

/** Lo stato di una lezione nella navigazione di Teoria. */
export type LessonState = "da iniziare" | "in corso" | "completata" | "in arrivo";

const written = new Set<string>(lessonCodes);

/** Vero se la lezione è scritta (e quindi si può aprire). */
export const isWritten = (code: string): code is LessonCode => written.has(code);

/** A che punto è una lezione. */
export function lessonState(code: LessonCode): LessonState {
  if (!isWritten(code)) return "in arrivo";
  const progress = lessonProgress.value[code];
  if (progress?.completed) return "completata";
  return progress ? "in corso" : "da iniziare";
}

/** I moduli con un controllo «Lo so già» superato. */
export function knownModules(): ReadonlySet<ModuleCode> {
  return new Set(checks.value.filter((check) => check.passed).map((check) => check.module));
}

/** Vero se la lezione è completata o il suo modulo è segnato «Lo so già». */
export function lessonCovered(code: LessonCode, known: ReadonlySet<ModuleCode> = knownModules()): boolean {
  if (lessonProgress.value[code]?.completed) return true;
  const module = moduleOfLesson(code);
  return module !== undefined && known.has(module.code);
}

/** I prerequisiti di una lezione: quelli della scaletta più quelli dell'intestazione del file. */
export function prerequisitesOf(code: LessonCode): LessonCode[] {
  const planned = findPlannedLesson(code)?.prerequisites ?? [];
  const declared = loadLesson(code)?.meta.prerequisites ?? [];
  return [...new Set([...planned, ...declared])];
}

/** I prerequisiti diretti non ancora fatti (né completati né coperti da «Lo so già»). */
export function missingPrerequisites(code: LessonCode): LessonCode[] {
  const known = knownModules();
  return prerequisitesOf(code).filter((prerequisite) => !lessonCovered(prerequisite, known));
}

/** Il titolo di una lezione, scritta o prevista. */
export const lessonTitle = (code: LessonCode): string => loadLesson(code)?.meta.title ?? findPlannedLesson(code)?.title ?? code;

/** I generatori delle abilità di un modulo, nell'ordine delle abilità. */
export function generatorsOfModule(code: ModuleCode): GeneratorDefinition[] {
  const skills = skillsOfModule(code);
  return generators.filter((generator) => skills.includes(generator.skill)).sort((a, b) => skills.indexOf(a.skill) - skills.indexOf(b.skill));
}

/** I generatori delle abilità di una lezione prevista. */
export function generatorsOfLesson(lesson: PlannedLesson): GeneratorDefinition[] {
  const skills = lesson.skills.map((skill) => skill.code);
  return generators.filter((generator) => skills.includes(generator.skill));
}

/** Il primo generatore di un'abilità (di norma l'unico). */
export const generatorOfSkill = (skill: SkillCode): GeneratorDefinition | undefined => generators.find((generator) => generator.skill === skill);

/**
 * La prossima lezione di un binario: prima una lezione già cominciata, poi la prima scritta e non
 * ancora fatta. Le lezioni dei moduli segnati «Lo so già» si saltano; quelle non scritte pure.
 */
export function nextLessonOfTrack(track: TrackId): LessonCode | null {
  const known = knownModules();
  const candidates = lessonsOfVolume(track).filter((lesson) => isWritten(lesson.code) && !lessonCovered(lesson.code, known));
  const started = candidates.find((lesson) => lessonProgress.value[lesson.code] !== undefined);
  return (started ?? candidates[0])?.code ?? null;
}

/** Il livello di padronanza aggregato di un gruppo di abilità. */
export function groupLevel(skills: readonly SkillCode[], map: ReadonlyMap<SkillCode, SkillMastery>): MasteryLevel {
  return aggregateLevel(skills.map((skill) => masteryOf(map, skill)));
}
