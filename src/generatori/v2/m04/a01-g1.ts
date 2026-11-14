// V2.M04.A01.g1 — Limiti di funzioni: limiti notevoli e forme indeterminate. La risposta è un valore
// di limite: un numero in forma esatta, +∞, −∞ oppure «non esiste».
//
// All'indietro: si scelgono prima i numeri che decidono il limite (i coefficienti negli argomenti dei
// limiti notevoli, gli zeri comuni di numeratore e denominatore, il segno del denominatore vicino al
// polo, l'esponente di e) e intorno si scrive la funzione; il valore si legge dai dati scelti. Le
// risposte sbagliate rifanno il conto con l'errore tipico:
//   - AN.LIMITE_NOTEVOLE: sin(ax)/(bx) → 1, il rapporto al contrario, il coefficiente non elevato al
//     quadrato o l'1/2 dimenticato in 1 − cos, il limite notevole usato dove la variabile non tende a 0;
//   - AN.FORMA_INDETERMINATA: 0/0 = 0, «denominatore nullo, quindi infinito», 0/0 «non esiste», 1^∞ = 1, ∞·0 = 0;
//   - AN.SEGNO_INFINITO: l'infinito con il segno opposto, ±∞ al posto di «non esiste» (o il contrario);
//   - AN.CONFRONTO_INFINITI: la regola dei gradi usata in un punto finito, o con i gradi diversi;
//   - AN.FATTORE_LIMITATO: «non esiste» perché compare un seno, quando il confronto dà il limite.
// La verifica indipendente guarda i valori della funzione vicino al punto, da destra e da sinistra
// (comuni/limits.ts), e controlla che il testo mostri proprio quella funzione.
//
// Livello 1: un limite notevole con i coefficienti (sin, tan, e^t − 1, ln(1 + t)); 0/0 tra polinomi da
//            scomporre; rapporto di polinomi per x → ±∞.
// Livello 2: rapporto di due limiti notevoli; 1 − cos; denominatore che si annulla (limiti laterali,
//            segno dell'infinito, «non esiste»); (1 + a/x)^(bx) e (1 + ax)^(b/x).
// Livello 3: differenza di limiti notevoli; (cos ax)^(b/x²); limite notevole in un punto diverso da 0;
//            sin(ax)/(bx) e x·f(a/x) per x → ±∞.

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { finiteLimit, limitToLatex, minusInfinity, noLimit, plusInfinity, type LimitValue } from "../../../motore/calculus/limit";
import { add, cos, div, e, fn, frac, ln, mul, neg, num, pow, sin, sub, sym, tan, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { confirmsLimit, distinctWrongLimits, limitLatex, toMinusInfinity, toPlusInfinity, toPoint, type Approach } from "../../comuni/limits";
import { leading, plusSigned, signedFraction, termWriter, times, type Poly, type Term } from "../../comuni/terms";
import type { WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];
type Level = GeneratorContext["level"];

const LIMITS = { maxInteger: 40, maxDenominator: 12 } as const;
const x = sym("x");
const t = sym("t");
const { power, termExpr, polyExpr, collected } = termWriter(x);

// ───────────────────────────── il modello ─────────────────────────────

/** Le funzioni dei limiti notevoli: ognuna, divisa per il suo argomento t, tende a 1 per t → 0. */
type Block = "sin" | "tan" | "exp" | "ln" | "arctan";
type Side = "both" | "left" | "right";
type End = "+inf" | "-inf";

type Model =
  /** f(ax)/(bx), oppure (bx)/f(ax) con flip. */
  | { readonly form: "notable"; readonly block: Block; readonly a: number; readonly b: number; readonly flip: boolean }
  /** c(x − r)(x − s) / (d(x − r)(x − u)) per x → r, scritti sviluppati. */
  | { readonly form: "cancel"; readonly r: number; readonly s: number; readonly u: number; readonly c: number; readonly d: number }
  /** Rapporto di polinomi per x → ±∞. */
  | { readonly form: "rational"; readonly top: Poly; readonly bottom: Poly; readonly end: End }
  /** f(ax)/g(bx). */
  | { readonly form: "twoNotable"; readonly top: Block; readonly bottom: Block; readonly a: number; readonly b: number }
  /** (1 − cos ax)/(b·x·g(x)), dove g(x) è x oppure una funzione notevole di x; negate: cos ax − 1. */
  | { readonly form: "cosine"; readonly a: number; readonly b: number; readonly partner: Block | "x"; readonly negate: boolean }
  /** (px + q)/D(x) per x → r, con D che si annulla in r: k(x − r), k(x − r)², (x − r)(x − s). */
  | { readonly form: "pole"; readonly p: number; readonly q: number; readonly r: number; readonly k: number; readonly shape: "simple" | "double" | "product"; readonly s: number; readonly side: Side }
  /** (1 + a/x)^(bx) per x → ±∞, oppure (1 + ax)^(b/x) per x → 0. */
  | { readonly form: "euler"; readonly a: number; readonly b: number; readonly at: End | "zero" }
  /** (f(ax) − g(bx))/(cx). */
  | { readonly form: "difference"; readonly top: Block; readonly bottom: Block; readonly a: number; readonly b: number; readonly c: number }
  /** (cos ax)^(b/x²). */
  | { readonly form: "cosPower"; readonly a: number; readonly b: number }
  /** f(k(x − r))/(x² − r²) per x → r. */
  | { readonly form: "shifted"; readonly block: Block; readonly k: number; readonly r: number }
  /** sin(ax)/(bx) per x → ±∞. */
  | { readonly form: "decay"; readonly a: number; readonly b: number; readonly end: End }
  /** bx·f(a/x) per x → ±∞. */
  | { readonly form: "hidden"; readonly block: Block; readonly a: number; readonly b: number; readonly end: End };

/** Quello che si ricava dal modello: la funzione, dove tende x, il limite, gli errori, la soluzione. */
interface Plan {
  readonly expr: Expr;
  readonly approach: Approach;
  readonly correct: LimitValue;
  readonly wrong: readonly WrongCandidate<LimitValue>[];
  readonly steps: readonly string[];
  readonly hints: readonly [string, string];
}

// ───────────────────────────── scrittura ─────────────────────────────

const tex = (expr: Expr): string => toLatex(expr);
const lim = (value: LimitValue): string => limitToLatex(value);
const ratio = (top: number, bottom: number): LimitValue => finiteLimit(frac(top, bottom));
const whole = (value: number): LimitValue => finiteLimit(num(value));
const zero = whole(0);
const one = whole(1);
const infinity = (sign: number): LimitValue => (sign > 0 ? plusInfinity : minusInfinity);
const ePower = (k: Expr): Expr => pow(e, k);
/** e^(p/q), con e per l'esponente 1. */
const eLimit = (top: number, bottom = 1): LimitValue => finiteLimit(top === bottom ? e : ePower(frac(top, bottom)));
const atZero = toPoint(num(0));
const endOf = (end: End): Approach => (end === "+inf" ? toPlusInfinity : toMinusInfinity);
const endTex = (end: End): string => (end === "+inf" ? "+\\infty" : "-\\infty");

/** La funzione notevole con argomento u: sin u, tan u, e^u − 1, ln(1 + u), arctan u. */
function blockOf(block: Block, u: Expr): Expr {
  switch (block) {
    case "sin":
      return sin(u);
    case "tan":
      return tan(u);
    case "exp":
      return sub(ePower(u), 1);
    case "ln":
      return ln(add(1, u));
    case "arctan":
      return fn("arctan", u);
  }
}

/** f(a·x), con a intero positivo. */
const blockAt = (block: Block, a: number): Expr => blockOf(block, times(a, x));
/** k · (formula), senza scrivere il fattore 1. */
const scaled = (k: number, formula: string): string => (k === 1 ? formula : `${k} \\cdot ${formula}`);
/** Il limite notevole scritto con la lettera t: «(sin t)/t → 1». */
const notableTex = (block: Block): string => `$${tex(div(blockOf(block, t), t))} \\to 1$ per $t \\to 0$`;
/** x − r scritto bene: x − 2, x + 3, x. */
const xMinus = (r: number): Expr => (r === 0 ? x : r > 0 ? sub(x, r) : add(x, -r));
const ZERO_OVER_ZERO = "Numeratore e denominatore tendono entrambi a $0$: è una forma indeterminata $\\frac{0}{0}$";

// ───────────────────────────── livello 1 ─────────────────────────────

function notablePlan(block: Block, a: number, b: number, flip: boolean): Plan {
  const f = blockAt(block, a);
  const expr = flip ? div(times(b, x), f) : div(f, times(b, x));
  const correct = flip ? ratio(b, a) : ratio(a, b);
  const unit = div(f, times(a, x));
  return {
    expr,
    approach: atZero,
    correct,
    wrong: [
      // Il limite notevole usato così com'è, senza guardare i coefficienti.
      { error: "AN.LIMITE_NOTEVOLE", value: one },
      // Il rapporto dei coefficienti al contrario.
      { error: "AN.LIMITE_NOTEVOLE", value: flip ? ratio(a, b) : ratio(b, a) },
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
    ],
    steps: [
      `${ZERO_OVER_ZERO}, e il valore va calcolato. Serve il limite notevole ${notableTex(block)}: la stessa quantità $t$ deve comparire nell'argomento della funzione e al denominatore.`,
      `Qui $t = ${tex(times(a, x))}$, che tende a $0$. ${flip ? "Al numeratore" : "Al denominatore"} c'è $${tex(times(b, x))}$ e non $${tex(times(a, x))}$: moltiplica e dividi per i coefficienti che servono.\n\n$$${tex(expr)} = ${tex(flip ? frac(b, a) : frac(a, b))} \\cdot ${tex(flip ? div(times(a, x), f) : unit)}$$`,
      flip
        ? `La frazione $${tex(unit)}$ tende a $1$, quindi anche la sua reciproca tende a $1$. Il limite è $${lim(correct)}$.`
        : `La seconda frazione tende a $1$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "È una forma $\\frac{0}{0}$ con una funzione di cui conosci un limite notevole. Quale? Attento: l'argomento della funzione e l'altro termine non hanno lo stesso coefficiente.",
      `Nel limite notevole ${notableTex(block)} la stessa $t$ sta nella funzione e nell'altro termine. Qui $t = ${tex(times(a, x))}$: moltiplica e dividi per quello che manca.`,
    ],
  };
}

function cancelPlan(r: number, s: number, u: number, c: number, d: number): Plan {
  const quadratic = (lead: number, other: number): Expr => polyExpr([{ coef: lead, deg: 2 }, { coef: -lead * (r + other), deg: 1 }, { coef: lead * r * other, deg: 0 }].filter((term) => term.coef !== 0));
  const expr = div(quadratic(c, s), quadratic(d, u));
  // Il fattore x (zero in 0) si scrive per primo: x(x + 3).
  const pair = (other: number): [Expr, Expr] => (other === 0 ? [x, xMinus(r)] : [xMinus(r), xMinus(other)]);
  const factored = (lead: number, other: number): Expr => (lead === 1 ? mul(...pair(other)) : mul(lead, ...pair(other)));
  const reduced = div(times(c, xMinus(s)), times(d, xMinus(u)));
  const correct = ratio(c * (r - s), d * (r - u));
  return {
    expr,
    approach: toPoint(num(r)),
    correct,
    wrong: [
      { error: "AN.FORMA_INDETERMINATA", value: noLimit },
      // La regola dei gradi vale per x → ∞, non in un punto.
      { error: "AN.CONFRONTO_INFINITI", value: ratio(c, d) },
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
    ],
    steps: [
      `Sostituendo $x = ${r}$ si annullano sia il numeratore sia il denominatore: è una forma indeterminata $\\frac{0}{0}$. Non vuol dire che il limite non esiste: i due polinomi hanno lo zero $${r}$ in comune, quindi sono entrambi divisibili per $${tex(xMinus(r))}$.`,
      `Scomponi:\n\n$$${tex(expr)} = ${tex(div(factored(c, s), factored(d, u)))}$$`,
      `Nel limite $x$ si avvicina a $${r}$ senza mai valere $${r}$, quindi il fattore $${tex(xMinus(r))}$ non è nullo e si può semplificare: resta $${tex(reduced)}$.`,
      `Ora la sostituzione $x = ${r}$ non dà più problemi: il numeratore vale $${c * (r - s)}$ e il denominatore $${d * (r - u)}$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      `Sostituisci $x = ${r}$: che forma ottieni? Se un polinomio si annulla in $${r}$, per quale binomio è divisibile?`,
      `Scomponi numeratore e denominatore: hanno entrambi il fattore $${tex(xMinus(r))}$. Semplificalo, poi sostituisci.`,
    ],
  };
}

function rationalPlan(top: Poly, bottom: Poly, end: End): Plan {
  const a = leading(top);
  const b = leading(bottom);
  const expr = div(polyExpr(top), polyExpr(bottom));
  const coefficients = ratio(a.coef, b.coef);
  const gap = a.deg - b.deg;
  // Per x → −∞ una potenza dispari di x è negativa.
  const powerSign = end === "-inf" && Math.abs(gap) % 2 === 1 ? -1 : 1;
  const sign = Math.sign(a.coef * b.coef) * powerSign;
  const steps = [
    `Numeratore e denominatore tendono all'infinito: è una forma indeterminata $\\frac{\\infty}{\\infty}$, e il risultato dipende dai gradi. Il numeratore ha grado $${a.deg}$, il denominatore ha grado $${b.deg}$.`,
    `Raccogli sopra e sotto la potenza di grado massimo:\n\n$$${tex(div(mul(power(a.deg), collected(top, a.deg)), mul(power(b.deg), collected(bottom, b.deg))))}$$`,
  ];
  const toZero = `Per $x \\to ${endTex(end)}$ le frazioni con $x$ al denominatore tendono a $0$`;
  let correct: LimitValue;
  let wrong: WrongCandidate<LimitValue>[];
  if (gap === 0) {
    correct = coefficients;
    wrong = [{ error: "AN.FORMA_INDETERMINATA", value: one }, { error: "AN.CONFRONTO_INFINITI", value: infinity(end === "+inf" ? 1 : -1) }, { error: "AN.CONFRONTO_INFINITI", value: zero }];
    steps.push(`Le potenze si semplificano. ${toZero}: restano i coefficienti dei termini di grado massimo, $${a.coef}$ sopra e $${b.coef}$ sotto. Il limite è $${lim(correct)}$.`);
  } else if (gap < 0) {
    correct = zero;
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, { error: "AN.CONFRONTO_INFINITI", value: infinity(sign) }, { error: "AN.FORMA_INDETERMINATA", value: one }];
    steps.push(`Semplificando le potenze resta il fattore $${tex(div(1, power(-gap)))}$, che tende a $0$. ${toZero}: le due parentesi tendono a $${a.coef}$ e a $${b.coef}$, e il loro rapporto a un numero finito. Il limite è $0$.`);
  } else {
    correct = infinity(sign);
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, { error: "AN.SEGNO_INFINITO", value: infinity(-sign) }, { error: "AN.CONFRONTO_INFINITI", value: zero }, { error: "AN.FORMA_INDETERMINATA", value: one }];
    steps.push(
      `Semplificando le potenze resta il fattore $${tex(power(gap))}$. Per $x \\to ${endTex(end)}$ tende a $${powerSign > 0 ? "+" : "-"}\\infty$${end === "-inf" ? (powerSign > 0 ? ": l'esponente è pari, e una potenza pari di un numero negativo è positiva" : ": l'esponente è dispari, e una potenza dispari di un numero negativo è negativa") : ""}.`,
      `${toZero}: le due parentesi tendono a $${a.coef}$ e a $${b.coef}$, e il loro rapporto a $${tex(frac(a.coef, b.coef))}$, che è ${a.coef * b.coef > 0 ? "positivo" : "negativo"}. Per la regola dei segni il limite è $${lim(correct)}$.`,
    );
  }
  return {
    expr,
    approach: endOf(end),
    correct,
    wrong,
    steps,
    hints: [
      `È un rapporto di polinomi per $x \\to ${endTex(end)}$: una forma $\\frac{\\infty}{\\infty}$. Che grado ha il numeratore? E il denominatore?`,
      `Raccogli sopra e sotto la potenza di $x$ di grado massimo e semplifica.${end === "-inf" ? " Poi guarda il segno: $x$ è negativo." : ""}`,
    ],
  };
}

