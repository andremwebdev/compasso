// V1.M04.A01.g1 (operazioni con i monomi): verifica automatica, valutazione e vincolo «forma normale».

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m04/a01-g1";
import { plainText } from "../../scrivi";

describe("V1.M04.A01.g1 — operazioni con i monomi", () => {
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
        if (answer.kind !== "expression") throw new Error(`tipo di risposta inatteso, ${where}`);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("l'espressione del testo copiata com'è dà FORMA.NON_RICHIESTA", () => {
    for (const level of [1, 2] as const) {
      for (let seed = 0; seed < 50; seed++) {
        const exercise = generateExercise(generator, level, seed);
        // Il testo tra i dollari, riscritto per la tastiera: è equivalente ma non è un monomio in forma normale.
        const latex = /\$(.*)\$\.$/.exec(exercise.prompt)?.[1] ?? "";
        const typed = latex.replace(/\\left|\\right/g, "").replace(/\\cdot/g, "*").replace(/\^\{(\d+)\}/g, "^$1").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "($1/$2)");
        expect(evaluateResponse(exercise, { kind: "text", text: typed }), `livello ${level}, seme ${seed}: ${typed}`).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
      }
    }
  });
});
