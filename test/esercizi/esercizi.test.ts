import { describe, expect, it } from "vitest";
import {
  approx, choiceOptions, defineGenerator, evaluateResponse, exact, generateExercise, orderingStart,
  type AnswerSpec, type Evaluation, type Exercise, type ExerciseDraft, type GeneratorDefinition,
} from "../../src/esercizi";
import { finiteLimit, minusInfinity, noLimit, plusInfinity } from "../../src/motore/calculus/limit";
import { add, div, frac, mul, num, pi, pow, sqrt, sub, sym, toLatex } from "../../src/motore/expr";
import { matrix } from "../../src/motore/linalg/matrix";
import { atLeast, atMost, closed, closedOpen, greaterThan, lessThan, periodic, points, realSet } from "../../src/motore/sets";

const x = sym("x");

/**
 * Generatore di prova (non è un contenuto dell'app): «Scomponi x² − a²».
 * Costruito all'indietro: si sceglie a, poi si scrive il polinomio.
 */
const toyDefinition: GeneratorDefinition = {
  code: "V1.M04.A99.g1",
  skill: "V1.M04.A99",
  lesson: "V1.M04.L01",
  title: "Differenza di quadrati (generatore di prova)",
  levels: [1, 2],
  errors: ["ALG.QUADRATO_BINOMIO", "ALG.SOMMA_QUADRATI", "CALC.MENO_PARENTESI"],
  limits: { maxInteger: 200, maxDenominator: 1 },
  generate: ({ level, rng }): ExerciseDraft => {
    const a = rng.int(2, level === 1 ? 9 : 14);
    const polynomial = sub(pow(x, 2), a * a);
    return {
      prompt: `Scomponi in fattori: $${toLatex(polynomial)}$`,
      answer: {
        kind: "expression",
        correct: mul(sub(x, a), add(x, a)),
        form: ["factored"],
        wrong: [
          { error: "ALG.QUADRATO_BINOMIO", value: pow(sub(x, a), 2) },
          { error: "ALG.SOMMA_QUADRATI", value: mul(add(x, a), add(x, a)) },
          { error: "CALC.MENO_PARENTESI", value: mul(sub(x, a * a), add(x, 1)) },
        ],
      },
      steps: [
        { text: `Riconosci una differenza di quadrati: $${a * a} = ${a}^2$.` },
        { text: `Applica $A^2 - B^2 = (A-B)(A+B)$: $${toLatex(mul(sub(x, a), add(x, a)))}$.` },
      ],
      hints: ["È un prodotto notevole.", `Che numero al quadrato dà $${a * a}$?`],
    };
  },
  verify: (exercise) => exercise.answer.kind === "expression",
};
const toy = defineGenerator(toyDefinition);

/** Esercizio fatto a mano con la risposta data, per provare la valutazione senza un generatore. */
function exerciseWith(answer: AnswerSpec): Exercise {
  return { generator: "V1.M01.A01.g1", level: 1, seed: 7, prompt: "Prova", answer, steps: [{ text: "Passo." }], hints: ["Uno.", "Due."] };
}

const text = (value: string) => ({ kind: "text", text: value }) as const;

describe("definizione di un generatore", () => {
  it("accetta una definizione valida e la rende immutabile", () => {
    expect(toy.code).toBe("V1.M04.A99.g1");
    expect(Object.isFrozen(toy)).toBe(true);
  });

  it.each([
    ["codice malformato", { code: "V1.M4.A99.g1" }, /codice/],
    ["abilità incoerente", { skill: "V1.M04.A98" }, /abilità/],
    ["lezione malformata", { lesson: "V1.M04.L1" }, /lezione/],
    ["titolo vuoto", { title: " " }, /titolo/],
    ["nessun livello", { levels: [] }, /livelli/],
    ["livelli ripetuti", { levels: [1, 1] }, /livelli/],
    ["errore inesistente", { errors: ["ALG.NON_ESISTE"] }, /catalogo/],
    ["limiti non validi", { limits: { maxInteger: 0, maxDenominator: 1 } }, /limiti/],
  ])("rifiuta: %s", (_name, change, message) => {
    expect(() => defineGenerator({ ...toyDefinition, ...change } as GeneratorDefinition)).toThrow(message);
  });

  it("il compilatore rifiuta codici di errore inesistenti e risposte del tipo sbagliato", () => {
    const wrongCode: AnswerSpec = {
      kind: "expression",
      correct: x,
      // @ts-expect-error il codice non esiste nel catalogo
      wrong: [{ error: "ALG.INVENTATO", value: x }],
    };
    const wrongValue: AnswerSpec = {
      kind: "expression",
      correct: x,
      // @ts-expect-error la risposta sbagliata prevista deve essere un'espressione, non un testo
      wrong: [{ error: "ALG.SOMMA_QUADRATI", value: "x" }],
    };
    expect(wrongCode.kind + wrongValue.kind).toBe("expressionexpression");
  });
});

