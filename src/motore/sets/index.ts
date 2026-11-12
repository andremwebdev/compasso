// Insiemi di soluzioni: punto di accesso.

export * from "./types";
export {
  allReals, atLeast, atMost, closed, closedOpen, emptySet, greaterThan, interval, lessThan, open, openClosed, periodic, points, realSet,
  setHasDecimal, type EndpointLike,
} from "./build";
export {
  canonicalSet, compareConstants, compareEndpoints, isAllReals, isCanonicalSet, isEmptySet, setComplement, setContains, setDifference,
  setIntersection, setsEqual, setUnion,
} from "./operations";
export { setToInequalityLatex, setToLatex, type SetLatexOptions } from "./latex";
