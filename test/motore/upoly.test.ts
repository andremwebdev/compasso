import { describe, expect, it } from "vitest";
import { normalize } from "../../src/motore/algebra/normalize";
import { NormalContext } from "../../src/motore/algebra/poly";
import { areCoprime, isIrreducible } from "../../src/motore/algebra/specialize";
import {
  upDegree, upDerivative, upDivMod, upEval, upFactor, upGcd, upIsIrreducible, upMul, upoly, upPrimitive,
  upRationalRoots, type UPoly,
} from "../../src/motore/algebra/upoly";
import { Rational } from "../../src/motore/numbers/rational";
import { parseExpression } from "../../src/motore/parser";
import { Rng } from "../../src/motore/random/rng";

const show = (p: UPoly): string => p.map((c) => c.toString()).join(" ");

describe("polinomi in una variabile", () => {
  it("divisione con resto", () => {
    // (t³ − 2t² + 4) : (t − 3) = t² + t + 3, resto 13
    const { quotient, remainder } = upDivMod(upoly(4, 0, -2, 1), upoly(-3, 1));
    expect(show(quotient)).toBe("3 1 1");
    expect(show(remainder)).toBe("13");
    expect(() => upDivMod(upoly(1), [])).toThrow();
  });

  it("la divisione torna indietro: a = q·b + r", () => {
    const rng = new Rng("divisione");
    for (let n = 0; n < 200; n++) {
      const a = upoly(...Array.from({ length: rng.int(1, 6) }, () => rng.int(-9, 9)));
      const b = upoly(...Array.from({ length: rng.int(1, 4) }, () => rng.int(-9, 9)), rng.intExcept(-5, 5));
      const { quotient, remainder } = upDivMod(a, b);
      const back = upMul(quotient, b);
      const sum = upoly(...Array.from({ length: Math.max(back.length, remainder.length, a.length) }, (_, k) =>
        (back[k] ?? Rational.ZERO).add(remainder[k] ?? Rational.ZERO).sub(a[k] ?? Rational.ZERO)));
      expect(sum.length).toBe(0);
      expect(upDegree(remainder)).toBeLessThan(upDegree(b));
    }
  });

  it("MCD, valore, derivata", () => {
    // MCD(t² − 1, t² − 2t + 1) = t − 1
    expect(show(upGcd(upoly(-1, 0, 1), upoly(1, -2, 1)))).toBe("-1 1");
    expect(show(upGcd(upoly(1, 1), upoly(2, 1)))).toBe("1");
    expect(upEval(upoly(4, 0, -2, 1), 3).eq(13)).toBe(true);
    expect(show(upDerivative(upoly(4, 0, -2, 1)))).toBe("0 -4 3");
  });

  it("contenuto e parte primitiva", () => {
    const { content, primitive } = upPrimitive(upoly(Rational.of(-4, 3), 0, Rational.of(2, 3)));
    expect(content.eq(Rational.of(2, 3))).toBe(true);
    expect(show(primitive)).toBe("-2 0 1");
    // 2 − 4t = −2·(2t − 1): il coefficiente direttivo della parte primitiva è positivo.
    expect(upPrimitive(upoly(2, -4)).content.eq(-2)).toBe(true);
  });

  it("radici razionali", () => {
    // 2t³ − 3t² − 3t + 2 = (t + 1)(2t − 1)(t − 2)
    expect(upRationalRoots(upoly(2, -3, -3, 2)).map(String)).toEqual(["-1", "1/2", "2"]);
    expect(upRationalRoots(upoly(0, 0, 1, 1)).map(String)).toEqual(["-1", "0"]);
    expect(upRationalRoots(upoly(-2, 0, 1))).toEqual([]);
  });

  it.each([
    ["t − 3", upoly(-3, 1), true],
    ["t² + 1", upoly(1, 0, 1), true],
    ["t² − 2", upoly(-2, 0, 1), true],
    ["t² − 1", upoly(-1, 0, 1), false],
    ["t² + 2t + 1", upoly(1, 2, 1), false],
    ["t³ − 2", upoly(-2, 0, 0, 1), true],
    ["t³ − 1", upoly(-1, 0, 0, 1), false],
    ["t⁴ + 4 = (t² + 2t + 2)(t² − 2t + 2)", upoly(4, 0, 0, 0, 1), false],
    ["t⁴ + 1", upoly(1, 0, 0, 0, 1), true],
    ["t⁴ + t² + 1 = (t² + t + 1)(t² − t + 1)", upoly(1, 0, 1, 0, 1), false],
    ["t⁴ − 5t² + 6 = (t² − 2)(t² − 3)", upoly(6, 0, -5, 0, 1), false],
    ["t⁵ − t − 1", upoly(-1, -1, 0, 0, 0, 1), true],
    ["t⁵ + t + 1 = (t² + t + 1)(t³ − t² + 1)", upoly(1, 1, 0, 0, 0, 1), false],
    ["2t² + 4 (il fattore numerico non conta)", upoly(4, 0, 2), true],
  ])("irriducibilità di %s", (_name, poly, expected) => {
    expect(upIsIrreducible(poly)).toBe(expected);
  });

  it("scomposizione sui razionali", () => {
    // 2t⁴ − 2 = 2(t − 1)(t + 1)(t² + 1)
    const f = upFactor(upoly(-2, 0, 0, 0, 2));
    expect(f.constant.eq(2)).toBe(true);
    expect(f.factors.map(({ poly, multiplicity }) => `${show(poly)} ^${multiplicity}`)).toEqual(["-1 1 ^1", "1 1 ^1", "1 0 1 ^1"]);
    // t³(t − 2)² · 3/2
    const g = upFactor(upMul(upoly(0, 0, 0, Rational.of(3, 2)), upMul(upoly(-2, 1), upoly(-2, 1))));
    expect(g.constant.eq(Rational.of(3, 2))).toBe(true);
    expect(g.factors.map(({ poly, multiplicity }) => `${show(poly)} ^${multiplicity}`)).toEqual(["-2 1 ^2", "0 1 ^3"]);
  });

  it("il prodotto dei fattori ridà il polinomio", () => {
    const rng = new Rng("scomposizione");
    for (let n = 0; n < 100; n++) {
      let poly = upoly(rng.intExcept(-3, 3));
      for (let k = rng.int(1, 3); k > 0; k--) {
        poly = upMul(poly, rng.bool() ? upoly(rng.int(-5, 5), rng.intExcept(-3, 3)) : upoly(rng.int(1, 5), rng.int(-3, 3), 1));
      }
      const { constant, factors } = upFactor(poly);
      let back = upoly(constant);
      for (const { poly: factor, multiplicity } of factors) {
        for (let k = 0; k < multiplicity; k++) back = upMul(back, factor);
        expect(upIsIrreducible(factor)).toBe(true);
      }
      expect(show(back)).toBe(show(poly));
    }
  });
});

