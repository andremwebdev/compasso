// V1.M05.A05.g1 — Equazioni fratte con le condizioni di esistenza (risposta: insieme).
//
// Costruzione all'indietro: si scelgono prima i valori esclusi (gli zeri dei denominatori) e le
// soluzioni dell'equazione intera che si ottiene togliendo i denominatori, comprese quelle da
// scartare; poi i numeratori, ricavati perché l'equazione intera abbia proprio quelle soluzioni.
//
// Livello 1: (x + a)/(x − p) = k oppure a/(x − p) = b/(x − q): l'equazione intera è di primo grado.
// Livello 2: una differenza di frazioni con denominatori x − p e m(x − p), oppure
//            x/(x − p) + B/(x − q) = C/((x − p)(x − q)) con una soluzione da scartare.
// Livello 3: la stessa forma con tutte e due le soluzioni da scartare (impossibile) o tutte e due buone.
//
// Errori tipici, rifatti sui numeri:
//   COND.DENOMINATORE               tiene le soluzioni che annullano un denominatore (tutte, o una sola delle escluse);
//   CALC.MENO_PARENTESI             il meno davanti a una frazione cambia segno solo al primo termine del numeratore;
//   ALG.TERMINE_SENZA_DENOMINATORE  il termine senza frazione non si moltiplica per il denominatore comune;
//   CALC.SEGNO_TRASPORTO            un termine passa all'altro membro senza cambiare segno;
//   ALG.COEFFICIENTE_INVERTITO      da ax = b scrive x = a/b;
//   ALG.FORMULA_RISOLUTIVA          nell'equazione intera di secondo grado usa b al posto di −b.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upAdd, upMul, upoly, upScale, upSub, type UPoly } from "../../../motore/algebra/upoly";
import { add, div, mul, neg, num, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { cleanSurds, pointSet, sameSet, satisfies, solutionsFromCandidates, step, surdLatex } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M05.A05.g1";
type Rng_ = GeneratorContext["rng"];
const x = sym("x");

type Model =
  | { readonly kind: "constant"; readonly a: number; readonly p: number; readonly k: number }
  | { readonly kind: "cross"; readonly a: number; readonly p: number; readonly b: number; readonly q: number }
  | { readonly kind: "difference"; readonly A: number; readonly p: number; readonly m: number; readonly b: number; readonly c: number }
  | { readonly kind: "pair"; readonly p: number; readonly q: number; readonly B: number; readonly C: number };

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const RANGE = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** x/(x − p) + B/(x − q) = C/((x − p)(x − q)): togliendo i denominatori x(x − q) + B(x − p) = C,
 *  che ha soluzioni r1 e r2 quando B = q − r1 − r2 e C = r1·r2 − B·p… ricavato da somma e prodotto. */
function pair(p: number, q: number, r1: number, r2: number): Model | null {
  // x² + (B − q)x − Bp − C = 0 con somma r1 + r2 e prodotto r1·r2.
  const B = q - r1 - r2;
  const C = -B * p - r1 * r2;
  if (B === 0 || C === 0) return null;
  return { kind: "pair", p, q, B, C };
}

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    let model: Model;
    if (rng.bool()) {
      const [p, s] = rng.sample(RANGE, 2) as [number, number];
      const k = rng.pick([-3, -2, 2, 3, 4]);
      model = { kind: "constant", a: k * (s - p) - s, p, k };
    } else {
      const [p, q, s] = rng.sample([...RANGE, 0], 3) as [number, number, number];
      const g = gcd(s - p, s - q);
      const sign = s - p < 0 && s - q < 0 ? -1 : 1;
      model = { kind: "cross", a: (sign * (s - p)) / g, p, b: (sign * (s - q)) / g, q };
    }
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    let model: Model | null;
    if (rng.bool()) {
      const p = rng.pick([0, 0, ...RANGE]);
      const m = rng.pick([2, 3]);
      const s = rng.intExcept(-6, 6, [p]);
      const A = rng.intExcept(-5, 5);
      const c = rng.intExcept(-3, 3);
      model = { kind: "difference", A, p, m, b: m * A - s - c * m * (s - p), c };
    } else {
      // Una soluzione buona e una che annulla x − p.
      const [p, q, s] = rng.sample(RANGE, 3) as [number, number, number];
      model = pair(p, q, s, p);
    }
    if (model && acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const [p, q, s, t] = rng.sample(RANGE, 4) as [number, number, number, number];
    const model = rng.bool(0.4) ? pair(p, q, p, q) : rng.bool() ? pair(p, q, s, t) : pair(p, q, s, p);
    if (model && acceptable(model, 3)) return model;
  }
}

