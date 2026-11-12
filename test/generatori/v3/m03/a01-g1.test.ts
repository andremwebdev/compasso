// V3.M03.A01.g1 (calcolo del determinante): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v3/m03/a01-g1";
import { toLatex } from "../../../../src/motore/expr";

describe("V3.M03.A01.g1 — calcolo del determinante", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("ogni esercizio ha tre risposte sbagliate previste, tutte riconosciute", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 200; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "number") throw new Error("tipo di risposta inatteso");
        const { correct, wrong } = exercise.answer;
        expect(wrong.length, `livello ${level}, seme ${seed}`).toBe(3);
        expect(evaluateResponse(exercise, { kind: "text", text: toLatex(correct) }).outcome).toBe("correct");
        for (const candidate of wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: toLatex(candidate.value) })).toMatchObject({ outcome: "wrong", error: candidate.error });
        }
      }
    }
  });

  it("un decimale al posto dell'intero è un errore di forma", () => {
    const exercise = generateExercise(generator, 1, 0);
    if (exercise.answer.kind !== "number") throw new Error("tipo di risposta inatteso");
    const result = evaluateResponse(exercise, { kind: "text", text: `${toLatex(exercise.answer.correct)},0` });
    expect(result).toMatchObject({ outcome: "wrong", error: "FORMA.DECIMALE" });
  });
});
