// V1.M03.A08.g1 — Notazione scientifica e ordine di grandezza.
//
// Risposta: un numero. In notazione scientifica (vincolo `scientificNotation`) quando il testo la chiede;
// come numero decimale o come potenza di 10 altrimenti. All'indietro: ogni numero è M·10^e con M intero
// di poche cifre (la mantissa) e l'esponente scelto; il risultato si ricava con i razionali esatti.
// Le risposte sbagliate:
// - CALC.POTENZA_DI_DIECI: esponente contato con gli zeri invece che con i posti della virgola;
//   normalizzazione nel verso sbagliato (15 · 10¹ → 1,5 · 10⁰); ordine di grandezza senza arrotondare a
//   (o arrotondando per eccesso con a < 5); somma con potenze diverse fatta come se fossero uguali;
// - CALC.ESPONENTE_NEGATIVO: l'esponente negativo preso come segno del numero, o il segno dell'esponente
//   perso;
// - CALC.PROPRIETA_POTENZE: nel quoziente gli esponenti sommati invece che sottratti; nella somma o nel
//   prodotto gli esponenti moltiplicati o sommati a sproposito;
// - CALC.REGOLA_SEGNI: dividendo per 10 con esponente negativo, n − (−m) calcolato come n − m.
//
// Livello 1: da numero decimale a notazione scientifica (345 000, 0,000 72) e viceversa.
// Livello 2: prodotti e quozienti in notazione scientifica, con il risultato da riportare alla forma
//   a · 10ⁿ (come nell'esempio della lezione).
// Livello 3: ordine di grandezza di un prodotto di due numeri scritti per esteso; somma di due numeri
//   in notazione scientifica con esponenti diversi.
//
// Verifica: il valore si ricalcola dai numeri del testo con i razionali esatti (un'altra strada:
// cifre e potenze di 10 moltiplicate davvero) e si confronta con la risposta con `equivalent`;
// per l'ordine di grandezza si controlla la definizione su a.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { decimal, frac, mul, num, pow, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const TEN: ErrorCode = "CALC.POTENZA_DI_DIECI";
const NEGATIVE: ErrorCode = "CALC.ESPONENTE_NEGATIVO";
const PROPERTIES: ErrorCode = "CALC.PROPRIETA_POTENZE";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";

/** Un numero M · 10^e (M intero positivo che non finisce con 0). */
interface Num {
  readonly m: number;
  readonly e: number;
}

type Model =
  | { readonly kind: "toSci"; readonly x: Num }
  | { readonly kind: "fromSci"; readonly x: Num }
  /** (a1·10^n1)·(a2·10^n2) : (a3·10^n3), con a1, a2, a3 cifre. */
  | { readonly kind: "compute"; readonly a: readonly [number, number, number]; readonly n: readonly [number, number, number] }
  | { readonly kind: "order"; readonly x: Num; readonly y: Num }
  /** a·10^n + b·10^(n−k). */
  | { readonly kind: "sum"; readonly a: number; readonly b: number; readonly n: number; readonly k: number };

// ───────────────────────────── numeri ─────────────────────────────

const digits = (m: number): number => String(m).length;
/** 10ⁿ esatto, anche per n grande o negativo. */
const pow10 = (n: number): Rational => (n >= 0 ? Rational.of(10n ** BigInt(n)) : Rational.of(1n, 10n ** BigInt(-n)));
/** Esponente della notazione scientifica di M·10^e. */
const sciExp = (x: Num): number => x.e + digits(x.m) - 1;
const valueOf = (x: Num): Rational => pow10(x.e).mul(x.m);

/** Da un razionale a M·10^e (null se non è un decimale limitato con poche cifre). */
function toNum(r: Rational): Num | null {
  if (r.cmp(0) <= 0) return null;
  for (let k = 0; k <= 15; k++) {
    const scaled = r.mul(pow10(k));
    if (!scaled.isInteger()) continue;
    let m = scaled.n;
    let e = -k;
    while (m % 10n === 0n) {
      m /= 10n;
      e++;
    }
    return m > 1_000_000n ? null : { m: Number(m), e };
  }
  return null;
}

/** La mantissa a come testo all'italiana: 345 → «3,45». */
const mantissaText = (m: number): string => (digits(m) === 1 ? String(m) : `${String(m)[0]},${String(m).slice(1)}`);

