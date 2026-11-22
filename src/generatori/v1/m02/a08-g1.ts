// V1.M02.A08.g1 — Confrontare numeri reali scritti in modi diversi (decimali, frazioni, radici).
//
// Scelta multipla scritta a mano: «Quale di questi numeri è il maggiore?». All'indietro: si sceglie
// prima il numero maggiore c, poi tre numeri più piccoli costruiti apposta perché un errore di confronto
// li faccia sembrare più grandi:
// - CALC.CONFRONTO_NUMERI: un decimale con più cifre dopo la virgola (0,7 contro 0,689: «689 > 7»);
//   una frazione con numeratore e denominatore grandi (13/20 contro 0,7: «13 > 7»); una radice con il
//   radicando maggiore di c (√10 contro 3,2: «10 > 3,2»);
// - DISEQ.VERSO_NON_INVERTITO (numeri negativi): un numero più lontano dallo 0, scelto da chi confronta
//   i numeri senza segno (−0,75 contro −0,7: «0,75 > 0,7»).
//
// Livello 1: decimali e frazioni positivi minori di 1.
// Livello 2: anche radici quadrate, numeri tra 2 e 5.
// Livello 3: tutti negativi (anche −√n): il maggiore è il più vicino allo 0.
//
// Verifica: confronto esatto a due a due. Un numero è ±r (r razionale) o ±√n; due numeri si confrontano
// col segno e, a parità di segno, con i quadrati (razionali esatti): niente virgola mobile.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { decimal, div, neg, sqrt, toLatex } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { gcd } from "../../comuni/primes";

type Rng_ = GeneratorContext["rng"];

const COMPARE = "CALC.CONFRONTO_NUMERI";
const SIGN = "DISEQ.VERSO_NON_INVERTITO";

/** Un numero dell'esercizio: `negative` lo rende negativo. */
type Item =
  | { readonly k: "decimal"; readonly text: string; readonly negative: boolean }
  | { readonly k: "fraction"; readonly p: number; readonly q: number; readonly negative: boolean }
  | { readonly k: "root"; readonly n: number; readonly negative: boolean };

type Trap = { readonly item: Item; readonly error: typeof COMPARE | typeof SIGN; readonly why: "digits" | "numerator" | "radicand" | "sign" };

interface Model {
  readonly correct: Item;
  readonly traps: readonly Trap[];
}

// ───────────────────────────── valori esatti ─────────────────────────────

const decimalValue = (text: string): Rational => {
  const [whole, frac = ""] = text.split(",");
  return Rational.of(BigInt(`${whole}${frac}`), 10n ** BigInt(frac.length));
};

/** Il quadrato del valore assoluto (esatto) e il segno. */
function squareAndSign(item: Item): { square: Rational; sign: -1 | 1 } {
  const sign = item.negative ? -1 : 1;
  switch (item.k) {
    case "decimal": {
      const v = decimalValue(item.text);
      return { square: v.mul(v), sign };
    }
    case "fraction": {
      const v = Rational.of(item.p, item.q);
      return { square: v.mul(v), sign };
    }
    case "root":
      return { square: Rational.of(item.n), sign };
  }
}

/** −1, 0, 1 come a < b, a = b, a > b: segno, poi quadrati (rovesciati per i negativi). */
function compare(a: Item, b: Item): number {
  const x = squareAndSign(a);
  const y = squareAndSign(b);
  if (x.sign !== y.sign) return x.sign;
  return x.sign * x.square.cmp(y.square);
}

const latexOf = (item: Item): string => {
  const abs = item.k === "decimal" ? decimal(item.text) : item.k === "fraction" ? div(item.p, item.q) : sqrt(item.n);
  return toLatex(item.negative ? neg(abs) : abs);
};

// ───────────────────────────── costruzione ─────────────────────────────

const decimalText = (value: number, places: number): string => (value / 10 ** places).toFixed(places).replace(".", ",");

/** Un decimale con più cifre, poco più piccolo (in valore assoluto) di c = cTenths / 10. */
function digitsTrap(rng: Rng_, cTenths: number, negative: boolean): Item {
  // c − (da 0,001 a 0,099), con tre cifre: 0,7 → 0,689.
  const value = cTenths * 100 - rng.int(1, 99);
  return { k: "decimal", text: decimalText(value, 3), negative };
}

