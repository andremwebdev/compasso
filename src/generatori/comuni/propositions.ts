// Proposizioni composte con «non», «e», «o», «se… allora», «se e solo se» (generatori di V1.M01).
//
// Una formula è un albero; `evaluate` la calcola con i connettivi, oppure facendo un errore tipico
// (l'«o» esclusivo). La verifica dei generatori usa `truthTable` e `equivalent`, che leggono le tavole
// dei connettivi scritte come tabelle, non con gli operatori di JavaScript.

/** Una proposizione composta. Gli atomi sono lettere maiuscole (A, B, C) o minuscole (p, q). */
export type Formula =
  | { readonly kind: "atom"; readonly name: string }
  | { readonly kind: "not"; readonly arg: Formula }
  | { readonly kind: "and" | "or" | "implies" | "iff"; readonly left: Formula; readonly right: Formula };

export const atom = (name: string): Formula => ({ kind: "atom", name });
export const not = (arg: Formula): Formula => ({ kind: "not", arg });
export const and = (left: Formula, right: Formula): Formula => ({ kind: "and", left, right });
export const or = (left: Formula, right: Formula): Formula => ({ kind: "or", left, right });
export const implies = (left: Formula, right: Formula): Formula => ({ kind: "implies", left, right });
export const iff = (left: Formula, right: Formula): Formula => ({ kind: "iff", left, right });

/** I valori degli atomi. */
export type Assignment = Readonly<Record<string, boolean>>;

/** Come si calcola: giusto, oppure con l'«o» inteso come esclusivo (vero con le due parti vere: falso). */
export type EvaluationMode = "correct" | "exclusiveOr";

/** Il valore di verità della formula. */
export function evaluate(formula: Formula, values: Assignment, mode: EvaluationMode = "correct"): boolean {
  switch (formula.kind) {
    case "atom": {
      const value = values[formula.name];
      if (value === undefined) throw new Error(`valore mancante per ${formula.name}`);
      return value;
    }
    case "not":
      return !evaluate(formula.arg, values, mode);
    case "and":
      return evaluate(formula.left, values, mode) && evaluate(formula.right, values, mode);
    case "or": {
      const left = evaluate(formula.left, values, mode);
      const right = evaluate(formula.right, values, mode);
      return mode === "exclusiveOr" ? left !== right : left || right;
    }
    case "implies":
      return !evaluate(formula.left, values, mode) || evaluate(formula.right, values, mode);
    case "iff":
      return evaluate(formula.left, values, mode) === evaluate(formula.right, values, mode);
  }
}

/** Le lettere della formula, in ordine alfabetico. */
export function atomsOf(formula: Formula): string[] {
  const found = new Set<string>();
  const walk = (f: Formula): void => {
    if (f.kind === "atom") found.add(f.name);
    else if (f.kind === "not") walk(f.arg);
    else {
      walk(f.left);
      walk(f.right);
    }
  };
  walk(formula);
  return [...found].sort();
}

/** Tutte le assegnazioni delle lettere, nell'ordine delle tavole di verità (prima V, poi F). */
export function assignments(names: readonly string[]): Assignment[] {
  const rows: Assignment[] = [];
  const count = 2 ** names.length;
  for (let row = 0; row < count; row++) {
    const values: Record<string, boolean> = {};
    names.forEach((name, index) => {
      values[name] = ((row >> (names.length - 1 - index)) & 1) === 0;
    });
    rows.push(values);
  }
  return rows;
}

// Le tavole dei connettivi come tabelle: [VV, VF, FV, FF].
const TABLES: Record<"and" | "or" | "implies" | "iff", readonly [boolean, boolean, boolean, boolean]> = {
  and: [true, false, false, false],
  or: [true, true, true, false],
  implies: [true, false, true, true],
  iff: [true, false, false, true],
};

/** Il valore della formula letto dalle tavole dei connettivi (per le verifiche). */
export function tableValue(formula: Formula, values: Assignment): boolean {
  switch (formula.kind) {
    case "atom":
      return values[formula.name] === true;
    case "not":
      return tableValue(formula.arg, values) ? false : true;
    default: {
      const index = (tableValue(formula.left, values) ? 0 : 2) + (tableValue(formula.right, values) ? 0 : 1);
      return TABLES[formula.kind][index] === true;
    }
  }
}

/** La colonna finale della tavola di verità (con le lettere date, o quelle della formula). */
export function truthTable(formula: Formula, names: readonly string[] = atomsOf(formula)): boolean[] {
  return assignments(names).map((values) => tableValue(formula, values));
}

/** Vero se le due formule hanno la stessa tavola di verità. */
export function equivalent(a: Formula, b: Formula): boolean {
  const names = [...new Set([...atomsOf(a), ...atomsOf(b)])].sort();
  const left = truthTable(a, names);
  const right = truthTable(b, names);
  return left.every((value, index) => value === right[index]);
}

const SYMBOL: Record<"and" | "or" | "implies" | "iff", string> = { and: "\\wedge", or: "\\vee", implies: "\\Rightarrow", iff: "\\Leftrightarrow" };

/** La formula in LaTeX, con le parentesi solo dove servono (¬ si applica a quello che lo segue subito). */
export function formulaLatex(formula: Formula, nested = false): string {
  switch (formula.kind) {
    case "atom":
      return formula.name;
    case "not":
      return `\\neg ${formulaLatex(formula.arg, true)}`;
    default: {
      const body = `${formulaLatex(formula.left, true)} ${SYMBOL[formula.kind]} ${formulaLatex(formula.right, true)}`;
      return nested ? `(${body})` : body;
    }
  }
}

/** «V» o «F» in LaTeX. */
export const truthLatex = (value: boolean): string => (value ? "\\mathrm{V}" : "\\mathrm{F}");

/** Le sottoformule composte, dalla più interna alla più esterna, senza ripetizioni. */
export function subformulas(formula: Formula): Formula[] {
  const result: Formula[] = [];
  const walk = (f: Formula): void => {
    if (f.kind === "atom") return;
    if (f.kind === "not") walk(f.arg);
    else {
      walk(f.left);
      walk(f.right);
    }
    if (!result.some((other) => formulaLatex(other) === formulaLatex(f))) result.push(f);
  };
  walk(formula);
  return result;
}

/**
 * La formula con la negazione estesa: ¬A ∧ B letto come ¬(A ∧ B). Si applica al primo nodo, dall'alto,
 * che ha a sinistra una negazione di una sola lettera; null se non ce n'è.
 */
export function widenNegation(formula: Formula): Formula | null {
  switch (formula.kind) {
    case "atom":
      return null;
    case "not": {
      const inner = widenNegation(formula.arg);
      return inner ? not(inner) : null;
    }
    default: {
      if (formula.left.kind === "not" && formula.left.arg.kind === "atom") return not({ kind: formula.kind, left: formula.left.arg, right: formula.right });
      const left = widenNegation(formula.left);
      if (left) return { kind: formula.kind, left, right: formula.right };
      const right = widenNegation(formula.right);
      return right ? { kind: formula.kind, left: formula.left, right } : null;
    }
  }
}
