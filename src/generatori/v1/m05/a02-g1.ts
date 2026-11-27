// V1.M05.A02.g1 — Equazioni di secondo grado, complete e incomplete (risposta: insieme).
//
// Costruzione all'indietro: si scelgono prima le soluzioni (due interi, una frazione e un intero,
// h ± √d, una soluzione doppia, oppure nessuna), poi i coefficienti a, b, c della forma normale;
// infine si decide quali termini scrivere al secondo membro. I passaggi della formula risolutiva
// sono quelli del motore (solveQuadratic), con prima il passo della forma normale.
//
// Livello 1: pura ax² − c = 0, spuria ax² + bx = 0, completa x² + bx + c = 0 con soluzioni intere.
// Livello 2: completa con a ≠ 1 e soluzioni razionali, oppure con Δ non quadrato (h ± √d), spesso
//            con dei termini al secondo membro.
// Livello 3: Δ = 0, Δ < 0, oppure x(ax + b) = c da sviluppare; sempre con termini da trasportare.
//
// Errori tipici, rifatti sui numeri:
//   ALG.RADICE_DEL_QUADRATO       da x² = k solo x = √k;
//   ALG.DIVISIONE_PER_INCOGNITA   in ax² + bx = 0 divide per x e perde x = 0;
//   ALG.SEGNI_FATTORI             da x(ax + b) = 0 scrive x = b/a;
//   ALG.FORMULA_RISOLUTIVA        usa b al posto di −b, oppure il denominatore a (o 2) al posto di 2a;
//   ALG.SEMPLIFICAZIONE_ADDENDI   (2h ± 2√d)/2 semplificato solo nel primo addendo: 2h ± √d;
//   CALC.REGOLA_SEGNI             nel discriminante −4ac preso con il segno sbagliato (b² + 4ac);
//   CALC.SEGNO_TRASPORTO          un termine del secondo membro portato a sinistra senza cambiare segno;
//   COND.RADICE_PARI              con Δ < 0 si prende √(−Δ) come se il radicando fosse positivo.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { add, mul, neg, num, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Surd } from "../../../motore/numbers/surd";
import { Rng } from "../../../motore/random/rng";
import { setToLatex, type RealSet, type SolutionSet } from "../../../motore/sets";
import { solveQuadratic, stepText } from "../../../motore/steps";
import { cleanSurds, monomial, pointSet, sameSet, satisfies, solutionsFromCandidates, step } from "../../comuni/equations";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M05.A02.g1";
type Rng_ = GeneratorContext["rng"];
const x = sym("x");

/** Quale strada risolve l'equazione: le incomplete hanno la loro, le altre la formula. */
type Kind = "pure" | "spuria" | "complete";

