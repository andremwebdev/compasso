// V1.M01.A03.g1 — Contare con i diagrammi di Venn: problemi con due o tre insiemi.
//
// Risposta: un numero intero. All'indietro: si sceglie prima quanti elementi stanno in ogni zona del
// diagramma (solo A, A e B, fuori…), poi si scrivono i dati che il testo dà (|A|, |A ∩ B|, il totale)
// sommando le zone, e la domanda chiede un'altra zona o una somma di zone.
//
// Errori tipici, fatti davvero sui dati del testo:
// - LOG.INCLUSIONE_ESCLUSIONE: elementi comuni contati due volte (|A| + |B|), non tolti («solo A» = |A|),
//   tolti una volta di troppo (con tre insiemi il centro tolto da tutte le coppie e mai rimesso, o
//   rimesso dove non serve);
// - LOG.O_ESCLUSIVO: «almeno uno» letto come «uno solo», cioè senza chi sta in più insiemi.
// Le risposte sbagliate che coincidono con la giusta, tra loro, o sono negative si scartano; si estraggono
// di nuovo le zone finché ne restano abbastanza (tre dal livello 2).
//
// Livello 1: due insiemi; almeno uno dei due, solo uno dei due insiemi, nessuno dei due (con il totale).
// Livello 2: tre insiemi; solo il primo, almeno uno dei tre.
// Livello 3: tre insiemi con il totale; nessuno dei tre, esattamente due dei tre.
//
// Verifica: costruisce le persone una per una (con le zone a cui appartengono), ricava i dati del testo
// contandole e conta direttamente quelle che rispondono alla domanda.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { num } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";

type Rng_ = GeneratorContext["rng"];

const COUNTED_TWICE = "LOG.INCLUSIONE_ESCLUSIONE";
const EXCLUSIVE = "LOG.O_ESCLUSIVO";

/** Un tema del problema: chi sono gli elementi e che cosa fanno. */
interface Theme {
  /** «In una classe di 30 studenti». */
  readonly group: (total: number) => string;
  /** «studenti», per la domanda. */
  readonly noun: string;
  /** «giocano», «studiano». */
  readonly verb: string;
  /** Gli oggetti con la loro preposizione: «a calcio». */
  readonly items: readonly [string, string, string];
  /** Che cosa sono gli oggetti, al plurale: «sport»; `feminine` per «lingue». */
  readonly category: string;
  readonly feminine: boolean;
  /** Preposizione davanti a «nessuno dei due sport»: «a». */
  readonly categoryPrep: string;
  /** Articolo plurale della categoria: «gli sport», «i mezzi». */
  readonly article: string;
  /** «Quanti» o «Quante», secondo il nome. */
  readonly howMany: string;
}

const THEMES: readonly Theme[] = [
  { group: (n) => `In una classe di $${n}$ studenti`, noun: "studenti", verb: "giocano", items: ["a calcio", "a pallavolo", "a basket"], category: "sport", feminine: false, categoryPrep: "a ", article: "gli", howMany: "Quanti" },
  { group: (n) => `In una scuola con $${n}$ studenti`, noun: "studenti", verb: "studiano", items: ["inglese", "francese", "spagnolo"], category: "lingue", feminine: true, categoryPrep: "", article: "le", howMany: "Quanti" },
  { group: (n) => `In un gruppo di $${n}$ persone`, noun: "persone", verb: "hanno", items: ["un cane", "un gatto", "un coniglio"], category: "animali", feminine: false, categoryPrep: "", article: "gli", howMany: "Quante" },
  { group: (n) => `In una scuola di musica con $${n}$ allievi`, noun: "allievi", verb: "suonano", items: ["il pianoforte", "la chitarra", "il violino"], category: "strumenti", feminine: false, categoryPrep: "", article: "gli", howMany: "Quanti" },
  { group: (n) => `In un condominio di $${n}$ famiglie`, noun: "famiglie", verb: "hanno", items: ["un'auto", "una bicicletta", "uno scooter"], category: "mezzi", feminine: false, categoryPrep: "", article: "i", howMany: "Quante" },
];

