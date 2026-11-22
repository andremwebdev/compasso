// V1.M01.A05.g1 — Condizione necessaria, sufficiente: riconoscere quale delle due.
//
// Scelta multipla con le quattro risposte possibili («sufficiente ma non necessaria», «necessaria ma
// non sufficiente», «necessaria e sufficiente», «né necessaria né sufficiente»). All'indietro: si
// costruiscono due condizioni con «forte ⇒ debole» vera e il viceversa falso (`implicationPair`), poi
// si decide quale delle due mettere per prima. Se la prima è la forte, è sufficiente ma non necessaria;
// se è la debole, è necessaria ma non sufficiente. Le opzioni sbagliate:
// - LOG.NECESSARIA_SUFFICIENTE: «necessaria» e «sufficiente» scambiate (anche «né… né…», di chi prova
//   l'implicazione nel verso sbagliato e non la trova);
// - LOG.INVERSA: «necessaria e sufficiente», di chi dà per vero anche il viceversa.
//
// Livello 1: multipli («multiplo di 12» e «multiplo di 4», «multiplo di 6» e «pari»).
// Livello 2: disuguaglianze tra naturali («n > 15» e «n > 7»), ultime cifre e multipli.
// Livello 3: numeri reali con i quadrati («x > 3» e «x² > 9», «x = −2» e «x² = 4») e condizioni negate
//   («n è dispari» e «n non è multiplo di 4»).
//
// Verifica: decide le due implicazioni provando i numeri uno per uno (`checkImplication`) e ne ricava
// la risposta giusta.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { Rng } from "../../../motore/random/rng";
import { checkImplication, domainText, implicationPair, type ImplicationPair, type PairFamily } from "../../comuni/conditions";

type Rng_ = GeneratorContext["rng"];

const LABELS = "LOG.NECESSARIA_SUFFICIENTE";
const CONVERSE = "LOG.INVERSA";

const SUFFICIENT = "sufficiente ma non necessaria.";
const NECESSARY = "necessaria ma non sufficiente.";
const BOTH = "necessaria e sufficiente.";
const NEITHER = "né necessaria né sufficiente.";

interface Model {
  readonly pair: ImplicationPair;
  /** Vero se la condizione nominata per prima è la forte. */
  readonly strongFirst: boolean;
}

const FAMILIES: Record<Level, readonly PairFamily[]> = {
  1: ["multiples", "multiples", "even"],
  2: ["thresholds", "thresholds", "multiples", "multiples", "digits"],
  3: ["squares", "squares", "negated"],
};

function buildModel(level: Level, rng: Rng_): Model {
  return { pair: implicationPair(rng, rng.pick(FAMILIES[level])), strongFirst: rng.bool() };
}

function draftOf(model: Model): ExerciseDraft {
  const { pair, strongFirst } = model;
  const first = strongFirst ? pair.strong : pair.weak;
  const second = strongFirst ? pair.weak : pair.strong;
  const correct = strongFirst ? SUFFICIENT : NECESSARY;
  const swapped = strongFirst ? NECESSARY : SUFFICIENT;
  return {
    prompt: `Per ${domainText(pair.domain)}, la condizione «${first.text}» è, per la condizione «${second.text}», una condizione:`,
    answer: {
      kind: "choice",
      correct,
      wrong: [
        { error: LABELS, value: swapped },
        { error: CONVERSE, value: BOTH },
        { error: LABELS, value: NEITHER },
      ],
    },
    steps: [
      { text: `**Passo 1.** Se ${pair.strong.text}, allora ${pair.weak.text}: è vero.` },
      { text: `**Passo 2.** Il viceversa, «se ${pair.weak.text}, allora ${pair.strong.text}», è falso: ${counterexample(pair)}.` },
      {
        text: `**Passo 3.** In «${pair.strong.text} $\\Rightarrow$ ${pair.weak.text}» l'ipotesi è condizione sufficiente e la tesi è condizione necessaria. La condizione «${first.text}» è ${strongFirst ? "l'ipotesi" : "la tesi"}, e il viceversa non vale: è ${correct}`,
      },
    ],
    hints: [
      "Scrivi l'implicazione nei due versi, «se prima allora seconda» e «se seconda allora prima»: quale è vera?",
      "In $A \\Rightarrow B$ vera, $A$ è sufficiente per $B$ e $B$ è necessaria per $A$. Per mostrare che un verso è falso basta un numero.",
    ],
  };
}

/** Un numero che rende vera la debole e falsa la forte, scritto nel testo. */
function counterexample(pair: ImplicationPair): string {
  const candidates = pair.domain === "natural" ? Array.from({ length: 3001 }, (_, i) => i) : Array.from({ length: 81 }, (_, i) => (i % 2 === 0 ? i / 2 : -(i + 1) / 2));
  const value = candidates.find((v) => pair.weak.holds(v) && !pair.strong.holds(v) && v !== 0) ?? candidates.find((v) => pair.weak.holds(v) && !pair.strong.holds(v));
  if (value === undefined) throw new Error("nessun controesempio");
  const letter = pair.domain === "natural" ? "n" : "x";
  return `per $${letter} = ${value}$ la prima è vera e la seconda no`;
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { pair, strongFirst } = model;
  const first = strongFirst ? pair.strong : pair.weak;
  const second = strongFirst ? pair.weak : pair.strong;
  const sufficient = checkImplication(pair.domain, first.holds, second.holds);
  const necessary = checkImplication(pair.domain, second.holds, first.holds);
  const expected = sufficient && necessary ? BOTH : sufficient ? SUFFICIENT : necessary ? NECESSARY : NEITHER;
  return exercise.answer.kind === "choice" && exercise.answer.correct === expected;
}

export default defineGenerator({
  code: "V1.M01.A05.g1",
  skill: "V1.M01.A05",
  lesson: "V1.M01.L05",
  title: "Condizioni necessarie e sufficienti",
  levels: [1, 2, 3],
  errors: [LABELS, CONVERSE],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
