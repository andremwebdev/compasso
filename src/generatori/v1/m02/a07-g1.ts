// V1.M02.A07.g1 — Riconoscere numeri razionali e irrazionali.
//
// Scelta multipla scritta a mano: «Quale di questi numeri è irrazionale?» oppure «… è razionale?».
// All'indietro: si sceglie prima il tipo della risposta giusta, poi tre numeri dell'altro tipo. I numeri
// sono oggetti con una classe esatta (radice di un naturale, radice di una frazione, periodico,
// frazione, decimale limitato, π, razionale più radice, decimale illimitato con una regola non
// periodica). Le opzioni sbagliate sono quelle che confondono le due classi (CALC.RAZIONALE_IRRAZIONALE):
// - prese per irrazionali: un periodico (infinite cifre, ma si ripetono), la radice di un quadrato
//   (√49 = 7, √(9/4) = 3/2), le approssimazioni di π e di √2 (3,14; 22/7; 1,4142);
// - prese per razionali: una radice di un non quadrato, π, un razionale più una radice.
//
// Livello 1: «irrazionale?»; la giusta è √n o π, le sbagliate un periodico, una radice di un quadrato
//   perfetto, una frazione.
// Livello 2: le due domande; tra le opzioni anche 22/7, 3,14, 1,4142 e le radici di frazioni.
// Livello 3: anche 1 + √2 (irrazionale), 0,1010010001… (cifre senza periodo), √0,36 = 0,6.
//
// Verifica: ogni opzione si riclassifica dai suoi dati con un conto indipendente: una radice √(p/q) è
// razionale se e solo se, ridotta la frazione, p e q sono quadrati perfetti (radice intera esatta).

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { div, repeatingDecimal, sqrt, toLatex } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { gcd } from "../../comuni/primes";

type Rng_ = GeneratorContext["rng"];

const CONFUSED = "CALC.RAZIONALE_IRRAZIONALE";

/** Un numero dell'esercizio, con quello che serve a classificarlo. */
type Item =
  /** √(p/q) con la frazione ridotta (q = 1 per la radice di un naturale). */
  | { readonly k: "root"; readonly p: number; readonly q: number }
  /** √ di un decimale limitato: √0,36. `p/q` è il decimale. */
  | { readonly k: "decimalRoot"; readonly p: number; readonly q: number; readonly text: string }
  /** a + √n. */
  | { readonly k: "plusRoot"; readonly a: number; readonly n: number }
  | { readonly k: "pi" }
  /** Periodico, scritto con la lineetta: «0,(12)». */
  | { readonly k: "periodic"; readonly text: string }
  | { readonly k: "fraction"; readonly p: number; readonly q: number }
  /** Decimale limitato: «3,14», «1,4142». */
  | { readonly k: "finite"; readonly text: string }
  /** 0,1010010001…: un 1, poi uno 0 in più ogni volta. */
  | { readonly k: "pattern"; readonly digit: number };

interface Model {
  /** Che cosa chiede il testo. */
  readonly ask: "irrational" | "rational";
  readonly correct: Item;
  readonly wrong: readonly Item[];
}

// ───────────────────────────── classificazione ─────────────────────────────

const isSquare = (n: number): boolean => Number.isInteger(Math.sqrt(n)) && Math.round(Math.sqrt(n)) ** 2 === n;

/** Vero se il numero è razionale (conto diretto, usato anche dalla verifica). */
function isRational(item: Item): boolean {
  switch (item.k) {
    case "root":
    case "decimalRoot": {
      const g = gcd(item.p, item.q);
      return isSquare(item.p / g) && isSquare(item.q / g);
    }
    case "plusRoot":
      return isSquare(item.n);
    case "pi":
    case "pattern":
      return false;
    case "periodic":
    case "fraction":
    case "finite":
      return true;
  }
}

// ───────────────────────────── scrittura ─────────────────────────────

function latexOf(item: Item): string {
  switch (item.k) {
    case "root":
      return item.q === 1 ? toLatex(sqrt(item.p)) : toLatex(sqrt(div(item.p, item.q)));
    case "decimalRoot":
      return `\\sqrt{${item.text}}`;
    case "plusRoot":
      return `${item.a} + ${toLatex(sqrt(item.n))}`;
    case "pi":
      return "\\pi";
    case "periodic":
      return toLatex(repeatingDecimal(item.text));
    case "fraction":
      return toLatex(div(item.p, item.q));
    case "finite":
      return item.text.replace(",", "{,}");
    case "pattern":
      return `0{,}${item.digit}0${item.digit}00${item.digit}000${item.digit}\\ldots`;
  }
}