/** Le zone di un diagramma con tre insiemi (con due, quelle che toccano C valgono 0). */
interface Zones {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** In A e B ma non in C, e così via. */
  readonly ab: number;
  readonly ac: number;
  readonly bc: number;
  /** In tutti e tre. */
  readonly abc: number;
  /** Fuori da tutti. */
  readonly out: number;
}

type Question =
  /** Almeno uno degli insiemi. */
  | "union"
  /** Solo nel primo insieme. */
  | "onlyFirst"
  /** In uno solo degli insiemi. */
  | "exactlyOne"
  /** In nessuno degli insiemi. */
  | "none"
  /** In esattamente due dei tre insiemi. */
  | "exactlyTwo";

interface Model {
  readonly theme: Theme;
  /** 2 o 3 insiemi. */
  readonly sets: 2 | 3;
  readonly zones: Zones;
  readonly question: Question;
  /** Vero se il testo dà il numero totale. */
  readonly withTotal: boolean;
}

// ───────────────────────────── dati, risposta, errori ─────────────────────────────

/** I dati che il testo dà, sommando le zone. */
function data(z: Zones) {
  const sizeA = z.a + z.ab + z.ac + z.abc;
  const sizeB = z.b + z.ab + z.bc + z.abc;
  const sizeC = z.c + z.ac + z.bc + z.abc;
  const AB = z.ab + z.abc;
  const AC = z.ac + z.abc;
  const BC = z.bc + z.abc;
  const total = z.a + z.b + z.c + z.ab + z.ac + z.bc + z.abc + z.out;
  return { sizeA, sizeB, sizeC, AB, AC, BC, ABC: z.abc, total };
}

/** La risposta giusta, dalle zone. */
function answerOf(model: Model): number {
  const z = model.zones;
  switch (model.question) {
    case "union":
      return z.a + z.b + z.c + z.ab + z.ac + z.bc + z.abc;
    case "onlyFirst":
      return z.a;
    case "exactlyOne":
      return z.a + z.b + z.c;
    case "none":
      return z.out;
    case "exactlyTwo":
      return z.ab + z.ac + z.bc;
  }
}

/** Le risposte sbagliate: il conto fatto sui dati del testo con un errore tipico. */
function wrongCandidates(model: Model): { error: ErrorCode; value: number }[] {
  const d = data(model.zones);
  const sum = d.sizeA + d.sizeB + (model.sets === 3 ? d.sizeC : 0);
  const pairs = d.AB + d.AC + d.BC;
  const onlyOne = answerOf({ ...model, question: "exactlyOne" });
  if (model.sets === 2) {
    switch (model.question) {
      case "union":
        return [
          { error: COUNTED_TWICE, value: d.sizeA + d.sizeB },
          { error: EXCLUSIVE, value: d.sizeA + d.sizeB - 2 * d.AB },
        ];
      case "onlyFirst":
        return [
          { error: COUNTED_TWICE, value: d.sizeA },
          { error: COUNTED_TWICE, value: d.sizeA - d.AB - d.AB },
        ];
      case "exactlyOne":
        return [
          { error: COUNTED_TWICE, value: d.sizeA + d.sizeB },
          { error: COUNTED_TWICE, value: d.sizeA + d.sizeB - d.AB },
        ];
      case "none":
        return [
          { error: COUNTED_TWICE, value: d.total - d.sizeA - d.sizeB },
          { error: EXCLUSIVE, value: d.total - (d.sizeA + d.sizeB - 2 * d.AB) },
        ];
      case "exactlyTwo":
        return [];
    }
  }
  switch (model.question) {
    case "onlyFirst":
      return [
        { error: COUNTED_TWICE, value: d.sizeA },
        // Le coppie tolte per intero: il centro è tolto due volte.
        { error: COUNTED_TWICE, value: d.sizeA - d.AB - d.AC },
        // Le zone «A e B soltanto» e «A e C soltanto» tolte, il centro no.
        { error: COUNTED_TWICE, value: d.sizeA - (d.AB - d.ABC) - (d.AC - d.ABC) },
      ];
    case "union":
      return [
        { error: COUNTED_TWICE, value: sum },
        { error: COUNTED_TWICE, value: sum - pairs },
        { error: EXCLUSIVE, value: onlyOne },
      ];
    case "none":
      return [
        { error: COUNTED_TWICE, value: d.total - sum },
        { error: COUNTED_TWICE, value: d.total - (sum - pairs) },
        { error: EXCLUSIVE, value: d.total - onlyOne },
      ];
    case "exactlyTwo":
      return [
        { error: COUNTED_TWICE, value: pairs },
        { error: COUNTED_TWICE, value: pairs - d.ABC },
        { error: COUNTED_TWICE, value: pairs - 2 * d.ABC },
      ];
    case "exactlyOne":
      return [];
  }
}

