// Numeri primi e scomposizioni per i generatori di aritmetica (V1.M02): numeri piccoli, conti con `number`.

/** Una potenza di un primo nella scomposizione: [primo, esponente]. */
export type PrimePower = readonly [prime: number, exp: number];

/** Vero se n è primo (prova dei divisori fino alla radice). */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** La scomposizione in fattori primi di n ≥ 2, per primi crescenti. */
export function factorize(n: number): PrimePower[] {
  const out: PrimePower[] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p++) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e++;
    }
    if (e > 0) out.push([p, e]);
  }
  if (rest > 1) out.push([rest, 1]);
  return out;
}

/** Il prodotto delle potenze. */
export const productOf = (powers: readonly PrimePower[]): number => powers.reduce((p, [b, e]) => p * b ** e, 1);

/** «2^{3} \cdot 3 \cdot 5»; «1» per il prodotto vuoto. */
export const powersLatex = (powers: readonly PrimePower[]): string =>
  powers.length === 0 ? "1" : powers.map(([b, e]) => (e === 1 ? `${b}` : `${b}^{${e}}`)).join(" \\cdot ");

/** MCD con l'algoritmo di Euclide. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** mcm di due naturali diversi da 0. */
export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;
