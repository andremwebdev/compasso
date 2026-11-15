// V2.M11.A01.g1 — Convergenza delle serie numeriche: scegli il verdetto con il criterio giusto.
//
// Scelta multipla: ogni opzione dice come si comporta la serie («converge», «diverge»; per le serie a
// segni alterni «converge assolutamente», «converge, ma non assolutamente», «non converge») e perché.
// L'opzione giusta usa il criterio giusto (geometrica, armonica generalizzata, confronto asintotico,
// rapporto, Leibniz, integrale); le sbagliate sono i criteri usati male:
// - AN.TERMINE_GENERALE: «il termine generale tende a 0, quindi converge»;
// - AN.SOGLIA_CONVERGENZA: soglia della serie di riferimento ricordata male;
// - AN.CRITERIO_INCONCLUDENTE: rapporto con limite 1 (o rapporti minori di 1 uno per uno) presi come risposta;
// - AN.CONFRONTO_VERSO: confronto con una disuguaglianza vera nel verso che non dice niente;
// - AN.LEIBNIZ_IPOTESI: segni alterni presi come sufficienti;
// - AN.CONVERGENZA_ASSOLUTA: convergenza semplice e assoluta confuse;
// - AN.CONFRONTO_INFINITI: potenze, esponenziali e fattoriali confusi.
//
// Costruzione all'indietro: si sceglie il comportamento del termine generale (esponente, limite del
// rapporto, segno), poi il termine generale che lo ha. La verifica indipendente controlla quel
// comportamento numericamente sul termine generale (in scala logaritmica, per fattoriali e potenze)
// e ricava da lì il verdetto.
//
// Livello 1: serie geometriche e armoniche generalizzate.
// Livello 2: confronto asintotico, criterio del rapporto, serie a segni alterni.
// Livello 3: fattoriali, sviluppi di Taylor nel confronto asintotico, logaritmi, segni alterni con il seno.

