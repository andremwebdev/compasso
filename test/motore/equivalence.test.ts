import { describe, expect, it } from "vitest";
import { NormalContext } from "../../src/motore/algebra/poly";
import { exactValue, normalize } from "../../src/motore/algebra/normalize";
import { compare, equivalent } from "../../src/motore/equivalence/equivalence";
import { add, div, evaluate, frac, mul, neg, num, pow, sqrt, sub, sym, type Expr } from "../../src/motore/expr";
import { Rng } from "../../src/motore/random/rng";
import { Rational } from "../../src/motore/numbers/rational";
import { Surd } from "../../src/motore/numbers/surd";
import { parseExpression } from "../../src/motore/parser";

function p(text: string): Expr {
  const result = parseExpression(text, { complex: text.includes("i") && !/sin|pi/.test(text) });
  if (!result.ok || !result.complete) throw new Error(`Testo non valido: «${text}»`);
  return result.value;
}

/** Chiave della forma normale: due espressioni con la stessa chiave sono uguali in modo esatto. */
function key(text: string): string {
  return normalize(p(text), new NormalContext()).key();
}

describe("forma normale", () => {
  it.each([
    ["(x+1)^2", "x^2+2x+1"],
    ["(x+1)(x-1)", "x^2-1"],
    ["x+x", "2x"],
    ["x*x", "x^2"],
    ["2(x+3)-6", "2x"],
    ["(a+b)^3", "a^3+3a^2b+3ab^2+b^3"],
    ["x/2+x/3", "5x/6"],
    ["1,5x", "3x/2"],
    ["x^-1", "1/x"],
    ["x^2/x", "x"],
    ["(2x^2+4x)/(2x)", "x+2"],
    ["sqrt(8)", "2sqrt(2)"],
    ["sqrt(1/2)", "sqrt(2)/2"],
    ["1/(1+sqrt(2))", "sqrt(2)-1"],
    ["sqrt(2)*sqrt(3)", "sqrt(6)"],
    ["(sqrt(x+1))^2", "x+1"],
    ["x^(1/2)", "sqrt(x)"],
    ["x^(3/2)", "x*sqrt(x)"],
    ["root(3; 54)", "3root(3; 2)"],
    ["root(3; 2)^3", "2"],
    ["root(6; 8)", "sqrt(2)"],
    ["root(3; -8)", "-2"],
    ["8^(2/3)", "4"],
    ["|x|^2", "x^2"],
    ["|-x|", "|x|"],
    ["|1-sqrt(2)|", "sqrt(2)-1"],
    ["sin(-x)", "-sin(x)"],
    ["cos(-x)", "cos(x)"],
    ["cos(1-x)", "cos(x-1)"],
    ["sin(x+1)", "sin(1+x)"],
    ["ln(e)", "1"],
    ["ln(1)+sin(0)+cos(0)", "1"],
    ["log_2(2)", "1"],
    ["log_3(x)", "ln(x)/ln(3)"],
    ["e^(x+1)", "e^(1+x)"],
    ["x^0", "1"],
    ["2*pi/4", "pi/2"],
    ["root(3; x)^2", "x^(2/3)"],
  ])("%s = %s", (a, b) => {
    expect(key(a)).toBe(key(b));
    expect(compare(p(a), p(b))).toEqual({ equivalent: true, method: "exact" });
  });

  it("le frazioni si confrontano con il prodotto in croce, anche se le chiavi sono diverse", () => {
    expect(key("1/sqrt(x)")).not.toBe(key("sqrt(x)/x"));
    expect(compare(p("1/sqrt(x)"), p("sqrt(x)/x"))).toEqual({ equivalent: true, method: "exact" });
    expect(compare(p("(x^2-1)/(x-1)"), p("x+1"))).toEqual({ equivalent: true, method: "exact" });
    expect(compare(p("1/(x-1)-1/(x+1)"), p("2/(x^2-1)"))).toEqual({ equivalent: true, method: "exact" });
  });

  it("i numeri complessi si riducono con i² = −1", () => {
    expect(key("(1+i)^2")).toBe(key("2i"));
    expect(key("i^3")).toBe(key("-i"));
    expect(key("(1+i)(1-i)")).toBe(key("2"));
    expect(key("sqrt(-4)")).toBe(key("2i"));
  });

  it("calcola il valore esatto delle costanti con radici quadrate", () => {
    expect(exactValue(p("(1+sqrt(5))/2"))?.eq(Surd.ONE.add(Surd.sqrt(5)).div(2))).toBe(true);
    expect(exactValue(p("3/4-1/2"))?.toRational().eq(Rational.of(1, 4))).toBe(true);
    expect(exactValue(p("x+1"))).toBeNull();
    expect(exactValue(p("pi"))).toBeNull();
    expect(exactValue(p("1/0"))).toBeNull();
  });
});

