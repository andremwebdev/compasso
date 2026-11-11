// Dall'albero di un'espressione alla sua forma normale (quoziente di polinomi negli atomi).
// Ogni riduzione usata qui vale ovunque le due scritture sono definite: è la condizione perché
// «stessa forma normale» significhi davvero «espressioni equivalenti».

import { EngineError } from "../errors";
import type { Expr, FunctionName } from "../expr/types";
import { extractPower, iroot } from "../numbers/integers";
import { Rational } from "../numbers/rational";
import { Surd } from "../numbers/surd";
import { NormalContext, Poly, Ratio } from "./poly";

const KEY_PI = "π";
const KEY_E = "ℯ";
const KEY_I = "ⅈ";

/** Funzioni dispari: f(−x) = −f(x). Il coseno è pari; il logaritmo non ha parità. */
const ODD_FUNCTIONS: ReadonlySet<FunctionName> = new Set(["sin", "tan", "cot", "arcsin", "arctan"]);

/** Forma normale di un'espressione nel contesto dato. Può lanciare EngineError (divisione per zero, troppo complessa). */
export function normalize(expr: Expr, ctx: NormalContext): Ratio {
  switch (expr.kind) {
    case "num":
      return Ratio.constant(Surd.from(expr.value));
    case "sym":
      return Ratio.fromPoly(ctx.atom({ key: expr.name, expr, independent: true }));
    case "const":
      if (expr.name === "pi") return Ratio.fromPoly(ctx.atom({ key: KEY_PI, expr, independent: true }));
      if (expr.name === "e") return Ratio.fromPoly(ctx.atom({ key: KEY_E, expr, independent: true }));
      return imaginaryUnit(ctx);
    case "add":
      return expr.terms.reduce<Ratio>((sum, term) => sum.add(normalize(term, ctx), ctx), Ratio.ZERO);
    case "neg":
      return normalize(expr.arg, ctx).neg();
    case "mul":
      return expr.factors.reduce<Ratio>((product, factor) => product.mul(normalize(factor, ctx), ctx), Ratio.ONE);
    case "div":
      return normalize(expr.num, ctx).div(normalize(expr.den, ctx), ctx);
    case "pow":
      return normalizePower(expr.base, expr.exp, ctx);
    case "root":
      return normalizeRoot(expr.index, expr.arg, ctx);
    case "abs":
      return normalizeAbs(expr.arg, ctx);
    case "fn":
      return normalizeFunction(expr.name, expr.arg, ctx);
    case "log":
      // Cambio di base: log_b(a) = ln(a)/ln(b).
      return normalizeFunction("ln", expr.arg, ctx).div(normalizeFunction("ln", expr.base, ctx), ctx);
  }
}

function imaginaryUnit(ctx: NormalContext): Ratio {
  return Ratio.fromPoly(
    ctx.atom({
      key: KEY_I,
      expr: { kind: "const", name: "i" },
      independent: true,
      reduce: { power: 2, value: Poly.constant(Surd.from(-1)) },
    }),
  );
}

/** Il valore razionale di una forma normale costante senza radici; altrimenti null. */
function rationalValue(ratio: Ratio): Rational | null {
  const constant = ratio.constant();
  return constant && constant.isRational() ? constant.toRational() : null;
}

function normalizePower(base: Expr, exp: Expr, ctx: NormalContext): Ratio {
  const exponent = normalize(exp, ctx);
  const k = rationalValue(exponent);
  if (k) {
    if (k.d > 1000n || k.abs().n > 1000n) throw new EngineError("Esponente troppo grande.");
    // Esponente intero: potenza vera. Esponente p/q: potenza p-esima della radice q-esima.
    const root = k.isInteger() ? normalize(base, ctx) : normalizeRoot(Number(k.d), base, ctx);
    return root.pow(Number(k.n), ctx);
  }
  const normalBase = normalize(base, ctx);
  if (normalBase.constant()?.eq(1)) return Ratio.ONE;
  // Esponente non numerico (e^x, 2^(x+1), x^x): un atomo unico, identificato da base ed esponente.
  return Ratio.fromPoly(
    ctx.atom({ key: `pow(${normalBase.key()},${exponent.key()})`, expr: { kind: "pow", base, exp }, independent: false }),
  );
}

