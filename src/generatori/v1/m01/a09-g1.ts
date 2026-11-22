// V1.M01.A09.g1 — Tradurre frasi con «solo se», «se», «a meno che», «è sufficiente», «è necessaria».
//
// Scelta multipla: «… Quale di queste frasi dice la stessa cosa?». All'indietro: si sceglie la forma della frase e le due
// proposizioni (frasi di tutti i giorni, o condizioni su un numero naturale n), la traduzione giusta si
// ricava dalla tabella della lezione V1.M01.L08 e le opzioni sbagliate sono le traduzioni sbagliate tipiche:
// - LOG.NECESSARIA_SUFFICIENTE: «A solo se B» letto come «se B, allora A» (o la sua contronominale),
//   «A se B» letto come «se A, allora B», condizione sufficiente e necessaria scambiate;
// - LOG.INVERSA: la contraria, l'inversa, o il «se e solo se», che dà per vero anche il viceversa;
// - LOG.O_ESCLUSIVO: «A, a meno che B» letto come «A oppure B, ma non entrambe le cose».
//
// Livello 1: «A solo se B» e «A se B».
// Livello 2: anche «B è condizione sufficiente / necessaria per A» e «A, a meno che B».
// Livello 3: le stesse frasi con una delle due parti già negata («non esco, a meno che…»): nella
//   traduzione la doppia negazione si toglie.
//
// Verifica: con la tavola di verità, la traduzione giusta è equivalente al significato della frase
// (scritto a parte, «a meno che» come disgiunzione A ∨ B) e nessuna opzione sbagliata lo è.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { implicationPair, type PairFamily } from "../../comuni/conditions";
import { atom, equivalent, iff, implies, not, or, type Formula } from "../../comuni/propositions";

type Rng_ = GeneratorContext["rng"];

const LABELS = "LOG.NECESSARIA_SUFFICIENTE";
const CONVERSE = "LOG.INVERSA";
const EXCLUSIVE = "LOG.O_ESCLUSIVO";

/** Una proposizione semplice con la sua negazione e il congiuntivo (per «a meno che»). */
interface Sentence {
  readonly text: string;
  readonly negated: string;
  readonly subjunctive: string;
}

/** Una proposizione o la sua negazione. */
interface Literal {
  readonly sentence: Sentence;
  readonly letter: "A" | "B";
  readonly negated: boolean;
}

type Form = "onlyIf" | "if" | "sufficient" | "necessary" | "unless";

interface Model {
  readonly form: Form;
  readonly a: Literal;
  readonly b: Literal;
}

const s = (text: string, negated: string, subjunctive: string): Sentence => ({ text, negated, subjunctive });

/** Coppie di tutti i giorni: (azione, condizione). */
const EVERYDAY: readonly (readonly [Sentence, Sentence])[] = [
  [s("vado al mare", "non vado al mare", "vada al mare"), s("c'è il sole", "non c'è il sole", "ci sia il sole")],
  [s("esco", "non esco", "esca"), s("piove", "non piove", "piova")],
  [s("Marco si iscrive a Ingegneria", "Marco non si iscrive a Ingegneria", "Marco si iscriva a Ingegneria"), s("Marco supera il test", "Marco non supera il test", "Marco superi il test")],
  [s("prendo l'ombrello", "non prendo l'ombrello", "prenda l'ombrello"), s("piove", "non piove", "piova")],
  [s("la squadra vince il campionato", "la squadra non vince il campionato", "la squadra vinca il campionato"), s("la squadra vince l'ultima partita", "la squadra non vince l'ultima partita", "la squadra vinca l'ultima partita")],
  [s("Sara va al cinema", "Sara non va al cinema", "Sara vada al cinema"), s("Sara finisce i compiti", "Sara non finisce i compiti", "Sara finisca i compiti")],
  [s("il motore parte", "il motore non parte", "il motore parta"), s("c'è benzina nel serbatoio", "non c'è benzina nel serbatoio", "ci sia benzina nel serbatoio")],
  [s("la pianta cresce", "la pianta non cresce", "la pianta cresca"), s("la pianta riceve acqua", "la pianta non riceve acqua", "la pianta riceva acqua")],
  [s("Luca guida l'auto", "Luca non guida l'auto", "Luca guidi l'auto"), s("Luca ha la patente", "Luca non ha la patente", "Luca abbia la patente")],
  [s("il negozio è aperto", "il negozio non è aperto", "il negozio sia aperto"), s("è un giorno feriale", "non è un giorno feriale", "sia un giorno feriale")],
  [s("la lampadina si accende", "la lampadina non si accende", "la lampadina si accenda"), s("c'è corrente", "non c'è corrente", "ci sia corrente")],
  [s("Anna supera l'esame", "Anna non supera l'esame", "Anna superi l'esame"), s("Anna studia", "Anna non studia", "Anna studi")],
  [s("faccio una passeggiata", "non faccio una passeggiata", "faccia una passeggiata"), s("il cielo è sereno", "il cielo non è sereno", "il cielo sia sereno")],
  [s("Giulia gioca a tennis", "Giulia non gioca a tennis", "Giulia giochi a tennis"), s("il campo è libero", "il campo non è libero", "il campo sia libero")],
  [s("la torta è pronta", "la torta non è pronta", "la torta sia pronta"), s("la torta cuoce per un'ora", "la torta non cuoce per un'ora", "la torta cuocia per un'ora")],
  [s("compro il biglietto", "non compro il biglietto", "compri il biglietto"), s("il concerto è confermato", "il concerto non è confermato", "il concerto sia confermato")],
  [s("il pacco arriva domani", "il pacco non arriva domani", "il pacco arrivi domani"), s("il pacco parte oggi", "il pacco non parte oggi", "il pacco parta oggi")],
  [s("Paolo fa la doccia", "Paolo non fa la doccia", "Paolo faccia la doccia"), s("c'è acqua calda", "non c'è acqua calda", "ci sia acqua calda")],
];

