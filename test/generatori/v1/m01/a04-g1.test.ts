// V1.M01.A04.g1 (valore di verità, vero o falso): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m01/a04-g1";

describe("V1.M01.A04.g1 — valore di verità delle proposizioni composte", () => {
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

  it("l'«o» esclusivo e la negazione estesa sono riconosciuti, a ogni livello", () => {
    for (const level of [1, 2, 3] as const) {
      const codes = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "truefalse" && answer.error) codes.add(answer.error);
      }
      expect([...codes].sort(), `livello ${level}`).toEqual(["LOG.O_ESCLUSIVO", "LOG.PORTATA_NEGAZIONE"]);
    }
  });
});
