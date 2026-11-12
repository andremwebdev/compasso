// Tabella dei segni per le disequazioni (specifica, sezione 6): i dati (zeri in ordine, una riga
// per fattore, la riga del risultato), la scrittura in LaTeX, la soluzione che se ne ricava e i
// passaggi dello studio del segno.

import { exprToUPoly, surdToExpr } from "../algebra/expand";
import { upDegree, upFactor } from "../algebra/upoly";
import { EngineError } from "../errors";
import { evaluate } from "../expr/evaluate";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { isConstant } from "../expr/walk";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import { setToLatex } from "../sets/latex";
import { canonicalSet, compareConstants } from "../sets/operations";
import type { Interval, RealSet } from "../sets/types";
import type { Step } from "../steps/types";

/** Il segno in una casella: positivo, negativo, nullo, oppure «non esiste» (denominatore nullo, funzione non definita). */
export type Sign = "+" | "-" | "0" | "undefined";

export interface SignRow {
  /** L'espressione della riga, in LaTeX. */
  readonly label: string;
  /**
   * Le caselle da sinistra a destra: intervallo, punto, intervallo, punto, …, intervallo.
   * Con n punti sono 2n + 1; la casella 2i + 1 è quella del punto i.
   */
  readonly cells: readonly Sign[];
}

export interface SignTable {
  readonly kind: "signtable";
  readonly variable: string;
  /** I punti in cui un fattore si annulla o non è definito, in ordine crescente. */
  readonly points: readonly Expr[];
  /** Una riga per fattore. */
  readonly rows: readonly SignRow[];
  /** La riga del prodotto o del quoziente. */
  readonly result: SignRow;
}

export interface SignFactor {
  readonly expr: Expr;
  /** Se il fattore sta al numeratore (caso normale) o al denominatore: dove si annulla un denominatore il risultato non esiste. */
  readonly role?: "numerator" | "denominator";
  /**
   * Gli zeri del fattore. Per un polinomio si possono omettere: il motore li trova (radici razionali
   * o di secondo grado). Per gli altri fattori li dà il generatore, che li conosce.
   */
  readonly zeros?: readonly Expr[];
}

export interface SignTableOptions {
  /** La lettera dell'incognita. Se manca: x. */
  readonly variable?: string;
  /** Altri punti da mettere in tabella (per esempio dove un fattore non è definito). */
  readonly extraPoints?: readonly Expr[];
  /** Etichetta della riga del risultato, in LaTeX. Se manca: il prodotto o il quoziente dei fattori. */
  readonly label?: string;
}

/** Sotto questa soglia un valore numerico non permette di decidere il segno. */
const TINY = 1e-9;

/** Gli zeri reali di un polinomio a coefficienti razionali, esatti e in ordine crescente. */
export function realZeros(expr: Expr, variable = "x"): Expr[] {
  const p = exprToUPoly(expr, variable);
  if (!p) throw new EngineError("realZeros: non è un polinomio; gli zeri vanno indicati dal generatore.");
  if (upDegree(p) < 1) return [];
  const zeros: Surd[] = [];
  for (const { poly } of upFactor(p).factors) {
    const degree = upDegree(poly);
    if (degree === 1) {
      zeros.push(Surd.from((poly[0] as Rational).neg().div(poly[1] as Rational)));
    } else if (degree === 2) {
      const [c, b, a] = poly as [Rational, Rational, Rational];
      const discriminant = b.mul(b).sub(a.mul(c).mul(4));
      if (discriminant.sign() < 0) continue;
      const center = Surd.from(b.neg().div(a.mul(2)));
      const offset = Surd.sqrt(discriminant).div(a.mul(2));
      zeros.push(center.sub(offset), center.add(offset));
    } else {
      throw new EngineError("realZeros: il polinomio ha un fattore irriducibile di grado maggiore di 2; gli zeri vanno indicati dal generatore.");
    }
  }
  return zeros.sort((x, y) => x.cmp(y)).map(surdToExpr);
}

function numericSign(value: number, what: string): Sign {
  if (Number.isNaN(value)) return "undefined";
  if (Math.abs(value) < TINY) throw new EngineError(`Tabella dei segni: ${what} ha uno zero che non è stato indicato.`);
  return value > 0 ? "+" : "-";
}

/** I punti ordinati e senza ripetizioni. */
function sortedPoints(points: readonly Expr[]): Expr[] {
  const result: Expr[] = [];
  for (const point of [...points].sort(compareConstants)) {
    const last = result[result.length - 1];
    if (!last || compareConstants(last, point) !== 0) result.push(point);
  }
  return result;
}

/** I valori in cui provare il segno: uno per ogni casella (intervallo, punto, intervallo, …). */
export function samplePositions(points: readonly Expr[]): number[] {
  const values = points.map((point) => evaluate(point));
  if (values.length === 0) return [0];
  const positions: number[] = [(values[0] as number) - 1];
  values.forEach((value, index) => {
    positions.push(value);
    const next = values[index + 1];
    positions.push(next === undefined ? value + 1 : (value + next) / 2);
  });
  return positions;
}

/** Il segno del prodotto (o del quoziente) in una casella, dai segni dei fattori. */
function combine(signs: readonly Sign[], roles: readonly ("numerator" | "denominator")[]): Sign {
  if (signs.some((sign, index) => sign === "undefined" || (sign === "0" && roles[index] === "denominator"))) return "undefined";
  if (signs.includes("0")) return "0";
  return signs.filter((sign) => sign === "-").length % 2 === 0 ? "+" : "-";
}

