// V2.M12.A01.g1 (equazioni del primo ordine): verifica automatica, soluzioni accettate per
// sostituzione qualunque nome abbia la costante, riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m12/a01-g1";
import { plainText } from "../../scrivi";

describe("V2.M12.A01.g1 — equazioni differenziali del primo ordine", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 300_000);

  it("la soluzione è accettata comunque si chiami la costante, e ogni risposta sbagliata è riconosciuta", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 120; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const { answer } = exercise;
        if (answer.kind !== "expression") throw new Error("tipo di risposta inatteso");
        const where = `livello ${level}, seme ${seed}`;
        const text = plainText(answer.correct);
        expect(evaluateResponse(exercise, { kind: "text", text }).outcome, `${where}: ${text}`).toBe("correct");
        expect(evaluateResponse(exercise, { kind: "text", text: text.replace(/\bc\b/g, "k") }).outcome, where).toBe("correct");
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(3);
        for (const wrong of answer.wrong) {
          const result = evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) });
          expect(result.outcome === "wrong" ? result.error : result.outcome, `${where}: ${plainText(wrong.value)}`).toBe(wrong.error);
        }
      }
    }
  }, 120_000);

  it("una soluzione senza costante arbitraria non è l'integrale generale", () => {
    for (let seed = 0; seed < 40; seed++) {
      const exercise = generateExercise(generator, 1, seed);
      const { answer } = exercise;
      if (answer.kind !== "expression" || answer.check?.kind !== "differentialEquation" || answer.check.constants !== 1) continue;
      // Con c = 0 (o c = 1) la funzione è ancora una soluzione, ma non è l'integrale generale.
      const particular = plainText(answer.correct).replace(/\bc\b/g, "1");
      const result = evaluateResponse(exercise, { kind: "text", text: particular });
      expect(result.outcome === "wrong" ? result.error : result.outcome, `seme ${seed}: ${particular}`).toBe("AN.EDO_COSTANTE");
    }
  });
});