/** a·10ⁿ come espressione del motore (notazione scientifica). */
function sciExpr(x: Num): Expr {
  const a = digits(x.m) === 1 ? num(x.m) : decimal(mantissaText(x.m));
  return mul(a, pow(num(10), num(sciExp(x))));
}
const sciLatex = (x: Num): string => toLatex(sciExpr(x));

/** Il numero scritto per esteso, con gli spazi sottili ogni tre cifre: 345\,000 e 0{,}000\,72. */
function plainLatex(x: Num): string {
  const group = (s: string, fromLeft: boolean): string => {
    const parts: string[] = [];
    if (fromLeft) for (let i = 0; i < s.length; i += 3) parts.push(s.slice(i, i + 3));
    else for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
    return parts.join("\\,");
  };
  if (x.e >= 0) return group(String(x.m) + "0".repeat(x.e), false);
  const all = String(x.m).padStart(-x.e + 1, "0");
  const int = all.slice(0, all.length + x.e);
  const dec = all.slice(all.length + x.e);
  return `${group(int, false)}{,}${group(dec, true)}`;
}

/** Il numero per esteso come espressione (decimale o intero). */
const plainExpr = (x: Num): Expr => (x.e >= 0 ? num(x.m * 10 ** x.e) : decimal(plainLatex(x).replace(/\\,/g, "").replace("{,}", ",")));
const ratExpr = (r: Rational): Expr => (r.isInteger() ? num(Number(r.n)) : frac(r.n, r.d));
const shift = (x: Num, d: number): Num => ({ m: x.m, e: x.e + d });

// ───────────────────────────── conti ─────────────────────────────

function computeValue(m: Extract<Model, { kind: "compute" }>, nExp: number): Rational {
  const [a1, a2, a3] = m.a;
  return Rational.of(a1 * a2, a3).mul(pow10(nExp));
}
const computeExp = (m: Extract<Model, { kind: "compute" }>): number => m.n[0] + m.n[1] - m.n[2];

/** Ordine di grandezza: 10ⁿ se a < 5, 10^(n+1) se a ≥ 5. */
function orderOf(x: Num): number {
  const a = Rational.of(x.m, 10 ** (digits(x.m) - 1));
  return a.cmp(5) >= 0 ? sciExp(x) + 1 : sciExp(x);
}
const productOf = (m: Extract<Model, { kind: "order" }>): Num => toNum(valueOf(m.x).mul(valueOf(m.y))) ?? { m: 1, e: 0 };
const tenPow = (n: number): Expr => pow(num(10), num(n));

function correctOf(m: Model): Expr {
  switch (m.kind) {
    case "toSci":
      return sciExpr(m.x);
    case "fromSci":
      return plainExpr(m.x);
    case "compute":
      return sciExpr(toNum(computeValue(m, computeExp(m))) ?? { m: 1, e: 0 });
    case "order":
      return tenPow(orderOf(productOf(m)));
    case "sum":
      return sciExpr(toNum(Rational.of(m.a * 10 ** m.k + m.b).mul(pow10(m.n - m.k))) ?? { m: 1, e: 0 });
  }
}