function normalizeRoot(index: number, arg: Expr, ctx: NormalContext): Ratio {
  const inner = normalize(arg, ctx);
  const r = rationalValue(inner);
  if (r) {
    if (r.isZero()) return Ratio.ZERO;
    if (r.sign() > 0) return rootOfPositive(index, r, ctx);
    if (index % 2 === 1) return rootOfPositive(index, r.neg(), ctx).neg();
    // Radice quadrata di un negativo: √(−4) = 2i. Per gli altri indici pari resta un atomo.
    if (index === 2) return rootOfPositive(2, r.neg(), ctx).mul(imaginaryUnit(ctx), ctx);
  }
  return Ratio.fromPoly(
    ctx.atom({
      key: `root${index}(${inner.key()})`,
      expr: { kind: "root", index, arg },
      independent: false,
      ...(inner.isPoly() ? { reduce: { power: index, value: inner.num } } : {}),
    }),
  );
}

/** Radice n-esima esatta di un razionale positivo: coefficiente razionale per una radice in forma normale. */
function rootOfPositive(index: number, r: Rational, ctx: NormalContext): Ratio {
  if (index === 2) return Ratio.constant(Surd.sqrt(r));
  // ⁿ√(p/q) = ⁿ√(p·qⁿ⁻¹) / q, poi si porta fuori la potenza n-esima più grande.
  const { outside, inside } = extractPower(r.n * r.d ** BigInt(index - 1), index);
  const coefficient = Surd.from(Rational.of(outside, r.d));
  if (inside === 1n) return Ratio.constant(coefficient);
  // Riduzione dell'indice: ⁶√8 = √2, perché 8 = 2³ e 3 divide 6.
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
  if (reduced === 1) return Ratio.constant(coefficient.mul(Surd.from(Rational.of(radicand))));
  if (reduced === 2) return Ratio.constant(coefficient.mul(Surd.sqrt(Rational.of(radicand))));
  const atom = ctx.atom({
    key: `root${reduced}(${radicand})`,
    expr: { kind: "root", index: reduced, arg: { kind: "num", value: Rational.of(radicand) } },
    independent: false,
    reduce: { power: reduced, value: Poly.constant(Surd.from(Rational.of(radicand))) },
  });
  return Ratio.fromPoly(atom.scale(coefficient));
}

function normalizeAbs(arg: Expr, ctx: NormalContext): Ratio {
  const inner = normalize(arg, ctx);
  const constant = inner.constant();
  if (constant) return Ratio.constant(constant.sign() < 0 ? constant.neg() : constant);
  // |−x| = |x|: si sceglie sempre il rappresentante con primo coefficiente positivo.
  const canonical = inner.leadingSignNegative() ? inner.neg() : inner;
  return Ratio.fromPoly(
    ctx.atom({
      key: `abs(${canonical.key()})`,
      expr: { kind: "abs", arg },
      independent: false,
      ...(canonical.isPoly() ? { reduce: { power: 2, value: canonical.num.mul(canonical.num, ctx) } } : {}),
    }),
  );
}

function normalizeFunction(name: FunctionName, arg: Expr, ctx: NormalContext): Ratio {
  let inner = normalize(arg, ctx);
  const constant = inner.constant();

  // I pochi valori esatti che non richiedono tabelle.
  if (constant?.isZero() && (name === "sin" || name === "tan" || name === "arcsin" || name === "arctan")) return Ratio.ZERO;
  if (constant?.isZero() && name === "cos") return Ratio.ONE;
  if (name === "ln" && constant?.eq(1)) return Ratio.ZERO;
  if (name === "ln" && inner.key() === `[1]${KEY_E}`) return Ratio.ONE;

  // Parità: sin(−x) = −sin(x), cos(−x) = cos(x). L'argomento canonico ha primo coefficiente positivo.
  const flipped = inner.leadingSignNegative() && (ODD_FUNCTIONS.has(name) || name === "cos");
  if (flipped) inner = inner.neg();
  const atom = Ratio.fromPoly(
    ctx.atom({
      key: `${name}(${inner.key()})`,
      expr: { kind: "fn", name, arg: flipped ? { kind: "neg", arg } : arg },
      independent: false,
    }),
  );
  return flipped && ODD_FUNCTIONS.has(name) ? atom.neg() : atom;
}

/** Forma normale in un contesto nuovo; null se non si riesce a calcolarla (divisione per zero, troppo complessa). */
export function tryNormalize(expr: Expr, ctx: NormalContext = new NormalContext()): Ratio | null {
  try {
    return normalize(expr, ctx);
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

/** Il valore esatto di un'espressione costante fatta di razionali e radici quadrate; null se non lo è. */
export function exactValue(expr: Expr): Surd | null {
  return tryNormalize(expr)?.constant() ?? null;
}
