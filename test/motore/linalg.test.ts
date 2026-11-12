import { describe, expect, it } from "vitest";
import { simplify } from "../../src/motore/algebra/simplify";
import { equivalent } from "../../src/motore/equivalence/equivalence";
import { EngineError } from "../../src/motore/errors";
import { add, frac, i, mul, num, sqrt, sub, sym, toLatex, type Expr } from "../../src/motore/expr";
import {
  augment, characteristicCoefficients, characteristicPolynomial, columnVector, determinant, eigenspaces, eigenvalues, eigenvectors,
  gaussElimination, identity, inverse, isDiagonalizable, isEigenpair, laplaceExpansion, matAdd, matMul, matPower, matricesEquivalent,
  matrix, matrixFromEigen, matrixSize, matrixToLatex, matScale, matSub, minorMatrix, nullSpace, rank, rowOperationToLatex,
  solveLinearSystem, trace, transpose, zeroMatrix, type Matrix, type RowOperation,
} from "../../src/motore/linalg";
import { Rng } from "../../src/motore/random/rng";
import { draws, parse } from "./helpers";

const same = (a: Matrix, b: Matrix) => expect(matricesEquivalent(a, b), `${matrixToLatex(a)} ≠ ${matrixToLatex(b)}`).toBe(true);
const latexRows = (m: Matrix) => m.rows.map((row) => row.map(toLatex));
const randomMatrix = (rng: Rng, rows: number, cols: number, max = 4): Matrix =>
  matrix(Array.from({ length: rows }, () => Array.from({ length: cols }, () => rng.int(-max, max))));
const k = sym("k");

describe("operazioni tra matrici", () => {
  const a = matrix([[1, 2], [3, 4]]);
  const b = matrix([[0, 1], [-1, frac(1, 2)]]);

  it("somma, differenza, prodotto per un numero, trasposta", () => {
    expect(latexRows(matAdd(a, b))).toEqual([["1", "3"], ["2", "\\frac{9}{2}"]]);
    expect(latexRows(matSub(a, b))).toEqual([["1", "1"], ["4", "\\frac{7}{2}"]]);
    expect(latexRows(matScale(frac(-1, 2), a))).toEqual([["-\\frac{1}{2}", "-1"], ["-\\frac{3}{2}", "-2"]]);
    expect(latexRows(transpose(matrix([[1, 2, 3], [4, 5, 6]])))).toEqual([["1", "4"], ["2", "5"], ["3", "6"]]);
    expect(latexRows(matScale(k, a))).toEqual([["k", "2k"], ["3k", "4k"]]);
    expect(() => matAdd(a, matrix([[1, 2, 3]]))).toThrow(EngineError);
  });

  it("prodotto righe per colonne: non è commutativo e ha le sue dimensioni", () => {
    expect(latexRows(matMul(a, b))).toEqual([["-2", "2"], ["-4", "5"]]);
    expect(matricesEquivalent(matMul(a, b), matMul(b, a))).toBe(false);
    const product = matMul(matrix([[1, 2, 3], [4, 5, 6]]), columnVector([1, 0, -1]));
    expect(matrixSize(product)).toEqual({ rows: 2, cols: 1 });
    expect(latexRows(product)).toEqual([["-2"], ["-2"]]);
    expect(() => matMul(a, matrix([[1, 2, 3]]))).toThrow(EngineError);
    same(matMul(a, identity(2)), a);
    same(matPower(a, 3), matMul(a, matMul(a, a)));
    same(matPower(a, 0), identity(2));
    same(matMul(a, zeroMatrix(2, 2)), zeroMatrix(2, 2));
    expect(toLatex(trace(a))).toBe("5");
  });

  it("elementi con radicali, numeri complessi e parametri restano esatti", () => {
    const r = matrix([[sqrt(2), 1], [1, sqrt(2)]]);
    expect(latexRows(matMul(r, r))).toEqual([["3", "2\\sqrt{2}"], ["2\\sqrt{2}", "3"]]);
    const c = matrix([[i, 1], [0, add(1, i)]]);
    expect(latexRows(matMul(c, c))).toEqual([["-1", "1 + 2i"], ["0", "2i"]]);
    expect(toLatex(determinant(c))).toBe("-1 + i");
    const p = matrix([[k, 1], [1, k]]);
    expect(toLatex(determinant(p))).toBe("k^{2} - 1");
    expect(latexRows(matMul(p, p))).toEqual([["k^{2} + 1", "2k"], ["2k", "k^{2} + 1"]]);
  });
});

