// V2.M10.A01.g1 — Convergenza di integrali impropri: scegli il verdetto con la giustificazione giusta.
//
// È una scelta multipla: ogni opzione dice «converge» o «diverge» e perché. L'opzione giusta usa il
// criterio giusto (integrale di riferimento, confronto asintotico, confronto, sostituzione); le
// sbagliate sono i criteri usati male, ognuna con il suo errore tipico:
// - AN.TERMINE_GENERALE: «la funzione tende a 0, quindi converge»;
// - AN.SOGLIA_CONVERGENZA: soglia del riferimento scambiata (p > 1 all'infinito, p < 1 vicino a 0);
// - AN.CONFRONTO_VERSO: confronto con una disuguaglianza vera ma nel verso che non dice niente;
// - AN.IMPROPRIO_SINGOLARITA: funzione illimitata trattata come in un integrale ordinario, o un solo
//   estremo controllato;
// - AN.CONFRONTO_INFINITI: potenza contro esponenziale confusi.
//
// Costruzione all'indietro: si sceglie il comportamento della funzione negli estremi critici
// (esponente p, coefficiente), poi la funzione che lo ha. La verifica indipendente controlla
// numericamente quel comportamento sulla funzione del testo e ricava da lì il verdetto.
//
// Livello 1: integrali di riferimento k/xᵖ, all'infinito o vicino a 0.
// Livello 2: confronto asintotico con funzioni razionali, radici, eˣ, sin x, cos x; confronto con
//            funzioni limitate (k + sin x)/xᵖ.
// Livello 3: due estremi critici, singolarità interna, logaritmi, esponenziale contro potenza.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { compareWithOne, exponentLatex, pAgainstOne, powerLatex, value, type Exponent } from "../../comuni/convergence";

type Rng_ = GeneratorContext["rng"];

const TERMINE = "AN.TERMINE_GENERALE";
const SOGLIA = "AN.SOGLIA_CONVERGENZA";
const VERSO = "AN.CONFRONTO_VERSO";
const SINGOLARITA = "AN.IMPROPRIO_SINGOLARITA";
const INFINITI = "AN.CONFRONTO_INFINITI";

/** Gli esponenti dei riferimenti: 2, 3, 1/2, 1, 3/2, 1/3, 2/3, 4/3. */
const EXPONENTS: readonly Exponent[] = [
  [2, 1],
  [3, 1],
  [1, 2],
  [1, 1],
  [3, 2],
  [1, 3],
  [2, 3],
  [4, 3],
];

// ───────────────────────────── comportamento negli estremi (per la verifica) ─────────────────────────────

/** Come si comporta la funzione in un estremo critico: è ciò che la verifica controlla numericamente. */
type End =
  /** f(x)·xᵖ → c per x → +∞. */
  | { readonly kind: "infinity"; readonly p: Exponent; readonly c: number }
  /** f(x)·(x − at)ᵖ → c per x → at⁺ (side 1) o f(x)·(at − x)ᵖ → c per x → at⁻ (side −1). */
  | { readonly kind: "point"; readonly at: number; readonly side: 1 | -1; readonly p: Exponent; readonly c: number }
  /** lo/xᵖ ≤ f(x) ≤ hi/xᵖ per x ≥ from. */
  | { readonly kind: "between"; readonly from: number; readonly p: Exponent; readonly lo: number; readonly hi: number }
  /** f(x)·x·(ln x)^q → c per x → +∞. */
  | { readonly kind: "log"; readonly q: Exponent; readonly c: number }
  /** x²·f(x) → 0 per x → +∞ (l'esponenziale vince sulla potenza). */
  | { readonly kind: "decay" }
  /** f(x) → +∞ per x → +∞. */
  | { readonly kind: "growth" };

/** Il verdetto che dà un estremo, secondo i criteri. */
function endConverges(end: End): boolean {
  switch (end.kind) {
    case "infinity":
    case "between":
      return value(end.p) > 1;
    case "point":
      return value(end.p) < 1;
    case "log":
      return value(end.q) > 1;
    case "decay":
      return true;
    case "growth":
      return false;
  }
}

// ───────────────────────────── il modello ─────────────────────────────

type Model =
  | { readonly kind: "refInfinity"; readonly k: number; readonly p: Exponent; readonly from: number }
  | { readonly kind: "refZero"; readonly k: number; readonly p: Exponent; readonly to: number }
  | { readonly kind: "rationalInfinity"; readonly a: number; readonly m: Exponent; readonly n: number; readonly d: number; readonly b: number }
  | { readonly kind: "rootInfinity"; readonly a: number; readonly n: number; readonly d: number }
  | { readonly kind: "productZero"; readonly a: number; readonly p: Exponent; readonly d: number }
  | { readonly kind: "elementaryZero"; readonly f: "exp" | "cos" | "sin"; readonly p: Exponent }
  | { readonly kind: "bounded"; readonly f: "sin" | "cos"; readonly k: number; readonly p: Exponent }
  | { readonly kind: "twoEnds"; readonly a: Exponent; readonly b: Exponent; readonly k: number }
  | { readonly kind: "interior"; readonly k: number; readonly c: number; readonly left: number; readonly right: number; readonly cube: boolean }
  | { readonly kind: "logarithm"; readonly k: number; readonly q: Exponent }
  | { readonly kind: "exponential"; readonly n: number; readonly s: number; readonly grows: boolean };

interface Plan {
  /** L'integrale in LaTeX. */
  readonly integral: string;
  /** La funzione integranda, per la verifica numerica. */
  readonly f: (x: number) => number;
  /** Gli estremi critici. */
  readonly ends: readonly End[];
  readonly converges: boolean;
  /** L'opzione giusta (senza il verdetto, che si aggiunge davanti). */
  readonly reason: string;
  /** Le opzioni sbagliate, complete di verdetto. */
  readonly wrong: readonly ExpectedWrong<string>[];
  readonly steps: readonly string[];
  readonly hint: string;
}

