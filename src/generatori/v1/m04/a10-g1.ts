// V1.M04.A10.g1 — Operazioni con le frazioni algebriche: somme, differenze, prodotti, quozienti.
//
// Risposta: un'espressione, una sola frazione ridotta ai minimi termini (vincolo `reducedFraction`);
// al livello 3 anche le condizioni di esistenza di un quoziente (risposta un insieme).
// All'indietro: si scelgono i fattori dei denominatori e dei numeratori (binomi x − r, x, numeri) e le
// operazioni; il risultato si calcola come a mano: denominatore comune uguale al mcm, numeratori
// moltiplicati per i fattori mancanti, poi si tolgono i fattori comuni (che si trovano provando gli zeri
// dei fattori del denominatore nel numeratore).
//
// Le risposte sbagliate rifanno il conto con UN errore:
// - CALC.SOMMA_FRAZIONI: numeratori sommati e denominatori sommati; oppure numeratori sommati sul
//   denominatore comune senza moltiplicarli per i fattori mancanti, o moltiplicati per il fattore che
//   manca all'altro denominatore;
// - CALC.MENO_PARENTESI: il meno davanti alla seconda frazione cambia segno solo al primo termine del
//   suo numeratore;
// - CALC.DIVISIONE_FRAZIONI: nel quoziente capovolta la prima frazione, oppure nessuna;
// - ALG.QUADRATO_BINOMIO: x² − r² scomposto come (x − r)²;
// - ALG.SEGNI_FATTORI: x − r semplificato con x + r;
// - COND.DENOMINATORE (C.E. del quoziente): dimenticato il numeratore del divisore, o uno zero.
//
// Livello 1: somma o differenza di due frazioni con denominatori di primo grado; prodotto con una
//   differenza di quadrati (come l'esempio «Un prodotto» della lezione).
// Livello 2: differenza con un denominatore da scomporre (x/(x² − 4) − 1/(x − 2)); quoziente.
// Livello 3: differenza il cui risultato si semplifica (1/(x − 1) − 2/(x² − 1) = 1/(x + 1)); C.E. di
//   un quoziente; quoziente tra trinomi.
//
// Verifica: con il motore, la risposta è equivalente all'espressione del testo (somma, prodotto o
// quoziente costruiti con div e mul); per le C.E. ogni intero tra −10 e 10 sta nell'insieme se e solo se
// nessun denominatore (né il numeratore del divisore) lì vale zero.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { simplify } from "../../../motore/algebra/simplify";
import { upDivMod, upEval, upoly, type UPoly } from "../../../motore/algebra/upoly";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, div, mul, neg, num, substitute, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { setContains, setToLatex, type SolutionSet } from "../../../motore/sets";
import { domainOf, expandedSide, flipTrinomial, gcd, lin, sideExpr, simplifyFraction, squaresInsteadOfDifference, X, zerosOf, type Side } from "../../comuni/fractions";
import { mono, polyAdd, polyEq, polyExpr, polyMul, polyNeg, reduce, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, distinctWrongSets, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const SUM: ErrorCode = "CALC.SOMMA_FRAZIONI";
const MINUS: ErrorCode = "CALC.MENO_PARENTESI";
const QUOTIENT: ErrorCode = "CALC.DIVISIONE_FRAZIONI";
const SQUARE: ErrorCode = "ALG.QUADRATO_BINOMIO";
const FACTOR_SIGNS: ErrorCode = "ALG.SEGNI_FATTORI";
const DENOMINATOR: ErrorCode = "COND.DENOMINATORE";

/** Una frazione: numeratore e denominatore scomposti. */
interface Fraction {
  readonly num: Side;
  readonly den: Side;
}

type Model =
  | { readonly kind: "sum"; readonly sign: 1 | -1; readonly a: Fraction; readonly b: Fraction; readonly expanded: boolean }
  | { readonly kind: "product" | "quotient" | "domain"; readonly a: Fraction; readonly b: Fraction; readonly expanded: boolean };

// ───────────────────────────── conti ─────────────────────────────

const toU = (p: Poly): UPoly => {
  const out: number[] = [];
  for (const m of p) out[m.x] = (out[m.x] ?? 0) + Number(m.c.n) / Number(m.c.d);
  return upoly(...Array.from({ length: out.length }, (_, k) => out[k] ?? 0));
};
const fromU = (u: UPoly): Poly => reduce(u.map((c, e) => mono(c, e, 0)));

/** Il mcm dei denominatori: tutti i fattori con la molteplicità maggiore, mcm dei numeri. */
function lcmSide(p: Side, q: Side): Side {
  const factors = [...p.factors];
  const used = new Set<number>();
  for (const f of q.factors) {
    const k = factors.findIndex((g, j) => !used.has(j) && polyEq(g, f));
    if (k >= 0) used.add(k);
    else factors.push(f);
  }
  return { c: (p.c * q.c) / gcd(p.c, q.c), factors };
}

/** Quello che manca a un denominatore per arrivare al mcm (il quoziente mcm : denominatore). */
function missing(lcm: Side, den: Side): Side {
  const factors = [...lcm.factors];
  for (const f of den.factors) {
    const k = factors.findIndex((g) => polyEq(g, f));
    if (k >= 0) factors.splice(k, 1);
  }
  return { c: lcm.c / den.c, factors };
}

/** Un numeratore polinomio sul denominatore dato, con i fattori comuni tolti e i numeri ridotti. */
function reduceOver(N: Poly, den: Side): Expr {
  let u = toU(N);
  const factors = [...den.factors];
  // Si tolgono i fattori di primo grado del denominatore che si annullano dove si annulla il numeratore.
  for (let k = 0; k < factors.length; ) {
    const zero = zerosOf([factors[k] as Poly])[0];
    if (zero !== undefined && u.length > 0 && upEval(u, zero).isZero()) {
      u = upDivMod(u, toU(factors[k] as Poly)).quotient;
      factors.splice(k, 1);
    } else k++;
  }
  // I numeri: il MCD dei coefficienti del numeratore con il numero davanti al denominatore.
  const content = u.filter((c) => !c.isZero()).reduce((g, c) => gcd(g, Number(c.n)), 0);
  const g = gcd(content, den.c);
  let top = fromU(u.map((c) => c.div(g)));
  const c = den.c / g;
  let sign = 1;
  if (top.length === 1 && (top[0] as Mono).c.sign() < 0) [top, sign] = [polyNeg(top), -1];
  if (top.length === 0) return num(0);
  const value = factors.length === 0 && c === 1 ? polyExpr(top) : div(polyExpr(top), sideExpr(c, factors));
  return sign < 0 ? neg(value) : value;
}

/** Vero se la frazione N/den si semplifica: un fattore del denominatore si annulla dove N, o un numero in comune. */
function simplifies(N: Poly, den: Side): boolean {
  const u = toU(N);
  const content = u.filter((c) => !c.isZero()).reduce((g, c) => gcd(g, Number(c.n)), 0);
  return gcd(content, den.c) > 1 || den.factors.some((f) => {
    const zero = zerosOf([f])[0];
    return zero !== undefined && upEval(u, zero).isZero();
  });
}

/** Il numeratore della somma sul mcm: a·(mcm : B) ± c·(mcm : D). Con `minusOnlyFirst` il meno cambia segno solo al primo termine. */
function sumNumerator(model: Model & { kind: "sum" }, minusOnlyFirst = false): Poly {
  const lcm = lcmSide(model.a.den, model.b.den);
  const first = reduce(polyMul(expandedSide(model.a.num), expandedSide(missing(lcm, model.a.den))));
  const second = reduce(polyMul(expandedSide(model.b.num), expandedSide(missing(lcm, model.b.den))));
  if (model.sign === 1) return polyAdd(first, second);
  if (!minusOnlyFirst) return polyAdd(first, polyNeg(second));
  return polyAdd(first, second.map((m, k) => (k === 0 ? { ...m, c: m.c.neg() } : m)));
}

const join = (p: Side, q: Side): Side => ({ c: p.c * q.c, factors: [...p.factors, ...q.factors] });

/** Il risultato giusto. */
function resultOf(model: Model): Expr {
  switch (model.kind) {
    case "sum":
      return reduceOver(sumNumerator(model), lcmSide(model.a.den, model.b.den));
    case "product":
      return simplifyFraction(join(model.a.num, model.b.num), join(model.a.den, model.b.den));
    case "quotient":
    case "domain":
      return simplifyFraction(join(model.a.num, model.b.den), join(model.a.den, model.b.num));
  }
}

function wrongResults(model: Model): WrongCandidate<Expr>[] {
  const out: WrongCandidate<Expr>[] = [];
  switch (model.kind) {
    case "sum": {
      const lcm = lcmSide(model.a.den, model.b.den);
      const [A, B] = [expandedSide(model.a.num), expandedSide(model.b.num)];
      const nums = model.sign === 1 ? polyAdd(A, B) : polyAdd(A, polyNeg(B));
      // Numeratori e denominatori sommati tra loro.
      const dens = polyAdd(expandedSide(model.a.den), expandedSide(model.b.den));
      out.push(dens.length > 0 && nums.length > 0 ? { error: SUM, value: simplify(div(polyExpr(nums), polyExpr(dens))) } : null);
      // Denominatore comune giusto, ma i numeratori non moltiplicati per i fattori mancanti.
      out.push(nums.length > 0 ? { error: SUM, value: reduceOver(nums, lcm) } : null);
      if (model.sign === -1) out.push({ error: MINUS, value: reduceOver(sumNumerator(model, true), lcm) });
      // Ogni numeratore moltiplicato per il fattore che manca all'altro denominatore (il prodotto «in croce» sbagliato).
      const crossA = reduce(polyMul(A, expandedSide(missing(lcm, model.b.den))));
      const crossB = reduce(polyMul(B, expandedSide(missing(lcm, model.a.den))));
      const crossed = model.sign === 1 ? polyAdd(crossA, crossB) : polyAdd(crossA, polyNeg(crossB));
      out.push(crossed.length > 0 ? { error: SUM, value: reduceOver(crossed, lcm) } : null);
      return out;
    }
    case "product": {
      const [n, d] = [join(model.a.num, model.b.num), join(model.a.den, model.b.den)];
      for (const side of squaresInsteadOfDifference(n)) out.push({ error: SQUARE, value: simplifyFraction(side, d) });
      const flipped = flipTrinomial(d);
      if (flipped) out.push({ error: FACTOR_SIGNS, value: simplifyFraction(n, flipped) });
      out.push(crossCancel(n, d));
      return out;
    }
    case "quotient": {
      // Capovolta la prima frazione invece della seconda, oppure nessuna.
      out.push({ error: QUOTIENT, value: simplifyFraction(join(model.a.den, model.b.num), join(model.a.num, model.b.den)) });
      out.push({ error: QUOTIENT, value: simplifyFraction(join(model.a.num, model.b.num), join(model.a.den, model.b.den)) });
      const [n, d] = [join(model.a.num, model.b.den), join(model.a.den, model.b.num)];
      for (const side of squaresInsteadOfDifference(n)) out.push({ error: SQUARE, value: simplifyFraction(side, d) });
      for (const side of squaresInsteadOfDifference(d)) out.push({ error: SQUARE, value: simplifyFraction(n, side) });
      out.push(crossCancel(n, d));
      return out;
    }
    case "domain":
      return [];
  }
}

/** x − r semplificato con x + r (fattori che differiscono nel segno del numero): ALG.SEGNI_FATTORI. */
function crossCancel(n: Side, d: Side): WrongCandidate<Expr> {
  for (let i = 0; i < n.factors.length; i++) {
    for (let j = 0; j < d.factors.length; j++) {
      const [f, g] = [n.factors[i] as Poly, d.factors[j] as Poly];
      if (f.length === 2 && g.length === 2 && polyEq([f[0] as Mono], [g[0] as Mono]) && polyEq([f[1] as Mono], polyNeg([g[1] as Mono])) && f[1]?.x === 0) {
        return { error: FACTOR_SIGNS, value: simplifyFraction({ c: n.c, factors: n.factors.filter((_, k) => k !== i) }, { c: d.c, factors: d.factors.filter((_, k) => k !== j) }) };
      }
    }
  }
  return null;
}

/** Le C.E. di un quoziente: zeri dei due denominatori e del numeratore del divisore. */
const domainZeros = (model: Model): Rational[] => zerosOf([...model.a.den.factors, ...model.b.den.factors, ...model.b.num.factors]);

function wrongDomains(model: Model): WrongCandidate<SolutionSet>[] {
  const zeros = domainZeros(model);
  const out: WrongCandidate<SolutionSet>[] = [];
  // Dimenticato il numeratore del divisore.
  out.push({ error: DENOMINATOR, value: domainOf(zerosOf([...model.a.den.factors, ...model.b.den.factors])) });
  // Uno zero dimenticato.
  for (const z of zeros) out.push(zeros.length > 1 ? { error: DENOMINATOR, value: domainOf(zeros.filter((w) => !w.eq(z))) } : null);
  // Zeri con il segno cambiato.
  out.push({ error: FACTOR_SIGNS, value: domainOf(zeros.map((z) => z.neg())) });
  return out;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const nz = (rng: Rng_, max: number, excluded: number[] = []): number => rng.intExcept(-max, max, [0, ...excluded]);
const side = (c: number, ...factors: Poly[]): Side => ({ c, factors });
const constant = (c: number): Side => side(c);
const xOnly: Poly = [X(1)];

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.6)) {
    // c₁/(x − a) ± c₂/(x − b)
    const a = nz(rng, 6);
    const b = nz(rng, 6, [a]);
    return { kind: "sum", sign: rng.sign(), a: { num: constant(rng.int(1, 4)), den: side(1, lin(a)) }, b: { num: constant(rng.int(1, 4)), den: side(1, lin(b)) }, expanded: false };
  }
  // (x² − r²)/(k(x + s)) · (x + s)/(x − r) = (x + r)/k
  const r = nz(rng, 6);
  const s = nz(rng, 6, [r, -r]);
  const k = rng.pick([2, 3, 4, 5]);
  return { kind: "product", a: { num: side(1, lin(r), lin(-r)), den: side(k, lin(-s)) }, b: { num: side(1, lin(-s)), den: side(1, lin(r)) }, expanded: true };
}

