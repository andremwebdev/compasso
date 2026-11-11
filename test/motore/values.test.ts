import katex from "katex";
import { describe, expect, it } from "vitest";
import {
  isDefinitionCode, isFlashcardCode, isGeneratorCode, isGlossaryTerm, isLessonCode, isModuleCode, isSkillCode,
  isTheoremCode, isVisualizationCode, moduleOf, skillOf,
} from "../../src/codici";
import { finiteLimit, limitsEqual, limitToLatex, minusInfinity, noLimit, parseLimitValue, plusInfinity } from "../../src/motore/calculus/limit";
import { div, frac, num, sqrt, sym } from "../../src/motore/expr";
import { columnVector, matricesEquivalent, matrix, matrixSize, matrixToLatex, rowVector } from "../../src/motore/linalg/matrix";

const draws = (latex: string) => expect(() => katex.renderToString(latex, { throwOnError: true, strict: true })).not.toThrow();

describe("codici fissi", () => {
  it("riconosce le forme della specifica", () => {
    expect(isModuleCode("V1.M06")).toBe(true);
    expect(isLessonCode("V1.M06.L04")).toBe(true);
    expect(isSkillCode("V1.M06.A04")).toBe(true);
    expect(isGeneratorCode("V1.M06.A04.g1")).toBe(true);
    expect(isDefinitionCode("V2.M04.D01")).toBe(true);
    expect(isTheoremCode("V2.M06.T03")).toBe(true);
    expect(isFlashcardCode("V2.M06.F05")).toBe(true);
    expect(isVisualizationCode("VIS.circonferenza-goniometrica")).toBe(true);
    expect(isGlossaryTerm("segno-di-una-frazione")).toBe(true);
    // Un volume futuro (fisica, analisi 2) ha già un codice valido.
    expect(isLessonCode("V4.M01.L01")).toBe(true);
  });

  it("rifiuta le forme sbagliate", () => {
    expect(isModuleCode("V1.M6")).toBe(false);
    expect(isLessonCode("V1.M06.L4")).toBe(false);
    expect(isLessonCode("V1.M06.A04")).toBe(false);
    expect(isGeneratorCode("V1.M06.A04")).toBe(false);
    expect(isGeneratorCode("V1.M06.A04.g0")).toBe(false);
    expect(isVisualizationCode("VIS.Con Spazi")).toBe(false);
    expect(isGlossaryTerm("Segno_di")).toBe(false);
  });

  it("ricava modulo e abilità", () => {
    expect(moduleOf("V1.M06.L04")).toBe("V1.M06");
    expect(moduleOf("V1.M06.A04.g1")).toBe("V1.M06");
    expect(skillOf("V1.M06.A04.g2")).toBe("V1.M06.A04");
  });
});

describe("valori di un limite", () => {
  it.each([
    ["+∞", "+inf"], ["∞", "+inf"], ["inf", "+inf"], ["+ infinito", "+inf"], ["oo", "+inf"],
    ["-∞", "-inf"], ["−∞", "-inf"], ["-inf", "-inf"], ["meno infinito", "-inf"],
    ["non esiste", "none"], ["∄", "none"], ["Non Esiste", "none"],
    ["3/2", "finite"], ["e", "finite"], ["-1", "finite"],
  ])("legge «%s»", (text, kind) => {
    const result = parseLimitValue(text);
    expect(result.ok && result.value.kind).toBe(kind);
  });

  it("segnala testi non validi e incompleti", () => {
    expect(parseLimitValue("3+").ok && !(parseLimitValue("3+") as { complete: boolean }).complete).toBe(true);
    expect(parseLimitValue("#").ok).toBe(false);
  });

  it("confronta e disegna", () => {
    expect(limitsEqual(plusInfinity, plusInfinity)).toBe(true);
    expect(limitsEqual(plusInfinity, minusInfinity)).toBe(false);
    expect(limitsEqual(finiteLimit(div(2, 4)), finiteLimit(frac(1, 2)))).toBe(true);
    expect(limitsEqual(finiteLimit(num(0)), noLimit)).toBe(false);
    for (const value of [plusInfinity, minusInfinity, noLimit, finiteLimit(sqrt(2))]) draws(limitToLatex(value));
    expect(limitToLatex(minusInfinity)).toBe("-\\infty");
  });
});

describe("matrici e vettori", () => {
  it("costruzione e dimensioni", () => {
    expect(matrixSize(matrix([[1, 2, 3], [4, 5, 6]]))).toEqual({ rows: 2, cols: 3 });
    expect(matrixSize(columnVector([1, 2, 3]))).toEqual({ rows: 3, cols: 1 });
    expect(matrixSize(rowVector([1, 2]))).toEqual({ rows: 1, cols: 2 });
    expect(() => matrix([[1, 2], [3]])).toThrow();
    expect(() => matrix([])).toThrow();
  });

  it("confronto elemento per elemento, in forma esatta", () => {
    const a = matrix([[frac(1, 2), sqrt(8)], [sym("k"), 0]]);
    expect(matricesEquivalent(a, matrix([[div(2, 4), div(4, sqrt(2))], [sym("k"), 0]]))).toBe(true);
    expect(matricesEquivalent(a, matrix([[frac(1, 2), sqrt(8)], [sym("k"), 1]]))).toBe(false);
    expect(matricesEquivalent(a, matrix([[frac(1, 2), sqrt(8)]]))).toBe(false);
  });

  it("LaTeX", () => {
    const latex = matrixToLatex(matrix([[1, frac(-1, 2)], [0, sqrt(2)]]));
    expect(latex).toBe("\\begin{pmatrix} 1 & -\\frac{1}{2} \\\\ 0 & \\sqrt{2} \\end{pmatrix}");
    draws(latex);
  });
});
