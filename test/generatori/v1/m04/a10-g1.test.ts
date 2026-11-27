// V1.M04.A10.g1 (operazioni con le frazioni algebriche): verifica automatica,
// valutazione delle due forme (insieme ed espressione) e vincolo «ridotta ai minimi termini».

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m04/a10-g1";
import { setToLatex, type SolutionSet } from "../../../../src/motore/sets";
import { plainText } from "../../scrivi";

/** Un insieme scritto come lo si scrive con la tastiera: unione di intervalli. */
const typedSet = (set: SolutionSet): string =>
  setToLatex(set).replace(/\\left|\\right/g, "").replace(/\\infty/g, "∞").replace(/\\cup/g, "∪").replace(/\\mathbb\{R\}/g, "ℝ").replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2").replace(/\s+/g, " ").trim();

describe("V1.M04.A10.g1 — operazioni con le frazioni algebriche", () => {
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
        if (answer.kind === "set") {
          expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
          expect(evaluateResponse(exercise, { kind: "text", text: typedSet(answer.correct) }).outcome, where).toBe("correct");
          for (const wrong of answer.wrong) {
            expect(evaluateResponse(exercise, { kind: "text", text: typedSet(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
          }
        } else if (answer.kind === "expression") {
          expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
          for (const wrong of answer.wrong) {
            expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
          }
        } else throw new Error(`tipo di risposta inatteso, ${where}`);
      }
    }
  }, 30_000);

  it("il risultato giusto ma non ridotto (sul mcm, prima di semplificare) dà FORMA.NON_RICHIESTA", () => {
    let checked = 0;
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 80; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "expression") continue;
        // Il passo 5 delle somme mostra la frazione prima di semplificare: se è diversa dal risultato, non è ridotta.
        const before = /si semplifica: \$\$\\dfrac\{([^$]*)\}\{([^$]*)\} = /.exec(exercise.steps.map((s) => s.text).join(" "));
        if (!before) continue;
        const typed = (t: string): string => t.replace(/\\left|\\right/g, "").replace(/\^\{(\d+)\}/g, "^$1");
        const text = `(${typed(before[1] as string)})/(${typed(before[2] as string)})`;
        expect(evaluateResponse(exercise, { kind: "text", text }), `livello ${level}, seme ${seed}: ${text}`).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});
