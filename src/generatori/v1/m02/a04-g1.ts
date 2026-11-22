// V1.M02.A04.g1 — MCD e mcm, anche nei problemi.
//
// Risposta: un numero naturale. All'indietro: si sceglie prima il MCD g e due (o tre) cofattori senza
// divisori comuni, i numeri sono g per i cofattori; così il MCD è g per costruzione e il mcm è g per il
// prodotto dei cofattori (con due numeri). Le risposte sbagliate applicano male le regole sulle
// scomposizioni (ALG.MCD_MCM, la voce che descrive le due regole):
// - le regole scambiate: il mcm al posto del MCD e viceversa;
// - i soli primi comuni con l'esponente maggiore;
// - tutti i primi, comuni e non comuni, con l'esponente minore.
// Nei problemi la scelta sbagliata dello strumento (MCD dove serve il mcm) è lo stesso errore.
//
// Livello 1: MCD o mcm di due numeri fino a 150.
// Livello 2: MCD o mcm di due numeri fino a 1000, oppure un problema (pezzi uguali più lunghi possibile,
//   mazzi uguali più numerosi possibile: MCD; quando capitano di nuovo insieme: mcm).
// Livello 3: MCD o mcm di tre numeri.
//
// Verifica: MCD e mcm ricalcolati dai numeri del testo con l'algoritmo di Euclide (mcm = a · b / MCD).

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { num } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { factorize, gcd, lcm, powersLatex, productOf, type PrimePower } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const RULES = "ALG.MCD_MCM";

type Problem = "strips" | "bunches" | "buses" | "gym";

interface Model {
  readonly numbers: readonly number[];
  readonly want: "gcd" | "lcm";
  /** Il problema, se l'esercizio è un problema. */
  readonly problem: Problem | null;
}

// ───────────────────────────── regole sulle scomposizioni ─────────────────────────────

/** Esponente di p in ogni numero (0 se non compare). */
function exponents(numbers: readonly number[]): Map<number, number[]> {
  const table = new Map<number, number[]>();
  numbers.forEach((n, i) => {
    for (const [p, e] of factorize(n)) {
      const row = table.get(p) ?? numbers.map(() => 0);
      row[i] = e;
      table.set(p, row);
    }
  });
  return new Map([...table.entries()].sort((x, y) => x[0] - y[0]));
}

/** Primi scelti con un criterio e un esponente: la regola giusta o una sbagliata. */
function byRule(numbers: readonly number[], which: "common" | "all", exp: "min" | "max"): PrimePower[] {
  const out: PrimePower[] = [];
  for (const [p, row] of exponents(numbers)) {
    const present = row.filter((e) => e > 0);
    if (which === "common" && present.length < numbers.length) continue;
    const e = exp === "min" ? Math.min(...present) : Math.max(...present);
    out.push([p, e]);
  }
  return out;
}

const rightRule = (want: "gcd" | "lcm"): ["common" | "all", "min" | "max"] => (want === "gcd" ? ["common", "min"] : ["all", "max"]);

function candidates(model: Model): number[] {
  const { numbers, want } = model;
  const other = want === "gcd" ? "lcm" : "gcd";
  return [
    productOf(byRule(numbers, ...rightRule(other))),
    productOf(byRule(numbers, "common", "max")),
    productOf(byRule(numbers, "all", "min")),
  ];
}

const answerOf = (model: Model): number => productOf(byRule(model.numbers, ...rightRule(model.want)));

// ───────────────────────────── costruzione ─────────────────────────────

/** Cofattori a due a due senza divisori comuni, e g: i numeri sono g · cofattore. */
function drawNumbers(rng: Rng_, count: 2 | 3, gs: readonly number[], coMax: number, max: number): number[] {
  for (;;) {
    const g = rng.pick(gs);
    const co = Array.from({ length: count }, () => rng.int(2, coMax));
    const coprime = co.every((x, i) => co.every((y, j) => i >= j || gcd(x, y) === 1));
    const numbers = co.map((c) => g * c).sort((a, b) => a - b);
    if (!coprime || numbers.some((n) => n > max) || new Set(numbers).size < count) continue;
    // Serve almeno un primo con esponenti diversi nei numeri, perché le regole sbagliate diano altro.
    return numbers;
  }
}

