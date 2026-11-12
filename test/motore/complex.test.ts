import { describe, expect, it } from "vitest";
import {
  angleExpr, angleOf, argumentOf, Complex, complexExpr, complexRoots, exactComplex, exponentialForm, fromPolar, normalizeAngle,
  notableUnit, polarForm, polarPower, trigonometricForm,
} from "../../src/motore/complex";
import { compare, equivalent } from "../../src/motore/equivalence/equivalence";
import { EngineError } from "../../src/motore/errors";
import { evaluate, evaluateComplex, sqrt, toLatex } from "../../src/motore/expr";
import { checkForm } from "../../src/motore/form";
import { Rational } from "../../src/motore/numbers/rational";
import { Surd } from "../../src/motore/numbers/surd";
import { Rng } from "../../src/motore/random/rng";
import { draws, parse, randomExpr } from "./helpers";

const c = (text: string) => parse(text, { complex: true });
const z = (re: number | Surd, im: number | Surd = 0) => Complex.of(re, im);
const q = (n: number, d = 1) => Rational.of(n, d);
const show = (value: Complex) => toLatex(complexExpr(value));

describe("numeri complessi esatti", () => {
  it("le quattro operazioni, il coniugato, il modulo", () => {
    expect(show(z(1, 2).add(z(3, -1)))).toBe("4 + i");
    expect(show(z(1, 2).sub(z(3, -1)))).toBe("-2 + 3i");
    expect(show(z(1, 2).mul(z(3, -1)))).toBe("5 + 5i");
    expect(show(z(3, 4).div(z(1, -2)))).toBe("-1 + 2i");
    expect(show(z(1, 1).inv())).toBe("\\frac{1}{2} - \\frac{i}{2}");
    expect(show(z(2, -3).conj())).toBe("2 + 3i");
    expect(show(z(0, -1))).toBe("-i");
    expect(show(z(0, Surd.sqrt(3)))).toBe("\\sqrt{3}i");
    expect(z(3, 4).norm().eq(25)).toBe(true);
    expect(z(3, 4).modulus()?.eq(5)).toBe(true);
    expect(z(1, 1).modulus()?.eq(Surd.sqrt(2))).toBe(true);
    expect(z(Surd.sqrt(2), 1).modulus()?.eq(Surd.sqrt(3))).toBe(true);
    expect(z(1, Surd.sqrt(2).add(1)).modulus()).toBeNull();
    expect(() => Complex.ZERO.inv()).toThrow(EngineError);
    expect(z(2).isReal() && !z(2, 1).isReal() && Complex.ZERO.isZero()).toBe(true);
  });

  it("potenze intere", () => {
    expect(show(z(1, 1).pow(2))).toBe("2i");
    expect(show(z(1, 1).pow(8))).toBe("16");
    expect(show(z(0, 1).pow(-1))).toBe("-i");
    expect(show(z(1, Surd.sqrt(3)).pow(3))).toBe("-8");
    expect(show(z(1, 1).pow(0))).toBe("1");
    expect(() => z(1, 1).pow(0.5)).toThrow(EngineError);
  });

  it("angoli notevoli: seno e coseno esatti dei multipli di π/12", () => {
    expect(show(notableUnit(q(1, 6))!)).toBe("\\frac{\\sqrt{3}}{2} + \\frac{i}{2}");
    expect(show(notableUnit(q(1, 4))!)).toBe("\\frac{\\sqrt{2}}{2} + \\frac{\\sqrt{2}i}{2}");
    expect(show(notableUnit(q(1, 2))!)).toBe("i");
    expect(show(notableUnit(q(1))!)).toBe("-1");
    expect(show(notableUnit(q(-2, 3))!)).toBe("-\\frac{1}{2} - \\frac{\\sqrt{3}i}{2}");
    expect(notableUnit(q(1, 5))).toBeNull();
    for (let k = -30; k <= 30; k++) {
      const unit = notableUnit(q(k, 12))!;
      expect(unit.norm().eq(1)).toBe(true);
      expect(unit.re.toNumber()).toBeCloseTo(Math.cos((k * Math.PI) / 12), 12);
      expect(unit.im.toNumber()).toBeCloseTo(Math.sin((k * Math.PI) / 12), 12);
    }
  });

  it("argomento principale in (−π, π]", () => {
    const arg = (value: Complex) => argumentOf(value)?.toString() ?? null;
    expect(arg(z(1, 1))).toBe("1/4");
    expect(arg(z(-1))).toBe("1");
    expect(arg(z(0, -1))).toBe("-1/2");
    expect(arg(z(1, Surd.sqrt(3).neg()))).toBe("-1/3");
    expect(arg(z(-3, 3))).toBe("3/4");
    expect(arg(z(5))).toBe("0");
    expect(arg(z(3, 4))).toBeNull();
    expect(arg(Complex.ZERO)).toBeNull();
    expect([q(2), q(3, 2), q(-1), q(13, 6), q(-7, 6), q(1), q(-1, 2)].map((angle) => normalizeAngle(angle).toString())).toEqual([
      "0", "-1/2", "1", "1/6", "5/6", "1", "-1/2",
    ]);
  });

  it("da modulo e argomento alla forma algebrica", () => {
    expect(show(fromPolar(2, q(1, 3)))).toBe("1 + \\sqrt{3}i");
    expect(show(fromPolar(Surd.sqrt(2), q(-1, 4)))).toBe("1 - i");
    expect(show(fromPolar(3, q(1)))).toBe("-3");
    expect(() => fromPolar(2, q(1, 7))).toThrow(EngineError);
    expect(() => fromPolar(-2, q(1, 3))).toThrow(EngineError);
  });
});

