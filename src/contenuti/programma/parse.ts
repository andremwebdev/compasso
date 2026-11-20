// Legge le scalette dei moduli (docs/SCALETTE.md) e ne ricava il programma: volumi, moduli, lezioni
// previste con durata, prerequisiti e abilità. L'app non legge il Markdown delle scalette: usa il
// file generato `data.ts`, che un test confronta con questa lettura (e che si rigenera con
// `COMPASSO_SCRIVI=1 npx vitest run test/contenuti/programma.test.ts`).

import { isLessonCode, isModuleCode, isSkillCode, type LessonCode, type ModuleCode, type SkillCode } from "../../codici";

export interface PlannedSkill {
  readonly code: SkillCode;
  /** La descrizione breve della scaletta. */
  readonly text: string;
}

export interface PlannedLesson {
  readonly code: LessonCode;
  readonly title: string;
  readonly minutes: number;
  readonly prerequisites: readonly LessonCode[];
  readonly skills: readonly PlannedSkill[];
}

export interface PlannedModule {
  readonly code: ModuleCode;
  readonly title: string;
  /** Vero se Andrea ha approvato la scaletta: da allora i codici sono fissi. */
  readonly approved: boolean;
  readonly lessons: readonly PlannedLesson[];
}

export interface PlannedVolume {
  readonly code: "V1" | "V2" | "V3";
  readonly title: string;
  readonly modules: readonly PlannedModule[];
}

const lessonCodesIn = (text: string): LessonCode[] => Array.from(text.match(/V\d+\.M\d{2}\.L\d{2}/g) ?? [], String).filter(isLessonCode);

/** Il programma letto dal testo delle scalette. Lancia un errore se una riga attesa non si legge. */
export function parseProgramme(markdown: string): PlannedVolume[] {
  const volumes: { code: PlannedVolume["code"]; title: string; modules: { code: ModuleCode; title: string; approved: boolean; lessons: PlannedLesson[] }[] }[] = [];
  let lesson: { code: LessonCode; title: string; minutes: number; prerequisites: LessonCode[]; skills: PlannedSkill[] } | null = null;
  const flush = (): void => {
    if (lesson) volumes.at(-1)?.modules.at(-1)?.lessons.push(lesson);
    lesson = null;
  };
  for (const line of markdown.split("\n")) {
    if (line.startsWith("# ")) {
      flush();
      const volume = /^# Volume (\d), (.+)$/.exec(line);
      if (!volume) {
        if (volumes.length > 0) break; // «Riepilogo e note»: finiti i volumi
        continue;
      }
      const code = `V${volume[1]}`;
      if (code !== "V1" && code !== "V2" && code !== "V3") throw new Error(`Volume sconosciuto: ${line}`);
      volumes.push({ code, title: (volume[2] ?? "").trim(), modules: [] });
      continue;
    }
    if (volumes.length === 0) continue;
    if (line.startsWith("## ")) {
      flush();
      const module = /^## (V\d\.M\d{2}) (.+)$/.exec(line);
      if (!module || !isModuleCode(module[1] ?? "")) throw new Error(`Riga di modulo non letta: ${line}`);
      volumes.at(-1)?.modules.push({ code: module[1] as ModuleCode, title: (module[2] ?? "").trim(), approved: false, lessons: [] });
      continue;
    }
    if (line.startsWith("Stato:")) {
      const module = volumes.at(-1)?.modules.at(-1);
      if (module) module.approved = /^Stato: approvata/.test(line);
      continue;
    }
    if (line.startsWith("#### ")) {
      flush();
      const parts = /^#### (V\d\.M\d{2}\.L\d{2}) · (.+) · (\d+) min$/.exec(line);
      if (!parts || !isLessonCode(parts[1] ?? "")) throw new Error(`Riga di lezione non letta: ${line}`);
      lesson = { code: parts[1] as LessonCode, title: (parts[2] ?? "").trim(), minutes: Number(parts[3]), prerequisites: [], skills: [] };
      continue;
    }
    if (!lesson) continue;
    const current: { prerequisites: LessonCode[]; skills: PlannedSkill[] } = lesson;
    if (line.startsWith("Prerequisiti:")) current.prerequisites = lessonCodesIn(line);
    const skill = /^- Abilità (V\d\.M\d{2}\.A\d{2}): (.+)$/.exec(line);
    if (skill && isSkillCode(skill[1] ?? "")) current.skills.push({ code: skill[1] as SkillCode, text: (skill[2] ?? "").trim() });
  }
  flush();
  return volumes;
}

/** Il testo TypeScript del file generato con il programma. */
export function programmeSource(volumes: readonly PlannedVolume[]): string {
  return [
    "// FILE GENERATO da docs/SCALETTE.md con src/contenuti/programma/parse.ts: non modificarlo a mano.",
    "// Per rigenerarlo: COMPASSO_SCRIVI=1 npx vitest run test/contenuti/programma.test.ts",
    "",
    'import type { PlannedVolume } from "./parse";',
    "",
    `export const programme: readonly PlannedVolume[] = ${JSON.stringify(volumes, null, 1)};`,
    "",
  ].join("\n");
}
