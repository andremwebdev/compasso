// V1.M02.A01.g1 — Espressioni con i numeri interi: regola dei segni, sottrazione, potenze, precedenza.
//
// Risposta: un numero intero. All'indietro: l'espressione è un albero di operazioni costruito con
// numeri piccoli; ogni divisione nasce come (q·d) : d, così ogni quoziente è intero. Le risposte
// sbagliate si ottengono rifacendo il conto con UN errore tipico fatto in un punto preciso dell'albero:
// - CALC.REGOLA_SEGNI: segno sbagliato di un prodotto o di un quoziente con un fattore negativo, oppure
//   di una somma di due numeri di segno diverso;
// - CALC.MENO_PARENTESI: a − (−b) calcolato come a − b (il meno davanti alla parentesi non cambia il segno);
// - CALC.MENO_POTENZA: −a² calcolato come (−a)², oppure (−a)² (anche (a − b)² con a < b) come −a²;
// - CALC.PRECEDENZA: a ± b · c calcolato da sinistra a destra, come (a ± b) · c.
// I candidati uguali alla risposta giusta o tra loro si scartano; se ne restano troppo pochi si estrae di nuovo.
//
// Livello 1: due operazioni (una sottrazione di un negativo, un prodotto o un quoziente, una potenza).
// Livello 2: quattro operazioni con potenze di base negativa, prodotti e quozienti, sottrazioni di negativi.
// Livello 3: parentesi annidate (tonde dentro quadre), potenze di una parentesi, più fattori negativi.
//
// Verifica: l'albero si traduce in un'espressione del motore (add, sub, mul, div, pow) e il valore si
// ricava con `simplify`, che fa i conti esatti con i razionali; deve coincidere con la risposta.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { simplify } from "../../../motore/algebra/simplify";
import { add, div, mul, neg, num, pow, sub, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const SIGNS = "CALC.REGOLA_SEGNI";
const MINUS_PAREN = "CALC.MENO_PARENTESI";
const MINUS_POWER = "CALC.MENO_POTENZA";
const PRECEDENCE = "CALC.PRECEDENZA";

/** Un nodo dell'espressione. */
type Node =
  | { readonly k: "lit"; readonly v: number }
  | { readonly k: "add" | "sub" | "mul" | "div"; readonly a: Node; readonly b: Node }
  /** (base)^e con base intera (tra parentesi se negativa). */
  | { readonly k: "pow"; readonly base: number; readonly e: number }
  /** −a^e con a > 0: la potenza riguarda solo a. Solo in testa all'espressione o a una parentesi. */
  | { readonly k: "negpow"; readonly base: number; readonly e: number }
  /** Una parentesi scritta: tonda o quadra. */
  | { readonly k: "group"; readonly x: Node; readonly square: boolean }
  /** (gruppo)^e: potenza di una parentesi. */
  | { readonly k: "gpow"; readonly x: Node; readonly e: number };

interface Model {
  readonly root: Node;
}

/** Dove e quale errore fare: `at` è l'indice del nodo nella visita in ordine anticipato. */
interface Fault {
  readonly at: number;
  readonly code: ErrorCode;
}

const lit = (v: number): Node => ({ k: "lit", v });
const bin = (k: "add" | "sub" | "mul" | "div", a: Node, b: Node): Node => ({ k, a, b });
const group = (x: Node, square = false): Node => ({ k: "group", x, square });

// ───────────────────────────── conti ─────────────────────────────

/** I nodi in ordine anticipato (lo stesso ordine con cui `evaluate` conta gli indici). */
function nodes(root: Node): Node[] {
  const out: Node[] = [];
  const visit = (n: Node): void => {
    out.push(n);
    switch (n.k) {
      case "lit":
      case "pow":
      case "negpow":
        return;
      case "add":
      case "sub":
      case "mul":
      case "div":
        visit(n.a);
        visit(n.b);
        return;
      case "group":
      case "gpow":
        visit(n.x);
        return;
    }
  };
  visit(root);
  return out;
}

/**
 * Il valore dell'espressione, con l'errore `fault` fatto nel nodo indicato (se c'è). Restituisce null
 * se l'errore in quel nodo non si può fare o se un quoziente non viene intero.
 */
function evaluate(root: Node, fault?: Fault): number | null {
  let index = -1;
  let used = false;
  const go = (n: Node): number | null => {
    index++;
    const here = fault !== undefined && fault.at === index;
    switch (n.k) {
      case "lit":
        return n.v;
      case "pow": {
        const right = n.base ** n.e;
        if (here && fault.code === MINUS_POWER && n.base < 0 && n.e % 2 === 0) {
          used = true;
          return -right;
        }
        return right;
      }
      case "negpow": {
        const right = -(n.base ** n.e);
        if (here && fault.code === MINUS_POWER && n.e % 2 === 0) {
          used = true;
          return -right;
        }
        return right;
      }
      case "group":
        return go(n.x);
      case "gpow": {
        const inner = go(n.x);
        if (inner === null) return null;
        if (here && fault.code === MINUS_POWER && inner < 0 && n.e % 2 === 0) {
          used = true;
          return -(inner ** n.e);
        }
        return inner ** n.e;
      }
      case "add":
      case "sub": {
        // Precedenza: a ± b·c (oppure b:c) fatto come (a ± b)·c.
        if (here && fault.code === PRECEDENCE && (n.b.k === "mul" || n.b.k === "div")) {
          const a = go(n.a);
          index++; // il nodo del prodotto
          const b = go(n.b.a);
          const c = go(n.b.b);
          if (a === null || b === null || c === null) return null;
          const left = n.k === "add" ? a + b : a - b;
          used = true;
          if (n.b.k === "mul") return left * c;
          return c !== 0 && left % c === 0 ? left / c : null;
        }
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        const right = n.k === "add" ? a + b : a - b;
        if (here && fault.code === MINUS_PAREN && n.k === "sub" && b < 0 && isWrittenNegative(n.b)) {
          used = true;
          return a + b;
        }
        // Somma di due numeri di segno diverso: segno del risultato sbagliato.
        const second = n.k === "add" ? b : -b;
        if (here && fault.code === SIGNS && a !== 0 && second !== 0 && Math.sign(a) !== Math.sign(second) && right !== 0) {
          used = true;
          return -right;
        }
        return right;
      }
      case "mul":
      case "div": {
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        let right: number;
        if (n.k === "mul") right = a * b;
        else {
          if (b === 0 || a % b !== 0) return null;
          right = a / b;
        }
        // −[…]: il meno davanti alla parentesi dimenticato.
        const minusGroup = n.k === "mul" && n.a.k === "lit" && n.a.v === -1;
        if (here && minusGroup && fault.code === MINUS_PAREN && right !== 0) {
          used = true;
          return -right;
        }
        if (here && !minusGroup && fault.code === SIGNS && (a < 0 || b < 0) && right !== 0) {
          used = true;
          return -right;
        }
        return right;
      }
    }
  };
  const value = go(root);
  if (fault !== undefined && !used) return null;
  return value;
}

/** Vero se il nodo, scritto, comincia con un meno dentro una parentesi: (−5), (−2)³, (3 − 8). */
function isWrittenNegative(n: Node): boolean {
  return n.k === "lit" || n.k === "pow" || n.k === "group";
}

/** Tutti gli errori possibili, nell'ordine dei nodi; per ogni codice si prova ogni nodo. */
function wrongCandidates(model: Model): { error: ErrorCode; value: number }[] {
  const count = nodes(model.root).length;
  const out: { error: ErrorCode; value: number }[] = [];
  // Ordine dei codici: prima gli errori di questa lezione più «visibili».
  for (const code of [MINUS_POWER, MINUS_PAREN, PRECEDENCE, SIGNS] as const) {
    for (let at = 0; at < count; at++) {
      const value = evaluate(model.root, { at, code });
      if (value !== null) out.push({ error: code, value });
    }
  }
  return out;
}

function keptWrong(model: Model): { error: ErrorCode; value: number }[] {
  const correct = evaluate(model.root);
  const kept: { error: ErrorCode; value: number }[] = [];
  for (const candidate of wrongCandidates(model)) {
    if (candidate.value === correct || Math.abs(candidate.value) > LIMIT) continue;
    if (kept.some((other) => other.value === candidate.value)) continue;
    // Un codice non si ripete finché ce ne sono altri: le opzioni mostrano errori diversi.
    kept.push(candidate);
  }
  const byCode = new Map<ErrorCode, { error: ErrorCode; value: number }[]>();
  for (const w of kept) byCode.set(w.error, [...(byCode.get(w.error) ?? []), w]);
  // Un giro per codice, poi il secondo, e così via.
  const ordered: { error: ErrorCode; value: number }[] = [];
  for (let round = 0; ordered.length < kept.length; round++) {
    for (const list of byCode.values()) {
      const item = list[round];
      if (item) ordered.push(item);
    }
  }
  return ordered.slice(0, 4);
}

const LIMIT = 200;

// ───────────────────────────── costruzione ─────────────────────────────

const small = (rng: Rng_, max = 9): number => rng.int(2, max);
const negative = (rng: Rng_, max = 9): number => -rng.int(2, max);
const signed = (rng: Rng_, max = 9): number => rng.int(2, max) * rng.sign();

/** Un quoziente intero: (q·d) : d, con i segni scelti. */
function quotient(rng: Rng_, maxQ = 6): Node {
  const q = signed(rng, maxQ);
  const d = rng.pick([-2, -3, -4, -5, 2, 3, 4, 5, -6, 6]);
  return bin("div", lit(q * d), lit(d));
}

function buildLevel1(rng: Rng_): Node {
  const form = rng.pick(["subNegative", "subNegative", "product", "quotient", "power", "power"] as const);
  switch (form) {
    case "subNegative":
      // a − (−b) + c oppure a − (−b) − c
      return bin(rng.bool() ? "add" : "sub", bin("sub", lit(signed(rng, 12)), lit(negative(rng, 12))), lit(small(rng, 12)));
    case "product":
      // a + b · c con almeno un fattore negativo
      return bin("add", lit(signed(rng, 12)), bin("mul", lit(negative(rng)), lit(signed(rng))));
    case "quotient":
      // a − b : c
      return bin("sub", lit(signed(rng, 12)), quotient(rng));
    case "power": {
      const e = rng.pick([2, 2, 4, 3] as const);
      const base = e === 4 ? 2 : rng.int(2, e === 3 ? 4 : 6);
      // −a^e + b oppure (−a)^e − b
      return rng.bool()
        ? bin("add", { k: "negpow", base, e }, lit(small(rng, 20)))
        : bin("sub", { k: "pow", base: -base, e }, lit(rng.int(2, 30)));
    }
  }
}

function buildLevel2(rng: Rng_): Node {
  const form = rng.pick(["powerProductSub", "powerQuotientProduct", "subProductPower"] as const);
  switch (form) {
    case "powerProductSub":
      // −a² + b·(−c) − (−d)
      return bin("sub", bin("add", { k: "negpow", base: rng.int(2, 5), e: 2 }, bin("mul", lit(signed(rng)), lit(negative(rng)))), lit(negative(rng, 12)));
    case "powerQuotientProduct":
      // (−a)^e − b : (−c) + d·e
      return bin(
        "add",
        bin("sub", { k: "pow", base: -rng.int(2, 3), e: rng.pick([2, 3] as const) }, quotient(rng)),
        bin("mul", lit(signed(rng)), lit(signed(rng))),
      );
    case "subProductPower":
      // a − b·c + (−d)^2
      return bin("add", bin("sub", lit(signed(rng, 15)), bin("mul", lit(signed(rng)), lit(negative(rng)))), { k: "pow", base: -rng.int(2, 5), e: 2 });
  }
}

/** (a − b)^e con a < b: la base della potenza è negativa. */
function groupPower(rng: Rng_): Node {
  const a = rng.int(1, 9);
  return { k: "gpow", x: group(bin("sub", lit(a), lit(a + rng.int(1, 4))), false), e: rng.pick([2, 3, 3] as const) };
}

function buildLevel3(rng: Rng_): Node {
  const form = rng.pick(["nested", "nested", "groupPower", "manyNegatives"] as const);
  switch (form) {
    case "nested":
      // −[a − (b − c)·d] + e : f
      return bin(
        "add",
        bin("mul", lit(-1), group(bin("sub", lit(signed(rng)), bin("mul", group(bin("sub", lit(small(rng)), lit(small(rng, 12)))), lit(negative(rng, 5)))), true)),
        quotient(rng, 5),
      );
    case "groupPower":
      // (a − b)^e − c·(−d)
      return bin(
        "sub",
        groupPower(rng),
        bin("mul", lit(signed(rng)), lit(negative(rng))),
      );
    case "manyNegatives":
      // (−1)^n · (−a) · (−b) − [c − (−d)]
      return bin(
        "sub",
        bin("mul", bin("mul", { k: "pow", base: -1, e: rng.int(3, 9) }, lit(negative(rng))), lit(negative(rng))),
        group(bin("sub", lit(signed(rng)), lit(negative(rng))), true),
      );
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const root = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const model: Model = { root };
    const value = evaluate(root);
    if (value === null || Math.abs(value) > LIMIT) continue;
    if (keptWrong(model).length >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const minus = (v: number): string => (v < 0 ? `-${-v}` : String(v));

/** LaTeX del nodo; `lead` è vero se il nodo è il primo di una parentesi o dell'espressione. */
function latex(n: Node, lead: boolean): string {
  switch (n.k) {
    case "lit":
      return n.v < 0 && !lead ? `\\left(${minus(n.v)}\\right)` : minus(n.v);
    case "pow":
      return n.base < 0 ? `\\left(${minus(n.base)}\\right)^{${n.e}}` : `${n.base}^{${n.e}}`;
    case "negpow":
      return `-${n.base}^{${n.e}}`;
    case "group": {
      const inner = latex(n.x, true);
      return n.square ? `\\left[${inner}\\right]` : `\\left(${inner}\\right)`;
    }
    case "gpow":
      return `${latex(n.x, lead)}^{${n.e}}`;
    case "add":
      return `${latex(n.a, lead)} + ${latex(n.b, false)}`;
    case "sub":
      return `${latex(n.a, lead)} - ${latex(n.b, false)}`;
    case "mul":
      // −1 davanti a una parentesi si scrive come un meno.
      if (n.a.k === "lit" && n.a.v === -1 && lead) return `-${latex(n.b, false)}`;
      return `${latex(n.a, lead)} \\cdot ${latex(n.b, false)}`;
    case "div":
      return `${latex(n.a, lead)} : ${latex(n.b, false)}`;
  }
}

/** I passaggi: si calcola un pezzo alla volta, dalle potenze e dalle parentesi alle somme. */
function stepsOf(root: Node): { text: string }[] {
  const steps: { text: string }[] = [];
  const explain = (n: Node): void => {
    switch (n.k) {
      case "lit":
        return;
      case "pow": {
        const value = n.base ** n.e;
        const note = n.base < 0 ? (n.e % 2 === 0 ? ": esponente pari, risultato positivo" : ": esponente dispari, risultato negativo") : "";
        steps.push({ text: `La potenza: $${latex(n, true)} = ${minus(value)}$${note}.` });
        return;
      }
      case "negpow":
        steps.push({ text: `La potenza riguarda solo il $${n.base}$: $${latex(n, true)} = -(${n.base}^{${n.e}}) = ${minus(-(n.base ** n.e))}$.` });
        return;
      case "group": {
        explain(n.x);
        const chain = sumChain(n.x);
        if (chain !== null) steps.push({ text: `Dentro la parentesi: $${chain}$.` });
        return;
      }
      case "gpow": {
        explain(n.x);
        const inner = evaluate(n.x) ?? 0;
        steps.push({ text: `La potenza della parentesi: $\\left(${minus(inner)}\\right)^{${n.e}} = ${minus(inner ** n.e)}$${inner < 0 ? (n.e % 2 === 0 ? ": esponente pari, risultato positivo" : ": esponente dispari, risultato negativo") : ""}.` });
        return;
      }
      case "mul":
      case "div": {
        explain(n.a);
        explain(n.b);
        const a = evaluate(n.a) ?? 0;
        const b = evaluate(n.b) ?? 0;
        const value = evaluate(n) ?? 0;
        if (n.k === "mul" && n.a.k === "lit" && n.a.v === -1) {
          steps.push({ text: `Il meno davanti alla parentesi cambia il segno: $-${wrapped(b, false)} = ${minus(value)}$.` });
          return;
        }
        const op = n.k === "mul" ? "\\cdot" : ":";
        const signs = a < 0 && b < 0 ? "segni uguali, risultato positivo" : a < 0 || b < 0 ? "segni diversi, risultato negativo" : "segni uguali, risultato positivo";
        steps.push({ text: `${n.k === "mul" ? "Il prodotto" : "Il quoziente"}: $${wrapped(a, true)} ${op} ${wrapped(b, false)} = ${minus(value)}$ (${signs}).` });
        return;
      }
      case "add":
      case "sub":
        explain(n.a);
        explain(n.b);
        return;
    }
  };
  explain(root);
  // Ultimo passaggio: le somme da sinistra a destra, con i valori dei pezzi.
  const chain = sumChain(root);
  if (chain !== null) steps.push({ text: `Restano le somme, da sinistra a destra: $${chain}$.` });
  return steps.map((step, i) => ({ text: `**Passo ${i + 1}.** ${step.text}` }));
}

/**
 * La catena della somma più esterna di un nodo, con i valori dei pezzi già calcolati: «−27 − (−4) + 63
 * = −27 + 4 + 63 = 40». Null se il nodo non è una somma.
 */
function sumChain(n: Node): string | null {
  const terms = additiveTerms(n);
  if (terms.length < 2) return null;
  const values = terms.map(([sign, t]) => [sign, evaluate(t) ?? 0] as const);
  const written = values.map(([sign, v], i) => (i === 0 ? minus(v) : `${sign} ${wrapped(v, false)}`)).join(" ");
  const plain = values
    .map(([sign, v], i) => {
      const eff = sign === "-" ? -v : v;
      return i === 0 ? minus(v) : eff < 0 ? `- ${-eff}` : `+ ${eff}`;
    })
    .join(" ");
  const value = minus(evaluate(n) ?? 0);
  return written === plain ? `${written} = ${value}` : `${written} = ${plain} = ${value}`;
}

/** Gli addendi della somma più esterna, con il loro segno. */
function additiveTerms(root: Node): ["+" | "-", Node][] {
  if (root.k === "add" || root.k === "sub") return [...additiveTerms(root.a), [root.k === "add" ? "+" : "-", root.b]];
  return [["+", root]];
}

const wrapped = (v: number, lead: boolean): string => (v < 0 && !lead ? `\\left(${minus(v)}\\right)` : minus(v));

function draftOf(model: Model): ExerciseDraft {
  const correct = evaluate(model.root) ?? 0;
  const expression = latex(model.root, true);
  return {
    prompt: `Calcola il valore dell'espressione $${expression}$. Rispondi con un numero intero.`,
    answer: { kind: "number", correct: num(correct), wrong: wrongOf(model, correct), mode: exact },
    steps: stepsOf(model.root),
    hints: [
      "Prima le parentesi, poi le potenze, poi moltiplicazioni e divisioni, infine addizioni e sottrazioni da sinistra a destra.",
      "Per ogni prodotto o quoziente decidi prima il segno (segni uguali $+$, segni diversi $-$); una potenza con base negativa è positiva solo con esponente pari.",
    ],
  };
}

function wrongOf(model: Model, correct: number) {
  return distinctWrongExpressions(
    num(correct),
    keptWrong(model).map((w) => ({ error: w.error, value: num(w.value) })),
  );
}

// ───────────────────────────── verifica ─────────────────────────────

/** L'albero tradotto in un'espressione del motore. */
function toExpr(n: Node): Expr {
  switch (n.k) {
    case "lit":
      return num(n.v);
    case "pow":
      return pow(num(n.base), num(n.e));
    case "negpow":
      return neg(pow(num(n.base), num(n.e)));
    case "group":
      return toExpr(n.x);
    case "gpow":
      return pow(toExpr(n.x), num(n.e));
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
  const value = simplify(toExpr(model.root));
  if (value.kind !== "num" || !value.value.isInteger()) return false;
  if (!exercise.prompt.includes(latex(model.root, true))) return false;
  return exercise.answer.kind === "number" && exercise.answer.correct.kind === "num" && exercise.answer.correct.value.eq(value.value);
}

export default defineGenerator({
  code: "V1.M02.A01.g1",
  skill: "V1.M02.A01",
  lesson: "V1.M02.L01",
  title: "Espressioni con i numeri interi",
  levels: [1, 2, 3],
  errors: [SIGNS, MINUS_PAREN, MINUS_POWER, PRECEDENCE],
  limits: { maxInteger: LIMIT, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