/** Perché il numero è razionale o irrazionale, in una frase. */
function reasonOf(item: Item): string {
  const shown = `$${latexOf(item)}$`;
  switch (item.k) {
    case "root":
    case "decimalRoot": {
      if (!isRational(item)) {
        const n = item.q === 1 ? item.p : null;
        const below = n === null ? 0 : Math.floor(Math.sqrt(n));
        const bad = isSquare(item.p) ? item.q : item.p;
        return n !== null
          ? `${shown} è irrazionale: $${n}$ non è il quadrato di un naturale ($${below}^2 = ${below ** 2}$, $${below + 1}^2 = ${(below + 1) ** 2}$)`
          : `${shown} è irrazionale: la frazione $${toLatex(div(item.p, item.q))}$ è ridotta e $${bad}$ non è il quadrato di un naturale`;
      }
      const g = gcd(item.p, item.q);
      const root = (x: number): number => Math.round(Math.sqrt(x));
      if (item.k === "decimalRoot") {
        const value = root(item.p / g) / root(item.q / g);
        return `$${latexOf(item)} = ${String(value).replace(".", "{,}")}$ è razionale: $${String(value).replace(".", "{,}")}^2 = ${item.text.replace(",", "{,}")}$`;
      }
      return item.q === 1
        ? `$${latexOf(item)} = ${root(item.p)}$ è razionale`
        : `$${latexOf(item)} = ${toLatex(div(root(item.p / g), root(item.q / g)))}$ è razionale`;
    }
    case "plusRoot":
      return `${shown} è irrazionale: se fosse un razionale $r$, anche $${toLatex(sqrt(item.n))} = r - ${item.a}$ sarebbe razionale`;
    case "pi":
      return "$\\pi$ è irrazionale";
    case "periodic":
      return `${shown} è periodico, quindi razionale`;
    case "fraction":
      return `${shown} è una frazione, quindi razionale${item.p === 22 && item.q === 7 ? " (è solo vicino a $\\pi$)" : ""}`;
    case "finite":
      return `${shown} è un decimale limitato, quindi razionale${item.text === "3,14" ? " (è solo vicino a $\\pi$)" : item.text === "1,4142" ? " (è solo vicino a $\\sqrt{2}$)" : ""}`;
    case "pattern":
      return `${shown} ha infinite cifre e nessun gruppo che si ripete sempre (gli zeri tra un ${item.digit} e l'altro aumentano): è irrazionale`;
  }
}

// ───────────────────────────── costruzione ─────────────────────────────

const NON_SQUARES = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 32, 40, 45, 48, 50] as const;

function irrational(rng: Rng_, level: Level): Item {
  const forms = level === 1 ? (["root", "root", "root", "pi"] as const) : level === 2 ? (["root", "root", "pi", "fracRoot"] as const) : (["root", "plusRoot", "plusRoot", "pattern", "fracRoot"] as const);
  switch (rng.pick(forms)) {
    case "root":
      return { k: "root", p: rng.pick(NON_SQUARES), q: 1 };
    case "pi":
      return { k: "pi" };
    case "fracRoot": {
      // √(p/q) con p non quadrato: √(2/9), √(8/25).
      for (;;) {
        const p = rng.pick([2, 3, 5, 7, 8, 10, 12] as const);
        const q = rng.pick([4, 9, 16, 25, 49] as const);
        if (gcd(p, q) === 1) return { k: "root", p, q };
      }
    }
    case "plusRoot":
      return { k: "plusRoot", a: rng.int(1, 9), n: rng.pick([2, 3, 5, 7] as const) };
    case "pattern":
      return { k: "pattern", digit: rng.int(1, 9) };
  }
}

