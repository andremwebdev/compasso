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

  it("ai livelli 2 e 3 ogni esercizio ha almeno tre risposte sbagliate (servono alla scelta multipla)", () => {
    for (const level of [2, 3] as const) {
      for (let seed = 0; seed < 2000; seed++) {
        const { answer, prompt } = generateExercise(generator, level, seed);
        if (answer.kind !== "set") throw new Error("tipo di risposta inatteso");
        expect(answer.wrong.length, `livello ${level}, seme ${seed}: ${prompt}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("un fattore con il coefficiente di x negativo porta l'errore «verso non invertito»", () => {
    // (−x + 2)/(x − 4) < 0: la risposta giusta è x < 2 ∨ x > 4. Chi studia −x + 2 > 0 come x > 2 trova 2 < x < 4.
    const exercise = generateExercise(generator, 2, 5);
    expect(exercise.prompt).toBe("Risolvi la disequazione $\\frac{-x + 2}{x - 4} < 0$.");
    expect(evaluateResponse(exercise, { kind: "text", text: "x < 2 ∨ x > 4" }).outcome).toBe("correct");
    expect(evaluateResponse(exercise, { kind: "text", text: "2 < x < 4" })).toMatchObject({ outcome: "wrong", error: "DISEQ.VERSO_NON_INVERTITO" });
    // Senza coefficienti negativi l'errore non c'è.
    const plain = generateExercise(generator, 1, 1);
    if (plain.answer.kind !== "set") throw new Error("tipo di risposta inatteso");
    expect(plain.answer.wrong.map((wrong) => wrong.error)).not.toContain("DISEQ.VERSO_NON_INVERTITO");
  });

  it("i passaggi spiegano il segno dei polinomi di secondo grado: due zeri, zero doppio", () => {
    const notes = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const text = generateExercise(generator, 3, seed).steps.map((step) => step.text).join(" ");
      if (text.includes("È un quadrato")) notes.add("quadrato");
      if (text.includes("positivo fuori dai due zeri")) notes.add("due zeri");
      if (text.includes("Il numeratore non si annulla mai")) notes.add("numeratore senza zeri");
    }
    expect([...notes].sort()).toEqual(["due zeri", "numeratore senza zeri", "quadrato"]);
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
