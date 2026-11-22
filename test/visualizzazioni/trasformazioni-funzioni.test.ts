// VIS.trasformazioni-funzioni, la parte matematica: lettura dei parametri (anche quelli delle lezioni
// vere), funzione trasformata confrontata punto per punto con a·f(b(x − c)) + d per ogni posizione dei
// cursori, immagine esatta del punto P sul grafico nuovo, elenco delle trasformazioni con il verso
// giusto, LaTeX disegnabile con KaTeX.

import { describe, expect, it } from "vitest";
import { evaluate } from "../../src/motore/expr";
import { Rational } from "../../src/motore/numbers/rational";
import { snapToStep, stepValues } from "../../src/visualizzazioni/parametri";
import {
  RANGES, checkTransformParams, formulaLatex, imagePoint, pointsLatex, readTransformParams, transformSteps, transformedExpr, transformedGraph,
  type TransformSetup, type TransformValues,
} from "../../src/visualizzazioni/trasformazioni-funzioni-math";
import { draws, drawsText } from "../motore/helpers";
import { lessonParams } from "./helpers";

function setupOf(params: Record<string, string>): TransformSetup {
  const reading = readTransformParams(params);
  if (!reading.ok) throw new Error(reading.problems.join("\n"));
  return reading.setup;
}

const R = (n: number, d = 1) => Rational.of(n, d);
const values = (a: Rational, b: Rational, c: Rational, d: Rational): TransformValues => ({ a, b, c, d });

describe("VIS.trasformazioni-funzioni: parametri", () => {
  it("senza parametri usa i valori predefiniti della scheda", () => {
    const setup = setupOf({});
    expect(setup.functions.map((f) => f.text)).toEqual(["x^2", "abs(x)", "sqrt(x)", "1/x"]);
    expect(setup.functions.map((f) => [f.x0.toNumber(), evaluate(f.y0)])).toEqual([[1, 1], [1, 1], [1, 1], [1, 1]]);
    expect(Object.values(setup.values).map((v) => v.toNumber())).toEqual([1, 1, 0, 0]);
    expect(setup.sliders).toEqual(["a", "b", "c", "d"]);
    expect(setup.window).toEqual({ xMin: -6, xMax: 6, yMin: -4, yMax: 4 });
  });

  it("legge i parametri delle lezioni vere che la usano", () => {
    for (const params of lessonParams("VIS.trasformazioni-funzioni")) expect(checkTransformParams(params), JSON.stringify(params)).toEqual([]);
  });

  it("accetta valori iniziali, cursori scelti e funzioni non razionali", () => {
    const setup = setupOf({ funzione: "sin(x); cos(x)", a: "-3/2", b: "2", c: "-1,5", d: "2", cursori: "d; c", finestra: "-7; 7; -3; 3" });
    expect(setup.sliders).toEqual(["c", "d"]);
    expect(setup.values.a.toNumber()).toBe(-1.5);
    expect(setup.values.c.toNumber()).toBe(-1.5);
    // sin 1 non è esatto: x₀ = 0 (sin 0 = 0); cos 1 neanche, cos 2 neanche: x₀ = 0, cos 0 = 1.
    expect(setup.functions.map((f) => f.x0.toNumber())).toEqual([0, 0]);
  });

  it("un parametro sbagliato dà un messaggio in italiano, mai un'eccezione", () => {
    const cases: [Record<string, string>, string][] = [
      [{ funzione: "x^2 + y" }, "lettera"],
      [{ funzione: "(x-1" }, "non si legge"],
      [{ funzione: "x; " }, "vuota"],
      [{ funzione: "x; x^2; x^3; 1/x; abs(x)" }, "Al più 4"],
      [{ funzione: "ln(x - 5)" }, "valore esatto"],
      [{ a: "0" }, "non può essere 0"],
      [{ b: "1/3" }, "multiplo di 1/2"],
      [{ c: "6" }, "tra -5 e 5"],
      [{ d: "pi" }, "razionale"],
      [{ cursori: "a; e" }, "«e»"],
      [{ cursori: "a; a" }, "due volte"],
      [{ finestra: "1; 2; 3" }, "4"],
      [{ colore: "rosso" }, "non ha il parametro «colore»"],
    ];
    for (const [params, words] of cases) {
      const problems = checkTransformParams(params);
      expect(problems.join(" "), JSON.stringify(params)).toContain(words);
    }
  });
});

