import { describe, expect, it } from "vitest";
import { exprToUPoly, upolyToExpr } from "../../src/motore/algebra/expand";
import { upAdd, upDegree, upDivMod, upEval, upGcd, upLcm, upMul, upoly, upPow, upScale, type UPoly } from "../../src/motore/algebra/upoly";
import { equivalent } from "../../src/motore/equivalence/equivalence";
import { EngineError } from "../../src/motore/errors";
import { add, mul, sym, toLatex, evaluateComplex, evaluate } from "../../src/motore/expr";
import { checkForm } from "../../src/motore/form";
import { Rational } from "../../src/motore/numbers/rational";
import { Rng } from "../../src/motore/random/rng";
import {
  dividePolynomials, factorMethods, factorPolynomial, ruffini, ruffiniTableToLatex, solveQuadratic, stepText, type Step,
} from "../../src/motore/steps";
import { draws, drawsText, parse } from "./helpers";

const drawsSteps = (steps: readonly Step[]) => {
  expect(steps.length).toBeGreaterThan(0);
  for (const step of steps) {
    expect(step.text.trim()).not.toBe("");
    drawsText(step.text);
    if (step.formula !== undefined) draws(step.formula);
    drawsText(stepText(step));
  }
};
const show = (p: UPoly) => toLatex(upolyToExpr(p));

describe("formula risolutiva", () => {
  it("due soluzioni razionali", () => {
    const solution = solveQuadratic(2, -3, 1);
    expect(solution.discriminant.toString()).toBe("1");
    expect(solution.roots.map(toLatex)).toEqual(["\\frac{1}{2}", "1"]);
    expect(solution.steps.map((step) => step.formula)).toEqual([
      "2x^{2} - 3x + 1 = 0",
      "\\Delta = b^{2} - 4ac = \\left(-3\\right)^{2} - 4 \\cdot 2 \\cdot 1 = 1",
      "x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{3 \\pm \\sqrt{1}}{4}",
      "x_{1} = \\frac{1}{2} \\qquad x_{2} = 1",
    ]);
    drawsSteps(solution.steps);
  });

  it("soluzioni con radicali, coincidenti, nessuna, complesse", () => {
    expect(solveQuadratic(1, -2, -1).roots.map(toLatex)).toEqual(["1 - \\sqrt{2}", "1 + \\sqrt{2}"]);
    expect(solveQuadratic(1, 1, -1).roots.map(toLatex)).toEqual(["\\frac{-1 - \\sqrt{5}}{2}", "\\frac{-1 + \\sqrt{5}}{2}"]);
    // Con a negativo le soluzioni restano in ordine crescente.
    expect(solveQuadratic(-1, 0, 4).roots.map(toLatex)).toEqual(["-2", "2"]);
    const double = solveQuadratic(1, -6, 9);
    expect(double.roots.map(toLatex)).toEqual(["3"]);
    expect(double.steps.at(-1)?.text).toContain("coincidono");
    const none = solveQuadratic(1, 2, 5);
    expect([none.roots, none.complexRoots]).toEqual([[], []]);
    expect(none.steps.at(-1)?.text).toContain("non ha soluzioni reali");
    const complex = solveQuadratic(1, 2, 5, { complex: true });
    expect(complex.roots).toEqual([]);
    expect(complex.complexRoots.map(toLatex)).toEqual(["-1 - 2i", "-1 + 2i"]);
    expect(solveQuadratic(1, 0, 3, { complex: true }).complexRoots.map(toLatex)).toEqual(["-\\sqrt{3}i", "\\sqrt{3}i"]);
    expect(toLatex(solveQuadratic(1, -1, -6, { variable: "t" }).roots[0]!)).toBe("-2");
    expect(solveQuadratic(1, -1, -6, { variable: "t" }).steps[0]?.formula).toBe("t^{2} - t - 6 = 0");
    for (const solution of [double, none, complex, solveQuadratic(Rational.of(1, 2), -3, Rational.of(5, 2))]) drawsSteps(solution.steps);
    expect(() => solveQuadratic(0, 1, 1)).toThrow(EngineError);
  });

  it("a tappeto: le soluzioni trovate annullano il trinomio", () => {
    const rng = new Rng("quadratica-tappeto");
    const counts = [0, 0, 0];
    for (let round = 0; round < 300; round++) {
      const [a, b, c] = [rng.intExcept(-5, 5), rng.int(-9, 9), rng.int(-9, 9)];
      const solution = solveQuadratic(a, b, c, { complex: true });
      counts[solution.roots.length] = (counts[solution.roots.length] ?? 0) + 1;
      expect(solution.roots.length).toBe(Math.sign(b * b - 4 * a * c) + 1);
      const x = sym("x");
      const trinomial = add(mul(a, x, x), mul(b, x), c);
      for (const root of solution.roots) expect(Math.abs(evaluate(trinomial, { x: evaluate(root) }))).toBeLessThan(1e-9);
      if (solution.roots.length === 2) expect(evaluate(solution.roots[0]!)).toBeLessThan(evaluate(solution.roots[1]!));
      for (const root of solution.complexRoots) {
        const z = evaluateComplex(root);
        const value = { re: a * (z.re * z.re - z.im * z.im) + b * z.re + c, im: a * 2 * z.re * z.im + b * z.im };
        expect(Math.hypot(value.re, value.im)).toBeLessThan(1e-9);
      }
      expect(solution.complexRoots.length).toBe(solution.roots.length === 0 ? 2 : 0);
      drawsSteps(solution.steps);
    }
    expect(Math.min(...counts)).toBeGreaterThan(3);
  });
});