/**
 * Costruisce la tabella dei segni di un prodotto o di un quoziente di fattori.
 * Il segno di ogni fattore tra due punti consecutivi si legge in un punto di prova: è sicuro perché
 * tutti gli zeri dei fattori sono punti della tabella.
 */
export function signTable(factors: readonly SignFactor[], options: SignTableOptions = {}): SignTable {
  if (factors.length === 0) throw new EngineError("Tabella dei segni: serve almeno un fattore.");
  const variable = options.variable ?? "x";
  const zeros = factors.map((factor) => factor.zeros ?? (isConstant(factor.expr) ? [] : realZeros(factor.expr, variable)));
  const points = sortedPoints([...zeros.flat(), ...(options.extraPoints ?? [])]);
  const positions = samplePositions(points);
  const roles = factors.map((factor) => factor.role ?? "numerator");

  const rows: SignRow[] = factors.map((factor, index) => {
    const label = toLatex(factor.expr);
    const cells = positions.map((position, cell): Sign => {
      const point = cell % 2 === 1 ? points[(cell - 1) / 2] : undefined;
      if (point && (zeros[index] as readonly Expr[]).some((zero) => compareConstants(zero, point) === 0)) return "0";
      return numericSign(evaluate(factor.expr, { [variable]: position }), `$${label}$`);
    });
    return { label, cells };
  });

  const product = (parts: readonly Expr[]): Expr => (parts.length === 1 ? (parts[0] as Expr) : { kind: "mul", factors: parts });
  const numerators = factors.filter((_, index) => roles[index] === "numerator").map((factor) => factor.expr);
  const denominators = factors.filter((_, index) => roles[index] === "denominator").map((factor) => factor.expr);
  const top: Expr = numerators.length > 0 ? product(numerators) : { kind: "num", value: Rational.ONE };
  const label = options.label ?? toLatex(denominators.length > 0 ? { kind: "div", num: top, den: product(denominators) } : top);
  const result: SignRow = { label, cells: positions.map((_, cell) => combine(rows.map((row) => row.cells[cell] as Sign), roles)) };
  return { kind: "signtable", variable, points, rows, result };
}

/** Il verso di una disequazione rispetto allo zero. */
export type SignRelation = ">" | ">=" | "<" | "<=";

/** L'insieme in cui il risultato della tabella ha il segno chiesto: è la soluzione della disequazione. */
export function solutionFromSigns(table: SignTable, relation: SignRelation): RealSet {
  const wanted: Sign = relation === ">" || relation === ">=" ? "+" : "-";
  const withZeros = relation === ">=" || relation === "<=";
  const pieces: Interval[] = [];
  table.result.cells.forEach((sign, cell) => {
    if (cell % 2 === 1) {
      const point = table.points[(cell - 1) / 2] as Expr;
      if (withZeros && sign === "0") pieces.push({ lower: point, upper: point, lowerClosed: true, upperClosed: true });
    } else if (sign === wanted) {
      const lower = cell === 0 ? "-inf" : (table.points[cell / 2 - 1] as Expr);
      const upper = table.points[cell / 2] ?? "+inf";
      pieces.push({ lower, upper, lowerClosed: false, upperClosed: false });
    }
  });
  return canonicalSet({ kind: "realset", pieces }) as RealSet;
}

const SIGN_LATEX: Readonly<Record<Sign, string>> = { "+": "+", "-": "-", "0": "0", undefined: "\\nexists" };

/** La tabella dei segni in LaTeX: i punti in alto, una riga per fattore, sotto la linea il risultato. */
export function signTableToLatex(table: SignTable): string {
  const header = [toLatex({ kind: "sym", name: table.variable }), ...table.result.cells.map((_, cell) => (cell % 2 === 1 ? toLatex(table.points[(cell - 1) / 2] as Expr) : ""))];
  const line = (row: SignRow): string => [row.label, ...row.cells.map((sign) => SIGN_LATEX[sign])].join(" & ");
  const body = [header.join(" & "), "\\hline " + table.rows.map(line).join(" \\\\ "), "\\hline " + line(table.result)].join(" \\\\ ");
  return `\\begin{array}{c|${"c".repeat(table.result.cells.length)}} ${body} \\end{array}`;
}

const RELATION_WORDS: Readonly<Record<SignRelation, string>> = {
  ">": "positivo",
  ">=": "positivo o nullo",
  "<": "negativo",
  "<=": "negativo o nullo",
};

/** I passaggi dello studio del segno: gli zeri di ogni fattore, la tabella, la soluzione. */
export function signStudySteps(table: SignTable, relation: SignRelation): { readonly solution: RealSet; readonly steps: readonly Step[] } {
  const x = toLatex({ kind: "sym", name: table.variable });
  const steps: Step[] = table.rows.map((row) => {
    const zeros = table.points.filter((_, index) => row.cells[2 * index + 1] === "0").map((point) => `$${x} = ${toLatex(point)}$`);
    const where = zeros.length === 0 ? "non si annulla mai" : `si annulla per ${zeros.join(" e per ")}`;
    return { text: `Studia il segno di $${row.label}$: ${where}.` };
  });
  steps.push({
    text: "Riporta i segni in una tabella e, colonna per colonna, applica la regola dei segni. Dove si annulla un denominatore il risultato non esiste.",
    formula: signTableToLatex(table),
  });
  const solution = solutionFromSigns(table, relation);
  steps.push({
    text: `La disequazione chiede dove $${table.result.label}$ è ${RELATION_WORDS[relation]}: si leggono gli intervalli dall'ultima riga.`,
    formula: `S = ${setToLatex(solution)}`,
  });
  return { solution, steps };
}