describe("determinante, rango, inversa", () => {
  it("determinanti noti", () => {
    expect(toLatex(determinant(matrix([[5]])))).toBe("5");
    expect(toLatex(determinant(matrix([[1, 2], [3, 4]])))).toBe("-2");
    expect(toLatex(determinant(matrix([[2, 0, 1], [1, 3, -1], [0, 5, 4]])))).toBe("39");
    expect(toLatex(determinant(matrix([[frac(1, 2), frac(1, 3)], [frac(1, 4), frac(1, 5)]])))).toBe("\\frac{1}{60}");
    expect(toLatex(determinant(matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]])))).toBe("0");
    expect(toLatex(determinant(identity(4)))).toBe("1");
    expect(() => determinant(matrix([[1, 2, 3], [4, 5, 6]]))).toThrow(EngineError);
  });

  it("sviluppo di Laplace: i dati dei passaggi ridanno il determinante", () => {
    const m = matrix([[2, 0, 1], [1, 3, -1], [0, 5, 4]]);
    for (const along of [{ row: 0 }, { row: 2 }, { col: 1 }]) {
      const terms = laplaceExpansion(m, along);
      expect(terms).toHaveLength(3);
      const total = add(...terms.map((term) => mul(term.sign, term.entry, term.minorDeterminant)));
      expect(equivalent(total, determinant(m))).toBe(true);
    }
    expect(latexRows(minorMatrix(m, 0, 1))).toEqual([["1", "-1"], ["0", "4"]]);
    expect(laplaceExpansion(m, { row: 0 }).map((term) => term.sign)).toEqual([1, -1, 1]);
  });

  it("rango", () => {
    expect(rank(matrix([[1, 2], [2, 4]]))).toBe(1);
    expect(rank(matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))).toBe(2);
    expect(rank(identity(3))).toBe(3);
    expect(rank(zeroMatrix(2, 3))).toBe(0);
    expect(rank(matrix([[1, 2, 3, 4], [2, 4, 6, 8], [1, 0, 1, 0]]))).toBe(2);
    // Con un parametro vale il rango «generico»: i valori particolari li discute il generatore.
    expect(rank(matrix([[k, 1], [1, k]]))).toBe(2);
  });

  it("inversa: esatta, oppure null se non esiste", () => {
    expect(latexRows(inverse(matrix([[1, 2], [3, 4]]))!)).toEqual([["-2", "1"], ["\\frac{3}{2}", "-\\frac{1}{2}"]]);
    expect(inverse(matrix([[1, 2], [2, 4]]))).toBeNull();
    expect(() => inverse(matrix([[1, 2, 3]]))).toThrow(EngineError);
    const p = matrix([[k, 1], [1, k]]);
    same(matMul(p, inverse(p)!), identity(2));
    expect(equivalent(inverse(p)!.rows[0]![0]!, parse("k/(k^2-1)"))).toBe(true);
    const c = matrix([[add(1, i), 1], [0, i]]);
    expect(latexRows(inverse(c)!)).toEqual([["\\frac{1}{2} - \\frac{i}{2}", "\\frac{1}{2} + \\frac{i}{2}"], ["0", "-i"]]);
  });

  it("a tappeto: det(AB) = det A · det B, A·A⁻¹ = I, det(Aᵀ) = det A", () => {
    const rng = new Rng("linalg-tappeto");
    let invertible = 0;
    for (let round = 0; round < 120; round++) {
      const n = rng.int(2, 4);
      const a = randomMatrix(rng, n, n);
      const b = randomMatrix(rng, n, n);
      expect(equivalent(determinant(matMul(a, b)), mul(determinant(a), determinant(b)))).toBe(true);
      expect(equivalent(determinant(transpose(a)), determinant(a))).toBe(true);
      const inv = inverse(a);
      const singular = equivalent(determinant(a), num(0));
      expect(inv === null).toBe(singular);
      expect(rank(a) === n).toBe(!singular);
      if (inv) {
        same(matMul(a, inv), identity(n));
        same(matMul(inv, a), identity(n));
        invertible += 1;
      }
    }
    expect(invertible).toBeGreaterThan(80);
  });
});

/** Rifà un'operazione elementare in modo indipendente, per controllare la matrice registrata. */
function replay(m: Matrix, operation: RowOperation): Matrix {
  const rows = m.rows.map((row) => [...row]);
  switch (operation.kind) {
    case "swap":
      [rows[operation.first], rows[operation.second]] = [rows[operation.second]!, rows[operation.first]!];
      break;
    case "scale":
      rows[operation.row] = rows[operation.row]!.map((entry) => simplify(mul(operation.factor, entry)));
      break;
    case "combine":
      rows[operation.target] = rows[operation.target]!.map((entry, c): Expr => simplify(add(entry, mul(operation.factor, rows[operation.source]![c]!))));
      break;
  }
  return matrix(rows);
}

