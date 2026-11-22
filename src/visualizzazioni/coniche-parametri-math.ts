// VIS.coniche-parametri, la matematica (scheda in docs/VISUALIZZAZIONI.md): legge i parametri della
// lezione e, per una conica e i suoi coefficienti esatti, calcola gli elementi ESATTI (centro, raggio,
// vertici, fuochi, direttrice, asintoti, eccentricità, con le radici semplificate dal motore) e i
// tratti da disegnare (in virgola mobile: servono solo al disegno). Niente Preact.

import { div, neg as negate, sqrt, toLatex, type Expr } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { equalScaleWindow, readStepRational, unknownParams, type StepRange } from "./parametri";
import { exactConstant } from "./trasformazioni-funzioni-math";

export type ConicKind = "circonferenza" | "parabola" | "ellisse" | "iperbole";
export const CONIC_KINDS: readonly ConicKind[] = ["circonferenza", "parabola", "ellisse", "iperbole"];

/** La finestra, fissa: unità uguali sui due assi. */
export const WINDOW = equalScaleWindow(-7, 7, 0);

const R = (n: number, d = 1) => Rational.of(n, d);
const half = R(1, 2);
const integers = (limit: number): StepRange => ({ step: Rational.ONE, min: R(-limit), max: R(limit) });
const semiAxis: StepRange = { step: half, min: half, max: R(6) };

/** I coefficienti di ogni conica: nome mostrato e intervallo del cursore. */
export const COEFFICIENTS: Readonly<Record<ConicKind, readonly { readonly name: string; readonly range: StepRange }[]>> = {
  circonferenza: [
    { name: "a", range: integers(6) },
    { name: "b", range: integers(6) },
    { name: "c", range: integers(12) },
  ],
  parabola: [
    { name: "a", range: { step: half, min: R(-3), max: R(3), nonZero: true } },
    { name: "b", range: integers(6) },
    { name: "c", range: integers(6) },
  ],
  ellisse: [
    { name: "a", range: semiAxis },
    { name: "b", range: semiAxis },
  ],
  iperbole: [
    { name: "a", range: semiAxis },
    { name: "b", range: semiAxis },
    { name: "k", range: { step: R(2), min: R(-1), max: R(1) } },
  ],
};

/** I coefficienti iniziali di ogni conica (scheda). */
export const DEFAULT_COEFFICIENTS: Readonly<Record<ConicKind, readonly Rational[]>> = {
  circonferenza: [R(-2), R(2), R(-7)],
  parabola: [R(1, 2), R(-1), R(-2)],
  ellisse: [R(4), R(2)],
  iperbole: [R(2), R(1), R(1)],
};

export const DEFAULT_PARAMS = { coniche: "circonferenza; parabola; ellisse; iperbole", conica: "", coefficienti: "" } as const;
const KNOWN_PARAMS = Object.keys(DEFAULT_PARAMS);

export interface ConicSetup {
  readonly kinds: readonly ConicKind[];
  readonly kind: ConicKind;
  /** I coefficienti iniziali di ogni conica. */
  readonly coefficients: Readonly<Record<ConicKind, readonly Rational[]>>;
}

export type ConicReading = { readonly ok: true; readonly setup: ConicSetup } | { readonly ok: false; readonly problems: readonly string[] };

/** Legge i parametri del blocco. Non lancia mai. */
export function readConicParams(params: Readonly<Record<string, string>>): ConicReading {
  const problems = unknownParams(params, KNOWN_PARAMS);
  const kinds: ConicKind[] = [];
  for (const item of (params.coniche ?? DEFAULT_PARAMS.coniche).split(";").map((text) => text.trim().toLowerCase())) {
    if (!(CONIC_KINDS as readonly string[]).includes(item)) problems.push(`Coniche: «${item}» non è una tra circonferenza, parabola, ellisse, iperbole.`);
    else if (kinds.includes(item as ConicKind)) problems.push(`Coniche: «${item}» è scritta due volte.`);
    else kinds.push(item as ConicKind);
  }
  const chosen = (params.conica ?? "").trim().toLowerCase();
  let kind = kinds[0];
  if (chosen !== "") {
    if (!kinds.includes(chosen as ConicKind)) problems.push(`Conica: «${params.conica}» deve essere una di quelle in «coniche» (${kinds.join(", ")}).`);
    else kind = chosen as ConicKind;
  }
  const coefficients = { ...DEFAULT_COEFFICIENTS };
  const written = (params.coefficienti ?? "").trim();
  if (written !== "" && kind) {
    const texts = written.split(";").map((text) => text.trim());
    const spec = COEFFICIENTS[kind];
    if (texts.length !== spec.length) problems.push(`Coefficienti: per ${kind === "ellisse" ? "l'ellisse" : `la ${kind}`} ne servono ${spec.length} (ce ne sono ${texts.length}).`);
    else {
      const values: Rational[] = [];
      texts.forEach((text, index) => {
        const item = spec[index] as (typeof spec)[number];
        const read = kind === "iperbole" && item.name === "k" ? readSign(text) : readStepRational(text, `Coefficiente ${item.name}`, item.range);
        if (typeof read === "string") problems.push(read);
        else values.push(read);
      });
      if (values.length === spec.length) coefficients[kind] = values;
    }
  }
  if (problems.length > 0 || !kind) return { ok: false, problems: problems.length > 0 ? problems : ["Coniche: ne serve almeno una."] };
  return { ok: true, setup: { kinds, kind, coefficients } };
}

