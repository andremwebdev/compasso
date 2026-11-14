// V2.M08.A01.g1 — Sviluppi di Taylor nei limiti. La risposta è un valore di limite (qui sempre un
// numero in forma esatta; +∞ e «non esiste» sono le risposte di chi tratta male la forma 0/0).
//
// All'indietro: si scelgono le funzioni del numeratore (e^t, sin t, cos t, ln(1 + t), anche con
// argomento ax, moltiplicate per x o tra loro) e l'ordine m del denominatore; i loro sviluppi, tenuti
// come frazioni esatte, dicono quale polinomio aggiungere perché tutti i termini di grado minore di m
// si cancellino. Il limite è il coefficiente di x^m che resta, diviso per quello del denominatore: si
// legge dagli sviluppi, non si calcola. Le risposte sbagliate rifanno il conto con l'errore tipico:
//   - AN.TAYLOR_ORDINE: ogni funzione sviluppata un ordine in meno (il numeratore «si annulla», oppure
//     nei prodotti resta un coefficiente sbagliato);
//   - AN.TAYLOR_SVILUPPO: k al posto di k! (o k! al posto di k nel logaritmo), denominatori dimenticati,
//     segni non alternati, f(ax) sviluppata con a·x^k al posto di (ax)^k;
//   - AN.FORMA_INDETERMINATA: «denominatore nullo, quindi infinito», 0/0 «non esiste».
// La verifica indipendente non usa gli sviluppi: guarda i valori della funzione a destra e a sinistra
// di 0, a due distanze, ed estrapola. Il test del generatore rifà il limite anche con la regola di
// de l'Hôpital (derivate del motore).
//
// Livello 1: una funzione, argomento x o −x, denominatore d·x^m.
// Livello 2: argomento ax con |a| ≥ 2, oppure somma di due funzioni.
// Livello 3: prodotti (x·f, f·g) da sviluppare e moltiplicare, oppure denominatore da sviluppare.

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { finiteLimit, limitToLatex, noLimit, plusInfinity, minusInfinity, type LimitValue } from "../../../motore/calculus/limit";
import { add, cos, div, e, evaluate, ln, mul, neg, num, pow, sin, sub, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { distinctWrongLimits, limitLatex, toPoint } from "../../comuni/limits";
import type { WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];
type Level = GeneratorContext["level"];

const LIMITS = { maxInteger: 60, maxDenominator: 60 } as const;
/** Grado massimo tenuto negli sviluppi: basta per i prodotti di due sviluppi troncati al quarto ordine. */
const MAX = 9;
const x = sym("x");
const t = sym("t");

// ───────────────────────────── il modello ─────────────────────────────

type Fn = "exp" | "sin" | "cos" | "ln";
/** f(a·x): per il logaritmo è ln(1 + a·x). */
interface Factor {
  readonly fn: Fn;
  readonly a: number;
}
/** coef · x^shift · prodotto dei fattori (uno o due). */
interface Piece {
  readonly coef: number;
  readonly shift: number;
  readonly factors: readonly Factor[];
}
/** Un termine c·x^deg di un polinomio, con c razionale. */
interface PolyTerm {
  readonly coef: Rational;
  readonly deg: number;
}
/** Somma di pezzi più un polinomio. */
interface Side {
  readonly pieces: readonly Piece[];
  readonly poly: readonly PolyTerm[];
}

interface Model {
  /** I pezzi del numeratore: il polinomio che cancella i termini di grado basso si ricava dagli sviluppi. */
  readonly pieces: readonly Piece[];
  /** L'ordine del denominatore, e quindi del primo termine del numeratore che non si cancella. */
  readonly order: number;
  /** Il denominatore: d·x^order, oppure una funzione da sviluppare (di ordine `order`). */
  readonly bottom: { readonly kind: "power"; readonly d: number } | { readonly kind: "side"; readonly side: Side };
}

// ───────────────────────────── sviluppi (frazioni esatte) ─────────────────────────────

type Series = readonly Rational[];
/** Come viene ricordato lo sviluppo: giusto, oppure con uno degli errori tipici. */
type Recall = "right" | "byK" | "dropped" | "sign" | "substitution";

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));

