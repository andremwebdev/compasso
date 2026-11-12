// Insiemi di soluzioni: forma canonica, unione, intersezione, complementare, appartenenza e
// confronto per struttura (specifica, sezione 6: estremi, inclusione degli estremi, periodo).
//
// Gli estremi sono costanti esatte: si ordinano con il valore esatto quando sono fatti di razionali
// e radici quadrate, con il valore numerico negli altri casi (π, e), e l'uguaglianza la decide
// sempre il confronto tra espressioni.

import { exactValue } from "../algebra/normalize";
import { simplify } from "../algebra/simplify";
import { equivalent } from "../equivalence/equivalence";
import { EngineError } from "../errors";
import { evaluate } from "../expr/evaluate";
import type { Expr } from "../expr/types";
import { Rational } from "../numbers/rational";
import type { Endpoint, Interval, PeriodicSet, RealSet, SolutionSet } from "./types";

const numberExpr = (value: Rational): Expr => ({ kind: "num", value });

/** Confronto di due costanti: negativo se a < b, zero se sono uguali, positivo se a > b. */
export function compareConstants(a: Expr, b: Expr): number {
  const ea = exactValue(a);
  const eb = exactValue(b);
  if (ea && eb) return ea.cmp(eb);
  const va = evaluate(a);
  const vb = evaluate(b);
  if (Number.isNaN(va) || Number.isNaN(vb)) throw new EngineError("Un estremo non è un numero reale.");
  if (Math.abs(va - vb) <= 1e-9 * Math.max(1, Math.abs(va), Math.abs(vb)) && equivalent(a, b)) return 0;
  return va < vb ? -1 : va > vb ? 1 : 0;
}

/** Confronto di due estremi, infiniti compresi. */
export function compareEndpoints(a: Endpoint, b: Endpoint): number {
  if (typeof a === "string" || typeof b === "string") {
    const position = (endpoint: Endpoint): number => (endpoint === "-inf" ? -1 : endpoint === "+inf" ? 1 : 0);
    return position(a) - position(b);
  }
  return compareConstants(a, b);
}

/** Un pezzo con gli infiniti aperti; null se è vuoto (estremi al contrario, o uguali senza essere entrambi inclusi). */
function tidy(piece: Interval): Interval | null {
  const lowerClosed = piece.lowerClosed && typeof piece.lower !== "string";
  const upperClosed = piece.upperClosed && typeof piece.upper !== "string";
  const order = compareEndpoints(piece.lower, piece.upper);
  if (order > 0 || (order === 0 && !(lowerClosed && upperClosed))) return null;
  return { lower: piece.lower, upper: piece.upper, lowerClosed, upperClosed };
}

/** Ordine dei pezzi: per estremo sinistro; a parità, prima quello che lo include. */
function compareLower(a: Interval, b: Interval): number {
  return compareEndpoints(a.lower, b.lower) || Number(b.lowerClosed) - Number(a.lowerClosed);
}

/** Forma canonica di un insieme di numeri reali: pezzi non vuoti, ordinati, disgiunti, fusi quando si toccano. */
function canonicalReal(set: RealSet): RealSet {
  const pieces = set.pieces.map(tidy).filter((piece): piece is Interval => piece !== null).sort(compareLower);
  const result: Interval[] = [];
  for (const piece of pieces) {
    const last = result[result.length - 1];
    const gap = last ? compareEndpoints(piece.lower, last.upper) : 1;
    if (last && (gap < 0 || (gap === 0 && (piece.lowerClosed || last.upperClosed)))) {
      const order = compareEndpoints(piece.upper, last.upper);
      if (order > 0) result[result.length - 1] = { ...last, upper: piece.upper, upperClosed: piece.upperClosed };
      else if (order === 0 && piece.upperClosed) result[result.length - 1] = { ...last, upperClosed: true };
    } else {
      result.push(piece);
    }
  }
  return { kind: "realset", pieces: result };
}