describe("equivalenza", () => {
  it.each([
    ["x^2-1", "x^2+1"],
    ["x+1", "x"],
    ["2x", "x^2"],
    ["(x+1)^2", "x^2+1"],
    ["sqrt(2)", "1,414"],
    ["pi", "3,14"],
    ["1/3", "0,333"],
    ["x/y", "y/x"],
  ])("%s ≠ %s (deciso in modo esatto)", (a, b) => {
    expect(compare(p(a), p(b))).toEqual({ equivalent: false, method: "exact" });
  });

  it.each([
    ["sin(x)^2+cos(x)^2", "1"],
    ["sin(2x)", "2sin(x)cos(x)"],
    ["tan(x)", "sin(x)/cos(x)"],
    ["ln(x^2)", "2ln(x)"],
    ["ln(xy)", "ln(x)+ln(y)"],
    ["e^(2x)", "(e^x)^2"],
    ["e^x*e^y", "e^(x+y)"],
    ["2^(x+1)", "2*2^x"],
    ["sqrt(x^2)", "|x|"],
    ["sqrt(4x)", "2sqrt(x)"],
    ["sqrt(x)*sqrt(y)", "sqrt(xy)"],
    ["log_2(8)", "3"],
    ["sin(pi/6)", "1/2"],
    ["cos(pi/4)", "sqrt(2)/2"],
    ["sqrt(3+2sqrt(2))", "1+sqrt(2)"],
    ["arctan(1)", "pi/4"],
  ])("%s = %s (deciso con i valori)", (a, b) => {
    expect(compare(p(a), p(b))).toEqual({ equivalent: true, method: "numeric" });
  });

  it.each([
    ["sin(x)", "cos(x)"],
    ["sin(2x)", "2sin(x)"],
    ["sqrt(x^2)", "x"],
    ["|x|", "x"],
    ["ln(x+y)", "ln(x)+ln(y)"],
    ["sqrt(x+y)", "sqrt(x)+sqrt(y)"],
    ["e^(x+y)", "e^x+e^y"],
    ["sin(x+y)", "sin(x)+sin(y)"],
    ["sin(pi/6)", "sqrt(3)/2"],
    ["sqrt(x)", "x/2"],
    ["ln(x)", "ln(x)+0,000001"],
  ])("%s ≠ %s", (a, b) => {
    expect(equivalent(p(a), p(b))).toBe(false);
  });

  it("ignora i punti dove una delle due non è definita", () => {
    expect(equivalent(p("(x^2-1)/(x-1)"), p("x+1"))).toBe(true);
    expect(equivalent(p("(sqrt(x))^2"), p("x"))).toBe(true);
    expect(equivalent(p("x*sqrt(x-100)/sqrt(x-100)"), p("x"))).toBe(true);
  });

  it("trova i domini lontani dall'origine o stretti", () => {
    expect(equivalent(p("ln(x-50)+ln(2)"), p("ln(2x-100)"))).toBe(true);
    expect(equivalent(p("arcsin(x)+arccos(x)"), p("pi/2"))).toBe(true);
  });

  it("non decide se non esiste un punto dove entrambe sono definite", () => {
    expect(compare(p("sqrt(-1-x^2)"), p("ln(-1-x^2)"))).toEqual({ equivalent: false, method: "undecided" });
    expect(compare(p("1/0"), p("1/0"))).toEqual({ equivalent: false, method: "undecided" });
  });

  it("è deterministica: stesso confronto, stesso risultato", () => {
    const a = p("sin(x)^2+cos(y)^2");
    const b = p("1-cos(x)^2+cos(y)^2");
    expect(compare(a, b)).toEqual(compare(a, b));
  });

  it("le espressioni troppo grandi per la forma normale passano al confronto numerico", () => {
    expect(equivalent(p("(x+y+z+1)^40"), p("(1+z+y+x)^40"))).toBe(true);
    expect(equivalent(p("(x+1)^300"), p("(x+1)^299*(x+1)"))).toBe(true);
  });

  it("resta veloce", () => {
    const start = performance.now();
    for (let n = 0; n < 200; n++) {
      equivalent(p("(x+1)(x-2)/(x^2-4)"), p("(x+1)/(x+2)"));
      equivalent(p("sin(x)^2+cos(x)^2"), p("1"));
    }
    expect((performance.now() - start) / 400).toBeLessThan(5);
  });
});

