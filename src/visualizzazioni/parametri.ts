// Pezzi comuni per leggere i parametri delle visualizzazioni (testo scritto nella lezione) e per i
// numeri «a passi»: un valore che si trascina va a passi esatti (Rational), così quello che il motore
// calcola da lì resta esatto. Niente Preact. Nato con le visualizzazioni parte 2.

import { ticks, type Graph, type GraphWindow, GRAPH_HEIGHT, GRAPH_WIDTH, graphFrame } from "../motore/display";
import { literalRational } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { parseExpression } from "../motore/parser";

/** I problemi dei parametri che la visualizzazione non conosce. */
export function unknownParams(params: Readonly<Record<string, string>>, known: readonly string[]): string[] {
  return Object.keys(params)
    .filter((key) => !known.includes(key))
    .map((key) => `La visualizzazione non ha il parametro «${key}» (parametri: ${known.join(", ")}).`);
}

/** Un numero a passi: passo, minimo e massimo esatti; `nonZero` esclude lo zero. */
export interface StepRange {
  readonly step: Rational;
  readonly min: Rational;
  readonly max: Rational;
  readonly nonZero?: boolean;
}

/** Il passo scritto per un messaggio: «1/2», «1». */
const stepText = (step: Rational): string => step.toString();

/**
 * Legge un numero razionale scritto nella lezione (`-3/2`, `2,5`) e controlla che stia nell'intervallo
 * e sia un multiplo del passo. Restituisce il numero o il messaggio del problema. Non lancia mai.
 */
export function readStepRational(text: string, name: string, range: StepRange): Rational | string {
  const parsed = parseExpression(text);
  const value = parsed.ok && parsed.complete ? literalRational(parsed.value) : null;
  if (!value) return `${name}: «${text}» deve essere un numero razionale (come 1, -3/2 oppure 2,5).`;
  if (!value.div(range.step).isInteger()) return `${name}: «${text}» deve essere un multiplo di ${stepText(range.step)} (il cursore va a passi di ${stepText(range.step)}).`;
  if (value.cmp(range.min) < 0 || value.cmp(range.max) > 0) return `${name}: «${text}» deve stare tra ${range.min.toString()} e ${range.max.toString()}.`;
  if (range.nonZero && value.isZero()) return `${name}: non può essere 0.`;
  return value;
}

/** Il valore a passi più vicino a `value` dentro l'intervallo (lo zero escluso, se va escluso). */
export function snapToStep(value: number, range: StepRange): Rational {
  const steps = Math.round(value / range.step.toNumber());
  let snapped = range.step.mul(Rational.from(steps));
  if (snapped.cmp(range.min) < 0) snapped = range.min;
  if (snapped.cmp(range.max) > 0) snapped = range.max;
  if (range.nonZero && snapped.isZero()) snapped = value < 0 && range.min.sign() < 0 ? range.step.neg() : range.step;
  return snapped;
}

/** Tutti i valori a passi dell'intervallo, in ordine (lo zero escluso, se va escluso). */
export function stepValues(range: StepRange): Rational[] {
  const values: Rational[] = [];
  for (let value = range.min; value.cmp(range.max) <= 0; value = value.add(range.step)) {
    if (!(range.nonZero && value.isZero())) values.push(value);
  }
  return values;
}

/** Legge «sì»/«no» (anche «si», «vero», «falso»). */
export function readYesNo(text: string, name: string): boolean | string {
  const normalized = text.trim().toLowerCase();
  if (["sì", "si", "vero"].includes(normalized)) return true;
  if (["no", "falso"].includes(normalized)) return false;
  return `${name}: «${text}» non va bene (si scrive sì oppure no).`;
}

/** Il rapporto tra larghezza e altezza dell'area del disegno: con questa finestra le unità dei due assi sono uguali. */
export const DRAWING_RATIO = (GRAPH_WIDTH - 12) / (GRAPH_HEIGHT - 12);

/** Una finestra con le unità uguali sui due assi (cerchi rotondi, simmetrie vere), da x e dal centro di y. */
export function equalScaleWindow(xMin: number, xMax: number, yCenter: number): GraphWindow {
  const half = (xMax - xMin) / DRAWING_RATIO / 2;
  return { xMin, xMax, yMin: yCenter - half, yMax: yCenter + half };
}

/** Un piano vuoto (assi, griglia e tacche dei grafici statici) da passare a graphToSvg. */
export function emptyPlane(window: GraphWindow): Graph {
  return {
    kind: "graph",
    variable: "x",
    window,
    curves: [],
    points: [],
    asymptotes: [],
    xTicks: ticks(window.xMin, window.xMax, 7),
    yTicks: ticks(window.yMin, window.yMax, 6),
  };
}

/** La cornice del disegno (la stessa dei grafici statici). */
export const frameOf = graphFrame;