function readSign(text: string): Rational | string {
  if (text === "1" || text === "+1") return Rational.ONE;
  if (text === "-1" || text === "−1") return R(-1);
  return `Coefficiente k: «${text}» deve essere 1 oppure -1 (il secondo membro dell'iperbole).`;
}

/** I problemi dei parametri (vuoto se vanno bene): per la verifica dei contenuti. */
export function checkConicParams(params: Readonly<Record<string, string>>): string[] {
  const reading = readConicParams(params);
  return reading.ok ? [] : [...reading.problems];
}

// ───────────────────────────── elementi esatti ─────────────────────────────

const numberExpr = (value: Rational): Expr => ({ kind: "num", value });
const q = (value: Rational): string => toLatex(numberExpr(value));

/** La radice quadrata esatta (semplificata) di un razionale non negativo. */
export function exactRoot(value: Rational): Expr {
  return exactConstant(sqrt(numberExpr(value))) ?? sqrt(numberExpr(value));
}

/** Un quoziente esatto (semplificato) di due espressioni costanti. */
const exactRatio = (num: Expr, den: Expr): Expr => exactConstant(div(num, den)) ?? div(num, den);

/** Un termine «± k·m» di un'equazione, pulito: niente 1·, niente + −. */
function term(coefficient: Rational, monomial: string, first: boolean): string {
  if (coefficient.isZero()) return "";
  const sign = coefficient.sign() < 0 ? "-" : first ? "" : "+";
  const abs = coefficient.abs();
  const body = monomial === "" ? q(abs) : abs.eq(1) ? monomial : `${q(abs)}${monomial}`;
  return `${first ? sign : ` ${sign} `}${body}`;
}

/** Un punto del piano: coordinate esatte (per il testo) e numeriche (per il disegno). */
export interface ConicPoint {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly latex: string;
}

/** Una retta da disegnare: verticale x = k, oppure y = m·x + q. */
export type ConicLine =
  | { readonly kind: "vertical"; readonly x: number; readonly role: "asse" | "direttrice" | "asintoto" }
  | { readonly kind: "sloped"; readonly m: number; readonly q: number; readonly role: "asse" | "direttrice" | "asintoto" };

export interface ConicStudy {
  /** L'equazione con i numeri, in LaTeX. */
  readonly equation: string;
  /** Gli elementi esatti, una riga di testo ricco ciascuno. */
  readonly facts: readonly string[];
  /** I tratti della curva, in coordinate del piano. */
  readonly segments: readonly (readonly (readonly [number, number])[])[];
  readonly foci: readonly ConicPoint[];
  /** Centro o vertici (punti neri). */
  readonly points: readonly ConicPoint[];
  readonly lines: readonly ConicLine[];
}

const pointLatex = (name: string, x: Expr, y: Expr): string => `${name}\\left(${toLatex(x)};\\, ${toLatex(y)}\\right)`;
const point = (name: string, x: Expr, y: Expr, nx: number, ny: number): ConicPoint => ({ name, x: nx, y: ny, latex: pointLatex(name, x, y) });
const ZERO = numberExpr(Rational.ZERO);
const neg = (e: Expr): Expr => exactConstant(negate(e)) ?? negate(e);

/** Una circonferenza (x − h)² + (y − k)² = r², come tratto. */
function ellipseSegment(h: number, k: number, rx: number, ry: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= 180; i++) {
    const t = (2 * Math.PI * i) / 180;
    points.push([h + rx * Math.cos(t), k + ry * Math.sin(t)]);
  }
  return points;
}

/** Studia la conica con i coefficienti dati. */
export function studyConic(kind: ConicKind, coefficients: readonly Rational[]): ConicStudy {
  switch (kind) {
    case "circonferenza":
      return studyCircle(coefficients);
    case "parabola":
      return studyParabola(coefficients);
    case "ellisse":
      return studyEllipse(coefficients);
    case "iperbole":
      return studyHyperbola(coefficients);
  }
}

const at = (values: readonly Rational[], index: number): Rational => values[index] ?? Rational.ZERO;