function wrongCandidates(m: Model): { error: ErrorCode; value: Expr }[] {
  switch (m.kind) {
    case "toSci": {
      const n = sciExp(m.x);
      // Esponente contato con gli zeri: per 345 000 gli zeri finali, per 0,000 72 gli zeri dopo la virgola.
      const zeros = m.x.e >= 0 ? m.x.e : -(-m.x.e - digits(m.x.m));
      return [
        { error: TEN, value: sciExpr(shift(m.x, zeros - n)) },
        { error: NEGATIVE, value: sciExpr(shift(m.x, -2 * n)) },
      ];
    }
    case "fromSci": {
      const n = sciExp(m.x);
      // Un posto in più (n zeri scritti dopo la virgola) e l'esponente negativo preso come segno.
      return [
        { error: TEN, value: plainExpr(shift(m.x, n < 0 ? -1 : 1)) },
        { error: NEGATIVE, value: n < 0 ? ratExpr(valueOf(shift(m.x, -2 * n)).neg()) : plainExpr(shift(m.x, -2 * n)) },
      ];
    }
    case "compute": {
      const E = computeExp(m);
      const raw = toNum(computeValue(m, E));
      const out: { error: ErrorCode; value: Expr }[] = [];
      if (raw) {
        // Quoziente: esponente del divisore sommato; con il divisore a esponente negativo è lo stesso
        // numero che dà n − (−m) calcolato come n − m, e lì l'errore è di segno.
        out.push({ error: m.n[2] < 0 ? SIGNS : PROPERTIES, value: sciExpr(toNum(computeValue(m, m.n[0] + m.n[1] + m.n[2])) ?? raw) });
        // Normalizzazione nel verso sbagliato: la mantissa a1·a2/a3 fuori da [1; 10).
        const q = Rational.of(m.a[0] * m.a[1], m.a[2]);
        if (q.cmp(10) >= 0) out.push({ error: TEN, value: sciExpr(shift(toNum(computeValue(m, E)) ?? raw, -2)) });
        if (q.cmp(1) < 0) out.push({ error: TEN, value: sciExpr(shift(toNum(computeValue(m, E)) ?? raw, 2)) });
        // Esponenti del prodotto moltiplicati.
        if (Math.abs(m.n[0] * m.n[1] - m.n[2]) <= 20) out.push({ error: PROPERTIES, value: sciExpr(toNum(computeValue(m, m.n[0] * m.n[1] - m.n[2])) ?? raw) });
      }
      return out;
    }
    case "order": {
      const p = productOf(m);
      const k = orderOf(p);
      const n = sciExp(p);
      return [
        // Senza arrotondare a (oppure arrotondando per eccesso con a < 5).
        { error: TEN, value: tenPow(k === n ? n + 1 : n) },
        // Esponenti dei due fattori moltiplicati.
        { error: PROPERTIES, value: tenPow(sciExp(m.x) * sciExp(m.y) + (k - n)) },
        // Il segno dell'esponente del numero piccolo perso.
        { error: NEGATIVE, value: tenPow(sciExp(m.x) + Math.abs(sciExp(m.y)) + (k - n)) },
      ];
    }
    case "sum": {
      const sum = toNum(Rational.of(m.a + m.b)) ?? { m: 1, e: 0 };
      return [
        // Potenze diverse trattate come uguali: (a + b)·10ⁿ.
        { error: TEN, value: sciExpr(shift(sum, m.n)) },
        // Esponenti sommati come in un prodotto: (a + b)·10^(2n − k).
        { error: PROPERTIES, value: sciExpr(shift(sum, 2 * m.n - m.k)) },
        { error: TEN, value: sciExpr(shift(sum, m.n - m.k)) },
      ];
    }
  }
}

const wrongOf = (m: Model) => distinctWrongExpressions(correctOf(m), wrongCandidates(m)).slice(0, 4);

// ───────────────────────────── costruzione ─────────────────────────────

/** Una mantissa di 1-3 cifre che non finisce con 0. */
function mantissa(rng: Rng_, maxDigits = 3): number {
  for (;;) {
    const d = rng.int(1, maxDigits);
    const m = rng.int(10 ** (d - 1), 10 ** d - 1);
    if (m % 10 !== 0) return m;
  }
}

function buildLevel1(rng: Rng_): Model {
  const m = mantissa(rng);
  const big = rng.bool();
  // Numeri grandi con almeno due zeri finali, piccoli con almeno due zeri dopo la virgola.
  const e = big ? rng.int(2, 6) : -(digits(m) + rng.int(2, 5));
  const x = { m, e };
  return rng.bool(0.6) ? { kind: "toSci", x } : { kind: "fromSci", x: { m: mantissa(rng, 2), e: big ? rng.int(1, 5) : -rng.int(3, 6) } };
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const a3 = rng.pick([2, 4, 5, 8] as const);
    const a1 = rng.int(2, 9);
    const a2 = rng.int(2, 9);
    const q = Rational.of(a1 * a2, a3);
    const qNum = toNum(q);
    if (!qNum || digits(qNum.m) > 3) continue;
    const n: [number, number, number] = [rng.intExcept(-6, 9, [0]), rng.intExcept(-6, 9, [0]), rng.intExcept(-5, 6, [0])];
    return { kind: "compute", a: [a1, a2, a3], n };
  }
}