function enoughWrong(model: Model, need: number): boolean {
  const right = answerOf(model);
  const values = candidates(model).filter((v) => v !== right);
  return new Set(values).size >= need && Math.max(...values) <= 50_000;
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    let model: Model;
    switch (level) {
      case 1:
        model = { numbers: drawNumbers(rng, 2, [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18], 9, 150), want: rng.pick(["gcd", "lcm"] as const), problem: null };
        break;
      case 2: {
        const form = rng.pick(["gcd", "lcm", "gcd", "lcm", "problem", "problem"] as const);
        if (form === "problem") {
          const problem = rng.pick(["strips", "bunches", "buses", "gym"] as const);
          const want = problem === "strips" || problem === "bunches" ? "gcd" : "lcm";
          const numbers = want === "gcd" ? drawNumbers(rng, 2, [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24], 9, 240) : drawNumbers(rng, 2, [2, 3, 4, 5, 6, 8, 10, 12], 7, 60);
          model = { numbers, want, problem };
        } else {
          model = { numbers: drawNumbers(rng, 2, [6, 8, 12, 14, 15, 18, 20, 21, 24, 28, 30, 36], 25, 1000), want: form, problem: null };
        }
        break;
      }
      case 3:
        model = { numbers: drawNumbers(rng, 3, [2, 3, 4, 6, 8, 9, 12], 11, 400), want: rng.pick(["gcd", "lcm"] as const), problem: null };
        break;
    }
    if (enoughWrong(model, level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const name = (want: "gcd" | "lcm"): string => (want === "gcd" ? "\\mathrm{MCD}" : "\\mathrm{mcm}");

function problemText(problem: Problem, [a, b]: readonly number[]): string {
  switch (problem) {
    case "strips":
      return `Due strisce di stoffa lunghe $${a}$ cm e $${b}$ cm vanno tagliate in pezzi tutti uguali, i più lunghi possibile, senza avanzi. Quanto è lungo ogni pezzo, in centimetri?`;
    case "bunches":
      return `Un fioraio ha $${a}$ rose e $${b}$ tulipani. Vuole fare dei mazzi tutti uguali (stesso numero di rose e stesso numero di tulipani in ogni mazzo), il maggior numero possibile, usando tutti i fiori. Quanti mazzi fa?`;
    case "buses":
      return `Due autobus partono insieme dal capolinea. Il primo ci ripassa ogni $${a}$ minuti, il secondo ogni $${b}$ minuti. Dopo quanti minuti ripartono di nuovo insieme, per la prima volta?`;
    case "gym":
      return `Luca va in palestra ogni $${a}$ giorni, Marta ogni $${b}$ giorni. Oggi ci sono andati tutti e due. Fra quanti giorni ci andranno di nuovo insieme, per la prima volta?`;
  }
}

/** «2^{2} \cdot 3 = 12», oppure solo «3» se la scomposizione è già il numero. */
const equalsValue = (powers: readonly PrimePower[], value: number): string => (powersLatex(powers) === String(value) ? String(value) : `${powersLatex(powers)} = ${value}`);

function draftOf(model: Model): ExerciseDraft {
  const { numbers, want, problem } = model;
  const correct = answerOf(model);
  const list = numbers.join(", ");
  const prompt = problem
    ? `${problemText(problem, numbers)} Rispondi con un numero naturale.`
    : `Calcola $${name(want)}(${list})$. Rispondi con un numero naturale.`;
  const rule = rightRule(want);
  const steps: { text: string }[] = [];
  if (problem) {
    steps.push({
      text:
        want === "gcd"
          ? `**Passo 1.** Si cerca il numero più grande che divide sia $${numbers[0]}$ sia $${numbers[1]}$: è il MCD.`
          : `**Passo 1.** Si cerca il primo numero, diverso da $0$, multiplo sia di $${numbers[0]}$ sia di $${numbers[1]}$: è il mcm.`,
    });
  }
  const offset = steps.length;
  steps.push({ text: `**Passo ${offset + 1}.** Le scomposizioni: ${numbers.map((n) => `$${n} = ${powersLatex(factorize(n))}$`).join(", ")}.` });
  const chosen = byRule(numbers, ...rule);
  steps.push({
    text:
      want === "gcd"
        ? `**Passo ${offset + 2}.** MCD: i primi comuni a tutti i numeri, ciascuno con l'esponente minore: $${equalsValue(chosen, correct)}$.`
        : `**Passo ${offset + 2}.** mcm: tutti i primi, comuni e non comuni, ciascuno con l'esponente maggiore: $${equalsValue(chosen, correct)}$.`,
  });
  if (numbers.length === 2) {
    const [a, b] = numbers as [number, number];
    const other = want === "gcd" ? lcm(a, b) : gcd(a, b);
    steps.push({ text: `Controllo: $\\mathrm{MCD} \\cdot \\mathrm{mcm} = ${want === "gcd" ? `${correct} \\cdot ${other}` : `${other} \\cdot ${correct}`} = ${correct * other}$, e anche $${a} \\cdot ${b} = ${a * b}$.` });
  }
  if (problem === "bunches") {
    const [a, b] = numbers as [number, number];
    steps.push({ text: `In ogni mazzo ci sono $${a / correct}$ rose e $${b / correct}$ tulipani.` });
  }
  if (problem === "strips") {
    const [a, b] = numbers as [number, number];
    steps.push({ text: `I pezzi sono $${a / correct} + ${b / correct} = ${(a + b) / correct}$.` });
  }
  return {
    prompt,
    answer: {
      kind: "number",
      correct: num(correct),
      wrong: distinctWrongExpressions(
        num(correct),
        candidates(model).map((v) => ({ error: RULES, value: num(v) })),
      ),
      mode: exact,
    },
    steps,
    hints: [
      problem
        ? "Il problema chiede un numero che divide tutti e due i dati (MCD) o un numero che è multiplo di tutti e due (mcm)? Prova a dirlo a parole."
        : "Il MCD divide tutti i numeri, quindi non supera il più piccolo; il mcm è multiplo di tutti, quindi non è minore del più grande.",
      "Scomponi i numeri in fattori primi. MCD: solo i primi comuni, con l'esponente minore. mcm: tutti i primi, con l'esponente maggiore.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (answer.kind !== "number" || answer.correct.kind !== "num") return false;
  // I numeri del testo, nell'ordine in cui compaiono.
  const shown = [...exercise.prompt.matchAll(/\$(?:\\mathrm\{(?:MCD|mcm)\}\()?([\d, ]+)\)?\$/g)].flatMap((m) => (m[1] ?? "").split(",").map((t) => Number(t.trim())));
  if (shown.length !== model.numbers.length || shown.some((n, i) => n !== model.numbers[i])) return false;
  const expected = model.want === "gcd" ? shown.reduce(gcd) : shown.reduce(lcm);
  return answer.correct.value.eq(expected);
}

export default defineGenerator({
  code: "V1.M02.A04.g1",
  skill: "V1.M02.A04",
  lesson: "V1.M02.L03",
  title: "MCD e mcm",
  levels: [1, 2, 3],
  errors: [RULES],
  limits: { maxInteger: 50_000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
