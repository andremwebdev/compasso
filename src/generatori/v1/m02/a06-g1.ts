// V1.M02.A06.g1 — Frazione generatrice di un numero periodico.
//
// Risposta: un numero, con il vincolo `reducedFraction` (il testo chiede la frazione irriducibile; il
// periodico stesso non vale come risposta). All'indietro: si scelgono le cifre (parte intera,
// antiperiodo, periodo) in forma già minima, la frazione è (N − A)/D ridotta. Le sbagliate rifanno la
// regola con un errore preciso:
// - CALC.PERIODICO: niente sottrazione (N/D); sottratta solo la parte intera quando c'è un antiperiodo;
//   denominatore senza gli zeri dell'antiperiodo (solo 9); un solo 9 per un periodo di due o più cifre;
//   uno 0 in più al denominatore quando l'antiperiodo non c'è;
// - CALC.DECIMALE_FRAZIONE: il periodico trattato come un decimale limitato (0,(36) = 36/100).
//
// Livello 1: periodici semplici con parte intera 0 o 1 (0,(3); 1,(36)).
// Livello 2: periodici misti con una cifra di antiperiodo, parte intera 0 o 1 (0,1(6); 1,2(3)).
// Livello 3: parte intera fino a 9, antiperiodo di una o due cifre, periodo di una, due o tre cifre;
//   qualche volta periodo 9 (0,4(9) = 1/2), caso spiegato nella lezione.
//
// Verifica: il periodico del testo si rilegge con il parser del motore (che ne calcola il valore per
// conto suo) e deve coincidere con la risposta, che deve essere una frazione irriducibile.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import { simplify } from "../../../motore/algebra/simplify";
import { div, frac, repeatingDecimal, toLatex, type Expr } from "../../../motore/expr";
import { parseExpression } from "../../../motore/parser";
import { Rng } from "../../../motore/random/rng";
import { gcd } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const RULE = "CALC.PERIODICO";
const AS_LIMITED = "CALC.DECIMALE_FRAZIONE";

interface Model {
  readonly whole: number;
  /** Cifre dell'antiperiodo e del periodo, come testo («1», «45»). */
  readonly pre: string;
  readonly period: string;
}

// ───────────────────────────── regola ─────────────────────────────

/** N, A, D della regola. */
function parts(m: Model): { N: number; A: number; D: number; n: number; k: number } {
  const n = m.pre.length;
  const k = m.period.length;
  const N = Number(`${m.whole}${m.pre}${m.period}`);
  const A = Number(`${m.whole}${m.pre}`);
  const D = Number(`${"9".repeat(k)}${"0".repeat(n)}`);
  return { N, A, D, n, k };
}

const text = (m: Model): string => `${m.whole},${m.pre}(${m.period})`;

/** Vero se il periodo è il più corto possibile e l'antiperiodo non finisce come il periodo. */
function minimal(m: Model): boolean {
  const p = m.period;
  for (let len = 1; len < p.length; len++) if (p.length % len === 0 && p.slice(0, len).repeat(p.length / len) === p) return false;
  if (m.pre.length > 0 && m.pre.at(-1) === p.at(-1)) return false;
  return p !== "0";
}

// ───────────────────────────── costruzione ─────────────────────────────

const digitsText = (rng: Rng_, count: number): string => Array.from({ length: count }, () => String(rng.int(0, 9))).join("");

function draw(rng: Rng_, whole: () => number, preLen: () => number, periodLen: () => number, allowNine: boolean): Model {
  for (;;) {
    const m: Model = { whole: whole(), pre: digitsText(rng, preLen()), period: digitsText(rng, periodLen()) };
    if (!minimal(m)) continue;
    if (!allowNine && m.period === "9".repeat(m.period.length)) continue;
    return m;
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = drawModel(level, rng);
    if (level === 1 || wrongOf(model).length >= 3) return model;
  }
}

