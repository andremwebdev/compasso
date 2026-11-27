// V1.M04.A02.g1 — Somma e prodotto di polinomi.
//
// Risposta: un'espressione, il polinomio ridotto (vincolo `expanded`). All'indietro: si scelgono i
// polinomi (coefficienti piccoli, interi) e i «termini» dell'espressione: ogni termine è un prodotto di
// uno, due o tre polinomi, con un segno davanti. Il risultato è la somma dei termini, ridotta.
//
// Le risposte sbagliate rifanno il conto con UN errore in UN termine:
// - CALC.MENO_PARENTESI: il meno davanti a una parentesi (o a un prodotto) cambia il segno solo del
//   primo termine, oppure di nessuno;
// - CALC.REGOLA_SEGNI: in un prodotto, uno dei prodotti parziali con un fattore negativo preso con il
//   segno sbagliato;
// - CALC.PROPRIETA_POTENZE: in un prodotto, gli esponenti della stessa lettera moltiplicati invece che
//   sommati (x · x² = x², x² · x² = x⁴ giusto per caso: lì l'errore non si vede).
//
// Livello 1: una differenza di due trinomi, un monomio per un trinomio, un binomio per un binomio.
// Livello 2: un binomio per un trinomio; un prodotto di binomi più o meno un monomio per un binomio
//   (come l'esempio «Prodotti e differenze insieme» della lezione); un polinomio meno un prodotto.
// Livello 3: due lettere (x e y), oppure il prodotto di tre binomi.
//
// Verifica: l'espressione del testo si ricostruisce con il motore e si confronta per equivalenza.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { mono, monoExpr, polyAdd, polyEq, polyExpr, polyMul, polyNeg, reduce, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const MINUS: ErrorCode = "CALC.MENO_PARENTESI";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const POWERS: ErrorCode = "CALC.PROPRIETA_POTENZE";

/** Un termine dell'espressione: il prodotto dei suoi fattori, con un segno davanti. */
interface Term {
  readonly sign: 1 | -1;
  readonly factors: readonly Poly[];
}

interface Model {
  readonly terms: readonly Term[];
}

// ───────────────────────────── conti giusti e sbagliati ─────────────────────────────

/** I prodotti parziali di due polinomi, nell'ordine in cui si fanno: ogni termine del primo per ogni termine del secondo. */
function partials(a: Poly, b: Poly, exponents: (p: number, q: number) => number = (p, q) => p + q): Mono[] {
  return a.flatMap((m) => b.map((n) => ({ c: m.c.mul(n.c), x: exponents(m.x, n.x), y: exponents(m.y, n.y) })));
}

/** Il prodotto dei fattori, ridotto. */
const productOf = (factors: readonly Poly[]): Poly => factors.reduce<Poly>((acc, f) => polyMul(acc, f), [mono(1)]);

/** Il valore giusto di un termine, segno compreso. */
const valueOf = (term: Term): Poly => (term.sign === 1 ? productOf(term.factors) : polyNeg(productOf(term.factors)));

/** I valori sbagliati di un termine, ognuno con il suo errore. */
function wrongValues(term: Term): { error: ErrorCode; value: Poly }[] {
  const out: { error: ErrorCode; value: Poly }[] = [];
  const product = productOf(term.factors);
  if (term.sign === -1) {
    // Il meno cambia segno solo al primo termine (come si scrive: la parentesi del testo, o il prodotto sviluppato)…
    const written = term.factors.length === 1 ? (term.factors[0] as Poly) : product;
    out.push({ error: MINUS, value: reduce(written.map((m, k) => (k === 0 ? { ...m, c: m.c.neg() } : m))) });
    // …oppure a nessuno: la parentesi è stata tolta senza cambiare i segni.
    out.push({ error: MINUS, value: product });
  }
  if (term.factors.length >= 2) {
    const [a, b] = term.factors as [Poly, Poly];
    const rest = term.factors.slice(2);
    const withSign = (p: Poly): Poly => (term.sign === 1 ? p : polyNeg(p));
    const finish = (firstTwo: Poly): Poly => withSign(productOf([reduce(firstTwo), ...rest]));
    // Un prodotto parziale con un fattore negativo preso con il segno sbagliato (il primo e l'ultimo che ci sono).
    const parts = partials(a, b);
    const negatives = parts.map((_, k) => k).filter((k) => {
      const [m, n] = [a[Math.floor(k / b.length)] as Mono, b[k % b.length] as Mono];
      return m.c.sign() < 0 || n.c.sign() < 0;
    });
    for (const k of new Set([negatives[0], negatives[negatives.length - 1]])) {
      if (k === undefined) continue;
      out.push({ error: SIGNS, value: finish(parts.map((m, j) => (j === k ? { ...m, c: m.c.neg() } : m))) });
    }
    // Esponenti della stessa lettera moltiplicati (quando la lettera c'è in tutti e due i termini e almeno
    // un esponente supera 1: x · x² = x², non credibile x · x = x).
    const times = (p: number, q: number): number => (p > 0 && q > 0 && p + q > 2 ? p * q : p + q);
    if (a.some((m) => b.some((n) => (m.x > 0 && n.x > 0 && m.x + n.x > 2) || (m.y > 0 && n.y > 0 && m.y + n.y > 2)))) {
      out.push({ error: POWERS, value: finish(partials(a, b, times)) });
    }
  }
  return out;
}

