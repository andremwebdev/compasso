// V1.M01.A06.g1 — Inversa, contraria e contronominale di un'implicazione: quale è equivalente.
//
// Scelta multipla tra quattro frasi costruite da «se P, allora Q»: la contronominale «se non Q, allora
// non P» (giusta), l'inversa «se Q, allora P», la contraria «se non P, allora non Q» e la doppia
// implicazione «P se e solo se Q». Le tre sbagliate hanno tutte LOG.INVERSA: da «se P allora Q» non
// seguono né il viceversa né la contraria, e quindi neanche il «se e solo se».
//
// All'indietro: si costruiscono due condizioni con «forte ⇒ debole» vera e il viceversa falso
// (`implicationPair`). Così l'implicazione di partenza è vera e inversa, contraria e doppia
// implicazione sono false: chi le sceglie sbaglia davvero.
//
// Livello 1: «qual è la contronominale?», con multipli, pari e disuguaglianze tra naturali.
// Livello 2: «sapendo che … è vera, quale è sicuramente vera?», con disuguaglianze e ultime cifre.
// Livello 3: le stesse domande con i numeri reali e i quadrati, o con condizioni già negate, dove la
//   negazione toglie il «non» («n non è multiplo di 5» diventa «n è multiplo di 5»).
//
// Verifica: prova i numeri uno per uno: l'implicazione e la contronominale hanno lo stesso valore,
// inversa e contraria (con «sicuramente vera») sono false.

import { defineGenerator, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import { Rng } from "../../../motore/random/rng";
import { checkImplication, domainText, implicationPair, type Condition, type ImplicationPair, type PairFamily } from "../../comuni/conditions";

type Rng_ = GeneratorContext["rng"];

const CONVERSE = "LOG.INVERSA";

interface Model {
  readonly pair: ImplicationPair;
  /** «Qual è la contronominale» oppure «quale è sicuramente vera». */
  readonly question: "contrapositive" | "surely";
}

const FAMILIES: Record<Level, readonly PairFamily[]> = {
  1: ["multiples", "multiples", "even", "thresholds"],
  2: ["thresholds", "thresholds", "digits", "multiples"],
  3: ["squares", "squares", "negated", "negated"],
};

function buildModel(level: Level, rng: Rng_): Model {
  const pair = implicationPair(rng, rng.pick(FAMILIES[level]));
  const question = level === 1 ? "contrapositive" : level === 2 ? "surely" : rng.pick(["contrapositive", "surely"] as const);
  return { pair, question };
}

const sentence = (p: string, q: string): string => `Se ${p}, allora ${q}.`;

function draftOf(model: Model): ExerciseDraft {
  const { pair } = model;
  const p: Condition = pair.strong;
  const q: Condition = pair.weak;
  const original = `«se ${p.text}, allora ${q.text}»`;
  const prompt =
    model.question === "contrapositive"
      ? `Per ${domainText(pair.domain)}, qual è la contronominale di ${original}?`
      : `Per ${domainText(pair.domain)}, sai che ${original} è vera. Quale di queste è sicuramente vera?`;
  const correct = sentence(q.negated, p.negated);
  return {
    prompt,
    answer: {
      kind: "choice",
      correct,
      wrong: [
        { error: CONVERSE, value: sentence(q.text, p.text) },
        { error: CONVERSE, value: sentence(p.negated, q.negated) },
        { error: CONVERSE, value: `${p.text.charAt(0).toUpperCase()}${p.text.slice(1)} se e solo se ${q.text}.` },
      ],
    },
    steps: [
      { text: `**Passo 1.** Ipotesi $P$: ${p.text}. Tesi $Q$: ${q.text}.` },
      { text: `**Passo 2.** Le negazioni: $\\neg P$ è «${p.negated}», $\\neg Q$ è «${q.negated}».` },
      { text: `**Passo 3.** La contronominale $\\neg Q \\Rightarrow \\neg P$ scambia ipotesi e tesi e le nega tutte e due: «se ${q.negated}, allora ${p.negated}».` },
      {
        text:
          model.question === "surely"
            ? `È equivalente all'implicazione di partenza, quindi è vera anche lei. Inversa ($Q \\Rightarrow P$) e contraria ($\\neg P \\Rightarrow \\neg Q$) non sono equivalenti: qui sono false, ${counterexample(pair)}. Per questo è falso anche il «se e solo se».`
            : `Inversa ($Q \\Rightarrow P$), contraria ($\\neg P \\Rightarrow \\neg Q$) e «se e solo se» sono altre proposizioni, e qui sono false: ${counterexample(pair)}. Solo la contronominale è equivalente all'implicazione di partenza.`,
      },
    ],
    hints: [
      "La contronominale di $P \\Rightarrow Q$ è l'unica delle implicazioni costruite da lei che le è equivalente: quale?",
      "Scambia ipotesi e tesi e negale tutte e due: $\\neg Q \\Rightarrow \\neg P$. Attento a negare bene ($>$ diventa $\\le$, «non è» diventa «è»).",
    ],
  };
}

function counterexample(pair: ImplicationPair): string {
  const candidates = pair.domain === "natural" ? Array.from({ length: 3001 }, (_, i) => i) : Array.from({ length: 81 }, (_, i) => (i % 2 === 0 ? i / 2 : -(i + 1) / 2));
  const value = candidates.find((v) => pair.weak.holds(v) && !pair.strong.holds(v) && v !== 0) ?? candidates.find((v) => pair.weak.holds(v) && !pair.strong.holds(v));
  if (value === undefined) throw new Error("nessun controesempio");
  return `basta $${pair.domain === "natural" ? "n" : "x"} = ${value}$, che rende vera la tesi e falsa l'ipotesi`;
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const { pair } = model;
  const P = pair.strong.holds;
  const Q = pair.weak.holds;
  const notP = (v: number): boolean => !P(v);
  const notQ = (v: number): boolean => !Q(v);
  const original = checkImplication(pair.domain, P, Q);
  const contrapositive = checkImplication(pair.domain, notQ, notP);
  const converse = checkImplication(pair.domain, Q, P);
  const contrary = checkImplication(pair.domain, notP, notQ);
  if (original !== contrapositive || original === converse || contrary !== converse) return false;
  // L'implicazione è vera e l'inversa no: inversa, contraria e «se e solo se» sono davvero sbagliate.
  if (!(original && !converse)) return false;
  return exercise.answer.kind === "choice" && exercise.answer.correct === sentence(pair.weak.negated, pair.strong.negated);
}

export default defineGenerator({
  code: "V1.M01.A06.g1",
  skill: "V1.M01.A06",
  lesson: "V1.M01.L05",
  title: "Inversa, contraria e contronominale",
  levels: [1, 2, 3],
  errors: [CONVERSE],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