/** Il coefficiente di t^k nello sviluppo di f(t) in t = 0, così come lo scrive chi fa l'errore `recall`. */
function baseCoefficient(fn: Fn, recall: Recall, k: number): Rational {
  // Denominatore: k! per e^t, sin t, cos t; k per ln(1 + t). «byK» li scambia, «dropped» li dimentica.
  const usesFactorial = fn !== "ln";
  const denominator = recall === "dropped" ? 1 : (recall === "byK") !== usesFactorial ? factorial(k) : Math.max(k, 1);
  const alternating = recall === "sign" ? 1 : -1;
  switch (fn) {
    case "exp":
      return Rational.of(1, denominator);
    case "sin":
      return k % 2 === 1 ? Rational.of(alternating ** ((k - 1) / 2), denominator) : Rational.ZERO;
    case "cos":
      return k % 2 === 0 ? Rational.of(alternating ** (k / 2), denominator) : Rational.ZERO;
    case "ln":
      // t − t²/2 + t³/3 − …: positivi i termini di grado dispari (tutti, per chi sbaglia i segni).
      return k >= 1 ? Rational.of(recall === "sign" || k % 2 === 1 ? 1 : -1, denominator) : Rational.ZERO;
  }
}

const zeros = (): Rational[] => Array.from({ length: MAX + 1 }, () => Rational.ZERO);

/** Lo sviluppo di f(ax) in potenze di x; `cut` lo ferma a quel grado (errore: sviluppo troppo corto). */
function factorSeries({ fn, a }: Factor, recall: Recall, cut: number): Rational[] {
  const series = zeros();
  for (let k = 0; k <= Math.min(cut, MAX); k++) {
    // Errore di sostituzione: a·x^k al posto di (ax)^k.
    const scale = recall === "substitution" ? (k === 0 ? 1 : a) : a ** k;
    series[k] = baseCoefficient(fn, recall === "substitution" ? "right" : recall, k).mul(scale);
  }
  return series;
}

function multiply(left: Series, right: Series): Rational[] {
  const product = zeros();
  left.forEach((p, i) => right.forEach((q, j) => {
    if (i + j <= MAX && !p.isZero() && !q.isZero()) product[i + j] = (product[i + j] as Rational).add(p.mul(q));
  }));
  return product;
}

function pieceSeries(piece: Piece, recall: Recall, cut: number): Rational[] {
  let product: Rational[] = zeros();
  product[0] = Rational.ONE;
  for (const factor of piece.factors) product = multiply(product, factorSeries(factor, recall, cut));
  const shifted = zeros();
  product.forEach((value, k) => {
    if (k + piece.shift <= MAX) shifted[k + piece.shift] = value.mul(piece.coef);
  });
  return shifted;
}

function sideSeries(side: Side, recall: Recall = "right", cut = MAX): Rational[] {
  const total = zeros();
  for (const piece of side.pieces) pieceSeries(piece, recall, cut).forEach((value, k) => (total[k] = (total[k] as Rational).add(value)));
  for (const term of side.poly) total[term.deg] = (total[term.deg] as Rational).add(term.coef);
  return total;
}

/** Il grado del primo termine non nullo; −1 se lo sviluppo è nullo fino a MAX. */
const orderOf = (series: Series): number => series.findIndex((value) => !value.isZero());
const at = (series: Series, k: number): Rational => series[k] ?? Rational.ZERO;

