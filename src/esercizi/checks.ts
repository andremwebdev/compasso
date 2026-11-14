// Controlli speciali per le risposte di tipo «espressione» in cui l'equivalenza con la risposta giusta
// non basta (specifica, sezioni 6 e 12):
// - primitiva: la risposta scritta si deriva e si confronta con la funzione integranda, qualunque
//   costante abbia (x²/2 + x + c e (x + 1)²/2 + c sono la stessa famiglia); deve però contenere una
//   costante arbitraria, perché un integrale indefinito è una famiglia di funzioni;
// - soluzione di un'equazione differenziale: la risposta si sostituisce nell'equazione, si contano le
//   costanti arbitrarie davvero indipendenti e si controllano le condizioni di Cauchy.
// Il motore non integra e non risolve equazioni differenziali: sa solo derivare e valutare.

import type { ErrorCode } from "../errori";
import { derive } from "../motore/calculus/derive";
import { compare, equivalent } from "../motore/equivalence/equivalence";
import { num, sym } from "../motore/expr/build";
import { evaluate } from "../motore/expr/evaluate";
import { toLatex } from "../motore/expr/latex";
import type { Expr } from "../motore/expr/types";
import { substitute, variables } from "../motore/expr/walk";
import { Rng } from "../motore/random/rng";
import { ODE_SYMBOLS, type AntiderivativeCheck, type DifferentialEquationCheck, type ExpressionCheck } from "./schema";

/** L'esito di un controllo speciale su una risposta scritta. */
export type CheckVerdict =
  /** Supera il controllo: è giusta. */
  | { readonly kind: "correct" }
  /** Il controllo stesso riconosce un errore tipico (costante dimenticata, condizioni non rispettate…). */
  | { readonly kind: "error"; readonly error: ErrorCode }
  /** Non supera il controllo: si prova con le risposte sbagliate previste. */
  | { readonly kind: "other" };

const CORRECT: CheckVerdict = { kind: "correct" };
const OTHER: CheckVerdict = { kind: "other" };
const ZERO = num(0);

/** Le lettere di un'espressione diverse dalla variabile: le costanti arbitrarie, comunque si chiamino. */
function constantsOf(expr: Expr, variable: string): string[] {
  return variables(expr)
    .filter((name) => name !== variable)
    .sort();
}

/** Vero se l'espressione dipende davvero dalla lettera (c − c non conta). */
const dependsOn = (expr: Expr, letter: string): boolean => !equivalent(derive(expr, letter), ZERO);

/** Vero se l'espressione contiene almeno una costante arbitraria da cui dipende davvero. */
const hasArbitraryConstant = (expr: Expr, variable: string): boolean => constantsOf(expr, variable).some((letter) => dependsOn(expr, letter));

/**
 * Vero se `given` è definita in tutti i punti di prova in cui lo è `reference`: ln(x − 1) non lo è
 * dove lo è ln|x − 1|. Le costanti arbitrarie prendono valori positivi, per non penalizzare ln(c·x).
 */
function definedWherever(given: Expr, reference: Expr, variable: string): boolean {
  const rng = new Rng(`dominio|${toLatex(given)}|${toLatex(reference)}`);
  const letters = [...new Set([...constantsOf(given, variable), ...constantsOf(reference, variable)])];
  const scales = [1, 2, 4, 8, 30];
  for (let attempt = 0; attempt < 60; attempt++) {
    const scale = scales[attempt % scales.length] as number;
    const env: Record<string, number> = { [variable]: rng.real(-scale, scale) };
    for (const letter of letters) env[letter] = rng.real(0.5, 2);
    if (!Number.isNaN(evaluate(reference, env)) && Number.isNaN(evaluate(given, env))) return false;
  }
  return true;
}

// ───────────────────────────── primitive ─────────────────────────────

function antiderivativeVerdict(given: Expr, correct: Expr, check: AntiderivativeCheck): CheckVerdict {
  const { variable } = check;
  if (!equivalent(derive(given, variable), check.integrand)) return OTHER;
  if (check.smallerDomain && !definedWherever(given, correct, variable)) return { kind: "error", error: check.smallerDomain };
  if (!hasArbitraryConstant(given, variable)) return { kind: "error", error: check.missingConstant };
  return CORRECT;
}

// ───────────────────────────── equazioni differenziali ─────────────────────────────

