// VIS.esponenziale-logaritmo, la parte matematica: lettura dei parametri (anche delle lezioni vere),
// grafici simmetrici rispetto a y = x per ogni base del cursore, unità uguali sui due assi, punti
// esatti sulle curve, proprietà a parole giuste, LaTeX disegnabile con KaTeX.

import { describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { evaluate } from "../../src/motore/expr";
import {
  BASES, WINDOW, baseIndex, checkExpLogParams, expLatex, expLogGraph, logLatex, mirrorPoints, notablePoints, properties, readExpLogParams,
} from "../../src/visualizzazioni/esponenziale-logaritmo-math";
import { draws, drawsText } from "../motore/helpers";
import { lessonParams } from "./helpers";

describe("VIS.esponenziale-logaritmo: parametri", () => {
  it("senza parametri: base 2, punto 1, con il logaritmo", () => {
    const reading = readExpLogParams({});
    expect(reading.ok && reading.setup).toEqual({ base: BASES.findIndex((b) => evaluate(b) === 2), point: 1, showLog: true });
  });

  it("legge i parametri delle lezioni vere che la usano", () => {
    for (const params of lessonParams("VIS.esponenziale-logaritmo")) expect(checkExpLogParams(params), JSON.stringify(params)).toEqual([]);
  });

  it("riconosce le basi scritte in modi diversi", () => {
    expect(evaluate(BASES[baseIndex("e")]!)).toBeCloseTo(Math.E, 12);
    expect(evaluate(BASES[baseIndex("0,5")]!)).toBe(0.5);
    expect(evaluate(BASES[baseIndex("4/3")]!)).toBeCloseTo(4 / 3, 12);
    expect(baseIndex("7")).toBe(-1);
    expect(baseIndex("pi")).toBe(-1);
  });

  it("un parametro sbagliato dà un messaggio in italiano, mai un'eccezione", () => {
    const cases: [Record<string, string>, string][] = [
      [{ base: "7" }, "Base"],
      [{ base: "-2" }, "Base"],
      [{ punto: "0,05" }, "multiplo di 1/10"],
      [{ punto: "5" }, "tra -3 e 3"],
      [{ logaritmo: "forse" }, "sì oppure no"],
      [{ finestra: "-1; 1; -1; 1" }, "non ha il parametro «finestra»"],
    ];
    for (const [params, words] of cases) expect(checkExpLogParams(params).join(" "), JSON.stringify(params)).toContain(words);
  });
});

describe("VIS.esponenziale-logaritmo: grafici e simmetria", () => {
  it("la finestra ha le unità uguali sui due assi", () => {
    const xUnit = (GRAPH_WIDTH - 12) / (WINDOW.xMax - WINDOW.xMin);
    const yUnit = (GRAPH_HEIGHT - 12) / (WINDOW.yMax - WINDOW.yMin);
    expect(xUnit).toBeCloseTo(yUnit, 9);
  });

  it("per ogni base: il logaritmo è il simmetrico dell'esponenziale rispetto a y = x (controllo a tappeto)", () => {
    for (const base of BASES) {
      const a = evaluate(base);
      const graph = expLogGraph(base, true);
      expect(graph.points).toEqual([]);
      if (a === 1) {
        expect(graph.curves).toHaveLength(2);
        continue;
      }
      expect(graph.curves).toHaveLength(3);
      // Ogni punto disegnato del logaritmo, scambiato, sta sull'esponenziale.
      for (const segment of graph.curves[1]!.segments) for (const [px, py] of segment) {
        if (py > WINDOW.yMin && py < WINDOW.yMax) expect(Math.pow(a, py)).toBeCloseTo(px, 6);
      }
      for (let t = -3; t <= 3; t += 0.1) {
        const { p, q } = mirrorPoints(base, t);
        expect(q).toEqual([p[1], p[0]]);
        expect(evaluate(graph.curves[1]!.expr, { x: q[0] })).toBeCloseTo(q[1], 9);
      }
      // I punti esatti stanno sulle curve giuste.
      for (const point of notablePoints(base, true)) {
        const f = point.curve === "exp" ? graph.curves[0]!.expr : graph.curves[1]!.expr;
        expect(evaluate(f, { x: point.x })).toBeCloseTo(point.y, 12);
        draws(point.latex);
      }
    }
  });

  it("senza il logaritmo c'è solo l'esponenziale", () => {
    expect(expLogGraph(BASES[0]!, false).curves).toHaveLength(1);
    expect(notablePoints(BASES[0]!, false)).toHaveLength(2);
  });

  it("le proprietà dicono crescente per a > 1, decrescente per 0 < a < 1, costante per a = 1", () => {
    for (const base of BASES) {
      const a = evaluate(base);
      const text = properties(base, true).join(" ");
      if (a > 1) expect(text).toContain("**crescente**");
      else if (a < 1) expect(text).toContain("**decrescente**");
      else expect(text).toContain("non esiste");
      for (const line of properties(base, true)) drawsText(line);
      draws(expLatex(base));
      if (a !== 1) draws(logLatex(base));
    }
    expect(logLatex(BASES[baseIndex("e")]!)).toBe(String.raw`y = \ln x`);
    expect(expLatex(BASES[baseIndex("1/2")]!)).toBe(String.raw`y = \left(\frac{1}{2}\right)^{x}`);
  });
});
