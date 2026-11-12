// Sistemi di equazioni o disequazioni con la graffa.

import { toLatex } from "../expr/latex";
import type { Expr, Relation } from "../expr/types";

/** Le righe date (equazioni, disequazioni, espressioni, oppure LaTeX già pronto) messe a sistema con la graffa. */
export function systemToLatex(rows: readonly (Relation | Expr | string)[]): string {
  const lines = rows.map((row) => (typeof row === "string" ? row : toLatex(row)));
  return `\\begin{cases} ${lines.join(" \\\\ ")} \\end{cases}`;
}
