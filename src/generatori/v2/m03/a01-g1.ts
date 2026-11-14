// V2.M03.A01.g1 — Limiti di successioni. GENERATORE DI RIFERIMENTO per le risposte di tipo «limite»
// (un numero in forma esatta, +∞, −∞ oppure «non esiste»).
//
// All'indietro: si sceglie prima che cosa decide il limite (i coefficienti dei termini dominanti, la
// differenza sotto le radici, l'esponente di e, il fattore che oscilla) e intorno si scrive la
// successione; il valore del limite si legge dai dati scelti, non si calcola. Le risposte sbagliate
// rifanno il conto con l'errore tipico:
//   - AN.FORMA_INDETERMINATA: ∞/∞ = 1, ∞ − ∞ = 0, 1^∞ = 1;
//   - AN.CONFRONTO_INFINITI: rapporto dei coefficienti anche con gradi diversi, 0 e ∞ scambiati, coefficienti
//     dei primi termini scritti invece di quelli dominanti, potenze prese al posto degli esponenziali;
//   - AN.SEGNO_INFINITO: l'infinito con il segno opposto;
//   - AN.LIMITE_NOTEVOLE: (1 + a/n)^(bn) → e, oppure con un solo pezzo dell'esponente;
//   - AN.FATTORE_LIMITATO: (−1)^n ignorato, oppure «non esiste» quando il confronto dà 0;
//   - CALC.MENO_PARENTESI: nella razionalizzazione, il meno non cambia il segno di tutta la parentesi;
//   - ALG.RADICE_SOMMA: √(n² + an) spezzata in n + √(an).
// La verifica indipendente non rifà il conto: guarda i valori della successione per n grande (posti
// pari e dispari) e controlla che siano compatibili con la risposta (comuni/limits.ts).
//
// Livello 1: rapporto di polinomi scritti in ordine (gradi uguali, grado minore sopra, grado maggiore sopra).
// Livello 2: rapporto di polinomi scritti in disordine; n − √(n² + …) da razionalizzare; (1 + a/n)^(bn);
//            esponenziali contro potenze.
// Livello 3: fattori oscillanti ((−1)^n, sin n, cos n) con il confronto e le sottosuccessioni; ((n + a)/(n + b))^(cn);
//            i casi (1 + a/n²)^(bn) e (1 + a/n)^(bn²); differenza di due radici.

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { finiteLimit, limitToLatex, minusInfinity, noLimit, plusInfinity, type LimitValue } from "../../../motore/calculus/limit";
import { add, cos, div, e, frac, mul, neg, num, pow, sin, sqrt, sub, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { confirmsLimit, distinctWrongLimits, limitLatex, toPlusInfinity } from "../../comuni/limits";
import type { WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];
type Level = GeneratorContext["level"];

const LIMITS = { maxInteger: 30, maxDenominator: 12 } as const;
const n = sym("n");

// ───────────────────────────── il modello ─────────────────────────────

/** Un termine c·n^deg. Un polinomio è l'elenco dei suoi termini, nell'ordine in cui si scrive. */
interface Term {
  readonly coef: number;
  readonly deg: number;
}
type Poly = readonly Term[];

type Model =
  /** Rapporto di due polinomi. */
  | { readonly form: "rational"; readonly top: Poly; readonly bottom: Poly }
  /** kn − √(k²n² + an + c). */
  | { readonly form: "rootMinus"; readonly k: number; readonly a: number; readonly c: number }
  /** √(k²n² + an) − √(k²n² + bn). */
  | { readonly form: "twoRoots"; readonly k: number; readonly a: number; readonly b: number }
  /** (1 + a/n)^(bn + shift). */
  | { readonly form: "euler"; readonly a: number; readonly b: number; readonly shift: number }
  /** ((n + a)/(n + b))^(cn). */
  | { readonly form: "eulerQuotient"; readonly a: number; readonly b: number; readonly c: number }
  /** (1 + a/n²)^(bn) («inside») oppure (1 + a/n)^(bn²) («outside»). */
  | { readonly form: "eulerTrap"; readonly a: number; readonly b: number; readonly square: "inside" | "outside" }
  /** (c·B^n + p)/(d·B'^n + q), con p e q potenze di n; polyFirst: le potenze sono scritte per prime. */
  | { readonly form: "hierarchy"; readonly topBase: number; readonly bottomBase: number; readonly c: number; readonly d: number; readonly p: Term; readonly q: Term; readonly polyFirst: boolean }
  /** Un fattore che oscilla: moltiplica il termine a·n^p («product») oppure gli è sommato con coefficiente c («addend»). */
  | { readonly form: "oscillating"; readonly factor: "sign" | "sin" | "cos"; readonly place: "product" | "addend"; readonly main: Term; readonly c: number; readonly bottom: Poly };

/** Quello che si ricava dal modello: la successione, il limite, gli errori, la soluzione. */
interface Plan {
  readonly expr: Expr;
  readonly correct: LimitValue;
  readonly wrong: readonly WrongCandidate<LimitValue>[];
  readonly steps: readonly string[];
  readonly hints: readonly [string, string];
  /** I due valori di n a cui la verifica guarda la successione (più piccoli quando ci sono esponenziali). */
  readonly scales?: readonly [number, number];
}

// ───────────────────────────── scrittura ─────────────────────────────

const power = (deg: number): Expr => (deg === 1 ? n : pow(n, deg));

function termExpr({ coef, deg }: Term): Expr {
  if (deg === 0) return num(coef);
  if (coef === 1) return power(deg);
  if (coef === -1) return neg(power(deg));
  return mul(coef, power(deg));
}

const polyExpr = (poly: Poly): Expr => (poly.length === 1 ? termExpr(poly[0] as Term) : add(...poly.map(termExpr)));
/** Il termine di grado massimo: è quello che decide. */
const leading = (poly: Poly): Term => poly.reduce((best, term) => (term.deg > best.deg ? term : best));
const first = (poly: Poly): Term => poly[0] as Term;
const byDegree = (poly: Poly): Term[] => [...poly].sort((s, t) => t.deg - s.deg);

/** «head ± piece» con il segno scritto davanti: 3 − 2/n, non 3 + (−2)/n. */
const plusSigned = (head: Expr, sign: number, piece: Expr): Expr => (sign < 0 ? sub(head, piece) : add(head, piece));

/** a/m con il segno davanti alla frazione. */
const signedFraction = (a: number, m: Expr): Expr => (a < 0 ? neg(div(-a, m)) : div(a, m));

/** Il polinomio diviso per n^deg, termine per termine: a + c/n + d/n². È quello che resta in parentesi dopo aver raccolto. */
function collected(poly: Poly, deg: number): Expr {
  const terms = byDegree(poly);
  const pieces = terms.slice(1).map((term) => signedFraction(term.coef, power(deg - term.deg)));
  return pieces.length === 0 ? num(first(terms).coef) : add(num(first(terms).coef), ...pieces);
}

const tex = (expr: Expr): string => toLatex(expr);
/** Un fattore scritto dopo il punto di moltiplicazione: tra parentesi se comincia con il meno. */
const factorTex = (expr: Expr): string => (toLatex(expr).startsWith("-") ? `\\left(${toLatex(expr)}\\right)` : toLatex(expr));
const ratio = (top: number, bottom: number): LimitValue => finiteLimit(frac(top, bottom));
const zero = finiteLimit(num(0));
const one = finiteLimit(num(1));
const infinity = (sign: number): LimitValue => (sign > 0 ? plusInfinity : minusInfinity);
/** e^k scritto come si deve: e per k = 1. */
const ePower = (k: number): Expr => (k === 1 ? e : pow(e, k));
const eLimit = (k: number): LimitValue => finiteLimit(ePower(k));
const lim = (value: LimitValue): string => limitToLatex(value);

// ───────────────────────────── le forme ─────────────────────────────

function rationalPlan(top: Poly, bottom: Poly): Plan {
  const a = leading(top);
  const b = leading(bottom);
  const expr = div(polyExpr(top), polyExpr(bottom));
  const coefficients = ratio(a.coef, b.coef);
  // Chi non cerca il grado massimo prende i coefficienti dei primi termini scritti.
  const shuffled = first(top) !== a || first(bottom) !== b;
  const firstWritten: WrongCandidate<LimitValue> = shuffled ? { error: "AN.CONFRONTO_INFINITI", value: ratio(first(top).coef, first(bottom).coef) } : null;
  const sign = Math.sign(a.coef * b.coef);

  const steps = [
    `Numeratore e denominatore tendono all'infinito: è una forma indeterminata $\\frac{\\infty}{\\infty}$, e il risultato dipende dai gradi. Il numeratore ha grado $${a.deg}$ (termine $${tex(termExpr(a))}$), il denominatore ha grado $${b.deg}$ (termine $${tex(termExpr(b))}$).` +
      (shuffled ? " I termini non sono scritti in ordine di grado: conta il termine di grado massimo, non il primo." : ""),
    `Raccogli sopra e sotto la potenza di grado massimo:\n\n$$${tex(div(mul(power(a.deg), collected(top, a.deg)), mul(power(b.deg), collected(bottom, b.deg))))}$$`,
  ];
  const toZero = "Per $n \\to +\\infty$ le frazioni con $n$ al denominatore tendono a $0$";
  let correct: LimitValue;
  let wrong: WrongCandidate<LimitValue>[];
  if (a.deg === b.deg) {
    correct = coefficients;
    wrong = [firstWritten, { error: "AN.FORMA_INDETERMINATA", value: one }, { error: "AN.CONFRONTO_INFINITI", value: plusInfinity }, { error: "AN.CONFRONTO_INFINITI", value: zero }];
    steps.push(`Le potenze si semplificano. ${toZero}: restano i coefficienti dei termini di grado massimo, $${a.coef}$ sopra e $${b.coef}$ sotto. Il limite è $${lim(correct)}$.`);
  } else if (a.deg < b.deg) {
    correct = zero;
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, { error: "AN.CONFRONTO_INFINITI", value: infinity(sign) }, { error: "AN.FORMA_INDETERMINATA", value: one }, firstWritten];
    steps.push(
      `Semplificando le potenze resta il fattore $${tex(div(1, power(b.deg - a.deg)))}$, che tende a $0$. ${toZero}, quindi le due parentesi tendono a $${a.coef}$ e a $${b.coef}$: il loro rapporto tende a un numero finito.`,
      "Una quantità che tende a $0$ per una che tende a un numero finito tende a $0$. Il denominatore ha grado maggiore e cresce più in fretta del numeratore: il limite è $0$.",
    );
  } else {
    correct = infinity(sign);
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, { error: "AN.SEGNO_INFINITO", value: infinity(-sign) }, { error: "AN.CONFRONTO_INFINITI", value: zero }, { error: "AN.FORMA_INDETERMINATA", value: one }];
    steps.push(
      `Semplificando le potenze resta il fattore $${tex(power(a.deg - b.deg))}$, che tende a $+\\infty$. ${toZero}, quindi le due parentesi tendono a $${a.coef}$ e a $${b.coef}$: il loro rapporto tende a $${tex(frac(a.coef, b.coef))}$, che è ${sign > 0 ? "positivo" : "negativo"}.`,
      `Il numeratore ha grado maggiore e il rapporto dei coefficienti è ${sign > 0 ? "positivo" : "negativo"}: il limite è $${lim(correct)}$.`,
    );
  }
  return {
    expr,
    correct,
    wrong,
    steps,
    hints: [
      "È un rapporto di polinomi: una forma $\\frac{\\infty}{\\infty}$. Che grado ha il numeratore? E il denominatore?",
      "Raccogli sopra e sotto la potenza di $n$ di grado massimo e semplifica: quello che resta in parentesi tende al coefficiente di quel termine.",
    ],
  };
}

