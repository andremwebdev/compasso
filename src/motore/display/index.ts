// Cose da mostrare (tabelle dei segni e di variazione, sistemi): punto di accesso.

export {
  realZeros, signStudySteps, signTable, signTableToLatex, solutionFromSigns,
  type Sign, type SignFactor, type SignRelation, type SignRow, type SignTable, type SignTableOptions,
} from "./sign-table";
export {
  extrema, variationTable, variationTableToLatex,
  type PointNature, type Trend, type VariationOptions, type VariationPoint, type VariationTable,
} from "./variation-table";
export { systemToLatex } from "./system";
export {
  GRAPH_HEIGHT, GRAPH_WIDTH, MAX_GRAPH_CURVES, graphPointToLatex, graphToSvg, plotGraph, tickLabel, ticks,
  type Graph, type GraphAsymptote, type GraphCurve, type GraphOptions, type GraphPoint, type GraphPointKind, type GraphSvgOptions, type GraphWindow,
} from "./graph";