describe("regola di Ruffini e divisione tra polinomi", () => {
  it("un esempio svolto con la sua tabella", () => {
    const result = ruffini(upoly(-6, 11, -6, 1), 2);
    expect(result.coefficients.map(String)).toEqual(["1", "-6", "11", "-6"]);
    expect(result.products.map(String)).toEqual(["2", "-8", "6"]);
    expect(result.sums.map(String)).toEqual(["1", "-4", "3", "0"]);
    expect(show(result.quotient)).toBe("x^{2} - 4x + 3");
    expect(result.remainder.isZero()).toBe(true);
    expect(ruffiniTableToLatex(result)).toBe(
      "\\begin{array}{c|ccc|c}  & 1 & -6 & 11 & -6 \\\\ 2 &  & 2 & -8 & 6 \\\\ \\hline  & 1 & -4 & 3 & 0 \\end{array}",
    );
    expect(result.steps.at(-1)?.formula).toBe("x^{3} - 6x^{2} + 11x - 6 = \\left(x - 2\\right)\\left(x^{2} - 4x + 3\\right)");
    drawsSteps(result.steps);
  });

  it("zeri tra i coefficienti, resto non nullo, numero frazionario", () => {
    const result = ruffini(upoly(1, 0, 0, 2), -1);
    expect(result.coefficients.map(String)).toEqual(["2", "0", "0", "1"]);
    expect([show(result.quotient), result.remainder.toString()]).toEqual(["2x^{2} - 2x + 2", "-1"]);
    expect(result.steps.at(-1)?.formula).toBe("2x^{3} + 1 = \\left(x + 1\\right)\\left(2x^{2} - 2x + 2\\right) - 1");
    const half = ruffini(upoly(-1, 1, 2), Rational.of(1, 2));
    expect([show(half.quotient), half.remainder.toString()]).toEqual(["2x + 2", "0"]);
    drawsSteps(result.steps);
    drawsSteps(half.steps);
    expect(() => ruffini(upoly(5), 1)).toThrow(EngineError);
  });

  it("divisione con resto, un termine del quoziente alla volta", () => {
    const result = dividePolynomials(upoly(1, 0, -3, 2), upoly(-1, 1, 1));
    expect([show(result.quotient), show(result.remainder)]).toEqual(["2x - 5", "7x - 4"]);
    expect(result.rounds.map((round) => [show(round.term), show(round.product), show(round.remainder)])).toEqual([
      ["2x", "2x^{3} + 2x^{2} - 2x", "-5x^{2} + 2x + 1"],
      ["-5", "-5x^{2} - 5x + 5", "7x - 4"],
    ]);
    drawsSteps(result.steps);
    const exact = dividePolynomials(upoly(-1, 0, 1), upoly(1, 1));
    expect([show(exact.quotient), show(exact.remainder)]).toEqual(["x - 1", "0"]);
    expect(exact.steps.at(-1)?.formula).toBe("x^{2} - 1 = \\left(x + 1\\right)\\left(x - 1\\right)");
    const short = dividePolynomials(upoly(1, 1), upoly(0, 0, 1));
    expect([show(short.quotient), show(short.remainder), short.rounds.length]).toEqual(["0", "x + 1", 0]);
    expect(() => dividePolynomials(upoly(1, 1), [])).toThrow(EngineError);
  });

  it("a tappeto: Ruffini e la divisione tornano indietro (A = B·Q + R) e il resto è P(r)", () => {
    const rng = new Rng("ruffini-tappeto");
    const random = (degree: number): UPoly => upoly(...Array.from({ length: degree }, () => rng.int(-5, 5)), rng.intExcept(-4, 4));
    for (let round = 0; round < 200; round++) {
      const p = random(rng.int(1, 5));
      const root = Rational.of(rng.int(-4, 4), rng.int(1, 3));
      const result = ruffini(p, root);
      expect(upAdd(upMul(result.quotient, upoly(root.neg(), 1)), upoly(result.remainder))).toEqual(p);
      expect(result.remainder.eq(upEval(p, root))).toBe(true);
      const divisor = random(rng.int(1, 3));
      const division = dividePolynomials(p, divisor);
      expect(upAdd(upMul(division.quotient, divisor), division.remainder)).toEqual(p);
      expect(upDegree(division.remainder)).toBeLessThan(upDegree(divisor));
      expect(division.quotient).toEqual(upDivMod(p, divisor).quotient);
      drawsSteps(result.steps);
      drawsSteps(division.steps);
    }
  });

  it("MCD e mcm di polinomi", () => {
    const a = upMul(upoly(-1, 1), upoly(2, 1));
    const b = upMul(upoly(-1, 1), upoly(-3, 1));
    expect(show(upGcd(a, b))).toBe("x - 1");
    expect(show(upLcm(a, b))).toBe("x^{3} - 2x^{2} - 5x + 6");
    expect(upMul(upGcd(a, b), upLcm(a, b))).toEqual(upMul(a, b));
    expect(show(upLcm(upScale(a, 3), upoly(2, 1)))).toBe("x^{2} + x - 2");
    expect(upLcm(a, [])).toEqual([]);
  });
});

