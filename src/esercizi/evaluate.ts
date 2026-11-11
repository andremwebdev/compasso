// Valutazione di una risposta (specifica, sezioni 5 e 7), con il riconoscimento degli errori
// attraverso le risposte sbagliate previste.
//
// Ordine dei controlli per una risposta scritta:
// 1. il testo si legge? Altrimenti «invalid» (non si registra: Andrea lo corregge);
// 2. è equivalente alla risposta giusta? Se sì: decimale dove serve la forma esatta → FORMA.DECIMALE;
//    vincolo di forma non rispettato → FORMA.NON_RICHIESTA; altrimenti giusta;
// 3. è equivalente a una risposta sbagliata prevista? → quell'errore;
// 4. è un decimale che approssima la risposta giusta? → FORMA.DECIMALE;
// 5. altrimenti → NON_CLASSIFICATO.

import { UNCLASSIFIED, type ErrorCode } from "../errori";
import { limitsEqual, parseLimitValue, type LimitValue } from "../motore/calculus/limit";
import { equivalent } from "../motore/equivalence/equivalence";
import { EngineError, notImplemented } from "../motore/errors";
import { evaluate } from "../motore/expr/evaluate";
import type { Expr } from "../motore/expr/types";
import { containsDecimal, isConstant, some } from "../motore/expr/walk";
import { checkForms, type FormConstraint } from "../motore/form/constraints";
import { matrix, matricesEquivalent, matrixSize, type Matrix } from "../motore/linalg/matrix";
import { parseExpression } from "../motore/parser/parse";
import { choiceOptions } from "./choices";
import { errorCodesOf } from "./generate";
import type { Evaluation, ExpectedWrong, Exercise, NumberAnswer, Response } from "./schema";

const CORRECT: Evaluation = { outcome: "correct" };
const UNCLASSIFIED_WRONG: Evaluation = { outcome: "wrong", error: UNCLASSIFIED, cause: "unclassified" };
const DECIMAL_WRONG: Evaluation = {
  outcome: "wrong",
  error: "FORMA.DECIMALE",
  cause: "decimal",
  message: "Valore giusto, ma serve la forma esatta.",
};
const INCOMPLETE: Evaluation = { outcome: "invalid", message: "La risposta non è completa." };

const expected = (error: ErrorCode): Evaluation => ({ outcome: "wrong", error, cause: "expected" });

/** Valuta la risposta di Andrea a un esercizio. */
export function evaluateResponse(exercise: Exercise, response: Response): Evaluation {
  if (response.kind === "skip") return { outcome: "skipped" };
  const { answer } = exercise;
  const mismatch = (): never => {
    throw new EngineError(`Risposta di tipo «${response.kind}» per un esercizio di tipo «${answer.kind}».`);
  };

  // Scelta multipla: vale per ogni esercizio che ha le opzioni (0 = giusta, k = k-esima sbagliata prevista).
  if (response.kind === "choice") {
    const options = choiceOptions(exercise);
    if (!options || !options.some((option) => option.index === response.index)) return mismatch();
    if (response.index === 0) return CORRECT;
    const code = errorCodesOf(answer)[response.index - 1];
    return code ? expected(code as ErrorCode) : UNCLASSIFIED_WRONG;
  }

  switch (answer.kind) {
    case "choice":
      return mismatch();

    case "number":
    case "expression": {
      if (response.kind !== "text") return mismatch();
      const parsed = parseExpression(response.text, { complex: answer.complex ?? false });
      if (!parsed.ok) return { outcome: "invalid", message: parsed.error.message, position: parsed.error.position };
      if (!parsed.complete) return INCOMPLETE;
      if (answer.kind === "number") {
        if (!isConstant(parsed.value)) return { outcome: "invalid", message: "Qui serve un numero, senza lettere." };
        if (answer.mode.kind === "approx") return judgeApproximation(parsed.value, answer, answer.mode.tolerance);
      }
      return judgeExpression(parsed.value, answer.correct, answer.wrong, answer.form ?? []);
    }

    case "limit": {
      if (response.kind !== "text") return mismatch();
      const parsed = parseLimitValue(response.text);
      if (!parsed.ok) return { outcome: "invalid", message: parsed.error.message, position: parsed.error.position };
      if (!parsed.complete) return INCOMPLETE;
      return judgeLimit(parsed.value, answer.correct, answer.wrong);
    }

    case "matrix": {
      if (response.kind !== "matrix") return mismatch();
      return judgeMatrix(response.cells, answer.correct, answer.wrong);
    }

    case "set":
      return notImplemented("valutazione degli insiemi di soluzioni", "sessione 2");

    case "truefalse":
      if (response.kind !== "truefalse") return mismatch();
      if (response.value === answer.correct) return CORRECT;
      return answer.error ? expected(answer.error) : UNCLASSIFIED_WRONG;

    case "ordering": {
      if (response.kind !== "ordering") return mismatch();
      const { order } = response;
      const isPermutation =
        order.length === answer.items.length && [...order].sort((a, b) => a - b).every((value, index) => value === index);
      if (!isPermutation) return mismatch();
      if (order.every((value, index) => value === index)) return CORRECT;
      return answer.error ? expected(answer.error) : UNCLASSIFIED_WRONG;
    }
  }
}

