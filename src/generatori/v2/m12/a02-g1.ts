// V2.M12.A02.g1 — Equazioni differenziali lineari del secondo ordine a coefficienti costanti.
//
// Costruzione all'indietro: si scelgono le radici dell'equazione caratteristica (reali distinte,
// doppia, complesse coniugate), la soluzione particolare (m·x + n oppure m·e^{kx}, con il fattore x
// in caso di risonanza) e, per i problemi di Cauchy, le costanti; da lì i coefficienti, il termine
// noto e le condizioni iniziali. La risposta di Andrea si SOSTITUISCE nell'equazione (controllo
// «differentialEquation»): devono esserci due costanti arbitrarie indipendenti (nessuna nel problema
// di Cauchy) e le condizioni devono valere. La verifica del generatore rifà la sostituzione in
// modo simbolico.
//
// Livello 1: equazioni omogenee, nei tre casi del discriminante.
// Livello 2: equazioni complete con termine noto polinomiale o esponenziale (senza risonanza).
// Livello 3: risonanza, problemi di Cauchy omogenei e completi.

import { checkVerdict, defineGenerator, sameUnderCheck, type CauchyCondition, type DifferentialEquationCheck, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { cos, exp, num, sin, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { combinationLatex, DDY, DY, odePrompt, solvesSymbolically, Y } from "../../comuni/ode";
import { linear, product, scaled, sum, times } from "../../comuni/writing";

type Rng_ = GeneratorContext["rng"];

const x = sym("x");
const C1 = sym("c_1");
const C2 = sym("c_2");
const tex = (expr: Expr): string => toLatex(expr);

const COSTANTE = "AN.EDO_COSTANTE";
const CARATTERISTICA = "AN.EDO_CARATTERISTICA";
const PARTICOLARE = "AN.EDO_PARTICOLARE";
const CAUCHY = "AN.CAUCHY_CONDIZIONI";

const wrong = (error: ErrorCode, value: Expr): ExpectedWrong<Expr> => ({ error, value });

/** Un coefficiente: una costante arbitraria (simbolo) o un numero p/q. */
type Coefficient = Expr | readonly [p: number, q: number];

/** coefficient·f scritto a mano. */
function coefficientTimes(coefficient: Coefficient, f: Expr): Expr {
  if (Array.isArray(coefficient)) {
    const [p, q] = coefficient as readonly [number, number];
    return scaled(p, q, f);
  }
  return product(coefficient as Expr, f);
}

/** e^{rx} (1 se r = 0). */
const eRx = (r: number): Expr => (r === 0 ? num(1) : exp(times(r, x)));

/** Le radici dell'equazione caratteristica. */
type Roots =
  | { readonly kind: "distinct"; readonly r1: number; readonly r2: number }
  | { readonly kind: "double"; readonly r: number }
  | { readonly kind: "complex"; readonly alpha: number; readonly beta: number };

/** p e q di y″ + p·y′ + q·y. */
function coefficientsOf(roots: Roots): [p: number, q: number] {
  switch (roots.kind) {
    case "distinct":
      return [-(roots.r1 + roots.r2), roots.r1 * roots.r2];
    case "double":
      return [-2 * roots.r, roots.r * roots.r];
    case "complex":
      return [-2 * roots.alpha, roots.alpha * roots.alpha + roots.beta * roots.beta];
  }
}

/** L'integrale generale dell'omogenea con i due coefficienti dati. */
function homogeneous(roots: Roots, a: Coefficient, b: Coefficient): Expr {
  switch (roots.kind) {
    case "distinct":
      return sum(coefficientTimes(a, eRx(roots.r1)), coefficientTimes(b, eRx(roots.r2)));
    case "double":
      // (a + b·x)·e^{rx}
      return sum(coefficientTimes(a, eRx(roots.r)), coefficientTimes(b, roots.r === 0 ? x : product(x, eRx(roots.r))));
    case "complex": {
      const trig = (f: typeof cos): Expr => f(times(roots.beta, x));
      const inside = sum(coefficientTimes(a, trig(cos)), coefficientTimes(b, trig(sin)));
      return roots.alpha === 0 ? inside : product(eRx(roots.alpha), inside);
    }
  }
}

/** Le radici in LaTeX, per i passaggi. */
function rootsLatex(roots: Roots): string {
  switch (roots.kind) {
    case "distinct":
      return `\\lambda_1 = ${roots.r1}, \\quad \\lambda_2 = ${roots.r2}`;
    case "double":
      return `\\lambda = ${roots.r} \\text{ (doppia)}`;
    case "complex": {
      const im = `${roots.beta === 1 ? "" : roots.beta}i`;
      return `\\lambda = ${roots.alpha === 0 ? "" : `${roots.alpha} `}\\pm ${im}`;
    }
  }
}

function characteristicLatex(p: number, q: number): string {
  return `${combinationLatex([[1, "\\lambda^{2}"], [p, "\\lambda"], [q, ""]])} = 0`;
}

/** Il caso del discriminante, a parole, con la forma dell'integrale generale. */
function caseText(roots: Roots): string {
  switch (roots.kind) {
    case "distinct":
      return String.raw`Due radici reali distinte: l'integrale generale è $c_1 e^{\lambda_1 x} + c_2 e^{\lambda_2 x}$.`;
    case "double":
      return String.raw`Una radice doppia: l'integrale generale è $(c_1 + c_2 x)\,e^{\lambda x}$. Con $c_1 e^{\lambda x} + c_2 e^{\lambda x}$ le costanti si sommerebbero in una sola.`;
    case "complex":
      return String.raw`Due radici complesse coniugate $\alpha \pm i\beta$ con $\alpha = ${roots.alpha}$ e $\beta = ${roots.beta}$: l'integrale generale è $e^{\alpha x}(c_1 \cos \beta x + c_2 \sin \beta x)$.`;
  }
}

// ───────────────────────────── il modello ─────────────────────────────

type Forcing = { readonly kind: "none" } | { readonly kind: "linear"; readonly m: number; readonly n: number } | { readonly kind: "exp"; readonly m: number; readonly k: number } | { readonly kind: "resonance"; readonly m: number };

interface Model {
  /** Fattore per cui è moltiplicata l'equazione (coefficiente di y″). */
  readonly scale: number;
  readonly roots: Roots;
  readonly forcing: Forcing;
  /** Costanti del problema di Cauchy (null: integrale generale). */
  readonly cauchy: readonly [number, number] | null;
}

interface Plan {
  readonly equation: string;
  readonly left: Expr;
  readonly right: Expr;
  readonly conditions: readonly CauchyCondition[];
  readonly solution: Expr;
  readonly wrong: readonly ExpectedWrong<Expr>[];
  readonly steps: readonly string[];
  readonly hint: string;
}

/** L(y) = y″ + p·y′ + q·y applicato a e^{kx}: P(k)·e^{kx}. */
const P = (p: number, q: number, k: number): number => k * k + p * k + q;

/** Le radici con il segno cambiato (l'errore sui segni dell'equazione caratteristica). */
function negated(roots: Roots): Roots | null {
  switch (roots.kind) {
    case "distinct":
      return roots.r1 === -roots.r2 ? null : { kind: "distinct", r1: -roots.r1, r2: -roots.r2 };
    case "double":
      return roots.r === 0 ? null : { kind: "double", r: -roots.r };
    case "complex":
      return roots.alpha === 0 ? null : { kind: "complex", alpha: -roots.alpha, beta: roots.beta };
  }
}

/** La soluzione particolare e il termine noto. */
function particularOf(forcing: Forcing, roots: Roots, p: number, q: number): { yp: Expr; f: Expr; text: string } {
  switch (forcing.kind) {
    case "none":
      return { yp: num(0), f: num(0), text: "" };
    case "linear": {
      const { m, n } = forcing;
      const yp = linear(m, n);
      const f = linear(q * m, p * m + q * n);
      return {
        yp,
        f,
        text: String.raw`Il termine noto è un polinomio di primo grado e $0$ non è radice dell'equazione caratteristica: si cerca $y_p = Ax + B$. Sostituendo ($y_p' = A$, $y_p'' = 0$): $${q === 1 ? "" : q}Ax + ${p === 0 ? "" : `${p}A + `}${q === 1 ? "" : q}B = ${tex(f)}$, quindi $A = ${m}$ e $B = ${n}$.`.replace(/\+ -/g, "- "),
      };
    }
    case "exp": {
      const { m, k } = forcing;
      const value = P(p, q, k);
      const yp = times(m, eRx(k));
      return {
        yp,
        f: times(m * value, eRx(k)),
        text: String.raw`Il termine noto è un esponenziale $e^{${tex(times(k, x))}}$ e $${k}$ non è radice dell'equazione caratteristica: si cerca $y_p = A\,e^{${tex(times(k, x))}}$. Sostituendo, $A(${k * k} ${p * k < 0 ? "-" : "+"} ${Math.abs(p * k)} ${q < 0 ? "-" : "+"} ${Math.abs(q)}) = ${m * value}$, cioè $${value}A = ${m * value}$ e $A = ${m}$.`,
      };
    }
    case "resonance": {
      // Radici distinte r1, r2; termine noto A·e^{r1·x}, y_p = m·x·e^{r1·x} con A = m(r1 − r2).
      if (roots.kind !== "distinct") throw new Error("risonanza solo con radici distinte");
      const { m } = forcing;
      const r1 = roots.r1;
      const amplitude = m * (r1 - roots.r2);
      return {
        yp: times(m, r1 === 0 ? x : product(x, eRx(r1))),
        f: times(amplitude, eRx(r1)),
        text: String.raw`Il termine noto contiene $e^{${tex(times(r1, x))}}$, che è già soluzione dell'omogenea (${r1} è radice semplice): è il caso della risonanza, e si cerca $y_p = A\,x\,e^{${tex(times(r1, x))}}$. Sostituendo, i termini senza $x$ danno $A(2 \cdot ${r1} ${p < 0 ? "-" : "+"} ${Math.abs(p)}) = ${amplitude}$, quindi $A = ${m}$.`,
      };
    }
  }
}

function planOf(model: Model): Plan {
  const { roots, forcing, cauchy, scale } = model;
  const [p, q] = coefficientsOf(roots);
  const { yp, f, text } = particularOf(forcing, roots, p, q);
  const general = sum(homogeneous(roots, C1, C2), yp);
  // L'equazione mostrata è quella «normalizzata» moltiplicata per scale.
  const left = sum(times(scale, DDY), times(scale * p, DY), times(scale * q, Y));
  const right = times(scale, f);
  const equation = `${combinationLatex([[scale, "y''"], [scale * p, "y'"], [scale * q, "y"]])} = ${tex(right)}`;
  const wrongs: ExpectedWrong<Expr>[] = [];
  const minus = negated(roots);
  let solution = general;
  let conditions: CauchyCondition[] = [];
  const steps: string[] = [
    scale === 1
      ? String.raw`Equazione caratteristica: $${characteristicLatex(p, q)}$, con radici $${rootsLatex(roots)}$.`
      : String.raw`Equazione caratteristica: $${combinationLatex([[scale, "\\lambda^{2}"], [scale * p, "\\lambda"], [scale * q, ""]])} = 0$; dividendo per $${scale}$, $${characteristicLatex(p, q)}$, con radici $${rootsLatex(roots)}$.`,
    `${caseText(roots)} Qui: $${tex(homogeneous(roots, C1, C2))}$.`,
  ];
  if (text) steps.push(text, String.raw`Integrale generale: omogenea più particolare, $y = ${tex(general)}$.`);

  if (!cauchy) {
    // Integrale generale.
    if (forcing.kind !== "none") {
      wrongs.push(wrong(PARTICOLARE, homogeneous(roots, C1, C2)));
      if (forcing.kind === "resonance" && roots.kind === "distinct") {
        // Il fattore x c'è, ma il coefficiente è quello del termine noto (non diviso per 2λ₁ + p).
        const amplitude = forcing.m * (roots.r1 - roots.r2);
        wrongs.push(wrong(PARTICOLARE, sum(homogeneous(roots, C1, C2), times(amplitude === forcing.m ? 2 * amplitude : amplitude, roots.r1 === 0 ? x : product(x, eRx(roots.r1))))));
      } else {
        // Il termine noto preso come soluzione particolare.
        wrongs.push(wrong(PARTICOLARE, sum(homogeneous(roots, C1, C2), f)));
      }
    }
    if (minus) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous(minus, C1, C2), yp)));
    switch (roots.kind) {
      case "distinct":
        // Trattata come radice doppia.
        wrongs.push(wrong(CARATTERISTICA, sum(coefficientTimes(C1, eRx(roots.r1)), coefficientTimes(C2, product(x, eRx(roots.r2))), yp)));
        // Una costante sola: è una soluzione, ma non l'integrale generale.
        wrongs.push(wrong(COSTANTE, sum(coefficientTimes(C1, eRx(roots.r1)), yp)));
        // λ² = r² risolta come λ² = −r²: radici immaginarie ±ri.
        if (roots.r1 === -roots.r2) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous({ kind: "complex", alpha: 0, beta: roots.r1 }, C1, C2), yp)));
        break;
      case "double":
        wrongs.push(wrong(COSTANTE, sum(coefficientTimes(C1, eRx(roots.r)), coefficientTimes(C2, eRx(roots.r)), yp)));
        if (roots.r !== 0) wrongs.push(wrong(CARATTERISTICA, sum(coefficientTimes(C1, eRx(roots.r)), coefficientTimes(C2, eRx(-roots.r)), yp)));
        break;
      case "complex": {
        const { alpha, beta } = roots;
        // Radici complesse trattate come reali: α ± β.
        wrongs.push(wrong(CARATTERISTICA, sum(homogeneous({ kind: "distinct", r1: alpha + beta, r2: alpha - beta }, C1, C2), yp)));
        // q usato al posto di β (manca la radice).
        if (beta > 1 && alpha === 0) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous({ kind: "complex", alpha, beta: beta * beta }, C1, C2), yp)));
        // α e β scambiati.
        if (alpha !== 0 && Math.abs(alpha) !== beta) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous({ kind: "complex", alpha: beta, beta: Math.abs(alpha) }, C1, C2), yp)));
        // Esponenziale con β al posto di α.
        if (alpha !== beta) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous({ kind: "complex", alpha: beta, beta }, C1, C2), yp)));
        wrongs.push(wrong(COSTANTE, sum(product(C1, eRx(alpha), cos(times(beta, x))), yp)));
        break;
      }
    }
  } else {
    // Problema di Cauchy: costanti scelte, condizioni ricavate.
    const [a, b] = cauchy;
    solution = sum(homogeneous(roots, [a, 1], [b, 1]), yp);
    // y(0) e y′(0) delle due parti.
    const [h0, h1] = initialValues(roots, a, b);
    const [p0, p1] = forcing.kind === "linear" ? [forcing.n, forcing.m] : forcing.kind === "exp" ? [forcing.m, forcing.m * forcing.k] : forcing.kind === "resonance" ? [0, forcing.m] : [0, 0];
    const y0 = h0 + p0;
    const v0 = h1 + p1;
    conditions = [
      { order: 0, at: num(0), value: num(y0) },
      { order: 1, at: num(0), value: num(v0) },
    ];
    // Lasciate le costanti.
    wrongs.push(wrong(CAUCHY, general));
    // Condizioni imposte sull'omogenea, prima di aggiungere la particolare.
    if (forcing.kind !== "none") {
      const [ha, hb] = solveConstants(roots, y0, v0);
      wrongs.push(wrong(CAUCHY, sum(homogeneous(roots, ha, hb), yp)));
      wrongs.push(wrong(PARTICOLARE, homogeneous(roots, [a, 1], [b, 1])));
    }
    // Costanti scambiate (y(0) va, y′(0) no).
    if (a !== b) wrongs.push(wrong(CAUCHY, sum(homogeneous(roots, [b, 1], [a, 1]), yp)));
    // y′(0) imposta come se fosse c₂, senza derivare davvero.
    const [g0, g1] = [y0 - p0, v0 - p1];
    wrongs.push(wrong(CAUCHY, sum(homogeneous(roots, roots.kind === "distinct" ? [g0 - g1, 1] : [g0, 1], [g1, 1]), yp)));
    if (minus) wrongs.push(wrong(CARATTERISTICA, sum(homogeneous(minus, [a, 1], [b, 1]), yp)));
    const [eq1, eq2] =
      roots.kind === "distinct"
        ? ["c_1 + c_2", combinationLatex([[roots.r1, "c_1"], [roots.r2, "c_2"]])]
        : roots.kind === "double"
          ? ["c_1", combinationLatex([[roots.r, "c_1"], [1, "c_2"]])]
          : ["c_1", combinationLatex([[roots.alpha, "c_1"], [roots.beta, "c_2"]])];
    steps.push(
      String.raw`Condizioni iniziali, sull'integrale generale completo: deriva per avere $y'$, poi poni $x = 0$${forcing.kind === "none" ? "" : String.raw` (la particolare vale $${p0}$ in $0$ e la sua derivata $${p1}$)`}: $\begin{cases} ${eq1} = ${y0 - p0} \\ ${eq2} = ${v0 - p1} \end{cases}$, quindi $c_1 = ${a}$ e $c_2 = ${b}$.`,
      String.raw`La soluzione è $y = ${tex(solution)}$, senza più costanti arbitrarie.`,
    );
  }
  steps.push(String.raw`Controllo: sostituendo $y$, $y'$ e $y''$ nell'equazione si ottiene un'identità${cauchy ? ", e le condizioni iniziali sono rispettate" : ""}.`);
  return {
    equation,
    left,
    right,
    conditions,
    solution,
    wrong: wrongs,
    steps,
    hint: cauchy
      ? String.raw`Trova l'integrale generale con $c_1$ e $c_2$, derivalo, e imponi $y(0)$ e $y'(0)$: è un sistema di due equazioni nelle due costanti.`
      : forcing.kind === "none"
        ? String.raw`Scrivi l'equazione caratteristica $${characteristicLatex(p, q)}$ e guarda il segno del discriminante.`
        : String.raw`Integrale generale = integrale generale dell'omogenea + una soluzione particolare, cercata simile al termine noto${forcing.kind === "resonance" ? " (attenzione: qui l'esponenziale è già soluzione dell'omogenea)" : ""}.`,
  };
}

