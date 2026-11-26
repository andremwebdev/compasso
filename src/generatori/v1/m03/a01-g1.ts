// V1.M03.A01.g1 — Espressioni con interi e parentesi: precedenze, «da sinistra a destra», tre livelli di
// parentesi e linea di frazione.
//
// Risposta: un numero intero. All'indietro: l'espressione è un albero di operazioni con numeri piccoli,
// costruito in modo che ogni divisione venga intera (il dividendo nasce come multiplo del divisore, il
// numeratore di una frazione come multiplo del denominatore). Le risposte sbagliate si ottengono
// rifacendo il conto con UN errore tipico fatto in un punto preciso dell'albero:
// - CALC.PRECEDENZA: a ± b · c fatto come (a ± b) · c; a : b · c fatto come a : (b · c); a − b + c fatto
//   come a − (b + c); la linea di frazione ignorata, \dfrac{a + b}{c + d} letto come a + b : c + d;
// - CALC.MENO_PARENTESI: a − (b − c) fatto come a − b − c (cambia segno solo il primo termine), oppure
//   il meno davanti a una parentesi dimenticato;
// - CALC.MENO_POTENZA: −a² calcolato come (−a)², oppure (a − b)² con a < b calcolato come −(b − a)²;
// - CALC.REGOLA_SEGNI: segno sbagliato di un prodotto, di un quoziente o di una somma di segni diversi.
// I candidati uguali alla risposta giusta o tra loro si scartano; se ne restano troppo pochi si estrae di nuovo.
//
// Livello 1: tre operazioni, una parentesi tonda o una frazione: a − b : c · d, a − (b − c) + d,
//   a − b · (c − d)², \dfrac{a + b}{c − d}.
// Livello 2: due livelli di parentesi (tonde dentro quadre), frazioni con potenze al numeratore,
//   divisioni e moltiplicazioni in fila.
// Livello 3: tre livelli di parentesi (graffe, quadre, tonde), con potenze e un meno davanti a una
//   parentesi, come nell'esempio svolto della lezione.
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

type Bracket = "round" | "square" | "brace";

/** Un nodo dell'espressione. */
type Node =
  | { readonly k: "lit"; readonly v: number }
  | { readonly k: "add" | "sub" | "mul" | "div"; readonly a: Node; readonly b: Node }
  /** (base)^e con base intera (tra parentesi se negativa). */
  | { readonly k: "pow"; readonly base: number; readonly e: number }
  /** −a^e con a > 0: la potenza riguarda solo a. Solo in testa a una somma. */
  | { readonly k: "negpow"; readonly base: number; readonly e: number }
  /** Una parentesi scritta. */
  | { readonly k: "group"; readonly x: Node; readonly br: Bracket }
  /** (gruppo)^e: potenza di una parentesi tonda. */
  | { readonly k: "gpow"; readonly x: Node; readonly e: number }
  /** −(gruppo): meno davanti a una parentesi. */
  | { readonly k: "negg"; readonly x: Node }
  /** Frazione con la linea: numeratore e denominatore. */
  | { readonly k: "frac"; readonly n: Node; readonly d: Node };

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
const group = (x: Node, br: Bracket = "round"): Node => ({ k: "group", x, br });

// ───────────────────────────── conti ─────────────────────────────

/** I figli di un nodo, nell'ordine della visita. */
function children(n: Node): Node[] {
  switch (n.k) {
    case "lit":
    case "pow":
    case "negpow":
      return [];
    case "add":
    case "sub":
    case "mul":
    case "div":
      return [n.a, n.b];
    case "group":
    case "gpow":
    case "negg":
      return [n.x];
    case "frac":
      return [n.n, n.d];
  }
}

/** Quanti nodi ha il sottoalbero. */
const size = (n: Node): number => 1 + children(n).reduce((s, c) => s + size(c), 0);

/** Quoziente intero esatto, oppure null. */
const idiv = (a: number, b: number): number | null => (b !== 0 && a % b === 0 ? a / b : null);

