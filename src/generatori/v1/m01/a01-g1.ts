// V1.M01.A01.g1 — Appartenenza e inclusione: un'affermazione su un insieme, vera o falsa.
//
// Vero o falso (è il generatore di riferimento per le risposte `truefalse`). Si sceglie prima se
// l'affermazione è vera o falsa, poi l'affermazione che lo è: un elemento che sta o non sta nell'insieme,
// un sottoinsieme con tutti gli elementi dentro oppure con uno fuori, un elenco giusto oppure con un
// estremo sbagliato. Le affermazioni che nascono dallo scambio tra ∈ e ⊆ ({a} ∈ A, {a} ⊆ A, ∅ ∈ A,
// ∅ ⊆ A) portano l'errore LOG.APPARTENENZA_INCLUSIONE: è quello di chi risponde il contrario.
//
// Livello 1: insieme scritto per elencazione; a ∈ A, {a} ∈ A, {a} ⊆ A, B ⊆ A con B elencato.
// Livello 2: insieme scritto con una proprietà caratteristica (divisori, multipli, pari o dispari,
//   intervalli di naturali, quadrati), da elencare prima di rispondere; a ∉ A, B ⊆ A con B elencato o
//   descritto da una proprietà, A uguale a un elenco.
// Livello 3: insieme vuoto (∅ ⊆ A, ∅ ∈ A), sottoinsieme proprio (A ⊂ A, B ⊂ A tra due proprietà),
//   {a} ∈ A con A descritto da una proprietà, uguaglianza tra la proprietà e un elenco.
//
// Verifica: ricava la verità dell'affermazione dalla definizione dei simboli, provando la proprietà
// numero per numero (`holds`) invece di usare l'elenco con cui è stato scritto l'esercizio.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level, type SolutionStep } from "../../../esercizi";
import { Rng } from "../../../motore/random/rng";
import {
  holds,
  listing,
  listLatex,
  NATURAL_SEARCH_LIMIT,
  propertyLatex,
  randomProperty,
  sameElements,
  type NaturalProperty,
} from "../../comuni/natural-sets";

type Rng_ = GeneratorContext["rng"];

const SWAP = "LOG.APPARTENENZA_INCLUSIONE";

/** L'insieme A dell'esercizio: elencato oppure descritto da una proprietà. */
type SetA = { readonly kind: "listed"; readonly elements: readonly number[] } | { readonly kind: "property"; readonly property: NaturalProperty };

/** L'affermazione su A. */
type Statement =
  /** a ∈ A (oppure a ∉ A con `negated`). */
  | { readonly kind: "member"; readonly element: number; readonly negated: boolean }
  /** {a} ∈ A, con a elemento di A: falsa. */
  | { readonly kind: "singletonIn"; readonly element: number }
  /** {a} ⊆ A, con a elemento di A: vera. */
  | { readonly kind: "singletonSub"; readonly element: number }
  /** B ⊆ A (B ⊂ A con `proper`), con B elencato. */
  | { readonly kind: "subset"; readonly elements: readonly number[]; readonly proper: boolean }
  /** B ⊆ A (B ⊂ A con `proper`), con B descritto da una proprietà. */
  | { readonly kind: "subsetProperty"; readonly property: NaturalProperty; readonly proper: boolean }
  /** A = elenco. */
  | { readonly kind: "equal"; readonly elements: readonly number[] }
  /** ∅ ⊆ A: vera. */
  | { readonly kind: "emptySub" }
  /** ∅ ∈ A: falsa. */
  | { readonly kind: "emptyIn" }
  /** A ⊂ A: falsa. */
  | { readonly kind: "selfProper" };

interface Model {
  readonly set: SetA;
  readonly statement: Statement;
  /** Il valore di verità scelto all'inizio. */
  readonly truth: boolean;
}

// ───────────────────────────── costruzione ─────────────────────────────

function elementsOf(set: SetA): readonly number[] {
  return set.kind === "listed" ? set.elements : listing(set.property);
}

/** Un numero tra 0 e max che non sta nell'elenco. */
function outside(rng: Rng_, elements: readonly number[], max: number): number {
  const candidates: number[] = [];
  for (let x = 0; x <= max; x++) if (!elements.includes(x)) candidates.push(x);
  return rng.pick(candidates);
}

/** B con 2 o 3 elementi: tutti in A (vera) oppure uno fuori (falsa). */
function subsetElements(rng: Rng_, elements: readonly number[], truth: boolean): number[] {
  const size = rng.int(2, Math.min(3, elements.length - 1));
  const inside = rng.sample(elements, size);
  if (truth) return inside;
  const max = Math.max(...elements) + 4;
  return [...inside.slice(0, size - 1), outside(rng, elements, max)];
}

