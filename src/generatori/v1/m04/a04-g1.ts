// V1.M04.A04.g1 — Divisione tra polinomi: quoziente e resto.
//
// Risposta: un'espressione, il quoziente Q(x) oppure il resto R(x) (il testo dice quale), ridotto
// (vincolo `expanded`). All'indietro: si scelgono il divisore B, il quoziente Q (coefficienti interi) e
// il resto R di grado minore di B; il dividendo del testo è A = Q·B + R. Con il primo coefficiente di B
// che divide quello di Q, tutti i conti della divisione restano interi.
//
// Le risposte sbagliate rifanno la divisione in colonna con UN errore:
// - CALC.MENO_PARENTESI: in un giro, nella sottrazione cambia segno solo il primo termine del prodotto
//   (gli altri si sommano invece di sottrarsi);
// - CALC.REGOLA_SEGNI: un termine negativo del quoziente preso positivo (poi i conti proseguono giusti);
// - CALC.RESTO_DIVISIONE: divisione fermata un giro prima, con un «resto» dello stesso grado del divisore;
// - con il divisore monomio (livello 1): CALC.PROPRIETA_POTENZE (esponenti sommati invece che sottratti)
//   e ALG.RACCOGLIMENTO (il termine uguale al divisore sparisce invece di lasciare 1).
//
// Livello 1: divisore monomio (si divide ogni termine), oppure x − a con dividendo di secondo grado.
// Livello 2: dividendo di terzo o quarto grado con un grado mancante, divisore x − a oppure 2x − a.
// Livello 3: divisore di secondo grado, dividendo di quarto grado con gradi mancanti, resto di primo grado.
//
// Verifica: con il motore (upDivMod, un algoritmo diverso) si ricalcolano quoziente e resto del testo.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upAdd, upDegree, upDivMod, upMul, upoly, upSub, type UPoly } from "../../../motore/algebra/upoly";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, num, pow, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const x = sym("x");

const MINUS: ErrorCode = "CALC.MENO_PARENTESI";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const EARLY: ErrorCode = "CALC.RESTO_DIVISIONE";
const POWERS: ErrorCode = "CALC.PROPRIETA_POTENZE";
const COLLECT: ErrorCode = "ALG.RACCOGLIMENTO";

interface Model {
  readonly divisor: UPoly;
  readonly quotient: UPoly;
  readonly remainder: UPoly;
  /** Che cosa chiede il testo. */
  readonly ask: "quotient" | "remainder";
}

// ───────────────────────────── divisione in colonna, giusta e sbagliata ─────────────────────────────

/** Un errore da fare in un giro preciso della divisione (contando da 0). */
type Mistake = { readonly kind: "none" } | { readonly kind: "minus"; readonly round: number } | { readonly kind: "sign"; readonly round: number } | { readonly kind: "early" };

interface Round {
  readonly term: UPoly;
  readonly product: UPoly;
  readonly remainder: UPoly;
}

const lead = (p: UPoly): Rational => p[p.length - 1] ?? Rational.ZERO;
/** Il monomio c·xᵏ come polinomio. */
const monomial = (c: Rational, k: number): UPoly => upoly(...Array.from({ length: k }, () => 0), c);

/** La divisione in colonna, con l'eventuale errore. Restituisce i giri, il quoziente e il resto ottenuti. */
function longDivision(a: UPoly, b: UPoly, mistake: Mistake = { kind: "none" }): { rounds: Round[]; quotient: UPoly; remainder: UPoly } {
  const rounds: Round[] = [];
  let quotient: UPoly = [];
  let current = a;
  // Con l'errore «fermato prima» si fa un giro in meno di quelli necessari.
  const needed = upDegree(a) - upDegree(b) + 1;
  while (upDegree(current) >= upDegree(b) && current.length > 0) {
    const k = rounds.length;
    if (mistake.kind === "early" && k === needed - 1) break;
    let coefficient = lead(current).div(lead(b));
    if (mistake.kind === "sign" && mistake.round === k) coefficient = coefficient.abs();
    const term = monomial(coefficient, upDegree(current) - upDegree(b));
    const product = upMul(term, b);
    let next: UPoly;
    if (mistake.kind === "minus" && mistake.round === k) {
      // Cambia segno solo il termine di grado più alto del prodotto: gli altri si sommano.
      const top = monomial(lead(product), upDegree(product));
      next = upAdd(upSub(current, top), upSub(product, top));
    } else {
      next = upSub(current, product);
    }
    // Il termine di grado più alto si deve annullare: se non succede (segno sbagliato del quoziente) lo si toglie
    // comunque, come fa chi «abbassa» solo gli altri termini.
    if (upDegree(next) >= upDegree(current)) next = upSub(next, monomial(lead(next), upDegree(next)));
    rounds.push({ term, product, remainder: next });
    quotient = upAdd(quotient, term);
    current = next;
    if (rounds.length > 6) break;
  }
  return { rounds, quotient, remainder: current };
}

