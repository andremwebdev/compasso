// VIS.esponenziale-logaritmo, la matematica (scheda in docs/VISUALIZZAZIONI.md): legge i parametri
// della lezione e, per una base a esatta (razionale oppure e), prepara i grafici di a^x, log_a x e
// y = x nella finestra con le unità uguali, i punti notevoli esatti e le proprietà a parole. Niente Preact.

import { plotGraph, type Graph, type GraphWindow } from "../motore/display";
import { e, evaluate, literalRational, ln, log, num, pow, sym, toLatex, type Expr } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { parseExpression } from "../motore/parser";
import { equalScaleWindow, readStepRational, readYesNo, unknownParams, type StepRange } from "./parametri";

/** Le basi del cursore, in ordine crescente: razionali esatti ed e. */
export const BASES: readonly Expr[] = [
  ...([[1, 5], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [4, 3], [3, 2], [2, 1]] as const).map(([n, d]): Expr => ({ kind: "num", value: Rational.of(n, d) })),
  e,
  num(3),
  num(4),
  num(5),
];

/** La finestra, fissa: unità uguali sui due assi, perché la simmetria rispetto a y = x si veda. */
export const WINDOW: GraphWindow = equalScaleWindow(-4, 6, 1);

/** Il punto P: t tra −3 e 3, a passi di 1/10. */
export const POINT_RANGE: StepRange = { step: Rational.of(1, 10), min: Rational.of(-3), max: Rational.of(3) };

export const DEFAULT_PARAMS = { base: "2", punto: "1", logaritmo: "sì" } as const;
const KNOWN_PARAMS = Object.keys(DEFAULT_PARAMS);

export interface ExpLogSetup {
  /** L'indice della base iniziale in BASES. */
  readonly base: number;
  readonly point: number;
  readonly showLog: boolean;
}

export type ExpLogReading = { readonly ok: true; readonly setup: ExpLogSetup } | { readonly ok: false; readonly problems: readonly string[] };

const x = sym("x");

/** L'indice della base scritta (`2`, `1/2`, `e`, `0,5`) tra quelle del cursore, o -1. */
export function baseIndex(text: string): number {
  const parsed = parseExpression(text);
  if (!parsed.ok || !parsed.complete) return -1;
  const value = literalRational(parsed.value);
  if (!value) return toLatex(parsed.value) === "e" ? BASES.indexOf(e) : -1;
  return BASES.findIndex((base) => base !== e && literalRational(base)?.eq(value));
}

/** Legge i parametri del blocco. Non lancia mai. */
export function readExpLogParams(params: Readonly<Record<string, string>>): ExpLogReading {
  const problems = unknownParams(params, KNOWN_PARAMS);
  const value = (key: keyof typeof DEFAULT_PARAMS): string => params[key] ?? DEFAULT_PARAMS[key];
  const base = baseIndex(value("base"));
  if (base < 0) problems.push(`Base: «${value("base")}» non è una delle basi del cursore (1/5, 1/4, 1/3, 1/2, 2/3, 3/4, 1, 4/3, 3/2, 2, e, 3, 4, 5).`);
  const point = readStepRational(value("punto"), "Punto", POINT_RANGE);
  if (typeof point === "string") problems.push(point);
  const showLog = readYesNo(value("logaritmo"), "Logaritmo");
  if (typeof showLog === "string") problems.push(showLog);
  if (problems.length > 0 || typeof point === "string" || typeof showLog === "string") return { ok: false, problems };
  return { ok: true, setup: { base, point: point.toNumber(), showLog } };
}

/** I problemi dei parametri (vuoto se vanno bene): per la verifica dei contenuti. */
export function checkExpLogParams(params: Readonly<Record<string, string>>): string[] {
  const reading = readExpLogParams(params);
  return reading.ok ? [] : [...reading.problems];
}

/** Il confronto della base con 1. */
export const compareWithOne = (base: Expr): number => Math.sign(evaluate(base) - 1);

/** y = a^x. */
export const expOf = (base: Expr): Expr => pow(base, x);

/** y = log_a x (ln x se a = e). Non esiste per a = 1. */
export const logOf = (base: Expr): Expr => (base === e ? ln(x) : log(base, x));

/** I grafici: a^x, poi (se c'è il logaritmo e a ≠ 1) log_a x, poi y = x. Senza punti (li disegna la visualizzazione). */
export function expLogGraph(base: Expr, showLog: boolean): Graph {
  const functions = showLog ? (compareWithOne(base) === 0 ? [expOf(base), x] : [expOf(base), logOf(base), x]) : [expOf(base)];
  return { ...plotGraph(functions, WINDOW), points: [] };
}

/** Un punto notevole esatto, con il suo LaTeX. */
export interface NotablePoint {
  readonly x: number;
  readonly y: number;
  readonly latex: string;
  readonly curve: "exp" | "log";
}

/** I punti esatti: (0; 1) e (1; a) sull'esponenziale, (1; 0) e (a; 1) sul logaritmo. */
export function notablePoints(base: Expr, showLog: boolean): NotablePoint[] {
  const a = toLatex(base);
  const value = evaluate(base);
  const points: NotablePoint[] = [{ x: 0, y: 1, latex: "(0;\\, 1)", curve: "exp" }];
  if (compareWithOne(base) !== 0) points.push({ x: 1, y: value, latex: `\\left(1;\\, ${a}\\right)`, curve: "exp" });
  if (showLog && compareWithOne(base) !== 0) {
    points.push({ x: 1, y: 0, latex: "(1;\\, 0)", curve: "log" }, { x: value, y: 1, latex: `\\left(${a};\\, 1\\right)`, curve: "log" });
  }
  return points;
}

/** La formula di una funzione per il testo: y = a^x, y = log_a x. */
export const expLatex = (base: Expr): string => `y = ${toLatex(expOf(base))}`;
export const logLatex = (base: Expr): string => `y = ${toLatex(logOf(base))}`;

/** Le proprietà a parole (testo ricco, una voce per riga). */
export function properties(base: Expr, showLog: boolean): string[] {
  const a = toLatex(base);
  const sign = compareWithOne(base);
  if (sign === 0) {
    const constant = "Con $a = 1$: $1^x = 1$ per ogni $x$, la funzione è **costante** (né crescente né decrescente).";
    return showLog
      ? [constant, "Il suo simmetrico rispetto a $y = x$ è la retta verticale $x = 1$, che **non** è il grafico di una funzione: il logaritmo in base $1$ non esiste."]
      : [constant];
  }
  const why = sign > 0 ? `perché $a = ${a} > 1$` : `perché $0 < a = ${a} < 1$`;
  const trend = sign > 0 ? "**crescente**" : "**decrescente**";
  const lines = [`$${expLatex(base)}$ è ${trend} (${why}); dominio $\\mathbb{R}$, immagine $(0; +\\infty)$; asintoto $y = 0$ ${sign > 0 ? "a sinistra" : "a destra"}.`];
  if (showLog) {
    lines.push(`$${logLatex(base)}$ è ${trend} anche lei; dominio $(0; +\\infty)$, immagine $\\mathbb{R}$ (scambiati); asintoto $x = 0$.`);
  }
  return lines;
}

/** Il punto P(t; a^t) e il simmetrico P'(a^t; t), in coordinate del piano. */
export function mirrorPoints(base: Expr, t: number): { p: [number, number]; q: [number, number] } {
  const y = Math.pow(evaluate(base), t);
  return { p: [t, y], q: [y, t] };
}
