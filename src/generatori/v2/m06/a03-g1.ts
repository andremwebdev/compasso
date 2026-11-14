// V2.M06.A03.g1 — Derivate con le regole di calcolo: prodotto, quoziente, funzione composta.
// GENERATORE DI RIFERIMENTO per le risposte di tipo «espressione» senza vincoli di forma
// (vale qualunque scrittura equivalente della derivata).
//
// Un esercizio è descritto da un modello: quale regola serve (prodotto, quoziente, composta) e i
// pezzi a cui si applica. Dal modello escono la risposta giusta (con la regola scritta per esteso,
// non con derive() sull'intera funzione), le risposte sbagliate (la regola applicata male, davvero)
// e i passaggi. La verifica indipendente confronta con la derivata calcolata dal motore su tutta la
// funzione e con il rapporto incrementale in punti di prova.
//
// Livello 1: una regola, applicata a funzioni semplici.  Livello 2: una regola, con polinomi di
// secondo grado e funzioni elementari.  Livello 3: due regole insieme (un pezzo è a sua volta composto).

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { exprToUPoly, upolyToExpr } from "../../../motore/algebra/expand";
import { simplify } from "../../../motore/algebra/simplify";
import { derive } from "../../../motore/calculus/derive";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, cos, div, evaluate, exp, ln, mul, neg, num, pow, sin, sqrt, sub, substitute, sym, toLatex, variables, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const x = sym("x");
const u = sym("u");

/** k·x scritto come si scrive a mano: x, −x, 3x. */
const times = (k: number, expr: Expr): Expr => (k === 1 ? expr : k === -1 ? neg(expr) : mul(k, expr));

// ───────────────────────────── i pezzi ─────────────────────────────

/** Una funzione composta: esterna(interna). */
interface Chain {
  /** La funzione esterna, scritta nella variabile u (per mostrarla nei passaggi). */
  readonly outer: Expr;
  /** La funzione interna, nella variabile x. */
  readonly inner: Part;
}

/** Una funzione con la sua derivata; se è composta, anche la sua struttura. */
interface Part {
  readonly expr: Expr;
  readonly derivative: Expr;
  readonly chain?: Chain;
}

/** Una funzione elementare o un polinomio: la derivata è una regola di base. */
const basic = (expr: Expr): Part => ({ expr, derivative: derive(expr) });

/** La funzione composta esterna(interna): `outer` è scritta in u. */
function compose(outer: Expr, inner: Part): Part {
  const expr = substitute(outer, { u: inner.expr });
  // Regola della catena, scritta per esteso: esterna′(interna) · interna′.
  const derivative = simplify(mul(outerDerivativeAt(outer, inner.expr), inner.derivative));
  return { expr, derivative, chain: { outer, inner } };
}

/** La derivata dell'esterna (rispetto a u), calcolata in `at`. */
function outerDerivativeAt(outer: Expr, at: Expr): Expr {
  return substitute(derive(outer, "u"), { u: at });
}

/** La derivata di una funzione composta sbagliando la catena in uno dei modi tipici. */
function brokenChain(part: Part, how: "noInner" | "innerInside" | "outerAtX" | "halfway" | "outerKept"): Expr | null {
  if (!part.chain) return null;
  const { outer, inner } = part.chain;
  switch (how) {
    case "outerKept":
      // Moltiplicato per la derivata dell'interna, ma l'esterna è rimasta com'era.
      return simplify(mul(inner.derivative, part.expr));
    case "noInner":
      // Derivata l'esterna e basta: manca il fattore interna′.
      return simplify(outerDerivativeAt(outer, inner.expr));
    case "innerInside":
      // La derivata dell'interna è finita «dentro» l'esterna, invece che a moltiplicare.
      // (Se l'interna è di primo grado verrebbe una costante: nessuno risponderebbe così.)
      return variables(inner.derivative).length === 0 ? null : simplify(outerDerivativeAt(outer, inner.derivative));
    case "outerAtX":
      // L'esterna derivata come se dentro ci fosse solo x, poi moltiplicata per interna′.
      return simplify(mul(outerDerivativeAt(outer, x), inner.derivative));
    case "halfway": {
      // Catena di tre funzioni fermata a metà: manca la derivata della funzione più interna.
      const innerBroken = brokenChain(inner, "noInner");
      return innerBroken && simplify(mul(outerDerivativeAt(outer, inner.expr), innerBroken));
    }
  }
}

