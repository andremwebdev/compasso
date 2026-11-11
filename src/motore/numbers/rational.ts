// Numeri razionali esatti: frazioni di interi (bigint), sempre ridotte e con denominatore positivo.

import { EngineError } from "../errors";
import { absBig, gcd } from "./integers";

export type RationalLike = Rational | bigint | number;

export class Rational {
  /** Numeratore (porta il segno). */
  readonly n: bigint;
  /** Denominatore, sempre positivo. */
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    this.n = n;
    this.d = d;
  }

  static readonly ZERO = new Rational(0n, 1n);
  static readonly ONE = new Rational(1n, 1n);

  /** Costruisce n/d ridotta. I numeri JavaScript devono essere interi sicuri. */
  static of(n: bigint | number, d: bigint | number = 1n): Rational {
    const num = toBig(n);
    const den = toBig(d);
    if (den === 0n) throw new EngineError("Frazione con denominatore zero.");
    const g = gcd(num, den);
    const sign = den < 0n ? -1n : 1n;
    return new Rational((sign * num) / g, (sign * den) / g);
  }

  static from(value: RationalLike): Rational {
    return value instanceof Rational ? value : Rational.of(value);
  }

  /**
   * Legge un decimale scritto con virgola o punto ("1,5", "0.25", "12") come frazione esatta.
   * Restituisce anche quante cifre decimali erano scritte.
   */
  static parseDecimal(text: string): { value: Rational; decimals: number } {
    const match = /^(\d*)(?:[.,](\d+))?$/.exec(text);
    if (!match || (match[1] === "" && match[2] === undefined)) {
      throw new EngineError(`Numero non valido: «${text}».`);
    }
    const fraction = match[2] ?? "";
    const digits = (match[1] ?? "") + fraction;
    return { value: Rational.of(BigInt(digits), 10n ** BigInt(fraction.length)), decimals: fraction.length };
  }

  add(other: RationalLike): Rational {
    const o = Rational.from(other);
    return Rational.of(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(other: RationalLike): Rational {
    const o = Rational.from(other);
    return Rational.of(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(other: RationalLike): Rational {
    const o = Rational.from(other);
    return Rational.of(this.n * o.n, this.d * o.d);
  }

  div(other: RationalLike): Rational {
    const o = Rational.from(other);
    if (o.n === 0n) throw new EngineError("Divisione per zero.");
    return Rational.of(this.n * o.d, this.d * o.n);
  }

  neg(): Rational {
    return new Rational(-this.n, this.d);
  }

  abs(): Rational {
    return new Rational(absBig(this.n), this.d);
  }

  inv(): Rational {
    if (this.n === 0n) throw new EngineError("Lo zero non ha reciproco.");
    return Rational.of(this.d, this.n);
  }

  /** Potenza con esponente intero (anche negativo). */
  pow(exp: number): Rational {
    if (!Number.isInteger(exp)) throw new EngineError("Rational.pow: l'esponente deve essere intero.");
    if (exp < 0) return this.inv().pow(-exp);
    const e = BigInt(exp);
    return new Rational(this.n ** e, this.d ** e);
  }

  /** −1, 0 oppure 1. */
  sign(): -1 | 0 | 1 {
    return this.n === 0n ? 0 : this.n < 0n ? -1 : 1;
  }

  /** Confronto: negativo se this < other, zero se uguali, positivo se this > other. */
  cmp(other: RationalLike): number {
    const o = Rational.from(other);
    const diff = this.n * o.d - o.n * this.d;
    return diff === 0n ? 0 : diff < 0n ? -1 : 1;
  }

  eq(other: RationalLike): boolean {
    const o = Rational.from(other);
    return this.n === o.n && this.d === o.d;
  }

  isZero(): boolean {
    return this.n === 0n;
  }

  isInteger(): boolean {
    return this.d === 1n;
  }

  /** Valore approssimato (solo per confronti numerici e grafici, mai per i risultati). */
  toNumber(): number {
    const direct = Number(this.n) / Number(this.d);
    if (Number.isFinite(direct)) return direct;
    // Numeratore o denominatore oltre la portata dei numeri in virgola mobile: divisione in scala.
    const scale = 10n ** 30n;
    return Number((this.n * scale) / this.d) / 1e30;
  }

  /** L'intero come numero JavaScript; errore se non è un intero sicuro. */
  toInteger(): number {
    if (this.d !== 1n) throw new EngineError(`${this.toString()} non è un intero.`);
    const value = Number(this.n);
    if (!Number.isSafeInteger(value)) throw new EngineError("Intero troppo grande.");
    return value;
  }

  /** Scrittura decimale con esattamente `decimals` cifre dopo la virgola (troncata, non arrotondata). */
  toDecimalString(decimals: number, separator = ","): string {
    const scaled = (absBig(this.n) * 10n ** BigInt(decimals)) / this.d;
    const digits = scaled.toString().padStart(decimals + 1, "0");
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = decimals > 0 ? separator + digits.slice(digits.length - decimals) : "";
    return (this.n < 0n ? "-" : "") + whole + fraction;
  }

  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }
}

function toBig(value: bigint | number): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) throw new EngineError(`Non è un intero esatto: ${value}.`);
  return BigInt(value);
}