/** Il limite per x → 0 di un rapporto, letto dai primi termini dei due sviluppi; null se non si può dire. */
function limitFromSeries(top: Series, bottom: Series): LimitValue | null {
  const p = orderOf(top);
  const q = orderOf(bottom);
  if (q < 0) return null;
  if (p < 0 || p > q) return finiteLimit(num(0));
  const quotient = at(top, p).div(at(bottom, q));
  if (p === q) return finiteLimit(num(quotient));
  // Numeratore di ordine più basso: infinito, con segno costante solo se la differenza degli ordini è pari.
  return (q - p) % 2 === 1 ? noLimit : quotient.sign() > 0 ? plusInfinity : minusInfinity;
}

/** Il numeratore completo: i pezzi, più il polinomio che cancella i termini di grado minore di `order`. */
function topSide(model: Model): Side {
  const series = sideSeries({ pieces: model.pieces, poly: [] });
  const poly: PolyTerm[] = [];
  for (let k = 0; k < model.order; k++) if (!at(series, k).isZero()) poly.push({ coef: at(series, k).neg(), deg: k });
  return { pieces: model.pieces, poly };
}

const bottomSide = (model: Model): Side => (model.bottom.kind === "power" ? { pieces: [], poly: [{ coef: Rational.of(model.bottom.d), deg: model.order }] } : model.bottom.side);

// ───────────────────────────── scrittura ─────────────────────────────

const tex = (expr: Expr): string => toLatex(expr);
const power = (deg: number, variable: Expr = x): Expr => (deg === 1 ? variable : pow(variable, deg));
const little = (deg: number, variable = "x"): string => (deg === 1 ? `o\\left(${variable}\\right)` : `o\\left(${variable}^{${deg}}\\right)`);
const rationalTex = (value: Rational): string => tex(num(value));
/** Un numero come addendo dopo il primo: tra parentesi se negativo. */
const addendTex = (value: Rational): string => (value.sign() < 0 ? `\\left(${rationalTex(value)}\\right)` : rationalTex(value));

/** c·v^deg con c razionale, scritto come su un quaderno: −x³/6, 2x², 4x³/3. Il segno è a parte. */
function termParts(coef: Rational, deg: number, variable: Expr = x): { readonly negative: boolean; readonly body: Expr } {
  const size = coef.abs();
  if (deg === 0) return { negative: coef.sign() < 0, body: num(size) };
  const top = size.n === 1n ? power(deg, variable) : mul(Number(size.n), power(deg, variable));
  return { negative: coef.sign() < 0, body: size.d === 1n ? top : div(top, Number(size.d)) };
}

const fnExpr = ({ fn, a }: Factor, variable: Expr = x): Expr => {
  const u = a === 1 ? variable : a === -1 ? neg(variable) : mul(a, variable);
  switch (fn) {
    case "exp":
      return pow(e, u);
    case "sin":
      return sin(u);
    case "cos":
      return cos(u);
    case "ln":
      return ln(a > 0 ? add(1, u) : sub(1, a === -1 ? variable : mul(-a, variable)));
  }
};

/** Un pezzo senza il segno: 2x·cos x, e^x·sin x. */
function pieceParts(piece: Piece): { readonly negative: boolean; readonly body: Expr } {
  const factors: Expr[] = [];
  if (Math.abs(piece.coef) !== 1) factors.push(num(Math.abs(piece.coef)));
  if (piece.shift > 0) factors.push(power(piece.shift));
  // Nei prodotti l'esponenziale si scrive per primo e il logaritmo per ultimo: e^x sin x, cos x · ln(1 + x).
  const rank: Readonly<Record<Fn, number>> = { exp: 0, sin: 1, cos: 2, ln: 3 };
  for (const factor of [...piece.factors].sort((s, u) => rank[s.fn] - rank[u.fn])) factors.push(fnExpr(factor));
  return { negative: piece.coef < 0, body: factors.length === 1 ? (factors[0] as Expr) : mul(...factors) };
}

