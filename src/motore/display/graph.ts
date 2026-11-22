// Grafici statici di funzioni (specifica, sezione 6, «Cosa deve mostrare»): dati una o più funzioni
// di x e una finestra, il motore calcola le curve (interrotte dove la funzione non è definita), gli
// assi con le tacche, i punti notevoli ESATTI (zeri, intersezione con l'asse y, buchi, punti chiesti)
// e gli asintoti verticali, e li disegna in SVG. Il disegno usa solo classi (graf-…): i colori li
// danno le variabili del tema in styles.css, così il grafico segue il tema chiaro e scuro.

import { exprToUPoly, surdToExpr, upolyToExpr } from "../algebra/expand";
import { exactValue, tryNormalize } from "../algebra/normalize";
import { NormalContext } from "../algebra/poly";
import { simplify } from "../algebra/simplify";
import { toUnivariate } from "../algebra/specialize";
import { upDegree, upDivMod, upGcd, type UPoly } from "../algebra/upoly";
import { EngineError } from "../errors";
import { evaluate } from "../expr/evaluate";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { Rational } from "../numbers/rational";
import { children, substitute, variables } from "../expr/walk";
import { compareConstants } from "../sets/operations";
import { exactComplex } from "../complex/forms";
import type { Complex } from "../numbers/complex";
import type { Surd } from "../numbers/surd";
import { realZeros } from "./sign-table";

/** La parte reale di un numero complesso che è reale; altrimenti null. */
const realPart = (z: Complex | null): Surd | null => (z && z.im.isZero() ? z.re : null);