describe("creazione di un esercizio", () => {
  it("stesso seme e stesso livello danno lo stesso esercizio", () => {
    expect(generateExercise(toy, 2, 4821)).toEqual(generateExercise(toy, 2, 4821));
    const prompts = new Set(Array.from({ length: 40 }, (_, seed) => generateExercise(toy, 2, seed).prompt));
    expect(prompts.size).toBeGreaterThan(5);
  });

  it("l'esercizio porta la sua identità", () => {
    const exercise = generateExercise(toy, 1, 12);
    expect([exercise.generator, exercise.level, exercise.seed]).toEqual(["V1.M04.A99.g1", 1, 12]);
    expect(toy.verify?.(exercise)).toBe(true);
  });

  it("rifiuta livelli non supportati e semi non validi", () => {
    expect(() => generateExercise(toy, 3, 1)).toThrow(/V1\.M04\.A99\.g1, livello 3, seme 1/);
    expect(() => generateExercise(toy, 1, -1)).toThrow(/seme/);
    expect(() => generateExercise(toy, 1, 1.5)).toThrow(/seme/);
  });

  it.each([
    ["testo vuoto", (d: ExerciseDraft) => ({ ...d, prompt: "" }), /testo/],
    ["nessun passaggio", (d: ExerciseDraft) => ({ ...d, steps: [] }), /passaggi/],
    ["un solo indizio", (d: ExerciseDraft) => ({ ...d, hints: ["Uno."] as unknown as [string, string] }), /indizi/],
    [
      "errore non dichiarato",
      (d: ExerciseDraft) => ({ ...d, answer: { kind: "truefalse", correct: true, error: "TRIG.PERIODICITA" } as AnswerSpec }),
      /dichiarati/,
    ],
    [
      "scelta multipla con due sole opzioni sbagliate",
      (d: ExerciseDraft) => ({
        ...d,
        answer: {
          kind: "choice",
          correct: "sì",
          wrong: [
            { error: "ALG.SOMMA_QUADRATI", value: "no" },
            { error: "ALG.QUADRATO_BINOMIO", value: "forse" },
          ],
        } as AnswerSpec,
      }),
      /3 o 4/,
    ],
  ])("un generatore che viola lo schema viene fermato: %s", (_name, breakIt, message) => {
    const broken = defineGenerator({ ...toyDefinition, generate: (context) => breakIt(toyDefinition.generate(context)) });
    expect(() => generateExercise(broken, 1, 3)).toThrow(message);
  });
});

