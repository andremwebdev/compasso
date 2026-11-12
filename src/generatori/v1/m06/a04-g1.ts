// V1.M06.A04.g1 — Disequazioni fratte. GENERATORE DI RIFERIMENTO per le risposte di tipo «insieme».
//
// Come è fatto (lo stesso schema vale per ogni generatore, vedi REGOLE.md):
//   1. buildModel  sceglie prima gli zeri (cioè la soluzione), poi scrive la disequazione intorno;
//   2. draftOf     calcola la risposta giusta, le risposte sbagliate (facendo davvero ogni errore
//                  tipico sui numeri dell'esercizio), i passaggi e gli indizi;
//   3. verify      ricontrolla la risposta per un'altra strada: prova la disequazione di partenza,
//                  con conti esatti, in tanti punti dentro, fuori e sul bordo dell'insieme.
//
// Livello 1: (x − a)/(x − b) ⋛ 0.  Livello 2: un trinomio, un termine a secondo membro, coefficienti
// negativi o zeri frazionari.  Livello 3: casi particolari (zero doppio, fattore senza zeri, fattore
// comune a numeratore e denominatore, due frazioni, numeratore costante).

import { defineGenerator, type ExerciseDraft, type GeneratorContext, type SolutionStep } from "../../../esercizi";
import { upolyToExpr } from "../../../motore/algebra/expand";
import { upMul, upoly, type UPoly } from "../../../motore/algebra/upoly";
import { signTable, signTableToLatex, solutionFromSigns, type SignFactor, type SignRelation } from "../../../motore/display";
import { div, neg, num, relation, sub, toLatex, type Expr, type Relation } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import {
  isAllReals, isEmptySet, setContains, setIntersection, setToInequalityLatex, setToLatex, setUnion, type RealSet, type SolutionSet,
} from "../../../motore/sets";
import { stepText } from "../../../motore/steps";
import { rationalAt } from "../../comuni/exact";
import { distinctWrongSets } from "../../comuni/wrong";

const CODE = "V1.M06.A04.g1";

type Rng_ = GeneratorContext["rng"];

/** Una riga della tabella dei segni: un polinomio, al numeratore o al denominatore. */
interface Row {
  readonly expr: Expr;
  readonly role: "numerator" | "denominator";
}

/** Tutto quello che definisce un esercizio. */
interface Model {
  /** La disequazione com'è scritta nel testo. */
  readonly left: Expr;
  readonly right: Expr;
  readonly rel: SignRelation;
  /** La stessa disequazione nella forma «una frazione ⋛ 0»: le righe della tabella dei segni. */
  readonly rows: readonly Row[];
  /** La frazione unica, se il testo non è già in quella forma (serve al primo passaggio). */
  readonly combined?: Expr;
  /** La frazione unica prima di fare i conti al numeratore (il passaggio intermedio da mostrare). */
  readonly middle?: Expr;
  /** Caso con un fattore comune: le righe dopo la semplificazione (sbagliata se si dimentica la condizione). */
  readonly cancelled?: readonly Row[];
  /** Il numeratore che si ottiene portando il secondo membro a sinistra senza cambiare il segno dentro la parentesi. */
  readonly sloppyTop?: UPoly;
}

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

/** m·(x − r): il polinomio di primo grado con zero r. */
const linear = (root: number | Rational, scale = 1): UPoly => {
  const r = Rational.from(root);
  return upoly(r.mul(-scale), scale);
};
/** Il polinomio monico con gli zeri dati, sviluppato. */
const fromRoots = (...roots: number[]): UPoly => roots.reduce<UPoly>((p, root) => upMul(p, linear(root)), upoly(1));
const show = (p: UPoly): Expr => upolyToExpr(p);
const top = (p: UPoly): Row => ({ expr: show(p), role: "numerator" });
const bottom = (p: UPoly): Row => ({ expr: show(p), role: "denominator" });
const RELATIONS: readonly SignRelation[] = [">", ">=", "<", "<="];

