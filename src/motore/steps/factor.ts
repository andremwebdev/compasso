// Scomposizione di un polinomio in una variabile, con i passaggi che si fanno a mano:
// raccoglimento totale, prodotti notevoli (differenza di quadrati, quadrato di binomio, somma e
// differenza di cubi), trinomio speciale, formula risolutiva, Ruffini.
// Il risultato è scomposto sui razionali, quindi rispetta il vincolo di forma «factored».

import { exprToUPoly, upolyToExpr } from "../algebra/expand";
import { upDegree, upDivMod, upFactor, upoly, upPrimitive, upRationalRoots, type UPoly } from "../algebra/upoly";
import { EngineError } from "../errors";
import { rationalToLatex, toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { absBig, iroot } from "../numbers/integers";
import { Rational } from "../numbers/rational";
import { ruffini } from "./ruffini";
import type { Step } from "./types";

/** Le tecniche di scomposizione, con il nome da mostrare. */
export const factorMethods = {
  commonFactor: "raccoglimento totale",
  differenceOfSquares: "differenza di quadrati",
  perfectSquare: "quadrato di un binomio",
  sumProduct: "trinomio speciale (somma e prodotto)",
  quadraticFormula: "formula risolutiva",
  cubes: "somma o differenza di cubi",
  ruffini: "regola di Ruffini",
  product: "prodotto di polinomi di grado più alto",
} as const;

export type FactorMethod = keyof typeof factorMethods;

export interface FactorResult {
  /** Il polinomio scomposto: costante · xᵏ · fattori irriducibili con le loro potenze. */
  readonly result: Expr;
  /** La costante raccolta davanti. */
  readonly constant: Rational;
  /** I fattori irriducibili (coefficienti interi, primo coefficiente positivo) con la molteplicità. */
  readonly factors: readonly { readonly poly: UPoly; readonly multiplicity: number }[];
  /** Le tecniche usate, nell'ordine. */
  readonly methods: readonly FactorMethod[];
  readonly steps: readonly Step[];
}

const ZERO = Rational.ZERO;
const at = (p: UPoly, index: number): Rational => p[index] ?? ZERO;
const lead = (p: UPoly): Rational => p[p.length - 1] as Rational;

/** La radice k-esima esatta di un intero positivo, oppure null. */
function exactRoot(value: bigint, k: number): bigint | null {
  if (value <= 0n) return null;
  const root = iroot(value, k);
  return root ** BigInt(k) === value ? root : null;
}

/** Il monomio c·x^k. */
const monomial = (c: Rational | bigint, k: number): UPoly => [...Array.from({ length: k }, () => ZERO), Rational.from(c)];

interface Split {
  readonly parts: readonly UPoly[];
  readonly method: FactorMethod;
  readonly text: string;
  /** Formula in più da mostrare prima dell'uguaglianza (la tabella di Ruffini). */
  readonly extra?: Step;
}

class Factorizer {
  readonly steps: Step[] = [];
  readonly methods: FactorMethod[] = [];

  constructor(private readonly variable: string) {}

  show(p: UPoly): string {
    return toLatex(upolyToExpr(p, this.variable));
  }

  private inParens(p: UPoly): string {
    return `\\left(${this.show(p)}\\right)`;
  }

  /** Un solo passo di scomposizione di un polinomio primitivo, senza fattore x; null se è irriducibile. */
  split(q: UPoly): Split | null {
    const degree = upDegree(q);
    const a = lead(q).n;
    const c = at(q, 0).n;
    const onlyTwoTerms = q.slice(1, -1).every((coefficient) => coefficient.isZero());

    // Differenza di quadrati: A² − B².
    if (onlyTwoTerms && degree % 2 === 0 && c < 0n) {
      const s = exactRoot(a, 2);
      const t = exactRoot(-c, 2);
      if (s !== null && t !== null) {
        const big = monomial(s, degree / 2);
        return {
          parts: [[Rational.of(-t), ...big.slice(1)], [Rational.of(t), ...big.slice(1)]],
          method: "differenceOfSquares",
          text: `$${this.show(q)}$ è una differenza di quadrati, $A^{2} - B^{2} = (A - B)(A + B)$, con $A = ${this.show(big)}$ e $B = ${t}$.`,
        };
      }
    }

    if (degree === 2) {
      const b = at(q, 1).n;
      const discriminant = b * b - 4n * a * c;
      if (discriminant < 0n) return null;
      const root = discriminant === 0n ? 0n : exactRoot(discriminant, 2);
      if (root === null) return null;
      if (discriminant === 0n) {
        const s = exactRoot(a, 2) as bigint;
        const t = exactRoot(c, 2) as bigint;
        const factor = upoly(Rational.of(b < 0n ? -t : t), Rational.of(s));
        return {
          parts: [factor, factor],
          method: "perfectSquare",
          text: `$${this.show(q)}$ è il quadrato di un binomio, $A^{2} ${b < 0n ? "-" : "+"} 2AB + B^{2} = (A ${b < 0n ? "-" : "+"} B)^{2}$, con $A = ${this.show(monomial(s, 1))}$ e $B = ${t}$.`,
        };
      }
      const x1 = Rational.of(-b - root, 2n * a);
      const x2 = Rational.of(-b + root, 2n * a);
      const parts = [upoly(Rational.of(-x1.n), Rational.of(x1.d)), upoly(Rational.of(-x2.n), Rational.of(x2.d))];
      if (a === 1n) {
        const [m, n] = [x1.neg(), x2.neg()];
        return {
          parts,
          method: "sumProduct",
          text: `$${this.show(q)}$ è un trinomio speciale: servono due numeri con somma $${b}$ e prodotto $${c}$. Sono $${rationalToLatex(m)}$ e $${rationalToLatex(n)}$.`,
        };
      }
      return {
        parts,
        method: "quadraticFormula",
        text: `Le radici di $${this.show(q)}$ si trovano con la formula risolutiva ($\\Delta = ${discriminant}$): sono $${rationalToLatex(x1)}$ e $${rationalToLatex(x2)}$. Si usa $a\\left(x - x_{1}\\right)\\left(x - x_{2}\\right)$.`,
      };
    }

    // Somma o differenza di cubi: A³ ± B³.
    if (onlyTwoTerms && degree % 3 === 0) {
      const s = exactRoot(a, 3);
      const t = exactRoot(absBig(c), 3);
      if (s !== null && t !== null) {
        const m = degree / 3;
        const sign = c > 0n ? 1n : -1n;
        const first: UPoly = [Rational.of(sign * t), ...monomial(s, m).slice(1)];
        const second: UPoly = Array.from({ length: 2 * m + 1 }, (_, k) =>
          k === 0 ? Rational.of(t * t) : k === m ? Rational.of(-sign * s * t) : k === 2 * m ? Rational.of(s * s) : ZERO,
        );
        const [op, opposite] = sign > 0n ? ["+", "-"] : ["-", "+"];
        return {
          parts: [first, second],
          method: "cubes",
          text: `$${this.show(q)}$ è una ${sign > 0n ? "somma" : "differenza"} di cubi, $A^{3} ${op} B^{3} = (A ${op} B)(A^{2} ${opposite} AB + B^{2})$, con $A = ${this.show(monomial(s, m))}$ e $B = ${t}$.`,
        };
      }
    }

    // Una radice razionale: Ruffini. Si preferiscono le radici intere piccole.
    const roots = upRationalRoots(q).sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0) || (absBig(x.n) < absBig(y.n) ? -1 : absBig(x.n) > absBig(y.n) ? 1 : 0) || y.sign() - x.sign());
    const root = roots[0];
    if (root) {
      const table = ruffini(q, root, this.variable);
      const factor = upoly(Rational.of(-root.n), Rational.of(root.d));
      const value = rationalToLatex(root);
      return {
        parts: [factor, upDivMod(q, factor).quotient],
        method: "ruffini",
        text: `Cerca una radice tra i divisori del termine noto${a === 1n ? "" : " (divisi per i divisori del primo coefficiente)"}: $${this.show(q)}$ si annulla per $${toLatex({ kind: "sym", name: this.variable })} = ${value}$, quindi è divisibile per $${this.show(upoly(root.neg(), 1))}$. Dividi con la regola di Ruffini.`,
        extra: table.steps[1] as Step,
      };
    }

    // Nessuna radice razionale: può ancora essere il prodotto di polinomi di grado più alto.
    const pieces = upFactor(q).factors.flatMap(({ poly, multiplicity }) => Array.from({ length: multiplicity }, () => poly));
    if (pieces.length > 1) {
      return {
        parts: pieces,
        method: "product",
        text: `$${this.show(q)}$ non ha radici razionali, ma si scrive come prodotto di polinomi di grado più alto.`,
      };
    }
    return null;
  }

  /** Scompone fino in fondo un polinomio primitivo senza fattore x. */
  factorCompletely(start: UPoly): UPoly[] {
    const done: UPoly[] = [];
    const queue: UPoly[] = [start];
    while (queue.length > 0) {
      const q = queue.shift() as UPoly;
      if (upDegree(q) < 1) continue;
      const split = upDegree(q) === 1 ? null : this.split(q);
      if (!split) {
        done.push(q);
        continue;
      }
      this.methods.push(split.method);
      this.steps.push({ text: split.text });
      if (split.extra?.formula) this.steps.push({ text: split.extra.text, formula: split.extra.formula });
      this.steps.push({ text: "Quindi:", formula: `${this.show(q)} = ${split.parts.map((part) => this.inParens(part)).join("")}` });
      queue.unshift(...split.parts);
    }
    return done;
  }
}

