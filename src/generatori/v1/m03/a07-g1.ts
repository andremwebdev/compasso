// V1.M03.A07.g1 — Passare tra radicali e potenze a esponente razionale.
//
// Risposta: un numero. Due richieste:
// - «Calcola il valore»: un prodotto di potenze con esponente frazionario (o di radicali), tutte di basi
//   che sono potenze della stessa base t (8 = 2³, 9 = 3²): il valore è t^E con E intero;
// - «Scrivi come un solo radicale»: un prodotto di radicali di indici diversi della stessa base, che è
//   t^E con E frazionario, cioè ˢ√(tʳ) (qualunque scrittura equivalente è accettata).
// All'indietro: si scelgono t, le basi scritte (t^k) e gli esponenti in modo che E sia quello voluto.
// Le risposte sbagliate:
// - CALC.ESPONENTE_FRAZIONARIO: a^(m/n) preso come a · m/n; la radice dimenticata (aᵐ); indice ed
//   esponente scambiati (ᵐ√(aⁿ)), anche nel passaggio finale da t^(r/s) al radicale;
// - CALC.ESPONENTE_NEGATIVO: a^(−m/n) preso come −a^(m/n);
// - CALC.PROPRIETA_POTENZE: nel prodotto gli esponenti moltiplicati invece che sommati;
// - CALC.SOMMA_FRAZIONI: gli esponenti 1/3 + 1/2 sommati come 2/5.
//
// Livello 1: una potenza b^(m/n) con b = sⁿ (8^(2/3), 27^(−1/3), 16^(3/4)).
// Livello 2: due potenze di basi diverse riportate alla stessa (4^(3/2) · 8^(−1/3)); oppure due radicali
//   di indice diverso da scrivere come un solo radicale (∛2 · √2 = ⁶√32).
// Livello 3: tre fattori, con un esponente decimale (16^0,75) e un radicale da trasformare in potenza.
//
// Verifica: l'espressione del testo si ricostruisce con le potenze e le radici del motore e si confronta
// con la risposta con `equivalent`.

import { defineGenerator, exact, type Exercise, type ExerciseDraft, type GeneratorContext, type Level } from "../../../esercizi";
import type { ErrorCode } from "../../../errori";
import { simplify } from "../../../motore/algebra/simplify";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { decimal, frac, mul, neg, num, pow, root, sqrt, toLatex, type Expr } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { Rng } from "../../../motore/random/rng";
import { lcm } from "../../comuni/primes";
import { distinctWrongExpressions } from "../../comuni/wrong";

type Rng_ = GeneratorContext["rng"];

const FRACTIONAL: ErrorCode = "CALC.ESPONENTE_FRAZIONARIO";
const NEGATIVE: ErrorCode = "CALC.ESPONENTE_NEGATIVO";
const PROPERTIES: ErrorCode = "CALC.PROPRIETA_POTENZE";
const FRACTION_SUM: ErrorCode = "CALC.SOMMA_FRAZIONI";

/** Un fattore: (t^k)^e, scritto come potenza, come radicale o con l'esponente decimale. */
interface Factor {
  readonly k: number;
  readonly e: Rational;
  readonly show: "pow" | "root" | "decimal";
}

interface Model {
  readonly t: number;
  readonly factors: readonly Factor[];
  readonly ask: "value" | "single";
}

const R = (p: number, q = 1): Rational => Rational.of(p, q);
const nOf = (r: Rational): number => Number(r.n);
const dOf = (r: Rational): number => Number(r.d);
const baseOf = (m: Model, f: Factor): number => m.t ** f.k;

// ───────────────────────────── conti ─────────────────────────────

const exponentOf = (m: Model): Rational => m.factors.reduce((s, f) => s.add(f.e.mul(f.k)), R(0));

/** t^E come numero: razionale se E è intero, altrimenti ˢ√(tʳ) (con r e s positivi) o il suo reciproco. */
function powerValue(t: number, E: Rational): Expr {
  if (E.isInteger()) {
    const e = nOf(E);
    return e >= 0 ? num(t ** e) : frac(1, t ** -e);
  }
  return simplify(pow(num(t), frac(E.n, E.d)));
}

