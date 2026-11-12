// Vettori e matrici: punto di accesso.

export * from "./matrix";
export {
  determinant, identity, inverse, isSquare, laplaceExpansion, matAdd, matMul, matPower, matScale, matSub, minorMatrix, nullSpace, rank,
  solveLinearSystem, trace, transpose, zeroMatrix, type LaplaceTerm, type LinearSolution,
} from "./operations";
export { augment, gaussElimination, rowOperationToLatex, type GaussOptions, type GaussResult, type GaussStep, type RowOperation } from "./gauss";
export {
  characteristicCoefficients, characteristicPolynomial, eigenspaces, eigenvalues, eigenvectors, isDiagonalizable, isEigenpair,
  matrixFromEigen, type Eigenspace, type Eigenvalue,
} from "./eigen";
