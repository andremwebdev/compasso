// V1.M04.A07.g1 — Scomposizione di polinomi. GENERATORE DI RIFERIMENTO per le risposte di tipo
// «espressione» con un vincolo di forma (qui «factored»: la risposta deve essere scomposta).
//
// All'indietro: si scelgono i fattori (la soluzione) e si moltiplicano per ottenere il polinomio del
// testo. La risposta giusta e i passaggi li scrive il motore (factorPolynomial), che usa le stesse
// tecniche che si usano a mano. Le risposte sbagliate sono scritte fattore per fattore, facendo
// l'errore tipico di ogni tecnica.
//
// Livello 1: una sola tecnica (raccoglimento, differenza di quadrati, quadrato di binomio, trinomio
// speciale).  Livello 2: due tecniche di seguito, trinomio con primo coefficiente diverso da 1, cubi,
// differenza di quarte potenze.  Livello 3: Ruffini, polinomi di grado 3 e 4, fattori irriducibili.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import { exprToUPoly, upolyToExpr } from "../../../motore/algebra/expand";
import { upMul, upoly, upPow, type UPoly } from "../../../motore/algebra/upoly";
import { num, pow, sym, toLatex, type Expr } from "../../../motore/expr";
import { Rng } from "../../../motore/random/rng";
import { factorPolynomial, stepText, type FactorMethod } from "../../../motore/steps";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const x = sym("x");

/** Un fattore della scomposizione: un polinomio (coefficienti dal grado 0) con il suo esponente. */
interface Factor {
  readonly poly: UPoly;
  readonly power: number;
}

/** Tutto quello che definisce un esercizio: i fattori scelti e le scomposizioni sbagliate tipiche. */
interface Model {
  /** La costante raccolta davanti (1 se non c'è). */
  readonly constant: number;
  /** L'esponente della x raccolta (0 se non c'è). */
  readonly xPower: number;
  /** Gli altri fattori, irriducibili. */
  readonly factors: readonly Factor[];
  /** Le scomposizioni sbagliate della parte tra parentesi, ognuna con il suo errore. */
  readonly wrongInner: readonly WrongCandidate<Expr>[];
}

// ───────────────────────────── scrittura dei fattori ─────────────────────────────

/** Il binomio p·x + q. */
const binomial = (p: number, q: number): UPoly => upoly(q, p);
const single = (poly: UPoly): Factor => ({ poly, power: 1 });
const shown = (poly: UPoly): Expr => upolyToExpr(poly);

/** Un prodotto scritto come si scrive a mano: niente fattori 1, potenze per i fattori ripetuti. */
function product(constant: number, xPower: number, parts: readonly (Factor | Expr)[]): Expr {
  const factors: Expr[] = [];
  if (constant !== 1) factors.push(num(constant));
  if (xPower === 1) factors.push(x);
  if (xPower > 1) factors.push(pow(x, xPower));
  for (const part of parts) {
    // Un prodotto dentro un prodotto si scrive in fila, senza parentesi in più.
    if ("kind" in part) factors.push(...(part.kind === "mul" ? part.factors : [part]));
    else factors.push(part.power === 1 ? shown(part.poly) : pow(shown(part.poly), part.power));
  }
  if (factors.length === 0) return num(1);
  return factors.length === 1 ? (factors[0] as Expr) : { kind: "mul", factors };
}

/** Il polinomio del testo: il prodotto di tutti i fattori, sviluppato. */
function expandedPolynomial(model: Model): UPoly {
  const collected = upoly(...Array.from({ length: model.xPower }, () => 0), model.constant);
  return model.factors.reduce<UPoly>((p, factor) => upMul(p, upPow(factor.poly, factor.power)), collected);
}

// ───────────────────────────── le tecniche, con i loro errori tipici ─────────────────────────────

/** Una tecnica applicata: i fattori giusti e le scritture sbagliate tipiche. */
interface Piece {
  readonly factors: readonly Factor[];
  readonly wrong: readonly WrongCandidate<Expr>[];
}

const inner = (...parts: (Factor | Expr)[]): Expr => product(1, 0, parts);

