// V1.M03.A02.g1 — Ridurre ai minimi termini e confrontare frazioni con il minimo comune denominatore.
//
// Due forme.
// - «Quale è la maggiore (la minore)?», scelta multipla scritta a mano. All'indietro: si sceglie prima
//   la frazione giusta, poi tre frazioni «trappola» che un errore di confronto fa sembrare giuste:
//   · CALC.CONFRONTO_NUMERI: numeratore più grande ma valore più piccolo (7/10 contro 5/7); denominatore
//     più piccolo ma valore più piccolo (chi pensa «pezzi più grandi»); una frazione non ridotta con
//     numeri grandi (18/24 contro 4/5);
//   · DISEQ.VERSO_NON_INVERTITO: tra frazioni negative, quella scelta da chi le confronta senza segno.
// - «Qual è il minimo comune denominatore?» (solo livello 1), un numero. Le sbagliate (ALG.MCD_MCM,
//   nel senso largo della decisione 145): il MCD dei denominatori al posto del mcm; il loro prodotto,
//   che è un denominatore comune ma non il minimo.
//
// Livello 1: tre o quattro frazioni positive irriducibili con denominatori fino a 12; oppure il minimo
//   comune denominatore di due frazioni.
// Livello 2: quattro frazioni positive, una da ridurre ai minimi termini, minimo comune denominatore
//   fino a 120.
// Livello 3: frazioni negative (anche con il meno al denominatore, da portare davanti) e frazioni da
//   ridurre: la maggiore è la più vicina allo 0, la minore la più lontana.
//
// Verifica: per la scelta, i valori delle frazioni mostrate si confrontano con i razionali esatti (la
// giusta è la maggiore o la minore, le altre diverse da lei); per il numero, il minimo comune
// denominatore è un multiplo di ogni denominatore ridotto e nessun numero più piccolo lo è.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { num } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { factorize, gcd, isPrime, lcm, powersLatex } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const COMPARE = "CALC.CONFRONTO_NUMERI";
const SIGN = "DISEQ.VERSO_NON_INVERTITO";
const LCM = "ALG.MCD_MCM";

/** Una frazione come è scritta: p/q con q > 0, oppure con il meno al denominatore (`negDen`, p < 0). */
interface Frac {
  readonly p: number;
  readonly q: number;
  readonly negDen: boolean;
}

type Trap = { readonly f: Frac; readonly error: typeof COMPARE | typeof SIGN };

type Model =
  | { readonly kind: "compare"; readonly ask: "max" | "min"; readonly correct: Frac; readonly traps: readonly Trap[]; readonly order: readonly number[] }
  | { readonly kind: "lcd"; readonly fracs: readonly Frac[] };

const fr = (p: number, q: number, negDen = false): Frac => ({ p, q, negDen });
const valueOf = (f: Frac): Rational => Rational.of(f.p, f.q);
/** La frazione ridotta ai minimi termini, con il denominatore positivo. */
const reduced = (f: Frac): Frac => {
  const g = gcd(Math.abs(f.p), f.q);
  return fr(f.p / g, f.q / g);
};
const isReduced = (f: Frac): boolean => gcd(Math.abs(f.p), f.q) === 1 && !f.negDen;

// ───────────────────────────── costruzione ─────────────────────────────

/** Una frazione irriducibile positiva con denominatore dalla lista, minore di 1 se `proper`. */
function drawFrac(rng: Rng_, dens: readonly number[], proper = true): Frac {
  for (;;) {
    const q = rng.pick(dens);
    const p = rng.int(1, proper ? q - 1 : 2 * q);
    if (gcd(p, q) === 1) return fr(p, q);
  }
}

const DENS1 = [3, 4, 5, 6, 7, 8, 9, 10, 12] as const;
const DENS2 = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20] as const;

/** Il minimo comune denominatore delle frazioni ridotte. */
const lcdOf = (fs: readonly Frac[]): number => fs.map((f) => reduced(f).q).reduce((a, b) => lcm(a, b), 1);

/**
 * Prova a costruire le trappole: ogni trappola è un predicato su una candidata (già scritta come va
 * mostrata). Null se dopo molti tentativi non ci riesce.
 */
