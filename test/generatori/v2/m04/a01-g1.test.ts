// V2.M04.A01.g1 (limiti di funzioni: limiti notevoli e forme indeterminate): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m04/a01-g1";
import { limitText } from "../../scrivi";

/** Risponde a un esercizio (livello, seme) con un testo e restituisce l'esito o il codice di errore. */
function answer(level: 1 | 2 | 3, seed: number, text: string): string {
  const result = evaluateResponse(generateExercise(generator, level, seed), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
}

describe("V2.M04.A01.g1 — limiti notevoli e forme indeterminate", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("ogni esercizio ha almeno tre risposte sbagliate previste, tutte riconosciute, e la giusta è accettata", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "limit") throw new Error("tipo di risposta inatteso");
        const { correct, wrong } = exercise.answer;
        const where = `livello ${level}, seme ${seed}`;
        expect(wrong.length, where).toBeGreaterThanOrEqual(3);
        expect(evaluateResponse(exercise, { kind: "text", text: limitText(correct) }).outcome, where).toBe("correct");
        for (const candidate of wrong) {
          expect(evaluateResponse(exercise, { kind: "text", text: limitText(candidate.value) }), where).toMatchObject({ outcome: "wrong", error: candidate.error });
        }
      }
    }
  }, 60_000);

  it("ogni livello allena i suoi errori tipici e dà tutti i tipi di risposta previsti", () => {
    const expected = {
      1: { errors: ["AN.CONFRONTO_INFINITI", "AN.FORMA_INDETERMINATA", "AN.LIMITE_NOTEVOLE", "AN.SEGNO_INFINITO"], kinds: ["+inf", "-inf", "finite"] },
      2: { errors: ["AN.CONFRONTO_INFINITI", "AN.FORMA_INDETERMINATA", "AN.LIMITE_NOTEVOLE", "AN.SEGNO_INFINITO"], kinds: ["+inf", "-inf", "finite", "none"] },
      3: { errors: ["AN.FATTORE_LIMITATO", "AN.FORMA_INDETERMINATA", "AN.LIMITE_NOTEVOLE"], kinds: ["finite"] },
    } as const;
    for (const level of [1, 2, 3] as const) {
      const errors = new Set<string>();
      const kinds = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind !== "limit") throw new Error("tipo di risposta inatteso");
        kinds.add(spec.correct.kind);
        spec.wrong.forEach((wrong) => errors.add(wrong.error));
      }
      expect([...errors].sort(), `livello ${level}`).toEqual(expected[level].errors);
      expect([...kinds].sort(), `livello ${level}`).toEqual(expected[level].kinds);
    }
  }, 30_000);
  it("0/0 tra polinomi, (3x² − 27)/(x² + 3x) per x → −3: si scompone e si semplifica", () => {
    expect(answer(1, 1, "6")).toBe("correct");
    expect(answer(1, 1, "non esiste")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(1, 1, "3")).toBe("AN.CONFRONTO_INFINITI");
    expect(answer(1, 1, "0")).toBe("AN.FORMA_INDETERMINATA");
  });

  it("(1 − cos 2x)/(5x²): il coefficiente va al quadrato e resta l'1/2", () => {
    expect(answer(2, 2, "2/5")).toBe("correct");
    expect(answer(2, 2, "4/10")).toBe("correct");
    expect(answer(2, 2, "1/5")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(2, 2, "4/5")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(2, 2, "1/10")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(2, 2, "0,4")).toBe("FORMA.DECIMALE");
  });

  it("denominatore che si annulla, (−4x + 3)/(−3x − 12) per x → −4: i limiti laterali sono diversi", () => {
    expect(generateExercise(generator, 2, 0).prompt).toContain(String.raw`\lim_{x \to -4} \frac{-4x + 3}{-3x - 12}`);
    expect(answer(2, 0, "non esiste")).toBe("correct");
    expect(answer(2, 0, "+inf")).toBe("AN.SEGNO_INFINITO");
    expect(answer(2, 0, "-∞")).toBe("AN.SEGNO_INFINITO");
    expect(answer(2, 0, "4/3")).toBe("AN.CONFRONTO_INFINITI");
  });

  it("sin(4x)/x per x → −∞: il limite notevole non c'entra, decide il confronto", () => {
    expect(generateExercise(generator, 3, 21).prompt).toContain(String.raw`\lim_{x \to -\infty} \frac{\sin 4x}{x}`);
    expect(answer(3, 21, "0")).toBe("correct");
    expect(answer(3, 21, "4")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(3, 21, "1")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(3, 21, "non esiste")).toBe("AN.FATTORE_LIMITATO");
  });
});
