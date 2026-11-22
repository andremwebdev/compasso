// Costruttori delle espressioni. Costruiscono nodi fedeli, senza semplificare:
// add(x, num(0)) resta «x + 0» e mul(1, x) resta «1x». La pulizia (coefficienti 1 nascosti,
// frazioni ridotte, segni sistemati) è compito di algebra/simplify.ts, non dei costruttori.

import { EngineError } from "../errors";
import { Rational, type RationalLike } from "../numbers/rational";
import type { ConstExpr, Expr, FunctionName, NumExpr, Relation, RelationOp, SymExpr } from "./types";

/** Dove serve un'espressione si può passare anche un numero intero o un razionale. */
export type ExprLike = Expr | RationalLike;

export function toExpr(value: ExprLike): Expr {
  return typeof value === "object" && "kind" in value ? value : num(value);
}

/** Numero esatto: num(3), num(-2), num(Rational.of(3, 4)). */
export function num(value: RationalLike): NumExpr {
  return { kind: "num", value: Rational.from(value) };
}

/** Frazione numerica p/q come numero esatto (ridotta). Per una frazione non ridotta usa div(6, 4). */
export function frac(n: bigint | number, d: bigint | number): NumExpr {
  return num(Rational.of(n, d));
}

/** Numero scritto come decimale: decimal("1,50") vale 3/2 e si mostra come 1,50. */
export function decimal(text: string): NumExpr {
  const negative = text.startsWith("-");
  const { value, decimals } = Rational.parseDecimal(negative ? text.slice(1) : text);
  return { kind: "num", value: negative ? value.neg() : value, decimals };
}

export function sym(name: string): SymExpr {
  if (!/^\p{L}[\p{L}\p{N}_]*$/u.test(name) && name !== "□") throw new EngineError(`Nome di variabile non valido: «${name}».`);
  return { kind: "sym", name };
}

export const pi: ConstExpr = { kind: "const", name: "pi" };
export const e: ConstExpr = { kind: "const", name: "e" };
export const i: ConstExpr = { kind: "const", name: "i" };

/** Somma. Con un solo termine restituisce il termine stesso. */
export function add(...terms: ExprLike[]): Expr {
  if (terms.length === 0) throw new EngineError("add: serve almeno un termine.");
  if (terms.length === 1) return toExpr(terms[0] as ExprLike);
  return { kind: "add", terms: terms.map(toExpr) };
}

/** Differenza a − b − c…: somma del primo termine e degli opposti degli altri. */
export function sub(first: ExprLike, ...rest: ExprLike[]): Expr {
  return add(first, ...rest.map((term) => neg(term)));
}

/** Opposto. L'opposto di un numero positivo scritto in cifre è direttamente il numero negativo: neg(3) è −3. */
export function neg(arg: ExprLike): Expr {
  const inner = toExpr(arg);
  if (inner.kind === "num" && inner.value.sign() > 0) return { ...inner, value: inner.value.neg() };
  return { kind: "neg", arg: inner };
}

/** Prodotto. Con un solo fattore restituisce il fattore stesso. */
export function mul(...factors: ExprLike[]): Expr {
  if (factors.length === 0) throw new EngineError("mul: serve almeno un fattore.");
  if (factors.length === 1) return toExpr(factors[0] as ExprLike);
  return { kind: "mul", factors: factors.map(toExpr) };
}

export function div(numerator: ExprLike, denominator: ExprLike): Expr {
  return { kind: "div", num: toExpr(numerator), den: toExpr(denominator) };
}

export function pow(base: ExprLike, exp: ExprLike): Expr {
  return { kind: "pow", base: toExpr(base), exp: toExpr(exp) };
}

export function sqrt(arg: ExprLike): Expr {
  return { kind: "root", index: 2, arg: toExpr(arg) };
}

export function root(index: number, arg: ExprLike): Expr {
  if (!Number.isInteger(index) || index < 2) throw new EngineError("root: l'indice deve essere un intero maggiore o uguale a 2.");
  return { kind: "root", index, arg: toExpr(arg) };
}

export function abs(arg: ExprLike): Expr {
  return { kind: "abs", arg: toExpr(arg) };
}

export function fn(name: FunctionName, arg: ExprLike): Expr {
  return { kind: "fn", name, arg: toExpr(arg) };
}

export const sin = (arg: ExprLike): Expr => fn("sin", arg);
export const cos = (arg: ExprLike): Expr => fn("cos", arg);
export const tan = (arg: ExprLike): Expr => fn("tan", arg);
export const ln = (arg: ExprLike): Expr => fn("ln", arg);

/** Fattoriale: factorial(5) si scrive 5!, factorial(sym("n")) si scrive n!. */
export const factorial = (arg: ExprLike): Expr => fn("factorial", arg);

/**
 * Angolo in gradi sessagesimali (vale in radianti): degrees(30) è 30°, degrees(30, 15) è 30°15′,
 * degrees(30, 15, 20) è 30°15′20″. Primi e secondi si sommano ai gradi e si mostrano attaccati.
 */
export function degrees(deg: ExprLike, minutes?: ExprLike, seconds?: ExprLike): Expr {
  const parts: Expr[] = [fn("deg", deg)];
  if (minutes !== undefined) parts.push(fn("arcmin", minutes));
  if (seconds !== undefined) parts.push(fn("arcsec", seconds));
  return parts.length === 1 ? (parts[0] as Expr) : { kind: "add", terms: parts };
}

/**
 * Numero periodico scritto con il periodo tra parentesi: repeatingDecimal("0,1(6)") vale 1/6 e si mostra
 * 0,1 con il 6 sopralineato. Accetta anche il punto al posto della virgola e un meno davanti.
 */
export function repeatingDecimal(text: string): Expr {
  const match = /^(-?)(\d+)[.,](\d*)\((\d+)\)$/.exec(text);
  if (!match) throw new EngineError(`Numero periodico non valido: «${text}».`);
  const [, sign = "", integer = "", antiperiod = "", period = ""] = match;
  const value: NumExpr = { kind: "num", value: repeatingValue(integer, antiperiod, period), repeating: { integer, antiperiod, period } };
  return sign === "-" ? neg(value) : value;
}

/**
 * Valore esatto di un numero periodico (frazione generatrice): il numero scritto senza virgola meno
 * quello senza il periodo, fratto tanti 9 quante le cifre del periodo seguiti da tanti 0 quante
 * quelle dell'antiperiodo. 0,1(6) = (16 − 1)/90 = 1/6.
 */
export function repeatingValue(integer: string, antiperiod: string, period: string): Rational {
  if (period === "") return Rational.of(BigInt(integer + antiperiod), 10n ** BigInt(antiperiod.length));
  const whole = BigInt(integer + antiperiod + period);
  const head = BigInt(integer + antiperiod);
  const den = (10n ** BigInt(period.length) - 1n) * 10n ** BigInt(antiperiod.length);
  return Rational.of(whole - head, den);
}

/** Esponenziale e^x. */
export const exp = (arg: ExprLike): Expr => pow(e, arg);

/** Logaritmo in base data: log(2, x) è il logaritmo in base 2 di x. */
export function log(base: ExprLike, arg: ExprLike): Expr {
  return { kind: "log", base: toExpr(base), arg: toExpr(arg) };
}

/** Equazione o disequazione: relation(x, "<=", 3). */
export function relation(left: ExprLike, op: RelationOp, right: ExprLike): Relation {
  return { kind: "relation", op, left: toExpr(left), right: toExpr(right) };
}
