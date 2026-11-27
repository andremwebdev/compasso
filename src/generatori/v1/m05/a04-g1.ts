// V1.M05.A04.g1 — Equazioni di grado superiore: legge di annullamento del prodotto, raccoglimento,
// binomie, biquadratiche, trinomie, Ruffini (risposta: insieme).
//
// Costruzione all'indietro: si scelgono prima le soluzioni (o i valori dell'incognita ausiliaria t),
// poi il polinomio che le ha, sviluppato oppure già scritto a fattori.
//
// Livello 1: un prodotto di fattori di primo grado uguale a zero, (x − a)(bx + c) = 0 o x(x − a)(x + b) = 0.
// Livello 2: raccoglimento ax³ + bx² + cx = 0; binomia pari x⁴ − k = 0; biquadratica con quattro soluzioni.
// Livello 3: biquadratica con un valore di t negativo; binomia o trinomia con esponente dispari
//            (x³ + k = 0, x⁶ + bx³ + c = 0); terzo grado da scomporre con Ruffini.
//
// Errori tipici, rifatti sui numeri:
//   ALG.SEGNI_FATTORI           da x − a = 0 scrive x = −a (tutti i fattori, o solo quello con il coefficiente);
//   ALG.COEFFICIENTE_INVERTITO  da bx + c = 0 scrive x = −b/c;
//   ALG.DIVISIONE_PER_INCOGNITA divide per x (o per il fattore trovato con Ruffini) e perde quella soluzione;
//   ALG.FORMULA_RISOLUTIVA      nell'equazione in t (o nel trinomio dopo Ruffini) usa b al posto di −b;
//   ALG.INCOGNITA_AUSILIARIA    dà i valori di t come soluzioni;
//   ALG.RADICE_DEL_QUADRATO     da x² = t (o x⁴ = k) prende solo la soluzione positiva;
//   COND.RADICE_PARI            da x² = t con t < 0 scrive x = ±√(−t);
//   ALG.RADICE_DISPARI          con esponente dispari mette il ± o scarta i valori negativi;
//   CALC.SEGNO_TRASPORTO        da xⁿ + c = 0 scrive xⁿ = c.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upMul, upoly, type UPoly } from "../../../motore/algebra/upoly";
import { add, num, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { ruffini, ruffiniTableToLatex } from "../../../motore/steps";
import { cleanSurds, monomial, pointSet, sameSet, satisfies, solutionsFromCandidates, step, surdLatex } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M05.A04.g1";
type Rng_ = GeneratorContext["rng"];
const x = sym("x");

/** Un fattore px + q, con zero −q/p. */
interface Linear {
  readonly p: number;
  readonly q: number;
}

type Model =
  | { readonly kind: "product"; readonly factors: readonly Linear[] }
  | { readonly kind: "collect"; readonly a: number; readonly r1: number; readonly r2: number }
  | { readonly kind: "evenBinomial"; readonly a: number; readonly k: number }
  | { readonly kind: "biquadratic"; readonly t1: Rational; readonly t2: Rational }
  | { readonly kind: "oddBinomial"; readonly k: number }
  | { readonly kind: "trinomial"; readonly k1: number; readonly k2: number }
  | { readonly kind: "ruffini"; readonly roots: readonly [number, number, number] };

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["two", "two", "withX"] as const);
    const roots = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 2) as [number, number];
    let model: Model;
    if (shape === "two") {
      // (x − a)(bx + c) = 0 con b che divide c: il secondo zero è −c/b, intero.
      const b = rng.pick([2, 3, 4]);
      model = { kind: "product", factors: [{ p: 1, q: -roots[0] }, { p: b, q: -b * roots[1] }] };
    } else {
      model = { kind: "product", factors: [{ p: 1, q: 0 }, { p: 1, q: -roots[0] }, { p: 1, q: -roots[1] }] };
    }
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["collect", "collect", "evenBinomial", "biquadratic", "biquadratic"] as const);
    let model: Model;
    switch (shape) {
      case "collect": {
        const [r1, r2] = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 2) as [number, number];
        model = { kind: "collect", a: rng.pick([1, 1, 2]), r1, r2 };
        break;
      }
      case "evenBinomial":
        model = { kind: "evenBinomial", a: rng.int(1, 6), k: rng.int(2, 5) };
        break;
      case "biquadratic": {
        const [u, v] = rng.sample([1, 2, 3, 4, 5, 6, 7], 2) as [number, number];
        if (u * u + v * v > 60) continue;
        // Con valori di t quadrati perfetti, oppure (più di rado) non quadrati: x = ±√2, ±√3.
        model = rng.bool(0.65)
          ? { kind: "biquadratic", t1: Rational.of(u * u), t2: Rational.of(v * v) }
          : { kind: "biquadratic", t1: Rational.of(rng.pick([2, 3, 5])), t2: Rational.of(v * v) };
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["negativeT", "negativeT", "odd", "odd", "ruffini", "ruffini"] as const);
    let model: Model;
    switch (shape) {
      case "negativeT": {
        const u = rng.int(1, 5);
        model = { kind: "biquadratic", t1: Rational.of(u * u), t2: Rational.of(-rng.int(1, 9)) };
        break;
      }
      case "odd": {
        if (rng.bool(0.4)) {
          model = { kind: "oddBinomial", k: rng.intExcept(-4, 4, [0, 1, -1]) };
        } else {
          const [k1, k2] = rng.sample([-3, -2, -1, 1, 2, 3], 2) as [number, number];
          model = { kind: "trinomial", k1, k2 };
        }
        break;
      }
      case "ruffini": {
        const roots = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 3) as [number, number, number];
        // Almeno una soluzione piccola, da trovare per tentativi tra i divisori del termine noto.
        if (!roots.some((value) => Math.abs(value) <= 2)) continue;
        model = { kind: "ruffini", roots };
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

function acceptable(model: Model, minimumWrong: number): boolean {
  const p = polynomialOf(model);
  if (p.some((c) => c.abs().cmp(model.kind === "evenBinomial" ? 1000 : 80) > 0)) return false;
  return wrongAnswers(model, answerOf(model)).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── polinomio, soluzioni giuste e sbagliate ─────────────────────────────

const fromRoots = (roots: readonly number[]): UPoly => roots.reduce<UPoly>((acc, r) => upMul(acc, upoly(-r, 1)), upoly(1));

/** Il polinomio (sviluppato) del primo membro. */
function polynomialOf(model: Model): UPoly {
  switch (model.kind) {
    case "product":
      return model.factors.reduce<UPoly>((acc, f) => upMul(acc, upoly(f.q, f.p)), upoly(1));
    case "collect":
      return upMul(upoly(0, model.a), fromRoots([model.r1, model.r2]));
    case "evenBinomial":
      return upoly(-model.a * model.k ** 4, 0, 0, 0, model.a);
    case "biquadratic": {
      const { t1, t2 } = model;
      return upoly(t1.mul(t2), 0, t1.add(t2).neg(), 0, 1);
    }
    case "oddBinomial":
      return upoly(model.k ** 3, 0, 0, 1);
    case "trinomial": {
      const t1 = model.k1 ** 3;
      const t2 = model.k2 ** 3;
      return upoly(t1 * t2, 0, 0, -(t1 + t2), 0, 0, 1);
    }
    case "ruffini":
      return fromRoots(model.roots);
  }
}

/** Le soluzioni di x² = t: due opposte, una o nessuna. */
const squareRoots = (t: Rational): Surd[] => (t.sign() < 0 ? [] : t.isZero() ? [Surd.ZERO] : [Surd.sqrt(t).neg(), Surd.sqrt(t)]);
const s = (value: number | Rational): Surd => Surd.from(value);

function answerOf(model: Model): RealSet {
  switch (model.kind) {
    case "product":
      return pointSet(model.factors.map((f) => s(Rational.of(-f.q, f.p))));
    case "collect":
      return pointSet([Surd.ZERO, s(model.r1), s(model.r2)]);
    case "evenBinomial":
      return pointSet([s(-model.k), s(model.k)]);
    case "biquadratic":
      return pointSet([...squareRoots(model.t1), ...squareRoots(model.t2)]);
    case "oddBinomial":
      return pointSet([s(-model.k)]);
    case "trinomial":
      return pointSet([s(model.k1), s(model.k2)]);
    case "ruffini":
      return pointSet(model.roots.map(s));
  }
}

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const candidates: (ExpectedWrong<SolutionSet> | null)[] = [];
  const add = (error: ExpectedWrong<SolutionSet>["error"], values: readonly Surd[]): void => {
    candidates.push(cleanSurds(values, 60, 12) ? { error, value: pointSet(values) } : null);
  };
  switch (model.kind) {
    case "product": {
      const zero = (f: Linear): Rational => Rational.of(-f.q, f.p);
      add("ALG.SEGNI_FATTORI", model.factors.map((f) => s(zero(f).neg())));
      if (model.factors.some((f) => f.q === 0 && f.p === 1)) add("ALG.DIVISIONE_PER_INCOGNITA", model.factors.filter((f) => f.q !== 0).map((f) => s(zero(f))));
      const scaled = model.factors.findIndex((f) => f.p !== 1);
      if (scaled >= 0) {
        add("ALG.SEGNI_FATTORI", model.factors.map((f, i) => s(i === scaled ? zero(f).neg() : zero(f))));
        const f = model.factors[scaled] as Linear;
        if (f.q !== 0) add("ALG.COEFFICIENTE_INVERTITO", model.factors.map((g, i) => s(i === scaled ? Rational.of(-f.p, f.q) : zero(g))));
      }
      break;
    }
    case "collect": {
      const { r1, r2 } = model;
      add("ALG.DIVISIONE_PER_INCOGNITA", [s(r1), s(r2)]);
      add("ALG.FORMULA_RISOLUTIVA", [Surd.ZERO, s(-r1), s(-r2)]);
      add("ALG.SEGNI_FATTORI", [s(-r1), s(-r2)]);
      break;
    }
    case "evenBinomial": {
      const { k } = model;
      add("ALG.RADICE_DEL_QUADRATO", [s(k)]);
      add("CALC.SEGNO_TRASPORTO", []);
      // Con t = x²: t = ±k² presi per soluzioni.
      add("ALG.INCOGNITA_AUSILIARIA", [s(-k * k), s(k * k)]);
      break;
    }
    case "biquadratic": {
      const { t1, t2 } = model;
      add("ALG.INCOGNITA_AUSILIARIA", [s(t1), s(t2)]);
      const positive = (t: Rational): Surd[] => (t.sign() > 0 ? [Surd.sqrt(t)] : []);
      add("ALG.RADICE_DEL_QUADRATO", [...positive(t1), ...positive(t2)]);
      if (t1.sign() < 0 || t2.sign() < 0) add("COND.RADICE_PARI", [...squareRoots(t1.abs()), ...squareRoots(t2.abs())]);
      add("ALG.FORMULA_RISOLUTIVA", [...squareRoots(t1.neg()), ...squareRoots(t2.neg())]);
      break;
    }
    case "oddBinomial": {
      const { k } = model;
      // x³ + k³ = 0: trasporto senza cambiare segno, ± come per le potenze pari, «impossibile» se il numero è negativo.
      add("CALC.SEGNO_TRASPORTO", [s(k)]);
      add("ALG.RADICE_DISPARI", [s(-k), s(k)]);
      if (-k < 0) add("ALG.RADICE_DISPARI", []);
      break;
    }
    case "trinomial": {
      const { k1, k2 } = model;
      add("ALG.INCOGNITA_AUSILIARIA", [s(k1 ** 3), s(k2 ** 3)]);
      add("ALG.FORMULA_RISOLUTIVA", [s(-k1), s(-k2)]);
      // Come se l'esponente fosse pari: il ±, e niente soluzioni dai valori di t negativi.
      add("ALG.RADICE_DISPARI", [k1, k2].filter((k) => k > 0).flatMap((k) => [s(-k), s(k)]));
      break;
    }
    case "ruffini": {
      const [first, second, third] = rootsInOrder(model);
      add("ALG.SEGNI_FATTORI", model.roots.map((r) => s(-r)));
      add("ALG.DIVISIONE_PER_INCOGNITA", [s(second), s(third)]);
      add("ALG.FORMULA_RISOLUTIVA", [s(first), s(-second), s(-third)]);
      break;
    }
  }
  return distinctWrongSets(correct, candidates);
}

/** Per Ruffini: la prima soluzione è quella che si trova per tentativi (la più piccola in valore assoluto, la positiva a parità). */
function rootsInOrder(model: Extract<Model, { kind: "ruffini" }>): [number, number, number] {
  const sorted = [...model.roots].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
  return sorted as [number, number, number];
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

const display = (expr: Expr): string => toLatex(expr).replace(/\\frac/g, "\\dfrac");

/** px + q scritto a mano. */
const linearExpr = (f: Linear): Expr => (f.q === 0 ? monomial(f.p, 1) : add(monomial(f.p, 1), num(f.q)));

function leftOf(model: Model): Expr {
  if (model.kind === "product") return { kind: "mul", factors: model.factors.map(linearExpr) };
  return upolyToExpr(polynomialOf(model));
}

function stepsOf(model: Model, correct: RealSet): SolutionStep[] {
  const final = `S = ${setToLatex(correct)}`;
  const tPoly = (t1: Rational | number, t2: Rational | number): Expr => upolyToExpr(upoly(Rational.from(t1).mul(t2), Rational.from(t1).add(t2).neg(), 1), "t");
  switch (model.kind) {
    case "product": {
      const zeros = model.factors.map((f) =>
        f.q === 0 && f.p === 1 ? "il fattore $x$ dà $x = 0$" : `$${toLatex(linearExpr(f))} = 0$ dà $x = ${toLatex(num(Rational.of(-f.q, f.p)))}$`,
      );
      return [
        step("**Passo 1.** Il primo membro è già un prodotto e il secondo è zero: si usa la legge di annullamento del prodotto, un fattore alla volta."),
        step(`**Passo 2.** ${capitalize(zeros.join("; "))}. Ogni zero ha il segno opposto al numero nel fattore, diviso per il coefficiente della $x$.`, final),
      ];
    }
    case "collect": {
      const { a, r1, r2 } = model;
      const quadratic = upolyToExpr(upMul(upoly(a), fromRoots([r1, r2])));
      return [
        step("**Passo 1.** Tutti i termini contengono la $x$: raccoglila (non dividere per $x$, che può valere zero).", `x\\left(${toLatex(quadratic)}\\right) = 0`),
        step(
          `**Passo 2.** Legge di annullamento del prodotto: $x = 0$ oppure $${toLatex(quadratic)} = 0$. Il trinomio ha soluzioni con somma $${r1 + r2}$ e prodotto $${r1 * r2}$: $${Math.min(r1, r2)}$ e $${Math.max(r1, r2)}$.`,
          `${toLatex(leftOf(model))} = ${a === 1 ? "" : a}x\\left(${toLatex(xMinus(r1))}\\right)\\left(${toLatex(xMinus(r2))}\\right)`,
        ),
        step("**Passo 3.** Le soluzioni sono tre.", final),
      ];
    }
    case "evenBinomial": {
      const { a, k } = model;
      return [
        step(`**Passo 1.** È una binomia: isola la potenza${a === 1 ? "" : `, dividendo per $${a}$`}, $x^{4} = ${k ** 4}$. L'esponente è pari e il numero è positivo, quindi ci sono due soluzioni opposte.`),
        step(`**Passo 2.** $x = \\pm\\sqrt[4]{${k ** 4}} = \\pm ${k}$. Infatti $x^{4} - ${k ** 4} = \\left(x^{2} - ${k * k}\\right)\\left(x^{2} + ${k * k}\\right)$ e $x^{2} + ${k * k}$ non si annulla mai.`, final),
      ];
    }
    case "biquadratic": {
      const { t1, t2 } = model;
      const back = [t1, t2].map((value) =>
        value.sign() < 0
          ? `$x^{2} = ${toLatex(num(value))}$ non ha soluzioni (un quadrato non è mai negativo)`
          : `$x^{2} = ${toLatex(num(value))}$ dà $x = \\pm ${surdLatex(Surd.sqrt(value))}$`,
      );
      return [
        step("**Passo 1.** È una biquadratica: poni $t = x^2$ e ottieni un'equazione di secondo grado in $t$.", `${toLatex(tPoly(t1, t2))} = 0`),
        step(`**Passo 2.** Le soluzioni in $t$ hanno somma $${toLatex(num(t1.add(t2)))}$ e prodotto $${toLatex(num(t1.mul(t2)))}$: $t = ${toLatex(num(t1.cmp(t2) < 0 ? t1 : t2))}$ e $t = ${toLatex(num(t1.cmp(t2) < 0 ? t2 : t1))}$. Non sono ancora le soluzioni: si torna alla $x$.`),
        step(`**Passo 3.** ${back.join("; ")}.`, final),
      ];
    }
    case "oddBinomial": {
      const { k } = model;
      return [
        step(`**Passo 1.** È una binomia: $x^{3} = ${toLatex(num(-(k ** 3)))}$. L'esponente è dispari: c'è sempre una sola soluzione, anche se il numero è negativo.`),
        step(`**Passo 2.** $x = \\sqrt[3]{${toLatex(num(-(k ** 3)))}} = ${-k}$, perché $(${-k})^{3} = ${-(k ** 3)}$.`, final),
      ];
    }
    case "trinomial": {
      const { k1, k2 } = model;
      const [t1, t2] = [k1 ** 3, k2 ** 3].sort((a, b) => a - b) as [number, number];
      return [
        step("**Passo 1.** È una trinomia: poni $t = x^3$ e ottieni un'equazione di secondo grado in $t$.", `${toLatex(tPoly(t1, t2))} = 0`),
        step(`**Passo 2.** Le soluzioni in $t$ hanno somma $${t1 + t2}$ e prodotto $${t1 * t2}$: $t = ${t1}$ e $t = ${t2}$. Si torna alla $x$.`),
        step(
          `**Passo 3.** $x^{3} = ${t1}$ dà $x = ${Math.cbrt(t1)}$ e $x^{3} = ${t2}$ dà $x = ${Math.cbrt(t2)}$: con l'esponente dispari ogni $t$, anche negativo, dà una sola $x$.`,
          final,
        ),
      ];
    }
    case "ruffini": {
      const [first] = rootsInOrder(model);
      const p = polynomialOf(model);
      const division = ruffini(p, first);
      const quotient = upolyToExpr(division.quotient);
      const [, second, third] = rootsInOrder(model);
      const c0 = (p[0] as Rational).toInteger();
      return [
        step(`**Passo 1.** Non si raccoglie niente: cerca uno zero tra i divisori di $${Math.abs(c0)}$. Con $x = ${first}$ il polinomio vale $0$: dividi per $${toLatex(xMinus(first))}$ con la regola di Ruffini.`, ruffiniTableToLatex(division)),
        step(
          `**Passo 2.** Il polinomio è $\\left(${toLatex(xMinus(first))}\\right)\\left(${toLatex(quotient)}\\right)$. Il trinomio ha soluzioni con somma $${second + third}$ e prodotto $${second * third}$: $${Math.min(second, third)}$ e $${Math.max(second, third)}$.`,
        ),
        step(`**Passo 3.** Per la legge di annullamento del prodotto le soluzioni sono tre, compresa $x = ${first}$ trovata con Ruffini.`, final),
      ];
    }
  }
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** x − r scritto a mano. */
const xMinus = (r: number): Expr => (r === 0 ? x : add(x, num(-r)));

function hintsOf(model: Model): [string, string] {
  const write = "Più soluzioni si scrivono $x = 1 \\vee x = -2$.";
  switch (model.kind) {
    case "product":
      return ["Il primo membro è un prodotto e il secondo è zero: quale legge usi?", `Poni uguale a zero un fattore alla volta e risolvi. ${write}`];
    case "collect":
      return ["Tutti i termini hanno la $x$: puoi scomporre il primo membro. Puoi dividere per $x$?", `Raccogli la $x$, poi usa la legge di annullamento del prodotto. ${write}`];
    case "evenBinomial":
    case "oddBinomial":
      return ["C'è solo una potenza di $x$ e un numero: è una binomia. L'esponente è pari o dispari?", `Isola la potenza: $x^n = k$. Con $n$ pari e $k > 0$ due soluzioni opposte, con $n$ dispari una sola. ${write}`];
    case "biquadratic":
    case "trinomial":
      return [
        "Compaiono solo due potenze di $x$, una doppia dell'altra, e un numero: quale sostituzione la riduce al secondo grado?",
        `Poni $t = x^${model.kind === "biquadratic" ? 2 : 3}$, risolvi in $t$ e poi torna alla $x$ per ogni valore trovato. ${write}`,
      ];
    case "ruffini":
      return ["È di terzo grado e non si raccoglie niente: come trovi un primo fattore?", `Prova i divisori del termine noto: quando il polinomio vale $0$, dividi con Ruffini. ${write}`];
  }
}

function draftOf(model: Model): ExerciseDraft {
  const correct = answerOf(model);
  return {
    prompt: `Risolvi l'equazione $${display(leftOf(model))} = 0$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: stepsOf(model, correct),
    hints: hintsOf(model),
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A04",
  lesson: "V1.M05.L04",
  title: "Equazioni di grado superiore",
  levels: [1, 2, 3],
  errors: [
    "ALG.SEGNI_FATTORI", "ALG.COEFFICIENTE_INVERTITO", "ALG.DIVISIONE_PER_INCOGNITA", "ALG.FORMULA_RISOLUTIVA", "ALG.INCOGNITA_AUSILIARIA",
    "ALG.RADICE_DEL_QUADRATO", "COND.RADICE_PARI", "ALG.RADICE_DISPARI", "CALC.SEGNO_TRASPORTO",
  ],
  limits: { maxInteger: 60, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal primo membro del testo: il motore lo sviluppa e ne cerca gli zeri scomponendolo.
    const left = leftOf(model);
    const found = solutionsFromCandidates([left], (value) => satisfies(left, num(0), value));
    return found !== null && sameSet(found, answer.correct);
  },
});
