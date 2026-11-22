// V1.M02.A05.g1 — Da numero decimale limitato a frazione irriducibile, e da frazione a decimale.
//
// Risposta: un numero. All'indietro: si sceglie la frazione irriducibile p/q con q fatto di soli 2 e 5
// (q = 2^a · 5^b), quindi un decimale limitato con k = max(a, b) cifre dopo la virgola: il numero si
// scrive p · 10^k / q con k cifre decimali.
// - Da decimale a frazione (vincolo `reducedFraction`, il testo chiede la frazione irriducibile): le
//   sbagliate (CALC.DECIMALE_FRAZIONE) mettono al denominatore una potenza di 10 con uno zero in meno o
//   in più, oppure dimenticano la parte intera al numeratore (2,45 → 45/100).
// - Da frazione a decimale (solo livello 1): le sbagliate mettono la virgola un posto più a destra o
//   più a sinistra (uno zero in meno o in più nella potenza di 10), sempre CALC.DECIMALE_FRAZIONE.
//   Il motore non ha un vincolo «scrivi come decimale»: chi scrive la frazione giusta è accettato.
//
// Livello 1: decimali con due cifre dopo la virgola e parte intera 0 (0,35; 0,08), oppure frazioni
//   irriducibili con denominatore 2, 4, 5, 8, 20, 25, 40, 50 da scrivere come decimale.
// Livello 2: decimali con parte intera e due o tre cifre dopo la virgola (2,45; 1,375).
// Livello 3: quattro cifre dopo la virgola (0,0625; 3,1875) e decimali negativi.
//
// Verifica: il decimale del testo si rilegge con il parser del motore e si confronta con la risposta;
// la risposta deve essere una frazione irriducibile (numeratore e denominatore coprimi) con il
// denominatore fatto di soli 2 e 5.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import { decimal, div, frac, neg, toLatex, type Expr } from "../../../motore/expr";
import { parseExpression } from "../../../motore/parser";
import { simplify } from "../../../motore/algebra/simplify";
import { Rng } from "../../../motore/random/rng";
import { gcd } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const POWER = "CALC.DECIMALE_FRAZIONE";

interface Model {
  readonly direction: "toFraction" | "toDecimal";
  /** La frazione irriducibile, con il segno al numeratore. */
  readonly p: number;
  readonly q: number;
  /** Cifre dopo la virgola del decimale. */
  readonly k: number;
  /** Per «toDecimal»: la frazione mostrata (non per forza irriducibile). */
  readonly shownNum: number;
  readonly shownDen: number;
}

// ───────────────────────────── decimali ─────────────────────────────

/** Cifre del decimale senza virgola: p · 10^k / q (intero, perché q divide 10^k). */
const digitsOf = (m: Model): number => (m.p * 10 ** m.k) / m.q;

/** Il decimale scritto all'italiana: «-2,45». */
function decimalText(value: number, k: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = String(Math.abs(value)).padStart(k + 1, "0");
  return k === 0 ? `${sign}${abs}` : `${sign}${abs.slice(0, -k)},${abs.slice(-k)}`;
}

/** Cifre decimali necessarie per q = 2^a · 5^b: max(a, b). */
function placesFor(q: number): number {
  let a = 0;
  let b = 0;
  let rest = q;
  while (rest % 2 === 0) {
    rest /= 2;
    a++;
  }
  while (rest % 5 === 0) {
    rest /= 5;
    b++;
  }
  return rest === 1 ? Math.max(a, b) : -1;
}

// ───────────────────────────── costruzione ─────────────────────────────

/** Una frazione irriducibile p/q con q dalla lista e p in [min; max]. */
function drawFraction(rng: Rng_, dens: readonly number[], min: number, max: number): [number, number] {
  for (;;) {
    const q = rng.pick(dens);
    const p = rng.int(min, max);
    if (p !== 0 && gcd(p, q) === 1 && p % q !== 0) return [p, q];
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1: {
      if (rng.bool(1 / 3)) {
        const [p, q] = drawFraction(rng, [8, 20, 25, 40, 50], 1, 49);
        return { direction: "toDecimal", p, q, k: placesFor(q), shownNum: p, shownDen: q };
      }
      // Due cifre dopo la virgola, parte intera 0.
      const q = rng.pick([20, 25, 50, 100] as const);
      const [p] = drawFraction(rng, [q], 1, q - 1);
      return { direction: "toFraction", p, q, k: placesFor(q), shownNum: p, shownDen: q };
    }
    case 2: {
      // Parte intera da 1 a 9, due o tre cifre.
      const q = rng.pick([4, 20, 25, 50, 8, 40, 125, 200, 250] as const);
      for (;;) {
        const p = rng.int(q + 1, 10 * q - 1);
        if (gcd(p, q) === 1) return { direction: "toFraction", p, q, k: placesFor(q), shownNum: p, shownDen: q };
      }
    }
    case 3: {
      const q = rng.pick([16, 80, 400, 625, 1250, 16, 80] as const);
      const negative = rng.bool();
      for (;;) {
        const p = rng.int(1, 4 * q);
        if (gcd(p, q) === 1) return { direction: "toFraction", p: negative ? -p : p, q, k: placesFor(q), shownNum: p, shownDen: q };
      }
    }
  }
}

// ───────────────────────────── testo ─────────────────────────────

const places = (k: number): string => (k === 1 ? "una cifra" : `${NUMBER_WORDS[k] ?? k} cifre`);
const zeros = (k: number): string => (k === 1 ? "uno zero" : `${NUMBER_WORDS[k] ?? k} zeri`);
const NUMBER_WORDS: Record<number, string> = { 2: "due", 3: "tre", 4: "quattro" };

