// V1.M02.A09.g1 — Cambi di base: da una base qualsiasi alla base 10, dalla base 10 a una base b, tra
// due basi diverse da 10.
//
// All'indietro: si sceglie prima il numero n (in base 10), poi lo si scrive nelle basi del testo.
// - Da base b a base 10: risposta numero. Le sbagliate (CALC.CAMBIO_BASE) rifanno la somma con un
//   errore: cifre lette al contrario, posizioni contate con il 10 al posto di b, posizioni contate da 1
//   invece che da 0, somma delle cifre.
// - Dalla base 10 (o da un'altra base) a una base b: scelta multipla, perché la risposta è una
//   scrittura in base b (con le lettere dopo il 9), non un numero del motore. Le sbagliate
//   (CALC.CAMBIO_BASE): resti letti dal primo all'ultimo, l'ultimo resto (la cifra più a sinistra)
//   dimenticato, le cifre di partenza copiate con la base nuova (senza convertire).
//
// Livello 1: da base 2 o 8 a base 10 (numeri fino a 63 e 255); da 10 a base 2 (fino a 63).
// Livello 2: basi 2, 5, 8, 16, numeri fino a 255, nei due versi.
// Livello 3: tra due basi diverse da 10 (passando dalla base 10), e tra 2, 8, 16 a gruppi di cifre.
//
// Verifica: ogni scrittura del testo e delle opzioni si rilegge con parseInt(cifre, base), che non usa
// le funzioni di conversione del generatore.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import { num } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const BASE = "CALC.CAMBIO_BASE";

interface Model {
  readonly n: number;
  /** Base di partenza (10 se il numero è dato in base 10) e base di arrivo (10 se si chiede la base 10). */
  readonly from: number;
  readonly to: number;
}

// ───────────────────────────── cifre ─────────────────────────────

const DIGITS = "0123456789ABCDEF";

/** Le cifre di n in base b, dalla più significativa. */
function digitsOf(n: number, b: number): number[] {
  if (n === 0) return [0];
  const out: number[] = [];
  let rest = n;
  while (rest > 0) {
    out.unshift(rest % b);
    rest = Math.floor(rest / b);
  }
  return out;
}

const digitText = (digits: readonly number[]): string => digits.map((d) => DIGITS[d] ?? "?").join("");

/** «2\mathrm{F}_{16}»; in base 10 senza indice. */
function writtenLatex(digits: readonly number[], b: number): string {
  const body = digits.map((d) => (d >= 10 ? `\\mathrm{${DIGITS[d]}}` : String(d))).join("");
  return b === 10 ? body : `${body}_{${b}}`;
}

/** Il valore di cifre lette in base b (può servire anche per scritture sbagliate). */
const valueIn = (digits: readonly number[], b: number): number => digits.reduce((v, d) => v * b + d, 0);

// ───────────────────────────── costruzione ─────────────────────────────

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = draw(level, rng);
    if (wrongCount(model) >= (level === 1 && model.to === 10 ? 2 : 3)) return model;
  }
}

function draw(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1: {
      const form = rng.pick(["2to10", "8to10", "10to2"] as const);
      if (form === "2to10") return { n: rng.int(9, 63), from: 2, to: 10 };
      if (form === "8to10") return { n: rng.int(65, 255), from: 8, to: 10 };
      return { n: rng.int(9, 63), from: 10, to: 2 };
    }
    case 2: {
      const b = rng.pick([2, 5, 8, 16, 16] as const);
      const n = b === 2 ? rng.int(33, 127) : b === 16 ? rng.int(17, 255) : rng.int(b * b + 1, 255);
      return rng.bool() ? { n, from: b, to: 10 } : { n, from: 10, to: b };
    }
    case 3: {
      const form = rng.pick(["any", "any", "groups"] as const);
      if (form === "groups") {
        const pair = rng.pick([
          [2, 16],
          [16, 2],
          [2, 8],
          [8, 2],
        ] as const);
        return { n: rng.int(65, 255), from: pair[0], to: pair[1] };
      }
      const [from, to] = rng.sample([3, 4, 5, 6, 7, 8] as const, 2) as [number, number];
      return { n: rng.int(from * from + 1, 200), from, to };
    }
  }
}

// ───────────────────────────── risposte sbagliate ─────────────────────────────

