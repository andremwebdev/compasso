// V1.M04.A08.g1 — MCD e mcm di polinomi.
//
// Risposta: un'espressione scomposta (vincolo `factored`), il MCD oppure il mcm (il testo dice quale),
// con il numero davanti positivo. All'indietro: si scelgono i fattori irriducibili (x, x − r, x² + b) e,
// per ogni polinomio, un numero davanti e l'esponente di ogni fattore. Il polinomio del testo è il loro
// prodotto: scritto già scomposto al livello 1, sviluppato ai livelli 2 e 3.
//
// Le risposte sbagliate applicano la regola con UN errore:
// - ALG.MCD_MCM: MCD e mcm scambiati; il mcm come prodotto dei polinomi; i fattori comuni presi con
//   l'esponente sbagliato (maggiore nel MCD, minore nel mcm); nel mcm dimenticati i fattori non comuni;
//   MCD e mcm dei numeri davanti scambiati;
// - ALG.SEGNI_FATTORI (livello 3): x − a e a − x presi come due fattori diversi.
//
// Livello 1: due polinomi già scomposti, con fattori x, x − r e una potenza.
// Livello 2: due o tre polinomi sviluppati da scomporre (raccoglimento, differenza di quadrati,
//   quadrato di binomio, trinomio speciale), come il secondo esempio della lezione.
// Livello 3: tre polinomi sviluppati, uno con un fattore di segno opposto (2 − x, 4 − x²), numeri davanti.
//
// Verifica: il motore calcola MCD e mcm dei polinomi del testo con l'algoritmo di Euclide (upGcd, upLcm)
// e li confronta con la risposta.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upGcd, upLcm, upMul, upoly, upPow, upScale, type UPoly } from "../../../motore/algebra/upoly";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, num, pow, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { gcd, lcm } from "../../comuni/primes";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const RULE: ErrorCode = "ALG.MCD_MCM";
const OPPOSITE: ErrorCode = "ALG.SEGNI_FATTORI";

const x = sym("x");

/** Un polinomio scomposto: un numero davanti e l'esponente di ogni fattore dell'elenco comune. */
interface Item {
  readonly c: number;
  readonly exps: readonly number[];
  /** Livello 3: il fattore di indice `flipped` è scritto con il segno opposto (a − x invece di x − a). */
  readonly flipped?: number;
}

interface Model {
  /** I fattori irriducibili, monici: x, x − r, x² + b. */
  readonly factors: readonly UPoly[];
  readonly items: readonly Item[];
  readonly ask: "MCD" | "mcm";
  /** Vero se i polinomi si mostrano sviluppati (da scomporre). */
  readonly expanded: boolean;
}

/** Un risultato: un numero davanti e gli esponenti (anche il fattore opposto, contato a parte). */
interface Result {
  readonly c: number;
  readonly exps: readonly number[];
  /** Esponente del fattore scritto con il segno opposto, quando lo si tratta come un fattore diverso. */
  readonly extra?: { readonly index: number; readonly exp: number };
}

// ───────────────────────────── conti giusti e sbagliati ─────────────────────────────

const column = (items: readonly Item[], j: number): number[] => items.map((item) => item.exps[j] ?? 0);
/** L'esponente minore tra quelli con cui il fattore compare (0 se non compare mai). */
const minPresent = (exps: readonly number[]): number => (exps.some((e) => e > 0) ? Math.min(...exps.filter((e) => e > 0)) : 0);
const MCD = (items: readonly Item[], factors: number): Result => ({ c: items.map((i) => Math.abs(i.c)).reduce(gcd), exps: Array.from({ length: factors }, (_, j) => Math.min(...column(items, j))) });
const MCM = (items: readonly Item[], factors: number): Result => ({ c: items.map((i) => Math.abs(i.c)).reduce(lcm), exps: Array.from({ length: factors }, (_, j) => Math.max(...column(items, j))) });