describe("le tre forme", () => {
  it("forma trigonometrica ed esponenziale: scrittura e vincolo di forma", () => {
    const trig = trigonometricForm(2, q(1, 6));
    expect(toLatex(trig)).toBe("2\\left(\\cos \\frac{\\pi}{6} + i \\sin \\frac{\\pi}{6}\\right)");
    expect(checkForm(trig, "trigonometricForm")).toEqual({ ok: true });
    expect(toLatex(trigonometricForm(1, q(-3, 4)))).toBe("\\cos\\left(-\\frac{3\\pi}{4}\\right) + i \\sin\\left(-\\frac{3\\pi}{4}\\right)");
    expect(toLatex(trigonometricForm(sqrt(2), q(1)))).toBe("\\sqrt{2}\\left(\\cos \\pi + i \\sin \\pi\\right)");

    const expo = exponentialForm(2, q(1, 6));
    expect(toLatex(expo)).toBe("2e^{i\\frac{\\pi}{6}}");
    expect(toLatex(exponentialForm(1, q(-1, 3)))).toBe("e^{-i\\frac{\\pi}{3}}");
    expect(toLatex(exponentialForm(sqrt(2), q(5, 6)))).toBe("\\sqrt{2}e^{i\\frac{5\\pi}{6}}");
    expect(toLatex(exponentialForm(3, q(1)))).toBe("3e^{i\\pi}");
    for (const angle of [q(0), q(1, 6), q(-1, 3), q(1), q(7, 12)]) {
      for (const modulus of [1, 2, sqrt(3)]) {
        const forms = [trigonometricForm(modulus, angle), exponentialForm(modulus, angle)];
        expect(checkForm(forms[0]!, "trigonometricForm")).toEqual({ ok: true });
        expect(checkForm(forms[1]!, "exponentialForm")).toEqual({ ok: true });
        forms.forEach((form) => draws(toLatex(form)));
      }
    }
    expect([q(0), q(1), q(1, 6), q(5, 6), q(-1, 3)].map((angle) => toLatex(angleExpr(angle)))).toEqual([
      "0", "\\pi", "\\frac{\\pi}{6}", "\\frac{5\\pi}{6}", "-\\frac{\\pi}{3}",
    ]);
    expect(angleOf(c("5pi/6"))?.toString()).toBe("5/6");
    expect(angleOf(c("2"))).toBeNull();
  });

  it("il vincolo «exponentialForm» guarda come è scritta la risposta", () => {
    for (const text of ["2e^(i pi/6)", "e^(i pi)", "sqrt(2) e^(-i pi/4)", "3e^(2i)", "e^(pi i/3)", "2e^0"]) {
      expect(checkForm(c(text), "exponentialForm"), text).toEqual({ ok: true });
    }
    for (const text of ["sqrt(3)+i", "2(cos(pi/6)+i sin(pi/6))", "-2e^(i pi/6)", "e^2", "2e^(i pi/6)+0", "i e^(i pi)", "2e^(1+i)"]) {
      expect(checkForm(c(text), "exponentialForm").ok, text).toBe(false);
    }
    const failed = checkForm(c("sqrt(3)+i"), "exponentialForm");
    if (!failed.ok) draws(failed.reason.split("$")[1]!);
  });

  it("le tre forme dello stesso numero sono equivalenti, e il valore esatto si ricava da ciascuna", () => {
    const value = fromPolar(2, q(1, 6));
    const forms = [complexExpr(value), trigonometricForm(2, q(1, 6)), exponentialForm(2, q(1, 6))];
    for (const form of forms) {
      expect(exactComplex(form)?.eq(value)).toBe(true);
      for (const other of forms) expect(equivalent(form, other)).toBe(true);
      expect(equivalent(form, complexExpr(fromPolar(2, q(-1, 6))))).toBe(false);
    }
    expect(exactComplex(c("(3+4i)/(1-2i)"))?.eq(z(-1, 2))).toBe(true);
    expect(exactComplex(c("e^(i pi)"))?.eq(z(-1))).toBe(true);
    expect(exactComplex(c("tan(pi/3)"))?.eq(z(Surd.sqrt(3)))).toBe(true);
    expect(exactComplex(c("2+x"))).toBeNull();
    expect(exactComplex(c("e^(2i)"))).toBeNull();
    expect(exactComplex(c("1/(i-i)"))).toBeNull();
  });

  it("modulo e argomento di un numero in forma algebrica", () => {
    const polar = polarForm(z(-1, Surd.sqrt(3)))!;
    expect([toLatex(polar.modulus), polar.angle.toString()]).toEqual(["2", "2/3"]);
    expect(toLatex(polarForm(z(1, -1))!.modulus)).toBe("\\sqrt{2}");
    expect(polarForm(z(3, 4))).toBeNull();
    expect(polarForm(Complex.ZERO)).toBeNull();
  });

  it("a tappeto: algebrica → trigonometrica → algebrica torna al punto di partenza", () => {
    const rng = new Rng("complessi-forme");
    for (let round = 0; round < 150; round++) {
      const modulus = rng.pick([Surd.from(1), Surd.from(2), Surd.from(Rational.of(3, 2)), Surd.sqrt(2), Surd.sqrt(3).mul(2), Surd.sqrt(6)]);
      const angle = normalizeAngle(q(rng.int(-24, 24), 12));
      const value = fromPolar(modulus, angle);
      const polar = polarForm(value)!;
      expect(polar.angle.eq(angle)).toBe(true);
      expect(equivalent(polar.modulus, complexExpr(Complex.of(modulus)))).toBe(true);
      expect(exactComplex(trigonometricForm(polar.modulus, polar.angle))?.eq(value)).toBe(true);
      expect(exactComplex(exponentialForm(polar.modulus, polar.angle))?.eq(value)).toBe(true);
      expect(checkForm(complexExpr(value), "algebraicForm")).toEqual({ ok: true });
    }
  });
});