/** Da base b a base 10: valori sbagliati. */
function wrongValues(model: Model): number[] {
  const d = digitsOf(model.n, model.from);
  return [
    valueIn([...d].reverse(), model.from),
    valueIn(d, 10),
    valueIn([...d, 0], model.from),
    d.reduce((s, x) => s + x, 0),
  ];
}

/** Verso una base b: scritture sbagliate (cifre). */
function wrongWritings(model: Model): number[][] {
  const right = digitsOf(model.n, model.to);
  const source = digitsOf(model.n, model.from);
  const out: number[][] = [[...right].reverse(), right.slice(1)];
  // Le cifre di partenza copiate con la base nuova, solo se sono cifre ammesse nella base nuova o se
  // il numero è dato in base 10 (allora l'errore è proprio scrivere cifre non ammesse).
  out.push(source);
  return out.filter((w) => w.length > 0 && w[0] !== 0);
}

function wrongCount(model: Model): number {
  if (model.to === 10) {
    const values = new Set(wrongValues(model).filter((v) => v !== model.n));
    return values.size;
  }
  const right = digitText(digitsOf(model.n, model.to));
  return new Set(wrongWritings(model).map(digitText).filter((t) => t !== right)).size;
}

// ───────────────────────────── testo ─────────────────────────────

/** I passaggi da base b a base 10: la somma per le potenze. */
function toTenSteps(n: number, b: number, first: number): { text: string }[] {
  const d = digitsOf(n, b);
  const k = d.length;
  const terms = d.map((x, i) => `${x} \\cdot ${b}^{${k - 1 - i}}`).join(" + ");
  const values = d.map((x, i) => String(x * b ** (k - 1 - i))).join(" + ");
  const letters = d.filter((x) => x >= 10).map((x) => `$\\mathrm{${DIGITS[x]}} = ${x}$`);
  return [
    { text: `**Passo ${first}.** ${letters.length > 0 ? `Le lettere: ${[...new Set(letters)].join(", ")}. ` : ""}Da destra le posizioni valgono ${d.map((_, i) => `$${b ** i}$`).join(", ")}.` },
    { text: `**Passo ${first + 1}.** $${writtenLatex(d, b)} = ${terms} = ${values} = ${n}$.` },
  ];
}

/** I passaggi da base 10 a base b: divisioni successive. */
function fromTenSteps(n: number, b: number, first: number): { text: string }[] {
  const lines: string[] = [];
  let q = n;
  const rests: number[] = [];
  while (q > 0) {
    const next = Math.floor(q / b);
    lines.push(`$${q} = ${b} \\cdot ${next} + ${q % b}$`);
    rests.push(q % b);
    q = next;
  }
  const right = digitsOf(n, b);
  const letters = rests.filter((r) => r >= 10).map((r) => `$${r} = \\mathrm{${DIGITS[r]}}$`);
  return [
    { text: `**Passo ${first}.** Divisioni successive per $${b}$: ${lines.join(", ")}.` },
    { text: `**Passo ${first + 1}.** I resti, dall'ultimo al primo: $${[...rests].reverse().join(",\\ ")}$${letters.length > 0 ? ` (${[...new Set(letters)].join(", ")})` : ""}. Quindi $${n} = ${writtenLatex(right, b)}$.` },
  ];
}

