// Controlli speciali delle risposte di tipo espressione: primitive ed equazioni differenziali.

import { describe, expect, it } from "vitest";
import { evaluateResponse, ODE_SYMBOLS, type Exercise, type ExpressionAnswer } from "../../src/esercizi";
import { checkVerdict, sameUnderCheck } from "../../src/esercizi/checks";
import { abs, add, cos, exp, frac, ln, mul, num, pow, sin, sub, sym, type Expr } from "../../src/motore/expr";
import { parseExpression } from "../../src/motore/parser";

const x = sym("x");
const c = sym("c");
const [y, dy, ddy] = [sym(ODE_SYMBOLS.y), sym(ODE_SYMBOLS.first), sym(ODE_SYMBOLS.second)];

function parse(text: string): Expr {
  const parsed = parseExpression(text);
  if (!parsed.ok) throw new Error(`non si legge: ${text}`);
  return parsed.value;
}

/** Un esercizio minimo attorno a una risposta, per provare evaluateResponse. */
const exerciseOf = (answer: ExpressionAnswer): Exercise => ({
  generator: "V2.M09.A01.g1",
  level: 1,
  seed: 0,
  prompt: "prova",
  answer,
  steps: [{ text: "prova" }],
  hints: ["uno", "due"],
});

const respond = (answer: ExpressionAnswer, text: string): string => {
  const result = evaluateResponse(exerciseOf(answer), { kind: "text", text });
  return result.outcome === "wrong" ? result.error : result.outcome;
};

describe("primitive: la risposta si deriva, la costante non conta", () => {
  // ∫ (x + 1) dx = x²/2 + x + c
  const polynomial: ExpressionAnswer = {
    kind: "expression",
    correct: add(mul(frac(1, 2), pow(x, 2)), x, c),
    wrong: [
      { error: "AN.COSTANTE_INTEGRAZIONE", value: add(mul(frac(1, 2), pow(x, 2)), x) },
      { error: "AN.PRIMITIVA_ELEMENTARE", value: add(pow(x, 2), x, c) },
    ],
    check: { kind: "antiderivative", integrand: add(x, 1), variable: "x", missingConstant: "AN.COSTANTE_INTEGRAZIONE" },
  };

  it("accetta ogni primitiva con una costante arbitraria, comunque scritta e comunque chiamata", () => {
    expect(respond(polynomial, "x^2/2 + x + c")).toBe("correct");
    expect(respond(polynomial, "(x+1)^2/2 + c")).toBe("correct");
    expect(respond(polynomial, "x^2/2 + x + 7 + k")).toBe("correct");
    expect(respond(polynomial, "C + x(x+2)/2")).toBe("correct");
    expect(respond(polynomial, "x^2/2 + x - 3c")).toBe("correct");
  });

  it("senza costante arbitraria è l'errore della costante dimenticata", () => {
    expect(respond(polynomial, "x^2/2 + x")).toBe("AN.COSTANTE_INTEGRAZIONE");
    expect(respond(polynomial, "x^2/2 + x + 5")).toBe("AN.COSTANTE_INTEGRAZIONE");
    expect(respond(polynomial, "x^2/2 + x + c - c")).toBe("AN.COSTANTE_INTEGRAZIONE");
  });

  it("riconosce una risposta sbagliata prevista qualunque costante abbia", () => {
    expect(respond(polynomial, "x^2 + x + c")).toBe("AN.PRIMITIVA_ELEMENTARE");
    expect(respond(polynomial, "x^2 + x")).toBe("AN.PRIMITIVA_ELEMENTARE");
    expect(respond(polynomial, "x(x+1) + 4 + k")).toBe("AN.PRIMITIVA_ELEMENTARE");
    expect(respond(polynomial, "x^3 + c")).toBe("NON_CLASSIFICATO");
    expect(respond(polynomial, "0,5x^2 + x + c")).toBe("FORMA.DECIMALE");
  });

  it("ln x al posto di ln|x| è riconosciuto solo se il generatore lo chiede", () => {
    const integrand = pow(sub(x, 1), -1);
    const correct = add(ln(abs(sub(x, 1))), c);
    const strict: ExpressionAnswer = { kind: "expression", correct, wrong: [], check: { kind: "antiderivative", integrand, variable: "x", missingConstant: "AN.COSTANTE_INTEGRAZIONE", smallerDomain: "COND.LOGARITMO" } };
    const loose: ExpressionAnswer = { kind: "expression", correct, wrong: [], check: { kind: "antiderivative", integrand, variable: "x", missingConstant: "AN.COSTANTE_INTEGRAZIONE" } };
    expect(respond(strict, "ln|x-1| + c")).toBe("correct");
    expect(respond(strict, "ln|2x-2| + c")).toBe("correct");
    expect(respond(strict, "ln(x-1) + c")).toBe("COND.LOGARITMO");
    expect(respond(loose, "ln(x-1) + c")).toBe("correct");
  });

  it("per la verifica automatica due primitive sono la stessa risposta se hanno la stessa derivata e la stessa presenza della costante", () => {
    const { check } = polynomial;
    if (!check) throw new Error("manca il controllo");
    expect(sameUnderCheck(parse("x^2/2 + x + c"), parse("(x+1)^2/2 + k"), check)).toBe("same");
    expect(sameUnderCheck(parse("x^2/2 + x + c"), parse("x^2/2 + x"), check)).toBe("different");
    expect(sameUnderCheck(parse("x^2 + c"), parse("x^2/2 + c"), check)).toBe("different");
  });
});