function rational(rng: Rng_, level: Level, form: "periodic" | "squareRoot" | "fraction" | "approxPi" | "approxRoot" | "fracRoot" | "decimalRoot"): Item {
  switch (form) {
    case "periodic": {
      const period = String(rng.int(1, 98)).padStart(2, "0");
      const whole = level === 1 ? 0 : rng.int(0, 3);
      const text = period[0] === period[1] ? `${whole},(${period[0]})` : `${whole},(${period})`;
      return { k: "periodic", text };
    }
    case "squareRoot":
      return { k: "root", p: rng.int(2, level === 1 ? 10 : 15) ** 2, q: 1 };
    case "fraction": {
      for (;;) {
        const q = rng.int(3, 12);
        const p = rng.int(1, 30);
        if (gcd(p, q) === 1 && p % q !== 0) return { k: "fraction", p, q };
      }
    }
    case "approxPi":
      return rng.bool() ? { k: "fraction", p: 22, q: 7 } : { k: "finite", text: "3,14" };
    case "approxRoot":
      return { k: "finite", text: "1,4142" };
    case "fracRoot": {
      for (;;) {
        const a = rng.int(1, 7);
        const b = rng.int(2, 9);
        if (gcd(a, b) === 1) return { k: "root", p: a * a, q: b * b };
      }
    }
    case "decimalRoot": {
      const a = rng.int(1, 9);
      return { k: "decimalRoot", p: a * a, q: 100, text: `0,${String(a * a).padStart(2, "0")}` };
    }
  }
}

const key = (item: Item): string => latexOf(item);

function buildModel(level: Level, rng: Rng_): Model {
  const ask = level === 1 ? "irrational" : rng.pick(["irrational", "irrational", "rational"] as const);
  if (ask === "irrational") {
    const correct = irrational(rng, level);
    const forms =
      level === 1
        ? (["periodic", "squareRoot", "fraction"] as const)
        : level === 2
          ? rng.sample(["periodic", "squareRoot", "approxPi", "fracRoot", "approxRoot"] as const, 3)
          : rng.sample(["periodic", "squareRoot", "approxPi", "fracRoot", "decimalRoot"] as const, 3);
    return { ask, correct, wrong: forms.map((f) => rational(rng, level, f)) };
  }
  // «Quale è razionale?»: la giusta è una trappola razionale, le sbagliate irrazionali diverse.
  const correct = rational(rng, level, rng.pick(level === 2 ? (["periodic", "squareRoot", "fracRoot", "approxPi"] as const) : (["squareRoot", "fracRoot", "decimalRoot", "periodic"] as const)));
  const wrong: Item[] = [];
  while (wrong.length < 3) {
    const item = irrational(rng, level);
    if (!wrong.some((w) => key(w) === key(item))) wrong.push(item);
  }
  return { ask, correct, wrong };
}

// ───────────────────────────── testo ─────────────────────────────

function draftOf(model: Model): ExerciseDraft {
  const all = [model.correct, ...model.wrong];
  return {
    prompt: `Quale di questi numeri è ${model.ask === "irrational" ? "irrazionale" : "razionale"}?`,
    answer: {
      kind: "choice",
      correct: `$${latexOf(model.correct)}$`,
      wrong: model.wrong.map((item) => ({ error: CONFUSED, value: `$${latexOf(item)}$` })),
    },
    steps: [
      { text: "**Passo 1.** Un numero è razionale se si scrive come frazione: lo sono i decimali limitati, i periodici e le radici di quadrati. È irrazionale se ha infinite cifre senza periodo, come $\\sqrt{n}$ quando $n$ non è un quadrato, e $\\pi$." },
      ...all.map((item, i) => ({ text: `**Passo ${i + 2}.** ${reasonOf(item).replace(/^./, (c) => c.toUpperCase())}.` })),
    ],
    hints: [
      model.ask === "irrational" ? "Infinite cifre non bastano: devono anche non ripetersi mai." : "Una radice può essere razionale: prova a calcolarla.",
      "Per una radice, chiediti se il numero sotto la radice è il quadrato di un intero (o di una frazione).",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { answer } = exercise;
  if (answer.kind !== "choice") return false;
  const wantRational = model.ask === "rational";
  if (isRational(model.correct) !== wantRational) return false;
  if (model.wrong.some((item) => isRational(item) === wantRational)) return false;
  const texts = [answer.correct, ...answer.wrong.map((w) => w.value)];
  return new Set(texts).size === 4 && texts[0] === `$${latexOf(model.correct)}$`;
}

export default defineGenerator({
  code: "V1.M02.A07.g1",
  skill: "V1.M02.A07",
  lesson: "V1.M02.L06",
  title: "Razionali e irrazionali",
  levels: [1, 2, 3],
  errors: [CONFUSED],
  limits: { maxInteger: 1000, maxDenominator: 100 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
