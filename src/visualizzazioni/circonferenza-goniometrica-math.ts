// VIS.circonferenza-goniometrica, la matematica (scheda in docs/VISUALIZZAZIONI.md): legge i parametri
// della lezione e, per un angolo in gradi interi, dà la misura in radianti esatta, seno, coseno e
// tangente (esatti per i multipli di 15°, dal motore; altrimenti approssimati), il quadrante e i segni,
// l'aggancio ai multipli di 15° mentre si trascina. Niente Preact.

import { div, mul, pi, sin, cos, tan, toLatex, type Expr } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { approximateLatex } from "./disequazioni-grafico-math";
import { equalScaleWindow, readStepRational, readYesNo, unknownParams } from "./parametri";
import { exactConstant } from "./trasformazioni-funzioni-math";

/** La finestra, fissa: la circonferenza di raggio 1 con un po' di margine, unità uguali. */
export const WINDOW = equalScaleWindow(-1.85, 1.85, 0);

/** Entro quanti gradi il punto trascinato si aggancia a un multiplo di 15°. */
export const SNAP_DEGREES = 4;

export const DEFAULT_PARAMS = { angolo: "30", tangente: "sì" } as const;
const KNOWN_PARAMS = Object.keys(DEFAULT_PARAMS);

export interface CircleSetup {
  readonly degrees: number;
  readonly showTangent: boolean;
}

export type CircleReading = { readonly ok: true; readonly setup: CircleSetup } | { readonly ok: false; readonly problems: readonly string[] };

/** Legge i parametri del blocco. Non lancia mai. */
export function readCircleParams(params: Readonly<Record<string, string>>): CircleReading {
  const problems = unknownParams(params, KNOWN_PARAMS);
  const value = (key: keyof typeof DEFAULT_PARAMS): string => params[key] ?? DEFAULT_PARAMS[key];
  const angle = readStepRational(value("angolo"), "Angolo (in gradi)", { step: Rational.ONE, min: Rational.ZERO, max: Rational.of(360) });
  if (typeof angle === "string") problems.push(angle);
  const showTangent = readYesNo(value("tangente"), "Tangente");
  if (typeof showTangent === "string") problems.push(showTangent);
  if (problems.length > 0 || typeof angle === "string" || typeof showTangent === "string") return { ok: false, problems };
  return { ok: true, setup: { degrees: angle.toNumber(), showTangent } };
}

/** I problemi dei parametri (vuoto se vanno bene): per la verifica dei contenuti. */
export function checkCircleParams(params: Readonly<Record<string, string>>): string[] {
  const reading = readCircleParams(params);
  return reading.ok ? [] : [...reading.problems];
}

/** L'angolo in radianti, esatto: 30 → π/6, 135 → 3π/4, 0 → 0. */
export function radians(degrees: number): Expr {
  const ratio = Rational.of(degrees, 180);
  if (ratio.isZero()) return { kind: "num", value: Rational.ZERO };
  const n = Number(ratio.n);
  const d = Number(ratio.d);
  const top = n === 1 ? pi : mul(n, pi);
  return d === 1 ? top : div(top, d);
}

/** Gradi e radianti affiancati: 30^\circ = \frac{\pi}{6}. */
export const angleLatex = (degrees: number): string => `${degrees}^\\circ = ${toLatex(radians(degrees))}`;

/** Un valore goniometrico: esatto (LaTeX dal motore) o approssimato; null se non esiste. */
export interface TrigValue {
  readonly value: number;
  /** «= …» se esatto, «\approx …» se approssimato. */
  readonly latex: string;
  readonly exact: boolean;
}

function trigValue(expr: Expr, numeric: number, degrees: number): TrigValue {
  const exact = degrees % 15 === 0 ? exactConstant(expr) : null;
  const clean = Math.abs(numeric) < 1e-12 ? 0 : numeric;
  return exact ? { value: clean, latex: `= ${toLatex(exact)}`, exact: true } : { value: clean, latex: `\\approx ${approximateLatex(clean)}`, exact: false };
}

/** Seno, coseno e tangente (null se la tangente non esiste: 90° e 270°). */
export function trigValues(degrees: number): { cos: TrigValue; sin: TrigValue; tan: TrigValue | null } {
  const alpha = radians(degrees);
  const rad = (degrees * Math.PI) / 180;
  const vertical = degrees % 180 === 90;
  return {
    cos: trigValue(cos(alpha), Math.cos(rad), degrees),
    sin: trigValue(sin(alpha), Math.sin(rad), degrees),
    tan: vertical ? null : trigValue(tan(alpha), Math.tan(rad), degrees),
  };
}

/** Il quadrante (1…4) dell'angolo, oppure 0 se P sta su un asse. */
export function quadrant(degrees: number): 0 | 1 | 2 | 3 | 4 {
  const d = ((degrees % 360) + 360) % 360;
  if (d % 90 === 0) return 0;
  return (Math.floor(d / 90) + 1) as 1 | 2 | 3 | 4;
}

/** I segni nei quattro quadranti (colonne I…IV): seno, coseno, tangente. */
export const QUADRANT_SIGNS = {
  sin: ["+", "+", "-", "-"],
  cos: ["+", "-", "-", "+"],
  tan: ["+", "-", "+", "-"],
} as const;

/** La frase su dove sta P e che segni hanno le funzioni (testo ricco). */
export function quadrantText(degrees: number, showTangent: boolean): string {
  const q = quadrant(degrees);
  const roman = ["", "I", "II", "III", "IV"] as const;
  if (q === 0) {
    const d = ((degrees % 360) + 360) % 360;
    const axis = d === 0 || d === 180 ? "sull'asse $x$" : "sull'asse $y$";
    return `$P$ è ${axis}: ${d === 0 || d === 180 ? "il seno è $0$" : "il coseno è $0$"}, e l'angolo non sta in nessun quadrante.`;
  }
  const sign = (s: "+" | "-" | undefined) => (s === "+" ? "> 0" : "< 0");
  const parts = [`\\sin\\alpha ${sign(QUADRANT_SIGNS.sin[q - 1])}`, `\\cos\\alpha ${sign(QUADRANT_SIGNS.cos[q - 1])}`];
  if (showTangent) parts.push(`\\tan\\alpha ${sign(QUADRANT_SIGNS.tan[q - 1])}`);
  return `$P$ è nel **${roman[q]} quadrante**: ${parts.map((part) => `$${part}$`).join(", ")}.`;
}

/** L'angolo (gradi interi da 0 a 360) del punto (x; y) trascinato, agganciato ai multipli di 15° vicini. */
export function snapAngle(x: number, y: number, previous: number): number {
  if (Math.hypot(x, y) < 1e-9) return previous;
  let degrees = (Math.atan2(y, x) * 180) / Math.PI;
  if (degrees < 0) degrees += 360;
  const nearest = Math.round(degrees / 15) * 15;
  const result = Math.abs(degrees - nearest) <= SNAP_DEGREES ? nearest : Math.round(degrees);
  // Il giro completo: vicino a 0° si resta a 360° se si arriva da lì.
  if (result === 360 || result === 0) return previous > 180 ? 360 : 0;
  return result;
}
