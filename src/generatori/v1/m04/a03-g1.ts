// V1.M04.A03.g1 — Prodotti notevoli: somma per differenza, quadrato e cubo di un binomio.
//
// Risposta: un'espressione, lo sviluppo ridotto (vincolo `expanded`). All'indietro: si scelgono i due
// monomi A e B (con il loro coefficiente e il loro segno) e il prodotto notevole; a livello 3 due
// prodotti notevoli con un segno in mezzo. Il risultato si calcola moltiplicando davvero i polinomi.
//
// Le risposte sbagliate applicano la formula con UN errore:
// - ALG.QUADRATO_BINOMIO: (A + B)² = A² + B² e (A + B)³ = A³ + B³ (mancano i termini misti);
// - CALC.REGOLA_SEGNI: nel quadrato di una differenza B² preso negativo; nella somma per differenza
//   A² + B², oppure −AB + BA preso come −2AB; nel cubo di una differenza tutti i termini con B negativi;
// - CALC.PROPRIETA_POTENZE: il coefficiente di A (o di B) non elevato: (3x)² = 3x²;
// - CALC.MENO_PARENTESI (livello 3): il meno davanti al secondo prodotto cambia segno solo al primo termine.
//
// Livello 1: (px + q)², (px + q)(px − q) con una sola lettera e numeri piccoli.
// Livello 2: due lettere ((3x + 2y)², (2x − y)(2x + y)), x² al posto di x, cubi.
// Livello 3: due prodotti notevoli con un segno in mezzo ((x + 2y)² − (x − 2y)²), cubi con x² e y,
//   quadrati di binomi con monomi di più lettere.
//
// Verifica: l'espressione del testo si ricostruisce con il motore (potenze e prodotti) e si confronta
// per equivalenza con la risposta.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, pow, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { mono, monoExpr, monoMul, monoPow, polyAdd, polyEq, polyExpr, polyMul, polyNeg, polyPow, reduce, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const SQUARE: ErrorCode = "ALG.QUADRATO_BINOMIO";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const POWERS: ErrorCode = "CALC.PROPRIETA_POTENZE";
const MINUS: ErrorCode = "CALC.MENO_PARENTESI";

type Kind = "square" | "sumDiff" | "cube";

/** Un prodotto notevole con il segno con cui entra nell'espressione. A e B sono i due termini del binomio. */
interface Term {
  readonly sign: 1 | -1;
  readonly kind: Kind;
  readonly A: Mono;
  readonly B: Mono;
}

interface Model {
  readonly terms: readonly Term[];
}

// ───────────────────────────── conti giusti e sbagliati ─────────────────────────────

const binomial = (t: Term): Poly => [t.A, t.B];
const opposite = (m: Mono): Mono => ({ ...m, c: m.c.neg() });
const times = (k: number, m: Mono): Mono => ({ ...m, c: m.c.mul(k) });

/** Lo sviluppo giusto, calcolato moltiplicando i polinomi. */
function expansion(t: Term): Poly {
  switch (t.kind) {
    case "square":
      return polyPow(binomial(t), 2);
    case "sumDiff":
      return polyMul(binomial(t), [t.A, opposite(t.B)]);
    case "cube":
      return polyPow(binomial(t), 3);
  }
}

