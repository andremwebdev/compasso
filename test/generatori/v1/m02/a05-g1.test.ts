// V1.M02.A05.g1 (frazioni e decimali limitati): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m02/a05-g1";
import { toLatex, type Expr } from "../../../../src/motore/expr";
import { plainText } from "../../scrivi";

/** Come la scrive Andrea: «0,05» per un decimale, «13/4» per una frazione. */
const typed = (value: Expr): string => (toLatex(value).includes("{,}") ? toLatex(value).replace("{,}", ",") : plainText(value));

describe("V1.M02.A05.g1 — frazioni e decimali limitati", () => {
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
        expect(evaluateResponse(exercise, { kind: "text", text: typed(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: typed(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("la frazione giusta non ridotta dà FORMA.NON_RICHIESTA", () => {
    for (const level of [2, 3] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "number" || exercise.answer.correct.kind !== "num") continue;
        const { n, d } = exercise.answer.correct.value;
        expect(evaluateResponse(exercise, { kind: "text", text: `${n * 2n}/${d * 2n}` }), `livello ${level}, seme ${seed}`).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
      }
    }
  });
});
