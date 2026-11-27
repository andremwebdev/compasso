// V1.M04.A09.g1 — Frazioni algebriche: condizioni di esistenza e semplificazione.
//
// Due forme di esercizio:
// - «C.E.»: le condizioni di esistenza di una frazione algebrica; risposta un insieme (i reali tolti gli
//   zeri del denominatore);
// - «semplifica»: la frazione semplificata; risposta un'espressione con il vincolo `reducedFraction`.
// All'indietro: si scelgono i fattori (il fattore comune, quelli che restano sopra e sotto, i numeri
// davanti) e si moltiplicano per scrivere numeratore e denominatore del testo.
//
// Le risposte sbagliate rifanno il conto con UN errore:
// - COND.DENOMINATORE: uno zero del denominatore dimenticato (anche: le C.E. lette dalla frazione già
//   semplificata, che perde lo zero del fattore comune);
// - ALG.SEGNI_FATTORI: gli zeri presi con il segno sbagliato (x + 2 ≠ 0 letto x ≠ 2); un trinomio
//   scomposto con i segni sbagliati; due fattori opposti (3 − x e x − 3) semplificati come uguali, senza −1;
// - ALG.SEMPLIFICAZIONE_ADDENDI: tolto lo stesso addendo sopra e sotto (x² con x²);
// - ALG.QUADRATO_BINOMIO: x² − r² scomposto come (x − r)², prima di semplificare.
//
// Livello 1: C.E. con il denominatore di secondo grado; semplificazione con un raccoglimento e una
//   differenza di quadrati.
// Livello 2: C.E. con tre zeri (raccoglimento e differenza di quadrati) o con un fattore che non si
//   annulla (x² + b); semplificazione tra trinomi.
// Livello 3: fattori opposti (3 − x) con un trinomio, due lettere (x² − xy)/(x² − y²), C.E. con il
//   denominatore in parte scomposto e un fattore scritto r − x.
//
// Verifica: con il motore, l'insieme risposta contiene un punto se e solo se il denominatore del testo
// lì non vale zero (provati gli zeri e punti vicini); la frazione semplificata è equivalente a quella del testo.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { simplify } from "../../../motore/algebra/simplify";
import { div, mul, neg, num, substitute, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { points, setComplement, setContains, setToLatex, type SolutionSet } from "../../../motore/sets";
import { mono, polyEq, polyExpr, polyMul, polyNeg, polySub, reduce, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, distinctWrongSets, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const DENOMINATOR: ErrorCode = "COND.DENOMINATORE";
const FACTOR_SIGNS: ErrorCode = "ALG.SEGNI_FATTORI";
const ADDENDS: ErrorCode = "ALG.SEMPLIFICAZIONE_ADDENDI";
const SQUARE: ErrorCode = "ALG.QUADRATO_BINOMIO";

/** Un lato della frazione: un numero davanti e i fattori (polinomi in x e y). */
interface Side {
  readonly c: number;
  readonly factors: readonly Poly[];
}

interface Model {
  readonly kind: "domain" | "simplify";
  readonly num: Side;
  readonly den: Side;
  /** Se c'è, il denominatore si mostra come prodotto di questi polinomi (sviluppati), già in parte scomposto. */
  readonly denGroups?: readonly Poly[];
}

// ───────────────────────────── fattori e frazioni ─────────────────────────────

const X = (c: number, e = 1): Mono => mono(c, e, 0);
const Y = (c: number, e = 1): Mono => mono(c, 0, e);
const K = (c: number): Mono => mono(c);
/** Il binomio x − r. */
const lin = (r: number): Poly => [X(1), K(-r)];
/** Il binomio r − x, scritto con il numero prima. */
const linOpposite = (r: number): Poly => [K(r), X(-1)];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Il prodotto sviluppato di un lato. */
const expandedSide = (side: Side): Poly => reduce(side.factors.reduce<Poly>((p, f) => polyMul(p, f), [K(side.c)]));

/** Un prodotto di fattori scritto: numero davanti (se non è 1), poi i fattori; lo stesso fattore come potenza. */
function sideExpr(c: number, factors: readonly Poly[]): Expr {
  const merged: { poly: Poly; power: number }[] = [];
  for (const f of factors) {
    const twin = merged.findIndex((m) => polyEq(m.poly, f));
    if (twin >= 0) merged[twin] = { poly: f, power: (merged[twin] as { power: number }).power + 1 };
    else merged.push({ poly: f, power: 1 });
  }
  const parts: Expr[] = [];
  if (c !== 1 || merged.length === 0) parts.push(num(c));
  for (const m of merged) parts.push(m.power === 1 ? polyExpr(m.poly) : { kind: "pow", base: polyExpr(m.poly), exp: num(m.power) });
  return parts.length === 1 ? (parts[0] as Expr) : mul(...parts);
}

/**
 * Semplifica: toglie i fattori uguali sopra e sotto (e quelli opposti, contando un −1), riduce i numeri.
 * Con `opposedAsEqual` due fattori opposti si tolgono senza il −1 (è l'errore tipico).
 */
function simplifyFraction(n: Side, d: Side, opposedAsEqual = false): Expr {
  const top = [...n.factors];
  const bottom: Poly[] = [];
  let sign = 1;
  for (const f of d.factors) {
    const same = top.findIndex((t) => polyEq(t, f));
    if (same >= 0) {
      top.splice(same, 1);
      continue;
    }
    const opposite = top.findIndex((t) => polyEq(t, polyNeg(f)));
    if (opposite >= 0) {
      top.splice(opposite, 1);
      if (!opposedAsEqual) sign = -sign;
      continue;
    }
    bottom.push(f);
  }
  const g = gcd(n.c, d.c);
  let [cn, cd] = [n.c / g, d.c / g];
  if (cd < 0) [cn, cd] = [-cn, -cd];
  if (cn < 0) [cn, sign] = [-cn, -sign];
  const numerator = sideExpr(cn, top);
  const value = bottom.length === 0 && cd === 1 ? numerator : div(numerator, sideExpr(cd, bottom));
  return sign < 0 ? neg(value) : value;
}

/** Gli zeri reali dei fattori di primo grado in x (x − r, r − x, x); x² + b non ne ha. */
function zerosOf(factors: readonly Poly[]): Rational[] {
  const out: Rational[] = [];
  for (const f of factors) {
    const linear = f.filter((m) => m.x === 1 && m.y === 0);
    const constant = f.filter((m) => m.x === 0 && m.y === 0);
    if (f.length > 2 || linear.length !== 1 || f.some((m) => m.y > 0 || m.x > 1)) continue;
    const a = (linear[0] as Mono).c;
    const b = constant[0]?.c ?? Rational.ZERO;
    const zero = b.neg().div(a);
    if (!out.some((z) => z.eq(zero))) out.push(zero);
  }
  return out.sort((p, q) => p.cmp(q));
}

const domainOf = (zeros: readonly Rational[]): SolutionSet => setComplement(points(...zeros));

// ───────────────────────────── risposte sbagliate ─────────────────────────────

function wrongDomains(model: Model): WrongCandidate<SolutionSet>[] {
  const zeros = zerosOf(model.den.factors);
  const out: WrongCandidate<SolutionSet>[] = [];
  // Uno zero dimenticato (anche quello che sparisce semplificando).
  for (const z of zeros) out.push(zeros.length > 1 ? { error: DENOMINATOR, value: domainOf(zeros.filter((w) => !w.eq(z))) } : null);
  // Gli zeri con il segno cambiato.
  out.push({ error: FACTOR_SIGNS, value: domainOf(zeros.map((z) => z.neg())) });
  // Solo il fattore scritto r − x letto con il segno sbagliato: r − x ≠ 0 diventa x ≠ −r.
  const opposite = model.den.factors.find((f) => f.length === 2 && f[0]?.x === 0 && f[1]?.x === 1 && (f[1] as Mono).c.sign() < 0);
  if (opposite) {
    const z = zerosOf([opposite])[0] as Rational;
    out.push({ error: FACTOR_SIGNS, value: domainOf(zeros.map((w) => (w.eq(z) ? z.neg() : w))) });
  }
  // Le C.E. lette dalla frazione semplificata (perde gli zeri dei fattori comuni).
  const commonZeros = zerosOf(model.den.factors.filter((f) => model.num.factors.some((t) => polyEq(t, f) || polyEq(t, polyNeg(f)))));
  if (commonZeros.length > 0) out.unshift({ error: DENOMINATOR, value: domainOf(zeros.filter((z) => !commonZeros.some((w) => w.eq(z)))) });
  return out;
}

/** Un trinomio (x − a)(x − b) del lato scomposto con i segni sbagliati: (x + a)(x + b). */
function flipTrinomial(side: Side): Side | null {
  const linear = side.factors.map((f, k) => ({ f, k })).filter(({ f }) => f.length === 2 && f[0]?.x === 1 && f[0].c.eq(1) && f[1]?.x === 0 && f[1].y === 0 && (f[0]?.y ?? 0) === 0);
  if (linear.length < 2) return null;
  const [p, q] = [linear[0] as { f: Poly; k: number }, linear[1] as { f: Poly; k: number }];
  // Solo se i due binomi non sono opposti tra loro (x − r e x + r: lì è una differenza di quadrati).
  if (polyEq(polyMul(p.f, q.f).filter((m) => m.x === 1), [])) return null;
  const flip = (f: Poly): Poly => f.map((m) => (m.x === 0 ? { ...m, c: m.c.neg() } : m));
  return { c: side.c, factors: side.factors.map((f, k) => (k === p.k || k === q.k ? flip(f) : f)) };
}

/** Una differenza di quadrati (x − r)(x + r) del lato scritta come (x − r)² oppure (x + r)². */
function squaresInsteadOfDifference(side: Side): Side[] {
  for (let i = 0; i < side.factors.length; i++) {
    for (let j = i + 1; j < side.factors.length; j++) {
      const [a, b] = [side.factors[i] as Poly, side.factors[j] as Poly];
      const differenceOfSquares = a.length === 2 && b.length === 2 && polyEq([a[0] as Mono], [b[0] as Mono]) && polyEq([a[1] as Mono], polyNeg([b[1] as Mono]));
      if (differenceOfSquares) {
        // a e b differiscono solo nel segno del secondo termine: (x − r)(x + r). Al posto di uno si scrive l'altro.
        return [
          { c: side.c, factors: side.factors.map((f, k) => (k === j ? a : f)) },
          { c: side.c, factors: side.factors.map((f, k) => (k === i ? b : f)) },
        ];
      }
    }
  }
  return [];
}

function wrongSimplifications(model: Model): WrongCandidate<Expr>[] {
  const { num: n, den: d } = model;
  const out: WrongCandidate<Expr>[] = [];
  // Lo stesso addendo tolto sopra e sotto: un termine uguale nel numeratore e nel denominatore del testo
  // (x² e x², oppure 6 e 6).
  const [N, D] = [expandedSide(n), expandedSide(d)];
  const shared = N.find((t) => D.some((m) => m.x === t.x && m.y === t.y && m.c.eq(t.c)));
  if (shared && N.length > 1) {
    const [N2, D2] = [polySub(N, [shared]), polySub(D, [shared])];
    if (D2.length > 0) out.push({ error: ADDENDS, value: simplify(div(polyExpr(N2), polyExpr(D2))) });
  }
  // Fattori opposti semplificati come se fossero uguali.
  out.push({ error: FACTOR_SIGNS, value: simplifyFraction(n, d, true) });
  // Una differenza di quadrati scomposta come quadrato (sopra o sotto).
  for (const top of squaresInsteadOfDifference(n)) out.push({ error: SQUARE, value: simplifyFraction(top, d) });
  for (const bottom of squaresInsteadOfDifference(d)) out.push({ error: SQUARE, value: simplifyFraction(n, bottom) });
  // Un trinomio scomposto con i segni sbagliati.
  const flippedTop = flipTrinomial(n);
  if (flippedTop) out.push({ error: FACTOR_SIGNS, value: simplifyFraction(flippedTop, d) });
  const flippedBottom = flipTrinomial(d);
  if (flippedBottom) out.push({ error: FACTOR_SIGNS, value: simplifyFraction(n, flippedBottom) });
  return out;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const nz = (rng: Rng_, max: number, excluded: number[] = []): number => rng.intExcept(-max, max, [0, ...excluded]);

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.5)) {
    // C.E.: denominatore (x − a)(x − b), numeratore di primo grado.
    const a = nz(rng, 6);
    const b = nz(rng, 6, [a]);
    return { kind: "domain", num: { c: 1, factors: [lin(nz(rng, 6, [a, b]))] }, den: { c: 1, factors: [lin(a), lin(b)] } };
  }
  const shape = rng.pick(["collectOverSquares", "collectOverSquares", "collectOverSquares", "opposite"] as const);
  const r = nz(rng, 6);
  if (shape === "opposite") {
    // (r − x) / (x² − r²), con r positivo: il −1 dei fattori opposti.
    const p = rng.int(1, 9);
    return { kind: "simplify", num: { c: 1, factors: [linOpposite(p)] }, den: { c: 1, factors: [lin(p), lin(-p)] } };
  }
  // k·x·(x − r) da una parte (raccoglimento), (x − r)(x + r) dall'altra (differenza di quadrati).
  const k = rng.pick([1, 1, 2, 3]);
  const collected: Side = { c: k, factors: [[X(1)], lin(r)] };
  const squares: Side = { c: 1, factors: [lin(r), lin(-r)] };
  return rng.bool() ? { kind: "simplify", num: collected, den: squares } : { kind: "simplify", num: squares, den: collected };
}

