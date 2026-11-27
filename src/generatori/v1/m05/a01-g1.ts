// V1.M05.A01.g1 — Equazioni di primo grado intere, anche con frazioni numeriche (risposta: insieme).
//
// Costruzione all'indietro: si sceglie prima la soluzione (oppure il caso impossibile o indeterminato),
// poi i termini dei due membri; l'ultimo numero si ricava perché la soluzione sia proprio quella.
// Ogni membro è un elenco di termini c·(px + q)/d: così si possono rifare i conti anche sbagliando,
// un errore alla volta, e i passaggi seguono i quattro passi della lezione V1.M05.L01.
//
// Livello 1: ax + b = cx + d, oppure a(x + p) = cx + d.
// Livello 2: un meno davanti a una parentesi, due parentesi, oppure due frazioni e un numero.
// Livello 3: equazione impossibile (con un meno davanti alla parentesi) o impossibile e indeterminata con le frazioni,
//            frazioni in tutti e due i membri con soluzione frazionaria.
//
// Errori tipici, rifatti sui numeri:
//   CALC.SEGNO_TRASPORTO            i termini con la x del secondo membro, o i numeri del primo, passano senza cambiare segno;
//   CALC.MENO_PARENTESI             −c(px + q) diventa −cpx + cq: cambia segno solo il primo termine;
//   ALG.TERMINE_SENZA_DENOMINATORE  togliendo i denominatori, i termini senza frazione non si moltiplicano per il mcm;
//   ALG.COEFFICIENTE_INVERTITO      da ax = b si scrive x = a/b;
//   ALG.ZERO_PER_X                  da 0·x = b si scrive x = b.

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { add, div, mul, neg, num, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { Surd } from "../../../motore/numbers/surd";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { allReals, emptySet, isClean, monomial, pointSet, sameSet, satisfies, solutionsFromCandidates, step } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";
import type { ExpectedWrong } from "../../../esercizi";

const CODE = "V1.M05.A01.g1";
type Rng_ = GeneratorContext["rng"];
const x = sym("x");

/** Un termine c·(px + q)/d. Con `paren` falso il termine è un monomio solo (p = 0 oppure q = 0). */
interface Term {
  readonly c: number;
  readonly p: number;
  readonly q: number;
  readonly d: number;
  readonly paren: boolean;
}

interface Model {
  readonly left: readonly Term[];
  readonly right: readonly Term[];
  /** Vero se una frazione del testo si può semplificare (succede solo nelle equazioni senza x finale). */
  readonly reducible?: boolean;
}

/** Il valore lineare A·x + B, con numeri esatti. */
interface Linear {
  readonly a: Rational;
  readonly b: Rational;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const xTerm = (k: number): Term => ({ c: 1, p: k, q: 0, d: 1, paren: false });
const constTerm = (k: number): Term => ({ c: 1, p: 0, q: k, d: 1, paren: false });
const paren = (c: number, p: number, q: number): Term => ({ c, p, q, d: 1, paren: true });
const fraction = (sign: number, p: number, q: number, d: number): Term => ({ c: sign, p, q, d, paren: true });

/** Il valore di un termine (giusto). */
const termValue = (t: Term): Linear => ({ a: Rational.of(t.c * t.p, t.d), b: Rational.of(t.c * t.q, t.d) });
const sum = (values: readonly Linear[]): Linear =>
  values.reduce((acc, v) => ({ a: acc.a.add(v.a), b: acc.b.add(v.b) }), { a: Rational.ZERO, b: Rational.ZERO });
const sideValue = (side: readonly Term[]): Linear => sum(side.map(termValue));
/** Il valore del membro in un punto razionale. */
const at = (v: Linear, value: Rational): Rational => v.a.mul(value).add(v.b);

/** L'ultimo termine numerico del secondo membro che rende vera l'equazione per x = s. */
function closeWith(left: readonly Term[], right: readonly Term[], s: number): Model {
  const missing = at(sideValue(left), Rational.of(s)).sub(at(sideValue(right), Rational.of(s)));
  return { left, right: missing.isZero() ? right : [...right, constTerm(missing.toInteger())] };
}

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const s = rng.int(-8, 8);
    const shape = rng.pick(["sides", "sides", "paren"] as const);
    let model: Model;
    if (shape === "sides") {
      const [a, c] = rng.sample([-3, -2, 2, 3, 4, 5, 6, 7], 2) as [number, number];
      model = closeWith([xTerm(a), constTerm(rng.intExcept(-9, 9))], [xTerm(c)], s);
    } else {
      const a = rng.int(2, 5);
      const c = rng.pick([1, 2, 3, 4, 5, 6, 7].filter((value) => value !== a));
      model = closeWith([paren(a, 1, rng.intExcept(-6, 6))], [xTerm(c)], s);
    }
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const s = rng.int(-7, 7);
    const shape = rng.pick(["minus", "minus", "twoParen", "fractions", "fractions"] as const);
    let model: Model;
    switch (shape) {
      case "minus": {
        // ax − c(px + q) = rx + k
        const a = rng.int(2, 7);
        const c = rng.pick([1, 1, 2, 3]);
        const p = rng.int(1, 3);
        const r = rng.intExcept(-4, 5, [0, a - c * p]);
        model = closeWith([xTerm(a), paren(-c, p, rng.intExcept(-6, 6))], [xTerm(r)], s);
        break;
      }
      case "twoParen": {
        // a(x + p) + k = c(x + q) + h
        const [a, c] = rng.sample([-3, -2, 2, 3, 4, 5], 2) as [number, number];
        model = closeWith([paren(a, 1, rng.intExcept(-5, 5)), constTerm(rng.intExcept(-6, 6))], [paren(c, 1, rng.intExcept(-5, 5))], s);
        break;
      }
      case "fractions": {
        // (x + p)/m ∓ (x + q)/n = k, con k intero: si scelgono p e q che rendono interi i due quozienti in x = s.
        const [m, n] = rng.sample([2, 3, 4, 5, 6], 2) as [number, number];
        const sign = rng.pick([-1, -1, 1]);
        const p1 = rng.pick([1, 1, 2]);
        const q1 = m * rng.int(-3, 3) - p1 * s;
        const q2 = n * rng.int(-3, 3) - s;
        model = closeWith([fraction(1, p1, q1, m), fraction(sign, 1, q2, n)], [], s);
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["special", "specialFractions", "bothFractions", "bothFractions", "bothFractions"] as const);
    let model: Model;
    if (shape === "special") {
      // a(x + p) − c(rx + q) = (a − cr)x + k con k diverso dal numero che resta: impossibile (0·x = numero).
      const a = rng.int(2, 6);
      const c = rng.pick([1, 1, 2, 3]);
      const r = rng.int(1, 3);
      const p = rng.intExcept(-5, 5);
      const q = rng.intExcept(-6, 6);
      const free = a * p - c * q;
      const k = free + rng.intExcept(-5, 5);
      model = { left: [paren(a, 1, p), paren(-c, r, q)], right: [xTerm(a - c * r), constTerm(k)] };
      if (a - c * r === 0) continue;
    } else if (shape === "specialFractions") {
      // (px + q)/m − (rx + h)/n = Ax + k con p/m − r/n = A: i termini con la x si cancellano.
      // Con k uguale al numero che resta è indeterminata, altrimenti impossibile.
      const [m, n] = rng.sample([2, 3, 4, 6], 2) as [number, number];
      const r = rng.pick([1, 1, 2, 3]);
      const a = rng.pick([1, 1, 2]);
      if ((m * (a * n + r)) % n !== 0) continue;
      const p = (m * (a * n + r)) / n;
      const q = rng.intExcept(-7, 7);
      const h = rng.intExcept(-7, 7);
      const free = Rational.of(q, m).sub(Rational.of(h, n));
      const indeterminate = rng.bool();
      // Con il numero che resta uguale a 0 alcuni errori danno la stessa risposta: si scarta.
      if (free.isZero() || (indeterminate && !free.isInteger())) continue;
      const k = indeterminate ? free.toInteger() : Math.round(free.toNumber()) + rng.intExcept(-3, 3);
      if (!indeterminate && free.eq(k)) continue;
      // Al più una delle due frazioni si può semplificare.
      if (gcd(gcd(p, Math.abs(q)), m) > 1 && gcd(gcd(r, Math.abs(h)), n) > 1) continue;
      model = { left: [fraction(1, p, q, m), fraction(-1, r, h, n)], right: k === 0 ? [xTerm(a)] : [xTerm(a), constTerm(k)], reducible: true };
    } else {
      // (px + q)/m ∓ (x + h)/n = x/l + k con soluzione frazionaria (denominatore 2, 3 o 4).
      const [m, n] = rng.sample([2, 3, 4, 6], 2) as [number, number];
      const l = rng.pick([2, 3, 4, 6].filter((value) => value !== m && value !== n));
      const left = [fraction(1, rng.pick([1, 2, 3]), rng.intExcept(-5, 5), m), fraction(rng.pick([-1, 1]), 1, rng.intExcept(-5, 5), n)];
      const right = [fraction(rng.pick([-1, 1]), 1, 0, l)];
      const s = Rational.of(rng.intExcept(-9, 9), rng.pick([2, 3, 4]));
      const missing = at(sideValue(left), s).sub(at(sideValue(right), s));
      if (!missing.isInteger() || missing.abs().cmp(9) > 0) continue;
      model = { left, right: missing.isZero() ? right : [...right, constTerm(missing.toInteger())] };
      if (solve(sideValue(model.left), sideValue(model.right)).kind !== "one") continue;
    }
    if (acceptable(model, 3)) return model;
  }
}

/** Un modello va bene se i numeri sono piccoli e restano abbastanza risposte sbagliate diverse. */
function acceptable(model: Model, minimumWrong: number): boolean {
  const all = [...model.left, ...model.right];
  if (all.some((t) => Math.abs(t.q) > 30 || (t.paren && t.p === 0))) return false;
  // Una frazione già semplificabile ((2x + 4)/4) non si scrive, salvo nelle equazioni impossibili e
  // indeterminate con le frazioni: lì i numeri sono legati (i termini con la x devono cancellarsi).
  if (!model.reducible && all.some((t) => t.d > 1 && gcd(gcd(Math.abs(t.p), Math.abs(t.q)), t.d) > 1)) return false;
  if (model.right.length === 0 && model.left.length === 0) return false;
  const correct = answerOf(model);
  return wrongAnswers(model, correct).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── soluzione, giusta e sbagliata ─────────────────────────────

type Outcome = { readonly kind: "one"; readonly value: Rational } | { readonly kind: "none" } | { readonly kind: "all" };

/** Risolve A₁x + B₁ = A₂x + B₂. */
function solve(left: Linear, right: Linear): Outcome {
  const a = left.a.sub(right.a);
  const b = right.b.sub(left.b);
  if (a.isZero()) return b.isZero() ? { kind: "all" } : { kind: "none" };
  return { kind: "one", value: b.div(a) };
}

function setOf(outcome: Outcome): RealSet {
  return outcome.kind === "one" ? pointSet([Surd.from(outcome.value)]) : outcome.kind === "none" ? emptySet : allReals;
}

/** Un'equazione ax = b già ridotta, risolta (o sbagliata) in un set, scartando i numeri poco puliti. */
function cleanSet(outcome: Outcome): RealSet | null {
  if (outcome.kind === "one" && !isClean(outcome.value, 40, 12)) return null;
  return setOf(outcome);
}

const answerOf = (model: Model): RealSet => setOf(solve(sideValue(model.left), sideValue(model.right)));

/** Il minimo comune denominatore dei termini. */
const lcmOf = (model: Model): number => [...model.left, ...model.right].reduce((acc, t) => lcm(acc, t.d), 1);
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const left = sideValue(model.left);
  const right = sideValue(model.right);

  // Trasporto senza cambiare segno: i termini con la x del secondo membro (A₁ + A₂)x = B₂ − B₁.
  const xNotFlipped = cleanSet(solve({ a: left.a.add(right.a), b: left.b }, { a: Rational.ZERO, b: right.b }));
  // … oppure i numeri del primo membro: (A₁ − A₂)x = B₂ + B₁.
  const numberNotFlipped = cleanSet(solve({ a: left.a, b: Rational.ZERO }, { a: right.a, b: right.b.add(left.b) }));

  // Meno davanti a una parentesi: −c(px + q) diventa −cpx + cq (il primo termine giusto, il secondo no).
  const sloppy = (side: readonly Term[]): readonly Term[] => side.map((t) => (t.paren && t.c < 0 && t.p !== 0 && t.q !== 0 ? { ...t, q: -t.q } : t));
  const hasMinus = [...model.left, ...model.right].some((t) => t.paren && t.c < 0 && t.q !== 0);
  const minus = hasMinus ? cleanSet(solve(sideValue(sloppy(model.left)), sideValue(sloppy(model.right)))) : null;

  // Denominatori tolti senza moltiplicare i termini interi per il mcm.
  const m = lcmOf(model);
  const scaled = (side: readonly Term[]): Linear => sum(side.map((t) => {
    const v = termValue(t);
    const factor = t.d === 1 ? 1 : m;
    return { a: v.a.mul(factor), b: v.b.mul(factor) };
  }));
  const hasWhole = [...model.left, ...model.right].some((t) => t.d === 1);
  const forgotten = m > 1 && hasWhole ? cleanSet(solve(scaled(model.left), scaled(model.right))) : null;

  // Da ax = b scrive x = a/b.
  const reduced = solve(left, right);
  let inverted: RealSet | null = null;
  if (reduced.kind === "one" && !reduced.value.isZero()) inverted = cleanSet({ kind: "one", value: reduced.value.inv() });
  // Da 0·x = b scrive x = b.
  const zeroDropped = reduced.kind === "one" ? null : cleanSet({ kind: "one", value: right.b.sub(left.b) });

  return distinctWrongSets(correct, [
    xNotFlipped && { error: "CALC.SEGNO_TRASPORTO", value: xNotFlipped },
    minus && { error: "CALC.MENO_PARENTESI", value: minus },
    forgotten && { error: "ALG.TERMINE_SENZA_DENOMINATORE", value: forgotten },
    numberNotFlipped && { error: "CALC.SEGNO_TRASPORTO", value: numberNotFlipped },
    inverted && { error: "ALG.COEFFICIENTE_INVERTITO", value: inverted },
    zeroDropped && { error: "ALG.ZERO_PER_X", value: zeroDropped },
  ]);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

/** p·x + q scritto a mano. */
function linearExpr(p: Rational | number, q: Rational | number): Expr {
  const pieces: Expr[] = [];
  if (!Rational.from(p).isZero()) pieces.push(monomial(p, 1));
  if (!Rational.from(q).isZero() || pieces.length === 0) pieces.push(num(Rational.from(q)));
  return pieces.length === 1 ? (pieces[0] as Expr) : add(...pieces);
}

/** Il termine com'è scritto nel testo, senza il segno davanti (il segno lo mette sideExpr). */
function termBody(t: Term): Expr {
  const inner = linearExpr(t.p, t.q);
  const size = Math.abs(t.c);
  if (t.d > 1) return div(inner, t.d);
  if (!t.paren) return linearExpr(t.c * t.p, t.c * t.q);
  return size === 1 ? inner : mul(size, inner);
}

/** Un membro come somma di termini, con i meno davanti dove servono. */
function sideExpr(side: readonly Term[]): Expr {
  if (side.length === 0) return num(0);
  const pieces = side.map((t) => {
    const body = termBody(t);
    if (!t.paren) return body; // il segno è già nel monomio
    return t.c < 0 ? neg(body) : body;
  });
  return pieces.length === 1 ? (pieces[0] as Expr) : add(...pieces);
}

/** I monomi di un membro dopo aver tolto parentesi e denominatori (moltiplicati per factor), nell'ordine. */
function expandedTerms(side: readonly Term[], factor: number): Rational[][] {
  return side.map((t) => [Rational.of(t.c * t.p * factor, t.d), Rational.of(t.c * t.q * factor, t.d)]);
}

/** Somma di monomi (coefficiente, grado) scritta così com'è, senza ridurre. */
function rawSum(pieces: readonly (readonly [Rational, number])[]): Expr {
  const kept = pieces.filter(([c]) => !c.isZero()).map(([c, deg]) => monomial(c, deg));
  return kept.length === 0 ? num(0) : kept.length === 1 ? (kept[0] as Expr) : add(...kept);
}

function steps(model: Model, correct: RealSet): SolutionStep[] {
  const result: SolutionStep[] = [];
  const m = lcmOf(model);
  const lhs = expandedTerms(model.left, m);
  const rhs = expandedTerms(model.right, m);
  const asPieces = (terms: Rational[][]): [Rational, number][] => terms.flatMap(([p, q]) => [[p as Rational, 1], [q as Rational, 0]] as [Rational, number][]);

  // Passo 1: parentesi e denominatori.
  const hasParen = [...model.left, ...model.right].some((t) => t.paren);
  if (m > 1) {
    const multiplied = (side: readonly Term[]): Expr => {
      const pieces = side.map((t) => {
        const k = (m / t.d) * t.c;
        if (t.d === 1 && !t.paren) return linearExpr(k * t.p, k * t.q);
        const inner = linearExpr(t.p, t.q);
        return k === 1 ? inner : k === -1 ? neg(inner) : mul(k, inner);
      });
      return pieces.length === 0 ? num(0) : pieces.length === 1 ? (pieces[0] as Expr) : add(...pieces);
    };
    result.push(step(`**Passo 1.** Il minimo comune denominatore è $${m}$: moltiplica per $${m}$ **ogni** termine dei due membri, anche quelli senza denominatore. Poi togli le parentesi, cambiando il segno di ogni termine dentro una parentesi preceduta dal meno.`, `${toLatex(multiplied(model.left))} = ${toLatex(multiplied(model.right))} \\quad\\Longrightarrow\\quad ${toLatex(rawSum(asPieces(lhs)))} = ${toLatex(rawSum(asPieces(rhs)))}`));
  } else if (hasParen) {
    result.push(step("**Passo 1.** Togli le parentesi: moltiplica il numero davanti per ogni termine dentro. Un meno davanti alla parentesi cambia il segno di **ogni** termine.", `${toLatex(rawSum(asPieces(lhs)))} = ${toLatex(rawSum(asPieces(rhs)))}`));
  } else {
    result.push(step("**Passo 1.** Non ci sono parentesi né denominatori: si passa subito a separare."));
  }

  // Passo 2: separa (x a sinistra, numeri a destra) cambiando segno a chi passa.
  const xs: [Rational, number][] = [...lhs.map(([p]) => [p as Rational, 1] as [Rational, number]), ...rhs.map(([p]) => [(p as Rational).neg(), 1] as [Rational, number])];
  const ns: [Rational, number][] = [...rhs.map(([, q]) => [q as Rational, 0] as [Rational, number]), ...lhs.map(([, q]) => [(q as Rational).neg(), 0] as [Rational, number])];
  result.push(step(
    "**Passo 2.** Porta i termini con la $x$ al primo membro e i numeri al secondo: chi passa dall'altra parte dell'uguale cambia segno.", `${toLatex(rawSum(xs))} = ${toLatex(rawSum(ns))}`));

  // Passo 3: riduci.
  const a = xs.reduce((acc, [c]) => acc.add(c), Rational.ZERO);
  const b = ns.reduce((acc, [c]) => acc.add(c), Rational.ZERO);
  const reducedLatex = a.isZero() ? `0 \\cdot x = ${toLatex(num(b))}` : `${toLatex(monomial(a, 1))} = ${toLatex(num(b))}`;
  result.push(step("**Passo 3.** Somma i termini simili.", reducedLatex));

  // Passo 4: dividi e controlla.
  const outcome = solve(sideValue(model.left), sideValue(model.right));
  if (outcome.kind === "one") {
    const value = outcome.value;
    const check = toLatex(num(at(sideValue(model.left), value)));
    const control = `Controllo: con $x = ${toLatex(num(value))}$ i due membri valgono tutti e due $${check}$.`;
    const text = a.eq(1)
      ? `**Passo 4.** Il coefficiente di $x$ è già $1$. ${control}`
      : a.eq(-1)
        ? `**Passo 4.** Il coefficiente di $x$ è $-1$: moltiplica i due membri per $-1$. ${control}`
        : `**Passo 4.** Dividi i due membri per $${toLatex(num(a))}$: il coefficiente va al denominatore. ${control}`;
    const division = a.abs().eq(1) ? "" : `\\frac{${toLatex(num(b))}}{${toLatex(num(a))}} = `;
    result.push(step(text, `x = ${division}${toLatex(num(value))} \\qquad S = ${setToLatex(correct)}`));
  } else if (outcome.kind === "none") {
    result.push(step(`**Passo 4.** Non si può dividere per $0$: nessun numero moltiplicato per $0$ dà $${toLatex(num(b))}$. L'equazione è impossibile.`, `S = ${setToLatex(correct)}`));
  } else {
    result.push(step("**Passo 4.** Non si può dividere per $0$, ma $0 \\cdot x = 0$ vale per ogni numero: l'equazione è indeterminata.", `S = ${setToLatex(correct)}`));
  }
  return result;
}

/** Il LaTeX del testo: frazioni grandi (\\dfrac), che in riga si leggono meglio. */
const display = (expr: Expr): string => toLatex(expr).replace(/\\frac/g, "\\dfrac");

function draftOf(model: Model): ExerciseDraft {
  const correct = answerOf(model);
  const m = lcmOf(model);
  return {
    prompt: `Risolvi l'equazione $${display(sideExpr(model.left))} = ${display(sideExpr(model.right))}$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: steps(model, correct),
    hints: [
      "È un'equazione di primo grado: con i principi di equivalenza la riduci alla forma $ax = b$. Che cosa devi togliere per primo?",
      m > 1
        ? `Moltiplica tutti e due i membri per il minimo comune denominatore, $${m}$, termine per termine. Se i termini con la $x$ si cancellano, guarda il numero che resta: $S = \\emptyset$ oppure $S = \\mathbb{R}$.`
        : "Togli le parentesi, porta i termini con la $x$ a sinistra e i numeri a destra cambiando segno a chi passa. Se i termini con la $x$ si cancellano, guarda il numero che resta: $S = \\emptyset$ oppure $S = \\mathbb{R}$.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A01",
  lesson: "V1.M05.L01",
  title: "Equazioni di primo grado",
  levels: [1, 2, 3],
  errors: ["CALC.SEGNO_TRASPORTO", "CALC.MENO_PARENTESI", "ALG.TERMINE_SENZA_DENOMINATORE", "ALG.COEFFICIENTE_INVERTITO", "ALG.ZERO_PER_X"],
  limits: { maxInteger: 40, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal testo: primo membro meno secondo membro, sviluppato dal motore.
    const left = sideExpr(model.left);
    const right = sideExpr(model.right);
    const difference = add(left, neg(right));
    // Indeterminata: la differenza vale 0 in tre punti diversi (è di primo grado, quindi è nulla).
    const zeroAt = (value: number): boolean => satisfies(left, right, Surd.from(value));
    if (zeroAt(0) && zeroAt(1) && zeroAt(-7)) return sameSet(answer.correct, allReals);
    const found = solutionsFromCandidates([difference], (value) => satisfies(left, right, value));
    return found !== null && sameSet(found, answer.correct);
  },
});
