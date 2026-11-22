// Grafici statici di funzioni: punti notevoli esatti, curve interrotte, tacche, SVG senza colori.

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { EngineError } from "../../src/motore/errors";
import { evaluate } from "../../src/motore/expr";
import { graphPointToLatex, graphToSvg, plotGraph, tickLabel, ticks, type Graph, type GraphWindow } from "../../src/motore/display";
import { draws, parse } from "./helpers";

const W: GraphWindow = { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };
const plot = (functions: string[], window = W, points: string[] = []): Graph =>
  plotGraph(functions.map((f) => parse(f)), window, { points: points.map((p) => parse(p)) });
const described = (graph: Graph): string[] => graph.points.map((point) => `${point.kind} ${graphPointToLatex(point)}`);

/** Tutte le ascisse dei tratti di una curva. */
const xsOf = (graph: Graph, curve = 0): number[][] => (graph.curves[curve]?.segments ?? []).map((segment) => segment.map(([x]) => x));

describe("punti notevoli esatti", () => {
  it("funzione fratta: zero, intersezione con l'asse y e asintoto verticale", () => {
    const graph = plot(["(x-1)/(x+2)"]);
    expect(described(graph)).toEqual([String.raw`intercept A\left(0;\, -\frac{1}{2}\right)`, String.raw`zero B\left(1;\, 0\right)`]);
    expect(graph.asymptotes.map((a) => evaluate(a.x))).toEqual([-2]);
  });

  it("un punto escluso dove la funzione ha limite finito è un buco, con l'ordinata esatta", () => {
    const graph = plot(["(x^2-1)/(x-1)"]);
    expect(described(graph)).toContain(String.raw`hole C\left(1;\, 2\right)`);
    expect(graph.asymptotes).toEqual([]);
    // Il buco non è uno zero: x = 1 annulla il numeratore ma non è nel dominio.
    expect(graph.points.filter((point) => point.kind === "zero").map((point) => evaluate(point.x))).toEqual([-1]);
  });

  it("zeri irrazionali scritti con le radici", () => {
    const graph = plot(["x^2 - 2"]);
    expect(described(graph)).toEqual([
      String.raw`zero A\left(-\sqrt{2};\, 0\right)`,
      String.raw`intercept B\left(0;\, -2\right)`,
      String.raw`zero C\left(\sqrt{2};\, 0\right)`,
    ]);
  });

  it("i punti chiesti hanno l'ordinata esatta, anche negli angoli notevoli", () => {
    expect(described(plot(["tan(x)"], W, ["pi/4"]))).toContain(String.raw`point B\left(\frac{\pi}{4};\, 1\right)`);
    expect(described(plot(["sqrt(x)"], W, ["2"]))).toContain(String.raw`point B\left(2;\, \sqrt{2}\right)`);
  });

  it("un punto comune a due curve si segna una volta sola", () => {
    const graph = plot(["x^2", "2x - 1"], W, ["1"]);
    expect(described(graph).filter((text) => text.includes(String.raw`\left(1;\, 1\right)`))).toHaveLength(1);
  });

  it("i punti fuori dalla finestra non si segnano", () => {
    const graph = plot(["x^2 - 9"], { xMin: -2, xMax: 2, yMin: -10, yMax: 10 });
    expect(described(graph)).toEqual([String.raw`intercept A\left(0;\, -9\right)`]);
  });

  it("le lettere vanno in ordine di ascissa e ogni punto si disegna con KaTeX", () => {
    const graph = plot(["(x^2-1)/(x-1)", "x^2 - 2"], W, ["1/2"]);
    expect(graph.points.map((point) => point.label).join("")).toBe("ABCDEFGH");
    const xs = graph.points.map((point) => evaluate(point.x));
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    for (const point of graph.points) draws(graphPointToLatex(point));
  });
});

