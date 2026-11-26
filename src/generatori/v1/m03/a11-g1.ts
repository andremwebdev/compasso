// V1.M03.A11.g1 — Confrontare espressioni numeriche (radicali, potenze, frazioni) senza calcolatrice.
//
// Scelta multipla scritta a mano: «Quale di questi numeri è il maggiore?». All'indietro: si sceglie il
// numero giusto, poi tre numeri più piccoli costruiti apposta perché un errore di confronto li faccia
// sembrare più grandi:
// - CALC.CONFRONTO_NUMERI: il numero davanti alla radice più grande (3√2 contro 2√3); il radicando più
//   grande con un indice più grande (∛11 contro √5); nelle potenze, l'esponente più grande con la base più
//   piccola (2⁶⁰ contro 3⁴⁰) o la base più grande con l'esponente più piccolo; un intero che «sembra»
//   più grande di una radice;
// - DISEQ.VERSO_NON_INVERTITO: tra numeri negativi, il più lontano dallo 0, scelto da chi confronta senza
//   segno.
//
// Livello 1: radici quadrate con un numero davanti e interi, tutti tra 2 e 10 (si confrontano i quadrati).
// Livello 2: radici di indice diverso (2, 3, 4) con valori vicini (si eleva al mcm degli indici).
// Livello 3: potenze con esponenti grandi (si riscrivono con lo stesso esponente), oppure numeri negativi
//   con radici (il maggiore è il più vicino allo 0).
//
// Verifica: i numeri si confrontano in modo esatto con gli interi grandi: le radici si elevano alla 60ª
// potenza (multiplo di tutti gli indici), le potenze si calcolano per intero.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { gcd, lcm } from "../../comuni/primes";

type Rng_ = GeneratorContext["rng"];

const COMPARE: ErrorCode = "CALC.CONFRONTO_NUMERI";
const SIGN: ErrorCode = "DISEQ.VERSO_NON_INVERTITO";

/** c·ⁿ√r (n = 1 per un intero), eventualmente negativo; oppure bᵉ. */
type Item = { readonly k: "root"; readonly c: number; readonly n: number; readonly r: number; readonly neg: boolean } | { readonly k: "pow"; readonly b: number; readonly e: number };

interface Model {
  readonly correct: Item;
  readonly traps: readonly { readonly item: Item; readonly error: ErrorCode }[];
  readonly order: readonly number[];
}

const root = (c: number, n: number, r: number, neg = false): Item => ({ k: "root", c, n, r, neg });

// ───────────────────────────── confronto esatto ─────────────────────────────

const L = 60n;
/** |valore|^60 per le radici, valore esatto per le potenze (con il segno: i negativi sono negativi). */
function key(it: Item): bigint {
  if (it.k === "pow") return BigInt(it.b) ** BigInt(it.e);
  const inside = BigInt(it.c) ** BigInt(it.n) * BigInt(it.r);
  const abs = inside ** (L / BigInt(it.n));
  return it.neg ? -abs : abs;
}
/** Confronto: negativo se a < b. Tra negativi la potenza pari rovescerebbe l'ordine: si confrontano gli opposti. */
function cmp(a: Item, b: Item): number {
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

// ───────────────────────────── costruzione ─────────────────────────────

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13] as const;

/** Un intero o una radice quadrata c√r tra 2 e 10. */
function smallItem(rng: Rng_): Item {
  if (rng.bool(0.25)) return root(rng.int(2, 9), 1, 1);
  for (;;) {
    const c = rng.int(1, 4);
    const r = rng.pick(SQUAREFREE);
    if (c * c * r >= 4 && c * c * r <= 100) return root(c, 2, r);
  }
}

/** Una radice di indice 2, 3 o 4 con valore tra 1,5 e 4. */
function indexItem(rng: Rng_): Item {
  for (;;) {
    const n = rng.pick([2, 3, 4] as const);
    const r = rng.int(3, 80);
    const low = 1.5 ** n;
    const high = 4 ** n;
    if (r < low || r > high || Number.isInteger(r ** (1 / n))) continue;
    return root(1, n, r);
  }
}

/** Una potenza bᵉ con e multiplo di un g comune. */
function powItem(rng: Rng_, g: number): Item {
  for (;;) {
    const b = rng.pick([2, 3, 5, 6, 7, 10, 11] as const);
    const k = rng.int(1, 6);
    // Basi riscritte (b^k) tra 8 e 130: i confronti restano vicini e non si vedono a occhio.
    if (b ** k < 8 || b ** k > 130) continue;
    return { k: "pow", b, e: g * k };
  }
}

