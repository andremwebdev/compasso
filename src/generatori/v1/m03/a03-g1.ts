// V1.M03.A03.g1 — Espressioni con le frazioni: somme con il minimo comune denominatore, prodotti,
// quozienti con il reciproco, potenze, precedenze.
//
// Risposta: un numero razionale, da scrivere come frazione ridotta ai minimi termini (vincolo
// `reducedFraction`). All'indietro: l'espressione è un albero con frazioni irriducibili piccole; i conti
// si fanno con i razionali esatti e si tengono solo gli alberi con risultato e passaggi «puliti»
// (numeratori e denominatori piccoli). Le risposte sbagliate rifanno il conto con UN errore tipico in un
// punto preciso dell'albero:
// - CALC.SOMMA_FRAZIONI: a/b ± c/d calcolato come (a ± c)/(b ± d);
// - ALG.SEMPLIFICAZIONE_ADDENDI: in una somma con un numeratore e un denominatore «in croce» che hanno un
//   divisore comune, la semplificazione in croce fatta come in un prodotto (2/3 + 3/4 → 2/4);
// - CALC.DIVISIONE_FRAZIONI: a/b : c/d calcolato come a/b · c/d (senza capovolgere), oppure come
//   b/a · c/d (capovolgendo la prima);
// - CALC.PRECEDENZA: a ± b · c (oppure b : c) calcolato come (a ± b) · c;
// - CALC.MENO_POTENZA: (−a/b)² calcolato come −a²/b²;
// - CALC.REGOLA_SEGNI: segno sbagliato di un prodotto o di un quoziente con un fattore negativo, oppure di
//   una somma di due numeri di segno diverso.
//
// Livello 1: una operazione tra due frazioni: somma o differenza con denominatori diversi, quoziente.
// Livello 2: due o tre operazioni: a/b + c/d · e/f, (a/b − c/d) : e/f, a/b : c/d − (−e/f)².
// Livello 3: come l'esempio svolto della lezione, con parentesi quadre, potenze e numeri interi:
//   (a/b − c/d) : e/f + g/h · (−i/j)², [a/b − (c/d + e/f) · g/h] : i/j, n − a/b : (c/d − e/f).
//
// Verifica: l'albero si traduce in un'espressione del motore e il valore si ricava con `simplify`
// (razionali esatti); deve coincidere con la risposta, che deve essere una frazione irriducibile.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { simplify } from "../../../motore/algebra/simplify";
import { add, div, frac, mul, num, pow, sub, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { gcd, lcm } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const SUM = "CALC.SOMMA_FRAZIONI";
const CROSS = "ALG.SEMPLIFICAZIONE_ADDENDI";
const DIVISION = "CALC.DIVISIONE_FRAZIONI";
const PRECEDENCE = "CALC.PRECEDENZA";
const MINUS_POWER = "CALC.MENO_POTENZA";
const SIGNS = "CALC.REGOLA_SEGNI";

type Bracket = "round" | "square";

/** Un nodo: frazione scritta p/q (q = 1 per un intero), operazione, potenza di una frazione, parentesi. */
type Node =
  | { readonly k: "lit"; readonly p: number; readonly q: number }
  | { readonly k: "add" | "sub" | "mul" | "div"; readonly a: Node; readonly b: Node }
  | { readonly k: "pow"; readonly x: Node; readonly e: number }
  | { readonly k: "group"; readonly x: Node; readonly br: Bracket };

interface Model {
  readonly root: Node;
}

interface Fault {
  readonly at: number;
  readonly code: ErrorCode;
  readonly variant: number;
}

const lit = (p: number, q = 1): Node => ({ k: "lit", p, q });
const bin = (k: "add" | "sub" | "mul" | "div", a: Node, b: Node): Node => ({ k, a, b });
const group = (x: Node, br: Bracket = "round"): Node => ({ k: "group", x, br });
const R = (p: number, q = 1): Rational => Rational.of(p, q);

// ───────────────────────────── conti ─────────────────────────────

function children(n: Node): Node[] {
  switch (n.k) {
    case "lit":
      return [];
    case "add":
    case "sub":
    case "mul":
    case "div":
      return [n.a, n.b];
    case "pow":
    case "group":
      return [n.x];
  }
}

const size = (n: Node): number => 1 + children(n).reduce((s, c) => s + size(c), 0);
const numOf = (r: Rational): number => Number(r.n);
const denOf = (r: Rational): number => Number(r.d);

/** Il valore senza errori. */
const value = (n: Node): Rational | null => evaluate(n);

/** Il valore con l'errore `fault` nel nodo indicato; null se l'errore lì non si può fare. */
function evaluate(root: Node, fault?: Fault): Rational | null {
  let index = -1;
  let used = false;
  const go = (n: Node): Rational | null => {
    index++;
    const here = fault !== undefined && fault.at === index;
    switch (n.k) {
      case "lit":
        return R(n.p, n.q);
      case "group":
        return go(n.x);
      case "pow": {
        const base = go(n.x);
        if (base === null) return null;
        const right = base.pow(n.e);
        if (here && fault.code === MINUS_POWER && base.cmp(0) < 0 && n.e % 2 === 0) {
          used = true;
          return right.neg();
        }
        return right;
      }
      case "add":
      case "sub": {
        // a ± b·c (oppure b:c) fatto come (a ± b)·c.
        if (here && fault.code === PRECEDENCE && (n.b.k === "mul" || n.b.k === "div")) {
          index += size(n) - 1;
          const [a, b, c] = [value(n.a), value(n.b.a), value(n.b.b)];
          if (a === null || b === null || c === null) return null;
          const left = n.k === "add" ? a.add(b) : a.sub(b);
          if (n.b.k === "div" && c.isZero()) return null;
          used = true;
          return n.b.k === "mul" ? left.mul(c) : left.div(c);
        }
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        const right = n.k === "add" ? a.add(b) : a.sub(b);
        if (here && fault.code === SUM && a.d !== b.d) {
          const den = n.k === "add" ? denOf(a) + denOf(b) : denOf(a) - denOf(b);
          if (den === 0) return null;
          used = true;
          return R(n.k === "add" ? numOf(a) + numOf(b) : numOf(a) - numOf(b), den);
        }
        if (here && fault.code === CROSS && n.k === "add" && (gcd(Math.abs(numOf(a)), denOf(b)) > 1 || gcd(Math.abs(numOf(b)), denOf(a)) > 1)) {
          used = true;
          return a.mul(b);
        }
        const second = n.k === "add" ? b : b.neg();
        if (here && fault.code === SIGNS && !a.isZero() && !second.isZero() && a.cmp(0) * second.cmp(0) < 0 && !right.isZero()) {
          used = true;
          return right.neg();
        }
        return right;
      }
      case "mul":
      case "div": {
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        if (n.k === "div" && b.isZero()) return null;
        const right = n.k === "mul" ? a.mul(b) : a.div(b);
        if (here && fault.code === DIVISION && n.k === "div") {
          if (fault.variant === 0) {
            used = true;
            return a.mul(b);
          }
          if (fault.variant === 1 && !a.isZero()) {
            used = true;
            return a.inv().mul(b);
          }
        }
        if (here && fault.code === SIGNS && fault.variant === 0 && (a.cmp(0) < 0 || b.cmp(0) < 0) && !right.isZero()) {
          used = true;
          return right.neg();
        }
        return right;
      }
    }
  };
  const result = go(root);
  if (fault !== undefined && !used) return null;
  return result;
}

const MAX_TERM = 200;
const small = (r: Rational): boolean => Math.abs(numOf(r)) <= MAX_TERM && denOf(r) <= MAX_TERM;

/** Gli errori possibili, un giro per codice, al più quattro. */
function keptWrong(model: Model): { error: ErrorCode; value: Rational }[] {
  const correct = evaluate(model.root);
  if (correct === null) return [];
  const count = size(model.root);
  const byCode = new Map<ErrorCode, { error: ErrorCode; value: Rational }[]>();
  const seen: Rational[] = [];
  for (const code of [SUM, DIVISION, PRECEDENCE, MINUS_POWER, CROSS, SIGNS] as const) {
    for (let at = 0; at < count; at++) {
      for (const variant of [0, 1]) {
        const v = evaluate(model.root, { at, code, variant });
        if (v === null || v.eq(correct) || !small(v) || seen.some((s) => s.eq(v))) continue;
        seen.push(v);
        byCode.set(code, [...(byCode.get(code) ?? []), { error: code, value: v }]);
      }
    }
  }
  const ordered: { error: ErrorCode; value: Rational }[] = [];
  for (let round = 0; ordered.length < seen.length; round++) {
    for (const list of byCode.values()) {
      const item = list[round];
      if (item) ordered.push(item);
    }
  }
  return ordered.slice(0, 4);
}

// ───────────────────────────── costruzione ─────────────────────────────

/** Una frazione irriducibile non intera, con il segno scelto (`sign` = 0: a caso). */
function fraction(rng: Rng_, maxQ = 9, sign: -1 | 0 | 1 = 1): Node {
  for (;;) {
    const q = rng.int(2, maxQ);
    const p = rng.int(1, Math.min(12, 2 * q));
    if (gcd(p, q) !== 1) continue;
    const s = sign === 0 ? rng.sign() : sign;
    return lit(s * p, q);
  }
}

function buildLevel1(rng: Rng_): Node {
  const form = rng.pick(["sum", "sum", "difference", "quotient", "quotient"] as const);
  switch (form) {
    case "sum":
      return bin("add", fraction(rng, 9, rng.pick([1, 1, -1] as const)), fraction(rng));
    case "difference":
      return bin("sub", fraction(rng), fraction(rng));
    case "quotient":
      return bin("div", fraction(rng, 9, rng.pick([1, 1, -1] as const)), fraction(rng));
  }
}

function buildLevel2(rng: Rng_): Node {
  const form = rng.pick(["sumProduct", "differenceQuotient", "quotientPower"] as const);
  switch (form) {
    case "sumProduct":
      // a/b ± c/d · e/f
      return bin(rng.bool() ? "add" : "sub", fraction(rng), bin(rng.bool() ? "mul" : "div", fraction(rng), fraction(rng)));
    case "differenceQuotient":
      // (a/b − c/d) : e/f
      return bin("div", group(bin(rng.bool() ? "sub" : "add", fraction(rng), fraction(rng))), fraction(rng));
    case "quotientPower":
      // a/b : c/d − (−e/f)²
      return bin("sub", bin("div", fraction(rng), fraction(rng)), { k: "pow", x: fraction(rng, 5, -1), e: 2 });
  }
}

function buildLevel3(rng: Rng_): Node {
  const form = rng.pick(["lessonLike", "lessonLike", "squareBracket", "integer"] as const);
  switch (form) {
    case "lessonLike":
      // (a/b − c/d) : e/f + g/h · (−i/j)²
      return bin(
        "add",
        bin("div", group(bin("sub", fraction(rng), fraction(rng))), fraction(rng)),
        bin("mul", fraction(rng), { k: "pow", x: fraction(rng, 4, -1), e: 2 }),
      );
    case "squareBracket":
      // [a/b − (c/d + e/f) · g/h] : i/j
      return bin("div", group(bin("sub", fraction(rng), bin("mul", group(bin(rng.bool() ? "add" : "sub", fraction(rng), fraction(rng))), fraction(rng))), "square"), fraction(rng));
    case "integer":
      // n − a/b : (c/d − e/f)
      return bin("sub", lit(rng.int(1, 5)), bin("div", fraction(rng), group(bin("sub", fraction(rng), fraction(rng)))));
  }
}

/** Ogni valore intermedio (e il risultato) ha numeratore e denominatore piccoli e diversi da 0. */
function clean(n: Node, maxTerm: number): boolean {
  const v = value(n);
  if (v === null || v.isZero() || Math.abs(numOf(v)) > maxTerm || denOf(v) > maxTerm) return false;
  return children(n).every((c) => clean(c, maxTerm));
}

/** Nelle somme di due frazioni i denominatori sono diversi (altrimenti non c'è niente da allenare). */
function differentDenominators(n: Node): boolean {
  if (n.k === "add" || n.k === "sub") {
    const a = value(n.a);
    const b = value(n.b);
    if (a === null || b === null || a.d === b.d) return false;
  }
  return children(n).every(differentDenominators);
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const root = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const model: Model = { root };
    const v = value(root);
    if (v === null || v.isInteger() && level === 1) continue;
    if (!clean(root, level === 3 ? 90 : 60) || !differentDenominators(root)) continue;
    if (keptWrong(model).length >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo ─────────────────────────────

/** LaTeX di un razionale: intero, oppure frazione con il meno davanti; tra parentesi se negativo e non in testa. */
function ratLatex(r: Rational, lead = true): string {
  const p = numOf(r);
  const q = denOf(r);
  const body = q === 1 ? String(Math.abs(p)) : `\\dfrac{${Math.abs(p)}}{${q}}`;
  if (p >= 0) return body;
  return lead ? `-${body}` : `\\left(-${body}\\right)`;
}

const OPEN: Record<Bracket, string> = { round: "\\left(", square: "\\left[" };
const CLOSE: Record<Bracket, string> = { round: "\\right)", square: "\\right]" };

function latex(n: Node, lead: boolean): string {
  switch (n.k) {
    case "lit":
      return ratLatex(R(n.p, n.q), lead);
    case "pow":
      return `\\left(${latex(n.x, true)}\\right)^{${n.e}}`;
    case "group":
      return `${OPEN[n.br]}${latex(n.x, true)}${CLOSE[n.br]}`;
    case "add":
      return `${latex(n.a, lead)} + ${latex(n.b, false)}`;
    case "sub":
      return `${latex(n.a, lead)} - ${latex(n.b, false)}`;
    case "mul":
      return `${latex(n.a, lead)} \\cdot ${latex(n.b, false)}`;
    case "div":
      return `${latex(n.a, lead)} : ${latex(n.b, false)}`;
  }
}

/** Il passaggio di un'operazione tra due valori già calcolati. */
function operationStep(op: "add" | "sub" | "mul" | "div", a: Rational, b: Rational): string {
  const A = ratLatex(a, true);
  const B = ratLatex(b, false);
  switch (op) {
    case "add":
    case "sub": {
      const sign = op === "add" ? "+" : "-";
      const m = lcm(denOf(a), denOf(b));
      const x = (numOf(a) * m) / denOf(a);
      const y = (numOf(b) * m) / denOf(b);
      const result = op === "add" ? a.add(b) : a.sub(b);
      // Il secondo termine con il segno dell'operazione: «− (−5/84)» diventa «+ 5/84».
      const eff = op === "add" ? y : -y;
      const effSign = eff < 0 ? "-" : "+";
      const first = x < 0 ? `-\\dfrac{${-x}}{${m}}` : `\\dfrac{${x}}{${m}}`;
      const rewritten = `${first} ${effSign} \\dfrac{${Math.abs(eff)}}{${m}}`;
      const summed = `\\dfrac{${x} ${effSign} ${Math.abs(eff)}}{${m}}`;
      const top = x + eff;
      const topLatex = top < 0 ? `-\\dfrac{${-top}}{${m}}` : `\\dfrac{${top}}{${m}}`;
      const final = denOf(result) !== m ? ` = ${ratLatex(result)}` : "";
      return `${op === "add" ? "La somma" : "La differenza"}, con il minimo comune denominatore $${m}$: $${A} ${sign} ${B} = ${rewritten} = ${summed} = ${topLatex}${final}$.`;
    }
    case "mul": {
      const result = a.mul(b);
      const cross = gcd(Math.abs(numOf(a)), denOf(b)) > 1 || gcd(Math.abs(numOf(b)), denOf(a)) > 1;
      return `Il prodotto${cross ? ", semplificando in croce prima di moltiplicare" : ""}: $${A} \\cdot ${B} = ${ratLatex(result)}$${signNote(a, b)}.`;
    }
    case "div": {
      const result = a.div(b);
      return `Il quoziente: si moltiplica per il reciproco del divisore, $${A} : ${B} = ${A} \\cdot ${ratLatex(b.inv(), false)} = ${ratLatex(result)}$${signNote(a, b)}.`;
    }
  }
}

function signNote(a: Rational, b: Rational): string {
  const negatives = (a.cmp(0) < 0 ? 1 : 0) + (b.cmp(0) < 0 ? 1 : 0);
  if (negatives === 0) return "";
  return negatives === 2 ? " (segni uguali, risultato positivo)" : " (segni diversi, risultato negativo)";
}

/** I passaggi, nell'ordine in cui si fanno i conti: prima i pezzi interni, poi l'operazione che li unisce. */
function stepsOf(root: Node): string[] {
  const steps: string[] = [];
  const visit = (n: Node): void => {
    switch (n.k) {
      case "lit":
        return;
      case "group":
        visit(n.x);
        return;
      case "pow": {
        visit(n.x);
        const base = value(n.x) ?? R(0);
        const parity = base.cmp(0) < 0 ? (n.e % 2 === 0 ? ": esponente pari, risultato positivo" : ": esponente dispari, risultato negativo") : "";
        steps.push(`La potenza: $\\left(${ratLatex(base)}\\right)^{${n.e}} = ${ratLatex(base.pow(n.e))}$${parity}.`);
        return;
      }
      case "add":
      case "sub":
      case "mul":
      case "div":
        visit(n.a);
        visit(n.b);
        steps.push(operationStep(n.k, value(n.a) ?? R(0), value(n.b) ?? R(1)));
        return;
    }
  };
  visit(root);
  return steps;
}

const answerExpr = (r: Rational): Expr => frac(r.n, r.d);

function draftOf(model: Model): ExerciseDraft {
  const correct = value(model.root) ?? R(0);
  return {
    prompt: `Calcola il valore dell'espressione $${latex(model.root, true)}$ e scrivi il risultato come frazione ridotta ai minimi termini (o come numero intero).`,
    answer: {
      kind: "number",
      correct: answerExpr(correct),
      wrong: distinctWrongExpressions(
        answerExpr(correct),
        keptWrong(model).map((w) => ({ error: w.error, value: answerExpr(w.value) })),
      ),
      mode: exact,
      form: ["reducedFraction"],
    },
    steps: stepsOf(model.root).map((text, i) => ({ text: `**Passo ${i + 1}.** ${text}` })),
    hints: [
      "Valgono le solite precedenze: parentesi, potenze, moltiplicazioni e divisioni, infine addizioni e sottrazioni. Il denominatore comune serve solo per sommare.",
      "Per dividere moltiplica per il reciproco del divisore; per sommare riscrivi le frazioni con il minimo comune denominatore e somma i numeratori.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function toExpr(n: Node): Expr {
  switch (n.k) {
    case "lit":
      return n.q === 1 ? num(n.p) : div(num(n.p), num(n.q));
    case "pow":
      return pow(toExpr(n.x), num(n.e));
    case "group":
      return toExpr(n.x);
    case "add":
      return add(toExpr(n.a), toExpr(n.b));
    case "sub":
      return sub(toExpr(n.a), toExpr(n.b));
    case "mul":
      return mul(toExpr(n.a), toExpr(n.b));
    case "div":
      return div(toExpr(n.a), toExpr(n.b));
  }
}

function verifyModel(model: Model, exercise: Exercise): boolean {
  const v = simplify(toExpr(model.root));
  if (v.kind !== "num") return false;
  if (!exercise.prompt.includes(latex(model.root, true))) return false;
  if (exercise.answer.kind !== "number" || exercise.answer.correct.kind !== "num") return false;
  const answer = exercise.answer.correct.value;
  return answer.eq(v.value) && gcd(Math.abs(numOf(answer)), denOf(answer)) === 1;
}

export default defineGenerator({
  code: "V1.M03.A03.g1",
  skill: "V1.M03.A03",
  lesson: "V1.M03.L03",
  title: "Espressioni con le frazioni",
  levels: [1, 2, 3],
  errors: [SUM, DIVISION, PRECEDENCE, MINUS_POWER, CROSS, SIGNS],
  limits: { maxInteger: MAX_TERM, maxDenominator: MAX_TERM },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
