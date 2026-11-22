// V1.M01.A01.g1 (appartenenza e inclusione, vero o falso): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m01/a01-g1";

describe("V1.M01.A01.g1 — appartenenza e inclusione", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("la risposta giusta è accettata, il contrario dà il suo errore (o NON_CLASSIFICATO)", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}`;
        const { answer } = exercise;
        if (answer.kind !== "truefalse") throw new Error(`tipo di risposta inatteso, ${where}`);
        expect(evaluateResponse(exercise, { kind: "truefalse", value: answer.correct }).outcome, where).toBe("correct");
        const contrary = evaluateResponse(exercise, { kind: "truefalse", value: !answer.correct });
        expect(contrary.outcome === "wrong" ? contrary.error : contrary.outcome, where).toBe(answer.error ?? "NON_CLASSIFICATO");
      }
    }
  }, 30_000);

  it("a ogni livello le affermazioni vere e quelle false sono più o meno metà e metà", () => {
    for (const level of [1, 2, 3] as const) {
      let truths = 0;
      for (let seed = 0; seed < 400; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "truefalse" && answer.correct) truths += 1;
      }
      expect(truths, `livello ${level}`).toBeGreaterThan(140);
      expect(truths, `livello ${level}`).toBeLessThan(260);
    }
  }, 30_000);

  it("lo scambio tra ∈ e ⊆ porta il suo errore", () => {
    const exercise = Array.from({ length: 200 }, (_, seed) => generateExercise(generator, 1, seed)).find((e) => e.prompt.includes("\\} \\in A"));
    expect(exercise).toBeDefined();
    if (exercise?.answer.kind !== "truefalse") throw new Error("esercizio non trovato");
    expect(exercise.answer.correct).toBe(false);
    expect(evaluateResponse(exercise, { kind: "truefalse", value: true })).toMatchObject({ outcome: "wrong", error: "LOG.APPARTENENZA_INCLUSIONE" });
  });
});