/** Somma di addendi con segno; se c'è un addendo positivo, il primo scritto è positivo (x − sin x, non −sin x + x). */
function signedSum(parts: readonly { readonly negative: boolean; readonly body: Expr }[]): Expr {
  const ordered = [...parts];
  const positive = ordered.findIndex((part) => !part.negative);
  if (positive > 0) ordered.unshift(...ordered.splice(positive, 1));
  const terms = ordered.map((part) => (part.negative ? neg(part.body) : part.body));
  return terms.length === 1 ? (terms[0] as Expr) : add(...terms);
}

const sideExpr = (side: Side): Expr => signedSum([...side.pieces.map(pieceParts), ...side.poly.map((term) => termParts(term.coef, term.deg))]);

/** Lo sviluppo scritto fino al grado `upTo`, senza il resto: 1 − x²/2. */
function seriesExpr(series: Series, upTo: number, variable: Expr = x): Expr {
  const parts = series.slice(0, upTo + 1).flatMap((coef, k) => (coef.isZero() ? [] : [termParts(coef, k, variable)]));
  if (parts.length === 0) return num(0);
  const terms = parts.map((part) => (part.negative ? neg(part.body) : part.body));
  return terms.length === 1 ? (terms[0] as Expr) : add(...terms);
}

const developed = (series: Series, upTo: number, variable: Expr = x, name = "x"): string => {
  const body = seriesExpr(series, upTo, variable);
  return body.kind === "num" && body.value.isZero() ? little(upTo, name) : `${tex(body)} + ${little(upTo, name)}`;
};

// ───────────────────────────── piano dell'esercizio ─────────────────────────────

interface Plan {
  readonly top: Expr;
  readonly bottom: Expr;
  readonly expr: Expr;
  readonly correct: LimitValue | null;
  readonly wrong: readonly WrongCandidate<LimitValue>[];
  readonly steps: readonly string[];
  readonly hints: readonly [string, string];
}

/** Vero se tutti i numeri del valore stanno nei limiti di pulizia. */
function clean(value: LimitValue): boolean {
  if (value.kind !== "finite" || value.value.kind !== "num") return true;
  const { n, d } = value.value.value;
  return (n < 0n ? -n : n) <= BigInt(LIMITS.maxInteger) && d <= BigInt(LIMITS.maxDenominator);
}

const sameFactor = (s: Factor, u: Factor): boolean => s.fn === u.fn && s.a === u.a;