/** √(k²n² + an + c): la radice, e la stessa radice dopo aver portato fuori n. */
function rootOf(k: number, a: number, c: number): { readonly radicand: Expr; readonly root: Expr; readonly reduced: Expr } {
  const terms: Term[] = [{ coef: k * k, deg: 2 }, { coef: a, deg: 1 }];
  if (c !== 0) terms.push({ coef: c, deg: 0 });
  return { radicand: polyExpr(terms), root: sqrt(polyExpr(terms)), reduced: sqrt(collected(terms, 2)) };
}

const times = (k: number, expr: Expr): Expr => (k === 1 ? expr : mul(k, expr));

function rootMinusPlan(k: number, a: number, c: number): Plan {
  const kn = times(k, n);
  const { radicand, root, reduced } = rootOf(k, a, c);
  const expr = sub(kn, root);
  const correct = ratio(-a, 2 * k);
  const difference: Term[] = [{ coef: -a, deg: 1 }];
  if (c !== 0) difference.push({ coef: -c, deg: 0 });
  return {
    expr,
    correct,
    wrong: [
      // ∞ − ∞ = 0.
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      // k²n² − (k²n² + an + c) = an + c: il meno cambia solo il primo segno.
      { error: "CALC.MENO_PARENTESI", value: ratio(a, 2 * k) },
      // √(k²n² + an) = kn + √(an): resta −√(an).
      { error: "ALG.RADICE_SOMMA", value: infinity(-a) },
    ],
    steps: [
      `I due addendi tendono entrambi all'infinito e si sottraggono: è una forma indeterminata $\\infty - \\infty$, che non vale $0$. La radice non si spezza: $${tex(root)}$ non è $${tex(kn)}$ più un'altra radice.`,
      `Moltiplica e dividi per la somma $${tex(add(kn, root))}$. Al numeratore compare una differenza di quadrati:\n\n$$${tex(div(sub(pow(kn, 2), radicand), add(kn, root)))}$$`,
      `Il meno davanti alla parentesi cambia il segno di tutti i suoi termini: al numeratore resta $${tex(polyExpr(difference))}$.`,
      `Al denominatore porta $n$ fuori dalla radice ($n > 0$, quindi $\\sqrt{n^{2}} = n$) e raccoglilo:\n\n$$${tex(add(kn, root))} = ${tex(mul(n, add(k, reduced)))}$$`,
      `Semplifica $n$ sopra e sotto:\n\n$$${tex(div(collected(difference, 1), add(k, reduced)))}$$`,
      `Per $n \\to +\\infty$ ${c !== 0 ? "le frazioni con $n$ al denominatore tendono a $0$: " : ""}il numeratore tende a $${-a}$ e il denominatore a $${k} + ${k} = ${2 * k}$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "È una forma $\\infty - \\infty$ con una radice: non vale $0$ e la radice non si può spezzare. Che cosa fa sparire una radice in una differenza?",
      `Moltiplica e dividi per $${tex(add(kn, root))}$: al numeratore ottieni una differenza di quadrati. Attento al meno davanti alla parentesi.`,
    ],
  };
}

function twoRootsPlan(k: number, a: number, b: number): Plan {
  const left = rootOf(k, a, 0);
  const right = rootOf(k, b, 0);
  const expr = sub(left.root, right.root);
  const correct = ratio(a - b, 2 * k);
  return {
    expr,
    correct,
    wrong: [
      { error: "AN.FORMA_INDETERMINATA", value: zero },
      // (k²n² + an) − (k²n² + bn) = an + bn.
      { error: "CALC.MENO_PARENTESI", value: ratio(a + b, 2 * k) },
      // Radici spezzate: √(an) − √(bn) = (√a − √b)·√n.
      { error: "ALG.RADICE_SOMMA", value: infinity(a - b) },
    ],
    steps: [
      "Le due radici tendono entrambe all'infinito e si sottraggono: è una forma indeterminata $\\infty - \\infty$, che non vale $0$. Le radici non si spezzano.",
      `Moltiplica e dividi per la somma delle due radici. Al numeratore compare una differenza di quadrati:\n\n$$${tex(div(sub(left.radicand, right.radicand), add(left.root, right.root)))}$$`,
      `Il meno davanti alla seconda parentesi cambia il segno di tutti i suoi termini: al numeratore resta $${tex(sub(times(a, n), times(b, n)))} = ${tex(termExpr({ coef: a - b, deg: 1 }))}$.`,
      `Al denominatore porta $n$ fuori da ogni radice ($n > 0$, quindi $\\sqrt{n^{2}} = n$) e raccoglilo:\n\n$$${tex(mul(n, add(left.reduced, right.reduced)))}$$`,
      `Semplifica $n$ sopra e sotto:\n\n$$${tex(div(a - b, add(left.reduced, right.reduced)))}$$`,
      `Per $n \\to +\\infty$ le frazioni con $n$ al denominatore tendono a $0$: ogni radice tende a $${k}$ e il denominatore a $${2 * k}$. Il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "È una forma $\\infty - \\infty$ tra due radici: non vale $0$ e le radici non si possono spezzare. Che cosa fa sparire le radici in una differenza?",
      "Moltiplica e dividi per la somma delle due radici: al numeratore ottieni una differenza di quadrati. Attento al meno davanti alla seconda parentesi.",
    ],
  };
}

