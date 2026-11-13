// Vincoli di forma (specifica, sezioni 6 e 7): quando l'esercizio chiede una forma precisa, la
// risposta deve essere equivalente alla giusta E scritta in quella forma.
//
// Qui si guarda solo la forma, cioè l'albero così com'è stato scritto. L'equivalenza si controlla a parte.
// Ogni controllo fallito spiega il motivo in italiano, con le formule tra $...$.

import { tryNormalize } from "../algebra/normalize";
import { simplify } from "../algebra/simplify";
import { monomialKey, NormalContext } from "../algebra/poly";
import { areCoprime, integerContent, isIrreducible } from "../algebra/specialize";
import { equivalent } from "../equivalence/equivalence";
import { EngineError } from "../errors";
import { evaluate, literalRational } from "../expr/evaluate";
import { toLatex } from "../expr/latex";
import type { Expr } from "../expr/types";
import { children, isConstant, some } from "../expr/walk";
import { extractPower, gcd, iroot } from "../numbers/integers";

export const formConstraints = [
  "expanded",
  "factored",
  "reducedFraction",
  "rationalized",
  "simplifiedRadicals",
  "algebraicForm",
  "trigonometricForm",
  "exponentialForm",
] as const;

/**
 * - expanded: polinomio sviluppato e ridotto (somma di monomi, termini simili sommati);
 * - factored: scomposto in fattori irriducibili sui razionali;
 * - reducedFraction: frazioni ridotte ai minimi termini (numeriche e algebriche);
 * - rationalized: nessuna radice al denominatore;
 * - simplifiedRadicals: radicali in forma normale (niente da portare fuori, niente frazioni sotto radice);
 * - algebraicForm: numero complesso scritto come a + bi;
 * - trigonometricForm: numero complesso scritto come ρ(cos θ + i sin θ);
 * - exponentialForm: numero complesso scritto come ρ·e^(iθ).
 */
export type FormConstraint = (typeof formConstraints)[number];

export type FormCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const OK: FormCheck = { ok: true };
const fail = (reason: string): FormCheck => ({ ok: false, reason });
const tex = (expr: Expr): string => `$${toLatex(expr)}$`;

/** Controlla un vincolo di forma. */
export function checkForm(expr: Expr, constraint: FormConstraint): FormCheck {
  try {
    switch (constraint) {
      case "expanded":
        return checkExpanded(expr);
      case "factored":
        return checkFactored(expr);
      case "reducedFraction":
        return checkReducedFraction(expr);
      case "rationalized":
        return checkRationalized(expr);
      case "simplifiedRadicals":
        return checkSimplifiedRadicals(expr);
      case "algebraicForm":
        return checkAlgebraicForm(expr);
      case "trigonometricForm":
        return checkTrigonometricForm(expr);
      case "exponentialForm":
        return checkExponentialForm(expr);
    }
  } catch (error) {
    // Numeri fuori dai limiti del motore o espressione troppo complessa: non si riesce a dimostrare
    // che la forma è sbagliata, quindi non la si boccia.
    if (error instanceof EngineError) return OK;
    throw error;
  }
}

/** Controlla più vincoli e restituisce il primo che non è rispettato. */
export function checkForms(expr: Expr, constraints: readonly FormConstraint[]): FormCheck {
  for (const constraint of constraints) {
    const result = checkForm(expr, constraint);
    if (!result.ok) return result;
  }
  return OK;
}

const stripSign = (expr: Expr): Expr => (expr.kind === "neg" ? stripSign(expr.arg) : expr);

function isPositiveIntegerLiteral(expr: Expr): boolean {
  return expr.kind === "num" && expr.value.isInteger() && expr.value.sign() > 0;
}

// ───────────────────────────── expanded ─────────────────────────────

function checkExpanded(expr: Expr): FormCheck {
  const terms = expr.kind === "add" ? expr.terms : [expr];
  const ctx = new NormalContext();
  const seen = new Set<string>();
  for (const signed of terms) {
    const term = stripSign(signed);
    const problem = monomialProblem(term);
    if (problem) return fail(problem);
    // Termini simili: due termini con la stessa parte letterale vanno sommati.
    const normal = tryNormalize(term, ctx);
    if (normal?.num.isZero()) return fail(`Il termine ${tex(signed)} vale zero: si toglie.`);
    const only = normal?.isPoly() && normal.num.terms.size === 1 ? [...normal.num.terms.values()][0] : undefined;
    // Due termini sono simili se hanno la stessa parte letterale e lo stesso radicale: 2√2 e 3√2 sì,
    // 3 e 2√2 no. Un coefficiente con più radicali (una costante tra parentesi) non si confronta.
    if (only && only.coeff.terms.length === 1) {
      const key = `${monomialKey(only.mono)}|${(only.coeff.terms[0] as readonly [bigint, unknown])[0]}`;
      if (seen.has(key)) return fail("Ci sono termini simili ancora da sommare.");
      seen.add(key);
    }
  }
  return OK;
}

