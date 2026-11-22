// V1.M02.A03.g1 — Scomposizione in fattori primi.
//
// Scelta multipla scritta a mano: le opzioni sono prodotti di potenze (il motore mostrerebbe il numero
// già calcolato). All'indietro: si scelgono i primi e gli esponenti, il numero è il loro prodotto.
// Le opzioni sbagliate, fatte davvero sulla scomposizione giusta:
// - CALC.SCOMPOSIZIONE_PRIMI: una divisione non contata (l'esponente più alto diminuito di uno, o un
//   primo con esponente 1 dimenticato), una contata due volte (un esponente aumentato di uno), esponenti
//   scambiati tra due primi;
// - FORMA.NON_RICHIESTA: il prodotto vale il numero giusto, ma un fattore non è primo (una potenza
//   scritta come numero, 3² come 9, oppure due primi moltiplicati tra loro, 2 · 3 come 6).
//
// Livello 1: numeri fino a 300 con i primi 2, 3, 5, 7.
// Livello 2: numeri fino a 6000 con i primi fino a 11, tre o quattro primi diversi.
// Livello 3: un primo tra 13 e 31 (da riconoscere come primo provando i divisori fino alla radice),
//   oppure due primi grandi come 11 · 13.
//
// Verifica: dal testo dell'opzione giusta si leggono i fattori; ognuno deve essere primo (provando i
// divisori) e il loro prodotto deve dare il numero del testo. Le opzioni sbagliate devono dare un altro
// numero, oppure contenere un fattore non primo.

import { defineGenerator, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import { Rng } from "../../../motore/random/rng";

type Rng_ = GeneratorContext["rng"];

const FACTORS = "CALC.SCOMPOSIZIONE_PRIMI";
const NOT_PRIME = "FORMA.NON_RICHIESTA";

/** Un fattore scritto: base (anche non prima, nelle opzioni sbagliate) ed esponente. */
type Factor = readonly [base: number, exp: number];

interface Model {
  /** La scomposizione giusta, per primi crescenti. */
  readonly factors: readonly Factor[];
}

const valueOf = (factors: readonly Factor[]): number => factors.reduce((p, [b, e]) => p * b ** e, 1);

const latexOf = (factors: readonly Factor[]): string => factors.map(([b, e]) => (e === 1 ? `${b}` : `${b}^{${e}}`)).join(" \\cdot ");

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// ───────────────────────────── costruzione ─────────────────────────────

/** La scomposizione di n con i soli primi ammessi, oppure null. */
function factorOver(n: number, primes: readonly number[]): Factor[] | null {
  const out: Factor[] = [];
  let rest = n;
  for (const p of primes) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e++;
    }
    if (e > 0) out.push([p, e]);
  }
  return rest === 1 ? out : null;
}

/**
 * Un numero scelto con la stessa probabilità tra tutti quelli in [min; max] fatti con i primi ammessi,
 * con un numero di primi diversi in `counts` e almeno un esponente maggiore di 1.
 */
function draw(rng: Rng_, primes: readonly number[], counts: readonly number[], min: number, max: number): Factor[] {
  const all: Factor[][] = [];
  for (let n = min; n <= max; n++) {
    const f = factorOver(n, primes);
    if (f && counts.includes(f.length) && f.some(([, e]) => e >= 2)) all.push(f);
  }
  return rng.pick(all);
}

function buildModel(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1:
      return { factors: draw(rng, [2, 3, 5, 7], [2, 3], 24, 1000) };
    case 2:
      return { factors: draw(rng, [2, 3, 5, 7, 11], [3, 4], 200, 6000) };
    case 3: {
      const form = rng.pick(["bigPrime", "bigPrime", "twoBig"] as const);
      if (form === "bigPrime") {
        const big = rng.pick([13, 17, 19, 23, 29, 31] as const);
        const small = draw(rng, [2, 3, 5, 7], [1, 2], 4, Math.floor(9000 / big));
        return { factors: [...small, [big, 1] as Factor] };
      }
      const [p, q] = rng.sample([11, 13, 17, 19] as const, 2).sort((a, b) => a - b) as [number, number];
      const small = draw(rng, [2, 3, 5], [1, 2], 4, Math.floor(9000 / (p * q)));
      return { factors: [...small, [p, 1] as Factor, [q, 1] as Factor] };
    }
  }
}

// ───────────────────────────── opzioni sbagliate ─────────────────────────────

