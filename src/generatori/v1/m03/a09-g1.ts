// V1.M03.A09.g1 — Stime e arrotondamenti senza calcolatrice.
//
// Due forme.
// - Arrotondamento (risposta: un numero decimale). All'indietro: il numero è m · 10^(−p) con m intero; la
//   risposta è m arrotondato alla cifra chiesta (ai decimi, centesimi, millesimi, oppure a s cifre
//   significative). Le sbagliate (CALC.ARROTONDAMENTO): le cifre tolte senza guardarle (troncare), oppure
//   l'ultima cifra aumentata anche con la prima tolta minore di 5; l'arrotondamento fatto a una cifra di
//   troppo; nelle cifre significative, gli zeri iniziali contati come significativi.
// - Stima (scelta multipla scritta a mano: «quale numero è più vicino a…?»). All'indietro: i fattori
//   hanno tre cifre significative; la stima si fa arrotondando ognuno a una cifra significativa. Le
//   opzioni sbagliate sono la stima moltiplicata o divisa per 10 o per 100 (CALC.POTENZA_DI_DIECI:
//   la potenza di 10 sbagliata contando gli zeri o i posti della virgola).
//
// Livello 1: arrotondare ai decimi, ai centesimi o ai millesimi.
// Livello 2: arrotondare a due o tre cifre significative (anche numeri minori di 1); stimare un prodotto
//   tra un numero grande e un decimale piccolo.
// Livello 3: arrotondamenti con il riporto che fa scattare le cifre prima (2,996 → 3,00) o con gli zeri
//   iniziali; stimare un quoziente di un prodotto per un terzo numero.
//
// Verifica: l'arrotondamento si rifà con l'aritmetica esatta (confronto tra la parte tolta e metà unità);
// per la stima si calcola il valore esatto e si controlla che l'opzione giusta sia la più vicina (in
// scala logaritmica, cioè per rapporto) e le altre più lontane.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { decimal, num, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const ROUND: ErrorCode = "CALC.ARROTONDAMENTO";
const TEN: ErrorCode = "CALC.POTENZA_DI_DIECI";

/** Un numero M · 10^e (M intero positivo). */
interface Num {
  readonly m: number;
  readonly e: number;
}

type Model =
  /** Arrotondare m·10^(−p) a k decimali (`places`) o a s cifre significative (`sig`). */
  | { readonly kind: "round"; readonly x: Num; readonly by: "places" | "sig"; readonly n: number }
  /** Stimare x·y oppure x·y : z. */
  | { readonly kind: "estimate"; readonly factors: readonly Num[]; readonly divide: boolean; readonly order: readonly number[] };

const pow10 = (n: number): Rational => (n >= 0 ? Rational.of(10n ** BigInt(n)) : Rational.of(1n, 10n ** BigInt(-n)));
const valueOf = (x: Num): Rational => pow10(x.e).mul(x.m);
const digits = (m: number): number => String(m).length;
/** Esponente della notazione scientifica. */
const sciExp = (x: Num): number => x.e + digits(x.m) - 1;

// ───────────────────────────── arrotondamenti ─────────────────────────────

/** Arrotonda (da 5 in su) o tronca il numero a k decimali; il risultato è un intero r con il valore r·10^(−k). */
function roundTo(x: Num, k: number, mode: "half" | "down" | "up"): number {
  const scaled = valueOf(x).mul(pow10(k));
  const floor = Number(scaled.n / scaled.d);
  const rest = scaled.sub(floor);
  if (mode === "down") return floor;
  if (mode === "up") return rest.isZero() ? floor : floor + 1;
  return rest.cmp(Rational.of(1, 2)) >= 0 ? floor + 1 : floor;
}

/** I decimali da tenere per avere s cifre significative. */
const placesForSig = (x: Num, s: number): number => s - 1 - sciExp(x);

/** Il numero r·10^(−k) scritto con esattamente k decimali (anche gli zeri finali). */
function fixedText(r: number, k: number): string {
  if (k <= 0) return String(r * 10 ** -k);
  const s = String(r).padStart(k + 1, "0");
  return `${s.slice(0, -k)},${s.slice(-k)}`;
}
const fixedExpr = (r: number, k: number): Expr => (k <= 0 ? num(r * 10 ** -k) : decimal(fixedText(r, k)));
const fixedLatex = (r: number, k: number): string => fixedText(r, k).replace(",", "{,}");

function roundPlaces(m: Extract<Model, { kind: "round" }>): number {
  return m.by === "places" ? m.n : placesForSig(m.x, m.n);
}