/** La parte di piano mostrata. I valori sono numeri: servono solo a disegnare. */
export interface GraphWindow {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

/** Che cos'è un punto notevole. */
export type GraphPointKind =
  /** Zero della funzione: la curva incontra l'asse x. */
  | "zero"
  /** Intersezione con l'asse y. */
  | "intercept"
  /** Punto chiesto da chi scrive la lezione. */
  | "point"
  /** Punto escluso dal dominio in cui la funzione ha limite finito: la curva ha un buco. */
  | "hole";

/** Un punto notevole, con coordinate esatte. */
export interface GraphPoint {
  readonly kind: GraphPointKind;
  /** L'indice della curva (da 0). Un punto comune a più curve resta una volta sola, con la prima. */
  readonly curve: number;
  /** La lettera mostrata accanto al punto (A, B, C…), in ordine di ascissa. */
  readonly label: string;
  readonly x: Expr;
  readonly y: Expr;
}

/** Un asintoto verticale x = a, esatto. */
export interface GraphAsymptote {
  readonly curve: number;
  readonly x: Expr;
}

/** Una curva: i tratti da disegnare, in coordinate del piano (x, y). */
export interface GraphCurve {
  readonly expr: Expr;
  readonly segments: readonly (readonly (readonly [number, number])[])[];
}

export interface Graph {
  readonly kind: "graph";
  readonly variable: string;
  readonly window: GraphWindow;
  readonly curves: readonly GraphCurve[];
  readonly points: readonly GraphPoint[];
  readonly asymptotes: readonly GraphAsymptote[];
  readonly xTicks: readonly number[];
  readonly yTicks: readonly number[];
}

export interface GraphOptions {
  /** La lettera della variabile. Se manca: x. */
  readonly variable?: string;
  /** Ascisse di altri punti da segnare, su ogni curva definita lì. */
  readonly points?: readonly Expr[];
}

/** Al più tre curve: oltre, il grafico non si legge più (e le curve si distinguono anche dal tratteggio). */
export const MAX_GRAPH_CURVES = 3;

/** Le lettere dei punti notevoli. */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Calcola il grafico delle funzioni nella finestra data. Lancia EngineError se la richiesta non ha
 * senso (finestra vuota, troppe funzioni, una funzione con altre lettere, un punto chiesto dove
 * nessuna funzione è definita): chi legge testo scritto a mano deve intercettarlo.
 */
export function plotGraph(functions: readonly Expr[], window: GraphWindow, options: GraphOptions = {}): Graph {
  const variable = options.variable ?? "x";
  checkWindow(window);
  if (functions.length === 0) throw new EngineError("Il grafico non ha nessuna funzione.");
  if (functions.length > MAX_GRAPH_CURVES) throw new EngineError(`Un grafico ha al più ${MAX_GRAPH_CURVES} funzioni.`);
  functions.forEach((f, index) => {
    const others = variables(f).filter((name) => name !== variable);
    if (others.length > 0) {
      throw new EngineError(`La funzione ${index + 1} contiene la lettera «${others[0]}»: nei grafici l'unica variabile è $${variable}$.`);
    }
  });

  const candidates: Omit<GraphPoint, "label">[] = [];
  const asymptotes: GraphAsymptote[] = [];
  const curves: GraphCurve[] = [];
  functions.forEach((f, curve) => {
    const study = studyFunction(f, variable, window);
    curves.push({ expr: f, segments: sampleCurve(f, variable, window, study.breaks) });
    for (const x of study.asymptotes) asymptotes.push({ curve, x });
    for (const point of study.points) candidates.push({ ...point, curve });
  });

  // Punti chiesti: su ogni curva definita lì.
  for (const x of options.points ?? []) {
    const value = evaluate(x);
    if (!Number.isFinite(value) || variables(x).length > 0) throw new EngineError(`Il punto $${toLatex(x)}$ non è un numero.`);
    let found = false;
    functions.forEach((f, curve) => {
      const y = exactValueAt(f, variable, x);
      if (y === null) return;
      found = true;
      candidates.push({ kind: "point", curve, x, y });
    });
    if (!found) throw new EngineError(`Nel punto $x = ${toLatex(x)}$ nessuna funzione del grafico è definita.`);
  }

  return {
    kind: "graph",
    variable,
    window,
    curves,
    points: labelPoints(candidates.filter((point) => inside(point, window))),
    asymptotes: dedupe(asymptotes.filter((a) => strictlyInside(evaluate(a.x), window.xMin, window.xMax)), (a, b) => compareConstants(a.x, b.x) === 0),
    xTicks: ticks(window.xMin, window.xMax, 7),
    yTicks: ticks(window.yMin, window.yMax, 6),
  };
}

function checkWindow({ xMin, xMax, yMin, yMax }: GraphWindow): void {
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) throw new EngineError("Gli estremi della finestra devono essere numeri.");
  if (!(xMin < xMax)) throw new EngineError("Nella finestra il primo estremo di x deve essere minore del secondo.");
  if (!(yMin < yMax)) throw new EngineError("Nella finestra il primo estremo di y deve essere minore del secondo.");
  const ratio = (xMax - xMin) / (yMax - yMin);
  if (xMax - xMin > 1e6 || yMax - yMin > 1e6 || xMax - xMin < 1e-3 || yMax - yMin < 1e-3) {
    throw new EngineError("La finestra è troppo grande o troppo piccola per un grafico leggibile.");
  }
  if (ratio > 1e4 || ratio < 1e-4) throw new EngineError("La finestra è troppo sproporzionata.");
}

// ───────────────────────────── punti notevoli esatti ─────────────────────────────

interface Study {
  /** Ascisse (numeriche) dove la curva va interrotta: punti esclusi dal dominio. */
  readonly breaks: readonly number[];
  readonly asymptotes: readonly Expr[];
  readonly points: readonly Omit<GraphPoint, "label" | "curve">[];
}

/** Numeratore e denominatore come polinomi in x, se la funzione è razionale; altrimenti null. */
function rationalParts(f: Expr, variable: string): { num: UPoly; den: UPoly } | null {
  const ctx = new NormalContext();
  const ratio = tryNormalize(f, ctx);
  if (!ratio) return null;
  if ([...ratio.num.atomKeys(), ...ratio.den.atomKeys()].some((key) => key !== variable)) return null;
  const num = toUnivariate(ratio.num, ctx);
  const den = toUnivariate(ratio.den, ctx);
  return num && den ? { num, den } : null;
}

/** Gli zeri reali esatti di un polinomio; vuoto se il motore non li sa trovare (fattori di grado > 2). */
function safeZeros(p: UPoly, variable: string): Expr[] {
  if (upDegree(p) < 1) return [];
  try {
    return realZeros(upolyToExpr(p, variable), variable);
  } catch (error) {
    if (error instanceof EngineError) return [];
    throw error;
  }
}