/** t^(r/s) con r/s > 0 non intero, scritto come radicale con fuori quello che si può: t^q · ˢ√(t^(r − qs)). */
function radicalOf(t: number, E: Rational): Expr {
  const s = dOf(E);
  const q = Math.floor(nOf(E) / s);
  const r = nOf(E) - q * s;
  const inner = num(t ** r);
  const rad = s === 2 ? sqrt(inner) : root(s, inner);
  return q === 0 ? rad : mul(num(t ** q), rad);
}

const tidy = (r: Rational): boolean => Math.abs(nOf(r)) <= 2000 && dOf(r) <= 2000;

function wrongCandidates(m: Model): { error: ErrorCode; value: Expr }[] {
  const E = exponentOf(m);
  const out: { error: ErrorCode; value: Expr }[] = [];
  const t = m.t;
  if (m.ask === "single") {
    const [f1, f2] = m.factors;
    if (!f1 || !f2) return out;
    const e1 = f1.e.mul(f1.k);
    const e2 = f2.e.mul(f2.k);
    out.push({ error: PROPERTIES, value: powerValue(t, e1.mul(e2)) });
    out.push({ error: FRACTION_SUM, value: powerValue(t, R(nOf(e1) + nOf(e2), dOf(e1) + dOf(e2))) });
    // Da t^(r/s) al radicale con indice ed esponente scambiati: ʳ√(tˢ).
    if (nOf(E) >= 2 && t ** dOf(E) <= 2000) out.push({ error: FRACTIONAL, value: simplify(nOf(E) === 2 ? sqrt(num(t ** dOf(E))) : root(nOf(E), num(t ** dOf(E)))) });
    return out;
  }
  m.factors.forEach((f) => {
    const b = baseOf(m, f);
    const rest = E.sub(f.e.mul(f.k));
    // La radice dimenticata: b^(numeratore dell'esponente).
    const noRoot = rest.add(R(nOf(f.e) * f.k));
    if (!f.e.isInteger() && noRoot.isInteger() && t ** Math.abs(nOf(noRoot)) <= 2000) out.push({ error: FRACTIONAL, value: powerValue(t, noRoot) });
    // L'esponente come fattore: b · e, per il resto del prodotto (se il resto è un numero razionale).
    if (f.e.cmp(0) > 0 && rest.isInteger() && Math.abs(nOf(rest)) <= 10) {
      const restValue = rest.cmp(0) >= 0 ? R(t ** nOf(rest)) : R(1, t ** -nOf(rest));
      const v = f.e.mul(b).mul(restValue);
      if (tidy(v)) out.push({ error: FRACTIONAL, value: frac(v.n, v.d) });
    }
    // Indice ed esponente scambiati (un solo fattore): ᵐ√(bⁿ).
    if (m.factors.length === 1 && Math.abs(nOf(f.e)) >= 2 && f.e.cmp(0) > 0 && b ** dOf(f.e) <= 2000) {
      const p = nOf(f.e);
      out.push({ error: FRACTIONAL, value: simplify(p === 2 ? sqrt(num(b ** dOf(f.e))) : root(p, num(b ** dOf(f.e)))) });
    }
    // Esponente negativo preso come opposto.
    if (f.e.cmp(0) < 0) {
      const v = E.sub(f.e.mul(2 * f.k));
      if (v.isInteger() && t ** Math.abs(nOf(v)) <= 2000) out.push({ error: NEGATIVE, value: simplify(neg(powerValue(t, v))) });
    }
  });
  // Nel prodotto di due fattori gli esponenti moltiplicati.
  if (m.factors.length === 2) {
    const [f1, f2] = m.factors as [Factor, Factor];
    const p = f1.e.mul(f1.k).mul(f2.e.mul(f2.k));
    if (p.isInteger() && Math.abs(nOf(p)) <= 10) out.push({ error: PROPERTIES, value: powerValue(t, p) });
  }
  return out;
}

