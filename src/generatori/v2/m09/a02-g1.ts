// V2.M09.A02.g1 — Integrali definiti con il teorema fondamentale del calcolo.
//
// Costruzione all'indietro: ogni forma parte dalla primitiva F, scritta con la formula della tecnica,
// e il valore esatto è F(b) − F(a), calcolato con somme esatte (ExactSum). La verifica indipendente
// integra numericamente la funzione del testo (metodo di Simpson) e confronta.
// Le risposte sbagliate sono i due errori sugli estremi (F(a) − F(b), F(a) dimenticato) e la tecnica
// applicata male, valutata davvero sugli stessi estremi.
//
// Livello 1: polinomi, sin e cos di kx, esponenziali, 1/(x + s).
// Livello 2: per parti (polinomio per esponenziale, logaritmo, x per seno o coseno), sostituzione con
//            cambio degli estremi.
// Livello 3: fratti semplici, parti ripetute, logaritmo più arcotangente.

import { defineGenerator, exact, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { abs, add, cos, div, e, evaluate, exp, fn, frac, ln, num, pi, pow, sin, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { ExactSum } from "../../comuni/exact-sum";
import { combination, integralLatex, linear, linearTimes, power, product, scaled, sum, times } from "../../comuni/writing";

type Rng_ = GeneratorContext["rng"];

const LIMITS = { maxInteger: 120, maxDenominator: 100 };

const x = sym("x");
const X2 = pow(x, 2);
const ONE = num(1);
const tex = (expr: Expr): string => toLatex(expr);
const arctan = (arg: Expr): Expr => fn("arctan", arg);

const ESTREMI = "AN.ESTREMI_INTEGRALE";
const PRIM = "AN.PRIMITIVA_ELEMENTARE";
const SOST = "AN.SOSTITUZIONE_FATTORE";
const PARTI = "AN.INTEGRAZIONE_PARTI";
const PROD = "AN.INTEGRALE_PRODOTTO";
const FRATTI = "AN.FRATTI_SEMPLICI";

interface WrongValue {
  readonly error: ErrorCode;
  readonly value: ExactSum;
}

const wrong = (error: ErrorCode, value: ExactSum): WrongValue => ({ error, value });

// ───────────────────────────── il modello ─────────────────────────────

type Trig = "sin" | "cos";

/** Gli estremi «notevoli» degli esercizi con seno e coseno: kU = π/6, π/3, π/2 o π. */
type Angle = "pi6" | "pi3" | "pi2" | "pi";

type Model =
  | { readonly kind: "poly"; readonly c2: number; readonly c1: number; readonly c0: number; readonly a: number; readonly b: number }
  | { readonly kind: "trig"; readonly f: Trig; readonly m: number; readonly k: number; readonly angle: Angle }
  | { readonly kind: "exp"; readonly m: number; readonly k: number }
  | { readonly kind: "reciprocal"; readonly m: number; readonly s: number; readonly a: number; readonly b: number }
  | { readonly kind: "partsExp"; readonly b: number; readonly u: number }
  | { readonly kind: "partsLog"; readonly m: number; readonly n: number }
  | { readonly kind: "partsTrig"; readonly f: Trig; readonly b: number; readonly angle: "pi2" | "pi" }
  | { readonly kind: "substLog"; readonly m: number; readonly s: number; readonly b: number }
  | { readonly kind: "substExp"; readonly m: number; readonly a: number; readonly b: number }
  | { readonly kind: "partialFractions"; readonly A: number; readonly B: number; readonly r1: number; readonly r2: number; readonly a: number; readonly b: number }
  | { readonly kind: "partsTwice"; readonly m: number; readonly k: number; readonly u: number }
  | { readonly kind: "logArctan"; readonly a: number; readonly b: number; readonly s: number };

interface Plan {
  readonly integrand: Expr;
  readonly from: Expr;
  readonly to: Expr;
  /** Una primitiva, senza costante. */
  readonly primitive: Expr;
  /** F(b) e F(a), esatti. */
  readonly upper: ExactSum;
  readonly lower: ExactSum;
  /** Le risposte sbagliate proprie della tecnica (gli errori sugli estremi si aggiungono dopo). */
  readonly wrong: readonly WrongValue[];
  /** Come si trova la primitiva. */
  readonly technique: readonly string[];
  readonly hint: string;
}

/** Seno e coseno degli angoli notevoli usati, come numeri razionali (niente radicali). */
const SIN: Record<Angle, [number, number]> = { pi6: [1, 2], pi3: [0, 1], pi2: [1, 1], pi: [0, 1] };
const COS: Record<Angle, [number, number]> = { pi6: [0, 1], pi3: [1, 2], pi2: [0, 1], pi: [-1, 1] };
/** L'angolo come frazione di π. */
const ANGLE: Record<Angle, [number, number]> = { pi6: [1, 6], pi3: [1, 3], pi2: [1, 2], pi: [1, 1] };

const piOver = (p: number, q: number): Expr => scaled(p, q, pi);

function planOf(model: Model): Plan {
  switch (model.kind) {
    case "poly": {
      const { c2, c1, c0, a, b } = model;
      const terms: [number, number][] = [
        [c2, 2],
        [c1, 1],
        [c0, 0],
      ];
      const live = terms.filter(([c]) => c !== 0);
      const at = (t: number, rule: (c: number, n: number) => [number, number, number]): ExactSum =>
        live.reduce((total, [c, n]) => {
          const [p, q, exponent] = rule(c, n);
          return total.plus(ExactSum.of(p * t ** exponent, q));
        }, ExactSum.ZERO);
      const F = (t: number): ExactSum => at(t, (c, n) => [c, n + 1, n + 1]);
      const noDivision = (t: number): ExactSum => at(t, (c, n) => [c, 1, n + 1]);
      const derivative = (t: number): ExactSum => at(t, (c, n) => (n === 0 ? [0, 1, 0] : [c * n, 1, n - 1]));
      return {
        integrand: sum(...live.map(([c, n]) => (n === 0 ? num(c) : times(c, power(n))))),
        from: num(a),
        to: num(b),
        primitive: sum(...live.map(([c, n]) => scaled(c, n + 1, power(n + 1)))),
        upper: F(b),
        lower: F(a),
        wrong: [wrong(PRIM, noDivision(b).minus(noDivision(a))), wrong(PRIM, derivative(b).minus(derivative(a)))],
        technique: [String.raw`Una primitiva si trova termine per termine con $\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1}$; la costante arbitraria non serve, perché nella differenza $F(b) - F(a)$ si cancella.`],
        hint: String.raw`Trova una primitiva $F$ termine per termine, poi calcola $F(${b}) - F(${tex(num(a))})$.`,
      };
    }

    case "trig": {
      const { f, m, k, angle } = model;
      const [ap, aq] = ANGLE[angle];
      const to = piOver(ap, aq * k);
      const kx = times(k, x);
      const [s, c] = [SIN[angle], COS[angle]];
      if (f === "sin") {
        // F = −(m/k)·cos kx
        const upper = ExactSum.of(-m * c[0], k * c[1]);
        const lower = ExactSum.of(-m, k);
        return {
          integrand: times(m, sin(kx)),
          from: num(0),
          to,
          primitive: scaled(-m, k, cos(kx)),
          upper,
          lower,
          // (La primitiva del seno presa con il segno più dà F(a) − F(b): la riconosce l'errore sugli estremi.)
          wrong: [
            // Manca la divisione per k.
            wrong(SOST, upper.minus(lower).times(k)),
            // Derivata al posto della primitiva: m·k·cos kx.
            wrong(PRIM, ExactSum.of(m * k * c[0], c[1]).minus(ExactSum.of(m * k))),
          ],
          technique: [String.raw`Una primitiva di $\sin t$ è $-\cos t$; con dentro $${tex(kx)}$ si divide per $${k}$ (sostituzione $t = ${tex(kx)}$).`],
          hint: String.raw`Una primitiva di $\sin(kx)$ è $-\dfrac{\cos(kx)}{k}$. Attenzione: $F(0)$ non vale $0$.`,
        };
      }
      // F = (m/k)·sin kx
      const upper = ExactSum.of(m * s[0], k * s[1]);
      return {
        integrand: times(m, cos(kx)),
        from: num(0),
        to,
        primitive: scaled(m, k, sin(kx)),
        upper,
        lower: ExactSum.ZERO,
        wrong: [
          // Moltiplicato per k invece di dividere.
          wrong(SOST, upper.times(k * k)),
          // Manca la divisione per k.
          wrong(SOST, upper.times(k)),
          // Derivata al posto della primitiva: −m·k·sin kx.
          wrong(PRIM, upper.times(-k * k)),
        ],
        technique: [String.raw`Una primitiva di $\cos t$ è $\sin t$; con dentro $${tex(kx)}$ si divide per $${k}$ (sostituzione $t = ${tex(kx)}$).`],
        hint: String.raw`Una primitiva di $\cos(kx)$ è $\dfrac{\sin(kx)}{k}$.`,
      };
    }

    case "exp": {
      const { m, k } = model;
      const upper = ExactSum.exp(m, k, k);
      const lower = ExactSum.of(m, k);
      const value = upper.minus(lower);
      return {
        integrand: times(m, exp(times(k, x))),
        from: num(0),
        to: num(1),
        primitive: scaled(m, k, exp(times(k, x))),
        upper,
        lower,
        wrong: [wrong(SOST, value.times(k)), wrong(SOST, value.times(k * k))],
        technique: [String.raw`Una primitiva di $e^{kx}$ è $\dfrac{e^{kx}}{k}$ (sostituzione $t = kx$), e la costante $${m}$ resta davanti.`],
        hint: String.raw`Una primitiva di $e^{kx}$ è $\dfrac{e^{kx}}{k}$. Ricorda che $e^{0} = 1$, non $0$.`,
      };
    }

    case "reciprocal": {
      const { m, s, a, b } = model;
      const d = linear(1, s);
      const upper = ExactSum.ln(m, 1, b + s);
      const lower = ExactSum.ln(m, 1, a + s);
      // Derivata al posto della primitiva: −m/(x + s)².
      const derivative = (t: number): ExactSum => ExactSum.of(-m, (t + s) ** 2);
      return {
        integrand: div(num(m), d),
        from: num(a),
        to: num(b),
        primitive: times(m, ln(abs(d))),
        upper,
        lower,
        wrong: [wrong(PRIM, derivative(b).minus(derivative(a)))],
        technique: [String.raw`Una primitiva di $\dfrac{1}{${tex(d)}}$ è $\ln|${tex(d)}|$; nell'intervallo di integrazione $${tex(d)}$ è positivo, quindi il valore assoluto si può togliere.`],
        hint: String.raw`Una primitiva di $\dfrac{1}{x + s}$ è $\ln|x + s|$. Per sottrarre due logaritmi usa $\ln A - \ln B = \ln\dfrac{A}{B}$.`,
      };
    }

    case "partsExp": {
      const { b, u } = model;
      const E = exp(x);
      const F = (shift: number, t: number): ExactSum => ExactSum.exp(t + shift, 1, t);
      const upper = F(b - 1, u);
      const lower = F(b - 1, 0);
      return {
        integrand: linearTimes(1, b, E),
        from: num(0),
        to: num(u),
        primitive: linearTimes(1, b - 1, E),
        upper,
        lower,
        wrong: [
          // Segno più davanti al secondo integrale: (x + b + 1)eˣ.
          wrong(PARTI, F(b + 1, u).minus(F(b + 1, 0))),
          // Prodotto degli integrali: (x²/2 + bx)eˣ.
          wrong(PROD, ExactSum.exp(u * u + 2 * b * u, 2, u)),
        ],
        technique: [
          String.raw`Per parti, $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$, con $f = ${tex(linear(1, b))}$ e $g' = e^{x}$: $${integralLatex(linearTimes(1, b, E))} = ${tex(linearTimes(1, b, E))} - \int e^{x}\,dx$.`,
          String.raw`Quindi una primitiva è $F(x) = ${tex(linearTimes(1, b, E))} - e^{x} = ${tex(linearTimes(1, b - 1, E))}$.`,
        ],
        hint: String.raw`Integra per parti con $f = ${tex(linear(1, b))}$ e $g' = e^{x}$, poi calcola $F(${u}) - F(0)$: $F(0)$ non è zero.`,
      };
    }

    case "partsLog": {
      const { m, n } = model;
      const q = (n + 1) * (n + 1);
      // F = m·x^{n+1}·ln x/(n+1) − m·x^{n+1}/(n+1)².  In e: m·e^{n+1}·n/(n+1)²; in 1: −m/(n+1)².
      const upper = ExactSum.exp(m * n, q, n + 1);
      const lower = ExactSum.of(-m, q);
      const integrand = n === 0 ? times(m, ln(x)) : product(m, power(n), ln(x));
      const first = scaled(m, n + 1, product(power(n + 1), ln(x)));
      return {
        integrand,
        from: num(1),
        to: e,
        primitive: sum(first, scaled(-m, q, power(n + 1))),
        upper,
        lower,
        wrong: [
          // Segno più davanti al secondo integrale.
          wrong(PARTI, ExactSum.exp(m * (n + 2), q, n + 1).minus(ExactSum.of(m, q))),
          // Fermato a f·g.
          wrong(PARTI, ExactSum.exp(m, n + 1, n + 1)),
        ],
        technique: [
          String.raw`Per parti con $f = \ln x$ e $g' = ${tex(times(m, power(n)))}$: $f' = \dfrac{1}{x}$ e $g = ${tex(scaled(m, n + 1, power(n + 1)))}$.`,
          String.raw`$${integralLatex(integrand)} = ${tex(first)} - \int ${tex(scaled(m, n + 1, power(n)))}\,dx$, quindi una primitiva è $F(x) = ${tex(sum(first, scaled(-m, q, power(n + 1))))}$.`,
        ],
        hint: String.raw`Integra per parti con $f = \ln x$; poi ricorda che $\ln e = 1$ e $\ln 1 = 0$.`,
      };
    }

    case "partsTrig": {
      const { f, b, angle } = model;
      const integrand = linearTimes(1, b, f === "cos" ? cos(x) : sin(x));
      const poly = linear(1, b);
      // U = π/2 o π. Il valore di (U + b) è π/2 + b oppure π + b.
      const shifted = (angle === "pi2" ? ExactSum.pi(1, 2) : ExactSum.pi(1)).plus(ExactSum.of(b));
      // (x²/2 + bx) in U: π²/8 + bπ/2 oppure π²/2 + bπ.
      const squares = angle === "pi2" ? ExactSum.of(1, 8, pow(pi, 2)).plus(ExactSum.pi(b, 2)) : ExactSum.of(1, 2, pow(pi, 2)).plus(ExactSum.pi(b));
      const [s, c] = [SIN[angle][0], COS[angle][0]];
      const to = piOver(...ANGLE[angle]);
      if (f === "cos") {
        // F = (x + b)·sin x + cos x.
        return {
          integrand,
          from: num(0),
          to,
          primitive: sum(linearTimes(1, b, sin(x)), cos(x)),
          upper: shifted.times(s).plus(ExactSum.of(c)),
          lower: ExactSum.of(1),
          wrong: [
            // Segno sbagliato davanti al secondo integrale: (x + b)·sin x − cos x.
            wrong(PARTI, shifted.times(s).minus(ExactSum.of(c)).plus(ExactSum.of(1))),
            // Prodotto degli integrali: (x²/2 + bx)·sin x.
            wrong(PROD, squares.times(s)),
          ],
          technique: [
            String.raw`Per parti con $f = ${tex(poly)}$ e $g' = \cos x$: $f' = 1$ e $g = \sin x$.`,
            String.raw`$${integralLatex(integrand)} = ${tex(linearTimes(1, b, sin(x)))} - \int \sin x\,dx$, quindi una primitiva è $F(x) = ${tex(sum(linearTimes(1, b, sin(x)), cos(x)))}$.`,
          ],
          hint: String.raw`Integra per parti con $f = ${tex(poly)}$ e $g' = \cos x$. Attenzione: $\cos 0 = 1$, quindi $F(0)$ non è zero.`,
        };
      }
      // F = −(x + b)·cos x + sin x.
      return {
        integrand,
        from: num(0),
        to,
        primitive: sum(times(-1, linearTimes(1, b, cos(x))), sin(x)),
        upper: shifted.times(-c).plus(ExactSum.of(s)),
        lower: ExactSum.of(-b),
        wrong: [
          // Segno sbagliato davanti al secondo integrale: −(x + b)·cos x − sin x.
          wrong(PARTI, shifted.times(-c).minus(ExactSum.of(s)).plus(ExactSum.of(b))),
          // Prodotto degli integrali: −(x²/2 + bx)·cos x.
          wrong(PROD, squares.times(-c)),
        ],
        technique: [
          String.raw`Per parti con $f = ${tex(poly)}$ e $g' = \sin x$: $f' = 1$ e $g = -\cos x$.`,
          String.raw`$${integralLatex(integrand)} = ${tex(times(-1, linearTimes(1, b, cos(x))))} + \int \cos x\,dx$, quindi una primitiva è $F(x) = ${tex(sum(times(-1, linearTimes(1, b, cos(x))), sin(x)))}$.`,
        ],
        hint: String.raw`Integra per parti con $f = ${tex(poly)}$ e $g' = \sin x$, ricordando che una primitiva di $\sin x$ è $-\cos x$.`,
      };
    }

    case "substLog": {
      const { m, s, b } = model;
      const bottom = add(X2, s);
      const t = sym("t");
      return {
        integrand: div(times(m, x), bottom),
        from: num(0),
        to: num(b),
        primitive: scaled(m, 2, ln(bottom)),
        upper: ExactSum.ln(m, 2, b * b + s),
        lower: ExactSum.ln(m, 2, s),
        wrong: [
          // Estremi non trasformati: la t è stata integrata tra 0 e b invece che tra s e b² + s.
          wrong(ESTREMI, ExactSum.ln(m, 2, b + s, s)),
          // Manca il fattore 1/2 del differenziale.
          wrong(SOST, ExactSum.ln(m, 1, b * b + s, s)),
        ],
        technique: [
          String.raw`Sostituzione $t = ${tex(bottom)}$: $dt = 2x\,dx$. Cambiano anche gli estremi: per $x = 0$ è $t = ${s}$, per $x = ${b}$ è $t = ${b * b + s}$.`,
          String.raw`$${integralLatex(div(times(m, x), bottom), { from: "0", to: String(b) })} = ${tex(scaled(m, 2, ONE))}\displaystyle\int_{${s}}^{${b * b + s}} \frac{1}{${tex(t)}}\,dt$. In $x$, una primitiva è $F(x) = ${tex(scaled(m, 2, ln(bottom)))}$.`,
        ],
        hint: String.raw`Poni $t = ${tex(bottom)}$ e trasforma anche gli estremi: $x = 0$ e $x = ${b}$ diventano due valori di $t$.`,
      };
    }

    case "substExp": {
      const { m, a, b } = model;
      const E = exp(X2);
      return {
        integrand: product(m, x, E),
        from: num(a),
        to: num(b),
        primitive: scaled(m, 2, E),
        upper: ExactSum.exp(m, 2, b * b),
        lower: ExactSum.exp(m, 2, a * a),
        wrong: [
          // Estremi non trasformati.
          wrong(ESTREMI, ExactSum.exp(m, 2, b).minus(ExactSum.exp(m, 2, a))),
          wrong(SOST, ExactSum.exp(m, 1, b * b).minus(ExactSum.exp(m, 1, a * a))),
        ],
        technique: [
          String.raw`Sostituzione $t = x^{2}$: $dt = 2x\,dx$, cioè $x\,dx = \dfrac{1}{2}\,dt$. Cambiano anche gli estremi: $x = ${a}$ dà $t = ${a * a}$, $x = ${b}$ dà $t = ${b * b}$.`,
          String.raw`L'integrale diventa $${tex(scaled(m, 2, ONE))}\displaystyle\int_{${a * a}}^{${b * b}} e^{t}\,dt$; in $x$, una primitiva è $F(x) = ${tex(scaled(m, 2, E))}$.`,
        ],
        hint: String.raw`Poni $t = x^{2}$ e trasforma anche gli estremi.`,
      };
    }

    case "partialFractions": {
      const { A, B, r1, r2, a, b } = model;
      const [top0, top1] = [-(A * r2 + B * r1), A + B];
      const numerator = linear(top1, top0);
      const denominator = sum(X2, times(-(r1 + r2), x), num(r1 * r2));
      const [d1, d2] = [linear(1, -r1), linear(1, -r2)];
      const F = (t: number): ExactSum => ExactSum.ln(A, 1, t - r1).plus(ExactSum.ln(B, 1, t - r2));
      const swapped = ExactSum.ln(B, 1, b - r1, a - r1).plus(ExactSum.ln(A, 1, b - r2, a - r2));
      const signs = (a + r1) * (b + r1) > 0 && (a + r2) * (b + r2) > 0 ? [wrong("ALG.SEGNI_FATTORI", ExactSum.ln(A, 1, Math.abs(b + r1), Math.abs(a + r1)).plus(ExactSum.ln(B, 1, Math.abs(b + r2), Math.abs(a + r2))))] : [];
      return {
        integrand: div(numerator, denominator),
        from: num(a),
        to: num(b),
        primitive: sum(times(A, ln(abs(d1))), times(B, ln(abs(d2)))),
        // F(b) e F(a) si scrivono separati; il valore si raccoglie con le proprietà dei logaritmi.
        upper: F(b),
        lower: F(a),
        wrong: [wrong(FRATTI, ExactSum.ln(1, 1, (b - r1) * (b - r2), (a - r1) * (a - r2))), wrong(FRATTI, swapped), ...signs],
        technique: [
          String.raw`Il denominatore ha le radici $${r1}$ e $${r2}$: $${tex(denominator)} = ${tex(product(d1, d2))}$. Si scompone in fratti semplici: $${tex(div(numerator, denominator))} = \dfrac{A}{${tex(d1)}} + \dfrac{B}{${tex(d2)}}$.`,
          String.raw`Con $x = ${r1}$ si trova $A = ${A}$, con $x = ${r2}$ si trova $B = ${B}$. Una primitiva è $F(x) = ${tex(sum(times(A, ln(abs(d1))), times(B, ln(abs(d2)))))}$; tra $${a}$ e $${b}$ i due argomenti sono positivi.`,
        ],
        hint: String.raw`Scomponi $${tex(denominator)} = ${tex(product(d1, d2))}$ e scrivi la frazione come somma di fratti semplici; ognuno dà un logaritmo.`,
      };
    }

    case "partsTwice": {
      const { m, k, u } = model;
      const E = exp(times(k, x));
      const k3 = k * k * k;
      // F = m(k²x² − 2kx + 2)e^{kx}/k³.  In 1: m(k² − 2k + 2)eᵏ/k³; in 0: 2m/k³.
      const F = (second: number, third: number, t: number): ExactSum => ExactSum.exp(m * (k * k * t * t + second * k * t + third), k3, k * t);
      const integrand = product(m, X2, E);
      return {
        integrand,
        from: num(0),
        to: num(u),
        primitive: combination(m, k3, [[k * k, X2], [-2 * k, x], [2, ONE]], E),
        upper: F(-2, 2, u),
        lower: F(-2, 2, 0),
        wrong: [
          wrong("CALC.MENO_PARENTESI", F(-2, -2, u).minus(F(-2, -2, 0))),
          wrong(PARTI, F(2, 2, u).minus(F(2, 2, 0))),
          // Una sola integrazione per parti: m(kx² − 2x)e^{kx}/k².
          wrong(PARTI, ExactSum.exp(m * (k * u * u - 2 * u), k * k, k * u)),
        ],
        technique: [
          String.raw`Per parti due volte, derivando ogni volta il polinomio. Prima: $f = ${tex(times(m, X2))}$, $g' = ${tex(E)}$; resta un integrale con $x\,${tex(E)}$, che si calcola ancora per parti.`,
          String.raw`Una primitiva è $F(x) = ${tex(combination(m, k3, [[k * k, X2], [-2 * k, x], [2, ONE]], E))}$ (controllo: derivandola si ritrova $${tex(integrand)}$).`,
        ],
        hint: String.raw`Integra per parti due volte con $g' = ${tex(E)}$. Poi $F(0)$ non è zero: $e^{0} = 1$.`,
      };
    }

    case "logArctan": {
      const { a, b, s } = model;
      const bottom = add(X2, s * s);
      const L = ln(bottom);
      const AT = arctan(div(x, s));
      return {
        integrand: div(linear(a, b), bottom),
        from: num(0),
        to: num(s),
        primitive: sum(scaled(a, 2, L), scaled(b, s, AT)),
        // ln(2s²)·a/2 + (b/s)·π/4 meno (a/2)·ln(s²): il valore si raccoglie in (a/2)·ln 2 + bπ/(4s).
        upper: ExactSum.ln(a, 2, 2 * s * s).plus(ExactSum.pi(b, 4 * s)),
        lower: ExactSum.ln(a, 2, s * s),
        wrong: [
          wrong(SOST, ExactSum.ln(a, 1, 2).plus(ExactSum.pi(b, 4 * s))),
          wrong(FRATTI, ExactSum.ln(a, 2, 2).plus(ExactSum.pi(b, 4))),
        ],
        technique: [
          String.raw`Spezza la frazione: $${tex(div(linear(a, b), bottom))} = ${tex(div(times(a, x), bottom))} ${b < 0 ? "-" : "+"} ${tex(div(num(Math.abs(b)), bottom))}$. Nella prima il numeratore è, a meno di una costante, la derivata del denominatore; la seconda dà un'arcotangente, $\int \dfrac{dx}{x^{2} + a^{2}} = \dfrac{1}{a}\arctan\dfrac{x}{a}$.`,
          String.raw`Una primitiva è $F(x) = ${tex(sum(scaled(a, 2, L), scaled(b, s, AT)))}$; ricorda $\arctan 1 = \dfrac{\pi}{4}$ e $\arctan 0 = 0$.`,
        ],
        hint: String.raw`Spezza la frazione in due: una dà un logaritmo, l'altra un'arcotangente. Poi $\arctan 1 = \dfrac{\pi}{4}$.`,
      };
    }
  }
}

// ───────────────────────────── scelta dei numeri ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  const shape = rng.pick(["poly", "poly", "poly", "trig", "trig", "exp", "reciprocal"] as const);
  switch (shape) {
    case "poly": {
      const a = rng.int(-2, 2);
      const b = a + rng.int(1, 3);
      const c2 = rng.pick([1, 2, 3, 6, -3, -6]);
      const c1 = rng.pick([0, 2, 4, -2, -4, 1]);
      const c0 = rng.pick([0, 1, 2, 3, -1, -2, -5]);
      return { kind: "poly", c2, c1, c0, a, b };
    }
    case "trig": {
      const f = rng.pick(["sin", "cos"] as const);
      const angle = f === "sin" ? rng.pick(["pi2", "pi", "pi3"] as const) : rng.pick(["pi2", "pi6"] as const);
      return { kind: "trig", f, m: rng.pick([1, 2, 3, 4, 6]), k: rng.int(2, 4), angle };
    }
    case "exp":
      return { kind: "exp", m: rng.pick([1, 2, 3, 4, 6]), k: rng.pick([1, 2, 3, -1, -2]) };
    case "reciprocal": {
      const a = rng.int(0, 2);
      return { kind: "reciprocal", m: rng.int(1, 5), s: rng.int(1, 4), a, b: a + rng.int(1, 4) };
    }
  }
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["partsExp", "partsExp", "partsLog", "partsLog", "partsTrig", "partsTrig", "substLog", "substLog", "substExp"] as const);
  switch (shape) {
    case "partsExp":
      return { kind: "partsExp", b: rng.int(-2, 3), u: rng.pick([1, 1, 2]) };
    case "partsLog":
      return { kind: "partsLog", m: rng.pick([1, 2, 3, 4, 9]), n: rng.int(0, 2) };
    case "partsTrig": {
      // Con il coseno solo fino a π/2 (in π il valore non dipende da b); con il seno b ≠ 0.
      const f = rng.pick(["sin", "cos"] as const);
      return f === "cos" ? { kind: "partsTrig", f, b: rng.int(-2, 3), angle: "pi2" } : { kind: "partsTrig", f, b: rng.intExcept(-2, 3), angle: rng.pick(["pi2", "pi"] as const) };
    }
    case "substLog":
      return { kind: "substLog", m: rng.pick([1, 2, 3, 4, 6]), s: rng.int(1, 5), b: rng.int(1, 3) };
    case "substExp": {
      const a = rng.int(0, 1);
      return { kind: "substExp", m: rng.pick([1, 2, 4, 6]), a, b: a + 1 };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["partialFractions", "partialFractions", "partialFractions", "partsTwice", "logArctan", "logArctan"] as const);
  switch (shape) {
    case "partialFractions": {
      const [r1, r2] = rng.sample([-3, -2, -1, 0, 1, 2, 3], 2).sort((p, q) => p - q) as [number, number];
      const A = rng.intExcept(-3, 3);
      const a = r2 + rng.int(1, 2);
      return { kind: "partialFractions", A, B: rng.intExcept(-3, 3, [0, A]), r1, r2, a, b: a + rng.int(1, 3) };
    }
    case "partsTwice":
      return { kind: "partsTwice", m: rng.pick([1, 2, 3, 4]), k: rng.pick([1, 1, 2, 3]), u: rng.pick([1, 1, 2]) };
    case "logArctan":
      return { kind: "logArctan", a: rng.intExcept(-4, 4), b: rng.intExcept(-6, 6), s: rng.int(1, 4) };
  }
}

function buildModel(level: number, rng: Rng_): Model {
  // Si estrae finché il valore dell'integrale e i valori della primitiva restano puliti (tentativi
  // seminati: l'esercizio resta deterministico).
  for (let attempt = 0; ; attempt++) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    const plan = planOf(model);
    const clean = [plan.upper, plan.lower, plan.upper.minus(plan.lower)].every((value) => value.isClean(LIMITS.maxInteger, LIMITS.maxDenominator));
    // Servono anche almeno tre risposte sbagliate pulite e distinte, per la scelta multipla.
    if ((clean && wrongAnswersOf(plan).length >= 3) || attempt >= 80) return model;
  }
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

const numeric = (value: ExactSum): number => evaluate(value.toExpr(), {});

/** Le risposte sbagliate con un valore diverso dalla giusta e diverso tra loro. */
function distinctValues(correct: ExactSum, candidates: readonly WrongValue[]): ExpectedWrong<Expr>[] {
  const seen = [numeric(correct)];
  const kept: ExpectedWrong<Expr>[] = [];
  for (const candidate of candidates) {
    const value = numeric(candidate.value);
    if (!candidate.value.isClean(LIMITS.maxInteger, LIMITS.maxDenominator)) continue;
    if (!Number.isFinite(value) || seen.some((other) => Math.abs(other - value) < 1e-9 * (1 + Math.abs(value)))) continue;
    seen.push(value);
    kept.push({ error: candidate.error, value: candidate.value.toExpr() });
  }
  return kept;
}

const FIRST_HINT = String.raw`Per il teorema fondamentale del calcolo $\displaystyle\int_a^b f(x)\,dx = F(b) - F(a)$, con $F$ una primitiva di $f$: prima trova una primitiva, poi sottrai il suo valore nell'estremo inferiore da quello nell'estremo superiore.`;

/** Le risposte sbagliate: quelle della tecnica, poi F(a) dimenticato e F(a) − F(b). */
function wrongAnswersOf(plan: Plan): ExpectedWrong<Expr>[] {
  const value = plan.upper.minus(plan.lower);
  // Gli errori sugli estremi passano per primi: se una tecnica sbagliata dà lo stesso valore, vince l'estremo.
  const all = distinctValues(value, [wrong(ESTREMI, value.times(-1)), wrong(ESTREMI, plan.upper), ...plan.wrong]);
  // Al massimo quattro, ma almeno un errore sugli estremi resta sempre (è il cuore dell'abilità).
  const bounds = all.filter((candidate) => candidate.error === ESTREMI);
  const others = all.filter((candidate) => candidate.error !== ESTREMI);
  const kept = Math.min(bounds.length, Math.max(1, 4 - others.length));
  return [...others.slice(0, 4 - kept), ...bounds.slice(0, kept)];
}

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const value = plan.upper.minus(plan.lower);
  const bounds = { from: tex(plan.from), to: tex(plan.to) };
  const integral = integralLatex(plan.integrand, bounds);
  const at = (bound: Expr): string => (bound.kind === "num" && bound.value.sign() < 0 ? `\\left(${tex(bound)}\\right)` : tex(bound));
  return {
    prompt: `Calcola l'integrale definito:\n\n$$${integral}$$\n\nScrivi il risultato in forma esatta.`,
    answer: { kind: "number", correct: value.toExpr(), wrong: wrongAnswersOf(plan), mode: exact },
    steps: [
      ...plan.technique.map((text) => ({ text })),
      { text: String.raw`Valori della primitiva negli estremi: $F(${at(plan.to)}) = ${tex(plan.upper.toExpr())}$ e $F(${at(plan.from)}) = ${tex(plan.lower.toExpr())}$.` },
      { text: `Per il teorema fondamentale del calcolo l'integrale è $F(${at(plan.to)}) - F(${at(plan.from)})$:\n\n$$${integral} = ${tex(value.toExpr())}$$` },
    ],
    hints: [FIRST_HINT, plan.hint],
  };
}

/** Integrale numerico con il metodo di Simpson (n pari). */
function simpson(f: (t: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let total = f(a) + f(b);
  for (let i = 1; i < n; i++) total += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (total * h) / 3;
}

export default defineGenerator({
  code: "V2.M09.A02.g1",
  skill: "V2.M09.A02",
  lesson: "V2.M09.L08",
  title: "Integrali definiti con il teorema fondamentale del calcolo",
  levels: [1, 2, 3],
  errors: [ESTREMI, PRIM, SOST, PARTI, PROD, FRATTI, "ALG.SEGNI_FATTORI", "CALC.MENO_PARENTESI"],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "number") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    if (!exercise.prompt.includes(integralLatex(plan.integrand, { from: tex(plan.from), to: tex(plan.to) }))) return false;
    const [a, b] = [evaluate(plan.from, {}), evaluate(plan.to, {})];
    const expected = simpson((t) => evaluate(plan.integrand, { x: t }), a, b);
    const actual = evaluate(answer.correct, {});
    return Number.isFinite(expected) && Math.abs(expected - actual) <= 1e-7 * (1 + Math.abs(expected));
  },
});
