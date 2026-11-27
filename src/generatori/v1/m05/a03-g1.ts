// V1.M05.A03.g1 — Relazioni tra soluzioni e coefficienti: somma, prodotto, l'altra soluzione,
// l'equazione con soluzioni date (risposta: numero, oppure il primo membro dell'equazione).
//
// Costruzione all'indietro: si scelgono prima le due soluzioni x₁ e x₂ (interi, una frazione,
// oppure h ± √d), poi i coefficienti a, b, c = a·(x − x₁)(x − x₂) sviluppato. Così Δ > 0 è garantito
// e i numeri di somma e prodotto sono quelli scelti.
//
// Livello 1: somma o prodotto con a = 1; equazione monica con due soluzioni intere.
// Livello 2: somma o prodotto con a ≠ 1; l'altra soluzione, data una (con a = 1 o a ≠ 1).
// Livello 3: equazione con soluzioni h ± √d; equazione con una soluzione frazionaria e primo
//            coefficiente dato; l'altra soluzione quando è una frazione.
//
// Errori tipici, rifatti sui numeri:
//   ALG.SOMMA_PRODOTTO   somma b/a (segno dimenticato) o −b (senza dividere per a); prodotto −c/a o c;
//                        somma e prodotto scambiati;
//   ALG.SEGNI_FATTORI    l'equazione scritta con i fattori x + x₁ e x + x₂ (x² + sx + p);
//   CALC.REGOLA_SEGNI    il prodotto delle soluzioni preso con il segno sbagliato nell'equazione (x² − sx − p).

