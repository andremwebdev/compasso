// V1.M05.A07.g1 — Equazioni con il valore assoluto: |A| = k, |A| = |B|, |A| = B (risposta: insieme).
//
// Costruzione all'indietro: si scelgono le soluzioni delle due equazioni A = R e A = −R (R è il numero
// o l'espressione con cui si confronta |A|, dopo averlo isolato), poi si scrivono A e R perché le
// abbiano. Le candidate con R < 0 sono quelle da scartare.
//
// Livello 1: |px + q| = k con k > 0.
// Livello 2: |A| = |B|; |A| = B con una candidata da scartare; |A| + c = d da isolare.
// Livello 3: |A| = k con A di secondo grado; |A| = B con A di secondo grado; |A| + c = d con d − c < 0
//            (impossibile); |A| = B con tutte e due le candidate da scartare.
//
// Errori tipici, rifatti sui numeri:
//   ALG.VALORE_ASSOLUTO_CASO      risolve solo A = R (dimentica A = −R);
//   ALG.VALORE_ASSOLUTO_NEGATIVO  con R numero negativo risolve lo stesso A = ±R;
//   COND.SOLUZIONI_ESTRANEE       in |A| = B tiene anche le candidate con B < 0;
//   CALC.MENO_PARENTESI           in A = −B cambia segno solo al primo termine di B;
//   CALC.SEGNO_TRASPORTO          il numero di A (o quello accanto al valore assoluto) passa senza cambiare segno;
//   ALG.RADICE_DEL_QUADRATO       in |x² − a| = k, da x² = t prende solo la soluzione positiva;
//   ALG.FORMULA_RISOLUTIVA        con A di secondo grado, nelle due equazioni usa b al posto di −b.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upAdd, upMul, upoly, upScale, upSub, type UPoly } from "../../../motore/algebra/upoly";
import { abs, add, mul, num, sub, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { cleanSurds, pointSet, sameSet, satisfies, solutionsFromCandidates, step, surdLatex } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M05.A07.g1";
type Rng_ = GeneratorContext["rng"];

/** Il secondo membro: un numero, un'espressione (con la x fuori dalle barre) o un altro valore assoluto. */
type Right = { readonly kind: "number"; readonly k: number } | { readonly kind: "poly"; readonly B: UPoly } | { readonly kind: "abs"; readonly B: UPoly };

interface Model {
  /** Dentro le barre. */
  readonly A: UPoly;
  /** Il numero accanto al valore assoluto nel primo membro (0 se è già solo). */
  readonly c: number;
  readonly right: Right;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const RANGE = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const lin = (r: number): UPoly => upoly(-r, 1);

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const p = rng.pick([1, 1, 2, 3]);
    const k = rng.int(1, 8);
    if ((2 * k) % p !== 0) continue;
    const s1 = rng.int(-5, 5);
    const model: Model = { A: upoly(k - p * s1, p), c: 0, right: { kind: "number", k } };
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["abs", "poly", "poly", "isolate"] as const);
    let model: Model;
    switch (shape) {
      case "abs": {
        // |px + q| = |mx + n|: due rette, con le soluzioni di A = B e A = −B intere o mezzi.
        const [p, m] = rng.sample([1, 2, 3, -1, -2], 2) as [number, number];
        model = { A: upoly(rng.intExcept(-6, 6), p), c: 0, right: { kind: "abs", B: upoly(rng.intExcept(-6, 6), m) } };
        break;
      }
      case "poly":
        model = outside(rng, rng.pick([1, 1, 2]), false);
        break;
      case "isolate": {
        const p = rng.pick([1, 2]);
        const k = rng.int(1, 7);
        if ((2 * k) % p !== 0) continue;
        const c = rng.intExcept(-5, 5);
        model = { A: upoly(k - p * rng.int(-5, 5), p), c, right: { kind: "number", k: k + c } };
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["quadraticNumber", "quadraticPoly", "quadraticPoly", "negative", "noneGood", "noneGood"] as const);
    let model: Model | null;
    switch (shape) {
      case "quadraticNumber": {
        // |x² − a| = k con a − k e a + k quadrati: soluzioni ±√(a + k) e ±√(a − k).
        // Ha pochi esercizi possibili: si salta tre volte su quattro, perché nessuno esca troppo spesso.
        if (rng.bool(0.75)) continue;
        const [u, v] = rng.sample([0, 1, 2, 3, 4, 5, 6], 2) as [number, number];
        const [low, high] = [Math.min(u, v) ** 2, Math.max(u, v) ** 2];
        if ((high - low) % 2 !== 0) continue;
        model = { A: upoly(-(high + low) / 2, 0, 1), c: 0, right: { kind: "number", k: (high - low) / 2 } };
        break;
      }
      case "quadraticPoly": {
        // |A| = B con A − B = (x − r1)(x − r2) e A + B = (x − r3)(x − r4): A e B sono la semisomma e la semidifferenza.
        const [r1, r2, r3, r4] = rng.sample(RANGE, 4) as [number, number, number, number];
        const twiceB = upSub(upMul(lin(r3), lin(r4)), upMul(lin(r1), lin(r2)));
        const twiceA = upAdd(upMul(lin(r3), lin(r4)), upMul(lin(r1), lin(r2)));
        if ([...twiceA, ...twiceB].some((c) => !c.div(2).isInteger())) continue;
        const B = upScale(twiceB, Rational.of(1, 2));
        // Da ogni equazione almeno una candidata buona, e almeno una candidata da scartare in tutto.
        const ok = (r: number): boolean => at(B, Surd.from(r)).sign() >= 0;
        if (!(ok(r1) || ok(r2)) || !(ok(r3) || ok(r4)) || [r1, r2, r3, r4].every(ok)) continue;
        model = { A: upScale(twiceA, Rational.of(1, 2)), c: 0, right: { kind: "poly", B } };
        break;
      }
      case "negative": {
        // È la forma che si accetta sempre: si salta spesso, così le altre (scartate più di frequente) pesano quanto lei.
        if (rng.bool(0.8)) continue;
        const c = rng.int(2, 6);
        model = { A: upoly(rng.intExcept(-6, 6), rng.pick([1, 2, 3])), c, right: { kind: "number", k: c - rng.int(1, 5) } };
        break;
      }
      case "noneGood":
        model = outside(rng, rng.pick([2, 3]), true);
        break;
    }
    if (model && acceptable(model, 3)) return model;
  }
}