/** Vero se la funzione, sostituita nell'equazione, la rende vera in tutti i punti di prova. */
function solvesEquation(given: Expr, check: DifferentialEquationCheck, letters: readonly string[]): boolean {
  const { variable } = check;
  const first = derive(given, variable);
  const second = derive(first, variable);
  const rng = new Rng(`edo|${toLatex(given)}`);
  const scales = [0.5, 1, 2, 3];
  let valid = 0;
  for (let attempt = 0; attempt < 120 && valid < 12; attempt++) {
    const scale = scales[attempt % scales.length] as number;
    const at = rng.real(-scale, scale);
    const env: Record<string, number> = { [variable]: at };
    for (const letter of letters) env[letter] = rng.real(-2, 2);
    const y = evaluate(given, env);
    const dy = evaluate(first, env);
    const ddy = evaluate(second, env);
    if (Number.isNaN(y) || Number.isNaN(dy) || Number.isNaN(ddy)) continue;
    const point = { [variable]: at, [ODE_SYMBOLS.y]: y, [ODE_SYMBOLS.first]: dy, [ODE_SYMBOLS.second]: ddy };
    const left = evaluate(check.left, point);
    const right = evaluate(check.right, point);
    if (Number.isNaN(left) || Number.isNaN(right)) continue;
    // La tolleranza è relativa alla grandezza dei termini: nell'equazione ci sono cancellazioni.
    const size = 1 + Math.abs(y) + Math.abs(dy) + Math.abs(ddy) + Math.abs(left) + Math.abs(right);
    if (Math.abs(left - right) > 1e-7 * size) return false;
    valid += 1;
  }
  return valid >= 6;
}

/** Il rango di una matrice di numeri (eliminazione di Gauss con perno massimo, tolleranza relativa). */
function numericRank(rows: number[][]): number {
  const matrix = rows.map((row) => [...row]);
  const cols = matrix[0]?.length ?? 0;
  const largest = Math.max(0, ...matrix.flat().map(Math.abs));
  if (largest === 0) return 0;
  let rank = 0;
  for (let col = 0; col < cols && rank < matrix.length; col++) {
    let pivot = rank;
    for (let r = rank + 1; r < matrix.length; r++) {
      if (Math.abs((matrix[r] as number[])[col] as number) > Math.abs((matrix[pivot] as number[])[col] as number)) pivot = r;
    }
    const pivotRow = matrix[pivot] as number[];
    if (Math.abs(pivotRow[col] as number) <= 1e-7 * largest) continue;
    [matrix[rank], matrix[pivot]] = [pivotRow, matrix[rank] as number[]];
    for (let r = rank + 1; r < matrix.length; r++) {
      const row = matrix[r] as number[];
      const factor = (row[col] as number) / (pivotRow[col] as number);
      for (let c = col; c < cols; c++) row[c] = (row[c] as number) - factor * (pivotRow[c] as number);
    }
    rank += 1;
  }
  return rank;
}

/**
 * Quante costanti arbitrarie sono davvero indipendenti: c₁eˣ + c₂eˣ ne ha una sola, anche se le
 * lettere sono due. È il rango della matrice delle derivate rispetto alle costanti, in più punti.
 */
function independentConstants(given: Expr, letters: readonly string[], variable: string): number {
  if (letters.length === 0) return 0;
  const partials = letters.map((letter) => derive(given, letter));
  const rng = new Rng(`costanti|${toLatex(given)}`);
  let best = 0;
  for (let round = 0; round < 4 && best < letters.length; round++) {
    const env: Record<string, number> = {};
    for (const letter of letters) env[letter] = rng.real(0.5, 2) * rng.sign();
    const rows: number[][] = [];
    for (let attempt = 0; attempt < 40 && rows.length < letters.length + 4; attempt++) {
      const point = { ...env, [variable]: rng.real(-1.5, 1.5) };
      const row = partials.map((partial) => evaluate(partial, point));
      if (row.every((value) => !Number.isNaN(value))) rows.push(row);
    }
    // Ogni colonna si riporta alla stessa scala: e^{3x} ed e^{−3x} hanno grandezze molto diverse.
    const scaleOf = (c: number): number => Math.max(1e-300, ...rows.map((row) => Math.abs(row[c] as number)));
    const scales = letters.map((_, c) => scaleOf(c));
    best = Math.max(best, numericRank(rows.map((row) => row.map((value, c) => value / (scales[c] as number)))));
  }
  return best;
}

