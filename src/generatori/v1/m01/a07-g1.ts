// V1.M01.A07.g1 — Negare proposizioni con quantificatori e connettivi.
//
// Scelta multipla: «qual è la negazione di …?». La proposizione è un quantificatore (∀ o ∃) davanti a
// un predicato su un numero: una disuguaglianza, «x è pari», «x è multiplo di k», oppure due di questi
// legati da ∧, ∨, ⇒. All'indietro: si sceglie la proposizione, la negazione giusta si costruisce con le
// regole (∀ ↔ ∃, De Morgan, ¬(A ⇒ B) ≡ A ∧ ¬B, > negato in ≤), e ogni opzione sbagliata è la stessa
// costruzione con un errore tipico:
// - LOG.NEGAZIONE_PER_OGNI: «per ogni» lasciato com'è, o predicato non negato;
// - LOG.NEGAZIONE_ESISTE: lo stesso con «esiste»;
// - LOG.DE_MORGAN: negando, «e» resta «e» (o «o» resta «o»);
// - LOG.NEGAZIONE_DISUGUAGLIANZA: x > a negato in x < a.
//
// Livello 1: un quantificatore e una disuguaglianza (∀x ∈ ℕ, x > 3).
// Livello 2: un quantificatore e due predicati legati da ∧ o ∨.
// Livello 3: un quantificatore universale e un'implicazione (∀x ∈ ℝ, x > 2 ⇒ x² > 4), oppure ∃ e una
//   disgiunzione con i quadrati.
//
// Verifica: controlla che la negazione giusta abbia, sui numeri del dominio (interi tra −60 e 60,
// reali a quarti), sempre il valore opposto della proposizione, provando il quantificatore e il
// predicato per esteso; e che il quantificatore sia cambiato e ogni pezzo sia negato davvero
// (proposizione composta con la stessa tavola di verità della negazione).

