// Pulizia di un'espressione per mostrarla (specifica, sezione 6: «semplificare quanto basta»):
// coefficienti 1 nascosti, segni sistemati, numeri moltiplicati tra loro, frazioni ridotte e con una
// sola linea di frazione, fattori uguali riuniti in potenze, termini simili sommati, radicali
// numerici in forma normale (√8 = 2√2, 1/√2 = √2/2), potenze di i ridotte.
//
// Non sviluppa i prodotti e non scompone: (x+1)(x−1) resta com'è (per quello ci sono expand e i
// passaggi di scomposizione). Ogni regola vale ovunque le due scritture sono definite, quindi il
// risultato è sempre equivalente all'espressione di partenza.

import { EngineError } from "../errors";
import { literalRational } from "../expr/evaluate";
import type { Expr, FunctionName } from "../expr/types";
import { exprKey } from "../expr/walk";
import { extractPower, iroot } from "../numbers/integers";
import { Rational } from "../numbers/rational";

/** Un fattore di un prodotto: base^exp, con esponente razionale. */
interface Factor {
  readonly base: Expr;
  exp: Rational;
}

/** Un prodotto in lavorazione: coefficiente numerico per potenze di fattori distinti. */
class Product {
  coeff: Rational = Rational.ONE;
  /** Fattori per chiave di struttura della base, nell'ordine in cui sono comparsi. */
  readonly factors = new Map<string, Factor>();

  /** Moltiplica il coefficiente per value^power. */
  scale(value: Rational, power: number): void {
    if (value.isZero()) {
      if (power < 0) throw new EngineError("Divisione per zero.");
      this.coeff = Rational.ZERO;
      return;
    }
    this.coeff = this.coeff.mul(value.pow(power));
  }

  multiply(base: Expr, exp: Rational): void {
    const key = exprKey(base);
    const existing = this.factors.get(key);
    if (existing) existing.exp = existing.exp.add(exp);
    else this.factors.set(key, { base, exp });
  }

  hasFactors(): boolean {
    return this.factors.size > 0;
  }
}

/** Le espressioni già pulite: ripassarci non costa nulla. È solo una memoria di lavoro, non cambia i risultati. */
const SIMPLIFIED = new WeakSet<Expr>();

const ZERO: Expr = { kind: "num", value: Rational.ZERO };
const numberExpr = (value: Rational): Expr => ({ kind: "num", value });

/** Oltre questa lunghezza (in cifre) una potenza numerica non si calcola: resta scritta come potenza. */
const DIGIT_LIMIT = 60;

function tooBig(value: Rational, power: number): boolean {
  const digits = Math.max(value.n.toString().length, value.d.toString().length);
  return digits * Math.abs(power) > DIGIT_LIMIT;
}

const OPAQUE_KINDS: ReadonlySet<Expr["kind"]> = new Set(["add", "abs", "fn", "log", "sym", "const"]);

/** Aggiunge al prodotto expr^power (power intero, anche negativo). */
function collect(expr: Expr, power: number, product: Product): void {
  if (power === 0) return;
  switch (expr.kind) {
    case "num":
      if (tooBig(expr.value, power)) product.multiply(numberExpr(expr.value.abs()), Rational.of(power));
      else product.scale(expr.value.abs(), power);
      if (expr.value.sign() < 0 && power % 2 !== 0) product.coeff = product.coeff.neg();
      return;
    case "neg":
      if (power % 2 !== 0) product.coeff = product.coeff.neg();
      collect(expr.arg, power, product);
      return;
    case "mul":
      for (const factor of expr.factors) collect(factor, power, product);
      return;
    case "div":
      collect(expr.num, power, product);
      collect(expr.den, -power, product);
      return;
    case "pow":
      collectPower(expr.base, expr.exp, power, product);
      return;
    case "root":
      collectRoot(expr.index, simplify(expr.arg), power, product);
      return;
    case "sym":
    case "const":
      product.multiply(expr, Rational.of(power));
      return;
    case "add":
    case "abs":
    case "fn":
    case "log": {
      const clean = simplify(expr);
      if (OPAQUE_KINDS.has(clean.kind)) product.multiply(clean, Rational.of(power));
      else collect(clean, power, product);
      return;
    }
  }
}