const correctOf = (m: Model): Expr => (m.ask === "single" ? radicalOf(m.t, exponentOf(m)) : powerValue(m.t, exponentOf(m)));
const wrongOf = (m: Model) => distinctWrongExpressions(correctOf(m), wrongCandidates(m)).slice(0, 4);

// ───────────────────────────── costruzione ─────────────────────────────

function buildLevel1(rng: Rng_): Model {
  // b^(m/n) con b = sⁿ, scritta come potenza oppure come radicale ⁿ√(bᵐ).
  for (;;) {
    const s = rng.int(2, 12);
    const n = rng.int(2, 6);
    const m = rng.pick([1, 1, 2, 3, -1, -2, -3] as const);
    if (s ** n > 1024 || s ** Math.abs(m) > 1000) continue;
    const show = m > 0 && rng.bool(0.35) ? "root" : "pow";
    if (show === "root" && (s ** n) ** m > 1000) continue;
    return { t: s, factors: [{ k: n, e: R(m, n), show }], ask: "value" };
  }
}

function buildLevel2(rng: Rng_): Model {
  const t = rng.pick([2, 2, 3] as const);
  if (rng.bool(0.6)) {
    // Due potenze: (t^k1)^e1 · (t^k2)^e2 con esponente totale intero.
    for (;;) {
      const [k1, k2] = rng.sample(t === 2 ? [1, 2, 3, 4] : [1, 2, 3], 2) as [number, number];
      const e1 = R(rng.intExcept(-3, 3, [0]), rng.pick([2, 3, 4]));
      const e2 = R(rng.intExcept(-3, 3, [0]), rng.pick([2, 3, 4]));
      if (e1.isInteger() || e2.isInteger()) continue;
      const E = e1.mul(k1).add(e2.mul(k2));
      if (!E.isInteger() || Math.abs(nOf(E)) > (t === 2 ? 6 : 4) || E.isZero()) continue;
      return { t, factors: [{ k: k1, e: e1, show: "pow" }, { k: k2, e: e2, show: "pow" }], ask: "value" };
    }
  }
  // Due radicali di indice diverso, di basi t o t²: ⁿ¹√((t^k1)^a1) · ⁿ²√((t^k2)^a2).
  for (;;) {
    const u = rng.pick([2, 2, 3, 5, 7] as const);
    const [n1, n2] = rng.sample([2, 3, 4, 5, 6], 2) as [number, number];
    const k1 = rng.pick([1, 1, 2]);
    const k2 = rng.pick([1, 1, 2]);
    const e1 = R(rng.int(1, n1 - 1), n1);
    const e2 = R(rng.int(1, n2 - 1), n2);
    const E = e1.mul(k1).add(e2.mul(k2));
    if (E.isInteger() || nOf(E) > 2 * dOf(E) || u ** (nOf(E) % dOf(E)) > 250) continue;
    if (dOf(e1.mul(k1)) === dOf(e2.mul(k2))) continue;
    if (k1 * nOf(e1) >= n1 || k2 * nOf(e2) >= n2) continue;
    return { t: u, factors: [{ k: k1, e: e1, show: "root" }, { k: k2, e: e2, show: "root" }], ask: "single" };
  }
}