/** Le sbagliate tenute: non negative, diverse dalla giusta e tra loro. */
function keptWrong(model: Model): { error: ErrorCode; value: number }[] {
  const correct = answerOf(model);
  const kept: { error: ErrorCode; value: number }[] = [];
  for (const candidate of wrongCandidates(model)) {
    if (candidate.value < 0 || candidate.value === correct || kept.some((other) => other.value === candidate.value)) continue;
    kept.push(candidate);
  }
  return kept;
}

// ───────────────────────────── costruzione ─────────────────────────────

function buildModel(level: Level, rng: Rng_): Model {
  const theme = rng.pick(THEMES);
  switch (level) {
    case 1: {
      const question = rng.pick(["union", "onlyFirst", "exactlyOne", "none"] as const);
      for (;;) {
        const ab = rng.int(1, 9);
        const zones: Zones = { a: rng.int(2, 16), b: rng.int(2, 16), c: 0, ab, ac: 0, bc: 0, abc: 0, out: question === "none" ? rng.int(ab, 14) : rng.int(0, 10) };
        const model: Model = { theme, sets: 2, zones, question, withTotal: question === "none" };
        if (keptWrong(model).length >= 2) return model;
      }
    }
    case 2: {
      const question = rng.pick(["onlyFirst", "onlyFirst", "union"] as const);
      for (;;) {
        const zones = threeZones(rng, rng.int(0, 10));
        const model: Model = { theme, sets: 3, zones, question, withTotal: false };
        if (keptWrong(model).length >= 3) return model;
      }
    }
    case 3: {
      const question = rng.pick(["none", "exactlyTwo"] as const);
      for (;;) {
        const inner = threeZones(rng, 0);
        // Abbastanza elementi fuori perché anche gli errori diano numeri non negativi.
        const overlap = inner.ab + inner.ac + inner.bc + 2 * inner.abc;
        const zones: Zones = { ...inner, out: overlap + rng.int(1, 9) };
        const model: Model = { theme, sets: 3, zones, question, withTotal: true };
        if (keptWrong(model).length >= 3) return model;
      }
    }
  }
}

