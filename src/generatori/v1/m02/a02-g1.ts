// V1.M02.A02.g1 — Criteri di divisibilità, quoziente e resto.
//
// Due forme di esercizio:
// - «Quale di questi numeri è divisibile per d?» (scelta multipla scritta a mano). All'indietro: si
//   sceglie un multiplo di d (la risposta giusta), poi tre numeri NON divisibili per d costruiti apposta
//   perché un criterio usato male li faccia sembrare divisibili (CALC.CRITERIO_DIVISIBILITA): ultima
//   cifra al posto della somma (per 3 e 9), somma multipla di 3 ma non di 9, una cifra al posto di due
//   (per 4), somma delle cifre al posto della differenza (per 11), per un divisore composto un solo
//   criterio o due criteri con fattori non coprimi (12 = 2 · 6, 18 = 3 · 6, 36 = 6 · 6, 45 = 3 · 15).
// - «Qual è il resto della divisione di a per b?» (numero). All'indietro: si scelgono quoziente e resto,
//   e a = q · b + r. Le sbagliate (CALC.RESTO_DIVISIONE): il quoziente al posto del resto, il resto con
//   un quoziente di meno (r + b, non minore di b), quanto manca al multiplo successivo (b − r).
//
// Livello 1: divisibilità per 3 o per 4 con numeri di tre cifre; resto con divisore di una cifra.
// Livello 2: divisibilità per 4, 9, 11 con numeri di quattro cifre; resto con divisore di due cifre.
// Livello 3: divisori composti (6, 12, 15, 18, 36, 45): servono due criteri con fattori coprimi.
//
// Verifica: la divisibilità si controlla con la divisione vera (n mod d), il resto ricostruendo a dal
// testo e dividendo.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import { num, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";

type Rng_ = GeneratorContext["rng"];

const CRITERION = "CALC.CRITERIO_DIVISIBILITA";
const REMAINDER = "CALC.RESTO_DIVISIONE";

type Divisor = 3 | 4 | 9 | 11 | 6 | 12 | 15 | 18 | 36 | 45;

type Model =
  | { readonly kind: "divisible"; readonly d: Divisor; readonly correct: number; readonly traps: readonly number[] }
  | { readonly kind: "remainder"; readonly b: number; readonly q: number; readonly r: number };

// ───────────────────────────── cifre ─────────────────────────────

const digits = (n: number): number[] => String(n).split("").map(Number);
const digitSum = (n: number): number => digits(n).reduce((s, d) => s + d, 0);
const lastTwo = (n: number): number => n % 100;
/** Differenza tra la somma delle cifre di posto dispari e quella di posto pari, contando da destra. */
const alternating = (n: number): number => digits(n).reverse().reduce((s, d, i) => s + (i % 2 === 0 ? d : -d), 0);

/** Un numero di `size` cifre che rispetta `test`, estratto con `rng`. */
function drawNumber(rng: Rng_, size: number, test: (n: number) => boolean): number {
  const min = 10 ** (size - 1);
  const max = 10 ** size - 1;
  for (;;) {
    const n = rng.int(min, max);
    if (test(n)) return n;
  }
}

/**
 * Le trappole per il divisore d: numeri non divisibili per d che un criterio usato male farebbe
 * sembrare divisibili. Ognuna è una funzione che dice se il numero è una buona trappola.
 */
function trapTests(d: Divisor): ((n: number) => boolean)[] {
  const not = (n: number): boolean => n % d !== 0;
  switch (d) {
    case 3:
      // Ultima cifra multipla di 3 (3, 6, 9), somma delle cifre non multipla di 3.
      return [(n) => not(n) && [3, 6, 9].includes(n % 10)];
    case 9:
      return [
        // Somma multipla di 3 ma non di 9.
        (n) => not(n) && digitSum(n) % 3 === 0,
        // Ultima cifra 9, somma non multipla di 9.
        (n) => not(n) && n % 10 === 9,
      ];
    case 4:
      return [
        // Ultima cifra 4 o 8, ma le ultime due non formano un multiplo di 4.
        (n) => not(n) && [4, 8].includes(n % 10),
        // Pari (ultima cifra 2 o 6), non multiplo di 4.
        (n) => not(n) && [2, 6].includes(n % 10),
      ];
    case 11:
      // La somma delle cifre è multipla di 11, la differenza a segni alterni no.
      return [(n) => not(n) && digitSum(n) % 11 === 0];
    case 6:
      return [(n) => not(n) && n % 3 === 0, (n) => not(n) && n % 2 === 0];
    case 12:
      // 12 = 2 · 6: divisibile per 2 e per 6 non basta; anche solo per 3, o solo per 4.
      return [(n) => not(n) && n % 6 === 0, (n) => not(n) && n % 4 === 0];
    case 15:
      return [(n) => not(n) && n % 5 === 0, (n) => not(n) && n % 3 === 0 && n % 10 === 3];
    case 18:
      // 18 = 3 · 6: divisibile per 3 e per 6 non basta.
      return [(n) => not(n) && n % 6 === 0, (n) => not(n) && n % 9 === 0];
    case 36:
      // 36 = 6 · 6 o 3 · 12: divisibile per 12 (cioè per 3 e per 4) non basta; anche per 9 e per 2.
      return [(n) => not(n) && n % 12 === 0, (n) => not(n) && n % 18 === 0];
    case 45:
      // 45 = 3 · 15: divisibile per 15 (per 3 e per 5) non basta.
      return [(n) => not(n) && n % 15 === 0, (n) => not(n) && n % 9 === 0];
  }
}