/** Le risposte sbagliate per la parte chiesta, ognuna con il suo errore. */
function wrongAnswers(model: Model): WrongCandidate<UPoly>[] {
  const a = dividend(model);
  const { divisor: b } = model;
  // Un errore che porta a coefficienti non interi (con il divisore 2x − a) non è credibile: si scarta.
  const pick = (r: { quotient: UPoly; remainder: UPoly }): UPoly | null => {
    const value = model.ask === "quotient" ? r.quotient : r.remainder;
    return value.every((c) => c.isInteger()) ? value : null;
  };
  const candidate = (error: ErrorCode, value: UPoly | null): WrongCandidate<UPoly> => (value === null ? null : { error, value });
  const right = longDivision(a, b);
  const out: WrongCandidate<UPoly>[] = [];
  if (upDegree(b) === 0 || (b.length > 1 && b.slice(0, -1).every((c) => c.isZero()))) {
    // Divisore monomio d·xᵏ: si divide ogni termine.
    const k = upDegree(b);
    const d = lead(b);
    const terms = a.map((c, e) => ({ c, e })).filter((t) => !t.c.isZero());
    const build = (f: (t: { c: Rational; e: number }) => UPoly | null): UPoly => terms.reduce<UPoly>((s, t) => upAdd(s, f(t) ?? []), []);
    // Esponenti sommati invece che sottratti.
    out.push({ error: POWERS, value: build((t) => monomial(t.c.div(d), t.e + k)) });
    // Il termine uguale al divisore sparisce invece di lasciare 1.
    if (terms.some((t) => t.c.eq(d) && t.e === k)) out.push({ error: COLLECT, value: build((t) => (t.c.eq(d) && t.e === k ? null : monomial(t.c.div(d), t.e - k))) });
    // Con il divisore negativo, i segni del quoziente lasciati come nel dividendo.
    if (d.sign() < 0) out.push({ error: SIGNS, value: build((t) => monomial(t.c.div(d.abs()), t.e - k)) });
    return out;
  }
  for (let round = 0; round < right.rounds.length; round++) out.push(candidate(MINUS, pick(longDivision(a, b, { kind: "minus", round }))));
  out.push(candidate(EARLY, pick(longDivision(a, b, { kind: "early" }))));
  for (let round = 0; round < right.rounds.length; round++) {
    if ((right.rounds[round] as Round).term.some((c) => c.sign() < 0)) out.push(candidate(SIGNS, pick(longDivision(a, b, { kind: "sign", round }))));
  }
  return out;
}

const dividend = (model: Model): UPoly => upAdd(upMul(model.quotient, model.divisor), model.remainder);

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const nz = (rng: Rng_, max: number): number => rng.intExcept(-max, max);

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.5)) {
    // Divisore monomio d·xᵏ; quoziente di tre termini, uno dei quali a volte è ±1 (il termine uguale al divisore).
    const k = rng.int(1, 2);
    const d = rng.pick([2, 3, 4, 5, -2, -3]);
    const withOne = rng.bool(0.6);
    const quotient = upoly(withOne ? rng.pick([1, -1]) : nz(rng, 4), nz(rng, 4), rng.intExcept(1, 4, [0]) * rng.sign());
    return { divisor: monomial(Rational.of(d), k), quotient, remainder: [], ask: "quotient" };
  }
  const a = nz(rng, 5);
  return { divisor: upoly(-a, 1), quotient: upoly(nz(rng, 6), rng.int(1, 3)), remainder: upoly(rng.int(-6, 6)), ask: "quotient" };
}

