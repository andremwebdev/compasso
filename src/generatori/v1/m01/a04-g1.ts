// V1.M01.A04.g1 — Valore di verità di una proposizione composta con «non», «e», «o»; tavole di verità.
//
// Vero o falso (come V1.M01.A01.g1). All'indietro: si sceglie prima se la risposta è «vera» o «falsa»,
// poi proposizione e valori che la danno. L'errore di chi risponde il contrario è quello che, fatto sul
// conto, cambia davvero il risultato:
// - LOG.O_ESCLUSIVO: «o» calcolato come esclusivo (con le due parti vere dà falso);
// - LOG.PORTATA_NEGAZIONE: ¬A ∧ B letto come ¬(A ∧ B).
// Se nessuno dei due errori cambia il risultato, la risposta sbagliata resta senza codice. Quando
// possono, i valori si scelgono in modo che uno degli errori conti.
//
// Livello 1: due proposizioni semplici su numeri («7 è primo», «12 è multiplo di 5»), uno o due connettivi.
// Livello 2: tre proposizioni semplici, due o tre connettivi con le parentesi.
// Livello 3: tavola di verità con due o tre lettere: «la proposizione è vera in esattamente k righe».
//   Quando l'affermazione è falsa, k è il numero di righe che si conta facendo un errore tipico.
//
// Verifica: rifà i fatti sui numeri con l'aritmetica (primo, multiplo, quadrato) e calcola la
// proposizione con le tavole dei connettivi (`tableValue`), riga per riga per il livello 3.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import {
  and,
  assignments,
  atom,
  atomsOf,
  evaluate,
  formulaLatex,
  not,
  or,
  subformulas,
  tableValue,
  truthLatex,
  widenNegation,
  type Assignment,
  type Formula,
} from "../../comuni/propositions";

type Rng_ = GeneratorContext["rng"];

const EXCLUSIVE = "LOG.O_ESCLUSIVO";
const SCOPE = "LOG.PORTATA_NEGAZIONE";

/** Un fatto sui numeri: «$7$ è un numero primo». */
type Fact =
  | { readonly kind: "prime"; readonly n: number }
  | { readonly kind: "even"; readonly n: number }
  | { readonly kind: "multiple"; readonly n: number; readonly k: number }
  | { readonly kind: "greater"; readonly a: number; readonly b: number }
  | { readonly kind: "square"; readonly n: number };

type Model =
  | { readonly kind: "value"; readonly formula: Formula; readonly facts: Readonly<Record<string, Fact>>; readonly truth: boolean }
  | { readonly kind: "table"; readonly formula: Formula; readonly claimed: number; readonly truth: boolean };

// ───────────────────────────── fatti sui numeri ─────────────────────────────

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
const COMPOSITES = [4, 6, 9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51];

/** Un fatto con il valore di verità voluto. */
function drawFact(rng: Rng_, value: boolean): Fact {
  switch (rng.pick(["prime", "even", "multiple", "greater", "square"] as const)) {
    case "prime":
      return { kind: "prime", n: rng.pick(value ? PRIMES : COMPOSITES) };
    case "even": {
      const n = rng.int(3, 40);
      return { kind: "even", n: n % 2 === 0 === value ? n : n + 1 };
    }
    case "multiple": {
      const k = rng.int(3, 9);
      const q = rng.int(2, 9);
      return { kind: "multiple", k, n: value ? k * q : k * q + rng.int(1, k - 1) };
    }
    case "greater": {
      const a = rng.int(-9, 20);
      const d = rng.int(1, 9);
      return value ? { kind: "greater", a, b: a - d } : { kind: "greater", a, b: a + d };
    }
    case "square": {
      const r = rng.int(2, 9);
      return { kind: "square", n: value ? r * r : r * r + rng.int(1, 2 * r) };
    }
  }
}

function factLatex(fact: Fact): string {
  switch (fact.kind) {
    case "prime":
      return `$${fact.n}$ è un numero primo`;
    case "even":
      return `$${fact.n}$ è pari`;
    case "multiple":
      return `$${fact.n}$ è multiplo di $${fact.k}$`;
    case "greater":
      return `$${fact.a} > ${fact.b}$`;
    case "square":
      return `$${fact.n}$ è un quadrato perfetto`;
  }
}

