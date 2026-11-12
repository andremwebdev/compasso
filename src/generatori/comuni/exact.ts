// Valore esatto di un'espressione razionale in un punto razionale: serve alle verifiche indipendenti
// dei generatori (provare una disequazione o un'equazione in tanti punti senza virgola mobile).
// È volutamente piccolo e veloce: somme, prodotti, quozienti e potenze con esponente intero.

import { EngineError } from "../../motore/errors";
import type { Expr } from "../../motore/expr";
import { Rational } from "../../motore/numbers/rational";

/**
 * Il valore dell'espressione quando la variabile vale `value`; null dove non è definita
 * (denominatore nullo). Lancia EngineError se l'espressione non è razionale (radici, funzioni…).
 */
export function rationalAt(expr: Expr, variable: string, value: Rational): Rational | null {
  const visit = (node: Expr): Rational | null => {
    switch (node.kind) {
      case "num":
        return node.value;
      case "sym":
        if (node.name !== variable) throw new EngineError(`rationalAt: variabile inattesa «${node.name}».`);
        return value;
      case "neg": {
        const inner = visit(node.arg);
        return inner && inner.neg();
      }
      case "add": {
        let total = Rational.ZERO;
        for (const term of node.terms) {
          const part = visit(term);
          if (!part) return null;
          total = total.add(part);
        }
        return total;
      }
      case "mul": {
        let total = Rational.ONE;
        for (const factor of node.factors) {
          const part = visit(factor);
          if (!part) return null;
          total = total.mul(part);
        }
        return total;
      }
      case "div": {
        const top = visit(node.num);
        const bottom = visit(node.den);
        if (!top || !bottom || bottom.isZero()) return null;
        return top.div(bottom);
      }
      case "pow": {
        const base = visit(node.base);
        if (node.exp.kind !== "num" || !node.exp.value.isInteger()) throw new EngineError("rationalAt: esponente non intero.");
        const exponent = node.exp.value.toInteger();
        if (!base || (exponent < 0 && base.isZero())) return null;
        return base.pow(exponent);
      }
      case "const":
      case "root":
      case "abs":
      case "fn":
      case "log":
        throw new EngineError("rationalAt: l'espressione non è razionale.");
    }
  };
  return visit(expr);
}
