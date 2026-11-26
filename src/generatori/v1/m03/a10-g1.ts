// V1.M03.A10.g1 — Percentuali, variazioni percentuali, percentuali successive.
//
// Risposta: un numero (euro, oppure una percentuale scritta come numero con il segno). All'indietro: si
// scelgono il valore e le percentuali in modo che ogni risultato sia un decimale con al più due cifre
// dopo la virgola (si calcola con i razionali esatti). Le risposte sbagliate:
// - CALC.PERCENTUALE: p euro al posto del p%; lo sconto al posto del prezzo scontato; la variazione divisa
//   per il valore finale; la differenza in euro presa come percentuale; il rapporto senza ×100; il
//   fattore preso come variazione; la variazione applicata di nuovo invece che tolta;
// - CALC.PERCENTUALI_SUCCESSIVE: percentuali successive sommate; per tornare indietro, la stessa
//   percentuale applicata al valore finale;
// - CALC.REGOLA_SEGNI: variazione con il segno sbagliato (una diminuzione data come aumento).
//
// Livello 1: un aumento o uno sconto su un prezzo; che percentuale è a di b.
// Livello 2: la variazione percentuale da un valore a un altro; la variazione complessiva di due
//   variazioni successive.
// Livello 3: il valore di partenza da quello dopo una variazione; il valore finale dopo tre variazioni.
//
// Verifica: il risultato si ricontrolla nell'altro verso con i razionali esatti (il valore trovato,
// trasformato con le variazioni del testo, ridà il dato; la percentuale trovata, applicata al valore
// iniziale, ridà il finale).

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { decimal, frac, num, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const PERCENT: ErrorCode = "CALC.PERCENTUALE";
const SUCCESSIVE: ErrorCode = "CALC.PERCENTUALI_SUCCESSIVE";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";

type Model =
  /** x aumentato (p > 0) o scontato (p < 0) del |p|%. */
  | { readonly kind: "change"; readonly x: number; readonly p: number }
  /** Che percentuale è a di b. */
  | { readonly kind: "ratio"; readonly a: number; readonly b: number }
  /** Variazione percentuale da vi a vf. */
  | { readonly kind: "variation"; readonly vi: number; readonly vf: number }
  /** Variazione complessiva di più variazioni (percentuali con segno). */
  | { readonly kind: "overall"; readonly ps: readonly number[] }
  /** Il valore di prima: dopo la variazione p vale y. */
  | { readonly kind: "reverse"; readonly y: number; readonly p: number }
  /** Il valore finale di x dopo più variazioni. */
  | { readonly kind: "final"; readonly x: number; readonly ps: readonly number[] };

const R = (p: number, q = 1): Rational => Rational.of(p, q);
const factor = (p: number): Rational => R(100 + p, 100);
const product = (ps: readonly number[]): Rational => ps.reduce((acc, p) => acc.mul(factor(p)), R(1));

/** Un decimale limitato con al più `max` cifre dopo la virgola (null altrimenti). */
function places(r: Rational, max = 2): number | null {
  for (let k = 0; k <= max; k++) if (r.mul(10 ** k).isInteger()) return k;
  return null;
}

/** Il numero scritto come decimale (o intero). */
function decExpr(r: Rational): Expr {
  const k = places(r, 6);
  if (k === null) return frac(r.n, r.d);
  if (k === 0) return num(Number(r.n));
  const scaled = Number(r.mul(10 ** k).n);
  const sign = scaled < 0 ? "-" : "";
  const digits = String(Math.abs(scaled)).padStart(k + 1, "0");
  return decimal(`${sign}${digits.slice(0, -k)},${digits.slice(-k)}`);
}

/** LaTeX di un numero decimale all'italiana. */
function decLatex(r: Rational): string {
  const k = places(r, 6) ?? 0;
  const scaled = Number(r.mul(10 ** k).n);
  const sign = scaled < 0 ? "-" : "";
  const digits = String(Math.abs(scaled)).padStart(k + 1, "0");
  return k === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -k)}{,}${digits.slice(-k)}`;
}
const signedPercent = (r: Rational): string => `${r.cmp(0) > 0 ? "+" : ""}${decLatex(r)}\\%`;

// ───────────────────────────── conti ─────────────────────────────

function correctValue(m: Model): Rational {
  switch (m.kind) {
    case "change":
      return factor(m.p).mul(m.x);
    case "ratio":
      return R(100 * m.a, m.b);
    case "variation":
      return R(100 * (m.vf - m.vi), m.vi);
    case "overall":
      return product(m.ps).sub(1).mul(100);
    case "reverse":
      return R(m.y).div(factor(m.p));
    case "final":
      return product(m.ps).mul(m.x);
  }
}

function wrongValues(m: Model): { error: ErrorCode; value: Rational }[] {
  switch (m.kind) {
    case "change":
      return [
        { error: PERCENT, value: R(m.x + m.p) },
        { error: PERCENT, value: R(Math.abs(m.p) * m.x, 100) },
      ];
    case "ratio":
      return [
        { error: PERCENT, value: R(100 * m.b, m.a) },
        { error: PERCENT, value: R(m.a, m.b) },
      ];
    case "variation":
      return [
        { error: PERCENT, value: R(100 * (m.vf - m.vi), m.vf) },
        { error: PERCENT, value: R(m.vf - m.vi) },
        { error: SIGNS, value: correctValue(m).neg() },
      ];
    case "overall":
      return [
        { error: SUCCESSIVE, value: R(m.ps.reduce((a, b) => a + b, 0)) },
        { error: PERCENT, value: product(m.ps).mul(100) },
        { error: SIGNS, value: correctValue(m).neg() },
      ];
    case "reverse":
      return [
        { error: SUCCESSIVE, value: factor(-m.p).mul(m.y) },
        { error: PERCENT, value: R(m.y - m.p) },
        { error: PERCENT, value: factor(m.p).mul(m.y) },
      ];
    case "final": {
      const sum = m.ps.reduce((a, b) => a + b, 0);
      // Uno sconto applicato come aumento (o viceversa).
      const flipped = m.ps.map((p, i) => (i === m.ps.findIndex((q) => q < 0) ? -p : p));
      return [
        { error: SUCCESSIVE, value: factor(sum).mul(m.x) },
        { error: PERCENT, value: R(m.x + sum) },
        { error: SIGNS, value: product(flipped).mul(m.x) },
      ];
    }
  }
}

const clean = (r: Rational): boolean => places(r) !== null && r.abs().cmp(100000) < 0;

function wrongOf(m: Model) {
  const kept = wrongValues(m).filter((w) => clean(w.value) || places(w.value, 4) !== null);
  return distinctWrongExpressions(decExpr(correctValue(m)), kept.map((w) => ({ error: w.error, value: decExpr(w.value) })));
}

// ───────────────────────────── costruzione ─────────────────────────────

const PERCENTS = [5, 10, 12, 15, 20, 25, 30, 35, 40, 50, 60, 75] as const;

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.6)) {
    const p = rng.pick(PERCENTS) * rng.pick([1, -1, -1] as const);
    return { kind: "change", x: rng.int(2, 60) * rng.pick([5, 10] as const), p };
  }
  // a su b, con il risultato intero o con un decimale.
  const b = rng.pick([20, 25, 40, 50, 60, 75, 80, 120, 150, 200, 250, 400] as const);
  return { kind: "ratio", a: rng.int(1, b - 1), b };
}

function buildLevel2(rng: Rng_): Model {
  if (rng.bool()) {
    const vi = rng.int(2, 40) * rng.pick([5, 10] as const);
    const p = rng.intExcept(-60, 80, [0]);
    const vf = (vi * (100 + p)) / 100;
    return { kind: "variation", vi, vf: Number.isInteger(vf) ? vf : vi + rng.intExcept(-vi + 1, vi, [0]) };
  }
  return { kind: "overall", ps: [rng.pick(PERCENTS) * rng.sign(), rng.pick(PERCENTS) * rng.sign()] };
}

function buildLevel3(rng: Rng_): Model {
  if (rng.bool()) {
    // Dopo la variazione p vale y: si sceglie il valore di prima x e si ricava y.
    const p = rng.pick(PERCENTS) * rng.pick([1, -1] as const);
    const x = rng.int(4, 80) * rng.pick([5, 10] as const);
    const y = factor(p).mul(x);
    return { kind: "reverse", y: y.isInteger() ? Number(y.n) : x, p };
  }
  return { kind: "final", x: rng.int(2, 50) * rng.pick([10, 20] as const), ps: [rng.pick(PERCENTS), -rng.pick(PERCENTS), rng.pick([5, 10, 20] as const) * rng.sign()] };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const v = correctValue(m);
    if (!clean(v) || v.isZero()) continue;
    if (m.kind === "variation" && (m.vf <= 0 || m.vf === m.vi)) continue;
    if (m.kind === "reverse" && !R(m.y).div(factor(m.p)).isInteger() && places(R(m.y).div(factor(m.p))) === null) continue;
    if (m.kind === "overall" && m.ps[0] === -(m.ps[1] ?? 0) && rng.bool(0.5)) continue;
    if (wrongOf(m).length >= (level === 1 ? 2 : 3)) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const changeWord = (p: number): string => (p > 0 ? `aumenta del $${p}\\%$` : `diminuisce del $${-p}\\%$`);
const factorLatex = (p: number): string => decLatex(factor(p));
const PERCENT_ANSWER = "Scrivi la percentuale come numero con il segno, senza il simbolo $\\%$ (per esempio $-12{,}5$).";

function promptOf(m: Model): string {
  switch (m.kind) {
    case "change":
      return `Un prezzo di $${m.x}$ euro ${m.p > 0 ? `aumenta del $${m.p}\\%$` : `viene scontato del $${-m.p}\\%$`}. Quanti euro costa dopo? Scrivi solo il numero.`;
    case "ratio":
      return `Che percentuale di $${m.b}$ è $${m.a}$? Scrivi solo il numero, senza il simbolo $\\%$.`;
    case "variation":
      return `Una quantità passa da $${m.vi}$ a $${m.vf}$. Qual è la sua variazione percentuale? ${PERCENT_ANSWER}`;
    case "overall":
      return `Un prezzo ${changeWord(m.ps[0] ?? 0)} e poi ${changeWord(m.ps[1] ?? 0)}. Qual è la variazione percentuale complessiva? ${PERCENT_ANSWER}`;
    case "reverse":
      return `Dopo ${m.p > 0 ? `un aumento del $${m.p}\\%$` : `uno sconto del $${-m.p}\\%$`} un oggetto costa $${m.y}$ euro. Quanti euro costava prima? Scrivi solo il numero.`;
    case "final":
      return `Un titolo vale $${m.x}$ euro. ${m.ps.map((p, i) => `${i === 0 ? "Prima" : i === 1 ? "poi" : "infine"} ${p > 0 ? `sale del $${p}\\%$` : `scende del $${-p}\\%$`}`).join(", ")}. Quanti euro vale alla fine? Scrivi solo il numero.`;
  }
}

function stepsOf(m: Model): string[] {
  const v = correctValue(m);
  switch (m.kind) {
    case "change":
      return [
        `**Passo 1. Il fattore.** ${m.p > 0 ? `Un aumento del $${m.p}\\%$ è «per $1 + ${decLatex(R(m.p, 100))} = ${factorLatex(m.p)}$»` : `Uno sconto del $${-m.p}\\%$ è «per $1 - ${decLatex(R(-m.p, 100))} = ${factorLatex(m.p)}$»`}.`,
        `**Passo 2. Il conto.** $${m.x} \\cdot ${factorLatex(m.p)} = ${decLatex(v)}$ euro.`,
      ];
    case "ratio":
      return [
        `**Passo 1. Il rapporto.** La parte diviso il totale: $\\dfrac{${m.a}}{${m.b}} = ${decLatex(R(m.a, m.b))}$.`,
        `**Passo 2. In percentuale.** Si moltiplica per $100$: $${decLatex(R(m.a, m.b))} \\cdot 100 = ${decLatex(v)}$, cioè il $${decLatex(v)}\\%$.`,
      ];
    case "variation":
      return [
        `**Passo 1. La differenza.** $${m.vf} - ${m.vi} = ${m.vf - m.vi}$.`,
        `**Passo 2. Il rapporto con il valore iniziale.** $\\dfrac{${m.vf - m.vi}}{${m.vi}} = ${decLatex(R(m.vf - m.vi, m.vi))}$, cioè $${signedPercent(v)}$.`,
      ];
    case "overall": {
      const f = product(m.ps);
      return [
        `**Passo 1. I fattori.** ${m.ps.map((p) => `$${factorLatex(p)}$`).join(" e ")}.`,
        `**Passo 2. Il prodotto dei fattori.** $${m.ps.map(factorLatex).join(" \\cdot ")} = ${decLatex(f)}$: le percentuali successive si moltiplicano come fattori, non si sommano.`,
        `**Passo 3. La variazione.** $${decLatex(f)} - 1 = ${decLatex(f.sub(1))}$, cioè $${signedPercent(v)}$.`,
      ];
    }
    case "reverse":
      return [
        `**Passo 1. Il fattore.** ${m.p > 0 ? "L'aumento" : "Lo sconto"} è «per $${factorLatex(m.p)}$»: il prezzo di prima, moltiplicato per $${factorLatex(m.p)}$, dà $${m.y}$.`,
        `**Passo 2. Torna indietro.** Si divide per il fattore: $${m.y} : ${factorLatex(m.p)} = ${decLatex(v)}$ euro.`,
        `**Passo 3. Controllo.** $${decLatex(v)} \\cdot ${factorLatex(m.p)} = ${m.y}$.`,
      ];
    case "final": {
      const f = product(m.ps);
      return [
        `**Passo 1. I fattori.** ${m.ps.map((p) => `$${factorLatex(p)}$`).join(", ")}.`,
        `**Passo 2. Il prodotto dei fattori.** $${m.ps.map(factorLatex).join(" \\cdot ")} = ${decLatex(f)}$.`,
        `**Passo 3. Il risultato.** $${m.x} \\cdot ${decLatex(f)} = ${decLatex(v)}$ euro.`,
      ];
    }
  }
}

function draftOf(m: Model): ExerciseDraft {
  return {
    prompt: promptOf(m),
    answer: { kind: "number", correct: decExpr(correctValue(m)), wrong: wrongOf(m), mode: exact },
    steps: stepsOf(m).map((text) => ({ text })),
    hints: [
      "Trasforma ogni variazione in un fattore: un aumento del $p\\%$ è «per $1 + \\dfrac{p}{100}$», una diminuzione «per $1 - \\dfrac{p}{100}$».",
      m.kind === "variation" || m.kind === "ratio"
        ? "Dividi per la quantità di riferimento (il totale, o il valore iniziale) e moltiplica per $100$."
        : "Più variazioni in fila si combinano moltiplicando i fattori; per tornare al valore di prima si divide per il fattore.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "number" || exercise.answer.correct.kind !== "num") return false;
  const a = exercise.answer.correct.value;
  if (!exercise.prompt.includes(String(m.kind === "reverse" ? m.y : m.kind === "variation" ? m.vf : m.kind === "ratio" ? m.a : m.kind === "overall" ? Math.abs(m.ps[0] ?? 0) : m.x))) return false;
  switch (m.kind) {
    case "change":
      // Il prezzo nuovo meno quello vecchio è il p% del vecchio.
      return a.sub(m.x).eq(R(m.p * m.x, 100));
    case "ratio":
      return a.mul(m.b).div(100).eq(m.a);
    case "variation":
      return R(m.vi).add(R(m.vi).mul(a).div(100)).eq(m.vf);
    case "overall": {
      // Partendo da 100: le variazioni una per volta (sommando la parte), e la variazione trovata.
      let value = R(100);
      for (const p of m.ps) value = value.add(value.mul(p).div(100));
      return value.sub(100).eq(a);
    }
    case "reverse":
      return a.add(a.mul(m.p).div(100)).eq(m.y);
    case "final": {
      let value = R(m.x);
      for (const p of m.ps) value = value.add(value.mul(p).div(100));
      return value.eq(a);
    }
  }
}

export default defineGenerator({
  code: "V1.M03.A10.g1",
  skill: "V1.M03.A10",
  lesson: "V1.M03.L08",
  title: "Percentuali e variazioni percentuali",
  levels: [1, 2, 3],
  errors: [PERCENT, SUCCESSIVE, SIGNS],
  limits: { maxInteger: 100000, maxDenominator: 10000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
