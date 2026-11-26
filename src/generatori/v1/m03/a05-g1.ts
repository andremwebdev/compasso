// V1.M03.A05.g1 — Radicali: portare fuori dalla radice e sommare radicali simili.
//
// Risposta: un numero, multiplo di un radicale, con tutto il possibile portato fuori (vincolo
// `simplifiedRadicals`). All'indietro: si sceglie l'indice n (2 o 3) e il radicando comune d (senza
// potenze n-esime), poi per ogni termine il fattore c che esce e il numero a davanti: il termine scritto è
// a·ⁿ√(cⁿ·d) e vale a·c·ⁿ√d. Il risultato è (Σ ± a·c)·ⁿ√d. Le risposte sbagliate:
// - CALC.PORTARE_FUORI: in un termine esce la potenza cⁿ invece di c (√48 → 16√3);
// - ALG.RADICE_SOMMA: i radicandi sommati sotto una sola radice (√8 + √18 → √26), solo quando i termini
//   non hanno un numero davanti;
// - CALC.REGOLA_SEGNI: la radice cubica di un negativo presa positiva (∛(−250) → 5∛2);
// - ALG.RADICE_DEL_QUADRATO: √((−c)²·d) preso come −c√d.
//
// Livello 1: due radici quadrate che diventano simili (√8 + √18, √50 − 3√2).
// Livello 2: tre radici quadrate con numeri davanti, come nell'esempio della lezione (√12 + √27 − √75).
// Livello 3: radici cubiche anche di negativi; radicando scritto come (−c)²·d; prodotto di due radici
//   con lo stesso indice seguito da una somma (√6 · √12 − √50).
//
// Verifica: l'espressione del testo si ricostruisce con le radici del motore e si confronta con la
// risposta con `equivalent`; la risposta deve rispettare `simplifiedRadicals`.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { add, mul, neg, num, pow, root, sqrt, sub, toLatex, type Expr } from "../../../motore/expr";
import { simplify } from "../../../motore/algebra/simplify";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { checkForm } from "../../../motore/form";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const OUT: ErrorCode = "CALC.PORTARE_FUORI";
const SUM: ErrorCode = "ALG.RADICE_SOMMA";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const SQUARE: ErrorCode = "ALG.RADICE_DEL_QUADRATO";

/**
 * Un termine: ± a · ⁿ√(radicando). Il radicando vale s·cⁿ·d (s = −1 solo con n dispari). `squareForm`:
 * il radicando si scrive (−c)²·d invece del numero. `product`: il radicando si scrive come prodotto di
 * due radici, ⁿ√p · ⁿ√q con p·q = cⁿ·d.
 */
interface Term {
  readonly sign: 1 | -1;
  readonly a: number;
  readonly c: number;
  readonly s: 1 | -1;
  readonly squareForm: boolean;
  readonly product: readonly [number, number] | null;
}

interface Model {
  readonly n: 2 | 3;
  readonly d: number;
  readonly terms: readonly Term[];
}

const term = (sign: 1 | -1, a: number, c: number, s: 1 | -1 = 1, squareForm = false, product: readonly [number, number] | null = null): Term => ({ sign, a, c, s, squareForm, product });

// ───────────────────────────── conti ─────────────────────────────

const radicandOf = (m: Model, t: Term): number => t.s * t.c ** m.n * m.d;
/** Il coefficiente del radicale comune portato dal termine: ± a·c, con il segno del radicando (n dispari). */
const coefOf = (t: Term): number => t.sign * t.a * t.c * t.s;
const totalOf = (m: Model): number => m.terms.reduce((s, t) => s + coefOf(t), 0);

/** k·ⁿ√d come espressione del motore, scritto come lo scriverebbe Andrea. */
function multiple(k: number, n: number, d: number): Expr {
  const r = n === 2 ? sqrt(num(d)) : root(n, num(d));
  if (k === 0) return num(0);
  if (k === 1) return r;
  if (k === -1) return neg(r);
  return mul(num(k), r);
}

/** I valori sbagliati, ognuno con il suo errore, nell'ordine in cui conviene mostrarli. */
function wrongCandidates(m: Model): { error: ErrorCode; value: Expr }[] {
  const out: { error: ErrorCode; value: Expr }[] = [];
  const total = totalOf(m);
  // Radicale del quadrato: −c invece di |−c|.
  m.terms.forEach((t) => {
    if (t.squareForm) out.push({ error: SQUARE, value: multiple(total - 2 * coefOf(t), m.n, m.d) });
  });
  // Segno della radice cubica di un negativo.
  m.terms.forEach((t) => {
    if (t.s === -1) out.push({ error: SIGNS, value: multiple(total - 2 * coefOf(t), m.n, m.d) });
  });
  // Esce la potenza invece della base.
  m.terms.forEach((t) => {
    if (t.c > 1 && t.product === null) out.push({ error: OUT, value: multiple(total - coefOf(t) + coefOf(t) * t.c ** (m.n - 1), m.n, m.d) });
  });
  // Radicandi sommati sotto una sola radice.
  if (m.terms.every((t) => t.a === 1 && t.product === null)) {
    const r = m.terms.reduce((s, t) => s + t.sign * radicandOf(m, t), 0);
    if (r > 0 || (m.n === 3 && r !== 0)) out.push({ error: SUM, value: simplify(m.n === 2 ? sqrt(num(r)) : root(m.n, num(r))) });
  }
  return out;
}

