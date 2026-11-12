import { describe, expect, it } from "vitest";
import {
  extrema, realZeros, signStudySteps, signTable, signTableToLatex, solutionFromSigns, systemToLatex, variationTable,
  variationTableToLatex, type SignRelation,
} from "../../src/motore/display";
import { EngineError } from "../../src/motore/errors";
import { evaluate, num, relation, sym, toLatex } from "../../src/motore/expr";
import { Rng } from "../../src/motore/random/rng";
import { setContains, setToLatex } from "../../src/motore/sets";
import { draws, drawsText, parse } from "./helpers";

describe("zeri reali di un polinomio", () => {
  it("razionali e con radicali, in ordine crescente", () => {
    expect(realZeros(parse("(x-1)(x+2)")).map(toLatex)).toEqual(["-2", "1"]);
    expect(realZeros(parse("x^2-2")).map(toLatex)).toEqual(["-\\sqrt{2}", "\\sqrt{2}"]);
    expect(realZeros(parse("x^2+1"))).toEqual([]);
    expect(realZeros(parse("(2x-1)^2 (x^2-x-1)")).map(toLatex)).toEqual(["\\frac{1 - \\sqrt{5}}{2}", "\\frac{1}{2}", "\\frac{1 + \\sqrt{5}}{2}"]);
    expect(realZeros(parse("7"))).toEqual([]);
    expect(realZeros(parse("t^2-9"), "t").map(toLatex)).toEqual(["-3", "3"]);
    expect(() => realZeros(parse("sin x"))).toThrow(EngineError);
    expect(() => realZeros(parse("x^3-2"))).toThrow(EngineError);
  });
});