/** Un dividendo con un grado mancante: si sceglie il resto in modo che quel coefficiente sia zero. */
function withMissingDegree(rng: Rng_, divisor: UPoly, quotient: UPoly): Model | null {
  const product = upMul(quotient, divisor);
  // Il coefficiente di grado 1 o 2 (non il primo) si annulla solo se il prodotto lo ha già nullo.
  const zeroAt = product.findIndex((c, k) => k > 0 && k < product.length - 1 && c.isZero());
  if (zeroAt < 0) return null;
  const ask = rng.bool() ? "quotient" : "remainder";
  // Se si chiede il resto, non è zero.
  return { divisor, quotient, remainder: upoly(ask === "remainder" ? nz(rng, 7) : rng.int(-7, 7)), ask };
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const p = rng.pick([1, 1, 1, 2]);
    // Con 2x il termine noto del divisore è dispari: niente fattore 2 comune.
    const divisor = upoly(p === 2 ? rng.pick([-3, -1, 1, 3]) : nz(rng, 4), p);
    const degree = rng.pick([2, 2, 3]);
    const quotient = upoly(...Array.from({ length: degree }, () => nz(rng, 4)), rng.int(1, 2));
    const model = withMissingDegree(rng, divisor, quotient);
    if (model) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const divisor = upoly(nz(rng, 3), rng.int(-3, 3), 1);
    const quotient = upoly(nz(rng, 4), rng.int(-4, 4), rng.int(1, 2));
    const product = upMul(quotient, divisor);
    // Almeno un grado mancante nel dividendo (lo si ottiene con il resto, che ha grado 1).
    const r1 = product[1] && rng.bool(0.5) ? (product[1] as Rational).neg() : Rational.of(nz(rng, 5));
    const remainder = upoly(rng.int(-6, 6), r1);
    const a = upAdd(product, remainder);
    if (!a.slice(1, -1).some((c) => c.isZero())) continue;
    if (upDegree(remainder) < 1) continue;
    return { divisor, quotient, remainder, ask: rng.bool() ? "remainder" : "quotient" };
  }
}

const show = (p: UPoly): Expr => upolyToExpr(p);
const sameUPoly = (p: UPoly, q: UPoly): boolean => equivalent(show(p), show(q));

