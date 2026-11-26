// V1.M03.A05.g1 (radicali, numero con vincolo simplifiedRadicals): verifica automatica e valutazione.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m03/a05-g1";
import { plainText } from "../../scrivi";

describe("V1.M03.A05.g1 — portare fuori e radicali simili", () => {
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
        expect(evaluateResponse(exercise, { kind: "text", text: plainText(answer.correct) }).outcome, where).toBe("correct");
        for (const wrong of answer.wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: plainText(wrong.value) }), where).toMatchObject({ outcome: "wrong", error: wrong.error });
        }
      }
    }
  }, 30_000);

  it("un radicale giusto ma non semplificato dà FORMA.NON_RICHIESTA", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const { answer } = exercise;
        if (answer.kind !== "number") throw new Error("tipo di risposta inatteso");
        // k·ⁿ√d scritto come ⁿ√(kⁿ·d): stesso valore, niente portato fuori.
        const text = plainText(answer.correct);
        const match = /^(-?)\(?(\d*)\)?\*?\(?(sqrt|root)\((?:3, )?(\d+)\)\)?$/.exec(text.replace(/\s/g, "").replace(",", ", "));
        if (!match) continue;
        const [, minus, k, kind, d] = match;
        const n = kind === "sqrt" ? 2 : 3;
        const inside = (Number(k || "1") ** n) * Number(d);
        if (Number(k || "1") === 1) continue;
        const written = `${minus}${kind === "sqrt" ? `sqrt(${inside})` : `root(3, ${inside})`}`;
        expect(evaluateResponse(exercise, { kind: "text", text: written }), `livello ${level}, seme ${seed}: ${written}`).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
      }
    }
  });
});