/** Dice perché un termine non è un monomio in forma normale; null se lo è. */
function monomialProblem(term: Expr): string | null {
  if (term.kind === "add") return `Ci sono parentesi ancora da togliere: ${tex(term)}.`;
  if (term.kind === "div") {
    if (!isConstant(term.den)) return `C'è una frazione con le lettere al denominatore: ${tex(term)}.`;
    return term.num.kind === "add" ? `La frazione ${tex(term)} va spezzata termine per termine.` : monomialProblem(stripSign(term.num));
  }
  const factors = term.kind === "mul" ? term.factors : [term];
  const bases = new Set<string>();
  let numbers = 0;
  for (const factor of factors) {
    if (factor.kind === "num") {
      numbers += 1;
      if (numbers > 1) return `Nel termine ${tex(term)} ci sono numeri ancora da moltiplicare.`;
      continue;
    }
    if (isConstant(factor)) continue;
    const base = factor.kind === "pow" && isPositiveIntegerLiteral(factor.exp) ? factor.base : factor;
    if (base.kind === "add" || base.kind === "mul" || base.kind === "neg" || base.kind === "div" || base.kind === "pow") {
      return `C'è ancora un prodotto o una potenza da sviluppare: ${tex(factor)}.`;
    }
    const key = toLatex(base);
    if (bases.has(key)) return `Nel termine ${tex(term)} la stessa lettera compare due volte: si usa una potenza.`;
    bases.add(key);
  }
  return null;
}

// ───────────────────────────── factored ─────────────────────────────

function checkFactored(expr: Expr): FormCheck {
  const core = stripSign(expr);
  if (core.kind === "div") {
    const numerator = checkFactored(core.num);
    return numerator.ok ? checkFactored(core.den) : numerator;
  }
  const ctx = new NormalContext();
  for (const factor of flattenProduct(core)) {
    const base = factor.kind === "pow" && isPositiveIntegerLiteral(factor.exp) ? stripSign(factor.base) : factor;
    if (isConstant(base) || base.kind === "sym") continue;
    const normal = tryNormalize(base, ctx);
    if (!normal || !normal.isPoly()) continue;
    const poly = normal.num;
    const content = integerContent([poly]);
    if (content !== null && content > 1n && poly.terms.size > 1) {
      return fail(`Nel fattore ${tex(base)} si può ancora raccogliere $${content}$.`);
    }
    if (isIrreducible(poly, ctx) === false) {
      return fail(
        factor === core ? `L'espressione ${tex(base)} non è scomposta: si può scrivere come prodotto di fattori.` : `Il fattore ${tex(base)} si può ancora scomporre.`,
      );
    }
  }
  return OK;
}

/** I fattori di un prodotto, aprendo i prodotti annidati e togliendo i segni. */
function flattenProduct(expr: Expr): Expr[] {
  const core = stripSign(expr);
  if (core.kind === "mul") return core.factors.flatMap(flattenProduct);
  // La potenza di un prodotto si guarda fattore per fattore: ((x+1)(x−1))² è scomposta.
  if (core.kind === "pow" && isPositiveIntegerLiteral(core.exp) && stripSign(core.base).kind === "mul") return flattenProduct(core.base);
  return [core];
}

// ───────────────────────────── reducedFraction ─────────────────────────────

function integerLiteral(expr: Expr): bigint | null {
  const value = literalRational(expr);
  return value && value.isInteger() && expr.kind !== "div" ? value.n : null;
}

function checkReducedFraction(expr: Expr): FormCheck {
  if (expr.kind === "div") {
    const n = integerLiteral(expr.num);
    const d = integerLiteral(expr.den);
    if (n !== null && d !== null) {
      if (d === 0n) return fail("Il denominatore non può essere zero.");
      if (d < 0n) return fail(`In ${tex(expr)} il segno meno va al numeratore o davanti alla frazione.`);
      if (d === 1n) return fail(`${tex(expr)} ha denominatore 1: si scrive come numero intero.`);
      if (gcd(n, d) > 1n) return fail(`La frazione ${tex(expr)} si può ancora semplificare.`);
    } else {
      const ctx = new NormalContext();
      const num = tryNormalize(expr.num, ctx);
      const den = tryNormalize(expr.den, ctx);
      if (num?.isPoly() && den?.isPoly() && !num.num.isZero()) {
        const content = integerContent([num.num, den.num]);
        if (content !== null && content > 1n) {
          return fail(`In ${tex(expr)} numeratore e denominatore si possono ancora dividere per $${content}$.`);
        }
        if (areCoprime(num.num, den.num, ctx) === false) {
          return fail(`In ${tex(expr)} numeratore e denominatore hanno ancora un fattore comune.`);
        }
      }
    }
  }
  for (const child of children(expr)) {
    const result = checkReducedFraction(child);
    if (!result.ok) return result;
  }
  return OK;
}