function enoughWrong(model: Model, needed: number): boolean {
  const right = model.ask === "quotient" ? model.quotient : model.remainder;
  const values = wrongAnswers(model).filter((w): w is NonNullable<typeof w> => w !== null).map((w) => w.value);
  const distinct = values.filter((v, k) => !sameUPoly(v, right) && values.findIndex((u) => sameUPoly(u, v)) === k);
  return distinct.length >= needed;
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    // Coefficienti del dividendo piccoli, anche nelle risposte sbagliate, e abbastanza risposte sbagliate diverse.
    const small = (p: UPoly, max: number): boolean => p.every((c) => c.abs().cmp(max) <= 0);
    const clean = small(dividend(model), 40) && wrongAnswers(model).every((w) => w === null || small(w.value, 60));
    if (clean && enoughWrong(model, level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

const L = (p: UPoly): string => toLatex(show(p));

function stepsOf(model: Model): string[] {
  const a = dividend(model);
  const b = model.divisor;
  const { rounds, quotient, remainder } = longDivision(a, b);
  if (b.slice(0, -1).every((c) => c.isZero())) {
    const pieces = a.map((c, e) => ({ c, e })).filter((t) => !t.c.isZero()).reverse();
    const lines = pieces.map((t) => `${L(monomial(t.c, t.e))} : ${b.length > 1 ? `\\left(${L(b)}\\right)` : L(b)} = ${L(monomial(t.c.div(lead(b)), t.e - upDegree(b)))}`);
    return [
      `Il divisore è un monomio: si divide **ogni** termine del dividendo, dividendo i coefficienti e sottraendo gli esponenti. ${lines.map((line) => `$$${line}$$`).join(" ")}`,
      `Quindi $Q(x) = ${L(quotient)}$, con resto $0$. Controllo: $${L(b)} \\cdot \\left(${L(quotient)}\\right) = ${L(a)}$.`,
    ];
  }
  const missing = a.slice(1, -1).some((c) => c.isZero());
  // Il dividendo completo, con i termini nulli scritti: 0x² compare davvero.
  const power = (e: number): Expr => (e === 1 ? x : pow(x, e));
  const complete = toLatex(add(...a.map((c, e) => ({ c, e })).reverse().map(({ c, e }) => (e === 0 ? num(c) : c.eq(1) ? power(e) : c.eq(-1) ? neg(power(e)) : mul(num(c), power(e))))));
  const steps = [
    missing
      ? `**Passo 1.** Ordina e completa il dividendo, con zero al posto dei gradi mancanti: $A(x) = ${complete}$.`
      : `**Passo 1.** Dividendo e divisore sono già ordinati e completi.`,
  ];
  let current = a;
  rounds.forEach((round, k) => {
    const head = k === 0 ? "**Passo 2 e passo 3.**" : `**Passo 4** (giro ${k + 1}).`;
    steps.push(
      `${head} $${L(monomial(lead(current), upDegree(current)))} : ${L(monomial(lead(b), upDegree(b)))} = ${L(round.term)}$; moltiplica: $${L(round.term)} \\cdot \\left(${L(b)}\\right) = ${L(round.product)}$. Sottrai, cambiando il segno di ogni termine del prodotto: $$\\left(${L(current)}\\right) - \\left(${L(round.product)}\\right)${current.filter((c) => !c.isZero()).length >= 3 ? "$$ $$" : " "}= ${round.remainder.length === 0 ? "0" : L(round.remainder)}$$`,
    );
    current = round.remainder;
  });
  steps.push(`Il resto parziale ha grado minore del divisore: ci si ferma. $Q(x) = ${L(quotient)}$, $R(x) = ${remainder.length === 0 ? "0" : L(remainder)}$.`);
  const check = remainder.length === 0 ? mul(show(quotient), show(b)) : add(mul(show(quotient), show(b)), show(remainder));
  steps.push(`**Passo 5.** Controllo: $${toLatex(check)} = ${L(a)}$.`);
  return steps;
}

function draftOf(model: Model): ExerciseDraft {
  const a = dividend(model);
  const b = model.divisor;
  const asked = model.ask === "quotient" ? model.quotient : model.remainder;
  const correct = show(asked);
  const wrong = distinctWrongExpressions(
    correct,
    wrongAnswers(model).map((w) => w && { error: w.error, value: show(w.value) }),
  );
  const what = model.ask === "quotient" ? "il quoziente $Q(x)$" : "il resto $R(x)$";
  const monomialDivisor = b.slice(0, -1).every((c) => c.isZero());
  return {
    prompt: `Dividi $A(x) = ${L(a)}$ per $B(x) = ${L(b)}$. Scrivi ${what}.`,
    answer: { kind: "expression", correct, wrong, form: ["expanded"] },
    steps: stepsOf(model).map((text) => ({ text })),
    hints: monomialDivisor
      ? ["Il divisore è un monomio: basta dividere ogni termine del dividendo per il divisore.", "Per ogni termine dividi i coefficienti, con la regola dei segni, e **sottrai** gli esponenti. Un termine uguale al divisore dà $1$."]
      : [
          "È una divisione in colonna: il quoziente si costruisce un termine alla volta, finché il resto ha grado minore del divisore.",
          `Ordina il dividendo e scrivi con lo zero i gradi che mancano. Poi dividi il primo termine di $A$ per il primo termine di $B$, moltiplica per tutto il divisore e **sottrai** (ogni termine cambia segno).`,
        ],
  };
}

export default defineGenerator({
  code: "V1.M04.A04.g1",
  skill: "V1.M04.A04",
  lesson: "V1.M04.L04",
  title: "Divisione tra polinomi",
  levels: [1, 2, 3],
  errors: [MINUS, SIGNS, EARLY, POWERS, COLLECT],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: quoziente e resto del dividendo del testo, calcolati dal motore con un altro algoritmo.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const { quotient, remainder } = upDivMod(dividend(model), model.divisor);
    if (upDegree(remainder) >= upDegree(model.divisor) && remainder.length > 0) return false;
    return equivalent(answer.correct, show(model.ask === "quotient" ? quotient : remainder));
  },
});
