// V1.M01.A08.g1 — Deduzioni valide e deduzioni sbagliate.
//
// Vero o falso: «questa deduzione è valida?». All'indietro: si sceglie prima se la deduzione è valida,
// poi la forma che lo è. Le premesse parlano di un numero (n naturale o x reale) con le condizioni di
// `comuni/conditions.ts`, così l'implicazione di partenza è vera e il viceversa falso.
// - Valide: dall'ipotesi vera alla tesi (P ⇒ Q, P, quindi Q); dalla tesi falsa all'ipotesi falsa
//   (P ⇒ Q, ¬Q, quindi ¬P); la catena (P ⇒ Q, Q ⇒ R, quindi P ⇒ R); «o» con una parte falsa
//   (P ∨ Q, ¬P, quindi Q).
// - Non valide: dalla tesi vera all'ipotesi (P ⇒ Q, Q, quindi P) e dall'ipotesi falsa alla tesi falsa
//   (P ⇒ Q, ¬P, quindi ¬Q): LOG.INVERSA per chi le dice valide; la catena rovesciata (P ⇒ Q, Q ⇒ R,
//   quindi R ⇒ P): LOG.INVERSA; «o» con una parte vera (P ∨ Q, P, quindi ¬Q): LOG.O_ESCLUSIVO.
// Chi dice non valida la deduzione dalla tesi falsa all'ipotesi falsa non usa la contronominale:
// anche quello è LOG.INVERSA (la voce del catalogo dice che da P ⇒ Q segue ¬Q ⇒ ¬P). Le altre deduzioni
// valide, dette non valide, restano senza codice.
//
// Livello 1: le quattro deduzioni con un'implicazione tra multipli o disuguaglianze di naturali.
// Livello 2: anche la catena di due implicazioni, con ultime cifre e disuguaglianze.
// Livello 3: numeri reali con i quadrati, condizioni negate, e «o» con una parte falsa o vera.
//
// Verifica: decide la validità con la tavola di verità (la conclusione è vera in ogni riga in cui sono
// vere le premesse) e controlla, provando i numeri, che le implicazioni delle premesse siano vere.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { checkImplication, implicationPair, type Condition, type Domain, type ImplicationPair, type PairFamily } from "../../comuni/conditions";
import { and, assignments, atom, implies, not, or, tableValue, type Formula } from "../../comuni/propositions";

type Rng_ = GeneratorContext["rng"];

const CONVERSE = "LOG.INVERSA";
const EXCLUSIVE = "LOG.O_ESCLUSIVO";

type Form =
  /** P ⇒ Q, P ⊢ Q. */
  | "ponens"
  /** P ⇒ Q, ¬Q ⊢ ¬P. */
  | "tollens"
  /** P ⇒ Q, Q ⊢ P (non valida). */
  | "affirmConsequent"
  /** P ⇒ Q, ¬P ⊢ ¬Q (non valida). */
  | "denyAntecedent"
  /** P ⇒ Q, Q ⇒ R ⊢ P ⇒ R. */
  | "chain"
  /** P ⇒ Q, Q ⇒ R ⊢ R ⇒ P (non valida). */
  | "chainReversed"
  /** P ∨ Q, ¬P ⊢ Q. */
  | "disjunctive"
  /** P ∨ Q, P ⊢ ¬Q (non valida). */
  | "exclusive";

const VALID: readonly Form[] = ["ponens", "tollens", "chain", "disjunctive"];

interface Model {
  readonly form: Form;
  readonly domain: Domain;
  /** P e Q (e R per le catene). Per le implicazioni P ⇒ Q (⇒ R) è vera. */
  readonly p: Condition;
  readonly q: Condition;
  readonly r?: Condition;
}

// ───────────────────────────── costruzione ─────────────────────────────

const FAMILIES: Record<Level, readonly PairFamily[]> = {
  1: ["multiples", "multiples", "thresholds", "even"],
  2: ["thresholds", "digits", "multiples"],
  3: ["squares", "squares", "negated"],
};