function roundCorrect(m: Extract<Model, { kind: "round" }>): Expr {
  const k = roundPlaces(m);
  return fixedExpr(roundTo(m.x, k, "half"), k);
}

function roundWrong(m: Extract<Model, { kind: "round" }>): { error: ErrorCode; value: Expr }[] {
  const k = roundPlaces(m);
  const right = roundTo(m.x, k, "half");
  const down = roundTo(m.x, k, "down");
  const out: { error: ErrorCode; value: Expr }[] = [];
  // Troncare, oppure aumentare con la prima cifra tolta minore di 5.
  out.push({ error: ROUND, value: fixedExpr(right === down ? roundTo(m.x, k, "up") : down, k) });
  // Gli zeri iniziali contati come cifre significative (numeri minori di 1).
  if (m.by === "sig" && sciExp(m.x) < 0) out.push({ error: ROUND, value: fixedExpr(roundTo(m.x, m.n, "half"), m.n) });
  // Una cifra di troppo.
  out.push({ error: ROUND, value: fixedExpr(roundTo(m.x, k + 1, "half"), k + 1) });
  return out;
}

// ───────────────────────────── stime ─────────────────────────────

/** Il numero arrotondato a una cifra significativa: d·10^n (d da 1 a 9). */
function oneDigit(x: Num): Num {
  const n = sciExp(x);
  const d = roundTo(x, -n, "half");
  return d === 10 ? { m: 1, e: n + 1 } : { m: d, e: n };
}

function estimateOf(m: Extract<Model, { kind: "estimate" }>): Rational {
  const [x, y, z] = m.factors.map((f) => valueOf(oneDigit(f)));
  const p = (x ?? Rational.of(1)).mul(y ?? Rational.of(1));
  return m.divide && z ? p.div(z) : p;
}

function exactOf(m: Extract<Model, { kind: "estimate" }>): Rational {
  const [x, y, z] = m.factors.map(valueOf);
  const p = (x ?? Rational.of(1)).mul(y ?? Rational.of(1));
  return m.divide && z ? p.div(z) : p;
}

/** Le opzioni: la stima e la stima per 10, 1/10, 100 (o 1/100). */
function estimateOptions(m: Extract<Model, { kind: "estimate" }>): Rational[] {
  const e = estimateOf(m);
  return [e, e.mul(10), e.div(10), m.order.length > 0 && (m.order[0] ?? 0) % 2 === 0 ? e.mul(100) : e.div(100)];
}

/** Distanza «per rapporto» tra due numeri positivi: |log10(a/b)|. */
const ratioDistance = (a: Rational, b: Rational): number => Math.abs(Math.log10(a.div(b).toNumber()));

/** Un numero positivo scritto per esteso, con gli spazi sottili ogni tre cifre. */
function plainLatex(r: Rational): string {
  for (let k = 0; k <= 12; k++) {
    const scaled = r.mul(pow10(k));
    if (!scaled.isInteger()) continue;
    const all = scaled.n.toString().padStart(k + 1, "0");
    const int = all.slice(0, all.length - k);
    const dec = all.slice(all.length - k);
    const groupInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
    const groupDec = dec.replace(/(\d{3})(?=\d)/g, "$1\\,");
    return k === 0 ? groupInt : `${groupInt}{,}${groupDec}`;
  }
  return r.toString();
}
const numLatex = (x: Num): string => plainLatex(valueOf(x));

/** Un numero positivo arrotondato a tre cifre significative, scritto per esteso (solo per il testo). */
function approxLatex(r: Rational): string {
  const text = String(Number(r.toNumber().toPrecision(3)));
  const [int = "0", dec] = text.split(".");
  const groupedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
  return dec === undefined ? groupedInt : `${groupedInt}{,}${dec}`;
}

// ───────────────────────────── costruzione ─────────────────────────────

/** Una mantissa di 3 cifre che non finisce con 0. */
function threeDigits(rng: Rng_): number {
  for (;;) {
    const m = rng.int(101, 999);
    if (m % 10 !== 0) return m;
  }
}

