// V1.M01.A02.g1 — Operazioni tra insiemi: quale insieme è il risultato (o quale coppia sta nel prodotto).
//
// Scelta multipla: il motore non scrive insiemi di elementi né coppie, quindi le opzioni sono testi.
// Gli insiemi sono elenchi di naturali piccoli. Si sceglie l'espressione (A ∩ B, (A ∪ B) ∖ C, Ā ∩ B…),
// si calcola il risultato, e ogni opzione sbagliata è la stessa espressione con un errore tipico fatto
// davvero sugli elenchi:
// - LOG.UNIONE_INTERSEZIONE: ∪ al posto di ∩ o viceversa;
// - LOG.O_ESCLUSIVO: nell'unione restano fuori gli elementi comuni;
// - LOG.DIFFERENZA_INSIEMI: B ∖ A al posto di A ∖ B, gli elementi comuni tenuti invece che tolti, niente tolto;
// - LOG.COMPLEMENTARE: complementare dimenticato, o messo solo su una parte;
// - LOG.COPPIA_ORDINATA: nel prodotto cartesiano, coppie al contrario o con i due elementi dallo stesso insieme.
// Le opzioni che per caso coincidono con la giusta o tra loro si scartano; si estrae di nuovo finché ne
// restano almeno tre.
//
// Livello 1: un'operazione tra due insiemi (A ∩ B, A ∖ B, B ∖ A) oppure la coppia che sta in A × B.
// Livello 2: due operazioni con tre insiemi, con la parentesi ((A ∪ B) ∖ C, (A ∩ B) ∪ C, A ∪ B ∖ …).
// Livello 3: complementare nell'universo U di un'espressione (complementare dell'unione, Ā ∩ B) e la
//   coppia che sta in A × B ma non in B × A.
//
// Verifica: ricalcola l'insieme giusto elemento per elemento, decidendo per ogni naturale fino a 20 se
// sta nel risultato con la definizione delle operazioni (appartenenza), invece che con gli elenchi.