function wrongOf(m: Model) {
  return distinctWrongExpressions(multiple(totalOf(m), m.n, m.d), wrongCandidates(m)).slice(0, 4);
}

// ───────────────────────────── costruzione ─────────────────────────────

/** I radicandi «senza potenze n-esime» comodi. */
const D2 = [2, 3, 5, 6, 7] as const;
const D3 = [2, 3, 4, 5] as const;

function buildLevel1(rng: Rng_): Model {
  const d = rng.pick([...D2, 10, 11] as const);
  const maxC = d <= 3 ? 6 : d <= 7 ? 4 : 3;
  const first = term(1, 1, rng.int(2, maxC));
  // Il secondo: radice da semplificare, oppure già semplice con un numero davanti.
  const second = rng.bool(0.65) ? term(rng.sign(), 1, rng.int(1, maxC)) : term(rng.sign(), rng.int(2, 5), 1);
  return { n: 2, d, terms: [first, second] };
}

function buildLevel2(rng: Rng_): Model {
  const d = rng.pick(D2);
  const maxC = d <= 3 ? 5 : 3;
  const withCoefficients = rng.bool(0.5);
  const a = (): number => (withCoefficients ? rng.pick([1, 1, 2, 3]) : 1);
  return { n: 2, d, terms: [term(1, a(), rng.int(2, maxC)), term(rng.sign(), a(), rng.int(1, maxC)), term(-1, a(), rng.int(2, maxC))] };
}

