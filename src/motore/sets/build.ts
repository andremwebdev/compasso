// Costruttori degli insiemi di soluzioni. Non mettono in forma canonica: l'insieme resta com'è
// scritto, come per le espressioni (la forma canonica si chiede a parte, con canonicalSet).

import { EngineError } from "../errors";
import { toExpr, type ExprLike } from "../expr/build";
import { containsDecimal, isConstant } from "../expr/walk";
import type { Endpoint, Interval, PeriodicSet, RealSet, SolutionSet } from "./types";

/** Un estremo si può dare come numero, espressione costante, "-inf" oppure "+inf". */
export type EndpointLike = ExprLike | "-inf" | "+inf";

function toEndpoint(value: EndpointLike): Endpoint {
  if (value === "-inf" || value === "+inf") return value;
  const expr = toExpr(value);
  if (!isConstant(expr)) throw new EngineError("Gli estremi di un intervallo devono essere numeri, senza lettere.");
  return expr;
}

/** Intervallo qualsiasi; gli estremi infiniti risultano sempre aperti. */
export function interval(lower: EndpointLike, upper: EndpointLike, lowerClosed: boolean, upperClosed: boolean): Interval {
  const lo = toEndpoint(lower);
  const hi = toEndpoint(upper);
  return { lower: lo, upper: hi, lowerClosed: lowerClosed && typeof lo !== "string", upperClosed: upperClosed && typeof hi !== "string" };
}

/** Insieme formato dai pezzi dati (intervalli o altri insiemi di numeri reali), nell'ordine dato. */
export function realSet(...parts: readonly (Interval | RealSet)[]): RealSet {
  return { kind: "realset", pieces: parts.flatMap((part) => ("kind" in part ? part.pieces : [part])) };
}

/** [a; b] */
export const closed = (a: EndpointLike, b: EndpointLike): RealSet => realSet(interval(a, b, true, true));
/** (a; b) */
export const open = (a: EndpointLike, b: EndpointLike): RealSet => realSet(interval(a, b, false, false));
/** [a; b) */
export const closedOpen = (a: EndpointLike, b: EndpointLike): RealSet => realSet(interval(a, b, true, false));
/** (a; b] */
export const openClosed = (a: EndpointLike, b: EndpointLike): RealSet => realSet(interval(a, b, false, true));
/** x < a */
export const lessThan = (a: ExprLike): RealSet => realSet(interval("-inf", a, false, false));
/** x ≤ a */
export const atMost = (a: ExprLike): RealSet => realSet(interval("-inf", a, false, true));
/** x > a */
export const greaterThan = (a: ExprLike): RealSet => realSet(interval(a, "+inf", false, false));
/** x ≥ a */
export const atLeast = (a: ExprLike): RealSet => realSet(interval(a, "+inf", true, false));
/** Punti isolati: {a; b; …} */
export const points = (...values: readonly ExprLike[]): RealSet => realSet(...values.map((value) => interval(value, value, true, true)));

/** L'insieme vuoto. */
export const emptySet: RealSet = { kind: "realset", pieces: [] };
/** Tutti i numeri reali. */
export const allReals: RealSet = realSet(interval("-inf", "+inf", false, false));

/** Soluzioni periodiche: base + k·period, con k intero. periodic(points(div(pi, 6)), mul(2, pi)) è x = π/6 + 2kπ. */
export function periodic(base: RealSet, period: ExprLike): PeriodicSet {
  const expr = toExpr(period);
  if (!isConstant(expr)) throw new EngineError("Il periodo deve essere un numero, senza lettere.");
  return { kind: "periodic", base, period: expr };
}

/** Vero se l'insieme è scritto con qualche numero decimale. */
export function setHasDecimal(set: SolutionSet): boolean {
  const decimal = (endpoint: Endpoint): boolean => typeof endpoint !== "string" && containsDecimal(endpoint);
  const pieces = set.kind === "realset" ? set.pieces : set.base.pieces;
  return pieces.some((piece) => decimal(piece.lower) || decimal(piece.upper)) || (set.kind === "periodic" && decimal(set.period));
}