/** Il valore senza errori (null se una divisione non viene intera). */
const value = (n: Node): number | null => evaluate(n);

/** Gli addendi della somma più esterna, con il loro segno. */
function additiveTerms(root: Node): ["+" | "-", Node][] {
  if (root.k === "add" || root.k === "sub") return [...additiveTerms(root.a), [root.k === "add" ? "+" : "-", root.b]];
  return [["+", root]];
}

/** I fattori di una catena di prodotti e quozienti, con l'operazione davanti (la prima è «·»). */
function factorChain(root: Node): ["mul" | "div", Node][] {
  if (root.k === "mul" || root.k === "div") return [...factorChain(root.a), [root.k, root.b]];
  return [["mul", root]];
}

/** Applica una catena di prodotti e quozienti da sinistra a destra, a partire da `start`. */
function applyChain(start: number, rest: readonly ["mul" | "div", number][]): number | null {
  let acc: number | null = start;
  for (const [op, v] of rest) {
    if (acc === null) return null;
    acc = op === "mul" ? acc * v : idiv(acc, v);
  }
  return acc;
}

/**
 * Il valore dell'espressione, con l'errore `fault` fatto nel nodo indicato (se c'è). Restituisce null
 * se l'errore in quel nodo non si può fare o se un quoziente non viene intero.
 */
function evaluate(root: Node, fault?: Fault): number | null {
  let index = -1;
  let used = false;
  const skip = (n: Node): void => {
    index += size(n) - 1;
  };
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
      case "negg": {
        const inner = go(n.x);
        if (inner === null) return null;
        if (here && fault.code === MINUS_PAREN && inner !== 0) {
          used = true;
          return inner;
        }
        return -inner;
      }
      case "gpow": {
        const inner = go(n.x);
        if (inner === null) return null;
        if (here && fault.code === MINUS_POWER && inner < 0 && n.e % 2 === 0) {
          used = true;
          return -(inner ** n.e);
        }
        return inner ** n.e;
      }
      case "frac": {
        // Linea di frazione ignorata: \dfrac{n1 ± n2}{d1 ± d2} letto come n1 ± n2 : d1 ± d2.
        if (here && fault.code === PRECEDENCE && (n.n.k === "add" || n.n.k === "sub") && (n.d.k === "add" || n.d.k === "sub")) {
          skip(n);
          const [n1, n2, d1, d2] = [value(n.n.a), value(n.n.b), value(n.d.a), value(n.d.b)];
          if (n1 === null || n2 === null || d1 === null || d2 === null) return null;
          const middle = idiv(n2, d1);
          if (middle === null) return null;
          used = true;
          return (n.n.k === "add" ? n1 + middle : n1 - middle) + (n.d.k === "add" ? d2 : -d2);
        }
        const top = go(n.n);
        const bottom = go(n.d);
        if (top === null || bottom === null) return null;
        const q = idiv(top, bottom);
        if (q !== null && here && fault.code === SIGNS && (top < 0 || bottom < 0) && q !== 0) {
          used = true;
          return -q;
        }
        return q;
      }
      case "add":
      case "sub": {
        if (here && fault.code === PRECEDENCE) {
          // a ± b·c (oppure b:c, anche in fila) fatto come (a ± b)·c…
          if (n.b.k === "mul" || n.b.k === "div") {
            skip(n);
            const a = value(n.a);
            const chain = factorChain(n.b).map(([op, f]) => [op, value(f)] as const);
            if (a === null || chain.some(([, v]) => v === null)) return null;
            const first = chain[0]?.[1] ?? 0;
            const rest = chain.slice(1).map(([op, v]) => [op, v ?? 0] as ["mul" | "div", number]);
            used = true;
            return applyChain(n.k === "add" ? a + (first ?? 0) : a - (first ?? 0), rest);
          }
          // …oppure a − b ± c fatto come a − (b ± c).
          if (n.a.k === "sub") {
            skip(n);
            const [a, b, c] = [value(n.a.a), value(n.a.b), value(n.b)];
            if (a === null || b === null || c === null) return null;
            used = true;
            return a - (n.k === "add" ? b + c : b - c);
          }
        }
        // a − (b ± c) fatto come a − b ± c: cambia segno solo il primo termine della parentesi.
        if (here && fault.code === MINUS_PAREN && n.k === "sub" && n.b.k === "group" && (n.b.x.k === "add" || n.b.x.k === "sub")) {
          skip(n);
          const terms = additiveTerms(n.b.x).map(([s, t]) => [s, value(t)] as const);
          const a = value(n.a);
          if (a === null || terms.some(([, v]) => v === null)) return null;
          used = true;
          return terms.reduce((acc, [s, v], i) => (i === 0 ? acc - (s === "+" ? v ?? 0 : -(v ?? 0)) : s === "+" ? acc + (v ?? 0) : acc - (v ?? 0)), a);
        }
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        const right = n.k === "add" ? a + b : a - b;
        const second = n.k === "add" ? b : -b;
        if (here && fault.code === SIGNS && a !== 0 && second !== 0 && Math.sign(a) !== Math.sign(second) && right !== 0) {
          used = true;
          return -right;
        }
        return right;
      }
      case "mul":
      case "div": {
        // a : b · c fatto come a : (b · c).
        if (here && fault.code === PRECEDENCE && n.k === "mul" && n.a.k === "div") {
          skip(n);
          const [a, b, c] = [value(n.a.a), value(n.a.b), value(n.b)];
          if (a === null || b === null || c === null) return null;
          used = true;
          return idiv(a, b * c);
        }
        const a = go(n.a);
        const b = go(n.b);
        if (a === null || b === null) return null;
        const right = n.k === "mul" ? a * b : idiv(a, b);
        if (right === null) return null;
        if (here && fault.code === SIGNS && (a < 0 || b < 0) && right !== 0) {
          used = true;
          return -right;
        }
        return right;
      }
    }
  };
  const result = go(root);
  if (fault !== undefined && !used) return null;
  return result;
}

