// Insiemi di soluzioni: i tipi (specifica, sezione 6). Costruttori in build.ts, forma canonica,
// operazioni e confronto in operations.ts, LaTeX in latex.ts, lettura in parser/sets.ts.

import type { Expr } from "../expr/types";

/** Un estremo: un numero esatto (espressione costante) oppure un infinito. */
export type Endpoint = Expr | "-inf" | "+inf";

/**
 * Un intervallo. Un punto isolato è l'intervallo chiuso con i due estremi uguali.
 * Gli estremi infiniti sono sempre aperti.
 */
export interface Interval {
  readonly lower: Endpoint;
  readonly upper: Endpoint;
  readonly lowerClosed: boolean;
  readonly upperClosed: boolean;
}

/**
 * Unione finita di intervalli e punti. L'insieme vuoto non ha pezzi; tutto ℝ è il solo pezzo (−∞; +∞).
 * In forma canonica i pezzi sono ordinati, disgiunti e non si toccano.
 */
export interface RealSet {
  readonly kind: "realset";
  readonly pieces: readonly Interval[];
}

/**
 * Soluzioni periodiche: l'unione, al variare di k tra gli interi, di (base + k·period).
 * x = π/6 + 2kπ è { base: il punto π/6, period: 2π }; una disequazione goniometrica ha per base degli intervalli.
 */
export interface PeriodicSet {
  readonly kind: "periodic";
  readonly base: RealSet;
  readonly period: Expr;
}

export type SolutionSet = RealSet | PeriodicSet;
