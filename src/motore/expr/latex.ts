// Conversione delle espressioni in LaTeX (disegnato poi con KaTeX), con le convenzioni italiane:
// virgola decimale, punto di moltiplicazione · solo dove serve.
//
// La conversione è fedele all'albero: non semplifica e non riordina. mul(1, x) si scrive «1x».

import { Rational } from "../numbers/rational";
import { ANGLE_UNITS, functionTable } from "./functions";
import { PLACEHOLDER, type Expr, type NumExpr, type Relation, type RelationOp } from "./types";

const GREEK = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu", "rho", "sigma", "tau", "phi", "omega",
  "Delta", "Sigma", "Omega",
]);

const RELATION_LATEX: Readonly<Record<RelationOp, string>> = {
  "=": "=",
  "!=": "\\ne",
  "<": "<",
  "<=": "\\le",
  ">": ">",
  ">=": "\\ge",
};

/** LaTeX di un'espressione o di una equazione/disequazione. */
export function toLatex(value: Expr | Relation): string {
  if (value.kind === "relation") {
    return `${toLatex(value.left)} ${RELATION_LATEX[value.op]} ${toLatex(value.right)}`;
  }
  return render(value);
}

/** Numero razionale in LaTeX: intero, frazione, oppure decimale con la virgola se `decimals` è indicato. */
export function rationalToLatex(value: Rational, decimals?: number): string {
  if (decimals !== undefined) return value.toDecimalString(decimals, "{,}");
  if (value.isInteger()) return value.n.toString();
  const sign = value.sign() < 0 ? "-" : "";
  return `${sign}\\frac{${value.abs().n}}{${value.d}}`;
}

function symbolToLatex(name: string): string {
  if (name === PLACEHOLDER) return "\\square";
  const [head = "", ...subscripts] = name.split("_");
  const base = GREEK.has(head) ? `\\${head}` : head.length === 1 ? head : `\\mathrm{${head}}`;
  return subscripts.length > 0 ? `${base}_{${subscripts.join("\\_")}}` : base;
}

function render(expr: Expr): string {
  switch (expr.kind) {
    case "num":
      return expr.repeating ? repeatingToLatex(expr) : rationalToLatex(expr.value, expr.decimals);
    case "sym":
      return symbolToLatex(expr.name);
    case "const":
      return expr.name === "pi" ? "\\pi" : expr.name;
    case "add":
      return renderSum(expr.terms);
    case "neg":
      return `-${renderNegated(expr.arg)}`;
    case "mul":
      return renderProduct(expr.factors);
    case "div":
      return `\\frac{${render(expr.num)}}{${render(expr.den)}}`;
    case "pow":
      return renderPower(expr.base, expr.exp);
    case "root":
      return expr.index === 2 ? `\\sqrt{${render(expr.arg)}}` : `\\sqrt[${expr.index}]{${render(expr.arg)}}`;
    case "abs":
      return `\\left|${render(expr.arg)}\\right|`;
    case "fn": {
      const postfix = functionTable[expr.name].postfix;
      if (postfix !== undefined) return `${isSimplePostfixArgument(expr.arg) ? render(expr.arg) : parens(render(expr.arg))}${postfix}`;
      return `${functionTable[expr.name].latex}${renderArgument(expr.arg)}`;
    }
    case "log": {
      // «log» senza base è il logaritmo in base 10 (convenzione dei testi italiani delle superiori).
      const isBaseTen = expr.base.kind === "num" && expr.base.value.eq(10);
      return `\\log${isBaseTen ? "" : `_{${render(expr.base)}}`}${renderArgument(expr.arg)}`;
    }
  }
}

/** Numero periodico: 0{,}1\overline{6}. Un periodo ancora vuoto (testo da finire) mostra la casella. */
function repeatingToLatex(expr: NumExpr): string {
  const { integer, antiperiod, period } = expr.repeating as NonNullable<NumExpr["repeating"]>;
  const sign = expr.value.sign() < 0 ? "-" : "";
  return `${sign}${integer}{,}${antiperiod}\\overline{${period === "" ? "\\square" : period}}`;
}