/** Gli sviluppi sbagliati, ognuno con il suo errore. */
function wrongExpansions(t: Term): { error: ErrorCode; value: Poly }[] {
  const { A, B } = t;
  const out: { error: ErrorCode; value: Poly }[] = [];
  // Il coefficiente non elevato: (3x)² = 3x², (2x)³ = 2x³.
  const unraised = (m: Mono, k: number): Mono => ({ c: m.c, x: m.x * k, y: m.y * k });
  const hasCoef = (m: Mono): boolean => !m.c.abs().eq(1) && m.x + m.y > 0;
  switch (t.kind) {
    case "square": {
      const [A2, AB2, B2] = [monoPow(A, 2), times(2, monoMul(A, B)), monoPow(B, 2)];
      out.push({ error: SQUARE, value: reduce([A2, B2]) });
      if (B.c.sign() < 0 || A.c.sign() < 0) out.push({ error: SIGNS, value: reduce([A2, AB2, opposite(B2)]) });
      if (hasCoef(A)) out.push({ error: POWERS, value: reduce([unraised(A, 2), AB2, B2]) });
      if (hasCoef(B)) out.push({ error: POWERS, value: reduce([A2, AB2, unraised(B, 2)]) });
      return out;
    }
    case "sumDiff": {
      const [A2, B2] = [monoPow(A, 2), monoPow(B, 2)];
      out.push({ error: SIGNS, value: reduce([A2, B2]) });
      out.push({ error: SIGNS, value: reduce([A2, times(-2, monoMul(A, B)), opposite(B2)]) });
      if (hasCoef(A)) out.push({ error: POWERS, value: reduce([unraised(A, 2), opposite(B2)]) });
      if (hasCoef(B)) out.push({ error: POWERS, value: reduce([A2, opposite(unraised(B, 2))]) });
      return out;
    }
    case "cube": {
      const [A3, A2B, AB2, B3] = [monoPow(A, 3), times(3, monoMul(monoPow(A, 2), B)), times(3, monoMul(A, monoPow(B, 2))), monoPow(B, 3)];
      out.push({ error: SQUARE, value: reduce([A3, B3]) });
      // Nel cubo di una differenza il segno meno messo davanti a ogni termine con B, anche a 3AB², che è positivo.
      if (B.c.sign() < 0) out.push({ error: SIGNS, value: reduce([A3, A2B, opposite(AB2), B3]) });
      if (hasCoef(A)) out.push({ error: POWERS, value: reduce([unraised(A, 3), A2B, AB2, B3]) });
      if (hasCoef(B)) out.push({ error: POWERS, value: reduce([A3, A2B, AB2, unraised(B, 3)]) });
      return out;
    }
  }
}

const signed = (sign: 1 | -1, p: Poly): Poly => (sign === 1 ? p : polyNeg(p));
const valueOf = (t: Term): Poly => signed(t.sign, expansion(t));

function wrongValues(t: Term): { error: ErrorCode; value: Poly }[] {
  const out = wrongExpansions(t).map((w) => ({ error: w.error, value: signed(t.sign, w.value) }));
  // Il meno davanti al prodotto notevole cambia segno solo al primo termine dello sviluppo.
  if (t.sign === -1) out.push({ error: MINUS, value: reduce(expansion(t).map((m, k) => (k === 0 ? opposite(m) : m))) });
  return out;
}

const total = (terms: readonly Term[], replace?: { index: number; value: Poly }): Poly =>
  polyAdd(...terms.map((t, k) => (replace && replace.index === k ? replace.value : valueOf(t))));

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const nz = (rng: Rng_, max: number): number => rng.intExcept(-max, max);
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** Due coefficienti p > 0 e q ≠ 0 primi tra loro: niente fattore comune nel binomio. */
function coprimePair(rng: Rng_, maxP: number, maxQ: number, positiveQ = false): [number, number] {
  for (;;) {
    const p = rng.int(1, maxP);
    const q = positiveQ ? rng.int(1, maxQ) : nz(rng, maxQ);
    if (gcd(p, q) === 1) return [p, q];
  }
}