const verdict = (converges: boolean): string => (converges ? "**Converge**" : "**Diverge**");
const option = (converges: boolean, reason: string): string => `${verdict(converges)}: ${reason}`;
const wrong = (error: ErrorCode, converges: boolean, reason: string): ExpectedWrong<string> => ({ error, value: option(converges, reason) });

const coefficientLatex = (k: number): string => (k === 1 ? "" : String(k));
/** k/xᵖ in LaTeX. */
const overPower = (k: number, base: string, p: Exponent, wrapped = base): string => `\\frac{${k}}{${powerLatex(base, p, wrapped)}}`;

/** Il riferimento all'infinito: soglia e frase sul confronto nel verso inutile. */
function infinityWrongs(p: Exponent, fLatex: string, converges: boolean, from: number): ExpectedWrong<string>[] {
  const P = exponentLatex(p);
  const out = [
    // Soglia scambiata: «all'infinito converge per p < 1».
    wrong(SOGLIA, value(p) < 1, String.raw`l'integrale di riferimento $\int_{${from}}^{+\infty} \frac{dx}{x^{p}}$ converge solo per $p < 1$, e qui $p = ${P}$.`),
    // f → 0 preso come prova.
    wrong(TERMINE, true, String.raw`la funzione tende a $0$ per $x \to +\infty$, quindi l'area sotto il grafico è finita.`),
  ];
  // Confronto nel verso che non dice niente (le disuguaglianze valgono per x abbastanza grande).
  out.push(
    converges
      ? wrong(VERSO, false, String.raw`per $x$ abbastanza grande vale $${fLatex} \le \frac{1}{x}$, e $\int_{${from}}^{+\infty} \frac{dx}{x}$ diverge.`)
      : wrong(VERSO, true, String.raw`per $x$ abbastanza grande vale $${fLatex} \ge \frac{1}{x^{2}}$, e $\int_{${from}}^{+\infty} \frac{dx}{x^{2}}$ converge.`),
  );
  return out;
}

/** Il riferimento vicino a 0 (singolarità in x = 0 da destra). */
function zeroWrongs(p: Exponent, fLatex: string, converges: boolean, to: number): ExpectedWrong<string>[] {
  const P = exponentLatex(p);
  return [
    wrong(SOGLIA, value(p) > 1, String.raw`vicino a $0$ si confronta con $\frac{1}{x^{p}}$, e $\int_{0}^{${to}} \frac{dx}{x^{p}}$ converge solo per $p > 1$; qui $p = ${P}$.`),
    // L'intervallo è limitato: integrale trattato come ordinario.
    wrong(SINGOLARITA, true, String.raw`l'intervallo $[0, ${to}]$ è limitato, quindi l'integrale è un numero finito.`),
    converges
      ? wrong(VERSO, false, String.raw`vicino a $0$ vale $${fLatex} \le \frac{1}{x}$, e $\int_{0}^{${to}} \frac{dx}{x}$ diverge.`)
      : wrong(VERSO, true, String.raw`vicino a $0$ vale $${fLatex} \ge \frac{1}{\sqrt{x}}$, e $\int_{0}^{${to}} \frac{dx}{\sqrt{x}}$ converge.`),
  ];
}