function studyCircle(values: readonly Rational[]): ConicStudy {
  const [a, b, c] = [at(values, 0), at(values, 1), at(values, 2)];
  const equation = `x^{2} + y^{2}${term(a, "x", false)}${term(b, "y", false)}${term(c, "", false)} = 0`;
  const h = a.div(-2);
  const k = b.div(-2);
  const r2 = h.mul(h).add(k.mul(k)).sub(c);
  const center = point("C", numberExpr(h), numberExpr(k), h.toNumber(), k.toNumber());
  const formula = `r^{2} = \\left(\\tfrac{a}{2}\\right)^{2} + \\left(\\tfrac{b}{2}\\right)^{2} - c = ${q(r2)}`;
  if (r2.sign() < 0) {
    return { equation, facts: [`Centro $${center.latex}$, ma $${formula} < 0$: **nessun punto** del piano soddisfa l'equazione, non è una circonferenza.`], segments: [], foci: [], points: [center], lines: [] };
  }
  if (r2.isZero()) {
    return { equation, facts: [`$${formula}$: l'equazione ha **un solo punto**, $${center.latex}$ (circonferenza degenere).`], segments: [], foci: [], points: [center], lines: [] };
  }
  const r = exactRoot(r2);
  const rn = Math.sqrt(r2.toNumber());
  return {
    equation,
    facts: [`Centro $${center.latex}$, cioè $\\left(-\\tfrac{a}{2};\\, -\\tfrac{b}{2}\\right)$.`, `$${formula}$, raggio $r = ${toLatex(r)}$.`],
    segments: [ellipseSegment(h.toNumber(), k.toNumber(), rn, rn)],
    foci: [],
    points: [center],
    lines: [],
  };
}

function studyParabola(values: readonly Rational[]): ConicStudy {
  const [a, b, c] = [at(values, 0), at(values, 1), at(values, 2)];
  const equation = `y = ${term(a, "x^{2}", true)}${term(b, "x", false)}${term(c, "", false)}`;
  const delta = b.mul(b).sub(a.mul(c).mul(4));
  const xv = b.neg().div(a.mul(2));
  const yv = delta.neg().div(a.mul(4));
  const yf = Rational.ONE.sub(delta).div(a.mul(4));
  const yd = Rational.ONE.add(delta).neg().div(a.mul(4));
  const vertex = point("V", numberExpr(xv), numberExpr(yv), xv.toNumber(), yv.toNumber());
  const focus = point("F", numberExpr(xv), numberExpr(yf), xv.toNumber(), yf.toNumber());
  const segment: [number, number][] = [];
  const band = 4 * (WINDOW.yMax - WINDOW.yMin);
  for (let i = 0; i <= 240; i++) {
    const x = WINDOW.xMin + ((WINDOW.xMax - WINDOW.xMin) * i) / 240;
    const y = a.toNumber() * x * x + b.toNumber() * x + c.toNumber();
    segment.push([x, Math.max(-band, Math.min(band, y))]);
  }
  return {
    equation,
    facts: [
      `$\\Delta = b^{2} - 4ac = ${q(delta)}$; vertice $${vertex.latex}$, cioè $\\left(-\\tfrac{b}{2a};\\, -\\tfrac{\\Delta}{4a}\\right)$.`,
      `Fuoco $${focus.latex}$, direttrice $y = ${q(yd)}$, asse di simmetria $x = ${q(xv)}$.`,
      `$a ${a.sign() > 0 ? "> 0" : "< 0"}$: concavità verso ${a.sign() > 0 ? "**l'alto**" : "**il basso**"}; più $|a|$ è grande, più la parabola è stretta (e il fuoco vicino al vertice: distano $\\tfrac{1}{4|a|} = ${q(Rational.ONE.div(a.abs().mul(4)))}$).`,
    ],
    segments: [segment],
    foci: [focus],
    points: [vertex],
    lines: [
      { kind: "vertical", x: xv.toNumber(), role: "asse" },
      { kind: "sloped", m: 0, q: yd.toNumber(), role: "direttrice" },
    ],
  };
}