/** Prova a trovare tre trappole con le proprietà date. */
function trapsFor(rng: Rng_, correct: Item, draw: () => Item, rules: readonly { error: ErrorCode; ok: (t: Item) => boolean }[]): Model["traps"] | null {
  const traps: { item: Item; error: ErrorCode }[] = [];
  for (const rule of rules) {
    let found: Item | null = null;
    for (let i = 0; i < 80 && !found; i++) {
      const t = draw();
      if (cmp(t, correct) >= 0) continue;
      if ([correct, ...traps.map((x) => x.item)].some((x) => cmp(x, t) === 0)) continue;
      if (!rule.ok(t)) continue;
      found = t;
    }
    if (!found) return null;
    traps.push({ item: found, error: rule.error });
  }
  return traps;
}

const outside = (it: Item): number => (it.k === "root" ? it.c : it.b);
const inner = (it: Item): number => (it.k === "root" ? it.r : it.e);
const index = (it: Item): number => (it.k === "root" ? it.n : 1);

function buildLevel(level: Level, rng: Rng_): Model | null {
  if (level === 1) {
    const correct = smallItem(rng);
    const traps = trapsFor(rng, correct, () => smallItem(rng), [
      // Numero davanti più grande, valore più piccolo.
      { error: COMPARE, ok: (t) => outside(t) > outside(correct) && index(t) === 2 && index(correct) === 2 },
      // Radicando più grande, valore più piccolo.
      { error: COMPARE, ok: (t) => inner(t) > inner(correct) && index(t) === 2 },
      { error: COMPARE, ok: () => true },
    ]);
    return traps && { correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
  }
  if (level === 2) {
    const correct = indexItem(rng);
    const traps = trapsFor(rng, correct, () => indexItem(rng), [
      // Radicando più grande con un indice più grande.
      { error: COMPARE, ok: (t) => t.k === "root" && correct.k === "root" && t.r > correct.r && t.n > correct.n },
      { error: COMPARE, ok: (t) => t.k === "root" && correct.k === "root" && t.r > correct.r },
      { error: COMPARE, ok: (t) => t.k === "root" && correct.k === "root" && t.n !== correct.n },
    ]);
    return traps && { correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
  }
  if (rng.bool()) {
    const g = rng.pick([10, 12, 20] as const);
    const correct = powItem(rng, g);
    const traps = trapsFor(rng, correct, () => powItem(rng, g), [
      // Esponente più grande, valore più piccolo.
      { error: COMPARE, ok: (t) => inner(t) > inner(correct) },
      // Base più grande, valore più piccolo.
      { error: COMPARE, ok: (t) => outside(t) > outside(correct) },
      { error: COMPARE, ok: () => true },
    ]);
    if (traps && [correct, ...traps.map((t) => t.item)].some((it) => it.k === "pow" && it.e > 80)) return null;
    return traps && { correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
  }
  // Negativi: il maggiore è il più vicino allo 0.
  const negItem = (): Item => {
    const it = rng.bool(0.5) ? smallItem(rng) : indexItem(rng);
    return it.k === "root" ? { ...it, neg: true } : it;
  };
  const correct = negItem();
  const traps = trapsFor(rng, correct, negItem, [
    // Il più lontano dallo 0: chi confronta senza segno lo prende per il maggiore.
    { error: SIGN, ok: () => true },
    { error: COMPARE, ok: (t) => inner(t) < inner(correct) },
    { error: COMPARE, ok: () => true },
  ]);
  if (!traps) return null;
  const sign = traps[0]?.item;
  if (sign && traps.slice(1).some((t) => cmp(t.item, sign) <= 0)) return null;
  return { correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = buildLevel(level, rng);
    if (m) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

function itemLatex(it: Item): string {
  if (it.k === "pow") return `${it.b}^{${it.e}}`;
  const sign = it.neg ? "-" : "";
  if (it.n === 1) return `${sign}${it.c}`;
  const rad = it.n === 2 ? `\\sqrt{${it.r}}` : `\\sqrt[${it.n}]{${it.r}}`;
  return `${sign}${it.c === 1 ? "" : it.c}${rad}`;
}
const itemText = (it: Item): string => `$${itemLatex(it)}$`;
/** Un intero grande con lo spazio sottile ogni tre cifre (da cinque cifre in su). */
const bigLatex = (v: bigint): string => (v.toString().length < 5 ? v.toString() : v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\\,"));
const listOf = (items: readonly string[]): string => `${items.slice(0, -1).join(", ")} e ${items[items.length - 1] ?? ""}`;

function stepsOf(m: Model, ordered: readonly Item[]): string[] {
  const sorted = [...ordered].sort(cmp);
  const chain = sorted.map(itemLatex).join(" < ");
  const first = ordered[0];
  if (first?.k === "pow") {
    const g = ordered.reduce((acc, it) => gcd(acc, it.k === "pow" ? it.e : acc), first.e);
    const rewritten = ordered.map((it) => (it.k === "pow" ? `$${it.b}^{${it.e}} = \\left(${it.b}^{${it.e / g}}\\right)^{${g}} = ${bigLatex(BigInt(it.b) ** BigInt(it.e / g))}^{${g}}$` : "")).join(", ");
    return [
      `**Passo 1. Stesso esponente.** Gli esponenti sono multipli di $${g}$: ${rewritten}.`,
      `**Passo 2. Confronta le basi.** Con lo stesso esponente, tra numeri positivi, è maggiore la potenza con la base maggiore: $${chain}$.`,
      `**Passo 3. Il maggiore** è $${itemLatex(m.correct)}$.`,
    ];
  }
  const negative = ordered.some((it) => it.k === "root" && it.neg);
  const n = ordered.reduce((acc, it) => lcm(acc, index(it)), 1);
  const powered = ordered
    .map((it) => {
      if (it.k !== "root") return "";
      const abs = { ...it, neg: false };
      const value = (BigInt(it.c) ** BigInt(it.n) * BigInt(it.r)) ** BigInt(n / it.n);
      return `$\\left(${itemLatex(abs)}\\right)^{${n}} = ${bigLatex(value)}$`;
    })
    .join(", ");
  return [
    negative
      ? "**Passo 1. Segni.** Sono tutti negativi: si confrontano gli opposti e alla fine si inverte il verso. Il maggiore è il più vicino allo $0$."
      : "**Passo 1. Segni.** Sono tutti positivi.",
    `**Passo 2. Potenza comune.** ${n === 1 ? "Sono interi." : `Si eleva ${negative ? "ogni opposto" : "ogni numero"} alla $${n}$ (${n === 2 ? "il quadrato" : "il mcm degli indici"}), che fa sparire le radici: ${powered}.`}`,
    `**Passo 3. Confronta.** ${negative ? "Gli opposti con la potenza maggiore sono i più lontani dallo $0$; invertendo il verso" : "L'ordine delle potenze è l'ordine dei numeri"}: $${chain}$. Il maggiore è $${itemLatex(m.correct)}$.`,
  ];
}

function draftOf(m: Model): ExerciseDraft {
  const all = [m.correct, ...m.traps.map((t) => t.item)];
  const ordered = m.order.map((i) => all[i] ?? m.correct);
  return {
    prompt: `Senza calcolatrice: quale di questi numeri è il maggiore? ${listOf(ordered.map(itemText))}.`,
    answer: { kind: "choice", correct: itemText(m.correct), wrong: m.traps.map((t) => ({ error: t.error, value: itemText(t.item) })) },
    steps: stepsOf(m, ordered).map((text) => ({ text })),
    hints: [
      "Non si confrontano i radicandi, i numeri davanti o gli esponenti da soli: servono numeri scritti nello stesso modo.",
      ordered[0]?.k === "pow"
        ? "Riscrivi le potenze con lo stesso esponente, $a^{mk} = \\left(a^m\\right)^k$, e confronta le basi."
        : "Eleva tutti i numeri (positivi) alla stessa potenza, multiplo degli indici delle radici: l'ordine non cambia. Con i negativi confronta gli opposti e inverti il verso.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "choice" || exercise.answer.correct !== itemText(m.correct)) return false;
  // Ogni trappola è strettamente minore della giusta (confronto esatto con gli interi grandi).
  return m.traps.every((t) => cmp(t.item, m.correct) < 0) && [m.correct, ...m.traps.map((t) => t.item)].every((it) => exercise.prompt.includes(itemText(it)));
}

export default defineGenerator({
  code: "V1.M03.A11.g1",
  skill: "V1.M03.A11",
  lesson: "V1.M03.L09",
  title: "Confrontare numeri senza calcolatrice",
  levels: [1, 2, 3],
  errors: [COMPARE, SIGN],
  limits: { maxInteger: 1000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