function buildDivisible(rng: Rng_, d: Divisor, size: number): Model {
  const correct = drawNumber(rng, size, (n) => n % d === 0 && (d !== 3 || ![3, 6, 9].includes(n % 10)) && (d !== 4 || n % 10 !== 4));
  const tests = trapTests(d);
  const traps: number[] = [];
  for (let i = 0; traps.length < 3; i++) {
    const test = tests[i % tests.length] as (n: number) => boolean;
    const n = drawNumber(rng, size, test);
    if (n !== correct && !traps.includes(n)) traps.push(n);
  }
  return { kind: "divisible", d, correct, traps };
}

function buildRemainder(rng: Rng_, level: Level): Model {
  for (;;) {
    const b = level === 1 ? rng.int(3, 9) : rng.int(11, 25);
    const q = level === 1 ? rng.int(4, 12) : rng.int(12, 45);
    const r = rng.int(1, b - 1);
    // Il quoziente, r + b e b − r devono essere diversi dal resto e tra loro.
    const values = new Set([r, q, r + b, b - r]);
    if (values.size === 4) return { kind: "remainder", b, q, r };
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1: {
      const form = rng.pick(["three", "four", "remainder"] as const);
      return form === "remainder" ? buildRemainder(rng, 1) : buildDivisible(rng, form === "three" ? 3 : 4, 3);
    }
    case 2: {
      const form = rng.pick([4, 9, 9, 11, 11, "remainder"] as const);
      return form === "remainder" ? buildRemainder(rng, 2) : buildDivisible(rng, form, 4);
    }
    case 3:
      return buildDivisible(rng, rng.pick([6, 12, 12, 15, 18, 18, 36, 45] as const), 4);
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** Perché un numero sembra divisibile per d (la trappola) e perché non lo è. */
function trapReason(d: Divisor, n: number): string {
  switch (d) {
    case 3:
      return `$${n}$ finisce con $${n % 10}$, ma la somma delle cifre è $${digitSum(n)}$, che non è multiplo di $3$`;
    case 9:
      return `la somma delle cifre di $${n}$ è $${digitSum(n)}$, che non è multiplo di $9$`;
    case 4:
      return `$${n}$ finisce con $${n % 10}$, ma le ultime due cifre formano $${lastTwo(n)}$, che non è multiplo di $4$`;
    case 11:
      return `per $${n}$ la differenza a segni alterni è $${alternating(n)}$, che non è multiplo di $11$`;
    case 6:
    case 12:
    case 15:
    case 18:
    case 36:
    case 45: {
      const [a, b] = coprimeFactors(d);
      const fails = n % a !== 0 ? a : b;
      return `$${n}$ non è divisibile per $${fails}$ (${factorCheck(fails, n)})`;
    }
  }
}

/** I due fattori coprimi con cui si controlla un divisore composto. */
function coprimeFactors(d: 6 | 12 | 15 | 18 | 36 | 45): readonly [number, number] {
  switch (d) {
    case 6:
      return [2, 3];
    case 12:
      return [3, 4];
    case 15:
      return [3, 5];
    case 18:
      return [2, 9];
    case 36:
      return [4, 9];
    case 45:
      return [5, 9];
  }
}

/** Che cosa dice il criterio di f (2, 3, 4, 5 o 9) sul numero n. */
function factorCheck(f: number, n: number): string {
  switch (f) {
    case 2:
      return `ultima cifra $${n % 10}$`;
    case 5:
      return `ultima cifra $${n % 10}$`;
    case 4:
      return `ultime due cifre $${lastTwo(n)}$`;
    default:
      return `somma delle cifre $${digitSum(n)}$`;
  }
}

/** Il controllo di un numero divisibile, criterio per criterio. */
function whyDivisible(d: Divisor, n: number): string {
  switch (d) {
    case 3:
      return `la somma delle cifre è $${digitSum(n)}$, multiplo di $3$`;
    case 9:
      return `la somma delle cifre è $${digitSum(n)}$, multiplo di $9$`;
    case 4:
      return `le ultime due cifre formano $${lastTwo(n)}$, multiplo di $4$`;
    case 11:
      return `la differenza a segni alterni è $${alternating(n)}$, multiplo di $11$`;
    default: {
      const [a, b] = coprimeFactors(d);
      return `è divisibile per $${a}$ (${factorCheck(a, n)}) e per $${b}$ (${factorCheck(b, n)})`;
    }
  }
}

function criterionText(d: Divisor): string {
  switch (d) {
    case 3:
    case 9:
      return `Per $${d}$ conta la somma delle cifre.`;
    case 4:
      return "Per $4$ conta il numero formato dalle ultime due cifre.";
    case 11:
      return "Per $11$ conta la differenza tra la somma delle cifre di posto dispari e quella delle cifre di posto pari, contando da destra.";
    default: {
      const [a, b] = coprimeFactors(d);
      return `$${d} = ${a} \\cdot ${b}$, e $${a}$ e $${b}$ non hanno divisori comuni oltre a $1$: un numero è divisibile per $${d}$ se lo è per $${a}$ e per $${b}$.`;
    }
  }
}

function draftOf(model: Model): ExerciseDraft {
  if (model.kind === "remainder") {
    const { b, q, r } = model;
    const a = q * b + r;
    const wrong: ExpectedWrong<Expr>[] = [
      { error: REMAINDER, value: num(q) },
      { error: REMAINDER, value: num(r + b) },
      { error: REMAINDER, value: num(b - r) },
    ];
    return {
      prompt: `Qual è il resto della divisione di $${a}$ per $${b}$? Rispondi con un numero naturale.`,
      answer: { kind: "number", correct: num(r), wrong, mode: exact },
      steps: [
        { text: `**Passo 1.** Il multiplo di $${b}$ più grande che non supera $${a}$ è $${q} \\cdot ${b} = ${q * b}$: il successivo, $${q + 1} \\cdot ${b} = ${(q + 1) * b}$, supera $${a}$.` },
        { text: `**Passo 2.** Quindi $${a} = ${q} \\cdot ${b} + ${r}$, con $0 \\le ${r} < ${b}$: il quoziente è $${q}$ e il resto è $${r}$.` },
      ],
      hints: ["Il resto è quello che avanza togliendo da $a$ il multiplo di $b$ più grande possibile, e deve essere minore di $b$.", `Cerca il multiplo di $${b}$ più vicino a $${a}$ senza superarlo.`],
    };
  }
  const { d, correct, traps } = model;
  return {
    prompt: `Quale di questi numeri è divisibile per $${d}$?`,
    answer: { kind: "choice", correct: `$${correct}$`, wrong: traps.map((n) => ({ error: CRITERION, value: `$${n}$` })) },
    steps: [
      { text: `**Passo 1.** ${criterionText(d)}` },
      { text: `**Passo 2.** $${correct}$: ${whyDivisible(d, correct)}. È divisibile per $${d}$: $${correct} = ${correct / d} \\cdot ${d}$.` },
      { text: `**Passo 3.** Gli altri no: ${traps.map((n) => trapReason(d, n)).join("; ")}.` },
    ],
    hints: [
      d <= 11 ? `Quale criterio vale per $${d}$? Guarda la tabella dei criteri.` : `Scrivi $${d}$ come prodotto di due numeri senza divisori comuni oltre a $1$.`,
      d === 3 || d === 9 ? "Somma le cifre: l'ultima cifra da sola non dice niente." : d === 4 ? "Guarda le ultime due cifre, non solo l'ultima." : d === 11 ? "Somma le cifre di posto dispari, poi quelle di posto pari (da destra), e fai la differenza." : "Controlla i due criteri: devono valere tutti e due.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (model.kind === "remainder") {
    const match = /divisione di \$(\d+)\$ per \$(\d+)\$/.exec(exercise.prompt);
    if (!match || answer.kind !== "number" || answer.correct.kind !== "num") return false;
    const a = Number(match[1]);
    const b = Number(match[2]);
    return answer.correct.value.eq(a % b);
  }
  if (answer.kind !== "choice") return false;
  const value = (text: string): number => Number(text.replace(/\$/g, ""));
  const d = Number(/divisibile per \$(\d+)\$/.exec(exercise.prompt)?.[1]);
  return value(answer.correct) % d === 0 && answer.wrong.every((w) => value(w.value) % d !== 0) && model.d === d;
}

export default defineGenerator({
  code: "V1.M02.A02.g1",
  skill: "V1.M02.A02",
  lesson: "V1.M02.L02",
  title: "Criteri di divisibilità, quoziente e resto",
  levels: [1, 2, 3],
  errors: [CRITERION, REMAINDER],
  limits: { maxInteger: 10_000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