/** y(0) e y′(0) della parte omogenea con coefficienti a, b. */
function initialValues(roots: Roots, a: number, b: number): [number, number] {
  switch (roots.kind) {
    case "distinct":
      return [a + b, roots.r1 * a + roots.r2 * b];
    case "double":
      return [a, roots.r * a + b];
    case "complex":
      return [a, roots.alpha * a + roots.beta * b];
  }
}

/** Le costanti (frazioni) per cui la parte omogenea ha y(0) = y0 e y′(0) = v0. */
function solveConstants(roots: Roots, y0: number, v0: number): [Coefficient, Coefficient] {
  switch (roots.kind) {
    case "distinct": {
      const d = roots.r1 - roots.r2;
      // a + b = y0, r1·a + r2·b = v0.
      return [
        [v0 - roots.r2 * y0, d],
        [roots.r1 * y0 - v0, d],
      ];
    }
    case "double":
      return [
        [y0, 1],
        [v0 - roots.r * y0, 1],
      ];
    case "complex":
      return [
        [y0, 1],
        [v0 - roots.alpha * y0, roots.beta],
      ];
  }
}

// ───────────────────────────── scelta dei numeri ─────────────────────────────

function chooseRoots(rng: Rng_, kind: Roots["kind"]): Roots {
  switch (kind) {
    case "distinct": {
      const [r1, r2] = rng.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4], 2).sort((a, b) => b - a) as [number, number];
      return { kind: "distinct", r1, r2 };
    }
    case "double":
      return { kind: "double", r: rng.intExcept(-3, 3) };
    case "complex":
      return { kind: "complex", alpha: rng.int(-2, 2), beta: rng.int(1, 3) };
  }
}