function equationVerdict(given: Expr, check: DifferentialEquationCheck): CheckVerdict {
  const { variable } = check;
  const letters = constantsOf(given, variable);
  // Una risposta che contiene ancora y non è una soluzione scritta in forma esplicita.
  if (letters.includes(ODE_SYMBOLS.y) || letters.length > 4) return OTHER;
  if (!solvesEquation(given, check, letters)) return OTHER;
  if (independentConstants(given, letters, variable) !== check.constants) return { kind: "error", error: check.wrongConstants };
  for (const condition of check.conditions) {
    const side = condition.order === 0 ? given : derive(given, variable);
    if (!equivalent(substitute(side, { [variable]: condition.at }), condition.value)) {
      return check.wrongConditions ? { kind: "error", error: check.wrongConditions } : OTHER;
    }
  }
  return CORRECT;
}

/** Le permutazioni di una lista corta. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

/** Le due famiglie di funzioni coincidono, a meno del nome delle costanti arbitrarie? */
function sameFamily(a: Expr, b: Expr, variable: string): "same" | "different" | "undecided" {
  const lettersA = constantsOf(a, variable);
  const lettersB = constantsOf(b, variable);
  if (lettersA.length !== lettersB.length || lettersA.length > 3) {
    const result = compare(a, b);
    return result.method === "undecided" ? "undecided" : result.equivalent ? "same" : "different";
  }
  const fresh = lettersA.map((_, index) => sym(`costante_${index}`));
  const rename = (expr: Expr, letters: readonly string[]): Expr => substitute(expr, Object.fromEntries(letters.map((letter, index) => [letter, fresh[index] as Expr])));
  const renamedA = rename(a, lettersA);
  let undecided = false;
  for (const order of permutations(lettersB)) {
    const result = compare(renamedA, rename(b, order));
    if (result.method === "undecided") undecided = true;
    else if (result.equivalent) return "same";
  }
  return undecided ? "undecided" : "different";
}

// ───────────────────────────── punto di accesso ─────────────────────────────

/** Applica il controllo speciale a una risposta scritta (già letta dal parser). */
export function checkVerdict(given: Expr, correct: Expr, check: ExpressionCheck): CheckVerdict {
  switch (check.kind) {
    case "antiderivative":
      return antiderivativeVerdict(given, correct, check);
    case "differentialEquation":
      return equationVerdict(given, check);
  }
}

/**
 * Vero se la risposta scritta è la risposta sbagliata prevista `candidate`: per le primitive basta la
 * stessa derivata (la costante non conta), per le equazioni differenziali la stessa famiglia di funzioni.
 */
export function matchesWrong(given: Expr, candidate: Expr, check: ExpressionCheck): boolean {
  switch (check.kind) {
    case "antiderivative":
      return equivalent(derive(given, check.variable), derive(candidate, check.variable));
    case "differentialEquation":
      return sameFamily(given, candidate, check.variable) === "same";
  }
}

/**
 * Per la verifica automatica: due risposte sono «la stessa risposta» secondo il controllo speciale?
 * Per le primitive contano la derivata e la presenza della costante arbitraria.
 */
export function sameUnderCheck(a: Expr, b: Expr, check: ExpressionCheck): "same" | "different" | "undecided" {
  switch (check.kind) {
    case "antiderivative": {
      const result = compare(derive(a, check.variable), derive(b, check.variable));
      if (result.method === "undecided") return "undecided";
      return result.equivalent && hasArbitraryConstant(a, check.variable) === hasArbitraryConstant(b, check.variable) ? "same" : "different";
    }
    case "differentialEquation":
      return sameFamily(a, b, check.variable);
  }
}

/** I codici di errore che il controllo speciale può assegnare da solo. */
export function checkErrorCodes(check: ExpressionCheck): ErrorCode[] {
  switch (check.kind) {
    case "antiderivative":
      return check.smallerDomain ? [check.missingConstant, check.smallerDomain] : [check.missingConstant];
    case "differentialEquation":
      return check.wrongConditions && check.wrongConditions !== check.wrongConstants ? [check.wrongConstants, check.wrongConditions] : [check.wrongConstants];
  }
}