function wrongOptions(model: Model): ExpectedWrong<string>[] {
  const f = model.factors;
  const correct = latexOf(f);
  const candidates: { error: typeof FACTORS | typeof NOT_PRIME; factors: Factor[] }[] = [];
  // L'esponente più alto (a parità, il primo più piccolo).
  const top = f.reduce((best, x) => (x[1] > best[1] ? x : best));
  // Una divisione non contata.
  candidates.push({ error: FACTORS, factors: f.map(([b, e]) => [b, b === top[0] ? e - 1 : e] as Factor).filter(([, e]) => e > 0) });
  // Un fattore non primo con il prodotto giusto: la potenza più alta scritta come numero; se non
  // basta, i due primi più piccoli moltiplicati.
  candidates.push({ error: NOT_PRIME, factors: f.map(([b, e]) => (b === top[0] ? ([b ** e, 1] as Factor) : ([b, e] as Factor))) });
  // Esponenti scambiati tra due primi con esponenti diversi.
  const other = f.find(([b, e]) => b !== top[0] && e !== top[1]);
  if (other) candidates.push({ error: FACTORS, factors: f.map(([b, e]) => [b, b === top[0] ? other[1] : b === other[0] ? top[1] : e] as Factor) });
  // Una divisione contata due volte: l'ultimo primo con un esponente in più.
  const last = f[f.length - 1] as Factor;
  candidates.push({ error: FACTORS, factors: f.map(([b, e]) => [b, b === last[0] ? e + 1 : e] as Factor) });
  // Due primi moltiplicati (con esponente 1 tutti e due, oppure il più piccolo una volta sola).
  const [p0, p1] = f;
  if (p0 && p1) {
    const merged: Factor[] = [[p0[0] * p1[0], 1]];
    if (p0[1] > 1) merged.push([p0[0], p0[1] - 1]);
    if (p1[1] > 1) merged.push([p1[0], p1[1] - 1]);
    candidates.push({ error: NOT_PRIME, factors: [...merged, ...f.slice(2)] });
  }
  const kept: ExpectedWrong<string>[] = [];
  for (const c of candidates) {
    const text = latexOf(c.factors);
    if (text === correct || kept.some((k) => k.value === `$${text}$`)) continue;
    kept.push({ error: c.error, value: `$${text}$` });
  }
  return kept.slice(0, 4);
}

// ───────────────────────────── testo ─────────────────────────────

function draftOf(model: Model): ExerciseDraft {
  const n = valueOf(model.factors);
  const steps: { text: string }[] = [];
  const timesText = (e: number): string => ["una volta", "due volte", "tre volte", "quattro volte"][e - 1] ?? `${e} volte`;
  let current = n;
  let previous = 1;
  for (const [p, e] of model.factors) {
    // I primi provati tra il precedente e p, che non dividono il quoziente.
    const skipped = primesBetween(previous, p);
    const tried = skipped.length > 0 && p > 7 ? `$${current}$ non è divisibile per ${skipped.map((q) => `$${q}$`).join(", ")}. ` : "";
    if (current === p && p > 7) {
      steps.push({ text: `Resta $${p}$, che è primo: non è divisibile per nessuno dei primi ${primesUpTo(p).map((q) => `$${q}$`).join(", ")}, e già $${nextPrime(primesUpTo(p).at(-1) ?? 1)}^2$ supera $${p}$.` });
      current = 1;
      previous = p;
      continue;
    }
    const chain = [current];
    for (let i = 0; i < e; i++) {
      current /= p;
      chain.push(current);
    }
    steps.push({ text: `${tried}Per $${p}$: $${chain.join(" \\to ")}$ (${timesText(e)}).` });
    previous = p;
  }
  const check = model.factors.map(([b, e]) => b ** e);
  return {
    prompt: `Qual è la scomposizione in fattori primi di $${n}$?`,
    answer: { kind: "choice", correct: `$${latexOf(model.factors)}$`, wrong: wrongOptions(model) },
    steps: [
      { text: "**Passo 1.** Dividi per il primo più piccolo che divide il numero, finché puoi; poi passa al primo successivo." },
      ...steps.map((s, i) => ({ text: `**Passo ${i + 2}.** ${s.text}` })),
      { text: `**Passo ${steps.length + 2}.** $${n} = ${latexOf(model.factors)}$. Controllo: $${check.join(" \\cdot ")} = ${n}$.` },
    ],
    hints: [
      "Ogni fattore deve essere primo, e il prodotto deve ridare il numero di partenza.",
      `Comincia dividendo per $${model.factors[0]?.[0] ?? 2}$, e conta quante volte riesci a farlo.`,
    ],
  };
}

/** I primi strettamente compresi tra a e b. */
function primesBetween(a: number, b: number): number[] {
  const out: number[] = [];
  for (let q = a + 1; q < b; q++) if (isPrime(q)) out.push(q);
  return out;
}

/** Il primo successivo a n. */
function nextPrime(n: number): number {
  let q = n + 1;
  while (!isPrime(q)) q++;
  return q;
}

/** I primi p con p² ≤ n. */
function primesUpTo(n: number): number[] {
  const out: number[] = [];
  for (let p = 2; p * p <= n; p++) if (isPrime(p)) out.push(p);
  return out;
}

// ───────────────────────────── verifica ─────────────────────────────

/** I fattori letti da un'opzione: «2^{3} \cdot 3 \cdot 5». */
function readFactors(text: string): Factor[] {
  return text
    .replace(/\$/g, "")
    .split("\\cdot")
    .map((part) => {
      const m = /^\s*(\d+)(?:\^\{(\d+)\})?\s*$/.exec(part);
      if (!m) return [0, 0] as Factor;
      return [Number(m[1]), m[2] ? Number(m[2]) : 1] as Factor;
    });
}

function verifyModel(_model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  const n = Number(/di \$(\d+)\$/.exec(exercise.prompt)?.[1]);
  if (answer.kind !== "choice") return false;
  const right = readFactors(answer.correct);
  if (!right.every(([b, e]) => isPrime(b) && e >= 1) || valueOf(right) !== n) return false;
  return answer.wrong.every((w) => {
    const f = readFactors(w.value);
    return valueOf(f) !== n || f.some(([b]) => !isPrime(b));
  });
}

export default defineGenerator({
  code: "V1.M02.A03.g1",
  skill: "V1.M02.A03",
  lesson: "V1.M02.L02",
  title: "Scomposizione in fattori primi",
  levels: [1, 2, 3],
  errors: [FACTORS, NOT_PRIME],
  limits: { maxInteger: 10_000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
