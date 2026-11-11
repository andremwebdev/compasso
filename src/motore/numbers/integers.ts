// Aritmetica sugli interi (bigint): MCD, radici intere, estrazione di potenze perfette.

import { EngineError } from "../errors";

export function absBig(a: bigint): bigint {
  return a < 0n ? -a : a;
}

/** Massimo comune divisore, sempre non negativo; gcd(0, 0) = 0. */
export function gcd(a: bigint, b: bigint): bigint {
  a = absBig(a);
  b = absBig(b);
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Minimo comune multiplo, sempre non negativo. */
export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return absBig(a / gcd(a, b) * b);
}

/** Potenza con esponente intero non negativo. */
export function powBig(base: bigint, exp: number): bigint {
  if (!Number.isInteger(exp) || exp < 0) throw new EngineError("powBig: esponente non valido.");
  return base ** BigInt(exp);
}

/** Parte intera della radice k-esima di n ≥ 0 (metodo di Newton sugli interi). */
export function iroot(n: bigint, k: number): bigint {
  if (n < 0n) throw new EngineError("iroot: radicando negativo.");
  if (!Number.isInteger(k) || k < 1) throw new EngineError("iroot: indice non valido.");
  if (n < 2n || k === 1) return n;
  const kb = BigInt(k);
  // Stima iniziale per eccesso: 2^ceil(bit/k).
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / k));
  for (;;) {
    const y = ((kb - 1n) * x + n / x ** (kb - 1n)) / kb;
    if (y >= x) return x;
    x = y;
  }
}

/** Limite oltre il quale il motore rinuncia a scomporre un intero: i numeri degli esercizi sono piccoli. */
const FACTOR_LIMIT = 10n ** 15n;

/**
 * Scrive n > 0 come outside^k · inside, con inside privo di fattori che siano potenze k-esime.
 * Esempio: extractPower(72, 2) = { outside: 6, inside: 2 }, perché 72 = 6² · 2.
 */
export function extractPower(n: bigint, k: number): { outside: bigint; inside: bigint } {
  if (n <= 0n) throw new EngineError("extractPower: serve un intero positivo.");
  if (n > FACTOR_LIMIT) throw new EngineError("Numero troppo grande per estrarre una radice esatta.");
  const kb = BigInt(k);
  let outside = 1n;
  let inside = 1n;
  let rest = n;
  // Divisione per tentativi: basta arrivare a p^(k+1) > resto, poi il resto è p^k oppure libero da potenze k-esime.
  for (let p = 2n; p ** (kb + 1n) <= rest; p += p === 2n ? 1n : 2n) {
    let count = 0n;
    while (rest % p === 0n) {
      rest /= p;
      count += 1n;
    }
    outside *= p ** (count / kb);
    inside *= p ** (count % kb);
  }
  const root = iroot(rest, k);
  if (root > 1n && root ** kb === rest) outside *= root;
  else inside *= rest;
  return { outside, inside };
}

/** Il più piccolo fattore primo di n > 1 (divisione per tentativi: solo per numeri piccoli). */
export function smallestPrimeFactor(n: bigint): bigint {
  if (n < 2n) throw new EngineError("smallestPrimeFactor: serve un intero maggiore di 1.");
  if (n > FACTOR_LIMIT) throw new EngineError("Numero troppo grande da scomporre.");
  for (let p = 2n; p * p <= n; p += p === 2n ? 1n : 2n) {
    if (n % p === 0n) return p;
  }
  return n;
}

/** Tutti i divisori positivi di n ≠ 0, in ordine crescente (solo per numeri piccoli). */
export function divisors(n: bigint): bigint[] {
  n = absBig(n);
  if (n === 0n) throw new EngineError("divisors: lo zero ha infiniti divisori.");
  if (n > 10n ** 12n) throw new EngineError("Numero troppo grande per elencarne i divisori.");
  const small: bigint[] = [];
  const large: bigint[] = [];
  for (let d = 1n; d * d <= n; d += 1n) {
    if (n % d === 0n) {
      small.push(d);
      if (d * d !== n) large.push(n / d);
    }
  }
  return [...small, ...large.reverse()];
}
