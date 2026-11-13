import { describe, expect, it } from "vitest";
import { divisors, extractPower, gcd, iroot, lcm, smallestPrimeFactor } from "../../src/motore/numbers/integers";
import { Rational } from "../../src/motore/numbers/rational";
import { Surd } from "../../src/motore/numbers/surd";

const q = (n: number, d = 1) => Rational.of(n, d);

describe("interi", () => {
  it("MCD e mcm", () => {
    expect(gcd(12n, -18n)).toBe(6n);
    expect(gcd(0n, 5n)).toBe(5n);
    expect(lcm(4n, 6n)).toBe(12n);
  });

  it("radici intere", () => {
    expect(iroot(0n, 2)).toBe(0n);
    expect(iroot(99n, 2)).toBe(9n);
    expect(iroot(100n, 2)).toBe(10n);
    expect(iroot(26n, 3)).toBe(2n);
    expect(iroot(27n, 3)).toBe(3n);
    expect(iroot(10n ** 40n, 2)).toBe(10n ** 20n);
    for (let n = 0n; n < 500n; n++) {
      const r = iroot(n, 2);
      expect(r * r <= n && (r + 1n) * (r + 1n) > n).toBe(true);
    }
  });

  it("porta fuori le potenze perfette", () => {
    expect(extractPower(72n, 2)).toEqual({ outside: 6n, inside: 2n });
    expect(extractPower(49n, 2)).toEqual({ outside: 7n, inside: 1n });
    expect(extractPower(54n, 3)).toEqual({ outside: 3n, inside: 2n });
    expect(extractPower(97n, 2)).toEqual({ outside: 1n, inside: 97n });
    for (let n = 1n; n < 2000n; n++) {
      const { outside, inside } = extractPower(n, 2);
      expect(outside * outside * inside).toBe(n);
      expect(extractPower(inside, 2).outside).toBe(1n);
    }
  });

  it("fattori primi e divisori", () => {
    expect(smallestPrimeFactor(91n)).toBe(7n);
    expect(smallestPrimeFactor(97n)).toBe(97n);
    expect(divisors(12n)).toEqual([1n, 2n, 3n, 4n, 6n, 12n]);
  });
});

describe("razionali", () => {
  it("riduce sempre e tiene il segno al numeratore", () => {
    const r = Rational.of(6, -8);
    expect(r.n).toBe(-3n);
    expect(r.d).toBe(4n);
    expect(Rational.of(0, 5).eq(Rational.ZERO)).toBe(true);
  });

  it("operazioni esatte", () => {
    expect(q(1, 2).add(q(1, 3)).eq(q(5, 6))).toBe(true);
    expect(q(1, 2).sub(q(1, 3)).eq(q(1, 6))).toBe(true);
    expect(q(2, 3).mul(q(3, 4)).eq(q(1, 2))).toBe(true);
    expect(q(2, 3).div(q(4, 9)).eq(q(3, 2))).toBe(true);
    expect(q(2, 3).pow(-2).eq(q(9, 4))).toBe(true);
    expect(q(-2, 3).pow(3).eq(q(-8, 27))).toBe(true);
    // 0,1 + 0,2 = 0,3 esattamente (con i numeri in virgola mobile non è vero).
    expect(q(1, 10).add(q(2, 10)).eq(q(3, 10))).toBe(true);
  });

  it("rifiuta le divisioni per zero e i non interi", () => {
    expect(() => Rational.of(1, 0)).toThrow();
    expect(() => q(1).div(0)).toThrow();
    expect(() => Rational.of(0.5)).toThrow();
  });

  it("confronta", () => {
    expect(q(1, 3).cmp(q(1, 2))).toBeLessThan(0);
    expect(q(-1, 2).sign()).toBe(-1);
    expect(q(7, 7).isInteger()).toBe(true);
  });

  it("legge e scrive i decimali con la virgola", () => {
    expect(Rational.parseDecimal("1,5")).toEqual({ value: q(3, 2), decimals: 1 });
    expect(Rational.parseDecimal("0.250")).toEqual({ value: q(1, 4), decimals: 3 });
    expect(Rational.parseDecimal("12").decimals).toBe(0);
    expect(q(3, 2).toDecimalString(2)).toBe("1,50");
    expect(q(-1, 8).toDecimalString(3)).toBe("-0,125");
    expect(() => Rational.parseDecimal("1,2,3")).toThrow();
  });

  it("non perde precisione con numeri enormi", () => {
    const big = Rational.of(10n ** 40n + 1n, 10n ** 40n);
    expect(big.sub(1).eq(Rational.of(1n, 10n ** 40n))).toBe(true);
  });
});