function planOf(model: Model): Plan {
  const m = model.order;
  const top = topSide(model);
  const bottom = bottomSide(model);
  const topSeries = sideSeries(top);
  const bottomSeries = sideSeries(bottom);
  const correct = limitFromSeries(topSeries, bottomSeries);
  const factors = [...top.pieces, ...bottom.pieces].flatMap((piece) => piece.factors).filter((factor, index, all) => all.findIndex((other) => sameFactor(other, factor)) === index);

  // Gli errori: stesso esercizio, sviluppi sbagliati.
  // Con uno sviluppo ricordato male i termini di grado basso possono non cancellarsi più: chi se ne accorge
  // si ferma, quindi come risposta sbagliata conta solo il caso in cui il conto arriva a un numero.
  const withRecall = (recall: Recall): LimitValue | null => {
    const value = limitFromSeries(sideSeries(top, recall), sideSeries(bottom, recall));
    return value && value.kind === "finite" ? value : null;
  };
  const candidate = (error: "AN.TAYLOR_ORDINE" | "AN.TAYLOR_SVILUPPO" | "AN.FORMA_INDETERMINATA", value: LimitValue | null): WrongCandidate<LimitValue> =>
    value && clean(value) ? { error, value } : null;
  const wrong: WrongCandidate<LimitValue>[] = [
    // Ogni funzione del numeratore sviluppata un ordine in meno.
    candidate("AN.TAYLOR_ORDINE", limitFromSeries(sideSeries(top, "right", m - 1), bottomSeries)),
    candidate("AN.TAYLOR_SVILUPPO", withRecall("byK")),
    candidate("AN.TAYLOR_SVILUPPO", withRecall("sign")),
    factors.some((factor) => Math.abs(factor.a) >= 2) ? candidate("AN.TAYLOR_SVILUPPO", withRecall("substitution")) : null,
    candidate("AN.TAYLOR_SVILUPPO", withRecall("dropped")),
    { error: "AN.FORMA_INDETERMINATA", value: plusInfinity },
    { error: "AN.FORMA_INDETERMINATA", value: noLimit },
  ];

  const topExpr = sideExpr(top);
  const bottomExpr = sideExpr(bottom);
  const lead = at(topSeries, m);
  const bottomLead = at(bottomSeries, m);
  const leadTerm = (coef: Rational): string => {
    const part = termParts(coef, m);
    return tex(part.negative ? neg(part.body) : part.body);
  };

  // Passaggi.
  const steps: string[] = [
    "Numeratore e denominatore tendono entrambi a $0$: è una forma indeterminata $\\frac{0}{0}$. I limiti notevoli qui non bastano: tenendo di ogni funzione solo il primo termine, il numeratore si cancella e non si conclude. Servono gli sviluppi di Taylor in $x = 0$." +
      (model.bottom.kind === "power" ? ` Il denominatore è di ordine $${m}$: il numeratore va sviluppato fino a $x^{${m}}$, con resto $${little(m)}$.` : ""),
  ];
  for (const factor of factors) {
    const series = factorSeries(factor, "right", MAX);
    const name = tex(fnExpr(factor));
    if (factor.a === 1) {
      steps.push(`Sviluppo di $${name}$ fino all'ordine $${m}$:\n\n$$${name} = ${developed(series, m)}$$`);
    } else {
      const baseSeries = factorSeries({ fn: factor.fn, a: 1 }, "right", MAX);
      const inner = tex(factor.a === -1 ? neg(x) : mul(factor.a, x));
      steps.push(
        `Sviluppo di $${name}$: parti da $${tex(fnExpr({ fn: factor.fn, a: 1 }, t))} = ${developed(baseSeries, m, t, "t")}$ e sostituisci $t = ${inner}$ in ogni potenza (per esempio $t^{2} = ${tex(termParts(Rational.of(factor.a ** 2), 2).body)}$):\n\n$$${name} = ${developed(series, m)}$$`,
      );
    }
  }
  const describe = (side: Side, label: string, sideLatex: string, series: Series, order: number): void => {
    for (const piece of side.pieces) {
      if (piece.shift === 0 && piece.factors.length === 1) continue;
      const bare: Piece = { coef: 1, shift: piece.shift, factors: piece.factors };
      steps.push(
        `${piece.factors.length === 2 ? "Moltiplica i due sviluppi" : `Moltiplica lo sviluppo per $${tex(power(piece.shift))}$`} e tieni i termini fino a $x^{${order}}$ (quelli di grado più alto finiscono nel resto):\n\n$$${tex(pieceParts(bare).body)} = ${developed(pieceSeries(bare, "right", MAX), order)}$$`,
      );
    }
    // Un solo prodotto, senza altri addendi: lo sviluppo appena scritto è già quello di tutto il lato.
    if (side.pieces.length === 1 && side.poly.length === 0 && ((side.pieces[0] as Piece).shift > 0 || (side.pieces[0] as Piece).factors.length === 2) && (side.pieces[0] as Piece).coef === 1) return;
    const contributions = [...side.pieces.map((piece) => at(pieceSeries(piece, "right", MAX), order)), ...side.poly.filter((term) => term.deg === order).map((term) => term.coef)].filter((value) => !value.isZero());
    const sum = contributions.length > 1 ? ` Il coefficiente di $x^{${order}}$ è $${contributions.map((value, index) => (index === 0 ? rationalTex(value) : addendTex(value))).join(" + ")} = ${rationalTex(at(series, order))}$.` : "";
    steps.push(`Sostituisci gli sviluppi nel ${label} e somma i termini dello stesso grado: quelli di grado minore di $${order}$ si cancellano.${sum}\n\n$$${sideLatex} = ${developed(series, order)}$$`);
  };
  describe(top, "numeratore", tex(topExpr), topSeries, m);
  if (model.bottom.kind === "side") describe(bottom, "denominatore", tex(bottomExpr), bottomSeries, m);
  steps.push(
    `Il limite è il rapporto dei termini di ordine $${m}$ (i resti $${little(m)}$ sono trascurabili):\n\n$$\\frac{${leadTerm(lead)} + ${little(m)}}{${leadTerm(bottomLead)}${model.bottom.kind === "side" ? ` + ${little(m)}` : ""}} \\to ${correct ? limitToLatex(correct) : ""}$$`,
  );

  return {
    top: topExpr,
    bottom: bottomExpr,
    expr: div(topExpr, bottomExpr),
    correct,
    wrong,
    steps,
    hints: [
      "È una forma $\\frac{0}{0}$, ma i limiti notevoli non bastano: i termini di ordine più basso si cancellano. Fino a quale ordine devi sviluppare? Guarda l'ordine del denominatore.",
      model.bottom.kind === "power"
        ? `Sviluppa ogni funzione del numeratore fino a $x^{${m}}$, con resto $${little(m)}$, sostituisci e somma i termini dello stesso grado: conta solo quello di grado $${m}$.`
        : `Sviluppa anche il denominatore: il suo primo termine non nullo è di ordine $${m}$. Poi sviluppa il numeratore fino a $x^{${m}}$ e confronta i due coefficienti.`,
    ],
  };
}

