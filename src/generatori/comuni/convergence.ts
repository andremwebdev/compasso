// Pezzi comuni ai generatori di convergenza (integrali impropri V2.M10, serie V2.M11): esponenti
// razionali scritti in LaTeX e potenze con radici, come si scrivono a mano.

/** Un esponente razionale n/d (d = 1, 2 o 3). */
export type Exponent = readonly [n: number, d: number];

export const value = ([n, d]: Exponent): number => n / d;

/** L'esponente in LaTeX: 2, \frac{1}{2}. */
export const exponentLatex = ([n, d]: Exponent): string => (d === 1 ? String(n) : `\\frac{${n}}{${d}}`);

/**
 * La potenza b^{n/d} scritta con le radici: x, x^{2}, \sqrt{x}, x\sqrt{x}, \sqrt[3]{x^{2}}, x\sqrt[3]{x}.
 * `base` è la base già in LaTeX (x, n, \ln x…); `wrapped` è la stessa base tra parentesi, per le potenze.
 */
export function powerLatex(base: string, [n, d]: Exponent, wrapped = base): string {
  const whole = Math.floor(n / d);
  const rest = n % d;
  const integer = whole === 0 ? "" : whole === 1 ? wrapped : `${wrapped}^{${whole}}`;
  if (rest === 0) return integer || "1";
  const radicand = rest === 1 ? base : `${wrapped}^{${rest}}`;
  const radical = d === 2 ? `\\sqrt{${radicand}}` : `\\sqrt[${d}]{${radicand}}`;
  return integer ? `${integer}${radical}` : radical;
}

/** Confronto tra un esponente e 1: per le soglie dei criteri. */
export const compareWithOne = (p: Exponent): -1 | 0 | 1 => (p[0] === p[1] ? 0 : p[0] > p[1] ? 1 : -1);

/** «p = 2 > 1», «p = \frac{1}{2} < 1», «p = 1». */
export function pAgainstOne(p: Exponent, letter = "p"): string {
  const sign = compareWithOne(p);
  return `${letter} = ${exponentLatex(p)}${sign === 0 ? "" : sign > 0 ? " > 1" : " < 1"}`;
}