/** Differenza di quadrati: (s·x)² − t² = (s·x + t)(s·x − t). */
function differenceOfSquares(s: number, t: number): Piece {
  return {
    factors: [single(binomial(s, t)), single(binomial(s, -t))],
    wrong: [
      // «A² − B² = (A − B)²»: è il quadrato del binomio senza il doppio prodotto.
      { error: "ALG.QUADRATO_BINOMIO", value: inner({ poly: binomial(s, -t), power: 2 }) },
      { error: "ALG.QUADRATO_BINOMIO", value: inner({ poly: binomial(s, t), power: 2 }) },
    ],
  };
}

/** Quadrato di binomio: (s·x + t)², con t di segno qualsiasi. */
function perfectSquare(s: number, t: number): Piece {
  return {
    factors: [{ poly: binomial(s, t), power: 2 }],
    wrong: [
      // Segno del doppio prodotto ignorato.
      { error: "ALG.SEGNI_FATTORI", value: inner({ poly: binomial(s, -t), power: 2 }) },
      // Visti due quadrati, scritta la differenza di quadrati: il doppio prodotto è sparito.
      { error: "ALG.QUADRATO_BINOMIO", value: inner(single(binomial(s, Math.abs(t))), single(binomial(s, -Math.abs(t)))) },
    ],
  };
}

/** Trinomio speciale: (x − r1)(x − r2). */
function sumProduct(r1: number, r2: number): Piece {
  return {
    factors: [single(binomial(1, -r1)), single(binomial(1, -r2))],
    wrong: [
      // I due numeri giusti, ma con i segni delle radici: (x + r1)(x + r2).
      { error: "ALG.SEGNI_FATTORI", value: inner(single(binomial(1, r1)), single(binomial(1, r2))) },
      // Un solo segno sbagliato: il prodotto dei due numeri cambia segno.
      { error: "ALG.SEGNI_FATTORI", value: inner(single(binomial(1, -r1)), single(binomial(1, r2))) },
    ],
  };
}

/** Trinomio con primo coefficiente p > 1: (p·x + q)(x − r). */
function leadingCoefficient(p: number, q: number, r: number): Piece {
  return {
    factors: [single(binomial(p, q)), single(binomial(1, -r))],
    wrong: [
      // Formula risolutiva con il segno di −b sbagliato: le due radici cambiano segno.
      { error: "ALG.FORMULA_RISOLUTIVA", value: inner(single(binomial(p, -q)), single(binomial(1, r))) },
      // Radice r, ma fattore scritto (x + r).
      { error: "ALG.SEGNI_FATTORI", value: inner(single(binomial(p, q)), single(binomial(1, r))) },
      // Formula risolutiva divisa per 2 invece che per 2a: le «radici» diventano −q e p·r, e a sparisce.
      { error: "ALG.FORMULA_RISOLUTIVA", value: inner(single(binomial(1, q)), single(binomial(1, -p * r))) },
    ],
  };
}

/** Somma o differenza di cubi: x³ + t³ = (x + t)(x² − t·x + t²), con t di segno qualsiasi. */
function cubes(t: number): Piece {
  return {
    factors: [single(binomial(1, t)), single(upoly(t * t, -t, 1))],
    wrong: [
      // Segno del termine di mezzo sbagliato.
      { error: "ALG.SEGNI_FATTORI", value: inner(single(binomial(1, t)), single(upoly(t * t, t, 1))) },
      // Al posto del «falso quadrato» è stato messo il quadrato del binomio, con il doppio prodotto.
      { error: "ALG.QUADRATO_BINOMIO", value: inner(single(binomial(1, t)), single(upoly(t * t, -2 * t, 1))) },
      // «A³ + B³ = (A + B)³»: come per il quadrato, mancano i termini misti.
      { error: "ALG.QUADRATO_BINOMIO", value: inner({ poly: binomial(1, t), power: 3 }) },
    ],
  };
}