function wrongResults(model: Model): WrongCandidate<Result>[] {
  const { items, factors } = model;
  const n = factors.length;
  const right = model.ask === "MCD" ? MCD(items, n) : MCM(items, n);
  const swapped = model.ask === "MCD" ? MCM(items, n) : MCD(items, n);
  const common = (j: number): boolean => column(items, j).every((e) => e > 0);
  const out: WrongCandidate<Result>[] = [{ error: RULE, value: swapped }];
  if (model.ask === "mcm") {
    // Il prodotto dei polinomi (numeri moltiplicati, esponenti sommati).
    out.push({ error: RULE, value: { c: items.reduce((p, i) => p * Math.abs(i.c), 1), exps: Array.from({ length: n }, (_, j) => column(items, j).reduce((s, e) => s + e, 0)) } });
    // Solo i fattori comuni, con l'esponente maggiore.
    out.push({ error: RULE, value: { c: right.c, exps: right.exps.map((e, j) => (common(j) ? e : 0)) } });
    // Tutti i fattori, ma con l'esponente minore tra quelli con cui compaiono.
    out.push({ error: RULE, value: { c: right.c, exps: Array.from({ length: n }, (_, j) => minPresent(column(items, j))) } });
  } else {
    // I fattori comuni con l'esponente maggiore.
    out.push({ error: RULE, value: { c: right.c, exps: Array.from({ length: n }, (_, j) => (common(j) ? Math.max(...column(items, j)) : 0)) } });
    // Anche i fattori non comuni (con l'esponente minore con cui compaiono).
    out.push({ error: RULE, value: { c: right.c, exps: Array.from({ length: n }, (_, j) => minPresent(column(items, j))) } });
  }
  // MCD e mcm dei numeri davanti scambiati.
  out.push({ error: RULE, value: { ...right, c: swapped.c } });
  // Il fattore opposto preso come un fattore diverso.
  const flippedItem = items.findIndex((i) => i.flipped !== undefined);
  if (flippedItem >= 0) {
    const index = (items[flippedItem] as Item).flipped as number;
    const others = items.filter((_, k) => k !== flippedItem);
    const mine = (items[flippedItem] as Item).exps[index] ?? 0;
    const rest = model.ask === "MCD" ? (others.every((i) => (i.exps[index] ?? 0) > 0) ? Math.min(...others.map((i) => i.exps[index] ?? 0)) : 0) : Math.max(...others.map((i) => i.exps[index] ?? 0));
    if (model.ask === "mcm") out.push({ error: OPPOSITE, value: { c: right.c, exps: right.exps.map((e, j) => (j === index ? rest : e)), extra: { index, exp: mine } } });
    // Nel MCD: il fattore opposto non riconosciuto come comune, quindi escluso.
    else out.push({ error: OPPOSITE, value: { c: right.c, exps: right.exps.map((e, j) => (j === index ? 0 : e)) } });
  }
  return out;
}

// ───────────────────────────── scrittura ─────────────────────────────

const L = (p: UPoly): string => toLatex(upolyToExpr(p));

/** a − x per il fattore x − a (solo primo grado). */
const opposite = (p: UPoly): UPoly => upScale(p, -1);

/** Il polinomio a − x scritto con il numero prima: 2 − x, 4 − x². */
function ascending(p: UPoly): Expr {
  const terms = p.map((c, e) => ({ c, e })).filter((t) => !t.c.isZero());
  return add(...terms.map(({ c, e }) => {
    const power = e === 0 ? null : e === 1 ? x : pow(x, e);
    if (power === null) return num(c);
    return c.eq(1) ? power : c.eq(-1) ? neg(power) : mul(num(c), power);
  }));
}

/** Un prodotto scritto: numero (se diverso da 1), poi i fattori con le potenze. */
function productExpr(c: number, parts: readonly { poly: UPoly; exp: number; ascending?: boolean }[]): Expr {
  const factors: Expr[] = [];
  if (Math.abs(c) !== 1) factors.push(num(Math.abs(c)));
  for (const { poly, exp, ascending: asc } of parts) {
    if (exp === 0) continue;
    const base = asc ? ascending(poly) : upolyToExpr(poly);
    factors.push(exp === 1 ? base : pow(base, exp));
  }
  const product = factors.length === 0 ? num(1) : factors.length === 1 ? (factors[0] as Expr) : mul(...factors);
  return c < 0 ? neg(product) : product;
}

const resultExpr = (model: Model, r: Result): Expr =>
  productExpr(r.c, [
    ...model.factors.map((poly, j) => ({ poly, exp: r.exps[j] ?? 0 })),
    ...(r.extra ? [{ poly: opposite(model.factors[r.extra.index] as UPoly), exp: r.extra.exp, ascending: true }] : []),
  ]);

/** Il polinomio sviluppato di un elemento (con il segno del fattore opposto). */
function itemPoly(model: Model, item: Item): UPoly {
  const product = model.factors.reduce<UPoly>((p, f, j) => upMul(p, upPow(f, item.exps[j] ?? 0)), upoly(item.c));
  return item.flipped !== undefined && (item.exps[item.flipped] ?? 0) % 2 === 1 ? upScale(product, -1) : product;
}

/** Il polinomio come appare nel testo. */
function itemExpr(model: Model, item: Item): Expr {
  if (!model.expanded) return productExpr(item.c, model.factors.map((poly, j) => ({ poly, exp: item.exps[j] ?? 0 })));
  const p = itemPoly(model, item);
  // Con il primo coefficiente negativo si scrive dal termine noto: 4 − x², non −x² + 4.
  return (p[p.length - 1] as Rational).sign() < 0 ? ascending(p) : upolyToExpr(p);
}

