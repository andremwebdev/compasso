import katex from "katex";
import { describe, expect, it } from "vitest";
import { add, div, frac, mul, num, sqrt, sym, type Expr } from "../../src/motore/expr";
import { checkForm, checkForms, formConstraints, type FormConstraint } from "../../src/motore/form";
import { parseExpression } from "../../src/motore/parser";

function p(text: string, complex = false): Expr {
  const result = parseExpression(text, { complex });
  if (!result.ok || !result.complete) throw new Error(`Testo non valido: «${text}»`);
  return result.value;
}

/** Tabella: vincolo, forme accettate, forme rifiutate. */
const table: [FormConstraint, string[], string[]][] = [
  [
    "expanded",
    ["x^2+2x+1", "3x^2y-2xy^2+5", "x", "-x^3+x/2-1/3", "7", "2√2x+1", "x^2/3", "sin(x)^2+2sin(x)+1", "-2x"],
    ["(x+1)^2", "(x+1)(x-1)", "x(x+1)", "x^2+x+x", "2x+3-1", "x*x+1", "2*3x", "(x+1)/2", "1/x+1", "x^2+0x+1", "2(x+1)"],
  ],
  [
    "factored",
    [
      "(x-1)(x+1)", "2(x-3)(x+4)", "(x+1)^2", "-3x^2(x-2)", "x^2+1", "x(x^2+1)", "(x-y)(x+y)", "(a+b)(a+c)", "x-5",
      "(2x-1)(x+3)", "(x^2+x+1)(x-1)", "6", "x^3", "(x-1/2)(x+2)", "(x-√2)(x+√2)", "(x-1)(x+1)/(x(x-2))", "(x^2+y^2)(x-y)(x+y)",
    ],
    [
      "x^2-1", "(x^2-1)(x+2)", "x^2+2x+1", "(2x+4)(x-1)", "x(x^2-4)", "x^2-y^2", "(x-1)(x^2-5x+6)", "x^3-x",
      "(x^2-y^2)(x+1)", "x^4+4", "(x-1)(x+1)/(x^2-2x)", "ab+ac", "2x+4", "(x+1)^2-4",
    ],
  ],
  [
    "reducedFraction",
    ["3/4", "-3/4", "5", "(x+1)/(x-2)", "x/2+1/3", "(x+1)/2", "2/3x", "(x^2+1)/(x-1)", "(x+y)/(x-y)"],
    ["6/8", "4/2", "3/1", "3/-4", "(x^2-1)/(x-1)", "(2x+4)/2", "(2x+2)/(4x)", "x/2+2/4", "(x^2-y^2)/(x+y)", "(x^2+x)/x"],
  ],
  [
    "rationalized",
    ["√2/2", "(√3-1)/2", "√x/x", "1/2", "(1+√2)/(x+1)"],
    ["1/√2", "2/(1+√3)", "1/√x", "1/(x+√2)", "x^(-1/2)", "1/x^(1/2)", "3+1/√5", "√2^(-1)"],
  ],
  [
    "simplifiedRadicals",
    ["2√2", "√6", "3+2√5", "∛4", "√x", "√2/2", "√(x^2+1)"],
    ["√8", "√72", "√4", "√1", "√(1/2)", "∛54", "root(4; 4)", "∛(-2)", "1+√12"],
  ],
];