function collectPower(base: Expr, exp: Expr, power: number, product: Product): void {
  const exponent = simplify(exp);
  const value = literalRational(exponent);
  if (value !== null && value.isInteger() && value.abs().n <= 1000n) {
    // Esponente intero: la potenza si distribuisce sui fattori della base, (2x)² = 4x².
    collect(base, power * Number(value.n), product);
    return;
  }
  const cleanBase = simplify(base);
  if (value !== null && value.d <= 1000n && value.abs().n <= 1000n) {
    // Esponente p/q: su un numero positivo è una radice, 8^(2/3) = (∛8)² = 4.
    if (cleanBase.kind === "num" && cleanBase.value.sign() > 0) {
      collectRoot(Number(value.d), cleanBase, Number(value.n) * power, product);
      return;
    }
    if (cleanBase.kind === "num" && cleanBase.value.isZero() && value.sign() > 0 && power > 0) {
      product.coeff = Rational.ZERO;
      return;
    }
    if (cleanBase.kind !== "num") {
      product.multiply(cleanBase, value.mul(power));
      return;
    }
  }
  if (cleanBase.kind === "num" && cleanBase.value.eq(1)) return;
  // Esponente con lettere (e^x, 2^(x+1)) o caso particolare: la potenza resta un fattore unico.
  product.multiply({ kind: "pow", base: cleanBase, exp: exponent }, Rational.of(power));
}

/** Radice di indice `index` di un argomento già pulito, elevata a `power`. */
function collectRoot(index: number, arg: Expr, power: number, product: Product): void {
  if (arg.kind === "num") {
    const value = arg.value;
    if (value.isZero()) {
      if (power < 0) throw new EngineError("Divisione per zero.");
      product.coeff = Rational.ZERO;
      return;
    }
    // Radice di indice dispari di un negativo: il segno esce, ∛(−8) = −2.
    if ((value.sign() > 0 || index % 2 === 1) && collectNumericRoot(index, value.abs(), power, product)) {
      if (value.sign() < 0 && power % 2 !== 0) product.coeff = product.coeff.neg();
      return;
    }
  }
  product.multiply({ kind: "root", index, arg }, Rational.of(power));
}

/**
 * Radice di un razionale positivo in forma normale: si porta fuori tutto il possibile e si riduce
 * l'indice (√8 = 2√2, √(1/2) = √2/2, ⁶√8 = √2). Falso se i numeri sono troppo grandi.
 */
function collectNumericRoot(index: number, value: Rational, power: number, product: Product): boolean {
  let outside: bigint;
  let inside: bigint;
  try {
    ({ outside, inside } = extractPower(value.n * value.d ** BigInt(index - 1), index));
  } catch (error) {
    if (error instanceof EngineError) return false;
    throw error;
  }
  const coefficient = Rational.of(outside, value.d);
  if (tooBig(coefficient, power)) return false;
  product.scale(coefficient, power);
  if (inside === 1n) return true;
  let radicand = inside;
  let reduced = index;
  for (let d = index; d >= 2; d--) {
    if (index % d !== 0) continue;
    const t = iroot(inside, d);
    if (t ** BigInt(d) === inside) {
      radicand = t;
      reduced = index / d;
      break;
    }
  }
  if (reduced === 1) product.scale(Rational.of(radicand), power);
  else product.multiply({ kind: "root", index: reduced, arg: numberExpr(Rational.of(radicand)) }, Rational.of(power));
  return true;
}

