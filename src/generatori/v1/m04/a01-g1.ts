// V1.M04.A01.g1 — Operazioni con i monomi (prodotto, potenza, quoziente, somma di monomi simili).
//
// Risposta: un'espressione, il monomio in forma normale (vincolo `expanded`: niente prodotti o potenze
// da fare, termini simili sommati). All'indietro: si sceglie la parte letterale del risultato, xᴬyᴮ,
// e si costruiscono i «pezzi» (un prodotto di due monomi, una potenza, un quoziente, un monomio da solo)
// che danno tutti un monomio con quella parte letterale; il risultato è la somma dei pezzi con i loro segni.
//
// Le risposte sbagliate rifanno il conto con UN errore in UN pezzo:
// - CALC.PROPRIETA_POTENZE: nel prodotto gli esponenti della stessa lettera moltiplicati invece che
//   sommati; nella potenza gli esponenti sommati all'esponente esterno, oppure il coefficiente non
//   elevato; nel quoziente gli esponenti del divisore sommati invece che sottratti;
// - CALC.REGOLA_SEGNI: il segno del coefficiente sbagliato in un prodotto o in un quoziente con un
//   fattore negativo, o in una potenza dispari di un coefficiente negativo;
// - CALC.MENO_POTENZA: (−3x)² preso come −9x² (il segno non elevato con l'esponente pari).
//
// Livello 1: un solo pezzo (prodotto, potenza o quoziente), lettere x e y, coefficienti interi piccoli.
// Livello 2: due o tre pezzi da sommare, come l'esempio «Espressioni con i monomi» della lezione.
// Livello 3: tre pezzi con coefficienti frazionari (½, ⅓, ⅔) e due lettere, una potenza di un monomio
//   con coefficiente frazionario.
//
// Verifica: l'espressione del testo si ricostruisce con il motore (prodotti, potenze, divisioni) e si
// confronta per equivalenza con la risposta.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, div, mul, neg, pow, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { degree, mono, monoDiv, monoExpr, monoMul, monoPow, polyAdd, polyEq, polyExpr, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const POWERS: ErrorCode = "CALC.PROPRIETA_POTENZE";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const MINUS_POWER: ErrorCode = "CALC.MENO_POTENZA";

/** Un pezzo dell'espressione. */
type Piece =
  | { readonly kind: "product"; readonly a: Mono; readonly b: Mono }
  | { readonly kind: "power"; readonly base: Mono; readonly k: number }
  | { readonly kind: "quotient"; readonly a: Mono; readonly b: Mono }
  | { readonly kind: "single"; readonly m: Mono };

/** Un pezzo con il segno con cui entra nella somma. */
interface Term {
  readonly sign: 1 | -1;
  readonly piece: Piece;
}

interface Model {
  readonly terms: readonly Term[];
}

// ───────────────────────────── conti giusti e sbagliati ─────────────────────────────

/** Il valore giusto di un pezzo. */
function valueOf(piece: Piece): Mono {
  switch (piece.kind) {
    case "product":
      return monoMul(piece.a, piece.b);
    case "power":
      return monoPow(piece.base, piece.k);
    case "quotient":
      return monoDiv(piece.a, piece.b);
    case "single":
      return piece.m;
  }
}

const hasNegative = (...ms: Mono[]): boolean => ms.some((m) => m.c.sign() < 0);

/** Il valore di un pezzo rifatto con ciascun errore tipico che quel pezzo rende possibile. */
function wrongValues(piece: Piece): { error: ErrorCode; value: Mono }[] {
  const right = valueOf(piece);
  switch (piece.kind) {
    case "product": {
      const { a, b } = piece;
      // Esponenti della stessa lettera moltiplicati (se la lettera c'è in tutti e due i fattori).
      const times = (p: number, q: number): number => (p > 0 && q > 0 ? p * q : p + q);
      const out = [{ error: POWERS, value: { c: right.c, x: times(a.x, b.x), y: times(a.y, b.y) } }];
      if (hasNegative(a, b)) out.push({ error: SIGNS, value: { ...right, c: right.c.neg() } });
      return out;
    }
    case "power": {
      const { base, k } = piece;
      const out = [
        // (x²)³ = x⁵: esponenti sommati invece che moltiplicati.
        { error: POWERS, value: { c: right.c, x: base.x > 0 ? base.x + k : 0, y: base.y > 0 ? base.y + k : 0 } },
        // (3x²)² = 3x⁴: il coefficiente non elevato.
        { error: POWERS, value: { ...right, c: base.c } },
      ];
      if (base.c.sign() < 0 && k % 2 === 0) out.push({ error: MINUS_POWER, value: { ...right, c: right.c.neg() } });
      if (base.c.sign() < 0 && k % 2 === 1) out.push({ error: SIGNS, value: { ...right, c: right.c.neg() } });
      return out;
    }
    case "quotient": {
      const { a, b } = piece;
      const out = [{ error: POWERS, value: { c: right.c, x: a.x + b.x, y: a.y + b.y } }];
      if (hasNegative(a, b)) out.push({ error: SIGNS, value: { ...right, c: right.c.neg() } });
      return out;
    }
    case "single":
      return [];
  }
}