interface Model {
  /** Coefficienti della forma normale ax² + bx + c = 0 (interi). */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly kind: Kind;
  /** Come si scrivono b e c: b = bLeft − bRight, c = cLeft − cRight (la parte «Right» sta al secondo membro). */
  readonly bLeft: number;
  readonly bRight: number;
  readonly cLeft: number;
  readonly cRight: number;
  /** Per x(px + q) = r: il primo membro si scrive come prodotto da sviluppare. */
  readonly product?: { readonly p: number; readonly q: number };
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** a(x − r)(x − s) con r = m/k (k divide a) e s intero: coefficienti interi. */
function fromRoots(j: number, k: number, m: number, s: number): { a: number; b: number; c: number } {
  // j(kx − m)(x − s) = jk x² − j(ks + m) x + jms
  return { a: j * k, b: -j * (k * s + m), c: j * m * s };
}

/** Dove si scrivono i termini: «keep» al primo membro, «move» al secondo, «split» un pezzo per parte. */
type Place = "keep" | "move" | "split";

/** Il modello con b e c scritti nei posti scelti (lo split usa un numero piccolo diverso da zero). */
function arrange(rng: Rng_, a: number, b: number, c: number, kind: Kind, placeB: Place, placeC: Place): Model {
  const place = (value: number, where: Place): [number, number] => {
    if (value === 0 || where === "keep") return [value, 0];
    if (where === "move") return [0, -value];
    const piece = rng.intExcept(-9, 9, [0, value]);
    return [value + piece, piece];
  };
  const [bLeft, bRight] = place(b, placeB);
  const [cLeft, cRight] = place(c, placeC);
  return { a, b, c, kind, bLeft, bRight, cLeft, cRight };
}

function buildLevel1(rng: Rng_): Model {
  for (;;) {
    const kind = rng.pick(["pure", "spuria", "complete", "complete"] as const);
    let model: Model;
    switch (kind) {
      case "pure": {
        const a = rng.pick([1, 1, 2, 3]);
        const r = rng.int(1, 9);
        model = arrange(rng, a, 0, -a * r * r, kind, "keep", rng.pick(["keep", "keep", "move"] as const));
        break;
      }
      case "spuria": {
        const a = rng.pick([1, 1, 2, 3]);
        const t = rng.intExcept(-8, 8);
        model = arrange(rng, a, -a * t, 0, kind, rng.pick(["keep", "keep", "move"] as const), "keep");
        break;
      }
      case "complete": {
        const [r, s] = rng.sample([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7], 2) as [number, number];
        if (r + s === 0) continue;
        const { a, b, c } = fromRoots(1, 1, r, s);
        model = arrange(rng, a, b, c, kind, "keep", "keep");
        break;
      }
    }
    if (acceptable(model, 2)) return model;
  }
}

function buildLevel2(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["rational", "rational", "irrational"] as const);
    let model: Model;
    if (shape === "rational") {
      const k = rng.pick([2, 3, 4, 5]);
      const j = rng.pick([1, 1, 1, -1, 2]);
      const m = rng.intExcept(-7, 7);
      if (gcd(Math.abs(m), k) !== 1) continue;
      const s = rng.intExcept(-5, 5);
      const { a, b, c } = fromRoots(j, k, m, s);
      model = arrange(rng, a, b, c, "complete", rng.pick(PLACES), rng.pick(PLACES));
    } else {
      // x² − 2hx + (h² − d) = 0: soluzioni h ± √d, con d senza fattori quadrati.
      const h = rng.intExcept(-5, 5);
      const d = rng.pick([2, 3, 5, 6, 7, 10]);
      const a = rng.pick([1, 1, 1, 2]);
      model = arrange(rng, a, -2 * h * a, a * (h * h - d), "complete", rng.pick(PLACES), rng.pick(PLACES));
    }
    if (model.c === 0 || model.b === 0) continue;
    if (acceptable(model, 3)) return model;
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const shape = rng.pick(["double", "negative", "product"] as const);
    let model: Model;
    switch (shape) {
      case "double": {
        // (kx − m)² con m/k soluzione doppia.
        const k = rng.pick([1, 1, 2, 3]);
        const m = rng.intExcept(-6, 6);
        if (gcd(Math.abs(m), k) !== 1) continue;
        const j = rng.pick([1, 1, 2]);
        model = arrange(rng, j * k * k, -2 * j * k * m, j * m * m, "complete", rng.pick(PLACES), rng.pick(["move", "split"] as const));
        break;
      }
      case "negative": {
        // Δ = b² − 4ac < 0.
        const a = rng.pick([1, 1, 2, 3]);
        const b = rng.intExcept(-6, 6);
        const c = rng.int(1, 9) * (a > 0 ? 1 : -1);
        if (b * b - 4 * a * c >= 0) continue;
        model = arrange(rng, a, b, c, "complete", rng.pick(PLACES), "split");
        break;
      }
      case "product": {
        // x(px + q) = r, con soluzioni razionali.
        const k = rng.pick([1, 2, 3]);
        const m = rng.intExcept(-6, 6);
        const s = rng.intExcept(-6, 6);
        if (gcd(Math.abs(m), k) !== 1) continue;
        const { a, b, c } = fromRoots(1, k, m, s);
        if (c === 0 || b === 0) continue;
        model = { a, b, c, kind: "complete", bLeft: b, bRight: 0, cLeft: 0, cRight: -c, product: { p: a, q: b } };
        break;
      }
    }
    if (acceptable(model, 3)) return model;
  }
}