describe("tabella dei segni", () => {
  const table = signTable([{ expr: parse("x-1") }, { expr: parse("x+2"), role: "denominator" }]);

  it("i dati: punti, una riga per fattore, riga del risultato", () => {
    expect(table.points.map(toLatex)).toEqual(["-2", "1"]);
    expect(table.rows.map((row) => [row.label, row.cells.join(" ")])).toEqual([
      ["x - 1", "- - - 0 +"],
      ["x + 2", "- 0 + + +"],
    ]);
    expect([table.result.label, table.result.cells.join(" ")]).toEqual(["\\frac{x - 1}{x + 2}", "+ undefined - 0 +"]);
  });

  it("la soluzione della disequazione si legge dall'ultima riga", () => {
    const solutions = (["<", "<=", ">", ">="] as SignRelation[]).map((op) => setToLatex(solutionFromSigns(table, op)));
    expect(solutions).toEqual([
      "\\left(-2; 1\\right)",
      "\\left(-2; 1\\right]",
      "\\left(-\\infty; -2\\right) \\cup \\left(1; +\\infty\\right)",
      "\\left(-\\infty; -2\\right) \\cup \\left[1; +\\infty\\right)",
    ]);
  });

  it("LaTeX e passaggi dello studio del segno", () => {
    expect(signTableToLatex(table)).toBe(
      "\\begin{array}{c|ccccc} x &  & -2 &  & 1 &  \\\\ \\hline x - 1 & - & - & - & 0 & + \\\\ x + 2 & - & 0 & + & + & + \\\\ \\hline \\frac{x - 1}{x + 2} & + & \\nexists & - & 0 & + \\end{array}",
    );
    draws(signTableToLatex(table));
    const study = signStudySteps(table, ">=");
    expect(setToLatex(study.solution)).toBe("\\left(-\\infty; -2\\right) \\cup \\left[1; +\\infty\\right)");
    expect(study.steps.map((step) => step.text.slice(0, 40))).toEqual([
      "Studia il segno di $x - 1$: si annulla p",
      "Studia il segno di $x + 2$: si annulla p",
      "Riporta i segni in una tabella e, colonn",
      "La disequazione chiede dove $\\frac{x - 1",
    ]);
    for (const step of study.steps) {
      drawsText(step.text);
      if (step.formula) draws(step.formula);
    }
  });

  it("zeri doppi, fattori senza zeri, zeri dati dal generatore, punti in più", () => {
    const square = signTable([{ expr: parse("(x-1)^2") }, { expr: parse("x^2+1") }, { expr: parse("x") }]);
    expect(square.result.cells.join(" ")).toBe("- 0 + 0 +");
    expect(setToLatex(solutionFromSigns(square, ">="))).toBe("\\left[0; +\\infty\\right)");
    expect(setToLatex(solutionFromSigns(square, "<="))).toBe("\\left(-\\infty; 0\\right] \\cup \\left\\{1\\right\\}");
    expect(setToLatex(solutionFromSigns(square, ">"))).toBe("\\left(0; 1\\right) \\cup \\left(1; +\\infty\\right)");
    // ln x si annulla in 1 e non esiste per x ≤ 0: lo zero lo indica il generatore, lo 0 è un punto in più.
    const log = signTable([{ expr: parse("ln x"), zeros: [num(1)] }, { expr: parse("x-3") }], { extraPoints: [num(0)] });
    expect(log.points.map(toLatex)).toEqual(["0", "1", "3"]);
    expect(log.result.cells.join(" ")).toBe("undefined undefined + 0 - 0 +");
    expect(setToLatex(solutionFromSigns(log, "<"))).toBe("\\left(1; 3\\right)");
    const never = signTable([{ expr: parse("x^2+1") }]);
    expect([never.points, never.result.cells]).toEqual([[], ["+"]]);
    expect(setToLatex(solutionFromSigns(never, ">"))).toBe("\\mathbb{R}");
    expect(setToLatex(solutionFromSigns(never, "<="))).toBe("\\emptyset");
    expect(signTable([{ expr: parse("t-2") }], { variable: "t", label: "f(t)" }).result.label).toBe("f(t)");
    expect(signTable([{ expr: num(-2) }, { expr: parse("x") }]).result.cells.join(" ")).toBe("+ 0 -");
    for (const t of [square, log, never]) draws(signTableToLatex(t));
    // Uno zero non indicato si nota: meglio un errore del generatore che una tabella sbagliata.
    expect(() => signTable([{ expr: parse("sin x"), zeros: [] }], { extraPoints: [num(0)] })).toThrow(EngineError);
    expect(() => signTable([])).toThrow(EngineError);
  });

  it("a tappeto: la soluzione letta dalla tabella coincide con il segno calcolato punto per punto", () => {
    const rng = new Rng("segni-tappeto");
    const x = sym("x");
    for (let round = 0; round < 200; round++) {
      const factors = Array.from({ length: rng.int(1, 4) }, () => {
        const kind = rng.int(0, 5);
        const expr =
          kind === 0 ? parse(`x^2-${rng.int(1, 6)}`) : kind === 1 ? parse(`x^2+${rng.int(1, 4)}`) : parse(`${rng.intExcept(-3, 3)}x+${rng.int(-6, 6)}`);
        return { expr, role: rng.bool(0.3) ? ("denominator" as const) : ("numerator" as const) };
      });
      const table = signTable(factors);
      draws(signTableToLatex(table));
      const value = (at: number): number =>
        factors.reduce((product, factor) => {
          const v = evaluate(factor.expr, { x: at });
          return factor.role === "denominator" ? (v === 0 ? NaN : product / v) : product * v;
        }, 1);
      for (const op of ["<", "<=", ">", ">="] as SignRelation[]) {
        const solution = solutionFromSigns(table, op);
        // Punti di prova razionali: quarti tra −8 e 8, zeri razionali compresi.
        for (let k = -32; k <= 32; k++) {
          const v = value(k / 4);
          const expected = Number.isNaN(v) ? false : op === "<" ? v < 0 : op === "<=" ? v <= 0 : op === ">" ? v > 0 : v >= 0;
          expect(setContains(solution, parse(`${k}/4`)), `${table.result.label} ${op} 0 in ${k}/4`).toBe(expected);
        }
      }
      expect(x.name).toBe("x");
    }
  });
});