const LIMIT = 300;

/** Tutti gli errori possibili, un giro per codice, al più quattro. */
function keptWrong(model: Model): { error: ErrorCode; value: number }[] {
  const correct = evaluate(model.root);
  const count = size(model.root);
  const byCode = new Map<ErrorCode, { error: ErrorCode; value: number }[]>();
  const seen: number[] = [];
  for (const code of [PRECEDENCE, MINUS_PAREN, MINUS_POWER, SIGNS] as const) {
    for (let at = 0; at < count; at++) {
      const v = evaluate(model.root, { at, code });
      if (v === null || v === correct || Math.abs(v) > LIMIT || seen.includes(v)) continue;
      seen.push(v);
      byCode.set(code, [...(byCode.get(code) ?? []), { error: code, value: v }]);
    }
  }
  const ordered: { error: ErrorCode; value: number }[] = [];
  for (let round = 0; ordered.length < seen.length; round++) {
    for (const list of byCode.values()) {
      const item = list[round];
      if (item) ordered.push(item);
    }
  }
  return ordered.slice(0, 4);
}

// ───────────────────────────── costruzione ─────────────────────────────

const small = (rng: Rng_, max = 9): number => rng.int(2, max);
const signed = (rng: Rng_, max = 9): number => rng.int(2, max) * rng.sign();

/** a − b con valore negativo dato, scritto con due numeri positivi: (a − b) con a < b. */
function negativeDifference(rng: Rng_, target: number): Node {
  const a = rng.int(1, 9);
  return bin("sub", lit(a), lit(a - target));
}

/** Una differenza (b − c) qualsiasi, con numeri da 1 a 12. */
function difference(rng: Rng_): Node {
  return bin("sub", lit(rng.int(1, 12)), lit(rng.int(1, 12)));
}