/** Differenza di quarte potenze: x⁴ − t⁴ = (x² + t²)(x + t)(x − t). */
function fourthPowers(t: number): Piece {
  const sumOfSquares = upoly(t * t, 0, 1);
  return {
    factors: [single(binomial(1, t)), single(binomial(1, -t)), single(sumOfSquares)],
    wrong: [
      // Scomposta anche la somma di quadrati x² + t², che è irriducibile.
      { error: "ALG.SOMMA_QUADRATI", value: inner({ poly: binomial(1, t), power: 2 }, { poly: binomial(1, -t), power: 2 }) },
      { error: "ALG.QUADRATO_BINOMIO", value: inner(single(sumOfSquares), { poly: binomial(1, -t), power: 2 }) },
      { error: "ALG.QUADRATO_BINOMIO", value: inner(single(sumOfSquares), { poly: binomial(1, t), power: 2 }) },
    ],
  };
}

/** Tre radici intere: si trova la prima con Ruffini, poi resta un trinomio. */
function threeRoots(r1: number, r2: number, r3: number): Piece {
  const f = (r: number): Factor => single(binomial(1, -r));
  return {
    factors: [f(r1), f(r2), f(r3)],
    wrong: [
      // Radice r1 trovata, ma fattore scritto (x + r1).
      { error: "ALG.RUFFINI_SEGNO", value: inner(single(binomial(1, r1)), f(r2), f(r3)) },
      // Il trinomio che resta scomposto con i segni sbagliati.
      { error: "ALG.SEGNI_FATTORI", value: inner(f(r1), single(binomial(1, r2)), single(binomial(1, r3))) },
      { error: "ALG.SEGNI_FATTORI", value: inner(f(r1), f(r2), single(binomial(1, r3))) },
    ],
  };
}

/** Una radice intera e una somma di quadrati irriducibile: (x − r)(x² + t²). */
function rootAndSumOfSquares(r: number, t: number): Piece {
  const quadratic = upoly(t * t, 0, 1);
  return {
    factors: [single(binomial(1, -r)), single(quadratic)],
    wrong: [
      { error: "ALG.RUFFINI_SEGNO", value: inner(single(binomial(1, r)), single(quadratic)) },
      // Scomposta la somma di quadrati come se fosse una differenza…
      { error: "ALG.SOMMA_QUADRATI", value: inner(single(binomial(1, -r)), single(binomial(1, t)), single(binomial(1, -t))) },
      // …oppure come se fosse il quadrato di un binomio.
      { error: "ALG.QUADRATO_BINOMIO", value: inner(single(binomial(1, -r)), { poly: binomial(1, t), power: 2 }) },
    ],
  };
}