/** Ordine di scrittura dei fattori: per grado; quelli di primo grado per radice crescente, gli altri per coefficienti. */
function compareFactors(a: UPoly, b: UPoly): number {
  if (a.length !== b.length) return a.length - b.length;
  if (a.length === 2) {
    const byRoot = at(a, 0).neg().div(at(a, 1)).cmp(at(b, 0).neg().div(at(b, 1)));
    if (byRoot !== 0) return byRoot;
  }
  for (let k = a.length - 1; k >= 0; k--) {
    const order = at(a, k).cmp(at(b, k));
    if (order !== 0) return order;
  }
  return 0;
}

/**
 * Scompone un polinomio in una variabile a coefficienti razionali, con i passaggi.
 * Accetta un polinomio (UPoly) oppure un'espressione che sia un polinomio nella variabile data.
 */
export function factorPolynomial(input: UPoly | Expr, variable = "x"): FactorResult {
  const p = Array.isArray(input) ? (input as UPoly) : exprToUPoly(input as Expr, variable);
  if (!p) throw new EngineError("factorPolynomial: serve un polinomio in una variabile a coefficienti razionali.");
  if (p.length === 0) throw new EngineError("factorPolynomial: il polinomio nullo non si scompone.");
  const worker = new Factorizer(variable);
  const { content, primitive } = upPrimitive(p);
  let power = 0;
  while (at(primitive, power).isZero()) power += 1;
  const rest = primitive.slice(power);

  if ((!content.eq(1) || power > 0) && upDegree(rest) >= 1) {
    const collected = monomial(content, power);
    worker.methods.push("commonFactor");
    worker.steps.push({
      text: content.eq(-1) && power === 0 ? "Raccogli il segno meno, così il primo coefficiente diventa positivo." : `Raccogli a fattor comune $${worker.show(collected)}$.`,
      formula: `${worker.show(p)} = ${content.eq(-1) && power === 0 ? "-" : worker.show(collected)}\\left(${worker.show(rest)}\\right)`,
    });
  }

  const pieces = worker.factorCompletely(rest).sort(compareFactors);
  const factors: { poly: UPoly; multiplicity: number }[] = [];
  for (const piece of pieces) {
    const last = factors[factors.length - 1];
    if (last && compareFactors(last.poly, piece) === 0) last.multiplicity += 1;
    else factors.push({ poly: piece, multiplicity: 1 });
  }
  if (power > 0) factors.unshift({ poly: upoly(0, 1), multiplicity: power });

  const numberExpr = (value: Rational): Expr => ({ kind: "num", value });
  const parts: Expr[] = factors.map(({ poly, multiplicity }) => {
    const base = upolyToExpr(poly, variable);
    return multiplicity === 1 ? base : { kind: "pow", base, exp: numberExpr(Rational.of(multiplicity)) };
  });
  const magnitude = content.abs();
  if (!magnitude.eq(1) || parts.length === 0) parts.unshift(numberExpr(magnitude));
  const body: Expr = parts.length === 1 ? (parts[0] as Expr) : { kind: "mul", factors: parts };
  const result: Expr = content.sign() < 0 ? (body.kind === "num" ? numberExpr(content) : { kind: "neg", arg: body }) : body;

  if (worker.steps.length === 0) {
    worker.steps.push({ text: `$${worker.show(p)}$ non si può scomporre: è già irriducibile sui razionali.` });
  } else {
    worker.steps.push({ text: "Nessun fattore si può scomporre ancora: la scomposizione è completa.", formula: `${worker.show(p)} = ${toLatex(result)}` });
  }
  return { result, constant: content, factors, methods: worker.methods, steps: worker.steps };
}
