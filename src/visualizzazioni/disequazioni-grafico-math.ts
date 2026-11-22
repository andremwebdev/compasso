// VIS.disequazioni-grafico, la matematica (scheda in docs/VISUALIZZAZIONI.md): legge i parametri
// della lezione, e per una funzione razionale f, una soglia k e un verso calcola, ESATTI, f(x) − k
// come una sola frazione, la tabella dei segni, la soluzione e i punti in cui la curva incontra la
// retta y = k. Niente Preact: il componente è in disequazioni-grafico.tsx.

import { readGraph } from "../contenuti/formato";
import {
  graphFrame, isConstantFunction, rationalDegrees, rationalFunction, rationalParts, signTable, solutionFromSigns, subtractConstant,
  type Graph, type GraphWindow, type RationalFunction, type Sign, type SignRelation, type SignTable,
} from "../motore/display";
import { evaluate, literalRational, toLatex, type Expr } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { parseExpression } from "../motore/parser";
import { canonicalSet, setToLatex, type RealSet } from "../motore/sets";

/** I quattro versi, nell'ordine dei pulsanti. */
export const RELATIONS: readonly SignRelation[] = [">", ">=", "<", "<="];

/** Il verso in LaTeX e a parole (per chi usa un lettore di schermo). */
export const RELATION_LATEX: Readonly<Record<SignRelation, string>> = { ">": ">", ">=": "\\ge", "<": "<", "<=": "\\le" };
export const RELATION_WORDS: Readonly<Record<SignRelation, string>> = {
  ">": "maggiore",
  ">=": "maggiore o uguale",
  "<": "minore",
  "<=": "minore o uguale",
};

/** Il passo della soglia: la soglia è sempre un multiplo di 1/2, quindi un numero esatto. */
export const THRESHOLD_STEP = Rational.of(1, 2);

/** Al più quattro funzioni tra cui scegliere. */
export const MAX_FUNCTIONS = 4;

/** Valori predefiniti dei parametri (scheda). */
export const DEFAULT_PARAMS = { funzione: "(x-1)/(x+2)", soglia: "0", verso: ">", finestra: "-6; 6; -4; 4" } as const;

const KNOWN_PARAMS = Object.keys(DEFAULT_PARAMS);

/** Una funzione da mostrare: il testo della lezione, l'espressione, N/D e il grafico del motore. */
export interface InequalityFunction {
  readonly text: string;
  readonly expr: Expr;
  readonly rational: RationalFunction;
  readonly graph: Graph;
}

export interface InequalitySetup {
  readonly functions: readonly InequalityFunction[];
  readonly threshold: Rational;
  readonly relation: SignRelation;
  readonly window: GraphWindow;
  /** Soglia minima e massima del cursore: multipli di 1/2 dentro la finestra. */
  readonly thresholdMin: Rational;
  readonly thresholdMax: Rational;
}

export type InequalityReading = { readonly ok: true; readonly setup: InequalitySetup } | { readonly ok: false; readonly problems: readonly string[] };

/** Il verso scritto nella lezione: >, >=, <, <=, ≥, ≤. */
function readRelation(text: string): SignRelation | null {
  const normalized = text.trim().replace("≥", ">=").replace("≤", "<=");
  return (RELATIONS as readonly string[]).includes(normalized) ? (normalized as SignRelation) : null;
}

/** Il multiplo di 1/2 più vicino a `value`, dentro [min; max]. */
export function snapThreshold(value: number, min: Rational, max: Rational): Rational {
  const halves = Math.round(value * 2);
  const snapped = Rational.of(halves, 2);
  if (snapped.cmp(min) < 0) return min;
  if (snapped.cmp(max) > 0) return max;
  return snapped;
}

/**
 * Legge i parametri del blocco (testo, come sono scritti nella lezione) e prepara tutto. Non lancia
 * mai: un parametro sbagliato diventa un messaggio in italiano.
 */
