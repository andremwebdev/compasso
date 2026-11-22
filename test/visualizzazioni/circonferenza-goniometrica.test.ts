// VIS.circonferenza-goniometrica, la parte matematica: parametri (anche delle lezioni vere), radianti
// esatti, seno, coseno e tangente esatti per i multipli di 15° e confrontati con i valori numerici per
// ogni grado, quadranti e segni, aggancio del punto trascinato, LaTeX disegnabile con KaTeX.

import { describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { evaluate } from "../../src/motore/expr";
import {
  QUADRANT_SIGNS, WINDOW, angleLatex, checkCircleParams, quadrant, quadrantText, radians, readCircleParams, snapAngle, trigValues,
} from "../../src/visualizzazioni/circonferenza-goniometrica-math";
import { draws, drawsText } from "../motore/helpers";
import { lessonParams } from "./helpers";

describe("VIS.circonferenza-goniometrica: parametri", () => {
  it("senza parametri: 30°, con la tangente", () => {
    const reading = readCircleParams({});
    expect(reading.ok && reading.setup).toEqual({ degrees: 30, showTangent: true });
    expect(readCircleParams({ angolo: "135", tangente: "no" })).toEqual({ ok: true, setup: { degrees: 135, showTangent: false } });
  });

  it("legge i parametri delle lezioni vere che la usano", () => {
    for (const params of lessonParams("VIS.circonferenza-goniometrica")) expect(checkCircleParams(params), JSON.stringify(params)).toEqual([]);
  });

  it("un parametro sbagliato dà un messaggio in italiano, mai un'eccezione", () => {
    const cases: [Record<string, string>, string][] = [
      [{ angolo: "30,5" }, "multiplo di 1"],
      [{ angolo: "400" }, "tra 0 e 360"],
      [{ angolo: "pi/6" }, "razionale"],
      [{ tangente: "boh" }, "sì oppure no"],
      [{ raggio: "2" }, "non ha il parametro «raggio»"],
    ];
    for (const [params, words] of cases) expect(checkCircleParams(params).join(" "), JSON.stringify(params)).toContain(words);
  });
});

describe("VIS.circonferenza-goniometrica: valori", () => {
  it("la finestra ha le unità uguali (la circonferenza è rotonda)", () => {
    expect((GRAPH_WIDTH - 12) / (WINDOW.xMax - WINDOW.xMin)).toBeCloseTo((GRAPH_HEIGHT - 12) / (WINDOW.yMax - WINDOW.yMin), 9);
    expect(WINDOW.yMax).toBeGreaterThan(1.2);
  });

  it("gradi e radianti affiancati, esatti", () => {
    expect(angleLatex(30)).toBe(String.raw`30^\circ = \frac{\pi}{6}`);
    expect(angleLatex(135)).toBe(String.raw`135^\circ = \frac{3\pi}{4}`);
    expect(angleLatex(180)).toBe(String.raw`180^\circ = \pi`);
    expect(angleLatex(0)).toBe(String.raw`0^\circ = 0`);
    for (let d = 0; d <= 360; d++) {
      expect(evaluate(radians(d))).toBeCloseTo((d * Math.PI) / 180, 12);
      draws(angleLatex(d));
    }
  });

  it("valori esatti ai multipli di 15°, approssimati altrove, sempre giusti (ogni grado)", () => {
    expect(trigValues(30).sin.latex).toBe(String.raw`= \frac{1}{2}`);
    expect(trigValues(135).cos.latex).toBe(String.raw`= -\frac{\sqrt{2}}{2}`);
    expect(trigValues(60).tan?.latex).toBe(String.raw`= \sqrt{3}`);
    expect(trigValues(90).tan).toBeNull();
    expect(trigValues(270).tan).toBeNull();
    expect(trigValues(37).sin.latex).toBe(String.raw`\approx 0{,}6`);
    for (let d = 0; d <= 360; d++) {
      const v = trigValues(d);
      const rad = (d * Math.PI) / 180;
      expect(v.cos.value).toBeCloseTo(Math.cos(rad), 12);
      expect(v.sin.value).toBeCloseTo(Math.sin(rad), 12);
      expect(v.cos.exact).toBe(d % 15 === 0);
      // Il valore esatto si mostra solo se coincide con quello numerico (lo controlla exactConstant).
      for (const item of [v.cos, v.sin, v.tan]) if (item) draws(item.latex);
    }
  });

  it("quadranti e segni coincidono con i segni veri di seno, coseno e tangente", () => {
    expect([0, 45, 90, 100, 200, 300, 360].map(quadrant)).toEqual([0, 1, 0, 2, 3, 4, 0]);
    for (let d = 1; d < 360; d++) {
      const q = quadrant(d);
      if (q === 0) continue;
      const rad = (d * Math.PI) / 180;
      expect(QUADRANT_SIGNS.sin[q - 1]).toBe(Math.sin(rad) > 0 ? "+" : "-");
      expect(QUADRANT_SIGNS.cos[q - 1]).toBe(Math.cos(rad) > 0 ? "+" : "-");
      expect(QUADRANT_SIGNS.tan[q - 1]).toBe(Math.tan(rad) > 0 ? "+" : "-");
      drawsText(quadrantText(d, true));
    }
    expect(quadrantText(120, true)).toContain("II quadrante");
    expect(quadrantText(90, true)).toContain("sull'asse $y$");
    expect(quadrantText(180, false)).toContain("il seno è $0$");
  });

  it("il punto trascinato si aggancia ai multipli di 15° e altrove va a gradi interi", () => {
    const at = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)] as const;
    expect(snapAngle(...at(32.6), 0)).toBe(30);
    expect(snapAngle(...at(37.4), 0)).toBe(37);
    expect(snapAngle(...at(-20), 0)).toBe(340);
    expect(snapAngle(...at(2), 350)).toBe(360);
    expect(snapAngle(...at(2), 10)).toBe(0);
    expect(snapAngle(0, 0, 77)).toBe(77);
  });
});