describe("curve interrotte dove la funzione non è definita", () => {
  it("un tratto per ogni intervallo del dominio, che non attraversa l'asintoto", () => {
    const graph = plot(["(x-1)/(x+2)"]);
    const pieces = xsOf(graph);
    expect(pieces).toHaveLength(2);
    for (const xs of pieces) expect(xs.every((x) => x < -2) || xs.every((x) => x > -2)).toBe(true);
  });

  it("radice e logaritmo: niente fuori dal dominio, e la curva arriva vicino al bordo", () => {
    const root = xsOf(plot(["sqrt(x)"]));
    expect(root).toHaveLength(1);
    expect(Math.min(...(root[0] as number[]))).toBeLessThan(0.05);
    expect((root[0] as number[]).every((x) => x >= 0)).toBe(true);
    const log = xsOf(plot(["ln(x)"]));
    expect(log.flat().every((x) => x > 0)).toBe(true);
  });

  it("i poli che il motore non conosce (tangente) interrompono comunque la curva", () => {
    const pieces = xsOf(plot(["tan(x)"]));
    expect(pieces.length).toBe(5);
    for (const pole of [-1.5, -0.5, 0.5, 1.5].map((k) => k * Math.PI)) {
      for (const xs of pieces) expect(xs.every((x) => x < pole) || xs.every((x) => x > pole)).toBe(true);
    }
  });

  it("una funzione continua è un tratto solo, e le ordinate restano vicino alla finestra", () => {
    const graph = plot(["x^3"]);
    expect(xsOf(graph)).toHaveLength(1);
    const ys = (graph.curves[0]?.segments[0] ?? []).map(([, y]) => y);
    expect(Math.max(...ys)).toBeLessThanOrEqual(4 + 2 * 8);
  });
});

describe("tacche", () => {
  it("passi tondi (1, 2, 5 per una potenza di 10)", () => {
    expect(ticks(-5, 5, 7)).toEqual([-4, -2, 0, 2, 4]);
    expect(ticks(0, 1, 6)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(ticks(-100, 300, 6)).toEqual([-100, 0, 100, 200, 300]);
  });

  it("numeri all'italiana: virgola e segno meno", () => {
    expect(tickLabel(-0.5)).toBe("−0,5");
    expect(tickLabel(0.30000000000000004)).toBe("0,3");
    expect(tickLabel(12)).toBe("12");
  });
});

describe("richieste senza senso", () => {
  it("si segnalano con EngineError, in italiano", () => {
    expect(() => plot(["x"], { xMin: 2, xMax: 1, yMin: 0, yMax: 1 })).toThrow(EngineError);
    expect(() => plot(["x", "x^2", "x^3", "x^4"])).toThrow(/al più 3/);
    expect(() => plot(["a x"])).toThrow(/lettera «a»/);
    expect(() => plot(["sqrt(x)"], W, ["-1"])).toThrow(/nessuna funzione del grafico è definita/);
  });
});

describe("disegno in SVG", () => {
  const svg = graphToSvg(plot(["(x-1)/(x+2)", "x/2"], W, ["2"]), { label: "Grafico di prova" });

  it("è SVG ben formato", () => {
    const { window } = new JSDOM("");
    const doc = new window.DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 320 240");
    expect(doc.documentElement.getAttribute("aria-label")).toBe("Grafico di prova");
    expect(doc.querySelectorAll(".graf-curva")).toHaveLength(2);
    expect(doc.querySelectorAll(".graf-asintoto")).toHaveLength(1);
  });

  it("non contiene colori: solo classi, che prendono i colori dal tema", () => {
    expect(svg).not.toMatch(/#[0-9a-f]{3,6}\b|rgb|hsl|\b(fill|stroke|style|color)=/i);
  });

  it("è deterministico", () => {
    expect(graphToSvg(plot(["(x-1)/(x+2)", "x/2"], W, ["2"]), { label: "Grafico di prova" })).toBe(svg);
  });

  it("si calcola in fretta (telefono)", () => {
    const start = performance.now();
    for (let k = 0; k < 10; k++) graphToSvg(plot(["sin(x)/x", "tan(x)", "(x^3 - x)/(x^2 - 4)"]));
    expect((performance.now() - start) / 10).toBeLessThan(100);
  });
});