/** |px + q| = mx + n con candidate s1 (da A = B) e s2 (da A = −B); con none vero tutte e due da scartare. */
function outside(rng: Rng_, p: number, none: boolean): Model {
  for (;;) {
    const m = rng.pick([1, 2, 3, -1, -2]);
    if (m === p || m === -p) continue;
    // Una retta più ripida di quella dentro le barre incontra sempre il grafico di |A| sopra l'asse:
    // per avere tutte e due le candidate da scartare serve |m| < |p|.
    if (none && Math.abs(m) >= Math.abs(p)) continue;
    const [s1, s2] = rng.sample(RANGE, 2) as [number, number];
    // A = B in s1 e A = −B in s2: p·s1 + q = m·s1 + n e p·s2 + q = −m·s2 − n.
    // Sommando: q = ((m − p)·s1 − (m + p)·s2)/2, poi n = (p − m)·s1 + q.
    const twice = (m - p) * s1 - (m + p) * s2;
    if (twice % 2 !== 0) continue;
    const q = twice / 2;
    const n = (p - m) * s1 + q;
    const B = upoly(n, m);
    const value = (s: number): number => m * s + n;
    const goodCount = [s1, s2].filter((s) => value(s) >= 0).length;
    if (none ? goodCount !== 0 : goodCount !== 1) continue;
    return { A: upoly(q, p), c: 0, right: { kind: "poly", B } };
  }
}

/** Vero se il polinomio di secondo grado ha due zeri interi distinti. */
function integerZeros(p: UPoly): boolean {
  const zeros = zerosOf(p);
  return zeros.length === 2 && zeros.every((z) => z.isRational() && z.toRational().isInteger());
}