/** I punti in cui un denominatore dell'espressione (polinomiale) si annulla. */
function excludedPoints(f: Expr, variable: string): Expr[] {
  const found: Expr[] = [];
  const visit = (node: Expr): void => {
    if (node.kind === "div") {
      const p = exprToUPoly(node.den, variable);
      if (p) found.push(...safeZeros(p, variable));
    }
    if (node.kind === "pow" && evaluate(node.exp) < 0 && variables(node.exp).length === 0) {
      const p = exprToUPoly(node.base, variable);
      if (p) found.push(...safeZeros(p, variable));
    }
    for (const child of children(node)) visit(child);
  };
  visit(f);
  return dedupe(found, (a, b) => compareConstants(a, b) === 0);
}

/** Il valore esatto di f in x = a (pulito), se f è definita lì; altrimenti null. */
function exactValueAt(f: Expr, variable: string, a: Expr): Expr | null {
  const numeric = evaluate(f, { [variable]: evaluate(a) });
  if (!Number.isFinite(numeric)) return null;
  const replaced = substitute(f, { [variable]: a });
  let value: Expr;
  try {
    // Prima i numeri con radici quadrate, poi gli angoli notevoli (seno e coseno dei multipli di π/12).
    const surd = exactValue(replaced) ?? realPart(exactComplex(replaced));
    value = surd ? surdToExpr(surd) : simplify(replaced);
  } catch (error) {
    if (!(error instanceof EngineError)) throw error;
    return null;
  }
  // Il valore pulito deve essere proprio quello: altrimenti meglio non mostrarlo.
  const check = evaluate(value);
  return Math.abs(check - numeric) <= 1e-9 * Math.max(1, Math.abs(numeric)) ? value : null;
}

function studyFunction(f: Expr, variable: string, window: GraphWindow): Study {
  const excluded = excludedPoints(f, variable);
  const parts = rationalParts(f, variable);
  // Funzione razionale ridotta ai minimi termini: dice se un punto escluso è un buco o un asintoto.
  const reduced = parts && upDegree(parts.den) >= 0 ? reduce(parts) : null;
  const points: Omit<GraphPoint, "label" | "curve">[] = [];
  const asymptotes: Expr[] = [];
  const isExcluded = (a: Expr): boolean => excluded.some((b) => compareConstants(a, b) === 0);

  for (const a of excluded) {
    if (reduced) {
      const den = exactValue(substitute(upolyToExpr(reduced.den, variable), { [variable]: a }));
      if (den && !den.isZero()) {
        const num = exactValue(substitute(upolyToExpr(reduced.num, variable), { [variable]: a }));
        if (num) points.push({ kind: "hole", x: a, y: surdToExpr(num.div(den)) });
        continue;
      }
      asymptotes.push(a);
      continue;
    }
    // Funzione non razionale: si decide guardando i valori vicino al punto.
    const center = evaluate(a);
    const delta = 1e-6 * Math.max(1, Math.abs(center));
    const near = [evaluate(f, { [variable]: center - delta }), evaluate(f, { [variable]: center + delta })];
    const span = window.yMax - window.yMin;
    if (near.some((value) => Number.isFinite(value) && Math.abs(value) > 1e3 * span)) asymptotes.push(a);
  }

  // Zeri: solo per le funzioni razionali, dove sono esatti; quelli esclusi dal dominio no.
  if (reduced) {
    for (const zero of safeZeros(reduced.num, variable)) {
      if (!isExcluded(zero)) points.push({ kind: "zero", x: zero, y: ZERO });
    }
  }
  // Intersezione con l'asse y.
  if (window.xMin <= 0 && 0 <= window.xMax) {
    if (!isExcluded(ZERO)) {
      const y = exactValueAt(f, variable, ZERO);
      if (y) points.push({ kind: "intercept", x: ZERO, y });
    }
  }
  return { breaks: excluded.map((a) => evaluate(a)), asymptotes, points };
}