const isZeroEntry = (entry: Expr) => equivalent(entry, num(0));

describe("riduzione di Gauss con i passaggi", () => {
  it("un esempio svolto, operazione per operazione", () => {
    const m = matrix([[0, 2, 1], [1, 1, 1], [2, 4, 5]]);
    const result = gaussElimination(m);
    expect(result.steps.map((step) => rowOperationToLatex(step.operation))).toEqual([
      "R_{1} \\leftrightarrow R_{2}",
      "R_{3} \\to R_{3} - 2R_{1}",
      "R_{3} \\to R_{3} - R_{2}",
    ]);
    expect(latexRows(result.matrix)).toEqual([["1", "1", "1"], ["0", "2", "1"], ["0", "0", "2"]]);
    expect(result).toMatchObject({ rank: 3, swaps: 1, pivotColumns: [0, 1, 2] });
    for (const step of result.steps) draws(rowOperationToLatex(step.operation));
  });

  it("forma ridotta e scrittura dei fattori frazionari, negativi e con lettere", () => {
    const result = gaussElimination(matrix([[2, 1], [1, 3]]), { reduced: true });
    expect(result.steps.map((step) => rowOperationToLatex(step.operation))).toEqual([
      "R_{2} \\to R_{2} - \\frac{1}{2}R_{1}",
      "R_{2} \\to \\frac{2}{5}R_{2}",
      "R_{1} \\to R_{1} - R_{2}",
      "R_{1} \\to \\frac{1}{2}R_{1}",
    ]);
    same(result.matrix, identity(2));
    expect(rowOperationToLatex({ kind: "scale", row: 0, factor: num(-1) })).toBe("R_{1} \\to -R_{1}");
    expect(rowOperationToLatex({ kind: "combine", target: 1, source: 0, factor: sub(k, 1) })).toBe("R_{2} \\to R_{2} + \\left(k - 1\\right)R_{1}");
    draws(rowOperationToLatex({ kind: "combine", target: 1, source: 0, factor: sub(k, 1) }));
  });

  it("matrice completa [A | I]: le colonne di destra non danno pivot e a destra compare l'inversa", () => {
    const a = matrix([[1, 2], [3, 4]]);
    const result = gaussElimination(augment(a, identity(2)), { reduced: true, columns: 2 });
    expect(result.pivotColumns).toEqual([0, 1]);
    same(matrix(result.matrix.rows.map((row) => row.slice(2))), inverse(a)!);
    expect(() => augment(a, identity(3))).toThrow(EngineError);
  });

  it("a tappeto: ogni passaggio registrato è l'operazione applicata alla matrice precedente, e alla fine la forma è a scala", () => {
    const rng = new Rng("gauss-tappeto");
    for (let round = 0; round < 150; round++) {
      const rows = rng.int(2, 4);
      const cols = rng.int(2, 5);
      const reduced = rng.bool();
      const m = randomMatrix(rng, rows, cols, 3);
      const result = gaussElimination(m, { reduced });
      let current = m;
      for (const step of result.steps) {
        current = replay(current, step.operation);
        same(current, step.matrix);
      }
      same(current, result.matrix);
      // A scala: sotto e a sinistra di ogni pivot ci sono solo zeri; i pivot scendono verso destra.
      result.matrix.rows.forEach((row, r) => {
        const pivot = result.pivotColumns[r];
        if (pivot === undefined) {
          expect(row.every(isZeroEntry)).toBe(true);
          return;
        }
        expect(row.slice(0, pivot).every(isZeroEntry)).toBe(true);
        expect(isZeroEntry(row[pivot]!)).toBe(false);
        if (reduced) {
          expect(toLatex(row[pivot]!)).toBe("1");
          result.matrix.rows.forEach((other, index) => {
            if (index !== r) expect(isZeroEntry(other[pivot]!)).toBe(true);
          });
        }
      });
      expect([...result.pivotColumns].sort((x, y) => x - y)).toEqual(result.pivotColumns);
      expect(result.rank).toBe(rank(m));
      // Il determinante è il prodotto dei pivot, con il segno cambiato a ogni scambio.
      if (rows === cols && !reduced) {
        const diagonal = mul(result.swaps % 2 === 0 ? 1 : -1, ...result.matrix.rows.map((row, r) => row[r]!));
        expect(equivalent(diagonal, determinant(m))).toBe(true);
      }
    }
  });
});