describe("potenze e radici n-esime", () => {
  it("formula di De Moivre", () => {
    const power = polarPower(2, q(1, 3), 5);
    expect([toLatex(power.modulus), power.angle.toString()]).toEqual(["32", "-1/3"]);
    expect(fromPolar(32, power.angle).eq(fromPolar(2, q(1, 3)).pow(5))).toBe(true);
    expect(toLatex(polarPower(sqrt(2), q(1, 4), 6).modulus)).toBe("8");
    expect(() => polarPower(2, q(1, 3), 1.5)).toThrow(EngineError);
  });

  it("radici cubiche di 8i", () => {
    const roots = complexRoots(z(0, 8), 3)!;
    expect(roots.map((root) => [toLatex(root.modulus), root.angle.toString(), show(root.value!)])).toEqual([
      ["2", "1/6", "\\sqrt{3} + i"],
      ["2", "5/6", "-\\sqrt{3} + i"],
      ["2", "3/2", "-2i"],
    ]);
  });

  it("altri casi: radici quadrate, quarte, e radici senza forma algebrica semplice", () => {
    expect(complexRoots(z(-4), 2)!.map((root) => show(root.value!))).toEqual(["2i", "-2i"]);
    expect(complexRoots(z(-4), 4)!.map((root) => show(root.value!))).toEqual(["1 + i", "-1 + i", "-1 - i", "1 - i"]);
    expect(complexRoots(z(0, 2), 2)!.map((root) => show(root.value!))).toEqual(["1 + i", "-1 - i"]);
    const cube = complexRoots(z(2), 3)!;
    expect(cube.map((root) => [toLatex(root.modulus), root.angle.toString(), root.value])).toEqual([
      ["\\sqrt[3]{2}", "0", null], ["\\sqrt[3]{2}", "2/3", null], ["\\sqrt[3]{2}", "4/3", null],
    ]);
    // Radici quinte dell'unità: l'argomento 2π/5 non è notevole, quindi solo modulo e argomento.
    expect(complexRoots(z(1), 5)!.map((root) => root.angle.toString())).toEqual(["0", "2/5", "4/5", "6/5", "8/5"]);
    expect(complexRoots(z(1), 5)![1]!.value).toBeNull();
    expect(complexRoots(Complex.ZERO, 2)).toBeNull();
    expect(complexRoots(z(3, 4), 2)).toBeNull();
    expect(() => complexRoots(z(1), 1)).toThrow(EngineError);
  });

  it("a tappeto: costruite all'indietro, le radici elevate a n ridanno il numero", () => {
    const rng = new Rng("complessi-radici");
    for (let round = 0; round < 150; round++) {
      const n = rng.int(2, 4);
      const root = fromPolar(rng.pick([Surd.from(1), Surd.from(2), Surd.from(3), Surd.sqrt(2), Surd.sqrt(3)]), q(rng.int(-11, 12), 12));
      const value = root.pow(n);
      const roots = complexRoots(value, n)!;
      expect(roots).toHaveLength(n);
      expect(new Set(roots.map((item) => normalizeAngle(item.angle).toString())).size).toBe(n);
      expect(roots.some((item) => item.value?.eq(root))).toBe(true);
      for (const item of roots) {
        expect(item.value!.pow(n).eq(value)).toBe(true);
        expect(equivalent(exponentialForm(item.modulus, item.angle), complexExpr(item.value!))).toBe(true);
      }
    }
  });
});