function reduce({ num, den }: { num: UPoly; den: UPoly }): { num: UPoly; den: UPoly } {
  const g = upGcd(num, den);
  if (upDegree(g) < 1) return { num, den };
  return { num: upDivMod(num, g).quotient, den: upDivMod(den, g).quotient };
}

/** Lo zero come espressione. */
const ZERO: Expr = { kind: "num", value: Rational.ZERO };

/** Toglie i doppioni, tenendo il primo. */
function dedupe<T>(items: readonly T[], same: (a: T, b: T) => boolean): T[] {
  const result: T[] = [];
  for (const item of items) if (!result.some((other) => same(item, other))) result.push(item);
  return result;
}

const strictlyInside = (value: number, min: number, max: number): boolean => value > min && value < max;

function inside(point: Omit<GraphPoint, "label">, window: GraphWindow): boolean {
  const x = evaluate(point.x);
  const y = evaluate(point.y);
  return x >= window.xMin && x <= window.xMax && y >= window.yMin && y <= window.yMax;
}

/** Toglie i punti con le stesse coordinate, li ordina per ascissa (poi ordinata) e dà le lettere. */
function labelPoints(points: readonly Omit<GraphPoint, "label">[]): GraphPoint[] {
  const unique = dedupe(points, (a, b) => compareConstants(a.x, b.x) === 0 && compareConstants(a.y, b.y) === 0);
  unique.sort((a, b) => compareConstants(a.x, b.x) || compareConstants(a.y, b.y));
  return unique.map((point, index) => ({ ...point, label: LETTERS[index % LETTERS.length] as string }));
}

// ───────────────────────────── campionamento della curva ─────────────────────────────

/** Punti per curva prima dei raffinamenti. */
const BASE_SAMPLES = 240;
/** Quante volte al più si dimezza un intervallo dove la curva cambia troppo. */
const MAX_DEPTH = 7;

function sampleCurve(f: Expr, variable: string, window: GraphWindow, breaks: readonly number[]): [number, number][][] {
  const { xMin, xMax, yMin, yMax } = window;
  const span = yMax - yMin;
  // Le ordinate si tengono entro una fascia attorno alla finestra: fuori la curva è tagliata dal disegno.
  const low = yMin - 2 * span;
  const high = yMax + 2 * span;
  const at = (x: number): number => evaluate(f, { [variable]: x });
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  const flush = (): void => {
    if (current.length > 1) segments.push(current);
    current = [];
  };
  const push = (x: number, y: number): void => {
    current.push([x, Math.min(high, Math.max(low, y))]);
  };
  /** Un salto da sopra la finestra a sotto (o viceversa): c'è un polo che il motore non conosceva. */
  const jumps = (a: number, b: number): boolean => (a > high && b < low) || (a < low && b > high);

  // Gli intervalli tra i punti esclusi, ognuno campionato a parte.
  const cuts = [...breaks].filter((b) => b > xMin && b < xMax).sort((a, b) => a - b);
  const edges = [xMin, ...cuts, xMax];
  const step = (xMax - xMin) / BASE_SAMPLES;
  for (let piece = 0; piece + 1 < edges.length; piece++) {
    const start = edges[piece] as number;
    const end = edges[piece + 1] as number;
    const margin = step * 1e-3;
    const a0 = piece === 0 ? start : start + margin;
    const b0 = piece + 2 === edges.length ? end : end - margin;
    const count = Math.max(2, Math.ceil((b0 - a0) / step));
    let previous: { x: number; y: number } | null = null;

    const refine = (x1: number, y1: number, x2: number, y2: number, depth: number): void => {
      const finite1 = Number.isFinite(y1);
      const finite2 = Number.isFinite(y2);
      const mid = (x1 + x2) / 2;
      if (depth >= MAX_DEPTH) {
        if (finite1 && finite2 && jumps(y1, y2)) flush();
        if (finite2) push(x2, y2);
        else flush();
        return;
      }
      if (finite1 !== finite2 || (finite1 && finite2 && (Math.abs(y2 - y1) > span / 12 || jumps(y1, y2)))) {
        const ym = at(mid);
        refine(x1, y1, mid, ym, depth + 1);
        refine(mid, ym, x2, y2, depth + 1);
        return;
      }
      if (finite2) push(x2, y2);
      else flush();
    };

    for (let index = 0; index <= count; index++) {
      const x = a0 + ((b0 - a0) * index) / count;
      const y = at(x);
      if (previous === null) {
        if (Number.isFinite(y)) push(x, y);
      } else refine(previous.x, previous.y, x, y, 0);
      previous = { x, y };
    }
    flush();
  }
  return segments.map(simplifyPath);
}

