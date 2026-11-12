import { describe, expect, it } from "vitest";
import { derivativeRules, derive, deriveTimes, deriveWithSteps, isAntiderivative } from "../../src/motore/calculus/derive";
import { equivalent } from "../../src/motore/equivalence/equivalence";
import { EngineError } from "../../src/motore/errors";
import { evaluate, toLatex } from "../../src/motore/expr";
import { Rng } from "../../src/motore/random/rng";
import { draws, parse, randomExpr } from "./helpers";

describe("derivata simbolica", () => {
  it.each([
    ["5", "0"],
    ["x", "1"],
    ["x^3", "3x^{2}"],
    ["3x^2-5x+7", "6x - 5"],
    ["1/x", "-\\frac{1}{x^{2}}"],
    ["sqrt(x)", "\\frac{1}{2\\sqrt{x}}"],
    ["e^x", "e^{x}"],
    ["2^x", "2^{x} \\ln 2"],
    ["ln x", "\\frac{1}{x}"],
    ["log_2 x", "\\frac{1}{x \\ln 2}"],
    ["sin x", "\\cos x"],
    ["cos x", "-\\sin x"],
    ["tan x", "\\frac{1}{\\cos^{2} x}"],
    ["arctan x", "\\frac{1}{1 + x^{2}}"],
    ["|x|", "\\frac{x}{\\left|x\\right|}"],
  ])("regole di base: D[%s] = %s", (text, latex) => {
    expect(toLatex(derive(parse(text)))).toBe(latex);
  });

  it.each([
    ["x*sin x", "\\sin x + x \\cos x"],
    ["x^2*e^x", "2xe^{x} + x^{2}e^{x}"],
    ["x*x*x", "3x^{2}"],
    ["(x+1)/(x-1)", "-\\frac{2}{\\left(x - 1\\right)^{2}}"],
    ["sin(x^2)", "2x \\cos x^{2}"],
    ["e^(2x)", "2e^{2x}"],
    ["ln(x^2+1)", "\\frac{2x}{x^{2} + 1}"],
    ["(x^2+1)^5", "10x\\left(x^{2} + 1\\right)^{4}"],
    ["arctan(3x)", "\\frac{3}{1 + 9x^{2}}"],
    ["x^x", "x^{x}\\left(\\ln x + 1\\right)"],
  ])("prodotto, quoziente e composizione: D[%s] = %s", (text, latex) => {
    expect(toLatex(derive(parse(text)))).toBe(latex);
  });

  it.each([
    ["sin(x)^2+cos(x)^2", "0"],
    ["ln(x)/x", "(1-ln x)/x^2"],
    ["cot x", "-1/sin(x)^2"],
    ["arcsin x", "1/sqrt(1-x^2)"],
    ["arccos x", "-1/sqrt(1-x^2)"],
    ["root(3; x)", "1/(3 root(3; x)^2)"],
    ["log_x 2", "-ln 2/(x ln(x)^2)"],
    ["x*e^x*sin x", "e^x sin x + x e^x sin x + x e^x cos x"],
    ["sqrt(x^2+1)", "x/sqrt(x^2+1)"],
    ["e^(-x^2)", "-2x e^(-x^2)"],
  ])("equivalente al risultato del libro: D[%s] = %s", (text, expected) => {
    expect(equivalent(derive(parse(text)), parse(expected))).toBe(true);
  });

  it("deriva rispetto alla variabile indicata; le altre lettere sono costanti", () => {
    expect(toLatex(derive(parse("a*x^2+b*x+c")))).toBe("2ax + b");
    expect(toLatex(derive(parse("a*x^2+b*x+c"), "a"))).toBe("x^{2}");
    expect(toLatex(derive(parse("x^2*y^3"), "y"))).toBe("3x^{2}y^{2}");
    expect(toLatex(deriveTimes(parse("x^4"), 3))).toBe("24x");
  });

  it("registra le regole usate, dalla più esterna", () => {
    const { result, steps } = deriveWithSteps(parse("x^2*sin(3x)"));
    expect(equivalent(result, parse("2x sin(3x) + 3x^2 cos(3x)"))).toBe(true);
    expect(steps.map((step) => step.rule)).toEqual(["product", "power", "chain", "constantMultiple"]);
    expect(toLatex(steps[2]!.expr)).toBe("\\sin 3x");
    expect(toLatex(steps[2]!.derivative)).toBe("3 \\cos 3x");
    for (const step of steps) {
      expect(derivativeRules[step.rule]).toBeTruthy();
      draws(toLatex(step.derivative));
    }
    expect(deriveWithSteps(parse("(x+1)/(x-1)")).steps[0]?.rule).toBe("quotient");
    expect(deriveWithSteps(parse("7")).steps).toEqual([]);
  });

  it("verifica le primitive derivandole: la costante di integrazione non conta", () => {
    expect(isAntiderivative(parse("x^3/3 + 7"), parse("x^2"))).toBe(true);
    expect(isAntiderivative(parse("-cos x"), parse("sin x"))).toBe(true);
    expect(isAntiderivative(parse("x ln x - x"), parse("ln x"))).toBe(true);
    expect(isAntiderivative(parse("ln|x|"), parse("1/x"))).toBe(true);
    expect(isAntiderivative(parse("sin(x)^2/2"), parse("sin x cos x"))).toBe(true);
    expect(isAntiderivative(parse("x^3"), parse("x^2"))).toBe(false);
    expect(isAntiderivative(parse("cos x"), parse("sin x"))).toBe(false);
  });

  it("a tappeto: la derivata coincide con il rapporto incrementale", () => {
    const rng = new Rng("derive-tappeto");
    let checked = 0;
    for (let k = 0; k < 500; k++) {
      const expr = randomExpr(rng, rng.int(1, 3));
      let derivative;
      try {
        derivative = derive(expr);
      } catch (error) {
        expect(error).toBeInstanceOf(EngineError);
        continue;
      }
      draws(toLatex(derivative));
      for (let attempt = 0; attempt < 6; attempt++) {
        const x = rng.real(-3, 3);
        const h = 1e-5;
        const values = [-2, -1, 1, 2].map((step) => evaluate(expr, { x: x + step * h }));
        const exact = evaluate(derivative, { x });
        if (values.some(Number.isNaN) || Number.isNaN(exact)) continue;
        const [a, b, c, d] = values as [number, number, number, number];
        // Differenza centrale di ordine 4.
        const numeric = (a - 8 * b + 8 * c - d) / (12 * h);
        const scale = Math.max(1, Math.abs(exact), ...values.map(Math.abs));
        // Vicino a un punto dove la funzione esplode o ha uno spigolo il rapporto incrementale non è affidabile.
        if (scale > 1e4 || Math.abs(evaluate(expr, { x: x + 50 * h }) - evaluate(expr, { x: x - 50 * h })) > 0.5 * scale) continue;
        expect(Math.abs(numeric - exact) / scale, `D[${toLatex(expr)}] = ${toLatex(derivative)} in x = ${x}`).toBeLessThan(1e-4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
