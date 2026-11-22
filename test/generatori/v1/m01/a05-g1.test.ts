// V1.M01.A05.g1 (condizioni necessarie e sufficienti, scelta multipla): verifica automatica e opzioni.

import { describe, expect, it } from "vitest";
import { choiceOptions, evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m01/a05-g1";

describe("V1.M01.A05.g1 — condizioni necessarie e sufficienti", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("ogni esercizio ha almeno tre opzioni sbagliate, e ognuna è riconosciuta con il suo errore", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}`;
        const { answer } = exercise;
        if (answer.kind !== "choice") throw new Error(`tipo di risposta inatteso, ${where}`);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(3);
        const options = choiceOptions(exercise) ?? [];
        expect(options.length, where).toBe(answer.wrong.length + 1);
        for (const option of options) {
          const result = evaluateResponse(exercise, { kind: "choice", index: option.index });
          if (option.index === 0) expect(result.outcome, where).toBe("correct");
          else expect(result.outcome === "wrong" ? result.error : result.outcome, where).toBe(answer.wrong[option.index - 1]?.error);
        }
      }
    }
  }, 30_000);

  it("le risposte giuste sono metà «sufficiente» e metà «necessaria»", () => {
    for (const level of [1, 2, 3] as const) {
      let sufficient = 0;
      for (let seed = 0; seed < 400; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "choice" && answer.correct.startsWith("sufficiente")) sufficient += 1;
      }
      expect(sufficient, `livello ${level}`).toBeGreaterThan(140);
      expect(sufficient, `livello ${level}`).toBeLessThan(260);
    }
  });
});