// ───────────────────────────── livello 2 ─────────────────────────────

function twoNotablePlan(top: Block, bottom: Block, a: number, b: number): Plan {
  const f = blockAt(top, a);
  const g = blockAt(bottom, b);
  const expr = div(f, g);
  const correct = ratio(a, b);
  return {
    expr,
    approach: atZero,
    correct,
    wrong: [
      // «Ognuno dei due tende a 1.»
      { error: "AN.LIMITE_NOTEVOLE", value: one },
      { error: "AN.LIMITE_NOTEVOLE", value: ratio(b, a) },
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
    ],
    steps: [
      `${ZERO_OVER_ZERO}. Servono due limiti notevoli: ${notableTex(top)}${top === bottom ? "" : ` e ${notableTex(bottom)}`}. In ognuno la stessa $t$ sta nella funzione e al denominatore.`,
      `Dividi numeratore e denominatore per $x$, poi in ogni frazione moltiplica e dividi per il coefficiente che manca:\n\n$$${tex(expr)} = \\frac{${scaled(a, tex(div(f, times(a, x))))}}{${scaled(b, tex(div(g, times(b, x))))}}$$`,
      `Le due frazioni tendono a $1$: il numeratore tende a $${a}$ e il denominatore a $${b}$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "È una forma $\\frac{0}{0}$ con due funzioni di cui conosci un limite notevole. Come fai comparire, sotto ognuna, il suo argomento?",
      `Dividi sopra e sotto per $x$: ottieni $${tex(div(f, x))}$ e $${tex(div(g, x))}$. A che cosa tende ognuna delle due?`,
    ],
  };
}

function cosinePlan(a: number, b: number, partner: Block | "x", negate: boolean): Plan {
  const cosine = cos(times(a, x));
  const numerator = negate ? sub(cosine, 1) : sub(1, cosine);
  const g = partner === "x" ? x : blockAt(partner, 1);
  const denominator = partner === "x" ? times(b, pow(x, 2)) : b === 1 ? mul(x, g) : mul(b, x, g);
  const expr = div(numerator, denominator);
  const sign = negate ? -1 : 1;
  const correct = ratio(sign * a * a, 2 * b);
  const unit = div(sub(1, cosine), pow(times(a, x), 2));
  const steps = [
    `${ZERO_OVER_ZERO}. Serve il limite notevole $\\frac{1 - \\cos t}{t^{2}} \\to \\frac{1}{2}$ per $t \\to 0$: al denominatore c'è il quadrato dell'argomento del coseno${partner === "x" ? "" : `. Serve anche ${notableTex(partner)}`}.`,
    `Qui $t = ${tex(times(a, x))}$, quindi $t^{2} = ${a * a}x^{2}$: fai comparire $${tex(pow(times(a, x), 2))}$ sotto $1 - ${tex(cosine)}$.\n\n$$${tex(expr)} = ${tex(frac(sign * a * a, b))} \\cdot ${tex(unit)}${partner === "x" ? "" : ` \\cdot ${tex(div(x, g))}`}$$`,
    `La frazione con il coseno tende a $\\frac{1}{2}$${partner === "x" ? "" : `, e $${tex(div(x, g))}$ tende a $1$ (è la reciproca di un limite notevole)`}. Il limite è $${tex(frac(sign * a * a, b))} \\cdot \\frac{1}{2} = ${lim(correct)}$.`,
  ];
  return {
    expr,
    approach: atZero,
    correct,
    wrong: [
      // Il coefficiente non elevato al quadrato.
      { error: "AN.LIMITE_NOTEVOLE", value: ratio(sign * a, 2 * b) },
      // L'1/2 dimenticato: «(1 − cos t)/t² → 1».
      { error: "AN.LIMITE_NOTEVOLE", value: ratio(sign * a * a, b) },
      // Il limite notevole usato così com'è.
      { error: "AN.LIMITE_NOTEVOLE", value: ratio(sign, 2 * b) },
      { error: "AN.FORMA_INDETERMINATA", value: zero },
    ],
    steps,
    hints: [
      "È una forma $\\frac{0}{0}$ con $1 - \\cos$. Quale limite notevole ha il coseno? Che cosa c'è al denominatore, in quel limite?",
      `$\\frac{1 - \\cos t}{t^{2}} \\to \\frac{1}{2}$, con $t = ${tex(times(a, x))}$: sotto $1 - ${tex(cosine)}$ serve $${tex(pow(times(a, x), 2))} = ${a * a}x^{2}$.`,
    ],
  };
}

function polePlan(model: Extract<Model, { form: "pole" }>): Plan {
  const { p, q, r, k, shape, s, side } = model;
  const top = polyExpr([{ coef: p, deg: 1 }, { coef: q, deg: 0 }].filter((term) => term.coef !== 0));
  const m = p * r + q;
  let bottomTerms: Term[];
  let factored: Expr;
  /** Segno del denominatore a destra (σ = 1) o a sinistra (σ = −1) di r. */
  let signNear: (sigma: number) => number;
  let why: (sigma: number) => string;
  const sideName = (sigma: number): string => (sigma > 0 ? "A destra" : "A sinistra");
  const compare = (sigma: number): string => `$x ${sigma > 0 ? ">" : "<"} ${r}$`;
  switch (shape) {
    case "simple":
      bottomTerms = [{ coef: k, deg: 1 }, { coef: -k * r, deg: 0 }];
      factored = times(k, xMinus(r));
      signNear = (sigma) => Math.sign(k) * sigma;
      why = (sigma) => `${sideName(sigma)} di $${r}$ (${compare(sigma)}) il fattore $${tex(xMinus(r))}$ è ${sigma > 0 ? "positivo" : "negativo"}${k === 1 ? "" : `, e moltiplicato per $${k}$ dà un denominatore ${Math.sign(k) * sigma > 0 ? "positivo" : "negativo"}`}`;
      break;
    case "double":
      bottomTerms = [{ coef: k, deg: 2 }, { coef: -2 * k * r, deg: 1 }, { coef: k * r * r, deg: 0 }];
      factored = k === 1 ? pow(xMinus(r), 2) : neg(pow(xMinus(r), 2));
      signNear = () => Math.sign(k);
      why = (sigma) => `${sideName(sigma)} di $${r}$ il quadrato $${tex(pow(xMinus(r), 2))}$ è positivo${k === 1 ? "" : ", e con il meno davanti il denominatore è negativo"}`;
      break;
    case "product":
      bottomTerms = [{ coef: 1, deg: 2 }, { coef: -(r + s), deg: 1 }, { coef: r * s, deg: 0 }];
      factored = mul(xMinus(r), xMinus(s));
      signNear = (sigma) => sigma * Math.sign(r - s);
      why = (sigma) => `${sideName(sigma)} di $${r}$ (${compare(sigma)}) il fattore $${tex(xMinus(r))}$ è ${sigma > 0 ? "positivo" : "negativo"}, mentre $${tex(xMinus(s))}$ vale circa $${r - s}$, che è ${r - s > 0 ? "positivo" : "negativo"}: il denominatore è ${sigma * Math.sign(r - s) > 0 ? "positivo" : "negativo"}`;
      break;
  }
  const bottom = polyExpr(bottomTerms.filter((term) => term.coef !== 0));
  const expr = div(top, bottom);
  const sided = (sigma: number): LimitValue => infinity(Math.sign(m) * signNear(sigma));
  const right = sided(1);
  const left = sided(-1);
  const correct = side === "right" ? right : side === "left" ? left : right.kind === left.kind ? right : noLimit;
  // La regola dei gradi usata in un punto finito: gradi uguali → rapporto dei coefficienti, grado maggiore sotto → 0.
  const degreeRule: WrongCandidate<LimitValue> = { error: "AN.CONFRONTO_INFINITI", value: shape === "simple" ? ratio(p, k) : zero };
  let wrong: WrongCandidate<LimitValue>[];
  if (correct.kind === "none") {
    wrong = [{ error: "AN.SEGNO_INFINITO", value: plusInfinity }, { error: "AN.SEGNO_INFINITO", value: minusInfinity }, degreeRule];
  } else {
    const opposite = correct.kind === "+inf" ? minusInfinity : plusInfinity;
    wrong = [{ error: "AN.SEGNO_INFINITO", value: opposite }, { error: "AN.SEGNO_INFINITO", value: noLimit }, degreeRule];
  }
  const sameAsWritten = tex(bottom) === tex(factored);
  const describe = (sigma: number, value: LimitValue): string =>
    `${why(sigma)}. Il numeratore è vicino a $${m}$, ${m > 0 ? "positivo" : "negativo"}: il rapporto è ${value.kind === "+inf" ? "positivo" : "negativo"} e il limite ${sigma > 0 ? "destro" : "sinistro"} è $${lim(value)}$.`;
  const steps = [
    `Per $x \\to ${r}$ il numeratore tende a $${m}$ (basta sostituire $x = ${r}$), che non è $0$, mentre il denominatore tende a $0$. Non è una forma indeterminata: la funzione diventa grande in valore assoluto, e bisogna stabilire il segno.`,
    sameAsWritten ? `Il segno del denominatore $${tex(bottom)}$ vicino a $${r}$ dipende dal lato da cui $x$ si avvicina.` : `Scomponi il denominatore per leggerne il segno vicino a $${r}$:\n\n$$${tex(bottom)} = ${tex(factored)}$$`,
  ];
  if (side !== "left") steps.push(describe(1, right));
  if (side !== "right") steps.push(describe(-1, left));
  if (side === "both") {
    steps.push(correct.kind === "none" ? "I limiti destro e sinistro sono diversi: il limite non esiste." : `I limiti destro e sinistro coincidono: il limite è $${lim(correct)}$.`);
  }
  return {
    expr,
    approach: toPoint(num(r), side),
    correct,
    wrong,
    steps,
    hints: [
      `Sostituisci $x = ${r}$: il numeratore si annulla? E il denominatore? Un numero non nullo diviso per una quantità che tende a $0$ non è una forma indeterminata.`,
      side === "both"
        ? `Studia il segno del denominatore a destra e a sinistra di $${r}$ e calcola i due limiti laterali: coincidono?`
        : `Studia il segno del denominatore ${side === "right" ? "a destra" : "a sinistra"} di $${r}$: insieme al segno del numeratore decide tra $+\\infty$ e $-\\infty$.`,
    ],
  };
}

function eulerPlan(a: number, b: number, at: End | "zero"): Plan {
  const product = a * b;
  const correct = eLimit(product);
  const wrong: WrongCandidate<LimitValue>[] = [
    { error: "AN.FORMA_INDETERMINATA", value: one },
    { error: "AN.LIMITE_NOTEVOLE", value: eLimit(1) },
    a !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(b) } : null,
    a < 0 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(-product) } : null,
    b !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(a) } : null,
  ];
  if (at === "zero") {
    const base = plusSigned(num(1), a, times(Math.abs(a), x));
    const expr = pow(base, div(b, x));
    return {
      expr,
      approach: atZero,
      correct,
      wrong,
      steps: [
        "La base tende a $1$ e l'esponente è infinito: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole $\\left(1 + t\\right)^{\\frac{1}{t}} \\to e$ per $t \\to 0$: all'esponente deve esserci il reciproco della quantità sommata a $1$.",
        `Qui $t = ${tex(times(a, x))}$, quindi $\\frac{1}{t} = ${tex(signedFraction(Math.sign(a), times(Math.abs(a), x)))}$. L'esponente è $${tex(div(b, x))} = ${product === 1 ? "" : product === -1 ? "-" : `${product} \\cdot `}\\frac{1}{t}$, quindi\n\n$$${tex(expr)} = \\left[\\left(1 + t\\right)^{\\frac{1}{t}}\\right]^{${product}}$$`,
        `La parentesi quadra tende a $e$, quindi il limite è $${lim(correct)}$.`,
      ],
      hints: [
        "La base tende a $1$ e l'esponente all'infinito: è la forma $1^{\\infty}$, che non vale $1$. Quale limite notevole ha questa forma, per una variabile che tende a $0$?",
        `In $\\left(1 + t\\right)^{\\frac{1}{t}} \\to e$ l'esponente è il reciproco di $t$. Qui $t = ${tex(times(a, x))}$: riscrivi l'esponente $${tex(div(b, x))}$ come un numero per $\\frac{1}{t}$.`,
      ],
    };
  }
  const expr = pow(plusSigned(num(1), a, div(Math.abs(a), x)), times(b, x));
  const tOf = a === 1 ? x : a === -1 ? neg(x) : a > 0 ? div(x, a) : neg(div(x, -a));
  return {
    expr,
    approach: endOf(at),
    correct,
    wrong,
    steps: [
      "La base tende a $1$ e l'esponente è infinito: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole $\\left(1 + \\frac{1}{t}\\right)^{t} \\to e$, che vale sia per $t \\to +\\infty$ sia per $t \\to -\\infty$: la stessa $t$ sta al denominatore della frazione e all'esponente.",
      `Scrivi la frazione come $\\frac{1}{t}$, con $t = ${tex(tOf)}$: per $x \\to ${endTex(at)}$ anche $|t| \\to +\\infty$. L'esponente è $${tex(times(b, x))} = ${product === 1 ? "t" : product === -1 ? "-t" : `${product}t`}$, quindi\n\n$$${tex(expr)} = \\left[\\left(1 + \\frac{1}{t}\\right)^{t}\\right]^{${product}}$$`,
      `La parentesi quadra tende a $e$, quindi il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "La base tende a $1$ e l'esponente all'infinito: è la forma $1^{\\infty}$, che non vale $1$. Quale limite notevole ha questa forma?",
      `In $\\left(1 + \\frac{1}{t}\\right)^{t} \\to e$ la stessa $t$ sta nella frazione e all'esponente. Qui $t = ${tex(tOf)}$: riscrivi l'esponente $${tex(times(b, x))}$ come un numero per $t$.`,
    ],
  };
}

// ───────────────────────────── livello 3 ─────────────────────────────

function differencePlan(top: Block, bottom: Block, a: number, b: number, c: number): Plan {
  const f = blockAt(top, a);
  const g = blockAt(bottom, b);
  // e^(ax) − 1 − (e^(bx) − 1) si scrive e^(ax) − e^(bx); negli altri casi i termini restano in fila.
  const main = (block: Block, coef: number): Expr => (block === "exp" ? ePower(times(coef, x)) : blockAt(block, coef));
  const pieces: Expr[] = [main(top, a)];
  if (top === "exp" && bottom !== "exp") pieces.push(neg(num(1)));
  pieces.push(neg(main(bottom, b)));
  if (bottom === "exp" && top !== "exp") pieces.push(num(1));
  const expr = div(add(...pieces), times(c, x));
  const correct = ratio(a - b, c);
  return {
    expr,
    approach: atZero,
    correct,
    wrong: [
      // «Ogni rapporto tende a 1, e 1 − 1 = 0.»
      { error: "AN.LIMITE_NOTEVOLE", value: zero },
      // Il coefficiente del denominatore dimenticato.
      { error: "AN.LIMITE_NOTEVOLE", value: whole(a - b) },
      { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
      { error: "AN.FORMA_INDETERMINATA", value: noLimit },
    ],
    steps: [
      `${ZERO_OVER_ZERO}. Al numeratore c'è una differenza di due quantità che tendono a $0$: ${top === "exp" && bottom === "exp" ? "aggiungi e togli $1$ per riconoscere due limiti notevoli," : "sono le funzioni di due limiti notevoli,"} ${notableTex(top)}${top === bottom ? "" : ` e ${notableTex(bottom)}`}.`,
      `Spezza la frazione in due e porta fuori $${tex(frac(1, c))}$:\n\n$$${tex(frac(1, c))}\\left(${tex(div(f, x))} - ${tex(div(g, x))}\\right)$$`,
      `In ogni frazione moltiplica e dividi per il coefficiente dell'argomento: $${tex(div(f, x))} = ${scaled(a, tex(div(f, times(a, x))))} \\to ${a}$ e $${tex(div(g, x))} = ${scaled(b, tex(div(g, times(b, x))))} \\to ${b}$.`,
      `I due limiti sono finiti, quindi il limite della differenza è la differenza dei limiti: $${tex(frac(1, c))} \\cdot \\left(${a} - ${b}\\right) = ${lim(correct)}$.`,
    ],
    hints: [
      "È una forma $\\frac{0}{0}$, con una differenza al numeratore. Riesci a spezzare la frazione in due, in modo che in ognuna compaia un limite notevole?",
      `Scrivi la funzione come $${tex(frac(1, c))}\\left(${tex(div(f, x))} - ${tex(div(g, x))}\\right)$ e calcola separatamente i due limiti: non valgono $1$.`,
    ],
  };
}

