// VIS.coniche-parametri, la parte matematica: parametri (anche delle lezioni vere), elementi esatti
// nei casi del libro, e un controllo a tappeto per ogni posizione dei cursori: i punti disegnati
// soddisfano l'equazione e la definizione della conica con i fuochi calcolati (somma o differenza
// delle distanze, distanza dal fuoco uguale alla distanza dalla direttrice), LaTeX disegnabile.

import { describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { Rational } from "../../src/motore/numbers/rational";
import { COEFFICIENTS, WINDOW, checkConicParams, readConicParams, studyConic, type ConicKind } from "../../src/visualizzazioni/coniche-parametri-math";
import { stepValues } from "../../src/visualizzazioni/parametri";
import { draws, drawsText } from "../motore/helpers";
import { lessonParams } from "./helpers";

const R = (n: number, d = 1) => Rational.of(n, d);
const dist = (p: readonly [number, number], q: { x: number; y: number }) => Math.hypot(p[0] - q.x, p[1] - q.y);

describe("VIS.coniche-parametri: parametri", () => {
  it("senza parametri: le quattro coniche, si parte dalla circonferenza", () => {
    const reading = readConicParams({});
    expect(reading.ok && reading.setup.kinds).toEqual(["circonferenza", "parabola", "ellisse", "iperbole"]);
    expect(reading.ok && reading.setup.kind).toBe("circonferenza");
  });

  it("legge i parametri delle lezioni vere che la usano", () => {
    for (const params of lessonParams("VIS.coniche-parametri")) expect(checkConicParams(params), JSON.stringify(params)).toEqual([]);
  });

  it("accetta una sola conica e i suoi coefficienti", () => {
    const reading = readConicParams({ coniche: "parabola", coefficienti: "-1/2; 2; 3" });
    expect(reading.ok && reading.setup.coefficients.parabola.map((v) => v.toNumber())).toEqual([-0.5, 2, 3]);
    const hyper = readConicParams({ conica: "iperbole", coefficienti: "3; 3; -1" });
    expect(hyper.ok && hyper.setup.coefficients.iperbole.map((v) => v.toNumber())).toEqual([3, 3, -1]);
  });

  it("un parametro sbagliato dà un messaggio in italiano, mai un'eccezione", () => {
    const cases: [Record<string, string>, string][] = [
      [{ coniche: "parabola; retta" }, "«retta»"],
      [{ coniche: "parabola; parabola" }, "due volte"],
      [{ coniche: "parabola", conica: "ellisse" }, "Conica"],
      [{ coniche: "parabola", coefficienti: "0; 1; 2" }, "non può essere 0"],
      [{ coniche: "ellisse", coefficienti: "4" }, "ne servono 2"],
      [{ coniche: "ellisse", coefficienti: "4; 1/3" }, "multiplo di 1/2"],
      [{ coefficienti: "1; 2; 30" }, "tra -12 e 12"],
      [{ conica: "iperbole", coefficienti: "1; 1; 2" }, "1 oppure -1"],
      [{ colore: "blu" }, "non ha il parametro «colore»"],
    ];
    for (const [params, words] of cases) expect(checkConicParams(params).join(" "), JSON.stringify(params)).toContain(words);
  });
});

describe("VIS.coniche-parametri: elementi esatti", () => {
  it("la finestra ha le unità uguali", () => {
    expect((GRAPH_WIDTH - 12) / (WINDOW.xMax - WINDOW.xMin)).toBeCloseTo((GRAPH_HEIGHT - 12) / (WINDOW.yMax - WINDOW.yMin), 9);
  });

  it("i casi dei valori predefiniti, come sul libro", () => {
    const circle = studyConic("circonferenza", [R(-2), R(2), R(-7)]);
    expect(circle.equation).toBe("x^{2} + y^{2} - 2x + 2y - 7 = 0");
    expect(circle.facts.join(" ")).toContain(String.raw`C\left(1;\, -1\right)`);
    expect(circle.facts.join(" ")).toContain("r = 3");
    const parabola = studyConic("parabola", [R(1, 2), R(-1), R(-2)]);
    expect(parabola.equation).toBe(String.raw`y = \frac{1}{2}x^{2} - x - 2`);
    expect(parabola.facts.join(" ")).toContain(String.raw`V\left(1;\, -\frac{5}{2}\right)`);
    expect(parabola.facts.join(" ")).toContain(String.raw`F\left(1;\, -2\right)`);
    expect(parabola.facts.join(" ")).toContain("direttrice $y = -3$");
    const ellipse = studyConic("ellisse", [R(4), R(2)]);
    expect(ellipse.facts.join(" ")).toContain(String.raw`c = \sqrt{a^{2} - b^{2}} = 2\sqrt{3}`);
    expect(ellipse.facts.join(" ")).toContain(String.raw`F_1\left(-2\sqrt{3};\, 0\right)`);
    expect(ellipse.facts.join(" ")).toContain(String.raw`e = \frac{c}{a} = \frac{\sqrt{3}}{2}`);
    const hyperbola = studyConic("iperbole", [R(2), R(1), R(1)]);
    expect(hyperbola.facts.join(" ")).toContain(String.raw`= \sqrt{5}`);
    expect(hyperbola.facts.join(" ")).toContain(String.raw`y = \pm \frac{1}{2}x`);
  });

  it("i casi particolari a parole", () => {
    expect(studyConic("circonferenza", [R(0), R(0), R(1)]).facts.join(" ")).toContain("nessun punto");
    expect(studyConic("circonferenza", [R(2), R(0), R(1)]).facts.join(" ")).toContain("un solo punto");
    expect(studyConic("ellisse", [R(3), R(3)]).facts.join(" ")).toContain("circonferenza");
    expect(studyConic("iperbole", [R(2), R(2), R(-1)]).facts.join(" ")).toContain("equilatera");
    expect(studyConic("ellisse", [R(1), R(3)]).facts.join(" ")).toContain("Fuochi sull'asse $y$");
  });

  it("controllo a tappeto: i punti disegnati soddisfano equazione e definizione con i fuochi calcolati", () => {
    let checked = 0;
    const every = (kind: ConicKind) => {
      const lists = COEFFICIENTS[kind].map((item) => stepValues(item.range));
      const combos: Rational[][] = [[]];
      for (const list of lists) {
        const next: Rational[][] = [];
        for (const combo of combos) for (const value of list) if (!(kind === "iperbole" && combo.length === 2 && value.isZero())) next.push([...combo, value]);
        combos.splice(0, combos.length, ...next);
      }
      return combos;
    };
    for (const kind of ["circonferenza", "parabola", "ellisse", "iperbole"] as const) {
      for (const values of every(kind)) {
        const study = studyConic(kind, values);
        const [a, b, c] = values.map((v) => v.toNumber()) as [number, number, number];
        for (const segment of study.segments) {
          for (const p of segment.filter((_, k) => k % 15 === 0)) {
            const [x, y] = p;
            if (Math.abs(y) > 40) continue; // la parabola è tagliata in una fascia attorno alla finestra
            switch (kind) {
              case "circonferenza":
                expect(x * x + y * y + a * x + b * y + c).toBeCloseTo(0, 6);
                break;
              case "parabola": {
                expect(y).toBeCloseTo(a * x * x + b * x + c, 6);
                const directrix = study.lines.find((line) => line.role === "direttrice");
                expect(directrix?.kind).toBe("sloped");
                if (directrix?.kind === "sloped") expect(dist(p, study.foci[0]!)).toBeCloseTo(Math.abs(y - directrix.q), 6);
                break;
              }
              case "ellisse":
                expect((x * x) / (a * a) + (y * y) / (b * b)).toBeCloseTo(1, 6);
                if (study.foci.length === 2) expect(dist(p, study.foci[0]!) + dist(p, study.foci[1]!)).toBeCloseTo(2 * Math.max(a, b), 6);
                break;
              case "iperbole":
                expect((x * x) / (a * a) - (y * y) / (b * b)).toBeCloseTo(c, 4);
                expect(Math.abs(dist(p, study.foci[0]!) - dist(p, study.foci[1]!))).toBeCloseTo(2 * (c > 0 ? a : b), 4);
                break;
            }
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50_000);
  });

  it("tutto il LaTeX si disegna con KaTeX", () => {
    for (const [kind, values] of [
      ["circonferenza", [R(-5), R(3), R(-12)]], ["circonferenza", [R(6), R(6), R(12)]], ["parabola", [R(-5, 2), R(-6), R(6)]],
      ["ellisse", [R(11, 2), R(1, 2)]], ["ellisse", [R(1, 2), R(1, 2)]], ["iperbole", [R(3, 2), R(5), R(-1)]], ["iperbole", [R(6), R(6), R(1)]],
    ] as const) {
      const study = studyConic(kind, values);
      draws(study.equation);
      for (const fact of study.facts) drawsText(fact);
    }
  });
});