/** Un elenco uguale ad A (vera) oppure con un estremo sbagliato: il primo o l'ultimo tolto, o un elemento in più dopo l'ultimo. */
function equalElements(rng: Rng_, elements: readonly number[], truth: boolean): number[] {
  if (truth) return [...elements];
  const last = elements[elements.length - 1] ?? 0;
  const gap = last - (elements[elements.length - 2] ?? last - 1);
  switch (rng.pick(["dropFirst", "dropLast", "addNext"] as const)) {
    case "dropFirst":
      return elements.slice(1);
    case "dropLast":
      return elements.slice(0, -1);
    case "addNext":
      return [...elements, last + gap];
  }
}

/** Due proprietà dello stesso tipo, B e A, con B ⊆ A oppure no (divisori di d e di n, multipli di k e di h). */
function propertyPair(rng: Rng_, truth: boolean): { a: NaturalProperty; b: NaturalProperty } {
  if (rng.bool()) {
    const n = rng.pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50]);
    const proper = listing({ kind: "divisors", n }).filter((d) => d > 1 && d < n);
    const candidates = truth ? proper : [4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16].filter((d) => n % d !== 0);
    return { a: { kind: "divisors", n }, b: { kind: "divisors", n: rng.pick(candidates) } };
  }
  const h = rng.int(2, 5);
  const below = rng.int(20, 30);
  // B: multipli di k; se k è multiplo di h ogni multiplo di k lo è di h.
  const k = truth ? h * rng.int(2, 3) : rng.pick([2, 3, 4, 5, 6, 7].filter((value) => value % h !== 0));
  return { a: { kind: "multiples", k: h, below }, b: { kind: "multiples", k, below } };
}

function buildModel(level: Level, rng: Rng_): Model {
  switch (level) {
    case 1:
      return buildLevel1(rng);
    case 2:
      return buildLevel2(rng);
    case 3:
      return buildLevel3(rng);
  }
}

function buildLevel1(rng: Rng_): Model {
  const elements = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], rng.int(4, 6)).sort((a, b) => a - b);
  const set: SetA = { kind: "listed", elements };
  switch (rng.pick(["member", "member", "singletonIn", "singletonSub", "subset", "subset"] as const)) {
    case "member": {
      const truth = rng.bool();
      return { set, truth, statement: { kind: "member", negated: false, element: truth ? rng.pick(elements) : outside(rng, elements, 15) } };
    }
    case "singletonIn":
      return { set, truth: false, statement: { kind: "singletonIn", element: rng.pick(elements) } };
    case "singletonSub":
      return { set, truth: true, statement: { kind: "singletonSub", element: rng.pick(elements) } };
    case "subset": {
      const truth = rng.bool();
      return { set, truth, statement: { kind: "subset", proper: false, elements: subsetElements(rng, elements, truth) } };
    }
  }
}