function draftOf(model: Model): ExerciseDraft {
  const { n, from, to } = model;
  const source = writtenLatex(digitsOf(n, from), from);
  if (to === 10) {
    const wrong: ExpectedWrong<ReturnType<typeof num>>[] = wrongValues(model).map((v) => ({ error: BASE, value: num(v) }));
    return {
      prompt: `Quanto vale $${source}$ in base $10$? Rispondi con un numero naturale.`,
      answer: { kind: "number", correct: num(n), wrong: distinctWrongExpressions(num(n), wrong), mode: exact },
      steps: toTenSteps(n, from, 1),
      hints: [
        "Ogni cifra va moltiplicata per la potenza della base che corrisponde al suo posto, contando da destra a partire da $0$.",
        `Le posizioni, da destra, valgono $1$, $${from}$, $${from * from}$, …`,
      ],
    };
  }
  const right = digitsOf(n, to);
  const correct = `$${writtenLatex(right, to)}$`;
  const seen = new Set([digitText(right)]);
  const wrong: ExpectedWrong<string>[] = [];
  for (const w of wrongWritings(model)) {
    const key = digitText(w);
    if (seen.has(key)) continue;
    seen.add(key);
    wrong.push({ error: BASE, value: `$${writtenLatex(w, to)}$` });
  }
  const grouping = (from === 2 && (to === 8 || to === 16)) || (to === 2 && (from === 8 || from === 16));
  const steps =
    from === 10
      ? [...fromTenSteps(n, to, 1), { text: `**Passo 3.** Controllo: ${toTenSteps(n, to, 0)[1]?.text.replace("**Passo 1.** ", "") ?? ""}` }]
      : grouping
        ? groupSteps(n, from, to)
        : [...toTenSteps(n, from, 1), ...fromTenSteps(n, to, 3)];
  return {
    prompt: `Come si scrive $${source}$ in base $${to}$?`,
    answer: { kind: "choice", correct, wrong },
    steps,
    hints: [
      from === 10 ? `Dividi per $${to}$ finché il quoziente diventa $0$, annotando i resti.` : grouping ? `$${Math.max(from, to)} = 2^{${Math.log2(Math.max(from, to))}}$: puoi convertire a gruppi di cifre.` : "Passa dalla base $10$: prima calcola il valore, poi fai le divisioni.",
      "Il primo resto è la cifra delle unità: i resti si leggono dall'ultimo al primo.",
    ],
  };
}

/** Tra 2 e 8 o 16: gruppi di tre o quattro cifre binarie. */
function groupSteps(n: number, from: number, to: number): { text: string }[] {
  const big = Math.max(from, to);
  const size = Math.log2(big);
  const big_digits = digitsOf(n, big);
  const groups = big_digits.map((d, i) => {
    const bits = digitsOf(d, 2);
    const padded = i === 0 ? bits : [...Array(size - bits.length).fill(0), ...bits];
    return `\\underbrace{${padded.join("")}}_{${d >= 10 ? `\\mathrm{${DIGITS[d]}}` : d}}`;
  });
  return [
    { text: `**Passo 1.** $${big} = 2^{${size}}$: ogni cifra in base $${big}$ corrisponde a ${size === 3 ? "tre" : "quattro"} cifre binarie. ${from === 2 ? "Si divide il numero binario in gruppi da destra." : "Si scrive ogni cifra con le sue cifre binarie."}` },
    { text: `**Passo 2.** $${from === 2 ? writtenLatex(digitsOf(n, 2), 2) : writtenLatex(big_digits, big)} = ${groups.join("\\ ")}$.` },
    { text: `**Passo 3.** Quindi $${writtenLatex(digitsOf(n, from), from)} = ${writtenLatex(digitsOf(n, to), to)}$. Controllo: tutti e due valgono $${n}$.` },
  ];
}

// ───────────────────────────── verifica ─────────────────────────────

/** Cifre e base lette da una scrittura LaTeX: «2\mathrm{F}_{16}». */
function readWritten(text: string): { digits: string; base: number } | null {
  const m = /^\$?((?:\d|\\mathrm\{[A-F]\})+)_\{(\d+)\}\$?$/.exec(text.trim());
  if (!m || !m[1] || !m[2]) return null;
  return { digits: m[1].replace(/\\mathrm\{([A-F])\}/g, "$1"), base: Number(m[2]) };
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  const shown = /\$([^$]+)\$/.exec(exercise.prompt)?.[1] ?? "";
  const source = model.from === 10 ? { digits: shown, base: 10 } : readWritten(shown);
  if (!source) return false;
  const value = parseInt(source.digits, source.base);
  if (answer.kind === "number") return answer.correct.kind === "num" && answer.correct.value.eq(value);
  if (answer.kind !== "choice") return false;
  const right = readWritten(answer.correct);
  if (!right || right.base !== model.to || parseInt(right.digits, right.base) !== value) return false;
  return answer.wrong.every((w) => {
    const r = readWritten(w.value);
    // Una scrittura sbagliata vale un altro numero, oppure usa cifre che la base non ammette.
    return r !== null && (parseInt(r.digits, r.base) !== value || [...r.digits].some((c) => DIGITS.indexOf(c) >= r.base));
  });
}

export default defineGenerator({
  code: "V1.M02.A09.g1",
  skill: "V1.M02.A09",
  lesson: "V1.M02.L08",
  title: "Cambi di base",
  levels: [1, 2, 3],
  errors: [BASE],
  limits: { maxInteger: 100_000_000, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