import { defineGenerator, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { and as andF, atom as atomF, equivalent, implies as impliesF, not as notF, or as orF, type Formula } from "../../comuni/propositions";

type Rng_ = GeneratorContext["rng"];

const UNIVERSAL = "LOG.NEGAZIONE_PER_OGNI";
const EXISTENTIAL = "LOG.NEGAZIONE_ESISTE";
const DE_MORGAN = "LOG.DE_MORGAN";
const INEQUALITY = "LOG.NEGAZIONE_DISUGUAGLIANZA";

type Domain = "N" | "Z" | "R";
type Op = ">" | "\\ge" | "<" | "\\le";

/** Un predicato su x. `negated` vale solo per i multipli («non è multiplo di»). */
type Atom =
  | { readonly kind: "cmp"; readonly square: boolean; readonly op: Op; readonly a: number }
  | { readonly kind: "parity"; readonly even: boolean }
  | { readonly kind: "mult"; readonly k: number; readonly negated: boolean };

type Body =
  | { readonly kind: "atom"; readonly a: Atom }
  | { readonly kind: "and" | "or" | "implies"; readonly a: Atom; readonly b: Atom };

interface Statement {
  readonly quantifier: "all" | "exists";
  readonly domain: Domain;
  readonly body: Body;
}

type Model = Statement;

// ───────────────────────────── predicati ─────────────────────────────

const NEGATED_OP: Record<Op, Op> = { ">": "\\le", "\\ge": "<", "<": "\\ge", "\\le": ">" };
/** La negazione sbagliata: il verso girato, l'uguale lasciato com'era. */
const WRONG_OP: Record<Op, Op> = { ">": "<", "\\ge": "\\le", "<": ">", "\\le": "\\ge" };

function negate(atom: Atom): Atom {
  switch (atom.kind) {
    case "cmp":
      return { ...atom, op: NEGATED_OP[atom.op] };
    case "parity":
      return { kind: "parity", even: !atom.even };
    case "mult":
      return { ...atom, negated: !atom.negated };
  }
}

/** La negazione con l'errore sulla disuguaglianza; null se il predicato non è una disuguaglianza. */
const wrongNegate = (atom: Atom): Atom | null => (atom.kind === "cmp" ? { ...atom, op: WRONG_OP[atom.op] } : null);

function atomLatex(atom: Atom): string {
  switch (atom.kind) {
    case "cmp":
      return `${atom.square ? "x^2" : "x"} ${atom.op} ${atom.a}`;
    case "parity":
      return `x \\text{ è ${atom.even ? "pari" : "dispari"}}`;
    case "mult":
      return `x \\text{ ${atom.negated ? "non è" : "è"} multiplo di } ${atom.k}`;
  }
}

function compare(v: number, op: Op, a: number): boolean {
  switch (op) {
    case ">":
      return v > a;
    case "\\ge":
      return v >= a;
    case "<":
      return v < a;
    case "\\le":
      return v <= a;
  }
}

function atomHolds(atom: Atom, x: number): boolean {
  switch (atom.kind) {
    case "cmp":
      return compare(atom.square ? x * x : x, atom.op, atom.a);
    case "parity":
      return Math.abs(x % 2) === (atom.even ? 0 : 1);
    case "mult":
      return (x % atom.k === 0) !== atom.negated;
  }
}

const DOMAIN_LATEX: Record<Domain, string> = { N: "\\mathbb{N}", Z: "\\mathbb{Z}", R: "\\mathbb{R}" };
const CONNECTIVE: Record<"and" | "or" | "implies", string> = { and: "\\wedge", or: "\\vee", implies: "\\Rightarrow" };

function bodyLatex(body: Body): string {
  return body.kind === "atom" ? atomLatex(body.a) : `(${atomLatex(body.a)} ${CONNECTIVE[body.kind]} ${atomLatex(body.b)})`;
}

function statementLatex(statement: Statement): string {
  const domain = DOMAIN_LATEX[statement.domain];
  return statement.quantifier === "all" ? `\\forall x \\in ${domain},\\ ${bodyLatex(statement.body)}` : `\\exists x \\in ${domain} : ${bodyLatex(statement.body)}`;
}

// ───────────────────────────── negazioni ─────────────────────────────

const flip = (quantifier: "all" | "exists"): "all" | "exists" => (quantifier === "all" ? "exists" : "all");

/** La negazione del predicato, giusta. */
function negateBody(body: Body): Body {
  switch (body.kind) {
    case "atom":
      return { kind: "atom", a: negate(body.a) };
    case "and":
      return { kind: "or", a: negate(body.a), b: negate(body.b) };
    case "or":
      return { kind: "and", a: negate(body.a), b: negate(body.b) };
    case "implies":
      return { kind: "and", a: body.a, b: negate(body.b) };
  }
}

/** La negazione giusta della proposizione. */
const negation = (s: Statement): Statement => ({ ...s, quantifier: flip(s.quantifier), body: negateBody(s.body) });

/** Le opzioni sbagliate, nell'ordine di importanza. */
function wrongStatements(s: Statement): { error: ErrorCode; statement: Statement }[] {
  const right = negation(s);
  const quantifierError = s.quantifier === "all" ? UNIVERSAL : EXISTENTIAL;
  const result: { error: ErrorCode; statement: Statement }[] = [];
  // Quantificatore lasciato com'era.
  result.push({ error: quantifierError, statement: { ...right, quantifier: s.quantifier } });
  const body = s.body;
  switch (body.kind) {
    case "atom": {
      // Predicato non negato.
      result.push({ error: quantifierError, statement: { ...s, quantifier: flip(s.quantifier) } });
      const wrong = wrongNegate(body.a);
      if (wrong) result.push({ error: INEQUALITY, statement: { ...right, body: { kind: "atom", a: wrong } } });
      break;
    }
    case "and":
    case "or": {
      // Connettivo non cambiato.
      result.push({ error: DE_MORGAN, statement: { ...right, body: { kind: body.kind, a: negate(body.a), b: negate(body.b) } } });
      const negatedBody = right.body;
      if (negatedBody.kind !== "atom") {
        const wrongA = wrongNegate(body.a);
        const wrongB = wrongNegate(body.b);
        if (wrongB) result.push({ error: INEQUALITY, statement: { ...right, body: { ...negatedBody, b: wrongB } } });
        else if (wrongA) result.push({ error: INEQUALITY, statement: { ...right, body: { ...negatedBody, a: wrongA } } });
      }
      // Tutti e due gli errori: quantificatore e connettivo.
      result.push({ error: quantifierError, statement: { ...s, body: { kind: body.kind, a: negate(body.a), b: negate(body.b) } } });
      break;
    }
    case "implies": {
      const wrongB = wrongNegate(body.b);
      if (wrongB) result.push({ error: INEQUALITY, statement: { ...right, body: { kind: "and", a: body.a, b: wrongB } } });
      // Quantificatore lasciato e implicazione lasciata: ∀x, A ⇒ ¬B.
      result.push({ error: quantifierError, statement: { ...s, body: { kind: "implies", a: body.a, b: negate(body.b) } } });
      break;
    }
  }
  return result;
}

// ───────────────────────────── costruzione ─────────────────────────────

const OPS: readonly Op[] = [">", "\\ge", "<", "\\le"];

function cmp(rng: Rng_, square: boolean, domain: Domain): Atom {
  const a = square ? rng.pick([1, 4, 9, 16, 25, 36]) : domain === "N" ? rng.int(1, 20) : rng.int(-10, 20);
  return { kind: "cmp", square, op: rng.pick(OPS), a };
}

function otherAtom(rng: Rng_, domain: Domain): Atom {
  switch (rng.pick(["cmp", "parity", "mult"] as const)) {
    case "cmp":
      return cmp(rng, domain === "R" && rng.bool(0.4), domain);
    case "parity":
      return domain === "R" ? cmp(rng, true, domain) : { kind: "parity", even: rng.bool() };
    case "mult":
      return domain === "R" ? cmp(rng, false, domain) : { kind: "mult", k: rng.int(3, 9), negated: false };
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const model = draw(level, rng);
    // Due predicati diversi, e nessuno negazione dell'altro.
    const { body } = model;
    if (body.kind !== "atom" && (atomLatex(body.a) === atomLatex(body.b) || atomLatex(body.a) === atomLatex(negate(body.b)))) continue;
    // Servono tre opzioni sbagliate diverse dalla giusta e tra loro.
    if (keptWrong(model).length >= 3) return model;
  }
}

function draw(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1: {
      const domain = rng.pick(["N", "Z"] as const);
      return { quantifier: rng.pick(["all", "exists"] as const), domain, body: { kind: "atom", a: cmp(rng, false, domain) } };
    }
    case 2: {
      const domain = rng.pick(["Z", "Z", "R"] as const);
      return { quantifier: rng.pick(["all", "exists"] as const), domain, body: { kind: rng.pick(["and", "or"] as const), a: otherAtom(rng, domain), b: cmp(rng, false, domain) } };
    }
    case 3: {
      if (rng.bool()) {
        const domain = rng.pick(["Z", "R"] as const);
        return { quantifier: "all", domain, body: { kind: "implies", a: otherAtom(rng, domain), b: cmp(rng, domain === "R", domain) } };
      }
      return { quantifier: "exists", domain: "R", body: { kind: rng.pick(["and", "or"] as const), a: cmp(rng, true, "R"), b: cmp(rng, false, "R") } };
    }
  }
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

function bodyStep(body: Body): string {
  switch (body.kind) {
    case "atom":
      return `la negazione di $${atomLatex(body.a)}$ è $${atomLatex(negate(body.a))}$`;
    case "and":
    case "or":
      return `con De Morgan si negano le due parti ($${atomLatex(negate(body.a))}$ e $${atomLatex(negate(body.b))}$) e «${body.kind === "and" ? "e" : "o"}» diventa «${body.kind === "and" ? "o" : "e"}»`;
    case "implies":
      return `la negazione di un'implicazione è «ipotesi e tesi negata»: $${atomLatex(body.a)} \\wedge ${atomLatex(negate(body.b))}$`;
  }
}

/**
 * Due proposizioni che dicono la stessa cosa sui numeri del dominio: stesso quantificatore e predicati
 * con lo stesso valore in ogni punto («x è dispari ∧ x > 16» e «x è dispari ∧ x ≥ 16» tra gli interi).
 */
function sameMeaning(a: Statement, b: Statement): boolean {
  return a.quantifier === b.quantifier && samples(a.domain).every((x) => bodyHolds(a.body, x) === bodyHolds(b.body, x));
}

/** Le opzioni sbagliate tenute: diverse, anche nel significato, dalla giusta e tra loro; al più quattro. */
function keptWrong(model: Model): { error: ErrorCode; statement: Statement }[] {
  const kept: { error: ErrorCode; statement: Statement }[] = [];
  const right = negation(model);
  for (const candidate of wrongStatements(model)) {
    if (sameMeaning(candidate.statement, right) || kept.some((other) => sameMeaning(other.statement, candidate.statement))) continue;
    if (kept.length < 4) kept.push(candidate);
  }
  return kept;
}

function draftOf(model: Model): ExerciseDraft {
  const right = negation(model);
  const wrong: ExpectedWrong<string>[] = keptWrong(model).map((candidate) => ({ error: candidate.error, value: `$${statementLatex(candidate.statement)}$` }));
  return {
    prompt: `Qual è la negazione della proposizione $${statementLatex(model)}$?`,
    answer: { kind: "choice", correct: `$${statementLatex(right)}$`, wrong },
    steps: [
      { text: `**Passo 1.** Il quantificatore: $${model.quantifier === "all" ? "\\forall" : "\\exists"}$ diventa $${model.quantifier === "all" ? "\\exists" : "\\forall"}$.` },
      { text: `**Passo 2.** Il predicato si nega: ${bodyStep(model.body)}.` },
      { text: `**Risultato:** $${statementLatex(right)}$.` },
    ],
    hints: [
      "Per negare un quantificatore si cambia il quantificatore **e** si nega quello che segue.",
      "Nega il predicato pezzo per pezzo: $>$ diventa $\\le$, «e» diventa «o» (e viceversa), la negazione di $A \\Rightarrow B$ è $A \\wedge \\neg B$.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** I numeri del dominio su cui si prova. */
function samples(domain: Domain): number[] {
  switch (domain) {
    case "N":
      return Array.from({ length: 61 }, (_, i) => i);
    case "Z":
      return Array.from({ length: 121 }, (_, i) => i - 60);
    case "R":
      return Array.from({ length: 481 }, (_, i) => -60 + i / 4);
  }
}

function bodyHolds(body: Body, x: number): boolean {
  const a = atomHolds(body.a, x);
  if (body.kind === "atom") return a;
  const b = atomHolds(body.b, x);
  return body.kind === "and" ? a && b : body.kind === "or" ? a || b : !a || b;
}

/** La forma logica del predicato, con lettere A e B e la negazione di ogni pezzo scritta come ¬. */
function bodyFormula(body: Body, reference: Body): Formula {
  const letter = (atom: Atom): Formula => {
    const name = atomLatex(atom);
    if (name === atomLatex(reference.a)) return atomF("A");
    if (name === atomLatex(negate(reference.a))) return notF(atomF("A"));
    if (reference.kind !== "atom" && name === atomLatex(reference.b)) return atomF("B");
    if (reference.kind !== "atom" && name === atomLatex(negate(reference.b))) return notF(atomF("B"));
    return atomF("X");
  };
  const a = letter(body.a);
  if (body.kind === "atom") return a;
  const b = letter(body.b);
  return body.kind === "and" ? andF(a, b) : body.kind === "or" ? orF(a, b) : impliesF(a, b);
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const right = negation(model);
  // 1. Sui numeri: la negazione ha sempre il valore opposto, punto per punto e con il quantificatore.
  const xs = samples(model.domain);
  const pointwise = xs.every((x) => bodyHolds(right.body, x) === !bodyHolds(model.body, x));
  const truth = (s: Statement): boolean => (s.quantifier === "all" ? xs.every((x) => bodyHolds(s.body, x)) : xs.some((x) => bodyHolds(s.body, x)));
  // 2. Nella forma: quantificatore cambiato e predicato con la tavola di verità della negazione.
  const form = right.quantifier !== model.quantifier && equivalent(bodyFormula(right.body, model.body), notF(bodyFormula(model.body, model.body)));
  return pointwise && truth(right) === !truth(model) && form && exercise.answer.kind === "choice" && exercise.answer.correct === `$${statementLatex(right)}$`;
}

export default defineGenerator({
  code: "V1.M01.A07.g1",
  skill: "V1.M01.A07",
  lesson: "V1.M01.L06",
  title: "Negare quantificatori e connettivi",
  levels: [1, 2, 3],
  errors: [UNIVERSAL, EXISTENTIAL, DE_MORGAN, INEQUALITY],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