describe("scomposizione con i passaggi", () => {
  // I fattori di primo grado sono scritti in ordine di radice crescente: (x + 3)(x − 3), (x − 2)(x − 3).
  it.each([
    ["x^2-9", "\\left(x + 3\\right)\\left(x - 3\\right)", ["differenceOfSquares"]],
    ["2x^3-8x", "2x\\left(x + 2\\right)\\left(x - 2\\right)", ["commonFactor", "differenceOfSquares"]],
    ["x^2+6x+9", "\\left(x + 3\\right)^{2}", ["perfectSquare"]],
    ["4x^2-12x+9", "\\left(2x - 3\\right)^{2}", ["perfectSquare"]],
    ["x^2-5x+6", "\\left(x - 2\\right)\\left(x - 3\\right)", ["sumProduct"]],
    ["6x^2-x-2", "\\left(2x + 1\\right)\\left(3x - 2\\right)", ["quadraticFormula"]],
    ["x^3-8", "\\left(x - 2\\right)\\left(x^{2} + 2x + 4\\right)", ["cubes"]],
    ["8x^3+27", "\\left(2x + 3\\right)\\left(4x^{2} - 6x + 9\\right)", ["cubes"]],
    ["x^3-6x^2+11x-6", "\\left(x - 1\\right)\\left(x - 2\\right)\\left(x - 3\\right)", ["ruffini", "sumProduct"]],
    ["x^4-16", "\\left(x + 2\\right)\\left(x - 2\\right)\\left(x^{2} + 4\\right)", ["differenceOfSquares", "differenceOfSquares"]],
    ["x^4+x^2+1", "\\left(x^{2} - x + 1\\right)\\left(x^{2} + x + 1\\right)", ["product"]],
    ["-x^2+4", "-\\left(x + 2\\right)\\left(x - 2\\right)", ["commonFactor", "differenceOfSquares"]],
    ["x^2/2-2", "\\frac{1}{2}\\left(x + 2\\right)\\left(x - 2\\right)", ["commonFactor", "differenceOfSquares"]],
    ["3x+6", "3\\left(x + 2\\right)", ["commonFactor"]],
    ["x^3+x", "x\\left(x^{2} + 1\\right)", ["commonFactor"]],
    ["x^4-2x^3+x^2", "x^{2}\\left(x - 1\\right)^{2}", ["commonFactor", "perfectSquare"]],
    ["x^2+1", "x^{2} + 1", []],
    ["x^2-2", "x^{2} - 2", []],
    ["x^3", "x^{3}", []],
    ["5", "5", []],
    ["-3", "-3", []],
  ])("%s = %s", (text, latex, methods) => {
    const outcome = factorPolynomial(parse(text));
    expect(toLatex(outcome.result)).toBe(latex);
    expect(outcome.methods).toEqual(methods);
    expect(equivalent(outcome.result, parse(text))).toBe(true);
    expect(checkForm(outcome.result, "factored")).toEqual({ ok: true });
    drawsSteps(outcome.steps);
    for (const method of outcome.methods) expect(factorMethods[method]).toBeTruthy();
  });

  it("i passaggi raccontano la strada, con la tabella di Ruffini", () => {
    const { steps } = factorPolynomial(parse("2x^3-3x^2-3x+2"));
    expect(steps.map((step) => step.formula)).toEqual([
      undefined,
      "\\begin{array}{c|ccc|c}  & 2 & -3 & -3 & 2 \\\\ -1 &  & -2 & 5 & -2 \\\\ \\hline  & 2 & -5 & 2 & 0 \\end{array}",
      "2x^{3} - 3x^{2} - 3x + 2 = \\left(x + 1\\right)\\left(2x^{2} - 5x + 2\\right)",
      undefined,
      "2x^{2} - 5x + 2 = \\left(2x - 1\\right)\\left(x - 2\\right)",
      "2x^{3} - 3x^{2} - 3x + 2 = \\left(x + 1\\right)\\left(2x - 1\\right)\\left(x - 2\\right)",
    ]);
    expect(steps[0]?.text).toContain("si annulla per $x = -1$");
    expect(factorPolynomial(parse("x^2+1")).steps[0]?.text).toContain("irriducibile");
    expect(factorPolynomial(parse("t^2-4"), "t").steps[0]?.text).toContain("$t^{2} - 4$");
  });

  it("accetta polinomi già in forma di coefficienti e rifiuta ciò che non è un polinomio", () => {
    expect(toLatex(factorPolynomial(upoly(-1, 0, 1)).result)).toBe("\\left(x + 1\\right)\\left(x - 1\\right)");
    expect(() => factorPolynomial(parse("1/x"))).toThrow(EngineError);
    expect(() => factorPolynomial(parse("x*y"))).toThrow(EngineError);
    expect(() => factorPolynomial([])).toThrow(EngineError);
  });

  it("a tappeto: polinomi costruiti all'indietro tornano scomposti, equivalenti e nella forma «factored»", () => {
    const rng = new Rng("scomposizione-tappeto");
    const irreducible = [upoly(1, 0, 1), upoly(1, 1, 1), upoly(-2, 0, 1), upoly(2, 0, 1)];
    for (let round = 0; round < 250; round++) {
      let p: UPoly = upoly(rng.pick([1, 1, 1, -1, 2, 3, Rational.of(1, 2)]));
      const built: UPoly[] = [];
      for (let k = rng.int(1, 4); k > 0; k--) {
        const factor = rng.bool(0.8) ? upoly(rng.int(-5, 5), rng.pick([1, 1, 1, 2, 3])) : rng.pick(irreducible);
        built.push(factor);
        p = upMul(p, factor);
      }
      if (rng.bool(0.2)) p = upMul(p, upPow(upoly(0, 1), rng.int(1, 2)));
      const outcome = factorPolynomial(p);
      expect(exprToUPoly(outcome.result)).toEqual(p);
      expect(checkForm(outcome.result, "factored"), toLatex(outcome.result)).toEqual({ ok: true });
      // Tanti fattori (con la molteplicità) quanti ne sono stati messi, più le potenze di x.
      const linear = (factor: UPoly) => upDegree(factor) === 1 && factor[0]!.isZero();
      const expected = built.filter((factor) => !linear(factor)).length;
      const found = outcome.factors.filter(({ poly }) => !linear(poly)).reduce((sum, { multiplicity }) => sum + multiplicity, 0);
      expect(found).toBe(expected);
      drawsSteps(outcome.steps);
    }
  });
});

describe("revisione 4a: passaggi con coefficienti frazionari", () => {
  it("nel discriminante una frazione elevata al quadrato sta tra parentesi", () => {
    const solution = solveQuadratic(1, Rational.of(1, 2), Rational.of(-1, 2));
    expect(solution.steps[1]?.formula).toBe(
      "\\Delta = b^{2} - 4ac = \\left(\\frac{1}{2}\\right)^{2} - 4 \\cdot 1 \\cdot \\left(-\\frac{1}{2}\\right) = \\frac{9}{4}",
    );
    expect(solution.roots.map(toLatex)).toEqual(["-1", "\\frac{1}{2}"]);
    drawsSteps(solution.steps);
  });
});