/** «1 + a/m» con il segno scritto davanti alla frazione. */
const onePlus = (a: number, m: Expr): Expr => plusSigned(num(1), a, div(Math.abs(a), m));
/** n/a scritto bene: n, −n, n/2, −n/2. */
const nOver = (a: number, m: Expr = n): Expr => (a === 1 ? m : a === -1 ? neg(m) : a > 0 ? div(m, a) : neg(div(m, -a)));
/** k·t scritto bene: t, −t, 6t. */
const timesT = (k: number): string => (k === 1 ? "t" : k === -1 ? "-t" : `${k}t`);
const NOTABLE = "$\\left(1 + \\frac{1}{t}\\right)^{t} \\to e$ quando $t \\to +\\infty$ (e anche quando $t \\to -\\infty$)";
const bracket = (exponent: string): string => `\\left[\\left(1 + \\frac{1}{t}\\right)^{t}\\right]^{${exponent}}`;

function eulerPlan(a: number, b: number, shift: number): Plan {
  const exponent = shift === 0 ? times(b, n) : polyExpr([{ coef: b, deg: 1 }, { coef: shift, deg: 0 }]);
  const expr = pow(onePlus(a, n), exponent);
  const correct = eLimit(a * b);
  return {
    expr,
    correct,
    wrong: [
      { error: "AN.FORMA_INDETERMINATA", value: one },
      // Il limite notevole usato così com'è.
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(1) },
      // Si guarda solo l'esponente e non il numeratore della frazione, o il contrario.
      a !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(b) } : null,
      // Il segno della frazione va perso.
      a < 0 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(-a * b) } : null,
      b !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(a) } : null,
      // «Una base maggiore di 1 elevata all'infinito» (o minore di 1).
      { error: "AN.FORMA_INDETERMINATA", value: a > 0 ? plusInfinity : zero },
    ],
    steps: [
      `La base tende a $1$ e l'esponente a $+\\infty$: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole ${NOTABLE}: la stessa quantità $t$ deve comparire al denominatore della frazione e all'esponente.`,
      `Scrivi la frazione come $\\frac{1}{t}$, con $t = ${tex(nOver(a))}$: così $${tex(signedFraction(a, n))} = \\frac{1}{t}$ e $|t| \\to +\\infty$.`,
      shift === 0
        ? `All'esponente serve $t$: poiché $${tex(times(b, n))} = ${timesT(a * b)}$,\n\n$$${tex(expr)} = ${bracket(`${a * b}`)}$$`
        : `All'esponente serve $t$: poiché $${tex(times(b, n))} = ${timesT(a * b)}$, separa l'addendo $${shift}$ dell'esponente:\n\n$$${bracket(`${a * b}`)} \\cdot ${tex(shift === 1 ? onePlus(a, n) : pow(onePlus(a, n), shift))}$$\n\nIl secondo fattore ha la base che tende a $1$ e l'esponente fisso: tende a $1$.`,
      `La parentesi quadra tende a $e$, quindi il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "La base tende a $1$ e l'esponente all'infinito: è la forma $1^{\\infty}$, che non vale $1$. Quale limite notevole ha questa forma?",
      `Nel limite notevole $\\left(1 + \\frac{1}{t}\\right)^{t} \\to e$ la stessa $t$ sta nella frazione e all'esponente. Qui $t = ${tex(nOver(a))}$: riscrivi $${tex(times(b, n))}$ come un numero per $t$${shift === 0 ? "" : " e separa l'addendo che resta all'esponente"}.`,
    ],
  };
}