function buildLevel2(rng: Rng_): Model {
  const property = randomProperty(rng, 3, 7);
  const set: SetA = { kind: "property", property };
  const elements = listing(property);
  switch (rng.pick(["member", "member", "subset", "subset", "subsetProperty", "equal", "equal"] as const)) {
    case "member": {
      const truth = rng.bool();
      const negated = rng.bool();
      // a ∈ A è vera se a sta in A; a ∉ A è vera se non ci sta.
      const inside = truth !== negated;
      const element = inside ? rng.pick(elements) : outside(rng, elements, Math.max(...elements) + 3);
      return { set, truth, statement: { kind: "member", negated, element } };
    }
    case "subset": {
      const truth = rng.bool();
      return { set, truth, statement: { kind: "subset", proper: false, elements: subsetElements(rng, elements, truth) } };
    }
    case "subsetProperty": {
      const truth = rng.bool();
      const pair = propertyPair(rng, truth);
      return { set: { kind: "property", property: pair.a }, truth, statement: { kind: "subsetProperty", property: pair.b, proper: false } };
    }
    case "equal": {
      const truth = rng.bool();
      return { set, truth, statement: { kind: "equal", elements: equalElements(rng, elements, truth) } };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const property = randomProperty(rng, 3, 7);
  const set: SetA = { kind: "property", property };
  const elements = listing(property);
  switch (rng.pick(["emptySub", "emptyIn", "singletonIn", "singletonSub", "selfProper", "equal", "equal", "subsetProperty", "subsetProperty"] as const)) {
    case "emptySub":
      return { set, truth: true, statement: { kind: "emptySub" } };
    case "emptyIn":
      return { set, truth: false, statement: { kind: "emptyIn" } };
    case "singletonIn":
      return { set, truth: false, statement: { kind: "singletonIn", element: rng.pick(elements) } };
    case "singletonSub":
      return { set, truth: true, statement: { kind: "singletonSub", element: rng.pick(elements) } };
    case "selfProper":
      return { set, truth: false, statement: { kind: "selfProper" } };
    case "equal": {
      const truth = rng.bool();
      return { set, truth, statement: { kind: "equal", elements: equalElements(rng, elements, truth) } };
    }
    case "subsetProperty": {
      const truth = rng.bool();
      const pair = propertyPair(rng, truth);
      return { set: { kind: "property", property: pair.a }, truth, statement: { kind: "subsetProperty", property: pair.b, proper: true } };
    }
  }
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

const yesNo = (truth: boolean): string => (truth ? "**vera**" : "**falsa**");

function statementLatex(statement: Statement): string {
  switch (statement.kind) {
    case "member":
      return `${statement.element} ${statement.negated ? "\\notin" : "\\in"} A`;
    case "singletonIn":
      return `\\{${statement.element}\\} \\in A`;
    case "singletonSub":
      return `\\{${statement.element}\\} \\subseteq A`;
    case "subset":
      return `${listLatex(statement.elements)} ${statement.proper ? "\\subset" : "\\subseteq"} A`;
    case "subsetProperty":
      return `B ${statement.proper ? "\\subset" : "\\subseteq"} A`;
    case "equal":
      return `A = ${listLatex(statement.elements)}`;
    case "emptySub":
      return "\\varnothing \\subseteq A";
    case "emptyIn":
      return "\\varnothing \\in A";
    case "selfProper":
      return "A \\subset A";
  }
}

/** Il ragionamento sull'affermazione, dopo aver elencato gli insiemi. */
function reasoning(model: Model, elements: readonly number[]): string {
  const { statement } = model;
  const a = listLatex(elements);
  switch (statement.kind) {
    case "member": {
      const inside = elements.includes(statement.element);
      const where = inside ? `$${statement.element}$ è uno degli elementi di $A$` : `$${statement.element}$ non è tra gli elementi di $A = ${a}$`;
      return `${where}, quindi $${statement.element} ${inside ? "\\in" : "\\notin"} A$.`;
    }
    case "singletonIn":
      return `A sinistra di $\\in$ ci deve essere un elemento. $\\{${statement.element}\\}$ è un insieme, e gli elementi di $A$ sono numeri, non insiemi: $${statement.element} \\in A$, ma $\\{${statement.element}\\} \\notin A$.`;
    case "singletonSub":
      return `$\\{${statement.element}\\}$ è un insieme con un solo elemento, $${statement.element}$, e $${statement.element} \\in A$: ogni elemento di $\\{${statement.element}\\}$ sta in $A$, quindi $\\{${statement.element}\\} \\subseteq A$.`;
    case "subset": {
      const missing = statement.elements.filter((x) => !elements.includes(x));
      return missing.length === 0
        ? `Ogni elemento di $${listLatex(statement.elements)}$ sta in $A$${statement.proper ? `, e $A$ ha elementi che non ci stanno` : ""}.`
        : `$${missing[0]}$ è un elemento di $${listLatex(statement.elements)}$ ma non sta in $A$: per l'inclusione serve che **ogni** elemento stia in $A$.`;
    }
    case "subsetProperty": {
      const b = listing(statement.property);
      const missing = b.filter((x) => !elements.includes(x));
      if (missing.length > 0) return `$${missing[0]} \\in B$ ma $${missing[0]} \\notin A$: non tutti gli elementi di $B$ stanno in $A$.`;
      const extra = elements.find((x) => !b.includes(x));
      return statement.proper
        ? `Ogni elemento di $B$ sta in $A$, quindi $B \\subseteq A$; in più $${extra} \\in A$ ma $${extra} \\notin B$, quindi l'inclusione è propria.`
        : `Ogni elemento di $B$ sta anche in $A$.`;
    }
    case "equal": {
      const missing = elements.filter((x) => !statement.elements.includes(x));
      const extra = statement.elements.filter((x) => !elements.includes(x));
      if (missing.length === 0 && extra.length === 0) return `L'elenco ha esattamente gli elementi di $A$: i due insiemi sono uguali.`;
      return missing.length > 0
        ? `$${missing[0]} \\in A$, ma nell'elenco $${listLatex(statement.elements)}$ manca: i due insiemi non sono uguali.`
        : `$${extra[0]}$ sta nell'elenco $${listLatex(statement.elements)}$, ma non in $A$: i due insiemi non sono uguali.`;
    }
    case "emptySub":
      return `L'insieme vuoto è contenuto in ogni insieme: non ha elementi, quindi non ne ha nessuno fuori da $A$. Non conta che $\\varnothing$ non sia tra gli elementi di $A$: con $\\subseteq$ si guardano gli elementi di $\\varnothing$, non quelli di $A$.`;
    case "emptyIn":
      return `A sinistra di $\\in$ ci deve essere un elemento di $A$. Gli elementi di $A$ sono i numeri $${a.slice(2, -2)}$, e $\\varnothing$ non è uno di loro: $\\varnothing \\subseteq A$ è vera, ma $\\varnothing \\in A$ è falsa.`;
    case "selfProper":
      return `Ogni insieme è contenuto in sé stesso, $A \\subseteq A$; ma per l'inclusione **propria** $A$ dovrebbe avere un elemento che non sta in $A$, e non può.`;
  }
}

function draftOf(model: Model): ExerciseDraft {
  const elements = elementsOf(model.set);
  const { statement } = model;
  const setA = model.set.kind === "listed" ? listLatex(model.set.elements) : propertyLatex(model.set.property);
  const setB = statement.kind === "subsetProperty" ? propertyLatex(statement.property) : null;
  const sets = setB ? `Siano $A = ${setA}$ e $B = ${setB}$.` : `Sia $A = ${setA}$.`;
  const prompt = `${sets} L'affermazione $${statementLatex(statement)}$ è vera o falsa?`;

  const steps: SolutionStep[] = [];
  if (model.set.kind === "property") steps.push({ text: `Elenca gli elementi di $A$: $A = ${listLatex(elements)}$.` });
  if (statement.kind === "subsetProperty") steps.push({ text: `Elenca gli elementi di $B$: $B = ${listLatex(listing(statement.property))}$.` });
  steps.push({ text: reasoning(model, elements) });
  steps.push({ text: `Quindi l'affermazione $${statementLatex(statement)}$ è ${yesNo(model.truth)}.` });

  const firstHint = ((): string => {
    switch (statement.kind) {
      case "member":
      case "singletonIn":
      case "emptyIn":
        return "Il simbolo $\\in$ vuole a sinistra un elemento: che cosa c'è a sinistra, un numero o un insieme?";
      case "singletonSub":
      case "subset":
      case "subsetProperty":
      case "emptySub":
        return "Il simbolo $\\subseteq$ lega due insiemi: quando un insieme è contenuto in un altro?";
      case "equal":
        return "Due insiemi sono uguali quando hanno gli stessi elementi.";
      case "selfProper":
        return "Che cosa chiede in più l'inclusione propria $\\subset$ rispetto a $\\subseteq$?";
    }
  })();
  const secondHint =
    model.set.kind === "property"
      ? "Comincia scrivendo $A$ per elencazione: prova i naturali uno alla volta e tieni quelli che hanno la proprietà."
      : "Guarda gli elementi di $A$ uno per uno e confrontali con quello che sta a sinistra del simbolo.";

  const swapped = statement.kind === "singletonIn" || statement.kind === "singletonSub" || statement.kind === "emptyIn" || statement.kind === "emptySub";
  return {
    prompt,
    answer: swapped ? { kind: "truefalse", correct: model.truth, error: SWAP } : { kind: "truefalse", correct: model.truth },
    steps,
    hints: [firstHint, secondHint],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Gli elementi di un insieme dell'esercizio, trovati provando i naturali uno per uno. */
function membersBySearch(set: SetA): number[] {
  if (set.kind === "listed") return [...set.elements];
  const result: number[] = [];
  for (let x = 0; x <= NATURAL_SEARCH_LIMIT; x++) if (holds(set.property, x)) result.push(x);
  return result;
}

/** La verità dell'affermazione, dalla definizione dei simboli. Gli elementi di A sono numeri: un insieme non ne è mai elemento. */
function truthOf(model: Model): boolean {
  const a = membersBySearch(model.set);
  const isIn = (x: number): boolean => a.includes(x);
  const included = (b: readonly number[], proper: boolean): boolean => b.every(isIn) && (!proper || a.some((x) => !b.includes(x)));
  const { statement } = model;
  switch (statement.kind) {
    case "member":
      return isIn(statement.element) !== statement.negated;
    case "singletonIn":
    case "emptyIn":
      return false;
    case "singletonSub":
      return included([statement.element], false);
    case "subset":
      return included(statement.elements, statement.proper);
    case "subsetProperty":
      return included(membersBySearch({ kind: "property", property: statement.property }), statement.proper);
    case "equal":
      return sameElements(a, statement.elements);
    case "emptySub":
      return included([], false);
    case "selfProper":
      return included(a, true);
  }
}

export default defineGenerator({
  code: "V1.M01.A01.g1",
  skill: "V1.M01.A01",
  lesson: "V1.M01.L01",
  title: "Appartenenza e inclusione",
  levels: [1, 2, 3],
  errors: [SWAP],
  limits: { maxInteger: 60, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    return exercise.answer.kind === "truefalse" && truthOf(model) === model.truth && exercise.answer.correct === model.truth;
  },
});