/** Toglie i punti allineati con i vicini (entro un millesimo della finestra): il disegno resta uguale, il file più piccolo. */
function simplifyPath(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return points;
  const result: [number, number][] = [points[0] as [number, number]];
  for (let index = 1; index + 1 < points.length; index++) {
    const [x0, y0] = result[result.length - 1] as [number, number];
    const [x1, y1] = points[index] as [number, number];
    const [x2, y2] = points[index + 1] as [number, number];
    const cross = Math.abs((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0));
    const length = Math.hypot(x2 - x0, y2 - y0);
    if (length === 0 || cross / length > 1e-9 * Math.max(1, length)) result.push([x1, y1]);
  }
  result.push(points[points.length - 1] as [number, number]);
  return result;
}

// ───────────────────────────── tacche ─────────────────────────────

/** Le tacche: un passo «tondo» (1, 2 o 5 per una potenza di 10) con al più `most` tacche. */
export function ticks(min: number, max: number, most: number): number[] {
  const raw = (max - min) / most;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((k) => k * power).find((candidate) => candidate >= raw) ?? 10 * power;
  const result: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + 1e-9 * step; k++) {
    const value = Number((k * step).toPrecision(12));
    result.push(Object.is(value, -0) ? 0 : value);
  }
  return result;
}

/** Un numero delle tacche all'italiana: virgola decimale, segno meno vero. */
export function tickLabel(value: number): string {
  const text = String(Number(value.toPrecision(10)));
  return text.replace(".", ",").replace("-", "−");
}

// ───────────────────────────── scrittura ─────────────────────────────

/** Il punto in LaTeX, all'italiana: A\left(1;\, 0\right). */
export function graphPointToLatex(point: Pick<GraphPoint, "label" | "x" | "y">): string {
  return `${point.label}\\left(${toLatex(point.x)};\\, ${toLatex(point.y)}\\right)`;
}

/** Larghezza e altezza del disegno (unità del viewBox; il disegno si adatta alla larghezza disponibile). */
export const GRAPH_WIDTH = 320;
export const GRAPH_HEIGHT = 240;
const PAD = 6;

export interface GraphSvgOptions {
  /** Descrizione per chi usa un lettore di schermo (aria-label). */
  readonly label?: string;
  /** Prefisso degli id interni (clipPath), per avere più grafici nella stessa pagina. */
  readonly idPrefix?: string;
}

const round = (value: number): string => String(Math.round(value * 10) / 10);
const escapeXml = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Il grafico in SVG. Solo classi, nessun colore: assi `graf-asse`, griglia `graf-griglia`, numeri
 * `graf-numero`, curve `graf-curva graf-curva-1…3`, asintoti `graf-asintoto`, punti `graf-punto`
 * (pieni) e `graf-buco` (vuoti), lettere `graf-etichetta`.
 */