// ───────────────────────────── il modello di un esercizio ─────────────────────────────

type Model =
  | { readonly kind: "product"; readonly f: Part; readonly g: Part }
  | { readonly kind: "quotient"; readonly f: Part; readonly g: Part }
  | { readonly kind: "chain"; readonly part: Part };

/** Un numeratore scritto bene: sviluppato se è un polinomio corto con numeri piccoli, altrimenti solo ripulito. */
function tidy(expr: Expr): Expr {
  const polynomial = exprToUPoly(expr);
  const short = polynomial !== null && polynomial.length <= 4 && polynomial.every((c) => c.abs().cmp(LIMITS.maxInteger) <= 0);
  return short ? upolyToExpr(polynomial) : simplify(expr);
}

function functionOf(model: Model): Expr {
  switch (model.kind) {
    case "product":
      return mul(model.f.expr, model.g.expr);
    case "quotient":
      return div(model.f.expr, model.g.expr);
    case "chain":
      return model.part.expr;
  }
}

/** Una frazione scritta bene: se il numeratore è un numero negativo, il meno va davanti alla frazione. */
function fraction(top: Expr, bottom: Expr): Expr {
  return top.kind === "num" && top.value.sign() < 0 ? neg(div(num(top.value.neg()), bottom)) : div(top, bottom);
}

/** Il quadrato del denominatore, scritto bene: x⁴ e non (x²)², e^{2x} e non (e^{x})². */
const squared = (g: Expr): Expr => simplify(pow(g, 2));

/** Il numeratore della regola del quoziente: g′·h − g·h′. */
const quotientTop = (f: Part, g: Part): Expr => sub(mul(f.derivative, g.expr), mul(f.expr, g.derivative));

/**
 * La derivata di un quoziente nella forma più semplice. Con un denominatore x^n oppure e^{…} la regola
 * lascia un fattore comune sopra e sotto: qui è già semplificato, come si fa a mano nell'ultimo passaggio.
 */
function neatQuotient(f: Part, g: Part): Expr {
  const base = g.expr;
  // Denominatore x^n: (g′·x^n − n·g·x^{n−1})/x^{2n} = (x·g′ − n·g)/x^{n+1}.
  const n = base.kind === "sym" ? 1 : base.kind === "pow" && base.base.kind === "sym" && base.exp.kind === "num" ? base.exp.value.toInteger() : 0;
  if (n > 0) return fraction(tidy(sub(mul(x, f.derivative), times(n, f.expr))), pow(x, n + 1));
  // Denominatore e^{u}: (g′·e^{u} − g·u′·e^{u})/e^{2u} = (g′ − u′·g)/e^{u}.
  if (base.kind === "pow" && base.base.kind === "const" && base.base.name === "e") {
    const innerDerivative = g.chain ? g.chain.inner.derivative : null;
    return fraction(tidy(sub(f.derivative, innerDerivative ? mul(innerDerivative, f.expr) : f.expr)), base);
  }
  return fraction(tidy(quotientTop(f, g)), squared(base));
}

/** La derivata, con la regola scritta per esteso sui pezzi del modello. */
function derivativeOf(model: Model): Expr {
  switch (model.kind) {
    case "product":
      return tidy(add(mul(model.f.derivative, model.g.expr), mul(model.f.expr, model.g.derivative)));
    case "quotient":
      return neatQuotient(model.f, model.g);
    case "chain":
      return model.part.derivative;
  }
}

