// V1.M05.A08.g1 — Equazioni parametriche: per quali valori del parametro k le soluzioni sono reali,
// distinte, assenti, con segni dati; il valore di k che dà una soluzione assegnata
// (risposta: insieme dei valori di k, oppure un numero).
//
// Costruzione all'indietro: si sceglie prima la soglia del discriminante (un numero pulito), poi i
// coefficienti che la producono: in ax² + bx + k = 0 la soglia è b²/(4a), quindi b si prende pari
// e a tra i divisori di b²/4. Per la soluzione assegnata si sceglie prima la soluzione r.
//
// Livello 1: x² + bx + k = 0, soluzioni reali, distinte o nessuna.
// Livello 2: ax² + bx + k = 0 con a ≠ 1 (anche negativo); il valore di k per cui x = r è una
//            soluzione di x² + kx + c = 0. (Niente Δ di secondo grado in k: le disequazioni arrivano in V1.M06.)
// Livello 3: (k − a)x² + bx + c = 0 con due soluzioni distinte (il caso k = a va escluso);
//            x² + bx + k = 0 con due soluzioni distinte e dello stesso segno.
//
// Errori tipici, rifatti sui numeri:
//   DISEQ.VERSO_NON_INVERTITO      dividendo per un numero negativo non inverte il verso;
//   DISEQ.ESTREMI                  Δ ≥ 0 al posto di Δ > 0 (o il contrario);
//   CALC.REGOLA_SEGNI              nel discriminante −4ac preso con il segno sbagliato;
//   ALG.PARAMETRO_COEFFICIENTE     non esclude il valore di k che annulla il coefficiente di x²;
//   ALG.SOMMA_PRODOTTO             prodotto (o somma) delle soluzioni con il segno sbagliato;
//   DISEQ.UNIONE_INTERSEZIONE      le condizioni messe insieme con l'unione invece che a sistema;
//   CALC.SEGNO_TRASPORTO, CALC.MENO_POTENZA, ALG.COEFFICIENTE_INVERTITO  nel conto di k da una soluzione data.