import { defineGenerator, type ExerciseDraft, type ExpectedWrong, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { Rng } from "../../../motore/random/rng";
import { exponentLatex, logPowerLatex, pAgainstOne, powerLatex, value, type Exponent } from "../../comuni/convergence";

type Rng_ = GeneratorContext["rng"];

const TERMINE = "AN.TERMINE_GENERALE";
const SOGLIA = "AN.SOGLIA_CONVERGENZA";
const INCONCLUDENTE = "AN.CRITERIO_INCONCLUDENTE";
const VERSO = "AN.CONFRONTO_VERSO";
const LEIBNIZ = "AN.LEIBNIZ_IPOTESI";
const ASSOLUTA = "AN.CONVERGENZA_ASSOLUTA";
const INFINITI = "AN.CONFRONTO_INFINITI";

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

/** Il comportamento della serie, come lo dice il verdetto. */
type Verdict = "converges" | "diverges" | "absolute" | "conditional" | "oscillates";

const VERDICT_TEXT: Record<Verdict, string> = {
  converges: "**Converge**",
  diverges: "**Diverge**",
  absolute: "**Converge assolutamente**",
  conditional: "**Converge, ma non assolutamente**",
  oscillates: "**Non converge**",
};

// ───────────────────────────── comportamento del termine generale (per la verifica) ─────────────────────────────

/** Il comportamento di |aₙ|, che la verifica controlla numericamente. */
type Behaviour =
  /** |aₙ|·nᵖ → c. */
  | { readonly kind: "power"; readonly p: Exponent; readonly c: number }
  /** |aₙ₊₁|/|aₙ| → L. */
  | { readonly kind: "ratio"; readonly L: number }
  /** |aₙ|·n·(ln n)^q → c. */
  | { readonly kind: "log"; readonly q: Exponent; readonly c: number }
  /** |aₙ| → L > 0. */
  | { readonly kind: "notZero"; readonly L: number };

/** Il verdetto che segue dal comportamento e dal segno (alternating: i segni si alternano e |aₙ| decresce). */
function verdictOf(behaviour: Behaviour, alternating: boolean): Verdict {
  const absolutely = behaviour.kind === "power" ? value(behaviour.p) > 1 : behaviour.kind === "ratio" ? behaviour.L < 1 : behaviour.kind === "log" ? value(behaviour.q) > 1 : false;
  if (!alternating) return absolutely ? "converges" : "diverges";
  if (absolutely) return "absolute";
  return behaviour.kind === "notZero" ? "oscillates" : "conditional";
}

// ───────────────────────────── il modello ─────────────────────────────

type Model =
  | { readonly kind: "geometric"; readonly k: number; readonly num: number; readonly den: number; readonly negative: boolean }
  | { readonly kind: "harmonic"; readonly k: number; readonly p: Exponent }
  | { readonly kind: "rational"; readonly a: number; readonly m: number; readonly n: number; readonly b: number; readonly d: number }
  | { readonly kind: "powerExponential"; readonly m: number; readonly c: number; readonly grows: boolean }
  | { readonly kind: "alternating"; readonly p: Exponent; readonly k: number }
  | { readonly kind: "alternatingNotZero"; readonly a: number; readonly b: number; readonly c: number; readonly d: number }
  | { readonly kind: "factorial"; readonly shape: "cOverFactorial" | "factorialOverC" | "factorialOverPower"; readonly c: number; readonly k: number }
  | { readonly kind: "taylor"; readonly f: "sin" | "ln" | "cos" | "exp"; readonly p: Exponent; readonly k: number }
  | { readonly kind: "logarithm"; readonly q: Exponent; readonly k: number }
  | { readonly kind: "alternatingSine"; readonly p: Exponent; readonly k: number };

interface Plan {
  /** La serie in LaTeX. */
  readonly series: string;
  /** ln|aₙ| e il segno di aₙ, per la verifica numerica. */
  readonly logAbs: (n: number) => number;
  readonly sign: (n: number) => number;
  readonly behaviour: Behaviour;
  readonly alternating: boolean;
  readonly verdict: Verdict;
  /** La giustificazione dell'opzione giusta. */
  readonly reason: string;
  readonly wrong: readonly ExpectedWrong<string>[];
  readonly steps: readonly string[];
  readonly hint: string;
}

const option = (verdict: Verdict, reason: string): string => `${VERDICT_TEXT[verdict]}: ${reason}`;
const wrong = (error: ErrorCode, verdict: Verdict, reason: string): ExpectedWrong<string> => ({ error, value: option(verdict, reason) });
const positive = (): number => 1;
const alternatingSign = (n: number): number => (n % 2 === 0 ? 1 : -1);
const yesNo = (converges: boolean): Verdict => (converges ? "converges" : "diverges");

/** ln n! (Stirling con la correzione 1/(12n): basta per n grande; per n piccolo il conto diretto). */
function logFactorial(n: number): number {
  if (n < 30) {
    let total = 0;
    for (let i = 2; i <= n; i++) total += Math.log(i);
    return total;
  }
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
}

/** Le opzioni sbagliate comuni per una serie a termini positivi che si comporta come c/nᵖ. */
function harmonicWrongs(p: Exponent, aLatex: string, converges: boolean): ExpectedWrong<string>[] {
  return [
    wrong(SOGLIA, yesNo(value(p) < 1), String.raw`la serie armonica generalizzata $\sum \frac{1}{n^{p}}$ converge solo per $p < 1$, e qui $p = ${exponentLatex(p)}$.`),
    wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
    converges
      ? wrong(VERSO, "diverges", String.raw`per $n$ abbastanza grande vale $${aLatex} \le \frac{1}{n}$, e la serie armonica $\sum \frac{1}{n}$ diverge.`)
      : wrong(INCONCLUDENTE, "converges", String.raw`il rapporto $\frac{a_{n+1}}{a_{n}}$ è minore di $1$ per ogni $n$, quindi per il criterio del rapporto la serie converge.`),
  ];
}

function planOf(model: Model): Plan {
  switch (model.kind) {
    case "geometric": {
      // k·qⁿ da n = 0, con q = ±num/den.
      const { k, num, den, negative } = model;
      const q = (negative ? -1 : 1) * (num / den);
      const qLatex = `${negative ? "-" : ""}${den === 1 ? num : `\\frac{${num}}{${den}}`}`;
      const converges = Math.abs(q) < 1;
      const base = negative ? `\\left(${qLatex}\\right)^{n}` : den === 1 ? `${num}^{n}` : `\\left(${qLatex}\\right)^{n}`;
      const term = `${k === 1 ? "" : k}${base}`;
      // Con ragione negativa la serie diverge «oscillando» se |q| ≥ 1: non converge.
      const verdict: Verdict = converges ? "converges" : negative ? "oscillates" : "diverges";
      const absQ = `\\left|${qLatex}\\right| = ${den === 1 ? num : `\\frac{${num}}{${den}}`}`;
      return {
        series: String.raw`\sum_{n=0}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(k) + n * Math.log(Math.abs(q)),
        sign: (n) => (negative && n % 2 === 1 ? -1 : 1),
        behaviour: converges ? { kind: "ratio", L: Math.abs(q) } : { kind: "ratio", L: Math.abs(q) },
        alternating: false,
        verdict,
        reason: String.raw`è una serie geometrica di ragione $q = ${qLatex}$, e $${absQ} ${converges ? "< 1" : "\\ge 1"}$: la geometrica converge se e solo se $|q| < 1$.`,
        wrong: [
          wrong(SOGLIA, Math.abs(q) > 1 ? "converges" : "diverges", String.raw`è una serie geometrica di ragione $q = ${qLatex}$, che converge solo per $|q| > 1$.`),
          converges
            ? wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`)
            : wrong(SOGLIA, q < 1 ? "converges" : "diverges", String.raw`è una serie geometrica di ragione $q = ${qLatex}$, e converge quando $q < 1$, senza valore assoluto.`),
          converges
            ? wrong(VERSO, "diverges", String.raw`per $n \ge 1$ vale $\left|${term}\right| \le ${k}$, e la serie di termine costante $${k}$ diverge.`)
            : negative
              ? wrong(LEIBNIZ, "conditional", String.raw`i segni sono alterni, quindi per il criterio di Leibniz la serie converge.`)
              : wrong(VERSO, "converges", String.raw`per $n \ge 1$ vale $${term} \ge \frac{1}{n^{2}}$, e $\sum \frac{1}{n^{2}}$ converge.`),
        ],
        steps: [
          String.raw`Il termine generale è $${k === 1 ? "" : `${k} \\cdot `}q^{n}$ con $q = ${qLatex}$: è una serie geometrica.`,
          String.raw`La serie geometrica $\sum q^{n}$ converge se e solo se $|q| < 1$ (e allora vale $\frac{1}{1 - q}$); per $|q| \ge 1$ il termine generale non tende a $0$.`,
          converges
            ? String.raw`Qui $${absQ} < 1$: la serie converge, e la sua somma è $${k === 1 ? "" : `${k} \\cdot `}\frac{1}{1 - q}$.`
            : String.raw`Qui $${absQ} \ge 1$: il termine generale non tende a $0$, e la serie ${negative ? "non converge (le somme parziali oscillano)" : "diverge"}.`,
        ],
        hint: String.raw`Riconosci la serie geometrica e confronta la ragione con $1$, in valore assoluto.`,
      };
    }

    case "harmonic": {
      const { k, p } = model;
      const term = String.raw`\frac{${k}}{${powerLatex("n", p)}}`;
      const converges = value(p) > 1;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(k) - value(p) * Math.log(n),
        sign: positive,
        behaviour: { kind: "power", p, c: k },
        alternating: false,
        verdict: yesNo(converges),
        reason: String.raw`è ${k === 1 ? "" : `$${k}$ volte `}la serie armonica generalizzata $\sum \frac{1}{n^{p}}$ con $${pAgainstOne(p)}$, che converge se e solo se $p > 1$.`,
        wrong: harmonicWrongs(p, term, converges),
        steps: [
          String.raw`Il termine generale è ${k === 1 ? "" : `$${k}$ volte `}$\frac{1}{n^{p}}$ con $p = ${exponentLatex(p)}$: è una serie armonica generalizzata.`,
          String.raw`La serie armonica generalizzata $\sum \frac{1}{n^{p}}$ converge se e solo se $p > 1$ (si vede con il criterio dell'integrale, confrontando con $\int_{1}^{+\infty} \frac{dx}{x^{p}}$). Per $p = 1$ è la serie armonica, che diverge anche se il termine generale tende a $0$.`,
          `Qui $${pAgainstOne(p)}$: la serie ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Confronta l'esponente di $n$ con $1$: $\sum \frac{1}{n^{p}}$ converge se e solo se $p > 1$.`,
      };
    }

    case "rational": {
      // (a·n^m + b)/(nⁿ + d) ~ a/n^{n−m}.
      const { a, m, n: top, b, d } = model;
      const p: Exponent = [top - m, 1];
      const numerator = m === 0 ? String(a) : `${a === 1 ? "" : a}${powerLatex("n", [m, 1])} + ${b}`;
      const term = String.raw`\frac{${numerator}}{${powerLatex("n", [top, 1])} + ${d}}`;
      const converges = value(p) > 1;
      const reference = String.raw`\frac{${a}}{${powerLatex("n", p)}}`;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(a * n ** m + (m === 0 ? 0 : b)) - Math.log(n ** top + d),
        sign: positive,
        behaviour: { kind: "power", p, c: a },
        alternating: false,
        verdict: yesNo(converges),
        reason: String.raw`il termine generale è asintotico a $${reference}$ (contano i termini di grado massimo), e $\sum \frac{1}{n^{p}}$ con $${pAgainstOne(p)}$ ${converges ? "converge" : "diverge"}: per il confronto asintotico la serie ${converges ? "converge" : "diverge"}.`,
        wrong: harmonicWrongs(p, term, converges),
        steps: [
          String.raw`I termini sono positivi: si può usare il confronto asintotico.`,
          String.raw`Per $n \to +\infty$ contano i termini di grado massimo: $${term} \sim ${reference}$.`,
          String.raw`La serie si comporta come $\sum \frac{1}{n^{p}}$ con $${pAgainstOne(p)}$, che ${converges ? "converge" : "diverge"}. Quindi la serie data ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Tieni solo i termini di grado massimo: il termine generale si comporta come $\frac{c}{n^{p}}$.`,
      };
    }

    case "powerExponential": {
      // n^m/cⁿ (converge, L = 1/c) oppure cⁿ/n^m (diverge, L = c).
      const { m, c, grows } = model;
      const nm = powerLatex("n", [m, 1]);
      const term = grows ? String.raw`\frac{${c}^{n}}{${nm}}` : String.raw`\frac{${nm}}{${c}^{n}}`;
      const L = grows ? c : 1 / c;
      const Llatex = grows ? String(c) : `\\frac{1}{${c}}`;
      const ratio = grows ? String.raw`${c} \cdot \left(\frac{n}{n + 1}\right)^{${m}}` : String.raw`\frac{1}{${c}} \cdot \left(\frac{n + 1}{n}\right)^{${m}}`;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${term}`,
        logAbs: (n) => (grows ? 1 : -1) * (n * Math.log(c) - m * Math.log(n)),
        sign: positive,
        behaviour: { kind: "ratio", L },
        alternating: false,
        verdict: yesNo(!grows),
        reason: String.raw`per il criterio del rapporto $\frac{a_{n+1}}{a_{n}} = ${ratio} \to ${Llatex} ${grows ? "> 1" : "< 1"}$.`,
        wrong: grows
          ? [
              wrong(INFINITI, "converges", String.raw`prevale il denominatore $${nm}$, quindi il termine generale tende a $0$ come $\frac{1}{${nm}}$.`),
              wrong(VERSO, "converges", String.raw`per $n$ abbastanza grande vale $${term} \ge \frac{1}{n^{2}}$, e $\sum \frac{1}{n^{2}}$ converge.`),
              wrong(SOGLIA, "converges", String.raw`c'è dentro una geometrica di ragione $${c}$, e la geometrica converge per $|q| > 1$.`),
            ]
          : [
              wrong(INFINITI, "diverges", String.raw`il numeratore $${nm}$ tende a $+\infty$ e prevale, quindi il termine generale non tende a $0$.`),
              wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
              wrong(VERSO, "diverges", String.raw`per $n \ge 1$ vale $${term} \le ${nm}$, e $\sum ${nm}$ diverge.`),
            ],
        steps: [
          String.raw`C'è un esponenziale: conviene il criterio del rapporto. I termini sono positivi.`,
          String.raw`$\frac{a_{n+1}}{a_{n}} = ${ratio}$, e il fattore con la potenza tende a $1$: il limite è $${Llatex}$.`,
          String.raw`Il limite è ${grows ? "maggiore" : "minore"} di $1$: la serie ${grows ? "diverge" : "converge"}. (L'esponenziale prevale sulla potenza${grows ? ": il termine generale tende a $+\\infty$" : ""}.)`,
        ],
        hint: String.raw`Con un esponenziale nel termine generale prova il criterio del rapporto: calcola il limite di $\frac{a_{n+1}}{a_{n}}$.`,
      };
    }

    case "alternating": {
      // (−1)ⁿ/nᵖ.
      const { p, k } = model;
      const absolute = value(p) > 1;
      const np = powerLatex("n", p);
      return {
        series: k === 1 ? String.raw`\sum_{n=1}^{+\infty} \frac{(-1)^{n}}{${np}}` : String.raw`\sum_{n=1}^{+\infty} (-1)^{n} \frac{${k}}{${np}}`,
        logAbs: (n) => Math.log(k) - value(p) * Math.log(n),
        sign: alternatingSign,
        behaviour: { kind: "power", p, c: k },
        alternating: true,
        verdict: absolute ? "absolute" : "conditional",
        reason: absolute
          ? String.raw`la serie dei valori assoluti è $\sum \frac{${k}}{${np}}$, armonica generalizzata con $${pAgainstOne(p)}$, che converge.`
          : String.raw`per il criterio di Leibniz converge, perché $\frac{${k}}{${np}}$ decresce e tende a $0$; la serie dei valori assoluti $\sum \frac{${k}}{${np}}$ ha $${pAgainstOne(p)}$ e diverge.`,
        wrong: absolute
          ? [
              wrong(ASSOLUTA, "conditional", String.raw`converge per il criterio di Leibniz, e una serie a segni alterni non può convergere assolutamente.`),
              wrong(SOGLIA, "conditional", String.raw`converge per Leibniz, ma $\sum \frac{${k}}{${np}}$ diverge, perché la serie armonica generalizzata converge solo per $p < 1$.`),
              wrong(TERMINE, "absolute", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
            ]
          : [
              wrong(ASSOLUTA, "diverges", String.raw`la serie dei valori assoluti $\sum \frac{${k}}{${np}}$ diverge, quindi diverge anche la serie data.`),
              wrong(ASSOLUTA, "absolute", String.raw`per il criterio di Leibniz, perché $\frac{${k}}{${np}}$ decresce e tende a $0$.`),
              wrong(SOGLIA, "absolute", String.raw`la serie dei valori assoluti è $\sum \frac{1}{n^{p}}$ con $p = ${exponentLatex(p)}$, e converge per $p < 1$.`),
            ],
        steps: [
          String.raw`I segni sono alterni: si studiano separatamente la convergenza assoluta (la serie dei valori assoluti) e la convergenza semplice (criterio di Leibniz).`,
          String.raw`Valori assoluti: $\sum \frac{${k}}{${np}}$ è armonica generalizzata con $${pAgainstOne(p)}$, quindi ${absolute ? "converge: la serie converge assolutamente, e quindi converge." : "diverge: la serie non converge assolutamente."}`,
          absolute
            ? String.raw`Non serve altro: la convergenza assoluta implica la convergenza.`
            : String.raw`Leibniz: $\frac{${k}}{${np}}$ è positivo, decrescente e tende a $0$, quindi la serie converge. Converge, ma non assolutamente.`,
        ],
        hint: String.raw`Guarda prima la serie dei valori assoluti; se diverge, prova il criterio di Leibniz.`,
      };
    }

    case "alternatingNotZero": {
      // (−1)ⁿ·(a·n + b)/(c·n + d): |aₙ| → a/c ≠ 0.
      const { a, b, c, d } = model;
      const top = `${a === 1 ? "" : a}n + ${b}`;
      const bottom = `${c === 1 ? "" : c}n + ${d}`;
      const L = a / c;
      const Llatex = Number.isInteger(L) ? String(L) : `\\frac{${a}}{${c}}`;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} (-1)^{n} \frac{${top}}{${bottom}}`,
        logAbs: (n) => Math.log((a * n + b) / (c * n + d)),
        sign: alternatingSign,
        behaviour: { kind: "notZero", L },
        alternating: true,
        verdict: "oscillates",
        reason: String.raw`$\left|a_{n}\right| = \frac{${top}}{${bottom}} \to ${Llatex} \ne 0$: il termine generale non tende a $0$, e manca la condizione necessaria per la convergenza.`,
        wrong: [
          wrong(LEIBNIZ, "conditional", String.raw`i segni sono alterni, quindi per il criterio di Leibniz la serie converge; i valori assoluti non tendono a $0$, quindi non converge assolutamente.`),
          wrong(INFINITI, "conditional", String.raw`numeratore e denominatore hanno lo stesso grado, quindi $\left|a_{n}\right| \to 0$ e per Leibniz la serie converge.`),
          wrong(ASSOLUTA, "diverges", String.raw`la serie dei valori assoluti diverge, quindi la serie data diverge a $+\infty$.`),
        ],
        steps: [
          String.raw`Prima di ogni criterio, la condizione necessaria: il termine generale deve tendere a $0$.`,
          String.raw`Qui $\left|a_{n}\right| = \frac{${top}}{${bottom}} \to ${Llatex}$ (stesso grado: il rapporto dei coefficienti), che non è $0$.`,
          String.raw`Il criterio di Leibniz non si applica, perché $\left|a_{n}\right|$ non tende a $0$. La serie non converge: le somme parziali oscillano, senza tendere né a un numero né a $\pm\infty$.`,
        ],
        hint: String.raw`Controlla prima la condizione necessaria: a che cosa tende $\left|a_{n}\right|$?`,
      };
    }

    case "factorial": {
      const { shape, c, k } = model;
      const K = k === 1 ? "" : `${k} \\cdot `;
      if (shape === "factorialOverPower") {
        // k·n!/nⁿ: rapporto (n/(n+1))ⁿ → 1/e.
        return {
          series: String.raw`\sum_{n=1}^{+\infty} \frac{${K}n!}{n^{n}}`,
          logAbs: (n) => Math.log(k) + logFactorial(n) - n * Math.log(n),
          sign: positive,
          behaviour: { kind: "ratio", L: Math.exp(-1) },
          alternating: false,
          verdict: "converges",
          reason: String.raw`per il criterio del rapporto $\frac{a_{n+1}}{a_{n}} = \left(\frac{n}{n + 1}\right)^{n} = \frac{1}{\left(1 + \frac{1}{n}\right)^{n}} \to \frac{1}{e} < 1$.`,
          wrong: [
            wrong(INFINITI, "diverges", String.raw`il fattoriale cresce più di ogni potenza, quindi $\frac{n!}{n^{n}} \to +\infty$.`),
            wrong(INCONCLUDENTE, "diverges", String.raw`il rapporto $\frac{a_{n+1}}{a_{n}} = \left(\frac{n}{n + 1}\right)^{n}$ ha la base che tende a $1$, quindi tende a $1$ e la serie si comporta come la serie armonica.`),
            wrong(VERSO, "diverges", String.raw`per $n \ge 1$ vale $\frac{${K}n!}{n^{n}} \le ${k}$, e la serie di termine costante $${k}$ diverge.`),
          ],
          steps: [
            String.raw`C'è un fattoriale: conviene il criterio del rapporto. I termini sono positivi.`,
            String.raw`$\frac{a_{n+1}}{a_{n}} = \frac{(n + 1)!}{(n + 1)^{n+1}} \cdot \frac{n^{n}}{n!} = \frac{(n + 1)\,n^{n}}{(n + 1)^{n+1}} = \left(\frac{n}{n + 1}\right)^{n}$.`,
            String.raw`$\left(\frac{n}{n + 1}\right)^{n} = \frac{1}{\left(1 + \frac{1}{n}\right)^{n}} \to \frac{1}{e}$ (limite notevole), e $\frac{1}{e} < 1$: la serie converge. Attenzione: la base tende a $1$, ma l'esponente cresce, ed è una forma $1^{\infty}$.`,
          ],
          hint: String.raw`Criterio del rapporto: semplifica $\frac{(n + 1)!}{n!} = n + 1$ e ricorda $\left(1 + \frac{1}{n}\right)^{n} \to e$.`,
        };
      }
      const grows = shape === "factorialOverC";
      const term = grows ? String.raw`\frac{${K}n!}{${c}^{n}}` : String.raw`\frac{${K}${c}^{n}}{n!}`;
      const ratio = grows ? String.raw`\frac{n + 1}{${c}}` : String.raw`\frac{${c}}{n + 1}`;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(k) + (grows ? 1 : -1) * (logFactorial(n) - n * Math.log(c)),
        sign: positive,
        behaviour: { kind: "ratio", L: grows ? Number.POSITIVE_INFINITY : 0 },
        alternating: false,
        verdict: yesNo(!grows),
        reason: String.raw`per il criterio del rapporto $\frac{a_{n+1}}{a_{n}} = ${ratio} \to ${grows ? "+\\infty" : "0 < 1"}$.`,
        wrong: grows
          ? [
              wrong(INFINITI, "converges", String.raw`l'esponenziale $${c}^{n}$ al denominatore prevale, quindi il termine generale tende a $0$ in fretta.`),
              wrong(VERSO, "converges", String.raw`per $n$ abbastanza grande vale $${term} \ge \frac{1}{n^{2}}$, e $\sum \frac{1}{n^{2}}$ converge.`),
              wrong(SOGLIA, "converges", String.raw`c'è dentro una geometrica di ragione $\frac{1}{${c}}$, e $\left|\frac{1}{${c}}\right| < 1$.`),
            ]
          : [
              wrong(INFINITI, "diverges", String.raw`l'esponenziale $${c}^{n}$ al numeratore prevale sul fattoriale, quindi il termine generale tende a $+\infty$.`),
              wrong(SOGLIA, "diverges", String.raw`c'è dentro una geometrica di ragione $${c}$, e $${c} > 1$.`),
              wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
            ],
        steps: [
          String.raw`C'è un fattoriale: conviene il criterio del rapporto. I termini sono positivi.`,
          String.raw`$\frac{a_{n+1}}{a_{n}} = ${grows ? String.raw`\frac{(n + 1)!}{${c}^{n+1}} \cdot \frac{${c}^{n}}{n!}` : String.raw`\frac{${c}^{n+1}}{(n + 1)!} \cdot \frac{n!}{${c}^{n}}`} = ${ratio}$, perché $\frac{(n + 1)!}{n!} = n + 1$${k === 1 ? "" : ` (la costante $${k}$ si semplifica)`}.`,
          String.raw`Il limite è $${grows ? "+\\infty" : "0"}$, ${grows ? "maggiore" : "minore"} di $1$: la serie ${grows ? "diverge" : "converge"}. (Il fattoriale prevale su ogni esponenziale.)`,
        ],
        hint: String.raw`Criterio del rapporto: ricorda $\frac{(n + 1)!}{n!} = n + 1$.`,
      };
    }

    case "taylor": {
      // k·sin(1/nᵖ), k·ln(1 + 1/nᵖ), k·(e^{1/nᵖ} − 1) ~ k/nᵖ; k·(1 − cos(1/nᵖ)) ~ k/(2n^{2p}).
      const { f, p, k } = model;
      const inner = String.raw`\frac{1}{${powerLatex("n", p)}}`;
      const K = k === 1 ? "" : String(k);
      const term =
        f === "sin" ? String.raw`${K}\sin ${inner}` : f === "ln" ? String.raw`${K}\ln\left(1 + ${inner}\right)` : f === "exp" ? String.raw`${K}\left(e^{${inner}} - 1\right)` : String.raw`${K}\left(1 - \cos ${inner}\right)`;
      const local: Exponent = f === "cos" ? (p[1] === 1 ? [2 * p[0], 1] : [2 * p[0], p[1]]) : p;
      const reduced: Exponent = Number.isInteger(value(local)) ? [value(local), 1] : local;
      const c = f === "cos" ? k / 2 : k;
      const cLatex = f === "cos" ? (k % 2 === 0 ? (k / 2 === 1 ? "" : String(k / 2)) : `\\frac{${k}}{2}`) : K;
      const reference = f === "cos" && k % 2 === 1 ? String.raw`\frac{${k}}{2${powerLatex("n", reduced)}}` : String.raw`\frac{${cLatex || 1}}{${powerLatex("n", reduced)}}`;
      const notable = f === "sin" ? String.raw`\sin t \sim t` : f === "ln" ? String.raw`\ln(1 + t) \sim t` : f === "exp" ? String.raw`e^{t} - 1 \sim t` : String.raw`1 - \cos t \sim \frac{t^{2}}{2}`;
      const converges = value(reduced) > 1;
      const g = (n: number): number => {
        const t = n ** -value(p);
        return f === "sin" ? Math.sin(t) : f === "ln" ? Math.log1p(t) : f === "exp" ? Math.expm1(t) : 2 * Math.sin(t / 2) ** 2;
      };
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(k * g(n)),
        sign: positive,
        behaviour: { kind: "power", p: reduced, c },
        alternating: false,
        verdict: yesNo(converges),
        reason: String.raw`con $t = ${inner} \to 0$ è $${notable}$, quindi il termine generale è asintotico a $${reference}$ con $${pAgainstOne(reduced)}$: per il confronto asintotico la serie ${converges ? "converge" : "diverge"}.`,
        wrong: [
          wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
          f === "cos"
            ? wrong("AN.TAYLOR_SVILUPPO", yesNo(value(p) > 1), String.raw`con $t = ${inner}$ è $1 - \cos t \sim t$, quindi il termine generale è asintotico a $${K ? `\\frac{${k}}{${powerLatex("n", p)}}` : inner}$ con $p = ${exponentLatex(p)}$.`)
            : wrong(SOGLIA, yesNo(value(p) < 1), String.raw`il termine generale è asintotico a $${reference}$, e $\sum \frac{1}{n^{p}}$ converge solo per $p < 1$; qui $p = ${exponentLatex(p)}$.`),
          converges
            ? wrong(VERSO, "diverges", String.raw`per $n$ abbastanza grande vale $${term} \le \frac{1}{n}$, e la serie armonica diverge.`)
            : wrong(INCONCLUDENTE, "converges", String.raw`il rapporto $\frac{a_{n+1}}{a_{n}}$ è minore di $1$ per ogni $n$, quindi per il criterio del rapporto la serie converge.`),
        ],
        steps: [
          String.raw`I termini sono positivi e tendono a $0$: la condizione necessaria vale, ma non basta. Si usa il confronto asintotico.`,
          String.raw`Con $t = ${inner} \to 0$ vale lo sviluppo $${notable}$: $${term} \sim ${reference}$.`,
          String.raw`La serie si comporta come $\sum \frac{1}{n^{p}}$ con $${pAgainstOne(reduced)}$: ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`L'argomento tende a $0$: usa lo sviluppo $${notable}$ per $t \to 0$.`,
      };
    }

    case "logarithm": {
      // 1/(n·ln^q n) da n = 2: criterio dell'integrale.
      const { q, k } = model;
      const denominator = `n ${logPowerLatex("n", q)}`;
      const term = `\\frac{${k}}{${denominator}}`;
      const converges = value(q) > 1;
      return {
        series: String.raw`\sum_{n=2}^{+\infty} ${term}`,
        logAbs: (n) => Math.log(k) - Math.log(n) - value(q) * Math.log(Math.log(n)),
        sign: positive,
        behaviour: { kind: "log", q, c: k },
        alternating: false,
        verdict: yesNo(converges),
        reason: String.raw`per il criterio dell'integrale si comporta come $\int_{2}^{+\infty} \frac{dx}{x ${logPowerLatex("x", q)}}$, che con $t = \ln x$ diventa $\int_{\ln 2}^{+\infty} \frac{dt}{${powerLatex("t", q)}}$ con $${pAgainstOne(q, "q")}$.`,
        wrong: [
          wrong(TERMINE, "converges", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
          converges
            ? wrong(VERSO, "diverges", String.raw`per $n \ge 3$ vale $${term} \le \frac{${k}}{n}$, e la serie armonica diverge.`)
            : wrong(VERSO, "converges", String.raw`per $n$ abbastanza grande vale $${term} \ge \frac{1}{n^{2}}$, e $\sum \frac{1}{n^{2}}$ converge.`),
          wrong(INCONCLUDENTE, converges ? "diverges" : "converges", String.raw`il limite del rapporto $\frac{a_{n+1}}{a_{n}}$ è $1$, quindi la serie ${converges ? "diverge come la serie armonica" : "converge"}.`),
        ],
        steps: [
          String.raw`Il confronto con le potenze di $n$ non decide (il logaritmo cresce più lentamente di ogni potenza), e il rapporto tende a $1$. Il termine generale è $f(n)$ con $f(x) = \frac{1}{x ${logPowerLatex("x", q)}}$, positiva e decrescente per $x \ge 2$: si usa il criterio dell'integrale.`,
          String.raw`La serie converge se e solo se converge $\int_{2}^{+\infty} f(x)\,dx$. Con $t = \ln x$ (quindi $dt = \frac{dx}{x}$) diventa $\int_{\ln 2}^{+\infty} \frac{dt}{${powerLatex("t", q)}}$.`,
          String.raw`È un integrale di riferimento all'infinito, che converge se e solo se l'esponente supera $1$. Qui $${pAgainstOne(q, "q")}$: la serie ${converges ? "converge" : "diverge"}.`,
        ],
        hint: String.raw`Prova il criterio dell'integrale: $\frac{1}{x}$ è la derivata di $\ln x$.`,
      };
    }

    case "alternatingSine": {
      // (−1)ⁿ·sin(1/nᵖ): |aₙ| ~ 1/nᵖ, decrescente.
      const { p, k } = model;
      const inner = String.raw`\frac{1}{${powerLatex("n", p)}}`;
      const absolute = value(p) > 1;
      return {
        series: String.raw`\sum_{n=1}^{+\infty} ${k === 1 ? "" : k}(-1)^{n} \sin ${inner}`,
        logAbs: (n) => Math.log(k * Math.sin(n ** -value(p))),
        sign: alternatingSign,
        behaviour: { kind: "power", p, c: k },
        alternating: true,
        verdict: absolute ? "absolute" : "conditional",
        reason: absolute
          ? String.raw`$\left|a_{n}\right| = ${k === 1 ? "" : k}\sin ${inner} \sim ${inner}$ con $${pAgainstOne(p)}$: la serie dei valori assoluti converge per il confronto asintotico.`
          : String.raw`$\sin ${inner}$ è positivo, decresce e tende a $0$, quindi per Leibniz converge; ma $\sin ${inner} \sim ${inner}$ con $${pAgainstOne(p)}$, quindi la serie dei valori assoluti diverge.`,
        wrong: absolute
          ? [
              wrong(ASSOLUTA, "conditional", String.raw`converge per il criterio di Leibniz, e una serie a segni alterni non può convergere assolutamente.`),
              wrong(TERMINE, "absolute", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
              wrong(SOGLIA, "conditional", String.raw`converge per Leibniz, ma $\sin ${inner} \sim ${inner}$ e $\sum \frac{1}{n^{p}}$ converge solo per $p < 1$.`),
            ]
          : [
              wrong(ASSOLUTA, "diverges", String.raw`la serie dei valori assoluti diverge, perché $\sin ${inner} \sim ${inner}$ con $${pAgainstOne(p)}$; quindi diverge anche la serie data.`),
              wrong(ASSOLUTA, "absolute", String.raw`per il criterio di Leibniz, perché $\sin ${inner}$ decresce e tende a $0$.`),
              wrong(TERMINE, "absolute", String.raw`il termine generale tende a $0$, e questo basta perché la serie converga.`),
            ],
        steps: [
          String.raw`I segni sono alterni: si studiano la convergenza assoluta e quella semplice.`,
          String.raw`Valori assoluti: $\sin ${inner} \sim ${inner}$ (limite notevole $\sin t \sim t$), con $${pAgainstOne(p)}$: per il confronto asintotico la serie dei valori assoluti ${absolute ? "converge" : "diverge"}.`,
          absolute
            ? String.raw`La serie converge assolutamente, e quindi converge.`
            : String.raw`Leibniz: per $n \ge 1$ l'argomento $${inner}$ sta in $(0, 1]$, dove il seno è positivo e crescente; quindi $\sin ${inner}$ decresce e tende a $0$. La serie converge, ma non assolutamente.`,
        ],
        hint: String.raw`Usa $\sin t \sim t$ per i valori assoluti; se la serie dei valori assoluti diverge, prova Leibniz.`,
      };
    }
  }
}