/** L'argomento di 5!, n!, 30°: senza parentesi se è un numero non negativo o una lettera. */
function isSimplePostfixArgument(arg: Expr): boolean {
  if (arg.kind === "num") return arg.value.sign() >= 0;
  return arg.kind === "sym" || arg.kind === "const";
}

const isPostfix = (expr: Expr): boolean => expr.kind === "fn" && functionTable[expr.name].postfix !== undefined;
const isAngle = (expr: Expr): boolean => expr.kind === "fn" && ANGLE_UNITS.has(expr.name);

/** Vero per gli angoli scritti in gradi, primi e secondi (30°15′20″): si mostrano attaccati, senza +. */
function isAngleSum(expr: Expr): boolean {
  return expr.kind === "add" && expr.terms.every(isAngle) && expr.terms.every((term, index) => index === 0 || angleContinues(expr.terms[index - 1] as Expr, term));
}

/** Vero se `next` (primi o secondi) prosegue l'angolo `previous` (gradi o primi): 30° 15′, 15′ 20″, 30° 20″. */
function angleContinues(previous: Expr, next: Expr): boolean {
  if (previous.kind !== "fn" || next.kind !== "fn") return false;
  if (next.name === "arcmin") return previous.name === "deg";
  if (next.name === "arcsec") return previous.name === "deg" || previous.name === "arcmin";
  return false;
}

function parens(latex: string): string {
  return `\\left(${latex}\\right)`;
}

/** Vero se l'espressione, scritta, comincia con un segno meno. */
function startsWithMinus(expr: Expr): boolean {
  switch (expr.kind) {
    case "num":
      return expr.value.sign() < 0;
    case "neg":
      return true;
    case "mul":
      return expr.factors[0] !== undefined && startsWithMinus(expr.factors[0]);
    default:
      return false;
  }
}

function renderSum(terms: readonly Expr[]): string {
  let out = "";
  terms.forEach((term, index) => {
    // Una somma dentro una somma tiene le sue parentesi: l'albero è fedele alla scrittura.
    const body = term.kind === "add" && !isAngleSum(term) ? parens(render(term)) : render(term);
    if (index === 0) out = body;
    // 30°15′: i primi e i secondi che seguono i gradi si attaccano (con uno spazio sottile).
    else if (angleContinues(terms[index - 1] as Expr, term)) out += `\\,${body}`;
    // Si guarda il testo, non l'albero: (−x)·y comincia con una parentesi, non con un meno, e si somma.
    else if (body.startsWith("-")) out += ` - ${body.slice(1)}`;
    else out += ` + ${body}`;
  });
  return out;
}

/** L'argomento di un meno: le somme e i termini che cominciano con un meno vogliono le parentesi. */
function renderNegated(arg: Expr): string {
  const body = render(arg);
  return (arg.kind === "add" && !isAngleSum(arg)) || body.startsWith("-") ? parens(body) : body;
}

type FactorShape = "number" | "fraction" | "letter" | "group" | "function" | "other";

/** Come appare un fattore, per decidere se tra due fattori serve il punto di moltiplicazione. */
function shapeOf(expr: Expr): FactorShape {
  switch (expr.kind) {
    case "num":
      return expr.decimals === undefined && !expr.value.isInteger() ? "fraction" : "number";
    case "sym":
    case "const":
      return "letter";
    case "div":
      return "fraction";
    case "add":
    case "neg":
      return "group";
    case "fn":
      // 5! e 30° appaiono come il loro argomento (un numero, una lettera); con le parentesi come un gruppo.
      if (isPostfix(expr)) return isSimplePostfixArgument(expr.arg) ? shapeOf(expr.arg) : "group";
      return "function";
    case "log":
      return "function";
    case "pow":
      // Una potenza appare come la sua base: 2^3 come un numero, x^2 come una lettera, (x+1)^2 come una parentesi.
      return expr.base.kind === "num" && expr.base.value.sign() >= 0 && shapeOf(expr.base) === "number"
        ? "number"
        : expr.base.kind === "sym" || expr.base.kind === "const"
          ? "letter"
          : expr.base.kind === "fn" && !isPostfix(expr.base)
            ? "function"
            : "group";
    case "root":
    case "abs":
      return "other";
    case "mul":
      return "group";
  }
}

