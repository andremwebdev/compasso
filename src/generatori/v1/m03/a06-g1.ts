// V1.M03.A06.g1 — Razionalizzare il denominatore.
//
// Risposta: un numero, scritto senza radici al denominatore (vincolo `rationalized`). All'indietro: si
// sceglie la forma del denominatore e i numeri (radicandi senza quadrati, interi piccoli); il risultato
// si calcola con la formula del fattore razionalizzante e si scrive come combinazione di radicali su un
// denominatore intero, ridotta. Le risposte sbagliate:
// - CALC.SOLO_NUMERATORE: il fattore moltiplicato solo al numeratore (10/√5 → 10√5);
// - CALC.RAZIONALIZZAZIONE: con la radice cubica, il fattore uguale al denominatore (5/∛2 → 5∛2/2);
//   con il coniugato, il denominatore calcolato a + b invece di a − b, oppure il fattore con lo stesso
//   segno del denominatore;
// - CALC.PORTARE_FUORI: nel denominatore √(c²d) esce c² invece di c;
// - ALG.QUADRATO_BINOMIO: (√a + c)² calcolato come a + c², senza il doppio prodotto.
//
// Livello 1: una radice al denominatore: k/∛b (fattore ∛(b²) o ∛b), k/√(c²·d) (prima si porta fuori).
// Livello 2: un binomio al denominatore: k/(√a ± √b), k/(√a ± c): si moltiplica per il coniugato.
// Livello 3: radici anche al numeratore, (√a + c)/(√a − c), o coefficienti davanti alle radici,
//   k/(p√a − q√b).
//
// Verifica: la frazione del testo si ricostruisce con le radici del motore e si confronta con la
// risposta con `equivalent`; la risposta deve rispettare `rationalized`.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, div, mul, neg, num, root, sqrt, sub, toLatex, type Expr } from "../../../motore/expr";
import { checkForm } from "../../../motore/form";
import { Rng } from "../../../motore/random/rng";
import { gcd } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const ONLY_TOP: ErrorCode = "CALC.SOLO_NUMERATORE";
const FACTOR: ErrorCode = "CALC.RAZIONALIZZAZIONE";
const OUT: ErrorCode = "CALC.PORTARE_FUORI";
const SQUARE: ErrorCode = "ALG.QUADRATO_BINOMIO";

type Model =
  /** k / ∛(t^m), con t primo e m = 1 o 2. */
  | { readonly kind: "cube"; readonly k: number; readonly t: number; readonly m: 1 | 2 }
  /** k / √(c²·d). */
  | { readonly kind: "squareOut"; readonly k: number; readonly c: number; readonly d: number }
  /** k / (p√a + s·q√b), s = ±1; b = 1 vuol dire un intero (q). */
  | { readonly kind: "conjugate"; readonly k: number; readonly p: number; readonly a: number; readonly s: 1 | -1; readonly q: number; readonly b: number }
  /** (√a + c) / (√a − c). */
  | { readonly kind: "ratio"; readonly a: number; readonly c: number };

// ───────────────────────────── numeri della forma (Σ cᵢ·ⁿ√rᵢ) / D ─────────────────────────────

/** Un termine c·ⁿ√r (r = 1: un intero). */
type Term = readonly [c: number, n: number, r: number];

/** Il radicale ⁿ√r come espressione. */
const radical = (n: number, r: number): Expr => (n === 2 ? sqrt(num(r)) : root(n, num(r)));

/** (Σ termini) / D, ridotto (MCD tolto, denominatore positivo) e scritto come su un quaderno. */
function lin(terms: readonly Term[], den: number): Expr {
  const kept = terms.filter(([c]) => c !== 0);
  if (kept.length === 0) return num(0);
  // Tutti i termini negativi con un denominatore: il meno davanti alla frazione.
  if (kept.every(([c]) => c * Math.sign(den) < 0) && Math.abs(den) > 1 && kept.length > 1) {
    const flipped = lin(kept.map(([c, n, r]) => [-c, n, r] as const), den);
    if (flipped.kind === "div") return neg(flipped);
  }
  let g = Math.abs(den);
  for (const [c] of kept) g = gcd(g, Math.abs(c));
  const sign = den < 0 ? -1 : 1;
  const D = Math.abs(den) / g;
  const cs = kept.map(([c, n, r]) => [(sign * c) / g, n, r] as const);
  const piece = (c: number, n: number, r: number): Expr => (r === 1 ? num(Math.abs(c)) : Math.abs(c) === 1 ? radical(n, r) : mul(num(Math.abs(c)), radical(n, r)));
  // Se il primo termine è negativo e ce n'è uno positivo, si mette davanti il positivo.
  const ordered = cs[0] && cs[0][0] < 0 && cs.some(([c]) => c > 0) ? [...cs.filter(([c]) => c > 0), ...cs.filter(([c]) => c < 0)] : cs;
  const [first, ...rest] = ordered;
  if (!first) return num(0);
  let top: Expr = first[0] < 0 ? neg(piece(...first)) : piece(...first);
  for (const [c, n, r] of rest) top = c < 0 ? sub(top, piece(c, n, r)) : add(top, piece(c, n, r));
  return D === 1 ? top : div(top, num(D));
}