function buildRound(level: Level, rng: Rng_): Model {
  if (level === 1) {
    const k = rng.int(1, 3);
    const p = k + rng.int(1, 2);
    const m = rng.int(10 ** p, 10 ** (p + 2) - 1);
    return { kind: "round", x: { m, e: -p }, by: "places", n: k };
  }
  const s = rng.int(2, 3);
  if (level === 3 && rng.bool()) {
    // Riporto che fa scattare le cifre: …99x con x ≥ 5.
    const lead = rng.int(1, 8);
    const m = Number(`${lead}${"9".repeat(s - 1)}${rng.int(5, 9)}${rng.int(0, 9)}`);
    return { kind: "round", x: { m, e: -(digits(m) - 1) + rng.int(-2, 1) }, by: "sig", n: s };
  }
  const small = level === 3 || rng.bool();
  const m = rng.int(10 ** (s + 1), 10 ** (s + 2) - 1);
  const e = small ? -(digits(m) + rng.int(1, 2)) : -(digits(m) - rng.int(1, 3));
  return { kind: "round", x: { m, e }, by: "sig", n: s };
}

function buildEstimate(level: Level, rng: Rng_): Model {
  const big = { m: threeDigits(rng), e: rng.int(0, 3) };
  const small = { m: threeDigits(rng), e: -(3 + rng.int(1, 3)) };
  const order = [rng.int(0, 9)];
  if (level === 2) return { kind: "estimate", factors: [big, small], divide: false, order };
  // Livello 3: (x · y) : z, con z di cifra iniziale che dà un quoziente limitato.
  const z = { m: threeDigits(rng), e: rng.int(-4, 1) };
  return { kind: "estimate", factors: [big, small, z], divide: true, order };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 || rng.bool(0.5) ? buildRound(level, rng) : buildEstimate(level, rng);
    if (m.kind === "round") {
      const k = roundPlaces(m);
      if (roundTo(m.x, k, "half") === 0) continue;
      if (distinctWrongExpressions(roundCorrect(m), roundWrong(m)).length < (level === 1 ? 2 : 3) && level > 1) continue;
      if (distinctWrongExpressions(roundCorrect(m), roundWrong(m)).length < 2) continue;
      return m;
    }
    const z = m.factors[2];
    if (z && ![1, 2, 4, 5].includes(oneDigit(z).m)) continue;
    const options = estimateOptions(m);
    const v = exactOf(m);
    const [best, ...others] = options.map((o) => ratioDistance(o, v));
    if (best === undefined || best > 0.45 || others.some((d) => d <= best)) continue;
    if (options.some((o) => !tidy(o))) continue;
    return m;
  }
}

/** Opzione scrivibile: al più 7 cifre in tutto. */
function tidy(r: Rational): boolean {
  const text = plainLatex(r).replace(/\\,|\{,\}/g, "");
  return text.length <= 8;
}

// ───────────────────────────── testo ─────────────────────────────

const placeName = (k: number): string => (k === 1 ? "ai decimi" : k === 2 ? "ai centesimi" : "ai millesimi");

function draftRound(m: Extract<Model, { kind: "round" }>): ExerciseDraft {
  const k = roundPlaces(m);
  const x = numLatex(m.x);
  const right = roundTo(m.x, k, "half");
  const down = roundTo(m.x, k, "down");
  // La prima cifra tolta.
  const firstDropped = roundTo(m.x, k + 1, "down") % 10;
  const ask = m.by === "places" ? placeName(m.n) : `a ${m.n === 2 ? "due" : "tre"} cifre significative`;
  const steps = [
    m.by === "sig"
      ? `**Passo 1. Le cifre da tenere.** Le cifre significative partono dalla prima diversa da $0$${sciExp(m.x) < 0 ? " (gli zeri iniziali non contano)" : ""}: per tenerne ${m.n === 2 ? "due" : "tre"} si arriva ${k > 0 ? `alla ${k}ª cifra dopo la virgola` : k === 0 ? "alle unità" : `alla cifra delle ${k === -1 ? "decine" : "centinaia"}`}.`
      : `**Passo 1. Le cifre da tenere.** Si tengono le cifre fino ${m.n === 1 ? "ai decimi" : m.n === 2 ? "ai centesimi" : "ai millesimi"}, cioè ${m.n} dopo la virgola.`,
    `**Passo 2. La prima cifra tolta.** È $${firstDropped}$: ${firstDropped >= 5 ? "da $5$ in su, l'ultima cifra tenuta aumenta di $1$" : "da $0$ a $4$, l'ultima cifra tenuta resta com'è"}.`,
    `**Passo 3. Il risultato.** $${x} \\approx ${fixedLatex(right, k)}$${right !== down && String(right).length > String(down).length ? " (il riporto fa scattare anche le cifre prima)" : ""}.`,
  ];
  return {
    prompt: `Arrotonda $${x}$ ${ask}.`,
    answer: { kind: "number", correct: roundCorrect(m), wrong: distinctWrongExpressions(roundCorrect(m), roundWrong(m)), mode: exact },
    steps: steps.map((text) => ({ text })),
    hints: [
      "Guarda la prima cifra che togli: decide se l'ultima cifra tenuta resta com'è o aumenta di $1$.",
      m.by === "sig" ? "Le cifre significative si contano dalla prima cifra diversa da $0$, da sinistra." : "Ai decimi si tiene una cifra dopo la virgola, ai centesimi due, ai millesimi tre.",
    ],
  };
}