function buildLevel1(rng: Rng_): Model {
  const kind = rng.pick(["square", "square", "square", "sumDiff", "sumDiff"] as const);
  const p = rng.pick([1, 1, 2, 3, 4, 5]);
  for (;;) {
    // Con p = 1 e B positivo il quadrato avrebbe un solo errore possibile: il binomio è allora una differenza.
    const q = kind === "square" && p === 1 ? -rng.int(1, 10) : kind === "sumDiff" ? rng.int(1, 10) : nz(rng, 9);
    if (gcd(p, q) !== 1) continue;
    // A volte il numero viene prima: (3 − 2x)², (5 + x)(5 − x).
    if (q > 0 && rng.bool(0.3)) return { terms: [{ sign: 1, kind, A: mono(q), B: mono(kind === "square" ? -p : p, 1) }] };
    return { terms: [{ sign: 1, kind, A: mono(p, 1), B: mono(q) }] };
  }
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["squareXY", "squareXY", "squareXY", "sumDiffXY", "sumDiffXY", "squareX2", "squareX2", "sumDiffX2", "sumDiffX2", "cubeX"] as const);
  switch (shape) {
    case "squareXY": {
      const [p, q] = coprimePair(rng, 5, 5);
      return { terms: [{ sign: 1, kind: "square", A: mono(p, 1), B: mono(q, 0, 1) }] };
    }
    case "sumDiffXY": {
      const [p, q] = coprimePair(rng, 6, 5, true);
      return { terms: [{ sign: 1, kind: "sumDiff", A: mono(p, 1), B: mono(q, 0, 1) }] };
    }
    case "squareX2":
      return { terms: [{ sign: 1, kind: "square", A: mono(rng.int(1, 3), 2), B: mono(nz(rng, 6), 0, rng.int(0, 1)) }] };
    case "sumDiffX2":
      return { terms: [{ sign: 1, kind: "sumDiff", A: mono(rng.int(1, 4), 2), B: mono(rng.int(1, 7)) }] };
    case "cubeX": {
      // Cubo di una differenza (così ci sono tre errori possibili), coefficienti entro 100: (2x − 1)³, (3x − 2y)³…
      const [p, q, letter] = rng.pick([[2, 1, 0], [2, 3, 0], [3, 1, 0], [1, 2, 1], [1, 3, 1], [2, 1, 1], [2, 3, 1], [3, 1, 1], [3, 2, 1]] as const);
      return { terms: [{ sign: 1, kind: "cube", A: mono(p, 1), B: mono(-q, 0, letter) }] };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["twoSquares", "twoSquares", "squareMinusSumDiff", "squareMinusSumDiff", "cubeXY", "squareMonomials"] as const);
  switch (shape) {
    case "twoSquares": {
      // (A + B)² ± (A − B)², con A = px, B = q y.
      const [p, q] = coprimePair(rng, 4, 5, true);
      const [A, B] = [mono(p, 1), mono(q, 0, 1)];
      return { terms: [{ sign: 1, kind: "square", A, B }, { sign: rng.sign(), kind: "square", A, B: opposite(B) }] };
    }
    case "squareMinusSumDiff": {
      // (A + B)² − (A + B)(A − B)
      const [p, q] = coprimePair(rng, 4, 4);
      const [A, B] = [mono(p, 1), mono(q, 0, 1)];
      return { terms: [{ sign: 1, kind: "square", A, B }, { sign: -1, kind: "sumDiff", A, B: mono(rng.int(1, 4), 0, 1) }] };
    }
    case "cubeXY": {
      // (p x² + q y)³: coefficienti entro 100 e tre errori possibili.
      const [p, q] = rng.pick([[1, -2], [1, -3], [2, -1], [2, -3], [3, -1], [3, -2], [2, 3], [3, 2]] as const);
      return { terms: [{ sign: 1, kind: "cube", A: mono(p, 2), B: mono(q, 0, 1) }] };
    }
    case "squareMonomials":
      // (p x² + q xy)²: monomi con più lettere.
      return { terms: [{ sign: 1, kind: "square", A: mono(rng.int(1, 3), 2), B: mono(nz(rng, 3), 1, 1) }] };
  }
}

