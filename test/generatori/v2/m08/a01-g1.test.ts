// V2.M08.A01.g1 (sviluppi di Taylor nei limiti): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v2/m08/a01-g1";
import { deriveTimes } from "../../../../src/motore/calculus/derive";
import { evaluate } from "../../../../src/motore/expr";
import { parseExpression } from "../../../../src/motore/parser";
import { limitText } from "../../scrivi";

/** Risponde a un esercizio (livello, seme) con un testo e restituisce l'esito o il codice di errore. */
function answer(level: 1 | 2 | 3, seed: number, text: string): string {
  const result = evaluateResponse(generateExercise(generator, level, seed), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
}

describe("V2.M08.A01.g1 — sviluppi di Taylor nei limiti", () => {
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
      1: { errors: ["AN.FORMA_INDETERMINATA", "AN.TAYLOR_ORDINE", "AN.TAYLOR_SVILUPPO"], kinds: ["finite"] },
      2: { errors: ["AN.FORMA_INDETERMINATA", "AN.TAYLOR_ORDINE", "AN.TAYLOR_SVILUPPO"], kinds: ["finite"] },
      3: { errors: ["AN.FORMA_INDETERMINATA", "AN.TAYLOR_ORDINE", "AN.TAYLOR_SVILUPPO"], kinds: ["finite"] },
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
  it("ogni esercizio ha l'errore dell'ordine e almeno un errore di sviluppo tra le prime risposte sbagliate", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 300; seed++) {
        const { answer: spec } = generateExercise(generator, level, seed);
        if (spec.kind !== "limit") throw new Error("tipo di risposta inatteso");
        const errors = spec.wrong.slice(0, 4).map((wrong) => wrong.error);
        expect(errors, `livello ${level}, seme ${seed}`).toContain("AN.TAYLOR_ORDINE");
        expect(errors, `livello ${level}, seme ${seed}`).toContain("AN.TAYLOR_SVILUPPO");
      }
    }
  }, 30_000);

  // Una terza strada, diversa dagli sviluppi e dalla prova numerica: la regola di de l'Hôpital applicata
  // più volte al testo mostrato, con le derivate del motore. Il limite è il rapporto delle prime derivate
  // che non si annullano entrambe in 0.
  it("il limite coincide con quello dato dalla regola di de l'Hôpital sul testo mostrato", () => {
    const read = (text: string) => {
      const parsed = parseExpression(text);
      if (!parsed.ok) throw new Error(`testo non letto: ${text}`);
      return parsed.value;
    };
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 25; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "limit" || exercise.answer.correct.kind !== "finite") throw new Error("tipo di risposta inatteso");
        // Dal testo: \lim_{x \to 0} \frac{numeratore}{denominatore}, riscritto come lo leggerebbe il parser.
        const shown = (exercise.prompt.split("$$")[1] ?? "").replace(String.raw`\lim_{x \to 0} `, "");
        const plain = (latex: string): string => {
          let text = latex;
          // Le frazioni più interne prima: \frac{a}{b} → ((a)/(b)).
          for (let previous = ""; previous !== text; ) {
            previous = text;
            text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
            text = text.replace(/\^\{([^{}]*)\}/g, "^($1)");
          }
          return text.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")").replace(/\\cdot/g, "*").replace(/\\(sin|cos|ln) x/g, "$1(x)").replace(/\\(sin|cos|ln) (\d+)x/g, "$1($2x)").replace(/\\(sin|cos|ln)/g, "$1");
        };
        const whole = read(plain(shown));
        if (whole.kind !== "div") throw new Error(`il testo non è una frazione: ${shown}`);
        let value = Number.NaN;
        for (let k = 0; k <= 6; k++) {
          const top = evaluate(deriveTimes(whole.num, k), { x: 0 });
          const bottom = evaluate(deriveTimes(whole.den, k), { x: 0 });
          if (Math.abs(bottom) > 1e-9) {
            value = top / bottom;
            break;
          }
          expect(Math.abs(top), `livello ${level}, seme ${seed}: la derivata ${k} del numeratore non si annulla in 0`).toBeLessThan(1e-9);
        }
        expect(value, `livello ${level}, seme ${seed}: ${shown}`).toBeCloseTo(evaluate(exercise.answer.correct.value), 9);
      }
    }
  }, 60_000);
  it("(x − sin x)/(8x³): ordine troppo basso, fattoriale, segno e denominatore dimenticato sono riconosciuti", () => {
    expect(generateExercise(generator, 1, 1).prompt).toContain(String.raw`\lim_{x \to 0} \frac{x - \sin x}{8x^{3}}`);
    expect(answer(1, 1, "1/48")).toBe("correct");
    expect(answer(1, 1, "0")).toBe("AN.TAYLOR_ORDINE");
    expect(answer(1, 1, "1/24")).toBe("AN.TAYLOR_SVILUPPO");
    expect(answer(1, 1, "-1/48")).toBe("AN.TAYLOR_SVILUPPO");
    expect(answer(1, 1, "1/8")).toBe("AN.TAYLOR_SVILUPPO");
    expect(answer(1, 1, "+inf")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(1, 1, "non esiste")).toBe("AN.FORMA_INDETERMINATA");
    expect(answer(1, 1, "1/6")).toBe("NON_CLASSIFICATO");
  });

  it("prodotto, (1 − e^x cos x + x)/(2x³): sviluppare tutto un ordine in meno dà un coefficiente sbagliato", () => {
    expect(generateExercise(generator, 3, 3).prompt).toContain(String.raw`\lim_{x \to 0} \frac{1 - e^{x} \cos x + x}{2x^{3}}`);
    expect(answer(3, 3, "1/6")).toBe("correct");
    expect(answer(3, 3, "1/4")).toBe("AN.TAYLOR_ORDINE");
    expect(answer(3, 3, "1/12")).toBe("AN.TAYLOR_SVILUPPO");
  });
});
