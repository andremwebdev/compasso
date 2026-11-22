// VIS.trasformazioni-funzioni, la matematica (scheda in docs/VISUALIZZAZIONI.md): legge i parametri
// della lezione e, per una funzione f e quattro numeri esatti a, b, c, d, costruisce la funzione
// y = a·f(b(x − c)) + d come la scriverebbe un libro, l'immagine esatta del punto di riferimento e
// l'elenco delle trasformazioni nell'ordine in cui si applicano. Niente Preact.

import { readGraph } from "../contenuti/formato";
import { surdToExpr } from "../motore/algebra/expand";
import { exactValue } from "../motore/algebra/normalize";
import { exactComplex } from "../motore/complex";
import { plotGraph, type Graph, type GraphWindow } from "../motore/display";
import { EngineError } from "../motore/errors";
import { add, evaluate, mul, neg, num, sub, substitute, sym, toLatex, type Expr } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { parseExpression } from "../motore/parser";
import { readStepRational, unknownParams, type StepRange } from "./parametri";

/** I quattro numeri della trasformazione. */
export type TransformLetter = "a" | "b" | "c" | "d";
export const LETTERS: readonly TransformLetter[] = ["a", "b", "c", "d"];

/** Gli intervalli dei cursori: a e b mai zero, c e d per le traslazioni. */
export const RANGES: Readonly<Record<TransformLetter, StepRange>> = {
  a: { step: Rational.of(1, 2), min: Rational.of(-3), max: Rational.of(3), nonZero: true },
  b: { step: Rational.of(1, 2), min: Rational.of(-3), max: Rational.of(3), nonZero: true },
  c: { step: Rational.of(1, 2), min: Rational.of(-5), max: Rational.of(5) },
  d: { step: Rational.of(1, 2), min: Rational.of(-5), max: Rational.of(5) },
};

/** Al più quattro funzioni tra cui scegliere. */
export const MAX_FUNCTIONS = 4;

/** I punti di riferimento possibili, in ordine: il primo in cui f ha un valore esatto è x₀. */
const REFERENCE_POINTS = [1, 2, 0, -1] as const;

/** Valori predefiniti dei parametri (scheda). */
export const DEFAULT_PARAMS = { funzione: "x^2; abs(x); sqrt(x); 1/x", a: "1", b: "1", c: "0", d: "0", cursori: "a; b; c; d", finestra: "-6; 6; -4; 4" } as const;
const KNOWN_PARAMS = Object.keys(DEFAULT_PARAMS);

/** Una funzione di partenza: testo, espressione, grafico, punto di riferimento esatto. */
export interface BaseFunction {
  readonly text: string;
  readonly expr: Expr;
  readonly graph: Graph;
  readonly x0: Rational;
  readonly y0: Expr;
}

/** I quattro numeri, esatti. */
export type TransformValues = Readonly<Record<TransformLetter, Rational>>;

export interface TransformSetup {
  readonly functions: readonly BaseFunction[];
  readonly values: TransformValues;
  readonly sliders: readonly TransformLetter[];
  readonly window: GraphWindow;
}

export type TransformReading = { readonly ok: true; readonly setup: TransformSetup } | { readonly ok: false; readonly problems: readonly string[] };

const x = sym("x");