function acceptable(model: Model, minimumWrong: number): boolean {
  const numbers = Object.values(model).filter((value): value is number => typeof value === "number");
  if (numbers.some((value) => Math.abs(value) > 30)) return false;
  return wrongAnswers(model, answerOf(model)).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── equazione intera, soluzioni giuste e sbagliate ─────────────────────────────

/** x − r come polinomio. */
const lin = (r: number): UPoly => upoly(-r, 1);

/** I valori esclusi (zeri dei denominatori). */
function excluded(model: Model): number[] {
  switch (model.kind) {
    case "constant":
    case "difference":
      return [model.p];
    case "cross":
    case "pair":
      return [model.p, model.q];
  }
}

/** Le varianti dell'equazione intera «primo membro − secondo membro = 0» dopo aver tolto i denominatori. */
interface Cleared {
  readonly correct: UPoly;
  readonly minus?: UPoly;
  readonly forgotten?: UPoly;
  readonly transported?: UPoly;
}

function cleared(model: Model): Cleared {
  switch (model.kind) {
    case "constant": {
      // x + a = k(x − p)
      const { a, p, k } = model;
      const left = upoly(a, 1);
      const right = upScale(lin(p), k);
      return {
        correct: upSub(left, right),
        // k(x − p) con k negativo: −|k|x − |k|p invece di −|k|x + |k|p.
        minus: k < 0 ? upSub(left, upoly(k * p, k)) : undefined,
        forgotten: upSub(left, upoly(k)),
        // kx portato a sinistra senza cambiare segno: x + kx + a = −kp.
        transported: upoly(a + k * p, 1 + k),
      };
    }
    case "cross": {
      // a(x − q) = b(x − p)
      const { a, p, b, q } = model;
      const left = upScale(lin(q), a);
      const right = upScale(lin(p), b);
      return { correct: upSub(left, right), transported: upoly(b * p - a * q, a + b) };
    }
    case "difference": {
      // m·A − (x + b) = c·m(x − p)
      const { A, p, m, b, c } = model;
      const left = upoly(m * A - b, -1);
      const right = upScale(lin(p), c * m);
      return {
        correct: upSub(left, right),
        minus: upSub(upoly(m * A + b, -1), right),
        forgotten: upSub(left, upoly(c)),
        transported: upoly(m * A - b + c * m * p, -1 + c * m),
      };
    }
    case "pair": {
      // x(x − q) + B(x − p) = C
      const { p, q, B, C } = model;
      const left = upAdd(upMul(upoly(0, 1), lin(q)), upScale(lin(p), B));
      return {
        correct: upSub(left, upoly(C)),
        minus: B < 0 ? upSub(upAdd(upMul(upoly(0, 1), lin(q)), upoly(B * p, B)), upoly(C)) : undefined,
        transported: upAdd(left, upoly(C)),
      };
    }
  }
}

/** Gli zeri reali di un polinomio di grado 1 o 2 (esatti); null se è costante. */
function zerosOf(p: UPoly): Surd[] | null {
  if (p.length === 2) return [Surd.from((p[0] as Rational).neg().div(p[1] as Rational))];
  if (p.length !== 3) return null;
  const [c, b, a] = p as [Rational, Rational, Rational];
  const delta = b.mul(b).sub(a.mul(c).mul(4));
  if (delta.sign() < 0) return [];
  const center = Surd.from(b.neg().div(a.mul(2)));
  const offset = Surd.sqrt(delta).div(a.mul(2).abs());
  return [center.sub(offset), center.add(offset)];
}

/** Toglie i valori esclusi. */
const withoutExcluded = (model: Model, values: readonly Surd[]): Surd[] => values.filter((v) => !excluded(model).some((e) => v.eq(e)));

function answerOf(model: Model): RealSet {
  return pointSet(withoutExcluded(model, zerosOf(cleared(model).correct) ?? []));
}

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const candidates: (ExpectedWrong<SolutionSet> | null)[] = [];
  const add = (error: ExpectedWrong<SolutionSet>["error"], values: readonly Surd[] | null): void => {
    candidates.push(values && cleanSurds(values, 40, 12) ? { error, value: pointSet(values) } : null);
  };
  const forms = cleared(model);
  const roots = zerosOf(forms.correct) ?? [];
  const bad = excluded(model).filter((e) => roots.some((r) => r.eq(e)));
  // Le soluzioni che annullano un denominatore non scartate: tutte, oppure una sola delle due.
  if (bad.length > 0) add("COND.DENOMINATORE", roots);
  if (bad.length === 2) for (const kept of bad) add("COND.DENOMINATORE", roots.filter((r) => !r.eq(bad.find((b) => b !== kept) as number)));
  const solve = (p: UPoly | undefined): Surd[] | null => {
    const z = p && zerosOf(p);
    return z ? withoutExcluded(model, z) : null;
  };
  add("CALC.MENO_PARENTESI", solve(forms.minus));
  add("ALG.TERMINE_SENZA_DENOMINATORE", solve(forms.forgotten));
  add("CALC.SEGNO_TRASPORTO", solve(forms.transported));
  if (forms.correct.length === 3) {
    const [c, b, a] = forms.correct as [Rational, Rational, Rational];
    add("ALG.FORMULA_RISOLUTIVA", solve(upoly(c, b.neg(), a)));
  } else if (forms.correct.length === 2) {
    const value = (forms.correct[0] as Rational).neg().div(forms.correct[1] as Rational);
    if (!value.isZero()) add("ALG.COEFFICIENTE_INVERTITO", withoutExcluded(model, [Surd.from(value.inv())]));
  }
  return distinctWrongSets(correct, candidates);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

const xm = (r: number): Expr => (r === 0 ? x : add(x, num(-r)));
const poly = (p: UPoly): Expr => upolyToExpr(p);

/** I due membri come si scrivono nel testo. */
function sides(model: Model): { left: Expr; right: Expr } {
  switch (model.kind) {
    case "constant":
      return { left: div(poly(upoly(model.a, 1)), xm(model.p)), right: num(model.k) };
    case "cross":
      return { left: signedFraction(model.a, xm(model.p)), right: signedFraction(model.b, xm(model.q)) };
    case "difference": {
      const { A, p, m, b, c } = model;
      return { left: add(signedFraction(A, xm(p)), neg(div(poly(upoly(b, 1)), poly(upScale(lin(p), m))))), right: num(c) };
    }
    case "pair": {
      const { p, q, B, C } = model;
      return {
        left: add(div(x, xm(p)), signedFraction(B, xm(q))),
        right: signedFraction(C, poly(upMul(lin(p), lin(q)))),
      };
    }
  }
}

/** a/d con il meno davanti alla frazione. */
const signedFraction = (a: number, d: Expr): Expr => (a < 0 ? neg(div(-a, d)) : div(a, d));

const display = (expr: Expr): string => toLatex(expr).replace(/\\frac/g, "\\dfrac");

function commonDenominator(model: Model): string {
  switch (model.kind) {
    case "constant":
      return toLatex(xm(model.p));
    case "difference":
      return toLatex(poly(upScale(lin(model.p), model.m)));
    case "cross":
    case "pair":
      return `\\left(${toLatex(xm(model.p))}\\right)\\left(${toLatex(xm(model.q))}\\right)`;
  }
}

/** L'equazione intera com'è scritta subito dopo aver tolto i denominatori. */
function clearedLatex(model: Model): string {
  const paren = (e: Expr): string => `\\left(${toLatex(e)}\\right)`;
  switch (model.kind) {
    case "constant":
      return `${toLatex(poly(upoly(model.a, 1)))} = ${model.k}${paren(xm(model.p))}`;
    case "cross":
      return `${model.a}${paren(xm(model.q))} = ${model.b}${paren(xm(model.p))}`;
    case "difference": {
      const { A, p, m, b, c } = model;
      return `${m * A} - ${paren(poly(upoly(b, 1)))} = ${c * m}${paren(xm(p))}`;
    }
    case "pair":
      return `x${paren(xm(model.q))} ${model.B < 0 ? "-" : "+"} ${Math.abs(model.B)}${paren(xm(model.p))} = ${model.C}`;
  }
}

/** Vero se nel testo c'è una frazione con il meno davanti e più termini al numeratore (o un numero negativo davanti a una parentesi). */
function hasMinus(model: Model): boolean {
  switch (model.kind) {
    case "constant":
      return model.k < 0;
    case "cross":
      return model.a < 0 || model.b < 0;
    case "difference":
      return true;
    case "pair":
      return model.B < 0;
  }
}

function stepsOf(model: Model, correct: RealSet): SolutionStep[] {
  const bad = excluded(model);
  const forms = cleared(model);
  const roots = zerosOf(forms.correct) ?? [];
  const factored = model.kind === "pair" ? ` Il denominatore $${toLatex(poly(upMul(lin(model.p), lin(model.q))))}$ si scompone: $${commonDenominator(model)}$.` : model.kind === "difference" && model.p !== 0 ? ` Il denominatore $${toLatex(poly(upScale(lin(model.p), model.m)))} = ${model.m}\\left(${toLatex(xm(model.p))}\\right)$.` : "";
  const ce = [...new Set(bad)].sort((u, v) => u - v).map((value) => `x \\ne ${value}`).join(", \\ ");
  const result: SolutionStep[] = [
    step(`**Passo 1.** Condizioni di esistenza: nessun denominatore può valere zero.${factored}`, ce),
    step(
      `**Passo 2.** Moltiplica i due membri, termine per termine, per il denominatore comune $${commonDenominator(model)}$.${hasMinus(model) ? " Il numeratore della frazione con il meno davanti resta tra parentesi." : ""}`,
      `${clearedLatex(model)} \\quad\\Longrightarrow\\quad ${toLatex(poly(forms.correct))} = 0`,
    ),
  ];
  const rootsLatex = roots.map((r) => `x = ${surdLatex(r)}`).join(" \\quad ");
  result.push(
    step(
      forms.correct.length === 3
        ? `**Passo 3.** Risolvi l'equazione intera di secondo grado: le soluzioni hanno somma $${toLatex(num((forms.correct[1] as Rational).neg()))}$ e prodotto $${toLatex(num(forms.correct[0] as Rational))}$ (oppure usa la formula risolutiva).`
        : `**Passo 3.** Risolvi l'equazione intera di primo grado.`,
      rootsLatex,
    ),
  );
  const discarded = roots.filter((r) => bad.some((e) => r.eq(e)));
  result.push(
    step(
      discarded.length === 0
        ? "**Passo 4.** Confronta con le condizioni di esistenza: nessuna soluzione annulla un denominatore, quindi vanno tutte bene."
        : discarded.length === roots.length
          ? `**Passo 4.** Confronta con le condizioni di esistenza: ${discarded.map((r) => `$x = ${surdLatex(r)}$`).join(" e ")} ${discarded.length === 1 ? "annulla" : "annullano"} un denominatore e si scartano. Non resta niente: l'equazione è impossibile.`
          : `**Passo 4.** Confronta con le condizioni di esistenza: $x = ${surdLatex(discarded[0] as Surd)}$ annulla un denominatore e si scarta.`,
      `S = ${setToLatex(correct)}`,
    ),
  );
  return result;
}

function draftOf(model: Model): ExerciseDraft {
  const correct = answerOf(model);
  const { left, right } = sides(model);
  return {
    prompt: `Risolvi l'equazione $${display(left)} = ${display(right)}$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: stepsOf(model, correct),
    hints: [
      "È un'equazione fratta: l'incognita sta in un denominatore. Che cosa scrivi prima di toccare i denominatori?",
      "Scrivi le condizioni di esistenza, poi moltiplica per il denominatore comune e risolvi. Alla fine scarta le soluzioni escluse; se non ne resta nessuna, $S = \\emptyset$. Più soluzioni si scrivono $x = 1 \\vee x = -2$.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

/** Il prodotto dei denominatori del testo (non il minimo comune multiplo: va bene lo stesso). */
function denominators(model: Model): Expr {
  switch (model.kind) {
    case "constant":
    case "difference":
      return xm(model.p);
    case "cross":
      return mul(xm(model.p), xm(model.q));
    case "pair":
      return mul(xm(model.p), xm(model.q));
  }
}

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A05",
  lesson: "V1.M05.L05",
  title: "Equazioni fratte",
  levels: [1, 2, 3],
  errors: ["COND.DENOMINATORE", "CALC.MENO_PARENTESI", "ALG.TERMINE_SENZA_DENOMINATORE", "CALC.SEGNO_TRASPORTO", "ALG.COEFFICIENTE_INVERTITO", "ALG.FORMULA_RISOLUTIVA"],
  limits: { maxInteger: 40, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal testo: (primo membro − secondo membro) per il prodotto dei denominatori, sviluppato dal
    // motore; dei suoi zeri restano quelli in cui l'equazione scritta esiste ed è vera.
    const { left, right } = sides(model);
    const found = solutionsFromCandidates([mul(denominators(model), add(left, neg(right)))], (value) => satisfies(left, right, value));
    return found !== null && sameSet(found, answer.correct);
  },
});