describe("valutazione: espressione con vincolo di forma", () => {
  // Seme scelto a mano: x² − 49.
  const exercise = Array.from({ length: 200 }, (_, seed) => generateExercise(toy, 1, seed)).find((e) => e.prompt.includes("49")) as Exercise;
  const judge = (value: string): Evaluation => evaluateResponse(exercise, text(value));

  it("giusta, in qualunque scrittura equivalente che rispetti la forma", () => {
    expect(judge("(x-7)(x+7)")).toEqual({ outcome: "correct" });
    expect(judge("(x+7)(x-7)")).toEqual({ outcome: "correct" });
    expect(judge("(7+x)·(x−7)")).toEqual({ outcome: "correct" });
    expect(judge("-(7-x)(x+7)")).toEqual({ outcome: "correct" });
  });

  it("equivalente ma non nella forma richiesta: FORMA.NON_RICHIESTA con il motivo", () => {
    expect(judge("x^2-49")).toEqual({
      outcome: "wrong",
      error: "FORMA.NON_RICHIESTA",
      cause: "form",
      message: "L'espressione $x^{2} - 49$ non è scomposta: si può scrivere come prodotto di fattori.",
    });
  });

  it("riconosce gli errori tipici dalle risposte sbagliate previste", () => {
    expect(judge("(x-7)^2")).toEqual({ outcome: "wrong", error: "ALG.QUADRATO_BINOMIO", cause: "expected" });
    expect(judge("x^2-14x+49")).toEqual({ outcome: "wrong", error: "ALG.QUADRATO_BINOMIO", cause: "expected" });
    expect(judge("(x+7)^2")).toEqual({ outcome: "wrong", error: "ALG.SOMMA_QUADRATI", cause: "expected" });
  });

  it("nessuna corrispondenza: NON_CLASSIFICATO", () => {
    expect(judge("(x-7)(x+6)")).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
  });

  it("testo non valido o incompleto: non è una risposta", () => {
    expect(judge("(x-7)(x+7")).toEqual({ outcome: "invalid", message: "La risposta non è completa." });
    expect(judge("(x-7))")).toEqual({ outcome: "invalid", message: "C'è una parentesi chiusa in più.", position: 5 });
  });

  it("«Non lo so» è una risposta non data", () => {
    expect(evaluateResponse(exercise, { kind: "skip" })).toEqual({ outcome: "skipped" });
  });

  it("lo stesso esercizio si può mostrare come scelta multipla", () => {
    const options = choiceOptions(exercise);
    expect(options?.map((option) => option.index).sort()).toEqual([0, 1, 2, 3]);
    expect(options).toEqual(choiceOptions(exercise));
    expect(options?.find((option) => option.index === 0)?.content).toBe("$\\left(x - 7\\right)\\left(x + 7\\right)$");
    expect(evaluateResponse(exercise, { kind: "choice", index: 0 })).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, { kind: "choice", index: 2 })).toEqual({ outcome: "wrong", error: "ALG.SOMMA_QUADRATI", cause: "expected" });
    expect(() => evaluateResponse(exercise, { kind: "choice", index: 9 })).toThrow();
  });

  it("l'ordine delle opzioni cambia da un esercizio all'altro", () => {
    const orders = new Set(Array.from({ length: 30 }, (_, seed) => choiceOptions(generateExercise(toy, 1, seed))?.map((o) => o.index).join("")));
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe("valutazione: numero", () => {
  const root = exerciseWith({
    kind: "number",
    correct: sqrt(2),
    mode: exact,
    wrong: [{ error: "ALG.RADICE_SOMMA", value: num(2) }],
  });
  const half = exerciseWith({
    kind: "number",
    correct: frac(1, 2),
    mode: exact,
    form: ["reducedFraction"],
    wrong: [{ error: "CALC.SOMMA_FRAZIONI", value: frac(2, 5) }],
  });

  it("forma esatta: il decimale giusto come valore è FORMA.DECIMALE", () => {
    const decimal = { outcome: "wrong", error: "FORMA.DECIMALE", cause: "decimal", message: "Valore giusto, ma serve la forma esatta." };
    expect(evaluateResponse(root, text("√2"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(root, text("2/√2"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(root, text("1,414"))).toEqual(decimal);
    expect(evaluateResponse(root, text("1.41"))).toEqual(decimal);
    expect(evaluateResponse(root, text("1,4142135623730951"))).toEqual(decimal);
    expect(evaluateResponse(half, text("0,5"))).toEqual(decimal);
  });

  it("un decimale sbagliato non è un errore di forma", () => {
    expect(evaluateResponse(root, text("1,5"))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
    expect(evaluateResponse(root, text("1,42"))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
    expect(evaluateResponse(half, text("0,4"))).toEqual({ outcome: "wrong", error: "CALC.SOMMA_FRAZIONI", cause: "expected" });
  });

  it("vincolo di forma sui numeri", () => {
    expect(evaluateResponse(half, text("1/2"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(half, text("2/4"))).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA", cause: "form" });
    expect(evaluateResponse(half, text("2/5"))).toEqual({ outcome: "wrong", error: "CALC.SOMMA_FRAZIONI", cause: "expected" });
    expect(evaluateResponse(half, text("4/10"))).toEqual({ outcome: "wrong", error: "CALC.SOMMA_FRAZIONI", cause: "expected" });
  });

  it("un numero non contiene lettere", () => {
    expect(evaluateResponse(half, text("x/2"))).toEqual({ outcome: "invalid", message: "Qui serve un numero, senza lettere." });
  });

  it("se la risposta giusta è un decimale, i decimali sono ammessi", () => {
    const decimal = exerciseWith({ kind: "number", correct: { kind: "num", value: frac(3, 4).value, decimals: 2 }, mode: exact, wrong: [] });
    expect(evaluateResponse(decimal, text("0,75"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(decimal, text("3/4"))).toEqual({ outcome: "correct" });
  });

  it("approssimazione: conta il valore entro la tolleranza", () => {
    const rounded = exerciseWith({
      kind: "number",
      correct: sqrt(2),
      mode: approx(0.005),
      wrong: [{ error: "ALG.RADICE_SOMMA", value: num(2) }],
    });
    expect(evaluateResponse(rounded, text("1,41"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(rounded, text("1,414"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(rounded, text("√2"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(rounded, text("1,42"))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
    expect(evaluateResponse(rounded, text("2,00"))).toEqual({ outcome: "wrong", error: "ALG.RADICE_SOMMA", cause: "expected" });
  });

  it("numeri complessi", () => {
    const complex = exerciseWith({ kind: "number", correct: mul(2, { kind: "const", name: "i" }), mode: exact, complex: true, form: ["algebraicForm"], wrong: [] });
    expect(evaluateResponse(complex, text("2i"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(complex, text("(1+i)^2"))).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA" });
  });
});

describe("valutazione: limite, matrice, vero o falso, riordino, scelta multipla", () => {
  it("limite", () => {
    const exercise = exerciseWith({
      kind: "limit",
      correct: plusInfinity,
      wrong: [
        { error: "AN.FORMA_INDETERMINATA", value: finiteLimit(num(0)) },
        { error: "AN.FORMA_INDETERMINATA", value: noLimit },
      ],
    });
    expect(evaluateResponse(exercise, text("+∞"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, text("inf"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, text("0"))).toEqual({ outcome: "wrong", error: "AN.FORMA_INDETERMINATA", cause: "expected" });
    expect(evaluateResponse(exercise, text("non esiste"))).toEqual({ outcome: "wrong", error: "AN.FORMA_INDETERMINATA", cause: "expected" });
    expect(evaluateResponse(exercise, text("-∞"))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });

    const finite = exerciseWith({ kind: "limit", correct: finiteLimit(frac(1, 2)), wrong: [{ error: "AN.HOPITAL_IPOTESI", value: minusInfinity }] });
    expect(evaluateResponse(finite, text("1/2"))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(finite, text("0,5"))).toMatchObject({ outcome: "wrong", error: "FORMA.DECIMALE" });
    expect(evaluateResponse(finite, text("−∞"))).toEqual({ outcome: "wrong", error: "AN.HOPITAL_IPOTESI", cause: "expected" });
  });

  it("matrice", () => {
    const exercise = exerciseWith({
      kind: "matrix",
      correct: matrix([[1, frac(1, 2)], [0, -1]]),
      wrong: [{ error: "ALIN.PRODOTTO_COMMUTATIVO", value: matrix([[1, 0], [frac(1, 2), -1]]) }],
    });
    const cells = (...rows: string[][]) => ({ kind: "matrix", cells: rows }) as const;
    expect(evaluateResponse(exercise, cells(["1", "1/2"], ["0", "-1"]))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, cells(["1", "2/4"], ["0", "−1"]))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, cells(["1", "0,5"], ["0", "-1"]))).toMatchObject({ outcome: "wrong", error: "FORMA.DECIMALE" });
    expect(evaluateResponse(exercise, cells(["1", "0"], ["1/2", "-1"]))).toEqual({ outcome: "wrong", error: "ALIN.PRODOTTO_COMMUTATIVO", cause: "expected" });
    expect(evaluateResponse(exercise, cells(["1", "1"], ["0", "-1"]))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
    expect(evaluateResponse(exercise, cells(["1", ""], ["0", "-1"]))).toEqual({ outcome: "invalid", message: "Riempi tutte le caselle." });
    expect(evaluateResponse(exercise, cells(["1", "1/2"]))).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
  });

  it("vero o falso", () => {
    const exercise = exerciseWith({ kind: "truefalse", correct: false, error: "LOG.INVERSA" });
    expect(evaluateResponse(exercise, { kind: "truefalse", value: false })).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, { kind: "truefalse", value: true })).toEqual({ outcome: "wrong", error: "LOG.INVERSA", cause: "expected" });
    expect(choiceOptions(exercise)).toBeNull();
  });

  it("riordino con un elemento fisso", () => {
    const exercise = exerciseWith({
      kind: "ordering",
      items: [{ content: "Ipotesi", fixed: true }, { content: "Primo passo" }, { content: "Secondo passo" }, { content: "Terzo passo" }],
    });
    expect(evaluateResponse(exercise, { kind: "ordering", order: [0, 1, 2, 3] })).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, { kind: "ordering", order: [0, 2, 1, 3] })).toEqual({ outcome: "wrong", error: "NON_CLASSIFICATO", cause: "unclassified" });
    expect(() => evaluateResponse(exercise, { kind: "ordering", order: [0, 1, 1, 3] })).toThrow();
    const start = orderingStart(exercise);
    expect(start[0]).toBe(0);
    expect([...start].sort()).toEqual([0, 1, 2, 3]);
    expect(start).not.toEqual([0, 1, 2, 3]);
    expect(start).toEqual(orderingStart(exercise));
  });

  it("scelta multipla pura", () => {
    const exercise = exerciseWith({
      kind: "choice",
      correct: "Esiste un $x$ per cui $P(x)$ è falsa.",
      wrong: [
        { error: "LOG.NEGAZIONE_PER_OGNI", value: "Per ogni $x$, $P(x)$ è falsa." },
        { error: "LOG.INVERSA", value: "Per ogni $x$, $P(x)$ è vera." },
        { error: "LOG.DE_MORGAN", value: "Non esiste alcun $x$." },
      ],
    });
    expect(choiceOptions(exercise)).toHaveLength(4);
    expect(evaluateResponse(exercise, { kind: "choice", index: 1 })).toEqual({ outcome: "wrong", error: "LOG.NEGAZIONE_PER_OGNI", cause: "expected" });
    expect(() => evaluateResponse(exercise, text("boh"))).toThrow();
  });

  it("con meno di tre risposte sbagliate previste non si fa la scelta multipla", () => {
    const exercise = exerciseWith({ kind: "expression", correct: div(x, 2), wrong: [{ error: "ALG.SOMMA_QUADRATI", value: x }] });
    expect(choiceOptions(exercise)).toBeNull();
  });

  describe("insiemi di soluzioni", () => {
    const sixth = div(pi, 6);
    const fiveSixths = div(mul(5, pi), 6);
    const fractional = exerciseWith({
      kind: "set",
      variable: "x",
      correct: realSet(lessThan(-2), atLeast(1)),
      wrong: [
        { error: "DISEQ.SEGNO_DENOMINATORE", value: realSet(atMost(-2), atLeast(1)) },
        { error: "DISEQ.VERSO_NON_INVERTITO", value: closedOpen(-2, 1) },
        { error: "COND.DENOMINATORE", value: atLeast(1) },
      ],
    });

    it("confronto per struttura: intervalli, disuguaglianze e ordine dei pezzi non contano", () => {
      for (const answer of ["(-∞; -2) ∪ [1; +∞)", "x < -2 ∨ x ≥ 1", "[1; +∞) ∪ (-∞; -2)", "x >= 1 o x < -2", "]-∞; -2[ U [1; +∞["]) {
        expect(evaluateResponse(fractional, text(answer)), answer).toEqual({ outcome: "correct" });
      }
    });

    it("riconosce gli errori tipici dalle risposte sbagliate previste", () => {
      expect(evaluateResponse(fractional, text("x ≤ -2 ∨ x ≥ 1"))).toMatchObject({ outcome: "wrong", error: "DISEQ.SEGNO_DENOMINATORE", cause: "expected" });
      expect(evaluateResponse(fractional, text("-2 ≤ x < 1"))).toMatchObject({ outcome: "wrong", error: "DISEQ.VERSO_NON_INVERTITO" });
      expect(evaluateResponse(fractional, text("x ≥ 1"))).toMatchObject({ outcome: "wrong", error: "COND.DENOMINATORE" });
      expect(evaluateResponse(fractional, text("x > 7"))).toMatchObject({ outcome: "wrong", error: "NON_CLASSIFICATO" });
      expect(evaluateResponse(fractional, text("∅"))).toMatchObject({ outcome: "wrong", error: "NON_CLASSIFICATO" });
    });

    it("testo non valido o incompleto: non è un tentativo", () => {
      expect(evaluateResponse(fractional, text("(-∞; -2) ∪"))).toMatchObject({ outcome: "invalid" });
      expect(evaluateResponse(fractional, text("[1; +∞) ∪ (-∞; -2+)"))).toMatchObject({ outcome: "invalid", message: "La risposta non è completa." });
      expect(evaluateResponse(fractional, text("x < y"))).toMatchObject({ outcome: "invalid" });
      expect(evaluateResponse(fractional, { kind: "skip" })).toEqual({ outcome: "skipped" });
      expect(() => evaluateResponse(fractional, { kind: "truefalse", value: true })).toThrow();
    });

    it("decimali al posto della forma esatta e forma canonica richiesta", () => {
      const half = exerciseWith({ kind: "set", variable: "x", correct: greaterThan(frac(1, 2)), wrong: [] });
      expect(evaluateResponse(half, text("x > 1/2"))).toEqual({ outcome: "correct" });
      expect(evaluateResponse(half, text("x > 0,5"))).toMatchObject({ outcome: "wrong", error: "FORMA.DECIMALE" });
      const canonical = exerciseWith({ kind: "set", variable: "x", correct: closed(1, 3), wrong: [], canonicalForm: true });
      expect(evaluateResponse(canonical, text("[1; 3]"))).toEqual({ outcome: "correct" });
      expect(evaluateResponse(canonical, text("[1; 2] ∪ [2; 3]"))).toMatchObject({ outcome: "wrong", error: "FORMA.NON_RICHIESTA", cause: "form" });
      const free = exerciseWith({ kind: "set", variable: "x", correct: closed(1, 3), wrong: [] });
      expect(evaluateResponse(free, text("[1; 2] ∪ [2; 3]"))).toEqual({ outcome: "correct" });
    });

    it("soluzioni periodiche: stesse soluzioni scritte in un altro modo", () => {
      const sine = exerciseWith({
        kind: "set",
        variable: "x",
        correct: periodic(points(sixth, fiveSixths), mul(2, pi)),
        wrong: [{ error: "TRIG.SOLUZIONI_PERSE", value: periodic(points(sixth), mul(2, pi)) }],
      });
      for (const answer of ["x = π/6 + 2kπ ∨ x = 5π/6 + 2kπ", "x = 5π/6 + 2kπ o x = π/6 + 2kπ, k ∈ ℤ", "x = 13π/6 + 2kπ ∨ x = -7π/6 + 2kπ"]) {
        expect(evaluateResponse(sine, text(answer)), answer).toEqual({ outcome: "correct" });
      }
      expect(evaluateResponse(sine, text("x = π/6 + 2kπ"))).toMatchObject({ outcome: "wrong", error: "TRIG.SOLUZIONI_PERSE" });
      expect(evaluateResponse(sine, text("x = π/6 + kπ"))).toMatchObject({ outcome: "wrong", error: "NON_CLASSIFICATO" });
      expect(evaluateResponse(sine, text("x = π/6"))).toMatchObject({ outcome: "wrong", error: "NON_CLASSIFICATO" });
      expect(evaluateResponse(sine, text("x = π/6 + k"))).toMatchObject({ outcome: "wrong", error: "NON_CLASSIFICATO" });
    });

    it("con tre risposte sbagliate previste diventa una scelta multipla", () => {
      const options = choiceOptions(fractional)!;
      expect(options).toHaveLength(4);
      expect(options.find((option) => option.index === 0)?.content).toBe("$\\left(-\\infty; -2\\right) \\cup \\left[1; +\\infty\\right)$");
      expect(evaluateResponse(fractional, { kind: "choice", index: 0 })).toEqual({ outcome: "correct" });
      expect(evaluateResponse(fractional, { kind: "choice", index: 2 })).toMatchObject({ outcome: "wrong", error: "DISEQ.VERSO_NON_INVERTITO" });
    });
  });
});