function buildLevel3(rng: Rng_): Model {
  for (;;) {
    const t = rng.pick([2, 3] as const);
    const ks = t === 2 ? [2, 3, 4, 6] : [2, 3, 4];
    // Ogni fattore è una potenza intera di t: (t^k)^e con k·e intero. Uno ha l'esponente decimale
    // (0,5, 0,25, 0,75, 1,5, −0,5), uno è un radicale, uno una potenza frazionaria anche negativa.
    const pick = (es: readonly Rational[]): Factor | null => {
      const k = rng.pick(ks);
      const options = es.filter((e) => e.mul(k).isInteger());
      return options.length === 0 ? null : { k, e: rng.pick(options), show: "pow" };
    };
    const dec = pick([R(1, 2), R(1, 4), R(3, 4), R(3, 2), R(-1, 2)]);
    const rad = pick([R(1, 2), R(1, 3), R(2, 3), R(1, 4), R(3, 4)]);
    const pw = pick([R(-1, 2), R(-2, 3), R(-1, 3), R(3, 2), R(-3, 2), R(2, 3), R(-3, 4)]);
    if (!dec || !rad || !pw) continue;
    const factors: Factor[] = [{ ...dec, show: "decimal" }, { ...rad, show: "root" }, pw];
    const m: Model = { t, factors, ask: "value" };
    const E = exponentOf(m);
    if (Math.abs(nOf(E)) > (t === 2 ? 7 : 4) || E.isZero()) continue;
    if (baseOf(m, rad) ** nOf(rad.e) > 100) continue;
    return m;
  }
}

function buildModel(level: Level, rng: Rng_): Model {
  for (;;) {
    const m = level === 1 ? buildLevel1(rng) : level === 2 ? buildLevel2(rng) : buildLevel3(rng);
    if (m.ask === "value" && exponentOf(m).isZero()) continue;
    if (wrongOf(m).length >= (level === 1 ? 2 : 3)) return m;
  }
}

// ───────────────────────────── testo ─────────────────────────────

const fracLatex = (r: Rational): string => (r.isInteger() ? String(nOf(r)) : `${nOf(r) < 0 ? "-" : ""}\\frac{${Math.abs(nOf(r))}}{${dOf(r)}}`);
const decimalLatex = (r: Rational): string => {
  const v = nOf(r) / dOf(r);
  return String(v).replace("-", "-").replace(".", "{,}");
};

function factorLatex(m: Model, f: Factor): string {
  const b = baseOf(m, f);
  switch (f.show) {
    case "pow":
      return `${b}^{${fracLatex(f.e)}}`;
    case "decimal":
      return `${b}^{${decimalLatex(f.e)}}`;
    case "root": {
      const p = nOf(f.e);
      const q = dOf(f.e);
      const inner = p === 1 ? String(b) : `${b}^{${p}}`;
      return q === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${q}]{${inner}}`;
    }
  }
}

const expressionLatex = (m: Model): string => m.factors.map((f) => factorLatex(m, f)).join(" \\cdot ");
const tPow = (t: number, e: Rational): string => `${t}^{${fracLatex(e)}}`;

function stepsOf(m: Model): string[] {
  const E = exponentOf(m);
  const conversions = m.factors.map((f) => {
    const b = baseOf(m, f);
    const asPower = f.show === "root" ? `${factorLatex(m, f)} = ${b}^{${fracLatex(f.e)}}` : f.show === "decimal" ? `${factorLatex(m, f)} = ${b}^{${fracLatex(f.e)}}` : factorLatex(m, f);
    const toT = f.k === 1 ? "" : ` = \\left(${m.t}^{${f.k}}\\right)^{${fracLatex(f.e)}} = ${tPow(m.t, f.e.mul(f.k))}`;
    return `$${asPower}${toT}$`;
  });
  const lcd = m.factors.reduce((a, f) => lcm(a, dOf(f.e.mul(f.k))), 1);
  const term = (top: number): string => (lcd === 1 ? String(top) : `\\frac{${top}}{${lcd}}`);
  const sum = m.factors.map((f, i) => {
    const e = f.e.mul(f.k);
    const top = (nOf(e) * lcd) / dOf(e);
    return i === 0 ? (top < 0 ? `-${term(-top)}` : term(top)) : top < 0 ? `- ${term(-top)}` : `+ ${term(top)}`;
  });
  const steps = [
    `**Passo 1. Tutto come potenza di $${m.t}$.** Una radice è una potenza con esponente frazionario, $\\sqrt[n]{a^m} = a^{\\frac{m}{n}}$: ${conversions.join("; ")}.`,
    m.factors.length > 1
      ? `**Passo 2. Proprietà.** Nel prodotto con la stessa base gli esponenti si sommano: $${sum.join(" ")} = ${fracLatex(E)}$, quindi resta $${tPow(m.t, E)}$.`
      : `**Passo 2. L'esponente.** Resta $${tPow(m.t, E)}$.`,
  ];
  if (m.ask === "single") {
    const s3 = dOf(E);
    const q3 = Math.floor(nOf(E) / s3);
    steps.push(
      q3 === 0
        ? `**Passo 3. Di nuovo radicale.** Il denominatore dell'esponente è l'indice, il numeratore l'esponente del radicando: $${tPow(m.t, E)} = ${toLatex(correctOf(m))}$.`
        : `**Passo 3. Di nuovo radicale.** Il denominatore dell'esponente è l'indice, il numeratore l'esponente del radicando: $${tPow(m.t, E)} = \\sqrt[${s3}]{${m.t}^{${nOf(E)}}}$; si porta fuori $${m.t}^{${q3}}$: $${toLatex(correctOf(m))}$.`,
    );
  } else {
    const e = nOf(E);
    steps.push(e < 0 ? `**Passo 3. Valore.** L'esponente negativo indica il reciproco: $${m.t}^{${e}} = \\dfrac{1}{${m.t}^{${-e}}} = ${toLatex(correctOf(m))}$.` : `**Passo 3. Valore.** $${m.t}^{${e}} = ${toLatex(correctOf(m))}$.`);
  }
  return steps;
}