/** Una frazione con numeratore e denominatore di due cifre, di poco più piccola di c. */
function numeratorTrap(rng: Rng_, c: Rational, negative: boolean): Item {
  for (;;) {
    const q = rng.int(11, 40);
    const p = rng.int(10, 6 * q);
    if (gcd(p, q) !== 1) continue;
    const v = Rational.of(p, q);
    // Sotto c, ma non di molto (entro 0,15), e con il numeratore più grande delle cifre di c.
    if (v.cmp(c) < 0 && c.sub(v).cmp(Rational.of(15, 100)) <= 0) return { k: "fraction", p, q, negative };
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = draw(level, rng);
    const all = [model.correct, ...model.traps.map((t) => t.item)];
    const distinct = new Set(all.map(latexOf)).size === all.length;
    // Il maggiore è uno solo e nessun altro numero è uguale a un altro.
    const unique = all.every((a, i) => all.every((b, j) => i === j || compare(a, b) !== 0));
    if (distinct && unique && model.traps.every((t) => compare(t.item, model.correct) < 0)) return model;
  }
}

function draw(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1: {
      const tenths = rng.int(3, 9);
      const c = Rational.of(tenths, 10);
      const correct: Item = { k: "decimal", text: decimalText(tenths, 1), negative: false };
      // Un secondo decimale con due cifre, sotto c: 0,7 → 0,65.
      const second: Item = { k: "decimal", text: decimalText(tenths * 10 - rng.int(1, 9), 2), negative: false };
      return {
        correct,
        traps: [
          { item: digitsTrap(rng, tenths, false), error: COMPARE, why: "digits" },
          { item: numeratorTrap(rng, c, false), error: COMPARE, why: "numerator" },
          { item: second, error: COMPARE, why: "digits" },
        ],
      };
    }
    case 2: {
      const tenths = rng.pick(Array.from({ length: 25 }, (_, i) => 25 + i).filter((t) => t % 10 !== 0));
      const c = Rational.of(tenths, 10);
      const correct: Item = { k: "decimal", text: decimalText(tenths, 1), negative: false };
      // √n con c < n < c²: il radicando supera c, la radice no.
      const radicands = [5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23].filter((n) => Rational.of(n).cmp(c) > 0 && Rational.of(n).cmp(c.mul(c)) < 0);
      return {
        correct,
        traps: [
          { item: { k: "root", n: rng.pick(radicands), negative: false }, error: COMPARE, why: "radicand" },
          { item: digitsTrap(rng, tenths, false), error: COMPARE, why: "digits" },
          { item: numeratorTrap(rng, c, false), error: COMPARE, why: "numerator" },
        ],
      };
    }
    case 3: {
      // Tutti negativi: il maggiore è il più vicino allo 0.
      const tenths = rng.pick(Array.from({ length: 19 }, (_, i) => 11 + i).filter((t) => t % 10 !== 0));
      const c = Rational.of(tenths, 10);
      const correct: Item = rng.bool() ? { k: "decimal", text: decimalText(tenths, 1), negative: true } : rootNear(rng, c);
      const cv = squareAndSign(correct).square;
      // Numeri più lontani dallo 0: un decimale, una frazione, una radice.
      const farDecimal: Item = { k: "decimal", text: decimalText(tenths * 100 + rng.int(1, 99), 3), negative: true };
      const farFraction = (): Item => {
        for (;;) {
          const q = rng.int(3, 12);
          const p = rng.int(q + 1, 4 * q);
          const v = Rational.of(p, q);
          if (gcd(p, q) === 1 && v.mul(v).cmp(cv) > 0 && v.mul(v).cmp(cv.mul(4)) < 0) return { k: "fraction", p, q, negative: true };
        }
      };
      const farRoot = (): Item => {
        for (;;) {
          const n = rng.int(2, 24);
          if (!Number.isInteger(Math.sqrt(n)) && Rational.of(n).cmp(cv) > 0 && Rational.of(n).cmp(cv.mul(4)) < 0) return { k: "root", n, negative: true };
        }
      };
      return {
        correct,
        traps: [
          { item: farDecimal, error: SIGN, why: "sign" },
          { item: farFraction(), error: SIGN, why: "sign" },
          { item: correct.k === "root" ? farDecimalRoot(rng, cv) : farRoot(), error: SIGN, why: "sign" },
        ],
      };
    }
  }
}

/** −√n con √n vicino a c (tra c e c + 0,5). */
function rootNear(rng: Rng_, c: Rational): Item {
  const candidates = [2, 3, 5, 6, 7, 8].filter((n) => Rational.of(n).cmp(c.mul(c)) >= 0 && Rational.of(n).cmp(c.add(Rational.of(1, 2)).pow(2)) < 0);
  return candidates.length > 0 ? { k: "root", n: rng.pick(candidates), negative: true } : { k: "root", n: 3, negative: true };
}

