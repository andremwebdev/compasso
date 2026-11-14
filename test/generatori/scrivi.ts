// Scrive una risposta come la scriverebbe Andrea con la tastiera (testo semplice, non LaTeX):
// serve ai test dei generatori per provare che la risposta giusta è accettata e che ogni risposta
// sbagliata prevista è riconosciuta con il suo codice.

import type { LimitValue } from "../../src/motore/calculus/limit";
import type { Expr } from "../../src/motore/expr";

/** Un'espressione costante in testo semplice: -1/6, e^(-2), sqrt(2)/2, 3pi/4. */
export function plainText(expr: Expr): string {
  const wrapped = (inner: Expr): string => (inner.kind === "num" || inner.kind === "const" || inner.kind === "sym" ? plainText(inner) : `(${plainText(inner)})`);
  switch (expr.kind) {
    case "num": {
      const [top, bottom] = [expr.value.n, expr.value.d];
      return bottom === 1n ? `${top}` : `${top}/${bottom}`;
    }
    case "sym":
      return expr.name;
    case "const":
      return expr.name;
    case "neg":
      return `-${wrapped(expr.arg)}`;
    case "add":
      return expr.terms.map((term, index) => (index === 0 ? plainText(term) : `+(${plainText(term)})`)).join("");
    case "mul":
      return expr.factors.map((factor) => `(${plainText(factor)})`).join("*");
    case "div":
      return `(${plainText(expr.num)})/(${plainText(expr.den)})`;
    case "pow":
      return `${wrapped(expr.base)}^(${plainText(expr.exp)})`;
    case "root":
      return expr.index === 2 ? `sqrt(${plainText(expr.arg)})` : `root(${expr.index}, ${plainText(expr.arg)})`;
    case "abs":
      return `|${plainText(expr.arg)}|`;
    case "fn":
      return `${expr.name}(${plainText(expr.arg)})`;
    case "log":
      throw new Error("plainText: logaritmo con base non previsto nei test.");
  }
}

/** Un valore di limite in testo semplice: un numero, «+inf», «-inf», «non esiste». */
export function limitText(value: LimitValue): string {
  switch (value.kind) {
    case "finite":
      return plainText(value.value);
    case "+inf":
      return "+inf";
    case "-inf":
      return "-inf";
    case "none":
      return "non esiste";
  }
}
