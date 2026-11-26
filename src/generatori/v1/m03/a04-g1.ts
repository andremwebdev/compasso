// V1.M03.A04.g1 — Proprietà delle potenze, esponente zero e negativo.
//
// Risposta: un numero (intero o frazione), il valore dell'espressione. All'indietro: si sceglie la base
// b (2, 3, 5, oppure una frazione a livello 3) e i «pezzi»: ogni pezzo è una potenza c^m, eventualmente
// elevata ancora a n, con c = b^k scritto come numero (4 = 2², 27 = 3³) e posto al numeratore o al
// denominatore. L'esponente finale E = Σ ± k·m·n è piccolo, così il valore b^E è pulito. Le risposte
// sbagliate rifanno il conto degli esponenti con UN errore:
// - CALC.PROPRIETA_POTENZE: nella potenza di una potenza (anche nascosta: 4³ = (2²)³) gli esponenti
//   sommati invece che moltiplicati; nel prodotto con la stessa base gli esponenti moltiplicati invece
//   che sommati; nel quoziente gli esponenti del denominatore sommati invece che sottratti; con basi
//   diverse e lo stesso esponente, 2ⁿ · 3ⁿ preso come 6^(2n);
// - CALC.ESPONENTE_NEGATIVO: b^(−n) preso come −bⁿ nel valore finale.
//
// Livello 1: tre potenze della stessa base (2, 3, 5), in un prodotto e un quoziente, oppure una potenza
//   di una potenza per una potenza; esponenti interi anche negativi o nulli.
// Livello 2: come il primo esempio della lezione: basi da riportare alla stessa (4, 8, 9, 27, 25),
//   frazione con potenze al numeratore e al denominatore.
// Livello 3: base frazionaria con esponenti negativi (la frazione si capovolge), oppure basi diverse con
//   lo stesso esponente (6⁴ : (2³ · 3³)), come nel secondo esempio della lezione.
//
// Verifica: l'espressione del testo si ricostruisce con le potenze del motore e si semplifica con i
// razionali esatti; il valore deve coincidere con la risposta.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { simplify } from "../../../motore/algebra/simplify";
import { div, frac, mul, num, pow, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const PROPERTIES = "CALC.PROPRIETA_POTENZE";
const NEGATIVE = "CALC.ESPONENTE_NEGATIVO";

/** Un pezzo: (c^m)^n con c = base^k; `den` se sta al denominatore. n = 1 vuol dire «nessuna potenza esterna». */
interface Piece {
  readonly k: number;
  readonly m: number;
  readonly n: number;
  readonly den: boolean;
}

type Model =
  /** Una sola base (intera o frazione p/q > 0, mai 1), pezzi in un prodotto o in una frazione. */
  | { readonly kind: "sameBase"; readonly p: number; readonly q: number; readonly pieces: readonly Piece[]; readonly layout: "chain" | "fraction" }
  /** Basi diverse con lo stesso esponente: (a·b)^m : (a^n · b^n). */
  | { readonly kind: "twoBases"; readonly a: number; readonly b: number; readonly m: number; readonly n: number };

/** Tipo di errore sul conto degli esponenti. */
type Fault =
  | { readonly kind: "convert"; readonly at: number }
  | { readonly kind: "nested"; readonly at: number }
  | { readonly kind: "productMultiplied" }
  | { readonly kind: "quotientAdded" }
  | { readonly kind: "negative" };

// ───────────────────────────── conti ─────────────────────────────

const baseOf = (model: Extract<Model, { kind: "sameBase" }>): Rational => Rational.of(model.p, model.q);

/** L'esponente finale, con l'errore indicato (null se non si può fare o non cambia niente). */
function exponentOf(model: Extract<Model, { kind: "sameBase" }>, fault?: Fault): number | null {
  let total = 0;
  let changed = fault === undefined;
  const num = model.pieces.filter((p) => !p.den);
  model.pieces.forEach((piece, i) => {
    let km = piece.k * piece.m;
    if (fault?.kind === "convert" && fault.at === i && piece.k > 1 && piece.k + piece.m !== km) {
      km = piece.k + piece.m;
      changed = true;
    }
    let e = km * piece.n;
    if (fault?.kind === "nested" && fault.at === i && piece.n !== 1 && km + piece.n !== e) {
      e = km + piece.n;
      changed = true;
    }
    total += piece.den && fault?.kind !== "quotientAdded" ? -e : e;
    if (piece.den && fault?.kind === "quotientAdded" && e !== 0) changed = true;
  });
  if (fault?.kind === "productMultiplied") {
    // Nel prodotto dei pezzi al numeratore (almeno due, esponenti non 0 e non 1) gli esponenti si moltiplicano.
    const exps = num.map((p) => p.k * p.m * p.n);
    if (exps.length < 2 || exps.some((e) => e === 0)) return null;
    const product = exps.reduce((a, b) => a * b, 1);
    const sum = exps.reduce((a, b) => a + b, 0);
    if (product === sum) return null;
    return total - sum + product;
  }
  return changed ? total : null;
}

/** Il valore di b^E, con il meno davanti se l'errore è «esponente negativo preso come opposto». */
function valueWith(model: Model, fault?: Fault): Rational | null {
  if (model.kind === "twoBases") {
    // (ab)^m : (a^n b^n) = (ab)^(m − n); errori: esponenti sommati nel quoziente, a^n·b^n = (ab)^(2n).
    const c = Rational.of(model.a * model.b);
    if (fault === undefined) return c.pow(model.m - model.n);
    if (fault.kind === "quotientAdded") return c.pow(model.m + model.n);
    if (fault.kind === "productMultiplied") return c.pow(model.m - 2 * model.n);
    if (fault.kind === "negative" && model.m - model.n < 0) return c.pow(model.n - model.m).neg();
    return null;
  }
  if (fault?.kind === "negative") {
    const e = exponentOf(model);
    return e !== null && e < 0 ? baseOf(model).pow(-e).neg() : null;
  }
  const e = exponentOf(model, fault);
  return e === null ? null : baseOf(model).pow(e);
}

const allFaults = (model: Model): { error: ErrorCode; fault: Fault }[] => {
  const pieces = model.kind === "sameBase" ? model.pieces : [];
  return [
    ...pieces.map((_, at) => ({ error: PROPERTIES, fault: { kind: "nested", at } as Fault })),
    ...pieces.map((_, at) => ({ error: PROPERTIES, fault: { kind: "convert", at } as Fault })),
    { error: PROPERTIES, fault: { kind: "quotientAdded" } },
    { error: PROPERTIES, fault: { kind: "productMultiplied" } },
    { error: NEGATIVE, fault: { kind: "negative" } },
  ];
};

/** Valore «pulito»: numeratore e denominatore entro il limite. */
const tidy = (r: Rational, max = 1000): boolean => Number(r.n < 0n ? -r.n : r.n) <= max && Number(r.d) <= max;

function wrongValues(model: Model): { error: ErrorCode; value: Rational }[] {
  const correct = valueWith(model);
  const out: { error: ErrorCode; value: Rational }[] = [];
  if (correct === null) return out;
  // Prima l'esponente negativo (se c'è), poi le proprietà.
  const faults = allFaults(model);
  for (const { error, fault } of [...faults.filter((f) => f.error === NEGATIVE), ...faults.filter((f) => f.error !== NEGATIVE)]) {
    const v = valueWith(model, fault);
    if (v === null || v.eq(correct) || !tidy(v) || out.some((w) => w.value.eq(v))) continue;
    out.push({ error, value: v });
  }
  return out.slice(0, 4);
}

// ───────────────────────────── costruzione ─────────────────────────────

const PRIMES = [2, 3, 5] as const;
/** Massimo k tale che base^k resti un numero comodo da scrivere. */
const maxK = (b: number): number => (b === 2 ? 3 : 2);

function buildLevel1(rng: Rng_): Model {
  const b = rng.pick(PRIMES);
  const exp = (): number => rng.intExcept(-4, 6, [1]);
  if (rng.bool(0.6)) {
    // b^m · b^n : b^j
    return { kind: "sameBase", p: b, q: 1, layout: "chain", pieces: [{ k: 1, m: exp(), n: 1, den: false }, { k: 1, m: exp(), n: 1, den: false }, { k: 1, m: exp(), n: 1, den: true }] };
  }
  // (b^m)^n · b^j
  return { kind: "sameBase", p: b, q: 1, layout: "chain", pieces: [{ k: 1, m: rng.intExcept(-3, 4, [0, 1]), n: rng.intExcept(-2, 3, [0, 1]), den: false }, { k: 1, m: exp(), n: 1, den: false }] };
}

function buildLevel2(rng: Rng_): Model {
  const b = rng.pick(PRIMES);
  const piece = (den: boolean, allowK1: boolean): Piece => ({ k: rng.int(allowK1 ? 1 : 2, maxK(b)), m: rng.intExcept(-5, 5, [0, 1]), n: 1, den });
  const withNested = rng.bool(0.4);
  const pieces: Piece[] = [piece(false, false), piece(false, true), piece(true, false)];
  if (withNested) {
    const first = pieces[0];
    if (first) pieces[0] = { ...first, m: rng.intExcept(-3, 3, [0, 1]), n: rng.intExcept(-2, 3, [0, 1]) };
  }
  return { kind: "sameBase", p: b, q: 1, layout: "fraction", pieces };
}

function buildLevel3(rng: Rng_): Model {
  if (rng.bool(0.55)) {
    // Base frazionaria: (p/q)^m · (q/p)^n : (p/q)^j, con k = ±1 (k = −1 è la frazione capovolta).
    const [p, q] = rng.pick([[2, 3], [3, 2], [1, 2], [2, 5], [3, 4], [5, 2], [4, 3], [1, 3]] as const);
    const pieces: Piece[] = [
      { k: 1, m: rng.intExcept(-4, 4, [0, 1]), n: 1, den: false },
      { k: -1, m: rng.intExcept(-4, 4, [0, 1, -1]), n: 1, den: false },
      { k: 1, m: rng.intExcept(-3, 3, [0, 1]), n: rng.intExcept(-2, 2, [0, 1]), den: true },
    ];
    return { kind: "sameBase", p, q, layout: "chain", pieces };
  }
  // Basi diverse, stesso esponente: (a·b)^m : (a^n · b^n).
  const [a, b] = rng.pick([[2, 3], [2, 5], [3, 5], [2, 7]] as const);
  return { kind: "twoBases", a, b, m: rng.intExcept(-2, 6, [0, 1]), n: rng.intExcept(-3, 6, [0, 1]) };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const v = valueWith(model);
    if (v === null || !tidy(v, level === 1 ? 200 : 500) || v.eq(1)) continue;
    // Numeri scritti comodi: nessuna base scritta oltre 27 e nessun esponente esterno banale.
    if (model.kind === "sameBase" && model.pieces.some((p) => p.k > 1 && model.p ** p.k > 27)) continue;
    if (model.kind === "twoBases" && model.m === model.n) continue;
    // Pezzi tutti diversi: due pezzi uguali al numeratore e al denominatore si annullerebbero senza conti.
    if (model.kind === "sameBase" && new Set(model.pieces.map((p) => `${p.k},${p.m},${p.n}`)).size < model.pieces.length) continue;
    if (wrongValues(model).length >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** La base scritta di un pezzo: base^k come numero o frazione. */
function writtenBase(model: Extract<Model, { kind: "sameBase" }>, k: number): Rational {
  return baseOf(model).pow(k);
}

function ratLatex(r: Rational): string {
  const p = Number(r.n);
  const q = Number(r.d);
  const body = q === 1 ? String(Math.abs(p)) : `\\dfrac{${Math.abs(p)}}{${q}}`;
  return p < 0 ? `-${body}` : body;
}

/** c^m con c scritto (tra parentesi se è una frazione). */
function powLatex(c: Rational, m: number): string {
  const base = c.isInteger() ? ratLatex(c) : `\\left(${ratLatex(c)}\\right)`;
  return `${base}^{${m}}`;
}

function pieceLatex(model: Extract<Model, { kind: "sameBase" }>, piece: Piece): string {
  const inner = powLatex(writtenBase(model, piece.k), piece.m);
  return piece.n === 1 ? inner : `\\left(${inner}\\right)^{${piece.n}}`;
}

function expressionLatex(model: Model): string {
  if (model.kind === "twoBases") {
    return `${model.a * model.b}^{${model.m}} : \\left(${model.a}^{${model.n}} \\cdot ${model.b}^{${model.n}}\\right)`;
  }
  const top = model.pieces.filter((p) => !p.den).map((p) => pieceLatex(model, p));
  const bottom = model.pieces.filter((p) => p.den).map((p) => pieceLatex(model, p));
  if (model.layout === "fraction") return `\\dfrac{${top.join(" \\cdot ")}}{${bottom.join(" \\cdot ")}}`;
  return `${top.join(" \\cdot ")}${bottom.map((b) => ` : ${b}`).join("")}`;
}

/** b^e scritto con la base del modello. */
const baseLatex = (model: Extract<Model, { kind: "sameBase" }>, e: number): string => powLatex(baseOf(model), e);
const signed = (e: number): string => (e < 0 ? `\\left(${e}\\right)` : String(e));

function stepsSameBase(model: Extract<Model, { kind: "sameBase" }>): string[] {
  const steps: string[] = [];
  const b = baseOf(model);
  const conversions = model.pieces
    .filter((p) => p.k !== 1)
    .map((p) => {
      const c = writtenBase(model, p.k);
      const km = p.k * p.m;
      const how = p.k === -1 ? `la frazione capovolta è la base con esponente $-1$, quindi $${powLatex(c, p.m)} = ${powLatex(b, -p.m)}$` : `$${powLatex(c, p.m)} = \\left(${powLatex(b, p.k)}\\right)^{${p.m}} = ${powLatex(b, km)}$`;
      return how;
    });
  steps.push(
    conversions.length === 0
      ? `**Passo 1. Stessa base.** Tutte le potenze hanno già la base $${ratLatex(b)}$.`
      : `**Passo 1. Stessa base.** Scrivi tutto in base $${ratLatex(b)}$${model.pieces.some((p) => p.k > 1) ? " (potenza di una potenza: gli esponenti si moltiplicano)" : ""}: ${conversions.join("; ")}.`,
  );
  const nested = model.pieces.filter((p) => p.n !== 1);
  const parts: string[] = [];
  for (const p of nested) {
    const km = p.k * p.m;
    parts.push(`potenza di una potenza, gli esponenti si moltiplicano: $\\left(${baseLatex(model, km)}\\right)^{${p.n}} = ${baseLatex(model, km * p.n)}$`);
  }
  const exps = model.pieces.map((p) => p.k * p.m * p.n);
  const top = model.pieces.map((p, i) => [p, exps[i] ?? 0] as const).filter(([p]) => !p.den).map(([, e]) => e);
  const bottom = model.pieces.map((p, i) => [p, exps[i] ?? 0] as const).filter(([p]) => p.den).map(([, e]) => e);
  const topSum = top.reduce((a, c) => a + c, 0);
  const E = exponentOf(model) ?? 0;
  if (top.length > 1) parts.push(`prodotto con la stessa base, gli esponenti si sommano: $${top.map((e, i) => (i === 0 ? String(e) : signed(e))).join(" + ")} = ${topSum}$`);
  if (bottom.length > 0) parts.push(`quoziente, si sottrae l'esponente del divisore: $${topSum} - ${signed(bottom[0] ?? 0)} = ${E}$`);
  steps.push(`**Passo 2. Proprietà.** ${parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(". ")}. Resta $${baseLatex(model, E)}$.`);
  const value = b.pow(E);
  steps.push(
    E < 0
      ? `**Passo 3. Valore.** L'esponente negativo indica il reciproco: $${baseLatex(model, E)} = ${E === -1 ? "" : `${powLatex(b.inv(), -E)} = `}${ratLatex(value)}$.`
      : `**Passo 3. Valore.** $${baseLatex(model, E)} = ${ratLatex(value)}$.`,
  );
  return steps;
}

function stepsTwoBases(model: Extract<Model, { kind: "twoBases" }>): string[] {
  const c = model.a * model.b;
  const e = model.m - model.n;
  const value = Rational.of(c).pow(e);
  return [
    `**Passo 1. Stessa base.** Le basi $${model.a}$ e $${model.b}$ hanno lo stesso esponente: per la potenza di un prodotto, $${model.a}^{${model.n}} \\cdot ${model.b}^{${model.n}} = (${model.a} \\cdot ${model.b})^{${model.n}} = ${c}^{${model.n}}$.`,
    `**Passo 2. Proprietà.** Quoziente con la stessa base: $${c}^{${model.m}} : ${c}^{${model.n}} = ${c}^{${model.m} - ${signed(model.n)}} = ${c}^{${e}}$.`,
    e < 0
      ? `**Passo 3. Valore.** L'esponente negativo indica il reciproco: $${c}^{${e}} = \\dfrac{1}{${c}^{${-e}}} = ${ratLatex(value)}$.`
      : `**Passo 3. Valore.** $${c}^{${e}} = ${ratLatex(value)}$.`,
  ];
}

const answerExpr = (r: Rational): Expr => frac(r.n, r.d);

function draftOf(model: Model): ExerciseDraft {
  const correct = valueWith(model) ?? Rational.of(1);
  return {
    prompt: `Usa le proprietà delle potenze per calcolare il valore di $${expressionLatex(model)}$. Scrivi il risultato come numero intero o frazione.`,
    answer: {
      kind: "number",
      correct: answerExpr(correct),
      wrong: distinctWrongExpressions(
        answerExpr(correct),
        wrongValues(model).map((w) => ({ error: w.error, value: answerExpr(w.value) })),
      ),
      mode: exact,
    },
    steps: (model.kind === "sameBase" ? stepsSameBase(model) : stepsTwoBases(model)).map((text) => ({ text })),
    hints: [
      "Porta tutte le potenze alla stessa base (per esempio $4 = 2^2$, $\\dfrac{3}{2} = \\left(\\dfrac{2}{3}\\right)^{-1}$), poi lavora solo sugli esponenti.",
      "Nel prodotto gli esponenti si sommano, nel quoziente si sottraggono, nella potenza di una potenza si moltiplicano. Un esponente negativo indica il reciproco, non un numero negativo.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function toExpr(model: Model): Expr {
  if (model.kind === "twoBases") {
    return div(pow(num(model.a * model.b), num(model.m)), mul(pow(num(model.a), num(model.n)), pow(num(model.b), num(model.n))));
  }
  const pieceExpr = (p: Piece): Expr => {
    const c = writtenBase(model, p.k);
    const inner = pow(c.isInteger() ? num(c) : frac(c.n, c.d), num(p.m));
    return p.n === 1 ? inner : pow(inner, num(p.n));
  };
  const top = model.pieces.filter((p) => !p.den).map(pieceExpr);
  const bottom = model.pieces.filter((p) => p.den).map(pieceExpr);
  let e: Expr = top.length === 1 && top[0] ? top[0] : mul(...top);
  for (const b of bottom) e = div(e, b);
  return e;
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const v = simplify(toExpr(model));
  if (v.kind !== "num") return false;
  if (!exercise.prompt.includes(expressionLatex(model))) return false;
  return exercise.answer.kind === "number" && exercise.answer.correct.kind === "num" && exercise.answer.correct.value.eq(v.value);
}

export default defineGenerator({
  code: "V1.M03.A04.g1",
  skill: "V1.M03.A04",
  lesson: "V1.M03.L04",
  title: "Proprietà delle potenze",
  levels: [1, 2, 3],
  errors: [PROPERTIES, NEGATIVE],
  limits: { maxInteger: 1000, maxDenominator: 1000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