function studyEllipse(values: readonly Rational[]): ConicStudy {
  const [a, b] = [at(values, 0), at(values, 1)];
  const a2 = a.mul(a);
  const b2 = b.mul(b);
  const equation = `\\frac{x^{2}}{${q(a2)}} + \\frac{y^{2}}{${q(b2)}} = 1`;
  const an = a.toNumber();
  const bn = b.toNumber();
  const vertices = [
    point("A_1", numberExpr(a.neg()), ZERO, -an, 0),
    point("A_2", numberExpr(a), ZERO, an, 0),
    point("B_1", ZERO, numberExpr(b.neg()), 0, -bn),
    point("B_2", ZERO, numberExpr(b), 0, bn),
  ];
  const lines: ConicLine[] = [
    { kind: "sloped", m: 0, q: 0, role: "asse" },
    { kind: "vertical", x: 0, role: "asse" },
  ];
  const segments = [ellipseSegment(0, 0, an, bn)];
  const verticesText = `Vertici $${vertices.map((v) => v.latex).join("$, $")}$; semiassi $a = ${q(a)}$, $b = ${q(b)}$.`;
  if (a.eq(b)) {
    return { equation, facts: [verticesText, `$a = b$: è una **circonferenza** di raggio $${q(a)}$; i due fuochi coincidono con il centro, eccentricità $e = 0$.`], segments, foci: [], points: vertices, lines };
  }
  const onX = a.cmp(b) > 0;
  const c2 = onX ? a2.sub(b2) : b2.sub(a2);
  const c = exactRoot(c2);
  const cn = Math.sqrt(c2.toNumber());
  const foci = onX
    ? [point("F_1", neg(c), ZERO, -cn, 0), point("F_2", c, ZERO, cn, 0)]
    : [point("F_1", ZERO, neg(c), 0, -cn), point("F_2", ZERO, c, 0, cn)];
  const e = exactRatio(c, numberExpr(onX ? a : b));
  return {
    equation,
    facts: [
      verticesText,
      `Fuochi sull'asse $${onX ? "x" : "y"}$ (${onX ? "$a > b$" : "$b > a$"}): $c = \\sqrt{${onX ? "a^{2} - b^{2}" : "b^{2} - a^{2}"}} = ${toLatex(c)}$, $${foci.map((f) => f.latex).join("$, $")}$.`,
      `Eccentricità $e = \\frac{c}{${onX ? "a" : "b"}} = ${toLatex(e)}$: più è vicina a $1$, più l'ellisse è schiacciata.`,
    ],
    segments,
    foci,
    points: vertices,
    lines,
  };
}

function studyHyperbola(values: readonly Rational[]): ConicStudy {
  const [a, b, k] = [at(values, 0), at(values, 1), at(values, 2)];
  const a2 = a.mul(a);
  const b2 = b.mul(b);
  const onX = k.sign() > 0;
  const equation = `\\frac{x^{2}}{${q(a2)}} - \\frac{y^{2}}{${q(b2)}} = ${onX ? "1" : "-1"}`;
  const an = a.toNumber();
  const bn = b.toNumber();
  const c2 = a2.add(b2);
  const c = exactRoot(c2);
  const cn = Math.sqrt(c2.toNumber());
  const vertices = onX
    ? [point("A_1", numberExpr(a.neg()), ZERO, -an, 0), point("A_2", numberExpr(a), ZERO, an, 0)]
    : [point("B_1", ZERO, numberExpr(b.neg()), 0, -bn), point("B_2", ZERO, numberExpr(b), 0, bn)];
  const foci = onX
    ? [point("F_1", neg(c), ZERO, -cn, 0), point("F_2", c, ZERO, cn, 0)]
    : [point("F_1", ZERO, neg(c), 0, -cn), point("F_2", ZERO, c, 0, cn)];
  const slope = b.div(a);
  const e = exactRatio(c, numberExpr(onX ? a : b));
  // I due rami: x = ±a·cosh t, y = b·sinh t (o scambiati), abbastanza lunghi da uscire dalla finestra.
  const reach = Math.acosh(Math.max(2, (3 * Math.max(WINDOW.xMax, WINDOW.yMax)) / Math.min(an, bn)));
  const branch = (sign: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const t = -reach + (2 * reach * i) / 160;
      pts.push(onX ? [sign * an * Math.cosh(t), bn * Math.sinh(t)] : [an * Math.sinh(t), sign * bn * Math.cosh(t)]);
    }
    return pts;
  };
  const facts = [
    `Vertici $${vertices.map((v) => v.latex).join("$, $")}$ (sull'asse $${onX ? "x" : "y"}$, perché il secondo membro è $${onX ? "1" : "-1"}$).`,
    `$c = \\sqrt{a^{2} + b^{2}} = ${toLatex(c)}$: fuochi $${foci.map((f) => f.latex).join("$, $")}$; eccentricità $e = \\frac{c}{${onX ? "a" : "b"}} = ${toLatex(e)} > 1$.`,
    `Asintoti $y = \\pm\\frac{b}{a}x$, cioè $y = \\pm ${slope.eq(1) ? "" : q(slope)}x$.`,
  ];
  if (a.eq(b)) facts.push("$a = b$: è un'**iperbole equilatera**, con gli asintoti perpendicolari ($y = \\pm x$).");
  return {
    equation,
    facts,
    segments: [branch(1), branch(-1)],
    foci,
    points: vertices,
    lines: [
      { kind: "sloped", m: slope.toNumber(), q: 0, role: "asintoto" },
      { kind: "sloped", m: -slope.toNumber(), q: 0, role: "asintoto" },
    ],
  };
}