function draftOf(m: Model): ExerciseDraft {
  const prompt =
    m.ask === "single"
      ? `Scrivi $${expressionLatex(m)}$ come un solo radicale, con fuori dalla radice tutto quello che si può.`
      : `Calcola il valore di $${expressionLatex(m)}$. Scrivi il risultato come numero intero o frazione.`;
  return {
    prompt,
    answer: { kind: "number", correct: correctOf(m), wrong: wrongOf(m), mode: exact },
    steps: stepsOf(m).map((text) => ({ text })),
    hints: [
      "Scrivi tutto come potenza della stessa base: $\\sqrt[n]{a^m} = a^{\\frac{m}{n}}$, e per esempio $8 = 2^3$, $9 = 3^2$.",
      "Con la stessa base, nel prodotto gli esponenti si sommano (con il denominatore comune); un esponente negativo indica il reciproco.",
    ],
  };
}

// ───────────────────────────── verifica ─────────────────────────────

function factorExpr(m: Model, f: Factor): Expr {
  const b = num(baseOf(m, f));
  if (f.show === "root") {
    const inner = nOf(f.e) === 1 ? b : pow(b, num(nOf(f.e)));
    return dOf(f.e) === 2 ? sqrt(inner) : root(dOf(f.e), inner);
  }
  if (f.show === "decimal") return pow(b, decimal(decimalLatex(f.e).replace("{,}", ",")));
  return pow(b, frac(f.e.n, f.e.d));
}

function verifyModel(m: Model, exercise: Exercise): boolean {
  if (exercise.answer.kind !== "number") return false;
  if (!exercise.prompt.includes(expressionLatex(m))) return false;
  const [first, ...rest] = m.factors.map((f) => factorExpr(m, f));
  if (!first) return false;
  const e = rest.length === 0 ? first : mul(first, ...rest);
  return equivalent(e, exercise.answer.correct);
}

export default defineGenerator({
  code: "V1.M03.A07.g1",
  skill: "V1.M03.A07",
  lesson: "V1.M03.L06",
  title: "Radicali e potenze a esponente razionale",
  levels: [1, 2, 3],
  errors: [FRACTIONAL, NEGATIVE, PROPERTIES, FRACTION_SUM],
  limits: { maxInteger: 2000, maxDenominator: 2000 },
  generate({ level, rng }) {
    return draftOf(buildModel(level, rng));
  },
  verify(exercise: Exercise) {
    return verifyModel(buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed)), exercise);
  },
});
