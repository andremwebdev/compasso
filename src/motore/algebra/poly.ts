// Forma normale delle espressioni: polinomi in più «atomi» con coefficienti esatti, e loro quozienti.
//
// Un atomo è qualunque cosa il motore tratta come un'indeterminata: una variabile (x), una costante
// trascendente (π, e), l'unità immaginaria, oppure un'intera sottoespressione non polinomiale
// (sin(x), ln(x+1), ∛2, √(x+1)), identificata dalla sua chiave canonica. I coefficienti sono numeri
// con radici quadrate (Surd), che formano un campo: così 1/(1+√2) e √2−1 hanno la stessa forma normale.
//
// Alcuni atomi hanno una regola di riduzione: i² = −1, (√(x+1))² = x+1, |x|² = x², (∛2)³ = 2.
// Due espressioni polinomiali uguali hanno sempre la stessa forma normale: il confronto è esatto.

import { EngineError } from "../errors";
import type { Expr } from "../expr/types";
import { Surd } from "../numbers/surd";

/** Lanciato quando una forma normale diventa troppo grande: chi lo riceve ripiega sul confronto numerico. */
export class ComplexityError extends EngineError {
  constructor() {
    super("Espressione troppo complessa per il confronto esatto.");
    this.name = "ComplexityError";
  }
}

const TERM_LIMIT = 800;
const POWER_LIMIT = 200;

/** Prodotto di potenze di atomi: coppie (chiave dell'atomo, esponente ≥ 1), ordinate per chiave. */
export type Monomial = readonly (readonly [string, number])[];

export interface Term {
  readonly mono: Monomial;
  readonly coeff: Surd;
}

export interface AtomDef {
  readonly key: string;
  /** Un'espressione che rappresenta l'atomo (serve per ricostruire espressioni dalla forma normale). */
  readonly expr: Expr;
  /**
   * Vero per variabili, π, e, i: tra questi atomi non ci sono identità nascoste, quindi due forme
   * normali diverse significano espressioni davvero diverse. Falso per sin(x), ln(x), radici…
   */
  readonly independent: boolean;
  /** Regola di riduzione: atomo^power = value. */
  readonly reduce?: { readonly power: number; readonly value: Poly };
}

/** L'insieme degli atomi incontrati durante una normalizzazione. Forme normali dello stesso contesto si possono combinare. */
export class NormalContext {
  readonly atoms = new Map<string, AtomDef>();
  private hasReductions = false;

  /** Registra un atomo (se non c'è già) e restituisce il polinomio che lo rappresenta. */
  atom(def: AtomDef): Poly {
    if (!this.atoms.has(def.key)) {
      this.atoms.set(def.key, def);
      if (def.reduce) this.hasReductions = true;
    }
    return Poly.term([[def.key, 1]], Surd.ONE);
  }

  /** Applica le regole di riduzione a un termine; il risultato in generale è un polinomio. */
  reduceTerm(mono: Monomial, coeff: Surd): Poly {
    if (this.hasReductions) {
      for (let index = 0; index < mono.length; index++) {
        const [key, exp] = mono[index] as readonly [string, number];
        const rule = this.atoms.get(key)?.reduce;
        if (rule && exp >= rule.power) {
          const rest: (readonly [string, number])[] = [...mono.slice(0, index)];
          if (exp % rule.power > 0) rest.push([key, exp % rule.power]);
          rest.push(...mono.slice(index + 1));
          return Poly.term(rest, coeff).mul(rule.value.pow(Math.floor(exp / rule.power), this), this);
        }
      }
    }
    return Poly.term(mono, coeff);
  }
}

export function monomialKey(mono: Monomial): string {
  return mono.map(([key, exp]) => (exp === 1 ? key : `${key}^${exp}`)).join("*");
}

function multiplyMonomials(a: Monomial, b: Monomial): Monomial {
  const result: (readonly [string, number])[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const x = a[i];
    const y = b[j];
    if (y === undefined || (x !== undefined && x[0] < y[0])) {
      result.push(x as readonly [string, number]);
      i += 1;
    } else if (x === undefined || y[0] < x[0]) {
      result.push(y);
      j += 1;
    } else {
      result.push([x[0], x[1] + y[1]]);
      i += 1;
      j += 1;
    }
  }
  return result;
}