describe("VIS.trasformazioni-funzioni: la funzione trasformata", () => {
  it("si scrive come in un libro", () => {
    const [square, absolute, root, inverse] = setupOf({}).functions;
    expect(formulaLatex(square!.expr, values(R(1), R(1), R(2), R(0)))).toBe(String.raw`y = \left(x - 2\right)^{2}`);
    expect(formulaLatex(square!.expr, values(R(1), R(1), R(-3), R(-1)))).toBe(String.raw`y = \left(x + 3\right)^{2} - 1`);
    expect(formulaLatex(absolute!.expr, values(R(2), R(3), R(1), R(-1)))).toBe(String.raw`y = 2\left|3\left(x - 1\right)\right| - 1`);
    expect(formulaLatex(root!.expr, values(R(-1), R(-1), R(0), R(0)))).toBe(String.raw`y = -\sqrt{-x}`);
    expect(formulaLatex(inverse!.expr, values(R(1, 2), R(1), R(0), R(1, 2)))).toBe(String.raw`y = \frac{1}{2} \cdot \frac{1}{x} + \frac{1}{2}`);
  });

  it("vale a·f(b(x − c)) + d per ogni posizione dei cursori (controllo a tappeto)", () => {
    const setup = setupOf({ funzione: "x^2; abs(x); sqrt(x); 1/x" });
    const sample = (range: (typeof RANGES)["a"]) => stepValues(range).filter((_, index) => index % 3 === 0);
    let checked = 0;
    for (const f of setup.functions) {
      for (const a of sample(RANGES.a)) for (const b of sample(RANGES.b)) for (const c of sample(RANGES.c)) for (const d of sample(RANGES.d)) {
        const g = transformedExpr(f.expr, values(a, b, c, d));
        for (const t of [-2.3, -0.7, 0.4, 1.9, 3.1]) {
          const expected = a.toNumber() * evaluate(f.expr, { x: b.toNumber() * (t - c.toNumber()) }) + d.toNumber();
          const actual = evaluate(g, { x: t });
          if (Number.isFinite(expected)) expect(actual).toBeCloseTo(expected, 9);
          else expect(Number.isFinite(actual)).toBe(false);
          checked++;
        }
        // P' sta sul grafico nuovo, esatto.
        const image = imagePoint(f, values(a, b, c, d));
        expect(evaluate(g, { x: image.x.toNumber() })).toBeCloseTo(evaluate(image.y), 9);
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("il grafico disegnato ha i suoi asintoti e si interrompe dove non è definito", () => {
    const setup = setupOf({ funzione: "1/x" });
    const graph = transformedGraph(setup.functions[0]!.expr, values(R(1), R(1), R(2), R(1)), setup.window);
    expect(graph.asymptotes.map((a) => evaluate(a.x))).toEqual([2]);
    expect(graph.curves[0]!.segments.length).toBe(2);
    for (const segment of graph.curves[0]!.segments) for (const [px, py] of segment) {
      if (py > -12 && py < 12) expect(py).toBeCloseTo(1 / (px - 2) + 1, 6);
    }
  });

  it("il punto P' è esatto anche con le radici", () => {
    const setup = setupOf({ funzione: "sqrt(x + 1)" });
    const f = setup.functions[0]!;
    expect(f.x0.toNumber()).toBe(1);
    expect(pointsLatex(f, values(R(2), R(1, 2), R(-1), R(3, 2)))).toBe(String.raw`P\left(1;\, \sqrt{2}\right) \;\mapsto\; P'\left(1;\, \frac{3 + 4\sqrt{2}}{2}\right)`);
  });
});

describe("VIS.trasformazioni-funzioni: le trasformazioni a parole", () => {
  it("il verso della traslazione orizzontale è quello giusto", () => {
    expect(transformSteps(values(R(1), R(1), R(2), R(0))).join(" ")).toContain("verso **destra**");
    expect(transformSteps(values(R(1), R(1), R(-2), R(0))).join(" ")).toContain("verso **sinistra**");
    expect(transformSteps(values(R(1), R(1), R(0), R(-1, 2))).join(" ")).toContain("**il basso**");
  });

  it("l'ordine è: b, simmetria y, c, a, simmetria x, d", () => {
    const steps = transformSteps(values(R(-2), R(-3), R(1), R(1)));
    expect(steps.map((step) => step.slice(2, 14))).toEqual(["Dilatazione ", "Simmetria ri", "Traslazione ", "Dilatazione ", "Simmetria ri", "Traslazione "]);
    expect(steps[0]).toContain("stringe");
    expect(steps[1]).toContain("asse $y$");
    expect(steps[4]).toContain("asse $x$");
    expect(transformSteps(values(R(1, 2), R(1, 2), R(0), R(0))).join(" ")).toMatch(/allarga.*schiaccia/);
    expect(transformSteps(values(R(1), R(1), R(0), R(0)))).toEqual([]);
  });

  it("il cursore salta lo zero di a e b e resta nell'intervallo", () => {
    expect(snapToStep(0.1, RANGES.a).toNumber()).toBe(0.5);
    expect(snapToStep(-0.1, RANGES.a).toNumber()).toBe(-0.5);
    expect(snapToStep(9, RANGES.c).toNumber()).toBe(5);
    expect(snapToStep(1.3, RANGES.d).toNumber()).toBe(1.5);
    expect(stepValues(RANGES.a)).toHaveLength(12);
  });

  it("tutto il LaTeX si disegna con KaTeX", () => {
    const setup = setupOf({});
    for (const f of setup.functions) {
      for (const v of [values(R(1), R(1), R(0), R(0)), values(R(-5, 2), R(3, 2), R(-7, 2), R(9, 2)), values(R(1, 2), R(-1), R(5), R(-5))]) {
        draws(formulaLatex(f.expr, v));
        draws(pointsLatex(f, v));
        for (const step of transformSteps(v)) drawsText(step);
      }
    }
  });
});