// ───────────────────────────── scelta dei numeri ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.4)) {
    const [num, den] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 2], [4, 3], [5, 2], [2, 1], [3, 1], [1, 1]] as const);
    return { kind: "geometric", k: rng.pick([1, 1, 2, 3, 5]), num, den, negative: rng.bool(0.35) };
  }
  return { kind: "harmonic", k: rng.pick([1, 1, 2, 3, 5]), p: rng.pick(EXPONENTS) };
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["rational", "rational", "powerExponential", "powerExponential", "alternating", "alternating", "alternatingNotZero"] as const);
  switch (shape) {
    case "rational": {
      const m = rng.int(0, 2);
      return { kind: "rational", a: rng.int(1, 5), m, n: rng.int(m + 1, m + 3), b: rng.int(1, 5), d: rng.int(1, 6) };
    }
    case "powerExponential":
      return { kind: "powerExponential", m: rng.int(1, 4), c: rng.int(2, 5), grows: rng.bool(0.4) };
    case "alternating":
      return { kind: "alternating", p: rng.pick(EXPONENTS), k: rng.pick([1, 1, 2, 3, 5]) };
    case "alternatingNotZero": {
      const c = rng.int(1, 4);
      return { kind: "alternatingNotZero", a: rng.int(1, 4), b: rng.int(1, 5), c, d: rng.int(1, 5) };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["factorial", "factorial", "taylor", "taylor", "taylor", "logarithm", "alternatingSine", "alternatingSine"] as const);
  switch (shape) {
    case "factorial":
      return { kind: "factorial", shape: rng.pick(["cOverFactorial", "factorialOverC", "factorialOverPower"] as const), c: rng.int(2, 7), k: rng.pick([1, 1, 2, 3, 4]) };
    case "taylor":
      return { kind: "taylor", f: rng.pick(["sin", "ln", "cos", "exp"] as const), p: rng.pick([[1, 1], [1, 2], [2, 1], [3, 2], [1, 3], [2, 3]] as const satisfies readonly Exponent[]), k: rng.pick([1, 1, 2, 3]) };
    case "logarithm":
      return { kind: "logarithm", q: rng.pick([[1, 1], [2, 1], [1, 2], [3, 2], [3, 1]] as const satisfies readonly Exponent[]), k: rng.pick([1, 1, 2, 3, 5]) };
    case "alternatingSine":
      return { kind: "alternatingSine", p: rng.pick(EXPONENTS), k: rng.pick([1, 1, 2, 3, 5]) };
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── dalla bozza all'esercizio ─────────────────────────────

const FIRST_HINT = String.raw`Controlla prima la condizione necessaria (il termine generale deve tendere a $0$). Poi scegli il criterio dalla forma del termine generale: potenze di $n$ → confronto con $\sum \frac{1}{n^{p}}$; esponenziali e fattoriali → rapporto; segni alterni → valori assoluti, poi Leibniz.`;

function draftOf(model: Model): ExerciseDraft {
  const plan = planOf(model);
  const correct = option(plan.verdict, plan.reason);
  const seen = new Set([correct]);
  const wrongs = plan.wrong.filter((candidate) => !seen.has(candidate.value) && (seen.add(candidate.value), true));
  return {
    prompt: `Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$${plan.series}$$`,
    answer: { kind: "choice", correct, wrong: wrongs },
    steps: plan.steps.map((text) => ({ text })),
    hints: [FIRST_HINT, plan.hint],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

const close = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance * (1 + Math.abs(b));

function behaviourHolds(plan: Plan): boolean {
  const { logAbs, behaviour } = plan;
  switch (behaviour.kind) {
    case "power":
      return [1e12, 1e15].every((n) => close(Math.exp(logAbs(n) + value(behaviour.p) * Math.log(n)), behaviour.c, 1e-3));
    case "ratio":
      return [1e4, 1e5].every((n) => {
        const ratio = Math.exp(logAbs(n + 1) - logAbs(n));
        return Number.isFinite(behaviour.L) ? (behaviour.L === 0 ? ratio < 1e-3 : close(ratio, behaviour.L, 1e-3)) : ratio > 1e3;
      });
    case "log":
      return [1e100, 1e200].every((n) => close(Math.exp(logAbs(n) + Math.log(n) + value(behaviour.q) * Math.log(Math.log(n))), behaviour.c, 1e-2));
    case "notZero":
      return [1e6, 1e8].every((n) => close(Math.exp(logAbs(n)), behaviour.L, 1e-3));
  }
}

/** Segni alterni e |aₙ| decrescente nei primi termini (le ipotesi di Leibniz), oppure segni tutti positivi. */
function signsHold(plan: Plan): boolean {
  for (let n = 1; n < 200; n++) {
    const sign = plan.sign(n);
    if (!plan.alternating) {
      if (sign !== 1 && plan.series.indexOf("left(-") < 0) return false;
      continue;
    }
    if (sign * plan.sign(n + 1) !== -1) return false;
    if (plan.behaviour.kind !== "notZero" && !(plan.logAbs(n + 1) < plan.logAbs(n))) return false;
  }
  return true;
}

export default defineGenerator({
  code: "V2.M11.A01.g1",
  skill: "V2.M11.A01",
  lesson: "V2.M11.L03",
  title: "Convergenza delle serie numeriche: il criterio giusto",
  levels: [1, 2, 3],
  errors: [TERMINE, SOGLIA, INCONCLUDENTE, VERSO, LEIBNIZ, ASSOLUTA, INFINITI, "AN.TAYLOR_SVILUPPO"],
  limits: { maxInteger: 1, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "choice") return false;
    const plan = planOf(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)));
    if (!exercise.prompt.includes(plan.series) || !behaviourHolds(plan) || !signsHold(plan)) return false;
    // Le serie geometriche con ragione negativa non sono «a segni alterni» nel senso di Leibniz qui:
    // il verdetto segue dal valore assoluto della ragione.
    const expected = model(plan);
    return expected === plan.verdict && answer.correct.startsWith(VERDICT_TEXT[expected]);
  },
});

/** Il verdetto ricavato dal comportamento controllato numericamente. */
function model(plan: Plan): Verdict {
  if (plan.series.includes("left(-") && plan.behaviour.kind === "ratio") {
    // Geometrica di ragione negativa: converge per |q| < 1, altrimenti oscilla.
    return plan.behaviour.L < 1 ? "converges" : "oscillates";
  }
  return verdictOf(plan.behaviour, plan.alternating);
}
