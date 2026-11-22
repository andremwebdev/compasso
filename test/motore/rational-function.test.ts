// Funzioni razionali N/D del motore (src/motore/display/rational-function.ts): lettura senza
// semplificare, coefficienti interi, f − k come una sola frazione.

import { describe, expect, it } from "vitest";
import { isConstantFunction, rationalDegrees, rationalFunction, rationalParts, subtractConstant } from "../../src/motore/display";
import { evaluate, toLatex } from "../../src/motore/expr";
import { Rational } from "../../src/motore/numbers/rational";
import { parse } from "./helpers";

const read = (text: string) => {
  const f = rationalFunction(parse(text));
  if (!f) throw new Error(`non razionale: ${text}`);
  return f;
};
const latex = (text: string, k = 0) => {
  const { num, den } = rationalParts(subtractConstant(read(text), k));
  return [toLatex(num), toLatex(den)];
};

describe("funzioni razionali", () => {
  it("legge N e D a coefficienti interi, con D dal coefficiente direttore positivo", () => {
    expect(latex("(x-1)/(x+2)")).toEqual(["x - 1", "x + 2"]);
    expect(latex("(2x+4)/(-x-2)")).toEqual(["-2x - 4", "x + 2"]);
    expect(latex("x/2")).toEqual(["x", "2"]);
    expect(latex("1/x - 1")).toEqual(["-x + 1", "x"]);
  });

  it("non semplifica i fattori comuni: dove si annullano la funzione non è definita", () => {
    expect(latex("(x^2-1)/(x-1)")).toEqual(["x^{2} - 1", "x - 1"]);
  });

  it("f − k come una sola frazione, con lo stesso valore", () => {
    expect(latex("(x+1)/(x-2)", 1)).toEqual(["3", "x - 2"]);
    const f = read("(x^2-5x+6)/(x+1)");
    const g = subtractConstant(f, Rational.of(-3, 2));
    const { num, den } = rationalParts(g);
    for (const x of [-3, 0.5, 2.5, 7]) {
      const value = evaluate(num, { x }) / evaluate(den, { x });
      expect(value).toBeCloseTo((x * x - 5 * x + 6) / (x + 1) + 1.5, 9);
    }
  });

  it("riconosce le funzioni costanti e i gradi", () => {
    expect(isConstantFunction(read("(2x+4)/(x+2)"))).toBe(true);
    expect(isConstantFunction(read("(x-1)/(x+2)"))).toBe(false);
    expect(isConstantFunction(read("x^2"))).toBe(false);
    expect(rationalDegrees(read("(x^2-5x+6)/(x+1)"))).toEqual({ num: 2, den: 1 });
  });

  it("rifiuta quello che non è una frazione di polinomi in x", () => {
    expect(rationalFunction(parse("sqrt(x)"))).toBeNull();
    expect(rationalFunction(parse("2^x"))).toBeNull();
    expect(rationalFunction(parse("x + y"))).toBeNull();
  });
});