function cosPowerPlan(a: number, b: number): Plan {
  const cosine = cos(times(a, x));
  const expr = pow(cosine, signedFraction(b, pow(x, 2)));
  const correct = eLimit(-a * a * b, 2);
  const inner = div(times(b, sub(cosine, 1)), pow(x, 2));
  return {
    expr,
    approach: atZero,
    correct,
    wrong: [
      { error: "AN.FORMA_INDETERMINATA", value: one },
      // Il segno di cos − 1 va perso.
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(a * a * b, 2) },
      // L'1/2 dimenticato.
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(-a * a * b) },
      // Il coefficiente non elevato al quadrato.
      a !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(-a * b, 2) } : null,
    ],
    steps: [
      "La base tende a $1$ e l'esponente è infinito: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole $\\left(1 + t\\right)^{\\frac{1}{t}} \\to e$ per $t \\to 0$.",
      `Scrivi la base come $1 + t$, con $t = ${tex(sub(cosine, 1))}$, che tende a $0$. All'esponente fai comparire $\\frac{1}{t}$:\n\n$$${tex(expr)} = \\left[\\left(1 + t\\right)^{\\frac{1}{t}}\\right]^{${tex(inner)}}$$`,
      `La parentesi quadra tende a $e$. Il suo esponente si calcola con il limite notevole $\\frac{1 - \\cos u}{u^{2}} \\to \\frac{1}{2}$, con $u = ${tex(times(a, x))}$: $${tex(div(sub(cosine, 1), pow(x, 2)))} \\to ${tex(frac(-a * a, 2))}$, quindi l'esponente tende a $${tex(frac(-a * a * b, 2))}$.`,
      `Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "La base tende a $1$ e l'esponente all'infinito: è la forma $1^{\\infty}$, che non vale $1$. Come si scrive la base nella forma $1 + t$, con $t \\to 0$?",
      `Poni $t = ${tex(sub(cosine, 1))}$: la funzione è $\\left[\\left(1 + t\\right)^{\\frac{1}{t}}\\right]$ elevata a $${tex(inner)}$. A che cosa tende questo esponente?`,
    ],
  };
}

function shiftedPlan(block: Block, k: number, r: number): Plan {
  const argument = polyExpr([{ coef: k, deg: 1 }, { coef: -k * r, deg: 0 }]);
  const f = blockOf(block, argument);
  const expr = div(f, polyExpr([{ coef: 1, deg: 2 }, { coef: -r * r, deg: 0 }]));
  const correct = ratio(k, 2 * r);
  return {
    expr,
    approach: toPoint(num(r)),
    correct,
    wrong: [
      // Il limite notevole usato senza guardare il denominatore.
      { error: "AN.LIMITE_NOTEVOLE", value: one },
      k !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: ratio(1, 2 * r) } : null,
      { error: "AN.FORMA_INDETERMINATA", value: noLimit },
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
    ],
    steps: [
      `Per $x \\to ${r}$ l'argomento $${tex(argument)}$ tende a $0$, e anche il denominatore: è una forma indeterminata $\\frac{0}{0}$. Serve il limite notevole ${notableTex(block)}, con $t = ${tex(argument)} = ${tex(times(k, xMinus(r)))}$.`,
      `Scomponi il denominatore, $${tex(mul(xMinus(r), xMinus(-r)))}$, e fai comparire $t$ sotto la funzione:\n\n$$${tex(div(f, argument))} \\cdot ${tex(div(k, xMinus(-r)))}$$`,
      `La prima frazione tende a $1$. Nella seconda si può sostituire: per $x \\to ${r}$ vale $${tex(frac(k, 2 * r))}$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      `Per $x \\to ${r}$ che cosa fa l'argomento $${tex(argument)}$? I limiti notevoli valgono quando l'argomento tende a $0$, anche se $x$ non tende a $0$.`,
      `Scomponi il denominatore in $${tex(mul(xMinus(r), xMinus(-r)))}$: il fattore $${tex(xMinus(r))}$ serve per il limite notevole con $t = ${tex(argument)}$.`,
    ],
  };
}

function decayPlan(a: number, b: number, end: End): Plan {
  const expr = div(sin(times(a, x)), times(b, x));
  return {
    expr,
    approach: endOf(end),
    correct: zero,
    wrong: [
      // Il limite notevole vale per x → 0, non per x → ∞.
      { error: "AN.LIMITE_NOTEVOLE", value: ratio(a, b) },
      { error: "AN.LIMITE_NOTEVOLE", value: one },
      { error: "AN.FATTORE_LIMITATO", value: noLimit },
    ],
    steps: [
      `Attento a dove tende $x$: il limite notevole $\\frac{\\sin t}{t} \\to 1$ vale per $t \\to 0$, ma qui $x \\to ${endTex(end)}$ e l'argomento del seno non tende a $0$.`,
      `Il seno non ha limite all'infinito, ma è limitato: $\\left|${tex(sin(times(a, x)))}\\right| \\le 1$. Quindi\n\n$$0 \\le \\left|${tex(expr)}\\right| \\le \\frac{1}{${b === 1 ? "" : b}\\left|x\\right|}$$`,
      "Il secondo membro tende a $0$: per il teorema del confronto la funzione tende a $0$. Una quantità limitata divisa per una che tende all'infinito tende a $0$.",
    ],
    hints: [
      "Guarda dove tende $x$. Il limite notevole del seno per quali valori dell'argomento vale?",
      "Il seno è limitato: sta sempre tra $-1$ e $1$. Che cosa succede a una quantità limitata divisa per una che tende all'infinito?",
    ],
  };
}