/** a/b non ridotta, con il meno davanti alla frazione. */
const written = (a: number, b: number): string => (a < 0 ? toLatex(neg(div(-a, b))) : toLatex(div(a, b)));

/** La frazione a/b ridotta, con la scrittura del motore. */
const reduced = (a: number, b: number): Expr => frac(a, b);

function draftOf(model: Model): ExerciseDraft {
  const { p, q, k } = model;
  const digits = digitsOf(model);
  const text = decimalText(digits, k);
  const shown = toLatex(decimal(text));
  const power = 10 ** k;
  if (model.direction === "toDecimal") {
    const fraction = toLatex(div(p, q));
    const factor = power / q;
    const wrong: ExpectedWrong<Expr>[] = [
      { error: POWER, value: decimal(decimalText(digits, k + 1)) },
      { error: POWER, value: decimal(decimalText(digits, k - 1)) },
    ];
    return {
      prompt: `Scrivi la frazione $${fraction}$ come numero decimale.`,
      answer: { kind: "number", correct: decimal(text), wrong: distinctWrongExpressions(decimal(text), wrong), mode: exact },
      steps: [
        { text: `**Passo 1.** La frazione è irriducibile e $${q} = ${factorText(q)}$: solo fattori $2$ e $5$, il decimale è limitato.` },
        { text: `**Passo 2.** Per arrivare a $${power}$ si moltiplicano numeratore e denominatore per $${factor}$: $${toLatex(div(p, q))} = ${toLatex(div(p * factor, power))}$.` },
        { text: `**Passo 3.** Al denominatore ci sono ${zeros(k)}: dopo la virgola ci sono ${places(k)}, $${shown}$.` },
      ],
      hints: [
        "Il denominatore ha solo fattori $2$ e $5$: puoi farlo diventare $10$, $100$, $1000$…",
        "Moltiplica numeratore e denominatore per lo stesso numero, così che al denominatore ci sia una potenza di $10$; poi conta gli zeri.",
      ],
    };
  }
  const intPart = Math.trunc(Math.abs(digits) / power);
  const correct = reduced(p, q);
  const sign = p < 0 ? -1 : 1;
  const candidates: (ExpectedWrong<Expr> | null)[] = [
    { error: POWER, value: reduced(digits, power / 10) },
    { error: POWER, value: reduced(digits, power * 10) },
    intPart > 0 ? { error: POWER, value: reduced(sign * (Math.abs(digits) % power), power) } : null,
    intPart === 0 && k >= 3 ? { error: POWER, value: reduced(digits, power / 100) } : null,
  ];
  const g = gcd(Math.abs(digits), power);
  return {
    prompt: `Scrivi il numero $${shown}$ come frazione irriducibile.`,
    answer: { kind: "number", correct, wrong: distinctWrongExpressions(correct, candidates), mode: exact, form: ["reducedFraction"] },
    steps: [
      { text: `**Passo 1.** Dopo la virgola ci sono ${places(k)}: al denominatore $1$ seguito da ${zeros(k)}, al numeratore il numero senza la virgola. $${shown} = ${written(digits, power)}$.` },
      {
        text:
          g === 1
            ? `**Passo 2.** $\\mathrm{MCD}(${Math.abs(digits)}, ${power}) = 1$: la frazione è già irriducibile.`
            : `**Passo 2.** $\\mathrm{MCD}(${Math.abs(digits)}, ${power}) = ${g}$: si dividono numeratore e denominatore per $${g}$, $${written(digits, power)} = ${toLatex(correct)}$.`,
      },
      { text: `Controllo: $${q} = ${factorText(q)}$ e $${Math.abs(p)}$ non ha fattori $2$ né $5$ in comune con $${q}$: la frazione è irriducibile.` },
    ],
    hints: [
      "Conta le cifre dopo la virgola, compresi gli zeri subito dopo la virgola.",
      "Il numeratore è il numero senza la virgola (parte intera compresa); poi semplifica dividendo per il MCD.",
    ],
  };
}

/** «2^{3} \cdot 5» per un denominatore fatto di 2 e 5. */
function factorText(q: number): string {
  let a = 0;
  let b = 0;
  let rest = q;
  while (rest % 2 === 0) {
    rest /= 2;
    a++;
  }
  while (rest % 5 === 0) {
    rest /= 5;
    b++;
  }
  const parts: string[] = [];
  if (a > 0) parts.push(a === 1 ? "2" : `2^{${a}}`);
  if (b > 0) parts.push(b === 1 ? "5" : `5^{${b}}`);
  return parts.join(" \\cdot ");
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (answer.kind !== "number") return false;
  const value = simplify(answer.correct);
  if (value.kind !== "num") return false;
  if (model.direction === "toFraction") {
    // Il numero del testo, riletto come lo scriverebbe Andrea.
    const match = /numero \$(-?[\d]+)\{,\}(\d+)\$/.exec(exercise.prompt);
    if (!match) return false;
    const parsed = parseExpression(`${match[1]},${match[2]}`);
    if (!parsed.ok) return false;
    const shown = simplify(parsed.value);
    if (shown.kind !== "num" || !shown.value.eq(value.value)) return false;
    const n = Number(value.value.toString().split("/")[0]);
    const d = Number(value.value.toString().split("/")[1] ?? "1");
    return gcd(n, d) === 1 && placesFor(d) >= 0;
  }
  // Da frazione a decimale: numeratore e denominatore del testo divisi davvero.
  return value.value.mul(model.shownDen).eq(model.shownNum);
}

export default defineGenerator({
  code: "V1.M02.A05.g1",
  skill: "V1.M02.A05",
  lesson: "V1.M02.L04",
  title: "Frazioni e numeri decimali limitati",
  levels: [1, 2, 3],
  errors: [POWER],
  limits: { maxInteger: 100_000, maxDenominator: 100_000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
