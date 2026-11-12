// Formula risolutiva delle equazioni di secondo grado, con i passaggi.

import { complexToExpr, surdToExpr, upolyToExpr } from "../algebra/expand";
import { upoly } from "../algebra/upoly";
import { EngineError } from "../errors";
import { rationalToLatex, toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { Rational, type RationalLike } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import type { Step } from "./types";

export interface QuadraticOptions {
  /** La lettera dell'incognita. Se manca: x. */
  readonly variable?: string;
  /** Vero per dare anche le soluzioni complesse quando il discriminante è negativo. */
  readonly complex?: boolean;
}

export interface QuadraticSolution {
  /** Δ = b² − 4ac. */
  readonly discriminant: Rational;
  /** Le soluzioni reali distinte, in ordine crescente: due, una (Δ = 0) o nessuna (Δ < 0). */
  readonly roots: readonly Expr[];
  /** Con Δ < 0 e l'opzione `complex`: le due soluzioni complesse coniugate; altrimenti vuoto. */
  readonly complexRoots: readonly Expr[];
  readonly steps: readonly Step[];
}

/** Un numero tra parentesi se è negativo, come si scrive sostituendo in una formula. */
const inFormula = (value: Rational): string => (value.sign() < 0 ? `\\left(${rationalToLatex(value)}\\right)` : rationalToLatex(value));

/** Risolve ax² + bx + c = 0 (a ≠ 0) con la formula risolutiva, registrando i passaggi. */
export function solveQuadratic(a: RationalLike, b: RationalLike, c: RationalLike, options: QuadraticOptions = {}): QuadraticSolution {
  const [ra, rb, rc] = [Rational.from(a), Rational.from(b), Rational.from(c)];
  if (ra.isZero()) throw new EngineError("solveQuadratic: il coefficiente di secondo grado non può essere zero.");
  const variable = options.variable ?? "x";
  const x = toLatex({ kind: "sym", name: variable });
  const discriminant = rb.mul(rb).sub(ra.mul(rc).mul(4));
  const steps: Step[] = [
    {
      text: `È un'equazione di secondo grado con $a = ${rationalToLatex(ra)}$, $b = ${rationalToLatex(rb)}$, $c = ${rationalToLatex(rc)}$.`,
      formula: `${toLatex(upolyToExpr(upoly(rc, rb, ra), variable))} = 0`,
    },
    {
      text: "Calcola il discriminante.",
      formula: `\\Delta = b^{2} - 4ac = ${inFormula(rb)}^{2} - 4 \\cdot ${inFormula(ra)} \\cdot ${inFormula(rc)} = ${rationalToLatex(discriminant)}`,
    },
  ];
  const twoA = ra.mul(2);
  const center = Surd.from(rb.neg().div(twoA));
  const offset = Surd.sqrt(discriminant.abs()).div(twoA.abs());
  const general = `\\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{${rationalToLatex(rb.neg())} \\pm \\sqrt{${rationalToLatex(discriminant)}}}{${rationalToLatex(twoA)}}`;

  if (discriminant.sign() > 0) {
    const roots = [surdToExpr(center.sub(offset)), surdToExpr(center.add(offset))];
    steps.push({ text: "Il discriminante è positivo: ci sono due soluzioni reali distinte.", formula: `${x}_{1,2} = ${general}` });
    steps.push({ text: "Le due soluzioni sono:", formula: `${x}_{1} = ${toLatex(roots[0] as Expr)} \\qquad ${x}_{2} = ${toLatex(roots[1] as Expr)}` });
    return { discriminant, roots, complexRoots: [], steps };
  }
  if (discriminant.isZero()) {
    const root = surdToExpr(center);
    steps.push({
      text: "Il discriminante è zero: le due soluzioni coincidono.",
      formula: `${x}_{1} = ${x}_{2} = -\\frac{b}{2a} = ${toLatex(root)}`,
    });
    return { discriminant, roots: [root], complexRoots: [], steps };
  }
  if (!options.complex) {
    steps.push({ text: "Il discriminante è negativo: l'equazione non ha soluzioni reali." });
    return { discriminant, roots: [], complexRoots: [], steps };
  }
  const complexRoots = [complexToExpr(center, offset.neg()), complexToExpr(center, offset)];
  steps.push({
    text: `Il discriminante è negativo: non ci sono soluzioni reali, ma due soluzioni complesse coniugate, perché $\\sqrt{${rationalToLatex(discriminant)}} = ${toLatex(complexToExpr(Surd.ZERO, Surd.sqrt(discriminant.abs())))}$.`,
    formula: `${x}_{1,2} = ${general}`,
  });
  steps.push({
    text: "Le due soluzioni sono:",
    formula: `${x}_{1} = ${toLatex(complexRoots[0] as Expr)} \\qquad ${x}_{2} = ${toLatex(complexRoots[1] as Expr)}`,
  });
  return { discriminant, roots: [], complexRoots, steps };
}
