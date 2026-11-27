// V1.M05.A01.g1 (equazioni di primo grado): verifica automatica, risposte scritte come le scrive Andrea,
// riconoscimento delle risposte sbagliate previste e casi impossibile e indeterminato.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m05/a01-g1";
import { solutionsText } from "../../scrivi";

describe("V1.M05.A01.g1 — equazioni di primo grado", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("la risposta scritta è accettata, le sbagliate previste sono riconosciute (almeno due, tre dal livello 2)", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}: ${exercise.prompt}`;
        const { answer } = exercise;
        if (answer.kind !== "set") throw new Error(where);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "text", text: solutionsText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: solutionsText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("al livello 3 escono sia equazioni impossibili sia indeterminate", () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const { answer } = generateExercise(generator, 3, seed);
      if (answer.kind === "set") kinds.add(solutionsText(answer.correct).startsWith("x") ? "una" : solutionsText(answer.correct));
    }
    expect([...kinds].sort()).toEqual(["una", "ℝ", "∅"].sort());
  });
});
