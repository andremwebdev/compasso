// V1.M06.A04.g1 (disequazioni fratte): verifica automatica e casi controllati a mano.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m06/a04-g1";
import { setToLatex } from "../../../../src/motore/sets";

describe("V1.M06.A04.g1 — disequazioni fratte", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 60_000);

  it("al livello 1 ogni esercizio ha almeno tre risposte sbagliate, e quattro quando c'è l'uguale", () => {
    for (let seed = 0; seed < 300; seed++) {
      const { answer, prompt } = generateExercise(generator, 1, seed);
      if (answer.kind !== "set") throw new Error("tipo di risposta inatteso");
      expect(answer.wrong.length, prompt).toBeGreaterThanOrEqual(3);
      if (/\\[gl]e /.test(prompt)) expect(answer.wrong.map((wrong) => wrong.error), prompt).toContain("COND.DENOMINATORE");
    }
  });

  it("ogni livello produce tutti e quattro gli errori richiesti", () => {
    for (const level of [1, 2, 3] as const) {
      const seen = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "set") answer.wrong.forEach((wrong) => seen.add(wrong.error));
      }
      expect([...seen]).toEqual(expect.arrayContaining(["COND.DENOMINATORE", "DISEQ.ESTREMI", "DISEQ.SEGNO_DENOMINATORE", "DISEQ.UNIONE_INTERSEZIONE"]));
    }
  });

  it("ai livelli 2 e 3 quasi tutti gli esercizi hanno almeno tre risposte sbagliate (servono alla scelta multipla)", () => {
    for (const level of [2, 3] as const) {
      let enough = 0;
      for (let seed = 0; seed < 500; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind === "set" && answer.wrong.length >= 3) enough += 1;
      }
      expect(enough / 500).toBeGreaterThan(0.9);
    }
  });

  it("riconosce la risposta giusta e ogni errore tipico scritti da Andrea", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 40; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "set") throw new Error("tipo di risposta inatteso");
        // Quello che l'app mostra (intervalli con il punto e virgola) deve potersi anche scrivere.
        const typed = (latex: string): string =>
          latex.replace(/\\left|\\right/g, "").replace(/\\infty/g, "∞").replace(/\\cup/g, "∪").replace(/\\emptyset/g, "∅").replace(/\\mathbb\{R\}/g, "ℝ")
            .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2").replace(/\\\{/g, "{").replace(/\\\}/g, "}");
        expect(evaluateResponse(exercise, { kind: "text", text: typed(setToLatex(exercise.answer.correct)) }).outcome).toBe("correct");
        for (const wrong of exercise.answer.wrong) {
          const result = evaluateResponse(exercise, { kind: "text", text: typed(setToLatex(wrong.value)) });
          expect(result).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  });
});
