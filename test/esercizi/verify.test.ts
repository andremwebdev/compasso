import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise, type ExerciseDraft, type GeneratorDefinition } from "../../src/esercizi";
import { formatReport, verificationChecks, verifyExercise, verifyGenerator, type CheckNumber } from "../../src/esercizi/verify";
import type { ErrorCode } from "../../src/errori";
import { add, div, frac, mul, num, pow, sub, sym } from "../../src/motore/expr";
import { atMost, greaterThan, lessThan, realSet } from "../../src/motore/sets";
import sample, { sampleDefinition, sampleDraft, sampleNumbers } from "./fixtures/sample-generator";

const x = sym("x");

/** Una variante del generatore di prova con un difetto preciso. */
function broken(change: (draft: ExerciseDraft, seed: number, level: number) => ExerciseDraft, overrides: Partial<GeneratorDefinition> = {}): GeneratorDefinition {
  return {
    ...sampleDefinition,
    generate: (context) => change(sampleDraft(sampleNumbers(context.level, context.rng)), context.seed, context.level),
    ...overrides,
  };
}

/** I controlli falliti, in ordine. Con pochi semi la verifica resta veloce: i difetti qui sono sistematici. */
function failing(definition: GeneratorDefinition, options: Parameters<typeof verifyGenerator>[1] = {}): CheckNumber[] {
  const report = verifyGenerator(definition, { seeds: 60, ...options });
  expect(report.ok).toBe(false);
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).filter((check) => report.failures[check] > 0);
}

describe("verifica automatica: il generatore di prova", () => {
  it("supera tutti e nove i controlli su 2.000 semi per livello", () => {
    const report = verifyGenerator(sample);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.exercises).toBe(4000);
    expect(report.warnings).toEqual([]);
    expect(report.failures).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
    expect(report.averageMillis).toBeLessThan(5);
    expect(formatReport(report)).toContain("Nessun problema");
    expect(Object.keys(verificationChecks)).toHaveLength(9);
  });

  it("gli esercizi che produce si valutano come ci si aspetta", () => {
    const exercise = generateExercise(sample, 1, 4821);
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") throw new Error("tipo di risposta inatteso");
    const bound = answer.correct.pieces[0]!.upper;
    if (typeof bound === "string" || bound.kind !== "num") throw new Error("estremo inatteso");
    const text = (value: string) => ({ kind: "text", text: value }) as const;
    expect(evaluateResponse(exercise, text(`x < ${bound.value}`))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, text(`(-∞; ${bound.value})`))).toEqual({ outcome: "correct" });
    expect(evaluateResponse(exercise, text(`x > ${bound.value}`))).toMatchObject({ outcome: "wrong", error: "DISEQ.VERSO_NON_INVERTITO" });
    expect(evaluateResponse(exercise, text(`x <= ${bound.value}`))).toMatchObject({ outcome: "wrong", error: "DISEQ.ESTREMI" });
    expect(verifyExercise(sample, exercise)).toEqual([]);
  });
});