function draftEstimate(m: Extract<Model, { kind: "estimate" }>): ExerciseDraft {
  const [x, y, z] = m.factors as [Num, Num, Num | undefined];
  const expr = m.divide && z ? `\\dfrac{${numLatex(x)} \\cdot ${numLatex(y)}}{${numLatex(z)}}` : `${numLatex(x)} \\cdot ${numLatex(y)}`;
  const options = estimateOptions(m);
  const [right, ...wrong] = options;
  const one = m.factors.map(oneDigit);
  const sci = (n: Num): string => `${n.m} \\cdot 10^{${n.e}}`;
  const rounding = m.factors.map((f, i) => `$${numLatex(f)} \\approx ${sci(one[i] ?? f)}$`).join(", ");
  const e = estimateOf(m);
  const digitsPart = one.slice(0, 2).reduce((a, n) => a * n.m, 1);
  const expPart = (one[0]?.e ?? 0) + (one[1]?.e ?? 0) - (m.divide && one[2] ? one[2].e : 0);
  return {
    prompt: `Senza calcolatrice: quale di questi numeri è più vicino a $${expr}$?`,
    answer: {
      kind: "choice",
      correct: `$${plainLatex(right ?? e)}$`,
      wrong: wrong.map((w) => ({ error: TEN, value: `$${plainLatex(w)}$` })),
    },
    steps: [
      { text: `**Passo 1. Arrotonda** ogni numero a una cifra significativa: ${rounding}.` },
      {
        text: `**Passo 2. Calcola** le cifre a parte e le potenze di $10$ con le loro proprietà: cifre $${m.divide && one[2] ? `\\dfrac{${one[0]?.m} \\cdot ${one[1]?.m}}{${one[2].m}}` : `${one[0]?.m} \\cdot ${one[1]?.m}`} = ${plainLatex(Rational.of(digitsPart).div(m.divide && one[2] ? one[2].m : 1))}$, potenza $10^{${expPart}}$.`,
      },
      { text: `**Passo 3. Leggi** il risultato: circa $${plainLatex(e)}$. Il valore esatto è circa $${approxLatex(exactOf(m))}$: l'opzione più vicina è $${plainLatex(e)}$.` },
    ],
    hints: [
      "Arrotonda ogni numero a una sola cifra significativa e scrivilo come cifra per potenza di $10$.",
      "Moltiplica le cifre a parte; per le potenze di $10$ somma gli esponenti nel prodotto e sottraili nel quoziente.",
    ],
  };
}

const draftOf = (m: Model): ExerciseDraft => (m.kind === "round" ? draftRound(m) : draftEstimate(m));

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (m.kind === "round") {
    if (exercise.answer.kind !== "number" || exercise.answer.correct.kind !== "num") return false;
    const answer = exercise.answer.correct.value;
    const k = roundPlaces(m);
    const unit = pow10(-k);
    // La risposta è un multiplo dell'unità e la differenza con il numero è al più mezza unità,
    // con il caso di mezzo arrotondato per eccesso.
    if (!answer.div(unit).isInteger()) return false;
    const diff = valueOf(m.x).sub(answer);
    const half = unit.div(2);
    return diff.cmp(half.neg()) >= 0 && diff.cmp(half) < 0;
  }
  if (exercise.answer.kind !== "choice") return false;
  const v = exactOf(m);
  const options = estimateOptions(m);
  const [best, ...others] = options.map((o) => ratioDistance(o, v));
  return best !== undefined && others.every((d) => d > best) && exercise.answer.correct === `$${plainLatex(options[0] ?? v)}$`;
}

export default defineGenerator({
  code: "V1.M03.A09.g1",
  skill: "V1.M03.A09",
  lesson: "V1.M03.L07",
  title: "Stime e arrotondamenti",
  levels: [1, 2, 3],
  errors: [ROUND, TEN],
  limits: { maxInteger: 10 ** 9, maxDenominator: 10 ** 9 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