describe("vincoli di forma", () => {
  for (const [constraint, accepted, rejected] of table) {
    describe(constraint, () => {
      it.each(accepted)("accetta %s", (text) => {
        expect(checkForm(p(text), constraint)).toEqual({ ok: true });
      });
      it.each(rejected)("rifiuta %s", (text) => {
        const result = checkForm(p(text), constraint);
        expect(result.ok).toBe(false);
      });
    });
  }

  describe("algebraicForm", () => {
    // Una parte reale con più termini va bene se i termini non si possono sommare: 1 + √2 + i.
    it.each(["3+2i", "3-2i", "-i", "5", "2i", "1/2+√3/2i", "i√2", "-1+i", "3i+2", "(3i)/2", "1+√2+i", "3/2+√3/2-i"])("accetta %s", (text) => {
      expect(checkForm(p(text, true), "algebraicForm")).toEqual({ ok: true });
    });
    it.each(["(1+i)^2", "1/i", "(1+i)/(1-i)", "i^3", "1+2+i", "i+2i", "(1+i)(1-i)", "2(1+i)", "√2+√8+i", "1+i-1"])("rifiuta %s", (text) => {
      expect(checkForm(p(text, true), "algebraicForm").ok).toBe(false);
    });
  });

  describe("exponentialForm", () => {
    it.each(["2e^(i pi/3)", "e^(i pi)", "√2 e^(-i pi/4)", "e^(i x)"])("accetta %s", (text) => {
      expect(checkForm(p(text, true), "exponentialForm")).toEqual({ ok: true });
    });
    it.each(["1+i√3", "2(cos(pi/3)+i sin(pi/3))", "-2e^(i pi/3)", "e^(pi/3)", "2e^(i pi/3)e^(i pi)"])("rifiuta %s", (text) => {
      expect(checkForm(p(text, true), "exponentialForm").ok).toBe(false);
    });
  });

  describe("trigonometricForm", () => {
    it.each(["2(cos(pi/3)+i sin(pi/3))", "cos(pi)+i*sin(pi)", "√2(cos(pi/4)+sin(pi/4)i)", "2(cos(x)+i sin(x))"])("accetta %s", (text) => {
      expect(checkForm(p(text, true), "trigonometricForm")).toEqual({ ok: true });
    });
    it.each(["1+i√3", "2(cos(pi/3)+i sin(pi/6))", "-2(cos(pi/3)+i sin(pi/3))", "2(sin(pi/3)+i cos(pi/3))", "2cos(pi/3)+2i sin(pi/3)", "2e^(i pi/3)"])(
      "rifiuta %s",
      (text) => {
        expect(checkForm(p(text, true), "trigonometricForm").ok).toBe(false);
      },
    );
  });

  it("vale anche per le espressioni costruite dai generatori, non solo per quelle scritte", () => {
    const x = sym("x");
    expect(checkForm(frac(6, 8), "reducedFraction")).toEqual({ ok: true }); // frac riduce da solo: è 3/4
    expect(checkForm(div(6, 8), "reducedFraction").ok).toBe(false);
    expect(checkForm(mul(add(x, -1), add(x, 1)), "factored")).toEqual({ ok: true });
    expect(checkForm(div(sqrt(2), 2), "rationalized")).toEqual({ ok: true });
    expect(checkForm(div(1, sqrt(2)), "rationalized").ok).toBe(false);
    expect(checkForm(num(3), "expanded")).toEqual({ ok: true });
  });

  it("i motivi sono frasi complete con formule che si disegnano", () => {
    const cases: [string, FormConstraint][] = [
      ["(x^2-1)(x+2)", "factored"], ["x^2-1", "factored"], ["(2x+4)(x-1)", "factored"], ["6/8", "reducedFraction"],
      ["(x^2-1)/(x-1)", "reducedFraction"], ["(2x+4)/2", "reducedFraction"], ["3/-4", "reducedFraction"], ["1/√2", "rationalized"],
      ["√72", "simplifiedRadicals"], ["√(1/2)", "simplifiedRadicals"], ["(x+1)^2", "expanded"], ["x+x", "expanded"],
      ["x*x", "expanded"], ["(x+1)/2", "expanded"], ["1/i", "algebraicForm"], ["1+i", "trigonometricForm"],
    ];
    for (const [text, constraint] of cases) {
      const result = checkForm(p(text, constraint.endsWith("Form")), constraint);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toMatch(/^[A-ZÈ].*\.$/s);
      for (const [, formula] of result.reason.matchAll(/\$([^$]+)\$/g)) {
        expect(() => katex.renderToString(formula as string, { throwOnError: true, strict: true })).not.toThrow();
      }
    }
    expect(checkForm(p("(x^2-1)(x+2)"), "factored")).toEqual({ ok: false, reason: "Il fattore $x^{2} - 1$ si può ancora scomporre." });
    expect(checkForm(p("6/8"), "reducedFraction")).toEqual({ ok: false, reason: "La frazione $\\frac{6}{8}$ si può ancora semplificare." });
  });

  it("più vincoli insieme: conta il primo non rispettato", () => {
    expect(checkForms(p("√2/2"), ["rationalized", "simplifiedRadicals"])).toEqual({ ok: true });
    expect(checkForms(p("√8/4"), ["rationalized", "simplifiedRadicals"]).ok).toBe(false);
    expect(checkForms(p("x^2-1"), [])).toEqual({ ok: true });
  });

  it("l'elenco dei vincoli è completo", () => {
    // Otto dalla sessione 2 (si era aggiunto «exponentialForm»); tre per il parser del Volume 1:
    // «scientificNotation», «degrees», «radians».
    expect(formConstraints).toHaveLength(11);
    for (const constraint of formConstraints) {
      for (const text of ["1", "x", "x^2-1", "1/√2", "(x+1)/(x-1)"]) {
        expect(typeof checkForm(p(text), constraint).ok).toBe("boolean");
      }
    }
  });
});

