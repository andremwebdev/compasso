// V1.M05.A04.g1 (equazioni di grado superiore): verifica automatica, risposte scritte come le scrive Andrea,
// riconoscimento delle risposte sbagliate previste, binomie, biquadratiche, trinomie e Ruffini.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m05/a04-g1";
import { solutionsText } from "../../scrivi";

describe("V1.M05.A04.g1 — equazioni di grado superiore", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings, formatReport(report)).toEqual([]);
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

  it("al livello 3 ci sono biquadratiche con un t negativo, trinomie o binomie dispari e Ruffini", () => {
    const shapes = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const { prompt } = generateExercise(generator, 3, seed);
      shapes.add(prompt.includes("x^{6}") ? "trinomia" : prompt.includes("x^{4}") ? "biquadratica" : prompt.includes("x^{3} +") && !prompt.includes("x^{2}") ? "binomia" : "ruffini");
    }
    expect([...shapes].sort()).toEqual(["binomia", "biquadratica", "ruffini", "trinomia"]);
  });
});