/** Il valore del fatto, ricalcolato con l'aritmetica. */
function factValue(fact: Fact): boolean {
  switch (fact.kind) {
    case "prime": {
      if (fact.n < 2) return false;
      for (let d = 2; d * d <= fact.n; d++) if (fact.n % d === 0) return false;
      return true;
    }
    case "even":
      return fact.n % 2 === 0;
    case "multiple":
      return fact.n % fact.k === 0;
    case "greater":
      return fact.a > fact.b;
    case "square":
      return Number.isInteger(Math.sqrt(fact.n));
  }
}

// ───────────────────────────── formule ─────────────────────────────

/** Una lettera, negata o no. */
const literal = (rng: Rng_, name: string): Formula => (rng.bool() ? not(atom(name)) : atom(name));
const binary = (rng: Rng_, left: Formula, right: Formula): Formula => (rng.bool() ? and(left, right) : or(left, right));

function formula2(rng: Rng_): Formula {
  if (rng.int(1, 5) === 1) return not(binary(rng, atom("A"), atom("B")));
  return binary(rng, literal(rng, "A"), literal(rng, "B"));
}

/** Tre lettere, due connettivi, con la parentesi a sinistra o a destra; a volte una negazione davanti alla parentesi. */
function formula3(rng: Rng_, names: readonly [string, string, string]): Formula {
  const [x, y, z] = rng.shuffle(names);
  const inner = binary(rng, literal(rng, x ?? "A"), literal(rng, y ?? "B"));
  const grouped = rng.int(1, 4) === 1 ? not(inner) : inner;
  return rng.bool() ? binary(rng, grouped, literal(rng, z ?? "C")) : binary(rng, literal(rng, z ?? "C"), grouped);
}

/** L'errore che, fatto sul conto, cambia il valore; null se nessuno lo cambia. */
function flippingError(formula: Formula, values: Assignment): ErrorCode | null {
  const correct = evaluate(formula, values);
  if (evaluate(formula, values, "exclusiveOr") !== correct) return EXCLUSIVE;
  const widened = widenNegation(formula);
  if (widened && evaluate(widened, values) !== correct) return SCOPE;
  return null;
}

/** Quante righe vere conta chi fa l'errore. */
function countRows(formula: Formula, error: ErrorCode | null): number {
  const names = atomsOf(formula);
  const target = error === SCOPE ? widenNegation(formula) : formula;
  if (!target) return -1;
  return assignments(names).filter((values) => evaluate(target, values, error === EXCLUSIVE ? "exclusiveOr" : "correct")).length;
}

// ───────────────────────────── costruzione ─────────────────────────────

function buildModel(level: Level, rng: Rng_): Model {
  const truth = rng.bool();
  if (level === 3) return buildTable(rng, truth);
  const names = level === 1 ? ["A", "B"] : ["A", "B", "C"];
  // Di solito si cerca un caso in cui un errore tipico cambia il risultato.
  const wantError = rng.bool(0.8);
  for (let attempt = 0; ; attempt++) {
    const formula = level === 1 ? formula2(rng) : formula3(rng, ["A", "B", "C"]);
    const values: Record<string, boolean> = {};
    for (const name of names) values[name] = rng.bool();
    if (evaluate(formula, values) !== truth) continue;
    if (wantError && attempt < 40 && flippingError(formula, values) === null) continue;
    const facts: Record<string, Fact> = {};
    for (const name of names) facts[name] = drawFact(rng, values[name] === true);
    return { kind: "value", formula, facts, truth };
  }
}