import { defineGenerator, exact, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import { expand, exprToUPoly } from "../../../motore/algebra/expand";
import { add, mul, num, pow, substitute, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import {
  atLeast, atMost, greaterThan, interval, lessThan, open, realSet, setIntersection, setToInequalityLatex, setUnion,
  type RealSet, type SolutionSet,
} from "../../../motore/sets";
import { monomial, step } from "../../comuni/equations";
import { distinctWrongExpressions, distinctWrongSets, type WrongCandidate } from "../../comuni/wrong";

const CODE = "V1.M05.A08.g1";
type Rng_ = GeneratorContext["rng"];
const x = sym("x");
const k = sym("k");

/** Che cosa si chiede delle soluzioni. */
type Ask = "real" | "distinct" | "none";

type Model =
  /** a x² + b x + k + c = 0. */
  | { readonly kind: "constant"; readonly a: number; readonly b: number; readonly c: number; readonly ask: Ask }
  /** x² + k x + c = 0 ha la soluzione r: quanto vale k? */
  | { readonly kind: "given"; readonly r: number; readonly c: number }
  /** (k − a) x² + b x + c = 0 con due soluzioni distinte. */
  | { readonly kind: "leading"; readonly a: number; readonly b: number; readonly c: number }
  /** x² + b x + k + c = 0 con due soluzioni distinte e concordi (positive se b < 0). */
  | { readonly kind: "signs"; readonly b: number; readonly c: number };

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const model: Model = { kind: "constant", a: 1, b: 2 * rng.intExcept(-5, 5), c: rng.pick([0, 0, rng.intExcept(-5, 5)]), ask: rng.pick(["real", "distinct", "none"] as const) };
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["constant", "constant", "given"] as const);
    let model: Model;
    switch (shape) {
      case "constant": {
        // La soglia b²/(4a) deve essere un intero o un mezzo: a divide b²/4 (o 2a lo divide).
        const half = rng.intExcept(-6, 6);
        const a = rng.pick([2, 3, -1, -2, 4]);
        if ((half * half * 2) % Math.abs(a) !== 0) continue;
        model = { kind: "constant", a, b: 2 * half, c: 0, ask: rng.pick(["real", "distinct", "none"] as const) };
        break;
      }
      case "given": {
        const r = -rng.int(1, 6);
        model = { kind: "given", r, c: rng.intExcept(-12, 12) };
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    let model: Model;
    if (rng.bool()) {
      // Soglia a + b²/(4c) con b²/(4c) intero.
      const half = rng.intExcept(-6, 6);
      const c = rng.pick([1, 2, 3, -1, -2, -3]);
      if ((half * half) % Math.abs(c) !== 0) continue;
      model = { kind: "leading", a: rng.intExcept(-4, 4, []), b: 2 * half, c };
    } else {
      model = { kind: "signs", b: 2 * rng.intExcept(-5, 5), c: rng.int(-4, 4) };
    }
    if (acceptable(model, 3)) return model;
  }
}

function acceptable(model: Model, minimumWrong: number): boolean {
  return wrongCount(model) >= minimumWrong;
}

function wrongCount(model: Model): number {
  return model.kind === "given" ? wrongNumbers(model, correctNumber(model)).length : wrongSets(model, correctSet(model)).length;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── risposte, giuste e sbagliate ─────────────────────────────

const R = (value: number | Rational): Rational => Rational.from(value);

/** Dove «Δ ⋛ 0» con Δ = m·k + q (m ≠ 0), per la domanda data. */
function linearCondition(m: Rational, q: Rational, ask: Ask): RealSet {
  const threshold = num(q.neg().div(m));
  const positive = m.sign() > 0; // Δ > 0 per k > soglia
  switch (ask) {
    case "real":
      return positive ? atLeast(threshold) : atMost(threshold);
    case "distinct":
      return positive ? greaterThan(threshold) : lessThan(threshold);
    case "none":
      return positive ? lessThan(threshold) : greaterThan(threshold);
  }
}

/** La domanda con l'uguale tolto o aggiunto. */
const otherStrictness = (ask: Ask): Ask | "noneOrZero" => (ask === "real" ? "distinct" : ask === "distinct" ? "real" : "noneOrZero");

/** L'intersezione di due insiemi di numeri reali è ancora un insieme di numeri reali (mai periodico). */
function asReal(set: SolutionSet): RealSet {
  if (set.kind !== "realset") throw new Error("insieme periodico inatteso");
  return set;
}

function correctSet(model: Exclude<Model, { kind: "given" }>): RealSet {
  switch (model.kind) {
    case "constant": {
      // Δ = b² − 4a(k + c)
      return linearCondition(R(-4 * model.a), R(model.b * model.b - 4 * model.a * model.c), model.ask);
    }
    case "leading": {
      const distinct = linearCondition(R(-4 * model.c), R(model.b * model.b + 4 * model.a * model.c), "distinct");
      return asReal(setIntersection(distinct, realSet(lessThan(model.a), greaterThan(model.a))));
    }
    case "signs": {
      const t = R(model.b * model.b).div(4).sub(model.c);
      return open(-model.c, num(t));
    }
  }
}

function wrongSets(model: Exclude<Model, { kind: "given" }>, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const candidates: WrongCandidate<SolutionSet>[] = [];
  const with0 = (ask: Ask | "noneOrZero", m: Rational, q: Rational): RealSet =>
    ask === "noneOrZero" ? (m.sign() > 0 ? atMost(num(q.neg().div(m))) : atLeast(num(q.neg().div(m)))) : linearCondition(m, q, ask);
  switch (model.kind) {
    case "constant": {
      const { a, b, c, ask } = model;
      const m = R(-4 * a);
      const q = R(b * b - 4 * a * c);
      // Il verso non invertito dividendo per −4a < 0 (o invertito quando non serviva).
      const flipped = linearCondition(m.neg(), q.neg(), ask);
      candidates.push({ error: "DISEQ.VERSO_NON_INVERTITO", value: flipped });
      candidates.push({ error: "DISEQ.ESTREMI", value: with0(otherStrictness(ask), m, q) });
      // Δ = b² + 4a(k + c).
      candidates.push({ error: "CALC.REGOLA_SEGNI", value: linearCondition(m.neg(), R(b * b + 4 * a * c), ask) });
      break;
    }
    case "leading": {
      const { a, b, c } = model;
      const m = R(-4 * c);
      const q = R(b * b + 4 * a * c);
      const distinct = linearCondition(m, q, "distinct");
      candidates.push({ error: "ALG.PARAMETRO_COEFFICIENTE", value: distinct });
      const excludeA = realSet(lessThan(a), greaterThan(a));
      candidates.push({ error: "DISEQ.VERSO_NON_INVERTITO", value: setIntersection(linearCondition(m.neg(), q.neg(), "distinct"), excludeA) });
      candidates.push({ error: "DISEQ.ESTREMI", value: setIntersection(linearCondition(m, q, "real"), excludeA) });
      break;
    }
    case "signs": {
      const c = model.c;
      const t = num(R(model.b * model.b).div(4).sub(c));
      const delta = lessThan(t);
      // Prodotto preso con il segno sbagliato, −(k + c) > 0: k < −c (insieme al discriminante).
      candidates.push({ error: "ALG.SOMMA_PRODOTTO", value: setIntersection(delta, lessThan(-c)) });
      candidates.push({ error: "DISEQ.ESTREMI", value: realSet(interval(-c, t, true, true)) });
      candidates.push({ error: "DISEQ.VERSO_NON_INVERTITO", value: setIntersection(greaterThan(t), greaterThan(-c)) });
      candidates.push({ error: "DISEQ.UNIONE_INTERSEZIONE", value: setUnion(delta, greaterThan(-c)) });
      break;
    }
  }
  return distinctWrongSets(correct, candidates);
}

/** x² + kx + c = 0 con x = r: r² + kr + c = 0, quindi k = −(r² + c)/r. */
const correctNumber = (model: Extract<Model, { kind: "given" }>): Rational => R(model.r * model.r + model.c).neg().div(model.r);

function wrongNumbers(model: Extract<Model, { kind: "given" }>, correct: Rational) {
  const { r, c } = model;
  const clean = (value: Rational): boolean => value.abs().cmp(40) <= 0 && value.d <= 12n;
  const candidates: WrongCandidate<Expr>[] = [];
  const push = (error: "CALC.SEGNO_TRASPORTO" | "CALC.MENO_POTENZA" | "ALG.COEFFICIENTE_INVERTITO", value: Rational | null): void => {
    candidates.push(value && clean(value) ? { error, value: num(value) } : null);
  };
  // kr = −(r² + c) senza cambiare segno: k = (r² + c)/r.
  push("CALC.SEGNO_TRASPORTO", R(r * r + c).div(r));
  // r² con r negativo scritto −r²: −r² + kr + c = 0.
  push("CALC.MENO_POTENZA", R(-r * r + c).neg().div(r));
  // k = r/(−(r² + c)).
  push("ALG.COEFFICIENTE_INVERTITO", r * r + c === 0 ? null : R(r).div(R(r * r + c).neg()));
  return distinctWrongExpressions(num(correct), candidates);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

/** Aggiunge il termine noto c in coda (niente se è zero). */
const withConstant = (sum: Expr, c: number): Expr => (c === 0 ? sum : sum.kind === "add" ? add(...sum.terms, num(c)) : add(sum, num(c)));

/** k − a scritto a mano (k da solo se a = 0). */
const kMinus = (a: number): Expr => (a === 0 ? k : add(k, num(-a)));

/** Il primo membro dell'equazione, con k. */
function equationOf(model: Model): Expr {
  switch (model.kind) {
    case "constant":
      return withConstant(add(monomial(model.a, 2), monomial(model.b, 1), k), model.c);
    case "given":
      return model.c === 0 ? add(pow(x, 2), mul(k, x)) : add(pow(x, 2), mul(k, x), num(model.c));
    case "leading":
      return add(mul(kMinus(model.a), pow(x, 2)), monomial(model.b, 1), num(model.c));
    case "signs":
      return withConstant(add(pow(x, 2), monomial(model.b, 1), k), model.c);
  }
}

const ASK_TEXT: Readonly<Record<Ask, string>> = { real: "ha soluzioni reali", distinct: "ha due soluzioni reali distinte", none: "non ha soluzioni reali" };
const ASK_DELTA: Readonly<Record<Ask, string>> = { real: "\\Delta \\ge 0", distinct: "\\Delta > 0", none: "\\Delta < 0" };

function promptOf(model: Model): string {
  const equation = `$${toLatex(equationOf(model))} = 0$`;
  switch (model.kind) {
    case "constant":
      return `Per quali valori di $k$ l'equazione ${equation} ${ASK_TEXT[model.ask]}?`;
    case "given":
      return `Trova il valore di $k$ per cui $x = ${model.r}$ è una soluzione dell'equazione ${equation}.`;
    case "leading":
      return `Per quali valori di $k$ l'equazione ${equation} ha due soluzioni reali distinte?`;
    case "signs":
      return `Per quali valori di $k$ l'equazione ${equation} ha due soluzioni reali distinte e ${model.b < 0 ? "positive" : "negative"}?`;
  }
}

const inParens = (value: number): string => (value < 0 ? `\\left(${value}\\right)` : `${value}`);

function stepsOf(model: Model): { text: string }[] {
  switch (model.kind) {
    case "constant": {
      const { a, b, c, ask } = model;
      const correct = correctSet(model);
      const m = -4 * a;
      const q = b * b - 4 * a * c;
      const cTerm = c === 0 ? "k" : `\\left(${toLatex(add(k, num(c)))}\\right)`;
      const divide = m < 0 ? `dividendo per $${m}$, che è negativo, il verso si inverte` : `dividendo per $${m}$, che è positivo, il verso resta`;
      const delta = toLatex(q === 0 ? monomial(m, 1, k) : add(num(q), monomial(m, 1, k)));
      return [
        step(`**Passo 1.** Il coefficiente di $x^2$ è $${a}$, mai zero: l'equazione è di secondo grado per ogni $k$, e ${ASK_TEXT[ask]} se e solo se $${ASK_DELTA[ask]}$.${c === 0 ? "" : ` Il termine noto è $c = ${toLatex(add(k, num(c)))}$.`}`),
        step("**Passo 2.** Calcola il discriminante.", `\\Delta = ${inParens(b)}^{2} - 4 \\cdot ${inParens(a)} \\cdot ${cTerm} = ${delta}`),
        step(`**Passo 3.** Risolvi la disuguaglianza in $k$: ${divide}.`, `${delta} ${ASK_DELTA[ask].replace("\\Delta ", "")} \\quad\\Longrightarrow\\quad ${setToInequalityLatex(correct, { variable: "k" })}`),
      ];
    }
    case "given": {
      const { r, c } = model;
      const value = correctNumber(model);
      return [
        step(`**Passo 1.** Una soluzione rende vera l'equazione: sostituisci $x = ${r}$. Attento: $${inParens(r)}^{2} = ${r * r}$.`, `${inParens(r)}^{2} + k \\cdot ${inParens(r)}${c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`} = 0 \\quad\\Longrightarrow\\quad ${toLatex(monomial(r, 1, k))} ${r * r + c < 0 ? "-" : "+"} ${Math.abs(r * r + c)} = 0`),
        step(`**Passo 2.** Risolvi l'equazione di primo grado in $k$: porta il numero dall'altra parte cambiando segno, poi dividi per $${r}$.`, `k = \\frac{${-(r * r + c)}}{${r}} = ${toLatex(num(value))}`),
      ];
    }
    case "leading": {
      const { a, b, c } = model;
      const correct = correctSet(model);
      const m = -4 * c;
      const q = b * b + 4 * a * c;
      return [
        step(`**Passo 1.** Il coefficiente di $x^2$ è $${toLatex(kMinus(a))}$, che vale zero per $k = ${a}$: lì l'equazione diventa $${toLatex(add(monomial(b, 1), num(c)))} = 0$, di primo grado, con una sola soluzione. Quindi $k = ${a}$ si esclude.`),
        step("**Passo 2.** Per $k \\ne " + a + "$ servono due soluzioni distinte: $\\Delta > 0$.", `\\Delta = ${inParens(b)}^{2} - 4 \\cdot ${inParens(c)} \\cdot \\left(${toLatex(kMinus(a))}\\right) = ${toLatex(add(num(q), monomial(m, 1, k)))} > 0`),
        step(`**Passo 3.** Risolvi in $k$ (${m < 0 ? "dividendo per un numero negativo il verso si inverte" : "dividendo per un numero positivo il verso resta"}) e togli $k = ${a}$.`, `${setToInequalityLatex(correct, { variable: "k" })}`),
      ];
    }
    case "signs": {
      const { b, c } = model;
      const t = R(b * b).div(4).sub(c);
      const constant = c === 0 ? "k" : toLatex(add(k, num(c)));
      const deltaLatex = toLatex(add(num(b * b - 4 * c), monomial(-4, 1, k)));
      return [
        step("**Passo 1.** Distinte: $\\Delta > 0$.", `\\Delta = ${inParens(b)}^{2} - 4${c === 0 ? "k" : `\\left(${constant}\\right)`} = ${deltaLatex} > 0 \\quad\\Longrightarrow\\quad k < ${toLatex(num(t))}`),
        step(`**Passo 2.** Dello stesso segno: il prodotto $p = \\dfrac{c}{a} = ${constant}$ deve essere positivo, $k > ${-c}$.`),
        step(`**Passo 3.** Il segno lo dice la somma: $s = -\\dfrac{b}{a} = ${-b}$, ${b < 0 ? "positiva: le soluzioni sono positive" : "negativa: le soluzioni sono negative"} per ogni $k$.`),
        step("**Passo 4.** Le condizioni devono valere **insieme** (a sistema): si prende l'intersezione.", `${-c} < k < ${toLatex(num(t))}`),
      ];
    }
  }
}

function hintsOf(model: Model): [string, string] {
  if (model.kind === "given") {
    return ["Che cosa vuol dire che un numero è una soluzione?", "Sostituisci il numero al posto di $x$: resta un'equazione di primo grado in $k$."];
  }
  const first =
    model.kind === "leading"
      ? "Il parametro è nel coefficiente di $x^2$: per quale $k$ l'equazione non è più di secondo grado?"
      : "Le domande sul numero di soluzioni di un'equazione di secondo grado sono domande sul discriminante.";
  const second =
    model.kind === "signs"
      ? "Servono tre condizioni insieme: $\\Delta > 0$, il segno del prodotto $\\dfrac{c}{a}$ e quello della somma $-\\dfrac{b}{a}$. Scrivi l'insieme dei $k$ come $0 < k < 5$ o come intervallo."
      : "Calcola $\\Delta$ in funzione di $k$ e risolvi la disuguaglianza: se dividi per un numero negativo il verso si inverte. Scrivi la risposta come $k \\le 4$ o come intervallo.";
  return [first, second];
}

function draftOf(model: Model): ExerciseDraft {
  if (model.kind === "given") {
    const correct = num(correctNumber(model));
    return {
      prompt: promptOf(model),
      answer: { kind: "number", correct, wrong: wrongNumbers(model, correctNumber(model)), mode: exact },
      steps: stepsOf(model),
      hints: hintsOf(model),
    };
  }
  const correct = correctSet(model);
  return {
    prompt: promptOf(model),
    answer: { kind: "set", variable: "k", correct, wrong: wrongSets(model, correct) },
    steps: stepsOf(model),
    hints: hintsOf(model),
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

/** I coefficienti dell'equazione del testo come funzioni di k: ogni coefficiente è di primo grado in k,
 *  quindi bastano i polinomi che il motore ricava per k = 0 e per k = 1. */
type Coefficients = (value: Rational) => readonly Rational[] | null;

function coefficientsOf(model: Model): Coefficients {
  const at0 = exprToUPoly(expand(substitute(equationOf(model), { k: num(0) })));
  const at1 = exprToUPoly(expand(substitute(equationOf(model), { k: num(1) })));
  if (!at0 || !at1) return () => null;
  return (value) => [0, 1, 2].map((i) => {
    const c0 = at0[i] ?? Rational.ZERO;
    const c1 = at1[i] ?? Rational.ZERO;
    return c0.add(c1.sub(c0).mul(value));
  });
}

/** Le soluzioni reali distinte con k fissato. */
function rootsAt(coefficients: Coefficients, value: Rational): Surd[] | "degenerate" {
  const p = coefficients(value);
  if (!p || (p[2] as Rational).isZero()) return "degenerate";
  const [c, b, a] = p as [Rational, Rational, Rational];
  const delta = b.mul(b).sub(a.mul(c).mul(4));
  if (delta.sign() < 0) return [];
  if (delta.isZero()) return [Surd.from(b.neg().div(a.mul(2)))];
  const center = Surd.from(b.neg().div(a.mul(2)));
  const offset = Surd.sqrt(delta).div(a.mul(2).abs());
  return [center.sub(offset), center.add(offset)];
}

/** Vero se con k = value l'equazione ha le soluzioni che il testo chiede. */
function wanted(model: Model, coefficients: Coefficients, value: Rational): boolean {
  const roots = rootsAt(coefficients, value);
  if (roots === "degenerate") return false;
  switch (model.kind) {
    case "constant":
      return model.ask === "real" ? roots.length > 0 : model.ask === "distinct" ? roots.length === 2 : roots.length === 0;
    case "leading":
      return roots.length === 2;
    case "signs":
      return roots.length === 2 && roots.every((r) => r.sign() === (model.b < 0 ? 1 : -1));
    case "given":
      return false;
  }
}

/** Vero se value sta nell'insieme (estremi razionali, confronto esatto). */
function inSet(set: RealSet, value: Rational): boolean {
  return set.pieces.some((piece) => {
    const lower = piece.lower;
    const upper = piece.upper;
    if (typeof lower !== "string" && lower.kind === "num") {
      const order = value.cmp(lower.value);
      if (order < 0 || (order === 0 && !piece.lowerClosed)) return false;
    }
    if (typeof upper !== "string" && upper.kind === "num") {
      const order = value.cmp(upper.value);
      if (order > 0 || (order === 0 && !piece.upperClosed)) return false;
    }
    return true;
  });
}

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A08",
  lesson: "V1.M05.L08",
  title: "Equazioni parametriche",
  levels: [1, 2, 3],
  errors: [
    "DISEQ.VERSO_NON_INVERTITO", "DISEQ.ESTREMI", "CALC.REGOLA_SEGNI", "ALG.PARAMETRO_COEFFICIENTE",
    "ALG.SOMMA_PRODOTTO", "DISEQ.UNIONE_INTERSEZIONE", "CALC.SEGNO_TRASPORTO", "CALC.MENO_POTENZA", "ALG.COEFFICIENTE_INVERTITO",
  ],
  limits: { maxInteger: 40, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const { answer } = exercise;
    if (model.kind === "given") {
      // Con il k trovato, x = r rende vera l'equazione del testo.
      if (answer.kind !== "number" || answer.correct.kind !== "num") return false;
      const p = exprToUPoly(expand(substitute(equationOf(model), { k: answer.correct })));
      return p !== null && p.reduceRight<Rational>((acc, coefficient) => acc.mul(model.r).add(coefficient), Rational.ZERO).isZero();
    }
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    // Per tanti valori di k (una griglia fitta e gli estremi con i dintorni) si risolve davvero l'equazione
    // e si controlla che k sta nella risposta se e solo se le soluzioni sono come chiede il testo.
    const set = answer.correct;
    const probes: Rational[] = [];
    for (let i = -60; i <= 60; i++) probes.push(Rational.of(i, 3));
    for (const piece of set.pieces) {
      for (const end of [piece.lower, piece.upper]) {
        if (typeof end === "string" || end.kind !== "num") continue;
        probes.push(end.value, end.value.add(Rational.of(1, 97)), end.value.sub(Rational.of(1, 97)));
      }
    }
    if (model.kind === "leading") probes.push(R(model.a));
    const coefficients = coefficientsOf(model);
    return probes.every((value) => wanted(model, coefficients, value) === inSet(set, value));
  },
});