function eulerQuotientPlan(a: number, b: number, c: number): Plan {
  const shifted = (shift: number): Expr => (shift === 0 ? n : polyExpr([{ coef: 1, deg: 1 }, { coef: shift, deg: 0 }]));
  const base = div(shifted(a), shifted(b));
  const expr = pow(base, times(c, n));
  const gap = a - b;
  const correct = eLimit(c * gap);
  const rewritten = onePlus(gap, shifted(b));
  return {
    expr,
    correct,
    wrong: [
      { error: "AN.FORMA_INDETERMINATA", value: one },
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(1) },
      // La differenza presa al contrario.
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(-c * gap) },
      // Il fattore dell'esponente dimenticato.
      c !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(gap) } : null,
    ],
    steps: [
      `La base tende a $1$ (polinomi dello stesso grado, con gli stessi coefficienti direttivi) e l'esponente a $+\\infty$: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole ${NOTABLE}.`,
      `Scrivi la base come $1$ più una frazione: aggiungi e togli al numeratore quello che serve per ritrovare il denominatore.\n\n$$${tex(base)} = ${tex(div(add(n, ...(b === 0 ? [] : [num(b)]), num(gap)), shifted(b)))} = ${tex(rewritten)}$$`,
      `Poni $t = ${tex(nOver(gap, shifted(b)))}$: la frazione è $\\frac{1}{t}$ e $|t| \\to +\\infty$. Da qui $n = ${timesT(gap)}${b === 0 ? "" : b > 0 ? ` - ${b}` : ` + ${-b}`}$, quindi l'esponente è $${tex(times(c, n))} = ${timesT(c * gap)}${b === 0 ? "" : -c * b > 0 ? ` + ${-c * b}` : ` - ${c * b}`}$.`,
      b === 0
        ? `Quindi\n\n$$${tex(expr)} = ${bracket(`${c * gap}`)}$$`
        : `Separa le due parti dell'esponente:\n\n$$${bracket(`${c * gap}`)} \\cdot ${tex(-c * b === 1 ? rewritten : pow(rewritten, -c * b))}$$\n\nIl secondo fattore ha la base che tende a $1$ e l'esponente fisso: tende a $1$.`,
      `La parentesi quadra tende a $e$, quindi il limite è $${lim(correct)}$.`,
    ],
    hints: [
      "La base tende a $1$ e l'esponente all'infinito: è la forma $1^{\\infty}$, che non vale $1$. Come si scrive la base nella forma $1 + \\frac{1}{t}$?",
      `Scrivi la base come $${tex(rewritten)}$, poni $t = ${tex(nOver(gap, shifted(b)))}$ e riscrivi l'esponente con $t$.`,
    ],
  };
}