export class Poly {
  /** Termini indicizzati dalla chiave del monomio; nessun coefficiente è zero. */
  readonly terms: ReadonlyMap<string, Term>;
  private cachedKey: string | undefined;

  private constructor(terms: ReadonlyMap<string, Term>) {
    this.terms = terms;
  }

  static readonly ZERO = new Poly(new Map());
  static readonly ONE = Poly.constant(Surd.ONE);

  static constant(value: Surd): Poly {
    return Poly.term([], value);
  }

  static term(mono: Monomial, coeff: Surd): Poly {
    return coeff.isZero() ? Poly.ZERO : new Poly(new Map([[monomialKey(mono), { mono, coeff }]]));
  }

  private static collect(pieces: Iterable<Term>): Poly {
    const map = new Map<string, Term>();
    for (const { mono, coeff } of pieces) {
      const key = monomialKey(mono);
      const existing = map.get(key);
      const sum = existing ? existing.coeff.add(coeff) : coeff;
      if (sum.isZero()) map.delete(key);
      else map.set(key, { mono, coeff: sum });
    }
    if (map.size > TERM_LIMIT) throw new ComplexityError();
    return new Poly(map);
  }

  add(other: Poly): Poly {
    return Poly.collect([...this.terms.values(), ...other.terms.values()]);
  }

  neg(): Poly {
    return this.scale(Surd.from(-1));
  }

  sub(other: Poly): Poly {
    return this.add(other.neg());
  }

  scale(factor: Surd): Poly {
    if (factor.isZero()) return Poly.ZERO;
    return Poly.collect([...this.terms.values()].map(({ mono, coeff }) => ({ mono, coeff: coeff.mul(factor) })));
  }

  mul(other: Poly, ctx: NormalContext): Poly {
    if (this.terms.size * other.terms.size > TERM_LIMIT * 8) throw new ComplexityError();
    const pieces: Term[] = [];
    for (const a of this.terms.values()) {
      for (const b of other.terms.values()) {
        pieces.push(...ctx.reduceTerm(multiplyMonomials(a.mono, b.mono), a.coeff.mul(b.coeff)).terms.values());
      }
    }
    return Poly.collect(pieces);
  }

  /** Potenza con esponente intero non negativo. */
  pow(exp: number, ctx: NormalContext): Poly {
    if (!Number.isInteger(exp) || exp < 0) throw new EngineError("Poly.pow: esponente non valido.");
    if (exp > POWER_LIMIT) throw new ComplexityError();
    let result: Poly = Poly.ONE;
    let base: Poly = this;
    for (let e = exp; e > 0; e = Math.floor(e / 2)) {
      if (e % 2 === 1) result = result.mul(base, ctx);
      if (e > 1) base = base.mul(base, ctx);
    }
    return result;
  }

  isZero(): boolean {
    return this.terms.size === 0;
  }

  /** Il valore, se il polinomio è una costante numerica; altrimenti null. */
  constant(): Surd | null {
    if (this.terms.size === 0) return Surd.ZERO;
    if (this.terms.size > 1) return null;
    return this.terms.get("")?.coeff ?? null;
  }

  /** I termini in ordine canonico (per chiave del monomio). */
  sortedTerms(): Term[] {
    return [...this.terms.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, term]) => term);
  }

  /** Chiave canonica: due polinomi sono uguali se e solo se hanno la stessa chiave. */
  key(): string {
    if (this.cachedKey === undefined) {
      this.cachedKey =
        this.terms.size === 0
          ? "0"
          : this.sortedTerms()
              .map(({ mono, coeff }) => (mono.length === 0 ? `[${coeff}]` : `[${coeff}]${monomialKey(mono)}`))
              .join("+");
    }
    return this.cachedKey;
  }

  equals(other: Poly): boolean {
    return this.key() === other.key();
  }

  /** Le chiavi degli atomi che compaiono. */
  atomKeys(): Set<string> {
    const keys = new Set<string>();
    for (const { mono } of this.terms.values()) for (const [key] of mono) keys.add(key);
    return keys;
  }

  /** Grado totale (0 per le costanti e per il polinomio nullo). */
  totalDegree(): number {
    let degree = 0;
    for (const { mono } of this.terms.values()) {
      degree = Math.max(degree, mono.reduce((sum, [, exp]) => sum + exp, 0));
    }
    return degree;
  }
}