describe("verifica automatica: ogni controllo scopre il suo difetto", () => {
  it("1 · il generatore si interrompe, viola lo schema o è lento", () => {
    const crashing = broken((draft, seed) => {
      if (seed % 7 === 3) throw new Error("divisione per zero nel generatore");
      return draft;
    });
    const report = verifyGenerator(crashing, { seeds: 60 });
    expect(report.failures[1]).toBe(18);
    expect(report.problems[0]).toMatchObject({ check: 1, level: 1, seed: 3 });
    expect(report.problems[0]?.message).toContain("divisione per zero nel generatore");
    expect(report.problems.filter((problem) => problem.check === 1)).toHaveLength(5);
    expect(formatReport(report)).toContain("livello 1, seme 3");

    expect(failing(broken((draft) => ({ ...draft, prompt: "  " })))).toEqual([1]);
    expect(failing(sample, { levels: [3] })).toEqual([1]);
    // Un orologio finto: ogni lettura avanza di 30 ms, quindi ogni generazione «dura» 30 ms.
    let clock = 0;
    const slow = verifyGenerator(sample, { seeds: 20, now: () => (clock += 30), maxMillis: 25 });
    expect(slow.failures[1]).toBe(41);
    expect(slow.problems.some((problem) => problem.message.includes("in media"))).toBe(true);
    // Un picco isolato (una pausa del sistema) non conta: la misura si ripete.
    let calls = 0;
    const spike = verifyGenerator(sample, { seeds: 20, now: () => (calls++ === 1 ? 500 : 0) });
    expect(spike.ok).toBe(true);
  });

  it("2 · lo stesso seme dà esercizi diversi", () => {
    let counter = 0;
    expect(failing(broken((draft) => ({ ...draft, prompt: `${draft.prompt} (versione ${counter++})` })))).toEqual([2]);
    // Anche una differenza solo nei numeri della risposta si vede.
    let flip = false;
    const unstable = broken((draft) => {
      flip = !flip;
      return flip ? draft : { ...draft, hints: [draft.hints[0], `${draft.hints[1]} Rifletti.`] };
    });
    expect(failing(unstable)).toEqual([2]);
  });

  it("3 · la risposta giusta non è giusta", () => {
    const wrongAnswer = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      // La «giusta» è quella di chi non inverte il verso; le sbagliate restano distinte da lei.
      return { ...draft, answer: { ...answer, correct: answer.wrong[0]!.value, wrong: answer.wrong.slice(1) } };
    });
    expect(failing(wrongAnswer)).toEqual([3]);
    expect(failing(broken((draft) => draft, { verify: () => { throw new Error("verifica rotta"); } }))).toEqual([3]);
    const undefinedNumber = broken((draft) => ({ ...draft, answer: { kind: "number", mode: { kind: "exact" }, correct: div(1, sub(2, 2)), wrong: [] } }), { verify: undefined });
    expect(failing(undefinedNumber)).toEqual([3]);
    const withLetters = broken((draft) => ({ ...draft, answer: { kind: "number", mode: { kind: "exact" }, correct: add(x, 1), wrong: [] } }), { verify: undefined });
    expect(failing(withLetters)).toEqual([3]);
  });

  it("4 · la risposta giusta non è nella forma richiesta", () => {
    const unfactored = broken((draft) => ({ ...draft, answer: { kind: "expression", correct: sub(pow(x, 2), 4), form: ["factored"], wrong: [] } }), { verify: undefined });
    expect(failing(unfactored)).toEqual([4]);
    const unreduced = broken((draft) => ({ ...draft, answer: { kind: "number", mode: { kind: "exact" }, correct: div(2, 4), form: ["reducedFraction"], wrong: [] } }), { verify: undefined });
    expect(failing(unreduced)).toEqual([4]);
    const notCanonical = broken((draft) => ({ ...draft, answer: { kind: "set", variable: "x", canonicalForm: true, correct: realSet(greaterThan(1), lessThan(0)), wrong: [] } }), { verify: undefined });
    expect(failing(notCanonical)).toEqual([4]);
  });

  it("5 · una risposta sbagliata prevista vale quanto la giusta, o due sbagliate coincidono", () => {
    const equalToCorrect = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      // Stesso insieme scritto in un altro modo: come testo è diverso, come valore no.
      return { ...draft, answer: { ...answer, wrong: [...answer.wrong.slice(0, 2), { error: "CALC.MENO_PARENTESI" as ErrorCode, value: realSet(answer.correct, lessThan(-100)) }] } };
    });
    const report = verifyGenerator(equalToCorrect, { seeds: 60 });
    expect(report.failures[5]).toBe(120);
    expect(report.problems[0]?.message).toContain("n. 3 (CALC.MENO_PARENTESI) vale quanto la risposta giusta");
    const twins = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      return { ...draft, answer: { ...answer, wrong: [answer.wrong[0]!, answer.wrong[1]!, { error: "CALC.MENO_PARENTESI" as ErrorCode, value: answer.wrong[1]!.value }] } };
    });
    expect(failing(twins)).toEqual([5]);
    const sameNumber = broken((draft) => ({ ...draft, answer: { kind: "number", mode: { kind: "exact" }, correct: frac(1, 2), wrong: [{ error: "DISEQ.ESTREMI", value: div(2, 4) }] } }), { verify: undefined });
    expect(failing(sameNumber)).toEqual([5]);
    // Con l'approssimazione conta la tolleranza: 0,333 e 0,334 sono la stessa risposta.
    const withinTolerance = broken(
      (draft) => ({ ...draft, answer: { kind: "number", mode: { kind: "approx", tolerance: 0.005 }, correct: frac(1, 3), wrong: [{ error: "DISEQ.ESTREMI", value: frac(334, 1000) }] } }),
      { verify: undefined, limits: { maxInteger: 1000, maxDenominator: 1000 } },
    );
    expect(failing(withinTolerance)).toEqual([5]);
  });

  it("6 · un codice di errore non esiste o non è dichiarato", () => {
    const undeclared = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      return { ...draft, answer: { ...answer, wrong: [...answer.wrong.slice(0, 2), { error: "ALG.QUADRATO_BINOMIO" as ErrorCode, value: answer.wrong[2]!.value }] } };
    });
    expect(failing(undeclared)).toEqual([6]);
    const invented = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      return { ...draft, answer: { ...answer, wrong: [...answer.wrong.slice(0, 2), { error: "DISEQ.INVENTATO" as ErrorCode, value: answer.wrong[2]!.value }] } };
    });
    expect(failing(invented)).toEqual([6]);
    const declaredInvented = verifyGenerator({ ...sampleDefinition, errors: [...sampleDefinition.errors, "DISEQ.INVENTATO" as ErrorCode] }, { seeds: 60 });
    expect(declaredInvented.problems).toEqual([{ check: 6, level: null, seed: null, message: "il codice di errore dichiarato DISEQ.INVENTATO non esiste nel catalogo." }]);
  });

  it("7 · i numeri escono dai limiti di pulizia", () => {
    const report = verifyGenerator({ ...sampleDefinition, limits: { maxInteger: 4, maxDenominator: 2 } }, { seeds: 200 });
    expect(report.ok).toBe(false);
    expect(Object.entries(report.failures).filter(([, count]) => count > 0).map(([check]) => check)).toEqual(["7"]);
    expect(report.problems[0]?.message).toMatch(/numeri fuori dai limiti di pulizia: \$.+\$ \(limiti: interi fino a 4, denominatori fino a 2\)/);
    const uglyWrong = broken((draft) => {
      const { answer } = draft;
      if (answer.kind !== "set") return draft;
      return { ...draft, answer: { ...answer, wrong: [...answer.wrong.slice(0, 2), { error: "CALC.MENO_PARENTESI" as ErrorCode, value: atMost(frac(1234, 567)) }] } };
    });
    expect(failing(uglyWrong)).toEqual([7]);
  });

  it("8 · qualcosa non si disegna con KaTeX", () => {
    expect(failing(broken((draft) => ({ ...draft, prompt: String.raw`Risolvi $\frac{1}{x > 2$.` })))).toEqual([8]);
    expect(failing(broken((draft) => ({ ...draft, prompt: "Risolvi $x > 2." })))).toEqual([8]);
    expect(failing(broken((draft) => ({ ...draft, steps: [...draft.steps, { text: String.raw`Quindi $\sqroot{2}$.` }] })))).toEqual([8]);
    expect(failing(broken((draft) => ({ ...draft, hints: [draft.hints[0], String.raw`Guarda $$\begin{array} 1 \end{matrix}$$`] })))).toEqual([8]);
    // Un dollaro vero (\$) non apre una formula.
    expect(verifyGenerator(broken((draft) => ({ ...draft, prompt: String.raw`${draft.prompt} Costa 5 \$.` })), { seeds: 30 }).ok).toBe(true);
    const badOption = broken(
      (draft) => ({
        ...draft,
        answer: {
          kind: "choice",
          correct: "$x < 2$",
          wrong: [{ error: "DISEQ.ESTREMI", value: String.raw`$x \lee 2$` }, { error: "DISEQ.VERSO_NON_INVERTITO", value: "$x > 2$" }, { error: "CALC.MENO_PARENTESI", value: "$x < -2$" }],
        },
      }),
      { verify: undefined },
    );
    expect(failing(badOption)).toEqual([8]);
  });

  it("9 · mancano i passaggi o i due indizi", () => {
    expect(failing(broken((draft) => ({ ...draft, steps: [] })))).toEqual([9]);
    expect(failing(broken((draft) => ({ ...draft, steps: [...draft.steps, { text: " " }] })))).toEqual([9]);
    expect(failing(broken((draft) => ({ ...draft, hints: [draft.hints[0], draft.hints[0]] })))).toEqual([9]);
    expect(failing(broken((draft) => ({ ...draft, hints: [draft.hints[0], ""] })))).toEqual([9]);
    expect(failing(broken((draft) => ({ ...draft, hints: [draft.hints[0]] as unknown as [string, string] })))).toEqual([9]);
  });

  it("avvisi: verifica indipendente mancante, errori dichiarati mai prodotti, poca varietà", () => {
    const noVerify = verifyGenerator({ ...sampleDefinition, verify: undefined }, { seeds: 50 });
    expect(noVerify.ok).toBe(true);
    expect(noVerify.warnings).toEqual(["Manca la verifica indipendente (verify): la risposta giusta è controllata solo per coerenza."]);
    const unused = verifyGenerator({ ...sampleDefinition, errors: [...sampleDefinition.errors, "ALG.QUADRATO_BINOMIO"] }, { seeds: 200 });
    expect(unused.ok).toBe(true);
    expect(unused.warnings).toEqual(["Codici di errore dichiarati ma mai prodotti: ALG.QUADRATO_BINOMIO."]);
    const fixed = sampleDraft({ a: 2, b: 1, c: num(-5), bound: num(3) });
    const monotonous = verifyGenerator({ ...sampleDefinition, generate: () => fixed, verify: undefined }, { seeds: 100 });
    expect(monotonous.warnings).toContain("Livello 1: su 100 semi escono solo 1 esercizi diversi.");
    expect(formatReport(monotonous)).toContain("Avviso: Livello 1");
  });

  it("gli altri tipi di risposta si verificano allo stesso modo", () => {
    const base = sampleDraft({ a: 2, b: 1, c: num(-5), bound: num(3) });
    const variants: ExerciseDraft["answer"][] = [
      { kind: "expression", correct: mul(sub(x, 2), add(x, 2)), form: ["factored"], wrong: [{ error: "DISEQ.ESTREMI", value: pow(sub(x, 2), 2) }] },
      { kind: "limit", correct: { kind: "+inf" }, wrong: [{ error: "DISEQ.ESTREMI", value: { kind: "-inf" } }, { error: "CALC.MENO_PARENTESI", value: { kind: "finite", value: num(0) } }] },
      { kind: "matrix", correct: { kind: "matrix", rows: [[num(1), num(2)]] }, wrong: [{ error: "DISEQ.ESTREMI", value: { kind: "matrix", rows: [[num(2), num(1)]] } }] },
      { kind: "truefalse", correct: true, error: "DISEQ.ESTREMI" },
      { kind: "ordering", items: [{ content: "Primo: $x$", fixed: true }, { content: "Secondo" }, { content: "Terzo" }] },
    ];
    for (const answer of variants) {
      const report = verifyGenerator({ ...sampleDefinition, generate: () => ({ ...base, answer }), verify: undefined }, { seeds: 5 });
      expect(report.problems, `${answer.kind}: ${formatReport(report)}`).toEqual([]);
    }
    const sameLimit = verifyGenerator(
      { ...sampleDefinition, generate: () => ({ ...base, answer: { kind: "limit", correct: { kind: "finite", value: frac(1, 2) }, wrong: [{ error: "DISEQ.ESTREMI", value: { kind: "finite", value: div(2, 4) } }] } }), verify: undefined },
      { seeds: 5 },
    );
    expect(sameLimit.failures[5]).toBe(10);
  });
});