function buildLevel2(rng: Rng_): Model {
  if (rng.bool(0.5)) {
    // C.E. con tre zeri, x(x − r)(x + r), oppure con un fattore x² + b che non si annulla.
    const r = rng.int(1, 5);
    if (rng.bool(0.6)) return { kind: "domain", num: { c: 1, factors: [lin(nz(rng, 6, [r, -r]))] }, den: { c: rng.pick([1, 2]), factors: [[X(1)], lin(r), lin(-r)] } };
    // (x − a)(x² + b): si scompone con il raccoglimento parziale; x² + b non si annulla.
    const a = nz(rng, 5);
    return { kind: "domain", num: { c: 1, factors: [lin(nz(rng, 5, [a]))] }, den: { c: 1, factors: [lin(a), [X(1, 2), K(rng.pick([1, 2, 3, 4, 9]))]] } };
  }
  // Semplifica tra trinomi: (x − a)(x − b) / ((x − a)(x − c)).
  const a = nz(rng, 5);
  const b = nz(rng, 5, [a]);
  const c = nz(rng, 5, [a, b]);
  return { kind: "simplify", num: { c: 1, factors: [lin(a), lin(b)] }, den: { c: 1, factors: [lin(a), lin(c)] } };
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["opposite", "opposite", "twoLetters", "twoLetters", "domainOpposite", "domainOpposite"] as const);
  switch (shape) {
    case "opposite": {
      // (r − x)(x + s) / ((x − r)(x − s)): due fattori opposti, e numeratore e denominatore del testo
      // hanno lo stesso termine noto r·s (è lì che si cade nella semplificazione di addendi).
      const r = rng.int(1, 6);
      const s = nz(rng, 6, [r, -r]);
      return { kind: "simplify", num: { c: 1, factors: [linOpposite(r), lin(-s)] }, den: { c: 1, factors: [lin(r), lin(s)] } };
    }
    case "twoLetters": {
      // Con a = x − p y e b = x + p y: x·a / (a·b) = x/(x + p y), oppure al contrario, oppure a² / (a·b).
      // In tutte numeratore e denominatore del testo cominciano con x² (lì si cade negli addendi).
      const p = rng.int(1, 5);
      const sign = rng.sign();
      const a: Poly = [X(1), Y(-p * sign)];
      const b: Poly = [X(1), Y(p * sign)];
      const shape = rng.pick(["xOverSquares", "squaresOverX", "squareOverSquares", "squaresOverSquare"] as const);
      const top = shape === "xOverSquares" ? [[X(1)], a] : shape === "squareOverSquares" ? [a, a] : [a, b];
      const bottom = shape === "squaresOverX" ? [[X(1)], a] : shape === "squaresOverSquare" ? [a, a] : [a, b];
      return { kind: "simplify", num: { c: 1, factors: top }, den: { c: 1, factors: bottom } };
    }
    case "domainOpposite": {
      // C.E. con il denominatore già in parte scomposto: (r − x)(x² − s²), oppure x²(r − x)(x + s).
      const r = rng.int(1, 6);
      const s = rng.intExcept(1, 5, [r]);
      if (rng.bool()) {
        return { kind: "domain", num: { c: 1, factors: [lin(nz(rng, 5, [r, s, -s]))] }, den: { c: 1, factors: [linOpposite(r), lin(s), lin(-s)] }, denGroups: [linOpposite(r), [X(1, 2), K(-s * s)]] };
      }
      const t = nz(rng, 5, [r]);
      return { kind: "domain", num: { c: 1, factors: [lin(nz(rng, 5, [r, t, 0]))] }, den: { c: 1, factors: [[X(1)], [X(1)], linOpposite(r), lin(t)] }, denGroups: [[X(1, 2)], linOpposite(r), lin(t)] };
    }
  }
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const needed = level === 1 ? 2 : 3;
    if (model.kind === "domain") {
      const right = domainOf(zerosOf(model.den.factors));
      if (distinctWrongSets(right, wrongDomains(model)).length >= needed) return model;
    } else {
      const right = simplifyFraction(model.num, model.den);
      if (distinctWrongExpressions(right, wrongSimplifications(model)).length >= needed) return model;
    }
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

