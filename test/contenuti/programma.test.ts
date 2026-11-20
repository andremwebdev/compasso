// Il programma dell'app (src/contenuti/programma/data.ts) è generato dalle scalette: qui si controlla
// che sia allineato a docs/SCALETTE.md e coerente con le lezioni e i generatori presenti.
// Con COMPASSO_SCRIVI=1 il test riscrive il file generato invece di confrontarlo.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lessonCodes, loadLesson } from "../../src/contenuti";
import { findPlannedLesson, lessonOfSkill, parseProgramme, programme, programmeSource } from "../../src/contenuti/programma";
import { generators } from "../../src/generatori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataFile = path.join(root, "src/contenuti/programma/data.ts");

describe("programma dalle scalette", () => {
  const parsed = parseProgramme(readFileSync(path.join(root, "docs/SCALETTE.md"), "utf8"));

  it("il file generato corrisponde a docs/SCALETTE.md", () => {
    const source = programmeSource(parsed);
    if (process.env["COMPASSO_SCRIVI"] === "1") writeFileSync(dataFile, source);
    expect(readFileSync(dataFile, "utf8")).toBe(source);
  });

  it("tre volumi, 35 moduli, 230 lezioni con durata tra 10 e 20 minuti; il Volume 1 è approvato", () => {
    expect(programme.map((v) => v.modules.length)).toEqual([14, 12, 9]);
    const all = programme.flatMap((v) => v.modules.flatMap((m) => m.lessons));
    expect(all.length).toBe(230);
    expect(all.every((l) => l.minutes >= 10 && l.minutes <= 20)).toBe(true);
    expect(programme[0]?.modules.every((m) => m.approved)).toBe(true);
    expect(new Set(all.map((l) => l.code)).size).toBe(all.length);
  });

  it("i prerequisiti esistono e vengono prima", () => {
    const order = programme.flatMap((v) => v.modules.flatMap((m) => m.lessons.map((l) => l.code)));
    for (const lesson of programme.flatMap((v) => v.modules.flatMap((m) => m.lessons))) {
      for (const prerequisite of lesson.prerequisites) expect(order.indexOf(prerequisite), `${lesson.code} ← ${prerequisite}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("ogni lezione scritta è nel programma con lo stesso titolo; ogni generatore rimanda alla lezione della sua abilità", () => {
    for (const code of lessonCodes) expect(findPlannedLesson(code)?.title, code).toBe(loadLesson(code)?.meta.title);
    for (const generator of generators) expect(lessonOfSkill(generator.skill)?.code, generator.code).toBe(generator.lesson);
  });
});
