// Insiemi finiti di numeri naturali descritti da una proprietà caratteristica (generatori di V1.M01).
//
// Ogni proprietà si può leggere in due modi indipendenti: `listing` costruisce l'elenco degli elementi
// con l'aritmetica della proprietà (da tanto a tanto, a passi di k), `holds` dice se un numero ha la
// proprietà. I generatori usano il primo per scrivere esercizio e soluzione, la verifica il secondo.

import type { Rng } from "../../motore/random/rng";

/** Una proprietà caratteristica di un insieme finito di naturali. */
export type NaturalProperty =
  /** low < x < high, con ≤ al posto di < dove lo dicono `lowStrict` e `highStrict`. */
  | { readonly kind: "between"; readonly low: number; readonly lowStrict: boolean; readonly high: number; readonly highStrict: boolean }
  /** I divisori di n. */
  | { readonly kind: "divisors"; readonly n: number }
  /** I multipli di k con 0 < x < below. */
  | { readonly kind: "multiples"; readonly k: number; readonly below: number }
  /** I numeri pari (o dispari) minori di below. */
  | { readonly kind: "parity"; readonly odd: boolean; readonly below: number }
  /** I numeri con x² < below. */
  | { readonly kind: "squares"; readonly below: number };

/** Il più grande numero che una proprietà di questo file può contenere (serve alla verifica, che prova i numeri uno per uno). */
export const NATURAL_SEARCH_LIMIT = 200;

/** Vero se il numero naturale x ha la proprietà (lettura diretta, senza elencare). */
export function holds(property: NaturalProperty, x: number): boolean {
  if (!Number.isInteger(x) || x < 0) return false;
  switch (property.kind) {
    case "between":
      return (property.lowStrict ? property.low < x : property.low <= x) && (property.highStrict ? x < property.high : x <= property.high);
    case "divisors":
      return x > 0 && property.n % x === 0;
    case "multiples":
      return x > 0 && x < property.below && x % property.k === 0;
    case "parity":
      return x < property.below && x % 2 === (property.odd ? 1 : 0);
    case "squares":
      return x * x < property.below;
  }
}

/** Gli elementi, in ordine crescente, costruiti con l'aritmetica della proprietà. */
export function listing(property: NaturalProperty): number[] {
  const range = (from: number, to: number, step = 1): number[] => {
    const result: number[] = [];
    for (let value = from; value <= to; value += step) result.push(value);
    return result;
  };
  switch (property.kind) {
    case "between":
      return range(property.lowStrict ? property.low + 1 : property.low, property.highStrict ? property.high - 1 : property.high);
    case "divisors": {
      // Divisori a coppie: d e n/d, per d fino alla radice.
      const small: number[] = [];
      const large: number[] = [];
      for (let d = 1; d * d <= property.n; d++) {
        if (property.n % d !== 0) continue;
        small.push(d);
        if (d * d !== property.n) large.unshift(property.n / d);
      }
      return [...small, ...large];
    }
    case "multiples":
      return range(property.k, property.below - 1, property.k);
    case "parity":
      return range(property.odd ? 1 : 0, property.below - 1, 2);
    case "squares":
      return range(0, Math.ceil(Math.sqrt(property.below)) + 1).filter((x) => x * x < property.below);
  }
}

/** La proprietà scritta dopo «x ∈ ℕ |», in LaTeX. */
export function propertyConditionLatex(property: NaturalProperty): string {
  switch (property.kind) {
    case "between":
      return `${property.low} ${property.lowStrict ? "<" : "\\le"} x ${property.highStrict ? "<" : "\\le"} ${property.high}`;
    case "divisors":
      return `x \\text{ è un divisore di } ${property.n}`;
    case "multiples":
      return `x \\text{ è multiplo di } ${property.k} \\text{ e } 0 < x < ${property.below}`;
    case "parity":
      return `x \\text{ è ${property.odd ? "dispari" : "pari"} e } x < ${property.below}`;
    case "squares":
      return `x^2 < ${property.below}`;
  }
}

/** L'insieme scritto con la proprietà: {x ∈ ℕ | …}. */
export function propertyLatex(property: NaturalProperty): string {
  return `\\{x \\in \\mathbb{N} \\mid ${propertyConditionLatex(property)}\\}`;
}

/** Un insieme scritto per elencazione, in ordine crescente; ∅ se è vuoto. */
export function listLatex(elements: readonly number[]): string {
  if (elements.length === 0) return "\\varnothing";
  return `\\{${[...elements].sort((a, b) => a - b).join(", ")}\\}`;
}

/** Una proprietà a caso con da `min` a `max` elementi. */
export function randomProperty(rng: Rng, min = 3, max = 7): NaturalProperty {
  for (;;) {
    const property = drawProperty(rng);
    const size = listing(property).length;
    if (size >= min && size <= max) return property;
  }
}

function drawProperty(rng: Rng): NaturalProperty {
  switch (rng.pick(["between", "between", "divisors", "multiples", "parity", "squares"] as const)) {
    case "between": {
      const low = rng.int(0, 9);
      return { kind: "between", low, lowStrict: rng.bool(), high: low + rng.int(3, 7), highStrict: rng.bool() };
    }
    case "divisors":
      return { kind: "divisors", n: rng.pick([6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 27, 28, 30, 32, 36, 40, 44, 45, 50]) };
    case "multiples":
      return { kind: "multiples", k: rng.int(2, 7), below: rng.int(10, 40) };
    case "parity":
      return { kind: "parity", odd: rng.bool(), below: rng.int(6, 14) };
    case "squares":
      return { kind: "squares", below: rng.int(5, 50) };
  }
}

/** Vero se i due elenchi hanno gli stessi elementi. */
export function sameElements(a: readonly number[], b: readonly number[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((x) => right.has(x));
}
