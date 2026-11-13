// Numeri esatti con radici quadrate: combinazioni a coefficienti razionali di √n, con n intero
// positivo privo di quadrati. Esempi: 3 + 2√5, √2/2, (1 + √5)/2, √2 + √3.
//
// Questi numeri formano un campo: somma, prodotto e quoziente restano della stessa forma, quindi i
// conti sono esatti e ogni numero ha una sola scrittura (forma normale). È il campo dei coefficienti
// usato dall'algebra del motore. π, e e le radici di indice superiore non stanno qui: sono «atomi»
// delle espressioni (vedi docs/ARCHITETTURA.md).

import { EngineError } from "../errors";
import { absBig, extractPower, gcd, iroot, lcm, smallestPrimeFactor } from "./integers";
import { Rational, type RationalLike } from "./rational";

export class Surd {
  /** Coppie (radicando privo di quadrati, coefficiente non nullo), in ordine crescente di radicando. Il radicando 1 è la parte razionale. */
  readonly terms: readonly (readonly [bigint, Rational])[];

  private constructor(terms: readonly (readonly [bigint, Rational])[]) {
    this.terms = terms;
  }

  static readonly ZERO = new Surd([]);
  static readonly ONE = new Surd([[1n, Rational.ONE]]);

  private static build(map: Map<bigint, Rational>): Surd {
    const terms = [...map.entries()]
      .filter(([, coefficient]) => !coefficient.isZero())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return new Surd(terms);
  }

  static from(value: Surd | RationalLike): Surd {
    if (value instanceof Surd) return value;
    const rational = Rational.from(value);
    return rational.isZero() ? Surd.ZERO : new Surd([[1n, rational]]);
  }

  /** Radice quadrata esatta di un razionale non negativo, già in forma normale: √(8/9) = (2/3)·√2. */
  static sqrt(value: RationalLike): Surd {
    const r = Rational.from(value);
    if (r.sign() < 0) throw new EngineError("Radice quadrata di un numero negativo.");
    if (r.isZero()) return Surd.ZERO;
    // √(n/d) = √(n·d)/d, poi si porta fuori dalla radice il quadrato più grande.
    const { outside, inside } = extractPower(r.n * r.d, 2);
    return new Surd([[inside, Rational.of(outside, r.d)]]);
  }

  add(other: Surd | RationalLike): Surd {
    const map = new Map(this.terms);
    for (const [radicand, coefficient] of Surd.from(other).terms) {
      map.set(radicand, (map.get(radicand) ?? Rational.ZERO).add(coefficient));
    }
    return Surd.build(map);
  }

  neg(): Surd {
    return new Surd(this.terms.map(([radicand, coefficient]) => [radicand, coefficient.neg()] as const));
  }

  sub(other: Surd | RationalLike): Surd {
    return this.add(Surd.from(other).neg());
  }

  mul(other: Surd | RationalLike): Surd {
    const o = Surd.from(other);
    const map = new Map<bigint, Rational>();
    for (const [a, ca] of this.terms) {
      for (const [b, cb] of o.terms) {
        // √a·√b = g·√(ab/g²) con g = MCD(a, b), perché a e b sono privi di quadrati.
        const g = gcd(a, b);
        const radicand = (a / g) * (b / g);
        map.set(radicand, (map.get(radicand) ?? Rational.ZERO).add(ca.mul(cb).mul(g)));
      }
    }
    return Surd.build(map);
  }

  /**
   * Reciproco esatto. Si sceglie un primo p che divide un radicando e si moltiplica per il
   * «coniugato» (segno cambiato ai termini con radicando multiplo di p): il prodotto non contiene
   * più p sotto radice. Ripetendo si arriva a un razionale. Con a + b√n è la solita razionalizzazione.
   */
  inv(): Surd {
    if (this.isZero()) throw new EngineError("Lo zero non ha reciproco.");
    const irrational = this.terms.find(([radicand]) => radicand !== 1n);
    if (!irrational) return Surd.from(this.toRational().inv());
    const p = smallestPrimeFactor(irrational[0]);
    const conjugate = new Surd(
      this.terms.map(([radicand, coefficient]) => [radicand, radicand % p === 0n ? coefficient.neg() : coefficient] as const),
    );
    return conjugate.mul(this.mul(conjugate).inv());
  }