const rootKind = (rng: Rng_): Roots["kind"] => rng.pick(["distinct", "distinct", "double", "complex", "complex"] as const);

function drawModel(level: number, rng: Rng_): Model {
  // Al livello 1 l'equazione può essere moltiplicata per un fattore: va prima divisa.
  if (level === 1) return { scale: rng.pick([1, 1, 2, 3, -1]), roots: chooseRoots(rng, rootKind(rng)), forcing: { kind: "none" }, cauchy: null };
  if (level === 2) {
    const roots = chooseRoots(rng, rootKind(rng));
    const [p, q] = coefficientsOf(roots);
    if (q !== 0 && rng.bool()) return { scale: 1, roots, forcing: { kind: "linear", m: rng.intExcept(-3, 3), n: rng.int(-3, 3) }, cauchy: null };
    const k = rng.pick([-2, -1, 1, 2, 3].filter((value) => P(p, q, value) !== 0));
    return { scale: 1, roots, forcing: { kind: "exp", m: rng.intExcept(-3, 3), k }, cauchy: null };
  }
  const shape = rng.pick(["resonance", "resonance", "cauchyHomogeneous", "cauchyHomogeneous", "cauchyComplete"] as const);
  switch (shape) {
    case "resonance": {
      const roots = chooseRoots(rng, "distinct") as Extract<Roots, { kind: "distinct" }>;
      return { scale: 1, roots: roots.r1 === 0 ? { kind: "distinct", r1: roots.r2, r2: 0 } : roots, forcing: { kind: "resonance", m: rng.intExcept(-3, 3) }, cauchy: null };
    }
    case "cauchyHomogeneous": {
      const roots = chooseRoots(rng, rng.pick(["distinct", "complex", "double"] as const));
      return { scale: 1, roots, forcing: { kind: "none" }, cauchy: [rng.intExcept(-3, 3), rng.intExcept(-3, 3)] };
    }
    case "cauchyComplete": {
      const roots = chooseRoots(rng, "distinct");
      const [, q] = coefficientsOf(roots);
      const forcing: Forcing = q !== 0 ? { kind: "linear", m: rng.intExcept(-2, 2), n: rng.intExcept(-2, 2) } : { kind: "exp", m: rng.intExcept(-2, 2), k: rng.pick([-3, 3, 5].filter((value) => value !== (roots as { r1: number }).r1 && value !== (roots as { r2: number }).r2)) };
      return { scale: 1, roots, forcing, cauchy: [rng.intExcept(-3, 3), rng.intExcept(-3, 3)] };
    }
  }
}

