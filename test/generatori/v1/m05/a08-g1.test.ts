// V1.M05.A08.g1 (equazioni parametriche): verifica automatica, risposte scritte come le scrive Andrea
// (insiemi di valori di k e numeri), riconoscimento delle risposte sbagliate previste.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m05/a08-g1";
import { setToLatex, type SolutionSet } from "../../../../src/motore/sets";
import { plainText } from "../../scrivi";

/** Un insieme scritto come lo si scrive con la tastiera: unione di intervalli. */
const typedSet = (set: SolutionSet): string =>
  setToLatex(set).replace(/\\left|\\right/g, "").replace(/\\infty/g, "∞").replace(/\\cup/g, "∪").replace(/\\mathbb\{R\}/g, "ℝ").replace(/\\emptyset/g, "∅").replace(/-?\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (m, a, b) => `${m.startsWith("-") ? "-" : ""}${a}/${b}`).replace(/\\\{|\\\}/g, (m) => m.slice(1)).replace(/\s+/g, " ").trim();

describe("V1.M05.A08.g1 — equazioni parametriche", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings, formatReport(report)).toEqual([]);
  }, 120_000);

  it("la risposta scritta è accettata, le sbagliate previste sono riconosciute (almeno due, tre dal livello 2)", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}: ${exercise.prompt}`;
        const { answer } = exercise;
        if (answer.kind === "set") {
          expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
          expect(evaluateResponse(exercise, { kind: "text", text: typedSet(answer.correct) }).outcome, `${where} ${typedSet(answer.correct)}`).toBe("correct");
          for (const wrong of answer.wrong) {
            expect(evaluateResponse(exercise, { kind: "text", text: typedSet(wrong.value) }), `${where} ${typedSet(wrong.value)}`).toMatchObject({ outcome: "wrong", error: wrong.error });
          }
        } else if (answer.kind === "number") {
          expect(answer.wrong.length, where).toBeGreaterThanOrEqual(3);
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
          for (const wrong of answer.wrong) {
            expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
          }
        } else throw new Error(where);
      }
    }
  }, 30_000);

  it("le risposte scritte con le disuguaglianze in k sono accettate", () => {
    const exercise = generateExercise(generator, 1, 0);
    if (exercise.answer.kind !== "set") throw new Error("atteso un insieme");
    const text = (/\$\$(.*) \\qquad|Longrightarrow\\quad ([^$]*)\$\$/.exec(exercise.steps.map((s) => s.text).join(" "))?.[2] ?? "").replace("\\le", "≤").replace("\\ge", "≥").trim();
    expect(evaluateResponse(exercise, { kind: "text", text }).outcome, text).toBe("correct");
  });
});
