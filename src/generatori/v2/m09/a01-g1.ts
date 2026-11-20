// V2.M09.A01.g1 — Integrali indefiniti: immediati, per sostituzione, per parti, funzioni razionali.
//
// Costruzione all'indietro: ogni forma di esercizio parte dalla primitiva (scritta con la formula
// della tecnica, mai «integrando») e ne ricava la funzione integranda. La risposta di Andrea non si
// confronta con la primitiva scelta: si DERIVA e si confronta con l'integranda, qualunque costante
// abbia (controllo «antiderivative»); senza costante arbitraria è AN.COSTANTE_INTEGRAZIONE.
// Le risposte sbagliate sono la tecnica applicata male, davvero, sui numeri dell'esercizio.
//
// Livello 1: primitive immediate e funzioni di ax + b.
// Livello 2: una tecnica (parti con un passaggio, sostituzione, arcotangente).
// Livello 3: funzioni razionali da scomporre o dividere, parti ripetute, parti e sostituzione insieme.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { derive, isAntiderivative } from "../../../motore/calculus/derive";
import { compare } from "../../../motore/equivalence/equivalence";
import { abs, add, cos, div, evaluate, exp, exprKey, fn, frac, ln, num, pow, sin, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import type { WrongCandidate } from "../../comuni/wrong";
import { combination, inside, integralLatex, linear, linearTimes, over, power, powerOf, product, scaled, sum, times } from "../../comuni/writing";

type Rng_ = GeneratorContext["rng"];

const LIMITS = { maxInteger: 60, maxDenominator: 32 };

const x = sym("x");
const C = sym("c");
const X2 = pow(x, 2);
const LN = ln(x);
const ONE = num(1);
const tex = (expr: Expr): string => toLatex(expr);
const lnAbs = (arg: Expr): Expr => ln(abs(arg));
const arctan = (arg: Expr): Expr => fn("arctan", arg);

const PRIM = "AN.PRIMITIVA_ELEMENTARE";
const SOST = "AN.SOSTITUZIONE_FATTORE";
const PARTI = "AN.INTEGRAZIONE_PARTI";
const PROD = "AN.INTEGRALE_PRODOTTO";
const FRATTI = "AN.FRATTI_SEMPLICI";

const wrong = (error: ErrorCode, value: Expr): WrongCandidate<Expr> => ({ error, value });

/** Il coefficiente p/q davanti a un integrale: niente se vale 1, solo il meno se vale −1. */
const coefficient = (p: number, q: number): string => (p === q ? "" : p === -q ? "-" : tex(frac(p, q)));
/** c·xⁿ scritto a mano, anche per n = 0. */
const monomial = (c: number, n: number): Expr => (n === 0 ? num(c) : times(c, power(n)));

// ───────────────────────────── il modello di un esercizio ─────────────────────────────

type Trig = "sin" | "cos";

type Model =
  | { readonly kind: "poly"; readonly terms: readonly (readonly [coefficient: number, exponent: number])[] }
  | { readonly kind: "linearInside"; readonly f: Trig | "exp"; readonly k: number; readonly a: number; readonly b: number }
  | { readonly kind: "powerOfLinear"; readonly a: number; readonly b: number; readonly n: number }
  | { readonly kind: "reciprocalLinear"; readonly k: number; readonly a: number; readonly b: number }
  | { readonly kind: "partsExp"; readonly a: number; readonly b: number; readonly k: number }
  | { readonly kind: "partsTrig"; readonly f: Trig; readonly a: number; readonly b: number; readonly k: number }
  | { readonly kind: "partsLog"; readonly k: number; readonly n: number }
  | { readonly kind: "xExpSquare"; readonly k: number; readonly a: number }
  | { readonly kind: "xOverSquare"; readonly k: number; readonly s: number }
  | { readonly kind: "trigPower"; readonly f: Trig; readonly k: number; readonly n: number }
  | { readonly kind: "logPower"; readonly k: number; readonly n: number }
  | { readonly kind: "xPowerInside"; readonly k: number; readonly a: number; readonly n: number }
  | { readonly kind: "arctan"; readonly k: number; readonly s: number }
  | { readonly kind: "partialFractions"; readonly A: number; readonly B: number; readonly r1: number; readonly r2: number }
  | { readonly kind: "improperRational"; readonly r: number; readonly m: number; readonly R: number }
  | { readonly kind: "logPlusArctan"; readonly a: number; readonly b: number; readonly s: number }
  | { readonly kind: "partsTwice"; readonly a: number; readonly k: number }
  | { readonly kind: "cyclic"; readonly f: Trig; readonly a: number; readonly b: number }
  | { readonly kind: "partsArctan"; readonly k: number; readonly s: number }
  | { readonly kind: "xCubeExp"; readonly k: number; readonly a: number };

/** Quello che si ricava da un modello: tutto tranne la costante arbitraria, che si aggiunge alla fine. */
interface Plan {
  readonly integrand: Expr;
  /** La primitiva scelta, senza costante. */
  readonly primitive: Expr;
  /** Le primitive sbagliate (senza costante), dalla più importante. */
  readonly wrong: readonly WrongCandidate<Expr>[];
  readonly steps: readonly string[];
  /** Il secondo indizio: come cominciare. */
  readonly hint: string;
  /** Vero se nella primitiva c'è un logaritmo con il valore assoluto (ln x al suo posto è COND.LOGARITMO). */
  readonly logarithm?: boolean;
}

const CHECK_STEP = "Controllo: derivando il risultato si deve ritrovare la funzione integranda.";

function planOf(model: Model): Plan {
  switch (model.kind) {
    case "poly": {
      const { terms } = model;
      const integrand = sum(...terms.map(([c, n]) => monomial(c, n)));
      const primitive = sum(...terms.map(([c, n]) => scaled(c, n + 1, power(n + 1))));
      const pieces = terms.map(([c, n]) => `$${integralLatex(monomial(c, n))} = ${tex(scaled(c, n + 1, power(n + 1)))}$`);
      return {
        integrand,
        primitive,
        wrong: [
          // Esponente aumentato senza dividere per il nuovo esponente.
          wrong(PRIM, sum(...terms.map(([c, n]) => times(c, power(n + 1))))),
          // Derivata al posto della primitiva.
          wrong(PRIM, sum(...terms.map(([c, n]) => (n === 0 ? num(0) : monomial(c * n, n - 1))))),
          // Diviso per il vecchio esponente invece che per il nuovo.
          wrong(PRIM, sum(...terms.map(([c, n]) => (n === 0 ? times(c, x) : scaled(c, n, power(n + 1)))))),
        ],
        steps: [
          "L'integrale di una somma è la somma degli integrali, e le costanti moltiplicative restano davanti: si integra una potenza alla volta.",
          String.raw`Per ogni potenza vale $\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1} + c$: l'esponente aumenta di uno e si divide per il nuovo esponente (un termine costante $k$ diventa $kx$). Qui: ${pieces.join(", ")}.`,
          `Somma i risultati e aggiungi la costante arbitraria:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra un termine alla volta con $\int x^{n}\,dx = \dfrac{x^{n+1}}{n+1} + c$; un termine costante $k$ diventa $kx$. Non dimenticare la costante arbitraria.`,
      };
    }

    case "linearInside": {
      const { f, k, a, b } = model;
      const u = inside(a, b);
      const integrand = times(k, f === "sin" ? sin(u) : f === "cos" ? cos(u) : exp(u));
      // La primitiva elementare: ∫sin t = −cos t, ∫cos t = sin t, ∫eᵗ = eᵗ.
      const base = f === "sin" ? cos(u) : f === "cos" ? sin(u) : exp(u);
      const sign = f === "sin" ? -1 : 1;
      const elementary = f === "sin" ? String.raw`\int \sin t\,dt = -\cos t + c` : f === "cos" ? String.raw`\int \cos t\,dt = \sin t + c` : String.raw`\int e^{t}\,dt = e^{t} + c`;
      const primitive = scaled(sign * k, a, base);
      return {
        integrand,
        primitive,
        wrong: [
          // Integrata come se dentro ci fosse solo x: manca la divisione per a.
          wrong(SOST, times(sign * k, base)),
          // Moltiplicato per a invece di dividere.
          wrong(SOST, times(sign * k * a, base)),
          f === "exp"
            ? // Regola delle potenze applicata all'esponenziale.
              wrong(PRIM, div(times(k, exp(inside(a, b + 1))), inside(a, b + 1)))
            : // Segno della primitiva di seno o coseno sbagliato.
              wrong(PRIM, scaled(-sign * k, a, base)),
          // Derivata al posto della primitiva.
          f === "exp" ? null : wrong(PRIM, times((f === "sin" ? 1 : -1) * k * a, base)),
        ],
        steps: [
          String.raw`Dentro la funzione c'è $${tex(u)}$, di primo grado. Con la sostituzione $t = ${tex(u)}$ si ha $dt = ${tex(num(a))}\,dx$, cioè $dx = ${tex(frac(1, a))}\,dt$.`,
          String.raw`L'integrale diventa $${coefficient(k, a)}\displaystyle${elementary.replace(" + c", "")}$: la costante resta davanti, e si usa l'integrale elementare $${elementary}$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP + String.raw` La derivata di $${tex(base)}$ porta fuori il fattore $${tex(num(a))}$, che si semplifica con il denominatore.`,
        ],
        hint: String.raw`Poni $t = ${tex(u)}$: allora $dt = ${tex(num(a))}\,dx$. Ricorda di sostituire anche $dx$, non solo l'argomento.`,
      };
    }

    case "powerOfLinear": {
      const { a, b, n } = model;
      const u = inside(a, b);
      const integrand = pow(u, n);
      const primitive = scaled(1, a * (n + 1), pow(u, n + 1));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, scaled(1, n + 1, pow(u, n + 1))),
          wrong(PRIM, times(n * a, powerOf(u, n - 1))),
          wrong(SOST, scaled(a, n + 1, pow(u, n + 1))),
          wrong(PRIM, scaled(1, a, pow(u, n + 1))),
        ],
        steps: [
          String.raw`Non serve sviluppare la potenza. Con $t = ${tex(u)}$ si ha $dt = ${tex(num(a))}\,dx$, cioè $dx = ${tex(frac(1, a))}\,dt$.`,
          String.raw`L'integrale diventa $${tex(frac(1, a))}\displaystyle\int t^{${n}}\,dt = ${tex(frac(1, a))} \cdot \dfrac{t^{${n + 1}}}{${n + 1}} + c$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Poni $t = ${tex(u)}$: l'integrale diventa quello di una potenza di $t$, ma $dx$ va sostituito con $${tex(frac(1, a))}\,dt$.`,
      };
    }

    case "reciprocalLinear": {
      const { k, a, b } = model;
      const u = linear(a, b);
      const integrand = div(num(k), u);
      const primitive = scaled(k, a, lnAbs(u));
      return {
        integrand,
        primitive,
        logarithm: true,
        wrong: [
          wrong(SOST, times(k, lnAbs(u))),
          // Regola delle potenze (o derivata) al posto del logaritmo.
          wrong(PRIM, over(-k * a, pow(u, 2))),
          wrong(SOST, times(k * a, lnAbs(u))),
        ],
        steps: [
          String.raw`Al denominatore c'è $${tex(u)}$, di primo grado: la primitiva è un logaritmo, perché $\int \dfrac{1}{t}\,dt = \ln|t| + c$.`,
          String.raw`Con $t = ${tex(u)}$ si ha $dt = ${tex(num(a))}\,dx$, cioè $dx = ${tex(frac(1, a))}\,dt$: l'integrale diventa $${coefficient(k, a)}\displaystyle\int \dfrac{1}{t}\,dt$.`,
          `Torna alla variabile $x$, con il valore assoluto nell'argomento del logaritmo:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Ricorda $\int \dfrac{1}{t}\,dt = \ln|t| + c$ e poni $t = ${tex(u)}$, sostituendo anche $dx$.`,
      };
    }

    case "partsExp": {
      const { a, b, k } = model;
      const E = exp(times(k, x));
      const f = linear(a, b);
      const integrand = linearTimes(a, b, E);
      const combine = (q: number, slope: number, constant: number): Expr => combination(1, q, [[slope, x], [constant, ONE]], E);
      const primitive = combine(k * k, k * a, k * b - a);
      return {
        integrand,
        primitive,
        wrong: [
          // Segno più davanti al secondo integrale.
          wrong(PARTI, combine(k * k, k * a, k * b + a)),
          // Prodotto degli integrali dei due fattori.
          wrong(PROD, combination(1, 2 * k, [[a, X2], [2 * b, x]], E)),
          // Nel secondo integrale g′ al posto di g.
          wrong(PARTI, combine(k, a, b - a)),
          // Primitiva di e^{kx} presa senza dividere per k.
          wrong(SOST, combine(1, a, b - a)),
          // Fermato a f·g.
          wrong(PARTI, combine(k, a, b)),
        ],
        steps: [
          String.raw`È il prodotto di un polinomio e di un esponenziale: si integra per parti, $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$. Scegli come $f$ il polinomio, perché derivandolo si semplifica: $f = ${tex(f)}$, $g' = ${tex(E)}$.`,
          String.raw`Allora $f' = ${tex(num(a))}$ e $g = ${tex(scaled(1, k, E))}$ (una primitiva di $${tex(E)}$).`,
          `Applica la formula, con il meno davanti al secondo integrale:\n\n$$${integralLatex(integrand)} = ${tex(combine(k, a, b))} - ${integralLatex(scaled(a, k, E))}$$`,
          String.raw`Il secondo integrale è immediato: $${integralLatex(scaled(a, k, E))} = ${tex(scaled(a, k * k, E))}$.`,
          `Sottrai e raccogli l'esponenziale:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti con $f = ${tex(f)}$ (da derivare) e $g' = ${tex(E)}$ (da integrare): $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$.`,
      };
    }

    case "partsTrig": {
      const { f, a, b, k } = model;
      const [S, Cs] = [sin(times(k, x)), cos(times(k, x))];
      const polynomial = linear(a, b);
      const half = (q: number, f: Expr): Expr => combination(1, q, [[a, x], [b, ONE]], f);
      const squares = (q: number, f: Expr): Expr => combination(1, q, [[a, X2], [2 * b, x]], f);
      if (f === "cos") {
        const integrand = linearTimes(a, b, Cs);
        const first = half(k, S);
        const primitive = sum(first, scaled(a, k * k, Cs));
        return {
          integrand,
          primitive,
          wrong: [
            wrong(PARTI, sum(first, scaled(-a, k * k, Cs))),
            wrong(PROD, squares(2 * k, S)),
            wrong(SOST, sum(half(1, S), times(a, Cs))),
            wrong(PARTI, first),
          ],
          steps: [
            String.raw`È il prodotto di un polinomio e di un coseno: si integra per parti, $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$, con $f = ${tex(polynomial)}$ e $g' = ${tex(Cs)}$.`,
            String.raw`Allora $f' = ${tex(num(a))}$ e $g = ${tex(scaled(1, k, S))}$.`,
            `Applica la formula:\n\n$$${integralLatex(integrand)} = ${tex(first)} - ${integralLatex(scaled(a, k, S))}$$`,
            String.raw`Nel secondo integrale $\int \sin t\,dt = -\cos t$: $${integralLatex(scaled(a, k, S))} = ${tex(scaled(-a, k * k, Cs))}$. Sottraendo, i due meno danno un più.`,
            `Quindi:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
            CHECK_STEP,
          ],
          hint: String.raw`Integra per parti con $f = ${tex(polynomial)}$ (da derivare) e $g' = ${tex(Cs)}$ (da integrare). Attenzione ai segni: $\int \sin t\,dt = -\cos t$.`,
        };
      }
      const integrand = linearTimes(a, b, S);
      const first = half(-k, Cs);
      const primitive = sum(first, scaled(a, k * k, S));
      return {
        integrand,
        primitive,
        wrong: [
          // Primitiva del seno presa con il segno più.
          wrong(PRIM, sum(half(k, Cs), scaled(-a, k * k, S))),
          wrong(PARTI, sum(first, scaled(-a, k * k, S))),
          wrong(PROD, squares(-2 * k, Cs)),
          wrong(SOST, sum(half(-1, Cs), times(a, S))),
          wrong(PARTI, first),
        ],
        steps: [
          String.raw`È il prodotto di un polinomio e di un seno: si integra per parti, $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$, con $f = ${tex(polynomial)}$ e $g' = ${tex(S)}$.`,
          String.raw`Allora $f' = ${tex(num(a))}$ e $g = ${tex(scaled(-1, k, Cs))}$: la primitiva del seno ha il segno meno.`,
          `Applica la formula:\n\n$$${integralLatex(integrand)} = ${tex(first)} - ${integralLatex(scaled(-a, k, Cs))}$$`,
          String.raw`I due meno davanti al secondo integrale danno un più: resta $+${integralLatex(scaled(a, k, Cs))} = ${tex(scaled(a, k * k, S))}$.`,
          `Quindi:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti con $f = ${tex(polynomial)}$ (da derivare) e $g' = ${tex(S)}$ (da integrare). Attenzione ai segni: $\int \sin t\,dt = -\cos t$.`,
      };
    }

    case "partsLog": {
      const { k, n } = model;
      const integrand = n === 0 ? times(k, LN) : product(...(k === 1 ? [] : [num(k)]), power(n), LN);
      const first = scaled(k, n + 1, product(power(n + 1), LN));
      const primitive = sum(first, scaled(-k, (n + 1) * (n + 1), power(n + 1)));
      const gPrime = times(k, power(n));
      const g = scaled(k, n + 1, power(n + 1));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(PARTI, sum(first, scaled(k, (n + 1) * (n + 1), power(n + 1)))),
          wrong(PARTI, first),
          // Nel secondo integrale g′ al posto di g.
          n === 0 ? null : wrong(PARTI, sum(first, scaled(-k, n, power(n)))),
          // «Primitiva» del logaritmo presa uguale a 1/x (che è la derivata).
          n === 0 ? wrong(PRIM, div(num(k), x)) : wrong(PROD, scaled(k, n + 1, power(n))),
        ],
        steps: [
          String.raw`Il logaritmo non ha una primitiva immediata, ma la sua derivata è semplice: si integra per parti, $\int f\,g'\,dx = f\,g - \int f'\,g\,dx$, scegliendo $f = \ln x$ e $g' = ${tex(gPrime)}$.`,
          String.raw`Allora $f' = \dfrac{1}{x}$ e $g = ${tex(g)}$.`,
          `Applica la formula:\n\n$$${integralLatex(integrand)} = ${tex(first)} - ${integralLatex(product(g, div(1, x)))}$$`,
          String.raw`Nel secondo integrale semplifica prima di integrare: $${tex(g)} \cdot \dfrac{1}{x} = ${tex(scaled(k, n + 1, power(n)))}$, la cui primitiva è $${tex(scaled(k, (n + 1) * (n + 1), power(n + 1)))}$.`,
          `Quindi:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti scegliendo $f = \ln x$ (da derivare: $f' = \dfrac{1}{x}$) e $g' = ${tex(gPrime)}$ (da integrare).`,
      };
    }

    case "xExpSquare": {
      const { k, a } = model;
      const inner = times(a, X2);
      const E = exp(inner);
      const integrand = linearTimes(k, 0, E);
      const primitive = scaled(k, 2 * a, E);
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, times(k, E)),
          wrong(PROD, scaled(k, 2, product(X2, E))),
          wrong(SOST, scaled(k, a, E)),
          wrong(SOST, times(2 * a * k, E)),
        ],
        steps: [
          String.raw`Accanto all'esponenziale c'è $x$, che a meno di una costante è la derivata dell'esponente $${tex(inner)}$: è il caso della sostituzione.`,
          String.raw`Poni $t = ${tex(inner)}$: $dt = ${tex(times(2 * a, x))}\,dx$, cioè $x\,dx = ${tex(frac(1, 2 * a))}\,dt$.`,
          String.raw`L'integrale diventa $${coefficient(k, 2 * a)}\displaystyle\int e^{t}\,dt$, e $\int e^{t}\,dt = e^{t} + c$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Il fattore $x$ è, a meno di una costante, la derivata dell'esponente: poni $t = ${tex(inner)}$ e sostituisci anche $x\,dx$.`,
      };
    }

    case "xOverSquare": {
      const { k, s } = model;
      const bottom = add(X2, s * s);
      const L = ln(bottom);
      const integrand = div(times(k, x), bottom);
      const primitive = scaled(k, 2, L);
      const AT = arctan(s === 1 ? x : div(x, s));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, times(k, L)),
          // Diviso per la derivata 2x lasciandola nel risultato.
          wrong(SOST, k % 2 === 0 ? div(times(k / 2, L), x) : div(times(k, L), product(2, x))),
          // Scambiato per l'integrale che dà l'arcotangente.
          wrong(FRATTI, scaled(k, s, AT)),
          wrong(PROD, scaled(k, 2 * s, product(X2, AT))),
        ],
        steps: [
          String.raw`Al numeratore c'è $x$, che a meno di una costante è la derivata del denominatore $${tex(bottom)}$: è il caso $\int \dfrac{g'(x)}{g(x)}\,dx = \ln|g(x)| + c$.`,
          String.raw`Poni $t = ${tex(bottom)}$: $dt = 2x\,dx$, cioè $x\,dx = \dfrac{1}{2}\,dt$. L'integrale diventa $${coefficient(k, 2)}\displaystyle\int \dfrac{1}{t}\,dt$, e $\int \dfrac{1}{t}\,dt = \ln|t| + c$.`,
          String.raw`Torna alla variabile $x$ (qui $${tex(bottom)}$ è sempre positivo, quindi il valore assoluto non serve):` + `\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Guarda il numeratore: è, a meno di una costante, la derivata del denominatore. Poni $t = ${tex(bottom)}$.`,
      };
    }

    case "trigPower": {
      const { f, k, n } = model;
      const [S, Cs] = [sin(x), cos(x)];
      const [inner, other] = f === "sin" ? [S, Cs] : [Cs, S];
      // sinⁿx·cos x: t = sin x, dt = cos x dx.  cosⁿx·sin x: t = cos x, dt = −sin x dx.
      const sign = f === "sin" ? 1 : -1;
      const integrand = product(...(k === 1 ? [] : [num(k)]), pow(inner, n), other);
      const primitive = scaled(sign * k, n + 1, pow(inner, n + 1));
      return {
        integrand,
        primitive,
        wrong: [
          f === "cos" ? wrong(SOST, scaled(k, n + 1, pow(inner, n + 1))) : null,
          // Sostituita la potenza ma non il differenziale: l'altro fattore è rimasto.
          wrong(SOST, scaled(sign * k, n + 1, product(pow(inner, n + 1), other))),
          wrong(PRIM, times(sign * k, pow(inner, n + 1))),
          // Prodotto degli integrali dei due fattori.
          wrong(PROD, scaled(sign * k, n + 1, pow(inner, n + 2))),
        ],
        steps: [
          String.raw`Accanto alla potenza di $${tex(inner)}$ c'è $${tex(other)}$, che è ${f === "sin" ? "la sua derivata" : "l'opposto della sua derivata"}: è il caso della sostituzione.`,
          String.raw`Poni $t = ${tex(inner)}$: $dt = ${f === "sin" ? String.raw`\cos x\,dx` : String.raw`-\sin x\,dx`}$${f === "sin" ? "" : String.raw`, cioè $\sin x\,dx = -dt$`}.`,
          String.raw`L'integrale diventa $${coefficient(sign * k, 1)}\displaystyle\int t^{${n}}\,dt$, e $\int t^{${n}}\,dt = \dfrac{t^{${n + 1}}}{${n + 1}} + c$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Poni $t = ${tex(inner)}$ e guarda che cosa diventa $dt$: l'altro fattore sparisce dentro il differenziale${f === "sin" ? "" : ", ma attenzione al segno"}.`,
      };
    }

    case "logPower": {
      const { k, n } = model;
      const integrand = div(times(k, n === 1 ? LN : pow(LN, n)), x);
      const primitive = scaled(k, n + 1, pow(LN, n + 1));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(PRIM, times(k, pow(LN, n + 1))),
          // Sostituita la potenza ma non il differenziale: 1/x è rimasto.
          wrong(SOST, div(times(k, pow(LN, n + 1)), product(n + 1, x))),
          // Prodotto degli integrali: ∫ lnⁿx per ∫ 1/x.
          wrong(PROD, scaled(k, n + 1, pow(LN, n + 2))),
        ],
        steps: [
          String.raw`Il fattore $\dfrac{1}{x}$ è la derivata di $\ln x$: è il caso della sostituzione.`,
          String.raw`Poni $t = \ln x$: $dt = \dfrac{1}{x}\,dx$. L'integrale diventa $${coefficient(k, 1)}\displaystyle\int t^{${n}}\,dt$, e $\int t^{${n}}\,dt = \dfrac{t^{${n + 1}}}{${n + 1}} + c$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Il fattore $\dfrac{1}{x}$ è la derivata di $\ln x$: poni $t = \ln x$.`,
      };
    }

    case "xPowerInside": {
      const { k, a, n } = model;
      const inner = add(X2, a);
      const integrand = linearTimes(k, 0, pow(inner, n));
      const primitive = scaled(k, 2 * (n + 1), pow(inner, n + 1));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, scaled(k, n + 1, pow(inner, n + 1))),
          wrong(SOST, scaled(k, n + 1, product(x, pow(inner, n + 1)))),
          wrong(PROD, scaled(k, 2 * (n + 1), product(X2, pow(inner, n + 1)))),
        ],
        steps: [
          String.raw`Non conviene sviluppare la potenza: il fattore $x$ è, a meno di una costante, la derivata di $${tex(inner)}$.`,
          String.raw`Poni $t = ${tex(inner)}$: $dt = 2x\,dx$, cioè $x\,dx = \dfrac{1}{2}\,dt$. L'integrale diventa $${coefficient(k, 2)}\displaystyle\int t^{${n}}\,dt$, e $\int t^{${n}}\,dt = \dfrac{t^{${n + 1}}}{${n + 1}} + c$.`,
          `Torna alla variabile $x$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Il fattore $x$ è, a meno di una costante, la derivata di $${tex(inner)}$: poni $t = ${tex(inner)}$ e sostituisci anche $x\,dx$.`,
      };
    }

    case "arctan": {
      const { k, s } = model;
      const bottom = add(X2, s * s);
      const integrand = div(num(k), bottom);
      const AT = arctan(div(x, s));
      const primitive = scaled(k, s, AT);
      return {
        integrand,
        primitive,
        wrong: [
          wrong(FRATTI, times(k, AT)),
          // Logaritmo del denominatore, anche se al numeratore non c'è la sua derivata.
          wrong(FRATTI, times(k, ln(bottom))),
          wrong(FRATTI, scaled(k, s * s, arctan(x))),
          wrong(SOST, k % 2 === 0 ? div(times(k / 2, ln(bottom)), x) : div(times(k, ln(bottom)), product(2, x))),
        ],
        steps: [
          String.raw`Il denominatore $${tex(bottom)}$ non si annulla mai e al numeratore c'è una costante (non la derivata del denominatore): la primitiva è un'arcotangente, non un logaritmo.`,
          String.raw`Vale $\int \dfrac{1}{x^{2} + a^{2}}\,dx = \dfrac{1}{a}\arctan\dfrac{x}{a} + c$: lo si vede raccogliendo $a^{2}$ al denominatore e ponendo $t = \dfrac{x}{a}$. Qui $a = ${s}$.`,
          `Quindi, con la costante $${k}$ che resta davanti:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Il denominatore ha la forma $x^{2} + a^{2}$ con $a = ${s}$: ricorda $\int \dfrac{1}{x^{2} + a^{2}}\,dx = \dfrac{1}{a}\arctan\dfrac{x}{a} + c$.`,
      };
    }

    case "partialFractions": {
      const { A, B, r1, r2 } = model;
      const [top0, top1] = [-(A * r2 + B * r1), A + B];
      const numerator = linear(top1, top0);
      const denominator = sum(X2, times(-(r1 + r2), x), num(r1 * r2));
      const [d1, d2] = [linear(1, -r1), linear(1, -r2)];
      const integrand = div(numerator, denominator);
      const primitive = sum(times(A, lnAbs(d1)), times(B, lnAbs(d2)));
      const valueAt = (r: number): number => top1 * r + top0;
      return {
        integrand,
        primitive,
        logarithm: true,
        wrong: [
          // Logaritmo dell'intero denominatore, senza scomporre.
          wrong(FRATTI, lnAbs(denominator)),
          // Coefficienti attribuiti al fattore sbagliato.
          wrong(FRATTI, sum(times(B, lnAbs(d1)), times(A, lnAbs(d2)))),
          // Fattori del denominatore con i segni sbagliati.
          wrong("ALG.SEGNI_FATTORI", sum(times(A, lnAbs(linear(1, r1))), times(B, lnAbs(linear(1, r2))))),
          // Regola delle potenze al posto del logaritmo.
          wrong(PRIM, sum(over(-A, pow(d1, 2)), over(-B, pow(d2, 2)))),
        ],
        steps: [
          String.raw`È una funzione razionale con il numeratore di grado minore del denominatore: si scompone in fratti semplici. Il denominatore ha le radici $${r1}$ e $${r2}$: $${tex(denominator)} = ${tex(product(d1, d2))}$.`,
          String.raw`Cerca $A$ e $B$ tali che $${tex(integrand)} = \dfrac{A}{${tex(d1)}} + \dfrac{B}{${tex(d2)}}$, cioè $${tex(numerator)} = A\left(${tex(d2)}\right) + B\left(${tex(d1)}\right)$ per ogni $x$.`,
          String.raw`Per $x = ${r1}$: $${valueAt(r1)} = A \cdot \left(${r1 - r2}\right)$, quindi $A = ${A}$. Per $x = ${r2}$: $${valueAt(r2)} = B \cdot ${r2 - r1}$, quindi $B = ${B}$.`,
          String.raw`Ogni fratto semplice dà un logaritmo: $\int \dfrac{1}{x - a}\,dx = \ln|x - a| + c$.` + `\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Scomponi il denominatore, $${tex(denominator)} = ${tex(product(d1, d2))}$, e scrivi la frazione come $\dfrac{A}{${tex(d1)}} + \dfrac{B}{${tex(d2)}}$: trova $A$ e $B$ prima di integrare.`,
      };
    }

    case "improperRational": {
      const { r, m, R } = model;
      const numerator = sum(X2, times(m - r, x), num(R - r * m));
      const d = linear(1, -r);
      const integrand = div(numerator, d);
      const quotient = linear(1, m);
      const whole = sum(scaled(1, 2, X2), times(m, x));
      const primitive = sum(whole, times(R, lnAbs(d)));
      return {
        integrand,
        primitive,
        logarithm: true,
        wrong: [
          // Resto della divisione dimenticato.
          wrong(FRATTI, whole),
          // Quoziente degli integrali di numeratore e denominatore.
          wrong(PROD, div(sum(scaled(1, 3, power(3)), scaled(m - r, 2, X2), times(R - r * m, x)), sum(scaled(1, 2, X2), times(-r, x)))),
          // Resto integrato con la regola delle potenze al posto del logaritmo.
          wrong(PRIM, sum(whole, over(-R, pow(d, 2)))),
          // Resto integrato come una costante, senza il denominatore.
          wrong(FRATTI, sum(scaled(1, 2, X2), times(m + R, x))),
        ],
        steps: [
          String.raw`Il numeratore ha grado maggiore del denominatore: prima di integrare si fa la divisione tra polinomi.`,
          String.raw`Dividendo $${tex(numerator)}$ per $${tex(d)}$ (anche con la regola di Ruffini) si trova quoziente $${tex(quotient)}$ e resto $${R}$: $${tex(numerator)} = ${tex(product(d, quotient))} ${R < 0 ? "-" : "+"} ${Math.abs(R)}$.`,
          String.raw`Quindi $${tex(integrand)} = ${tex(sum(quotient, over(R, d)))}$: una parte polinomiale più un fratto semplice.`,
          String.raw`Integra termine a termine; il fratto semplice dà un logaritmo.` + `\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Il grado del numeratore non è minore di quello del denominatore: dividi $${tex(numerator)}$ per $${tex(d)}$ e scrivi la frazione come quoziente più $\dfrac{\text{resto}}{${tex(d)}}$.`,
      };
    }

    case "logPlusArctan": {
      const { a, b, s } = model;
      const bottom = add(X2, s * s);
      const integrand = div(linear(a, b), bottom);
      const L = ln(bottom);
      const AT = arctan(div(x, s));
      const primitive = sum(scaled(a, 2, L), scaled(b, s, AT));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, sum(times(a, L), scaled(b, s, AT))),
          wrong(FRATTI, sum(scaled(a, 2, L), times(b, AT))),
          // Tutto trattato come un logaritmo.
          a + 2 * b === 0 ? null : wrong(FRATTI, scaled(a + 2 * b, 2, L)),
          wrong(PROD, combination(1, 2 * s, [[a, X2], [2 * b, x]], AT)),
        ],
        steps: [
          String.raw`Il denominatore $${tex(bottom)}$ non ha radici reali, quindi non si scompone. Spezza la frazione in due: $${tex(integrand)} = ${tex(div(times(a, x), bottom))} ${b < 0 ? "-" : "+"} ${tex(div(num(Math.abs(b)), bottom))}$.`,
          String.raw`Nella prima il numeratore è, a meno di una costante, la derivata del denominatore ($2x$): $${integralLatex(div(times(a, x), bottom))} = ${tex(scaled(a, 2, L))}$.`,
          String.raw`La seconda ha la forma $\dfrac{1}{x^{2} + a^{2}}$ con $a = ${s}$, che dà un'arcotangente: $${integralLatex(div(num(b), bottom))} = ${tex(scaled(b, s, AT))}$.`,
          `Somma i due risultati:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Spezza la frazione in due: una con solo il termine in $x$ al numeratore (logaritmo del denominatore), una con solo la costante (arcotangente).`,
      };
    }

    case "partsTwice": {
      const { a, k } = model;
      const E = exp(times(k, x));
      const integrand = product(...(a === 1 ? [] : [num(a)]), X2, E);
      const bracket = (second: number, third: number): Expr => combination(a, k * k * k, [[k * k, X2], [second * k, x], [third, ONE]], E);
      const primitive = bracket(-2, 2);
      const xE = linearTimes(1, 0, E);
      return {
        integrand,
        primitive,
        wrong: [
          // Il meno davanti alla parentesi del secondo passaggio non è stato distribuito.
          wrong("CALC.MENO_PARENTESI", bracket(-2, -2)),
          // Segno più davanti ai secondi integrali.
          wrong(PARTI, bracket(2, 2)),
          // Una sola integrazione per parti: l'integrale rimasto non è stato calcolato per parti.
          wrong(PARTI, combination(a, k * k, [[k, X2], [-2, x]], E)),
          wrong(PROD, scaled(a, 3 * k, product(power(3), E))),
        ],
        steps: [
          String.raw`Polinomio di secondo grado per esponenziale: si integra per parti due volte, ogni volta derivando il polinomio. Prima volta: $f = ${tex(times(a, X2))}$, $g' = ${tex(E)}$, quindi $f' = ${tex(times(2 * a, x))}$ e $g = ${tex(scaled(1, k, E))}$.`,
          `$$${integralLatex(integrand)} = ${tex(sum(scaled(a, k, product(X2, E)), scaled(-2 * a, k, sym("I"))))}, \\qquad I = ${integralLatex(xE)}$$`,
          String.raw`Seconda volta, su $I$: $f = x$, $g' = ${tex(E)}$, quindi $I = ${tex(scaled(1, k, xE))} - ${integralLatex(scaled(1, k, E))} = ${tex(sum(scaled(1, k, xE), scaled(-1, k * k, E)))}$.`,
          String.raw`Sostituisci $I$ nella prima uguaglianza: il termine $${tex(scaled(-2 * a, k, sym("I")))}$ diventa $${tex(sum(scaled(-2 * a, k * k, xE), scaled(2 * a, k * k * k, E)))}$ (il coefficiente moltiplica **entrambi** i termini di $I$, con il suo segno).`,
          `Raccogli l'esponenziale:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti con $f = ${tex(times(a, X2))}$ e $g' = ${tex(E)}$: resta un integrale con $x\,${tex(E)}$, che si calcola ancora per parti.`,
      };
    }

    case "cyclic": {
      const { f, a, b } = model;
      const E = exp(times(a, x));
      const [S, Cs] = [sin(times(b, x)), cos(times(b, x))];
      const integrand = product(E, f === "cos" ? Cs : S);
      // cos: e^{ax}(a cos bx + b sin bx);  sin: e^{ax}(a sin bx − b cos bx).
      const bracket = (q: number, second: number): Expr => combination(1, q, f === "cos" ? [[a, Cs], [second * b, S]] : [[a, S], [-second * b, Cs]], E);
      const primitive = bracket(a * a + b * b, 1);
      const partner = f === "cos" ? S : Cs;
      return {
        integrand,
        primitive,
        wrong: [
          wrong(PARTI, bracket(a * a + b * b, -1)),
          // L'integrale di partenza portato a primo membro con il segno sbagliato.
          a * a === b * b ? null : wrong(PARTI, bracket(a * a - b * b, 1)),
          wrong(PROD, scaled(f === "cos" ? 1 : -1, a * b, product(E, partner))),
          // Fermato dopo due integrazioni per parti, senza risolvere rispetto all'integrale.
          wrong(PARTI, bracket(a * a, 1)),
        ],
        steps: [
          String.raw`Esponenziale per ${f === "cos" ? "coseno" : "seno"}: integrando per parti due volte si ritrova l'integrale di partenza, e lo si ricava come incognita. Chiama $I = ${integralLatex(integrand)}$.`,
          String.raw`Prima volta, con $f = ${tex(f === "cos" ? Cs : S)}$ e $g' = ${tex(E)}$ (quindi $g = ${tex(scaled(1, a, E))}$): $I = ${tex(scaled(1, a, product(E, f === "cos" ? Cs : S)))} ${(f === "cos" ? 1 : -1) * a * b > 0 ? "+" : "-"} ${tex(scaled(Math.abs(b), Math.abs(a), sym("J")))}$, dove $J = ${integralLatex(product(E, partner))}$.`,
          String.raw`Seconda volta, su $J$, con la stessa scelta: $J = ${tex(scaled(1, a, product(E, partner)))} ${(f === "cos" ? -1 : 1) * a * b > 0 ? "+" : "-"} ${tex(scaled(Math.abs(b), Math.abs(a), sym("I")))}$. È ricomparso $I$.`,
          String.raw`Sostituendo: $I = ${tex(bracket(a * a, 1))} - ${tex(scaled(b * b, a * a, sym("I")))}$. Porta $I$ a primo membro: $${tex(scaled(a * a + b * b, a * a, sym("I")))} = ${tex(bracket(a * a, 1))}$.`,
          `Ricava $I$:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti due volte, scegliendo entrambe le volte $g' = ${tex(E)}$: ricompare l'integrale di partenza. Chiamalo $I$ e ricavalo dall'equazione.`,
      };
    }

    case "partsArctan": {
      const { k, s } = model;
      const AT = arctan(s === 1 ? x : div(x, s));
      const bottom = add(X2, s * s);
      const L = ln(bottom);
      const integrand = times(k, AT);
      const first = linearTimes(k, 0, AT);
      const primitive = sum(first, scaled(-k * s, 2, L));
      const inner = div(times(k * s, x), bottom);
      return {
        integrand,
        primitive,
        wrong: [
          wrong(PARTI, sum(first, scaled(k * s, 2, L))),
          wrong(SOST, sum(first, times(-k * s, L))),
          // Derivata al posto della primitiva.
          wrong(PRIM, div(num(k * s), bottom)),
          wrong(PARTI, first),
        ],
        steps: [
          String.raw`L'arcotangente non ha una primitiva immediata, ma la sua derivata è una funzione razionale: si integra per parti con $f = ${tex(integrand)}$ e $g' = 1$, quindi $g = x$.`,
          String.raw`Per la regola della catena $f' = ${tex(div(num(k * s), bottom))}$.`,
          `Applica la formula $\\int f\\,g'\\,dx = f\\,g - \\int f'\\,g\\,dx$:\n\n$$${integralLatex(integrand)} = ${tex(first)} - ${integralLatex(inner)}$$`,
          String.raw`Nell'integrale rimasto il numeratore è, a meno di una costante, la derivata del denominatore ($2x$): $${integralLatex(inner)} = ${tex(scaled(k * s, 2, L))}$.`,
          `Quindi:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Integra per parti pensando la funzione come $${tex(integrand)} \cdot 1$: $f = ${tex(integrand)}$ (da derivare) e $g' = 1$ (da integrare).`,
      };
    }

    case "xCubeExp": {
      const { k, a } = model;
      const inner = times(a, X2);
      const E = exp(inner);
      const integrand = product(...(k === 1 ? [] : [num(k)]), power(3), E);
      const bracket = (q: number, constant: number): Expr => combination(k, q, [[a, X2], [constant, ONE]], E);
      const primitive = bracket(2 * a * a, -1);
      const t = sym("t");
      const Et = exp(times(a, t));
      return {
        integrand,
        primitive,
        wrong: [
          wrong(SOST, bracket(a * a, -1)),
          wrong(PARTI, bracket(2 * a * a, 1)),
          // Dopo la sostituzione, t·e^{at} integrato senza le parti.
          wrong(PARTI, scaled(k, 2 * a, product(X2, E))),
          wrong(PROD, scaled(k, 4, product(power(4), E))),
        ],
        steps: [
          String.raw`Servono due tecniche. Prima una sostituzione: scrivi $x^{3} = x^{2} \cdot x$ e poni $t = x^{2}$, così $dt = 2x\,dx$, cioè $x\,dx = \dfrac{1}{2}\,dt$.`,
          String.raw`L'integrale diventa $${tex(scaled(k, 2, sym("I")))}$ con $I = \displaystyle\int ${tex(product(t, Et))}\,dt$.`,
          String.raw`$I$ si calcola per parti, con $f = t$ e $g' = ${tex(Et)}$: $I = ${tex(scaled(1, a, product(t, Et)))} - \displaystyle\int ${tex(scaled(1, a, Et))}\,dt = ${tex(sum(scaled(1, a, product(t, Et)), scaled(-1, a * a, Et)))}$.`,
          `Torna alla variabile $x$ e raccogli l'esponenziale:\n\n$$${integralLatex(integrand)} = ${tex(sum(primitive, C))}$$`,
          CHECK_STEP,
        ],
        hint: String.raw`Scrivi $x^{3} = x^{2} \cdot x$ e poni $t = x^{2}$: resta un integrale del tipo $\int t\,e^{at}\,dt$, che si calcola per parti.`,
      };
    }
  }
}

// ───────────────────────────── scelta dei numeri (unico punto che usa rng) ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  const shape = rng.pick(["poly", "poly", "poly", "linearInside", "linearInside", "powerOfLinear", "reciprocalLinear"] as const);
  switch (shape) {
    case "poly": {
      const top = rng.int(2, 4);
      const lower = rng.sample([0, 1, 2, 3].filter((n) => n < top), rng.bool(0.6) ? 2 : 1).sort((p, q) => q - p);
      return { kind: "poly", terms: [top, ...lower].map((n) => [rng.intExcept(-6, 6), n] as const) };
    }
    case "linearInside":
    {
      const f = rng.pick(["sin", "cos", "exp"] as const);
      const a = f === "exp" ? rng.pick([2, 3, 4, 5, -1, -2, -3]) : rng.int(2, 5);
      const b = rng.pick([0, 0, 0, 1, -1, 2]);
      // Con a negativo l'argomento si scrive «b − |a|x»: il termine noto deve essere positivo (o mancare).
      return { kind: "linearInside", f, k: rng.pick([1, 1, 2, 3, 4, 6]), a, b: a < 0 ? Math.abs(b) : b };
    }
    case "powerOfLinear": {
      const a = rng.pick([2, 3, 4, 5, -1, -2, -3]);
      const b = rng.intExcept(-5, 5);
      return { kind: "powerOfLinear", a, b: a < 0 ? Math.abs(b) : b, n: rng.int(2, 5) };
    }
    case "reciprocalLinear":
      return { kind: "reciprocalLinear", k: rng.int(1, 6), a: rng.int(2, 5), b: rng.intExcept(-6, 6) };
  }
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["partsExp", "partsExp", "partsTrig", "partsTrig", "partsLog", "xExpSquare", "xOverSquare", "trigPower", "logPower", "xPowerInside", "arctan"] as const);
  switch (shape) {
    case "partsExp":
      return { kind: "partsExp", a: rng.int(1, 3), b: rng.int(-3, 3), k: rng.pick([1, -1, 2, -2, 3]) };
    case "partsTrig":
      return { kind: "partsTrig", f: rng.pick(["sin", "cos"] as const), a: rng.int(1, 3), b: rng.int(-3, 3), k: rng.int(1, 3) };
    case "partsLog":
      return { kind: "partsLog", k: rng.int(1, 4), n: rng.int(0, 3) };
    case "xExpSquare":
      return { kind: "xExpSquare", k: rng.intExcept(-4, 6), a: rng.pick([1, -1, 2, -2, 3]) };
    case "xOverSquare":
      return { kind: "xOverSquare", k: rng.intExcept(-5, 6), s: rng.int(1, 3) };
    case "trigPower":
      return { kind: "trigPower", f: rng.pick(["sin", "cos"] as const), k: rng.int(1, 4), n: rng.int(2, 4) };
    case "logPower":
      return { kind: "logPower", k: rng.int(1, 4), n: rng.int(1, 3) };
    case "xPowerInside":
      return { kind: "xPowerInside", k: rng.int(1, 4), a: rng.intExcept(-5, 5), n: rng.int(2, 4) };
    case "arctan":
      return { kind: "arctan", k: rng.int(1, 6), s: rng.int(2, 5) };
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["partialFractions", "partialFractions", "partialFractions", "improperRational", "improperRational", "logPlusArctan", "logPlusArctan", "partsTwice", "cyclic", "partsArctan", "xCubeExp"] as const);
  switch (shape) {
    case "partialFractions": {
      const [r1, r2] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 2).sort((p, q) => p - q) as [number, number];
      const A = rng.intExcept(-4, 4);
      return { kind: "partialFractions", A, B: rng.intExcept(-4, 4, [0, A]), r1, r2 };
    }
    case "improperRational":
      return { kind: "improperRational", r: rng.intExcept(-4, 4), m: rng.int(-4, 4), R: rng.intExcept(-6, 6) };
    case "logPlusArctan":
      return { kind: "logPlusArctan", a: rng.intExcept(-4, 4), b: rng.intExcept(-6, 6), s: rng.int(2, 4) };
    case "partsTwice":
      return { kind: "partsTwice", a: rng.int(1, 3), k: rng.pick([1, -1, 2, -2, 3, -3]) };
    case "cyclic":
      return { kind: "cyclic", f: rng.pick(["sin", "cos"] as const), a: rng.pick([1, -1, 2, -2, 3]), b: rng.int(1, 4) };
    case "partsArctan":
      return { kind: "partsArctan", k: rng.int(1, 3), s: rng.int(1, 4) };
    case "xCubeExp":
      return { kind: "xCubeExp", k: rng.int(1, 4), a: rng.pick([1, -1, 2, -2, 3]) };
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

/**
 * Tiene le primitive sbagliate che hanno una derivata diversa dall'integranda e diversa tra loro
 * (due primitive con la stessa derivata sono la stessa risposta, a meno della costante).
 */
function distinctPrimitives(integrand: Expr, candidates: readonly WrongCandidate<Expr>[]): ExpectedWrong<Expr>[] {
  const same = (a: Expr, b: Expr): boolean => {
    const result = compare(a, b);
    return result.equivalent || result.method === "undecided";
  };
  const kept: { readonly candidate: ExpectedWrong<Expr>; readonly derivative: Expr }[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const derivative = derive(candidate.value);
    if (same(derivative, integrand) || kept.some((other) => same(other.derivative, derivative))) continue;
    kept.push({ candidate, derivative });
  }
  return kept.map(({ candidate }) => candidate);
}

const FIRST_HINT =
  "Guarda com'è fatta la funzione integranda, perché da questo dipende la tecnica: una somma di potenze? Una funzione elementare di $ax + b$? Un prodotto di due funzioni di tipo diverso (parti)? Una funzione composta con accanto la derivata di quella interna (sostituzione)? Una funzione razionale (divisione, fratti semplici, arcotangente)?";

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const withConstant = (primitive: Expr): Expr => sum(primitive, C);
  const wrongAnswers = distinctPrimitives(plan.integrand, plan.wrong)
    .slice(0, 3)
    .map(({ error, value }) => ({ error, value: withConstant(value) }));
  return {
    prompt: `Calcola l'integrale indefinito:\n\n$$${integralLatex(plan.integrand)}$$`,
    answer: {
      kind: "expression",
      correct: withConstant(plan.primitive),
      // L'ultima opzione sbagliata è la primitiva giusta senza la costante arbitraria.
      wrong: [...wrongAnswers, { error: "AN.COSTANTE_INTEGRAZIONE", value: plan.primitive }],
      check: {
        kind: "antiderivative",
        integrand: plan.integrand,
        variable: "x",
        missingConstant: "AN.COSTANTE_INTEGRAZIONE",
        ...(plan.logarithm ? { smallerDomain: "COND.LOGARITMO" as const } : {}),
      },
    },
    steps: plan.steps.map((text) => ({ text })),
    hints: [FIRST_HINT, plan.hint],
  };
}

