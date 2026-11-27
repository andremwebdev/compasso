// V1.M05.A06.g1 — Equazioni irrazionali con una o due radici quadrate, con la verifica (risposta: insieme).
//
// Costruzione all'indietro. Per √R + c = L, con la radice isolata √R = B (B = L − c, di primo grado):
// si scelgono B e le due candidate r₁, r₂, poi R = B² − k(x − r₁)(x − r₂), così l'equazione elevata
// al quadrato, B² − R = 0, ha proprio quelle candidate. Una candidata è buona se B(r) ≥ 0, estranea se
// B(r) < 0. Per √R₁ = √R₂ si sceglie la soluzione di R₁ = R₂ e il segno dei radicandi lì.
//
// Livello 1: √(ax + b) = x + d, una candidata buona e una estranea.
// Livello 2: √R + c = L (la radice va isolata), con una o due candidate buone; √(ax + b) = √(cx + d).
// Livello 3: radicando di secondo grado; tutte e due le candidate estranee (impossibile);
//            √R₁ = √R₂ con i radicandi negativi nella soluzione (impossibile).
//
// Errori tipici, rifatti sui numeri:
//   COND.SOLUZIONI_ESTRANEE   tiene tutte le candidate, senza verificarle;
//   ALG.QUADRATO_BINOMIO      (x + d)² = x² + d², oppure (√R + c)² = R + c² senza isolare la radice;
//   CALC.SEGNO_TRASPORTO      isolando la radice, c passa dall'altra parte senza cambiare segno;
//   COND.RADICE_PARI          in √R₁ = √R₂ tiene la soluzione anche se i radicandi sono negativi;
//   ALG.COEFFICIENTE_INVERTITO in R₁ = R₂, da ax = b scrive x = a/b.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upAdd, upMul, upoly, upScale, upSub, upEval, type UPoly } from "../../../motore/algebra/upoly";
import { add, num, pow, sqrt, sub, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { cleanSurds, pointSet, sameSet, satisfies, solutionsFromCandidates, step, surdLatex } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M05.A06.g1";
type Rng_ = GeneratorContext["rng"];

type Model =
  | {
      readonly kind: "one";
      /** Il radicando R. */
      readonly radicand: UPoly;
      /** Il numero c accanto alla radice nel primo membro (0 se la radice è già sola). */
      readonly c: number;
      /** Il secondo membro L = B + c, di primo grado. */
      readonly right: UPoly;
    }
  | { readonly kind: "two"; readonly r1: UPoly; readonly r2: UPoly };

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const RANGE = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const lin = (r: number): UPoly => upoly(-r, 1);

/** Il modello √R + c = B + c con candidate r₁, r₂ (R = B² − k(x − r₁)(x − r₂)). */
function oneRoot(B: UPoly, r1: number, r2: number, k: number, c: number): Model {
  const radicand = upSub(upMul(B, B), upScale(upMul(lin(r1), lin(r2)), k));
  return { kind: "one", radicand, c, right: upAdd(B, upoly(c)) };
}

/** B(r) ≥ 0: la candidata è buona. */
const good = (B: UPoly, r: number): boolean => upEval(B, r).sign() >= 0;

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const d = rng.int(-4, 4);
    const B = upoly(d, 1);
    const [r1, r2] = rng.sample(RANGE, 2) as [number, number];
    if (!(good(B, r1) && !good(B, r2))) continue;
    const model = oneRoot(B, r1, r2, 1, 0);
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    let model: Model;
    if (rng.bool(0.3)) {
      model = twoRoots(rng, true);
    } else {
      const m = rng.pick([1, 1, -1]);
      const B = upoly(rng.int(-4, 4), m);
      const [r1, r2] = rng.sample(RANGE, 2) as [number, number];
      // Almeno una candidata buona: una e una, oppure tutte e due.
      if (!good(B, r1)) continue;
      model = oneRoot(B, r1, r2, 1, rng.intExcept(-4, 4));
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["quadratic", "quadratic", "noneGood", "twoBad"] as const);
    let model: Model;
    if (shape === "twoBad") {
      model = twoRoots(rng, false);
    } else {
      const m = rng.pick([1, 1, -1]);
      const B = upoly(rng.int(-4, 4), m);
      const [r1, r2] = rng.sample(RANGE, 2) as [number, number];
      if (shape === "noneGood" && (good(B, r1) || good(B, r2))) continue;
      if (shape === "quadratic" && !good(B, r1)) continue;
      // Con k ≠ 1 il radicando resta di secondo grado.
      const k = shape === "quadratic" ? rng.pick([-1, 2, -2]) : 1;
      model = oneRoot(B, r1, r2, k, rng.pick([0, 0, rng.intExcept(-4, 4)]));
    }
    if (acceptable(model, 3)) return model;
  }
}

