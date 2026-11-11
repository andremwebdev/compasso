// L'albero delle espressioni: la struttura dati centrale del motore.
//
// Un'espressione è un albero immutabile di nodi semplici, distinti dal campo `kind`. L'albero è
// «fedele alla scrittura»: conserva la forma in cui l'espressione è stata scritta (da un generatore
// o da Andrea), senza semplificare nulla. Così si può controllare la forma di una risposta e
// mostrare un esercizio esattamente come è stato costruito. Le forme canoniche per i confronti si
// calcolano a parte (cartella algebra/).

import type { Rational } from "../numbers/rational";

/** Numero razionale esatto. Se `decimals` è presente, era scritto come decimale con quel numero di cifre. */
export interface NumExpr {
  readonly kind: "num";
  readonly value: Rational;
  readonly decimals?: number;
}

/** Variabile o parametro: x, y, k, a… */
export interface SymExpr {
  readonly kind: "sym";
  readonly name: string;
}

/** Costanti con nome: π, e (numero di Nepero), i (unità immaginaria). */
export interface ConstExpr {
  readonly kind: "const";
  readonly name: ConstName;
}
export type ConstName = "pi" | "e" | "i";

/** Somma di due o più termini. La sottrazione a − b è la somma di a e di neg(b). */
export interface AddExpr {
  readonly kind: "add";
  readonly terms: readonly Expr[];
}

/** Opposto: −a. */
export interface NegExpr {
  readonly kind: "neg";
  readonly arg: Expr;
}

/** Prodotto di due o più fattori. */
export interface MulExpr {
  readonly kind: "mul";
  readonly factors: readonly Expr[];
}

/** Quoziente, mostrato come frazione. */
export interface DivExpr {
  readonly kind: "div";
  readonly num: Expr;
  readonly den: Expr;
}

/** Potenza: base^exp. */
export interface PowExpr {
  readonly kind: "pow";
  readonly base: Expr;
  readonly exp: Expr;
}

/** Radice di indice intero ≥ 2 (2 = radice quadrata). */
export interface RootExpr {
  readonly kind: "root";
  readonly index: number;
  readonly arg: Expr;
}

/** Valore assoluto. */
export interface AbsExpr {
  readonly kind: "abs";
  readonly arg: Expr;
}

/** Funzione elementare a un argomento (sin, cos, ln…): l'elenco è in functions.ts. */
export interface FnExpr {
  readonly kind: "fn";
  readonly name: FunctionName;
  readonly arg: Expr;
}
export type FunctionName = "sin" | "cos" | "tan" | "cot" | "arcsin" | "arccos" | "arctan" | "ln";

/** Logaritmo in base qualsiasi. Il logaritmo naturale è la funzione `ln`. */
export interface LogExpr {
  readonly kind: "log";
  readonly base: Expr;
  readonly arg: Expr;
}

export type Expr =
  | NumExpr
  | SymExpr
  | ConstExpr
  | AddExpr
  | NegExpr
  | MulExpr
  | DivExpr
  | PowExpr
  | RootExpr
  | AbsExpr
  | FnExpr
  | LogExpr;

export type ExprKind = Expr["kind"];

/** Equazione o disequazione: due espressioni legate da un segno. */
export interface Relation {
  readonly kind: "relation";
  readonly op: RelationOp;
  readonly left: Expr;
  readonly right: Expr;
}
export type RelationOp = "=" | "!=" | "<" | "<=" | ">" | ">=";

/** Nome del simbolo usato dal parser come segnaposto quando l'espressione è ancora incompleta ("2+"). */
export const PLACEHOLDER = "□";