function buildLevel3(rng: Rng_): Model {
  if (rng.bool(0.6)) {
    const x = { m: mantissa(rng), e: rng.int(0, 3) };
    const ym = mantissa(rng);
    const y = { m: ym, e: -(digits(ym) + rng.int(1, 4)) };
    return { kind: "order", x, y };
  }
  return { kind: "sum", a: rng.int(1, 9), b: rng.int(1, 9), n: rng.intExcept(-6, 8, [0, 1]), k: rng.pick([1, 1, 2] as const) };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    if (m.kind === "order" && (sciExp(m.y) >= 0 || sciExp(m.x) < 1)) continue;
    if (m.kind === "sum" && m.n - m.k === 0) continue;
    if (wrongOf(m).length >= (level === 1 ? 2 : 3)) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const powLatex = (a: number, n: number): string => `${a} \\cdot 10^{${n}}`;

function promptOf(m: Model): string {
  switch (m.kind) {
    case "toSci":
      return `Scrivi $${plainLatex(m.x)}$ in notazione scientifica.`;
    case "fromSci":
      return `Scrivi $${sciLatex(m.x)}$ come numero per esteso, senza potenze di $10$.`;
    case "compute":
      return `Calcola $\\dfrac{\\left(${powLatex(m.a[0], m.n[0])}\\right) \\cdot \\left(${powLatex(m.a[1], m.n[1])}\\right)}{${powLatex(m.a[2], m.n[2])}}$ e scrivi il risultato in notazione scientifica.`;
    case "order":
      return `Qual è l'ordine di grandezza di $${plainLatex(m.x)} \\cdot ${plainLatex(m.y)}$? Rispondi con una potenza di $10$.`;
    case "sum":
      return `Calcola $${powLatex(m.a, m.n)} + ${powLatex(m.b, m.n - m.k)}$ e scrivi il risultato in notazione scientifica.`;
  }
}

function stepsOf(m: Model): string[] {
  switch (m.kind) {
    case "toSci": {
      const n = sciExp(m.x);
      return [
        `**Passo 1. La virgola.** Sposta la virgola fino ad avere una sola cifra diversa da $0$ prima di essa: $${mantissaText(m.x.m).replace(",", "{,}")}$.`,
        `**Passo 2. L'esponente.** La virgola si è spostata di $${Math.abs(n)}$ posti verso ${n > 0 ? "sinistra: il numero è almeno $10$, l'esponente è positivo" : "destra: il numero è minore di $1$, l'esponente è negativo"}. Quindi $${plainLatex(m.x)} = ${sciLatex(m.x)}$.`,
      ];
    }
    case "fromSci": {
      const n = sciExp(m.x);
      return [
        `**Passo 1. Lo spostamento.** Moltiplicare per $10^{${n}}$ sposta la virgola di $${Math.abs(n)}$ posti verso ${n > 0 ? "destra" : "sinistra"}${n < 0 ? ": il numero diventa più piccolo, ma resta positivo" : ""}.`,
        `**Passo 2. Il numero.** $${sciLatex(m.x)} = ${plainLatex(m.x)}$.`,
      ];
    }
    case "compute": {
      const E = computeExp(m);
      const q = Rational.of(m.a[0] * m.a[1], m.a[2]);
      const qNum = toNum(q) ?? { m: 1, e: 0 };
      const qText = toLatex(ratExpr(q)).replace(/\\frac/g, "\\dfrac");
      const final = toNum(computeValue(m, E)) ?? { m: 1, e: 0 };
      const normalized = q.cmp(1) >= 0 && q.cmp(10) < 0;
      return [
        `**Passo 1. Separa.** Numeri: $\\dfrac{${m.a[0]} \\cdot ${m.a[1]}}{${m.a[2]}} = ${qText}$. Potenze: $\\dfrac{10^{${m.n[0]}} \\cdot 10^{${m.n[1]}}}{10^{${m.n[2]}}} = 10^{${m.n[0]} + ${m.n[1] < 0 ? `(${m.n[1]})` : m.n[1]} - ${m.n[2] < 0 ? `(${m.n[2]})` : m.n[2]}} = 10^{${E}}$ (nel prodotto gli esponenti si sommano, nel quoziente si sottraggono).`,
        normalized
          ? `**Passo 2. Notazione scientifica.** $${qText}$ è già tra $1$ e $10$: il risultato è $${sciLatex(final)}$.`
          : `**Passo 2. Notazione scientifica.** $${qText} = ${sciLatex(qNum)}$, quindi $${qText} \\cdot 10^{${E}} = ${sciLatex(qNum)} \\cdot 10^{${E}} = ${sciLatex(final)}$.`,
      ];
    }
    case "order": {
      const p = productOf(m);
      const k = orderOf(p);
      return [
        `**Passo 1. Notazione scientifica.** $${plainLatex(m.x)} = ${sciLatex(m.x)}$ e $${plainLatex(m.y)} = ${sciLatex(m.y)}$.`,
        `**Passo 2. Il prodotto.** Le mantisse si moltiplicano, gli esponenti si sommano: $${sciLatex(m.x)} \\cdot ${sciLatex(m.y)} = ${sciLatex(p)}$.`,
        `**Passo 3. L'ordine di grandezza.** La mantissa è $${mantissaText(p.m).replace(",", "{,}")}$, ${k === sciExp(p) ? "minore di $5$: l'ordine di grandezza è" : "maggiore o uguale a $5$: si arrotonda a $10$, e l'ordine di grandezza è"} $10^{${k}}$.`,
      ];
    }
    case "sum": {
      const final = toNum(Rational.of(m.a * 10 ** m.k + m.b).mul(pow10(m.n - m.k))) ?? { m: 1, e: 0 };
      const big = m.a * 10 ** m.k;
      return [
        `**Passo 1. Stessa potenza di $10$.** Per sommare servono potenze uguali: $${powLatex(m.a, m.n)} = ${powLatex(big, m.n - m.k)}$.`,
        `**Passo 2. La somma.** $${powLatex(big, m.n - m.k)} + ${powLatex(m.b, m.n - m.k)} = ${powLatex(big + m.b, m.n - m.k)}$.`,
        `**Passo 3. Notazione scientifica.** $${powLatex(big + m.b, m.n - m.k)} = ${sciLatex(final)}$.`,
      ];
    }
  }
}

function draftOf(m: Model): ExerciseDraft {
  const sci = m.kind === "toSci" || m.kind === "compute" || m.kind === "sum";
  return {
    prompt: promptOf(m),
    answer: { kind: "number", correct: correctOf(m), wrong: wrongOf(m), mode: exact, ...(sci ? { form: ["scientificNotation" as const] } : {}) },
    steps: stepsOf(m).map((text) => ({ text })),
    hints: [
      m.kind === "order"
        ? "Scrivi i due numeri in notazione scientifica e moltiplicali: mantisse per mantisse, esponenti sommati."
        : "In $a \\cdot 10^n$ deve essere $1 \\le a < 10$; l'esponente conta i posti di cui si sposta la virgola, non gli zeri.",
      m.kind === "order"
        ? "L'ordine di grandezza di $a \\cdot 10^n$ è $10^n$ se $a < 5$ e $10^{n+1}$ se $a \\ge 5$."
        : "Nei prodotti gli esponenti di $10$ si sommano, nei quozienti si sottraggono; un esponente negativo vuol dire numero piccolo, non negativo.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Il valore esatto del numero del testo, rifatto con le potenze di 10 del motore. */
function valueExpr(m: Model): Expr | null {
  const t = (a: number, n: number): Expr => mul(num(a), pow(num(10), num(n)));
  switch (m.kind) {
    case "toSci":
    case "fromSci":
      return mul(num(m.x.m), pow(num(10), num(m.x.e)));
    case "compute":
      return mul(t(m.a[0], m.n[0]), t(m.a[1], m.n[1]), pow(t(m.a[2], m.n[2]), num(-1)));
    case "sum":
      return null;
    case "order":
      return null;
  }
}

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "number") return false;
  const answer = exercise.answer.correct;
  if (m.kind === "order") {
    // 10^k con k dalla definizione: a = P / 10^n tra 1 e 10, k = n oppure n + 1.
    const p = valueOf(m.x).mul(valueOf(m.y));
    let n = 0;
    while (p.div(pow10(n)).cmp(10) >= 0) n++;
    while (p.div(pow10(n)).cmp(1) < 0) n--;
    const a = p.div(pow10(n));
    return equivalent(answer, tenPow(a.cmp(5) >= 0 ? n + 1 : n));
  }
  if (m.kind === "sum") return equivalent(answer, mul(num(m.a * 10 ** m.k + m.b), pow(num(10), num(m.n - m.k))));
  const v = valueExpr(m);
  return v !== null && equivalent(answer, v);
}

export default defineGenerator({
  code: "V1.M03.A08.g1",
  skill: "V1.M03.A08",
  lesson: "V1.M03.L07",
  title: "Notazione scientifica e ordine di grandezza",
  levels: [1, 2, 3],
  errors: [TEN, NEGATIVE, PROPERTIES, SIGNS],
  limits: { maxInteger: 10 ** 15, maxDenominator: 10 ** 15 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