function threeZones(rng: Rng_, out: number): Zones {
  return { a: rng.int(2, 12), b: rng.int(2, 12), c: rng.int(2, 12), ab: rng.int(1, 6), ac: rng.int(1, 6), bc: rng.int(1, 6), abc: rng.int(1, 5), out };
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

function questionText(model: Model): string {
  const { theme } = model;
  const [first] = theme.items;
  const two = model.sets === 2 ? "due" : "tre";
  const article = theme.feminine ? `delle ${two}` : `dei ${two}`;
  switch (model.question) {
    case "union":
      return `${theme.howMany} ${theme.noun} ${theme.verb} ${theme.categoryPrep}${theme.feminine ? "almeno una" : "almeno uno"} ${article} ${theme.category}?`;
    case "onlyFirst":
      return `${theme.howMany} ${theme.noun} ${theme.verb} solo ${first}?`;
    case "exactlyOne":
      return `${theme.howMany} ${theme.noun} ${theme.verb} ${theme.categoryPrep}${theme.feminine ? "una sola" : "uno solo"} ${article} ${theme.category}?`;
    case "none":
      return `${theme.howMany} ${theme.noun} non ${theme.verb} ${theme.categoryPrep}${theme.feminine ? "nessuna" : "nessuno"} ${article} ${theme.category}?`;
    case "exactlyTwo":
      return `${theme.howMany} ${theme.noun} ${theme.verb} ${theme.categoryPrep}esattamente due ${article} ${theme.category}?`;
  }
}

/** Il testo dei dati: «$15$ giocano a calcio, $10$ a pallavolo e $4$ a tutti e due». */
function dataText(model: Model): string {
  const { theme } = model;
  const d = data(model.zones);
  const [x, y, z] = theme.items;
  const both = (n: number, p: string, q: string): string => `$${n}$ ${p} e ${q}`;
  if (model.sets === 2) {
    const all = theme.feminine ? "tutte e due" : "tutti e due";
    return `$${d.sizeA}$ ${theme.verb} ${x}, $${d.sizeB}$ ${y} e $${d.AB}$ ${theme.categoryPrep}${all}`;
  }
  const allText = `${theme.feminine ? "tutte" : "tutti"} e tre ${theme.article} ${theme.category}`;
  return (
    `$${d.sizeA}$ ${theme.verb} ${x}, $${d.sizeB}$ ${y} e $${d.sizeC}$ ${z}; ` +
    `${both(d.AB, x, y)}, ${both(d.AC, x, z)}, ${both(d.BC, y, z)}; $${d.ABC}$ ${theme.categoryPrep}${allText}`
  );
}

function draftOf(model: Model): ExerciseDraft {
  const { theme, zones: z } = model;
  const d = data(z);
  const opening = model.withTotal ? `${theme.group(d.total)}, ` : `${theme.group(d.total).replace(/ di \$\d+\$ \w+| con \$\d+\$ \w+/, "")}, `;
  const prompt = `${opening}${dataText(model)}. ${questionText(model)}`;
  const correct = answerOf(model);
  const wrong: ExpectedWrong<ReturnType<typeof num>>[] = keptWrong(model).map((w) => ({ error: w.error, value: num(w.value) }));

  const [x, y, w] = model.theme.items;
  const steps: { text: string }[] = [];
  if (model.sets === 2) {
    steps.push({ text: `**Passo 1.** Nella zona comune scrivi $${d.AB}$.` });
    steps.push({ text: `**Passo 2.** Solo ${x}: $${d.sizeA} - ${d.AB} = ${z.a}$. Solo ${y}: $${d.sizeB} - ${d.AB} = ${z.b}$.` });
    const inside = z.a + z.ab + z.b;
    steps.push({
      text: model.withTotal
        ? `**Passo 3.** Dentro le linee: $${z.a} + ${z.ab} + ${z.b} = ${inside}$, cioè $${d.sizeA} + ${d.sizeB} - ${d.AB}$. Fuori: $${d.total} - ${inside} = ${z.out}$.`
        : `**Passo 3.** Dentro le linee: $${z.a} + ${z.ab} + ${z.b} = ${inside}$, cioè $${d.sizeA} + ${d.sizeB} - ${d.AB}$.`,
    });
  } else {
    steps.push({ text: `**Passo 1.** Al centro, comune a tutti e tre: $${z.abc}$.` });
    steps.push({
      text: `**Passo 2.** Le zone comuni a due insiemi soli, togliendo il centro: ${x} e ${y} $${d.AB} - ${z.abc} = ${z.ab}$; ${x} e ${w} $${d.AC} - ${z.abc} = ${z.ac}$; ${y} e ${w} $${d.BC} - ${z.abc} = ${z.bc}$.`,
    });
    steps.push({
      text: `Poi le zone «solo»: solo ${x} $${d.sizeA} - ${z.ab} - ${z.ac} - ${z.abc} = ${z.a}$; solo ${y} $${d.sizeB} - ${z.ab} - ${z.bc} - ${z.abc} = ${z.b}$; solo ${w} $${d.sizeC} - ${z.ac} - ${z.bc} - ${z.abc} = ${z.c}$.`,
    });
    const inside = z.a + z.b + z.c + z.ab + z.ac + z.bc + z.abc;
    steps.push({
      text: `**Passo 3.** Dentro le linee: $${z.a} + ${z.b} + ${z.c} + ${z.ab} + ${z.ac} + ${z.bc} + ${z.abc} = ${inside}$.${model.withTotal ? ` Fuori: $${d.total} - ${inside} = ${z.out}$.` : ""}`,
    });
  }
  const which = ((): string => {
    switch (model.question) {
      case "union":
        return `chi sta dentro almeno una linea: $${correct}$`;
      case "onlyFirst":
        return `la zona «solo ${x}»: $${correct}$`;
      case "exactlyOne":
        return `le zone «solo»: $${model.sets === 2 ? `${z.a} + ${z.b}` : `${z.a} + ${z.b} + ${z.c}`} = ${correct}$`;
      case "none":
        return `la zona fuori dalle linee: $${correct}$`;
      case "exactlyTwo":
        return `le tre zone comuni a due insiemi soli: $${z.ab} + ${z.ac} + ${z.bc} = ${correct}$`;
    }
  })();
  steps.push({ text: `La domanda chiede ${which}.` });

  return {
    prompt: `${prompt} Rispondi con un numero intero.`,
    answer: { kind: "number", correct: num(correct), wrong, mode: exact },
    steps,
    hints: [
      model.sets === 2
        ? "Disegna due linee che si sovrappongono: chi sta nella parte comune è contato in tutti e due i dati."
        : "Disegna tre linee che si sovrappongono: i dati «chi fa due cose» comprendono anche chi le fa tutte e tre.",
      "Parti dalla zona più interna, comune a tutti gli insiemi, e vai verso l'esterno togliendo ogni volta quello che hai già scritto.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Le persone una per una: per ognuna, in quali insiemi sta. */
function people(z: Zones): (readonly [boolean, boolean, boolean])[] {
  const result: (readonly [boolean, boolean, boolean])[] = [];
  const add = (count: number, inA: boolean, inB: boolean, inC: boolean): void => {
    for (let i = 0; i < count; i++) result.push([inA, inB, inC]);
  };
  add(z.a, true, false, false);
  add(z.b, false, true, false);
  add(z.c, false, false, true);
  add(z.ab, true, true, false);
  add(z.ac, true, false, true);
  add(z.bc, false, true, true);
  add(z.abc, true, true, true);
  add(z.out, false, false, false);
  return result;
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const crowd = people(model.zones);
  const count = (test: (p: readonly [boolean, boolean, boolean]) => boolean): number => crowd.filter(test).length;
  const memberships = (p: readonly [boolean, boolean, boolean]): number => p.filter(Boolean).length;
  // I dati del testo, contati sulle persone, devono essere quelli che si leggono nel testo.
  const shown = [count((p) => p[0]), count((p) => p[1]), count((p) => p[0] && p[1])];
  if (shown.some((value) => !exercise.prompt.includes(`$${value}$`))) return false;
  const expected = ((): number => {
    switch (model.question) {
      case "union":
        return count((p) => memberships(p) >= 1);
      case "onlyFirst":
        return count((p) => p[0] && !p[1] && !p[2]);
      case "exactlyOne":
        return count((p) => memberships(p) === 1);
      case "none":
        return count((p) => memberships(p) === 0);
      case "exactlyTwo":
        return count((p) => memberships(p) === 2);
    }
  })();
  return exercise.answer.kind === "number" && exercise.answer.correct.kind === "num" && exercise.answer.correct.value.eq(expected);
}

export default defineGenerator({
  code: "V1.M01.A03.g1",
  skill: "V1.M01.A03",
  lesson: "V1.M01.L03",
  title: "Contare con i diagrammi di Venn",
  levels: [1, 2, 3],
  errors: [COUNTED_TWICE, EXCLUSIVE],
  limits: { maxInteger: 120, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