describe("sistemi lineari e nucleo", () => {
  it("una soluzione, nessuna, infinite", () => {
    const unique = solveLinearSystem(matrix([[2, 1], [1, -1]]), columnVector([5, 1]));
    expect(unique.kind === "unique" && latexRows(unique.solution)).toEqual([["2"], ["1"]]);
    expect(solveLinearSystem(matrix([[1, 1], [2, 2]]), columnVector([1, 3]))).toEqual({ kind: "none" });
    const infinite = solveLinearSystem(matrix([[1, 1, 1], [1, 2, 3]]), columnVector([6, 14]));
    expect(infinite.kind).toBe("infinite");
    if (infinite.kind === "infinite") {
      expect(latexRows(infinite.particular)).toEqual([["-2"], ["8"], ["0"]]);
      expect(infinite.directions.map(latexRows)).toEqual([[["1"], ["-2"], ["1"]]]);
      expect(infinite.freeColumns).toEqual([2]);
    }
    expect(() => solveLinearSystem(matrix([[1, 2]]), columnVector([1, 2]))).toThrow(EngineError);
  });

  it("il nucleo ha dimensione n − rango e i suoi vettori hanno componenti intere senza fattori comuni", () => {
    expect(nullSpace(identity(3))).toEqual([]);
    expect(nullSpace(matrix([[1, 2], [2, 4]])).map(latexRows)).toEqual([[["-2"], ["1"]]]);
    expect(nullSpace(matrix([[2, 3, 0], [0, 0, 1]])).map(latexRows)).toEqual([[["-3"], ["2"], ["0"]]]);
    expect(nullSpace(zeroMatrix(1, 2))).toHaveLength(2);
  });

  it("a tappeto: le soluzioni trovate risolvono davvero il sistema", () => {
    const rng = new Rng("sistemi-tappeto");
    const kinds = { unique: 0, none: 0, infinite: 0 };
    for (let round = 0; round < 200; round++) {
      const rows = rng.int(2, 4);
      const cols = rng.int(2, 4);
      let a = randomMatrix(rng, rows, cols, 3);
      // Una riga ripetuta rende più frequenti i sistemi impossibili o indeterminati.
      if (rng.bool(0.4)) a = matrix(a.rows.map((row, r) => (r === rows - 1 ? a.rows[0]! : row)));
      const b = columnVector(Array.from({ length: rows }, () => rng.int(-4, 4)));
      const solution = solveLinearSystem(a, b);
      kinds[solution.kind] += 1;
      const consistent = rank(a) === rank(augment(a, b));
      expect(solution.kind !== "none").toBe(consistent);
      if (solution.kind === "unique") {
        same(matMul(a, solution.solution), b);
        expect(rank(a)).toBe(cols);
      }
      if (solution.kind === "infinite") {
        same(matMul(a, solution.particular), b);
        expect(solution.directions).toHaveLength(cols - rank(a));
        for (const direction of solution.directions) same(matMul(a, direction), zeroMatrix(rows, 1));
        const kernel = nullSpace(a);
        expect(kernel.map(latexRows)).toEqual(solution.directions.map(latexRows));
        expect(rank(matrix(kernel[0]!.rows.map((_, r) => kernel.map((v) => v.rows[r]![0]!))))).toBe(kernel.length);
      }
    }
    expect(Math.min(kinds.unique, kinds.none, kinds.infinite)).toBeGreaterThan(15);
  });
});