function buildLevel2(rng: Rng_): Model {
  if (rng.bool(0.5)) {
    // x/(x² − a²) − c/(x − a), oppure con il più.
    const a = nz(rng, 6);
    return { kind: "sum", sign: rng.pick([-1, -1, 1] as const), a: { num: side(1, xOnly), den: side(1, lin(a), lin(-a)) }, b: { num: constant(rng.int(1, 3)), den: side(1, lin(a)) }, expanded: true };
  }
  // (x² − r²)/xᵐ : (x + r)/xⁿ, oppure (x² − r²)/(x + s) : (x − r)/(x + s)²…
  const r = nz(rng, 5);
  if (rng.bool(0.5)) {
    const m = rng.int(1, 2);
    const n = m + rng.int(1, 2);
    return { kind: "quotient", a: { num: side(1, lin(r), lin(-r)), den: side(1, ...Array.from({ length: m }, () => xOnly)) }, b: { num: side(1, lin(-r)), den: side(1, ...Array.from({ length: n }, () => xOnly)) }, expanded: true };
  }
  const s = nz(rng, 5, [r, -r]);
  return { kind: "quotient", a: { num: side(1, lin(r), lin(-r)), den: side(rng.pick([1, 2, 3]), lin(s)) }, b: { num: side(1, lin(r)), den: side(1, lin(s), lin(s)) }, expanded: true };
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["simplifyingSum", "simplifyingSum", "domain", "domain", "trinomials"] as const);
  switch (shape) {
    case "simplifyingSum": {
      // c/(x − a) − 2ac/(x² − a²) = c(x + a − 2a)/((x − a)(x + a)) = c/(x + a): il numeratore si scompone
      // e si semplifica con il denominatore.
      // Con il più: c/(x + a) + 2ac/(x² − a²) = c/(x − a).
      const a = rng.int(1, 5);
      const c = rng.int(1, 3);
      const sign = rng.sign();
      return { kind: "sum", sign, a: { num: constant(c), den: side(1, lin(sign === -1 ? a : -a)) }, b: { num: constant(2 * a * c), den: side(1, lin(a), lin(-a)) }, expanded: true };
    }
    case "domain": {
      // C.E. di (x − a)/(x − b) : (x − c)/(x − d)
      const [a, b, c, d] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 4) as [number, number, number, number];
      return { kind: "domain", a: { num: side(1, lin(a)), den: side(1, lin(b)) }, b: { num: side(1, lin(c)), den: side(1, lin(d)) }, expanded: false };
    }
    case "trinomials": {
      // ((x − a)(x − b))/((x − c)(x + c)) : (x − a)/(x − c)
      const a = nz(rng, 5);
      const b = nz(rng, 5, [a]);
      const c = nz(rng, 5, [a, -a, b, -b]);
      return { kind: "quotient", a: { num: side(1, lin(a), lin(b)), den: side(1, lin(c), lin(-c)) }, b: { num: side(1, lin(a)), den: side(1, lin(c)) }, expanded: true };
    }
  }
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const needed = level === 1 ? 2 : 3;
    if (model.kind === "domain") {
      if (distinctWrongSets(domainOf(domainZeros(model)), wrongDomains(model)).length >= needed) return model;
      continue;
    }
    const right = resultOf(model);
    if (right.kind === "num" && right.value.isZero()) continue;
    // Numeri piccoli in tutte le risposte (anche sbagliate): si guarda ogni numero scritto.
    const small = (e: Expr): boolean => (toLatex(e).match(/\d+/g) ?? []).every((n) => Number(n) <= 100);
    const wrong = distinctWrongExpressions(right, wrongResults(model));
    if (wrong.length >= needed && small(right) && wrong.every((w) => small(w.value))) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

