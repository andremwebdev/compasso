// Regola di Ruffini e divisione tra polinomi, con i passaggi e la tabella da mostrare.

import { upolyToExpr } from "../algebra/expand";
import { upDegree, upDivMod, upoly, upSub, upMul, type UPoly } from "../algebra/upoly";
import { EngineError } from "../errors";
import { rationalToLatex, toLatex } from "../expr/latex";
import { Rational, type RationalLike } from "../numbers/rational";
import type { Step } from "./types";

export interface RuffiniResult {
  /** Il numero che annulla il divisore: si divide per (x − root). */
  readonly root: Rational;
  /** Prima riga: i coefficienti del dividendo dal grado più alto, zeri compresi. */
  readonly coefficients: readonly Rational[];
  /** Seconda riga: i prodotti, a partire dalla seconda colonna. */
  readonly products: readonly Rational[];
  /** Terza riga: le somme. Sono i coefficienti del quoziente e, per ultimo, il resto. */
  readonly sums: readonly Rational[];
  readonly quotient: UPoly;
  readonly remainder: Rational;
  readonly steps: readonly Step[];
}

/** La tabella di Ruffini in LaTeX: coefficienti, prodotti, somme; l'ultima colonna è quella del resto. */
function tableLatex(root: Rational, coefficients: readonly Rational[], products: readonly Rational[], sums: readonly Rational[]): string {
  const cells = (values: readonly string[]): string => values.join(" & ");
  const columns = `c|${"c".repeat(coefficients.length - 1)}|c`;
  const first = cells(["", ...coefficients.map((value) => rationalToLatex(value))]);
  const second = cells([rationalToLatex(root), "", ...products.map((value) => rationalToLatex(value))]);
  const third = cells(["", ...sums.map((value) => rationalToLatex(value))]);
  return `\\begin{array}{${columns}} ${first} \\\\ ${second} \\\\ \\hline ${third} \\end{array}`;
}

/** Divide il polinomio per (x − root) con la regola di Ruffini. */
export function ruffini(p: UPoly, root: RationalLike, variable = "x"): RuffiniResult {
  if (upDegree(p) < 1) throw new EngineError("Ruffini: il dividendo deve avere grado almeno 1.");
  const r = Rational.from(root);
  const coefficients = [...p].reverse();
  const products: Rational[] = [];
  const sums: Rational[] = [coefficients[0] as Rational];
  for (let index = 1; index < coefficients.length; index++) {
    const product = (sums[index - 1] as Rational).mul(r);
    products.push(product);
    sums.push((coefficients[index] as Rational).add(product));
  }
  const remainder = sums[sums.length - 1] as Rational;
  const quotient = upoly(...sums.slice(0, -1).reverse());
  const divisor = toLatex(upolyToExpr(upoly(r.neg(), 1), variable));
  const dividend = toLatex(upolyToExpr(p, variable));
  const quotientLatex = toLatex(upolyToExpr(quotient, variable));
  const steps: Step[] = [
    {
      text: `Dividi $${dividend}$ per $${divisor}$ con la regola di Ruffini: nella prima riga scrivi i coefficienti in ordine di grado (anche gli zeri), a sinistra il numero $${rationalToLatex(r)}$ che annulla il divisore.`,
    },
    {
      text: `Abbassa il primo coefficiente; poi, colonna per colonna, moltiplica per $${rationalToLatex(r)}$ l'ultimo numero scritto in basso e somma.`,
      formula: tableLatex(r, coefficients, products, sums),
    },
    remainder.isZero()
      ? { text: "L'ultima riga dà i coefficienti del quoziente; il resto è zero, quindi la divisione è esatta.", formula: `${dividend} = \\left(${divisor}\\right)\\left(${quotientLatex}\\right)` }
      : { text: `L'ultima riga dà i coefficienti del quoziente $${quotientLatex}$ e, nell'ultima colonna, il resto $${rationalToLatex(remainder)}$.`, formula: `${dividend} = \\left(${divisor}\\right)\\left(${quotientLatex}\\right) ${remainder.sign() < 0 ? "-" : "+"} ${rationalToLatex(remainder.abs())}` },
  ];
  return { root: r, coefficients, products, sums, quotient, remainder, steps };
}

/** La tabella di Ruffini di una divisione già fatta, in LaTeX. */
export function ruffiniTableToLatex(result: RuffiniResult): string {
  return tableLatex(result.root, result.coefficients, result.products, result.sums);
}

/** Un giro della divisione: un termine del quoziente, il prodotto da sottrarre, il resto parziale. */
export interface DivisionRound {
  /** Il termine trovato (un monomio). */
  readonly term: UPoly;
  /** term · divisore. */
  readonly product: UPoly;
  /** Quello che resta dopo la sottrazione. */
  readonly remainder: UPoly;
}

export interface DivisionResult {
  readonly quotient: UPoly;
  readonly remainder: UPoly;
  readonly rounds: readonly DivisionRound[];
  readonly steps: readonly Step[];
}

/** Divisione con resto tra polinomi, un termine del quoziente alla volta: A = B·Q + R con grado di R minore del grado di B. */
export function dividePolynomials(a: UPoly, b: UPoly, variable = "x"): DivisionResult {
  if (b.length === 0) throw new EngineError("Divisione per il polinomio nullo.");
  const show = (p: UPoly): string => toLatex(upolyToExpr(p, variable));
  const rounds: DivisionRound[] = [];
  const steps: Step[] = [{ text: `Dividi $${show(a)}$ per $${show(b)}$: ordina i due polinomi per grado decrescente.` }];
  let remainder = a;
  while (upDegree(remainder) >= upDegree(b)) {
    const shift = upDegree(remainder) - upDegree(b);
    const coefficient = (remainder[remainder.length - 1] as Rational).div(b[b.length - 1] as Rational);
    const term: UPoly = [...Array.from({ length: shift }, () => Rational.ZERO), coefficient];
    const product = upMul(term, b);
    const leading: UPoly = [...Array.from({ length: upDegree(remainder) }, () => Rational.ZERO), remainder[remainder.length - 1] as Rational];
    const divisorLeading: UPoly = [...Array.from({ length: upDegree(b) }, () => Rational.ZERO), b[b.length - 1] as Rational];
    remainder = upSub(remainder, product);
    rounds.push({ term, product, remainder });
    steps.push({
      text: `Dividi i termini di grado più alto: $${show(leading)} : ${show(divisorLeading)} = ${show(term)}$. Moltiplica il divisore per $${show(term)}$ e sottrai.`,
      formula: `${show(term)} \\cdot \\left(${show(b)}\\right) = ${show(product)} \\quad\\Rightarrow\\quad \\text{resto parziale: } ${show(remainder)}`,
    });
  }
  const { quotient } = upDivMod(a, b);
  steps.push({
    text: `Il resto parziale ha grado minore del divisore: la divisione è finita. Quoziente $${show(quotient)}$, resto $${show(remainder)}$.`,
    formula:
      remainder.length === 0
        ? `${show(a)} = \\left(${show(b)}\\right)\\left(${show(quotient)}\\right)`
        : `${show(a)} = \\left(${show(b)}\\right)\\left(${show(quotient)}\\right) + \\left(${show(remainder)}\\right)`,
  });
  return { quotient, remainder, rounds, steps };
}