/** La scomposizione di un elemento, come la si scrive nei passaggi (con il fattore opposto e il segno). */
function itemFactored(model: Model, item: Item): Expr {
  if (item.flipped === undefined) return productExpr(item.c, model.factors.map((poly, j) => ({ poly, exp: item.exps[j] ?? 0 })));
  const index = item.flipped;
  return productExpr(item.c, model.factors.map((poly, j) => (j === index ? { poly: opposite(poly), exp: item.exps[j] ?? 0, ascending: true } : { poly, exp: item.exps[j] ?? 0 })));
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** Fattori: x, due binomi x − r e, a volte, x² + b. */
function chooseFactors(rng: Rng_, withSquareSum: boolean): UPoly[] {
  const [r1, r2] = rng.sample([-4, -3, -2, -1, 1, 2, 3, 4, 5], 2) as [number, number];
  const factors: UPoly[] = [upoly(0, 1), upoly(-r1, 1), upoly(-r2, 1)];
  if (withSquareSum) factors.push(upoly(rng.pick([1, 4, 9]), 0, 1));
  return factors;
}

function buildLevel1(rng: Rng_): Model {
  const factors = chooseFactors(rng, false);
  const c = rng.sample([2, 3, 4, 6, 8, 9, 10, 12], 2) as [number, number];
  // Il binomio x − r1 è comune con esponenti diversi; x è comune; x − r2 solo nel secondo.
  const e1 = rng.int(1, 3);
  const items: Item[] = [
    { c: c[0], exps: [e1, rng.int(1, 2), 0] },
    { c: c[1], exps: [rng.intExcept(1, 3, [e1]), rng.int(1, 3), rng.int(1, 2)] },
  ];
  return { factors, items, ask: rng.pick(["MCD", "mcm", "mcm"] as const), expanded: false };
}

function buildLevel2(rng: Rng_): Model {
  const factors = chooseFactors(rng, false);
  // Polinomi facili da scomporre: un binomio per una costante, un prodotto di due binomi (trinomio
  // speciale o differenza di quadrati), un quadrato di binomio; a volte con x raccolta.
  // Tutti di grado al più 2: si scompongono con le tecniche di V1.M04.L06 e L07 senza Ruffini.
  const shapes: number[][] = [[0, 1, 0], [0, 1, 1], [0, 2, 0], [1, 1, 0], [1, 0, 1], [0, 0, 1], [0, 0, 2]];
  const count = rng.pick([2, 3, 3]);
  const items: Item[] = rng.sample(shapes, count).map((exps) => ({ c: rng.pick([1, 1, 2, 3]), exps }));
  return { factors, items, ask: rng.pick(["MCD", "mcm", "mcm"] as const), expanded: true };
}

function buildLevel3(rng: Rng_): Model {
  const factors = chooseFactors(rng, rng.bool(0.3));
  const n = factors.length;
  const pool: number[][] = [[0, 1, 0], [1, 1, 0], [0, 2, 0], [0, 1, 1], [1, 0, 1], [0, 0, 2], [2, 1, 0]].map((e) => (n === 4 ? [...e, 0] : e));
  if (n === 4) pool.push([0, 1, 0, 1], [1, 0, 0, 1]);
  const items: Item[] = rng.sample(pool, 3).map((exps) => ({ c: rng.pick([1, 2, 3, 4, 6]), exps }));
  // Un polinomio con un fattore x − r (r positivo) scritto r − x: si sceglie un polinomio che lo contiene
  // con esponente 1. Se nessun binomio ha la radice positiva, nessun fattore è scritto al contrario.
  const index = [1, 2].find((j) => ((factors[j] as UPoly)[0] as Rational).sign() < 0 && items.some((item) => item.exps[j] === 1));
  const k = index === undefined ? -1 : items.findIndex((item) => item.exps[index] === 1);
  const flippedItems = items.map((item, j) => (j === k && index !== undefined ? { ...item, flipped: index } : item));
  return { factors, items: flippedItems, ask: rng.pick(["MCD", "mcm", "mcm"] as const), expanded: true };
}

/**
 * Due risultati sono lo stesso polinomio se, riportato il fattore opposto al suo fattore (a − x = −(x − a)),
 * hanno lo stesso numero davanti e gli stessi esponenti: i fattori sono irriducibili e distinti.
 */
function resultsEqual(a: Result, b: Result): boolean {
  const normal = (r: Result): { c: number; exps: number[] } => ({
    c: r.extra && r.extra.exp % 2 === 1 ? -r.c : r.c,
    exps: r.exps.map((e, j) => e + (r.extra && r.extra.index === j ? r.extra.exp : 0)),
  });
  const [p, q] = [normal(a), normal(b)];
  return p.c === q.c && p.exps.length === q.exps.length && p.exps.every((e, j) => e === q.exps[j]);
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const n = model.factors.length;
    const right = model.ask === "MCD" ? MCD(model.items, n) : MCM(model.items, n);
    // Il MCD deve contenere almeno un fattore (non solo un numero), e il polinomio del testo coefficienti piccoli.
    if (right.exps.every((e) => e === 0)) continue;
    if (!model.items.every((item) => itemPoly(model, item).every((c) => c.abs().cmp(80) <= 0))) continue;
    const values = wrongResults(model).flatMap((w) => (w ? [w.value] : []));
    const distinct = values.filter((v, j) => !resultsEqual(v, right) && values.findIndex((u) => resultsEqual(u, v)) === j);
    if (distinct.length >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

const NAMES = ["A", "B", "C"];

function draftOf(model: Model): ExerciseDraft {
  const n = model.factors.length;
  const right = model.ask === "MCD" ? MCD(model.items, n) : MCM(model.items, n);
  const correct = resultExpr(model, right);
  const candidates = wrongResults(model).map((w) => w && { error: w.error, value: resultExpr(model, w.value) });
  const list = model.items.map((item, j) => `$${NAMES[j]} = ${toLatex(itemExpr(model, item))}$`);
  const listText = list.length === 2 ? `${list[0]} e ${list[1]}` : `${list[0]}, ${list[1]} e ${list[2]}`;
  const flipped = model.items.find((item) => item.flipped !== undefined);
  const steps: string[] = [];
  steps.push(
    model.expanded
      ? `**Passo 1.** Si scompone ogni polinomio. ${model.items.map((item, j) => `$${NAMES[j]} = ${toLatex(itemFactored(model, item))}$`).join("; ")}.`
      : `**Passo 1.** I polinomi sono già scomposti.`,
  );
  if (flipped) {
    const index = flipped.flipped as number;
    const f = model.factors[index] as UPoly;
    steps.push(`**Passo 2.** $${toLatex(ascending(opposite(f)))} = -\\left(${L(f)}\\right)$: è lo stesso fattore $${L(f)}$, con un segno davanti, che non entra in MCD e mcm.`);
  } else {
    steps.push(`**Passo 2.** I segni sono già allineati.`);
  }
  const numbers = model.items.map((item) => Math.abs(item.c));
  steps.push(
    model.ask === "MCD"
      ? `**Passo 3.** Per il MCD solo i fattori comuni a tutti, con l'esponente minore; per i numeri davanti, il MCD di $${numbers.join(", ")}$, cioè $${right.c}$. $$\\mathrm{MCD} = ${toLatex(correct)}$$`
      : `**Passo 3.** Per il mcm tutti i fattori, comuni e non comuni, con l'esponente maggiore; per i numeri davanti, il mcm di $${numbers.join(", ")}$, cioè $${right.c}$. $$\\mathrm{mcm} = ${toLatex(correct)}$$`,
  );
  return {
    prompt: `Trova il ${model.ask} di ${listText}. Scrivilo scomposto in fattori, con il numero davanti positivo.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, candidates), form: ["factored"] },
    steps: steps.map((text) => ({ text })),
    hints: [
      model.expanded ? "Prima si scompone ogni polinomio: i fattori irriducibili fanno la parte dei numeri primi." : "Guarda quali fattori compaiono in tutti i polinomi e con quali esponenti.",
      model.ask === "MCD"
        ? "Il MCD prende solo i fattori comuni a tutti, ciascuno con l'esponente **minore**; per i numeri davanti, il loro MCD."
        : "Il mcm prende tutti i fattori, comuni e non comuni, ciascuno con l'esponente **maggiore**; per i numeri davanti, il loro mcm.",
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A08.g1",
  skill: "V1.M04.A08",
  lesson: "V1.M04.L08",
  title: "MCD e mcm di polinomi",
  levels: [1, 2, 3],
  errors: [RULE, OPPOSITE],
  limits: { maxInteger: 300, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: MCD e mcm dei polinomi del testo calcolati dal motore con l'algoritmo di Euclide
  // (monici), per il MCD o il mcm dei numeri davanti.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const polys = model.items.map((item) => itemPoly(model, item));
    const contents = model.items.map((item) => Math.abs(item.c));
    const monic = polys.reduce((acc, p) => (model.ask === "MCD" ? upGcd(acc, p) : upLcm(acc, p)));
    const number = model.ask === "MCD" ? contents.reduce(gcd) : contents.reduce(lcm);
    return equivalent(answer.correct, upolyToExpr(upScale(monic, Rational.of(number))));
  },
});