/** Valutazione in forma esatta di un'espressione (o di un numero). */
function judgeExpression(
  given: Expr,
  correct: Expr,
  wrong: readonly ExpectedWrong<Expr>[],
  form: readonly FormConstraint[],
): Evaluation {
  // Un decimale è ammesso solo se la risposta giusta stessa è scritta con i decimali.
  const decimalNotAllowed = containsDecimal(given) && !containsDecimal(correct);
  if (equivalent(given, correct)) {
    if (decimalNotAllowed) return DECIMAL_WRONG;
    const check = checkForms(given, form);
    if (!check.ok) return { outcome: "wrong", error: "FORMA.NON_RICHIESTA", cause: "form", message: check.reason };
    return CORRECT;
  }
  for (const candidate of wrong) {
    if (equivalent(given, candidate.value)) return expected(candidate.error);
  }
  if (decimalNotAllowed && approximates(given, correct)) return DECIMAL_WRONG;
  return UNCLASSIFIED_WRONG;
}

/**
 * Vero se `given` (che contiene decimali) è l'arrotondamento o il troncamento di `correct`
 * alle cifre scritte: 1,41 e 1,414 approssimano √2; 1,5 no.
 */
function approximates(given: Expr, correct: Expr): boolean {
  if (!isConstant(given) || !isConstant(correct)) return false;
  const a = evaluate(given);
  const b = evaluate(correct);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  let decimals = Infinity;
  some(given, (node) => {
    if (node.kind === "num" && node.decimals !== undefined) decimals = Math.min(decimals, node.decimals);
    return false;
  });
  const unit = 10 ** -decimals;
  const rounded = Math.abs(a - b) <= unit / 2 + 1e-12;
  const truncated = Math.sign(a) === Math.sign(b) && Math.abs(b) - Math.abs(a) >= -1e-12 && Math.abs(b) - Math.abs(a) < unit;
  return rounded || truncated;
}

/** Valutazione per approssimazione: conta solo il valore, entro la tolleranza dichiarata. */
function judgeApproximation(given: Expr, answer: NumberAnswer, tolerance: number): Evaluation {
  const value = evaluate(given);
  if (Number.isNaN(value)) return { outcome: "invalid", message: "Questo numero non esiste tra i reali." };
  const near = (target: Expr): boolean => Math.abs(value - evaluate(target)) <= tolerance + 1e-12;
  if (near(answer.correct)) return CORRECT;
  for (const candidate of answer.wrong) {
    if (near(candidate.value)) return expected(candidate.error);
  }
  return UNCLASSIFIED_WRONG;
}

function judgeLimit(given: LimitValue, correct: LimitValue, wrong: readonly ExpectedWrong<LimitValue>[]): Evaluation {
  if (given.kind === "finite" && correct.kind === "finite") {
    const finiteWrong = wrong.flatMap((candidate) =>
      candidate.value.kind === "finite" ? [{ error: candidate.error, value: candidate.value.value }] : [],
    );
    return judgeExpression(given.value, correct.value, finiteWrong, []);
  }
  if (given.kind === correct.kind) return CORRECT;
  for (const candidate of wrong) {
    if (limitsEqual(given, candidate.value)) return expected(candidate.error);
  }
  return UNCLASSIFIED_WRONG;
}

function judgeMatrix(cells: readonly (readonly string[])[], correct: Matrix, wrong: readonly ExpectedWrong<Matrix>[]): Evaluation {
  const rows: Expr[][] = [];
  for (const row of cells) {
    const parsedRow: Expr[] = [];
    for (const cell of row) {
      if (cell.trim() === "") return { outcome: "invalid", message: "Riempi tutte le caselle." };
      const parsed = parseExpression(cell);
      if (!parsed.ok) return { outcome: "invalid", message: parsed.error.message, position: parsed.error.position };
      if (!parsed.complete) return INCOMPLETE;
      parsedRow.push(parsed.value);
    }
    rows.push(parsedRow);
  }
  let given: Matrix;
  try {
    given = matrix(rows);
  } catch {
    return { outcome: "invalid", message: "Riempi tutte le caselle." };
  }
  if (matricesEquivalent(given, correct)) {
    const decimal = given.rows.some((row, r) => row.some((entry, c) => containsDecimal(entry) && !containsDecimal(correct.rows[r]?.[c] as Expr)));
    return decimal ? DECIMAL_WRONG : CORRECT;
  }
  for (const candidate of wrong) {
    if (matricesEquivalent(given, candidate.value)) return expected(candidate.error);
  }
  // Stesse dimensioni e ogni elemento è il decimale approssimato di quello giusto: errore di forma.
  const size = matrixSize(given);
  const correctSize = matrixSize(correct);
  if (size.rows === correctSize.rows && size.cols === correctSize.cols) {
    const pairs = given.rows.flatMap((row, r) => row.map((entry, c) => [entry, correct.rows[r]?.[c] as Expr] as const));
    const allClose = pairs.every(([entry, target]) => equivalent(entry, target) || (containsDecimal(entry) && approximates(entry, target)));
    if (allClose) return DECIMAL_WRONG;
  }
  return UNCLASSIFIED_WRONG;
}