describe("revisione 4a: vincoli di forma, casi che sfuggivano", () => {
  const accepts = (constraint: FormConstraint, texts: string[], complex = false): void => {
    for (const text of texts) expect(checkForm(p(text, complex), constraint), `${constraint}: ${text}`).toEqual({ ok: true });
  };
  const rejects = (constraint: FormConstraint, texts: string[], complex = false): void => {
    for (const text of texts) {
      const result = checkForm(p(text, complex), constraint);
      expect(result.ok, `${constraint}: ${text}`).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toMatch(/^[A-ZÈ].*\.$/s);
      for (const [, formula] of result.reason.matchAll(/\$([^$]+)\$/g)) {
        expect(() => katex.renderToString(formula as string, { throwOnError: true, strict: true })).not.toThrow();
      }
    }
  };

  it("expanded: un numero e un radicale, o due radicali diversi, non sono termini simili", () => {
    // Prima «3 + 2√2» (lo sviluppo di (1 + √2)²) era rifiutato come «termini simili ancora da sommare».
    accepts("expanded", ["3+2√2", "√2+√3", "1+√2+√3", "x^2+√2x+1", "x√2+x√3", "5-2√6"]);
    rejects("expanded", ["2√2+3√2", "√8+√2", "x√2+3x√2", "3+2", "1/2+1/3", "√2+√2"]);
  });

  it("factored: la potenza di un prodotto già scomposto è scomposta", () => {
    accepts("factored", ["((x+1)(x-1))^2", "(x(x+1))^3", "2((x-1)(x+2))^2"]);
    rejects("factored", ["((x^2-1)(x+2))^2", "(x(x^2-4))^2"]);
  });

  it("reducedFraction: un fattore intero comune si vede anche in mezzo ai radicali", () => {
    accepts("reducedFraction", ["√2/2", "(1+√3)/2", "(3+2√2)/4", "2√3/3", "√6/√2"]);
    rejects("reducedFraction", ["2√2/2", "(2+2√3)/4", "√8/2", "(6+3√2)/3", "4√5/6"]);
  });

  it("factored: lo stesso vale per il numero da raccogliere in un fattore", () => {
    accepts("factored", ["(x-√2)(x+√2)", "(√2x+2)(x-1)"]);
    rejects("factored", ["(2x+2√2)(x-1)"]);
  });

  it("rationalized: una frazione sotto radice ha ancora la radice al denominatore", () => {
    accepts("rationalized", ["√2/2", "√(x+1)/2", "√6/3", "x^(1/2)/2", "2^(1/2)"]);
    rejects("rationalized", ["√(1/2)", "√(x/2)", "(1/2)^(1/2)", "√0,5", "√(3/4 x)", "2√(2/3)", "∛(1/4)"]);
  });

  it("simplifiedRadicals: potenze e prodotti di radici numeriche ancora da calcolare", () => {
    accepts("simplifiedRadicals", ["2√2", "√2√x", "√2·∛3", "√2+√3", "(√x)^3", "√2^1"]);
    rejects("simplifiedRadicals", ["(√2)^3", "(√2)^2", "(∛2)^4", "√2·√2", "√2·√3", "2√3·√5", "√0"]);
  });

  it("trigonometricForm: l'ordine dei due addendi non conta, e gli angoli si scrivono anche senza parentesi", () => {
    accepts("trigonometricForm", ["2(i sin(pi/3)+cos(pi/3))", "2(cos π/3 + i sin π/3)", "cos 3π/4 + i sin 3π/4", "√2(sin(pi/4)i+cos(pi/4))"], true);
    rejects("trigonometricForm", ["2(i sin(pi/3)+cos(pi/6))", "2(i cos(pi/3)+sin(pi/3))", "2(cos(pi/3)+cos(pi/3))", "2(cos(pi/3)-i sin(pi/3))"], true);
  });
});