export function readInequalityParams(params: Readonly<Record<string, string>>): InequalityReading {
  const problems: string[] = [];
  for (const key of Object.keys(params)) {
    if (!KNOWN_PARAMS.includes(key)) problems.push(`La visualizzazione non ha il parametro «${key}» (parametri: ${KNOWN_PARAMS.join(", ")}).`);
  }
  const value = (key: keyof typeof DEFAULT_PARAMS): string => params[key] ?? DEFAULT_PARAMS[key];

  // Le funzioni, ognuna con il suo grafico (lo stesso motore dei grafici statici, che controlla anche la finestra).
  const functions: InequalityFunction[] = [];
  let window: GraphWindow | null = null;
  const texts = value("funzione").split(";").map((text) => text.trim());
  if (texts.length > MAX_FUNCTIONS) problems.push(`Al più ${MAX_FUNCTIONS} funzioni (ce ne sono ${texts.length}).`);
  const windowProblems = new Set<string>();
  texts.slice(0, MAX_FUNCTIONS).forEach((text, index) => {
    const name = texts.length > 1 ? `Funzione ${index + 1}` : "Funzione";
    if (text === "") {
      problems.push(`${name}: è vuota (c'è un «;» di troppo?).`);
      return;
    }
    const parsed = parseExpression(text);
    if (!parsed.ok || !parsed.complete) {
      problems.push(`${name}: «${text}» non si legge${parsed.ok ? " (testo incompleto)" : ` (${parsed.error.message})`}`);
      return;
    }
    const rational = rationalFunction(parsed.value, "x");
    if (!rational) {
      problems.push(`${name}: «${text}» deve essere una frazione di polinomi in $x$.`);
      return;
    }
    const degrees = rationalDegrees(rational);
    if (degrees.num > 2 || degrees.den > 2) {
      problems.push(`${name}: «${text}» ha numeratore o denominatore di grado maggiore di 2 (al più 2, perché gli zeri restino esatti per ogni soglia).`);
      return;
    }
    if (isConstantFunction(rational)) {
      problems.push(`${name}: «${text}» è costante: non c'è niente da confrontare con la soglia.`);
      return;
    }
    const reading = readGraph({ functions: text, window: value("finestra"), points: "" });
    if (!reading.ok) {
      for (const message of reading.problems) windowProblems.add(message);
      return;
    }
    window = reading.graph.window;
    functions.push({ text, expr: parsed.value, rational, graph: reading.graph });
  });
  problems.push(...windowProblems);

  const relation = readRelation(value("verso"));
  if (!relation) problems.push(`Verso: «${value("verso")}» non va bene (si scrive >, >=, < oppure <=).`);

  let threshold: Rational | null = null;
  const parsedThreshold = parseExpression(value("soglia"));
  const exact = parsedThreshold.ok && parsedThreshold.complete ? literalRational(parsedThreshold.value) : null;
  if (!exact) problems.push(`Soglia: «${value("soglia")}» deve essere un numero razionale (come 1, -3/2 oppure 2,5).`);
  else if (!exact.mul(2).isInteger()) problems.push(`Soglia: «${value("soglia")}» deve essere un multiplo di 1/2 (il cursore va a passi di 1/2).`);
  else threshold = exact;

  if (problems.length > 0 || !window || !relation || !threshold) return { ok: false, problems };
  const { yMin, yMax } = window as GraphWindow;
  const thresholdMin = Rational.of(Math.ceil(yMin * 2), 2);
  const thresholdMax = Rational.of(Math.floor(yMax * 2), 2);
  if (threshold.toNumber() < yMin || threshold.toNumber() > yMax) {
    return { ok: false, problems: [`Soglia: ${value("soglia")} è fuori dalla finestra (y tra ${yMin} e ${yMax}).`] };
  }
  return { ok: true, setup: { functions, threshold, relation, window, thresholdMin, thresholdMax } };
}

/** I problemi dei parametri (vuoto se vanno bene): per la verifica dei contenuti. */
export function checkInequalityParams(params: Readonly<Record<string, string>>): string[] {
  const reading = readInequalityParams(params);
  return reading.ok ? [] : [...reading.problems];
}

/** Una barra della soluzione sull'asse x, in coordinate del piano (gli infiniti diventano i bordi della finestra). */
export interface SolutionBar {
  readonly from: number;
  readonly to: number;
  /** null: estremo infinito o fuori dalla finestra (nessun pallino). */
  readonly fromClosed: boolean | null;
  readonly toClosed: boolean | null;
}

export interface InequalityStudy {
  /** f(x) − k come una sola frazione N/D (N e D a coefficienti interi). */
  readonly shifted: RationalFunction;
  /** La tabella dei segni di N, D (se non costante) e della frazione. */
  readonly table: SignTable;
  /** Per ogni casella della tabella: è nella soluzione? */
  readonly solutionCells: readonly boolean[];
  readonly solution: RealSet;
  /** Dove la curva incontra la retta y = k (f(x) = k), esatti e in ordine. */
  readonly crossings: readonly Expr[];
}