/** La frazione del testo: numeratore sviluppato; denominatore sviluppato oppure come prodotto dei gruppi dati. */
function fractionExpr(model: Model): Expr {
  const den = model.denGroups ? mul(...model.denGroups.map(polyExpr)) : polyExpr(expandedSide(model.den));
  // Un numeratore con il primo coefficiente negativo si scrive dal termine noto: 5 − x, non −x + 5.
  const N = expandedSide(model.num);
  const reversed = [...N].reverse();
  return div(polyExpr((N[0] as Mono).c.sign() < 0 && (reversed[0] as Mono).c.sign() > 0 ? reversed : N), den);
}
const factoredFraction = (model: Model): Expr => div(sideExpr(model.num.c, model.num.factors), sideExpr(model.den.c, model.den.factors));
const r$ = (r: Rational): string => toLatex(num(r));

function draftOf(model: Model): ExerciseDraft {
  const fraction = toLatex(fractionExpr(model)).replace(/^\\frac/, "\\dfrac");
  const zeros = zerosOf(model.den.factors);
  const ce = zeros.map((z) => `x \\ne ${r$(z)}`).join(",\\ ");
  const noZero = model.den.factors.filter((f) => zerosOf([f]).length === 0 && f.some((m) => m.x === 2));
  const scomposta = `$${toLatex(sideExpr(model.den.c, model.den.factors))}$`;
  if (model.kind === "domain") {
    const right = domainOf(zeros);
    return {
      prompt: `Scrivi le condizioni di esistenza della frazione $${fraction}$.`,
      answer: { kind: "set", variable: "x", correct: right, wrong: distinctWrongSets(right, wrongDomains(model)) },
      steps: [
        { text: `Si scompone il denominatore: ${scomposta}. Il numeratore non dà condizioni.` },
        { text: `Un prodotto vale zero quando almeno un fattore vale zero: ogni fattore deve essere diverso da zero.${noZero.length ? ` Il fattore $${toLatex(polyExpr(noZero[0] as Poly))}$ non si annulla mai (è una somma di un quadrato e di un numero positivo).` : ""}` },
        { text: `C.E.: $${ce}$, cioè $${setToLatex(right)}$.` },
      ],
      hints: [
        "La frazione esiste dove il denominatore è diverso da zero: scomponilo in fattori.",
        "Ogni fattore del denominatore va posto diverso da zero. Scrivi le esclusioni come unione di intervalli, per esempio $(-\\infty; 2) \\cup (2; 3) \\cup (3; +\\infty)$; con la tastiera del computer vale anche $x \\ne 2$ e $x \\ne 3$.",
      ],
    };
  }
  const correct = simplifyFraction(model.num, model.den);
  const hasOpposite = model.num.factors.some((t) => model.den.factors.some((f) => polyEq(t, polyNeg(f))));
  return {
    prompt: `Semplifica la frazione algebrica $${fraction}$. Scrivi la frazione ridotta ai minimi termini (le condizioni di esistenza restano quelle della frazione di partenza).`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, wrongSimplifications(model)), form: ["reducedFraction"] },
    steps: [
      { text: `**Passo 1.** Si scompongono numeratore e denominatore: $$${toLatex(factoredFraction(model)).replace(/^\\frac/, "\\dfrac")}$$` },
      { text: `**Passo 2.** C.E. dal denominatore scomposto: ${zeros.length ? `$${ce}$` : "nessuna, il denominatore non si annulla mai"}${model.den.factors.some((f) => f.some((m) => m.y > 0)) ? " (e il fattore con la $y$ diverso da zero)" : ""}.` },
      { text: `**Passo 3.** Si semplificano i fattori comuni${hasOpposite ? ", e due fattori opposti lasciano un $-1$" : ""}${model.num.c !== 1 || model.den.c !== 1 ? ", e si riducono i numeri" : ""}.` },
      { text: `**Passo 4.** $$${toLatex(fractionExpr(model)).replace(/^\\frac/, "\\dfrac")} = ${toLatex(correct).replace(/\\frac/, "\\dfrac")}$$ con le C.E. del passo 2.` },
    ],
    hints: [
      "Si semplificano solo i fattori, mai gli addendi: prima si scompongono numeratore e denominatore.",
      hasOpposite
        ? "Cerca un fattore che compare sopra e sotto con il segno opposto, come $3 - x$ e $x - 3$: si semplifica lasciando $-1$."
        : "Scomponi con raccoglimento, differenza di quadrati o trinomio speciale, poi togli i fattori uguali sopra e sotto.",
    ],
  };
}

