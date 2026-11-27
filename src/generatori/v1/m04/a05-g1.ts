// V1.M04.A05.g1 — Regola di Ruffini e teorema del resto.
//
// Tre forme, una per livello:
// - livello 1: il resto della divisione di P(x) per x + b, senza dividere (teorema del resto: R = P(−b));
//   risposta un numero;
// - livello 2: il quoziente della divisione con Ruffini per x − a, con un grado mancante nel dividendo;
//   risposta un'espressione ridotta (vincolo `expanded`);
// - livello 3: il valore del parametro k per cui P(x) è divisibile per x + b (teorema di Ruffini:
//   P(−b) = 0, un'equazione di primo grado in k); risposta un numero.
//
// All'indietro: a livello 1 e 2 si scelgono il numero a e il quoziente (coefficienti interi); a livello 3
// si sceglie k e si calcola il termine noto perché P(a) = 0.
//
// Le risposte sbagliate rifanno il conto con UN errore:
// - ALG.RUFFINI_SEGNO: il numero con il segno sbagliato (−2 per x − 2, 2 per x + 2);
// - CALC.MENO_POTENZA: (−2)² calcolato come −2² = −4 nella sostituzione;
// - CALC.REGOLA_SEGNI: (−2)³ preso positivo nella sostituzione, oppure un prodotto della tabella di
//   Ruffini con il segno sbagliato;
// - ALG.GRADO_MANCANTE: Ruffini sui coefficienti senza lo zero del grado mancante;
// - CALC.SEGNO_TRASPORTO: da α + βk = 0 ricavato k = α/β invece di −α/β.
//
// Verifica: con il motore (upEval, ruffini, upDivMod) si ricalcola dal polinomio del testo.

import { defineGenerator, exact, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upDivMod, upEval, upMul, upoly, type UPoly } from "../../../motore/algebra/upoly";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, num, pow, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { ruffini, ruffiniTableToLatex } from "../../../motore/steps";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const SIGN_ROOT: ErrorCode = "ALG.RUFFINI_SEGNO";
const MINUS_POWER: ErrorCode = "CALC.MENO_POTENZA";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const MISSING: ErrorCode = "ALG.GRADO_MANCANTE";
const TRANSPORT: ErrorCode = "CALC.SEGNO_TRASPORTO";

const x = sym("x");
const k = sym("k");

type Model =
  /** Livello 1: resto di P(x) diviso x − a, con a negativo. */
  | { readonly kind: "remainder"; readonly p: UPoly; readonly a: number }
  /** Livello 2: quoziente di P(x) diviso x − a con Ruffini. */
  | { readonly kind: "quotient"; readonly p: UPoly; readonly a: number }
  /** Livello 3: P(x) con il coefficiente di grado `at` uguale a k; divisibile per x − a quando k = `k`. */
  | { readonly kind: "parameter"; readonly p: UPoly; readonly a: number; readonly at: number; readonly k: number };

// ───────────────────────────── conti giusti e sbagliati ─────────────────────────────

/** P(a) calcolato termine per termine, con l'eventuale errore sul segno delle potenze di a. */
function evaluate(p: UPoly, a: Rational, mistake: "none" | "evenNegative" | "oddPositive" = "none"): Rational {
  return p.reduce((sum, c, e) => {
    let power = a.pow(e);
    if (a.sign() < 0 && e > 0 && e % 2 === 0 && mistake === "evenNegative") power = power.neg();
    if (a.sign() < 0 && e % 2 === 1 && e > 1 && mistake === "oddPositive") power = power.abs();
    return sum.add(c.mul(power));
  }, Rational.ZERO);
}

/** La tabella di Ruffini sui coefficienti dati (dal grado più alto), con l'eventuale prodotto di segno sbagliato. */
function ruffiniRow(coefficients: readonly Rational[], a: Rational, flipAt = -1): Rational[] {
  const row: Rational[] = [];
  coefficients.forEach((c, j) => {
    if (j === 0) row.push(c);
    else {
      let product = (row[j - 1] as Rational).mul(a);
      if (j === flipAt) product = product.neg();
      row.push(c.add(product));
    }
  });
  return row;
}

/** Il quoziente letto dalla riga in basso (tutti i numeri tranne l'ultimo), come polinomio. */
const quotientOf = (row: readonly Rational[]): UPoly => upoly(...row.slice(0, -1).reverse());

/** I coefficienti dal grado più alto, con gli zeri. */
const fromTop = (p: UPoly): Rational[] => [...p].reverse();

