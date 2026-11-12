// V2.M06.A03.g1 (derivate: prodotto, quoziente, composta): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m06/a03-g1";

/** Risponde a un esercizio (livello, seme) con un testo e restituisce l'esito e l'eventuale codice di errore. */
function answer(level: 1 | 2 | 3, seed: number, text: string): string {
  const result = evaluateResponse(generateExercise(generator, level, seed), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
}

describe("V2.M06.A03.g1 — derivate con le regole di calcolo", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("quasi ogni esercizio ha almeno tre risposte sbagliate previste (servono alla scelta multipla)", () => {
    for (const level of [1, 2, 3] as const) {
      let enough = 0;
      for (let seed = 0; seed < 400; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind === "expression" && spec.wrong.length >= 3) enough += 1;
      }
      expect(enough / 400, `livello ${level}`).toBeGreaterThan(0.9);
    }
  });

  it("ogni livello allena tutte e tre le regole", () => {
    for (const level of [1, 2, 3] as const) {
      const seen = new Set<string>();
      for (let seed = 0; seed < 200; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind === "expression") spec.wrong.forEach((wrong) => seen.add(wrong.error));
      }
      expect([...seen].sort()).toEqual(["AN.DERIVATA_COMPOSTA", "AN.DERIVATA_PRODOTTO", "AN.DERIVATA_QUOZIENTE"]);
    }
  });

  // Gli esercizi sono fissati dal seme: se uno di questi testi cambia, il generatore ha cambiato le sue
  // estrazioni e gli esercizi già salvati non sono più gli stessi (REGOLE.md, regola 2).
  it("i semi restano gli stessi esercizi", () => {
    expect(generateExercise(generator, 1, 1).prompt).toBe(String.raw`Calcola la derivata della funzione $f(x) = \frac{x + 1}{x + 2}$.`);
    expect(generateExercise(generator, 1, 6).prompt).toBe(String.raw`Calcola la derivata della funzione $f(x) = \sin 4x$.`);
    expect(generateExercise(generator, 1, 8).prompt).toBe(String.raw`Calcola la derivata della funzione $f(x) = x^{3} \cos x$.`);
    expect(generateExercise(generator, 3, 4).prompt).toBe(String.raw`Calcola la derivata della funzione $f(x) = x^{2} \sin\left(3x - 2\right)$.`);
  });

  it("quoziente (x + 1)/(x + 2): qualunque forma equivalente è giusta, gli errori tipici sono riconosciuti", () => {
    expect(answer(1, 1, "1/(x+2)^2")).toBe("correct");
    expect(answer(1, 1, "((x+2) - (x+1))/(x+2)^2")).toBe("correct");
    expect(answer(1, 1, "1/(x^2 + 4x + 4)")).toBe("correct");
    expect(answer(1, 1, "1")).toBe("AN.DERIVATA_QUOZIENTE");
    expect(answer(1, 1, "-1/(x+2)^2")).toBe("AN.DERIVATA_QUOZIENTE");
    expect(answer(1, 1, "1/(x+2)")).toBe("AN.DERIVATA_QUOZIENTE");
    expect(answer(1, 1, "2/(x+2)^2")).toBe("NON_CLASSIFICATO");
  });

  it("composta sin 4x: la catena dimenticata è riconosciuta", () => {
    expect(answer(1, 6, "4cos(4x)")).toBe("correct");
    expect(answer(1, 6, "4 cos 4x")).toBe("correct");
    expect(answer(1, 6, "cos(4x)")).toBe("AN.DERIVATA_COMPOSTA");
    expect(answer(1, 6, "4cos(x)")).toBe("AN.DERIVATA_COMPOSTA");
  });

  it("prodotto x³·cos x: prodotto delle derivate e segno sbagliato sono riconosciuti", () => {
    expect(answer(1, 8, "3x^2 cos x - x^3 sin x")).toBe("correct");
    expect(answer(1, 8, "x^2(3cos(x) - x sin(x))")).toBe("correct");
    expect(answer(1, 8, "-3x^2 sin x")).toBe("AN.DERIVATA_PRODOTTO");
    expect(answer(1, 8, "3x^2 cos x + x^3 sin x")).toBe("AN.DERIVATA_PRODOTTO");
  });

  it("due regole insieme, x²·sin(3x − 2): la catena dimenticata dentro il prodotto è riconosciuta", () => {
    expect(answer(3, 4, "2x sin(3x-2) + 3x^2 cos(3x-2)")).toBe("correct");
    expect(answer(3, 4, "2x sin(3x-2) + x^2 cos(3x-2)")).toBe("AN.DERIVATA_COMPOSTA");
    expect(answer(3, 4, "6x cos(3x-2)")).toBe("AN.DERIVATA_PRODOTTO");
  });
});