function eulerTrapPlan(a: number, b: number, square: "inside" | "outside"): Plan {
  const product = a * b;
  if (square === "inside") {
    const expr = pow(onePlus(a, pow(n, 2)), times(b, n));
    const shrinking = signedFraction(product, n);
    return {
      expr,
      correct: one,
      wrong: [
        // Il limite notevole applicato senza guardare che la frazione ha n² e l'esponente n.
        { error: "AN.LIMITE_NOTEVOLE", value: eLimit(product) },
        { error: "AN.LIMITE_NOTEVOLE", value: eLimit(1) },
        { error: "AN.FORMA_INDETERMINATA", value: a > 0 ? plusInfinity : zero },
        b !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(a) } : null,
      ],
      steps: [
        `La base tende a $1$ e l'esponente a $+\\infty$: è una forma indeterminata $1^{\\infty}$, e il valore va calcolato. Serve il limite notevole ${NOTABLE}, ma qui nella frazione c'è $n^{2}$ e all'esponente c'è $n$: non sono la stessa quantità.`,
        `Poni $t = ${tex(nOver(a, pow(n, 2)))}$: la frazione è $\\frac{1}{t}$ e $|t| \\to +\\infty$. L'esponente è $${tex(times(b, n))} = t \\cdot ${factorTex(shrinking)}$, quindi\n\n$$${tex(expr)} = ${bracket(tex(shrinking))}$$`,
        `La parentesi quadra tende a $e$, ma il suo esponente $${tex(shrinking)}$ tende a $0$: il limite è $e^{0} = 1$.`,
      ],
      hints: [
        "È una forma $1^{\\infty}$. Guarda bene: la potenza di $n$ nella frazione è la stessa che c'è all'esponente?",
        `Poni $t = ${tex(nOver(a, pow(n, 2)))}$ e riscrivi l'esponente $${tex(times(b, n))}$ come $t$ per qualcosa: a che cosa tende quel qualcosa?`,
      ],
    };
  }
  const expr = pow(onePlus(a, n), times(b, pow(n, 2)));
  const growing = termExpr({ coef: product, deg: 1 });
  const correct = a > 0 ? plusInfinity : zero;
  return {
    expr,
    correct,
    wrong: [
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(product) },
      { error: "AN.FORMA_INDETERMINATA", value: one },
      { error: "AN.LIMITE_NOTEVOLE", value: eLimit(1) },
      b !== 1 ? { error: "AN.LIMITE_NOTEVOLE", value: eLimit(a) } : null,
    ],
    steps: [
      `La base tende a $1$ e l'esponente a $+\\infty$: è una forma indeterminata $1^{\\infty}$, che non vale $1$. Serve il limite notevole ${NOTABLE}, ma qui nella frazione c'è $n$ e all'esponente c'è $n^{2}$: non sono la stessa quantità.`,
      `Poni $t = ${tex(nOver(a))}$: la frazione è $\\frac{1}{t}$ e $|t| \\to +\\infty$. L'esponente è $${tex(times(b, pow(n, 2)))} = t \\cdot ${factorTex(growing)}$, quindi\n\n$$${tex(expr)} = ${bracket(tex(growing))}$$`,
      a > 0
        ? `La parentesi quadra tende a $e$, che è maggiore di $1$, e il suo esponente $${tex(growing)}$ tende a $+\\infty$: il limite è $+\\infty$.`
        : `La parentesi quadra tende a $e$, che è maggiore di $1$, e il suo esponente $${tex(growing)}$ tende a $-\\infty$: il limite è $0$.`,
    ],
    hints: [
      "È una forma $1^{\\infty}$. Guarda bene: la potenza di $n$ nella frazione è la stessa che c'è all'esponente?",
      `Poni $t = ${tex(nOver(a))}$ e riscrivi l'esponente $${tex(times(b, pow(n, 2)))}$ come $t$ per qualcosa: a che cosa tende quel qualcosa?`,
    ],
    // Con n grande la potenza esce dalla portata dei numeri in virgola mobile: la verifica guarda n = 20 e n = 40.
    scales: [20, 40],
  };
}