function drawTraps(rng: Rng_, correct: Frac, kinds: readonly { error: Trap["error"]; draw: () => Frac; ok: (f: Frac) => boolean }[], maxLcd: number): Trap[] | null {
  const traps: Trap[] = [];
  for (const kind of kinds) {
    let found: Frac | null = null;
    for (let attempt = 0; attempt < 60 && found === null; attempt++) {
      const f = kind.draw();
      const v = valueOf(f);
      if (v.eq(valueOf(correct))) continue;
      if (traps.some((t) => valueOf(t.f).eq(v))) continue;
      if (!kind.ok(f)) continue;
      if (lcdOf([correct, ...traps.map((t) => t.f), f]) > maxLcd) continue;
      found = f;
    }
    if (found === null) return null;
    traps.push({ f: found, error: kind.error });
  }
  return traps;
}

/** Una frazione non ridotta: la ridotta moltiplicata per k. */
const scaled = (f: Frac, k: number, negDen = false): Frac => fr(f.p * k, f.q * k, negDen);

function buildCompare(level: Level, rng: Rng_): Model | null {
  const lt = (a: Frac, b: Frac): boolean => valueOf(a).cmp(valueOf(b)) < 0;
  if (level === 1 || level === 2) {
    const dens = level === 1 ? DENS1 : DENS2;
    const correct = drawFrac(rng, dens);
    const traps = drawTraps(
      rng,
      correct,
      [
        // Numeratore più grande, valore più piccolo.
        { error: COMPARE, draw: () => drawFrac(rng, dens), ok: (f) => lt(f, correct) && f.p > correct.p },
        // Denominatore più piccolo, valore più piccolo.
        { error: COMPARE, draw: () => drawFrac(rng, dens), ok: (f) => lt(f, correct) && f.q < correct.q },
        level === 1
          ? { error: COMPARE, draw: () => drawFrac(rng, dens), ok: (f) => lt(f, correct) && (f.p > correct.p || f.q < correct.q) }
          : // Non ridotta, con numeri più grandi di quelli della giusta.
            { error: COMPARE, draw: () => scaled(drawFrac(rng, [3, 4, 5, 6, 7, 8, 9, 10]), rng.int(2, 6)), ok: (f) => lt(f, correct) && f.p > correct.p && f.q > correct.q && f.p < 100 },
      ],
      level === 1 ? 72 : 120,
    );
    if (traps === null) return null;
    return { kind: "compare", ask: "max", correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
  }
  // Livello 3: frazioni negative.
  const ask = rng.pick(["max", "min"] as const);
  const negative = (f: Frac): Frac => fr(-f.p, f.q);
  const correct = negative(drawFrac(rng, DENS2));
  const abs = (f: Frac): Rational => valueOf(f).abs();
  const traps =
    ask === "max"
      ? // La maggiore è la più vicina allo 0.
        drawTraps(
          rng,
          correct,
          [
            // Chi confronta senza segno sceglie la più lontana dallo 0.
            { error: SIGN, draw: () => negative(drawFrac(rng, DENS2)), ok: (f) => abs(f).cmp(abs(correct)) > 0 && abs(f).cmp(Rational.of(1, 2)) > 0 },
            // Numeratore (con il segno) maggiore ma valore minore: −1/3 contro −2/9, «perché −1 > −2».
            { error: COMPARE, draw: () => negative(drawFrac(rng, DENS2)), ok: (f) => lt(f, correct) && f.p > correct.p },
            // Non ridotta, con il meno al denominatore.
            { error: COMPARE, draw: () => scaled(negative(drawFrac(rng, [3, 4, 5, 6, 7, 8, 9, 10])), rng.int(2, 6), true), ok: (f) => lt(f, correct) && Math.abs(f.p) < 100 },
          ],
          120,
        )
      : // La minore è la più lontana dallo 0.
        drawTraps(
          rng,
          correct,
          [
            // Chi confronta senza segno sceglie la più vicina allo 0.
            { error: SIGN, draw: () => negative(drawFrac(rng, DENS2)), ok: (f) => abs(f).cmp(abs(correct)) < 0 && abs(f).cmp(Rational.of(1, 2)) < 0 },
            // Numeratore più lontano dallo 0, ma valore più vicino.
            { error: COMPARE, draw: () => negative(drawFrac(rng, DENS2)), ok: (f) => lt(correct, f) && Math.abs(f.p) > Math.abs(correct.p) },
            // Non ridotta, con il meno al denominatore e numeri grandi.
            { error: COMPARE, draw: () => scaled(negative(drawFrac(rng, [3, 4, 5, 6, 7, 8, 9, 10])), rng.int(2, 6), true), ok: (f) => lt(correct, f) && Math.abs(f.p) > Math.abs(correct.p) && Math.abs(f.p) < 100 },
          ],
          120,
        );
  if (traps === null) return null;
  // Il segno trappola deve essere davvero quello estremo «senza segno».
  const sign = traps.find((t) => t.error === SIGN);
  if (sign !== undefined) {
    const others = [correct, ...traps.map((t) => t.f)].filter((f) => f !== sign.f);
    const extreme = ask === "max" ? others.every((f) => abs(f).cmp(abs(sign.f)) < 0) : others.every((f) => abs(sign.f).cmp(abs(f)) < 0);
    if (!extreme) return null;
  }
  return { kind: "compare", ask, correct, traps, order: rng.shuffle([0, 1, 2, 3]) };
}

function buildLcd(rng: Rng_): Model | null {
  const a = drawFrac(rng, DENS1);
  const b = drawFrac(rng, DENS1);
  const g = gcd(a.q, b.q);
  // Servono MCD > 1 e denominatori diversi: altrimenti MCD, mcm e prodotto coincidono in parte.
  if (g === 1 || a.q === b.q) return null;
  return { kind: "lcd", fracs: [a, b] };
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 && rng.bool(0.3) ? buildLcd(rng) : buildCompare(level, rng);
    if (model !== null) return model;
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** LaTeX di una frazione come è scritta: −3/4, oppure 126/(−168). */
function fracLatex(f: Frac): string {
  if (f.negDen) return `\\dfrac{${-f.p}}{-${f.q}}`;
  return f.p < 0 ? `-\\dfrac{${-f.p}}{${f.q}}` : `\\dfrac{${f.p}}{${f.q}}`;
}
const fracText = (f: Frac): string => `$${fracLatex(f)}$`;
const listOf = (items: readonly string[]): string => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

/** Il passo dei minimi termini. */
function reductionStep(fs: readonly Frac[]): string {
  const changes = fs.filter((f) => !isReduced(f));
  if (changes.length === 0) return "Le frazioni sono già irriducibili, con il denominatore positivo.";
  const parts = changes.map((f) => {
    const r = reduced(f);
    const g = gcd(Math.abs(f.p), f.q);
    const how = g > 1 ? ` (dividendo per $${g}$${f.negDen ? " e portando il meno davanti" : ""})` : " (portando il meno davanti)";
    return `$${fracLatex(f)} = ${fracLatex(r)}$${how}`;
  });
  return `${parts.join("; ")}. Le altre sono già irriducibili.`;
}

/** Il passo del mcm, con le scomposizioni. */
function lcmStep(dens: readonly number[]): string {
  const unique = [...new Set(dens)];
  const m = unique.reduce((a, b) => lcm(a, b), 1);
  const facts = unique.map((d) => (isPrime(d) ? `$${d}$ è primo` : `$${d} = ${powersLatex(factorize(d))}$`));
  return `I denominatori sono ${listOf(unique.map((d) => `$${d}$`))}: ${listOf(facts)}. Il mcm prende tutti i fattori con l'esponente maggiore: $${powersLatex(factorize(m))} = ${m}$.`;
}

function draftCompare(model: Extract<Model, { kind: "compare" }>): ExerciseDraft {
  const shown = [model.correct, ...model.traps.map((t) => t.f)];
  const ordered = model.order.map((i) => shown[i] ?? model.correct);
  const rs = ordered.map(reduced);
  const m = lcdOf(ordered);
  const rewritten = rs.map((r) => `$${fracLatex(r)} = ${r.p < 0 ? "-" : ""}\\dfrac{${(Math.abs(r.p) * m) / r.q}}{${m}}$`);
  const sorted = [...rs].sort((x, y) => (valueOf(x).cmp(valueOf(y)) < 0 ? -1 : 1));
  const chainNum = sorted.map((r) => String((r.p * m) / r.q)).join(" < ");
  const chain = sorted.map((r) => fracLatex(r)).join(" < ");
  const word = model.ask === "max" ? "maggiore" : "minore";
  const answer = reduced(model.correct);
  return {
    prompt: `Quale di queste frazioni è la ${word}? ${listOf(ordered.map(fracText))}.`,
    answer: {
      kind: "choice",
      correct: fracText(model.correct),
      wrong: model.traps.map((t) => ({ error: t.error, value: fracText(t.f) })),
    },
    steps: [
      { text: `**Passo 1. Minimi termini.** ${reductionStep(ordered)}` },
      { text: `**Passo 2. Minimo comune denominatore.** ${lcmStep(rs.map((r) => r.q))}` },
      { text: `**Passo 3. Riscrivi.** ${rewritten.join(", ")}.` },
      {
        text:
          `**Passo 4. Confronta i numeratori**, con il loro segno: $${chainNum}$, quindi $${chain}$. ` +
          `La ${word} è $${fracLatex(answer)}$${isReduced(model.correct) ? "" : `, cioè $${fracLatex(model.correct)}$`}.`,
      },
    ],
    hints: [
      "Con denominatori diversi non si confrontano né i numeratori né i denominatori: serve lo stesso denominatore.",
      "Riduci ogni frazione ai minimi termini con il meno davanti, poi riscrivile tutte con il minimo comune denominatore e confronta i numeratori con il segno.",
    ],
  };
}

function draftLcd(model: Extract<Model, { kind: "lcd" }>): ExerciseDraft {
  const [a, b] = model.fracs as [Frac, Frac];
  const m = lcm(a.q, b.q);
  const g = gcd(a.q, b.q);
  return {
    prompt: `Qual è il minimo comune denominatore delle frazioni $${fracLatex(a)}$ e $${fracLatex(b)}$?`,
    answer: {
      kind: "number",
      correct: num(m),
      wrong: distinctWrongExpressions(num(m), [
        { error: LCM, value: num(g) },
        { error: LCM, value: num(a.q * b.q) },
      ]),
      mode: exact,
    },
    steps: [
      { text: `**Passo 1.** Le frazioni sono irriducibili, con il denominatore positivo: il minimo comune denominatore è il mcm dei denominatori.` },
      { text: `**Passo 2.** ${lcmStep([a.q, b.q])}` },
      {
        text: `**Passo 3.** Controllo: $${m} : ${a.q} = ${m / a.q}$ e $${m} : ${b.q} = ${m / b.q}$, quindi $${fracLatex(a)} = \\dfrac{${(a.p * m) / a.q}}{${m}}$ e $${fracLatex(b)} = \\dfrac{${(b.p * m) / b.q}}{${m}}$. Il prodotto $${a.q} \\cdot ${b.q} = ${a.q * b.q}$ è un denominatore comune, ma non il minimo.`,
      },
    ],
    hints: [
      "Il minimo comune denominatore di frazioni irriducibili è il mcm dei denominatori, non il loro MCD.",
      "Scomponi i denominatori in fattori primi e prendi tutti i fattori, ciascuno con l'esponente maggiore.",
    ],
  };
}

const draftOf = (model: Model): ExerciseDraft => (model.kind === "compare" ? draftCompare(model) : draftLcd(model));

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  if (model.kind === "lcd") {
    if (exercise.answer.kind !== "number" || exercise.answer.correct.kind !== "num") return false;
    const answer = Number(exercise.answer.correct.value.toString());
    const dens = model.fracs.map((f) => reduced(f).q);
    if (!dens.every((d) => answer % d === 0)) return false;
    for (let k = 1; k < answer; k++) if (dens.every((d) => k % d === 0)) return false;
    return true;
  }
  if (exercise.answer.kind !== "choice") return false;
  const all = [model.correct, ...model.traps.map((t) => t.f)];
  const best = valueOf(model.correct);
  for (const f of model.traps.map((t) => t.f)) {
    const v = valueOf(f);
    if (model.ask === "max" ? v.cmp(best) >= 0 : v.cmp(best) <= 0) return false;
  }
  // Ogni frazione mostrata compare nel testo.
  return all.every((f) => exercise.prompt.includes(fracText(f))) && exercise.answer.correct === fracText(model.correct);
}

export default defineGenerator({
  code: "V1.M03.A02.g1",
  skill: "V1.M03.A02",
  lesson: "V1.M03.L02",
  title: "Minimi termini e confronto tra frazioni",
  levels: [1, 2, 3],
  errors: [COMPARE, SIGN, LCM],
  limits: { maxInteger: 150, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