/** Un decimale negativo con una cifra, più lontano dallo 0 di √(cv). */
function farDecimalRoot(rng: Rng_, cv: Rational): Item {
  for (;;) {
    const tenths = rng.int(11, 40);
    const v = Rational.of(tenths, 10);
    if (v.mul(v).cmp(cv) > 0 && v.mul(v).cmp(cv.mul(4)) < 0) return { k: "decimal", text: decimalText(tenths, 1), negative: true };
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** Il numero senza segno. */
const absOf = (item: Item): Item => ({ ...item, negative: false });

/** Il quadrato di un numero positivo, scritto: «10,24», «\frac{100}{49}», «15». */
function squareLatex(item: Item): string {
  switch (item.k) {
    case "decimal":
      return toLatex(decimal(squareText(item.text)));
    case "fraction":
      return toLatex(div(item.p * item.p, item.q * item.q));
    case "root":
      return String(item.n);
  }
}

/** Perché |big| > |small| (numeri positivi): cifre, in croce, o quadrati. */
function absReason(big: Item, small: Item): string {
  const b = latexOf(absOf(big));
  const a = latexOf(absOf(small));
  if (big.k === "decimal" && small.k === "decimal") {
    const places = Math.max((big.text.split(",")[1] ?? "").length, (small.text.split(",")[1] ?? "").length);
    const pad = (t: string): string => toLatex(decimal(t.padEnd(t.indexOf(",") + 1 + places, "0")));
    return `con lo stesso numero di cifre, $${pad(small.text)} < ${pad(big.text)}$`;
  }
  if (big.k !== "root" && small.k !== "root") {
    const [p, q] = big.k === "fraction" ? [big.p, big.q] : [Number(decimalValue(big.text).n), Number(decimalValue(big.text).d)];
    const [r, t] = small.k === "fraction" ? [small.p, small.q] : [Number(decimalValue(small.text).n), Number(decimalValue(small.text).d)];
    return `in croce, $${r} \\cdot ${q} = ${r * q}$ è minore di $${t} \\cdot ${p} = ${t * p}$`;
  }
  return `i quadrati sono $${squareLatex(absOf(small))}$ per $${a}$ e $${squareLatex(absOf(big))}$ per $${b}$`;
}

/** Perché la trappola è più piccola del maggiore. */
function whySmaller(trap: Trap, correct: Item): string {
  const t = latexOf(trap.item);
  const c = latexOf(correct);
  if (trap.why === "sign") return `$${t} < ${c}$: senza segno $${latexOf(absOf(trap.item))}$ è più grande (${absReason(trap.item, correct)}), quindi con il meno sta più a sinistra`;
  return `$${t} < ${c}$: ${absReason(correct, trap.item)}`;
}

/** Il quadrato di un decimale, scritto con la virgola: «3,2» → «10,24». */
function squareText(text: string): string {
  const places = (text.split(",")[1] ?? "").length;
  const digits = Number(text.replace(",", ""));
  return decimalText(digits * digits, 2 * places);
}

function draftOf(model: Model): ExerciseDraft {
  const options = [model.correct, ...model.traps.map((t) => t.item)];
  const negative = model.correct.negative;
  return {
    prompt: `Quale di questi numeri è il maggiore: ${options
      .map((item) => `$${latexOf(item)}$`)
      .sort()
      .join(", ")}?`,
    answer: {
      kind: "choice",
      correct: `$${latexOf(model.correct)}$`,
      wrong: model.traps.map((t) => ({ error: t.error, value: `$${latexOf(t.item)}$` })),
    },
    steps: [
      {
        text: negative
          ? "**Passo 1.** Sono tutti negativi: il maggiore è quello più vicino allo $0$, cioè quello che senza il segno è il più piccolo."
          : "**Passo 1.** Si confronta il candidato maggiore con ciascuno degli altri: i decimali cifra per cifra, le frazioni in croce, le radici con i quadrati.",
      },
      ...model.traps.map((t, i) => ({ text: `**Passo ${i + 2}.** ${whySmaller(t, model.correct)}.` })),
      { text: `**Passo ${model.traps.length + 2}.** Il maggiore è $${latexOf(model.correct)}$.` },
    ],
    hints: [
      negative ? "Con i negativi l'ordine si rovescia: è maggiore quello più vicino allo $0$." : "Più cifre dopo la virgola non vuol dire un numero più grande, e un numeratore grande non basta.",
      "Per confrontare una radice con un numero positivo confronta i quadrati; per una frazione e un decimale, scrivi il decimale come frazione e moltiplica in croce.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (answer.kind !== "choice") return false;
  const others = model.traps.map((t) => t.item);
  // Il maggiore batte tutti gli altri nel confronto esatto, e il testo li mostra tutti.
  return others.every((item) => compare(model.correct, item) > 0) && [model.correct, ...others].every((item) => exercise.prompt.includes(`$${latexOf(item)}$`)) && answer.correct === `$${latexOf(model.correct)}$`;
}

export default defineGenerator({
  code: "V1.M02.A08.g1",
  skill: "V1.M02.A08",
  lesson: "V1.M02.L07",
  title: "Confrontare numeri reali",
  levels: [1, 2, 3],
  errors: [COMPARE, SIGN],
  limits: { maxInteger: 1000, maxDenominator: 1000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