import { defineGenerator, exact, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upoly } from "../../../motore/algebra/upoly";
import { num, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { solveQuadratic } from "../../../motore/steps";
import { constantValue, isClean, step, surdAt, surdLatex } from "../../comuni/equations";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

const CODE = "V1.M05.A03.g1";
type Rng_ = GeneratorContext["rng"];

type Task = "sum" | "product" | "other" | "equation";

interface Model {
  readonly task: Task;
  /** Coefficienti di ax² + bx + c (razionali, perché con soluzioni irrazionali e a = 1 restano interi). */
  readonly a: Rational;
  readonly b: Rational;
  readonly c: Rational;
  /** Le due soluzioni. */
  readonly x1: Surd;
  readonly x2: Surd;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** a(x − x₁)(x − x₂) = a x² − a s x + a p. */
function withRoots(task: Task, a: number, x1: Surd, x2: Surd): Model {
  const s = x1.add(x2).toRational();
  const p = x1.mul(x2).toRational();
  return { task, a: Rational.of(a), b: s.mul(-a), c: p.mul(a), x1, x2 };
}

const integerRoots = (rng: Rng_, range: number): [number, number] => {
  const [r, s] = rng.sample(Array.from({ length: 2 * range + 1 }, (_, k) => k - range).filter((v) => v !== 0), 2) as [number, number];
  return [r, s];
};

/** Una frazione m/k ridotta, non intera. */
function properFraction(rng: Rng_, k: number): Rational {
  for (;;) {
    const m = rng.intExcept(-7, 7);
    if (gcd(Math.abs(m), k) === 1) return Rational.of(m, k);
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const task = rng.pick(["sum", "product", "equation", "equation"] as const);
    const [r, s] = integerRoots(rng, 7);
    const model = withRoots(task, 1, Surd.from(r), Surd.from(s));
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const task = rng.pick(["sum", "product", "other", "other"] as const);
    let model: Model;
    if (task === "other") {
      const [r, s] = integerRoots(rng, 8);
      model = withRoots(task, rng.pick([1, 1, 2, 3]), Surd.from(r), Surd.from(s));
    } else {
      // a ≠ 1: una soluzione frazionaria con denominatore che divide a.
      const k = rng.pick([2, 3, 4, 5]);
      const j = rng.pick([1, 1, 2, -1]);
      model = withRoots(task, j * k, Surd.from(properFraction(rng, k)), Surd.from(rng.intExcept(-6, 6)));
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["irrational", "fraction", "otherFraction"] as const);
    let model: Model;
    switch (shape) {
      case "irrational": {
        const h = rng.intExcept(-5, 5);
        const d = rng.pick([2, 3, 5, 6, 7]);
        const k = rng.pick([1, 1, 2]);
        const offset = Surd.sqrt(d).mul(k);
        model = withRoots("equation", 1, Surd.from(h).sub(offset), Surd.from(h).add(offset));
        break;
      }
      case "fraction": {
        const k = rng.pick([2, 3, 4, 5]);
        model = withRoots("equation", k, Surd.from(properFraction(rng, k)), Surd.from(rng.intExcept(-6, 6)));
        break;
      }
      case "otherFraction": {
        // La soluzione data è intera, l'altra è una frazione.
        const k = rng.pick([2, 3, 4, 5]);
        model = withRoots("other", k, Surd.from(rng.intExcept(-6, 6)), Surd.from(properFraction(rng, k)));
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function acceptable(model: Model, minimumWrong: number): boolean {
  if ([model.a, model.b, model.c].some((value) => !isClean(value, 60, 1))) return false;
  if (model.x1.eq(model.x2)) return false;
  return wrongAnswers(model).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── risposta giusta e risposte sbagliate ─────────────────────────────

/** Il polinomio a x² + b x + c scritto a mano. */
const polynomial = (a: Rational, b: Rational, c: Rational): Expr => upolyToExpr(upoly(c, b, a));
const sumOf = (m: Model): Rational => m.b.neg().div(m.a);
const productOf = (m: Model): Rational => m.c.div(m.a);

function correctOf(model: Model): Expr {
  switch (model.task) {
    case "sum":
      return num(sumOf(model));
    case "product":
      return num(productOf(model));
    case "other":
      return num(model.x2.toRational());
    case "equation":
      return polynomial(model.a, model.b, model.c);
  }
}

function wrongAnswers(model: Model) {
  const { a, b, c } = model;
  const s = sumOf(model);
  const p = productOf(model);
  const numberCandidate = (error: "ALG.SOMMA_PRODOTTO" | "ALG.SEGNI_FATTORI" | "CALC.REGOLA_SEGNI", value: Rational | null): WrongCandidate<Expr> =>
    value && isClean(value, 60, 12) ? { error, value: num(value) } : null;
  const candidates: WrongCandidate<Expr>[] = [];
  switch (model.task) {
    case "sum":
      candidates.push(numberCandidate("ALG.SOMMA_PRODOTTO", s.neg()), numberCandidate("ALG.SOMMA_PRODOTTO", b.neg()), numberCandidate("ALG.SOMMA_PRODOTTO", p));
      break;
    case "product":
      candidates.push(numberCandidate("ALG.SOMMA_PRODOTTO", p.neg()), numberCandidate("ALG.SOMMA_PRODOTTO", c), numberCandidate("ALG.SOMMA_PRODOTTO", s));
      break;
    case "other": {
      const x1 = model.x1.toRational();
      // Dal prodotto con il segno sbagliato (−c/a), senza dividere per a (c), dalla somma con il segno sbagliato (b/a).
      candidates.push(
        numberCandidate("ALG.SOMMA_PRODOTTO", p.neg().div(x1)),
        numberCandidate("ALG.SOMMA_PRODOTTO", c.div(x1)),
        numberCandidate("ALG.SOMMA_PRODOTTO", s.neg().sub(x1)),
        numberCandidate("ALG.SOMMA_PRODOTTO", b.neg().sub(x1)),
      );
      break;
    }
    case "equation":
      // Fattori con il segno delle soluzioni: a(x + x₁)(x + x₂) = a x² + a s x + a p.
      candidates.push({ error: "ALG.SEGNI_FATTORI", value: polynomial(a, b.neg(), c) });
      // Il prodotto con il segno sbagliato: a x² − a s x − a p.
      candidates.push({ error: "CALC.REGOLA_SEGNI", value: polynomial(a, b, c.neg()) });
      // Somma e prodotto scambiati: a x² − a p x + a s.
      if (p.isInteger() || !a.eq(1)) candidates.push({ error: "ALG.SOMMA_PRODOTTO", value: polynomial(a, p.mul(a).neg(), s.mul(a)) });
      break;
  }
  return distinctWrongExpressions(correctOf(model), candidates);
}

// ───────────────────────────── testo, passaggi, indizi ─────────────────────────────

const display = (latex: string): string => latex.replace(/\\frac/g, "\\dfrac");
const r = (value: Rational): string => toLatex(num(value));
const inParens = (value: Rational): string => (value.sign() < 0 ? `\\left(${r(value)}\\right)` : r(value));

function promptOf(model: Model): string {
  const equation = `$${display(toLatex(polynomial(model.a, model.b, model.c)))} = 0$`;
  switch (model.task) {
    case "sum":
      return `Senza risolvere l'equazione ${equation}, calcola la somma delle sue soluzioni.`;
    case "product":
      return `Senza risolvere l'equazione ${equation}, calcola il prodotto delle sue soluzioni.`;
    case "other":
      return `Una soluzione dell'equazione ${equation} è $x_1 = ${surdLatex(model.x1)}$. Trova l'altra soluzione senza usare la formula risolutiva.`;
    case "equation": {
      const lead = model.a.eq(1) ? "$x^{2} + bx + c = 0$" : `$${r(model.a)}x^{2} + bx + c = 0$, con primo coefficiente $${r(model.a)}$`;
      return `Scrivi l'equazione ${lead}, che ha come soluzioni $${display(surdLatex(model.x1))}$ e $${display(surdLatex(model.x2))}$. Rispondi con il primo membro, sviluppato.`;
    }
  }
}

function stepsOf(model: Model): { text: string }[] {
  const { a, b, c } = model;
  const s = sumOf(model);
  const p = productOf(model);
  const delta = b.mul(b).sub(a.mul(c).mul(4));
  const deltaStep = step(
    `**Passo 1.** Prima controlla che le soluzioni ci siano: $a = ${r(a)}$, $b = ${r(b)}$, $c = ${r(c)}$ e il discriminante è positivo.`,
    `\\Delta = ${inParens(b)}^{2} - 4 \\cdot ${inParens(a)} \\cdot ${inParens(c)} = ${r(delta)} > 0`,
  );
  switch (model.task) {
    case "sum":
      return [deltaStep, step("**Passo 2.** La somma delle soluzioni è $-\\dfrac{b}{a}$: con il meno, e divisa per $a$.", chain(`s = -\\frac{b}{a}`, `-\\frac{${r(b)}}{${r(a)}}`, r(s)))];
    case "product":
      return [deltaStep, step("**Passo 2.** Il prodotto delle soluzioni è $\\dfrac{c}{a}$: senza il meno, e diviso per $a$.", chain(`p = \\frac{c}{a}`, `\\frac{${r(c)}}{${r(a)}}`, r(p)))];
    case "other": {
      const x1 = model.x1.toRational();
      const x2 = model.x2.toRational();
      return [
        step(`**Passo 1.** L'equazione ha una soluzione, quindi $\\Delta \\ge 0$ e vale il teorema: il prodotto delle soluzioni è $\\dfrac{c}{a}$.`, `x_1 \\cdot x_2 = \\frac{${r(c)}}{${r(a)}} = ${r(p)}`),
        step(`**Passo 2.** Dividi il prodotto per la soluzione data.`, `x_2 = ${r(p)} : ${inParens(x1)} = ${r(x2)}`),
        step(`**Passo 3.** Controllo con la somma: $${r(x1)} + ${inParens(x2)} = ${r(s)}$, ed è proprio $-\\dfrac{b}{a} = ${r(s)}$.`),
      ];
    }
    case "equation": {
      const lead = a.eq(1) ? "" : `${r(a)}`;
      const sLatex = surdLatex(model.x1.add(model.x2));
      const pLatex = surdLatex(model.x1.mul(model.x2));
      return [
        step(
          "**Passo 1.** Calcola somma e prodotto delle soluzioni.",
          `s = ${surdLatex(model.x1)} + ${parenSurd(model.x2)} = ${sLatex} \\qquad p = ${parenSurd(model.x1)} \\cdot ${parenSurd(model.x2)} = ${pLatex}`,
        ),
        step(
          a.eq(1)
            ? "**Passo 2.** Le soluzioni di $x^2 - s\\,x + p = 0$ sono proprio $x_1$ e $x_2$."
            : `**Passo 2.** Le soluzioni di $x^2 - s\\,x + p = 0$ sono proprio $x_1$ e $x_2$; per avere primo coefficiente $${r(a)}$ moltiplica tutto per $${r(a)}$.`,
          a.eq(1)
            ? `x^{2} - ${parenLatex(sLatex)}x + ${parenLatex(pLatex)} = ${toLatex(polynomial(a, b, c))}`
            : `${lead}\\left(x^{2} - ${parenLatex(sLatex)}x + ${parenLatex(pLatex)}\\right) = ${toLatex(polynomial(a, b, c))}`,
        ),
        step("**Passo 3.** Controllo: ogni soluzione dà il fattore con il segno opposto, e il prodotto dei fattori ridà il polinomio.", `${lead}${factorLatex(model.x1)}${factorLatex(model.x2)} = ${toLatex(polynomial(a, b, c))}`),
      ];
    }
  }
}

/** «a = b = c» senza ripetere un passaggio uguale al risultato. */
const chain = (start: string, middle: string, end: string): string => (middle === end ? `${start} = ${end}` : `${start} = ${middle} = ${end}`);
const parenSurd = (value: Surd): string => (value.sign() < 0 || value.terms.length > 1 ? `\\left(${surdLatex(value)}\\right)` : surdLatex(value));
const parenLatex = (latex: string): string => (latex.startsWith("-") || /[+-]/.test(latex.slice(1)) ? `\\left(${latex}\\right)` : latex);
/** (x − x₁) scritto per esteso, con il segno opposto a quello della soluzione. */
function factorLatex(value: Surd): string {
  if (value.isRational()) {
    const v = value.toRational();
    return `\\left(x ${v.sign() < 0 ? "+" : "-"} ${r(v.abs())}\\right)`;
  }
  return `\\left(x - \\left(${surdLatex(value)}\\right)\\right)`;
}

function hintsOf(model: Model): [string, string] {
  switch (model.task) {
    case "sum":
    case "product":
      return [
        "Non serve trovare le soluzioni: c'è un teorema che lega somma e prodotto delle soluzioni ai coefficienti. Che cosa devi controllare prima di usarlo?",
        "Leggi $a$, $b$, $c$ con il loro segno. La somma è $-\\dfrac{b}{a}$, il prodotto $\\dfrac{c}{a}$.",
      ];
    case "other":
      return [
        "Conosci una soluzione: il prodotto (o la somma) delle due soluzioni lo leggi dai coefficienti.",
        "Il prodotto delle soluzioni è $\\dfrac{c}{a}$: dividilo per la soluzione data. Controlla poi con la somma, $-\\dfrac{b}{a}$.",
      ];
    case "equation":
      return [
        "Le soluzioni dicono somma e prodotto: da questi si scrive l'equazione.",
        `Calcola $s = x_1 + x_2$ e $p = x_1 x_2$; l'equazione è $x^2 - s\\,x + p = 0$${model.a.eq(1) ? "" : ", moltiplicata per il primo coefficiente"}.`,
      ];
  }
}

function draftOf(model: Model): ExerciseDraft {
  const correct = correctOf(model);
  const wrong = wrongAnswers(model);
  return {
    prompt: promptOf(model),
    answer:
      model.task === "equation"
        ? { kind: "expression", correct, wrong, form: ["expanded"] }
        : { kind: "number", correct, wrong, mode: exact },
    steps: stepsOf(model),
    hints: hintsOf(model),
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

/** Il valore esatto del polinomio della risposta in un punto. */
const at = (expr: Expr, value: Surd): Surd | null => surdAt(expr, "x", value);

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A03",
  lesson: "V1.M05.L03",
  title: "Somma e prodotto delle soluzioni",
  levels: [1, 2, 3],
  errors: ["ALG.SOMMA_PRODOTTO", "ALG.SEGNI_FATTORI", "CALC.REGOLA_SEGNI"],
  limits: { maxInteger: 60, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const { answer } = exercise;
    if (answer.kind === "expression") {
      // Il polinomio della risposta si annulla nelle due soluzioni date e ha il primo coefficiente chiesto.
      const atX1 = at(answer.correct, model.x1);
      const atX2 = at(answer.correct, model.x2);
      const plus = at(answer.correct, Surd.ONE);
      const minus = at(answer.correct, Surd.from(-1));
      const zero = at(answer.correct, Surd.ZERO);
      if (!atX1 || !atX2 || !plus || !minus || !zero) return false;
      // Per un polinomio di secondo grado P(1) + P(−1) − 2P(0) = 2a.
      const lead = plus.add(minus).sub(zero.mul(2)).div(2);
      return atX1.isZero() && atX2.isZero() && lead.eq(model.a);
    }
    if (answer.kind !== "number") return false;
    // Le soluzioni le trova il motore con la formula risolutiva, a partire dai coefficienti del testo.
    const roots = solveQuadratic(model.a, model.b, model.c).roots.map(constantValue);
    if (roots.length !== 2) return false;
    const [first, second] = roots as [Surd, Surd];
    const value = constantValue(answer.correct);
    switch (model.task) {
      case "sum":
        return value.eq(first.add(second));
      case "product":
        return value.eq(first.mul(second));
      case "other":
        return (first.eq(model.x1) && value.eq(second)) || (second.eq(model.x1) && value.eq(first));
      case "equation":
        return false;
    }
  },
});
