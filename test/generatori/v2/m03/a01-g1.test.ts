// V2.M03.A01.g1 (limiti di successioni): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m03/a01-g1";
import { limitText } from "../../scrivi";

/** Risponde a un esercizio (livello, seme) con un testo e restituisce l'esito o il codice di errore. */
function answer(level: 1 | 2 | 3, seed: number, text: string): string {
  const result = evaluateResponse(generateExercise(generator, level, seed), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
}

describe("V2.M03.A01.g1 — limiti di successioni", () => {
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
      1: { errors: ["AN.CONFRONTO_INFINITI", "AN.FORMA_INDETERMINATA", "AN.SEGNO_INFINITO"], kinds: ["+inf", "-inf", "finite"] },
      2: { errors: ["ALG.RADICE_SOMMA", "AN.CONFRONTO_INFINITI", "AN.FORMA_INDETERMINATA", "AN.LIMITE_NOTEVOLE", "AN.SEGNO_INFINITO", "CALC.MENO_PARENTESI"], kinds: ["+inf", "-inf", "finite"] },
      3: { errors: ["ALG.RADICE_SOMMA", "AN.CONFRONTO_INFINITI", "AN.FATTORE_LIMITATO", "AN.FORMA_INDETERMINATA", "AN.LIMITE_NOTEVOLE", "CALC.MENO_PARENTESI"], kinds: ["+inf", "finite", "none"] },
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
  it("rapporto di polinomi (2n − 5)/(n² + 2n − 9): il grado decide", () => {
    expect(answer(1, 1, "0")).toBe("correct");
    expect(answer(1, 1, "2")).toBe("AN.CONFRONTO_INFINITI");
    expect(answer(1, 1, "+∞")).toBe("AN.CONFRONTO_INFINITI");
    expect(answer(1, 1, "1")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(1, 1, "5")).toBe("NON_CLASSIFICATO");
  });

  it("(1 + 2/n)^(3n − 2): la forma 1^∞ e il limite notevole usato a metà sono riconosciuti", () => {
    expect(answer(2, 1, "e^6")).toBe("correct");
    expect(answer(2, 1, "(e^2)^3")).toBe("correct");
    expect(answer(2, 1, "1")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(2, 1, "e")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(2, 1, "e^3")).toBe("AN.LIMITE_NOTEVOLE");
    expect(answer(2, 1, "+inf")).toBe("AN.FORMA_INDETERMINATA");
  });

  it("differenza di radici √(9n² + 5n) − √(9n² + 9n): ∞ − ∞, il meno e la radice spezzata sono riconosciuti", () => {
    expect(answer(3, 1, "-2/3")).toBe("correct");
    expect(answer(3, 1, "-4/6")).toBe("correct");
    expect(answer(3, 1, "0")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(3, 1, "7/3")).toBe("CALC.MENO_PARENTESI");
    expect(answer(3, 1, "-inf")).toBe("ALG.RADICE_SOMMA");
  });

  it("(−1)^n per una quantità che tende a 0: «non esiste» è l'errore del fattore limitato", () => {
    expect(generateExercise(generator, 3, 18).prompt).toContain(String.raw`\left(-1\right)^{n}\frac{-2n}{n^{2} - 4n - 1}`);
    expect(answer(3, 18, "0")).toBe("correct");
    expect(answer(3, 18, "non esiste")).toBe("AN.FATTORE_LIMITATO");
    expect(answer(3, 18, "-2")).toBe("AN.CONFRONTO_INFINITI");
  });
});