function intersectReal(a: RealSet, b: RealSet): RealSet {
  const pieces: Interval[] = [];
  for (const p of a.pieces) {
    for (const q of b.pieces) {
      const low = compareEndpoints(p.lower, q.lower);
      const high = compareEndpoints(p.upper, q.upper);
      pieces.push({
        lower: low >= 0 ? p.lower : q.lower,
        lowerClosed: low > 0 ? p.lowerClosed : low < 0 ? q.lowerClosed : p.lowerClosed && q.lowerClosed,
        upper: high <= 0 ? p.upper : q.upper,
        upperClosed: high < 0 ? p.upperClosed : high > 0 ? q.upperClosed : p.upperClosed && q.upperClosed,
      });
    }
  }
  return canonicalReal({ kind: "realset", pieces });
}

function complementReal(set: RealSet): RealSet {
  const pieces: Interval[] = [];
  let lower: Endpoint = "-inf";
  let lowerClosed = false;
  for (const piece of canonicalReal(set).pieces) {
    pieces.push({ lower, lowerClosed, upper: piece.lower, upperClosed: !piece.lowerClosed });
    lower = piece.upper;
    lowerClosed = !piece.upperClosed;
  }
  pieces.push({ lower, lowerClosed, upper: "+inf", upperClosed: false });
  return canonicalReal({ kind: "realset", pieces });
}

function containsReal(set: RealSet, value: Expr): boolean {
  return set.pieces.some((piece) => {
    const low = compareEndpoints(piece.lower, value);
    const high = compareEndpoints(value, piece.upper);
    return (low < 0 || (low === 0 && piece.lowerClosed)) && (high < 0 || (high === 0 && piece.upperClosed));
  });
}

function equalReal(a: RealSet, b: RealSet): boolean {
  return (
    a.pieces.length === b.pieces.length &&
    a.pieces.every((piece, index) => {
      const other = b.pieces[index] as Interval;
      return (
        piece.lowerClosed === other.lowerClosed &&
        piece.upperClosed === other.upperClosed &&
        compareEndpoints(piece.lower, other.lower) === 0 &&
        compareEndpoints(piece.upper, other.upper) === 0
      );
    })
  );
}

const isEmptyReal = (set: RealSet): boolean => set.pieces.length === 0;
const isAllReal = (set: RealSet): boolean =>
  set.pieces.length === 1 && set.pieces[0]?.lower === "-inf" && set.pieces[0]?.upper === "+inf";

const EMPTY: RealSet = { kind: "realset", pieces: [] };
const ALL: RealSet = { kind: "realset", pieces: [{ lower: "-inf", upper: "+inf", lowerClosed: false, upperClosed: false }] };
const ZERO = numberExpr(Rational.ZERO);

// ───────────────────────────── soluzioni periodiche ─────────────────────────────

/** value + times·period, pulito. */
function shift(value: Expr, period: Expr, times: number): Expr {
  if (times === 0) return value;
  return simplify({ kind: "add", terms: [value, { kind: "mul", factors: [numberExpr(Rational.of(times)), period] }] });
}

function shiftPiece(piece: Interval, period: Expr, times: number): Interval {
  const move = (endpoint: Endpoint): Endpoint => (typeof endpoint === "string" ? endpoint : shift(endpoint, period, times));
  return { ...piece, lower: move(piece.lower), upper: move(piece.upper) };
}

/** Il più grande intero k con k·period ≤ value. */
function floorDivide(value: Expr, period: Expr): number {
  let k = Math.floor(evaluate(value) / evaluate(period));
  if (!Number.isFinite(k) || Math.abs(k) > 1e6) throw new EngineError("Soluzioni periodiche: estremo troppo lontano dall'origine.");
  // Il conto approssimato può sbagliare di uno vicino ai multipli del periodo: lo corregge il confronto esatto.
  while (compareConstants(value, shift(ZERO, period, k)) < 0) k -= 1;
  while (compareConstants(value, shift(ZERO, period, k + 1)) >= 0) k += 1;
  return k;
}

/**
 * Forma canonica di un insieme periodico: la base riportata in [0; periodo) e in forma canonica.
 * Se la base è vuota o ricopre tutto, il risultato è l'insieme vuoto o tutto ℝ.
 */