// ───────────────────────────── costruzione (l'unico punto che usa rng) ─────────────────────────────

const FUNCTIONS: readonly Fn[] = ["exp", "sin", "cos", "ln"];
/** Gli ordini a cui ha senso fermare lo sviluppo di una sola funzione: dove c'è un termine non nullo dopo il primo. */
const ORDERS: Readonly<Record<Fn, readonly number[]>> = { exp: [2, 3], sin: [3], cos: [2, 4], ln: [2, 3] };

const single = (coef: number, fn: Fn, a: number, shift = 0): Piece => ({ coef, shift, factors: [{ fn, a }] });
const whole = (coef: number, deg: number): PolyTerm => ({ coef: Rational.of(coef), deg });

/** Denominatori da sviluppare, con il loro ordine. */
const BOTTOMS: readonly { readonly side: Side; readonly order: number }[] = [
  { side: { pieces: [single(-1, "sin", 1)], poly: [whole(1, 1)] }, order: 3 }, // x − sin x
  { side: { pieces: [single(-1, "cos", 1)], poly: [whole(1, 0)] }, order: 2 }, // 1 − cos x
  { side: { pieces: [single(1, "sin", 1, 1)], poly: [] }, order: 2 }, // x sin x
  { side: { pieces: [single(1, "ln", 1, 1)], poly: [] }, order: 2 }, // x ln(1 + x)
  { side: { pieces: [single(1, "exp", 1)], poly: [whole(-1, 0), whole(-1, 1)] }, order: 2 }, // e^x − 1 − x
  { side: { pieces: [single(-1, "ln", 1)], poly: [whole(1, 1)] }, order: 2 }, // x − ln(1 + x)
  { side: { pieces: [single(1, "sin", 1), single(-1, "cos", 1, 1)], poly: [] }, order: 3 }, // sin x − x cos x
  { side: { pieces: [single(1, "sin", 1, 2)], poly: [] }, order: 3 }, // x² sin x
  { side: { pieces: [single(1, "ln", 1, 2)], poly: [] }, order: 3 }, // x² ln(1 + x)
  { side: { pieces: [single(1, "sin", 1, 1), single(1, "cos", 1)], poly: [whole(-1, 0)] }, order: 2 }, // x sin x + cos x − 1
];