/**
 * Estrae finché ci sono almeno tre risposte sbagliate distinte (tentativi seminati: resta
 * deterministico). Restituisce anche il piano e le sbagliate, per non ricalcolarle.
 */
function buildModel(level: number, rng: Rng_): { model: Model; plan: Plan; wrongs: ExpectedWrong<Expr>[] } {
  for (let attempt = 0; ; attempt++) {
    const model = drawModel(level, rng);
    const plan = planOf(model);
    const wrongs = wrongAnswersOf(plan);
    if (wrongs.length >= 3 || attempt >= 40) return { model, plan, wrongs };
  }
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

const FIRST_HINT = String.raw`A $y'' + p\,y' + q\,y = f(x)$ si associa l'equazione caratteristica $\lambda^{2} + p\lambda + q = 0$: le sue radici danno l'integrale generale dell'omogenea. Se $f$ non è zero serve anche una soluzione particolare.`;

function checkOf(plan: Plan): DifferentialEquationCheck {
  const cauchy = plan.conditions.length > 0;
  return {
    kind: "differentialEquation",
    variable: "x",
    left: plan.left,
    right: plan.right,
    constants: cauchy ? 0 : 2,
    conditions: plan.conditions,
    wrongConstants: cauchy ? CAUCHY : COSTANTE,
    ...(cauchy ? { wrongConditions: CAUCHY as ErrorCode } : {}),
  };
}

/** Le risposte sbagliate davvero sbagliate, diverse tra loro, e riconosciute con il loro codice. */
function wrongAnswersOf(plan: Plan): ExpectedWrong<Expr>[] {
  const check = checkOf(plan);
  const kept: ExpectedWrong<Expr>[] = [];
  for (const candidate of plan.wrong) {
    const verdict = checkVerdict(candidate.value, plan.solution, check);
    if (verdict.kind === "correct") continue;
    // Se il controllo stesso riconosce l'errore, il codice dichiarato deve essere quello.
    if (verdict.kind === "error" && verdict.error !== candidate.error) continue;
    if (kept.some((other) => sameUnderCheck(other.value, candidate.value, check) !== "different")) continue;
    kept.push(candidate);
    if (kept.length === 4) break;
  }
  return kept;
}

function draftOf({ plan, wrongs }: { plan: Plan; wrongs: ExpectedWrong<Expr>[] }): ExerciseDraft {
  return {
    prompt: odePrompt(plan.equation, plan.conditions, 2),
    answer: { kind: "expression", correct: plan.solution, wrong: wrongs, check: checkOf(plan) },
    steps: plan.steps.map((text) => ({ text })),
    hints: [FIRST_HINT, plan.hint],
  };
}

export default defineGenerator({
  code: "V2.M12.A02.g1",
  skill: "V2.M12.A02",
  lesson: "V2.M12.L04",
  title: "Equazioni differenziali lineari del secondo ordine a coefficienti costanti",
  levels: [1, 2, 3],
  errors: [COSTANTE, CARATTERISTICA, PARTICOLARE, CAUCHY],
  limits: { maxInteger: 160, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression" || answer.check?.kind !== "differentialEquation") return false;
    const { plan } = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    if (!exercise.prompt.includes(plan.equation)) return false;
    return solvesSymbolically(answer.correct, plan.left, plan.right, plan.conditions.length > 0 ? 0 : 2, plan.conditions);
  },
});