describe("autovalori e autovettori", () => {
  it("polinomio caratteristico det(A − λI)", () => {
    const m = matrix([[2, 1], [1, 2]]);
    expect(toLatex(characteristicPolynomial(m))).toBe("\\lambda^{2} - 4\\lambda + 3");
    expect(toLatex(characteristicPolynomial(m, "t"))).toBe("t^{2} - 4t + 3");
    expect(characteristicCoefficients(m).map(String)).toEqual(["3", "-4", "1"]);
    expect(toLatex(characteristicPolynomial(matrix([[1, 2, 0], [0, 3, 0], [0, 0, -1]])))).toBe("-\\lambda^{3} + 3\\lambda^{2} + \\lambda - 3");
    draws(toLatex(characteristicPolynomial(m)));
    expect(() => characteristicPolynomial(matrix([[1, 2, 3]]))).toThrow(EngineError);
  });

  it("autovalori razionali, con radicali e complessi, con la molteplicità", () => {
    const values = (m: Matrix) => eigenvalues(m).map((item) => [toLatex(item.value), item.multiplicity]);
    expect(values(matrix([[2, 1], [1, 2]]))).toEqual([["1", 1], ["3", 1]]);
    expect(values(matrix([[2, 0, 0], [0, 2, 0], [0, 0, 5]]))).toEqual([["2", 2], ["5", 1]]);
    expect(values(matrix([[1, 1], [1, 0]]))).toEqual([["\\frac{1 - \\sqrt{5}}{2}", 1], ["\\frac{1 + \\sqrt{5}}{2}", 1]]);
    expect(values(matrix([[0, -1], [1, 0]]))).toEqual([["-i", 1], ["i", 1]]);
    expect(values(matrix([[1, -2], [1, 3]]))).toEqual([["2 - i", 1], ["2 + i", 1]]);
    expect(eigenvalues(matrix([[0, -1], [1, 0]])).every((item) => !item.real)).toBe(true);
    // x³ − 2 non si scompone sui razionali: questa matrice non è costruita all'indietro.
    expect(() => eigenvalues(matrix([[0, 0, 2], [1, 0, 0], [0, 1, 0]]))).toThrow(EngineError);
    expect(() => eigenvalues(matrix([[k, 1], [1, k]]))).toThrow(EngineError);
  });

  it("autovettori: base dell'autospazio e controllo A·v = λ·v", () => {
    const m = matrix([[2, 1], [1, 2]]);
    expect(eigenvectors(m, 3).map(latexRows)).toEqual([[["1"], ["1"]]]);
    expect(eigenvectors(m, 1).map(latexRows)).toEqual([[["-1"], ["1"]]]);
    expect(eigenvectors(m, 2)).toEqual([]);
    expect(isEigenpair(m, 3, columnVector([2, 2]))).toBe(true);
    expect(isEigenpair(m, 3, columnVector([1, -1]))).toBe(false);
    // Il vettore nullo non è un autovettore, anche se A·0 = λ·0.
    expect(isEigenpair(m, 3, columnVector([0, 0]))).toBe(false);
    expect(isEigenpair(m, 3, columnVector([1, 1, 1]))).toBe(false);
    const rotation = matrix([[0, -1], [1, 0]]);
    for (const space of eigenspaces(rotation)) {
      expect(space.vectors).toHaveLength(1);
      expect(isEigenpair(rotation, space.value, space.vectors[0]!)).toBe(true);
    }
    const golden = matrix([[1, 1], [1, 0]]);
    for (const space of eigenspaces(golden)) expect(isEigenpair(golden, space.value, space.vectors[0]!)).toBe(true);
  });

  it("diagonalizzabilità", () => {
    expect(isDiagonalizable(matrix([[2, 1], [1, 2]]))).toBe(true);
    expect(isDiagonalizable(matrix([[1, 1], [0, 1]]))).toBe(false);
    expect(isDiagonalizable(matrix([[2, 0], [0, 2]]))).toBe(true);
    expect(isDiagonalizable(matrix([[0, -1], [1, 0]]))).toBe(false);
    expect(isDiagonalizable(matrix([[0, -1], [1, 0]]), "complex")).toBe(true);
  });

  it("a tappeto: matrici costruite all'indietro da autovalori e autovettori scelti", () => {
    const rng = new Rng("autovalori-tappeto");
    let built = 0;
    for (let round = 0; round < 120; round++) {
      const n = rng.int(2, 3);
      const basis = randomMatrix(rng, n, n, 2);
      if (rank(basis) < n) {
        expect(() => matrixFromEigen(basis, Array.from({ length: n }, () => 1))).toThrow(EngineError);
        continue;
      }
      const chosen = Array.from({ length: n }, () => rng.int(-3, 4));
      const a = matrixFromEigen(basis, chosen);
      built += 1;
      const expected = [...new Set(chosen)].sort((x, y) => x - y).map((value) => [String(value), chosen.filter((other) => other === value).length]);
      const spaces = eigenspaces(a);
      expect(spaces.map((space) => [toLatex(space.value), space.multiplicity])).toEqual(expected);
      for (const space of spaces) {
        expect(space.vectors).toHaveLength(space.multiplicity);
        for (const vector of space.vectors) expect(isEigenpair(a, space.value, vector)).toBe(true);
      }
      chosen.forEach((value, c) => expect(isEigenpair(a, value, columnVector(basis.rows.map((row) => row[c]!)))).toBe(true));
      expect(isDiagonalizable(a)).toBe(true);
      expect(equivalent(determinant(a), mul(...chosen))).toBe(true);
      expect(equivalent(trace(a), add(...chosen))).toBe(true);
    }
    expect(built).toBeGreaterThan(70);
  });
});