function acceptable(model: Model, minimumWrong: number): boolean {
  const all = [...model.A, ...(model.right.kind === "number" ? [Rational.of(model.right.k)] : model.right.B)];
  if (all.some((value) => value.abs().cmp(30) > 0)) return false;
  if (model.right.kind !== "number" && model.right.B.length < 2) return false;
  return wrongAnswers(model, answerOf(model)).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── soluzioni giuste e sbagliate ─────────────────────────────

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

const at = (p: UPoly, v: Surd): Surd => p.reduceRight<Surd>((acc, coefficient) => acc.mul(v).add(coefficient), Surd.ZERO);

/** Il secondo membro dopo aver isolato il valore assoluto, come polinomio (un numero è un polinomio costante). */
function isolatedRight(model: Model, cSign = -1): UPoly {
  const R = model.right.kind === "number" ? upoly(model.right.k) : model.right.B;
  return upAdd(R, upoly(cSign * model.c));
}

interface Solve {
  readonly A: UPoly;
  readonly R: UPoly;
  /** La seconda equazione è A = minusR (giusto: −R). */
  readonly minusR?: UPoly;
  /** Quale caso considerare. */
  readonly onlyFirst?: boolean;
  /** Se scartare le candidate con R < 0 (o, per un numero, se fermarsi quando è negativo). */
  readonly filter: boolean;
}

/** Le soluzioni di |A| = R (o |A| = |B|) con le scelte date, giuste o sbagliate. */
function solveWith(model: Model, options: Solve): Surd[] {
  const { A, R } = options;
  const isAbs = model.right.kind === "abs";
  const isNumber = model.right.kind === "number";
  if (isNumber && options.filter && (R[0] ?? Rational.ZERO).sign() < 0) return [];
  const first = zerosOf(upSub(A, R));
  const second = options.onlyFirst ? [] : zerosOf(upSub(A, options.minusR ?? upScale(R, -1)));
  const all = [...first, ...second];
  if (isAbs || isNumber || !options.filter) return all;
  return all.filter((v) => at(R, v).sign() >= 0);
}

const answerOf = (model: Model): RealSet => pointSet(solveWith(model, { A: model.A, R: isolatedRight(model), filter: true }));

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const candidates: (ExpectedWrong<SolutionSet> | null)[] = [];
  const add = (error: ExpectedWrong<SolutionSet>["error"], values: readonly Surd[]): void => {
    candidates.push(cleanSurds(values, 40, 12) ? { error, value: pointSet(values) } : null);
  };
  const R = isolatedRight(model);
  const base = { A: model.A, R, filter: true };
  add("ALG.VALORE_ASSOLUTO_CASO", solveWith(model, { ...base, onlyFirst: true }));
  if (model.right.kind === "number" && (R[0] ?? Rational.ZERO).sign() < 0) {
    // k negativo trattato come un numero qualsiasi: A = ±k, oppure il solo A = k.
    add("ALG.VALORE_ASSOLUTO_NEGATIVO", solveWith(model, { ...base, filter: false }));
    add("ALG.VALORE_ASSOLUTO_NEGATIVO", solveWith(model, { ...base, filter: false, onlyFirst: true }));
  }
  if (model.right.kind === "poly") add("COND.SOLUZIONI_ESTRANEE", solveWith(model, { ...base, filter: false }));
  if (model.right.kind !== "number" && R.length === 2 && !(R[0] as Rational).isZero()) {
    // −(mx + n) scritto −mx + n.
    const [n, m] = R as [Rational, Rational];
    add("CALC.MENO_PARENTESI", solveWith(model, { ...base, minusR: upoly(n, m.neg()) }));
  }
  if (model.A.length === 3 && !(model.A[1] as Rational).isZero()) {
    // Le due equazioni di secondo grado risolte con b al posto di −b: soluzioni cambiate di segno.
    const negated = solveWith(model, { ...base, filter: false }).map((v) => v.neg());
    add("ALG.FORMULA_RISOLUTIVA", model.right.kind === "poly" ? negated.filter((v) => at(R, v).sign() >= 0) : negated);
  }
  if (model.c !== 0) {
    // Isolando: |A| = R + c invece di R − c.
    add("CALC.SEGNO_TRASPORTO", solveWith(model, { ...base, R: isolatedRight(model, 1) }));
  } else if (model.A.length === 3 && (model.A[1] as Rational).isZero() && model.right.kind === "number") {
    // |x² − a| = k: da x² = t solo la radice positiva, oppure a che passa senza cambiare segno.
    const positiveRoot = (t: Rational): Surd[] => (t.sign() < 0 ? [] : t.isZero() ? [Surd.ZERO] : [Surd.sqrt(t)]);
    const [a0] = model.A as [Rational];
    const k = R[0] as Rational;
    add("ALG.RADICE_DEL_QUADRATO", [...positiveRoot(k.sub(a0)), ...positiveRoot(k.neg().sub(a0))]);
    add("CALC.SEGNO_TRASPORTO", solveWith(model, { ...base, A: upoly(a0.neg(), 0, 1) }));
  } else if (model.A.length === 2 && !(model.A[0] as Rational).isZero()) {
    // Risolvendo px + q = ±R, il numero q passa senza cambiare segno: come se fosse px − q.
    const [q, p] = model.A as [Rational, Rational];
    add("CALC.SEGNO_TRASPORTO", solveWith(model, { ...base, A: upoly(q.neg(), p) }));
  }
  return distinctWrongSets(correct, candidates);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

const poly = (p: UPoly): Expr => upolyToExpr(p);

function sides(model: Model): { left: Expr; right: Expr } {
  const inner = abs(poly(model.A));
  const left = model.c === 0 ? inner : add(inner, num(model.c));
  const right = model.right.kind === "number" ? num(model.right.k) : model.right.kind === "poly" ? poly(model.right.B) : abs(poly(model.right.B));
  return { left, right };
}

function stepsOf(model: Model, correct: RealSet): SolutionStep[] {
  const final = `S = ${setToLatex(correct)}`;
  const R = isolatedRight(model);
  const A = poly(model.A);
  const result: SolutionStep[] = [];
  if (model.c !== 0) {
    result.push(step(`**Passo 1.** Isola il valore assoluto: porta $${model.c}$ al secondo membro, cambiando segno.`, `${toLatex(abs(A))} = ${toLatex(poly(R))}`));
  }
  const n = model.c !== 0 ? 2 : 1;
  const k = R[0] ?? Rational.ZERO;
  if (model.right.kind === "number" && k.sign() < 0) {
    result.push(step(`**Passo ${n}.** È del tipo $|A| = k$ con $k = ${toLatex(num(k))} < 0$: un valore assoluto non è mai negativo, quindi l'equazione è impossibile, senza fare conti.`, final));
    return result;
  }
  const typeText =
    model.right.kind === "number"
      ? `È del tipo $|A| = k$ con $k = ${toLatex(num(k))} > 0$: $A = k$ oppure $A = -k$.`
      : model.right.kind === "abs"
        ? "È del tipo $|A| = |B|$: le espressioni dentro le barre sono uguali oppure opposte, $A = B$ oppure $A = -B$."
        : "È del tipo $|A| = B$ con la $x$ anche fuori: si risolvono $A = B$ e $A = -B$, poi si scartano le candidate con $B < 0$.";
  const Rexpr = poly(R);
  const minus = R.length === 1 ? num((R[0] as Rational).neg()) : mul(-1, Rexpr);
  const minusLatex = R.length === 1 ? toLatex(minus) : `-\\left(${toLatex(Rexpr)}\\right)`;
  result.push(step(`**Passo ${n}.** ${typeText}`, `${toLatex(A)} = ${toLatex(Rexpr)} \\qquad \\text{oppure} \\qquad ${toLatex(A)} = ${minusLatex}`));
  const first = zerosOf(upSub(model.A, R));
  const second = zerosOf(upAdd(model.A, R));
  const list = (vs: Surd[]): string => {
    const distinct = vs.filter((v, i) => vs.findIndex((w) => w.eq(v)) === i);
    return distinct.length === 0 ? "nessuna soluzione" : distinct.map((v) => `$x = ${surdLatex(v)}$`).join(" e ");
  };
  result.push(
    step(
      `**Passo ${n + 1}.** Dalla prima: ${list(first)}. Dalla seconda (con il meno davanti a tutto il secondo membro): ${list(second)}.`,
      `${toLatex(poly(upSub(model.A, R)))} = 0 \\qquad ${toLatex(poly(upAdd(model.A, R)))} = 0`,
    ),
  );
  if (model.right.kind === "poly") {
    const checks = [...first, ...second].map((v) => {
      const b = at(R, v);
      return b.sign() >= 0 ? `con $x = ${surdLatex(v)}$ il secondo membro vale $${surdLatex(b)} \\ge 0$: va bene` : `con $x = ${surdLatex(v)}$ il secondo membro vale $${surdLatex(b)} < 0$: si scarta`;
    });
    result.push(step(`**Passo ${n + 2}.** Verifica: un valore assoluto non può valere un numero negativo; ${checks.join("; ")}.`, final));
  } else {
    result.push(step(`**Passo ${n + 2}.** Controllo: sostituisci le soluzioni nell'equazione di partenza; i due membri sono uguali.`, final));
  }
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
      "C'è un valore assoluto: di che tipo è l'equazione, $|A| = k$, $|A| = |B|$ o $|A| = B$? Se serve, isola prima il valore assoluto.",
      "Due numeri hanno lo stesso valore assoluto se sono uguali oppure opposti: risolvi $A = R$ e $A = -R$. Un valore assoluto non è mai negativo: se non resta niente, $S = \\emptyset$. Più soluzioni si scrivono $x = 1 \\vee x = -3$.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A07",
  lesson: "V1.M05.L07",
  title: "Equazioni con il valore assoluto",
  levels: [1, 2, 3],
  errors: ["ALG.VALORE_ASSOLUTO_CASO", "ALG.VALORE_ASSOLUTO_NEGATIVO", "COND.SOLUZIONI_ESTRANEE", "CALC.MENO_PARENTESI", "CALC.SEGNO_TRASPORTO", "ALG.RADICE_DEL_QUADRATO", "ALG.FORMULA_RISOLUTIVA"],
  limits: { maxInteger: 40, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal testo: se |A| + c = R allora A² = (R − c)², un polinomio che il motore scompone; delle sue
    // soluzioni restano quelle che rendono vera l'equazione scritta (con il valore assoluto).
    const { left, right } = sides(model);
    const inside = poly(model.A);
    const other = model.right.kind === "abs" ? poly(model.right.B) : sub(right, num(model.c));
    const candidate = sub(mul(inside, inside), mul(other, other));
    const found = solutionsFromCandidates([candidate], (value) => satisfies(left, right, value));
    return found !== null && sameSet(found, answer.correct);
  },
});