// ───────────────────────────── costruzione ─────────────────────────────

const subjunctiveOf = (text: string): string => text.replace(" è ", " sia ").replace(" sono ", " siano ");

/** Una coppia: di tutti i giorni (a = azione, b = condizione), o due condizioni su n con forte ⇒ debole. */
function drawPair(rng: Rng_, allowNumbers: boolean): { action: Sentence; condition: Sentence; numeric: boolean } {
  if (allowNumbers && rng.bool(0.4)) {
    const pair = implicationPair(rng, rng.pick(["multiples", "thresholds", "even", "digits"] as const satisfies readonly PairFamily[]));
    const toSentence = (c: { text: string; negated: string }): Sentence => ({ text: c.text, negated: c.negated, subjunctive: subjunctiveOf(c.text) });
    return { action: toSentence(pair.strong), condition: toSentence(pair.weak), numeric: true };
  }
  const [action, condition] = rng.pick(EVERYDAY);
  return { action, condition, numeric: false };
}

const FORMS: Record<Level, readonly Form[]> = {
  1: ["onlyIf", "if"],
  2: ["onlyIf", "if", "sufficient", "necessary", "unless", "unless"],
  3: ["onlyIf", "if", "sufficient", "necessary", "unless", "unless"],
};

function buildModel(level: Level, rng: Rng_): Model {
  const form = rng.pick(FORMS[level]);
  // «A, a meno che B» solo con frasi di tutti i giorni: il congiuntivo delle condizioni su n suona male.
  const { action, condition, numeric } = drawPair(rng, form !== "unless");
  // Con le frasi di tutti i giorni A è l'azione e B la condizione («vado al mare solo se c'è il sole»,
  // «vado al mare se c'è il sole»). Con i numeri la frase è vera: «forte solo se debole», «debole se forte».
  const [first, second] = numeric && (form === "if" || form === "sufficient") ? [condition, action] : [action, condition];
  // Al livello 3 una delle due parti è negata (in «a meno che» solo la prima, per non avere «a meno che non»).
  const negateA = level === 3 && (form === "unless" || rng.bool());
  const negateB = level === 3 && !negateA;
  return { form, a: { sentence: first, letter: "A", negated: negateA }, b: { sentence: second, letter: "B", negated: negateB } };
}

// ───────────────────────────── testo e formule ─────────────────────────────