function buildLevel3(rng: Rng_): Model {
  const form = rng.pick(["cube", "cube", "square", "product"] as const);
  switch (form) {
    case "cube": {
      const d = rng.pick(D3);
      const maxC = d <= 3 ? 4 : 3;
      return { n: 3, d, terms: [term(1, 1, rng.int(2, maxC), rng.pick([1, -1] as const)), term(rng.sign(), 1, rng.int(1, maxC), -1), term(rng.sign(), rng.pick([1, 2] as const), rng.int(2, maxC))] };
    }
    case "square": {
      const d = rng.pick(D2);
      const maxC = d <= 3 ? 5 : 3;
      return { n: 2, d, terms: [term(1, 1, rng.int(2, maxC), 1, true), term(rng.sign(), 1, rng.int(2, maxC)), term(-1, rng.pick([1, 2] as const), rng.int(1, maxC))] };
    }
    case "product": {
      // √p · √q − a√(c²d): p·q = c₀²·d con p e q non quadrati.
      const d = rng.pick(D2);
      const c0 = rng.int(2, 6);
      const target = c0 * c0 * d;
      const splits: [number, number][] = [];
      for (let p = 2; p * p <= target; p++) {
        if (target % p !== 0) continue;
        const q = target / p;
        if (p === q || Number.isInteger(Math.sqrt(p)) || Number.isInteger(Math.sqrt(q))) continue;
        splits.push([p, q]);
      }
      if (splits.length === 0) return buildLevel3(rng);
      const split = rng.pick(splits);
      return { n: 2, d, terms: [term(1, 1, c0, 1, false, split), term(-1, 1, rng.int(1, 5))] };
    }
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    // Radicandi scritti non troppo grandi, termini tutti diversi.
    if (m.terms.some((t) => Math.abs(radicandOf(m, t)) > 300)) continue;
    if (new Set(m.terms.map((t) => radicandOf(m, t))).size < m.terms.length) continue;
    if (level === 1 && totalOf(m) === 0) continue;
    if (Math.abs(totalOf(m)) > 40) continue;
    if (wrongOf(m).length >= (level === 1 ? 2 : 3)) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const rootLatex = (n: number, body: string): string => (n === 2 ? `\\sqrt{${body}}` : `\\sqrt[${n}]{${body}}`);

/** Il termine come è scritto nel testo, senza segno davanti. */
function termBody(m: Model, t: Term): string {
  const coefficient = t.a === 1 ? "" : String(t.a);
  if (t.product !== null) return `${rootLatex(m.n, String(t.product[0]))} \\cdot ${rootLatex(m.n, String(t.product[1]))}`;
  if (t.squareForm) return `${coefficient}${rootLatex(m.n, `\\left(-${t.c}\\right)^{2} \\cdot ${m.d}`)}`;
  return `${coefficient}${rootLatex(m.n, String(radicandOf(m, t)))}`;
}

function expressionLatex(m: Model): string {
  return m.terms.map((t, i) => (i === 0 ? (t.sign < 0 ? "-" : "") : t.sign < 0 ? " - " : " + ") + termBody(m, t)).join("");
}

/** k·ⁿ√d in LaTeX, con k = 1 e −1 senza il numero. */
const multipleLatex = (k: number, n: number, d: number): string => (k === 0 ? "0" : toLatex(multiple(k, n, d)));

/** Il passaggio «porta fuori» di un termine. */
function outStep(m: Model, t: Term): string {
  const inner = t.a * t.c * t.s;
  const prefix = t.a === 1 ? "" : `${t.a}`;
  if (t.product !== null) {
    const [p, q] = t.product;
    return `$${termBody(m, t)} = ${rootLatex(m.n, `${p} \\cdot ${q}`)} = ${rootLatex(m.n, String(p * q))} = ${rootLatex(m.n, `${t.c}^{${m.n}} \\cdot ${m.d}`)} = ${multipleLatex(inner, m.n, m.d)}$ (prodotto di radici con lo stesso indice)`;
  }
  if (t.c === 1) return `$${termBody(m, t)}$ è già semplice`;
  if (t.squareForm) return `$${termBody(m, t)} = ${rootLatex(m.n, `${t.c}^{2} \\cdot ${m.d}`)} = ${multipleLatex(inner, m.n, m.d)}$ (con l'indice pari esce $${t.c}$, non $-${t.c}$)`;
  const written = t.s < 0 ? `\\left(-${t.c}\\right)^{${m.n}} \\cdot ${m.d}` : `${t.c}^{${m.n}} \\cdot ${m.d}`;
  return `$${prefix}${rootLatex(m.n, String(radicandOf(m, t)))} = ${prefix}${rootLatex(m.n, written)} = ${multipleLatex(inner, m.n, m.d)}$`;
}

function stepsOf(m: Model): string[] {
  const total = totalOf(m);
  const coefs = m.terms.map(coefOf);
  const chain = coefs.map((k, i) => (i === 0 ? String(k) : k < 0 ? `- ${-k}` : `+ ${k}`)).join(" ");
  const r = rootLatex(m.n, String(m.d));
  return [
    `**Passo 1. Porta fuori.** ${m.terms.map((t) => outStep(m, t)).join("; ")}.`,
    `**Passo 2. Riconosci i simili.** Sono tutti multipli di $${r}$.`,
    `**Passo 3. Somma i numeri davanti.** $(${chain})${r} = ${multipleLatex(total, m.n, m.d)}$.`,
  ];
}

function draftOf(m: Model): ExerciseDraft {
  const correct = multiple(totalOf(m), m.n, m.d);
  return {
    prompt: `Calcola $${expressionLatex(m)}$. Scrivi il risultato con tutto il possibile portato fuori dalla radice.`,
    answer: { kind: "number", correct, wrong: wrongOf(m), mode: exact, form: ["simplifiedRadicals"] },
    steps: stepsOf(m).map((text) => ({ text })),
    hints: [
      "Radicali diversi non si sommano sotto una sola radice: prima porta fuori da ognuno tutto il possibile e guarda se diventano simili.",
      `Scomponi ogni radicando in fattori primi e cerca le potenze con esponente ${m.n}: ${m.n === 2 ? "$\\sqrt{c^2 \\cdot d} = c\\sqrt{d}$" : "$\\sqrt[3]{c^3 \\cdot d} = c\\sqrt[3]{d}$"}. Fuori va $c$, non $c^{${m.n}}$.`,
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function termExpr(m: Model, t: Term): Expr {
  const r = (x: Expr): Expr => (m.n === 2 ? sqrt(x) : root(m.n, x));
  let e: Expr;
  if (t.product !== null) e = mul(r(num(t.product[0])), r(num(t.product[1])));
  else if (t.squareForm) e = r(mul(pow(num(-t.c), num(2)), num(m.d)));
  else e = r(num(radicandOf(m, t)));
  return t.a === 1 ? e : mul(num(t.a), e);
}

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "number") return false;
  if (!exercise.prompt.includes(expressionLatex(m))) return false;
  const [first, ...rest] = m.terms;
  if (!first) return false;
  let e: Expr = first.sign < 0 ? neg(termExpr(m, first)) : termExpr(m, first);
  for (const t of rest) e = t.sign < 0 ? sub(e, termExpr(m, t)) : add(e, termExpr(m, t));
  return equivalent(e, exercise.answer.correct) && checkForm(exercise.answer.correct, "simplifiedRadicals").ok;
}

export default defineGenerator({
  code: "V1.M03.A05.g1",
  skill: "V1.M03.A05",
  lesson: "V1.M03.L05",
  title: "Portare fuori dalla radice e sommare radicali simili",
  levels: [1, 2, 3],
  errors: [OUT, SUM, SIGNS, SQUARE],
  limits: { maxInteger: 1000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