function wrongAnswers(model: Model, correct: Expr) {
  const candidates: WrongCandidate<Expr>[] = [];
  const push = (error: "AN.DERIVATA_PRODOTTO" | "AN.DERIVATA_QUOZIENTE" | "AN.DERIVATA_COMPOSTA", value: Expr | null): void => {
    if (value) candidates.push({ error, value });
  };
  switch (model.kind) {
    case "product": {
      const { f, g } = model;
      // Prodotto delle derivate.
      push("AN.DERIVATA_PRODOTTO", simplify(mul(f.derivative, g.derivative)));
      // Regola giusta nei termini, ma con la catena dimenticata nel fattore composto.
      for (const [part, other, first] of [[g, f, false], [f, g, true]] as const) {
        const broken = brokenChain(part, "noInner");
        if (!broken) continue;
        const terms = first ? [mul(broken, other.expr), mul(part.expr, other.derivative)] : [mul(other.derivative, part.expr), mul(other.expr, broken)];
        push("AN.DERIVATA_COMPOSTA", tidy(add(...terms)));
      }
      // Segno meno tra i due termini, come nel quoziente.
      push("AN.DERIVATA_PRODOTTO", tidy(sub(mul(f.derivative, g.expr), mul(f.expr, g.derivative))));
      // Somma delle derivate.
      push("AN.DERIVATA_PRODOTTO", tidy(add(f.derivative, g.derivative)));
      break;
    }
    case "quotient": {
      const { f, g } = model;
      // Quoziente delle derivate.
      push("AN.DERIVATA_QUOZIENTE", simplify(div(f.derivative, g.derivative)));
      // I due termini del numeratore scambiati: il segno è opposto.
      push("AN.DERIVATA_QUOZIENTE", fraction(tidy(sub(mul(f.expr, g.derivative), mul(f.derivative, g.expr))), squared(g.expr)));
      for (const [part, isTop] of [[f, true], [g, false]] as const) {
        const broken = brokenChain(part, "noInner");
        if (!broken) continue;
        const brokenTop = isTop ? sub(mul(broken, g.expr), mul(f.expr, g.derivative)) : sub(mul(f.derivative, g.expr), mul(f.expr, broken));
        push("AN.DERIVATA_COMPOSTA", fraction(tidy(brokenTop), squared(g.expr)));
      }
      // Denominatore non elevato al quadrato.
      push("AN.DERIVATA_QUOZIENTE", fraction(tidy(quotientTop(f, g)), g.expr));
      break;
    }
    case "chain": {
      push("AN.DERIVATA_COMPOSTA", brokenChain(model.part, "noInner"));
      push("AN.DERIVATA_COMPOSTA", brokenChain(model.part, "halfway"));
      push("AN.DERIVATA_COMPOSTA", brokenChain(model.part, "outerAtX"));
      push("AN.DERIVATA_COMPOSTA", brokenChain(model.part, "innerInside"));
      push("AN.DERIVATA_COMPOSTA", brokenChain(model.part, "outerKept"));
      break;
    }
  }
  // Le risposte con numeri troppo grandi non servono: nessuno le scriverebbe.
  return distinctWrongExpressions(correct, candidates.filter((candidate) => candidate !== null && isClean(candidate.value))).slice(0, 4);
}

/** Vero se nell'espressione non compaiono numeri oltre i limiti di pulizia. */
function isClean(expr: Expr): boolean {
  if (expr.kind === "num") return expr.value.abs().cmp(LIMITS.maxInteger) <= 0 && expr.value.d <= BigInt(LIMITS.maxDenominator) && expr.value.abs().n <= BigInt(LIMITS.maxInteger);
  switch (expr.kind) {
    case "sym":
    case "const":
      return true;
    case "add":
      return expr.terms.every(isClean);
    case "mul":
      return expr.factors.every(isClean);
    case "neg":
    case "abs":
    case "root":
    case "fn":
      return isClean(expr.arg);
    case "div":
      return isClean(expr.num) && isClean(expr.den);
    case "pow":
      return isClean(expr.base) && isClean(expr.exp);
    case "log":
      return isClean(expr.base) && isClean(expr.arg);
  }
}

