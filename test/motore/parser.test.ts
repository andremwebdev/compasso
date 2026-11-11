import { describe, expect, it } from "vitest";
import { evaluate, toLatex, variables } from "../../src/motore/expr";
import { parseExpression, parseRelation } from "../../src/motore/parser";

/** LaTeX di quello che il parser ha capito (errore se il testo non è valido o è incompleto). */
function tex(text: string, options = {}): string {
  const result = parseExpression(text, options);
  if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
  if (!result.complete) throw new Error(`«${text}»: incompleto`);
  return toLatex(result.value);
}

function value(text: string, env = {}): number {
  const result = parseExpression(text);
  if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
  return evaluate(result.value, env);
}

describe("parser: numeri e operazioni", () => {
  it.each([
    ["2+3*4", "2 + 3 \\cdot 4"],
    ["2 − 3", "2 - 3"],
    ["6:2", "\\frac{6}{2}"],
    ["3·4", "3 \\cdot 4"],
    ["1,5", "1{,}5"],
    ["1.5", "1{,}5"],
    [",5 + 0,25", "0{,}5 + 0{,}25"],
    ["-3", "-3"],
    ["--3", "3"],
    ["2*-3", "2 \\cdot \\left(-3\\right)"],
    ["3/4", "\\frac{3}{4}"],
    ["-3/4", "-\\frac{3}{4}"],
    ["20%", "\\frac{20}{100}"],
    ["[2+(3-1)]*2", "\\left(2 + \\left(3 - 1\\right)\\right) \\cdot 2"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("rispetta le precedenze", () => {
    expect(value("2+3*4")).toBe(14);
    expect(value("-3^2")).toBe(-9);
    expect(value("(-3)^2")).toBe(9);
    expect(value("2^3^2")).toBe(512);
    expect(value("2^-1")).toBe(0.5);
    expect(value("8/2/2")).toBe(2);
    expect(value("8/2*4")).toBe(16);
    expect(value("1/2x", { x: 6 })).toBe(3);
    expect(value("2-3-4")).toBe(-5);
    expect(value("3²+4²")).toBe(25);
    expect(value("2⁻¹")).toBe(0.5);
  });
});

describe("parser: moltiplicazione implicita", () => {
  it.each([
    ["2x", "2x"],
    ["2(x+1)", "2\\left(x + 1\\right)"],
    ["(x+1)(x-1)", "\\left(x + 1\\right)\\left(x - 1\\right)"],
    ["xy", "xy"],
    ["x(x+1)", "x\\left(x + 1\\right)"],
    ["2pi", "2\\pi"],
    ["2πr", "2\\pi r"],
    ["3x^2y", "3x^{2}y"],
    ["-2x+1", "-2x + 1"],
    ["x-2y", "x - 2y"],
    ["2√3", "2\\sqrt{3}"],
    ["x2", "x \\cdot 2"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("due numeri vicini senza operazione sono un errore", () => {
    expect(parseExpression("2 3").ok).toBe(false);
  });
});

describe("parser: radici, potenze, funzioni", () => {
  it.each([
    ["sqrt(2)", "\\sqrt{2}"],
    ["√2", "\\sqrt{2}"],
    ["√(x+1)", "\\sqrt{x + 1}"],
    ["√2x", "\\sqrt{2}x"],
    ["sqrt2", "\\sqrt{2}"],
    ["∛x", "\\sqrt[3]{x}"],
    ["root(3; x+1)", "\\sqrt[3]{x + 1}"],
    ["root(4, x)", "\\sqrt[4]{x}"],
    ["3+2√5", "3 + 2\\sqrt{5}"],
    ["x^2", "x^{2}"],
    ["x^(1/2)", "x^{\\frac{1}{2}}"],
    ["e^x", "e^{x}"],
    ["e^(2x)", "e^{2x}"],
    ["e^2x", "e^{2}x"],
    ["exp(x)", "e^{x}"],
    ["sin(x)", "\\sin x"],
    ["sinx", "\\sin x"],
    ["sen x", "\\sin x"],
    ["sin 2x", "\\sin 2x"],
    ["sin2x+1", "\\sin 2x + 1"],
    ["sin x cos x", "\\sin x \\cdot \\cos x"],
    ["2sinxcosx", "2 \\sin x \\cdot \\cos x"],
    ["sin^2 x", "\\sin^{2} x"],
    ["sin²x", "\\sin^{2} x"],
    ["sin(x)^2", "\\sin^{2} x"],
    ["sin x^2", "\\sin x^{2}"],
    ["sin(x+1)", "\\sin\\left(x + 1\\right)"],
    ["sin -x", "\\sin\\left(-x\\right)"],
    ["tg x + cotg x", "\\tan x + \\cot x"],
    ["arcsen x", "\\arcsin x"],
    ["arctg(1)", "\\arctan 1"],
    ["ln x", "\\ln x"],
    ["ln(x+1)", "\\ln\\left(x + 1\\right)"],
    ["log x", "\\log x"],
    ["log_2 x", "\\log_{2} x"],
    ["log_2(x+1)", "\\log_{2}\\left(x + 1\\right)"],
    ["log(2; 8)", "\\log_{2} 8"],
    ["log(x)^2", "\\left(\\log x\\right)^{2}"],
    ["|x-1|", "\\left|x - 1\\right|"],
    ["abs(x)", "\\left|x\\right|"],
    ["|x||y|", "\\left|x\\right|\\left|y\\right|"],
    ["||x|-1|", "\\left|\\left|x\\right| - 1\\right|"],
    ["2|x|", "2\\left|x\\right|"],
    ["x_1 + x_2", "x_{1} + x_{2}"],
    ["α + beta", "\\alpha + \\beta"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("la virgola tra due cifre è decimale, altrimenti separa gli argomenti", () => {
    expect(tex("root(3,5)")).toBe("\\sqrt{3{,}5}");
    expect(tex("root(3, 5)")).toBe("\\sqrt[3]{5}");
  });

  it("i valori sono quelli attesi", () => {
    expect(value("sqrt(16)+∛27")).toBeCloseTo(7, 12);
    expect(value("log_2 8")).toBeCloseTo(3, 12);
    expect(value("log 1000")).toBeCloseTo(3, 12);
    expect(value("ln e^3")).toBeCloseTo(3, 12);
    expect(value("sin(pi/6)")).toBeCloseTo(0.5, 12);
    expect(value("cos π")).toBeCloseTo(-1, 12);
    expect(value("|-3|+|2-5|")).toBe(6);
  });

  it("la lettera i è l'unità immaginaria solo se richiesto", () => {
    const real = parseExpression("3+2i");
    expect(real.ok && variables(real.value)).toEqual(["i"]);
    expect(tex("3+2i", { complex: true })).toBe("3 + 2i");
    const complex = parseExpression("3+2i", { complex: true });
    expect(complex.ok && variables(complex.value)).toEqual([]);
  });
});

describe("parser: testo incompleto o sbagliato", () => {
  it.each(["2+", "sqrt(", "x^", "sin", "3·", "2/", "log_", "(", "2(x+"])("«%s» è incompleto ma disegnabile", (text) => {
    const result = parseExpression(text);
    expect(result.ok && !result.complete).toBe(true);
    if (result.ok) expect(toLatex(result.value)).toContain("\\square");
  });

  it("parentesi e barre lasciate aperte si chiudono da sole", () => {
    const group = parseExpression("2(x+1");
    expect(group.ok && !group.complete && toLatex(group.value)).toBe("2\\left(x + 1\\right)");
    const bars = parseExpression("|x");
    expect(bars.ok && !bars.complete && toLatex(bars.value)).toBe("\\left|x\\right|");
  });

  it.each([
    ["", "Non hai scritto niente."],
    ["   ", "Non hai scritto niente."],
    ["x+1)", "C'è una parentesi chiusa in più."],
    ["2+*3", "Qui manca un numero o una lettera."],
    ["2 # 3", "Carattere non riconosciuto: «#»."],
    ["x = 3", "Qui serve un'espressione, non un'equazione o una disequazione."],
    ["∞", "L'infinito non è un numero: qui non si può usare."],
    ["root(x; 2)", "L'indice della radice deve essere un intero maggiore o uguale a 2: root(3; x)."],
  ])("«%s» dà un errore chiaro", (text, message) => {
    const result = parseExpression(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe(message);
  });

  it("indica la posizione dell'errore", () => {
    const result = parseExpression("2+3)");
    expect(!result.ok && result.error.position).toBe(3);
  });

  it("non lancia mai eccezioni, qualunque cosa si scriva", () => {
    const alphabet = "0123456789xyeπ+-*/^()|,.;√ sincolgtabqr_%²=<>";
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let n = 0; n < 3000; n++) {
      let text = "";
      const length = 1 + (next() % 12);
      for (let k = 0; k < length; k++) text += alphabet[next() % alphabet.length];
      expect(() => parseExpression(text)).not.toThrow();
      expect(() => parseRelation(text)).not.toThrow();
    }
  });
});

describe("parser: equazioni e disequazioni", () => {
  it.each([
    ["2x+1=0", "2x + 1 = 0"],
    ["x<=3", "x \\le 3"],
    ["x ≥ -2", "x \\ge -2"],
    ["x=<3", "x \\le 3"],
    ["x != 0", "x \\ne 0"],
    ["x≠0", "x \\ne 0"],
    ["x^2 > 4", "x^{2} > 4"],
  ])("%s", (text, expected) => {
    const result = parseRelation(text);
    expect(result.ok && toLatex(result.value)).toBe(expected);
  });

  it("senza segno di relazione è un errore", () => {
    expect(parseRelation("2x+1").ok).toBe(false);
  });
});