function drawModel(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1:
      return draw(rng, () => rng.pick([0, 0, 1] as const), () => 0, () => rng.pick([1, 2, 2, 2] as const), false);
    case 2:
      return draw(rng, () => rng.int(0, 1), () => 1, () => rng.pick([1, 1, 2] as const), false);
    case 3: {
      if (rng.bool(1 / 6)) {
        // Periodo 9: il numero è un decimale limitato.
        for (;;) {
          const m: Model = { whole: rng.int(0, 5), pre: digitsText(rng, rng.int(1, 2)), period: "9" };
          if (minimal(m)) return m;
        }
      }
      // Al più tre cifre tra antiperiodo e periodo: i numeri restano leggibili.
      const preLen = rng.int(0, 2);
      return draw(rng, () => rng.int(1, 9), () => preLen, () => rng.pick(preLen === 2 ? ([1] as const) : preLen === 1 ? ([1, 2] as const) : ([1, 2, 3] as const)), false);
    }
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** Le risposte sbagliate previste, già filtrate (diverse dalla giusta e tra loro). */
function wrongOf(model: Model): ExpectedWrong<Expr>[] {
  const { N, A, D, n, k } = parts(model);
  const correct = frac(N - A, D);
  const nines = Number("9".repeat(k));
  const candidates: (ExpectedWrong<Expr> | null)[] = [
    // Niente sottrazione.
    { error: RULE, value: frac(N, D) },
    // Il periodico preso per un decimale limitato: le cifre fino al primo periodo su una potenza di 10.
    { error: AS_LIMITED, value: frac(Number(`${model.whole}${model.pre}${model.period}`), 10 ** (n + k)) },
    // Senza gli zeri dell'antiperiodo.
    n > 0 ? { error: RULE, value: frac(N - A, nines) } : null,
    // Sottratta solo la parte intera.
    n > 0 ? { error: RULE, value: frac(N - model.whole, D) } : null,
    // Un solo 9 per un periodo lungo.
    k > 1 ? { error: RULE, value: frac(N - A, Number(`9${"0".repeat(n)}`)) } : null,
    // Uno 0 in più al denominatore.
    n === 0 ? { error: RULE, value: frac(N - A, D * 10) } : null,
  ];
  return distinctWrongExpressions(correct, candidates).slice(0, 4);
}

const WORDS: Record<number, string> = { 1: "una", 2: "due", 3: "tre" };
const digitsWord = (count: number): string => (count === 1 ? "una cifra" : `${WORDS[count] ?? count} cifre`);

function draftOf(model: Model): ExerciseDraft {
  const { N, A, D, n, k } = parts(model);
  const correct = frac(N - A, D);
  const shown = toLatex(repeatingDecimal(text(model)));
  const wrong = wrongOf(model);
  const g = gcd(N - A, D);
  const fraction = toLatex(div(N - A, D));
  const intro =
    n === 0
      ? `**Passo 1.** Il periodo è $${model.period}$ (${digitsWord(k)}); l'antiperiodo non c'è.`
      : `**Passo 1.** Il periodo è $${model.period}$ (${digitsWord(k)}), l'antiperiodo è $${model.pre}$ (${digitsWord(n)}).`;
  const steps = [
    { text: intro },
    { text: `**Passo 2.** Numeratore: il numero senza virgola fino alla fine del primo periodo, meno le cifre prima del periodo: $${N} - ${A} = ${N - A}$.` },
    { text: `**Passo 3.** Denominatore: ${k === 1 ? "un $9$" : `${WORDS[k] ?? k} cifre $9$`}${n === 0 ? "" : ` seguit${k === 1 ? "o" : "e"} da ${n === 1 ? "uno $0$" : `${WORDS[n] ?? n} zeri`}`}, cioè $${D}$.` },
    {
      text:
        g === 1
          ? `**Passo 4.** $${fraction}$ è già irriducibile.`
          : `**Passo 4.** $\\mathrm{MCD}(${N - A}, ${D}) = ${g}$, quindi $${fraction} = ${toLatex(correct)}$.`,
    },
  ];
  if (model.period === "9") steps.push({ text: `Il periodo è $9$: il numero è il decimale limitato $${toLatex(correct)}$, scritto in un altro modo.` });
  return {
    prompt: `Scrivi la frazione generatrice di $${shown}$, ridotta ai minimi termini.`,
    answer: { kind: "number", correct, wrong, mode: exact, form: ["reducedFraction"] },
    steps,
    hints: [
      "Individua periodo e antiperiodo: la parte intera non fa parte di nessuno dei due.",
      "Al numeratore togli il numero formato dalle cifre prima del periodo; al denominatore un $9$ per ogni cifra del periodo e uno $0$ per ogni cifra dell'antiperiodo.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (answer.kind !== "number") return false;
  const value = simplify(answer.correct);
  const parsed = parseExpression(text(model));
  if (!parsed.ok || value.kind !== "num") return false;
  const shown = simplify(parsed.value);
  if (shown.kind !== "num" || !shown.value.eq(value.value)) return false;
  // Il testo mostra lo stesso periodico.
  if (!exercise.prompt.includes(toLatex(repeatingDecimal(text(model))))) return false;
  return gcd(Number(value.value.n), Number(value.value.d)) === 1;
}

export default defineGenerator({
  code: "V1.M02.A06.g1",
  skill: "V1.M02.A06",
  lesson: "V1.M02.L05",
  title: "Frazione generatrice",
  levels: [1, 2, 3],
  errors: [RULE, AS_LIMITED],
  limits: { maxInteger: 100_000, maxDenominator: 100_000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