/** √(ax + b) = √(cx + d) con soluzione s; con ok vero i radicandi in s sono positivi o nulli, altrimenti negativi. */
function twoRoots(rng: Rng_, ok: boolean): Model {
  for (;;) {
    const s = rng.intExcept(-6, 6, []);
    const value = ok ? rng.int(0, 9) : -rng.int(1, 9);
    const [a, c] = rng.sample([-3, -2, -1, 1, 2, 3, 4], 2) as [number, number];
    const r1 = upoly(value - a * s, a);
    const r2 = upoly(value - c * s, c);
    if (r1.length < 2 || r2.length < 2 || (r1[0] as Rational).isZero() || (r2[0] as Rational).isZero()) continue;
    return { kind: "two", r1, r2 };
  }
}

function acceptable(model: Model, minimumWrong: number): boolean {
  const coefficients = model.kind === "one" ? [...model.radicand, ...model.right] : [...model.r1, ...model.r2];
  if (coefficients.some((value) => value.abs().cmp(40) > 0)) return false;
  // Il radicando deve contenere la x e non essere un quadrato già pronto.
  if (model.kind === "one" && model.radicand.length < 2) return false;
  return wrongAnswers(model, answerOf(model)).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── candidate, soluzioni giuste e sbagliate ─────────────────────────────

/** Gli zeri reali di un polinomio di grado 1 o 2. */
function zerosOf(p: UPoly): Surd[] {
  if (p.length === 2) return [Surd.from((p[0] as Rational).neg().div(p[1] as Rational))];
  if (p.length !== 3) return [];
  const [c, b, a] = p as [Rational, Rational, Rational];
  const delta = b.mul(b).sub(a.mul(c).mul(4));
  if (delta.sign() < 0) return [];
  const center = Surd.from(b.neg().div(a.mul(2)));
  const offset = Surd.sqrt(delta).div(a.mul(2).abs());
  return [center.sub(offset), center.add(offset)];
}

/** Il valore esatto di un polinomio in un numero con radici. */
const at = (p: UPoly, v: Surd): Surd => p.reduceRight<Surd>((acc, coefficient) => acc.mul(v).add(coefficient), Surd.ZERO);

/** B = L − c, il membro con cui si confronta la radice isolata. */
const isolated = (model: Extract<Model, { kind: "one" }>): UPoly => upSub(model.right, upoly(model.c));

function answerOf(model: Model): RealSet {
  if (model.kind === "two") {
    return pointSet(zerosOf(upSub(model.r1, model.r2)).filter((v) => at(model.r1, v).sign() >= 0));
  }
  const B = isolated(model);
  return pointSet(zerosOf(upSub(upMul(B, B), model.radicand)).filter((v) => at(B, v).sign() >= 0));
}

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const candidates: (ExpectedWrong<SolutionSet> | null)[] = [];
  const add = (error: ExpectedWrong<SolutionSet>["error"], values: readonly Surd[]): void => {
    candidates.push(cleanSurds(values, 40, 12) ? { error, value: pointSet(values) } : null);
  };
  if (model.kind === "two") {
    const difference = upSub(model.r1, model.r2);
    add("COND.RADICE_PARI", zerosOf(difference));
    // R₁ = R₂ risolta con un errore: (a − c)x = d − b con il termine noto non cambiato di segno, oppure x = (a − c)/(d − b).
    const [b0, a1] = model.r1 as [Rational, Rational];
    const [d0, c1] = model.r2 as [Rational, Rational];
    const valid = (vs: Surd[]): Surd[] => vs.filter((v) => at(model.r1, v).sign() >= 0 && at(model.r2, v).sign() >= 0);
    add("CALC.SEGNO_TRASPORTO", valid([Surd.from(d0.add(b0).div(a1.sub(c1)))]));
    const top = d0.sub(b0);
    if (!top.isZero()) add("ALG.COEFFICIENTE_INVERTITO", valid([Surd.from(a1.sub(c1).div(top))]));
    return distinctWrongSets(correct, candidates);
  }
  const B = isolated(model);
  const candidatesOf = (rhs: UPoly, lhs: UPoly = model.radicand): Surd[] => zerosOf(upSub(rhs, lhs));
  // Nessuna verifica: tutte le candidate.
  add("COND.SOLUZIONI_ESTRANEE", candidatesOf(upMul(B, B)));
  // Quadrato senza doppio prodotto: (mx + b)² = m²x² + b²; poi le candidate con B ≥ 0.
  const [b0, m] = B as [Rational, Rational];
  const sloppySquare = upoly(b0.mul(b0), 0, m.mul(m));
  add("ALG.QUADRATO_BINOMIO", candidatesOf(sloppySquare).filter((v) => at(B, v).sign() >= 0));
  if (model.c !== 0) {
    // Elevato al quadrato senza isolare: R + c² = L², con le candidate per cui L ≥ 0.
    const L = model.right;
    add("ALG.QUADRATO_BINOMIO", candidatesOf(upMul(L, L), upAdd(model.radicand, upoly(model.c * model.c))).filter((v) => at(L, v).sign() >= 0));
    // Isolando la radice, c passa senza cambiare segno: √R = L + c.
    const wrongB = upAdd(model.right, upoly(model.c));
    add("CALC.SEGNO_TRASPORTO", candidatesOf(upMul(wrongB, wrongB)).filter((v) => at(wrongB, v).sign() >= 0));
  }
  return distinctWrongSets(correct, candidates);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

const poly = (p: UPoly): Expr => upolyToExpr(p);

function sides(model: Model): { left: Expr; right: Expr } {
  if (model.kind === "two") return { left: sqrt(poly(model.r1)), right: sqrt(poly(model.r2)) };
  const root = sqrt(poly(model.radicand));
  return { left: model.c === 0 ? root : add(root, num(model.c)), right: poly(model.right) };
}

/** Il polinomio diviso per il massimo comune divisore dei coefficienti, con il primo coefficiente positivo. */
function tidied(p: UPoly): { poly: UPoly; factor: Rational } {
  const g = p.reduce((acc, c) => gcdInt(acc, Math.abs(c.toInteger())), 0);
  const lead = p[p.length - 1] as Rational;
  const factor = Rational.of(lead.sign() < 0 ? -g : g);
  return { poly: upScale(p, factor.inv()), factor };
}

function gcdInt(a: number, b: number): number {
  return b === 0 ? a : gcdInt(b, a % b);
}

function stepsOf(model: Model, correct: RealSet): SolutionStep[] {
  const final = `S = ${setToLatex(correct)}`;
  const listOf = (values: readonly Surd[]): string => values.map((v) => `$x = ${surdLatex(v)}$`).join(" e ");
  if (model.kind === "two") {
    const difference = upSub(model.r1, model.r2);
    const [s] = zerosOf(difference) as [Surd];
    const v1 = at(model.r1, s);
    return [
      step("**Passo 1 e passo 2.** Le radici sono già sole: eleva al quadrato e uguaglia i radicandi.", `${toLatex(poly(model.r1))} = ${toLatex(poly(model.r2))}`),
      step("**Passo 3.** È di primo grado.", `x = ${surdLatex(s)}`),
      step(
        v1.sign() >= 0
          ? `**Passo 4.** Verifica: con $x = ${surdLatex(s)}$ i due radicandi valgono $${surdLatex(v1)}$, che non è negativo: le due radici esistono e sono uguali.`
          : `**Passo 4.** Verifica: con $x = ${surdLatex(s)}$ i due radicandi valgono $${surdLatex(v1)}$, negativo: le radici non esistono. La candidata si scarta e l'equazione è impossibile.`,
        final,
      ),
    ];
  }
  const B = isolated(model);
  const squared = upMul(B, B);
  const P = upSub(squared, model.radicand);
  const zeros = zerosOf(P);
  const result: SolutionStep[] = [];
  result.push(
    model.c === 0
      ? step("**Passo 1.** La radice è già sola nel primo membro.")
      : step(`**Passo 1.** Isola la radice: porta $${model.c}$ al secondo membro, cambiando segno.`, `${toLatex(sqrt(poly(model.radicand)))} = ${toLatex(poly(B))}`),
  );
  result.push(
    step(
      "**Passo 2.** Eleva al quadrato i due membri. Il quadrato del binomio ha il doppio prodotto.",
      `${toLatex(poly(model.radicand))} = \\left(${toLatex(poly(B))}\\right)^{2} = ${toLatex(poly(squared))}`,
    ),
  );
  const tidy = tidied(P);
  const divided = tidy.factor.eq(1) ? "" : ` (dividi per $${toLatex(num(tidy.factor))}$)`;
  result.push(step(`**Passo 3.** Porta tutto da una parte${divided} e risolvi: le candidate sono ${listOf(zeros)}.`, `${toLatex(poly(tidy.poly))} = 0`));
  const checks = zeros.map((v) => {
    const b = at(B, v);
    return b.sign() >= 0
      ? `con $x = ${surdLatex(v)}$ il secondo membro vale $${surdLatex(b)} \\ge 0$ e la radice vale lo stesso: va bene`
      : `con $x = ${surdLatex(v)}$ il secondo membro vale $${surdLatex(b)}$, negativo, mentre una radice non è mai negativa: è estranea`;
  });
  result.push(step(`**Passo 4.** Verifica nell'equazione di partenza: ${checks.join("; ")}.`, final));
  return result;
}

function draftOf(model: Model): ExerciseDraft {
  const correct = answerOf(model);
  const { left, right } = sides(model);
  return {
    prompt: `Risolvi l'equazione $${toLatex(left)} = ${toLatex(right)}$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: stepsOf(model, correct),
    hints: [
      "È un'equazione irrazionale: per togliere la radice si eleva al quadrato. Ma il quadrato non è un principio di equivalenza: che cosa devi fare alla fine?",
      model.kind === "two"
        ? "Eleva al quadrato e uguaglia i radicandi; poi controlla che nella soluzione i radicandi non siano negativi. Se nessuna candidata va bene, $S = \\emptyset$."
        : "Isola la radice, eleva al quadrato (con il doppio prodotto) e risolvi; poi sostituisci ogni candidata nell'equazione di partenza. Se nessuna va bene, $S = \\emptyset$; più soluzioni si scrivono $x = 1 \\vee x = 4$.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A06",
  lesson: "V1.M05.L06",
  title: "Equazioni irrazionali",
  levels: [1, 2, 3],
  errors: ["COND.SOLUZIONI_ESTRANEE", "ALG.QUADRATO_BINOMIO", "CALC.SEGNO_TRASPORTO", "COND.RADICE_PARI", "ALG.COEFFICIENTE_INVERTITO"],
  limits: { maxInteger: 40, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal testo: ogni soluzione di √R + c = L risolve anche R = (L − c)², che il motore risolve;
    // delle sue soluzioni restano quelle che rendono vera l'equazione scritta (radici comprese).
    const { left, right } = sides(model);
    const candidate =
      model.kind === "two"
        ? sub(poly(model.r1), poly(model.r2))
        : sub(pow(sub(right, num(model.c)), 2), poly(model.radicand));
    const found = solutionsFromCandidates([candidate], (value) => satisfies(left, right, value));
    return found !== null && sameSet(found, answer.correct);
  },
});