function hierarchyPlan(model: Extract<Model, { form: "hierarchy" }>): Plan {
  const { topBase, bottomBase, c, d, p, q, polyFirst } = model;
  const exponential = (coef: number, base: number): Expr => (coef === 1 ? pow(base, n) : coef === -1 ? neg(pow(base, n)) : mul(coef, pow(base, n)));
  const side = (coef: number, base: number, term: Term): Expr => (polyFirst ? add(termExpr(term), exponential(coef, base)) : add(exponential(coef, base), termExpr(term)));
  const expr = div(side(c, topBase, p), side(d, bottomBase, q));
  /** c ± (potenza)/B^n: quello che resta raccogliendo B^n. */
  const rest = (coef: number, base: number, term: Term): Expr => plusSigned(num(coef), term.coef, div(termExpr({ coef: Math.abs(term.coef), deg: term.deg }), pow(base, n)));
  const coefficients = ratio(c, d);
  const powers: WrongCandidate<LimitValue> = { error: "AN.CONFRONTO_INFINITI", value: ratio(p.coef, q.coef) };
  const sign = Math.sign(c * d);
  const steps = [
    `È una forma $\\frac{\\infty}{\\infty}$ con infiniti di tipo diverso. Un esponenziale $a^{n}$ con $a > 1$ cresce più in fretta di qualunque potenza di $n$: sopra domina $${tex(exponential(c, topBase))}$, sotto domina $${tex(exponential(d, bottomBase))}$.`,
    `Raccogli sopra e sotto l'esponenziale:\n\n$$${tex(div(mul(pow(topBase, n), rest(c, topBase, p)), mul(pow(bottomBase, n), rest(d, bottomBase, q))))}$$`,
    `I rapporti tra una potenza e un esponenziale tendono a $0$: le due parentesi tendono a $${c}$ e a $${d}$.`,
  ];
  let correct: LimitValue;
  let wrong: WrongCandidate<LimitValue>[];
  if (topBase === bottomBase) {
    correct = coefficients;
    wrong = [powers, { error: "AN.FORMA_INDETERMINATA", value: one }, { error: "AN.CONFRONTO_INFINITI", value: plusInfinity }, { error: "AN.CONFRONTO_INFINITI", value: zero }];
    steps.push(`Gli esponenziali hanno la stessa base e si semplificano: il limite è $${lim(correct)}$.`);
  } else if (topBase < bottomBase) {
    correct = zero;
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, powers, { error: "AN.CONFRONTO_INFINITI", value: infinity(sign) }, { error: "AN.FORMA_INDETERMINATA", value: one }];
    steps.push(`Resta il fattore $${tex(pow(frac(topBase, bottomBase), n))}$, con la base minore di $1$: tende a $0$. Il limite è $0$.`);
  } else {
    correct = infinity(sign);
    wrong = [{ error: "AN.CONFRONTO_INFINITI", value: coefficients }, { error: "AN.SEGNO_INFINITO", value: infinity(-sign) }, { error: "AN.CONFRONTO_INFINITI", value: zero }, powers];
    steps.push(
      `Resta il fattore $${tex(pow(frac(topBase, bottomBase), n))}$, con la base maggiore di $1$: tende a $+\\infty$. È moltiplicato per una quantità che tende a $${tex(frac(c, d))}$, che è ${sign > 0 ? "positiva" : "negativa"}: il limite è $${lim(correct)}$.`,
    );
  }
  return {
    expr,
    correct,
    wrong,
    steps,
    hints: [
      "Sopra e sotto ci sono una potenza di $n$ e un esponenziale. Quale dei due cresce più in fretta?",
      "Raccogli sopra e sotto l'esponenziale: i rapporti tra una potenza e un esponenziale tendono a $0$. Poi confronta le basi.",
    ],
    scales: [40, 80],
  };
}

function oscillatingPlan(model: Extract<Model, { form: "oscillating" }>): Plan {
  const { factor, place, main, c, bottom } = model;
  const wave = factor === "sign" ? pow(neg(1), n) : factor === "sin" ? sin(n) : cos(n);
  const name = tex(wave);
  const b = leading(bottom);
  const values = factor === "sign" ? `vale solo $1$ o $-1$` : `sta sempre tra $-1$ e $1$`;
  const hints: [string, string] = [
    `${place === "addend" ? "Il termine" : "Il fattore"} $${name}$ non ha limite, ma ${values}: è limitato. Questo non basta per dire che il limite non esiste: guarda che cosa fa il resto.`,
    "",
  ];

  if (place === "addend") {
    // (a·n^p + c·oscillante)/(b·n^p + d): l'addendo limitato non conta.
    const expr = div(plusSigned(termExpr(main), c, times(Math.abs(c), wave)), polyExpr(bottom));
    const correct = ratio(main.coef, b.coef);
    hints[1] = `Raccogli $${tex(power(main.deg))}$ sopra e sotto: compare $${tex(div(wave, power(main.deg)))}$, una quantità limitata divisa per una che tende all'infinito.`;
    return {
      expr,
      correct,
      wrong: [
        { error: "AN.FATTORE_LIMITATO", value: noLimit },
        { error: "AN.FORMA_INDETERMINATA", value: one },
        { error: "AN.CONFRONTO_INFINITI", value: plusInfinity },
        { error: "AN.CONFRONTO_INFINITI", value: zero },
      ],
      steps: [
        `Il termine $${name}$ non ha limite, ma ${values}: è limitato. Sommato a $${tex(termExpr(main))}$, che tende all'infinito, non decide il limite.`,
        `Raccogli $${tex(power(main.deg))}$ sopra e sotto:\n\n$$${tex(div(plusSigned(num(main.coef), c, div(times(Math.abs(c), wave), power(main.deg))), collected(bottom, b.deg)))}$$`,
        `$${tex(div(wave, power(main.deg)))}$ è una quantità limitata divisa per una che tende all'infinito: per il teorema del confronto tende a $0$. Anche le altre frazioni con $n$ al denominatore tendono a $0$.`,
        `Restano i coefficienti $${main.coef}$ sopra e $${b.coef}$ sotto: il limite è $${lim(correct)}$.`,
      ],
      hints,
    };
  }

  // oscillante · a·n^p / (b·n^q + …).
  const plain = div(termExpr(main), polyExpr(bottom));
  // (−1)^n davanti alla frazione; seno e coseno al numeratore, dopo la potenza: 4n sin n.
  const waved = main.coef === 1 ? mul(power(main.deg), wave) : main.coef === -1 ? neg(mul(power(main.deg), wave)) : mul(main.coef, power(main.deg), wave);
  const expr = factor === "sign" ? mul(wave, plain) : div(waved, polyExpr(bottom));
  const coefficients = ratio(main.coef, b.coef);
  if (main.deg < b.deg) {
    hints[1] = `Togli il fattore $${name}$ prendendo il valore assoluto: $\\left|a_{n}\\right| \\le \\left|${tex(plain)}\\right|$. A che cosa tende il secondo membro?`;
    return {
      expr,
      correct: zero,
      wrong: [
        { error: "AN.FATTORE_LIMITATO", value: noLimit },
        { error: "AN.CONFRONTO_INFINITI", value: coefficients },
        { error: "AN.CONFRONTO_INFINITI", value: plusInfinity },
        { error: "AN.FORMA_INDETERMINATA", value: one },
      ],
      steps: [
        `Il fattore $${name}$ non ha limite, ma ${values}: $\\left|${name}\\right| \\le 1$. Chiama $a_{n}$ la successione: allora\n\n$$0 \\le \\left|a_{n}\\right| \\le \\left|${tex(plain)}\\right|$$`,
        `Il secondo membro è un rapporto di polinomi con il denominatore di grado maggiore (${b.deg} contro ${main.deg}): tende a $0$.`,
        "Per il teorema del confronto $\\left|a_{n}\\right| \\to 0$, quindi anche $a_{n} \\to 0$: una quantità limitata per una che tende a $0$ tende a $0$. Il limite è $0$.",
      ],
      hints,
    };
  }
  hints[1] = "Guarda separatamente i termini di posto pari e quelli di posto dispari: a che cosa tendono?";
  return {
    expr,
    correct: noLimit,
    wrong: [
      // Il fattore (−1)^n ignorato.
      { error: "AN.FATTORE_LIMITATO", value: coefficients },
      // «Limitata, quindi tende a 0»: ma il resto non tende a 0.
      { error: "AN.FATTORE_LIMITATO", value: zero },
      { error: "AN.FORMA_INDETERMINATA", value: one },
      { error: "AN.CONFRONTO_INFINITI", value: plusInfinity },
    ],
    steps: [
      `Senza il fattore $${name}$ resta $${tex(plain)}$: un rapporto di polinomi dello stesso grado, che tende a $${tex(frac(main.coef, b.coef))}$ (rapporto dei coefficienti dei termini di grado massimo). Non tende a $0$: il confronto qui non basta.`,
      `Per $n$ pari $${name} = 1$: i termini di posto pari tendono a $${tex(frac(main.coef, b.coef))}$.`,
      `Per $n$ dispari $${name} = -1$: i termini di posto dispari tendono a $${tex(frac(-main.coef, b.coef))}$.`,
      "Due sottosuccessioni hanno limiti diversi: il limite non esiste.",
    ],
    hints,
  };
}