const LIMITS = { maxInteger: 60, maxDenominator: 6 } as const;

// ───────────────────────────── costruzione ─────────────────────────────

/** a·x + b con a ≠ 0 (a anche negativo se `signed`). */
function linear(rng: Rng_, signed = false): Expr {
  const a = signed ? rng.intExcept(-4, 5, [0, 1, -1]) : rng.int(2, 5);
  const b = rng.int(-5, 5);
  return b === 0 ? mul(a, x) : simplify(add(mul(a, x), b));
}

/** x² + c con c > 0: sempre positivo, quindi va bene anche dentro logaritmi e radici. */
const positiveQuadratic = (rng: Rng_): Expr => add(pow(x, 2), rng.int(1, 6));
const monomial = (rng: Rng_, max: number): Expr => {
  const n = rng.int(1, max);
  return n === 1 ? x : pow(x, n);
};
const elementary = (rng: Rng_): Expr => rng.pick([sin(x), cos(x), exp(x), ln(x)]);

/** Una funzione composta con dentro un polinomio di primo grado: sin(3x + 1), e^{−2x}, (2x − 1)⁴… */
function simpleChain(rng: Rng_): Part {
  const kind = rng.pick(["sin", "cos", "exp", "ln", "power"] as const);
  switch (kind) {
    case "sin":
      return compose(sin(u), basic(linear(rng)));
    case "cos":
      return compose(cos(u), basic(linear(rng)));
    case "exp":
      return compose(exp(u), basic(times(rng.intExcept(-4, 4, [0, 1]), x)));
    case "ln":
      return compose(ln(u), basic(add(mul(rng.int(2, 5), x), rng.int(1, 5))));
    case "power":
      return compose(pow(u, rng.int(3, 5)), basic(simplify(add(mul(rng.int(2, 3), x), rng.intExcept(-4, 4)))));
  }
}

/** Una funzione composta con dentro un polinomio di secondo grado o una funzione elementare. */
function richerChain(rng: Rng_): Part {
  const kind = rng.pick(["sinQuadratic", "cosQuadratic", "expQuadratic", "lnQuadratic", "sqrt", "powerQuadratic", "powerOfSin", "expOfSin"] as const);
  switch (kind) {
    case "sinQuadratic":
      return compose(sin(u), basic(positiveQuadratic(rng)));
    case "cosQuadratic":
      return compose(cos(u), basic(mul(rng.int(2, 4), pow(x, 2))));
    case "expQuadratic":
      return compose(exp(u), basic(rng.bool() ? pow(x, 2) : neg(pow(x, 2))));
    case "lnQuadratic":
      return compose(ln(u), basic(positiveQuadratic(rng)));
    case "sqrt":
      return compose(sqrt(u), basic(positiveQuadratic(rng)));
    case "powerQuadratic":
      return compose(pow(u, rng.int(3, 4)), basic(positiveQuadratic(rng)));
    case "powerOfSin":
      return compose(pow(u, rng.int(2, 3)), basic(rng.pick([sin(x), cos(x)])));
    case "expOfSin":
      return compose(exp(u), basic(rng.pick([sin(x), cos(x)])));
  }
}

