// VIS.disequazioni-grafico, la parte matematica: lettura dei parametri (anche quelli delle lezioni
// vere), soluzione esatta confrontata con i valori della funzione, tabella dei segni, barre sull'asse,
// sonda, LaTeX disegnabile con KaTeX.

import { describe, expect, it } from "vitest";
import { evaluate, type Expr } from "../../src/motore/expr";
import { Rational } from "../../src/motore/numbers/rational";
import { atLeast, closed, greaterThan, isAllReals, isEmptySet, lessThan, realSet, setsEqual, setUnion, type RealSet } from "../../src/motore/sets";
import {
  RELATIONS, approximate, approximateLatex, cellAt, checkInequalityParams, inequalityLatex, readInequalityParams, shiftedLatex, snapThreshold, solutionBars,
  solutionLatex, studyInequality, type InequalitySetup,
} from "../../src/visualizzazioni/disequazioni-grafico-math";
import { draws } from "../motore/helpers";
import { lessonParams as lessonsUsing } from "./helpers";

const lessonParams = () => lessonsUsing("VIS.disequazioni-grafico");

function setupOf(params: Record<string, string>): InequalitySetup {
  const reading = readInequalityParams(params);
  if (!reading.ok) throw new Error(reading.problems.join("\n"));
  return reading.setup;
}

const fn = (setup: InequalitySetup, index = 0) => setup.functions[index]!;
const solve = (text: string, k: number | Rational, relation: (typeof RELATIONS)[number]) => {
  const setup = setupOf({ funzione: text });
  return studyInequality(fn(setup).rational, k instanceof Rational ? k : Rational.from(k), relation);
};

/** x è nell'insieme? (solo numeri: per il confronto con i valori della funzione) */
function contains(set: RealSet, x: number): boolean {
  return set.pieces.some((piece) => {
    const lower = piece.lower === "-inf" ? -Infinity : evaluate(piece.lower as Expr);
    const upper = piece.upper === "+inf" ? Infinity : evaluate(piece.upper as Expr);
    return (x > lower || (piece.lowerClosed && x === lower)) && (x < upper || (piece.upperClosed && x === upper));
  });
}

describe("VIS.disequazioni-grafico: parametri", () => {
  it("senza parametri usa i valori predefiniti della scheda", () => {
    const setup = setupOf({});
    expect(setup.functions.map((f) => f.text)).toEqual(["(x-1)/(x+2)"]);
    expect(setup.threshold.toNumber()).toBe(0);
    expect(setup.relation).toBe(">");
    expect(setup.window).toEqual({ xMin: -6, xMax: 6, yMin: -4, yMax: 4 });
    expect([setup.thresholdMin.toNumber(), setup.thresholdMax.toNumber()]).toEqual([-4, 4]);
  });

  it("legge i parametri di tutte le lezioni vere che la usano", () => {
    const all = lessonParams();
    expect(all.length).toBeGreaterThanOrEqual(1);
    for (const params of all) expect(checkInequalityParams(params), JSON.stringify(params)).toEqual([]);
  });

  it("accetta i versi con i simboli e le soglie a mezzi", () => {
    expect(setupOf({ verso: "≥" }).relation).toBe(">=");
    expect(setupOf({ verso: "<=" }).relation).toBe("<=");
    expect(setupOf({ soglia: "-3/2" }).threshold.toNumber()).toBe(-1.5);
    expect(setupOf({ soglia: "2,5" }).threshold.toNumber()).toBe(2.5);
    expect(setupOf({ funzione: "x^2 - 4; (x-3)^2/(x^2+1)" }).functions).toHaveLength(2);
  });

  it("un parametro sbagliato dà un messaggio in italiano, mai un'eccezione", () => {
    const cases: [Record<string, string>, string][] = [
      [{ funzione: "sqrt(x)" }, "frazione di polinomi"],
      [{ funzione: "x^3 - x" }, "grado maggiore di 2"],
      [{ funzione: "(2x+4)/(x+2)" }, "costante"],
      [{ funzione: "(x-1/(x+2)" }, "non si legge"],
      [{ funzione: "x; " }, "vuota"],
      [{ funzione: "x; x^2; 1/x; x/(x+1); 2x" }, "Al più 4"],
      [{ soglia: "1/3" }, "multiplo di 1/2"],
      [{ soglia: "pi" }, "razionale"],
      [{ soglia: "9" }, "fuori dalla finestra"],
      [{ verso: "=" }, "Verso"],
      [{ finestra: "1; 2; 3" }, "4"],
      [{ colore: "rosso" }, "non ha il parametro «colore»"],
    ];
    for (const [params, words] of cases) {
      const problems = checkInequalityParams(params);
      expect(problems.join(" "), JSON.stringify(params)).toContain(words);
    }
  });
});