function planOf(model: Model): Plan {
  switch (model.form) {
    case "rational":
      return rationalPlan(model.top, model.bottom);
    case "rootMinus":
      return rootMinusPlan(model.k, model.a, model.c);
    case "twoRoots":
      return twoRootsPlan(model.k, model.a, model.b);
    case "euler":
      return eulerPlan(model.a, model.b, model.shift);
    case "eulerQuotient":
      return eulerQuotientPlan(model.a, model.b, model.c);
    case "eulerTrap":
      return eulerTrapPlan(model.a, model.b, model.square);
    case "hierarchy":
      return hierarchyPlan(model);
    case "oscillating":
      return oscillatingPlan(model);
  }
}

// ───────────────────────────── costruzione (l'unico punto che usa rng) ─────────────────────────────

/** Un polinomio di grado `deg` con coefficiente direttivo `lead` e uno o due termini di grado più basso, in ordine di grado. */
function drawPoly(rng: Rng_, deg: number, lead: number, extra: number): Term[] {
  const lower = rng.sample(Array.from({ length: deg }, (_, k) => k), Math.min(extra, deg)).sort((s, t) => t - s);
  return [{ coef: lead, deg }, ...lower.map((k) => ({ coef: rng.intExcept(-9, 9), deg: k }))];
}

/** Rapporto di polinomi: prima si sceglie il caso (e quindi il limite), poi i gradi e i coefficienti. */
function drawRational(rng: Rng_, maxDegree: number, shuffled: boolean): Model {
  const kind = rng.pick(["equal", "equal", "lower", "higher"] as const);
  const big = rng.int(kind === "equal" ? 1 : 2, maxDegree);
  const small = kind === "equal" ? big : rng.int(1, big - 1);
  const b = shuffled ? rng.intExcept(-6, 6) : rng.int(1, 6);
  const a = rng.intExcept(-6, 6, [0, b]);
  const top = drawPoly(rng, kind === "lower" ? small : big, a, rng.int(1, 2));
  const bottom = drawPoly(rng, kind === "higher" ? small : big, b, rng.int(1, 2));
  if (!shuffled) return { form: "rational", top, bottom };
  // In disordine: almeno uno dei due polinomi è scritto a partire dal grado più basso.
  const which = rng.pick(["top", "bottom", "both"] as const);
  return { form: "rational", top: which === "bottom" ? top : [...top].reverse(), bottom: which === "top" ? bottom : [...bottom].reverse() };
}