/** Il valore esatto di un'espressione costante (radici quadrate, angoli notevoli), o null. */
export function exactConstant(expr: Expr): Expr | null {
  const numeric = evaluate(expr);
  if (!Number.isFinite(numeric)) return null;
  try {
    const surd = exactValue(expr);
    const complex = surd ? null : exactComplex(expr);
    const value = surd ?? (complex && complex.im.isZero() ? complex.re : null);
    if (!value) return null;
    const result = surdToExpr(value);
    return Math.abs(evaluate(result) - numeric) <= 1e-9 * Math.max(1, Math.abs(numeric)) ? result : null;
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

/** Legge i parametri del blocco e prepara tutto. Non lancia mai. */
export function readTransformParams(params: Readonly<Record<string, string>>): TransformReading {
  const problems = unknownParams(params, KNOWN_PARAMS);
  const value = (key: keyof typeof DEFAULT_PARAMS): string => params[key] ?? DEFAULT_PARAMS[key];

  const functions: BaseFunction[] = [];
  let window: GraphWindow | null = null;
  const texts = value("funzione").split(";").map((text) => text.trim());
  if (texts.length > MAX_FUNCTIONS) problems.push(`Al più ${MAX_FUNCTIONS} funzioni (ce ne sono ${texts.length}).`);
  const windowProblems = new Set<string>();
  texts.slice(0, MAX_FUNCTIONS).forEach((text, index) => {
    const name = texts.length > 1 ? `Funzione ${index + 1}` : "Funzione";
    if (text === "") return void problems.push(`${name}: è vuota (c'è un «;» di troppo?).`);
    const parsed = parseExpression(text);
    if (!parsed.ok || !parsed.complete) return void problems.push(`${name}: «${text}» non si legge${parsed.ok ? " (testo incompleto)" : ` (${parsed.error.message})`}`);
    const reading = readGraph({ functions: text, window: value("finestra"), points: "" });
    if (!reading.ok) {
      for (const message of reading.problems) windowProblems.add(`${name}: ${message}`);
      return;
    }
    const reference = REFERENCE_POINTS.map((point) => ({ x0: Rational.of(point), y0: exactConstant(substitute(parsed.value, { x: num(point) })) })).find(
      (candidate) => candidate.y0 !== null,
    );
    if (!reference || !reference.y0) {
      return void problems.push(`${name}: «${text}» deve avere un valore esatto in almeno uno dei punti 1, 2, 0, −1 (serve per il punto $P$).`);
    }
    window = reading.graph.window;
    functions.push({ text, expr: parsed.value, graph: reading.graph, x0: reference.x0, y0: reference.y0 });
  });
  problems.push(...windowProblems);

  const values: Partial<Record<TransformLetter, Rational>> = {};
  for (const letter of LETTERS) {
    const read = readStepRational(value(letter), `Numero ${letter}`, RANGES[letter]);
    if (typeof read === "string") problems.push(read);
    else values[letter] = read;
  }

  const sliders: TransformLetter[] = [];
  for (const item of value("cursori").split(";").map((text) => text.trim())) {
    if (!(LETTERS as readonly string[]).includes(item)) problems.push(`Cursori: «${item}» non è una delle lettere a, b, c, d.`);
    else if (sliders.includes(item as TransformLetter)) problems.push(`Cursori: «${item}» è scritta due volte.`);
    else sliders.push(item as TransformLetter);
  }

  if (problems.length > 0 || !window || functions.length === 0) return { ok: false, problems };
  return { ok: true, setup: { functions, values: values as TransformValues, sliders: LETTERS.filter((letter) => sliders.includes(letter)), window } };
}

/** I problemi dei parametri (vuoto se vanno bene): per la verifica dei contenuti. */
export function checkTransformParams(params: Readonly<Record<string, string>>): string[] {
  const reading = readTransformParams(params);
  return reading.ok ? [] : [...reading.problems];
}

const numberExpr = (value: Rational): Expr => ({ kind: "num", value });

/** a + b con b razionale scritto come lo scriverebbe un libro: niente «+ 0», niente «+ (−2)». */
function plus(expr: Expr, value: Rational): Expr {
  if (value.isZero()) return expr;
  return value.sign() > 0 ? add(expr, numberExpr(value)) : sub(expr, numberExpr(value.neg()));
}

/** k·e scritto pulito: niente «1·», «−1·» diventa il segno meno. */
function times(value: Rational, expr: Expr): Expr {
  if (value.eq(1)) return expr;
  if (value.eq(-1)) return neg(expr);
  return mul(numberExpr(value), expr);
}

/** La funzione trasformata y = a·f(b(x − c)) + d, scritta pulita (è anche quella che si disegna). */
export function transformedExpr(f: Expr, { a, b, c, d }: TransformValues): Expr {
  const inner = times(b, plus(x, c.neg()));
  return plus(times(a, substitute(f, { x: inner })), d);
}

/** L'immagine esatta del punto di riferimento: P(x₀; y₀) → P'(c + x₀/b; a·y₀ + d). */
export function imagePoint(base: Pick<BaseFunction, "x0" | "y0">, { a, b, c, d }: TransformValues): { x: Rational; y: Expr } {
  const y = exactConstant(add(mul(numberExpr(a), base.y0), numberExpr(d)));
  return { x: c.add(base.x0.div(b)), y: y ?? add(mul(numberExpr(a), base.y0), numberExpr(d)) };
}

/** Il grafico della funzione trasformata nella finestra (curva e asintoti, senza punti). */
export function transformedGraph(f: Expr, values: TransformValues, window: GraphWindow): Graph {
  return plotGraph([transformedExpr(f, values)], window);
}

/** Un numero razionale in LaTeX. */
export const rationalLatex = (value: Rational): string => toLatex(numberExpr(value));

/** Un numero in un testo con il segno meno vero (per le frasi): «2», «\tfrac12». */
const abs = (value: Rational): string => rationalLatex(value.abs());

/**
 * Le trasformazioni nell'ordine in cui si applicano al grafico di f (testo ricco, una frase per
 * voce). Vuoto se a = b = 1 e c = d = 0.
 */
export function transformSteps({ a, b, c, d }: TransformValues): string[] {
  const steps: string[] = [];
  if (!b.abs().eq(1)) {
    const factor = rationalLatex(b.abs().inv());
    const narrower = b.abs().cmp(1) > 0;
    steps.push(
      `**Dilatazione orizzontale** ($|b| = ${abs(b)}$): le ascisse si dividono per $${abs(b)}$, cioè si moltiplicano per $${factor}$; il grafico si ${narrower ? "**stringe** verso l'asse $y$" : "**allarga** rispetto all'asse $y$"}.`,
    );
  }
  if (b.sign() < 0) steps.push("**Simmetria rispetto all'asse $y$** ($b < 0$): ogni punto $(x; y)$ va in $(-x; y)$.");
  if (!c.isZero()) {
    const inside = `x ${c.sign() > 0 ? "-" : "+"} ${abs(c)}`;
    steps.push(
      `**Traslazione orizzontale** di $${abs(c)}$ verso ${c.sign() > 0 ? "**destra**" : "**sinistra**"} ($c = ${rationalLatex(c)}$): nella formula c'è $${inside}$, ma il grafico va verso ${c.sign() > 0 ? "destra" : "sinistra"}, perché per avere lo stesso valore di prima serve una $x$ più ${c.sign() > 0 ? "grande" : "piccola"} di $${abs(c)}$.`,
    );
  }
  if (!a.abs().eq(1)) {
    steps.push(`**Dilatazione verticale** ($|a| = ${abs(a)}$): le ordinate si moltiplicano per $${abs(a)}$; il grafico si ${a.abs().cmp(1) > 0 ? "**allunga**" : "**schiaccia**"} rispetto all'asse $x$.`);
  }
  if (a.sign() < 0) steps.push("**Simmetria rispetto all'asse $x$** ($a < 0$): ogni punto $(x; y)$ va in $(x; -y)$.");
  if (!d.isZero()) steps.push(`**Traslazione verticale** di $${abs(d)}$ verso ${d.sign() > 0 ? "**l'alto**" : "**il basso**"} ($d = ${rationalLatex(d)}$).`);
  return steps;
}

/** y = f(x) → y = a·f(b(x − c)) + d, in LaTeX. */
export function formulaLatex(f: Expr, values: TransformValues): string {
  return `y = ${toLatex(transformedExpr(f, values))}`;
}

/** P(x₀; y₀) → P'(…; …), in LaTeX. */
export function pointsLatex(base: Pick<BaseFunction, "x0" | "y0">, values: TransformValues): string {
  const image = imagePoint(base, values);
  return `P\\left(${rationalLatex(base.x0)};\\, ${toLatex(base.y0)}\\right) \\;\\mapsto\\; P'\\left(${rationalLatex(image.x)};\\, ${toLatex(image.y)}\\right)`;
}