const text = (literal: Literal): string => (literal.negated ? literal.sentence.negated : literal.sentence.text);
const negatedText = (literal: Literal): string => (literal.negated ? literal.sentence.text : literal.sentence.negated);
const formula = (literal: Literal): Formula => (literal.negated ? not(atom(literal.letter)) : atom(literal.letter));
const negatedFormula = (literal: Literal): Formula => (literal.negated ? atom(literal.letter) : not(atom(literal.letter)));
const capital = (value: string): string => (value.startsWith("$") ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`);

function sentenceText(model: Model): string {
  const { a, b } = model;
  switch (model.form) {
    case "onlyIf":
      return `${capital(text(a))} solo se ${text(b)}.`;
    case "if":
      return `${capital(text(a))} se ${text(b)}.`;
    case "sufficient":
      return `La condizione «${text(b)}» è sufficiente per «${text(a)}».`;
    case "necessary":
      return `La condizione «${text(b)}» è necessaria per «${text(a)}».`;
    case "unless":
      return `${capital(text(a))}, a meno che ${b.sentence.subjunctive}.`;
  }
}

interface Option {
  readonly text: string;
  readonly formula: Formula;
  readonly error?: ErrorCode;
}

const ifOption = (p: { t: string; f: Formula }, q: { t: string; f: Formula }, error?: ErrorCode): Option => ({
  text: `se ${p.t}, allora ${q.t}.`,
  formula: implies(p.f, q.f),
  ...(error ? { error } : {}),
});

/** La traduzione giusta e le sbagliate. */
function options(model: Model): { correct: Option; wrong: Option[] } {
  const A = { t: text(model.a), f: formula(model.a) };
  const B = { t: text(model.b), f: formula(model.b) };
  const notA = { t: negatedText(model.a), f: negatedFormula(model.a) };
  const notB = { t: negatedText(model.b), f: negatedFormula(model.b) };
  const both = (error: ErrorCode): Option => ({ text: `${capital(A.t)} se e solo se ${B.t}.`, formula: iff(A.f, B.f), error });
  switch (model.form) {
    case "onlyIf":
    case "necessary":
      // A ⇒ B.
      return { correct: ifOption(A, B), wrong: [ifOption(B, A, LABELS), ifOption(notA, notB, LABELS), both(CONVERSE)] };
    case "if":
    case "sufficient":
      // B ⇒ A.
      return { correct: ifOption(B, A), wrong: [ifOption(A, B, LABELS), ifOption(notB, notA, CONVERSE), both(CONVERSE)] };
    case "unless":
      // ¬B ⇒ A.
      return {
        correct: ifOption(notB, A),
        wrong: [
          ifOption(B, notA, CONVERSE),
          ifOption(A, notB, CONVERSE),
          { text: `${capital(A.t)} oppure ${B.t}, ma non entrambe le cose.`, formula: not(iff(A.f, B.f)), error: EXCLUSIVE },
        ],
      };
  }
}

function draftOf(model: Model): ExerciseDraft {
  const { correct, wrong } = options(model);
  const rule = ((): string => {
    switch (model.form) {
      case "onlyIf":
        return "«$A$ solo se $B$» vuol dire $A \\Rightarrow B$: quello che segue «solo se» è la tesi, la condizione necessaria.";
      case "if":
        return "«$A$ se $B$» vuol dire $B \\Rightarrow A$: quello che segue «se» è l'ipotesi.";
      case "sufficient":
        return "Se $B$ è condizione sufficiente per $A$, vuol dire $B \\Rightarrow A$: $B$ è l'ipotesi.";
      case "necessary":
        return "Se $B$ è condizione necessaria per $A$, vuol dire $A \\Rightarrow B$: $B$ è la tesi.";
      case "unless":
        return "«$A$, a meno che $B$» vuol dire $\\neg B \\Rightarrow A$, cioè $A \\vee B$: non dice che cosa succede quando $B$ è vera.";
    }
  })();
  return {
    prompt: `${sentenceText(model)} Quale di queste frasi dice la stessa cosa?`,
    answer: { kind: "choice", correct: correct.text, wrong: wrong.map((option) => ({ error: option.error ?? CONVERSE, value: option.text })) },
    steps: [
      { text: `**Passo 1.** $A$ = «${text(model.a)}», $B$ = «${text(model.b)}».` },
      { text: `**Passo 2.** ${rule}` },
      { text: `**Passo 3.** In parole: «${correct.text.replace(/\.$/, "")}».${model.a.negated || model.b.negated ? " La negazione di una parte già negata toglie il «non»." : ""}` },
    ],
    hints: [
      "Dai un nome alle due parti, $A$ e $B$, e cerca nella tabella della lezione la parola che le lega.",
      "In «solo se» la parte dopo «solo se» è la tesi; in «se» la parte dopo «se» è l'ipotesi; «a meno che $B$» vuol dire «se non $B$».",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Il significato della frase, dalla tabella (scritto in un'altra forma: «a meno che» come disgiunzione). */
function meaning(model: Model): Formula {
  const A = formula(model.a);
  const B = formula(model.b);
  switch (model.form) {
    case "onlyIf":
    case "necessary":
      return or(not(A), B);
    case "if":
    case "sufficient":
      return or(A, not(B));
    case "unless":
      return or(A, B);
  }
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { correct, wrong } = options(model);
  const target = meaning(model);
  return (
    equivalent(correct.formula, target) &&
    wrong.every((option) => !equivalent(option.formula, target)) &&
    exercise.answer.kind === "choice" &&
    exercise.answer.correct === correct.text
  );
}

export default defineGenerator({
  code: "V1.M01.A09.g1",
  skill: "V1.M01.A09",
  lesson: "V1.M01.L08",
  title: "La logica nel linguaggio comune",
  levels: [1, 2, 3],
  errors: [LABELS, CONVERSE, EXCLUSIVE],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
