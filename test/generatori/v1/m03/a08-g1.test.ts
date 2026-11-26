// V1.M03.A08.g1 (notazione scientifica e ordine di grandezza, numero): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m03/a08-g1";
import { toLatex, type Expr } from "../../../../src/motore/expr";

/** Come lo scriverebbe Andrea: «3,45·10^(5)», «0,00072», «10^(3)». */
const typed = (value: Expr): string =>
  toLatex(value)
    .replace(/\{,\}/g, ",")
    .replace(/\\cdot/g, "·")
    .replace(/\^\{([^}]*)\}/g, "^($1)")
    .replace(/\\,/g, "")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\s/g, "");

describe("V1.M03.A08.g1 — notazione scientifica e ordine di grandezza", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("la risposta scritta è accettata, le sbagliate previste sono riconosciute (almeno tre dal livello 2)", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const where = `livello ${level}, seme ${seed}`;
        const { answer } = exercise;
        if (answer.kind !== "number") throw new Error(`tipo di risposta inatteso, ${where}`);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "text", text: typed(answer.correct) }).outcome, `${where}: ${typed(answer.correct)}`).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: typed(wrong.value) }), `${where}: ${typed(wrong.value)}`).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("in notazione scientifica, il valore giusto scritto per esteso dà FORMA.NON_RICHIESTA o FORMA.DECIMALE", () => {
    for (const level of [1, 2] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "number" || !exercise.answer.form?.includes("scientificNotation")) continue;
        // a·10ⁿ scritto come (10a)·10^(n−1): stesso valore, mantissa fuori da [1; 10).
        const text = typed(exercise.answer.correct);
        const match = /^(\d+)(?:,(\d+))?·10\^\((-?\d+)\)$/.exec(text);
        if (!match) continue;
        const [, int, dec = "", exp] = match;
        const shifted = `${int}${dec.slice(0, 1) || "0"}${dec.length > 1 ? `,${dec.slice(1)}` : ""}·10^(${Number(exp) - 1})`;
        const result = evaluateResponse(exercise, { kind: "text", text: shifted });
        expect(result.outcome, `livello ${level}, seme ${seed}: ${shifted}`).toBe("wrong");
        expect(["FORMA.NON_RICHIESTA", "FORMA.DECIMALE"], `livello ${level}, seme ${seed}: ${shifted}`).toContain((result as { error?: string }).error);
      }
    }
  });
});