describe("equazioni differenziali: la risposta si sostituisce nell'equazione", () => {
  // y″ − 4y′ + 4y = 0
  const general: ExpressionAnswer = {
    kind: "expression",
    correct: mul(add(sym("c_1"), mul(sym("c_2"), x)), exp(mul(2, x))),
    wrong: [{ error: "AN.EDO_CARATTERISTICA", value: add(mul(sym("c_1"), exp(mul(2, x))), mul(sym("c_2"), exp(mul(-2, x)))) }],
    check: { kind: "differentialEquation", variable: "x", left: add(ddy, mul(-4, dy), mul(4, y)), right: num(0), constants: 2, conditions: [], wrongConstants: "AN.EDO_COSTANTE" },
  };

  it("accetta l'integrale generale comunque scritto e comunque si chiamino le costanti", () => {
    expect(respond(general, "(c_1 + c_2 x)e^(2x)")).toBe("correct");
    expect(respond(general, "a e^(2x) + b x e^(2x)")).toBe("correct");
    expect(respond(general, "e^(2x)(k x - 3h)")).toBe("correct");
  });

  it("conta le costanti arbitrarie davvero indipendenti", () => {
    expect(respond(general, "c_1 e^(2x) + c_2 e^(2x)")).toBe("AN.EDO_COSTANTE");
    expect(respond(general, "c x e^(2x)")).toBe("AN.EDO_COSTANTE");
    expect(respond(general, "x e^(2x)")).toBe("AN.EDO_COSTANTE");
  });

  it("riconosce le risposte sbagliate previste a meno del nome delle costanti", () => {
    expect(respond(general, "a e^(2x) + b e^(-2x)")).toBe("AN.EDO_CARATTERISTICA");
    expect(respond(general, "c_2 e^(2x) + c_1 e^(-2x)")).toBe("AN.EDO_CARATTERISTICA");
    expect(respond(general, "c_1 e^(3x) + c_2 e^x")).toBe("NON_CLASSIFICATO");
  });

  // y′ = 2y, y(0) = 3
  const cauchy: ExpressionAnswer = {
    kind: "expression",
    correct: mul(3, exp(mul(2, x))),
    wrong: [],
    check: {
      kind: "differentialEquation",
      variable: "x",
      left: dy,
      right: mul(2, y),
      constants: 0,
      conditions: [{ order: 0, at: num(0), value: num(3) }],
      wrongConstants: "AN.CAUCHY_CONDIZIONI",
      wrongConditions: "AN.CAUCHY_CONDIZIONI",
    },
  };

  it("in un problema di Cauchy controlla le condizioni iniziali e che non restino costanti", () => {
    expect(respond(cauchy, "3e^(2x)")).toBe("correct");
    expect(respond(cauchy, "3(e^x)^2")).toBe("correct");
    expect(respond(cauchy, "c e^(2x)")).toBe("AN.CAUCHY_CONDIZIONI");
    expect(respond(cauchy, "2e^(2x)")).toBe("AN.CAUCHY_CONDIZIONI");
    expect(respond(cauchy, "e^(2x) + 2")).toBe("NON_CLASSIFICATO");
  });

  it("funziona con soluzioni oscillanti e con equazioni non lineari", () => {
    const oscillator = { kind: "differentialEquation", variable: "x", left: add(ddy, mul(4, y)), right: num(0), constants: 2, conditions: [], wrongConstants: "AN.EDO_COSTANTE" } as const;
    expect(checkVerdict(parse("a cos(2x) + b sin(2x)"), num(0), oscillator).kind).toBe("correct");
    expect(checkVerdict(add(mul(sym("a"), cos(mul(2, x))), mul(sym("b"), sin(x))), num(0), oscillator).kind).toBe("other");
    // y′ = 2x·y²: y = −1/(x² + c)
    const separable = { kind: "differentialEquation", variable: "x", left: dy, right: mul(2, x, pow(y, 2)), constants: 1, conditions: [], wrongConstants: "AN.EDO_COSTANTE" } as const;
    expect(checkVerdict(parse("-1/(x^2 + c)"), num(0), separable).kind).toBe("correct");
    expect(checkVerdict(parse("1/(c - x^2)"), num(0), separable).kind).toBe("correct");
    expect(checkVerdict(parse("-1/x^2 + c"), num(0), separable).kind).toBe("other");
  });
});