const signed = (sign: 1 | -1, m: Mono): Mono => (sign === 1 ? m : { ...m, c: m.c.neg() });
const total = (terms: readonly Term[], replace?: { index: number; value: Mono }): Poly =>
  polyAdd(terms.map((term, k) => signed(term.sign, replace && replace.index === k ? replace.value : valueOf(term.piece))));

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** Spezza l'esponente e in due parti, ognuna almeno `min`. */
function split(rng: Rng_, e: number, min = 0): [number, number] {
  const first = rng.int(min, e - min);
  return [first, e - first];
}

/** Coefficiente intero non nullo tra −max e max (anche ±1). */
const coef = (rng: Rng_, max: number): Rational => Rational.of(rng.intExcept(-max, max));

/**
 * Un prodotto che dà xᴬyᴮ (A ≥ 2): la x compare in tutti e due i fattori, con esponenti che moltiplicati
 * non danno la somma (2 e 2 no), così l'errore sugli esponenti è sempre possibile.
 */
function product(rng: Rng_, A: number, B: number, c1: Rational, c2: Rational): Piece {
  for (;;) {
    const [a1, a2] = split(rng, A, 1);
    const [b1, b2] = split(rng, B);
    if (a1 * a2 !== a1 + a2) return { kind: "product", a: mono(c1, a1, b1), b: mono(c2, a2, b2) };
  }
}

/** Un quoziente che dà c·xᴬyᴮ: il divisore ha almeno una lettera. */
function quotient(rng: Rng_, A: number, B: number, result: Rational, divisor: Rational): Piece {
  const dx = rng.int(B === 0 ? 1 : 0, 3);
  const dy = B === 0 ? 0 : rng.int(dx === 0 ? 1 : 0, 2);
  return { kind: "quotient", a: mono(result.mul(divisor), A + dx, B + dy), b: mono(divisor, dx, dy) };
}

function buildLevel1(rng: Rng_): Model {
  const shape = rng.pick(["product", "product", "power", "power", "quotient", "quotient"] as const);
  switch (shape) {
    case "product": {
      // Un fattore negativo, così l'errore di segno è possibile; esponenti non tutti uguali a 2.
      const A = rng.int(2, 6);
      const B = rng.int(0, 4);
      const negative = coef(rng, 6).abs().neg();
      const other = coef(rng, 6);
      const piece = rng.bool() ? product(rng, A, B, negative, other) : product(rng, A, B, other, negative);
      return { terms: [{ sign: 1, piece }] };
    }
    case "power": {
      const k = rng.pick([2, 2, 3] as const);
      // Coefficiente diverso da ±1 e, con il quadrato, esponente di x diverso da 2: (x²)² = x⁴ e x²⁺² = x⁴
      // coinciderebbero, e l'errore sugli esponenti non si vedrebbe.
      const max = k === 2 ? 5 : 3;
      const base = mono(Rational.of(rng.intExcept(-max, max, [0, 1, -1])), k === 2 ? rng.pick([1, 3, 4]) : rng.int(1, 4), rng.int(0, 2));
      return { terms: [{ sign: 1, piece: { kind: "power", base, k } }] };
    }
    case "quotient": {
      const A = rng.int(1, 4);
      const B = rng.int(0, 3);
      // Un coefficiente negativo (nel risultato o nel divisore), così l'errore di segno è possibile.
      const [result, divisor] = [coef(rng, 5), Rational.of(rng.intExcept(-6, 6, [0, 1, -1]))];
      const piece = quotient(rng, A, B, result, result.sign() > 0 && divisor.sign() > 0 ? divisor.neg() : divisor);
      return { terms: [{ sign: 1, piece }] };
    }
  }
}