/** Applica le riduzioni che dipendono dall'esponente totale: i² = −1, (ⁿ√a)ⁿ = a, 1/√2 = √2/2. */
function reduce(product: Product): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, factor] of product.factors) {
      if (factor.exp.isZero()) {
        product.factors.delete(key);
        continue;
      }
      if (!factor.exp.isInteger() || factor.exp.abs().n > 100000n) continue;
      const k = Number(factor.exp.n);
      const { base } = factor;
      if (base.kind === "const" && base.name === "i") {
        if (k === 1) continue;
        const r = ((k % 4) + 4) % 4;
        factor.exp = Rational.of(r % 2);
        if (r >= 2) product.coeff = product.coeff.neg();
        changed = true;
      } else if (base.kind === "root") {
        const q = Math.floor(k / base.index);
        if (q === 0) continue;
        if (base.arg.kind === "num") {
          // Radicando numerico: l'esponente si riporta tra 0 e indice−1 (questo razionalizza i denominatori).
          if (tooBig(base.arg.value, q)) continue;
          factor.exp = Rational.of(k - q * base.index);
          product.scale(base.arg.value, q);
          changed = true;
        } else if (q > 0) {
          factor.exp = Rational.of(k - q * base.index);
          collect(base.arg, q, product);
          changed = true;
        }
      }
    }
  }
}

function decompose(expr: Expr): Product {
  const product = new Product();
  collect(expr, 1, product);
  reduce(product);
  return product;
}

/** Posto di un fattore nel prodotto scritto: 2√3·π·i·x·eˣ·(x+1)·sin x. */
function rank(base: Expr): number {
  switch (base.kind) {
    case "num":
      return 0;
    case "root":
      return base.arg.kind === "num" ? 0 : 6;
    case "const":
      return base.name === "i" ? 2 : 1;
    case "add":
      return 5;
    case "fn":
    case "log":
      return 6;
    case "sym":
      return 3;
    default:
      return 4;
  }
}

function factorExpr(base: Expr, exp: Rational): Expr {
  if (exp.eq(1)) return base;
  // (e^x)² si scrive e^(2x): con esponente intero le due scritture coincidono.
  if (base.kind === "pow" && exp.isInteger()) {
    return { kind: "pow", base: base.base, exp: simplify({ kind: "mul", factors: [numberExpr(exp), base.exp] }) };
  }
  return { kind: "pow", base, exp: numberExpr(exp) };
}

function productExpr(parts: Expr[]): Expr {
  return parts.length === 1 ? (parts[0] as Expr) : { kind: "mul", factors: parts };
}

/** Dal prodotto in lavorazione all'espressione scritta: segno davanti, una sola linea di frazione. */
function build(product: Product): Expr {
  const { coeff } = product;
  if (coeff.isZero()) return ZERO;
  const factors = [...product.factors.values()].filter((factor) => !factor.exp.isZero());
  if (factors.length === 0) return numberExpr(coeff);
  // Fattori dello stesso tipo restano nell'ordine in cui sono stati scritti; le lettere vanno in ordine alfabetico.
  const ordered = factors
    .map((factor, index) => ({ factor, index }))
    .sort((a, b) => {
      const byRank = rank(a.factor.base) - rank(b.factor.base);
      if (byRank !== 0) return byRank;
      const [x, y] = [a.factor.base, b.factor.base];
      if (x.kind === "sym" && y.kind === "sym" && x.name !== y.name) return x.name < y.name ? -1 : 1;
      return a.index - b.index;
    });
  const upper: Expr[] = [];
  const lower: Expr[] = [];
  for (const { factor } of ordered) {
    if (factor.exp.sign() > 0) upper.push(factorExpr(factor.base, factor.exp));
    else lower.push(factorExpr(factor.base, factor.exp.neg()));
  }
  const magnitude = coeff.abs();
  if (magnitude.n !== 1n || upper.length === 0) upper.unshift(numberExpr(Rational.of(magnitude.n)));
  if (magnitude.d !== 1n) lower.unshift(numberExpr(Rational.of(magnitude.d)));
  const body: Expr = lower.length === 0 ? productExpr(upper) : { kind: "div", num: productExpr(upper), den: productExpr(lower) };
  return coeff.sign() < 0 ? { kind: "neg", arg: body } : body;
}