/** Una frazione come la mostra il testo: sviluppata o scomposta. */
function fractionExpr(f: Fraction, expanded: boolean): Expr {
  const show = (s: Side): Expr => (expanded ? polyExpr(expandedSide(s)) : sideExpr(s.c, s.factors));
  return div(show(f.num), show(f.den));
}

function promptExpr(model: Model): Expr {
  const [a, b] = [fractionExpr(model.a, model.expanded), fractionExpr(model.b, model.expanded)];
  switch (model.kind) {
    case "sum":
      return model.sign === 1 ? add(a, b) : add(a, neg(b));
    case "product":
      return mul(a, b);
    case "quotient":
    case "domain":
      return div(a, b);
  }
}

/** Il LaTeX del testo, con le frazioni grandi (\dfrac) e il segno di divisione «:». */
function promptLatex(model: Model): string {
  const big = (e: Expr): string => toLatex(e).replace(/\\frac/g, "\\dfrac");
  const [a, b] = [big(fractionExpr(model.a, model.expanded)), big(fractionExpr(model.b, model.expanded))];
  switch (model.kind) {
    case "sum":
      return `${a} ${model.sign === 1 ? "+" : "-"} ${b}`;
    case "product":
      return `${a} \\cdot ${b}`;
    case "quotient":
    case "domain":
      return `${a} : ${b}`;
  }
}