// ───────────────────────────── conti ─────────────────────────────

function correctOf(m: Model): Expr {
  switch (m.kind) {
    case "cube":
      // k ∛(t^(3−m)) / t
      return lin([[m.k, 3, m.t ** (3 - m.m)]], m.t);
    case "squareOut":
      // k / (c√d) = k√d / (c·d)
      return lin([[m.k, 2, m.d]], m.c * m.d);
    case "conjugate":
      // k (p√a − s q√b) / (p²a − q²b)
      return lin([[m.k * m.p, 2, m.a], [-m.s * m.k * m.q, 2, m.b]], m.p * m.p * m.a - m.q * m.q * m.b);
    case "ratio":
      // (√a + c)² / (a − c²) = (a + c² + 2c√a) / (a − c²)
      return lin([[m.a + m.c * m.c, 2, 1], [2 * m.c, 2, m.a]], m.a - m.c * m.c);
  }
}

function wrongCandidates(m: Model): { error: ErrorCode; value: Expr }[] {
  switch (m.kind) {
    case "cube":
      return [
        { error: ONLY_TOP, value: lin([[m.k, 3, m.t ** (3 - m.m)]], 1) },
        { error: FACTOR, value: lin([[m.k, 3, m.t ** m.m]], m.t) },
      ];
    case "squareOut":
      return [
        { error: ONLY_TOP, value: lin([[m.k * m.c, 2, m.d]], 1) },
        { error: OUT, value: lin([[m.k, 2, m.d]], m.c * m.c * m.d) },
      ];
    case "conjugate": {
      const top: Term[] = [[m.k * m.p, 2, m.a], [-m.s * m.k * m.q, 2, m.b]];
      const sameSign: Term[] = [[m.k * m.p, 2, m.a], [m.s * m.k * m.q, 2, m.b]];
      return [
        { error: ONLY_TOP, value: lin(top, 1) },
        { error: FACTOR, value: lin(top, m.p * m.p * m.a + m.q * m.q * m.b) },
        { error: FACTOR, value: lin(sameSign, m.p * m.p * m.a - m.q * m.q * m.b) },
      ];
    }
    case "ratio": {
      const top: Term[] = [[m.a + m.c * m.c, 2, 1], [2 * m.c, 2, m.a]];
      return [
        { error: SQUARE, value: lin([[m.a + m.c * m.c, 2, 1]], m.a - m.c * m.c) },
        { error: ONLY_TOP, value: lin(top, 1) },
        { error: FACTOR, value: lin(top, m.a + m.c * m.c) },
      ];
    }
  }
}

const wrongOf = (m: Model) => distinctWrongExpressions(correctOf(m), wrongCandidates(m));

// ───────────────────────────── costruzione ─────────────────────────────

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15] as const;

function buildLevel1(rng: Rng_): Model {
  if (rng.bool()) {
    return { kind: "cube", k: rng.int(1, 12), t: rng.pick([2, 3, 5] as const), m: rng.pick([1, 1, 2] as const) };
  }
  return { kind: "squareOut", k: rng.int(1, 12), c: rng.int(2, 4), d: rng.pick([2, 3, 5, 6, 7] as const) };
}

function buildLevel2(rng: Rng_): Model {
  const k = rng.int(1, 12);
  const s = rng.sign();
  if (rng.bool()) {
    // k / (√a ± √b) con a > b
    const [a, b] = rng.sample(SQUAREFREE.slice(0, 7), 2).sort((x, y) => y - x) as [number, number];
    return { kind: "conjugate", k, p: 1, a, s, q: 1, b };
  }
  // k / (√a ± c)
  return { kind: "conjugate", k, p: 1, a: rng.pick(SQUAREFREE), s, q: rng.int(1, 4), b: 1 };
}