describe("valutazione numerica complessa ed equivalenza", () => {
  it("valori noti", () => {
    const value = (text: string) => evaluateComplex(c(text));
    expect(value("e^(i pi)").re).toBeCloseTo(-1, 12);
    expect(value("e^(i pi)").im).toBeCloseTo(0, 12);
    expect(value("sqrt(-4)")).toEqual({ re: 0, im: 2 });
    expect(value("i^i").re).toBeCloseTo(Math.exp(-Math.PI / 2), 12);
    expect(value("(1+i)^2")).toEqual({ re: 0, im: 2 });
    expect(value("|3+4i|")).toEqual({ re: 5, im: 0 });
    expect(value("1/(i-i)").re).toBeNaN();
    expect(value("ln(-1)").im).toBeCloseTo(Math.PI, 12);
    expect(value("root(3; -8)")).toEqual({ re: -2, im: 0 });
    expect(value("x").re).toBeNaN();
  });

  it("a tappeto: dove l'espressione è reale coincide con la valutazione reale", () => {
    const rng = new Rng("complessi-valutazione");
    let checked = 0;
    for (let round = 0; round < 800; round++) {
      const expr = randomExpr(rng, rng.int(1, 3));
      const x = rng.real(-3, 3);
      const realValue = evaluate(expr, { x });
      if (Number.isNaN(realValue) || Math.abs(realValue) > 1e6) continue;
      const complexValue = evaluateComplex(expr, { x });
      const scale = Math.max(1, Math.abs(realValue));
      expect(Math.abs(complexValue.re - realValue) / scale, toLatex(expr)).toBeLessThan(1e-9);
      expect(Math.abs(complexValue.im) / scale, toLatex(expr)).toBeLessThan(1e-9);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("riconosce le uguaglianze con l'unità immaginaria fuori dalla forma polinomiale", () => {
    expect(equivalent(c("e^(i pi)"), c("-1"))).toBe(true);
    expect(equivalent(c("e^(i pi/3)"), c("1/2 + i sqrt(3)/2"))).toBe(true);
    expect(equivalent(c("2(cos(pi/6) + i sin(pi/6))"), c("sqrt(3) + i"))).toBe(true);
    expect(equivalent(c("e^(i x)"), c("cos x + i sin x"))).toBe(true);
    expect(compare(c("e^(i x)"), c("cos x - i sin x"))).toEqual({ equivalent: false, method: "numeric" });
    expect(equivalent(c("e^(i pi/3)"), c("1/2 - i sqrt(3)/2"))).toBe(false);
    expect(equivalent(c("e^(i pi)"), c("1"))).toBe(false);
    // La parte immaginaria conta: stessi valori reali non bastano.
    expect(equivalent(c("e^(i pi/2)"), c("0"))).toBe(false);
    expect(compare(c("(1+i)^2"), c("2i")).method).toBe("exact");
  });
});