const factored = (f: Fraction): string => toLatex(div(sideExpr(f.num.c, f.num.factors), sideExpr(f.den.c, f.den.factors))).replace(/\\frac/g, "\\dfrac");
const ceText = (zeros: readonly Rational[]): string => zeros.map((z) => `x \\ne ${toLatex(num(z))}`).join(",\\ ");

function stepsOf(model: Model, correct: Expr): string[] {
  const big = (latex: string): string => latex.replace(/\\frac/g, "\\dfrac");
  switch (model.kind) {
    case "sum": {
      const lcm = lcmSide(model.a.den, model.b.den);
      const numerator = sumNumerator(model);
      const zeros = zerosOf(lcm.factors);
      const signWord = model.sign === -1 ? " Il meno davanti alla seconda frazione cambia il segno di tutto il suo numeratore." : "";
      return [
        `**Passo 1 e passo 2.** Le due frazioni con i denominatori scomposti: $${factored(model.a)}$ e $${factored(model.b)}$. C.E.: $${ceText(zeros)}$.`,
        `**Passo 3.** Il denominatore comune è il mcm: $${toLatex(sideExpr(lcm.c, lcm.factors))}$.`,
        `**Passo 4.** Ogni numeratore si moltiplica per quello che manca al suo denominatore per arrivare al mcm.${signWord} Il numeratore è $${toLatex(polyExpr(numerator))}$.`,
        (() => {
          const before = big(toLatex(div(polyExpr(numerator), sideExpr(lcm.c, lcm.factors))));
          const after = big(toLatex(correct));
          return !simplifies(numerator, lcm)
            ? `**Passo 5.** Il numeratore non ha fattori in comune con il denominatore: $$${after}$$ con $${ceText(zeros)}$.`
            : `**Passo 5.** Si scompone il numeratore e si semplifica: $$${before} = ${after}$$ con $${ceText(zeros)}$; le C.E. restano anche per i fattori semplificati.`;
        })(),
      ];
    }
    case "product": {
      const zeros = zerosOf([...model.a.den.factors, ...model.b.den.factors]);
      return [
        `Si scompone tutto: $${factored(model.a)} \\cdot ${factored(model.b)}$. C.E.: $${ceText(zeros)}$.`,
        `Si semplifica ogni fattore di un numeratore con un fattore uguale di un denominatore, anche dell'altra frazione, poi si moltiplica: $$${big(toLatex(correct))}$$`,
      ];
    }
    case "quotient":
    case "domain": {
      const zeros = domainZeros(model);
      const flipped: Fraction = { num: model.b.den, den: model.b.num };
      if (model.kind === "domain") {
        return [
          `Dai denominatori: $${ceText(zerosOf([...model.a.den.factors, ...model.b.den.factors]))}$.`,
          `Si divide per $${factored(model.b)}$, che deve essere diverso da zero: anche il suo numeratore va escluso, $${ceText(zerosOf(model.b.num.factors))}$ (dopo il capovolgimento diventa un denominatore).`,
          `C.E.: $${ceText(zeros)}$, cioè $${setToLatex(domainOf(zeros))}$.`,
        ];
      }
      return [
        `Si scompone tutto: $${factored(model.a)} : ${factored(model.b)}$. C.E.: $${ceText(zeros)}$ (anche il numeratore del divisore, che diventa un denominatore).`,
        `Si moltiplica la prima frazione per il reciproco della seconda, si semplifica e si moltiplica: $$${factored(model.a)} \\cdot ${factored(flipped)} = ${big(toLatex(correct))}$$`,
      ];
    }
  }
}