// ───────────────────────────── rationalized ─────────────────────────────

function hasRadical(expr: Expr): boolean {
  return some(expr, (node) => {
    if (node.kind === "root") return true;
    if (node.kind !== "pow") return false;
    const exponent = literalRational(node.exp);
    return exponent !== null && !exponent.isInteger();
  });
}

/** Vero se l'espressione, così com'è scritta, ha un denominatore: una frazione, un decimale, un esponente negativo. */
function hasDenominator(expr: Expr): boolean {
  switch (expr.kind) {
    case "div":
      return true;
    case "num":
      return !expr.value.isInteger();
    case "neg":
      return hasDenominator(expr.arg);
    case "mul":
      return expr.factors.some(hasDenominator);
    case "pow": {
      const exponent = literalRational(expr.exp);
      return (exponent !== null && exponent.sign() < 0) || hasDenominator(expr.base);
    }
    default:
      return false;
  }
}

function checkRationalized(expr: Expr): FormCheck {
  // Una frazione sotto radice nasconde una radice al denominatore: √(1/2) = 1/√2.
  const fractionalPower = expr.kind === "pow" && !(literalRational(expr.exp)?.isInteger() ?? true);
  if ((expr.kind === "root" && hasDenominator(expr.arg)) || (fractionalPower && expr.kind === "pow" && hasDenominator(expr.base))) {
    return fail(`In ${tex(expr)} c'è una frazione sotto radice: è ancora una radice al denominatore.`);
  }
  // Un esponente negativo è un denominatore nascosto: x^(−1/2) = 1/√x.
  const exponent = expr.kind === "pow" ? literalRational(expr.exp) : null;
  const offending =
    (expr.kind === "div" && hasRadical(expr.den)) ||
    (expr.kind === "pow" && exponent !== null && exponent.sign() < 0 && (!exponent.isInteger() || hasRadical(expr.base)));
  if (offending) return fail(`In ${tex(expr)} c'è ancora una radice al denominatore.`);
  for (const child of children(expr)) {
    const result = checkRationalized(child);
    if (!result.ok) return result;
  }
  return OK;
}

// ───────────────────────────── simplifiedRadicals ─────────────────────────────

/** Vero se è una radice di un numero scritto in cifre. */
const isNumericRoot = (expr: Expr): expr is Extract<Expr, { kind: "root" }> => expr.kind === "root" && literalRational(expr.arg) !== null;

function checkSimplifiedRadicals(expr: Expr): FormCheck {
  // (ⁿ√a)ᵏ con k ≥ n si calcola ancora: (√2)³ = 2√2.
  if (expr.kind === "pow" && isNumericRoot(expr.base)) {
    const exponent = literalRational(expr.exp);
    if (exponent && exponent.isInteger() && exponent.cmp(expr.base.index) >= 0) {
      return fail(`La potenza ${tex(expr)} si può ancora calcolare: una radice elevata al suo indice dà il radicando.`);
    }
  }
  // Due radici numeriche con lo stesso indice si moltiplicano sotto un'unica radice: √2·√3 = √6.
  if (expr.kind === "mul") {
    const indices = expr.factors.filter(isNumericRoot).map((factor) => factor.index);
    if (new Set(indices).size < indices.length) {
      return fail(`In ${tex(expr)} le radici con lo stesso indice si moltiplicano tra loro sotto un'unica radice.`);
    }
  }
  if (expr.kind === "root") {
    const radicand = literalRational(expr.arg);
    if (radicand) {
      if (radicand.isZero()) return fail(`La radice ${tex(expr)} vale zero: si scrive $0$.`);
      if (!radicand.isInteger()) return fail(`In ${tex(expr)} c'è una frazione sotto radice.`);
      if (radicand.sign() < 0 && expr.index % 2 === 1) return fail(`In ${tex(expr)} il segno meno si porta fuori dalla radice.`);
      if (radicand.sign() > 0) {
        if (extractPower(radicand.n, expr.index).outside > 1n || radicand.n === 1n) {
          return fail(`Da ${tex(expr)} si può ancora portare fuori un fattore.`);
        }
        for (let d = 2; d < expr.index; d++) {
          if (expr.index % d === 0 && iroot(radicand.n, d) ** BigInt(d) === radicand.n) {
            return fail(`L'indice di ${tex(expr)} si può ridurre.`);
          }
        }
      }
    }
  }
  for (const child of children(expr)) {
    const result = checkSimplifiedRadicals(child);
    if (!result.ok) return result;
  }
  return OK;
}

