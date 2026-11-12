// Numeri complessi esatti: parte reale e parte immaginaria sono numeri con radici quadrate (Surd).
// Qui ci sono anche gli angoli notevoli: seno e coseno esatti dei multipli di π/12, che permettono
// di passare tra forma algebrica e forme trigonometrica ed esponenziale senza approssimazioni.

import { EngineError } from "../errors";
import { Rational, type RationalLike } from "./rational";
import { Surd } from "./surd";

export class Complex {
  constructor(
    readonly re: Surd,
    readonly im: Surd,
  ) {}

  static readonly ZERO = new Complex(Surd.ZERO, Surd.ZERO);
  static readonly ONE = new Complex(Surd.ONE, Surd.ZERO);
  static readonly I = new Complex(Surd.ZERO, Surd.ONE);

  /** Complex.of(1, 2) è 1 + 2i. */
  static of(re: Surd | RationalLike, im: Surd | RationalLike = 0): Complex {
    return new Complex(Surd.from(re), Surd.from(im));
  }

  add(other: Complex): Complex {
    return new Complex(this.re.add(other.re), this.im.add(other.im));
  }

  sub(other: Complex): Complex {
    return new Complex(this.re.sub(other.re), this.im.sub(other.im));
  }

  neg(): Complex {
    return new Complex(this.re.neg(), this.im.neg());
  }

  mul(other: Complex): Complex {
    return new Complex(this.re.mul(other.re).sub(this.im.mul(other.im)), this.re.mul(other.im).add(this.im.mul(other.re)));
  }

  /** Coniugato: a − bi. */
  conj(): Complex {
    return new Complex(this.re, this.im.neg());
  }

  /** Quadrato del modulo: a² + b². */
  norm(): Surd {
    return this.re.mul(this.re).add(this.im.mul(this.im));
  }

  inv(): Complex {
    if (this.isZero()) throw new EngineError("Lo zero non ha reciproco.");
    const scale = this.norm().inv();
    return new Complex(this.re.mul(scale), this.im.neg().mul(scale));
  }

  div(other: Complex): Complex {
    return this.mul(other.inv());
  }

  /** Potenza con esponente intero (anche negativo). */
  pow(exp: number): Complex {
    if (!Number.isInteger(exp)) throw new EngineError("Complex.pow: l'esponente deve essere intero.");
    if (exp < 0) return this.inv().pow(-exp);
    let result: Complex = Complex.ONE;
    let base: Complex = this;
    for (let e = exp; e > 0; e = Math.floor(e / 2)) {
      if (e % 2 === 1) result = result.mul(base);
      base = base.mul(base);
    }
    return result;
  }

  eq(other: Complex): boolean {
    return this.re.eq(other.re) && this.im.eq(other.im);
  }

  isZero(): boolean {
    return this.re.isZero() && this.im.isZero();
  }

  isReal(): boolean {
    return this.im.isZero();
  }

  /** Il modulo, se è un numero con radici quadrate (cioè se a² + b² è razionale); altrimenti null. */
  modulus(): Surd | null {
    const norm = this.norm();
    return norm.isRational() ? Surd.sqrt(norm.toRational()) : null;
  }

  toString(): string {
    return `(${this.re.toString()}) + (${this.im.toString()})i`;
  }
}

// ───────────────────────────── angoli notevoli ─────────────────────────────

/** cos(kπ/12) + i·sin(kπ/12) per k = 0…23, calcolati una volta sola come potenze del primo. */
let unitTable: readonly Complex[] | undefined;

function units(): readonly Complex[] {
  if (!unitTable) {
    // cos 15° = (√6 + √2)/4, sin 15° = (√6 − √2)/4.
    const quarter = Rational.of(1, 4);
    const sqrt6 = Surd.sqrt(6).mul(quarter);
    const sqrt2 = Surd.sqrt(2).mul(quarter);
    const first = new Complex(sqrt6.add(sqrt2), sqrt6.sub(sqrt2));
    const table: Complex[] = [Complex.ONE];
    for (let k = 1; k < 24; k++) table.push((table[k - 1] as Complex).mul(first));
    unitTable = table;
  }
  return unitTable;
}

/** Un angolo è un multiplo razionale di π: il razionale q sta per l'angolo qπ. Qui lo si riporta in (−π, π]. */
export function normalizeAngle(angle: Rational): Rational {
  // Parte frazionaria di (q + 1)/2 in [0, 1), poi si torna indietro: il risultato è in [−1, 1).
  const half = angle.add(1).div(2);
  const floor = half.n >= 0n ? half.n / half.d : -((-half.n + half.d - 1n) / half.d);
  const reduced = half.sub(Rational.of(floor)).mul(2).sub(1);
  return reduced.eq(-1) ? Rational.ONE : reduced;
}

/** cos(qπ) + i·sin(qπ) esatto, se l'angolo è un multiplo di π/12; altrimenti null. */
export function notableUnit(angle: Rational): Complex | null {
  if (12n % angle.d !== 0n) return null;
  const twelfths = Number(normalizeAngle(angle).mul(12).n);
  return units()[((twelfths % 24) + 24) % 24] as Complex;
}

/**
 * L'argomento principale di z, come multiplo razionale di π in (−π, π], se è un angolo notevole
 * (multiplo di π/12); null per lo zero e per gli altri angoli.
 */
export function argumentOf(z: Complex): Rational | null {
  if (z.isZero()) return null;
  const table = units();
  for (let k = 0; k < 24; k++) {
    const unit = table[k] as Complex;
    // Stessa direzione: prodotto vettoriale nullo e prodotto scalare positivo.
    const cross = z.re.mul(unit.im).sub(z.im.mul(unit.re));
    if (cross.isZero() && z.re.mul(unit.re).add(z.im.mul(unit.im)).sign() > 0) return normalizeAngle(Rational.of(k, 12));
  }
  return null;
}

/** Il numero di modulo e argomento dati (argomento multiplo di π/12), in forma algebrica esatta. */
export function fromPolar(modulus: Surd | RationalLike, angle: Rational): Complex {
  const unit = notableUnit(angle);
  if (!unit) throw new EngineError("fromPolar: l'angolo deve essere un multiplo di π/12.");
  const rho = Surd.from(modulus);
  if (rho.sign() < 0) throw new EngineError("fromPolar: il modulo non può essere negativo.");
  return new Complex(unit.re.mul(rho), unit.im.mul(rho));
}