/** Una somma di pezzi che danno tutti xᴬyᴮ (a livello 3 con coefficienti frazionari). */
function buildSum(rng: Rng_, level: 2 | 3): Model {
  const k = level === 3 ? rng.pick([2, 3] as const) : rng.pick([2, 3, 3] as const);
  // La parte letterale del risultato è una potenza k-esima, così c'è una potenza tra i pezzi.
  const p = rng.int(1, 2);
  const q = level === 2 ? rng.int(0, 1) : rng.int(1, 2);
  const [A, B] = [k * p, k * q];
  const fractions = [Rational.of(1, 2), Rational.of(1, 3), Rational.of(2, 3), Rational.of(3, 2)];
  const baseCoef = level === 3 && k === 2 ? rng.pick(fractions).mul(rng.sign()) : Rational.of(rng.intExcept(-3, 3, [0, 1]));
  const pieces: Piece[] = [{ kind: "power", base: mono(baseCoef, p, q), k }];
  pieces.push(product(rng, A, B, coef(rng, 4), level === 3 ? rng.pick(fractions).mul(rng.sign()) : coef(rng, 4)));
  const extra = level === 2 ? rng.pick(["single", "quotient", "none"] as const) : rng.pick(["quotient", "quotient", "single"] as const);
  if (extra === "single") pieces.push({ kind: "single", m: mono(coef(rng, 6), A, B) });
  if (extra === "quotient") pieces.push(quotient(rng, A, B, coef(rng, 4), level === 3 ? rng.pick(fractions) : Rational.of(rng.intExcept(-4, 4, [0, 1]))));
  const order = rng.shuffle(pieces);
  return { terms: order.map((piece, index) => ({ sign: index === 0 ? 1 : rng.sign(), piece })) };
}

/** Un coefficiente «pulito»: numeratore e denominatore entro i limiti dati. */
const cleanCoef = (c: Rational, maxNum: number, maxDen: number): boolean => c.n <= BigInt(maxNum) && -c.n <= BigInt(maxNum) && c.d <= BigInt(maxDen);

