import katex from "katex";
import { describe, expect, it } from "vitest";
import {
  abs, add, cos, decimal, div, e, evaluate, exp, fn, frac, i, isConstant, containsDecimal, ln, log, mul, neg, num,
  pi, pow, relation, root, sameStructure, sin, sqrt, sub, substitute, sym, toLatex, variables, type Expr,
} from "../../src/motore/expr";

const x = sym("x");
const y = sym("y");

describe("costruttori", () => {
  it("costruiscono alberi fedeli, senza semplificare", () => {
    expect(add(x, 0)).toEqual({ kind: "add", terms: [x, num(0)] });
    expect(mul(1, x).kind).toBe("mul");
    expect(div(6, 4).kind).toBe("div");
  });

  it("la differenza è una somma con l'opposto", () => {
    expect(sub(x, y)).toEqual({ kind: "add", terms: [x, { kind: "neg", arg: y }] });
    expect(sub(x, 3)).toEqual(add(x, num(-3)));
  });

  it("le frazioni numeriche sono ridotte, i decimali ricordano le cifre", () => {
    expect(toLatex(frac(6, 8))).toBe("\\frac{3}{4}");
    const d = decimal("1,50");
    expect(d.kind === "num" && d.value.eq(frac(3, 2).value) && d.decimals === 2).toBe(true);
    expect(toLatex(decimal("-0,25"))).toBe("-0{,}25");
  });

  it("rifiuta i nomi e gli indici non validi", () => {
    expect(() => sym("2x")).toThrow();
    expect(() => root(1, x)).toThrow();
    expect(() => add()).toThrow();
  });
});

describe("visita dell'albero", () => {
  const expr = add(mul(2, pow(x, 2)), sin(mul(y, pi)), 1);

  it("trova le variabili", () => {
    expect(variables(expr)).toEqual(["x", "y"]);
    expect(isConstant(expr)).toBe(false);
    expect(isConstant(add(sqrt(2), pi, e))).toBe(true);
  });

  it("sostituisce", () => {
    const replaced = substitute(expr, { x: num(3), y: frac(1, 2) });
    expect(evaluate(replaced)).toBeCloseTo(18 + 1 + 1, 12);
  });

  it("riconosce i decimali e confronta la struttura", () => {
    expect(containsDecimal(add(x, decimal("1,5")))).toBe(true);
    expect(containsDecimal(add(x, frac(3, 2)))).toBe(false);
    expect(sameStructure(add(x, 1), add(x, 1))).toBe(true);
    expect(sameStructure(add(x, 1), add(1, x))).toBe(false);
    expect(sameStructure(root(3, x), sqrt(x))).toBe(false);
    expect(sameStructure(sin(x), cos(x))).toBe(false);
  });
});

describe("valutazione numerica", () => {
  it("calcola le espressioni elementari", () => {
    expect(evaluate(add(mul(2, pow(x, 2)), neg(x), 1), { x: 3 })).toBe(16);
    expect(evaluate(div(1, 3))).toBeCloseTo(1 / 3, 15);
    expect(evaluate(sqrt(2))).toBeCloseTo(Math.SQRT2, 15);
    expect(evaluate(exp(1))).toBeCloseTo(Math.E, 15);
    expect(evaluate(log(2, 8))).toBeCloseTo(3, 12);
    expect(evaluate(ln(e))).toBeCloseTo(1, 15);
    expect(evaluate(abs(-3))).toBe(3);
    expect(evaluate(sin(div(pi, 6)))).toBeCloseTo(0.5, 12);
    expect(evaluate(fn("arctan", 1))).toBeCloseTo(Math.PI / 4, 12);
  });

  it("dà NaN dove l'espressione non è definita", () => {
    expect(evaluate(div(1, sub(x, 1)), { x: 1 })).toBeNaN();
    expect(evaluate(sqrt(x), { x: -1 })).toBeNaN();
    expect(evaluate(ln(x), { x: 0 })).toBeNaN();
    expect(evaluate(log(1, x), { x: 2 })).toBeNaN();
    expect(evaluate(fn("arcsin", 2))).toBeNaN();
    expect(evaluate(fn("tan", div(pi, 2)))).toBeNaN();
    expect(evaluate(pow(0, -1))).toBeNaN();
    expect(evaluate(x)).toBeNaN();
    expect(evaluate(i)).toBeNaN();
  });

  it("radici dispari e potenze frazionarie di numeri negativi", () => {
    expect(evaluate(root(3, -8))).toBeCloseTo(-2, 12);
    expect(evaluate(pow(-8, div(1, 3)))).toBeCloseTo(-2, 12);
    expect(evaluate(pow(-8, div(2, 3)))).toBeCloseTo(4, 12);
    expect(evaluate(pow(-8, div(1, 2)))).toBeNaN();
    expect(evaluate(pow(-2, 3))).toBe(-8);
  });
});