function buildLevel1(rng: Rng_): Node {
  const form = rng.pick(["divMul", "divMul", "subGroup", "subGroup", "powGroup", "fraction", "fraction"] as const);
  switch (form) {
    case "divMul": {
      // d − a : b · c, con a multiplo di b · c (così anche l'errore a : (b · c) dà un intero).
      const b = small(rng, 6);
      const c = small(rng, 5);
      const a = b * c * rng.int(1, 4);
      return bin("sub", lit(signed(rng, 20)), bin("mul", bin("div", lit(a), lit(b)), lit(c)));
    }
    case "subGroup":
      // a − (b − c) + d
      return bin("add", bin("sub", lit(signed(rng, 15)), group(bin("sub", lit(small(rng, 12)), lit(small(rng, 12))))), lit(small(rng, 12)));
    case "powGroup":
      // d − c · (a − b)²
      return bin("sub", lit(signed(rng, 30)), bin("mul", lit(small(rng, 5)), { k: "gpow", x: group(negativeDifference(rng, -rng.int(1, 4))), e: 2 }));
    case "fraction": {
      // \dfrac{a + b}{c − d}: b multiplo di c, numeratore multiplo del denominatore.
      for (;;) {
        const c = small(rng, 6);
        const den = rng.intExcept(-5, 5, [0, 1, -1]);
        const d = c - den;
        if (d < 1) continue;
        const b = c * rng.int(1, 6);
        const q = signed(rng, 6);
        const a = q * den - b;
        if (Math.abs(a) > 40 || a === 0) continue;
        return { k: "frac", n: bin("add", lit(a), lit(b)), d: bin("sub", lit(c), lit(d)) };
      }
    }
  }
}

function buildLevel2(rng: Rng_): Node {
  const form = rng.pick(["squareDiv", "squareDiv", "fractionSquare", "chainPower", "subSquare"] as const);
  switch (form) {
    case "squareDiv": {
      // [a − (b − c) · d] : e − f, con la quadra multipla di e.
      const e = small(rng, 5);
      const inner = difference(rng);
      const d = signed(rng, 5);
      const target = signed(rng, 8) * e;
      const a = target + (value(inner) ?? 0) * d;
      return bin("sub", bin("div", group(bin("sub", lit(a), bin("mul", group(inner), lit(d))), "square"), lit(e)), lit(signed(rng, 12)));
    }
    case "fractionSquare": {
      // \dfrac{−a² + b}{(−1)^n − c} − [d − (e − f)]
      const n = rng.pick([2, 3] as const);
      const c = small(rng, 6);
      const den = (n === 2 ? 1 : -1) - c;
      const base = rng.int(2, 4);
      const q = signed(rng, 5);
      const b = q * den + base ** 2;
      return bin(
        "sub",
        { k: "frac", n: bin("add", { k: "negpow", base, e: 2 }, lit(b)), d: bin("sub", { k: "pow", base: -1, e: n }, lit(c)) },
        group(bin("sub", lit(small(rng, 12)), group(difference(rng))), "square"),
      );
    }
    case "chainPower": {
      // a : b · c − (d − e)²
      const b = small(rng, 6);
      const c = small(rng, 4);
      const a = b * c * signed(rng, 4);
      return bin("sub", bin("mul", bin("div", lit(a), lit(b)), lit(c)), { k: "gpow", x: group(negativeDifference(rng, -rng.int(1, 5))), e: 2 });
    }
    case "subSquare": {
      // a − [b + c · (d − e)] : f, con la quadra multipla di f.
      const f = small(rng, 5);
      const inner = difference(rng);
      const c = small(rng, 6);
      const target = signed(rng, 7) * f;
      const b = target - c * (value(inner) ?? 0);
      return bin("sub", lit(signed(rng, 20)), bin("div", group(bin("add", lit(b), bin("mul", lit(c), group(inner))), "square"), lit(f)));
    }
  }
}