function buildTable(rng: Rng_, truth: boolean): Model {
  for (;;) {
    const formula = rng.bool(0.3) ? formula2(rng) : formula3(rng, ["A", "B", "C"]);
    const correct = countRows(formula, null);
    if (truth) return { kind: "table", formula, claimed: correct, truth };
    const errors = ([EXCLUSIVE, SCOPE] as const).filter((error) => {
      const count = countRows(formula, error);
      return count >= 0 && count !== correct;
    });
    if (errors.length === 0) continue;
    return { kind: "table", formula, claimed: countRows(formula, rng.pick(errors)), truth };
  }
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

function valueOf(model: Model & { kind: "value" }): Assignment {
  const values: Record<string, boolean> = {};
  for (const [name, fact] of Object.entries(model.facts)) values[name] = factValue(fact);
  return values;
}

/** I passaggi dal pezzo più interno: «$\neg A$ è V». */
function evaluationSteps(formula: Formula, values: Assignment): string {
  return subformulas(formula)
    .map((part) => `$${formulaLatex(part)}$ è ${evaluate(part, values) ? "vera" : "falsa"}`)
    .join("; ");
}

function draftOf(model: Model): ExerciseDraft {
  if (model.kind === "table") return tableDraft(model);
  const values = valueOf(model);
  const names = Object.keys(model.facts).sort();
  const intro = names.map((name) => `$${name}$ = «${factLatex(model.facts[name] as Fact)}»`);
  const list = intro.length === 2 ? `${intro[0]} e ${intro[1]}` : `${intro[0]}, ${intro[1]} e ${intro[2]}`;
  const error = flippingError(model.formula, values);
  return {
    prompt: `Siano ${list}. La proposizione $${formulaLatex(model.formula)}$ è vera o falsa?`,
    answer: error ? { kind: "truefalse", correct: model.truth, error } : { kind: "truefalse", correct: model.truth },
    steps: [
      { text: `**Passo 1.** Valori delle proposizioni semplici: ${names.map((name) => `$${name}$ è ${values[name] ? "vera" : "falsa"}`).join(", ")}.` },
      { text: `**Passo 2.** Dal pezzo più interno al più esterno: ${evaluationSteps(model.formula, values)}.` },
      { text: `Quindi la proposizione è ${model.truth ? "**vera**" : "**falsa**"}.` },
    ],
    hints: [
      "Trova prima il valore di verità di ogni proposizione semplice: è un fatto sui numeri.",
      "Poi calcola dal pezzo più interno al più esterno. Ricorda che $\\neg$ si applica solo a quello che lo segue subito e che «o» è vera anche quando le due parti sono vere.",
    ],
  };
}

function tableDraft(model: Model & { kind: "table" }): ExerciseDraft {
  const names = atomsOf(model.formula);
  // Le negazioni di una lettera si leggono al volo: niente colonna, così la tavola sta nello schermo.
  const parts = subformulas(model.formula).filter((part) => !(part.kind === "not" && part.arg.kind === "atom"));
  const rows = assignments(names);
  const correct = countRows(model.formula, null);
  const header = [...names, ...parts.map((part, index) => (index === parts.length - 1 ? "P" : formulaLatex(part)))].join(" & ");
  const body = rows.map((values) => [...names.map((name) => truthLatex(values[name] === true)), ...parts.map((part) => truthLatex(evaluate(part, values)))].join(" & ")).join(" \\\\ ");
  const columns = `${"c".repeat(names.length)}|${"c".repeat(parts.length)}`;
  const error = model.truth ? null : ([EXCLUSIVE, SCOPE] as const).find((code) => countRows(model.formula, code) === model.claimed) ?? null;
  return {
    prompt: `Considera la proposizione $P = ${formulaLatex(model.formula)}$. Nella sua tavola di verità, $P$ è vera in esattamente $${model.claimed}$ ${model.claimed === 1 ? "riga" : "righe"}: vero o falso?`,
    answer: error ? { kind: "truefalse", correct: model.truth, error } : { kind: "truefalse", correct: model.truth },
    steps: [
      { text: `**Passo 1.** Le lettere sono ${names.length}: la tavola ha $2^{${names.length}} = ${rows.length}$ righe.` },
      { text: `**Passo 2.** Una colonna per ogni pezzo, dal più interno:\n\n$$\\begin{array}{${columns}} ${header} \\\\ \\hline ${body} \\end{array}$$` },
      { text: `**Passo 3.** Nell'ultima colonna ci sono $${correct}$ V. L'affermazione «vera in esattamente $${model.claimed}$ ${model.claimed === 1 ? "riga" : "righe"}» è quindi ${model.truth ? "**vera**" : "**falsa**"}.` },
    ],
    hints: [
      `Quante righe ha la tavola di verità con ${names.length} lettere?`,
      "Fai una colonna per ogni pezzo della proposizione, dal più interno al più esterno, e conta le V dell'ultima colonna.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function verifyModel(model: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "truefalse" || exercise.answer.correct !== model.truth) return false;
  if (model.kind === "value") {
    const values: Record<string, boolean> = {};
    for (const [name, fact] of Object.entries(model.facts)) values[name] = factValue(fact);
    return tableValue(model.formula, values) === model.truth;
  }
  const rows = assignments(atomsOf(model.formula)).filter((values) => tableValue(model.formula, values)).length;
  return (rows === model.claimed) === model.truth;
}

export default defineGenerator({
  code: "V1.M01.A04.g1",
  skill: "V1.M01.A04",
  lesson: "V1.M01.L04",
  title: "Valore di verità delle proposizioni composte",
  levels: [1, 2, 3],
  errors: [EXCLUSIVE, SCOPE],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