function draftOf(model: Model): ExerciseDraft {
  if (model.kind === "domain") {
    const right = domainOf(domainZeros(model));
    return {
      prompt: `Scrivi le condizioni di esistenza dell'espressione $${promptLatex(model)}$.`,
      answer: { kind: "set", variable: "x", correct: right, wrong: distinctWrongSets(right, wrongDomains(model)) },
      steps: stepsOf(model, num(0)).map((text) => ({ text })),
      hints: [
        "Le C.E. si raccolgono da tutta l'espressione: i denominatori, e anche quello per cui si divide.",
        "Dividere per una frazione vuol dire moltiplicare per il suo reciproco: il suo numeratore diventa un denominatore e va posto diverso da zero. Scrivi le esclusioni come unione di intervalli.",
      ],
    };
  }
  const correct = resultOf(model);
  const hint2: Record<typeof model.kind, string> = {
    sum: "Il denominatore comune è il mcm dei denominatori scomposti; ogni numeratore va moltiplicato per il fattore che manca al suo denominatore. Un meno davanti a una frazione vale per tutto il suo numeratore.",
    product: "Scomponi numeratori e denominatori, semplifica i fattori uguali (anche in croce) e solo alla fine moltiplica.",
    quotient: "Capovolgi solo la seconda frazione (il divisore) e moltiplica; prima di moltiplicare scomponi e semplifica.",
  };
  return {
    prompt: `Calcola e scrivi il risultato come una sola frazione ridotta ai minimi termini: $${promptLatex(model)}$.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, wrongResults(model)), form: ["reducedFraction"] },
    steps: stepsOf(model, correct).map((text) => ({ text })),
    hints: ["Prima di tutto scomponi i denominatori (e i numeratori, nei prodotti e nei quozienti), e scrivi le condizioni di esistenza.", hint2[model.kind]],
  };
}

export default defineGenerator({
  code: "V1.M04.A10.g1",
  skill: "V1.M04.A10",
  lesson: "V1.M04.L10",
  title: "Operazioni con le frazioni algebriche",
  levels: [1, 2, 3],
  errors: [SUM, MINUS, QUOTIENT, SQUARE, FACTOR_SIGNS, DENOMINATOR],
  limits: { maxInteger: 100, maxDenominator: 60 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: la risposta è equivalente all'espressione del testo costruita con il motore; per le
  // C.E., un intero tra −10 e 10 sta nell'insieme se e solo se nessun denominatore (né il divisore) lì si annulla.
  verify: (exercise) => {
    const { answer } = exercise;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    if (model.kind === "domain") {
      if (answer.kind !== "set") return false;
      const vanishing = [model.a.den, model.b.den, model.b.num].map((s) => polyExpr(expandedSide(s)));
      for (let k = -10; k <= 10; k++) {
        const z = num(k);
        const excluded = vanishing.some((p) => equivalent(substitute(p, { x: z }), num(0)));
        if (setContains(answer.correct, z) === excluded) return false;
      }
      return true;
    }
    return answer.kind === "expression" && equivalent(answer.correct, promptExpr(model));
  },
});