/** L'ordine del primo termine di grado almeno 2 che resta nel numeratore; 0 se non ce n'è uno entro il quinto ordine. */
function naturalOrder(pieces: readonly Piece[]): number {
  const series = sideSeries({ pieces, poly: [] });
  for (let k = 2; k <= 5; k++) if (!at(series, k).isZero()) return k;
  return 0;
}

/** Una sola funzione con argomento ax: il segno, la funzione e l'ordine. */
function drawSingle(rng: Rng_, arguments_: readonly number[]): { readonly pieces: Piece[]; readonly order: number } {
  const fn = rng.pick(FUNCTIONS);
  const a = rng.pick(fn === "sin" || fn === "cos" ? arguments_.filter((value) => value > 0) : arguments_);
  return { pieces: [single(rng.sign(), fn, a)], order: rng.pick(ORDERS[fn]) };
}

/** Somma di due funzioni diverse (o della stessa con argomenti diversi). */
function drawSum(rng: Rng_): { readonly pieces: Piece[]; readonly order: number } {
  // Argomento negativo solo per esponenziale e logaritmo: sin(−x) e cos(−x) non si scrivono.
  const drawFactor = (): Factor => {
    const fn = rng.pick(FUNCTIONS);
    return { fn, a: rng.pick(fn === "sin" || fn === "cos" ? [1, 1, 2] : [1, 1, -1, 2]) };
  };
  const first = drawFactor();
  const second = drawFactor();
  const sign = rng.sign();
  const pieces = [{ coef: sign, shift: 0, factors: [first] }, { coef: sign * rng.sign(), shift: 0, factors: [second] }];
  return { pieces, order: sameFactor(first, second) ? 0 : naturalOrder(pieces) };
}

function drawModel(level: Level, rng: Rng_): Model {
  if (level === 1) {
    const { pieces, order } = drawSingle(rng, [1, 1, -1]);
    return { pieces, order, bottom: { kind: "power", d: rng.int(1, 8) } };
  }
  if (level === 2) {
    const { pieces, order } = rng.pick(["scaled", "sum", "sum"] as const) === "scaled" ? drawSingle(rng, [2, 3, -2, -3]) : drawSum(rng);
    return { pieces, order, bottom: { kind: "power", d: rng.int(1, 6) } };
  }
  if (rng.pick(["product", "product", "bottom", "bottom"] as const) === "product") {
    // x·f oppure f·g, più (quasi sempre) un'altra funzione: i termini di grado basso si cancellano solo dopo aver moltiplicato.
    const f = rng.pick(FUNCTIONS);
    const sign = rng.sign();
    const product: Piece = rng.bool() ? { coef: sign, shift: 1, factors: [{ fn: f, a: 1 }] } : { coef: sign, shift: 0, factors: [{ fn: f, a: 1 }, { fn: rng.pick(FUNCTIONS.filter((other) => other !== f)), a: 1 }] };
    const pieces = product.shift === 1 || rng.bool(0.7) ? [product, single(rng.sign(), rng.pick(FUNCTIONS), 1)] : [product];
    return { pieces, order: naturalOrder(pieces), bottom: { kind: "power", d: rng.int(1, 4) } };
  }
  const bottom = rng.pick(BOTTOMS);
  const { pieces, order } = rng.bool() ? drawSingle(rng, [1, 1, -1, 2]) : drawSum(rng);
  // Il numeratore deve avere lo stesso ordine del denominatore: se no l'estrazione si ripete.
  return { pieces, order: order === bottom.order ? order : 0, bottom: { kind: "side", side: bottom.side } };
}