// ───────────────────────────── forme dei numeri complessi ─────────────────────────────

const isImaginaryUnit = (expr: Expr): boolean => expr.kind === "const" && expr.name === "i";
const containsImaginaryUnit = (expr: Expr): boolean => some(expr, isImaginaryUnit);

/** Vero se il termine è della forma b·i, con b reale: i compare una volta sola, come fattore del numeratore. */
function isImaginaryTerm(term: Expr): boolean {
  const core = stripSign(term);
  if (isImaginaryUnit(core)) return true;
  if (core.kind === "mul") {
    const withUnit = core.factors.filter(containsImaginaryUnit);
    return withUnit.length === 1 && isImaginaryUnit(withUnit[0] as Expr);
  }
  if (core.kind === "div") return !containsImaginaryUnit(core.den) && isImaginaryTerm(core.num);
  return false;
}

const countTerms = (expr: Expr): number => (expr.kind === "add" ? expr.terms.length : 1);

function checkAlgebraicForm(expr: Expr): FormCheck {
  const terms = expr.kind === "add" ? expr.terms : [expr];
  const imaginary = terms.filter(containsImaginaryUnit);
  const real = terms.filter((term) => !containsImaginaryUnit(term));
  // La parte reale può avere più termini solo se non si possono sommare tra loro (1 + √2 + i va bene, 1 + 2 + i no).
  const realCombines = real.length > 1 && countTerms(simplify({ kind: "add", terms: real })) < real.length;
  if (realCombines || imaginary.length > 1) {
    return fail("Serve la forma $a + bi$: una sola parte reale e una sola parte immaginaria.");
  }
  if (imaginary[0] !== undefined && !isImaginaryTerm(imaginary[0])) {
    return fail("Serve la forma $a + bi$: l'unità immaginaria $i$ deve comparire una volta sola, non al denominatore e non sotto potenza.");
  }
  return OK;
}

function checkTrigonometricForm(expr: Expr): FormCheck {
  const wrong = fail("Serve la forma trigonometrica $\\rho(\\cos\\theta + i\\sin\\theta)$, con $\\rho > 0$ e lo stesso angolo nel coseno e nel seno.");
  const factors = expr.kind === "mul" ? expr.factors : [expr];
  const bracket = factors[factors.length - 1];
  const modulus = factors.slice(0, -1);
  if (bracket?.kind !== "add" || bracket.terms.length !== 2) return wrong;
  if (modulus.some((factor) => !isConstant(factor) || containsImaginaryUnit(factor))) return wrong;
  if (modulus.length > 0 && !(modulus.reduce((product, factor) => product * evaluate(factor), 1) > 0)) return wrong;

  // I due addendi in qualunque ordine: cos θ e i·sin θ (oppure sin θ·i).
  const cosine = bracket.terms.find((term) => term.kind === "fn" && term.name === "cos");
  const imaginary = bracket.terms.find((term) => term !== cosine);
  if (cosine?.kind !== "fn" || imaginary?.kind !== "mul" || imaginary.factors.length !== 2) return wrong;
  const sine = imaginary.factors.find((factor) => factor.kind === "fn" && factor.name === "sin");
  if (!imaginary.factors.some(isImaginaryUnit) || sine?.kind !== "fn") return wrong;
  return equivalent(cosine.arg, sine.arg) ? OK : wrong;
}

function checkExponentialForm(expr: Expr): FormCheck {
  const wrong = fail("Serve la forma esponenziale $\\rho\\,e^{i\\theta}$, con $\\rho > 0$ e $\\theta$ reale.");
  const factors = expr.kind === "mul" ? expr.factors : [expr];
  const power = factors[factors.length - 1];
  const modulus = factors.slice(0, -1);
  if (power?.kind !== "pow" || power.base.kind !== "const" || power.base.name !== "e") return wrong;
  if (modulus.some((factor) => !isConstant(factor) || containsImaginaryUnit(factor))) return wrong;
  if (modulus.length > 0 && !(modulus.reduce((product, factor) => product * evaluate(factor), 1) > 0)) return wrong;
  // L'esponente è iθ con θ reale: l'unità immaginaria compare una volta sola, come fattore. Anche lo zero va bene (θ = 0).
  const exponent = power.exp;
  const isZero = literalRational(exponent)?.isZero() ?? false;
  return isZero || isImaginaryTerm(exponent) ? OK : wrong;
}
