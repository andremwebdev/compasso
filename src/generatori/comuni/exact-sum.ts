// Somme esatte di termini «razionale × atomo»: 3/2 + e²/4 − 2 ln 3 + π/4. Servono ai generatori che
// costruiscono all'indietro il valore di un integrale definito (o improprio) come F(b) − F(a): ogni
// valore della primitiva è una somma di questo tipo, e le somme si sottraggono senza perdere l'esattezza.
// Gli atomi uguali (stessa chiave) si raccolgono; il risultato si scrive «a mano» con scaled e sum.

import { e, exprKey, frac, ln, num, pi, pow, type Expr } from "../../motore/expr";
import { scaled, sum } from "./writing";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

interface Term {
  /** Coefficiente p/q, sempre ridotto, con q > 0. */
  readonly p: number;
  readonly q: number;
  /** L'atomo; null per il termine numerico. */
  readonly atom: Expr | null;
  /** Per i logaritmi: il numero primo p dell'atomo ln p (ogni logaritmo si spezza nei primi). */
  readonly prime?: number;
}

/** La scomposizione in fattori primi di un intero positivo: [primo, esponente]. */
function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p++) {
    let k = 0;
    while (n % p === 0) {
      n /= p;
      k += 1;
    }
    if (k > 0) out.push([p, k]);
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

/** Il più grande valore di numeratore e denominatore per cui i logaritmi si raccolgono in uno solo. */
const MAX_LOG_ARGUMENT = 200;

function reduce(p: number, q: number): [number, number] {
  if (q < 0) [p, q] = [-p, -q];
  const g = gcd(p, q) || 1;
  return [p / g, q / g];
}

export class ExactSum {
  private constructor(private readonly terms: readonly Term[]) {}

  static readonly ZERO = new ExactSum([]);

  /** (p/q)·atomo, oppure il numero p/q se l'atomo manca. */
  static of(p: number, q = 1, atom: Expr | null = null): ExactSum {
    return ExactSum.ZERO.plus(new ExactSum([{ p, q, atom }]));
  }

  /** (p/q)·e^k (k = 0 è il numero p/q). */
  static exp(p: number, q: number, k: number): ExactSum {
    return ExactSum.of(p, q, k === 0 ? null : k === 1 ? e : pow(e, k));
  }

  /**
   * (p/q)·ln(n/d), con n e d interi positivi: zero se n/d = 1. Internamente il logaritmo si spezza nei
   * primi (ln 12 = 2 ln 2 + ln 3), così ln 18 − ln 9 si riduce a ln 2; toExpr lo ricompone.
   */
  static ln(p: number, q: number, n: number, d = 1): ExactSum {
    if (!(n > 0 && d > 0)) throw new Error(`logaritmo di un numero non positivo: ${n}/${d}`);
    const [a, b] = reduce(n, d);
    const terms: Term[] = [
      ...factorize(a).map(([prime, k]): Term => ({ p: p * k, q, atom: ln(num(prime)), prime })),
      ...factorize(b).map(([prime, k]): Term => ({ p: -p * k, q, atom: ln(num(prime)), prime })),
    ];
    return ExactSum.ZERO.plus(new ExactSum(terms));
  }

  /** (p/q)·π. */
  static pi(p: number, q = 1): ExactSum {
    return ExactSum.of(p, q, pi);
  }

  plus(other: ExactSum): ExactSum {
    const merged: Term[] = [...this.terms];
    for (const term of other.terms) {
      const key = term.atom ? exprKey(term.atom) : "";
      const at = merged.findIndex((t) => (t.atom ? exprKey(t.atom) : "") === key);
      if (at < 0) {
        const [p, q] = reduce(term.p, term.q);
        if (p !== 0) merged.push({ ...term, p, q });
        continue;
      }
      const old = merged[at] as Term;
      const [p, q] = reduce(old.p * term.q + term.p * old.q, old.q * term.q);
      if (p === 0) merged.splice(at, 1);
      else merged[at] = { ...old, p, q };
    }
    return new ExactSum(merged);
  }

  minus(other: ExactSum): ExactSum {
    return this.plus(other.times(-1));
  }

  times(p: number, q = 1): ExactSum {
    return new ExactSum(this.terms.map((term) => ({ ...term, p: term.p * p, q: term.q * q }))).plus(ExactSum.ZERO);
  }

  /** Vero se ogni coefficiente ha numeratore e denominatore entro i limiti (e così l'argomento dei logaritmi raccolti). */
  isClean(maxInteger: number, maxDenominator: number): boolean {
    const terms = this.collectLogarithms();
    const small = (expr: Expr | null): boolean => {
      if (!expr || expr.kind !== "fn" || expr.name !== "ln" || expr.arg.kind !== "num") return true;
      return Math.abs(Number(expr.arg.value.n)) <= maxInteger && Number(expr.arg.value.d) <= maxDenominator;
    };
    return terms.every((term) => Math.abs(term.p) <= maxInteger && term.q <= maxDenominator && small(term.atom));
  }

  isZero(): boolean {
    return this.terms.length === 0;
  }

  /** Vero se la somma è un solo numero razionale. */
  isRational(): boolean {
    return this.terms.every((term) => term.atom === null);
  }

  /**
   * L'espressione scritta a mano: prima gli atomi (nell'ordine in cui sono entrati), il numero in fondo.
   * Un termine numerico negativo davanti a tutto resta davanti solo se è l'unico.
   */
  toExpr(): Expr {
    if (this.terms.length === 0) return num(0);
    const atoms = this.collectLogarithms().filter((term) => term.atom !== null);
    const numbers = this.terms.filter((term) => term.atom === null);
    // (Dopo collectLogarithms gli atomi con i logaritmi sono già raccolti.)
    // Un termine positivo per primo, se c'è: «e − 2» invece di «−2 + e».
    const ordered = [...atoms, ...numbers];
    const firstPositive = ordered.findIndex((term) => term.p > 0);
    if (firstPositive > 0) ordered.unshift(...ordered.splice(firstPositive, 1));
    return sum(...ordered.map((term) => (term.atom ? scaled(term.p, term.q, term.atom) : frac(term.p, term.q))));
  }

  /**
   * I logaritmi dei primi si ricompongono in un solo logaritmo, k·ln(N/D), se N e D restano piccoli
   * (−4 ln 3 + 8 ln 2 = 4 ln(4/3)); altrimenti restano un logaritmo per primo. L'argomento è maggiore di 1.
   */
  private collectLogarithms(): Term[] {
    const logs = this.terms.filter((term) => term.prime !== undefined);
    if (logs.length <= 1) return [...this.terms];
    const lcmOf = (a: number, b: number): number => (a / gcd(a, b)) * b;
    const L = logs.reduce((acc, term) => lcmOf(acc, term.q), 1);
    const weights = logs.map((term) => (term.p * L) / term.q);
    let g = weights.reduce((acc, w) => gcd(acc, Math.abs(w)), 0);
    let top = 1;
    let bottom = 1;
    logs.forEach((term, index) => {
      const power = (term.prime as number) ** Math.abs((weights[index] as number) / g);
      if ((weights[index] as number) > 0) top *= power;
      else bottom *= power;
    });
    if (top < bottom) {
      [top, bottom] = [bottom, top];
      g = -g;
    }
    if (top > MAX_LOG_ARGUMENT || bottom > MAX_LOG_ARGUMENT) return [...this.terms];
    const [p, q] = reduce(g, L);
    const combined: Term = { p, q, atom: ln(bottom === 1 ? num(top) : frac(top, bottom)) };
    const first = this.terms.findIndex((term) => term.prime !== undefined);
    const rest = this.terms.filter((term) => term.prime === undefined);
    rest.splice(Math.min(first, rest.length), 0, combined);
    return rest;
  }
}