function canonicalPeriodic(set: PeriodicSet): SolutionSet {
  const { period } = set;
  if (!(evaluate(period) > 0)) throw new EngineError("Il periodo deve essere un numero positivo.");
  const base = canonicalReal(set.base);
  if (isEmptyReal(base)) return EMPTY;
  const window: Interval = { lower: ZERO, upper: period, lowerClosed: true, upperClosed: false };
  const pieces: Interval[] = [];
  for (const piece of base.pieces) {
    if (typeof piece.lower === "string" || typeof piece.upper === "string") return ALL;
    const moved = shiftPiece(piece, period, -floorDivide(piece.lower, period));
    // Il pezzo comincia in [0; periodo): quello che sporge oltre il periodo rientra da sinistra, anche per più giri.
    const turns = floorDivide(moved.upper as Expr, period);
    if (turns >= 2) return ALL;
    for (let turn = 0; turn <= turns; turn++) {
      pieces.push(...intersectReal({ kind: "realset", pieces: [shiftPiece(moved, period, -turn)] }, { kind: "realset", pieces: [window] }).pieces);
    }
  }
  const reduced = canonicalReal({ kind: "realset", pieces });
  if (equalReal(reduced, { kind: "realset", pieces: [window] })) return ALL;
  return isEmptyReal(reduced) ? EMPTY : { kind: "periodic", base: reduced, period };
}

const MAX_COPIES = 60;

/** Riscrive un insieme periodico (già canonico) con un periodo multiplo: copies volte il periodo. */
function withMultiplePeriod(set: PeriodicSet, copies: number): PeriodicSet {
  const pieces: Interval[] = [];
  for (let j = 0; j < copies; j++) pieces.push(...set.base.pieces.map((piece) => shiftPiece(piece, set.period, j)));
  return { kind: "periodic", base: canonicalReal({ kind: "realset", pieces }), period: shift(ZERO, set.period, copies) };
}

/** Porta due insiemi periodici canonici allo stesso periodo (il minimo comune multiplo dei due). */
function alignPeriods(a: PeriodicSet, b: PeriodicSet): [PeriodicSet, PeriodicSet] {
  const ratio = exactValue({ kind: "div", num: a.period, den: b.period });
  if (!ratio || !ratio.isRational()) throw new EngineError("I due periodi non hanno un multiplo comune.");
  const { n, d } = ratio.toRational();
  if (n > BigInt(MAX_COPIES) || d > BigInt(MAX_COPIES)) throw new EngineError("Periodi troppo diversi tra loro.");
  // a.period / b.period = n/d, quindi d·a.period = n·b.period.
  return [withMultiplePeriod(a, Number(d)), withMultiplePeriod(b, Number(n))];
}

/** Le copie della base di un insieme periodico che toccano un insieme limitato: il risultato è un insieme finito di pezzi. */
function restrict(set: PeriodicSet, bounded: RealSet): RealSet {
  const pieces: Interval[] = [];
  for (const piece of bounded.pieces) {
    if (typeof piece.lower === "string" || typeof piece.upper === "string") {
      throw new EngineError("L'intersezione tra soluzioni periodiche e un intervallo illimitato non si può scrivere come insieme di soluzioni.");
    }
    const first = floorDivide(piece.lower, set.period) - 1;
    const last = floorDivide(piece.upper, set.period) + 1;
    if (last - first > 400) throw new EngineError("Troppe soluzioni nell'intervallo.");
    for (let k = first; k <= last; k++) {
      const copy: RealSet = { kind: "realset", pieces: set.base.pieces.map((part) => shiftPiece(part, set.period, k)) };
      pieces.push(...intersectReal(copy, { kind: "realset", pieces: [piece] }).pieces);
    }
  }
  return canonicalReal({ kind: "realset", pieces });
}

// ───────────────────────────── funzioni pubbliche ─────────────────────────────

/**
 * Forma canonica: pezzi ordinati, disgiunti e fusi quando si toccano; per gli insiemi periodici la
 * base è riportata in [0; periodo). Due insiemi uguali hanno la stessa forma canonica.
 */
export function canonicalSet(set: SolutionSet): SolutionSet {
  return set.kind === "realset" ? canonicalReal(set) : canonicalPeriodic(set);
}

export function isEmptySet(set: SolutionSet): boolean {
  const canonical = canonicalSet(set);
  return canonical.kind === "realset" && isEmptyReal(canonical);
}

export function isAllReals(set: SolutionSet): boolean {
  const canonical = canonicalSet(set);
  return canonical.kind === "realset" && isAllReal(canonical);
}