/** Quoziente di due polinomi. Non è ridotto ai minimi termini: per l'uguaglianza si usa il prodotto in croce. */
export class Ratio {
  private constructor(
    readonly num: Poly,
    readonly den: Poly,
  ) {}

  static readonly ZERO = new Ratio(Poly.ZERO, Poly.ONE);
  static readonly ONE = new Ratio(Poly.ONE, Poly.ONE);

  static fromPoly(poly: Poly): Ratio {
    return new Ratio(poly, Poly.ONE);
  }

  static constant(value: Surd): Ratio {
    return new Ratio(Poly.constant(value), Poly.ONE);
  }

  /** Costruisce num/den con le semplificazioni a costo zero: denominatore costante o monomio, parti uguali. */
  static of(num: Poly, den: Poly): Ratio {
    if (den.isZero()) throw new EngineError("Divisione per zero.");
    if (num.isZero()) return Ratio.ZERO;
    const denConstant = den.constant();
    if (denConstant) return new Ratio(num.scale(denConstant.inv()), Poly.ONE);
    if (num.equals(den)) return Ratio.ONE;

    const denTerms = den.sortedTerms();
    const lead = (denTerms[0] as Term).coeff.inv();
    if (denTerms.length === 1) {
      // Denominatore monomio: si semplificano le potenze comuni a tutti i termini del numeratore.
      const denMono = (denTerms[0] as Term).mono;
      const common = denMono
        .map(([key, exp]) => {
          let shared = exp;
          for (const { mono } of num.terms.values()) {
            shared = Math.min(shared, mono.find(([k]) => k === key)?.[1] ?? 0);
          }
          return [key, shared] as const;
        })
        .filter(([, exp]) => exp > 0);
      const strip = (mono: Monomial): Monomial =>
        mono
          .map(([key, exp]) => [key, exp - (common.find(([k]) => k === key)?.[1] ?? 0)] as const)
          .filter(([, exp]) => exp > 0);
      const newNum = [...num.terms.values()].reduce((sum, { mono, coeff }) => sum.add(Poly.term(strip(mono), coeff.mul(lead))), Poly.ZERO);
      const newDen = Poly.term(strip(denMono), Surd.ONE);
      return newDen.constant() ? new Ratio(newNum, Poly.ONE) : new Ratio(newNum, newDen);
    }
    // Denominatore con primo coefficiente 1, così la chiave è canonica rispetto ai fattori numerici.
    return new Ratio(num.scale(lead), den.scale(lead));
  }

  isPoly(): boolean {
    return this.den.constant() !== null;
  }

  /** Il valore, se è una costante numerica; altrimenti null. */
  constant(): Surd | null {
    return this.isPoly() ? this.num.constant() : null;
  }

  add(other: Ratio, ctx: NormalContext): Ratio {
    if (this.den.equals(other.den)) return Ratio.of(this.num.add(other.num), this.den);
    return Ratio.of(this.num.mul(other.den, ctx).add(other.num.mul(this.den, ctx)), this.den.mul(other.den, ctx));
  }

  neg(): Ratio {
    return new Ratio(this.num.neg(), this.den);
  }

  sub(other: Ratio, ctx: NormalContext): Ratio {
    return this.add(other.neg(), ctx);
  }

  mul(other: Ratio, ctx: NormalContext): Ratio {
    return Ratio.of(this.num.mul(other.num, ctx), this.den.mul(other.den, ctx));
  }

  inv(): Ratio {
    return Ratio.of(this.den, this.num);
  }

  div(other: Ratio, ctx: NormalContext): Ratio {
    return this.mul(other.inv(), ctx);
  }

  /** Potenza con esponente intero, anche negativo. */
  pow(exp: number, ctx: NormalContext): Ratio {
    if (exp < 0) return this.inv().pow(-exp, ctx);
    return Ratio.of(this.num.pow(exp, ctx), this.den.pow(exp, ctx));
  }

  key(): string {
    return this.isPoly() ? this.num.key() : `(${this.num.key()})/(${this.den.key()})`;
  }

  /** Vero se il primo coefficiente del numeratore (in ordine canonico) è negativo. */
  leadingSignNegative(): boolean {
    const first = this.num.sortedTerms()[0];
    return first !== undefined && first.coeff.sign() < 0;
  }
}
