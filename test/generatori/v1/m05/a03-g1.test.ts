// V1.M05.A03.g1 (somma e prodotto delle soluzioni, equazione con soluzioni date): verifica automatica,
// risposte scritte come le scrive Andrea, riconoscimento delle sbagliate e vincolo «sviluppato».

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m05/a03-g1";
import { plainText } from "../../scrivi";

describe("V1.M05.A03.g1 — somma e prodotto delle soluzioni", () => {
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
        if (answer.kind !== "number" && answer.kind !== "expression") throw new Error(where);
        expect(answer.wrong.length, where).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("l'equazione scritta con i fattori, giusta ma non sviluppata, dà FORMA.NON_RICHIESTA", () => {
    let checked = 0;
    for (const level of [1, 3] as const) {
      for (let seed = 0; seed < 80; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "expression") continue;
        const roots = [...exercise.prompt.matchAll(/soluzioni \$([^$]*)\$ e \$([^$]*)\$/g)][0];
        if (!roots) throw new Error(exercise.prompt);
        const typed = (latex: string): string => latex.replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)");
        const lead = /primo coefficiente \$(\d+)\$/.exec(exercise.prompt)?.[1] ?? "1";
        const text = `${lead}(x - (${typed(roots[1] as string)}))(x - (${typed(roots[2] as string)}))`;
        expect(evaluateResponse(exercise, { kind: "text", text }), `livello ${level}, seme ${seed}: ${text}`).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});