/**
 * Vero se l'insieme è già scritto in forma canonica: nessun pezzo vuoto, pezzi in ordine, separati,
 * senza pezzi che si toccano o si sovrappongono.
 */
export function isCanonicalSet(set: SolutionSet): boolean {
  const written = set.kind === "realset" ? set : set.base;
  return equalReal(canonicalReal(written), written);
}

/** Unione. Lancia EngineError se il risultato non si può scrivere (periodi senza multiplo comune, periodico più intervallo). */
export function setUnion(a: SolutionSet, b: SolutionSet): SolutionSet {
  const ca = canonicalSet(a);
  const cb = canonicalSet(b);
  if (ca.kind === "realset" && cb.kind === "realset") return canonicalReal({ kind: "realset", pieces: [...ca.pieces, ...cb.pieces] });
  if (ca.kind === "periodic" && cb.kind === "periodic") {
    const [pa, pb] = alignPeriods(ca, cb);
    return canonicalPeriodic({ kind: "periodic", base: { kind: "realset", pieces: [...pa.base.pieces, ...pb.base.pieces] }, period: pa.period });
  }
  const real = (ca.kind === "realset" ? ca : cb) as RealSet;
  const other = ca.kind === "realset" ? cb : ca;
  if (isEmptyReal(real)) return other;
  if (isAllReal(real)) return ALL;
  throw new EngineError("L'unione tra soluzioni periodiche e un intervallo non si può scrivere come insieme di soluzioni.");
}

/** Intersezione. Tra soluzioni periodiche e un insieme limitato dà le soluzioni che cadono nell'insieme. */
export function setIntersection(a: SolutionSet, b: SolutionSet): SolutionSet {
  const ca = canonicalSet(a);
  const cb = canonicalSet(b);
  if (ca.kind === "realset" && cb.kind === "realset") return intersectReal(ca, cb);
  if (ca.kind === "periodic" && cb.kind === "periodic") {
    const [pa, pb] = alignPeriods(ca, cb);
    return canonicalPeriodic({ kind: "periodic", base: intersectReal(pa.base, pb.base), period: pa.period });
  }
  const real = (ca.kind === "realset" ? ca : cb) as RealSet;
  const other = (ca.kind === "realset" ? cb : ca) as PeriodicSet;
  if (isEmptyReal(real)) return EMPTY;
  if (isAllReal(real)) return other;
  return restrict(other, real);
}

/** Complementare in ℝ. */
export function setComplement(set: SolutionSet): SolutionSet {
  const canonical = canonicalSet(set);
  if (canonical.kind === "realset") return complementReal(canonical);
  const window: RealSet = { kind: "realset", pieces: [{ lower: ZERO, upper: canonical.period, lowerClosed: true, upperClosed: false }] };
  return canonicalPeriodic({ kind: "periodic", base: intersectReal(complementReal(canonical.base), window), period: canonical.period });
}

/** Differenza: gli elementi di a che non stanno in b. */
export function setDifference(a: SolutionSet, b: SolutionSet): SolutionSet {
  return setIntersection(a, setComplement(b));
}

/** Vero se il numero appartiene all'insieme. */
export function setContains(set: SolutionSet, value: Expr): boolean {
  const canonical = canonicalSet(set);
  if (canonical.kind === "realset") return containsReal(canonical, value);
  return containsReal(canonical.base, shift(value, canonical.period, -floorDivide(value, canonical.period)));
}

/**
 * Confronto per struttura: stessi pezzi, stessi estremi (per valore), stessi estremi inclusi, e per le
 * soluzioni periodiche stesse soluzioni anche se scritte con periodi diversi
 * (π/2 + kπ è uguale a π/2 + 2kπ ∨ 3π/2 + 2kπ).
 */
export function setsEqual(a: SolutionSet, b: SolutionSet): boolean {
  const ca = canonicalSet(a);
  const cb = canonicalSet(b);
  if (ca.kind === "realset" && cb.kind === "realset") return equalReal(ca, cb);
  if (ca.kind !== "periodic" || cb.kind !== "periodic") return false;
  let aligned: [PeriodicSet, PeriodicSet];
  try {
    aligned = alignPeriods(ca, cb);
  } catch (error) {
    if (error instanceof EngineError) return false;
    throw error;
  }
  return equalReal(aligned[0].base, aligned[1].base);
}
