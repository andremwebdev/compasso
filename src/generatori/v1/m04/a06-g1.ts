// V1.M04.A06.g1 — Raccoglimento totale e parziale, differenza di quadrati, quadrato di un binomio.
//
// Risposta: un'espressione scomposta (vincolo `factored`: ogni fattore irriducibile, niente da
// raccogliere). All'indietro: si scelgono i fattori (la soluzione) e si moltiplicano per ottenere il
// polinomio del testo. Rispetto a V1.M04.A07.g1 (la strategia completa, con trinomi, cubi e Ruffini)
// qui ci sono solo le tecniche della lezione V1.M04.L06, anche con due lettere.
//
// Le risposte sbagliate sono scritte fattore per fattore, facendo UN errore tipico:
// - ALG.RACCOGLIMENTO: un termine uguale al fattore raccolto sparisce invece di lasciare 1; un
//   coefficiente non diviso; raccolta la lettera con l'esponente maggiore;
// - CALC.REGOLA_SEGNI: raccogliendo un numero negativo, un segno tra parentesi non cambiato;
// - ALG.QUADRATO_BINOMIO: A² − B² scritto (A − B)², oppure un quadrato di binomio scritto come
//   differenza di quadrati (il doppio prodotto sparisce);
// - ALG.SEGNI_FATTORI: il segno del quadrato di binomio, o il segno nel raccoglimento parziale;
// - ALG.SOMMA_QUADRATI: la somma di quadrati x² + q² «scomposta» come una differenza.
//
// Livello 1: una tecnica sola (raccoglimento totale anche con x e y, differenza di quadrati, quadrato
//   di binomio).
// Livello 2: raccoglimento parziale (anche (x + a)(y + b)), raccoglimento di un binomio comune
//   (2x(x − 3) − 5(x − 3)), raccoglimento totale seguito da una differenza di quadrati.
// Livello 3: due tecniche di seguito: x⁴ − q⁴, raccoglimento parziale che lascia una differenza di
//   quadrati, raccoglimento totale seguito da un quadrato di binomio, differenza di quadrati con x e y
//   dopo un raccoglimento.
//
// Verifica: i fattori della risposta, rimoltiplicati dal motore, sono equivalenti al polinomio del testo.