const total = (terms: readonly Term[], replace?: { index: number; value: Poly }): Poly =>
  polyAdd(...terms.map((term, k) => (replace && replace.index === k ? replace.value : valueOf(term))));

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const X = (c: number, e = 1): Mono => mono(c, e, 0);
const K = (c: number): Mono => mono(c);
/** Il binomio p·x + q. */
const linear = (p: number, q: number): Poly => [X(p), K(q)];
const nz = (rng: Rng_, max: number, excluded: number[] = []): number => rng.intExcept(-max, max, [0, ...excluded]);

/** Un trinomio di secondo grado a x² + b x + c con almeno un coefficiente negativo. */
function trinomial(rng: Rng_, maxA: number, max: number): Poly {
  for (;;) {
    const p: Poly = [X(rng.intExcept(-maxA, maxA), 2), X(nz(rng, max)), K(nz(rng, max))];
    if (p.some((m) => m.c.sign() < 0)) return p;
  }
}

function buildLevel1(rng: Rng_): Model {
  const shape = rng.pick(["difference", "difference", "monomialTimes", "monomialTimes", "binomials", "binomials"] as const);
  switch (shape) {
    case "difference":
      return { terms: [{ sign: 1, factors: [trinomial(rng, 5, 7)] }, { sign: -1, factors: [trinomial(rng, 4, 7)] }] };
    case "monomialTimes":
      return { terms: [{ sign: 1, factors: [[X(nz(rng, 5, [1]), rng.int(1, 2))], trinomial(rng, 4, 6)] }] };
    case "binomials":
      return { terms: [{ sign: 1, factors: [linear(rng.pick([1, 1, 2, 3]), nz(rng, 7)), linear(1, nz(rng, 7))] }] };
  }
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["binomialTrinomial", "binomialTrinomial", "productsAndMonomial", "productsAndMonomial", "minusProduct"] as const);
  switch (shape) {
    case "binomialTrinomial":
      return { terms: [{ sign: 1, factors: [linear(rng.int(1, 3), nz(rng, 5)), [X(1, 2), X(nz(rng, 4)), K(nz(rng, 5))]] }] };
    case "productsAndMonomial":
      // (x + a)(x + b) ± k(x² + c x): come l'esempio della lezione.
      return {
        terms: [
          { sign: 1, factors: [linear(1, nz(rng, 6)), linear(rng.pick([1, 2]), nz(rng, 6))] },
          { sign: rng.sign(), factors: [[K(rng.int(2, 4))], [X(1, 2), X(nz(rng, 5))]] },
        ],
      };
    case "minusProduct":
      // a x² + b x + c − (p x + q)(x + r): il meno vale per tutto il prodotto.
      return { terms: [{ sign: 1, factors: [trinomial(rng, 4, 6)] }, { sign: -1, factors: [linear(rng.int(1, 3), nz(rng, 5)), linear(1, nz(rng, 5))] }] };
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["twoLetters", "twoLetters", "twoProducts", "twoProducts", "threeBinomials"] as const);
  const Y = (c: number, e = 1): Mono => mono(c, 0, e);
  const XY = (c: number): Mono => mono(c, 1, 1);
  switch (shape) {
    case "twoLetters":
      // (p x + q y)(x² + b xy + c y²)
      return { terms: [{ sign: 1, factors: [[X(rng.int(1, 3)), Y(nz(rng, 3))], [X(1, 2), XY(nz(rng, 3)), Y(nz(rng, 3), 2)]] }] };
    case "twoProducts":
      // (x + a y)(x + b y) − (x + c y)(p x + d y)
      return {
        terms: [
          { sign: 1, factors: [[X(1), Y(nz(rng, 4))], [X(rng.int(1, 2)), Y(nz(rng, 4))]] },
          { sign: -1, factors: [[X(1), Y(nz(rng, 3))], [X(rng.int(1, 2)), Y(nz(rng, 3))]] },
        ],
      };
    case "threeBinomials":
      return { terms: [{ sign: 1, factors: [linear(1, nz(rng, 3)), linear(1, nz(rng, 3)), linear(1, nz(rng, 4))] }] };
  }
}

function distinctWrongCount(model: Model): number {
  const result = total(model.terms);
  const wrongs = model.terms.flatMap((term, index) => wrongValues(term).map((w) => total(model.terms, { index, value: w.value })));
  return wrongs.filter((p, k) => !polyEq(p, result) && wrongs.findIndex((q) => polyEq(q, p)) === k).length;
}