describe("conversione in LaTeX", () => {
  const cases: [string, Expr, string][] = [
    ["polinomio", add(mul(2, pow(x, 2)), mul(-3, x), 1), "2x^{2} - 3x + 1"],
    ["meno davanti", add(neg(x), 5), "-x + 5"],
    ["meno davanti a parentesi", sub(mul(5, x), add(mul(2, x), -3)), "5x - \\left(2x - 3\\right)"],
    ["somma dentro somma", add(x, add(y, 1)), "x + \\left(y + 1\\right)"],
    ["prodotto di numeri", mul(2, 3), "2 \\cdot 3"],
    ["numero dopo lettera", mul(x, 2), "x \\cdot 2"],
    ["prodotto di binomi", mul(add(x, 1), sub(x, 1)), "\\left(x + 1\\right)\\left(x - 1\\right)"],
    ["fattore negativo", mul(2, -3), "2 \\cdot \\left(-3\\right)"],
    ["numero per frazione", mul(2, frac(1, 3)), "2 \\cdot \\frac{1}{3}"],
    ["frazione per lettera", mul(frac(1, 2), x), "\\frac{1}{2}x"],
    ["frazione algebrica", div(add(x, 1), sub(x, 2)), "\\frac{x + 1}{x - 2}"],
    ["frazione negativa", frac(-3, 4), "-\\frac{3}{4}"],
    ["potenza di un binomio", pow(add(x, 1), 2), "\\left(x + 1\\right)^{2}"],
    ["potenza di un negativo", pow(-3, 2), "\\left(-3\\right)^{2}"],
    ["opposto di una potenza", neg(pow(3, 2)), "-3^{2}"],
    ["potenza di potenza", pow(pow(x, 2), 3), "\\left(x^{2}\\right)^{3}"],
    ["esponente frazionario", pow(x, div(1, 2)), "x^{\\frac{1}{2}}"],
    ["radici", add(sqrt(2), root(3, x)), "\\sqrt{2} + \\sqrt[3]{x}"],
    ["radicale con coefficiente", add(3, mul(2, sqrt(5))), "3 + 2\\sqrt{5}"],
    ["valore assoluto", abs(sub(x, 1)), "\\left|x - 1\\right|"],
    ["funzioni", add(sin(x), cos(mul(2, x)), ln(add(x, 1))), "\\sin x + \\cos 2x + \\ln\\left(x + 1\\right)"],
    ["potenza di una funzione", pow(sin(x), 2), "\\sin^{2} x"],
    ["prodotto di funzioni", mul(2, sin(x), cos(x)), "2 \\sin x \\cdot \\cos x"],
    ["esponenziale", exp(mul(2, x)), "e^{2x}"],
    ["logaritmi", add(log(2, x), log(10, x)), "\\log_{2} x + \\log x"],
    ["pi greco", mul(2, pi), "2\\pi"],
    ["decimale con la virgola", mul(decimal("1,5"), x), "1{,}5x"],
    ["complesso", add(3, mul(2, i)), "3 + 2i"],
    ["lettere greche e indici", add(sym("alpha"), sym("x_1")), "\\alpha + x_{1}"],
  ];

  it.each(cases)("%s", (_name, expr, expected) => {
    expect(toLatex(expr)).toBe(expected);
    expect(() => katex.renderToString(toLatex(expr), { throwOnError: true, strict: true })).not.toThrow();
  });

  it("equazioni e disequazioni", () => {
    expect(toLatex(relation(mul(2, x), "<=", 3))).toBe("2x \\le 3");
    expect(toLatex(relation(x, "!=", 0))).toBe("x \\ne 0");
  });
});