/** Somma di termini già puliti: apre le somme annidate, somma i termini simili, toglie gli zeri. */
function simplifySum(terms: readonly Expr[]): Expr {
  const flat: Expr[] = [];
  const open = (term: Expr, negative: boolean): void => {
    if (term.kind === "add") for (const inner of term.terms) open(inner, negative);
    else if (term.kind === "neg" && term.arg.kind === "add") open(term.arg, !negative);
    else flat.push(negative ? { kind: "neg", arg: term } : term);
  };
  for (const term of terms) open(term, false);

  const groups = new Map<string, { product: Product; coeff: Rational }>();
  for (const term of flat) {
    const product = decompose(term);
    const coeff = product.coeff;
    product.coeff = Rational.ONE;
    const key = product.hasFactors() ? exprKey(build(product)) : "";
    const group = groups.get(key);
    if (group) group.coeff = group.coeff.add(coeff);
    else groups.set(key, { product, coeff });
  }
  const result: Expr[] = [];
  for (const { product, coeff } of groups.values()) {
    if (coeff.isZero()) continue;
    product.coeff = coeff;
    result.push(build(product));
  }
  if (result.length === 0) return ZERO;
  return result.length === 1 ? (result[0] as Expr) : { kind: "add", terms: result };
}

const ODD_FUNCTIONS: ReadonlySet<FunctionName> = new Set(["sin", "tan", "cot", "arcsin", "arctan"]);
const ZERO_AT_ZERO: ReadonlySet<FunctionName> = new Set(["sin", "tan", "arcsin", "arctan"]);

function simplifyFunction(name: FunctionName, arg: Expr): Expr {
  const isNumber = (value: number): boolean => arg.kind === "num" && arg.value.eq(value);
  if (isNumber(0) && ZERO_AT_ZERO.has(name)) return ZERO;
  if (isNumber(0) && name === "cos") return numberExpr(Rational.ONE);
  if (isNumber(1) && (name === "ln" || name === "arccos")) return ZERO;
  if (name === "ln" && arg.kind === "const" && arg.name === "e") return numberExpr(Rational.ONE);
  if (name === "ln") {
    // ln(e^k) = k: ln(1/e) = −1, ln(e²) = 2.
    const product = decompose(arg);
    const [only] = [...product.factors.values()];
    if (product.coeff.eq(1) && product.factors.size === 1 && only && only.base.kind === "const" && only.base.name === "e") return numberExpr(only.exp);
  }
  // Parità: sin(−x) = −sin x, cos(−x) = cos x.
  if (ODD_FUNCTIONS.has(name) || name === "cos") {
    const product = decompose(arg);
    if (product.coeff.sign() < 0) {
      product.coeff = product.coeff.neg();
      const positive: Expr = { kind: "fn", name, arg: build(product) };
      return name === "cos" ? positive : { kind: "neg", arg: positive };
    }
  }
  return { kind: "fn", name, arg };
}

function simplifyNode(expr: Expr): Expr {
  switch (expr.kind) {
    case "num":
    case "sym":
    case "const":
      return expr;
    case "add":
      return simplifySum(expr.terms.map(simplify));
    case "neg":
    case "mul":
    case "div":
    case "pow":
    case "root":
      return build(decompose(expr));
    case "abs": {
      const arg = simplify(expr.arg);
      if (arg.kind === "abs") return arg;
      const product = decompose(arg);
      // |−x| = |x|, |−3| = 3.
      product.coeff = product.coeff.abs();
      return product.hasFactors() ? { kind: "abs", arg: build(product) } : numberExpr(product.coeff);
    }
    case "fn":
      return simplifyFunction(expr.name, simplify(expr.arg));
    case "log": {
      const base = simplify(expr.base);
      const arg = simplify(expr.arg);
      if (arg.kind === "num" && arg.value.eq(1)) return ZERO;
      if (exprKey(base) === exprKey(arg)) return numberExpr(Rational.ONE);
      return { kind: "log", base, arg };
    }
  }
}

/**
 * Pulisce un'espressione per mostrarla. Il risultato è equivalente all'originale.
 * Lancia EngineError se l'espressione contiene una divisione per zero scritta in chiaro.
 */
export function simplify(expr: Expr): Expr {
  if (SIMPLIFIED.has(expr)) return expr;
  const result = simplifyNode(expr);
  SIMPLIFIED.add(result);
  return result;
}