export function graphToSvg(graph: Graph, options: GraphSvgOptions = {}): string {
  const { xMin, xMax, yMin, yMax } = graph.window;
  const left = PAD;
  const right = GRAPH_WIDTH - PAD;
  const top = PAD;
  const bottom = GRAPH_HEIGHT - PAD;
  const sx = (x: number): number => left + ((x - xMin) / (xMax - xMin)) * (right - left);
  const sy = (y: number): number => bottom - ((y - yMin) / (yMax - yMin)) * (bottom - top);
  // Gli assi passano per l'origine se è nella finestra, altrimenti stanno sul bordo.
  const axisY = sy(Math.min(yMax, Math.max(yMin, 0)));
  const axisX = sx(Math.min(xMax, Math.max(xMin, 0)));
  const id = `${options.idPrefix ?? "graf"}-area`;
  const out: string[] = [];
  const label = options.label ? ` role="img" aria-label="${escapeXml(options.label)}"` : ` aria-hidden="true"`;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" class="grafico-svg"${label}>`);
  out.push(`<defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/></clipPath></defs>`);

  // Griglia.
  const grid: string[] = [];
  for (const x of graph.xTicks) grid.push(`M${round(sx(x))} ${top}V${bottom}`);
  for (const y of graph.yTicks) grid.push(`M${left} ${round(sy(y))}H${right}`);
  out.push(`<path class="graf-griglia" d="${grid.join("")}"/>`);

  // Assi con le frecce e i nomi.
  out.push(`<path class="graf-asse" d="M${left} ${round(axisY)}H${right}M${round(axisX)} ${bottom}V${top}"/>`);
  out.push(`<path class="graf-freccia" d="M${right} ${round(axisY)}l-7 -3.5v7zM${round(axisX)} ${top}l-3.5 7h7z"/>`);
  out.push(`<text class="graf-nome" x="${right - 2}" y="${round(axisY - 7)}" text-anchor="end">${escapeXml(graph.variable)}</text>`);
  out.push(`<text class="graf-nome" x="${round(axisX + 7)}" y="${top + 10}">y</text>`);

  // Tacche e numeri (non sull'origine, non sotto le frecce).
  const below = axisY + 14 <= bottom;
  const leftSide = axisX - 26 >= left;
  for (const x of graph.xTicks) {
    const px = sx(x);
    if (x === 0 && xMin <= 0 && yMin <= 0 && yMax >= 0 && xMax >= 0) continue;
    if (px > right - 12 || px < left + 4) continue;
    out.push(`<path class="graf-asse" d="M${round(px)} ${round(axisY - 3)}v6"/>`);
    out.push(`<text class="graf-numero" x="${round(px)}" y="${round(below ? axisY + 14 : axisY - 6)}" text-anchor="middle">${tickLabel(x)}</text>`);
  }
  for (const y of graph.yTicks) {
    const py = sy(y);
    if (y === 0 && xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) continue;
    if (py < top + 12 || py > bottom - 4) continue;
    out.push(`<path class="graf-asse" d="M${round(axisX - 3)} ${round(py)}h6"/>`);
    out.push(`<text class="graf-numero" x="${round(leftSide ? axisX - 6 : axisX + 6)}" y="${round(py + 4)}" text-anchor="${leftSide ? "end" : "start"}">${tickLabel(y)}</text>`);
  }
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    out.push(`<text class="graf-numero" x="${round(axisX - 5)}" y="${round(axisY + 13)}" text-anchor="end">O</text>`);
  }

  // Asintoti, curve, punti: dentro l'area del grafico.
  out.push(`<g clip-path="url(#${id})">`);
  for (const asymptote of graph.asymptotes) {
    const px = round(sx(evaluate(asymptote.x)));
    out.push(`<path class="graf-asintoto" d="M${px} ${top}V${bottom}"/>`);
  }
  graph.curves.forEach((curve, index) => {
    const d = curve.segments
      .map((segment) => segment.map(([x, y], k) => `${k === 0 ? "M" : "L"}${round(sx(x))} ${round(sy(y))}`).join(""))
      .join("");
    if (d !== "") out.push(`<path class="graf-curva graf-curva-${index + 1}" d="${d}"/>`);
  });
  for (const point of graph.points) {
    const px = sx(evaluate(point.x));
    const py = sy(evaluate(point.y));
    const kind = point.kind === "hole" ? "graf-buco" : "graf-punto";
    out.push(`<circle class="${kind} graf-segno-${point.curve + 1}" cx="${round(px)}" cy="${round(py)}" r="3.5"/>`);
    // La lettera dalla parte con più spazio.
    const dx = px > right - 16 ? -6 : 6;
    const dy = py < top + 14 ? 14 : -6;
    out.push(`<text class="graf-etichetta" x="${round(px + dx)}" y="${round(py + dy)}" text-anchor="${dx < 0 ? "end" : "start"}">${point.label}</text>`);
  }
  out.push(`</g></svg>`);
  return out.join("");
}
