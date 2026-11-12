// Autovalori e autovettori per le matrici costruite all'indietro dai generatori (specifica,
// sezione 6): il polinomio caratteristico si scompone sui razionali, quindi gli autovalori sono
// razionali oppure radici di un fattore di secondo grado (reali con radicale, o complessi coniugati).

import { complexToExpr, ratioToExpr, surdToExpr } from "../algebra/expand";
import { normalize } from "../algebra/normalize";
import { NormalContext, Poly, Ratio } from "../algebra/poly";
import { toUnivariate } from "../algebra/specialize";
import { upDegree, upFactor, type UPoly } from "../algebra/upoly";
import { EngineError } from "../errors";
import { toExpr, type ExprLike } from "../expr/build";
import { evaluate } from "../expr/evaluate";
import type { Expr } from "../expr/types";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import { gridDeterminant, identity, inverse, matMul, matScale, matSub, nullSpace } from "./operations";
import { toGrid } from "./grid";
import { matricesEquivalent, matrix, matrixSize, type Matrix } from "./matrix";

/** Il polinomio caratteristico det(A − λI) nella forma normale, con λ come lettera. */
function characteristic(m: Matrix, variable: string, ctx: NormalContext): Poly {
  if (matrixSize(m).rows !== matrixSize(m).cols) throw new EngineError("Il polinomio caratteristico esiste solo per le matrici quadrate.");
  const lambda = normalize({ kind: "sym", name: variable }, ctx);
  const cells = toGrid(m, ctx).map((row, r) => row.map((cell, c) => (r === c ? cell.sub(lambda, ctx) : cell)));
  const result = gridDeterminant(cells, ctx);
  const constant = result.den.constant();
  if (!constant) throw new EngineError("Polinomio caratteristico: gli elementi della matrice non sono polinomi.");
  return result.num.scale(constant.inv());
}

/** Il polinomio caratteristico det(A − λI), sviluppato. */
export function characteristicPolynomial(m: Matrix, variable = "lambda"): Expr {
  const ctx = new NormalContext();
  return ratioToExpr(Ratio.fromPoly(characteristic(m, variable, ctx)), ctx);
}

/** I coefficienti del polinomio caratteristico (dal grado 0), per una matrice di numeri razionali. */
export function characteristicCoefficients(m: Matrix): UPoly {
  const ctx = new NormalContext();
  const variable = "lambda";
  const poly = characteristic(m, variable, ctx);
  const coefficients = [...poly.atomKeys()].every((key) => key === variable) ? toUnivariate(poly, ctx) : null;
  if (!coefficients) throw new EngineError("Gli autovalori si calcolano solo per matrici di numeri razionali.");
  return coefficients;
}

export interface Eigenvalue {
  readonly value: Expr;
  /** Molteplicità algebrica: quante volte è radice del polinomio caratteristico. */
  readonly multiplicity: number;
  /** Falso per gli autovalori complessi non reali. */
  readonly real: boolean;
}

/**
 * Gli autovalori di una matrice di numeri razionali, con la molteplicità algebrica: prima i reali in
 * ordine crescente, poi i complessi. Lancia EngineError se il polinomio caratteristico ha un fattore
 * irriducibile di grado maggiore di 2 (la matrice non è stata costruita all'indietro).
 */
export function eigenvalues(m: Matrix): Eigenvalue[] {
  const result: Eigenvalue[] = [];
  for (const { poly, multiplicity } of upFactor(characteristicCoefficients(m)).factors) {
    const degree = upDegree(poly);
    if (degree === 1) {
      const root = (poly[0] as Rational).neg().div(poly[1] as Rational);
      result.push({ value: surdToExpr(Surd.from(root)), multiplicity, real: true });
    } else if (degree === 2) {
      const [c, b, a] = poly as [Rational, Rational, Rational];
      const discriminant = b.mul(b).sub(a.mul(c).mul(4));
      const center = Surd.from(b.neg().div(a.mul(2)));
      const offset = Surd.sqrt(discriminant.abs()).div(a.mul(2).abs());
      if (discriminant.sign() > 0) {
        result.push({ value: surdToExpr(center.sub(offset)), multiplicity, real: true });
        result.push({ value: surdToExpr(center.add(offset)), multiplicity, real: true });
      } else {
        result.push({ value: complexToExpr(center, offset.neg()), multiplicity, real: false });
        result.push({ value: complexToExpr(center, offset), multiplicity, real: false });
      }
    } else {
      throw new EngineError("Il polinomio caratteristico non si scompone in fattori di primo e secondo grado.");
    }
  }
  const reals = result.filter((item) => item.real).sort((x, y) => evaluate(x.value) - evaluate(y.value));
  return [...reals, ...result.filter((item) => !item.real)];
}

/** Una base dell'autospazio di λ: le soluzioni non nulle di (A − λI)·v = 0. Lista vuota se λ non è un autovalore. */
export function eigenvectors(m: Matrix, value: ExprLike): Matrix[] {
  const n = matrixSize(m).rows;
  return nullSpace(matSub(m, matScale(value, identity(n))));
}

const isNonZeroVector = (v: Matrix): boolean => !matricesEquivalent(v, { kind: "matrix", rows: v.rows.map((row) => row.map(() => toExpr(0))) });

/** Vero se v è un autovettore di A relativo a λ: v non è il vettore nullo e A·v = λ·v. */
export function isEigenpair(m: Matrix, value: ExprLike, vector: Matrix): boolean {
  const { rows, cols } = matrixSize(vector);
  if (cols !== 1 || rows !== matrixSize(m).cols) return false;
  return isNonZeroVector(vector) && matricesEquivalent(matMul(m, vector), matScale(value, vector));
}

export interface Eigenspace extends Eigenvalue {
  /** Base dell'autospazio. */
  readonly vectors: readonly Matrix[];
}

/** Autovalori con una base di ciascun autospazio. La molteplicità geometrica è il numero di vettori. */
export function eigenspaces(m: Matrix): Eigenspace[] {
  return eigenvalues(m).map((item) => ({ ...item, vectors: eigenvectors(m, item.value) }));
}

/**
 * Vero se la matrice è diagonalizzabile: per ogni autovalore la molteplicità geometrica è uguale a
 * quella algebrica. Sui reali, in più, tutti gli autovalori devono essere reali.
 */
export function isDiagonalizable(m: Matrix, field: "real" | "complex" = "real"): boolean {
  const spaces = eigenspaces(m);
  if (field === "real" && spaces.some((space) => !space.real)) return false;
  return spaces.every((space) => space.vectors.length === space.multiplicity);
}

/**
 * Costruisce all'indietro una matrice con autovalori e autovettori scelti: A = P·D·P⁻¹, dove le
 * colonne di P sono gli autovettori e D ha gli autovalori sulla diagonale.
 */
export function matrixFromEigen(basis: Matrix, values: readonly ExprLike[]): Matrix {
  const n = matrixSize(basis).rows;
  const inverseBasis = matrixSize(basis).cols === n ? inverse(basis) : null;
  if (!inverseBasis || values.length !== n) throw new EngineError("Servono n autovalori e una matrice invertibile di autovettori.");
  const diagonal = matrix(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? (values[r] as ExprLike) : 0))));
  return matMul(matMul(basis, diagonal), inverseBasis);
}