const FORMS: Record<Level, { valid: readonly Form[]; invalid: readonly Form[] }> = {
  1: { valid: ["ponens", "tollens"], invalid: ["affirmConsequent", "denyAntecedent"] },
  2: { valid: ["ponens", "tollens", "chain", "chain"], invalid: ["affirmConsequent", "denyAntecedent", "chainReversed", "chainReversed"] },
  3: { valid: ["ponens", "tollens", "disjunctive", "disjunctive"], invalid: ["affirmConsequent", "denyAntecedent", "exclusive", "exclusive"] },
};

/** Tre condizioni sui naturali con P ⇒ Q ⇒ R e nessuna delle due al contrario: multipli di k·m·l, k·m, k. */
function chainConditions(rng: Rng_): { p: Condition; q: Condition; r: Condition } {
  const k = rng.int(2, 6);
  const m = rng.int(2, 4);
  const l = rng.int(2, 3);
  const multiple = (n: number): Condition => ({ text: `$n$ è multiplo di $${n}$`, negated: `$n$ non è multiplo di $${n}$`, holds: (v) => v % n === 0 });
  if (rng.bool()) return { p: multiple(k * m * l), q: multiple(k * m), r: multiple(k) };
  const c = rng.int(0, 20);
  const greater = (a: number): Condition => ({ text: `$n > ${a}$`, negated: `$n \\le ${a}$`, holds: (v) => v > a });
  return { p: greater(c + k + m + l), q: greater(c + k), r: greater(c) };
}

/** Due condizioni indipendenti (nessuna implica l'altra) per le deduzioni con «o». */
function disjunctionConditions(rng: Rng_): { p: Condition; q: Condition } {
  const k = rng.int(3, 9);
  const a = rng.int(5, 30);
  const multiple: Condition = { text: `$n$ è multiplo di $${k}$`, negated: `$n$ non è multiplo di $${k}$`, holds: (v) => v % k === 0 };
  const greater: Condition = { text: `$n > ${a}$`, negated: `$n \\le ${a}$`, holds: (v) => v > a };
  return rng.bool() ? { p: multiple, q: greater } : { p: greater, q: multiple };
}

