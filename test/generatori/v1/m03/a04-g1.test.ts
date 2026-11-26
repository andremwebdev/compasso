// V1.M03.A04.g1 (proprietà delle potenze, numero): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m03/a04-g1";
import { plainText } from "../../scrivi";

describe("V1.M03.A04.g1 — proprietà delle potenze", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("la risposta scritta è accettata, le sbagliate previste sono riconosciute (almeno tre dal livello 2)", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}`;
        const { answer } = exercise;
        if (answer.kind !== "number") throw new Error(`tipo di risposta inatteso, ${where}`);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);
});
