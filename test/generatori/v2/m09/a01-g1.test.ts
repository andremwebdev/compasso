// V2.M09.A01.g1 (integrali indefiniti): verifica automatica, primitive accettate qualunque costante
// abbiano, riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m09/a01-g1";
import { plainText } from "../../scrivi";

/** Risponde a un esercizio (livello, seme) con un testo e restituisce l'esito e l'eventuale codice di errore. */
function answer(level: 1 | 2 | 3, seed: number, text: string): string {
  const result = evaluateResponse(generateExercise(generator, level, seed), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
}

describe("V2.M09.A01.g1 — integrali indefiniti", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 300_000);

  it("ogni esercizio ha almeno tre risposte sbagliate previste, l'ultima senza la costante arbitraria", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 400; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind !== "expression") throw new Error("tipo di risposta inatteso");
        expect(spec.wrong.length, `livello ${level}, seme ${seed}`).toBeGreaterThanOrEqual(3);
        expect(spec.wrong.at(-1)?.error).toBe("AN.COSTANTE_INTEGRAZIONE");
      }
    }
  }, 60_000);

  it("la risposta giusta scritta a mano è accettata e ogni risposta sbagliata è riconosciuta con il suo codice", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 150; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const { answer: spec } = exercise;
        if (spec.kind !== "expression") throw new Error("tipo di risposta inatteso");
        const where = `livello ${level}, seme ${seed}`;
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(spec.correct) }).outcome, where).toBe("correct");
        // Una costante con un altro nome, più un numero: è sempre la stessa famiglia di primitive.
        expect(evaluateResponse(exercise, { kind: "text", text: `${plainText(spec.correct)} + 3 - 2k` }).outcome, where).toBe("correct");
        for (const wrong of spec.wrong) {
          const result = evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) });
          expect(result.outcome === "wrong" ? result.error : result.outcome, `${where}: ${plainText(wrong.value)}`).toBe(wrong.error);
        }
      }
    }
  }, 120_000);

  it("ogni livello allena le sue tecniche", () => {
    const seen = (level: 1 | 2 | 3): string[] => {
      const codes = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind === "expression") spec.wrong.forEach((wrong) => codes.add(wrong.error));
      }
      return [...codes].sort();
    };
    expect(seen(1)).toEqual(["AN.COSTANTE_INTEGRAZIONE", "AN.PRIMITIVA_ELEMENTARE", "AN.SOSTITUZIONE_FATTORE"]);
    expect(seen(2)).toEqual(expect.arrayContaining(["AN.INTEGRAZIONE_PARTI", "AN.INTEGRALE_PRODOTTO", "AN.SOSTITUZIONE_FATTORE", "AN.FRATTI_SEMPLICI"]));
    expect(seen(3)).toEqual(expect.arrayContaining(["AN.FRATTI_SEMPLICI", "AN.INTEGRAZIONE_PARTI", "ALG.SEGNI_FATTORI", "CALC.MENO_PARENTESI"]));
  });
});