function planOf(model: Model): Plan {
  switch (model.kind) {
    case "refInfinity": {
      const { k, p, from } = model;
      const fLatex = overPower(k, "x", p);
      const converges = value(p) > 1;
      return {
        integral: String.raw`\int_{${from}}^{+\infty} ${fLatex}\,dx`,
        f: (x) => k / x ** value(p),
        ends: [{ kind: "infinity", p, c: k }],
        converges,
        reason: String.raw`è ${k === 1 ? "" : `$${k}$ volte `}l'integrale di riferimento $\int_{${from}}^{+\infty} \frac{dx}{x^{p}}$ con $${pAgainstOne(p)}$, che converge se e solo se $p > 1$.`,
        wrong: infinityWrongs(p, fLatex, converges, from),
        steps: [
          String.raw`L'intervallo è illimitato e la funzione è continua su $[${from}, +\infty)$: l'unico estremo critico è $+\infty$.`,
          String.raw`La funzione è ${k === 1 ? "" : `$${k}$ volte `}$\frac{1}{x^{p}}$ con $p = ${exponentLatex(p)}$. L'integrale di riferimento $\int_{${from}}^{+\infty} \frac{dx}{x^{p}}$ converge se e solo se $p > 1$ (per $p \ne 1$ una primitiva è $\frac{x^{1-p}}{1-p}$, che ha limite finito per $x \to +\infty$ solo se $1 - p < 0$; per $p = 1$ è $\ln x$, che diverge).`,
          `Qui $${pAgainstOne(p)}$: l'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Ricorda l'integrale di riferimento: $\int_{a}^{+\infty} \frac{dx}{x^{p}}$ (con $a > 0$) converge se e solo se $p > 1$.`,
      };
    }

    case "refZero": {
      const { k, p, to } = model;
      const fLatex = overPower(k, "x", p);
      const converges = value(p) < 1;
      return {
        integral: String.raw`\int_{0}^{${to}} ${fLatex}\,dx`,
        f: (x) => k / x ** value(p),
        ends: [{ kind: "point", at: 0, side: 1, p, c: k }],
        converges,
        reason: String.raw`la funzione è illimitata vicino a $0$, ed è ${k === 1 ? "" : `$${k}$ volte `}l'integrale di riferimento $\int_{0}^{${to}} \frac{dx}{x^{p}}$ con $${pAgainstOne(p)}$, che converge se e solo se $p < 1$.`,
        wrong: zeroWrongs(p, fLatex, converges, to),
        steps: [
          String.raw`L'intervallo è limitato, ma la funzione non è definita in $0$ e tende a $+\infty$ per $x \to 0^{+}$: l'integrale è improprio in $0$.`,
          String.raw`Vicino a $0$ la soglia è rovesciata rispetto all'infinito: $\int_{0}^{${to}} \frac{dx}{x^{p}}$ converge se e solo se $p < 1$ (per $p \ne 1$ una primitiva è $\frac{x^{1-p}}{1-p}$, che ha limite finito per $x \to 0^{+}$ solo se $1 - p > 0$).`,
          `Qui $${pAgainstOne(p)}$: l'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Vicino a $0$ la soglia si rovescia: $\int_{0}^{1} \frac{dx}{x^{p}}$ converge se e solo se $p < 1$.`,
      };
    }

    case "rationalInfinity": {
      // f = (a·x^m + b)/(xⁿ + d), con m = 0, 1/2, 1, 2: f ~ a/x^{n−m}.
      const { a, m, n, d, b } = model;
      const top = (m[0] === 0 ? String(a) : `${coefficientLatex(a)}${powerLatex("x", m)}`) + (b === 0 || m[0] === 0 ? "" : ` + ${b}`);
      const fLatex = String.raw`\frac{${top}}{${powerLatex("x", [n, 1])} + ${d}}`;
      const p: Exponent = m[1] === 1 ? [n - m[0], 1] : [2 * n - m[0], 2];
      const converges = value(p) > 1;
      const reference = String.raw`\frac{${a}}{${powerLatex("x", p)}}`;
      return {
        integral: String.raw`\int_{1}^{+\infty} ${fLatex}\,dx`,
        f: (x) => (a * x ** value(m) + (m[0] === 0 ? 0 : b)) / (x ** n + d),
        ends: [{ kind: "infinity", p, c: a }],
        converges,
        reason: String.raw`per $x \to +\infty$ la funzione è asintotica a $${reference}$ (contano i termini di grado massimo), e $\int_{1}^{+\infty} \frac{dx}{x^{p}}$ con $${pAgainstOne(p)}$ ${converges ? "converge" : "diverge"}: per il confronto asintotico l'integrale ${converges ? "converge" : "diverge"}.`,
        wrong: infinityWrongs(p, fLatex, converges, 1),
        steps: [
          String.raw`La funzione è continua e positiva su $[1, +\infty)$: l'unico estremo critico è $+\infty$.`,
          String.raw`Per $x \to +\infty$ contano i termini di grado massimo: $${fLatex} \sim ${reference}$, cioè il rapporto tra le due funzioni tende a $1$.`,
          String.raw`Per il criterio del confronto asintotico (funzioni positive) i due integrali si comportano allo stesso modo. $\int_{1}^{+\infty} \frac{dx}{x^{p}}$ con $${pAgainstOne(p)}$ ${converges ? "converge" : "diverge"}, quindi anche l'integrale dato ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Per $x \to +\infty$ tieni solo i termini di grado massimo di numeratore e denominatore: la funzione si comporta come $\frac{c}{x^{p}}$.`,
      };
    }

    case "rootInfinity": {
      // f = a/√(xⁿ + d) ~ a/x^{n/2}.
      const { a, n, d } = model;
      const inside = `${powerLatex("x", [n, 1])} + ${d}`;
      const fLatex = String.raw`\frac{${a}}{\sqrt{${inside}}}`;
      const p: Exponent = n % 2 === 0 ? [n / 2, 1] : [n, 2];
      const converges = value(p) > 1;
      const reference = String.raw`\frac{${a}}{${powerLatex("x", p)}}`;
      return {
        integral: String.raw`\int_{1}^{+\infty} ${fLatex}\,dx`,
        f: (x) => a / Math.sqrt(x ** n + d),
        ends: [{ kind: "infinity", p, c: a }],
        converges,
        reason: String.raw`per $x \to +\infty$ è $\sqrt{${inside}} \sim ${powerLatex("x", p)}$, quindi la funzione è asintotica a $${reference}$ con $${pAgainstOne(p)}$: per il confronto asintotico l'integrale ${converges ? "converge" : "diverge"}.`,
        wrong: infinityWrongs(p, fLatex, converges, 1),
        steps: [
          String.raw`La funzione è continua e positiva su $[1, +\infty)$: l'unico estremo critico è $+\infty$.`,
          String.raw`Sotto la radice conta $${powerLatex("x", [n, 1])}$: $\sqrt{${inside}} \sim \sqrt{${powerLatex("x", [n, 1])}} = ${powerLatex("x", p)}$, quindi $${fLatex} \sim ${reference}$.`,
          String.raw`Per il confronto asintotico l'integrale si comporta come $\int_{1}^{+\infty} \frac{dx}{x^{p}}$ con $${pAgainstOne(p)}$: ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Sotto la radice, per $x \to +\infty$, conta solo la potenza più alta.`,
      };
    }

    case "productZero": {
      // f = a/(xᵖ·(x + d)) ~ (a/d)/xᵖ vicino a 0.
      const { a, p, d } = model;
      const fLatex = String.raw`\frac{${a}}{${powerLatex("x", p)}\left(x + ${d}\right)}`;
      const converges = value(p) < 1;
      const c = a / d;
      const g = gcd(a, d);
      const reference = String.raw`\frac{${a / g}}{${d / g === 1 ? "" : d / g}${powerLatex("x", p)}}`;
      return {
        integral: String.raw`\int_{0}^{1} ${fLatex}\,dx`,
        f: (x) => a / (x ** value(p) * (x + d)),
        ends: [{ kind: "point", at: 0, side: 1, p, c }],
        converges,
        reason: String.raw`vicino a $0$ il fattore $x + ${d}$ tende a $${d}$, quindi la funzione è asintotica a $${reference}$ con $${pAgainstOne(p)}$: per il confronto asintotico l'integrale ${converges ? "converge" : "diverge"}.`,
        wrong: zeroWrongs(p, fLatex, converges, 1),
        steps: [
          String.raw`La funzione è illimitata per $x \to 0^{+}$: l'integrale è improprio in $0$ (in $1$ non ci sono problemi).`,
          String.raw`Per $x \to 0^{+}$ il fattore $x + ${d}$ tende a $${d}$: $${fLatex} \sim ${reference}$.`,
          String.raw`Vicino a $0$, $\int_{0}^{1} \frac{dx}{x^{p}}$ converge se e solo se $p < 1$. Qui $${pAgainstOne(p)}$: per il confronto asintotico l'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Per $x \to 0^{+}$ sostituisci ai fattori che non si annullano il loro valore in $0$: resta una potenza di $x$.`,
      };
    }

    case "elementaryZero": {
      // eˣ/xᵖ e cos x/xᵖ ~ 1/xᵖ; sin x/xᵖ ~ 1/x^{p−1}.
      const { f, p } = model;
      const fLatex = String.raw`\frac{${f === "exp" ? "e^{x}" : f === "cos" ? "\\cos x" : "\\sin x"}}{${powerLatex("x", p)}}`;
      const local: Exponent = f === "sin" ? [p[0] - p[1], p[1]] : p;
      const converges = value(local) < 1;
      const why = f === "exp" ? String.raw`$e^{x} \to 1$` : f === "cos" ? String.raw`$\cos x \to 1$` : String.raw`$\sin x \sim x$`;
      const reference = String.raw`\frac{1}{${powerLatex("x", local)}}`;
      const g = f === "exp" ? Math.exp : f === "cos" ? Math.cos : Math.sin;
      return {
        integral: String.raw`\int_{0}^{1} ${fLatex}\,dx`,
        f: (x) => g(x) / x ** value(p),
        ends: [{ kind: "point", at: 0, side: 1, p: local, c: 1 }],
        converges,
        reason: String.raw`per $x \to 0^{+}$ è ${why}, quindi la funzione è asintotica a $${reference}$ con $${pAgainstOne(local)}$: per il confronto asintotico l'integrale ${converges ? "converge" : "diverge"}.`,
        wrong: zeroWrongs(local, fLatex, converges, 1),
        steps: [
          String.raw`La funzione è illimitata per $x \to 0^{+}$: l'integrale è improprio in $0$.`,
          String.raw`Per $x \to 0^{+}$ è ${why}: $${fLatex} \sim ${reference}$${f === "sin" ? " (il seno abbassa di uno l'esponente del denominatore)" : ""}.`,
          String.raw`Vicino a $0$, $\int_{0}^{1} \frac{dx}{x^{p}}$ converge se e solo se $p < 1$. Qui $${pAgainstOne(local)}$: l'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: f === "sin" ? String.raw`Usa il limite notevole: per $x \to 0$ è $\sin x \sim x$.` : String.raw`Per $x \to 0^{+}$ il numeratore tende a $1$: conta solo il denominatore.`,
      };
    }

    case "bounded": {
      // (k + sin x)/xᵖ tra (k − 1)/xᵖ e (k + 1)/xᵖ.
      const { f, k, p } = model;
      const trig = f === "sin" ? "\\sin" : "\\cos";
      const fLatex = String.raw`\frac{${k} + ${trig} x}{${powerLatex("x", p)}}`;
      const converges = value(p) > 1;
      const g = f === "sin" ? Math.sin : Math.cos;
      const bound = converges ? `\\frac{${k + 1}}{${powerLatex("x", p)}}` : `\\frac{${k - 1 === 1 ? 1 : k - 1}}{${powerLatex("x", p)}}`;
      const reason = converges
        ? String.raw`per $x \ge 1$ vale $0 \le ${fLatex} \le ${bound}$, perché $${trig} x \le 1$, e $\int_{1}^{+\infty} ${bound}\,dx$ converge ($${pAgainstOne(p)}$): per il confronto l'integrale converge.`
        : String.raw`per $x \ge 1$ vale $${fLatex} \ge ${bound}$, perché $${trig} x \ge -1$, e $\int_{1}^{+\infty} ${bound}\,dx$ diverge ($${pAgainstOne(p)}$): per il confronto l'integrale diverge.`;
      return {
        integral: String.raw`\int_{1}^{+\infty} ${fLatex}\,dx`,
        f: (x) => (k + g(x)) / x ** value(p),
        ends: [{ kind: "between", from: 1, p, lo: k - 1, hi: k + 1 }],
        converges,
        reason,
        wrong: [
          ...infinityWrongs(p, fLatex, converges, 1).filter((candidate) => candidate.error !== VERSO),
          // Confronto nel verso inutile, con la stima vera dall'altra parte.
          converges
            ? wrong(VERSO, false, String.raw`per $x \ge 1$ vale $${fLatex} \le \frac{${k + 1}}{x}$, e $\int_{1}^{+\infty} \frac{${k + 1}}{x}\,dx$ diverge.`)
            : wrong(VERSO, true, String.raw`per $x \ge 1$ vale $${fLatex} \ge \frac{${k - 1}}{x^{2}}$, e $\int_{1}^{+\infty} \frac{${k - 1}}{x^{2}}\,dx$ converge.`),
        ],
        steps: [
          String.raw`La funzione non ha un limite semplice da usare nel confronto asintotico (il ${f === "sin" ? "seno" : "coseno"} oscilla), ma è limitata tra due multipli di $\frac{1}{x^{p}}$: si usa il confronto.`,
          String.raw`Poiché $-1 \le ${trig} x \le 1$: $\frac{${k - 1}}{${powerLatex("x", p)}} \le ${fLatex} \le \frac{${k + 1}}{${powerLatex("x", p)}}$ per $x \ge 1$.`,
          converges
            ? String.raw`La stima dall'alto basta: $\int_{1}^{+\infty} \frac{${k + 1}}{${powerLatex("x", p)}}\,dx$ converge perché $${pAgainstOne(p)}$, e una funzione positiva più piccola di una con integrale finito ha integrale finito. L'integrale converge.`
            : String.raw`Serve la stima dal basso: $\int_{1}^{+\infty} \frac{${k - 1}}{${powerLatex("x", p)}}\,dx$ diverge perché $${pAgainstOne(p)}$, e una funzione più grande di una con integrale infinito ha integrale infinito. L'integrale diverge.`,
        ],
        hint: String.raw`Usa $-1 \le ${trig} x \le 1$ per stringere la funzione tra due multipli di $\frac{1}{x^{p}}$; poi scegli la stima che serve.`,
      };
    }

    case "twoEnds": {
      // k/(x^a·(1 + x^b)): vicino a 0 ~ k/x^a, all'infinito ~ k/x^{a+b}.
      const { a, b, k } = model;
      const fLatex = String.raw`\frac{${k}}{${powerLatex("x", a)}\left(1 + ${powerLatex("x", b)}\right)}`;
      const atInfinity: Exponent = a[1] === b[1] ? [a[0] + b[0], a[1]] : [a[0] * b[1] + b[0] * a[1], a[1] * b[1]];
      const reduced: Exponent = Number.isInteger(value(atInfinity)) ? [value(atInfinity), 1] : atInfinity;
      const zeroOk = value(a) < 1;
      const infinityOk = value(reduced) > 1;
      const converges = zeroOk && infinityOk;
      const near0 = String.raw`vicino a $0$ la funzione è asintotica a $\frac{${k}}{${powerLatex("x", a)}}$ con $${pAgainstOne(a)}$`;
      const nearInf = String.raw`all'infinito è asintotica a $\frac{${k}}{${powerLatex("x", reduced)}}$ con $${pAgainstOne(reduced)}$`;
      const reason = converges
        ? `${near0}, quindi converge vicino a $0$; ${nearInf}, quindi converge anche all'infinito.`
        : !zeroOk
          ? `${near0}, quindi il pezzo vicino a $0$ diverge (e basta un pezzo divergente).`
          : `${nearInf}, quindi il pezzo all'infinito diverge (e basta un pezzo divergente).`;
      const out: ExpectedWrong<string>[] = [];
      if (!converges) {
        // Un solo estremo controllato: quello buono.
        out.push(zeroOk ? wrong(SINGOLARITA, true, `${near0}, quindi l'integrale converge.`) : wrong(SINGOLARITA, true, `${nearInf}, quindi l'integrale converge.`));
      } else {
        out.push(wrong(SINGOLARITA, false, String.raw`la funzione è illimitata vicino a $0$, quindi l'integrale non può essere finito.`));
      }
      out.push(
        wrong(SOGLIA, value(a) > 1 && value(reduced) > 1, String.raw`vicino a $0$ e all'infinito la soglia è la stessa, $p > 1$: vicino a $0$ è $p = ${exponentLatex(a)}$, all'infinito $p = ${exponentLatex(reduced)}$.`),
        wrong(TERMINE, true, String.raw`la funzione tende a $0$ per $x \to +\infty$, quindi l'area sotto il grafico è finita.`),
      );
      return {
        integral: String.raw`\int_{0}^{+\infty} ${fLatex}\,dx`,
        f: (x) => k / (x ** value(a) * (1 + x ** value(b))),
        ends: [
          { kind: "point", at: 0, side: 1, p: a, c: k },
          { kind: "infinity", p: reduced, c: k },
        ],
        converges,
        reason,
        wrong: out,
        steps: [
          String.raw`Gli estremi critici sono due: $0$, dove la funzione è illimitata, e $+\infty$. Si spezza l'integrale, per esempio in $1$: $\int_{0}^{1} + \int_{1}^{+\infty}$. L'integrale converge solo se convergono entrambi i pezzi.`,
          String.raw`Vicino a $0$: $1 + ${powerLatex("x", b)} \to 1$, quindi $${fLatex} \sim \frac{${k}}{${powerLatex("x", a)}}$ con $${pAgainstOne(a)}$: il primo pezzo ${zeroOk ? "converge" : "diverge"} (vicino a $0$ serve $p < 1$).`,
          String.raw`All'infinito: $${powerLatex("x", a)}\left(1 + ${powerLatex("x", b)}\right) \sim ${powerLatex("x", reduced)}$, quindi la funzione è asintotica a $\frac{${k}}{${powerLatex("x", reduced)}}$ con $${pAgainstOne(reduced)}$: il secondo pezzo ${infinityOk ? "converge" : "diverge"} (all'infinito serve $p > 1$).`,
          `L'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Gli estremi critici sono due: spezza l'integrale e studia separatamente il comportamento vicino a $0$ e all'infinito.`,
      };
    }

    case "interior": {
      // k/(x − c)² (diverge) oppure k/∛((x − c)²) (converge), su [c − left, c + right].
      const { k, c, left, right, cube } = model;
      const base = c === 0 ? "x" : `x ${c > 0 ? "-" : "+"} ${Math.abs(c)}`;
      const wrapped = c === 0 ? "x" : `\\left(${base}\\right)`;
      const p: Exponent = cube ? [2, 3] : [2, 1];
      const fLatex = overPower(k, base, p, wrapped);
      const [from, to] = [c - left, c + right];
      const converges = cube;
      // F(b) − F(a) con la primitiva applicata senza guardare: −k/(x − c) oppure 3k·∛(x − c).
      const naive = cube ? 3 * k * (Math.cbrt(right) + Math.cbrt(left)) : -k / right - k / left;
      const naiveLatex = cube ? String(naive) : `-${fracLatex(k * (left + right), left * right)}`;
      return {
        integral: String.raw`\int_{${from}}^{${to}} ${fLatex}\,dx`,
        f: (x) => k / Math.abs(x - c) ** value(p),
        ends: [
          { kind: "point", at: c, side: -1, p, c: k },
          { kind: "point", at: c, side: 1, p, c: k },
        ],
        converges,
        reason: String.raw`la funzione è illimitata in $x = ${c}$, interno all'intervallo: si spezza lì, e da entrambe le parti è come $\frac{1}{|${base}|^{p}}$ con $${pAgainstOne(p)}$, quindi ${converges ? "entrambi i pezzi convergono" : "i pezzi divergono"}.`,
        wrong: [
          // Se diverge: la formula applicata senza spezzare. Se converge (lì la formula darebbe il valore
          // giusto, perché la primitiva è continua): «illimitata, quindi l'area è infinita».
          converges
            ? wrong(SINGOLARITA, false, String.raw`la funzione è illimitata vicino a $${c}$, quindi l'area sotto il grafico non può essere finita.`)
            : wrong(SINGOLARITA, true, String.raw`con il teorema fondamentale del calcolo, $F(${to}) - F(${from}) = ${naiveLatex}$.`),
          wrong(SOGLIA, value(p) > 1, String.raw`vicino a un punto la soglia è $p > 1$, come all'infinito, e qui $p = ${exponentLatex(p)}$.`),
          converges
            ? wrong(VERSO, false, String.raw`vicino a $${c}$ vale $${fLatex} \le \frac{${k}}{|${base}|}$, e l'integrale di $\frac{1}{|${base}|}$ diverge.`)
            : wrong(VERSO, true, String.raw`vicino a $${c}$ vale $${fLatex} \ge \frac{1}{\sqrt{|${base}|}}$, e l'integrale di $\frac{1}{\sqrt{|${base}|}}$ converge.`),
        ],
        steps: [
          String.raw`Attenzione: la funzione non è definita in $x = ${c}$, che sta dentro $[${from}, ${to}]$, e lì tende a $+\infty$. Il teorema fondamentale del calcolo non si può applicare a tutto l'intervallo: l'integrale è improprio e si spezza in $${c}$.`,
          String.raw`Da entrambe le parti la funzione è $\frac{${k}}{|${base}|^{p}}$ con $p = ${exponentLatex(p)}$, e vicino a un punto l'integrale di riferimento converge se e solo se $p < 1$.`,
          converges
            ? String.raw`Qui $${pAgainstOne(p)}$: i due pezzi convergono, e l'integrale converge.`
            : String.raw`Qui $${pAgainstOne(p)}$: i due pezzi divergono, e l'integrale diverge (il numero che dà la formula senza spezzare non ha senso${naive < 0 ? ": è perfino negativo, per una funzione positiva" : ""}).`,
        ],
        hint: String.raw`Controlla dove la funzione non è definita: se un punto di $[${from}, ${to}]$ annulla il denominatore, l'integrale è improprio e va spezzato lì.`,
      };
    }

    case "logarithm": {
      // k/(x·lnᵠx) su [2, +∞): con t = ln x diventa k∫dt/tᵠ.
      const { k, q } = model;
      const denominator = q[0] === q[1] ? "x \\ln x" : q[1] === 1 ? `x \\ln^{${q[0]}} x` : `x ${powerLatex("\\ln x", q)}`;
      const fLatex = `\\frac{${k}}{${denominator}}`;
      const converges = value(q) > 1;
      return {
        integral: String.raw`\int_{2}^{+\infty} ${fLatex}\,dx`,
        f: (x) => k / (x * Math.log(x) ** value(q)),
        ends: [{ kind: "log", q, c: k }],
        converges,
        reason: String.raw`con la sostituzione $t = \ln x$ (quindi $dt = \frac{dx}{x}$) diventa $${coefficientLatex(k)}\int_{\ln 2}^{+\infty} \frac{dt}{${powerLatex("t", q)}}$, un integrale di riferimento con $${pAgainstOne(q)}$.`,
        wrong: [
          wrong(TERMINE, true, String.raw`la funzione tende a $0$ per $x \to +\infty$, quindi l'area sotto il grafico è finita.`),
          wrong(SOGLIA, value(q) < 1, String.raw`con $t = \ln x$ diventa un integrale di riferimento all'infinito, che converge solo per esponente minore di $1$; qui è $${exponentLatex(q)}$.`),
          converges
            ? wrong(VERSO, false, String.raw`per $x \ge 3$ vale $${fLatex} \le \frac{${k}}{x}$, e $\int_{2}^{+\infty} \frac{dx}{x}$ diverge.`)
            : wrong(VERSO, true, String.raw`per $x$ abbastanza grande vale $${fLatex} \ge \frac{1}{x^{2}}$, e $\int_{2}^{+\infty} \frac{dx}{x^{2}}$ converge.`),
        ],
        steps: [
          String.raw`La funzione è continua e positiva su $[2, +\infty)$; il confronto con le potenze di $x$ non decide, perché il logaritmo cresce più lentamente di ogni potenza.`,
          String.raw`Con $t = \ln x$ è $dt = \frac{dx}{x}$, e gli estremi diventano $\ln 2$ e $+\infty$: $\int_{2}^{+\infty} ${fLatex}\,dx = ${coefficientLatex(k)}\int_{\ln 2}^{+\infty} \frac{dt}{${powerLatex("t", q)}}$.`,
          String.raw`È un integrale di riferimento all'infinito, che converge se e solo se l'esponente supera $1$. Qui $${pAgainstOne(q, "q")}$: l'integrale ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Il fattore $\frac{1}{x}$ è la derivata di $\ln x$: prova la sostituzione $t = \ln x$.`,
      };
    }

    case "exponential": {
      const { n, s, grows } = model;
      if (!grows) {
        // xⁿ·e^{−sx} su [0, +∞): converge.
        const fLatex = String.raw`${powerLatex("x", [n, 1])}e^{-${s === 1 ? "" : s}x}`;
        return {
          integral: String.raw`\int_{0}^{+\infty} ${fLatex}\,dx`,
          f: (x) => x ** n * Math.exp(-s * x),
          ends: [{ kind: "decay" }],
          converges: true,
          reason: String.raw`l'esponenziale va a $0$ più in fretta di ogni potenza, quindi $x^{2} \cdot ${fLatex} \to 0$: per $x$ abbastanza grande la funzione è minore di $\frac{1}{x^{2}}$, e per il confronto l'integrale converge.`,
          wrong: [
            wrong(TERMINE, true, String.raw`la funzione tende a $0$ per $x \to +\infty$, quindi l'area sotto il grafico è finita.`),
            wrong(INFINITI, false, String.raw`il fattore $${powerLatex("x", [n, 1])}$ tende a $+\infty$ e prevale sull'esponenziale, quindi la funzione non tende a $0$.`),
            wrong(VERSO, false, String.raw`per $x \ge 1$ vale $${fLatex} \le ${powerLatex("x", [n, 1])}$, e $\int_{1}^{+\infty} ${powerLatex("x", [n, 1])}\,dx$ diverge.`),
          ],
          steps: [
            String.raw`La funzione è continua su $[0, +\infty)$: l'unico estremo critico è $+\infty$.`,
            String.raw`Per il confronto tra infiniti l'esponenziale prevale su ogni potenza: $\lim_{x \to +\infty} x^{2} \cdot ${fLatex} = \lim_{x \to +\infty} \frac{x^{${n + 2}}}{e^{${s === 1 ? "" : s}x}} = 0$.`,
            String.raw`Quindi per $x$ abbastanza grande $0 \le ${fLatex} \le \frac{1}{x^{2}}$, e $\int \frac{dx}{x^{2}}$ converge all'infinito: per il confronto l'integrale converge.`,
          ],
          hint: String.raw`Confronta la funzione con $\frac{1}{x^{2}}$: che cosa fa $x^{2}$ per la funzione quando $x \to +\infty$?`,
        };
      }
      // e^{sx}/xⁿ su [1, +∞): diverge.
      const fLatex = String.raw`\frac{e^{${s === 1 ? "" : s}x}}{${powerLatex("x", [n, 1])}}`;
      return {
        integral: String.raw`\int_{1}^{+\infty} ${fLatex}\,dx`,
        f: (x) => Math.exp(s * x) / x ** n,
        ends: [{ kind: "growth" }],
        converges: false,
        reason: String.raw`l'esponenziale prevale su ogni potenza, quindi la funzione tende a $+\infty$: per $x$ abbastanza grande vale $${fLatex} \ge 1$, e l'integrale di $1$ su una semiretta diverge.`,
        wrong: [
          wrong(INFINITI, true, String.raw`per $x \to +\infty$ prevale il denominatore $${powerLatex("x", [n, 1])}$, e $\int_{1}^{+\infty} \frac{dx}{${powerLatex("x", [n, 1])}}$ converge.`),
          wrong(VERSO, true, String.raw`per $x \ge 1$ vale $${fLatex} \ge \frac{1}{${powerLatex("x", [n, 1])}}$, perché $e^{${s === 1 ? "" : s}x} \ge 1$, e $\int_{1}^{+\infty} \frac{dx}{${powerLatex("x", [n, 1])}}$ converge.`),
          wrong(VERSO, false, String.raw`per $x \ge 1$ vale $${fLatex} \le e^{${s === 1 ? "" : s}x}$, e $\int_{1}^{+\infty} e^{${s === 1 ? "" : s}x}\,dx$ diverge.`),
        ],
        steps: [
          String.raw`La funzione è continua e positiva su $[1, +\infty)$: l'unico estremo critico è $+\infty$.`,
          String.raw`Per il confronto tra infiniti l'esponenziale prevale su ogni potenza: $\lim_{x \to +\infty} ${fLatex} = +\infty$.`,
          String.raw`Allora per $x$ abbastanza grande la funzione è maggiore di $1$, e $\int^{+\infty} 1\,dx$ diverge: per il confronto l'integrale diverge. (Se la funzione non tende a $0$, un integrale all'infinito di una funzione positiva non può convergere.)`,
        ],
        hint: String.raw`Chi vince tra $e^{${s === 1 ? "" : s}x}$ e $${powerLatex("x", [n, 1])}$ per $x \to +\infty$?`,
      };
    }
  }
}

function fracLatex(n: number, d: number): string {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `\\frac{${n / g}}{${d / g}}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// ───────────────────────────── scelta dei numeri ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  const p = rng.pick(EXPONENTS);
  return rng.bool()
    ? { kind: "refInfinity", k: rng.pick([1, 1, 2, 3, 5]), p, from: rng.pick([1, 1, 2, 3]) }
    : { kind: "refZero", k: rng.pick([1, 1, 2, 3, 5]), p, to: rng.pick([1, 1, 2, 4]) };
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["rationalInfinity", "rationalInfinity", "rootInfinity", "productZero", "productZero", "elementaryZero", "bounded"] as const);
  switch (shape) {
    case "rationalInfinity": {
      const m = rng.pick([[0, 1], [1, 2], [1, 1], [2, 1]] as const satisfies readonly Exponent[]);
      const n = rng.int(Math.max(1, Math.ceil(value(m) + 0.5)), 4);
      return { kind: "rationalInfinity", a: rng.int(1, 5), m, n, d: rng.int(1, 6), b: rng.int(0, 4) };
    }
    case "rootInfinity":
      return { kind: "rootInfinity", a: rng.int(1, 5), n: rng.int(1, 4), d: rng.int(1, 6) };
    case "productZero":
      return { kind: "productZero", a: rng.int(1, 6), p: rng.pick(EXPONENTS.filter((e) => value(e) <= 2)), d: rng.int(1, 4) };
    case "elementaryZero": {
      const f = rng.pick(["exp", "cos", "sin"] as const);
      // Con il seno l'esponente del denominatore va da 3/2 a 3, così dopo l'abbassamento resta positivo.
      const p = f === "sin" ? rng.pick([[3, 2], [2, 1], [4, 3], [5, 3], [3, 1]] as const satisfies readonly Exponent[]) : rng.pick(EXPONENTS.filter((e) => value(e) <= 2));
      return { kind: "elementaryZero", f, p };
    }
    case "bounded":
      return { kind: "bounded", f: rng.pick(["sin", "cos"] as const), k: rng.int(2, 5), p: rng.pick([[2, 1], [3, 2], [1, 1], [1, 2], [3, 1]] as const satisfies readonly Exponent[]) };
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["twoEnds", "twoEnds", "interior", "logarithm", "exponential"] as const);
  switch (shape) {
    case "twoEnds":
      return {
        kind: "twoEnds",
        a: rng.pick([[1, 2], [1, 3], [2, 3], [1, 1], [3, 2]] as const satisfies readonly Exponent[]),
        b: rng.pick([[1, 1], [2, 1], [1, 2]] as const satisfies readonly Exponent[]),
        k: rng.pick([1, 2, 3]),
      };
    case "interior": {
      const cube = rng.bool();
      // Con la radice cubica gli estremi distano 1 o 8 dal punto critico (cubi perfetti).
      const span = (): number => (cube ? rng.pick([1, 8]) : rng.int(1, 3));
      return { kind: "interior", k: rng.int(1, 4), c: rng.int(-2, 2), left: span(), right: span(), cube };
    }
    case "logarithm":
      return { kind: "logarithm", k: rng.int(1, 3), q: rng.pick([[1, 1], [2, 1], [1, 2], [3, 1], [3, 2]] as const satisfies readonly Exponent[]) };
    case "exponential":
    {
      // Se cresce, n ≥ 2: con n = 1 il confronto con 1/x sarebbe un ragionamento giusto.
      const grows = rng.bool(0.4);
      return { kind: "exponential", n: rng.int(grows ? 2 : 1, 4), s: rng.int(1, 3), grows };
    }
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

const FIRST_HINT = String.raw`Trova prima gli estremi critici (un estremo infinito, o un punto in cui la funzione è illimitata). Poi confronta la funzione, vicino a ciascuno, con un integrale di riferimento $\frac{1}{x^{p}}$: all'infinito converge per $p > 1$, vicino a un punto per $p < 1$.`;

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const correct = option(plan.converges, plan.reason);
  const seen = new Set([correct]);
  const wrongs = plan.wrong.filter((candidate) => !seen.has(candidate.value) && (seen.add(candidate.value), true));
  return {
    prompt: `Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$${plan.integral}$$`,
    answer: { kind: "choice", correct, wrong: wrongs },
    steps: plan.steps.map((text) => ({ text })),
    hints: [FIRST_HINT, plan.hint],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

const close = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance * (1 + Math.abs(b));

/** Controlla numericamente sulla funzione del testo il comportamento dichiarato per un estremo. */
function endHolds(f: (x: number) => number, end: End): boolean {
  switch (end.kind) {
    case "infinity": {
      const p = value(end.p);
      return [1e8, 1e10].every((x) => close(f(x) * x ** p, end.c, 1e-3));
    }
    case "point": {
      const p = value(end.p);
      return [1e-5, 1e-7].every((h) => close(f(end.at + end.side * h) * h ** p, end.c, 1e-2));
    }
    case "between": {
      const p = value(end.p);
      for (let i = 0; i <= 400; i++) {
        const x = end.from + i * 0.37;
        const scaled = f(x) * x ** p;
        if (!(scaled >= end.lo - 1e-12 && scaled <= end.hi + 1e-12)) return false;
      }
      return true;
    }
    case "log": {
      const q = value(end.q);
      return [1e40, 1e80].every((x) => close(f(x) * x * Math.log(x) ** q, end.c, 1e-2));
    }
    case "decay":
      return [50, 100, 200].every((x) => x * x * f(x) < 1e-6);
    case "growth":
      return f(100) > 1e6 && f(200) > f(100);
  }
}

export default defineGenerator({
  code: "V2.M10.A01.g1",
  skill: "V2.M10.A01",
  lesson: "V2.M10.L02",
  title: "Convergenza di integrali impropri: il criterio giusto",
  levels: [1, 2, 3],
  errors: [TERMINE, SOGLIA, VERSO, SINGOLARITA, INFINITI],
  limits: { maxInteger: 1, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "choice") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    if (!exercise.prompt.includes(plan.integral)) return false;
    // Il comportamento dichiarato vale davvero per la funzione, e da lì segue il verdetto.
    if (!plan.ends.every((end) => endHolds(plan.f, end))) return false;
    const converges = plan.ends.every(endConverges);
    // L'opzione giusta dice quel verdetto, e nessuna sbagliata ripete l'opzione giusta.
    return answer.correct.startsWith(verdict(converges)) && converges === plan.converges;
  },
});
