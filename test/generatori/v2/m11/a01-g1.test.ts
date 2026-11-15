// V2.M11.A01.g1 (convergenza delle serie): verifica automatica e opzioni.

import { describe, expect, it } from "vitest";
import { choiceOptions, evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m11/a01-g1";

describe("V2.M11.A01.g1 — convergenza delle serie", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 300_000);

  it("ogni esercizio è una scelta multipla con tre opzioni sbagliate, e ognuna è riconosciuta con il suo errore", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}`;
        const options = choiceOptions(exercise);
        expect(options, where).not.toBeNull();
        expect(options?.length, where).toBe(4);
        const { answer } = exercise;
        if (answer.kind !== "choice") throw new Error("tipo di risposta inatteso");
        for (const option of options ?? []) {
          const result = evaluateResponse(exercise, { kind: "choice", index: option.index });
          if (option.index === 0) expect(result.outcome, where).toBe("correct");
          else expect(result.outcome === "wrong" ? result.error : result.outcome, where).toBe(answer.wrong[option.index - 1]?.error);
        }
      }
    }
  });

  it("i verdetti sono bilanciati: a ogni livello ci sono serie che convergono e serie che non convergono", () => {
    for (const level of [1, 2, 3] as const) {
      let converging = 0;
      for (let seed = 0; seed < 400; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "choice" && answer.correct.startsWith("**Converge")) converging += 1;
      }
      expect(converging, `livello ${level}`).toBeGreaterThan(100);
      expect(converging, `livello ${level}`).toBeLessThan(300);
    }
  });
});