describe("tabella di variazione", () => {
  it("una cubica: massimo, minimo, andamento", () => {
    const table = variationTable(parse("x^3-3x"));
    expect(table.points.map((point) => [toLatex(point.x), point.derivative, toLatex(point.value!), point.nature])).toEqual([
      ["-1", "0", "2", "max"],
      ["1", "0", "-2", "min"],
    ]);
    expect(table.derivativeSigns).toEqual(["+", "-", "+"]);
    expect(table.trends).toEqual(["increasing", "decreasing", "increasing"]);
    expect(variationTableToLatex(table)).toBe(
      "\\begin{array}{c|ccccc} x &  & -1 &  & 1 &  \\\\ \\hline f'(x) & + & 0 & - & 0 & + \\\\ \\hline f(x) & \\nearrow & 2 & \\searrow & -2 & \\nearrow \\end{array}",
    );
    draws(variationTableToLatex(table));
    expect(extrema(table).map((item) => [toLatex(item.x), toLatex(item.value), item.nature])).toEqual([["-1", "2", "max"], ["1", "-2", "min"]]);
  });

  it("flesso a tangente orizzontale, punti fuori dal dominio, spigoli, funzione costante", () => {
    const cube = variationTable(parse("x^3"));
    expect(cube.points.map((point) => point.nature)).toEqual(["flex"]);
    expect(extrema(cube)).toEqual([]);
    // 1/x: lo zero è fuori dal dominio; lo indica il generatore.
    const reciprocal = variationTable(parse("x + 1/x"), { points: [num(-1), num(0), num(1)] });
    expect(reciprocal.points.map((point) => point.nature)).toEqual(["max", "undefined", "min"]);
    expect(reciprocal.points[1]?.value).toBeNull();
    expect(reciprocal.trends).toEqual(["increasing", "decreasing", "decreasing", "increasing"]);
    draws(variationTableToLatex(reciprocal, "g"));
    expect(variationTableToLatex(reciprocal, "g")).toContain("g'(x)");
    const absolute = variationTable(parse("|x|"), { points: [num(0)] });
    expect(absolute.points.map((point) => [point.derivative, point.nature, toLatex(point.value!)])).toEqual([["undefined", "min", "0"]]);
    const log = variationTable(parse("x ln x"), { points: [num(0), parse("1/e")] });
    expect(log.trends).toEqual(["undefined", "decreasing", "increasing"]);
    expect(log.points.map((point) => point.nature)).toEqual(["undefined", "min"]);
    expect(toLatex(log.points[1]!.value!)).toBe("-\\frac{1}{e}");
    draws(variationTableToLatex(log));
    const constant = variationTable(parse("5"));
    expect([constant.points, constant.trends]).toEqual([[], ["constant"]]);
    expect(variationTable(parse("t^2"), { variable: "t" }).points[0]?.nature).toBe("min");
    // Uno zero della derivata dimenticato tra i punti si nota.
    expect(() => variationTable(parse("sin x"), { points: [] })).not.toThrow();
    expect(() => variationTable(parse("(x-1)^2"), { points: [num(3)] })).not.toThrow();
  });

  it("a tappeto: massimi e minimi trovati sono davvero tali", () => {
    const rng = new Rng("variazione-tappeto");
    for (let round = 0; round < 100; round++) {
      const [a, b] = [rng.int(-4, 4), rng.int(-4, 4)];
      // Derivata 3(x − a)(x − b): la funzione è costruita all'indietro.
      const f = parse(`x^3 - ${3 * (a + b)}/2 x^2 + ${3 * a * b} x + ${rng.int(-3, 3)}`);
      const table = variationTable(f);
      expect(table.points.map((point) => evaluate(point.x))).toEqual([...new Set([a, b])].sort((p, q) => p - q));
      for (const point of table.points) {
        const at = evaluate(point.x);
        const [left, here, right] = [at - 0.01, at, at + 0.01].map((value) => evaluate(f, { x: value })) as [number, number, number];
        expect(evaluate(point.value!)).toBeCloseTo(here, 9);
        if (point.nature === "max") expect(here > left && here > right).toBe(true);
        else if (point.nature === "min") expect(here < left && here < right).toBe(true);
        else expect(point.nature).toBe("flex");
      }
      draws(variationTableToLatex(table));
    }
  });
});

describe("sistemi con la graffa", () => {
  it("equazioni, disequazioni e LaTeX già pronto", () => {
    const latex = systemToLatex([relation(parse("2x+y"), "=", 5), relation(parse("x-y"), "<=", 1), "x \\in \\mathbb{N}"]);
    expect(latex).toBe("\\begin{cases} 2x + y = 5 \\\\ x - y \\le 1 \\\\ x \\in \\mathbb{N} \\end{cases}");
    draws(latex);
  });
});