/** Vero se l'esercizio va bene: limite finito, non nullo e pulito; polinomio breve; errori tipici riconoscibili. */
function acceptable(model: Model): boolean {
  if (model.order < 2) return false;
  const top = topSide(model);
  const series = sideSeries(top);
  if (orderOf(series) !== model.order) return false;
  // Il polinomio da aggiungere deve sembrare quello di un esercizio vero: pochi termini, coefficienti semplici.
  if (top.poly.length > 3 || top.poly.some((term) => term.coef.abs().cmp(9) > 0 || ![1n, 2n, 3n, 6n].includes(term.coef.d))) return false;
  const plan = planOf(model);
  if (!plan.correct || plan.correct.kind !== "finite" || !clean(plan.correct)) return false;
  // Numeratore multiplo del denominatore (limite che si vede senza sviluppare): non è un esercizio.
  const bottomSeries = sideSeries(bottomSide(model));
  const quotient = at(series, model.order).div(at(bottomSeries, model.order));
  if (model.bottom.kind === "side" && series.every((value, k) => value.eq(at(bottomSeries, k).mul(quotient)))) return false;
  const kept = distinctWrongLimits(plan.correct, plan.wrong);
  return kept.length >= 3 && kept.some((wrong) => wrong.error === "AN.TAYLOR_ORDINE") && kept.slice(0, 4).some((wrong) => wrong.error === "AN.TAYLOR_SVILUPPO");
}

/** Estrae modelli finché uno va bene, sempre con lo stesso rng. */
function buildModel(level: Level, rng: Rng_): Model {
  for (let attempt = 0; attempt < 400; attempt++) {
    const model = drawModel(level, rng);
    if (acceptable(model)) return model;
  }
  throw new Error("V2.M08.A01.g1: nessun limite adatto trovato.");
}

// ───────────────────────────── esercizio ─────────────────────────────

const AT_ZERO = toPoint(num(0));

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  if (!plan.correct) throw new Error("V2.M08.A01.g1: limite non determinato.");
  const steps: SolutionStep[] = plan.steps.map((text) => ({ text }));
  return {
    prompt: `Calcola il limite usando gli sviluppi di Taylor:\n\n$$${limitLatex("x", AT_ZERO, plan.expr)}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste».`,
    answer: { kind: "limit", correct: plan.correct, wrong: distinctWrongLimits(plan.correct, plan.wrong) },
    steps,
    hints: plan.hints,
  };
}

/**
 * Il valore a cui tende la funzione in 0, stimato dai suoi valori (senza sviluppi): media tra destra e
 * sinistra a due distanze, poi estrapolazione. null se destra e sinistra non vanno d'accordo.
 */
function numericLimitAtZero(expr: Expr): number | null {
  const value = (h: number): number => evaluate(expr, { x: h });
  const [far, near] = [0.04, 0.02];
  const [right, left] = [value(near), value(-near)];
  const [meanFar, meanNear] = [(value(far) + value(-far)) / 2, (right + left) / 2];
  const estimate = (4 * meanNear - meanFar) / 3;
  if (!Number.isFinite(estimate) || Math.abs(right - left) > 0.5 * (Math.abs(estimate) + 1e-3)) return null;
  return estimate;
}

export default defineGenerator({
  code: "V2.M08.A01.g1",
  skill: "V2.M08.A01",
  lesson: "V2.M08.L03",
  title: "Sviluppi di Taylor nei limiti",
  levels: [1, 2, 3],
  errors: ["AN.TAYLOR_ORDINE", "AN.TAYLOR_SVILUPPO", "AN.FORMA_INDETERMINATA"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "limit" || answer.correct.kind !== "finite") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    // Il testo deve mostrare proprio questa funzione, e i suoi valori vicino a 0 devono confermare la risposta.
    if (!exercise.prompt.includes(limitLatex("x", AT_ZERO, plan.expr))) return false;
    const seen = numericLimitAtZero(plan.expr);
    const expected = evaluate(answer.correct.value);
    return seen !== null && Math.abs(seen - expected) <= 2e-3 * Math.abs(expected) + 1e-7;
  },
});