/** Il valore del parametro dato dall'equazione P(a) = 0, scritta α + β·k = 0 (α e β calcolati con l'errore dato). */
function solveFor(p: UPoly, at: number, a: Rational, mistake: "none" | "evenNegative" | "oddPositive" = "none", transport = false): Rational | null {
  const rest = p.map((c, e) => (e === at ? Rational.ZERO : c));
  const alpha = evaluate(rest, a, mistake);
  const beta = evaluate(upoly(...Array.from({ length: at }, () => 0), 1), a, mistake);
  if (beta.isZero()) return null;
  return transport ? alpha.div(beta) : alpha.neg().div(beta);
}

function wrongNumbers(model: Model): WrongCandidate<Rational>[] {
  const a = Rational.of(model.a);
  switch (model.kind) {
    case "remainder":
      return [
        { error: SIGN_ROOT, value: evaluate(model.p, a.neg()) },
        { error: MINUS_POWER, value: evaluate(model.p, a, "evenNegative") },
        { error: SIGNS, value: evaluate(model.p, a, "oddPositive") },
      ];
    case "parameter": {
      const candidate = (error: ErrorCode, value: Rational | null): WrongCandidate<Rational> => (value === null ? null : { error, value });
      return [
        candidate(SIGN_ROOT, solveFor(model.p, model.at, a.neg())),
        candidate(TRANSPORT, solveFor(model.p, model.at, a, "none", true)),
        candidate(MINUS_POWER, solveFor(model.p, model.at, a, "evenNegative")),
        candidate(SIGNS, solveFor(model.p, model.at, a, "oddPositive")),
      ];
    }
    case "quotient":
      return [];
  }
}

function wrongQuotients(model: Model & { kind: "quotient" }): WrongCandidate<UPoly>[] {
  const a = Rational.of(model.a);
  const coefficients = fromTop(model.p);
  const right = ruffiniRow(coefficients, a);
  // Il primo prodotto con un fattore negativo (a negativo, oppure il numero sotto la riga negativo).
  const flip = right.findIndex((_, j) => j > 0 && !(right[j - 1] as Rational).isZero() && (a.sign() < 0 || (right[j - 1] as Rational).sign() < 0));
  return [
    { error: SIGN_ROOT, value: quotientOf(ruffiniRow(coefficients, a.neg())) },
    { error: MISSING, value: quotientOf(ruffiniRow(coefficients.filter((c) => !c.isZero()), a)) },
    flip > 0 ? { error: SIGNS, value: quotientOf(ruffiniRow(coefficients, a, flip)) } : null,
  ];
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const nz = (rng: Rng_, max: number): number => rng.intExcept(-max, max);

function buildLevel1(rng: Rng_): Model {
  // Terzo grado con tutti i termini, a negativo (divisore x + b): i tre errori sono tutti possibili.
  const p = upoly(rng.int(-6, 6), nz(rng, 5), nz(rng, 4), rng.pick([1, 1, 2, -1, 2, 3]));
  return { kind: "remainder", p, a: -rng.int(1, 3) };
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const a = nz(rng, 3);
    const degree = rng.pick([3, 3, 4]);
    // Quoziente di grado degree − 1 e resto r: si estrae di nuovo finché un coefficiente intermedio del
    // dividendo è zero (il grado mancante).
    const quotient = upoly(...Array.from({ length: degree - 1 }, () => rng.int(-5, 5)), rng.pick([1, 1, 2]));
    const p = upMul(quotient, upoly(-a, 1));
    const remainder = rng.int(-6, 6);
    const dividend = upoly(...p.map((c, e) => (e === 0 ? c.add(remainder) : c)));
    const missing = dividend.slice(1, -1).some((c) => c.isZero());
    if (missing && dividend.length === degree + 1 && dividend.every((c) => c.abs().cmp(30) <= 0)) return { kind: "quotient", p: dividend, a };
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const a = -rng.int(1, 3);
    const at = rng.pick([1, 2]);
    const kValue = nz(rng, 6);
    const coefficients = [0, nz(rng, 5), nz(rng, 5), 1].map((c, e) => (e === at ? kValue : c));
    // Termine noto scelto perché P(a) = 0.
    const partial = upoly(...coefficients);
    const constant = evaluate(partial, Rational.of(a)).neg();
    if (constant.isZero() || constant.abs().cmp(40) > 0) continue;
    const p = upoly(constant, ...coefficients.slice(1));
    return { kind: "parameter", p, a, at, k: kValue };
  }
}