function drawOscillating(rng: Rng_): Model {
  const place = rng.pick(["product", "product", "addend"] as const);
  const b = rng.intExcept(-5, 5);
  const a = rng.intExcept(-6, 6, [0, b]);
  if (place === "addend") {
    const deg = rng.int(1, 2);
    return { form: "oscillating", factor: rng.pick(["sign", "sin", "cos"] as const), place, main: { coef: a, deg }, c: rng.intExcept(-5, 5), bottom: drawPoly(rng, deg, b, 1) };
  }
  // Con (−1)^n il resto può tendere a un numero non nullo (il limite non esiste) oppure a 0; con seno e coseno solo a 0.
  const factor = rng.pick(["sign", "sign", "sign", "sin", "cos"] as const);
  const vanishing = factor !== "sign" || rng.bool();
  const bottomDegree = rng.int(vanishing ? 2 : 1, 3);
  const deg = vanishing ? rng.int(1, bottomDegree - 1) : bottomDegree;
  return { form: "oscillating", factor, place, main: { coef: a, deg }, c: 0, bottom: drawPoly(rng, bottomDegree, b, rng.int(1, 2)) };
}

function drawModel(level: Level, rng: Rng_): Model {
  if (level === 1) return drawRational(rng, 3, false);
  if (level === 2) {
    const form = rng.pick(["rational", "rational", "rootMinus", "rootMinus", "euler", "euler", "hierarchy", "hierarchy"] as const);
    switch (form) {
      case "rational":
        return drawRational(rng, 4, true);
      case "rootMinus":
        return { form, k: rng.pick([1, 1, 2, 3]), a: rng.intExcept(-9, 9), c: rng.pick([0, 0, 1, 2, 3, 5]) };
      case "euler": {
        const a = rng.intExcept(-5, 5);
        return { form, a, b: rng.intExcept(1, 3, a === 1 ? [1] : []), shift: rng.pick([0, 0, 0, -3, -2, -1, 1, 2, 3]) };
      }
      case "hierarchy": {
        const kind = rng.pick(["equal", "lower", "higher"] as const);
        const small = rng.int(2, kind === "equal" ? 5 : 4);
        const big = kind === "equal" ? small : rng.int(small + 1, 5);
        const d = rng.int(1, 5);
        const q = { coef: rng.intExcept(-6, 6), deg: rng.int(1, 3) };
        return {
          form,
          topBase: kind === "lower" ? small : big,
          bottomBase: kind === "higher" ? small : big,
          c: rng.intExcept(-5, 5, [0, d]),
          d,
          p: { coef: rng.intExcept(-6, 6, [0, q.coef]), deg: rng.int(1, 3) },
          q,
          polyFirst: rng.bool(),
        };
      }
    }
  }
  const form = rng.pick(["oscillating", "oscillating", "oscillating", "eulerQuotient", "eulerQuotient", "eulerTrap", "twoRoots", "twoRoots"] as const);
  switch (form) {
    case "oscillating":
      return drawOscillating(rng);
    case "eulerQuotient": {
      const b = rng.int(-4, 5);
      return { form, a: rng.intExcept(-4, 5, [b]), b, c: rng.int(1, 3) };
    }
    case "eulerTrap":
      return { form, a: rng.intExcept(-5, 5), b: rng.int(1, 3), square: rng.pick(["inside", "outside"] as const) };
    case "twoRoots": {
      const a = rng.int(1, 9);
      return { form, k: rng.pick([1, 1, 2, 3]), a, b: rng.intExcept(1, 9, [a]) };
    }
  }
}

/** Vero se l'esercizio va bene: limite pulito e almeno tre errori tipici che danno risposte diverse. */
function acceptable(model: Model): boolean {
  const plan = planOf(model);
  if (distinctWrongLimits(plan.correct, plan.wrong).length < 3) return false;
  switch (model.form) {
    case "eulerQuotient":
      // Esponente di e non banale e non troppo grande.
      return model.c * (model.a - model.b) !== 1 && Math.abs(model.c * (model.a - model.b)) <= 12;
    case "hierarchy":
      // Il rapporto delle potenze deve essere un errore riconoscibile: diverso da quello degli esponenziali.
      return model.p.coef * model.d !== model.q.coef * model.c;
    case "rational":
    case "rootMinus":
    case "twoRoots":
    case "euler":
    case "eulerTrap":
    case "oscillating":
      return true;
  }
}

/** Estrae modelli finché uno va bene (ne bastano pochi), sempre con lo stesso rng. */
function buildModel(level: Level, rng: Rng_): Model {
  for (let attempt = 0; attempt < 200; attempt++) {
    const model = drawModel(level, rng);
    if (acceptable(model)) return model;
  }
  throw new Error("V2.M03.A01.g1: nessuna successione adatta trovata.");
}

// ───────────────────────────── esercizio ─────────────────────────────

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const steps: SolutionStep[] = plan.steps.map((text) => ({ text }));
  return {
    prompt: `Calcola il limite della successione:\n\n$$${limitLatex("n", toPlusInfinity, plan.expr)}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste».`,
    answer: { kind: "limit", correct: plan.correct, wrong: distinctWrongLimits(plan.correct, plan.wrong) },
    steps,
    hints: plan.hints,
  };
}

export default defineGenerator({
  code: "V2.M03.A01.g1",
  skill: "V2.M03.A01",
  lesson: "V2.M03.L02",
  title: "Limiti di successioni",
  levels: [1, 2, 3],
  errors: ["AN.FORMA_INDETERMINATA", "AN.CONFRONTO_INFINITI", "AN.SEGNO_INFINITO", "AN.LIMITE_NOTEVOLE", "AN.FATTORE_LIMITATO", "CALC.MENO_PARENTESI", "ALG.RADICE_SOMMA"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    if (exercise.answer.kind !== "limit") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    // Il testo deve mostrare proprio questa successione, e i suoi valori per n grande devono confermare la risposta.
    if (!exercise.prompt.includes(limitLatex("n", toPlusInfinity, plan.expr))) return false;
    return confirmsLimit(plan.expr, "n", toPlusInfinity, exercise.answer.correct, { integer: true, scales: plan.scales });
  },
});