function buildLevel3(rng: Rng_): Node {
  const form = rng.pick(["braceProduct", "braceProduct", "minusBrace", "braceFraction"] as const);
  switch (form) {
    case "braceProduct": {
      // {a − [b^3 − c · (d − e)] : f} · g
      const f = small(rng, 4);
      const base = rng.int(2, 3);
      const inner = difference(rng);
      if (value(inner) === 0) return buildLevel3(rng);
      const target = signed(rng, 6) * f;
      // b^3 − c·(d − e) = target: c scelto, d − e scelto, serve b^3 − target = c·(d − e).
      const c = (base ** 3 - target) / (value(inner) ?? 1);
      if (!Number.isInteger(c) || c === 0) return buildLevel3(rng);
      return bin(
        "mul",
        group(bin("sub", lit(signed(rng, 15)), bin("div", group(bin("sub", { k: "pow", base, e: 3 }, bin("mul", lit(c), group(inner))), "square"), lit(f))), "brace"),
        lit(signed(rng, 5)),
      );
    }
    case "minusBrace":
      // −{a − [b − (c − d) · e]} + f : g · h
      return bin(
        "add",
        { k: "negg", x: group(bin("sub", lit(signed(rng, 12)), group(bin("sub", lit(small(rng, 12)), bin("mul", group(difference(rng)), lit(signed(rng, 4)))), "square")), "brace") },
        (() => {
          const g = small(rng, 5);
          const h = small(rng, 4);
          return bin("mul", bin("div", lit(g * h * signed(rng, 3)), lit(g)), lit(h));
        })(),
      );
    case "braceFraction": {
      // \dfrac{a + b}{c − d} − {e − [(f − g)² − h]}
      const c = small(rng, 6);
      const den = rng.intExcept(-4, 4, [0, 1, -1]);
      const d = c - den;
      if (d < 1) return buildLevel3(rng);
      const b = c * rng.int(1, 5);
      const a = signed(rng, 5) * den - b;
      return bin(
        "sub",
        { k: "frac", n: bin("add", lit(a), lit(b)), d: bin("sub", lit(c), lit(d)) },
        group(bin("sub", lit(signed(rng, 12)), group(bin("sub", { k: "gpow", x: group(negativeDifference(rng, -rng.int(1, 4))), e: 2 }, lit(small(rng, 12))), "square")), "brace"),
      );
    }
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const root = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const model: Model = { root };
    const v = evaluate(root);
    if (v === null || Math.abs(v) > LIMIT || !allIntermediateFine(root)) continue;
    if (keptWrong(model).length >= (level === 1 ? 2 : 3)) return model;
  }
}

/** Ogni pezzo ha un valore intero e non troppo grande (e nessun numero scritto supera 99). */
function allIntermediateFine(n: Node): boolean {
  const v = value(n);
  if (v === null || Math.abs(v) > LIMIT) return false;
  if (n.k === "lit" && (Math.abs(n.v) > 99 || n.v === 0)) return false;
  if (n.k === "group" && v === 0) return false;
  return children(n).every(allIntermediateFine);
}

// ───────────────────────────── testo ─────────────────────────────

const minus = (v: number): string => (v < 0 ? `-${-v}` : String(v));
const wrapped = (v: number, lead: boolean): string => (v < 0 && !lead ? `\\left(${minus(v)}\\right)` : minus(v));

const OPEN: Record<Bracket, string> = { round: "\\left(", square: "\\left[", brace: "\\left\\{" };
const CLOSE: Record<Bracket, string> = { round: "\\right)", square: "\\right]", brace: "\\right\\}" };
const NAME: Record<Bracket, string> = { round: "la tonda", square: "la quadra", brace: "la graffa" };

