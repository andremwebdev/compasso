import { describe, expect, it } from "vitest";
import { expand, exprToUPoly, surdToExpr, upolyToExpr } from "../../src/motore/algebra/expand";
import { simplify } from "../../src/motore/algebra/simplify";
import { upoly } from "../../src/motore/algebra/upoly";
import { compare, equivalent } from "../../src/motore/equivalence/equivalence";
import { EngineError } from "../../src/motore/errors";
import { add, div, evaluate, mul, num, pow, sameStructure, sym, toLatex } from "../../src/motore/expr";
import { checkForm } from "../../src/motore/form";
import { Rational } from "../../src/motore/numbers/rational";
import { Surd } from "../../src/motore/numbers/surd";
import { Rng } from "../../src/motore/random/rng";
import { clone, draws, parse, randomExpr } from "./helpers";

const clean = (text: string, complex = false): string => toLatex(simplify(parse(text, { complex })));

describe("simplify: pulizia per mostrare", () => {
  it.each([
    ["1x+0", "x"],
    ["0*x+5", "5"],
    ["2*3x", "6x"],
    ["x*x", "x^{2}"],
    ["x*x*x^2", "x^{4}"],
    ["x^2/x", "x"],
    ["(x^2)^3", "x^{6}"],
    ["(2x)^2", "4x^{2}"],
    ["x^1", "x"],
    ["x^0", "1"],
    ["x^(-1)", "\\frac{1}{x}"],
    ["-(-x)", "x"],
    ["x-(y-z)", "x - y + z"],
    ["x+(-3)", "x - 3"],
    ["-3(x+1)", "-3\\left(x + 1\\right)"],
    ["(-x)(-y)", "xy"],
  ])("coefficienti, segni e potenze: %s → %s", (text, latex) => {
    expect(clean(text)).toBe(latex);
  });

  it.each([
    ["6/4", "\\frac{3}{2}"],
    ["6x/4", "\\frac{3x}{2}"],
    ["x/2+x/2", "x"],
    ["2/(x*3)", "\\frac{2}{3x}"],
    ["x/(-2)", "-\\frac{x}{2}"],
    ["(x/y)/z", "\\frac{x}{yz}"],
    ["x/(y/z)", "\\frac{xz}{y}"],
    ["3*(x/4)", "\\frac{3x}{4}"],
    ["(x+1)/(x+1)", "1"],
    ["x(x+1)/(x+1)", "x"],
  ])("frazioni: %s → %s", (text, latex) => {
    expect(clean(text)).toBe(latex);
  });

  it.each([
    ["sqrt(8)", "2\\sqrt{2}"],
    ["sqrt(8)+sqrt(2)", "3\\sqrt{2}"],
    ["sqrt(4)", "2"],
    ["sqrt(1/2)", "\\frac{\\sqrt{2}}{2}"],
    ["1/sqrt(2)", "\\frac{\\sqrt{2}}{2}"],
    ["sqrt(12)/2", "\\sqrt{3}"],
    ["sqrt(2)*sqrt(2)", "2"],
    ["sqrt(2)*sqrt(3)", "\\sqrt{2}\\sqrt{3}"],
    ["(sqrt 2)^3", "2\\sqrt{2}"],
    ["root(3; 54)", "3\\sqrt[3]{2}"],
    ["root(3; -8)", "-2"],
    ["root(6; 8)", "\\sqrt{2}"],
    ["8^(2/3)", "4"],
    ["sqrt(x)*sqrt(x)", "x"],
    ["x*sqrt(3)*2", "2\\sqrt{3}x"],
  ])("radicali in forma normale: %s → %s", (text, latex) => {
    expect(clean(text)).toBe(latex);
  });

  it.each([
    ["2x+3x", "5x"],
    ["x^2+2x-x^2", "2x"],
    ["3xy-yx", "2xy"],
    ["x+1-x-1", "0"],
    ["2sin x + sin x", "3 \\sin x"],
    ["pi/6+2pi", "\\frac{13\\pi}{6}"],
  ])("termini simili: %s → %s", (text, latex) => {
    expect(clean(text)).toBe(latex);
  });

  it.each([
    ["sin(0)", "0"], ["cos(0)", "1"], ["ln(1)", "0"], ["ln(e)", "1"], ["log_2(2)", "1"], ["log_3(1)", "0"],
    ["ln(e^2)", "2"], ["ln(1/e)", "-1"], ["ln(2e)", "\\ln 2e"],
    ["sin(-x)", "-\\sin x"], ["cos(-x)", "\\cos x"], ["|-x|", "\\left|x\\right|"], ["|-3|", "3"],
    ["e^x*e^x", "e^{2x}"], ["sin x * x * 3", "3x \\sin x"], ["2pi*x*3", "6\\pi x"],
  ])("funzioni e ordine dei fattori: %s → %s", (text, latex) => {
    expect(clean(text)).toBe(latex);
  });

  it.each([["i^2", "-1"], ["i^3", "-i"], ["i^4", "1"], ["1/i", "-i"], ["2i*3i", "-6"], ["i*i*i*i*i", "i"]])(
    "potenze dell'unità immaginaria: %s → %s",
    (text, latex) => {
      expect(clean(text, true)).toBe(latex);
    },
  );

  it("non sviluppa i prodotti e non tocca ciò che è già pulito", () => {
    expect(clean("(x+1)(x-1)")).toBe("\\left(x + 1\\right)\\left(x - 1\\right)");
    expect(clean("2x^2-3x+1")).toBe("2x^{2} - 3x + 1");
  });

  it("una divisione per zero scritta in chiaro è un errore del motore", () => {
    expect(() => simplify(div(sym("x"), num(0)))).toThrow(EngineError);
    expect(() => simplify(pow(num(0), -1))).toThrow(EngineError);
  });

  it("a tappeto: il risultato è equivalente, stabile e si disegna", () => {
    const rng = new Rng("simplify-tappeto");
    let checked = 0;
    for (let k = 0; k < 600; k++) {
      const expr = randomExpr(rng, rng.int(1, 4), ["x", "y"]);
      let result;
      try {
        result = simplify(expr);
      } catch (error) {
        // Divisione per zero scritta in chiaro: l'espressione di prova non ha senso.
        expect(error).toBeInstanceOf(EngineError);
        continue;
      }
      draws(toLatex(result));
      expect(sameStructure(simplify(clone(result)), result), `non stabile: ${toLatex(expr)} → ${toLatex(result)}`).toBe(true);
      const verdict = compare(expr, result);
      if (verdict.method === "undecided") continue;
      expect(verdict.equivalent, `${toLatex(expr)} → ${toLatex(result)}`).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(400);
  });
});

describe("expand: sviluppo", () => {
  it.each([
    ["(x+1)^2", "x^{2} + 2x + 1"],
    ["(x+1)(x-1)", "x^{2} - 1"],
    ["(x+y)^2", "x^{2} + 2xy + y^{2}"],
    ["(2x-3)(x+4)-2x^2", "5x - 12"],
    ["(x-1)^3", "x^{3} - 3x^{2} + 3x - 1"],
    ["(2+sqrt3)^2", "7 + 4\\sqrt{3}"],
    ["(x^2-1)/(x-1)", "x + 1"],
    ["1/x+1/y", "\\frac{x + y}{xy}"],
    ["x/2+1/3", "\\frac{x}{2} + \\frac{1}{3}"],
  ])("%s → %s", (text, latex) => {
    expect(toLatex(expand(parse(text)))).toBe(latex);
  });

  it.each([["(1+i)^2", "2i"], ["1/(1+i)", "\\frac{1}{2} - \\frac{i}{2}"], ["(2+3i)(1-i)", "5 + i"], ["(3+4i)/(1-2i)", "-1 + 2i"]])(
    "numeri complessi in forma algebrica: %s → %s",
    (text, latex) => {
      const result = expand(parse(text, { complex: true }));
      expect(toLatex(result)).toBe(latex);
      expect(checkForm(result, "algebraicForm").ok).toBe(true);
    },
  );

  it("a tappeto: un polinomio sviluppato è equivalente e rispetta il vincolo «expanded»", () => {
    const rng = new Rng("expand-tappeto");
    const x = sym("x");
    const y = sym("y");
    for (let k = 0; k < 200; k++) {
      const factor = () => add(mul(rng.intExcept(-4, 4), rng.pick([x, y])), rng.int(-5, 5));
      const expr = add(mul(factor(), factor(), rng.bool() ? factor() : 1), mul(rng.int(-3, 3), pow(factor(), 2)));
      const result = expand(expr);
      expect(equivalent(result, expr)).toBe(true);
      expect(checkForm(result, "expanded"), toLatex(result)).toEqual({ ok: true });
      draws(toLatex(result));
    }
  });

  it("numeri con radici e polinomi in una variabile vanno e tornano", () => {
    expect(toLatex(surdToExpr(Surd.sqrt(8).add(3)))).toBe("3 + 2\\sqrt{2}");
    expect(toLatex(surdToExpr(Surd.sqrt(Rational.of(1, 2))))).toBe("\\frac{\\sqrt{2}}{2}");
    expect(toLatex(surdToExpr(Surd.ZERO))).toBe("0");
    expect(toLatex(upolyToExpr(upoly(1, -3, 0, 2)))).toBe("2x^{3} - 3x + 1");
    expect(toLatex(upolyToExpr(upoly(Rational.of(1, 2), 1), "t"))).toBe("t + \\frac{1}{2}");
    expect(toLatex(upolyToExpr([]))).toBe("0");
    expect(exprToUPoly(parse("(x-1)(2x+3)"))?.map(String)).toEqual(["-3", "1", "2"]);
    expect(exprToUPoly(parse("x*y"))).toBeNull();
    expect(exprToUPoly(parse("1/x"))).toBeNull();
    expect(exprToUPoly(parse("sqrt(2)x"))).toBeNull();
    expect(evaluate(expand(parse("(x+2)^4")), { x: 1 })).toBe(81);
  });
});