describe("vincoli di forma del Volume 1: periodici, notazione scientifica, gradi", () => {
  const accepts = (constraint: FormConstraint, texts: string[]): void => {
    for (const text of texts) expect(checkForm(p(text), constraint), `${constraint}: ${text}`).toEqual({ ok: true });
  };
  const rejects = (constraint: FormConstraint, texts: string[]): void => {
    for (const text of texts) {
      const result = checkForm(p(text), constraint);
      expect(result.ok, `${constraint}: ${text}`).toBe(false);
      if (!result.ok) {
        for (const formula of result.reason.split("$").filter((_, index) => index % 2 === 1)) {
          expect(() => katex.renderToString(formula, { throwOnError: true, strict: "error" }), formula).not.toThrow();
        }
      }
    }
  };

  it("frazione generatrice: un periodico non è una frazione ridotta", () => {
    accepts("reducedFraction", ["1/6", "10/3", "-1/3"]);
    rejects("reducedFraction", ["0,1(6)", "3,(3)", "-0,(3)", "0,16\u0305", "1+0,(3)"]);
  });

  it("notazione scientifica: a·10ⁿ con 1 ≤ a < 10", () => {
    accepts("scientificNotation", ["3,2·10^5", "3,2E5", "3,2E-5", "1·10^3", "10^3", "10^(-2)", "9,99·10^0", "-4,5·10^7", "6·10^23", "1,0·10^2"]);
    rejects("scientificNotation", ["32·10^4", "0,32·10^6", "320000", "3,2·10", "3,2·10^x", "3,2·10^(1/2)", "10·10^3", "3,2·5^5", "0,1(6)·10^2", "10^5·3,2", "3,2·10^5+1"]);
  });

  it("gradi: simbolo dei gradi, primi e secondi minori di 60, senza π", () => {
    accepts("degrees", ["30°", "30°15'", "30°15'20''", "0°", "22,5°", "-30°", "390°", "30°20''", "45'"]);
    rejects("degrees", ["π/6", "30", "30°75'", "30°15'60''", "(π/6)°", "30°+π", "2·30°", "15'30°", "30°+30°"]);
  });

  it("radianti: senza gradi, primi e secondi", () => {
    accepts("radians", ["π/6", "2π/3", "0", "x+π"]);
    rejects("radians", ["30°", "π/6+15'", "sin(30°)"]);
  });
});