import { defineGenerator, type ExerciseDraft, type GeneratorContext } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { add, mul, neg, num, pow, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { checkForm } from "../../../motore/form";
import { mono, monoExpr, polyEq, polyExpr, polyMul, reduce, type Mono, type Poly } from "../../comuni/monomials";
import { distinctWrongExpressions, type WrongCandidate } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const COLLECT: ErrorCode = "ALG.RACCOGLIMENTO";
const SIGNS: ErrorCode = "CALC.REGOLA_SEGNI";
const SQUARE: ErrorCode = "ALG.QUADRATO_BINOMIO";
const FACTOR_SIGNS: ErrorCode = "ALG.SEGNI_FATTORI";
const SUM_SQUARES: ErrorCode = "ALG.SOMMA_QUADRATI";

/** Un fattore: un polinomio con il suo esponente. */
interface Factor {
  readonly poly: Poly;
  readonly power: number;
}

/** Una scomposizione: il monomio raccolto davanti (c·xᵃyᵇ, anche 1) e gli altri fattori. */
interface Factored {
  readonly front: Mono;
  readonly factors: readonly Factor[];
}

type Form = "common" | "squares" | "square" | "grouping" | "binomialCommon" | "commonSquares" | "fourth" | "groupingSquares" | "commonSquare";

interface Model {
  readonly form: Form;
  readonly answer: Factored;
  readonly wrong: readonly { error: ErrorCode; value: Factored }[];
  /** Solo per «binomialCommon»: i due termini come sono scritti nel testo, a·(x − r) + b·(x − r). */
  readonly written?: { readonly a: Poly; readonly b: Poly; readonly common: Poly };
}

// ───────────────────────────── scrittura ─────────────────────────────

const one = (poly: Poly): Factor => ({ poly, power: 1 });
const F = (front: Mono, ...factors: Factor[]): Factored => ({ front, factors });
const plain = (...factors: Factor[]): Factored => F(mono(1), ...factors);

/** Il polinomio che si ottiene rimoltiplicando. */
const expanded = (f: Factored): Poly =>
  f.factors.reduce<Poly>((p, factor) => Array.from({ length: factor.power }, () => factor.poly).reduce<Poly>((q, r) => polyMul(q, r), p), [f.front]);

/** La scomposizione scritta: monomio davanti (il segno meno davanti a tutto), poi i fattori tra parentesi, con le potenze. */
function factoredExpr(f: Factored): Expr {
  const parts: Expr[] = [];
  const negative = f.front.c.sign() < 0;
  const abs = { ...f.front, c: f.front.c.abs() };
  if (!(abs.c.eq(1) && abs.x + abs.y === 0) || f.factors.length === 0) {
    const front = monoExpr(abs);
    parts.push(...(front.kind === "mul" ? front.factors : [front]));
  }
  // Lo stesso fattore scritto più volte diventa una potenza: (x + 2)³(x − 2), non (x + 2)(x + 2)²(x − 2).
  const merged: Factor[] = [];
  for (const factor of f.factors) {
    const twin = merged.findIndex((other) => polyEq(other.poly, factor.poly));
    if (twin >= 0) merged[twin] = { poly: (merged[twin] as Factor).poly, power: (merged[twin] as Factor).power + factor.power };
    else merged.push(factor);
  }
  for (const factor of merged) {
    const p = polyExpr(factor.poly);
    parts.push(factor.power === 1 ? p : pow(p, factor.power));
  }
  const product = parts.length === 1 ? (parts[0] as Expr) : mul(...parts);
  return negative ? neg(product) : product;
}

const P$ = (p: Poly): string => toLatex(polyExpr(p));
const F$ = (f: Factored): string => toLatex(factoredExpr(f));

// ───────────────────────────── costruzione all'indietro ─────────────────────────────

const X = (c: number, e = 1): Mono => mono(c, e, 0);
const Y = (c: number, e = 1): Mono => mono(c, 0, e);
const K = (c: number): Mono => mono(c);
const opposite = (m: Mono): Mono => ({ ...m, c: m.c.neg() });
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const nz = (rng: Rng_, max: number): number => rng.intExcept(-max, max);

/** Raccoglimento totale: c·xᵃ·yᵇ per un polinomio senza fattori comuni (due o tre termini). */
function common(rng: Rng_, twoLetters: boolean): Model {
  for (;;) {
    const drawn = rng.pick([2, 3, 4, 5, 6, -2, -3]);
    const [a, b] = [rng.int(1, 3), twoLetters ? rng.int(1, 2) : 0];
    // I termini tra parentesi: monomi distinti, coefficienti primi tra loro nel complesso, nessuna lettera
    // in comune a tutti. Uno dei termini è spesso ±1 (il termine uguale al fattore raccolto).
    const pool: Mono[] = twoLetters ? [X(1), X(1, 2), Y(1), Y(1, 2), mono(1, 1, 1), K(1)] : [X(1), X(1, 2), X(1, 3), K(1)];
    const count = rng.pick([2, 3, 3]);
    const chosen = rng.sample(pool, count).map((m, k) => (k === 0 && rng.bool(0.6) ? { ...m, c: Rational.of(rng.sign()) } : { ...m, c: Rational.of(nz(rng, 5)) }));
    const reduced = reduce(chosen);
    if (reduced.length !== count) continue;
    // Il primo termine tra parentesi è positivo: se no, si raccoglie anche il segno meno.
    const flip = (reduced[0] as Mono).c.sign() < 0;
    const inner = flip ? reduced.map(opposite) : reduced;
    const g = inner.reduce((s, m) => gcd(s, Number(m.c.n)), 0);
    const commonX = Math.min(...inner.map((m) => m.x));
    const commonY = Math.min(...inner.map((m) => m.y));
    if (g !== 1 || commonX > 0 || commonY > 0) continue;
    // Con due termini che sono quadrati di segno opposto ci sarebbe ancora una differenza di quadrati: si scarta.
    if (count === 2 && inner.every((m) => m.x % 2 === 0 && m.y % 2 === 0 && Number.isInteger(Math.sqrt(Number(m.c.abs().n)))) && (inner[0] as Mono).c.sign() !== (inner[1] as Mono).c.sign()) continue;
    const c = flip ? -drawn : drawn;
    const front = mono(c, a, b);
    const answer = F(front, one(inner));
    // Il polinomio tra parentesi deve essere irriducibile (x³ − 1 si scomporrebbe ancora).
    if (!checkForm(factoredExpr(answer), "factored").ok) continue;
    const wrong: { error: ErrorCode; value: Factored }[] = [];
    const unit = inner.findIndex((m) => m.c.abs().eq(1) && m.x + m.y === 0);
    // Il termine uguale al fattore raccolto sparisce (con tre termini: con due resterebbe un termine solo).
    if (unit >= 0 && inner.length === 3) wrong.push({ error: COLLECT, value: F(front, one(inner.filter((_, k) => k !== unit))) });
    // Un coefficiente non diviso: resta moltiplicato per c (il primo termine che non è ±1).
    const notDivided = inner.findIndex((m) => !(m.x + m.y === 0 && m.c.abs().eq(1)));
    if (notDivided >= 0) wrong.push({ error: COLLECT, value: F(front, one(inner.map((m, k) => (k === notDivided ? { ...m, c: m.c.mul(c) } : m)))) });
    // Raccolta la x con l'esponente maggiore, come in 4x³ − 6x² = 2x³(2 − 3x): davanti xᵃ⁺ᵐ, e tra
    // parentesi gli esponenti di x scambiati (chi aveva xᵐ resta senza x, chi non l'aveva prende xᵐ).
    const maxX = Math.max(...inner.map((m) => m.x));
    if (maxX > 0 && inner.every((m) => m.x === 0 || m.x === maxX)) {
      wrong.push({ error: COLLECT, value: F({ ...front, x: a + maxX }, one(inner.map((m) => ({ ...m, x: m.x === maxX ? 0 : maxX })))) });
    }
    // Con c negativo, un segno tra parentesi non cambiato.
    if (c < 0) wrong.push({ error: SIGNS, value: F(front, one(inner.map((m, k) => (k === inner.length - 1 ? opposite(m) : m)))) });
    return { form: "common", answer, wrong };
  }
}

/** Differenza di quadrati (p·u)² − (q·v)², con u e v lettere o 1. */
function squares(p: number, q: number, u: Mono, v: Mono): { answer: Factor[]; wrong: { error: ErrorCode; value: Factor[] }[] } {
  const A = { ...u, c: Rational.of(p) };
  const B = { ...v, c: Rational.of(q) };
  return {
    answer: [one([A, B]), one([A, opposite(B)])],
    wrong: [
      { error: SQUARE, value: [{ poly: [A, opposite(B)], power: 2 }] },
      { error: SQUARE, value: [{ poly: [A, B], power: 2 }] },
    ],
  };
}

/** Quadrato di binomio (p·x + q)². */
function square(p: number, q: number): { answer: Factor[]; wrong: { error: ErrorCode; value: Factor[] }[] } {
  return {
    answer: [{ poly: [X(p), K(q)], power: 2 }],
    wrong: [
      { error: FACTOR_SIGNS, value: [{ poly: [X(p), K(-q)], power: 2 }] },
      { error: SQUARE, value: [one([X(p), K(Math.abs(q))]), one([X(p), K(-Math.abs(q))])] },
    ],
  };
}

/** Coppia di numeri primi tra loro, il primo da 1 a maxP, il secondo da 1 a maxQ. */
function coprime(rng: Rng_, maxP: number, maxQ: number): [number, number] {
  for (;;) {
    const [p, q] = [rng.int(1, maxP), rng.int(1, maxQ)];
    if (gcd(p, q) === 1) return [p, q];
  }
}

function buildLevel1(rng: Rng_): Model {
  const form = rng.pick(["common", "common", "common", "squares", "squares", "square", "square"] as const);
  switch (form) {
    case "common":
      return common(rng, rng.bool(0.6));
    case "squares": {
      const [p, q] = coprime(rng, 5, 9);
      const piece = squares(p, q, X(1), K(1));
      return { form, answer: plain(...piece.answer), wrong: piece.wrong.map((w) => ({ error: w.error, value: plain(...w.value) })) };
    }
    case "square": {
      const [p, q] = coprime(rng, 4, 7);
      const piece = square(p, q * rng.sign());
      return { form, answer: plain(...piece.answer), wrong: piece.wrong.map((w) => ({ error: w.error, value: plain(...w.value) })) };
    }
  }
}

function buildLevel2(rng: Rng_): Model {
  const form = rng.pick(["grouping", "grouping", "binomialCommon", "binomialCommon", "commonSquares", "commonSquares", "squaresXY"] as const);
  switch (form) {
    case "grouping": {
      if (rng.bool(0.5)) {
        // (x + a)(y + b) = xy + bx + ay + ab
        const [a, b] = [nz(rng, 6), nz(rng, 6)];
        return {
          form,
          answer: plain(one([X(1), K(a)]), one([Y(1), K(b)])),
          wrong: [
            { error: FACTOR_SIGNS, value: plain(one([X(1), K(-a)]), one([Y(1), K(b)])) },
            { error: FACTOR_SIGNS, value: plain(one([X(1), K(a)]), one([Y(1), K(-b)])) },
            { error: FACTOR_SIGNS, value: plain(one([X(1), K(-a)]), one([Y(1), K(-b)])) },
          ],
        };
      }
      // (x − a)(x² + b), con b quadrato: dal raccoglimento parziale x²(x − a) + b(x − a). La somma di
      // quadrati x² + b resta com'è (ed è l'errore tipico scomporla).
      const [a, b] = [nz(rng, 6), rng.pick([1, 4, 9])];
      const quadratic: Poly = [X(1, 2), K(b)];
      return {
        form,
        answer: plain(one([X(1), K(-a)]), one(quadratic)),
        wrong: [
          { error: FACTOR_SIGNS, value: plain(one([X(1), K(a)]), one(quadratic)) },
          // La somma di quadrati x² + b «scomposta» come una differenza, oppure come un quadrato di binomio.
          { error: SUM_SQUARES, value: plain(one([X(1), K(-a)]), one([X(1), K(Math.sqrt(b))]), one([X(1), K(-Math.sqrt(b))])) },
          { error: SQUARE, value: plain(one([X(1), K(-a)]), { poly: [X(1), K(Math.sqrt(b))], power: 2 }) },
        ],
      };
    }
    case "binomialCommon": {
      // a(x)·(x − r) + b·(x − r), con a(x) = p x e b numero: il fattore comune è il binomio.
      const r = nz(rng, 6);
      const p = rng.int(1, 4);
      const b = nz(rng, 7);
      if (gcd(p, b) !== 1) return buildLevel2(rng);
      const commonFactor: Poly = [X(1), K(-r)];
      const other: Poly = [X(p), K(b)];
      return {
        form,
        answer: plain(one(commonFactor), one(other)),
        written: { a: [X(p)], b: [K(b)], common: commonFactor },
        wrong: [
          // Il fattore comune raccolto, ma tra parentesi resta solo il primo termine (il secondo «sparisce»).
          { error: COLLECT, value: plain(one(commonFactor), one([X(p)])) },
          // Il segno del secondo termine perso raccogliendo.
          { error: SIGNS, value: plain(one(commonFactor), one([X(p), K(-b)])) },
          // Il binomio comune scritto con il segno sbagliato.
          { error: FACTOR_SIGNS, value: plain(one([X(1), K(r)]), one(other)) },
        ],
      };
    }
    case "commonSquares": {
      // c·xᵏ·(x² − q²) = c xᵏ (x + q)(x − q)
      const [c, q] = [rng.pick([2, 3, 5]), rng.int(1, 6)];
      if (gcd(c, q) !== 1 && q !== 1) return buildLevel2(rng);
      const k = rng.int(0, 1);
      const front = X(c, k);
      const piece = squares(1, q, X(1), K(1));
      return {
        form,
        answer: F(front, ...piece.answer),
        wrong: [
          ...piece.wrong.map((w) => ({ error: w.error, value: F(front, ...w.value) })),
          // Raccolto il numero, ma non diviso il secondo termine: c(x² − c q²) non si scompone come dovrebbe.
          { error: COLLECT, value: F(front, one([X(1, 2), K(-c * q * q)])) },
        ],
      };
    }
    case "squaresXY": {
      const [p, q] = coprime(rng, 5, 5);
      const piece = squares(p, q, X(1), Y(1));
      return {
        form: "squares",
        answer: plain(...piece.answer),
        wrong: [
          ...piece.wrong.map((w) => ({ error: w.error, value: plain(...w.value) })),
          // Coefficienti non estratti dalla radice: (p²x + q²y)(p²x − q²y).
          ...(p > 1 || q > 1 ? [{ error: SQUARE, value: plain(one([X(p * p), Y(q * q)]), one([X(p * p), Y(-q * q)])) }] : []),
        ],
      };
    }
  }
}

function buildLevel3(rng: Rng_): Model {
  const form = rng.pick(["fourth", "groupingSquares", "groupingSquares", "commonSquare", "commonSquare", "commonSquaresXY"] as const);
  switch (form) {
    case "fourth": {
      // x⁴ − q⁴ = (x² + q²)(x + q)(x − q), oppure (p x)⁴ − 1.
      const [p, q] = rng.pick([[1, 1], [1, 2], [1, 3], [2, 1], [3, 1], [2, 3], [3, 2]] as const);
      const sum: Poly = [X(p * p, 2), K(q * q)];
      return {
        form,
        answer: plain(one(sum), one([X(p), K(q)]), one([X(p), K(-q)])),
        wrong: [
          // Scomposta anche la somma di quadrati, come se fosse una differenza: due quadrati di binomio.
          { error: SUM_SQUARES, value: plain({ poly: [X(p), K(q)], power: 2 }, { poly: [X(p), K(-q)], power: 2 }) },
          // La differenza p²x² − q² scritta come quadrato di binomio.
          { error: SQUARE, value: plain(one(sum), { poly: [X(p), K(-q)], power: 2 }) },
          { error: SQUARE, value: plain(one(sum), { poly: [X(p), K(q)], power: 2 }) },
        ],
      };
    }
    case "groupingSquares": {
      // (x + a)(x + q)(x − q) = x³ + a x² − q² x − a q²: raccoglimento parziale, poi differenza di quadrati.
      const q = rng.int(1, 5);
      const a = rng.intExcept(-7, 7, [0, q, -q]);
      return {
        form,
        answer: plain(one([X(1), K(a)]), one([X(1), K(q)]), one([X(1), K(-q)])),
        wrong: [
          { error: FACTOR_SIGNS, value: plain(one([X(1), K(-a)]), one([X(1), K(q)]), one([X(1), K(-q)])) },
          { error: SQUARE, value: plain(one([X(1), K(a)]), { poly: [X(1), K(-q)], power: 2 }) },
          // Raccogliendo −q² dagli ultimi due termini, il segno tra parentesi non cambiato: resta x² + q².
          { error: SIGNS, value: plain(one([X(1), K(a)]), one([X(1, 2), K(q * q)])) },
        ],
      };
    }
    case "commonSquare": {
      // c·xᵏ·(p x + q)², dal raccoglimento totale e da un quadrato di binomio.
      const c = rng.pick([1, 2, 3, -1, -2]);
      const [p, q0] = rng.pick([[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [2, 3], [3, 1], [3, 2]] as const);
      const q = q0 * rng.sign();
      const front = X(c, rng.int(1, 2));
      const piece = square(p, q);
      return {
        form,
        answer: F(front, ...piece.answer),
        wrong: [
          ...piece.wrong.map((w) => ({ error: w.error, value: F(front, ...w.value) })),
          // Raccolta la x, ma il primo termine conserva l'esponente che aveva: c·xᵏ·(p²x^(2+k) + 2pq x + q²).
          { error: COLLECT, value: F(front, one([X(p * p, 2 + front.x), X(2 * p * q), K(q * q)])) },
        ],
      };
    }
    case "commonSquaresXY": {
      // c·x·(p²x² − q²y²) = c x (p x + q y)(p x − q y)
      const [p, q] = coprime(rng, 3, 3);
      const c = rng.pick([2, 3]);
      const front = mono(c, 1, 0);
      const piece = squares(p, q, X(1), Y(1));
      return {
        form: "commonSquares",
        answer: F(front, ...piece.answer),
        wrong: [
          ...piece.wrong.map((w) => ({ error: w.error, value: F(front, ...w.value) })),
          // Il numero raccolto, ma non diviso nel primo termine: c·x·(c p²x² − q²y²).
          { error: COLLECT, value: F(front, one([X(c * p * p, 2), Y(-q * q, 2)])) },
        ],
      };
    }
  }
}

/** Quante risposte sbagliate diverse tra loro e dalla giusta (confrontate rimoltiplicando). */
function distinctWrongCount(model: Model): number {
  const right = expanded(model.answer);
  const values = model.wrong.map((w) => expanded(w.value));
  return values.filter((v, k) => !polyEq(v, right) && values.findIndex((u) => polyEq(u, v)) === k).length;
}

function buildModel(level: number, rng: Rng_): Model {
  for (;;) {
    const model = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    // Coefficienti piccoli nel testo, e abbastanza risposte sbagliate diverse.
    if (expanded(model.answer).every((m) => m.c.abs().cmp(90) <= 0) && distinctWrongCount(model) >= (level === 1 ? 2 : 3)) return model;
  }
}

// ───────────────────────────── testo, passaggi, verifica ─────────────────────────────

/** Il polinomio del testo, come lo si scrive. */
function promptExpr(model: Model): Expr {
  if (model.written) {
    const { a, b, common: c } = model.written;
    // a·(x − r) + b·(x − r), con il monomio a scritto senza parentesi: 4x(x − 1) + 5(x − 1).
    const times = (m: Poly): Expr => {
      const e = polyExpr(m);
      return e.kind === "mul" ? mul(...e.factors, polyExpr(c)) : mul(e, polyExpr(c));
    };
    return add(times(a), times(b));
  }
  return polyExpr(expanded(model.answer));
}

function stepsOf(model: Model): string[] {
  const p = expanded(model.answer);
  const answer = F$(model.answer);
  const front = model.answer.front;
  const hasFront = !(front.c.eq(1) && front.x + front.y === 0);
  const inner = hasFront ? plain(...model.answer.factors) : model.answer;
  const collected = hasFront ? `Raccoglimento totale: il fattore comune è $${toLatex(monoExpr(front))}$ (MCD dei coefficienti e lettere comuni con l'esponente minore). Si divide ogni termine: $$${P$(p)} = ${toLatex(monoExpr(front))}\\left(${P$(expanded(inner))}\\right)$$` : null;
  switch (model.form) {
    case "common":
      return [collected ?? "", `Tra parentesi i termini non hanno più niente in comune: la scomposizione è completa. Controllo rimoltiplicando: si ritrova $${P$(p)}$.`];
    case "squares": {
      const [A, B] = model.answer.factors[0]?.poly as Poly;
      return [`È una differenza di due quadrati, $A^{2} - B^{2}$ con $A = ${toLatex(monoExpr(A as Mono))}$ e $B = ${toLatex(monoExpr(B as Mono))}$: si scompone in $(A + B)(A - B)$. $$${P$(p)} = ${answer}$$`];
    }
    case "square": {
      const [A, B] = model.answer.factors[0]?.poly as Poly;
      return [`Il primo e l'ultimo termine sono quadrati, di $${toLatex(monoExpr(A as Mono))}$ e di $${toLatex(num((B as Mono).c.abs()))}$; il termine di mezzo è il loro doppio prodotto, con il segno ${(B as Mono).c.sign() < 0 ? "meno" : "più"}. $$${P$(p)} = ${answer}$$`];
    }
    case "grouping": {
      const [f1, f2] = model.answer.factors as [Factor, Factor];
      return [
        `Nessun fattore è comune a tutti i termini: si raggruppano a coppie e si raccoglie in ogni coppia, così che resti la stessa parentesi $\\left(${P$(f1.poly)}\\right)$.`,
        `Si raccoglie la parentesi comune: $$${P$(p)} = \\left(${P$(f1.poly)}\\right)\\left(${P$(f2.poly)}\\right)$$ Il secondo fattore non si scompone più.`,
      ];
    }
    case "binomialCommon": {
      const w = model.written as NonNullable<Model["written"]>;
      return [
        `I due termini hanno in comune il binomio $${P$(w.common)}$: si raccoglie, e tra parentesi restano $${P$(w.a)}$ e $${P$(w.b)}$, con il loro segno. $$${toLatex(promptExpr(model))} = ${answer}$$`,
      ];
    }
    case "commonSquares":
    case "commonSquare": {
      const second = model.form === "commonSquare" ? "un quadrato di binomio" : "una differenza di quadrati";
      return [collected ?? "", `Tra parentesi c'è ${second}: si scompone ancora. $$${P$(p)} = ${answer}$$`];
    }
    case "fourth": {
      const [sum, plus, minus] = model.answer.factors as [Factor, Factor, Factor];
      const diff: Poly = [(sum.poly[0] as Mono), opposite(sum.poly[1] as Mono)];
      return [
        `È una differenza di quadrati: $${P$(p)} = \\left(${P$(sum.poly)}\\right)\\left(${P$(diff)}\\right)$.`,
        `Il secondo fattore è ancora una differenza di quadrati, $${P$(diff)} = \\left(${P$(plus.poly)}\\right)\\left(${P$(minus.poly)}\\right)$; il primo è una somma di quadrati e non si scompone. $$${P$(p)} = ${answer}$$`,
      ];
    }
    case "groupingSquares": {
      const [f1, f2, f3] = model.answer.factors as [Factor, Factor, Factor];
      const diff = reduce(polyMul(f2.poly, f3.poly));
      return [
        `Raccoglimento parziale: dai primi due termini $x^{2}$, dagli ultimi due il numero (con il suo segno). Resta la stessa parentesi: $$${P$(p)} = \\left(${P$(f1.poly)}\\right)\\left(${P$(diff)}\\right)$$`,
        `$${P$(diff)}$ è una differenza di quadrati: $$${P$(p)} = ${answer}$$`,
      ];
    }
  }
}

const SECOND_HINT: Readonly<Record<Form, string>> = {
  common: "Trova il MCD dei coefficienti e le lettere comuni a tutti i termini, con l'esponente minore; poi dividi ogni termine per quel fattore.",
  squares: "Scrivi i due termini come quadrati, $A^{2}$ e $B^{2}$: una differenza di quadrati è $(A + B)(A - B)$.",
  square: "Controlla se il termine di mezzo è il doppio prodotto delle basi dei due quadrati: il suo segno va dentro la parentesi.",
  grouping: "Raggruppa i termini a due a due e raccogli in ogni gruppo; se resta la stessa parentesi, raccoglila.",
  binomialCommon: "C'è un binomio uguale in tutti e due i termini: raccoglilo come se fosse una lettera.",
  commonSquares: "Comincia dal raccoglimento totale; poi guarda la parentesi: è una differenza di quadrati?",
  fourth: "È una differenza di quadrati: $A = x^{2}$ (o un suo multiplo). Uno dei due fattori si scompone ancora.",
  groupingSquares: "Raggruppa i primi due termini e gli ultimi due; dopo il raccoglimento guarda se un fattore è una differenza di quadrati.",
  commonSquare: "Comincia dal raccoglimento totale; poi guarda la parentesi: è il quadrato di un binomio?",
};

function draftOf(model: Model): ExerciseDraft {
  const correct = factoredExpr(model.answer);
  const candidates: WrongCandidate<Expr>[] = model.wrong.map((w) => ({ error: w.error, value: factoredExpr(w.value) }));
  return {
    prompt: `Scomponi completamente in fattori: $${toLatex(promptExpr(model))}$.`,
    answer: { kind: "expression", correct, wrong: distinctWrongExpressions(correct, candidates), form: ["factored"] },
    steps: stepsOf(model).filter((text) => text !== "").map((text) => ({ text })),
    hints: [
      "Prima di tutto: c'è un fattore comune a tutti i termini? Poi conta i termini: con due pensa alla differenza di quadrati, con tre al quadrato di un binomio, con quattro al raccoglimento parziale.",
      SECOND_HINT[model.form],
    ],
  };
}

export default defineGenerator({
  code: "V1.M04.A06.g1",
  skill: "V1.M04.A06",
  lesson: "V1.M04.L06",
  title: "Raccoglimenti e prodotti notevoli al contrario",
  levels: [1, 2, 3],
  errors: [COLLECT, SIGNS, SQUARE, FACTOR_SIGNS, SUM_SQUARES],
  limits: { maxInteger: 100, maxDenominator: 1 },
  generate: ({ level, rng }) => draftOf(buildModel(level, rng)),
  // Verifica indipendente: la risposta rimoltiplicata dal motore è equivalente al polinomio del testo.
  verify: (exercise) => {
    const { answer } = exercise;
    if (answer.kind !== "expression") return false;
    const model = buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed));
    return equivalent(promptExpr(model), answer.correct);
  },
});
