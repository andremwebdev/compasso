// V1.M04.A07.g1 (scomposizione di polinomi): verifica automatica e vincolo di forma «scomposta».

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m04/a07-g1";
import { expand } from "../../../../src/motore/algebra/expand";
import { toLatex } from "../../../../src/motore/expr";

/** Il LaTeX di un polinomio o di un prodotto, riscritto come lo si scrive con la tastiera. */
const typed = (latex: string): string => latex.replace(/\\left|\\right/g, "").replace(/\^\{(\d+)\}/g, "^$1");

describe("V1.M04.A07.g1 — scomposizione di polinomi", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 60_000);

  it("ogni esercizio ha almeno due risposte sbagliate previste, tre dal livello 2", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 400; seed++) {
        const { answer, prompt } = generateExercise(generator, level, seed);
        if (answer.kind !== "expression") throw new Error("tipo di risposta inatteso");
        // Dal livello 2 in su servono tre risposte sbagliate: l'esercizio può diventare una scelta multipla.
        expect(answer.wrong.length, `livello ${level}, seme ${seed}: ${prompt}`).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
      }
    }
  });

  it("la risposta scomposta è giusta, il polinomio sviluppato è un errore di forma, gli errori tipici sono riconosciuti", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 60; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "expression") throw new Error("tipo di risposta inatteso");
        const { correct, wrong } = exercise.answer;
        expect(evaluateResponse(exercise, { kind: "text", text: typed(toLatex(correct)) }).outcome).toBe("correct");
        // Equivalente ma non scomposto: FORMA.NON_RICHIESTA, con il motivo.
        const unfactored = evaluateResponse(exercise, { kind: "text", text: typed(toLatex(expand(correct))) });
        expect(unfactored).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA", cause: "form" });
        for (const candidate of wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: typed(toLatex(candidate.value)) })).toMatchObject({ outcome: "wrong", error: candidate.error });
        }
      }
    }
  });
});
