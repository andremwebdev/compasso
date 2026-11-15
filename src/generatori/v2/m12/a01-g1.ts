// V2.M12.A01.g1 — Equazioni differenziali del primo ordine: variabili separabili e lineari.
//
// Costruzione all'indietro: si sceglie la soluzione (la famiglia c·e^{G(x)}, la soluzione
// particolare m·e^{kx}, le costanti del problema di Cauchy) e da lì l'equazione. La risposta di
// Andrea non si confronta con la soluzione scelta: si SOSTITUISCE nell'equazione (controllo
// «differentialEquation»), si contano le costanti arbitrarie indipendenti e si controllano le
// condizioni di Cauchy. La verifica del generatore rifà la sostituzione in modo simbolico.
//
// Livello 1: y′ = ay, y′ = ay + b (anche scritta y′ − ay = b).
// Livello 2: variabili separabili y′ = g(x)·y, lineari con termine esponenziale, problema di Cauchy.
// Livello 3: y′ = kx·y², coefficiente variabile y′ + (n/x)·y = b·x^m, problemi di Cauchy.

import { defineGenerator, type CauchyCondition, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { cos, div, exp, mul, num, pow, sin, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { combinationLatex, DY, odePrompt, solvesSymbolically, Y } from "../../comuni/ode";
import { power, scaled, sum, times } from "../../comuni/writing";

type Rng_ = GeneratorContext["rng"];

const x = sym("x");
const C = sym("c");
const tex = (expr: Expr): string => toLatex(expr);

const COSTANTE = "AN.EDO_COSTANTE";
const SEPARAZIONE = "AN.EDO_SEPARAZIONE";
const FATTORE = "AN.EDO_FATTORE_INTEGRANTE";
const PARTICOLARE = "AN.EDO_PARTICOLARE";
const CAUCHY = "AN.CAUCHY_CONDIZIONI";
const PRIM = "AN.PRIMITIVA_ELEMENTARE";

const wrong = (error: ErrorCode, value: Expr): ExpectedWrong<Expr> => ({ error, value });
/** c·e^{expr} scritto a mano (e^{0} = 1). */
const cExp = (coefficient: Expr | number, exponent: Expr): Expr => (typeof coefficient === "number" ? times(coefficient, exp(exponent)) : mul(coefficient, exp(exponent)));

type Model =
  | { readonly kind: "homogeneous"; readonly a: number }
  | { readonly kind: "affine"; readonly a: number; readonly m: number; readonly moved: boolean }
  | { readonly kind: "separable"; readonly g: "power" | "cos" | "sin"; readonly n: number; readonly k: number }
  | { readonly kind: "linearExp"; readonly a: number; readonly k: number; readonly m: number }
  | { readonly kind: "cauchyAffine"; readonly a: number; readonly m: number; readonly y0: number }
  | { readonly kind: "squared"; readonly k: number }
  | { readonly kind: "variable"; readonly n: number; readonly m: number; readonly r: number }
  | { readonly kind: "cauchySeparable"; readonly n: number; readonly k: number; readonly y0: number }
  | { readonly kind: "cauchyLinearExp"; readonly a: number; readonly k: number; readonly m: number; readonly y0: number };

interface Plan {
  /** L'equazione in LaTeX, e come left = right nelle lettere x, y, y′. */
  readonly equation: string;
  readonly left: Expr;
  readonly right: Expr;
  readonly conditions: readonly CauchyCondition[];
  readonly solution: Expr;
  readonly wrong: readonly ExpectedWrong<Expr>[];
  readonly steps: readonly string[];
  readonly hint: string;
}

/** a·x scritto a mano. */
const ax = (a: number): Expr => times(a, x);
/** «y' = ay + b» in LaTeX. */
const affineRight = (a: number, b: number): string => combinationLatex([[a, "y"], ...(b === 0 ? [] : ([[b, ""]] as const))]);

function planOf(model: Model): Plan {
  switch (model.kind) {
    case "homogeneous": {
      const { a } = model;
      return {
        equation: `y' = ${affineRight(a, 0)}`,
        left: DY,
        right: times(a, Y),
        conditions: [],
        solution: cExp(C, ax(a)),
        wrong: [
          // Costante aggiunta alla fine invece che nata con l'integrazione.
          wrong(COSTANTE, sum(exp(ax(a)), C)),
          // Integrato solo il coefficiente, come se y fosse un numero.
          wrong(SEPARAZIONE, sum(ax(a), C)),
          // Segno dell'esponente sbagliato.
          wrong(FATTORE, cExp(C, ax(-a))),
        ],
        steps: [
          String.raw`È a variabili separabili: $\frac{dy}{dx} = ${affineRight(a, 0)}$. Oltre alla soluzione $y = 0$, per $y \ne 0$ si separa: $\frac{dy}{y} = ${tex(num(a))}\,dx$.`,
          String.raw`Integrando: $\ln|y| = ${tex(ax(a))} + c_0$, cioè $|y| = e^{c_0} e^{${tex(ax(a))}}$.`,
          String.raw`Riassumendo $\pm e^{c_0}$ (e la soluzione nulla) in un'unica costante $c$ reale: $y = ${tex(cExp(C, ax(a)))}$. La costante moltiplica l'esponenziale: non si aggiunge alla fine.`,
        ],
        hint: String.raw`Separa le variabili: $\frac{dy}{y} = ${tex(num(a))}\,dx$, poi integra i due membri.`,
      };
    }

    case "affine": {
      // y′ = a·y + b con b = −a·m: soluzione c·e^{ax} + m.
      const { a, m, moved } = model;
      const b = -a * m;
      const equation = moved ? `y' ${-a < 0 ? "-" : "+"} ${Math.abs(a) === 1 ? "" : Math.abs(a)}y = ${b}` : `y' = ${affineRight(a, b)}`;
      return {
        equation,
        left: DY,
        right: sum(times(a, Y), num(b)),
        conditions: [],
        solution: sum(cExp(C, ax(a)), num(m)),
        wrong: [
          // Segni dei due esponenziali della formula scambiati.
          wrong(FATTORE, sum(cExp(C, ax(-a)), num(-m))),
          // Solo l'integrale generale dell'omogenea.
          wrong(PARTICOLARE, cExp(C, ax(a))),
          // Costante aggiunta alla fine.
          wrong(COSTANTE, sum(exp(ax(a)), num(m), C)),
        ],
        steps: [
          String.raw`È lineare del primo ordine: $y' + A(x)\,y = f(x)$ con $A(x) = ${tex(num(-a))}$ e $f(x) = ${b}$${moved ? "" : " (porta il termine con $y$ a sinistra)"}.`,
          String.raw`Con $A$ primitiva del coefficiente, $A(x) = ${tex(ax(-a))}$: la formula $y = e^{-A(x)}\left(\int f(x)\,e^{A(x)}\,dx + c\right)$ dà $y = e^{${tex(ax(a))}}\left(\int ${b}\,e^{${tex(ax(-a))}}\,dx + c\right)$.`,
          String.raw`$\int ${b}\,e^{${tex(ax(-a))}}\,dx = ${tex(cExp(m, ax(-a)))}$, quindi $y = ${tex(sum(cExp(C, ax(a)), num(m)))}$. Controllo: la costante $y = ${m}$ è una soluzione particolare, perché annulla $y'$ e il secondo membro.`,
        ],
        hint: String.raw`È lineare a coefficienti costanti: cerca prima una soluzione costante $y = m$ (allora $y' = 0$), poi aggiungi l'integrale generale dell'omogenea $y' = ${affineRight(a, 0)}$.`,
      };
    }

    case "separable": {
      // y′ = g(x)·y con G primitiva: k·xⁿ⁺¹ (g = k(n+1)xⁿ), k·sin x (g = k cos x), −k·cos x (g = k sin x).
      const { g, n, k } = model;
      const G = g === "power" ? times(k, power(n + 1)) : g === "cos" ? times(k, sin(x)) : times(-k, cos(x));
      const gx = g === "power" ? times(k * (n + 1), power(n)) : g === "cos" ? times(k, cos(x)) : times(k, sin(x));
      const right = g === "power" ? times(k * (n + 1), mul(power(n), Y)) : times(k, mul(Y, g === "cos" ? cos(x) : sin(x)));
      return {
        equation: `y' = ${tex(right)}`,
        left: DY,
        right,
        conditions: [],
        solution: cExp(C, G),
        wrong: [
          wrong(COSTANTE, sum(exp(G), C)),
          // Integrato solo g(x).
          wrong(SEPARAZIONE, sum(G, C)),
          wrong(FATTORE, cExp(C, times(-1, G))),
        ],
        steps: [
          String.raw`È a variabili separabili. Oltre a $y = 0$, per $y \ne 0$: $\frac{dy}{y} = ${tex(gx)}\,dx$.`,
          String.raw`Integrando i due membri, ognuno nella sua variabile: $\ln|y| = ${tex(G)} + c_0$.`,
          String.raw`Quindi $y = c\,e^{${tex(G)}}$, con $c$ reale qualsiasi (comprende la soluzione nulla).`,
        ],
        hint: String.raw`Porta $y$ a sinistra e $dx$ a destra: $\frac{dy}{y} = ${tex(gx)}\,dx$.`,
      };
    }

    case "linearExp": {
      // y′ + a·y = m(k + a)·e^{kx}: soluzione c·e^{−ax} + m·e^{kx}.
      const { a, k, m } = model;
      const b = m * (k + a);
      const forcing = cExp(b, ax(k));
      const particular = cExp(m, ax(k));
      return {
        equation: `${combinationLatex([[1, "y'"], [a, "y"]])} = ${tex(forcing)}`,
        left: sum(DY, times(a, Y)),
        right: forcing,
        conditions: [],
        solution: sum(cExp(C, ax(-a)), particular),
        wrong: [
          wrong(PARTICOLARE, cExp(C, ax(-a))),
          // Segni degli esponenti della formula scambiati.
          wrong(FATTORE, k === a ? sum(cExp(C, ax(a)), particular) : sum(cExp(C, ax(a)), scaled(b, k - a, exp(ax(k))))),
          wrong(COSTANTE, sum(particular, C)),
        ],
        steps: [
          String.raw`È lineare del primo ordine con coefficiente costante $${a}$: una primitiva del coefficiente è $A(x) = ${tex(ax(a))}$.`,
          String.raw`Formula: $y = e^{-A(x)}\left(\int f(x)\,e^{A(x)}\,dx + c\right) = e^{${tex(ax(-a))}}\left(\int ${tex(cExp(b, ax(k + a)))}\,dx + c\right)$.`,
          String.raw`$\int ${tex(cExp(b, ax(k + a)))}\,dx = ${tex(cExp(m, ax(k + a)))}$, e moltiplicando per $e^{${tex(ax(-a))}}$: $y = ${tex(sum(cExp(C, ax(-a)), particular))}$.`,
        ],
        hint: String.raw`Moltiplica i due membri per $e^{${tex(ax(a))}}$: il primo membro diventa $\left(e^{${tex(ax(a))}}\,y\right)'$.`,
      };
    }

    case "cauchyAffine": {
      // y′ = a·y + b, y(0) = y₀ con b = −a·m: y = (y₀ − m)·e^{ax} + m.
      const { a, m, y0 } = model;
      const b = -a * m;
      return {
        equation: `y' = ${affineRight(a, b)}`,
        left: DY,
        right: sum(times(a, Y), num(b)),
        conditions: [{ order: 0, at: num(0), value: num(y0) }],
        solution: sum(cExp(y0 - m, ax(a)), num(m)),
        wrong: [
          // Condizione imposta sull'omogenea, prima di aggiungere la particolare.
          wrong(CAUCHY, sum(cExp(y0, ax(a)), num(m))),
          // Lasciata la costante.
          wrong(CAUCHY, sum(cExp(C, ax(a)), num(m))),
          // Senza soluzione particolare.
          wrong(PARTICOLARE, cExp(y0, ax(a))),
        ],
        steps: [
          String.raw`Integrale generale: una soluzione costante è $y = ${m}$ (annulla il secondo membro), e l'omogenea $y' = ${affineRight(a, 0)}$ dà $c\,e^{${tex(ax(a))}}$. Quindi $y = ${tex(sum(cExp(C, ax(a)), num(m)))}$.`,
          String.raw`Condizione iniziale, sull'integrale generale completo: $y(0) = c + ${tex(num(m))} = ${y0}$, quindi $c = ${y0 - m}$.`.replace("+ -", "- "),
          String.raw`La soluzione è $y = ${tex(sum(cExp(y0 - m, ax(a)), num(m)))}$, senza più costanti arbitrarie.`,
        ],
        hint: String.raw`Trova prima l'integrale generale (con la costante $c$), poi imponi $y(0) = ${y0}$.`,
      };
    }

    case "squared": {
      // y′ = k·x·y²: y = −2/(k·x² + c). Con k = −K < 0 si scrive 2/(K·x² + c) (la costante cambia nome).
      const { k } = model;
      const s = Math.sign(k);
      const kx2 = times(Math.abs(k), power(2));
      return {
        equation: `y' = ${tex(times(k, mul(x, pow(Y, 2))))}`,
        left: DY,
        right: times(k, mul(x, pow(Y, 2))),
        conditions: [],
        solution: times(-s, div(num(2), sum(kx2, C))),
        wrong: [
          wrong(COSTANTE, sum(times(-s, div(num(2), kx2)), C)),
          // Separato come se fosse y′ = kx·y.
          wrong(SEPARAZIONE, cExp(C, scaled(k, 2, power(2)))),
          // Primitiva di 1/y² con il segno sbagliato.
          wrong(PRIM, times(s, div(num(2), sum(kx2, C)))),
        ],
        steps: [
          String.raw`È a variabili separabili. Oltre a $y = 0$, per $y \ne 0$: $\frac{dy}{y^{2}} = ${tex(times(k, x))}\,dx$.`,
          String.raw`Una primitiva di $\frac{1}{y^{2}}$ è $-\frac{1}{y}$: integrando, $-\frac{1}{y} = ${tex(scaled(k, 2, power(2)))} + c_0$.`,
          String.raw`Ricavando $y$ e chiamando $c = ${s > 0 ? "2c_0" : "-2c_0"}$: $y = ${tex(times(-s, div(num(2), sum(kx2, C))))}$.`,
        ],
        hint: String.raw`Separa: $\frac{dy}{y^{2}} = ${tex(times(k, x))}\,dx$. Attenzione alla primitiva di $\frac{1}{y^{2}}$.`,
      };
    }

    case "variable": {
      // y′ + (n/x)·y = r(m + n + 1)·x^m: y = c/xⁿ + r·x^{m+1}.
      const { n, m, r } = model;
      const b = r * (m + n + 1);
      const forcing = times(b, power(m));
      const particular = times(r, power(m + 1));
      const homogeneous = div(C, power(n));
      return {
        equation: `${combinationLatex([[1, "y'"], [`\\frac{${n}}{x}`, "y"]])} = ${tex(forcing)}`,
        left: sum(DY, mul(div(num(n), x), Y)),
        right: forcing,
        conditions: [],
        solution: sum(homogeneous, particular),
        wrong: [
          wrong(PARTICOLARE, homogeneous),
          // Esponenti della formula scambiati: e^{A} fuori, e^{−A} dentro.
          ...(m - n + 1 === 0 ? [] : [wrong(FATTORE, sum(mul(C, power(n)), scaled(b, m - n + 1, power(m + 1))))]),
          wrong(COSTANTE, sum(particular, C)),
          wrong(FATTORE, sum(homogeneous, scaled(b, m + 1, power(m + 1)))),
        ].slice(0, 3),
        steps: [
          String.raw`È lineare del primo ordine (per $x > 0$): il coefficiente è $\frac{${n}}{x}$, con primitiva $A(x) = ${n === 1 ? "" : n}\ln x$, quindi $e^{A(x)} = ${tex(power(n))}$.`,
          String.raw`Formula: $y = e^{-A(x)}\left(\int f(x)\,e^{A(x)}\,dx + c\right) = \frac{1}{${tex(power(n))}}\left(\int ${tex(times(b, power(m + n)))}\,dx + c\right)$.`,
          String.raw`$\int ${tex(times(b, power(m + n)))}\,dx = ${tex(times(r, power(m + n + 1)))}$, quindi $y = ${tex(sum(homogeneous, particular))}$.`,
        ],
        hint: String.raw`Una primitiva di $\frac{${n}}{x}$ è $${n === 1 ? "" : n}\ln x$, e $e^{${n === 1 ? "" : n}\ln x} = ${tex(power(n))}$: moltiplica l'equazione per $${tex(power(n))}$.`,
      };
    }

    case "cauchySeparable": {
      // y′ = k(n+1)xⁿ·y, y(0) = y₀: y = y₀·e^{k·xⁿ⁺¹}.
      const { n, k, y0 } = model;
      const G = times(k, power(n + 1));
      const gx = times(k * (n + 1), power(n));
      const right = times(k * (n + 1), mul(power(n), Y));
      return {
        equation: `y' = ${tex(right)}`,
        left: DY,
        right,
        conditions: [{ order: 0, at: num(0), value: num(y0) }],
        solution: cExp(y0, G),
        wrong: [
          wrong(CAUCHY, cExp(C, G)),
          // Costante aggiunta alla fine e poi imposta.
          wrong(COSTANTE, sum(exp(G), num(y0 - 1))),
          wrong(FATTORE, cExp(y0, times(-1, G))),
        ],
        steps: [
          String.raw`Separando: $\frac{dy}{y} = ${tex(gx)}\,dx$, quindi $\ln|y| = ${tex(G)} + c_0$ e l'integrale generale è $y = c\,e^{${tex(G)}}$.`,
          String.raw`Condizione iniziale: $y(0) = c\,e^{0} = c = ${y0}$.`,
          String.raw`La soluzione è $y = ${tex(cExp(y0, G))}$.`,
        ],
        hint: String.raw`Separa le variabili, trova l'integrale generale e poi imponi $y(0) = ${y0}$.`,
      };
    }

    case "cauchyLinearExp": {
      // y′ + a·y = m(k + a)·e^{kx}, y(0) = y₀: y = (y₀ − m)·e^{−ax} + m·e^{kx}.
      const { a, k, m, y0 } = model;
      const b = m * (k + a);
      const forcing = cExp(b, ax(k));
      const particular = cExp(m, ax(k));
      return {
        equation: `${combinationLatex([[1, "y'"], [a, "y"]])} = ${tex(forcing)}`,
        left: sum(DY, times(a, Y)),
        right: forcing,
        conditions: [{ order: 0, at: num(0), value: num(y0) }],
        solution: sum(cExp(y0 - m, ax(-a)), particular),
        wrong: [
          // Condizione imposta sull'omogenea.
          wrong(CAUCHY, sum(cExp(y0, ax(-a)), particular)),
          wrong(PARTICOLARE, cExp(y0, ax(-a))),
          wrong(FATTORE, sum(cExp(y0 - m, ax(a)), particular)),
        ],
        steps: [
          String.raw`Integrale generale: l'omogenea $y' + ${tex(times(a, Y))} = 0$ dà $c\,e^{${tex(ax(-a))}}$; una soluzione particolare si cerca come $A\,e^{${tex(ax(k))}}$: sostituendo, $${k + a === 1 ? "" : k + a === -1 ? "-" : k + a}A = ${b}$, cioè $A = ${m}$. Quindi $y = ${tex(sum(cExp(C, ax(-a)), particular))}$.`,
          String.raw`Condizione iniziale sull'integrale generale completo: $y(0) = c + ${tex(num(m))} = ${y0}$, quindi $c = ${y0 - m}$.`.replace("+ -", "- "),
          String.raw`La soluzione è $y = ${tex(sum(cExp(y0 - m, ax(-a)), particular))}$.`,
        ],
        hint: String.raw`Trova l'integrale generale completo (omogenea più particolare), poi imponi $y(0) = ${y0}$: la condizione va imposta dopo aver aggiunto la particolare.`,
      };
    }
  }
}

// ───────────────────────────── scelta dei numeri ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  return rng.bool(0.3)
    ? { kind: "homogeneous", a: rng.intExcept(-6, 6) }
    : { kind: "affine", a: rng.intExcept(-4, 4), m: rng.intExcept(-5, 5), moved: rng.bool() };
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["separable", "separable", "linearExp", "linearExp", "cauchyAffine", "cauchyAffine"] as const);
  switch (shape) {
    case "separable": {
      const g = rng.pick(["power", "power", "cos", "sin"] as const);
      return { kind: "separable", g, n: rng.int(1, 2), k: rng.intExcept(-3, 3) };
    }
    case "linearExp": {
      const a = rng.intExcept(-3, 3);
      return { kind: "linearExp", a, k: rng.intExcept(-3, 3, [0, -a]), m: rng.intExcept(-3, 3) };
    }
    case "cauchyAffine": {
      const m = rng.intExcept(-5, 5);
      return { kind: "cauchyAffine", a: rng.intExcept(-3, 3), m, y0: rng.intExcept(-5, 6, [0, m]) };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["squared", "variable", "variable", "cauchySeparable", "cauchyLinearExp", "cauchyLinearExp"] as const);
  switch (shape) {
    case "squared":
      return { kind: "squared", k: rng.intExcept(-4, 4) };
    case "variable":
      return { kind: "variable", n: rng.int(1, 2), m: rng.int(0, 2), r: rng.intExcept(-3, 3) };
    case "cauchySeparable":
      return { kind: "cauchySeparable", n: rng.int(1, 2), k: rng.intExcept(-2, 2), y0: rng.intExcept(-5, 5, [0, 1]) };
    case "cauchyLinearExp": {
      const a = rng.intExcept(-3, 3);
      const m = rng.intExcept(-3, 3);
      return { kind: "cauchyLinearExp", a, k: rng.intExcept(-3, 3, [0, -a, a]), m, y0: rng.intExcept(-4, 5, [0, m]) };
    }
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

const FIRST_HINT = String.raw`Riconosci il tipo: se si può scrivere $y' = f(x)\,g(y)$ è a variabili separabili; se si può scrivere $y' + a(x)\,y = f(x)$ è lineare. Alla fine controlla sostituendo la soluzione nell'equazione.`;

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const cauchy = plan.conditions.length > 0;
  return {
    prompt: odePrompt(plan.equation, plan.conditions, 1),
    answer: {
      kind: "expression",
      correct: plan.solution,
      wrong: plan.wrong,
      check: {
        kind: "differentialEquation",
        variable: "x",
        left: plan.left,
        right: plan.right,
        constants: cauchy ? 0 : 1,
        conditions: plan.conditions,
        wrongConstants: cauchy ? CAUCHY : COSTANTE,
        ...(cauchy ? { wrongConditions: CAUCHY as ErrorCode } : {}),
      },
    },
    steps: [...plan.steps.map((text) => ({ text })), { text: String.raw`Controllo: sostituendo la soluzione e la sua derivata nell'equazione si ottiene un'identità${cauchy ? ", e la condizione iniziale è rispettata" : ""}.` }],
    hints: [FIRST_HINT, plan.hint],
  };
}

export default defineGenerator({
  code: "V2.M12.A01.g1",
  skill: "V2.M12.A01",
  lesson: "V2.M12.L02",
  title: "Equazioni differenziali del primo ordine: separabili e lineari",
  levels: [1, 2, 3],
  errors: [COSTANTE, SEPARAZIONE, FATTORE, PARTICOLARE, CAUCHY, PRIM],
  limits: { maxInteger: 60, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression" || answer.check?.kind !== "differentialEquation") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    if (!exercise.prompt.includes(plan.equation) || !equivalent(answer.check.left, plan.left)) return false;
    return solvesSymbolically(answer.correct, plan.left, plan.right, plan.conditions.length > 0 ? 0 : 1, plan.conditions);
  },
});