/** x⁴ − (a² + b²)x² + a²b² = (x + a)(x − a)(x + b)(x − b). */
function biquadratic(a: number, b: number): Piece {
  const f = (r: number): Factor => single(binomial(1, -r));
  return {
    factors: [f(a), f(-a), f(b), f(-b)],
    wrong: [
      // Trinomio in x² scomposto con i segni sbagliati: (x² + a²)(x² + b²).
      { error: "ALG.SEGNI_FATTORI", value: inner(single(upoly(a * a, 0, 1)), single(upoly(b * b, 0, 1))) },
      // x² − a² scritto come (x − a)².
      { error: "ALG.QUADRATO_BINOMIO", value: inner({ poly: binomial(1, -a), power: 2 }, { poly: binomial(1, -b), power: 2 }) },
      // Un solo segno sbagliato nel trinomio in x²: (x² − a²)(x² + b²).
      { error: "ALG.SEGNI_FATTORI", value: inner(f(a), f(-a), single(upoly(b * b, 0, 1))) },
    ],
  };
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** Mette davanti a una tecnica un raccoglimento: costante · x^k · (…). Aggiunge gli errori del raccoglimento. */
function withCommonFactor(constant: number, xPower: number, piece: Piece): Model {
  const innerPolynomial = piece.factors.reduce<UPoly>((p, factor) => upMul(p, upPow(factor.poly, factor.power)), upoly(1));
  const wrongInner: WrongCandidate<Expr>[] = [...piece.wrong];
  const degree = innerPolynomial.length - 1;
  // Raccoglimento con un termine non diviso: il termine noto resta moltiplicato per la costante…
  if (constant !== 1 && degree >= 1) {
    wrongInner.push({ error: "ALG.RACCOGLIMENTO", value: shown(upoly(...innerPolynomial.map((c, k) => (k === 0 ? c.mul(constant) : c)))) });
  }
  // …oppure il primo termine conserva l'esponente che aveva prima di raccogliere x^k.
  if (xPower > 0 && degree >= 1) {
    const kept = Array.from({ length: degree + xPower + 1 }, (_, k) => (k < degree ? (innerPolynomial[k] ?? 0) : k === degree + xPower ? (innerPolynomial[degree] ?? 0) : 0));
    wrongInner.push({ error: "ALG.RACCOGLIMENTO", value: shown(upoly(...kept)) });
  }
  return { constant, xPower, factors: piece.factors, wrongInner };
}

const coprime = (a: number, b: number): boolean => gcd(Math.abs(a), Math.abs(b)) === 1;
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Due interi s, t primi tra loro per i prodotti notevoli (s·x ± t). */
function squareNumbers(rng: Rng_, maxS: number, maxT: number): [number, number] {
  for (;;) {
    const s = rng.int(1, maxS);
    const t = rng.int(1, maxT);
    if (coprime(s, t)) return [s, t];
  }
}

/** Un prodotto notevole o un trinomio speciale. Con `small` i numeri restano piccoli (c'è una costante davanti). */
function notablePiece(rng: Rng_, small: boolean): Piece {
  const kind = rng.pick(["difference", "square", "trinomial"] as const);
  const [maxS, maxT] = small ? [2, 4] : [3, 7];
  if (kind === "difference") return differenceOfSquares(...squareNumbers(rng, maxS, maxT));
  if (kind === "square") {
    const [s, t] = squareNumbers(rng, maxS, maxT);
    return perfectSquare(s, t * rng.sign());
  }
  const r1 = rng.intExcept(-maxT, maxT);
  const r2 = rng.intExcept(-maxT, maxT, [0, r1, -r1]);
  return sumProduct(r1, r2);
}

function buildLevel1(rng: Rng_): Model {
  if (rng.bool(0.25)) {
    // Solo raccoglimento: c·x^k·(p·x + q), con p e q primi tra loro.
    const p = rng.int(1, 5);
    const q = rng.intExcept(-7, 7, [0, ...[2, 3, 4, 5, 6, 7].filter((value) => !coprime(p, value)).flatMap((value) => [value, -value])]);
    const piece: Piece = { factors: [single(binomial(p, q))], wrong: [] };
    return withCommonFactor(rng.int(2, 5), rng.int(1, 2), piece);
  }
  return withCommonFactor(1, 0, notablePiece(rng, false));
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["commonThenNotable", "commonThenNotable", "leading", "cubes", "fourth"] as const);
  switch (shape) {
    case "commonThenNotable": {
      // Prima il raccoglimento, poi un prodotto notevole o un trinomio speciale.
      const constant = rng.pick([1, 2, 3]);
      const xPower = constant === 1 ? rng.int(1, 2) : rng.int(0, 1);
      return withCommonFactor(constant, xPower, notablePiece(rng, true));
    }
    case "leading": {
      const p = rng.pick([2, 3]);
      const q = rng.intExcept(-5, 5, [0, ...(p === 2 ? [-4, -2, 2, 4] : [-3, 3])]);
      // r diverso da q/p (già garantito: q/p non è intero) e tale che il trinomio non sia una differenza di quadrati.
      const r = rng.intExcept(-5, 5);
      return withCommonFactor(1, 0, leadingCoefficient(p, q, r));
    }
    case "cubes":
      return withCommonFactor(1, 0, cubes(rng.intExcept(-4, 4)));
    case "fourth":
      return withCommonFactor(1, 0, fourthPowers(rng.int(1, 3)));
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["threeRoots", "threeRoots", "rootAndQuadratic", "biquadratic", "commonThenCubes"] as const);
  switch (shape) {
    case "threeRoots": {
      // Tre radici distinte, non tutte «facili»: nessuna è 0 (altrimenti basterebbe raccogliere x).
      // Nessuna coppia di radici opposte: lì cambiare i segni dei fattori ridarebbe per caso la risposta giusta.
      const sign = (): number => rng.sign();
      const roots = (rng.sample([1, 2, 3, 4], 3) as [number, number, number]).map((value) => value * sign()) as [number, number, number];
      // L'ordine è quello in cui Ruffini le trova: prima la più piccola in valore assoluto, la positiva prima della negativa.
      roots.sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
      return withCommonFactor(1, 0, threeRoots(...roots));
    }
    case "rootAndQuadratic": {
      const r = rng.intExcept(-4, 4);
      return withCommonFactor(1, 0, rootAndSumOfSquares(r, rng.int(1, 3)));
    }
    case "biquadratic": {
      const [a, b] = rng.sample([1, 2, 3, 4], 2).sort((p, q) => p - q) as [number, number];
      return withCommonFactor(1, 0, biquadratic(a, b));
    }
    case "commonThenCubes":
      return withCommonFactor(rng.pick([2, 3]), rng.int(0, 1), cubes(rng.intExcept(-2, 2)));
  }
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── esercizio ─────────────────────────────

const SECOND_HINT: Readonly<Record<FactorMethod, string>> = {
  commonFactor: "Comincia dal raccoglimento totale: qual è il fattore più grande, numero e lettera, comune a tutti i termini? Poi guarda che cosa resta tra parentesi.",
  differenceOfSquares: "È una differenza di due quadrati: scrivi ciascun termine come quadrato, $A^{2} - B^{2}$, e ricorda quanto vale.",
  perfectSquare: "Il primo e l'ultimo termine sono quadrati: controlla se il termine di mezzo è il loro doppio prodotto, e con quale segno.",
  sumProduct: "Cerca due numeri che abbiano per somma il coefficiente di $x$ e per prodotto il termine noto: il segno del prodotto ti dice se sono concordi.",
  quadraticFormula: "Trova le radici $x_{1}$ e $x_{2}$ con la formula risolutiva, poi scrivi $a\\left(x - x_{1}\\right)\\left(x - x_{2}\\right)$ senza dimenticare $a$.",
  cubes: "È una somma o una differenza di cubi: scrivi ciascun termine come cubo, $A^{3} \\pm B^{3}$. Il secondo fattore è un «falso quadrato», senza il doppio.",
  ruffini: "Cerca una radice tra i divisori del termine noto: se il polinomio si annulla per $x = a$, è divisibile per $x - a$. Dividi con la regola di Ruffini.",
  product: "Prova a scrivere il polinomio come prodotto di due polinomi di grado più basso.",
};

function draftOf(model: Model): ExerciseDraft {
  const polynomial = expandedPolynomial(model);
  // La risposta giusta e i passaggi li scrive il motore, con le tecniche che si usano a mano.
  const factored = factorPolynomial(polynomial);
  const wrong = distinctWrongExpressions(
    factored.result,
    model.wrongInner.map((candidate) => candidate && { error: candidate.error, value: product(model.constant, model.xPower, [candidate.value]) }),
  );
  return {
    prompt: `Scomponi completamente in fattori il polinomio $${toLatex(shown(polynomial))}$.`,
    answer: { kind: "expression", correct: factored.result, wrong, form: ["factored"] },
    steps: factored.steps.map((step) => ({ text: stepText(step) })),
    hints: [
      "Quanti termini ha il polinomio? Hanno tutti un fattore in comune? Da queste due risposte dipende la tecnica: prima il raccoglimento, poi i prodotti notevoli o il trinomio speciale, infine Ruffini.",
      SECOND_HINT[factored.methods[0] ?? "product"],
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A07.g1",
  skill: "V1.M04.A07",
  lesson: "V1.M04.L07",
  title: "Scomposizione di polinomi",
  levels: [1, 2, 3],
  errors: ["ALG.QUADRATO_BINOMIO", "ALG.SEGNI_FATTORI", "ALG.RACCOGLIMENTO", "ALG.FORMULA_RISOLUTIVA", "ALG.SOMMA_QUADRATI", "ALG.RUFFINI_SEGNO"],
  limits: { maxInteger: 60, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: i fattori della risposta, rimoltiplicati, devono ridare il polinomio del
  // testo, coefficiente per coefficiente. (Che ogni fattore sia irriducibile lo controlla il vincolo di forma.)
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const expected = expandedPolynomial(model);
    const multiplied = exprToUPoly(answer.correct);
    return multiplied !== null && multiplied.length === expected.length && multiplied.every((c, k) => c.eq(expected[k] ?? 0));
  },
});