function buildModel(level: number, rng: Rng_): Model {
  if (level === 1) return buildLevel1(rng);
  // Si estrae di nuovo finché il risultato non è nullo e i numeri, anche delle risposte sbagliate, restano puliti.
  for (;;) {
    const model = buildSum(rng, level === 2 ? 2 : 3);
    const result = total(model.terms);
    const wrongs = model.terms.flatMap((term, index) => wrongValues(term.piece).map((wrong) => total(model.terms, { index, value: wrong.value })));
    const pieces = model.terms.flatMap((term) => [valueOf(term.piece), ...(term.piece.kind === "quotient" ? [term.piece.a] : [])]);
    const clean =
      result.length === 1 &&
      cleanCoef((result[0] as Mono).c, 40, 12) &&
      pieces.every((m) => cleanCoef(m.c, 60, 27)) &&
      wrongs.every((poly) => poly.every((m) => cleanCoef(m.c, 100, 27))) &&
      // Almeno tre risposte sbagliate diverse tra loro e dalla giusta: l'esercizio può diventare una scelta multipla.
      wrongs.filter((poly, k) => !polyEq(poly, result) && wrongs.findIndex((other) => polyEq(other, poly)) === k).length >= 3;
    if (clean) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

/** Il monomio tra parentesi se ha un segno meno davanti o è un prodotto di più cose. */
const wrapped = (m: Mono): string => {
  const latex = toLatex(monoExpr(m));
  return m.c.sign() < 0 || (!m.c.eq(1) && degree(m) > 0) ? `\\left(${latex}\\right)` : latex;
};

function pieceLatex(piece: Piece): string {
  switch (piece.kind) {
    case "product":
      return `${piece.a.c.sign() < 0 ? wrapped(piece.a) : toLatex(monoExpr(piece.a))} \\cdot ${wrapped(piece.b)}`;
    case "power":
      return `\\left(${toLatex(monoExpr(piece.base))}\\right)^{${piece.k}}`;
    case "quotient":
      return `${piece.a.c.sign() < 0 ? wrapped(piece.a) : toLatex(monoExpr(piece.a))} : ${wrapped(piece.b)}`;
    case "single":
      return toLatex(monoExpr(piece.m));
  }
}

/** Il testo dell'espressione: i pezzi con i loro segni. Un pezzo «single» negativo porta il suo segno. */
function promptLatex(model: Model): string {
  return model.terms
    .map((term, index) => {
      const body = pieceLatex(term.piece);
      if (index === 0) return term.sign === 1 ? body : `-${body}`;
      if (term.piece.kind === "single" && term.piece.m.c.sign() < 0) {
        const flipped = toLatex(monoExpr({ ...term.piece.m, c: term.piece.m.c.neg() }));
        return term.sign === 1 ? ` - ${flipped}` : ` + ${flipped}`;
      }
      return term.sign === 1 ? ` + ${body}` : ` - ${body}`;
    })
    .join("");
}

/** L'espressione del testo costruita con il motore, per la verifica. */
function pieceExpr(piece: Piece): Expr {
  switch (piece.kind) {
    case "product":
      return mul(monoExpr(piece.a), monoExpr(piece.b));
    case "power":
      return pow(monoExpr(piece.base), piece.k);
    case "quotient":
      return div(monoExpr(piece.a), monoExpr(piece.b));
    case "single":
      return monoExpr(piece.m);
  }
}
const promptExpr = (model: Model): Expr => add(...model.terms.map((term) => (term.sign === 1 ? pieceExpr(term.piece) : neg(pieceExpr(term.piece)))));

const m$ = (m: Mono): string => `$${toLatex(monoExpr(m))}$`;

function pieceStep(piece: Piece): string {
  const result = m$(valueOf(piece));
  switch (piece.kind) {
    case "product":
      return `$${pieceLatex(piece)}$: si moltiplicano i coefficienti, $${toLatex(monoExpr(mono(piece.a.c)))} \\cdot ${wrappedNumber(piece.b.c)} = ${toLatex(monoExpr(mono(piece.a.c.mul(piece.b.c))))}$, e si **sommano** gli esponenti della stessa lettera: ${result}.`;
    case "power":
      return `$${pieceLatex(piece)}$: si eleva il coefficiente, $${wrappedNumber(piece.base.c)}^{${piece.k}} = ${toLatex(monoExpr(mono(piece.base.c.pow(piece.k))))}$, e si **moltiplica** ogni esponente per $${piece.k}$: ${result}.`;
    case "quotient":
      return `$${pieceLatex(piece)}$: si dividono i coefficienti, $${toLatex(monoExpr(mono(piece.a.c)))} : ${wrappedNumber(piece.b.c)} = ${toLatex(monoExpr(mono(piece.a.c.div(piece.b.c))))}$, e si **sottraggono** gli esponenti: ${result}.`;
    case "single":
      return `${result} resta com'è.`;
  }
}

function wrappedNumber(c: Rational): string {
  const latex = toLatex(monoExpr(mono(c)));
  return c.sign() < 0 || !c.isInteger() ? `\\left(${latex}\\right)` : latex;
}

const SECOND_HINT: Readonly<Record<Piece["kind"], string>> = {
  product: "Nel prodotto moltiplica i coefficienti, con la regola dei segni, e per ogni lettera **somma** gli esponenti: $x^{2} \\cdot x^{3} = x^{5}$.",
  power: "Nella potenza eleva il coefficiente (con il suo segno) e **moltiplica** ogni esponente per l'esponente esterno: $\\left(x^{2}\\right)^{3} = x^{6}$.",
  quotient: "Nel quoziente dividi i coefficienti e per ogni lettera **sottrai** l'esponente del divisore: $x^{5} : x^{2} = x^{3}$.",
  single: "Calcola ogni pezzo per conto suo, poi somma i coefficienti dei monomi simili.",
};

function draftOf(model: Model): ExerciseDraft {
  const result = total(model.terms);
  const correct = polyExpr(result);
  const candidates: WrongCandidate<Expr>[] = model.terms.flatMap((term, index) =>
    wrongValues(term.piece).map((wrong) => ({ error: wrong.error, value: polyExpr(total(model.terms, { index, value: wrong.value })) })),
  );
  const steps = model.terms.filter((term) => term.piece.kind !== "single").map((term) => ({ text: pieceStep(term.piece) }));
  if (model.terms.length > 1) {
    const values = model.terms.map((term, index) => {
      const value = signed(term.sign, valueOf(term.piece));
      const latex = toLatex(monoExpr(value));
      return index === 0 || value.c.sign() < 0 ? latex : `+ ${latex}`;
    });
    steps.push({ text: `Restano monomi simili: si sommano i coefficienti. $$${values.join(" ")} = ${toLatex(correct)}$$` });
  }
  const first = model.terms.find((term) => term.piece.kind !== "single")?.piece.kind ?? "single";
  return {
    prompt: `Calcola e scrivi il risultato come un solo monomio in forma normale: $${promptLatex(model)}$.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, candidates), form: ["expanded"] },
    steps,
    hints: [
      model.terms.length > 1
        ? "Segui l'ordine delle operazioni: prima le potenze, poi prodotti e quozienti, infine la somma, che si fa solo tra monomi simili."
        : "Che operazione è: un prodotto, una potenza o un quoziente? Coefficienti e lettere si trattano separatamente.",
      SECOND_HINT[first],
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A01.g1",
  skill: "V1.M04.A01",
  lesson: "V1.M04.L01",
  title: "Operazioni con i monomi",
  levels: [1, 2, 3],
  errors: [POWERS, SIGNS, MINUS_POWER],
  limits: { maxInteger: 100, maxDenominator: 27 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: l'espressione del testo, costruita con il motore, è equivalente alla risposta.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    return equivalent(promptExpr(model), answer.correct);
  },
});