import { defineGenerator, type Exercise, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { listLatex } from "../../comuni/natural-sets";

type Rng_ = GeneratorContext["rng"];

const UNION_INTER = "LOG.UNIONE_INTERSEZIONE";
const EXCLUSIVE = "LOG.O_ESCLUSIVO";
const DIFFERENCE = "LOG.DIFFERENZA_INSIEMI";
const COMPLEMENT = "LOG.COMPLEMENTARE";
const PAIR = "LOG.COPPIA_ORDINATA";

type Name = "A" | "B" | "C";

/** Un'espressione tra insiemi. `xor` (differenza simmetrica) serve solo a fare l'errore dell'«o» esclusivo. */
type SetExpr =
  | { readonly kind: "set"; readonly name: Name }
  | { readonly kind: "union" | "inter" | "diff" | "xor"; readonly left: SetExpr; readonly right: SetExpr }
  | { readonly kind: "compl"; readonly arg: SetExpr };

const set = (name: Name): SetExpr => ({ kind: "set", name });
const union = (left: SetExpr, right: SetExpr): SetExpr => ({ kind: "union", left, right });
const inter = (left: SetExpr, right: SetExpr): SetExpr => ({ kind: "inter", left, right });
const diff = (left: SetExpr, right: SetExpr): SetExpr => ({ kind: "diff", left, right });
const xor = (left: SetExpr, right: SetExpr): SetExpr => ({ kind: "xor", left, right });
const compl = (arg: SetExpr): SetExpr => ({ kind: "compl", arg });
const A = set("A");
const B = set("B");
const C = set("C");

/** Gli insiemi dell'esercizio; `universe` c'è solo se compare il complementare. */
interface Sets {
  readonly A: readonly number[];
  readonly B: readonly number[];
  readonly C?: readonly number[];
  readonly universe?: readonly number[];
}

/** Un'opzione sbagliata: l'espressione che si calcola facendo l'errore. */
interface WrongPlan {
  readonly error: ErrorCode;
  readonly expr: SetExpr;
}

type Model =
  | { readonly kind: "operation"; readonly sets: Sets; readonly expr: SetExpr; readonly wrong: readonly WrongPlan[] }
  /** La coppia di A × B (con `notReversed`: che sta in A × B ma non in B × A) tra coppie sbagliate. */
  | {
      readonly kind: "pair";
      readonly sets: Sets;
      readonly notReversed: boolean;
      readonly correct: readonly [number, number];
      readonly wrong: readonly (readonly [number, number])[];
    };

// ───────────────────────────── calcolo con gli elenchi (per costruire) ─────────────────────────────

const sorted = (values: Iterable<number>): number[] => [...new Set(values)].sort((a, b) => a - b);

function listOf(expr: SetExpr, sets: Sets): number[] {
  switch (expr.kind) {
    case "set": {
      const values = sets[expr.name];
      if (!values) throw new Error(`insieme ${expr.name} mancante`);
      return [...values];
    }
    case "union":
      return sorted([...listOf(expr.left, sets), ...listOf(expr.right, sets)]);
    case "inter": {
      const right = listOf(expr.right, sets);
      return listOf(expr.left, sets).filter((x) => right.includes(x));
    }
    case "diff": {
      const right = listOf(expr.right, sets);
      return listOf(expr.left, sets).filter((x) => !right.includes(x));
    }
    case "xor": {
      const left = listOf(expr.left, sets);
      const right = listOf(expr.right, sets);
      return sorted([...left.filter((x) => !right.includes(x)), ...right.filter((x) => !left.includes(x))]);
    }
    case "compl": {
      const arg = listOf(expr.arg, sets);
      return (sets.universe ?? []).filter((x) => !arg.includes(x));
    }
  }
}

const same = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((x, i) => b[i] === x);

// ───────────────────────────── costruzione ─────────────────────────────

/** Un insieme di `size` naturali distinti tra 1 e max, in ordine. */
const draw = (rng: Rng_, size: number, max: number): number[] => rng.sample(Array.from({ length: max }, (_, i) => i + 1), size).sort((a, b) => a - b);

/** Le opzioni sbagliate che restano: diverse dalla giusta e tra loro. */
function keptWrong(sets: Sets, expr: SetExpr, plans: readonly WrongPlan[]): WrongPlan[] {
  const correct = listOf(expr, sets);
  const kept: WrongPlan[] = [];
  for (const plan of plans) {
    const value = listOf(plan.expr, sets);
    if (same(value, correct) || kept.some((other) => same(listOf(other.expr, sets), value))) continue;
    kept.push(plan);
  }
  return kept.slice(0, 4);
}

/** Estrae gli insiemi finché almeno tre opzioni sbagliate restano diverse. */
function operation(rng: Rng_, drawSets: () => Sets, expr: SetExpr, plans: readonly WrongPlan[]): Model {
  for (;;) {
    const sets = drawSets();
    // Il risultato non deve essere banale: vuoto o uguale a uno degli insiemi dati.
    const result = listOf(expr, sets);
    if (result.length === 0 && rng.bool(0.85)) continue;
    const wrong = keptWrong(sets, expr, plans);
    if (wrong.length >= 3) return { kind: "operation", sets, expr, wrong };
  }
}

/** Due insiemi con qualche elemento in comune e qualcuno no. */
function twoSets(rng: Rng_, max: number): Sets {
  for (;;) {
    const a = draw(rng, rng.int(3, 5), max);
    const b = draw(rng, rng.int(3, 5), max);
    const common = a.filter((x) => b.includes(x)).length;
    if (common >= 1 && common < Math.min(a.length, b.length)) return { A: a, B: b };
  }
}

function threeSets(rng: Rng_): Sets {
  const { A: a, B: b } = twoSets(rng, 9);
  return { A: a, B: b, C: draw(rng, rng.int(2, 4), 9) };
}

function withUniverse(rng: Rng_): Sets {
  const size = rng.int(7, 10);
  const universe = Array.from({ length: size }, (_, i) => i + 1);
  for (;;) {
    const a = draw(rng, rng.int(2, 4), size);
    const b = draw(rng, rng.int(2, 4), size);
    if (a.some((x) => b.includes(x)) && a.some((x) => !b.includes(x))) return { A: a, B: b, universe };
  }
}

/** Coppie: la giusta (a; b) di A × B e tre sbagliate (al contrario, o con i due elementi dallo stesso insieme). */
function pair(rng: Rng_, notReversed: boolean): Model {
  for (;;) {
    const sets = twoSets(rng, 9);
    const inProduct = (p: readonly [number, number], first: readonly number[], second: readonly number[]): boolean => first.includes(p[0]) && second.includes(p[1]);
    const inAB = (p: readonly [number, number]): boolean => inProduct(p, sets.A, sets.B);
    const inBA = (p: readonly [number, number]): boolean => inProduct(p, sets.B, sets.A);
    const all: [number, number][] = [];
    for (const x of [...sets.A, ...sets.B]) for (const y of [...sets.A, ...sets.B]) if (!all.some((p) => p[0] === x && p[1] === y)) all.push([x, y]);
    // La giusta: in A × B (e, con notReversed, non in B × A).
    const goods = all.filter((p) => inAB(p) && (!notReversed || !inBA(p)));
    // Le sbagliate: al contrario (in B × A ma non in A × B) prima, poi coppie con i due elementi da A o da B.
    // Con notReversed vale come sbagliata anche una coppia che sta in tutti e due i prodotti.
    const reversed = all.filter((p) => inBA(p) && !inAB(p));
    const sameSide = all.filter((p) => !inAB(p) && !inBA(p));
    const both = notReversed ? all.filter((p) => inAB(p) && inBA(p)) : [];
    if (goods.length === 0 || reversed.length < 2 || sameSide.length + both.length < 1) continue;
    const correct = rng.pick(goods);
    const wrong = [...rng.sample(reversed, 2), rng.pick([...sameSide, ...both])];
    return { kind: "pair", sets, notReversed, correct, wrong };
  }
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
  const two = (): Sets => twoSets(rng, 9);
  switch (rng.pick(["inter", "diffAB", "diffBA", "pair"] as const)) {
    case "inter":
      return operation(rng, two, inter(A, B), [
        { error: UNION_INTER, expr: union(A, B) },
        { error: DIFFERENCE, expr: diff(A, B) },
        { error: DIFFERENCE, expr: diff(B, A) },
      ]);
    case "diffAB":
      return operation(rng, two, diff(A, B), [
        { error: DIFFERENCE, expr: diff(B, A) },
        { error: DIFFERENCE, expr: inter(A, B) },
        { error: DIFFERENCE, expr: A },
      ]);
    case "diffBA":
      return operation(rng, two, diff(B, A), [
        { error: DIFFERENCE, expr: diff(A, B) },
        { error: DIFFERENCE, expr: inter(A, B) },
        { error: DIFFERENCE, expr: B },
      ]);
    case "pair":
      return pair(rng, false);
  }
}

function buildLevel2(rng: Rng_): Model {
  const three = (): Sets => threeSets(rng);
  switch (rng.pick(["unionMinus", "unionMinus", "interUnion", "interUnion", "unionInter", "minusUnion"] as const)) {
    case "unionMinus":
      // (A ∪ B) ∖ C
      return operation(rng, three, diff(union(A, B), C), [
        { error: EXCLUSIVE, expr: diff(xor(A, B), C) },
        { error: UNION_INTER, expr: diff(inter(A, B), C) },
        { error: DIFFERENCE, expr: diff(C, union(A, B)) },
        { error: DIFFERENCE, expr: inter(union(A, B), C) },
      ]);
    case "interUnion":
      // (A ∩ B) ∪ C
      return operation(rng, three, union(inter(A, B), C), [
        { error: UNION_INTER, expr: union(union(A, B), C) },
        { error: UNION_INTER, expr: inter(inter(A, B), C) },
        { error: EXCLUSIVE, expr: xor(inter(A, B), C) },
        { error: DIFFERENCE, expr: diff(inter(A, B), C) },
      ]);
    case "unionInter":
      // (A ∪ B) ∩ C
      return operation(rng, three, inter(union(A, B), C), [
        { error: UNION_INTER, expr: union(union(A, B), C) },
        { error: UNION_INTER, expr: inter(inter(A, B), C) },
        { error: EXCLUSIVE, expr: inter(xor(A, B), C) },
        { error: DIFFERENCE, expr: diff(union(A, B), C) },
      ]);
    case "minusUnion":
      // (A ∖ B) ∪ C
      return operation(rng, three, union(diff(A, B), C), [
        { error: DIFFERENCE, expr: union(diff(B, A), C) },
        { error: DIFFERENCE, expr: union(inter(A, B), C) },
        { error: UNION_INTER, expr: inter(diff(A, B), C) },
        { error: EXCLUSIVE, expr: xor(diff(A, B), C) },
      ]);
  }
}

function buildLevel3(rng: Rng_): Model {
  const universe = (): Sets => withUniverse(rng);
  switch (rng.pick(["complUnion", "complUnion", "complInter", "complAInterB", "complAInterB", "pair"] as const)) {
    case "complUnion":
      // complementare di A ∪ B
      return operation(rng, universe, compl(union(A, B)), [
        { error: COMPLEMENT, expr: union(compl(A), B) },
        { error: UNION_INTER, expr: compl(inter(A, B)) },
        { error: EXCLUSIVE, expr: compl(xor(A, B)) },
        { error: COMPLEMENT, expr: union(A, B) },
      ]);
    case "complInter":
      // complementare di A ∩ B
      return operation(rng, universe, compl(inter(A, B)), [
        { error: COMPLEMENT, expr: inter(compl(A), B) },
        { error: UNION_INTER, expr: compl(union(A, B)) },
        { error: COMPLEMENT, expr: inter(A, B) },
        { error: COMPLEMENT, expr: diff(union(A, B), inter(A, B)) },
      ]);
    case "complAInterB":
      // Ā ∩ B
      return operation(rng, universe, inter(compl(A), B), [
        { error: UNION_INTER, expr: union(compl(A), B) },
        { error: COMPLEMENT, expr: inter(A, B) },
        { error: COMPLEMENT, expr: compl(inter(A, B)) },
        { error: DIFFERENCE, expr: diff(A, B) },
      ]);
    case "pair":
      return pair(rng, true);
  }
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

const OPERATOR: Record<"union" | "inter" | "diff" | "xor", string> = { union: "\\cup", inter: "\\cap", diff: "\\setminus", xor: "\\triangle" };

function exprLatex(expr: SetExpr, nested = false): string {
  switch (expr.kind) {
    case "set":
      return expr.name;
    case "compl":
      return `\\overline{${exprLatex(expr.arg)}}`;
    default: {
      const body = `${exprLatex(expr.left, true)} ${OPERATOR[expr.kind]} ${exprLatex(expr.right, true)}`;
      return nested ? `(${body})` : body;
    }
  }
}

const pairLatex = (p: readonly [number, number]): string => `(${p[0]};\\ ${p[1]})`;

/** Le sottoespressioni composte, dalla più interna: ognuna diventa un passaggio. */
function parts(expr: SetExpr): SetExpr[] {
  switch (expr.kind) {
    case "set":
      return [];
    case "compl":
      return [...parts(expr.arg), expr];
    default:
      return [...parts(expr.left), ...parts(expr.right), expr];
  }
}

function stepFor(expr: SetExpr, sets: Sets): string {
  const result = listLatex(listOf(expr, sets));
  switch (expr.kind) {
    case "set":
      return "";
    case "union":
      return `$${exprLatex(expr)}$: gli elementi che stanno in almeno uno dei due, compresi quelli comuni. $${exprLatex(expr)} = ${result}$.`;
    case "inter":
      return `$${exprLatex(expr)}$: gli elementi che stanno in tutti e due. $${exprLatex(expr)} = ${result}$.`;
    case "diff":
      return `$${exprLatex(expr)}$: si parte da $${exprLatex(expr.left, true)} = ${listLatex(listOf(expr.left, sets))}$ e si tolgono gli elementi che stanno anche in $${exprLatex(expr.right, true)}$. $${exprLatex(expr)} = ${result}$.`;
    case "xor":
      return `$${exprLatex(expr)} = ${result}$.`;
    case "compl":
      return `$${exprLatex(expr)}$: si parte da tutto $U$ e si tolgono gli elementi di $${exprLatex(expr.arg, true)} = ${listLatex(listOf(expr.arg, sets))}$. $${exprLatex(expr)} = ${result}$.`;
  }
}

function setsLatex(sets: Sets): string {
  const named = [`$A = ${listLatex(sets.A)}$`, `$B = ${listLatex(sets.B)}$`, ...(sets.C ? [`$C = ${listLatex(sets.C)}$`] : [])];
  const list = named.length === 2 ? `${named[0]} e ${named[1]}` : `${named[0]}, ${named[1]} e ${named[2]}`;
  return sets.universe ? `Nell'insieme universo $U = ${listLatex(sets.universe)}$ siano ${list}.` : `Siano ${list}.`;
}

function draftOf(model: Model): ExerciseDraft {
  if (model.kind === "pair") {
    const { sets, correct } = model;
    const question = model.notReversed ? "Quale coppia appartiene ad $A \\times B$ ma non a $B \\times A$?" : "Quale coppia appartiene ad $A \\times B$?";
    const wrong: ExpectedWrong<string>[] = model.wrong.map((p) => ({ error: PAIR, value: `$${pairLatex(p)}$` }));
    const steps = [
      { text: `In $A \\times B$ il primo elemento di ogni coppia sta in $A = ${listLatex(sets.A)}$, il secondo in $B = ${listLatex(sets.B)}$.` },
      { text: `$${pairLatex(correct)}$: $${correct[0]} \\in A$ e $${correct[1]} \\in B$, quindi $${pairLatex(correct)} \\in A \\times B$.` },
      ...(model.notReversed ? [{ text: `In $B \\times A$ il primo elemento dovrebbe stare in $B$, e $${correct[0]} \\notin B$: la coppia non sta in $B \\times A$.` }] : []),
      ...model.wrong.map((p) => {
        const why = !sets.A.includes(p[0]) ? `$${p[0]} \\notin A$` : !sets.B.includes(p[1]) ? `$${p[1]} \\notin B$` : `sta anche in $B \\times A$, perché $${p[0]} \\in B$ e $${p[1]} \\in A$`;
        return { text: `$${pairLatex(p)}$ non va bene: ${why}.` };
      }),
    ];
    return {
      prompt: `${setsLatex(sets)} ${question}`,
      answer: { kind: "choice", correct: `$${pairLatex(correct)}$`, wrong },
      steps,
      hints: ["In una coppia di $A \\times B$, da quale insieme viene il primo elemento? E il secondo?", "Per ogni coppia controlla prima il primo elemento, poi il secondo."],
    };
  }
  const { sets, expr } = model;
  const result = listOf(expr, sets);
  const steps = parts(expr).map((part) => ({ text: stepFor(part, sets) }));
  steps.push({ text: `Quindi $${exprLatex(expr)} = ${listLatex(result)}$.` });
  const compound = parts(expr).length > 1;
  return {
    prompt: `${setsLatex(sets)} Quale insieme è $${exprLatex(expr)}$?`,
    answer: {
      kind: "choice",
      correct: `$${listLatex(result)}$`,
      wrong: model.wrong.map((plan) => ({ error: plan.error, value: `$${listLatex(listOf(plan.expr, sets))}$` })),
    },
    steps,
    hints: compound
      ? ["C'è più di un'operazione: quale va fatta per prima?", "Calcola prima quello che sta tra parentesi (o sotto la lineetta del complementare) e scrivilo per elencazione; poi fai l'ultima operazione."]
      : ["Ripeti la definizione del simbolo: quali elementi tiene?", "Prendi gli elementi uno per uno e chiediti in quale dei due insiemi stanno."],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

/** Vero se x sta nel risultato, dalla definizione delle operazioni (appartenenza). */
function contains(expr: SetExpr, sets: Sets, x: number): boolean {
  switch (expr.kind) {
    case "set":
      return (sets[expr.name] ?? []).includes(x);
    case "union":
      return contains(expr.left, sets, x) || contains(expr.right, sets, x);
    case "inter":
      return contains(expr.left, sets, x) && contains(expr.right, sets, x);
    case "diff":
      return contains(expr.left, sets, x) && !contains(expr.right, sets, x);
    case "xor":
      return contains(expr.left, sets, x) !== contains(expr.right, sets, x);
    case "compl":
      return (sets.universe ?? []).includes(x) && !contains(expr.arg, sets, x);
  }
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "choice") return false;
  if (model.kind === "pair") {
    const [a, b] = model.correct;
    const ok = model.sets.A.includes(a) && model.sets.B.includes(b) && (!model.notReversed || !(model.sets.B.includes(a) && model.sets.A.includes(b)));
    const wrongOk = model.wrong.every(([x, y]) => !(model.sets.A.includes(x) && model.sets.B.includes(y)) || (model.notReversed && model.sets.B.includes(x) && model.sets.A.includes(y)));
    return ok && wrongOk && exercise.answer.correct === `$${pairLatex(model.correct)}$`;
  }
  const members: number[] = [];
  for (let x = 0; x <= 20; x++) if (contains(model.expr, model.sets, x)) members.push(x);
  return exercise.answer.correct === `$${listLatex(members)}$`;
}

export default defineGenerator({
  code: "V1.M01.A02.g1",
  skill: "V1.M01.A02",
  lesson: "V1.M01.L02",
  title: "Operazioni tra insiemi",
  levels: [1, 2, 3],
  errors: [UNION_INTER, EXCLUSIVE, DIFFERENCE, COMPLEMENT, PAIR],
  limits: { maxInteger: 20, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