/** Il rapporto incrementale (differenza centrale) della primitiva in un punto. */
function slope(primitive: Expr, at: number): number {
  const h = 1e-5;
  return (evaluate(primitive, { x: at + h, c: 0.7 }) - evaluate(primitive, { x: at - h, c: 0.7 })) / (2 * h);
}

export default defineGenerator({
  code: "V2.M09.A01.g1",
  skill: "V2.M09.A01",
  lesson: "V2.M09.L07",
  title: "Integrali indefiniti: sostituzione, parti, funzioni razionali",
  levels: [1, 2, 3],
  errors: [
    "AN.PRIMITIVA_ELEMENTARE",
    "AN.SOSTITUZIONE_FATTORE",
    "AN.INTEGRAZIONE_PARTI",
    "AN.INTEGRALE_PRODOTTO",
    "AN.FRATTI_SEMPLICI",
    "AN.COSTANTE_INTEGRAZIONE",
    "COND.LOGARITMO",
    "ALG.SEGNI_FATTORI",
    "CALC.MENO_PARENTESI",
  ],
  limits: LIMITS,
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression" || answer.check?.kind !== "antiderivative") return false;
    const seeded = (): Rng => Rng.forExercise(exercise.generator, exercise.level, exercise.seed);
    const { integrand } = planOf(buildModel(exercise.level, seeded()));
    // L'integranda del testo, quella del controllo e quella del modello sono la stessa.
    if (exprKey(answer.check.integrand) !== exprKey(integrand) || !exercise.prompt.includes(integralLatex(integrand))) return false;
    // Prima strada: la derivata simbolica del motore (la primitiva è costruita con le formule delle tecniche).
    if (!isAntiderivative(answer.correct, integrand)) return false;
    // Seconda strada: il rapporto incrementale della primitiva nei punti di prova.
    const points = seeded().fork("verifica");
    let checked = 0;
    for (let attempt = 0; attempt < 80 && checked < 6; attempt++) {
      const at = points.real(0.2, 3) * (attempt % 3 === 0 ? -1 : 1);
      const expected = evaluate(integrand, { x: at });
      const actual = slope(answer.correct, at);
      if (!Number.isFinite(expected) || !Number.isFinite(actual)) continue;
      // Vicino a un polo il rapporto incrementale non è affidabile: lì l'integranda cambia troppo in fretta.
      const jump = Math.abs(evaluate(integrand, { x: at + 1e-5 }) - evaluate(integrand, { x: at - 1e-5 }));
      if (!(jump <= 1e-3 * (1 + Math.abs(expected)))) continue;
      if (Math.abs(expected - actual) > 1e-4 * (1 + Math.abs(expected))) return false;
      checked += 1;
    }
    return checked >= 4;
  },
});