describe("equivalenza: controllo a tappeto su espressioni generate", () => {
  const rng = new Rng("espressioni di prova");
  const x = sym("x");
  const y = sym("y");

  /** Espressione casuale: polinomi, frazioni, radici quadrate di interi, potenze piccole. */
  function random(depth: number): Expr {
    if (depth === 0 || rng.bool(0.2)) {
      return rng.pick<Expr>([x, y, num(rng.int(-5, 5)), frac(rng.intExcept(-4, 4), rng.int(2, 5)), sqrt(rng.pick([2, 3, 5, 8, 12]))]);
    }
    const a = random(depth - 1);
    const b = random(depth - 1);
    return rng.pick<() => Expr>([() => add(a, b), () => sub(a, b), () => mul(a, b), () => div(a, add(b, 7)), () => pow(a, rng.int(2, 3)), () => neg(a)])();
  }

  /** Confronto «di forza bruta»: valori in venti punti. */
  function sameValues(a: Expr, b: Expr): boolean {
    const points = new Rng("punti");
    let valid = 0;
    for (let k = 0; k < 40 && valid < 20; k++) {
      const env = { x: points.real(-3, 3), y: points.real(-3, 3) };
      const va = evaluate(a, env);
      const vb = evaluate(b, env);
      if (Number.isNaN(va) || Number.isNaN(vb)) continue;
      valid += 1;
      if (Math.abs(va - vb) > 1e-6 * Math.max(1, Math.abs(va), Math.abs(vb))) return false;
    }
    return valid > 0;
  }

  it("le identità algebriche valgono su sottoespressioni qualsiasi, in modo esatto", () => {
    for (let n = 0; n < 150; n++) {
      const [a, b, c] = [random(2), random(2), random(2)];
      const identities: [Expr, Expr][] = [
        [mul(add(a, b), c), add(mul(a, c), mul(b, c))],
        [pow(add(a, b), 2), add(pow(a, 2), mul(2, a, b), pow(b, 2))],
        [mul(add(a, b), sub(a, b)), sub(pow(a, 2), pow(b, 2))],
        [sub(a, sub(b, c)), add(sub(a, b), c)],
        [div(a, add(pow(b, 2), 1)), div(mul(a, 3), add(mul(3, pow(b, 2)), 3))],
        [add(div(a, add(pow(c, 2), 2)), div(b, add(pow(c, 2), 2))), div(add(a, b), add(pow(c, 2), 2))],
      ];
      for (const [left, right] of identities) {
        expect(compare(left, right)).toEqual({ equivalent: true, method: "exact" });
      }
    }
  });

  it("il confronto esatto concorda sempre con i valori numerici", () => {
    let different = 0;
    for (let n = 0; n < 300; n++) {
      const a = random(3);
      const b = rng.bool(0.3) ? add(a, sub(random(2), random(2))) : random(3);
      const result = compare(a, b);
      if (result.method === "undecided") continue;
      expect(result.equivalent).toBe(sameValues(a, b));
      if (!result.equivalent) different += 1;
    }
    expect(different).toBeGreaterThan(100);
  });
});