function buildLevel3(rng: Rng_): Model {
  if (rng.bool()) return { kind: "ratio", a: rng.pick(SQUAREFREE), c: rng.int(1, 3) };
  const [a, b] = rng.sample([2, 3, 5, 6, 7] as const, 2) as [number, number];
  return { kind: "conjugate", k: rng.int(1, 12), p: rng.int(1, 3), a, s: -1, q: rng.int(1, 3), b };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    if (m.kind === "conjugate") {
      const den = m.p * m.p * m.a - m.q * m.q * m.b;
      if (den === 0 || Math.abs(den) > 60) continue;
      // Al livello 3 almeno una radice ha un numero davanti.
      if (level === 3 && m.p === 1 && m.q === 1) continue;
    }
    if (m.kind === "ratio" && m.a === m.c * m.c) continue;
    if (wrongOf(m).length >= (level === 1 ? 2 : 3)) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const coefRoot = (p: number, a: number): string => (a === 1 ? String(p) : `${p === 1 ? "" : p}\\sqrt{${a}}`);

function denominatorLatex(m: Model): string {
  switch (m.kind) {
    case "cube":
      return `\\sqrt[3]{${m.t ** m.m}}`;
    case "squareOut":
      return `\\sqrt{${m.c * m.c * m.d}}`;
    case "conjugate":
      return `${coefRoot(m.p, m.a)} ${m.s < 0 ? "-" : "+"} ${coefRoot(m.q, m.b)}`;
    case "ratio":
      return `\\sqrt{${m.a}} - ${m.c}`;
  }
}

const numeratorLatex = (m: Model): string => (m.kind === "ratio" ? `\\sqrt{${m.a}} + ${m.c}` : String(m.k));
const fractionLatex = (m: Model): string => `\\dfrac{${numeratorLatex(m)}}{${denominatorLatex(m)}}`;

function stepsOf(m: Model): string[] {
  const result = toLatex(correctOf(m));
  switch (m.kind) {
    case "cube": {
      const missing = m.t ** (3 - m.m);
      return [
        `**Passo 1. Il fattore.** $\\sqrt[3]{${m.t ** m.m}} = \\sqrt[3]{${m.t}^{${m.m}}}$: per arrivare a $${m.t}^{3}$ ${3 - m.m === 1 ? "manca un fattore" : "mancano due fattori"} $${m.t}$, quindi si moltiplica sopra e sotto per $\\sqrt[3]{${missing}}$.`,
        `**Passo 2. Il conto.** $\\dfrac{${m.k}\\sqrt[3]{${missing}}}{\\sqrt[3]{${m.t ** m.m}} \\cdot \\sqrt[3]{${missing}}} = \\dfrac{${m.k}\\sqrt[3]{${missing}}}{\\sqrt[3]{${m.t ** 3}}} = \\dfrac{${m.k}\\sqrt[3]{${missing}}}{${m.t}}$.`,
        `**Passo 3. Semplifica.** $${result}$.`,
      ];
    }
    case "squareOut":
      return [
        `**Passo 1. Porta fuori.** $\\sqrt{${m.c * m.c * m.d}} = \\sqrt{${m.c}^{2} \\cdot ${m.d}} = ${m.c}\\sqrt{${m.d}}$, quindi la frazione è $\\dfrac{${m.k}}{${m.c}\\sqrt{${m.d}}}$. Il fattore è $\\sqrt{${m.d}}$.`,
        `**Passo 2. Il conto.** $\\dfrac{${m.k}\\sqrt{${m.d}}}{${m.c}\\sqrt{${m.d}} \\cdot \\sqrt{${m.d}}} = \\dfrac{${m.k}\\sqrt{${m.d}}}{${m.c * m.d}}$.`,
        `**Passo 3. Semplifica.** $${result}$.`,
      ];
    case "conjugate": {
      const conj = `${coefRoot(m.p, m.a)} ${m.s < 0 ? "+" : "-"} ${coefRoot(m.q, m.b)}`;
      const A = m.p * m.p * m.a;
      const B = m.q * m.q * m.b;
      const sq = (p: number, a: number): string => (a === 1 ? `${p}^{2}` : `\\left(${coefRoot(p, a)}\\right)^{2}`);
      const squares = `${sq(m.p, m.a)} - ${sq(m.q, m.b)}`;
      return [
        `**Passo 1. Il fattore.** Il denominatore è ${m.s < 0 ? "una differenza" : "una somma"}: si moltiplica sopra e sotto per il coniugato $${conj}$.`,
        `**Passo 2. Il conto.** Al denominatore $\\left(${denominatorLatex(m)}\\right)\\left(${conj}\\right) = ${squares} = ${A} - ${B} = ${A - B}$, quindi la frazione diventa $\\dfrac{${m.k}\\left(${conj}\\right)}{${A - B}}$.`,
        `**Passo 3. Semplifica.** $${result}$.`,
      ];
    }
    case "ratio": {
      const A = m.a;
      const C = m.c * m.c;
      return [
        `**Passo 1. Il fattore.** Il coniugato del denominatore è $\\sqrt{${m.a}} + ${m.c}$: si moltiplica sopra e sotto.`,
        `**Passo 2. Il conto.** Al numeratore $\\left(\\sqrt{${m.a}} + ${m.c}\\right)^{2} = ${A} + 2 \\cdot ${m.c} \\cdot \\sqrt{${m.a}} + ${C} = ${A + C} + ${2 * m.c}\\sqrt{${m.a}}$ (con il doppio prodotto). Al denominatore $\\left(\\sqrt{${m.a}}\\right)^{2} - ${m.c}^{2} = ${A} - ${C} = ${A - C}$.`,
        gcd(gcd(A + C, 2 * m.c), Math.abs(A - C)) === 1 && A - C > 0
          ? `**Passo 3. Semplifica.** Non c'è un divisore comune: il risultato è $${result}$.`
          : `**Passo 3. Semplifica.** $\\dfrac{${A + C} + ${2 * m.c}\\sqrt{${m.a}}}{${A - C}} = ${result}$.`,
      ];
    }
  }
}

function draftOf(m: Model): ExerciseDraft {
  return {
    prompt: `Razionalizza il denominatore di $${fractionLatex(m)}$ e semplifica il risultato.`,
    answer: { kind: "number", correct: correctOf(m), wrong: wrongOf(m), mode: exact, form: ["rationalized"] },
    steps: stepsOf(m).map((text) => ({ text })),
    hints: [
      m.kind === "conjugate" || m.kind === "ratio"
        ? "Al denominatore c'è una somma o una differenza con radici: il fattore è il coniugato, con il segno in mezzo cambiato."
        : "Cerca il fattore che, moltiplicato per il denominatore, dà una potenza con esponente uguale all'indice della radice.",
      "Il fattore va scritto sopra e sotto. Al denominatore usa $(x + y)(x - y) = x^2 - y^2$ oppure $\\sqrt[n]{b} \\cdot \\sqrt[n]{b^{n-1}} = b$, poi semplifica.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function fractionExpr(m: Model): Expr {
  const r = (p: number, a: number): Expr => (a === 1 ? num(p) : p === 1 ? sqrt(num(a)) : mul(num(p), sqrt(num(a))));
  switch (m.kind) {
    case "cube":
      return div(num(m.k), root(3, num(m.t ** m.m)));
    case "squareOut":
      return div(num(m.k), sqrt(num(m.c * m.c * m.d)));
    case "conjugate":
      return div(num(m.k), m.s < 0 ? sub(r(m.p, m.a), r(m.q, m.b)) : add(r(m.p, m.a), r(m.q, m.b)));
    case "ratio":
      return div(add(sqrt(num(m.a)), num(m.c)), sub(sqrt(num(m.a)), num(m.c)));
  }
}

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "number") return false;
  if (!exercise.prompt.includes(fractionLatex(m))) return false;
  return equivalent(fractionExpr(m), exercise.answer.correct) && checkForm(exercise.answer.correct, "rationalized").ok;
}

export default defineGenerator({
  code: "V1.M03.A06.g1",
  skill: "V1.M03.A06",
  lesson: "V1.M03.L06",
  title: "Razionalizzare il denominatore",
  levels: [1, 2, 3],
  errors: [ONLY_TOP, FACTOR, OUT, SQUARE],
  limits: { maxInteger: 400, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