const PLACES: readonly Place[] = ["keep", "keep", "move", "split"];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Numeri piccoli e abbastanza risposte sbagliate diverse. */
function acceptable(model: Model, minimumWrong: number): boolean {
  if ([model.a, model.b, model.c].some((value) => Math.abs(value) > 60)) return false;
  return wrongAnswers(model, answerOf(model)).length >= minimumWrong;
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── soluzioni, giuste e sbagliate ─────────────────────────────

interface FormulaOptions {
  /** Il numero al posto di −b (giusto: −b). */
  readonly minusB?: Rational;
  /** Il denominatore (giusto: 2a). */
  readonly denominator?: Rational;
  /** Il discriminante (giusto: b² − 4ac). */
  readonly discriminant?: Rational;
}

/** Le soluzioni reali della formula, con i numeri dati (per rifare anche i conti sbagliati). */
function formula(a: number, b: number, c: number, options: FormulaOptions = {}): Surd[] {
  const delta = options.discriminant ?? Rational.of(b * b - 4 * a * c);
  if (delta.sign() < 0) return [];
  const top = Surd.from(options.minusB ?? Rational.of(-b));
  const den = options.denominator ?? Rational.of(2 * a);
  const root = Surd.sqrt(delta);
  return [top.sub(root).div(den), top.add(root).div(den)];
}

const answerOf = (model: Model): RealSet => pointSet(formula(model.a, model.b, model.c));

/** Il set di soluzioni, se i numeri sono puliti; altrimenti null (il candidato si scarta). */
function cleanPoints(values: readonly Surd[]): RealSet | null {
  return cleanSurds(values, 40, 12) ? pointSet(values) : null;
}

function wrongAnswers(model: Model, correct: RealSet): ExpectedWrong<SolutionSet>[] {
  const { a, b, c } = model;
  const candidates: (ExpectedWrong<SolutionSet> | null)[] = [];
  const add = (error: ExpectedWrong<SolutionSet>["error"], values: readonly Surd[] | null): void => {
    const value = values && cleanPoints(values);
    candidates.push(value && { error, value });
  };

  // Un termine portato a sinistra senza cambiare segno: cambia il segno di quel coefficiente.
  const transported = (newB: number, newC: number): Surd[] => (newC === 0 ? [Surd.ZERO, Surd.from(Rational.of(-newB, a))] : formula(a, newB, newC));

  switch (model.kind) {
    case "pure": {
      const square = Rational.of(-c, a);
      add("ALG.RADICE_DEL_QUADRATO", [Surd.sqrt(square)]);
      // x² = −c/a con il segno sbagliato: un quadrato negativo, nessuna soluzione.
      if (model.cRight !== 0) add("CALC.SEGNO_TRASPORTO", []);
      break;
    }
    case "spuria": {
      const t = Rational.of(-b, a);
      add("ALG.DIVISIONE_PER_INCOGNITA", [Surd.from(t)]);
      add("ALG.SEGNI_FATTORI", [Surd.ZERO, Surd.from(t.neg())]);
      if (model.bRight !== 0) add("CALC.SEGNO_TRASPORTO", transported(model.bLeft + model.bRight, 0));
      break;
    }
    case "complete": {
      const delta = b * b - 4 * a * c;
      add("ALG.FORMULA_RISOLUTIVA", formula(a, b, c, { minusB: Rational.of(b) }));
      if (model.bRight !== 0) add("CALC.SEGNO_TRASPORTO", transported(model.bLeft + model.bRight, c));
      if (model.cRight !== 0) add("CALC.SEGNO_TRASPORTO", transported(b, model.cLeft + model.cRight));
      // Con Δ < 0, la radice di un numero negativo presa come quella del suo opposto: √(−Δ).
      if (delta < 0) add("COND.RADICE_PARI", formula(a, b, c, { discriminant: Rational.of(-delta) }));
      // (−b ± 2k√d)/2 → −b ± k√d: il 2 semplificato solo con la radice (con a = 1 e Δ non quadrato).
      const root = Surd.sqrt(Rational.of(Math.abs(delta)));
      const halfRoot = root.div(2);
      if (a === 1 && delta > 0 && !root.isRational() && halfRoot.terms.every(([, coefficient]) => coefficient.isInteger())) {
        add("ALG.SEMPLIFICAZIONE_ADDENDI", [Surd.from(-b).sub(halfRoot), Surd.from(-b).add(halfRoot)]);
      }
      add("ALG.FORMULA_RISOLUTIVA", formula(a, b, c, { denominator: Rational.of(a) }));
      if (4 * a * c !== 0) add("CALC.REGOLA_SEGNI", formula(a, b, c, { discriminant: Rational.of(b * b + 4 * a * c) }));
      if (a !== 1) add("ALG.FORMULA_RISOLUTIVA", formula(a, b, c, { denominator: Rational.of(2) }));
      break;
    }
  }
  return distinctWrongSets(correct, candidates);
}

// ───────────────────────────── testo e passaggi ─────────────────────────────

/** Il LaTeX con le frazioni grandi. */
const display = (expr: Expr): string => toLatex(expr).replace(/\\frac/g, "\\dfrac");

/** I due membri dell'equazione come si scrivono nel testo. */
function sides(model: Model): { left: Expr; right: Expr } {
  const { c } = model;
  if (model.product) {
    const inner = add(monomial(model.product.p, 1), num(model.product.q));
    return { left: mul(x, inner), right: num(-c) };
  }
  const left: Expr[] = [monomial(model.a, 2)];
  const right: Expr[] = [];
  if (model.bLeft !== 0) left.push(monomial(model.bLeft, 1));
  if (model.cLeft !== 0) left.push(num(model.cLeft));
  if (model.bRight !== 0) right.push(monomial(model.bRight, 1));
  if (model.cRight !== 0) right.push(num(model.cRight));
  const join = (terms: Expr[]): Expr => (terms.length === 0 ? num(0) : terms.length === 1 ? (terms[0] as Expr) : add(...terms));
  return { left: join(left), right: join(right) };
}

/** ax² + bx + c scritto a mano. */
function normalForm(model: Model): Expr {
  const terms: Expr[] = [monomial(model.a, 2)];
  if (model.b !== 0) terms.push(monomial(model.b, 1));
  if (model.c !== 0) terms.push(num(model.c));
  return terms.length === 1 ? (terms[0] as Expr) : add(...terms);
}

function steps(model: Model, correct: RealSet): SolutionStep[] {
  const { a, b, c } = model;
  const { left, right } = sides(model);
  const result: SolutionStep[] = [];
  const moved = model.bRight !== 0 || model.cRight !== 0 || model.product;
  result.push(
    moved
      ? step(
          model.product
            ? "**Passo 1.** Sviluppa il prodotto e porta tutto al primo membro, cambiando segno a chi passa: ottieni la forma normale."
            : "**Passo 1.** Porta tutto al primo membro, cambiando segno ai termini che passano dall'altra parte: ottieni la forma normale.",
          `${toLatex(left)} = ${toLatex(right)} \\quad\\Longrightarrow\\quad ${toLatex(normalForm(model))} = 0`,
        )
      : step("**Passo 1.** L'equazione è già in forma normale.", `${toLatex(normalForm(model))} = 0`),
  );
  const final = `S = ${setToLatex(correct)}`;
  switch (model.kind) {
    case "pure": {
      const square = Rational.of(-c, a);
      const r = Surd.sqrt(square);
      result.push(step(`**Passo 2.** Manca il termine in $x$: è un'equazione pura. Isola il quadrato${a === 1 ? "" : `, dividendo per $${a}$`}.`, `x^{2} = ${toLatex(num(square))}`));
      result.push(
        step(
          `**Passo 3.** I numeri che elevati al quadrato danno $${toLatex(num(square))}$ sono due, opposti: $x = \\pm ${toLatex(surdExpr(r))}$. Controllo: $${a === 1 ? "" : `${a} \\cdot `}${toLatex(surdExpr(r))}^{2} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = 0$.`,
          final,
        ),
      );
      break;
    }
    case "spuria": {
      const t = Rational.of(-b, a);
      const inner = add(monomial(a, 1), num(b));
      result.push(step("**Passo 2.** Manca il termine noto: è un'equazione spuria. Raccogli la $x$ (mai dividere per $x$, che può valere zero).", `x\\left(${toLatex(inner)}\\right) = 0`));
      result.push(
        step(
          `**Passo 3.** Un prodotto vale zero quando almeno un fattore vale zero: $x = 0$ oppure $${toLatex(inner)} = 0$, cioè $x = ${toLatex(num(t))}$.`,
          final,
        ),
      );
      break;
    }
    case "complete": {
      const solved = solveQuadratic(a, b, c);
      const [first, ...rest] = solved.steps;
      if (first) result.push(step(`**Passo 2.** ${first.text}`));
      const [delta, ...formulaSteps] = rest;
      if (delta) result.push({ text: stepText({ ...delta, text: `**Passo 3.** ${delta.text}` }) });
      const roots = formulaSteps.map((s) => stepText(s)).join("\n\n");
      const deltaValue = b * b - 4 * a * c;
      const rootOfDelta = Surd.sqrt(Rational.of(Math.abs(deltaValue)));
      const simplifyNote =
        deltaValue > 0 && !rootOfDelta.isRational()
          ? ` Qui $\\sqrt{${deltaValue}} = ${toLatex(surdExpr(rootOfDelta))}$: per semplificare la frazione raccogli al numeratore e dividi per il denominatore, mai un solo addendo.`
          : "";
      result.push(step(`**Passo 4.** Applica la formula $x = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a}$, con $-b$ e il denominatore $2a$.${simplifyNote}\n\n${roots}`, final));
      break;
    }
  }
  return result;
}

const surdExpr = (value: Surd): Expr => {
  const [only] = pointSet([value]).pieces;
  return only && typeof only.lower !== "string" ? only.lower : num(0);
};

function draftOf(model: Model): ExerciseDraft {
  const correct = answerOf(model);
  const { left, right } = sides(model);
  const incomplete = model.kind !== "complete";
  return {
    prompt: `Risolvi l'equazione $${display(left)} = ${display(right)}$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: steps(model, correct),
    hints: [
      incomplete
        ? "È un'equazione di secondo grado: portala in forma normale $ax^2 + bx + c = 0$ e guarda quale coefficiente manca. C'è una strada più breve della formula."
        : "È un'equazione di secondo grado: portala in forma normale $ax^2 + bx + c = 0$ e leggi $a$, $b$, $c$ con il loro segno.",
      incomplete
        ? "Se manca il termine noto raccogli la $x$; se manca il termine in $x$ isola $x^2$. Due soluzioni si scrivono $x = 2 \\vee x = -3$; nessuna soluzione, $\\emptyset$."
        : "Calcola $\\Delta = b^2 - 4ac$, poi $x = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a}$. Due soluzioni si scrivono $x = 2 \\vee x = -3$; se $\\Delta < 0$, $\\emptyset$.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

export default defineGenerator({
  code: CODE,
  skill: "V1.M05.A02",
  lesson: "V1.M05.L02",
  title: "Equazioni di secondo grado",
  levels: [1, 2, 3],
  errors: [
    "ALG.RADICE_DEL_QUADRATO", "ALG.DIVISIONE_PER_INCOGNITA", "ALG.SEGNI_FATTORI", "ALG.FORMULA_RISOLUTIVA",
    "ALG.SEMPLIFICAZIONE_ADDENDI", "CALC.REGOLA_SEGNI", "CALC.SEGNO_TRASPORTO", "COND.RADICE_PARI",
  ],
  limits: { maxInteger: 60, maxDenominator: 12 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    // Dal testo: le soluzioni sono gli zeri di (primo membro − secondo membro), trovati dal motore
    // scomponendo, e devono rendere vera l'equazione scritta.
    const { left, right } = sides(model);
    const found = solutionsFromCandidates([add(left, neg(right))], (value) => satisfies(left, right, value));
    return found !== null && sameSet(found, answer.correct);
  },
});