function distinctWrongCount(model: Model): number {
  const result = total(model.terms);
  const wrongs = model.terms.flatMap((t, index) => wrongValues(t).map((w) => total(model.terms, { index, value: w.value })));
  return wrongs.filter((p, k) => !polyEq(p, result) && wrongs.findIndex((q) => polyEq(q, p)) === k).length;
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    if (total(model.terms).length >= 1 && distinctWrongCount(model) >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

const B$ = (t: Term): string => toLatex(polyExpr(binomial(t)));

function termBody(t: Term): string {
  switch (t.kind) {
    case "square":
      return `\\left(${B$(t)}\\right)^{2}`;
    case "sumDiff":
      return `\\left(${B$(t)}\\right)\\left(${toLatex(polyExpr([t.A, opposite(t.B)]))}\\right)`;
    case "cube":
      return `\\left(${B$(t)}\\right)^{3}`;
  }
}

const promptLatex = (model: Model): string => model.terms.map((t, k) => (k === 0 ? (t.sign === 1 ? "" : "-") : t.sign === 1 ? " + " : " - ") + termBody(t)).join("");

function termExpr(t: Term): Expr {
  const b = polyExpr(binomial(t));
  switch (t.kind) {
    case "square":
      return pow(b, 2);
    case "sumDiff":
      return mul(b, polyExpr([t.A, opposite(t.B)]));
    case "cube":
      return pow(b, 3);
  }
}
const promptExpr = (model: Model): Expr => add(...model.terms.map((t) => (t.sign === 1 ? termExpr(t) : neg(termExpr(t)))));

/** Un monomio tra parentesi se ha un coefficiente o un segno (serve a scrivere A², 2AB…). */
const paren = (m: Mono): string => {
  const latex = toLatex(monoExpr(m));
  const plain = m.c.sign() > 0 && (m.x + m.y === 0 || (m.c.eq(1) && m.x + m.y === 1));
  return plain ? latex : `\\left(${latex}\\right)`;
};

function termStep(t: Term): string {
  const result = toLatex(polyExpr(expansion(t)));
  const [a, b] = [paren(t.A), paren(t.B)];
  const AB = `$A = ${toLatex(monoExpr(t.A))}$ e $B = ${toLatex(monoExpr(t.B))}$`;
  switch (t.kind) {
    case "square":
      return `È il quadrato di un binomio, con ${AB}: $A^{2} + 2AB + B^{2}$. $$${a}^{2} + 2 \\cdot ${a} \\cdot ${b} + ${b}^{2} = ${result}$$`;
    case "sumDiff":
      return `È una somma per differenza, con ${AB}: i termini di mezzo si annullano e resta $A^{2} - B^{2}$. $$${a}^{2} - ${b}^{2} = ${result}$$`;
    case "cube":
      return `È il cubo di un binomio, con ${AB}: $A^{3} + 3A^{2}B + 3AB^{2} + B^{3}$ (coefficienti $1, 3, 3, 1$). $$${a}^{3} + 3 \\cdot ${a}^{2} \\cdot ${b} + 3 \\cdot ${a} \\cdot ${b}^{2} + ${b}^{3}$$ $$= ${result}$$`;
  }
}

const KIND_HINT: Readonly<Record<Kind, string>> = {
  square: "Il quadrato di un binomio ha tre termini: $A^{2}$, il doppio prodotto $2AB$ e $B^{2}$. Se $B$ è negativo, il doppio prodotto è negativo ma $B^{2}$ resta positivo.",
  sumDiff: "Somma per differenza: $(A + B)(A - B) = A^{2} - B^{2}$. Eleva al quadrato tutto il monomio, coefficiente compreso.",
  cube: "Il cubo ha quattro termini con coefficienti $1, 3, 3, 1$: $A^{3} + 3A^{2}B + 3AB^{2} + B^{3}$. Con $B$ negativo i segni si alternano.",
};

function draftOf(model: Model): ExerciseDraft {
  const result = total(model.terms);
  const correct = polyExpr(result);
  const candidates: WrongCandidate<Expr>[] = model.terms.flatMap((t, index) =>
    wrongValues(t).map((wrong) => ({ error: wrong.error, value: polyExpr(total(model.terms, { index, value: wrong.value })) })),
  );
  const steps = model.terms.map((t) => ({ text: termStep(t) }));
  if (model.terms.length > 1) {
    const [first, second] = model.terms as [Term, Term];
    const s = toLatex(polyExpr(expansion(second)));
    const minus = second.sign === -1 ? `Il meno davanti al secondo prodotto cambia il segno di ogni termine del suo sviluppo, poi si riduce.` : `Si sommano i due sviluppi e si riducono i termini simili.`;
    steps.push({ text: `${minus} $$\\left(${toLatex(polyExpr(expansion(first)))}\\right) ${second.sign === -1 ? "-" : "+"} \\left(${s}\\right) = ${toLatex(correct)}$$` });
  }
  const kinds = model.terms.map((t) => t.kind);
  return {
    prompt: `Sviluppa con i prodotti notevoli e riduci: $${promptLatex(model)}$.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, candidates), form: ["expanded"] },
    steps,
    hints: [
      model.terms.length > 1
        ? "Riconosci i due prodotti notevoli e sviluppali uno alla volta, tenendo ogni sviluppo tra parentesi; poi somma o sottrai."
        : "Quale prodotto notevole è: una somma per differenza, un quadrato o un cubo di binomio? Chi sono $A$ e $B$, con il loro segno?",
      KIND_HINT[kinds[0] as Kind],
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A03.g1",
  skill: "V1.M04.A03",
  lesson: "V1.M04.L03",
  title: "Prodotti notevoli",
  levels: [1, 2, 3],
  errors: [SQUARE, SIGNS, POWERS, MINUS],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: l'espressione del testo, costruita con il motore, è equivalente alla risposta.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    return equivalent(promptExpr(model), answer.correct);
  },
});