/** LaTeX del nodo; `lead` è vero se il nodo è il primo di una parentesi, di una frazione o dell'espressione. */
function latex(n: Node, lead: boolean): string {
  switch (n.k) {
    case "lit":
      return wrapped(n.v, lead);
    case "pow":
      return n.base < 0 ? `\\left(${minus(n.base)}\\right)^{${n.e}}` : `${n.base}^{${n.e}}`;
    case "negpow":
      return `-${n.base}^{${n.e}}`;
    case "group":
      return `${OPEN[n.br]}${latex(n.x, true)}${CLOSE[n.br]}`;
    case "gpow":
      return `${latex(n.x, lead)}^{${n.e}}`;
    case "negg":
      return `-${latex(n.x, false)}`;
    case "frac":
      return `\\dfrac{${latex(n.n, true)}}{${latex(n.d, true)}}`;
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

const parity = (base: number, e: number): string => (base < 0 ? (e % 2 === 0 ? ": esponente pari, risultato positivo" : ": esponente dispari, risultato negativo") : "");

/**
 * La catena della somma più esterna di un nodo, con i valori dei pezzi già calcolati, da sinistra a
 * destra: «7 − (−3) + 2 = 7 + 3 + 2 = 12». Null se il nodo non è una somma.
 */
function sumChain(n: Node): string | null {
  const terms = additiveTerms(n);
  if (terms.length < 2) return null;
  const values = terms.map(([sign, t]) => [sign, value(t) ?? 0] as const);
  const written = values.map(([sign, v], i) => (i === 0 ? minus(v) : `${sign} ${wrapped(v, false)}`)).join(" ");
  const plain = values
    .map(([sign, v], i) => {
      const eff = sign === "-" ? -v : v;
      return i === 0 ? minus(v) : eff < 0 ? `- ${-eff}` : `+ ${eff}`;
    })
    .join(" ");
  const result = minus(value(n) ?? 0);
  return written === plain ? `${written} = ${result}` : `${written} = ${plain} = ${result}`;
}

/** La catena di prodotti e quozienti, da sinistra a destra: «24 : 4 · 2 = 6 · 2 = 12». */
function productChain(n: Node): string {
  const chain = factorChain(n).map(([op, f]) => [op, value(f) ?? 0] as const);
  const parts: string[] = [];
  let acc = chain[0]?.[1] ?? 0;
  let rest = chain.slice(1);
  const show = (start: number, items: typeof rest): string => [wrapped(start, true), ...items.map(([op, v]) => `${op === "mul" ? "\\cdot" : ":"} ${wrapped(v, false)}`)].join(" ");
  parts.push(show(acc, rest));
  while (rest.length > 0) {
    const [op, v] = rest[0] ?? ["mul", 1];
    acc = op === "mul" ? acc * v : acc / v;
    rest = rest.slice(1);
    parts.push(show(acc, rest));
  }
  return parts.join(" = ");
}

function signNote(n: Node): string {
  const chain = factorChain(n).map(([, f]) => value(f) ?? 0);
  const negatives = chain.filter((v) => v < 0).length;
  if (negatives === 0) return "";
  if (chain.length === 2) return negatives === 2 ? " (segni uguali, risultato positivo)" : " (segni diversi, risultato negativo)";
  return negatives % 2 === 0 ? " (numero pari di fattori negativi: risultato positivo)" : " (numero dispari di fattori negativi: risultato negativo)";
}

/** I passaggi: dalla parentesi più interna verso l'esterno; in ogni parte potenze, prodotti, somme. */
function stepsOf(root: Node): string[] {
  const steps: string[] = [];
  const explain = (n: Node, where: string | null): void => {
    switch (n.k) {
      case "lit":
        return;
      case "pow":
        steps.push(`La potenza: $${latex(n, true)} = ${minus(n.base ** n.e)}$${parity(n.base, n.e)}.`);
        return;
      case "negpow":
        steps.push(`La potenza riguarda solo il $${n.base}$: $${latex(n, true)} = -\\left(${n.base}^{${n.e}}\\right) = ${minus(-(n.base ** n.e))}$.`);
        return;
      case "group": {
        explain(n.x, NAME[n.br]);
        const chain = sumChain(n.x);
        if (chain !== null) steps.push(`Dentro ${NAME[n.br]}: $${chain}$.`);
        return;
      }
      case "negg": {
        explain(n.x, null);
        const inner = value(n.x) ?? 0;
        steps.push(`Il meno davanti alla parentesi cambia il segno del suo risultato: $-\\left(${minus(inner)}\\right) = ${minus(-inner)}$.`);
        return;
      }
      case "gpow": {
        explain(n.x, null);
        const inner = value(n.x) ?? 0;
        steps.push(`La potenza della parentesi: $\\left(${minus(inner)}\\right)^{${n.e}} = ${minus(inner ** n.e)}$${parity(inner, n.e)}.`);
        return;
      }
      case "frac": {
        explain(n.n, null);
        explain(n.d, null);
        const top = value(n.n) ?? 0;
        const bottom = value(n.d) ?? 0;
        const topChain = sumChain(n.n);
        const bottomChain = sumChain(n.d);
        steps.push(
          `La linea di frazione fa da parentesi. Numeratore: $${topChain ?? minus(top)}$. Denominatore: $${bottomChain ?? minus(bottom)}$. ` +
            `La frazione vale $${wrapped(top, true)} : ${wrapped(bottom, false)} = ${minus(top / bottom)}$.`,
        );
        return;
      }
      case "mul":
      case "div": {
        for (const [, f] of factorChain(n)) explain(f, where);
        steps.push(`${factorChain(n).length > 2 ? "Prodotti e quozienti, da sinistra a destra" : n.k === "mul" ? "Il prodotto" : "Il quoziente"}: $${productChain(n)}$${signNote(n)}.`);
        return;
      }
      case "add":
      case "sub":
        for (const [, t] of additiveTerms(n)) explain(t, where);
        return;
    }
  };
  explain(root, null);
  const chain = sumChain(root);
  if (chain !== null) steps.push(`Restano addizioni e sottrazioni, da sinistra a destra: $${chain}$.`);
  return steps;
}

function draftOf(model: Model): ExerciseDraft {
  const correct = evaluate(model.root) ?? 0;
  return {
    prompt: `Calcola il valore dell'espressione $${latex(model.root, true)}$. Rispondi con un numero intero.`,
    answer: {
      kind: "number",
      correct: num(correct),
      wrong: distinctWrongExpressions(
        num(correct),
        keptWrong(model).map((w) => ({ error: w.error, value: num(w.value) })),
      ),
      mode: exact,
    },
    steps: stepsOf(model.root).map((text, i) => ({ text: `**Passo ${i + 1}.** ${text}` })),
    hints: [
      "Comincia dalla parentesi più interna; la linea di frazione fa da parentesi al numeratore e al denominatore.",
      "In ogni parte: prima le potenze, poi moltiplicazioni e divisioni da sinistra a destra, infine addizioni e sottrazioni da sinistra a destra.",
    ],
  };
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
    case "negg":
      return neg(toExpr(n.x));
    case "gpow":
      return pow(toExpr(n.x), num(n.e));
    case "frac":
      return div(toExpr(n.n), toExpr(n.d));
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
  if (v.kind !== "num" || !v.value.isInteger()) return false;
  if (!exercise.prompt.includes(latex(model.root, true))) return false;
  return exercise.answer.kind === "number" && exercise.answer.correct.kind === "num" && exercise.answer.correct.value.eq(v.value);
}

export default defineGenerator({
  code: "V1.M03.A01.g1",
  skill: "V1.M03.A01",
  lesson: "V1.M03.L01",
  title: "Espressioni con interi e parentesi",
  levels: [1, 2, 3],
  errors: [PRECEDENCE, MINUS_PAREN, MINUS_POWER, SIGNS],
  limits: { maxInteger: LIMIT, maxDenominator: 1 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