function buildLevel1(rng: Rng_): Model {
  const kind = rng.pick(["product", "quotient", "chain"] as const);
  switch (kind) {
    case "product":
      return { kind, f: basic(rng.bool(0.7) ? monomial(rng, 3) : linear(rng)), g: basic(elementary(rng)) };
    case "quotient": {
      // (a·x + b)/(c·x + d) con a·d − b·c ≠ 0: la derivata è una costante fratto un quadrato.
      for (;;) {
        const [a, b, c, d] = [rng.int(1, 4), rng.intExcept(-5, 5), rng.int(1, 3), rng.intExcept(-5, 5)];
        if (a * d - b * c === 0) continue;
        return { kind, f: basic(simplify(add(mul(a, x), b))), g: basic(simplify(add(mul(c, x), d))) };
      }
    }
    case "chain":
      return { kind, part: simpleChain(rng) };
  }
}

function buildLevel2(rng: Rng_): Model {
  const kind = rng.pick(["product", "quotient", "chain"] as const);
  switch (kind) {
    case "product": {
      const shape = rng.pick(["quadraticTimes", "twoElementary", "powerTimes"] as const);
      if (shape === "quadraticTimes") return { kind, f: basic(simplify(add(pow(x, 2), mul(rng.intExcept(-4, 4), x), rng.int(-5, 5)))), g: basic(rng.pick([sin(x), cos(x), exp(x)])) };
      if (shape === "twoElementary") {
        const [f, g] = rng.sample([sin(x), cos(x), exp(x), ln(x)], 2) as [Expr, Expr];
        return { kind, f: basic(f), g: basic(g) };
      }
      // x^n per una funzione elementare. (Con il solo logaritmo gli esercizi possibili erano quattro,
      // e ognuno usciva tre volte su cento: revisione 4b.)
      return { kind, f: basic(pow(x, rng.int(2, 5))), g: basic(elementary(rng)) };
    }
    case "quotient": {
      const shape = rng.pick(["quadraticOverLinear", "linearOverQuadratic", "elementaryOverPower", "linearOverElementary"] as const);
      if (shape === "quadraticOverLinear") return { kind, f: basic(add(pow(x, 2), rng.intExcept(-6, 6))), g: basic(simplify(add(x, rng.intExcept(-4, 4)))) };
      if (shape === "linearOverQuadratic") return { kind, f: basic(rng.bool() ? x : linear(rng)), g: basic(positiveQuadratic(rng)) };
      if (shape === "elementaryOverPower") return { kind, f: basic(elementary(rng)), g: basic(monomial(rng, 2)) };
      return { kind, f: basic(rng.bool() ? x : linear(rng)), g: basic(rng.pick([exp(x), sin(x), cos(x)])) };
    }
    case "chain":
      return { kind, part: richerChain(rng) };
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["productWithChain", "twoChains", "chainOverPower", "powerOverChain", "chainOfChain"] as const);
  switch (shape) {
    case "productWithChain":
      return { kind: "product", f: basic(rng.bool(0.7) ? monomial(rng, 2) : linear(rng)), g: rng.bool(0.6) ? simpleChain(rng) : richerChain(rng) };
    case "twoChains":
      // e^{a·x} per sin(b·x) o cos(b·x).
      return {
        kind: "product",
        f: compose(exp(u), basic(times(rng.intExcept(-3, 3, [0, 1]), x))),
        g: compose(rng.pick([sin(u), cos(u)]), basic(mul(rng.int(2, 4), x))),
      };
    case "chainOverPower":
      return { kind: "quotient", f: simpleChain(rng), g: basic(monomial(rng, 2)) };
    case "powerOverChain":
      return { kind: "quotient", f: basic(rng.bool() ? x : linear(rng)), g: compose(exp(u), basic(times(rng.intExcept(-3, 3, [0, 1]), x))) };
    case "chainOfChain": {
      // Tre funzioni una dentro l'altra: sin²(3x), e^{sin 2x}, ln(1 + e^{2x})…
      const innermost = basic(mul(rng.int(2, 4), x));
      const middle = compose(rng.pick([sin(u), cos(u)]), innermost);
      return { kind: "chain", part: compose(rng.pick([pow(u, 2), pow(u, 3), exp(u)]), middle) };
    }
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── passaggi e indizi ─────────────────────────────

const tex = (expr: Expr): string => toLatex(expr);
/** Un fattore dentro un prodotto scritto con il puntino: tra parentesi se è una somma o comincia con un meno. */
const factorTex = (expr: Expr): string => (expr.kind === "add" || expr.kind === "neg" || (expr.kind === "num" && expr.value.sign() < 0) ? `\\left(${tex(expr)}\\right)` : tex(expr));
const dot = (a: Expr, b: Expr): string => `${factorTex(a)} \\cdot ${factorTex(b)}`;

/** Come si deriva un pezzo: una riga per i pezzi semplici, la catena spiegata per quelli composti. */
function partSteps(name: string, part: Part): SolutionStep[] {
  if (!part.chain) return [{ text: `Deriva $${name}(x) = ${tex(part.expr)}$: $${name}'(x) = ${tex(part.derivative)}$.` }];
  return [
    { text: `$${name}(x) = ${tex(part.expr)}$ è una funzione composta: per derivarla serve la regola della catena.` },
    ...chainSteps(part),
    { text: `Quindi $${name}'(x) = ${tex(part.derivative)}$.` },
  ];
}

/** I passaggi della regola della catena su un pezzo composto. */
function chainSteps(part: Part): SolutionStep[] {
  const chain = part.chain;
  if (!chain) return [];
  const { outer, inner } = chain;
  const steps: SolutionStep[] = [
    { text: `Riconosci le due funzioni: quella esterna è $${tex(outer)}$, quella interna è $u = ${tex(inner.expr)}$.` },
    { text: `Deriva l'esterna rispetto a $u$, $\\left(${tex(outer)}\\right)' = ${tex(derive(outer, "u"))}$, e rimetti al posto di $u$ la funzione interna: $${tex(simplify(outerDerivativeAt(outer, inner.expr)))}$.` },
  ];
  if (inner.chain) {
    steps.push({ text: `Anche l'interna è composta: la sua derivata si trova allo stesso modo, $u' = ${tex(inner.derivative)}$ (la derivata di $${tex(inner.chain.outer)}$ con $u = ${tex(inner.chain.inner.expr)}$, per la derivata di $${tex(inner.chain.inner.expr)}$).` });
  } else {
    steps.push({ text: `Deriva l'interna: $u' = ${tex(inner.derivative)}$.` });
  }
  steps.push({ text: "Moltiplica: derivata dell'esterna (calcolata nell'interna) per derivata dell'interna." });
  return steps;
}

function solutionSteps(model: Model, correct: Expr): SolutionStep[] {
  const result: SolutionStep = { text: `Fai i conti e semplifica i fattori comuni, se ce ne sono:\n\n$$f'(x) = ${tex(correct)}$$` };
  switch (model.kind) {
    case "product":
      return [
        { text: `La funzione è un prodotto: $f(x) = g(x) \\cdot h(x)$ con $g(x) = ${tex(model.f.expr)}$ e $h(x) = ${tex(model.g.expr)}$. Vale $\\left(g \\cdot h\\right)' = g' \\cdot h + g \\cdot h'$.` },
        ...partSteps("g", model.f),
        ...partSteps("h", model.g),
        { text: `Sostituisci nella regola, senza saltare nessuno dei due termini:\n\n$$f'(x) = ${dot(model.f.derivative, model.g.expr)} + ${dot(model.f.expr, model.g.derivative)}$$` },
        result,
      ];
    case "quotient":
      return [
        { text: `La funzione è un quoziente: $f(x) = \\dfrac{g(x)}{h(x)}$ con $g(x) = ${tex(model.f.expr)}$ e $h(x) = ${tex(model.g.expr)}$. Vale $\\left(\\dfrac{g}{h}\\right)' = \\dfrac{g' \\cdot h - g \\cdot h'}{h^{2}}$.` },
        ...partSteps("g", model.f),
        ...partSteps("h", model.g),
        { text: `Sostituisci nella regola: al numeratore prima $g' \\cdot h$, poi **meno** $g \\cdot h'$; al denominatore $h^{2}$.\n\n$$f'(x) = \\frac{${dot(model.f.derivative, model.g.expr)} - ${dot(model.f.expr, model.g.derivative)}}{${tex(pow(model.g.expr, 2))}}$$` },
        result,
      ];
    case "chain":
      return [{ text: `$f(x) = ${tex(model.part.expr)}$ è una funzione composta: una funzione «dentro» un'altra. Vale $\\left(g(u)\\right)' = g'(u) \\cdot u'$.` }, ...chainSteps(model.part), result];
  }
}

const SECOND_HINT: Readonly<Record<Model["kind"], string>> = {
  product: "È un prodotto di due funzioni. Deriva separatamente i due fattori, poi usa $\\left(g \\cdot h\\right)' = g' \\cdot h + g \\cdot h'$: due termini, in ognuno un solo fattore è derivato.",
  quotient: "È un quoziente. Deriva separatamente numeratore e denominatore, poi usa $\\left(\\dfrac{g}{h}\\right)' = \\dfrac{g' \\cdot h - g \\cdot h'}{h^{2}}$, facendo attenzione all'ordine dei due termini.",
  chain: "È una funzione composta. Chiama $u$ la funzione che sta dentro: deriva quella esterna rispetto a $u$, poi moltiplica per la derivata di $u$.",
};

function draftOf(model: Model): ExerciseDraft {
  const correct = derivativeOf(model);
  const composite = model.kind !== "chain" && (model.f.chain || model.g.chain);
  return {
    prompt: `Calcola la derivata della funzione $f(x) = ${tex(functionOf(model))}$.`,
    answer: { kind: "expression", correct, wrong: wrongAnswers(model, correct) },
    steps: solutionSteps(model, correct),
    hints: [
      "Guarda la struttura della funzione prima di fare i conti: è un prodotto, un quoziente, oppure una funzione «dentro» un'altra? Ogni caso ha la sua regola, e a volte ne servono due.",
      SECOND_HINT[model.kind] + (composite ? " Uno dei due pezzi è a sua volta una funzione composta: per lui serve la regola della catena." : ""),
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

/** Il rapporto incrementale (differenza centrale) in un punto. */
function slope(f: Expr, at: number): number {
  const h = 1e-5;
  return (evaluate(f, { x: at + h }) - evaluate(f, { x: at - h })) / (2 * h);
}

export default defineGenerator({
  code: "V2.M06.A03.g1",
  skill: "V2.M06.A03",
  lesson: "V2.M06.L03",
  title: "Derivate: prodotto, quoziente e funzione composta",
  levels: [1, 2, 3],
  errors: ["AN.DERIVATA_PRODOTTO", "AN.DERIVATA_QUOZIENTE", "AN.DERIVATA_COMPOSTA"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const f = functionOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    // Prima strada: la derivata simbolica del motore sull'intera funzione (la risposta è costruita pezzo per pezzo).
    if (!equivalent(answer.correct, derive(f))) return false;
    // Seconda strada: il rapporto incrementale in punti di prova dove la funzione è definita.
    const points = Rng.forExercise(exercise.generator, exercise.level, exercise.seed).fork("verifica");
    let checked = 0;
    for (let attempt = 0; attempt < 60 && checked < 6; attempt++) {
      const at = points.real(0.3, 2.5);
      const expected = slope(f, at);
      const actual = evaluate(answer.correct, { x: at });
      if (!Number.isFinite(expected) || !Number.isFinite(actual)) continue;
      if (Math.abs(expected - actual) > 1e-4 * (1 + Math.abs(actual))) return false;
      checked += 1;
    }
    return checked >= 4;
  },
});