function renderProduct(factors: readonly Expr[]): string {
  let out = "";
  let previous: FactorShape | null = null;
  let afterFactorial = false;
  factors.forEach((factor, index) => {
    const needsParens =
      factor.kind === "add" || factor.kind === "mul" || factor.kind === "neg" || (index > 0 && startsWithMinus(factor));
    const body = needsParens ? parens(render(factor)) : render(factor);
    // Un numero negativo tra parentesi resta un numero: 2·(−3), non 2(−3).
    const shape: FactorShape = needsParens && factor.kind !== "num" ? "group" : shapeOf(factor);
    if (previous !== null) {
      // Il punto serve: davanti a un numero (2·3, x·2), tra frazioni e numeri (2·½ si leggerebbe «due e mezzo»),
      // e dopo una funzione senza parentesi (sin x · y).
      const dot =
        shape === "number" ||
        (shape === "fraction" && (previous === "number" || previous === "fraction")) ||
        previous === "function" ||
        afterFactorial;
      // Dopo un comando LaTeX (\pi) una lettera va staccata, altrimenti si fonderebbe con il nome del comando.
      const glued = /\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z]/.test(body);
      out += dot ? " \\cdot " : shape === "function" || glued ? " " : "";
    }
    out += body;
    previous = shape;
    // Dopo un fattoriale il punto serve sempre: n! · k, non n!k.
    afterFactorial = factor.kind === "fn" && factor.name === "factorial";
  });
  return out;
}

function renderPower(base: Expr, exp: Expr): string {
  const exponent = `^{${render(exp)}}`;
  // sin²x: l'esponente intero positivo di una funzione si scrive attaccato al nome.
  if (base.kind === "fn" && !isPostfix(base) && exp.kind === "num" && exp.value.isInteger() && exp.value.sign() > 0) {
    return `${functionTable[base.name].latex}${exponent}${renderArgument(base.arg)}`;
  }
  const simple =
    (base.kind === "num" && base.value.sign() >= 0 && shapeOf(base) === "number") ||
    base.kind === "sym" ||
    base.kind === "const" ||
    base.kind === "abs";
  return `${simple ? render(base) : parens(render(base))}${exponent}`;
}

/** L'argomento di una funzione: senza parentesi se è semplice (sin x, sin 2x, ln x²), con le parentesi altrimenti. */
function renderArgument(arg: Expr): string {
  return isSimpleArgument(arg) ? ` ${render(arg)}` : parens(render(arg));
}

function isSimpleArgument(arg: Expr): boolean {
  // sin 30°, cos 30°15′: un angolo in gradi scritto con un numero non vuole parentesi.
  if (isAngleSum(arg)) return arg.kind === "add" && arg.terms.every((term) => term.kind === "fn" && term.arg.kind === "num" && term.arg.value.sign() >= 0);
  switch (arg.kind) {
    case "num":
      return arg.value.sign() >= 0;
    case "sym":
    case "const":
    case "root":
    case "abs":
    case "div":
      return true;
    case "fn":
      return isAngle(arg) && arg.arg.kind === "num" && arg.arg.value.sign() >= 0;
    case "pow":
      return arg.base.kind === "sym" || arg.base.kind === "const";
    case "mul":
      return arg.factors.every((factor, index) => {
        if (factor.kind === "num") return index === 0 && factor.value.sign() >= 0;
        return factor.kind === "sym" || factor.kind === "const" || (factor.kind === "pow" && factor.base.kind === "sym");
      });
    default:
      return false;
  }
}