describe("VIS.disequazioni-grafico: soluzione", () => {
  it("ritrova gli esempi svolti della lezione V1.M06.L04", () => {
    const first = solve("(x-1)/(x+2)", 0, ">=");
    expect(setsEqual(first.solution, setUnion(lessThan(-2), atLeast(1)) as RealSet)).toBe(true);
    expect(first.table.rows.map((row) => row.label)).toEqual(["x - 1", "x + 2"]);

    const second = solve("(x+1)/(x-2)", 1, ">");
    expect(setsEqual(second.solution, greaterThan(2))).toBe(true);
    expect(second.table.rows.map((row) => row.label)).toEqual(["3", "x - 2"]);
    expect(second.crossings).toEqual([]);

    const third = solve("(x^2-5x+6)/(x+1)", 0, "<=");
    expect(setsEqual(third.solution, setUnion(lessThan(-1), closed(2, 3)) as RealSet)).toBe(true);
  });

  it("un fattore che si semplifica lascia il punto fuori dalla soluzione", () => {
    const study = solve("(x^2-1)/(x-1)", 2, ">=");
    expect(setsEqual(study.solution, greaterThan(1))).toBe(true);
    expect(study.crossings).toEqual([]);
  });

  it("i punti di incontro con la retta sono esatti, anche irrazionali", () => {
    expect(solve("(x-1)/(x+2)", Rational.of(1, 2), ">").crossings.map((x) => evaluate(x))).toEqual([4]);
    const study = solve("x^2 - 2x", 1, "<=");
    // x² − 2x − 1 = 0: x = 1 ± √2
    expect(study.crossings.map((x) => evaluate(x))).toEqual([1 - Math.SQRT2, 1 + Math.SQRT2]);
    expect(setsEqual(study.solution, realSet(...closed(study.crossings[0]!, study.crossings[1]!).pieces))).toBe(true);
  });

  it("senza punti di incontro la soluzione è tutto o niente (dove la funzione esiste)", () => {
    expect(isAllReals(solve("x^2 + 1", 0, ">").solution)).toBe(true);
    expect(isEmptySet(solve("x^2 + 1", 0, "<").solution)).toBe(true);
    // 1/x ≥ 0: tutto tranne i negativi e lo zero, dove 1/x non esiste.
    expect(setsEqual(solve("1/x", 0, ">=").solution, greaterThan(0))).toBe(true);
  });

  it("per ogni funzione delle lezioni, ogni soglia del cursore e ogni verso, la soluzione è dove vale f(x) rel k", () => {
    const configurations = [...lessonParams(), {}, { funzione: "x^2 - 2x; (x-3)^2/(x^2+1); 1/x; (x^2-1)/(x-1)" }];
    let checked = 0;
    for (const params of configurations) {
      const setup = setupOf(params);
      for (const f of setup.functions) {
        for (let halves = setup.thresholdMin.mul(2).toNumber(); halves <= setup.thresholdMax.mul(2).toNumber(); halves++) {
          const k = Rational.of(halves, 2);
          for (const relation of RELATIONS) {
            const study = studyInequality(f.rational, k, relation);
            const points = study.table.points.map((point) => evaluate(point));
            for (let i = 0; i <= 120; i++) {
              const x = setup.window.xMin + ((setup.window.xMax - setup.window.xMin) * (i + 0.37)) / 121;
              if (points.some((p) => Math.abs(p - x) < 1e-6)) continue;
              const y = evaluate(f.expr, { x }) - k.toNumber();
              const holds = relation === ">" ? y > 0 : relation === ">=" ? y >= 0 : relation === "<" ? y < 0 : y <= 0;
              expect(contains(study.solution, x), `${f.text} ${relation} ${k}, x = ${x}`).toBe(holds);
              checked++;
            }
            // Nei punti della tabella: dentro solo gli zeri di f − k con ≥ o ≤, mai dove f non esiste.
            study.table.points.forEach((point, index) => {
              const sign = study.table.result.cells[2 * index + 1];
              const inside = (sign === "0" && (relation === ">=" || relation === "<=")) || (sign === "+" && relation[0] === ">") || (sign === "-" && relation[0] === "<");
              expect(contains(study.solution, evaluate(point)), `${f.text} ${relation} ${k} nel punto ${evaluate(point)}`).toBe(inside);
              expect(study.solutionCells[2 * index + 1]).toBe(inside);
            });
            // Il LaTeX mostrato si disegna.
            draws(shiftedLatex(k, study));
            draws(inequalityLatex(f.expr, k, relation));
            draws(solutionLatex(study.solution));
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10_000);
  }, 60_000);
});

describe("VIS.disequazioni-grafico: disegno e sonda", () => {
  it("le barre sull'asse x seguono la soluzione, tagliate alla finestra", () => {
    const window = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };
    const bars = solutionBars(setUnion(lessThan(-2), atLeast(1)) as RealSet, window);
    expect(bars).toEqual([
      { from: -6, to: -2, fromClosed: null, toClosed: false },
      { from: 1, to: 6, fromClosed: true, toClosed: null },
    ]);
    expect(solutionBars(greaterThan(9), window)).toEqual([]);
  });

  it("la sonda trova la casella della tabella: intervallo o punto", () => {
    const { table } = solve("(x-1)/(x+2)", 0, ">=");
    expect(cellAt(table, -5)).toBe(0);
    expect(cellAt(table, -2)).toBe(1);
    expect(cellAt(table, 0)).toBe(2);
    expect(cellAt(table, 1)).toBe(3);
    expect(cellAt(table, 3)).toBe(4);
  });

  it("la soglia si aggancia ai mezzi e resta nella finestra", () => {
    const min = Rational.from(-4);
    const max = Rational.from(4);
    expect(snapThreshold(1.26, min, max).toNumber()).toBe(1.5);
    expect(snapThreshold(-0.2, min, max).toNumber()).toBe(0);
    expect(snapThreshold(12, min, max).toNumber()).toBe(4);
    expect(snapThreshold(-12, min, max).toNumber()).toBe(-4);
  });

  it("i numeri approssimati sono all'italiana", () => {
    expect(approximate(1.256)).toBe("1,26");
    expect(approximate(-0.5)).toBe("−0,5");
    expect(approximate(-0.001)).toBe("0");
    expect(approximateLatex(-4.98)).toBe("-4{,}98");
    draws(`x \\approx ${approximateLatex(-4.98)}`);
  });
});