/** Interi distinti tra −range e range. */
function distinctIntegers(rng: Rng_, count: number, range: number): number[] {
  const all = Array.from({ length: 2 * range + 1 }, (_, k) => k - range);
  return rng.sample(all, count);
}

/** Una frazione già pronta, N/D ⋛ 0. */
function plain(numerator: UPoly, denominator: UPoly, rel: SignRelation): Model {
  return { left: div(show(numerator), show(denominator)), right: num(0), rel, rows: [top(numerator), bottom(denominator)] };
}

function buildLevel1(rng: Rng_): Model {
  // 1. Prima la soluzione: lo zero del numeratore e quello del denominatore.
  const [a, b] = distinctIntegers(rng, 2, 6) as [number, number];
  // 2. Poi l'esercizio: (m·x − m·a)/(x − b) ⋛ 0.
  const scale = rng.pick([1, 1, 1, 2, 3]);
  return plain(linear(a, scale), linear(b), rng.pick(RELATIONS));
}

function buildLevel2(rng: Rng_): Model {
  const shape = rng.pick(["quadraticTop", "quadraticBottom", "rightSide", "negative"] as const);
  const rel = rng.pick(RELATIONS);
  switch (shape) {
    case "quadraticTop": {
      const [p, q, b] = distinctIntegers(rng, 3, 5) as [number, number, number];
      return plain(fromRoots(p, q), linear(b), rel);
    }
    case "quadraticBottom": {
      const [a, p, q] = distinctIntegers(rng, 3, 5) as [number, number, number];
      return plain(linear(a, rng.pick([1, 1, 2])), fromRoots(p, q), rel);
    }
    case "rightSide": {
      // (m·x + c)/(x − b) ⋛ k: portando k a sinistra il numeratore diventa (m − k)(x − z), con z scelto prima.
      const [z, b] = distinctIntegers(rng, 2, 5) as [number, number];
      const m = rng.pick([1, 2, 3]);
      const k = rng.pick([-2, -1, 1, 2, 3].filter((value) => value !== m));
      const c = -(m - k) * z - k * b;
      const denominator = linear(b);
      const numerator = upoly(c, m);
      const left = div(show(numerator), show(denominator));
      const combinedTop = linear(z, m - k);
      // m·x + c − k(x − b) scritto come m·x + c − k·x − k·b: l'ultimo segno è sbagliato.
      const sloppyTop = upoly(c - k * b, m - k);
      const middle = div(minusMultiple(show(numerator), k, show(denominator)), show(denominator));
      return { left, right: num(k), rel, rows: [top(combinedTop), bottom(denominator)], combined: div(show(combinedTop), show(denominator)), middle, sloppyTop };
    }
    case "negative": {
      // Coefficiente di x negativo sopra o sotto, e a volte uno zero frazionario (2x − 1).
      const [a, b] = distinctIntegers(rng, 2, 5) as [number, number];
      const half = rng.bool(0.4) ? Rational.of(2 * a + 1, 2) : null;
      const numerator = half ? upoly(half.mul(-2), 2) : linear(a, rng.pick([1, 2]));
      const flipTop = rng.bool();
      return plain(flipTop ? numerator.map((c) => c.neg()) : numerator, flipTop ? linear(b) : linear(b, -1), rel);
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const shape = rng.pick(["double", "noZeros", "common", "twoFractions", "constantTop"] as const);
  switch (shape) {
    case "double": {
      // Uno zero doppio: il fattore al quadrato non cambia segno, ma il suo zero conta (punto isolato o buco).
      const [a, b] = distinctIntegers(rng, 2, 4) as [number, number];
      const rel = rng.pick([">=", "<=", ">=", "<=", ">", "<"] as const);
      return rng.bool() ? plain(fromRoots(a, a), linear(b), rel) : plain(linear(b), fromRoots(a, a), rel);
    }
    case "noZeros": {
      // Un fattore che non si annulla mai (x² + c): è sempre positivo e non entra tra gli zeri.
      const [p, q] = distinctIntegers(rng, 2, 5) as [number, number];
      const always = upoly(rng.pick([1, 2, 3, 4, 9]), 0, 1);
      // Sopra, il fattore sempre positivo lascia pochi errori possibili con < e >: lì si usa solo ≤ o ≥.
      return rng.bool() ? plain(always, fromRoots(p, q), rng.pick([">=", "<="] as const)) : plain(fromRoots(p, q), always, rng.pick(RELATIONS));
    }
    case "common": {
      // (x − a) sopra e sotto: lì la frazione non esiste, anche se «si semplifica».
      // a si sceglie dove la frazione semplificata ha il segno chiesto, così dimenticare la condizione cambia la risposta.
      const rel = rng.pick(RELATIONS);
      const [low, middle, high] = [...distinctIntegers(rng, 3, 5)].sort((x, y) => x - y) as [number, number, number];
      const inside = rel === "<" || rel === "<=";
      const a = inside ? middle : rng.pick([low, high]);
      const [b, c] = rng.shuffle([low, middle, high].filter((value) => value !== a)) as [number, number];
      return { ...plain(fromRoots(a, c), fromRoots(a, b), rel), cancelled: [top(linear(c)), bottom(linear(b))] };
    }
    case "twoFractions": {
      // p/(x − a) ⋛ q/(x − b): con p = z − a e q = z − b il numeratore della differenza si annulla in z.
      const [a, b, z] = distinctIntegers(rng, 3, 5) as [number, number, number];
      const divisor = gcd(Math.abs(z - a), Math.abs(z - b));
      const p = (z - a) / divisor;
      const q = (z - b) / divisor;
      const fraction = (value: number, root: number): Expr => (value < 0 ? neg(div(-value, show(linear(root)))) : div(value, show(linear(root))));
      const combinedTop = upoly(q * a - p * b, p - q);
      const rows = [top(combinedTop), bottom(linear(a)), bottom(linear(b))];
      const product: Expr = { kind: "mul", factors: [show(linear(a)), show(linear(b))] };
      const combined = div(show(combinedTop), product);
      const middle = div(minusMultiple(times(p, show(linear(b))), q, show(linear(a))), product);
      return { left: fraction(p, a), right: fraction(q, b), rel: rng.pick(RELATIONS), rows, combined, middle };
    }
    case "constantTop": {
      // (m·x + c)/(x − b) ⋛ m: portando m a sinistra la x sparisce dal numeratore, che resta la costante c + m·b.
      const b = rng.intExcept(-5, 5);
      const m = rng.pick([1, 2, 3]);
      // La costante sta tra 0 e 2·m·b: così chi sbaglia il segno nella parentesi (c − m·b) trova il segno opposto.
      const constant = Math.sign(b) * rng.int(1, Math.min(2 * m * Math.abs(b) - 1, 8));
      const denominator = linear(b);
      const numerator = upoly(constant - m * b, m);
      const combinedTop = upoly(constant);
      return {
        left: div(show(numerator), show(denominator)),
        right: num(m),
        // Il numeratore non ha zeri: con ≤ o ≥ restano abbastanza errori possibili per una scelta multipla.
        rel: rng.pick([">=", "<="] as const),
        rows: [top(combinedTop), bottom(denominator)],
        combined: div(show(combinedTop), show(denominator)),
        middle: div(minusMultiple(show(numerator), m, show(denominator)), show(denominator)),
        sloppyTop: upoly(constant - 2 * m * b),
      };
    }
  }
}

/** k·(espressione), scritto senza il fattore 1. */
function times(k: number, expr: Expr): Expr {
  return k === 1 ? expr : k === -1 ? neg(expr) : { kind: "mul", factors: [num(k), expr] };
}

/** first − k·(expr), scritto come si scrive a mano: con il più se k è negativo. */
function minusMultiple(first: Expr, k: number, expr: Expr): Expr {
  return { kind: "add", terms: [first, k > 0 ? neg(times(k, expr)) : times(-k, expr)] };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function buildModel(level: number, rng: Rng_): Model {
  return level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
}

// ───────────────────────────── risposta giusta e risposte sbagliate ─────────────────────────────

const strictOf = (rel: SignRelation): SignRelation => (rel === ">=" ? ">" : rel === "<=" ? "<" : rel);
const isStrict = (rel: SignRelation): boolean => rel === ">" || rel === "<";
/** Stesso verso, ma con l'uguale tolto o aggiunto. */
const otherStrictness = (rel: SignRelation): SignRelation => (rel === ">" ? ">=" : rel === ">=" ? ">" : rel === "<" ? "<=" : "<");
const asNumerator = (rows: readonly Row[]): SignFactor[] => rows.map((row) => ({ expr: row.expr, role: "numerator" }));

/** Dove il prodotto o il quoziente delle righe ha il segno chiesto. */
function solve(rows: readonly SignFactor[], rel: SignRelation): RealSet {
  return solutionFromSigns(signTable(rows.length > 0 ? rows : [{ expr: num(1) }]), rel);
}

function wrongAnswers(model: Model, correct: RealSet) {
  const { rows, rel } = model;
  const numerators = rows.filter((row) => row.role === "numerator");
  const denominators = rows.filter((row) => row.role === "denominator");

  // Moltiplica per il denominatore come se fosse positivo: resta «numeratore ⋛ 0».
  const onlyNumerator = solve(numerators, rel);
  // Studia «numeratore ⋛ 0» e «denominatore ⋛ 0» e poi li mette a sistema (intersezione) invece di usare
  // la regola dei segni; se per questi numeri l'intersezione coincide con un'altra risposta, vale l'unione.
  const denominatorAlone = solve(asNumerator(denominators), strictOf(rel));
  const asSystem = setIntersection(onlyNumerator, denominatorAlone);
  const asUnion = setUnion(onlyNumerator, denominatorAlone);
  const systemIsUsable = !sameSet(asSystem, correct) && !sameSet(asSystem, onlyNumerator);
  // Sbaglia l'uguale: include gli zeri del numeratore con < o >, oppure li esclude con ≤ o ≥.
  const wrongEndpoints = solve(rows, otherStrictness(rel));
  // Non esclude gli zeri del denominatore: dopo aver semplificato un fattore comune, oppure
  // (con ≤ o ≥) includendo anche i punti in cui la frazione non esiste.
  const forgottenCondition = model.cancelled ? solve(model.cancelled, rel) : isStrict(rel) ? null : solve(asNumerator(rows), rel);

  // Sbaglia il segno di un trinomio con due zeri: positivo «dentro» e negativo «fuori» (o il contrario).
  const quadratic = rows.findIndex((row) => signTable([{ expr: row.expr }]).points.length === 2);
  const swappedQuadratic = quadratic < 0 ? null : solve(rows.map((row, index) => (index === quadratic ? { ...row, expr: neg(row.expr) } : row)), rel);

  // Porta il secondo membro a sinistra sbagliando un segno nella parentesi (solo se il risultato ha numeri puliti).
  const sloppy = model.sloppyTop && hasCleanZero(model.sloppyTop) ? solve([top(model.sloppyTop), ...denominators], rel) : null;

  return distinctWrongSets(correct, [
    { error: "DISEQ.SEGNO_DENOMINATORE", value: onlyNumerator },
    { error: "DISEQ.UNIONE_INTERSEZIONE", value: systemIsUsable ? asSystem : asUnion },
    { error: "DISEQ.ESTREMI", value: wrongEndpoints },
    forgottenCondition && { error: "COND.DENOMINATORE", value: forgottenCondition },
    sloppy && { error: "CALC.MENO_PARENTESI", value: sloppy },
    swappedQuadratic && { error: "DISEQ.SECONDO_GRADO", value: swappedQuadratic },
  ]);
}

/** Vero se il polinomio (di grado 0 o 1) non è nullo e il suo zero, se c'è, è un intero o un mezzo non troppo grande. */
function hasCleanZero(p: UPoly): boolean {
  if (p.length === 0) return false;
  if (p.length === 1) return true;
  const zero = (p[0] as Rational).neg().div(p[1] as Rational);
  return zero.d <= 2n && zero.abs().cmp(12) <= 0;
}

function sameSet(a: SolutionSet, b: SolutionSet): boolean {
  return setToLatex(a) === setToLatex(b);
}

// ───────────────────────────── passaggi e indizi ─────────────────────────────

const REL_LATEX: Readonly<Record<SignRelation, string>> = { ">": ">", ">=": "\\ge", "<": "<", "<=": "\\le" };
const REL_WORDS: Readonly<Record<SignRelation, string>> = { ">": "positiva", ">=": "positiva o nulla", "<": "negativa", "<=": "negativa o nulla" };

/** «x = 1 e x = 3» */
function listPoints(points: readonly Expr[]): string {
  return points.map((point) => `$x = ${toLatex(point)}$`).join(" e ");
}

/** Il segno di una riga, a parole: dove è positiva e dove si annulla. */
function describeRow(row: Row, alone: boolean): string {
  const table = signTable([{ expr: row.expr }]);
  const positive = solutionFromSigns(table, ">");
  const part = row.role === "numerator" ? "numeratore" : "denominatore";
  const name = alone ? part : `${part} (un fattore alla volta)`;
  const expr = `$${toLatex(row.expr)}$`;
  if (table.points.length === 0) {
    return `Segno del ${name}: ${expr} è ${isAllReals(positive) ? "positivo" : "negativo"} per ogni $x$ e non si annulla mai.`;
  }
  const zeros = `si annulla per ${listPoints(table.points)}`;
  if (isEmptySet(positive)) return `Segno del ${name}: ${expr} ${zeros} e altrove è negativo.`;
  return `Segno del ${name}: ${expr} ${zeros}; è positivo per $${setToInequalityLatex(positive)}$.`;
}

function solutionSteps(model: Model, correct: RealSet): SolutionStep[] {
  const { rows, rel } = model;
  const table = signTable(rows);
  const steps: SolutionStep[] = [];
  const relationLatex = (r: Relation): string => toLatex(r);

  if (model.combined) {
    steps.push({
      text: stepText({
        text: "Porta tutto al primo membro e scrivi un'unica frazione. **Non moltiplicare per il denominatore**: il suo segno dipende da $x$.",
        formula: [relation(sub(model.left, model.right), rel, 0), ...(model.middle ? [relation(model.middle, rel, 0)] : []), relation(model.combined, rel, 0)]
          .map(relationLatex)
          .join(" \\quad\\Longrightarrow\\quad "),
      }),
    });
  }

  const denominatorZeros = signTable(asNumerator(rows.filter((row) => row.role === "denominator"))).points;
  steps.push({
    text:
      denominatorZeros.length === 0
        ? "Condizione di esistenza: il denominatore non si annulla mai, quindi la frazione esiste per ogni $x$."
        : `Condizione di esistenza: il denominatore non deve annullarsi, quindi ${denominatorZeros.map((point) => `$x \\ne ${toLatex(point)}$`).join(" e ")}.`,
  });
  for (const row of rows) steps.push({ text: describeRow(row, rows.filter((other) => other.role === row.role).length === 1) });
  steps.push({
    text: stepText({
      text: "Riporta i segni in una tabella e applica la regola dei segni colonna per colonna. Dove il denominatore si annulla la frazione non esiste ($\\nexists$).",
      formula: signTableToLatex(table),
    }),
  });
  if (model.cancelled) {
    steps.push({
      text: "Attenzione: uno stesso valore di $x$ annulla sia il numeratore sia il denominatore. Lì la frazione non esiste, anche se semplificando il fattore comune sembrerebbe di sì.",
    });
  }
  const endpoints = isStrict(rel)
    ? "Con il segno stretto nessuno zero è incluso."
    : "Gli zeri del numeratore sono inclusi (lì la frazione vale $0$); quelli del denominatore mai.";
  steps.push({
    text: stepText({
      text: `La disequazione chiede dove la frazione è ${REL_WORDS[rel]}: leggi gli intervalli dall'ultima riga. ${endpoints}`,
      formula: `${setToInequalityLatex(correct)} \\qquad S = ${setToLatex(correct)}`,
    }),
  });
  return steps;
}

function draftOf(model: Model): ExerciseDraft {
  const correct = solve(model.rows, model.rel);
  return {
    prompt: `Risolvi la disequazione $${toLatex(model.left)} ${REL_LATEX[model.rel]} ${toLatex(model.right)}$.`,
    answer: { kind: "set", variable: "x", correct, wrong: wrongAnswers(model, correct) },
    steps: solutionSteps(model, correct),
    hints: [
      "È una disequazione fratta: l'incognita compare al denominatore. Non puoi moltiplicare per il denominatore, perché non ne conosci il segno: che cosa studi, allora?",
      model.combined
        ? "Comincia portando tutto al primo membro e riducendo a un'unica frazione. Poi studia il segno del numeratore e quello del denominatore, e riportali in una tabella."
        : "Studia separatamente il segno del numeratore e quello del denominatore, poi riportali in una tabella dei segni e applica la regola dei segni.",
    ],
  };
}

// ───────────────────────────── verifica indipendente ─────────────────────────────

/** Vero se la disequazione di partenza vale in x = value (conti esatti; falso dove un membro non esiste). */
function holds(model: Model, value: Rational): boolean {
  const left = rationalAt(model.left, "x", value);
  const right = rationalAt(model.right, "x", value);
  if (!left || !right) return false;
  const order = left.cmp(right);
  switch (model.rel) {
    case ">":
      return order > 0;
    case ">=":
      return order >= 0;
    case "<":
      return order < 0;
    case "<=":
      return order <= 0;
  }
}

/** Vero se il numero sta nell'insieme. Gli estremi della risposta sono numeri razionali: il confronto è esatto. */
function inSet(set: RealSet, value: Rational): boolean {
  return set.pieces.some((piece) => {
    const { lower, upper } = piece;
    if (typeof lower !== "string") {
      if (lower.kind !== "num") return setContains(set, num(value));
      const order = value.cmp(lower.value);
      if (order < 0 || (order === 0 && !piece.lowerClosed)) return false;
    }
    if (typeof upper !== "string") {
      if (upper.kind !== "num") return setContains(set, num(value));
      const order = value.cmp(upper.value);
      if (order > 0 || (order === 0 && !piece.upperClosed)) return false;
    }
    return true;
  });
}

/** I punti di prova: una griglia fitta di mezzi e terzi, più ogni estremo della risposta con i suoi dintorni. */
function probePoints(answer: RealSet): Rational[] {
  const points: Rational[] = [];
  for (let k = -48; k <= 48; k++) points.push(Rational.of(k, 6));
  const nudge = Rational.of(1, 97);
  for (const piece of answer.pieces) {
    for (const endpoint of [piece.lower, piece.upper]) {
      if (typeof endpoint === "string" || endpoint.kind !== "num") continue;
      points.push(endpoint.value, endpoint.value.sub(nudge), endpoint.value.add(nudge));
    }
  }
  return points;
}

export default defineGenerator({
  code: CODE,
  skill: "V1.M06.A04",
  lesson: "V1.M06.L04",
  title: "Disequazioni fratte",
  levels: [1, 2, 3],
  errors: ["DISEQ.SEGNO_DENOMINATORE", "DISEQ.UNIONE_INTERSEZIONE", "DISEQ.ESTREMI", "COND.DENOMINATORE", "CALC.MENO_PARENTESI", "DISEQ.SECONDO_GRADO"],
  limits: { maxInteger: 20, maxDenominator: 6 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "set" || answer.correct.kind !== "realset") return false;
    // Il modello si ricostruisce dagli stessi numeri usati per scrivere il testo.
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    const set = answer.correct;
    return probePoints(set).every((value) => holds(model, value) === inSet(set, value));
  },
});