function hiddenPlan(block: Block, a: number, b: number, end: End): Plan {
  const f = blockOf(block, div(a, x));
  const expr = b === 1 ? mul(x, f) : mul(b, x, f);
  const correct = whole(a * b);
  const sign = end === "+inf" ? 1 : -1;
  return {
    expr,
    approach: endOf(end),
    correct,
    wrong: [
      // ∞ · 0 = 0.
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      // Il coefficiente dell'argomento dimenticato.
      { error: "AN.LIMITE_NOTEVOLE", value: whole(b) },
      { error: "AN.FORMA_INDETERMINATA", value: infinity(sign) },
      block === "sin" ? { error: "AN.FATTORE_LIMITATO", value: noLimit } : null,
    ],
    steps: [
      `Per $x \\to ${endTex(end)}$ il fattore $${tex(times(b, x))}$ tende all'infinito, mentre $${tex(div(a, x))} \\to 0$ e quindi $${tex(f)} \\to 0$: è una forma indeterminata $\\infty \\cdot 0$, che non vale $0$.`,
      `L'argomento $${tex(div(a, x))}$ tende a $0$: è la situazione del limite notevole ${notableTex(block)}. Poni $t = ${tex(div(a, x))}$, cioè $x = ${tex(div(a, t))}$.`,
      `Sostituisci: $${tex(times(b, x))} = ${tex(div(a * b, t))}$, quindi\n\n$$${tex(expr)} = ${scaled(a * b, tex(div(blockOf(block, t), t)))}$$`,
      `Per $x \\to ${endTex(end)}$ si ha $t \\to 0$ e la frazione tende a $1$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      `È una forma $\\infty \\cdot 0$, che non vale $0$. A che cosa tende l'argomento $${tex(div(a, x))}$? C'è un limite notevole nascosto.`,
      `Poni $t = ${tex(div(a, x))}$: $t \\to 0$ e $x = ${tex(div(a, t))}$. Riscrivi tutto con $t$.`,
    ],
  };
}

function planOf(model: Model): Plan {
  switch (model.form) {
    case "notable":
      return notablePlan(model.block, model.a, model.b, model.flip);
    case "cancel":
      return cancelPlan(model.r, model.s, model.u, model.c, model.d);
    case "rational":
      return rationalPlan(model.top, model.bottom, model.end);
    case "twoNotable":
      return twoNotablePlan(model.top, model.bottom, model.a, model.b);
    case "cosine":
      return cosinePlan(model.a, model.b, model.partner, model.negate);
    case "pole":
      return polePlan(model);
    case "euler":
      return eulerPlan(model.a, model.b, model.at);
    case "difference":
      return differencePlan(model.top, model.bottom, model.a, model.b, model.c);
    case "cosPower":
      return cosPowerPlan(model.a, model.b);
    case "shifted":
      return shiftedPlan(model.block, model.k, model.r);
    case "decay":
      return decayPlan(model.a, model.b, model.end);
    case "hidden":
      return hiddenPlan(model.block, model.a, model.b, model.end);
  }
}

// ───────────────────────────── costruzione (l'unico punto che usa rng) ─────────────────────────────

const BASIC: readonly Block[] = ["sin", "tan", "exp", "ln"];
const ALL: readonly Block[] = ["sin", "tan", "exp", "ln", "arctan"];
const drawEnd = (rng: Rng_): End => rng.pick(["+inf", "-inf"] as const);

/** Un polinomio di grado `deg` con coefficiente direttivo `lead` e uno o due termini di grado più basso, in ordine di grado. */
function drawPoly(rng: Rng_, deg: number, lead: number, extra: number): Term[] {
  const lower = rng.sample(Array.from({ length: deg }, (_, k) => k), Math.min(extra, deg)).sort((s, u) => u - s);
  return [{ coef: lead, deg }, ...lower.map((k) => ({ coef: rng.intExcept(-9, 9), deg: k }))];
}

function drawModel(level: Level, rng: Rng_): Model {
  if (level === 1) {
    const form = rng.pick(["notable", "notable", "notable", "cancel", "cancel", "rational"] as const);
    switch (form) {
      case "notable": {
        const b = rng.int(1, 7);
        return { form, block: rng.pick(BASIC), a: rng.intExcept(1, 7, [b]), b, flip: rng.bool(0.25) };
      }
      case "cancel": {
        const r = rng.int(-3, 3);
        const s = rng.intExcept(-4, 4, [r]);
        return { form, r, s, u: rng.intExcept(-3, 3, [r, s]), c: rng.pick([1, 1, 2, 3]), d: rng.pick([1, 1, 2]) };
      }
      case "rational": {
        // Prima il caso (e quindi il limite), poi gradi e coefficienti.
        const kind = rng.pick(["equal", "lower", "higher", "higher"] as const);
        const big = rng.int(kind === "equal" ? 1 : 2, 3);
        const small = kind === "equal" ? big : rng.int(1, big - 1);
        const b = rng.intExcept(-5, 5);
        return {
          form,
          top: drawPoly(rng, kind === "lower" ? small : big, rng.intExcept(-6, 6, [0, b]), rng.int(1, 2)),
          bottom: drawPoly(rng, kind === "higher" ? small : big, b, rng.int(1, 2)),
          end: kind === "higher" ? rng.pick(["-inf", "-inf", "+inf"] as const) : drawEnd(rng),
        };
      }
    }
  }
  if (level === 2) {
    const form = rng.pick(["twoNotable", "twoNotable", "cosine", "cosine", "pole", "pole", "pole", "euler"] as const);
    switch (form) {
      case "twoNotable": {
        const b = rng.int(1, 7);
        const top = rng.pick(ALL);
        return { form, top, bottom: rng.pick(ALL.filter((block) => block !== top)), a: rng.intExcept(1, 7, [b]), b };
      }
      case "cosine":
        return { form, a: rng.int(2, 4), b: rng.int(1, 6), partner: rng.pick(["x", "x", "sin", "tan", "ln", "exp"] as const), negate: rng.bool(0.3) };
      case "pole": {
        const shape = rng.pick(["simple", "simple", "double", "product"] as const);
        const r = rng.int(-4, 4);
        const p = rng.intExcept(-4, 4);
        return {
          form,
          p,
          // Il numeratore non si annulla nel polo.
          q: rng.intExcept(-9, 9, [-p * r]),
          r,
          k: shape === "simple" ? rng.intExcept(-3, 3) : shape === "double" ? rng.pick([1, 1, -1]) : 1,
          shape,
          s: shape === "product" ? rng.intExcept(-5, 5, [r]) : 0,
          side: rng.pick(["both", "both", "left", "right"] as const),
        };
      }
      case "euler": {
        const a = rng.intExcept(-5, 5);
        return { form, a, b: rng.intExcept(1, 3, a === 1 ? [1] : []), at: rng.pick(["+inf", "-inf", "zero", "zero"] as const) };
      }
    }
  }
  const form = rng.pick(["difference", "difference", "cosPower", "shifted", "shifted", "decay", "hidden", "hidden"] as const);
  switch (form) {
    case "difference": {
      const a = rng.int(1, 7);
      return { form, top: rng.pick(BASIC), bottom: rng.pick(BASIC), a, b: rng.intExcept(1, 7, [a]), c: rng.int(2, 6) };
    }
    case "cosPower":
      return { form, a: rng.int(1, 3), b: rng.intExcept(-4, 4) };
    case "shifted":
      return { form, block: rng.pick(["sin", "tan", "exp", "arctan"] as const), k: rng.int(1, 5), r: rng.intExcept(-5, 5) };
    case "decay": {
      const b = rng.int(1, 7);
      return { form, a: rng.intExcept(1, 7, [b]), b, end: drawEnd(rng) };
    }
    case "hidden":
      return { form, block: rng.pick(BASIC), a: rng.int(2, 6), b: rng.int(1, 5), end: drawEnd(rng) };
  }
}

/** Vero se l'esercizio va bene: almeno tre errori tipici che danno risposte diverse. */
function acceptable(model: Model): boolean {
  const plan = planOf(model);
  if (distinctWrongLimits(plan.correct, plan.wrong).length < 3) return false;
  return true;
}

/** Estrae modelli finché uno va bene (ne bastano pochi), sempre con lo stesso rng. */
function buildModel(level: Level, rng: Rng_): Model {
  for (let attempt = 0; attempt < 200; attempt++) {
    const model = drawModel(level, rng);
    if (acceptable(model)) return model;
  }
  throw new Error("V2.M04.A01.g1: nessuna funzione adatta trovata.");
}

// ───────────────────────────── esercizio ─────────────────────────────

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const steps: SolutionStep[] = plan.steps.map((text) => ({ text }));
  return {
    prompt: `Calcola il limite:\n\n$$${limitLatex("x", plan.approach, plan.expr)}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste».`,
    answer: { kind: "limit", correct: plan.correct, wrong: distinctWrongLimits(plan.correct, plan.wrong) },
    steps,
    hints: plan.hints,
  };
}

export default defineGenerator({
  code: "V2.M04.A01.g1",
  skill: "V2.M04.A01",
  lesson: "V2.M04.L03",
  title: "Limiti notevoli e forme indeterminate",
  levels: [1, 2, 3],
  errors: ["AN.LIMITE_NOTEVOLE", "AN.FORMA_INDETERMINATA", "AN.SEGNO_INFINITO", "AN.CONFRONTO_INFINITI", "AN.FATTORE_LIMITATO"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    if (exercise.answer.kind !== "limit") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    // Il testo deve mostrare proprio questa funzione e questo punto, e i valori vicino al punto devono confermare la risposta.
    if (!exercise.prompt.includes(limitLatex("x", plan.approach, plan.expr))) return false;
    return confirmsLimit(plan.expr, "x", plan.approach, exercise.answer.correct);
  },
});