describe("numeri con radici quadrate", () => {
  const sqrt = (n: number, d = 1) => Surd.sqrt(q(n, d));

  it("forma normale delle radici", () => {
    expect(sqrt(8).eq(sqrt(2).mul(2))).toBe(true);
    expect(sqrt(9).eq(3)).toBe(true);
    expect(sqrt(1, 2).eq(sqrt(2).div(2))).toBe(true);
    expect(sqrt(8, 9).toString()).toBe("2/3·√2");
    expect(sqrt(0).isZero()).toBe(true);
    expect(() => sqrt(-1)).toThrow();
  });

  it("prodotti e potenze esatti", () => {
    expect(sqrt(2).mul(sqrt(2)).eq(2)).toBe(true);
    expect(sqrt(2).mul(sqrt(3)).eq(sqrt(6))).toBe(true);
    expect(sqrt(6).mul(sqrt(10)).eq(sqrt(15).mul(2))).toBe(true);
    // (3 + 2√5)² = 29 + 12√5
    const a = Surd.from(3).add(sqrt(5).mul(2));
    expect(a.pow(2).eq(Surd.from(29).add(sqrt(5).mul(12)))).toBe(true);
    // (1 + √2)(1 − √2) = −1
    expect(Surd.ONE.add(sqrt(2)).mul(Surd.ONE.sub(sqrt(2))).eq(-1)).toBe(true);
  });

  it("razionalizza i reciproci", () => {
    // 1/√2 = √2/2
    expect(sqrt(2).inv().eq(sqrt(2).div(2))).toBe(true);
    // 1/(√3 + √2) = √3 − √2
    expect(sqrt(3).add(sqrt(2)).inv().eq(sqrt(3).sub(sqrt(2)))).toBe(true);
    // Reciproco con tre radici: x · (1/x) = 1
    const x = Surd.ONE.add(sqrt(2)).add(sqrt(3)).add(sqrt(5).mul(q(1, 2)));
    expect(x.mul(x.inv()).eq(1)).toBe(true);
    const y = sqrt(6).add(sqrt(10)).sub(sqrt(15)).add(q(2, 7));
    expect(y.div(y).eq(1)).toBe(true);
    expect(() => Surd.ZERO.inv()).toThrow();
  });

  it("la sezione aurea risolve x² − x − 1 = 0", () => {
    const phi = Surd.ONE.add(sqrt(5)).div(2);
    expect(phi.pow(2).sub(phi).sub(1).isZero()).toBe(true);
    expect(phi.toNumber()).toBeCloseTo(1.6180339887, 9);
  });

  it("segno esatto anche con cancellazioni quasi totali", () => {
    expect(sqrt(2).sub(q(141, 100)).sign()).toBe(1);
    expect(sqrt(2).sub(q(142, 100)).sign()).toBe(-1);
    // √2 − 1,41421356237309504880 è positivo ma minuscolo: i numeri in virgola mobile non lo vedono.
    const close = Rational.of(141421356237309504880n, 10n ** 20n);
    expect(sqrt(2).sub(close).sign()).toBe(1);
    expect(sqrt(2).sub(close.add(Rational.of(1n, 10n ** 20n))).sign()).toBe(-1);
    expect(sqrt(3).cmp(sqrt(2))).toBe(1);
  });

  it("riconosce i razionali", () => {
    expect(sqrt(2).isRational()).toBe(false);
    expect(sqrt(2).mul(sqrt(8)).toRational().eq(4)).toBe(true);
    expect(() => sqrt(2).toRational()).toThrow();
  });
});

describe("revisione 4a: segno esatto dei numeri con radici quando i termini si cancellano quasi del tutto", () => {
  it("decide il segno anche quando servono molte più di 40 cifre", () => {
    // (√2 − 1)^k è positivo ma piccolissimo: per k = 150 vale circa 10^(−57).
    const tiny = Surd.sqrt(2).sub(1).pow(150);
    expect(tiny.isRational()).toBe(false);
    expect(tiny.sign()).toBe(1);
    expect(tiny.neg().sign()).toBe(-1);
    expect(tiny.cmp(0)).toBe(1);
    // (√3 − √2)^k, con due radici diverse.
    const other = Surd.sqrt(3).sub(Surd.sqrt(2)).pow(121);
    expect(other.sign()).toBe(1);
    expect(other.neg().sign()).toBe(-1);
    // Con 40 cifre fisse questi uscivano negativi: (√5 − 2)^k per k dispari da 91 in su.
    for (let k = 91; k <= 131; k += 10) {
      const power = Surd.sqrt(5).sub(2).pow(k);
      expect(power.sign(), `(√5 − 2)^${k}`).toBe(1);
      expect(power.neg().sign(), `−(√5 − 2)^${k}`).toBe(-1);
    }
  });

  it("il confronto resta coerente: a < b se e solo se b − a è positivo", () => {
    const a = Surd.sqrt(2).sub(1).pow(151);
    const b = Surd.sqrt(2).sub(1).pow(150);
    expect(a.cmp(b)).toBe(-1);
    expect(b.cmp(a)).toBe(1);
    expect(a.cmp(a)).toBe(0);
  });
});
