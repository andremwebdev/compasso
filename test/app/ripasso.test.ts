// Flashcard ricavate dalle lezioni, le tre modalità delle dimostrazioni interattive, le serie della
// sezione Esercizi e il controllo «Lo so già».

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadLesson } from "../../src/contenuti";
import { parseLesson } from "../../src/contenuti/formato";
import { skillsOfModule } from "../../src/contenuti/programma";
import { cardsOfLesson, proofsOfLesson } from "../../src/app/ripasso/cards";
import { completeTask, isInOrder, moveStep, shuffledOrder, wrongTask } from "../../src/app/ripasso/drill";
import { CHECK_PASS, checkRecord, knownCheckPlan } from "../../src/app/schermate/checks";
import { seriesItems } from "../../src/app/schermate/Esercizi";
import { findGenerator } from "../../src/generatori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Un caso fisso e ripetibile al posto di Math.random. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

/** Il teorema di Lagrange di riserva dentro una lezione di prova. */
function lagrange() {
  const text = readFileSync(path.join(root, "src/riserva/v2/m06/t03.md"), "utf8");
  const source = ["---", "codice: V2.M06.L99", "titolo: Prova", "obiettivo: Prova.", "prerequisiti: []", "durata: 10", "abilita: []", "termini: []", "---", "", text, "", ":::riepilogo", "Fine.", ":::", ""].join("\n");
  const lesson = parseLesson(source).lesson;
  if (!lesson) throw new Error("lezione di prova non letta");
  return lesson;
}

describe("flashcard", () => {
  it("ogni definizione e ogni teorema diventano una flashcard, più le manuali, con il loro codice", () => {
    const lesson = loadLesson("V1.M06.L04");
    if (!lesson) throw new Error("manca la lezione");
    const cards = cardsOfLesson(lesson);
    expect(cards.map((card) => card.id)).toEqual(["V1.M06.D02", "V1.M06.D03", "V1.M06.F01", "V1.M06.F02"]);
    expect(cards[0]?.front).toContain("Definisci");
    const theorem = cardsOfLesson(lagrange()).find((card) => card.kind === "teorema");
    expect(theorem?.front).toContain("Enuncia il teorema");
  });
});

describe("dimostrazioni interattive", () => {
  const proof = proofsOfLesson(lagrange())[0];
  if (!proof) throw new Error("manca la dimostrazione");
  const steps = proof.steps;

  it("riordina: i passaggi fissi restano al loro posto, l'ordine mescolato non è già giusto", () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const order = shuffledOrder(steps, seeded(seed));
      expect([...order].sort((a, b) => a - b)).toEqual(steps.map((_, i) => i));
      steps.forEach((step, index) => {
        if (step.fixed) expect(order[index]).toBe(index);
      });
      expect(isInOrder(order)).toBe(false);
    }
  });

  it("riordina: le frecce scambiano due passaggi e saltano quelli fissi", () => {
    const order = steps.map((_, i) => i);
    const firstFree = steps.findIndex((step) => !step.fixed);
    const moved = moveStep(order, steps, firstFree, 1);
    expect(moved).not.toEqual(order);
    expect(moveStep(moved, steps, firstFree, 1).length).toBe(steps.length);
    const fixed = steps.findIndex((step) => step.fixed);
    if (fixed >= 0) expect(moveStep(order, steps, fixed, 1)).toEqual(order);
  });

  it("trova lo sbagliato e completa usano solo passaggi con versioni sbagliate", () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const wrong = wrongTask(steps, seeded(seed));
      expect(wrong && steps[wrong.index]?.wrong).toContainEqual(wrong?.wrong);
      const complete = completeTask(steps, seeded(seed));
      expect(complete?.options.filter((option) => option.correct).length).toBe(1);
      expect(complete?.options.length).toBe((steps[complete?.index ?? 0]?.wrong.length ?? 0) + 1);
    }
  });
});

describe("serie di esercizi e «Lo so già»", () => {
  it("le serie alternano i generatori e rispettano i livelli che ciascuno offre", () => {
    const pool = ["V2.M09.A01.g1", "V2.M09.A02.g1"].map((code) => findGenerator(code)).filter((g) => g !== undefined);
    const items = seriesItems(pool, 10, 3);
    expect(items.length).toBe(10);
    expect(new Set(items.map((item) => item.generator)).size).toBe(2);
    expect(items.every((item) => item.level === 3)).toBe(true);
    expect(seriesItems(pool, 4, "auto").every((item) => item.level === "auto")).toBe(true);
  });

  it("il controllo ha 5 esercizi; superato con 4 giuste, le abilità del modulo partono da consolidato", () => {
    const plan = knownCheckPlan("V1.M06");
    expect(plan.items.map((item) => item.level)).toEqual([2, 2, 2, 3, 3]);
    expect(plan.check).toBe("V1.M06");
    const result = (outcome: "correct" | "wrong") => ({ generator: "V1.M06.A04.g1", skill: "V1.M06.A04", level: 2, outcome }) as const;
    const passed = checkRecord("V1.M06", [result("correct"), result("correct"), result("wrong"), result("correct"), result("correct")], "id", "2026-11-20T10:00:00.000Z");
    expect(CHECK_PASS).toBe(4);
    expect(passed).toMatchObject({ passed: true, skills: skillsOfModule("V1.M06"), failed: ["V1.M06.A04"] });
    const failed = checkRecord("V1.M06", [result("wrong"), result("wrong"), result("correct"), result("correct"), result("correct")], "id", "2026-11-20T10:00:00.000Z");
    expect(failed).toMatchObject({ passed: false, skills: ["V1.M06.A04"], failed: ["V1.M06.A04"] });
  });
});
