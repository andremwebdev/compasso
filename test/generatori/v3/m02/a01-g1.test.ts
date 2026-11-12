// V3.M02.A01.g1 (sistemi lineari con il metodo di Gauss): verifica automatica e riconoscimento degli errori.

import { describe, expect, it } from "vitest";
import { evaluateResponse, generateExercise } from "../../../../src/esercizi";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator, { systemOf } from "../../../../src/generatori/v3/m02/a01-g1";
import { toLatex } from "../../../../src/motore/expr";
import { columnVector, gaussElimination, matricesEquivalent, matrix, solveLinearSystem, type Matrix } from "../../../../src/motore/linalg";

/** Le caselle come le riempirebbe Andrea: una per riga, con la frazione scritta a/b. */
const cells = (m: Matrix): string[][] => m.rows.map((row) => row.map((entry) => toLatex(entry).replace(/\\frac\{(-?\d+)\}\{(\d+)\}/, "$1/$2")));

describe("V3.M02.A01.g1 — sistemi lineari con il metodo di Gauss", () => {
  it("supera la verifica automatica (2.000 semi per livello, zero problemi e zero avvisi)", () => {
    const report = verifyGenerator(generator);
    expect(report.problems, formatReport(report)).toEqual([]);
    expect(report.warnings).toEqual([]);
  }, 120_000);

  it("la soluzione nelle caselle è giusta e gli errori tipici sono riconosciuti", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 200; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "matrix") throw new Error("tipo di risposta inatteso");
        const { correct, wrong } = exercise.answer;
        // Due equazioni: due errori tipici. Tre equazioni: tre, così l'esercizio può diventare una scelta multipla.
        expect(wrong.length, `livello ${level}, seme ${seed}`).toBe(level === 1 ? 2 : 3);
        expect(evaluateResponse(exercise, { kind: "matrix", cells: cells(correct) }).outcome).toBe("correct");
        for (const candidate of wrong) {
          expect(evaluateResponse(exercise, { kind: "matrix", cells: cells(candidate.value) })).toMatchObject({ outcome: "wrong", error: candidate.error });
        }
      }
    }
  });

  it("«termini noti non aggiornati» è davvero quello che si ottiene riducendo con il motore la sola matrice dei coefficienti", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const exercise = generateExercise(generator, level, seed);
        if (exercise.answer.kind !== "matrix") throw new Error("tipo di risposta inatteso");
        const { a, b } = systemOf(level, seed);
        // Riduzione a scala dei soli coefficienti, poi il sistema risolto con i termini noti di partenza.
        const echelon = gaussElimination(matrix(a)).matrix;
        const solved = solveLinearSystem(echelon, columnVector(b));
        const slip = exercise.answer.wrong.find((wrong) => wrong.error === "ALIN.GAUSS_TERMINE_NOTO");
        expect(solved.kind).toBe("unique");
        if (solved.kind === "unique" && slip) expect(matricesEquivalent(solved.solution, slip.value), `livello ${level}, seme ${seed}`).toBe(true);
        expect(slip).toBeDefined();
      }
    }
  });

  it("al livello 3 il primo coefficiente è zero: serve uno scambio di righe", () => {
    for (let seed = 0; seed < 50; seed++) {
      const exercise = generateExercise(generator, 3, seed);
      expect(exercise.steps.some((step) => step.text.includes("\\leftrightarrow")), `seme ${seed}`).toBe(true);
    }
  });

  it("una casella vuota non è un tentativo", () => {
    const exercise = generateExercise(generator, 1, 0);
    expect(evaluateResponse(exercise, { kind: "matrix", cells: [["1"], [""]] }).outcome).toBe("invalid");
  });
});