/** Il denominatore del testo vale zero in z? (calcolo esatto con il motore) */
function denominatorZero(model: Model, z: Rational): boolean {
  return equivalent(substitute(polyExpr(expandedSide(model.den)), { x: num(z), y: num(1) }), num(0));
}

export default defineGenerator({
  code: "V1.M04.A09.g1",
  skill: "V1.M04.A09",
  lesson: "V1.M04.L09",
  title: "Frazioni algebriche: condizioni di esistenza e semplificazione",
  levels: [1, 2, 3],
  errors: [DENOMINATOR, FACTOR_SIGNS, ADDENDS, SQUARE],
  limits: { maxInteger: 100, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: per le C.E., ogni intero tra −10 e 10 sta nell'insieme se e solo se il
  // denominatore del testo lì non vale zero; per la semplificazione, la risposta è equivalente alla frazione del testo.
  verify: (exercise) => {
    const { answer } = exercise;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    if (model.kind === "domain") {
      if (answer.kind !== "set") return false;
      for (let k = -10; k <= 10; k++) {
        const z = Rational.of(k);
        if (setContains(answer.correct, num(z)) === denominatorZero(model, z)) return false;
      }
      return true;
    }
    return answer.kind === "expression" && equivalent(answer.correct, fractionExpr(model));
  },
});
