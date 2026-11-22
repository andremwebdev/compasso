// Condizioni su un numero (naturale n o reale x) per i generatori di logica di V1.M01: implicazioni,
// condizioni necessarie e sufficienti, contronominali.
//
// `implicationPair` costruisce all'indietro due condizioni con «forte ⇒ debole» vera e il viceversa
// falso. Ogni condizione ha il suo testo, la sua negazione già scritta («$n$ non è multiplo di $6$»,
// «$x \le 3$») e la prova `holds`; `checkImplication` decide le implicazioni provando i numeri uno per uno.

import type { GeneratorContext } from "../../esercizi";

type Rng_ = GeneratorContext["rng"];

export interface Condition {
  /** Il testo, con le formule tra $…$: «$n$ è multiplo di $6$». */
  readonly text: string;
  /** Il testo della negazione: «$n$ non è multiplo di $6$». */
  readonly negated: string;
  readonly holds: (value: number) => boolean;
}

export type Domain = "natural" | "real";

/** Due condizioni con «strong ⇒ weak» vera e «weak ⇒ strong» falsa. */
export interface ImplicationPair {
  readonly domain: Domain;
  readonly strong: Condition;
  readonly weak: Condition;
}

const multiple = (k: number): Condition => ({
  text: `$n$ è multiplo di $${k}$`,
  negated: `$n$ non è multiplo di $${k}$`,
  holds: (n) => n % k === 0,
});
const notMultiple = (k: number): Condition => ({ text: multiple(k).negated, negated: multiple(k).text, holds: (n) => n % k !== 0 });
const even: Condition = { text: "$n$ è pari", negated: "$n$ è dispari", holds: (n) => n % 2 === 0 };
const odd: Condition = { text: even.negated, negated: even.text, holds: (n) => n % 2 === 1 };
const greater = (a: number, letter: "n" | "x"): Condition => ({ text: `$${letter} > ${a}$`, negated: `$${letter} \\le ${a}$`, holds: (v) => v > a });
const lastDigitZero: Condition = { text: "l'ultima cifra di $n$ è $0$", negated: "l'ultima cifra di $n$ non è $0$", holds: (n) => n % 10 === 0 };
const lastTwoZero: Condition = { text: "le ultime due cifre di $n$ sono $00$", negated: "le ultime due cifre di $n$ non sono $00$", holds: (n) => n % 100 === 0 };
const squareGreater = (a: number): Condition => ({ text: `$x^2 > ${a * a}$`, negated: `$x^2 \\le ${a * a}$`, holds: (x) => x * x > a * a });
const squareLess = (a: number): Condition => ({ text: `$x^2 < ${a * a}$`, negated: `$x^2 \\ge ${a * a}$`, holds: (x) => x * x < a * a });
const less = (a: number): Condition => ({ text: `$x < ${a}$`, negated: `$x \\ge ${a}$`, holds: (x) => x < a });
const equal = (a: number): Condition => ({ text: `$x = ${a}$`, negated: `$x \\ne ${a}$`, holds: (x) => x === a });
const squareEqual = (a: number): Condition => ({ text: `$x^2 = ${a * a}$`, negated: `$x^2 \\ne ${a * a}$`, holds: (x) => x * x === a * a });

export type PairFamily = "multiples" | "even" | "thresholds" | "digits" | "squares" | "negated";

/** Due condizioni della famiglia scelta, con strong ⇒ weak vera e il viceversa falso. */
export function implicationPair(rng: Rng_, family: PairFamily): ImplicationPair {
  switch (family) {
    case "multiples": {
      const k = rng.int(2, 12);
      return { domain: "natural", strong: multiple(k * rng.int(2, 6)), weak: multiple(k) };
    }
    case "even":
      return { domain: "natural", strong: multiple(2 * rng.int(2, 12)), weak: even };
    case "thresholds": {
      const b = rng.int(0, 30);
      return { domain: "natural", strong: greater(b + rng.int(1, 20), "n"), weak: greater(b, "n") };
    }
    case "digits":
      if (rng.int(1, 3) === 1) return { domain: "natural", strong: lastDigitZero, weak: rng.pick([multiple(5), multiple(2), even]) };
      return { domain: "natural", strong: lastTwoZero, weak: multiple(rng.pick([4, 5, 10, 20, 25, 50])) };
    case "squares":
      return squaresPair(rng);
    case "negated": {
      if (rng.bool()) return { domain: "natural", strong: odd, weak: notMultiple(2 * rng.int(2, 9)) };
      const k = rng.int(2, 9);
      return { domain: "natural", strong: notMultiple(k), weak: notMultiple(k * rng.int(2, 5)) };
    }
  }
}

function squaresPair(rng: Rng_): ImplicationPair {
  const a = rng.int(1, 9);
  switch (rng.pick(["greater", "less", "equal"] as const)) {
    case "greater":
      return { domain: "real", strong: greater(a, "x"), weak: squareGreater(a) };
    case "less":
      return { domain: "real", strong: squareLess(a), weak: less(a) };
    case "equal":
      return { domain: "real", strong: equal(rng.bool() ? a : -a), weak: squareEqual(a) };
  }
}

/** Il nome del numero nel testo: «un numero naturale $n$», «un numero reale $x$». */
export const domainText = (domain: Domain): string => (domain === "natural" ? "un numero naturale $n$" : "un numero reale $x$");

/** I numeri su cui si provano le condizioni: naturali fino a 3000, reali a quarti tra −30 e 30. */
function samples(domain: Domain): number[] {
  if (domain === "natural") return Array.from({ length: 3001 }, (_, i) => i);
  return Array.from({ length: 241 }, (_, i) => -30 + i / 4);
}

/** Vero se, per ogni numero provato, «a» vera comporta «b» vera. */
export function checkImplication(domain: Domain, a: (v: number) => boolean, b: (v: number) => boolean): boolean {
  return samples(domain).every((v) => !a(v) || b(v));
}