/** Studia f(x) rel k: tabella dei segni di (N − kD)/D e soluzione, senza mai moltiplicare per D. */
export function studyInequality(f: RationalFunction, k: Rational, relation: SignRelation): InequalityStudy {
  const shifted = subtractConstant(f, k);
  const { num, den } = rationalParts(shifted);
  const denConstant = rationalDegrees(shifted).den === 0;
  // Con il denominatore costante (positivo, per come è riordinato) la sua riga non serve.
  const table = signTable(denConstant ? [{ expr: num }] : [{ expr: num }, { expr: den, role: "denominator" }], {
    label: toLatex(denConstant ? simpleDiv(num, den) : { kind: "div", num, den }),
  });
  const solution = canonicalSet(solutionFromSigns(table, relation)) as RealSet;
  const wanted: Sign = relation === ">" || relation === ">=" ? "+" : "-";
  const withZeros = relation === ">=" || relation === "<=";
  const solutionCells = table.result.cells.map((sign) => sign === wanted || (withZeros && sign === "0"));
  const crossings = table.points.filter((_, index) => table.result.cells[2 * index + 1] === "0");
  return { shifted, table, solutionCells, solution, crossings };
}

/** num/den con den costante: se den è 1 resta num. */
function simpleDiv(num: Expr, den: Expr): Expr {
  return evaluate(den) === 1 ? num : { kind: "div", num, den };
}

/** In quale casella della tabella cade x: colonna di un punto se ci è sopra (entro `tolerance`), altrimenti l'intervallo. */
export function cellAt(table: SignTable, x: number, tolerance = 1e-9): number {
  const values = table.points.map((point) => evaluate(point));
  let before = 0;
  for (const [index, value] of values.entries()) {
    if (Math.abs(x - value) <= tolerance) return 2 * index + 1;
    if (value < x) before = index + 1;
  }
  return 2 * before;
}

/** Le barre della soluzione dentro la finestra, in ordine. */
export function solutionBars(solution: RealSet, window: GraphWindow): SolutionBar[] {
  const bars: SolutionBar[] = [];
  for (const piece of solution.pieces) {
    const from = piece.lower === "-inf" ? -Infinity : evaluate(piece.lower as Expr);
    const to = piece.upper === "+inf" ? Infinity : evaluate(piece.upper as Expr);
    if (to < window.xMin || from > window.xMax) continue;
    bars.push({
      from: Math.max(from, window.xMin),
      to: Math.min(to, window.xMax),
      fromClosed: from >= window.xMin ? piece.lowerClosed : null,
      toClosed: to <= window.xMax ? piece.upperClosed : null,
    });
  }
  return bars;
}

/** f(x) − k = N/D, in LaTeX: la riga sopra la tabella (corta, per stare in 320 px). */
export function shiftedLatex(k: Rational, study: InequalityStudy): string {
  const left = k.isZero() ? "f(x)" : `f(x) ${k.sign() > 0 ? "-" : "+"} ${toLatex({ kind: "num", value: k.abs() })}`;
  return `${left} = ${study.table.result.label}`;
}

/** La disequazione in LaTeX: f(x) ≥ k. */
export function inequalityLatex(f: Expr, k: Rational, relation: SignRelation): string {
  return `${toLatex(f)} ${RELATION_LATEX[relation]} ${toLatex({ kind: "num", value: k })}`;
}

/** La soluzione in LaTeX: S = … */
export function solutionLatex(solution: RealSet): string {
  return `S = ${setToLatex(solution)}`;
}

/** Un numero approssimato all'italiana, con due decimali al più: 1,25 · −0,5. */
export function approximate(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = String(Object.is(rounded, -0) ? 0 : rounded);
  return text.replace(".", ",").replace("-", "−");
}

/** Lo stesso numero approssimato dentro una formula: la virgola come {,} (senza spazio dopo), il meno di LaTeX. */
export function approximateLatex(value: number): string {
  return approximate(value).replace(",", "{,}").replace("−", "-");
}

/** La cornice del disegno (la stessa dei grafici statici). */
export const frameOf = graphFrame;