function buildModel(level: Level, rng: Rng_): Model {
  const valid = rng.bool();
  const form = rng.pick(valid ? FORMS[level].valid : FORMS[level].invalid);
  switch (form) {
    case "chain":
    case "chainReversed":
      return { form, domain: "natural", ...chainConditions(rng) };
    case "disjunctive":
    case "exclusive":
      return { form, domain: "natural", ...disjunctionConditions(rng) };
    default: {
      const pair: ImplicationPair = implicationPair(rng, rng.pick(FAMILIES[level]));
      return { form, domain: pair.domain, p: pair.strong, q: pair.weak };
    }
  }
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

const quoted = (text: string): string => `«${text}»`;
const ifThen = (a: Condition, b: Condition): string => `«se ${a.text}, allora ${b.text}»`;

/** Premesse e conclusione, in parole. */
function argumentText(model: Model): { premises: string; known: string; conclusion: string } {
  const { p, q, r } = model;
  switch (model.form) {
    case "ponens":
      return { premises: ifThen(p, q), known: quoted(p.text), conclusion: quoted(q.text) };
    case "tollens":
      return { premises: ifThen(p, q), known: quoted(q.negated), conclusion: quoted(p.negated) };
    case "affirmConsequent":
      return { premises: ifThen(p, q), known: quoted(q.text), conclusion: quoted(p.text) };
    case "denyAntecedent":
      return { premises: ifThen(p, q), known: quoted(p.negated), conclusion: quoted(q.negated) };
    case "chain":
    case "chainReversed": {
      if (!r) throw new Error("manca la terza condizione");
      return {
        premises: `${ifThen(p, q)} e ${ifThen(q, r)}`,
        known: "",
        conclusion: model.form === "chain" ? ifThen(p, r) : ifThen(r, p),
      };
    }
    case "disjunctive":
      return { premises: `«${p.text} oppure ${q.text}»`, known: quoted(p.negated), conclusion: quoted(q.text) };
    case "exclusive":
      return { premises: `«${p.text} oppure ${q.text}»`, known: quoted(p.text), conclusion: quoted(q.negated) };
  }
}

const isValid = (form: Form): boolean => VALID.includes(form);

function errorOf(form: Form): ErrorCode | null {
  switch (form) {
    case "affirmConsequent":
    case "denyAntecedent":
    case "chainReversed":
    case "tollens":
      return CONVERSE;
    case "exclusive":
      return EXCLUSIVE;
    case "ponens":
    case "chain":
    case "disjunctive":
      return null;
  }
}

/** Un numero che rende vere le premesse e falsa la conclusione (per le deduzioni non valide). */
function counterexample(model: Model): number | null {
  const candidates = model.domain === "natural" ? Array.from({ length: 3001 }, (_, i) => i) : Array.from({ length: 81 }, (_, i) => (i % 2 === 0 ? i / 2 : -(i + 1) / 2));
  const { p, q, r } = model;
  const test = (v: number): boolean => {
    switch (model.form) {
      case "affirmConsequent":
        return q.holds(v) && !p.holds(v);
      case "denyAntecedent":
        return !p.holds(v) && q.holds(v);
      case "chainReversed":
        return r !== undefined && r.holds(v) && !p.holds(v);
      case "exclusive":
        return p.holds(v) && q.holds(v);
      default:
        return false;
    }
  };
  return candidates.find((v) => v !== 0 && test(v)) ?? null;
}

function reasoning(model: Model): string {
  const letter = model.domain === "natural" ? "n" : "x";
  const example = counterexample(model);
  const witness = example === null ? "" : ` Infatti $${letter} = ${example}$ rende vere le premesse e falsa la conclusione.`;
  switch (model.form) {
    case "ponens":
      return "L'ipotesi dell'implicazione è vera, quindi è vera anche la tesi: deduzione valida.";
    case "tollens":
      return "La tesi dell'implicazione è falsa, quindi è falsa anche l'ipotesi (è la contronominale): deduzione valida.";
    case "affirmConsequent":
      return `Si sa che la tesi è vera: dalla tesi vera non segue niente sull'ipotesi (sarebbe usare l'inversa). Deduzione non valida.${witness}`;
    case "denyAntecedent":
      return `Si sa che l'ipotesi è falsa: dall'ipotesi falsa non segue niente sulla tesi (sarebbe usare la contraria). Deduzione non valida.${witness}`;
    case "chain":
      return "Se vale la prima condizione vale la seconda, e se vale la seconda vale la terza: dalla prima segue la terza. Deduzione valida.";
    case "chainReversed":
      return `Le due implicazioni vanno dalla prima condizione alla terza, non al contrario: la conclusione è l'inversa di quella che segue. Deduzione non valida.${witness}`;
    case "disjunctive":
      return "Almeno una delle due parti dell'«oppure» è vera; la prima è falsa, quindi è vera la seconda. Deduzione valida.";
    case "exclusive":
      return `«Oppure» è vera anche quando sono vere tutte e due le parti: sapere che la prima è vera non dice niente sulla seconda. Deduzione non valida.${witness}`;
  }
}

function draftOf(model: Model): ExerciseDraft {
  const { premises, known, conclusion } = argumentText(model);
  const who = model.domain === "natural" ? "un certo numero naturale $n$" : "un certo numero reale $x$";
  const isOr = model.form === "disjunctive" || model.form === "exclusive";
  const prompt =
    model.form === "chain" || model.form === "chainReversed"
      ? `Per ogni numero naturale $n$ sono vere ${premises}. Ne deduci che è vera anche ${conclusion}. Questa deduzione è valida?`
      : isOr
        ? `Di ${who} sai che ${premises} e che ${known}. Ne deduci che ${conclusion}. Questa deduzione è valida?`
        : `Per ogni ${model.domain === "natural" ? "numero naturale $n$" : "numero reale $x$"} è vera l'implicazione ${premises}. Di ${who} sai che ${known}. Ne deduci che ${conclusion}. Questa deduzione è valida?`;
  const valid = isValid(model.form);
  const error = errorOf(model.form);
  return {
    prompt,
    answer: error ? { kind: "truefalse", correct: valid, error } : { kind: "truefalse", correct: valid },
    steps: [
      { text: isOr ? `**Passo 1.** Si sa che ${premises} è vera e che ${known}.` : model.form === "chain" || model.form === "chainReversed" ? `**Passo 1.** Le premesse sono due implicazioni vere: ${premises}.` : `**Passo 1.** Nell'implicazione ${premises} l'ipotesi è «${model.p.text}» e la tesi è «${model.q.text}». Si sa che ${known}.` },
      { text: `**Passo 2.** ${reasoning(model)}` },
      { text: `Quindi la risposta è ${valid ? "**vero**: la deduzione è valida" : "**falso**: la deduzione non è valida"}.` },
    ],
    hints: [
      isOr ? "Quando è vera una proposizione con «oppure»?" : "Che cosa si sa: che l'ipotesi è vera, che è falsa, che la tesi è vera o che è falsa?",
      isOr
        ? "Se una delle due parti è falsa, l'altra deve essere vera; se una è vera, l'altra può essere vera o falsa."
        : "Da $A \\Rightarrow B$ vera: con $A$ vera segue $B$; con $B$ falsa segue $\\neg A$. Con $B$ vera, o con $A$ falsa, non segue niente.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Premesse e conclusione come formule nelle lettere P, Q, R. */
function argumentFormulas(form: Form): { premises: Formula[]; conclusion: Formula } {
  const P = atom("P");
  const Q = atom("Q");
  const R = atom("R");
  switch (form) {
    case "ponens":
      return { premises: [implies(P, Q), P], conclusion: Q };
    case "tollens":
      return { premises: [implies(P, Q), not(Q)], conclusion: not(P) };
    case "affirmConsequent":
      return { premises: [implies(P, Q), Q], conclusion: P };
    case "denyAntecedent":
      return { premises: [implies(P, Q), not(P)], conclusion: not(Q) };
    case "chain":
      return { premises: [implies(P, Q), implies(Q, R)], conclusion: implies(P, R) };
    case "chainReversed":
      return { premises: [implies(P, Q), implies(Q, R)], conclusion: implies(R, P) };
    case "disjunctive":
      return { premises: [or(P, Q), not(P)], conclusion: Q };
    case "exclusive":
      return { premises: [or(P, Q), P], conclusion: not(Q) };
  }
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { premises, conclusion } = argumentFormulas(model.form);
  const all = premises.reduce((acc, premise) => and(acc, premise));
  const valid = assignments(["P", "Q", "R"]).every((values) => !tableValue(all, values) || tableValue(conclusion, values));
  // Le implicazioni delle premesse sono vere per ogni numero (provando i numeri uno per uno).
  const { p, q, r } = model;
  const premisesTrue =
    model.form === "disjunctive" || model.form === "exclusive"
      ? true
      : checkImplication(model.domain, p.holds, q.holds) && (r === undefined || checkImplication(model.domain, q.holds, r.holds));
  // Per le deduzioni non valide c'è davvero un numero che le smentisce.
  const refuted = valid || counterexample(model) !== null;
  return premisesTrue && refuted && exercise.answer.kind === "truefalse" && exercise.answer.correct === valid;
}

export default defineGenerator({
  code: "V1.M01.A08.g1",
  skill: "V1.M01.A08",
  lesson: "V1.M01.L07",
  title: "Deduzioni valide e non valide",
  levels: [1, 2, 3],
  errors: [CONVERSE, EXCLUSIVE],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
