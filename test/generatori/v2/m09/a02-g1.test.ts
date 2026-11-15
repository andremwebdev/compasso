// V2.M09.A02.g1 (integrali definiti): verifica automatica, valori esatti, riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m09/a02-g1";
import { plainText } from "../../scrivi";

describe("V2.M09.A02.g1 — integrali definiti", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 300_000);

  it("ogni esercizio ha almeno tre risposte sbagliate previste, tra cui un errore sugli estremi", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 400; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind !== "number") throw new Error("tipo di risposta inatteso");
        const where = `livello ${level}, seme ${seed}`;
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(3);
        expect(answer.wrong.map((wrong) => wrong.error), where).toContain("AN.ESTREMI_INTEGRALE");
      }
    }
  });

  it("la risposta giusta scritta a mano è accettata, il decimale no, e ogni risposta sbagliata è riconosciuta", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 150; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const { answer } = exercise;
        if (answer.kind !== "number") throw new Error("tipo di risposta inatteso");
        const where = `livello ${level}, seme ${seed}`;
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          const result = evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) });
          expect(result.outcome === "wrong" ? result.error : result.outcome, `${where}: ${plainText(wrong.value)}`).toBe(wrong.error);
        }
      }
    }
  }, 120_000);
});