const cleanNumber = (r: Rational): boolean => r.abs().cmp(90) <= 0 && r.d <= 27n;

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const needed = level === 1 ? 2 : 3;
    if (model.kind === "quotient") {
      const right = quotientOf(ruffiniRow(fromTop(model.p), Rational.of(model.a)));
      const values = wrongQuotients(model).flatMap((w) => (w ? [w.value] : []));
      const same = (p: UPoly, q: UPoly): boolean => p.length === q.length && p.every((c, j) => c.eq(q[j] ?? 0));
      const distinct = values.filter((v, j) => !same(v, right) && values.findIndex((u) => same(u, v)) === j);
      if (distinct.length >= needed && values.every((v) => v.every((c) => c.abs().cmp(100) <= 0))) return model;
      continue;
    }
    const right = model.kind === "remainder" ? evaluate(model.p, Rational.of(model.a)) : Rational.of(model.k);
    const values = wrongNumbers(model).flatMap((w) => (w ? [w.value] : []));
    const distinct = values.filter((v, j) => !v.eq(right) && values.findIndex((u) => u.eq(v)) === j);
    if (distinct.length >= needed && [right, ...values].every(cleanNumber)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

const show = (p: UPoly): Expr => upolyToExpr(p);
const L = (p: UPoly): string => toLatex(show(p));
const divisorLatex = (a: number): string => L(upoly(-a, 1));
const n$ = (r: Rational): string => toLatex(num(r));
const wrapped = (r: Rational): string => (r.sign() < 0 ? `\\left(${n$(r)}\\right)` : n$(r));

/**
 * P(a) scritto termine per termine (2·(−2)³ − 3·(−2)² + …), poi, a capo in una seconda formula, con il
 * valore di ogni termine (−16 − 12 + …). Con `at`, il coefficiente di quel grado è il parametro k.
 */
function substitutionLatex(p: UPoly, a: Rational, at = -1): string {
  const items = p
    .map((c, e) => ({ c: e === at ? Rational.ONE : c, e, isK: e === at }))
    .filter((t) => !t.c.isZero())
    .reverse();
  const written = items
    .map(({ c, e, isK }, j) => {
      const sign = c.sign() < 0 ? "-" : j === 0 ? "" : "+";
      const abs = c.abs();
      const powerLatex = e === 0 ? "" : `${wrapped(a)}${e === 1 ? "" : `^{${e}}`}`;
      const body = isK ? `k \\cdot ${powerLatex}` : e === 0 ? n$(abs) : `${abs.eq(1) ? "" : `${n$(abs)} \\cdot `}${powerLatex}`;
      return `${sign}${j === 0 ? "" : " "}${body}`;
    })
    .join(" ");
  const values = toLatex(add(...items.map(({ c, e, isK }) => (isK ? mul(num(a.pow(e)), k) : num(c.mul(a.pow(e)))))));
  return `${written}$$ $$= ${values}`;
}

/** Il polinomio con k al posto del coefficiente di grado `at`. */
function parametricExpr(p: UPoly, at: number): Expr {
  const terms: Expr[] = [];
  for (let e = p.length - 1; e >= 0; e--) {
    const power = e === 0 ? null : e === 1 ? x : pow(x, e);
    if (e === at) terms.push(power ? mul(k, power) : k);
    else {
      const c = p[e] as Rational;
      if (c.isZero()) continue;
      terms.push(power === null ? num(c) : c.eq(1) ? power : c.eq(-1) ? neg(power) : mul(num(c), power));
    }
  }
  return add(...terms);
}

function draftOf(model: Model): ExerciseDraft {
  const a = Rational.of(model.a);
  switch (model.kind) {
    case "remainder": {
      const value = evaluate(model.p, a);
      return {
        prompt: `Senza fare la divisione, trova il resto della divisione di $P(x) = ${L(model.p)}$ per $${divisorLatex(model.a)}$.`,
        answer: { kind: "number", correct: num(value), wrong: distinctWrongExpressions(num(value), wrongNumbers(model).map((w) => w && { error: w.error, value: num(w.value) })), mode: exact },
        steps: [
          { text: `Per il teorema del resto, il resto della divisione per $${divisorLatex(model.a)}$ è $P(${n$(a)})$: $${n$(a)}$ è il numero che annulla il divisore.` },
          { text: `Si sostituisce, con le potenze di un numero negativo tra parentesi: esponente pari dà un numero positivo, esponente dispari negativo. $$P(${n$(a)}) = ${substitutionLatex(model.p, a)} = ${n$(value)}$$` },
        ],
        hints: [
          "Non serve dividere: c'è un teorema che dà il resto della divisione per $x - a$ con una sostituzione.",
          `Il resto è $P(a)$, con $a$ il numero che annulla il divisore: qui $a = ${n$(a)}$. Metti le potenze di $${n$(a)}$ tra parentesi.`,
        ],
      };
    }
    case "quotient": {
      const result = ruffini(model.p, a);
      const correct = show(quotientOf(ruffiniRow(fromTop(model.p), a)));
      const wrong = distinctWrongExpressions(correct, wrongQuotients(model).map((w) => w && { error: w.error, value: show(w.value) }));
      const complete = fromTop(model.p).map((c) => n$(c)).join(", \\ ");
      const missing = model.p.slice(1, -1).filter((c) => c.isZero()).length;
      return {
        prompt: `Dividi $P(x) = ${L(model.p)}$ per $${divisorLatex(model.a)}$ con la regola di Ruffini. Scrivi il quoziente.`,
        answer: { kind: "expression", correct, wrong, form: ["expanded"] },
        steps: [
          { text: `**Passo 1.** Il dividendo va completo: ${missing === 1 ? "manca un grado, che si scrive" : "mancano dei gradi, che si scrivono"} con lo zero. Coefficienti $${complete}$. Il divisore $${divisorLatex(model.a)}$ si annulla per $a = ${n$(a)}$.` },
          { text: `**Passo 2 e passo 3.** Si abbassa il primo coefficiente; poi si moltiplica per $${n$(a)}$ e si somma, colonna per colonna. $$${ruffiniTableToLatex(result)}$$` },
          { text: `**Passo 4.** L'ultimo numero è il resto, $${n$(result.remainder)}$; gli altri sono i coefficienti del quoziente, che ha un grado in meno: $Q(x) = ${toLatex(correct)}$.` },
        ],
        hints: [
          "Con Ruffini servono tutti i coefficienti del dividendo, dal grado più alto al termine noto, e il numero che annulla il divisore.",
          `Scrivi $0$ per il grado che manca. A sinistra va $${n$(a)}$, il numero che annulla $${divisorLatex(model.a)}$: abbassa il primo coefficiente, poi moltiplica e somma.`,
        ],
      };
    }
    case "parameter": {
      const rest = model.p.map((c, e) => (e === model.at ? Rational.ZERO : c));
      const alpha = evaluate(rest, a);
      const beta = a.pow(model.at);
      const equation = toLatex(add(num(alpha), mul(num(beta), k)));
      const kValue = Rational.of(model.k);
      return {
        prompt: `Trova il valore di $k$ per cui il polinomio $P(x) = ${toLatex(parametricExpr(model.p, model.at))}$ è divisibile per $${divisorLatex(model.a)}$.`,
        answer: { kind: "number", correct: num(kValue), wrong: distinctWrongExpressions(num(kValue), wrongNumbers(model).map((w) => w && { error: w.error, value: num(w.value) })), mode: exact },
        steps: [
          { text: `Per il teorema di Ruffini, $P(x)$ è divisibile per $${divisorLatex(model.a)}$ se e solo se $P(${n$(a)}) = 0$.` },
          { text: `Si sostituisce $x = ${n$(a)}$, lasciando $k$ com'è, e si sommano i numeri: $$P(${n$(a)}) = ${substitutionLatex(model.p, a, model.at)} = ${equation}$$` },
          { text: `Deve valere zero: $${equation} = 0$. Si porta $${n$(alpha)}$ dall'altra parte cambiandogli segno e si divide per $${n$(beta)}$: $k = ${n$(kValue)}$.` },
          { text: `Controllo: con $k = ${n$(kValue)}$ il polinomio è $${L(model.p)}$, e $P(${n$(a)}) = 0$.` },
        ],
        hints: [
          "Divisibile per $x - a$ vuol dire resto zero: quale teorema lega il resto al valore del polinomio?",
          `Sostituisci $x = ${n$(a)}$ (il numero che annulla il divisore) e imponi che il risultato sia $0$: ottieni un'equazione in $k$.`,
        ],
      };
    }
  }
}

export default defineGenerator({
  code: "V1.M04.A05.g1",
  skill: "V1.M04.A05",
  lesson: "V1.M04.L05",
  title: "Regola di Ruffini e teorema del resto",
  levels: [1, 2, 3],
  errors: [SIGN_ROOT, MINUS_POWER, SIGNS, MISSING, TRANSPORT],
  limits: { maxInteger: 100, maxDenominator: 27 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente, con le funzioni del motore: il resto è il resto della divisione (upDivMod); il
  // quoziente moltiplicato per x − a, più il resto P(a), ridà P; con k trovato, P(a) = 0.
  verify: (exercise) => {
    const { answer } = exercise;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const divisor = upoly(-model.a, 1);
    switch (model.kind) {
      case "remainder":
        return answer.kind === "number" && equivalent(answer.correct, num(upDivMod(model.p, divisor).remainder[0] ?? 0));
      case "quotient": {
        if (answer.kind !== "expression") return false;
        return equivalent(add(mul(answer.correct, show(divisor)), num(upEval(model.p, model.a))), show(model.p));
      }
      case "parameter":
        return answer.kind === "number" && upEval(model.p, model.a).isZero() && equivalent(answer.correct, num(model.k));
    }
  },
});