describe("polinomi in più variabili ristretti a una retta", () => {
  const ctx = new NormalContext();
  const poly = (text: string) => {
    const parsed = parseExpression(text);
    if (!parsed.ok) throw new Error(text);
    return normalize(parsed.value, ctx).num;
  };

  it.each([
    ["x^2-y^2", false],
    ["x^2+y^2", true],
    ["x^2-2y^2", true],
    ["x^2+2xy+y^2", false],
    ["xy-1", true],
    ["xy+x", false],
    ["x^3+y^3", false],
    ["x^2+y^2-1", true],
    ["x+y+z", true],
    ["ab+ac+b^2+bc", false],
    ["x^2-1", false],
    ["x^2-pi^2", false],
  ])("irriducibilità di %s", (text, expected) => {
    expect(isIrreducible(poly(text), ctx)).toBe(expected);
  });

  it("non decide con coefficienti irrazionali o atomi non liberi", () => {
    expect(isIrreducible(poly("x^2-sqrt(2)"), ctx)).toBeNull();
    expect(isIrreducible(poly("sin(x)^2-1"), ctx)).toBeNull();
  });

  it("riconosce i fattori comuni", () => {
    expect(areCoprime(poly("x^2-1"), poly("x^2-2x+1"), ctx)).toBe(false);
    expect(areCoprime(poly("x+1"), poly("x+2"), ctx)).toBe(true);
    expect(areCoprime(poly("x^2-y^2"), poly("x^2+2xy+y^2"), ctx)).toBe(false);
    expect(areCoprime(poly("x^2-y^2"), poly("x^2+y^2"), ctx)).toBe(true);
    expect(areCoprime(poly("xy"), poly("xz"), ctx)).toBe(false);
    expect(areCoprime(poly("xy"), poly("z+1"), ctx)).toBe(true);
  });
});