function buildModel(level: number, rng: Rng_): Model {
  // Si estrae di nuovo finché il risultato non è nullo e gli errori danno abbastanza risposte diverse.
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const result = total(model.terms);
    if (result.length >= 2 && distinctWrongCount(model) >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

/** Un fattore scritto: un monomio così com'è, un polinomio tra parentesi. */
const factorLatex = (f: Poly, alone: boolean): string => (f.length === 1 ? toLatex(monoExpr(f[0] as Mono)) : alone ? toLatex(polyExpr(f)) : `\\left(${toLatex(polyExpr(f))}\\right)`);

function termLatex(term: Term, first: boolean, inSum: boolean): string {
  // Un polinomio da solo si scrive tra parentesi se c'è una somma o una differenza intorno.
  const body = term.factors.length === 1 ? factorLatex(term.factors[0] as Poly, !inSum) : term.factors.map((f) => factorLatex(f, false)).join("");
  if (first) return term.sign === 1 ? body : `-${body}`;
  return term.sign === 1 ? ` + ${body}` : ` - ${body}`;
}

const promptLatex = (model: Model): string => model.terms.map((term, k) => termLatex(term, k === 0, model.terms.length > 1)).join("");

/** L'espressione del testo costruita con il motore, per la verifica. */
const promptExpr = (model: Model): Expr =>
  add(
    ...model.terms.map((term) => {
      const product = term.factors.length === 1 ? polyExpr(term.factors[0] as Poly) : mul(...term.factors.map(polyExpr));
      return term.sign === 1 ? product : neg(product);
    }),
  );

const p$ = (p: Poly): string => `$${toLatex(polyExpr(p))}$`;

/** I prodotti parziali scritti uno dopo l'altro, con i loro segni. */
const partialsLatex = (parts: Poly): string => parts.map((m, k) => (k === 0 || m.c.sign() < 0 ? toLatex(monoExpr(m)) : `+ ${toLatex(monoExpr(m))}`)).join(" ");

function termSteps(term: Term): string[] {
  const steps: string[] = [];
  let product: Poly = term.factors[0] as Poly;
  for (const factor of term.factors.slice(1)) {
    const parts = partials(product, factor);
    const reduced = reduce(parts);
    const how = product.length === 1 || factor.length === 1 ? "Proprietà distributiva" : "Ogni termine del primo per ogni termine del secondo";
    steps.push(`$${factorLatex(product, false)}${factorLatex(factor, false)}$: ${how.toLowerCase()}, poi si riducono i termini simili. $$${partialsLatex(parts)} = ${toLatex(polyExpr(reduced))}$$`);
    product = reduced;
  }
  if (term.sign === -1) {
    steps.push(`Il meno davanti cambia il segno di **ogni** termine: $-\\left(${toLatex(polyExpr(product))}\\right) = ${toLatex(polyExpr(polyNeg(product)))}$.`);
  }
  return steps;
}

function draftOf(model: Model): ExerciseDraft {
  const result = total(model.terms);
  const correct = polyExpr(result);
  const candidates: WrongCandidate<Expr>[] = model.terms.flatMap((term, index) =>
    wrongValues(term).map((wrong) => ({ error: wrong.error, value: polyExpr(total(model.terms, { index, value: wrong.value })) })),
  );
  const steps = model.terms.flatMap(termSteps).map((text) => ({ text }));
  if (model.terms.length > 1) {
    const pieces = model.terms.map((term, k) => {
      const latex = toLatex(polyExpr(valueOf(term)));
      return k === 0 || latex.startsWith("-") ? latex : `+ ${latex}`;
    });
    steps.push({ text: `Si mettono insieme i termini e si riducono quelli simili, grado per grado. $$${pieces.join(" ")} = ${toLatex(correct)}$$` });
  }
  const hasProduct = model.terms.some((term) => term.factors.length >= 2);
  const hasMinus = model.terms.some((term) => term.sign === -1);
  return {
    prompt: `Calcola e riduci: $${promptLatex(model)}$.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, candidates), form: ["expanded"] },
    steps,
    hints: [
      hasProduct
        ? "Prima i prodotti: ogni termine del primo fattore per ogni termine del secondo. Poi somme e differenze, e alla fine si riducono i termini simili."
        : "È una differenza di polinomi: togli le parentesi, poi riduci i termini simili grado per grado.",
      hasMinus
        ? "Il meno davanti a una parentesi (o a un prodotto) cambia il segno di **tutti** i termini dentro, non solo del primo."
        : "Conta i prodotti da fare: con un binomio e un trinomio sono $2 \\cdot 3 = 6$. Attento al segno di ogni prodotto, poi controlla con un numero come $x = 2$.",
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A02.g1",
  skill: "V1.M04.A02",
  lesson: "V1.M04.L02",
  title: "Somma e prodotto di polinomi",
  levels: [1, 2, 3],
  errors: [MINUS, SIGNS, POWERS],
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