  div(other: Surd | RationalLike): Surd {
    return this.mul(Surd.from(other).inv());
  }

  /** Potenza con esponente intero (anche negativo). */
  pow(exp: number): Surd {
    if (!Number.isInteger(exp)) throw new EngineError("Surd.pow: l'esponente deve essere intero.");
    if (exp < 0) return this.inv().pow(-exp);
    let result: Surd = Surd.ONE;
    let base: Surd = this;
    for (let e = exp; e > 0; e = Math.floor(e / 2)) {
      if (e % 2 === 1) result = result.mul(base);
      base = base.mul(base);
    }
    return result;
  }

  isZero(): boolean {
    return this.terms.length === 0;
  }

  isRational(): boolean {
    return this.terms.every(([radicand]) => radicand === 1n);
  }

  /** Il valore come razionale; errore se contiene radici. */
  toRational(): Rational {
    if (!this.isRational()) throw new EngineError("Il numero contiene radici: non è razionale.");
    return this.terms[0]?.[1] ?? Rational.ZERO;
  }

  /** La forma normale è unica: due numeri sono uguali se e solo se hanno gli stessi termini. */
  eq(other: Surd | RationalLike): boolean {
    const o = Surd.from(other);
    return (
      this.terms.length === o.terms.length &&
      this.terms.every(([radicand, coefficient], index) => {
        const term = o.terms[index];
        return term !== undefined && term[0] === radicand && term[1].eq(coefficient);
      })
    );
  }

  /** Valore approssimato (solo per confronti numerici e grafici). */
  toNumber(): number {
    return this.terms.reduce((sum, [radicand, coefficient]) => sum + coefficient.toNumber() * Math.sqrt(Number(radicand)), 0);
  }

  /** Segno esatto: −1, 0 oppure 1. */
  sign(): -1 | 0 | 1 {
    if (this.isZero()) return 0;
    const approx = this.toNumber();
    const scale = this.terms.reduce((sum, [radicand, coefficient]) => sum + Math.abs(coefficient.toNumber()) * Math.sqrt(Number(radicand)), 0);
    if (Math.abs(approx) > 1e-9 * scale) return approx > 0 ? 1 : -1;
    // Cancellazione quasi totale: si rifà il conto con radici intere esatte, raddoppiando le cifre
    // finché il totale supera l'errore possibile (ogni radice intera sbaglia per meno di 1).
    // Finisce sempre: la forma normale è unica, quindi un numero con dei termini non è zero.
    const common = this.terms.reduce((acc, [, coefficient]) => lcm(acc, coefficient.d), 1n);
    for (let digits = 40; ; digits *= 2) {
      const scale = 10n ** BigInt(digits);
      let total = 0n;
      let slack = 0n;
      for (const [radicand, coefficient] of this.terms) {
        const weight = (coefficient.n * common) / coefficient.d;
        total += weight * iroot(radicand * scale * scale, 2);
        slack += absBig(weight);
      }
      if (absBig(total) > slack) return total > 0n ? 1 : -1;
    }
  }

  /** Confronto esatto con un altro numero. */
  cmp(other: Surd | RationalLike): number {
    return this.sub(other).sign();
  }

  /** Scrittura leggibile, per messaggi di errore e test: "3 + 2√5", "1/2·√2". */
  toString(): string {
    if (this.isZero()) return "0";
    return this.terms
      .map(([radicand, coefficient]) => (radicand === 1n ? coefficient.toString() : `${coefficient}·√${radicand}`))
      .join(" + ");
  }
}
