// Tabella di variazione per gli studi di funzione (specifica, sezione 6): segno della derivata,
// andamento della funzione, massimi e minimi. Come per la tabella dei segni: dati più LaTeX.

import { simplify } from "../algebra/simplify";
import { derive } from "../calculus/derive";
import { EngineError } from "../errors";
import { evaluate } from "../expr/evaluate";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { substitute } from "../expr/walk";
import { compareConstants } from "../sets/operations";
import { realZeros, samplePositions, type Sign } from "./sign-table";

/** Andamento della funzione su un intervallo. */
export type Trend = "increasing" | "decreasing" | "constant" | "undefined";

/** Che cosa succede in un punto della tabella. */
export type PointNature = "max" | "min" | "flex" | "none" | "undefined";

export interface VariationPoint {
  readonly x: Expr;
  /** La derivata nel punto: nulla, positiva, negativa, oppure non esiste. */
  readonly derivative: Sign;
  /** Il valore della funzione nel punto; null se lì non è definita. */
  readonly value: Expr | null;
  /** Massimo o minimo relativo, flesso a tangente orizzontale, niente di speciale, oppure punto fuori dal dominio. */
  readonly nature: PointNature;
}

export interface VariationTable {
  readonly kind: "variationtable";
  readonly variable: string;
  readonly points: readonly VariationPoint[];
  /** Segno della derivata sugli intervalli: uno in più dei punti. */
  readonly derivativeSigns: readonly Sign[];
  /** Andamento della funzione sugli stessi intervalli. */
  readonly trends: readonly Trend[];
}

export interface VariationOptions {
  /** La lettera della variabile. Se manca: x. */
  readonly variable?: string;
  /**
   * I punti della tabella: dove la derivata si annulla e dove funzione o derivata non sono definite.
   * Se mancano e la derivata è un polinomio, il motore usa i suoi zeri.
   */
  readonly points?: readonly Expr[];
  /** La derivata, se il generatore l'ha già calcolata. */
  readonly derivative?: Expr;
}

const TINY = 1e-9;

/** Costruisce la tabella di variazione di una funzione. */
export function variationTable(f: Expr, options: VariationOptions = {}): VariationTable {
  const variable = options.variable ?? "x";
  const derivative = options.derivative ?? derive(f, variable);
  const given = options.points ?? realZeros(derivative, variable);
  const xs: Expr[] = [];
  for (const point of [...given].sort(compareConstants)) {
    const last = xs[xs.length - 1];
    if (!last || compareConstants(last, point) !== 0) xs.push(point);
  }
  const positions = samplePositions(xs);
  const derivativeSigns: Sign[] = [];
  const trends: Trend[] = [];
  for (let cell = 0; cell < positions.length; cell += 2) {
    const position = positions[cell] as number;
    const slope = evaluate(derivative, { [variable]: position });
    if (Number.isNaN(slope) || Number.isNaN(evaluate(f, { [variable]: position }))) {
      derivativeSigns.push("undefined");
      trends.push("undefined");
    } else if (Math.abs(slope) < TINY) {
      // Derivata nulla in un punto di prova: o la funzione è costante sull'intervallo, o manca un punto in tabella.
      const nearby = evaluate(derivative, { [variable]: position + 0.123 * Math.min(1, Math.abs((positions[cell + 1] ?? position + 1) - position)) });
      if (Number.isNaN(nearby) || Math.abs(nearby) >= TINY) throw new EngineError("Tabella di variazione: la derivata ha uno zero che non è tra i punti indicati.");
      derivativeSigns.push("0");
      trends.push("constant");
    } else {
      derivativeSigns.push(slope > 0 ? "+" : "-");
      trends.push(slope > 0 ? "increasing" : "decreasing");
    }
  }

  const points = xs.map((x, index): VariationPoint => {
    const position = positions[2 * index + 1] as number;
    const defined = !Number.isNaN(evaluate(f, { [variable]: position }));
    const slope = evaluate(derivative, { [variable]: position });
    const sign: Sign = Number.isNaN(slope) ? "undefined" : Math.abs(slope) < TINY ? "0" : slope > 0 ? "+" : "-";
    const [before, after] = [trends[index] as Trend, trends[index + 1] as Trend];
    let nature: PointNature = "none";
    if (!defined) nature = "undefined";
    else if (before === "increasing" && after === "decreasing") nature = "max";
    else if (before === "decreasing" && after === "increasing") nature = "min";
    else if (sign === "0" && before === after && (before === "increasing" || before === "decreasing")) nature = "flex";
    return { x, derivative: defined ? sign : "undefined", value: defined ? simplify(substitute(f, { [variable]: x })) : null, nature };
  });
  return { kind: "variationtable", variable, points, derivativeSigns, trends };
}

const SIGN_LATEX: Readonly<Record<Sign, string>> = { "+": "+", "-": "-", "0": "0", undefined: "\\nexists" };
const TREND_LATEX: Readonly<Record<Trend, string>> = { increasing: "\\nearrow", decreasing: "\\searrow", constant: "\\rightarrow", undefined: "\\nexists" };

/** La tabella di variazione in LaTeX: i punti, il segno di f′, l'andamento di f con i valori nei punti. */
export function variationTableToLatex(table: VariationTable, functionName = "f"): string {
  const x = toLatex({ kind: "sym", name: table.variable });
  const weave = (onIntervals: readonly string[], onPoints: readonly string[]): string[] =>
    onIntervals.flatMap((cell, index) => (index < onPoints.length ? [cell, onPoints[index] as string] : [cell]));
  const header = [x, ...weave(table.trends.map(() => ""), table.points.map((point) => toLatex(point.x)))];
  const slopes = [`${functionName}'(${x})`, ...weave(table.derivativeSigns.map((sign) => SIGN_LATEX[sign]), table.points.map((point) => SIGN_LATEX[point.derivative]))];
  const values = [`${functionName}(${x})`, ...weave(table.trends.map((trend) => TREND_LATEX[trend]), table.points.map((point) => (point.value ? toLatex(point.value) : "\\nexists")))];
  const body = [header.join(" & "), `\\hline ${slopes.join(" & ")}`, `\\hline ${values.join(" & ")}`].join(" \\\\ ");
  return `\\begin{array}{c|${"c".repeat(2 * table.points.length + 1)}} ${body} \\end{array}`;
}

/** I massimi e i minimi relativi letti dalla tabella. */
export function extrema(table: VariationTable): { readonly x: Expr; readonly value: Expr; readonly nature: "max" | "min" }[] {
  return table.points.flatMap((point) =>
    (point.nature === "max" || point.nature === "min") && point.value ? [{ x: point.x, value: point.value, nature: point.nature }] : [],
  );
}
