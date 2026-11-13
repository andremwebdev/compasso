import { describe, expect, it } from "vitest";
import { EngineError } from "../../src/motore/errors";
import { div, e, frac, mul, neg, num, pi, sqrt, sym, type Expr } from "../../src/motore/expr";
import { parseSolutionSet } from "../../src/motore/parser";
import { Rng } from "../../src/motore/random/rng";
import {
  allReals, atLeast, atMost, canonicalSet, closed, closedOpen, compareConstants, emptySet, greaterThan, interval, isAllReals,
  isCanonicalSet, isEmptySet, lessThan, open, openClosed, periodic, points, realSet, setComplement, setContains, setDifference,
  setHasDecimal, setIntersection, setsEqual, setToInequalityLatex, setToLatex, setUnion, type RealSet, type SolutionSet,
} from "../../src/motore/sets";
import { draws, drawsText, parse } from "./helpers";

const show = (set: SolutionSet) => setToLatex(set);
const read = (text: string): SolutionSet => {
  const result = parseSolutionSet(text);
  if (!result.ok) throw new Error(`${text}: ${result.error.message}`);
  return result.value;
};
const twoPi = mul(2, pi);

describe("insiemi di numeri reali", () => {
  it("costruttori e scrittura in LaTeX", () => {
    expect(show(closed(1, 3))).toBe("\\left[1; 3\\right]");
    expect(show(open(1, 3))).toBe("\\left(1; 3\\right)");
    expect(show(closedOpen(frac(3, 2), sqrt(5)))).toBe("\\left[\\frac{3}{2}; \\sqrt{5}\\right)");
    expect(show(openClosed(-1, 0))).toBe("\\left(-1; 0\\right]");
    expect(show(lessThan(2))).toBe("\\left(-\\infty; 2\\right)");
    expect(show(atMost(2))).toBe("\\left(-\\infty; 2\\right]");
    expect(show(greaterThan(2))).toBe("\\left(2; +\\infty\\right)");
    expect(show(atLeast(2))).toBe("\\left[2; +\\infty\\right)");
    expect(show(points(1, 2, 5))).toBe("\\left\\{1; 2; 5\\right\\}");
    expect(show(emptySet)).toBe("\\emptyset");
    expect(show(allReals)).toBe("\\mathbb{R}");
    expect(show(realSet(atMost(2), points(5), closedOpen(7, 9)))).toBe("\\left(-\\infty; 2\\right] \\cup \\left\\{5\\right\\} \\cup \\left[7; 9\\right)");
    // Gli infiniti sono sempre aperti, anche se chiesti chiusi.
    expect(interval("-inf", 2, true, true)).toMatchObject({ lowerClosed: false, upperClosed: true });
    expect(() => closed(sym("a"), 3)).toThrow(EngineError);
    expect(() => periodic(points(0), sym("T"))).toThrow(EngineError);
  });

  it("forma canonica: pezzi in ordine, fusi quando si toccano, senza pezzi vuoti", () => {
    expect(show(realSet(closed(3, 4), closed(1, 2)))).toBe("\\left[1; 2\\right] \\cup \\left[3; 4\\right]");
    expect(show(realSet(closed(1, 2), closed(2, 3)))).toBe("\\left[1; 3\\right]");
    expect(show(realSet(open(1, 2), open(2, 3)))).toBe("\\left(1; 2\\right) \\cup \\left(2; 3\\right)");
    expect(show(realSet(open(1, 2), points(2), open(2, 3)))).toBe("\\left(1; 3\\right)");
    expect(show(realSet(closedOpen(1, 2), closed(2, 3)))).toBe("\\left[1; 3\\right]");
    expect(show(realSet(closed(1, 5), open(2, 3)))).toBe("\\left[1; 5\\right]");
    expect(show(realSet(open(1, 3), closed(1, 2)))).toBe("\\left[1; 3\\right)");
    expect(show(realSet(closed(3, 1), open(2, 2), points(4)))).toBe("\\left\\{4\\right\\}");
    expect(show(realSet(lessThan(1), greaterThan(0)))).toBe("\\mathbb{R}");
    expect(show(realSet(lessThan(1), atLeast(1)))).toBe("\\mathbb{R}");
    expect(isEmptySet(open(2, 2)) && isEmptySet(emptySet) && !isEmptySet(points(2))).toBe(true);
    expect(isAllReals(realSet(atMost(0), atLeast(0))) && !isAllReals(realSet(lessThan(0), greaterThan(0)))).toBe(true);
    expect(isCanonicalSet(realSet(closed(1, 2), closed(3, 4)))).toBe(true);
    expect(isCanonicalSet(realSet(closed(3, 4), closed(1, 2)))).toBe(false);
    expect(isCanonicalSet(realSet(closed(1, 2), closed(2, 3)))).toBe(false);
    expect(isCanonicalSet(realSet(closed(1, 2), open(5, 5)))).toBe(false);
  });

  it("gli estremi si ordinano per valore esatto: radicali, π, e", () => {
    expect(compareConstants(sqrt(2), frac(3, 2))).toBeLessThan(0);
    expect(compareConstants(sqrt(8), mul(2, sqrt(2)))).toBe(0);
    expect(compareConstants(pi, e)).toBeGreaterThan(0);
    expect(compareConstants(div(pi, 2), div(mul(2, pi), 4))).toBe(0);
    expect(compareConstants(parse("ln 2"), parse("1/2"))).toBeGreaterThan(0);
    expect(() => compareConstants(sqrt(-1), num(0))).toThrow(EngineError);
    expect(show(realSet(closed(e, pi), closed(sqrt(2), 3)))).toBe("\\left[\\sqrt{2}; \\pi\\right]");
  });

  it("unione, intersezione, complementare, differenza, appartenenza", () => {
    const a = closed(1, 5);
    const b = realSet(open(3, 7), points(0));
    expect(show(setUnion(a, b))).toBe("\\left\\{0\\right\\} \\cup \\left[1; 7\\right)");
    expect(show(setIntersection(a, b))).toBe("\\left(3; 5\\right]");
    expect(show(setComplement(a))).toBe("\\left(-\\infty; 1\\right) \\cup \\left(5; +\\infty\\right)");
    expect(show(setComplement(points(2)))).toBe("\\left(-\\infty; 2\\right) \\cup \\left(2; +\\infty\\right)");
    expect(show(setComplement(emptySet))).toBe("\\mathbb{R}");
    expect(show(setComplement(allReals))).toBe("\\emptyset");
    expect(show(setDifference(a, b))).toBe("\\left[1; 3\\right]");
    expect(show(setDifference(allReals, points(-1, 1)))).toBe("\\left(-\\infty; -1\\right) \\cup \\left(-1; 1\\right) \\cup \\left(1; +\\infty\\right)");
    expect(show(setIntersection(closed(1, 2), closed(2, 3)))).toBe("\\left\\{2\\right\\}");
    expect(show(setIntersection(closedOpen(1, 2), closed(2, 3)))).toBe("\\emptyset");
    expect(setContains(a, num(1)) && setContains(a, sqrt(2)) && !setContains(a, num(6))).toBe(true);
    expect(setContains(open(1, 5), num(1))).toBe(false);
    expect(setContains(lessThan(pi), num(3)) && !setContains(lessThan(pi), frac(22, 7))).toBe(true);
  });

  it("confronto per struttura: stessi estremi per valore, stessi estremi inclusi", () => {
    expect(setsEqual(closed(1, 3), closed(1, 3))).toBe(true);
    expect(setsEqual(closed(1, 3), closedOpen(1, 3))).toBe(false);
    expect(setsEqual(closed(1, 3), closed(1, 4))).toBe(false);
    expect(setsEqual(closed(sqrt(8), 3), closed(mul(2, sqrt(2)), div(6, 2)))).toBe(true);
    expect(setsEqual(realSet(closed(3, 4), closed(1, 2)), realSet(closed(1, 2), closed(3, 4)))).toBe(true);
    expect(setsEqual(realSet(closed(1, 2), closed(2, 3)), closed(1, 3))).toBe(true);
    expect(setsEqual(realSet(lessThan(2), greaterThan(2)), setComplement(points(2)))).toBe(true);
    expect(setsEqual(emptySet, open(1, 1))).toBe(true);
    expect(setsEqual(allReals, emptySet)).toBe(false);
    expect(setsEqual(points(1, 2), points(2, 1))).toBe(true);
    expect(setsEqual(points(1, 2), closed(1, 2))).toBe(false);
  });

  it("scrittura con le disuguaglianze", () => {
    const text = (set: SolutionSet) => setToInequalityLatex(set);
    expect(text(realSet(lessThan(2), atLeast(5)))).toBe("x < 2 \\lor x \\ge 5");
    expect(text(openClosed(1, 3))).toBe("1 < x \\le 3");
    expect(text(points(2))).toBe("x = 2");
    expect(text(allReals)).toBe("\\forall x \\in \\mathbb{R}");
    expect(text(emptySet)).toBe("\\nexists\\, x \\in \\mathbb{R}");
    expect(setToInequalityLatex(atMost(0), { variable: "t" })).toBe("t \\le 0");
    for (const set of [realSet(lessThan(2), atLeast(5)), points(1, 2), emptySet, allReals, closedOpen(frac(1, 2), sqrt(3))]) {
      draws(show(set));
      draws(text(set));
    }
  });

  it("a tappeto: le operazioni rispettano l'appartenenza punto per punto", () => {
    const rng = new Rng("insiemi-tappeto");
    const randomSet = (): RealSet => {
      const pieces = Array.from({ length: rng.int(0, 3) }, () => {
        const kind = rng.int(0, 5);
        const a = rng.int(-4, 4);
        const b = a + rng.int(0, 4);
        if (kind === 0) return interval("-inf", a, false, rng.bool());
        if (kind === 1) return interval(a, "+inf", rng.bool(), false);
        if (kind === 2) return interval(a, a, true, true);
        return interval(a, b, rng.bool(), rng.bool());
      });
      return realSet(...pieces);
    };
    // Punti di prova: interi e mezzi interi, così cadono sugli estremi e in mezzo agli intervalli.
    const samples: Expr[] = Array.from({ length: 41 }, (_, index) => frac(index - 20, 2));
    for (let round = 0; round < 300; round++) {
      const a = randomSet();
      const b = randomSet();
      const union = setUnion(a, b);
      const intersection = setIntersection(a, b);
      const complement = setComplement(a);
      const difference = setDifference(a, b);
      for (const point of samples) {
        const inA = setContains(a, point);
        const inB = setContains(b, point);
        expect(setContains(union, point)).toBe(inA || inB);
        expect(setContains(intersection, point)).toBe(inA && inB);
        expect(setContains(complement, point)).toBe(!inA);
        expect(setContains(difference, point)).toBe(inA && !inB);
      }
      for (const set of [union, intersection, complement, difference]) {
        expect(isCanonicalSet(set)).toBe(true);
        draws(show(set));
      }
      expect(setsEqual(setComplement(complement), a)).toBe(true);
      expect(setsEqual(setUnion(a, b), setUnion(b, a))).toBe(true);
      expect(setsEqual(setComplement(union), setIntersection(complement, setComplement(b)))).toBe(true);
      expect(setsEqual(canonicalSet(a), a)).toBe(true);
    }
  });
});

describe("soluzioni periodiche", () => {
  const sixth = div(pi, 6);
  const fiveSixths = div(mul(5, pi), 6);

  it("scrittura: x = a + k·periodo, con k intero", () => {
    expect(show(periodic(points(sixth), twoPi))).toBe("x = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}");
    expect(show(periodic(points(sixth, fiveSixths), twoPi))).toBe(
      "x = \\frac{\\pi}{6} + 2k\\pi \\lor x = \\frac{5\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}",
    );
    expect(show(periodic(open(sixth, fiveSixths), twoPi))).toBe("\\frac{\\pi}{6} + 2k\\pi < x < \\frac{5\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}");
    expect(show(periodic(points(0), pi))).toBe("x = k\\pi,\\ k \\in \\mathbb{Z}");
    expect(show(periodic(points(0), div(pi, 2)))).toBe("x = \\frac{k\\pi}{2},\\ k \\in \\mathbb{Z}");
    expect(show(periodic(points(div(pi, 4)), div(mul(2, pi), 3)))).toBe("x = \\frac{\\pi}{4} + \\frac{2k\\pi}{3},\\ k \\in \\mathbb{Z}");
    expect(show(periodic(closedOpen(0, 1), 3))).toBe("3k \\le x < 1 + 3k,\\ k \\in \\mathbb{Z}");
    expect(setToLatex(periodic(points(sixth), twoPi), { variable: "t" })).toBe("t = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}");
    // La base resta dove è stata scritta: −π/3 non diventa 5π/3.
    expect(show(periodic(points(neg(div(pi, 3))), twoPi))).toBe("x = -\\frac{\\pi}{3} + 2k\\pi,\\ k \\in \\mathbb{Z}");
    expect(show(periodic(emptySet, twoPi))).toBe("\\emptyset");
    for (const set of [periodic(points(sixth, fiveSixths), twoPi), periodic(open(sixth, fiveSixths), twoPi), periodic(points(1), sqrt(2))]) draws(show(set));
  });

  it("confronto: stesse soluzioni anche con base o periodo scritti in un altro modo", () => {
    const half = div(pi, 2);
    expect(setsEqual(periodic(points(half), pi), periodic(points(half, div(mul(3, pi), 2)), twoPi))).toBe(true);
    expect(setsEqual(periodic(points(div(pi, -3)), twoPi), periodic(points(div(mul(5, pi), 3)), twoPi))).toBe(true);
    expect(setsEqual(periodic(points(sixth), twoPi), periodic(points(div(mul(13, pi), 6)), twoPi))).toBe(true);
    expect(setsEqual(periodic(points(sixth), twoPi), periodic(points(fiveSixths), twoPi))).toBe(false);
    expect(setsEqual(periodic(points(sixth), twoPi), periodic(points(sixth), pi))).toBe(false);
    expect(setsEqual(periodic(points(0), pi), periodic(points(0, pi), twoPi))).toBe(true);
    expect(setsEqual(periodic(open(sixth, fiveSixths), twoPi), periodic(closed(sixth, fiveSixths), twoPi))).toBe(false);
    // Un intervallo a cavallo dello zero: (−π/6; π/6) + 2kπ è lo stesso di (11π/6; 13π/6) + 2kπ.
    expect(setsEqual(periodic(open(div(pi, -6), sixth), twoPi), periodic(open(div(mul(11, pi), 6), div(mul(13, pi), 6)), twoPi))).toBe(true);
    expect(setsEqual(periodic(points(sixth), twoPi), points(sixth))).toBe(false);
    // Periodi senza multiplo comune: insiemi diversi, nessun errore.
    expect(setsEqual(periodic(points(0), pi), periodic(points(0), 1))).toBe(false);
    expect(() => canonicalSet(periodic(points(0), num(-1)))).toThrow(EngineError);
  });

  it("una base che ricopre un periodo intero dà tutto ℝ; una base vuota dà ∅", () => {
    expect(isAllReals(periodic(closedOpen(0, twoPi), twoPi))).toBe(true);
    expect(isAllReals(periodic(closed(0, mul(3, pi)), twoPi))).toBe(true);
    expect(isAllReals(periodic(greaterThan(0), twoPi))).toBe(true);
    expect(isAllReals(periodic(open(0, twoPi), twoPi))).toBe(false);
    expect(setsEqual(periodic(open(0, twoPi), twoPi), setComplement(periodic(points(0), twoPi)))).toBe(true);
    expect(isEmptySet(periodic(emptySet, pi))).toBe(true);
    expect(setsEqual(periodic(emptySet, pi), emptySet)).toBe(true);
  });

  it("unione, intersezione, complementare, appartenenza", () => {
    const sine = periodic(points(0), pi);
    const cosine = periodic(points(div(pi, 2)), pi);
    expect(setsEqual(setUnion(sine, cosine), periodic(points(0), div(pi, 2)))).toBe(true);
    expect(isEmptySet(setIntersection(sine, cosine))).toBe(true);
    expect(setsEqual(setIntersection(periodic(points(0), pi), periodic(points(0), div(mul(2, pi), 3))), periodic(points(0), twoPi))).toBe(true);
    expect(setsEqual(setComplement(periodic(closed(sixth, fiveSixths), twoPi)), periodic(open(fiveSixths, div(mul(13, pi), 6)), twoPi))).toBe(true);
    expect(setContains(periodic(points(sixth), twoPi), div(mul(-11, pi), 6))).toBe(true);
    expect(setContains(periodic(points(sixth), twoPi), fiveSixths)).toBe(false);
    expect(setContains(periodic(open(sixth, fiveSixths), twoPi), div(mul(5, pi), 2))).toBe(true);
    expect(setsEqual(setUnion(sine, emptySet), sine)).toBe(true);
    expect(isAllReals(setUnion(sine, allReals))).toBe(true);
    expect(() => setUnion(sine, closed(0, 1))).toThrow(EngineError);
    expect(() => setUnion(periodic(points(0), pi), periodic(points(0), 1))).toThrow(EngineError);
  });

  it("le soluzioni periodiche che cadono in un intervallo", () => {
    const solutions = periodic(points(sixth, fiveSixths), twoPi);
    expect(show(setIntersection(solutions, closed(0, twoPi)))).toBe("\\left\\{\\frac{\\pi}{6}; \\frac{5\\pi}{6}\\right\\}");
    expect(show(setIntersection(closedOpen(0, mul(4, pi)), periodic(points(0), pi)))).toBe("\\left\\{0; \\pi; 2\\pi; 3\\pi\\right\\}");
    expect(show(setIntersection(periodic(open(sixth, fiveSixths), twoPi), closed(div(pi, -2), div(pi, 2))))).toBe("\\left(\\frac{\\pi}{6}; \\frac{\\pi}{2}\\right]");
    expect(isEmptySet(setIntersection(solutions, emptySet))).toBe(true);
    expect(setsEqual(setIntersection(solutions, allReals), solutions)).toBe(true);
    expect(() => setIntersection(solutions, greaterThan(0))).toThrow(EngineError);
  });
});

describe("lettura degli insiemi scritti da Andrea", () => {
  it.each([
    ["[1; 3)", "\\left[1; 3\\right)"],
    ["(−∞; 2] ∪ {5}", "\\left(-\\infty; 2\\right] \\cup \\left\\{5\\right\\}"],
    ["]1;3[", "\\left(1; 3\\right)"],
    ["]-inf; 2]", "\\left(-\\infty; 2\\right]"],
    ["[1;2]U[3;4]", "\\left[1; 2\\right] \\cup \\left[3; 4\\right]"],
    ["{1; 2; 3}", "\\left\\{1; 2; 3\\right\\}"],
    ["(1,5; 3]", "\\left(1{,}5; 3\\right]"],
    ["(1, 5)", "\\left(1; 5\\right)"],
    ["[sqrt(2); pi]", "\\left[\\sqrt{2}; \\pi\\right]"],
    ["(root(3; 5); 4)", "\\left(\\sqrt[3]{5}; 4\\right)"],
    ["∅", "\\emptyset"],
    ["nessuna soluzione", "\\emptyset"],
    ["R", "\\mathbb{R}"],
    ["ℝ", "\\mathbb{R}"],
    ["(-∞; +∞)", "\\mathbb{R}"],
    ["x ∈ [0; 1]", "\\left[0; 1\\right]"],
    ["S = (0; +∞)", "\\left(0; +\\infty\\right)"],
    ["3", "\\left\\{3\\right\\}"],
  ])("intervalli e insiemi: «%s»", (text, latex) => {
    expect(setToLatex(read(text), { asWritten: true })).toBe(latex);
  });

  it.each([
    ["x < 2 ∨ x ≥ 5", "\\left(-\\infty; 2\\right) \\cup \\left[5; +\\infty\\right)"],
    ["x<=-1/2", "\\left(-\\infty; -\\frac{1}{2}\\right]"],
    ["2 > x", "\\left(-\\infty; 2\\right)"],
    ["1 < x <= 3", "\\left(1; 3\\right]"],
    ["3 ≥ x > 1", "\\left(1; 3\\right]"],
    ["-2 <= x < 0 o x > 1", "\\left[-2; 0\\right) \\cup \\left(1; +\\infty\\right)"],
    ["x = 1 oppure x = -1", "\\left\\{1; -1\\right\\}"],
    ["x ≠ 2", "\\left(-\\infty; 2\\right) \\cup \\left(2; +\\infty\\right)"],
    ["x != 2", "\\left(-\\infty; 2\\right) \\cup \\left(2; +\\infty\\right)"],
    ["x > 1 e x < 3", "\\left(1; 3\\right)"],
    ["x > 1 ∧ x ≤ 3", "\\left(1; 3\\right]"],
    ["x = ±2", "\\left\\{2; -2\\right\\}"],
    ["x>=sqrt(2)", "\\left[\\sqrt{2}; +\\infty\\right)"],
    ["3 < x < 1", "\\emptyset"],
  ])("disuguaglianze: «%s»", (text, latex) => {
    // «3 < x < 1» non ha soluzioni: lo dice la forma canonica; gli altri si mostrano come sono scritti.
    expect(setToLatex(read(text), { asWritten: text !== "3 < x < 1" })).toBe(latex);
  });

  it.each([
    ["x = π/6 + 2kπ", "x = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["x = pi/6 + 2k pi, k ∈ ℤ", "x = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["x = π/6 + 2kπ con k intero", "x = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["x = ±π/3 + 2kπ", "x = \\frac{\\pi}{3} + 2k\\pi \\lor x = -\\frac{\\pi}{3} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["x = kπ/2", "x = \\frac{k\\pi}{2},\\ k \\in \\mathbb{Z}"],
    ["x = π/6 + 2kπ ∨ x = 5π/6 + 2kπ", "x = \\frac{\\pi}{6} + 2k\\pi \\lor x = \\frac{5\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["π/6 + 2kπ < x < 5π/6 + 2kπ", "\\frac{\\pi}{6} + 2k\\pi < x < \\frac{5\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["π/6 + 2kπ", "x = \\frac{\\pi}{6} + 2k\\pi,\\ k \\in \\mathbb{Z}"],
    ["x = π/2 - kπ", "x = \\frac{\\pi}{2} + k\\pi,\\ k \\in \\mathbb{Z}"],
  ])("soluzioni periodiche: «%s»", (text, latex) => {
    expect(setToLatex(read(text))).toBe(latex);
  });

  it("le scritture diverse delle stesse soluzioni sono uguali per struttura", () => {
    expect(setsEqual(read("x = π/2 + kπ"), read("x = π/2 + 2kπ ∨ x = 3π/2 + 2kπ"))).toBe(true);
    expect(setsEqual(read("x = ±π/3 + 2kπ"), read("x = π/3 + 2kπ o x = 5π/3 + 2kπ"))).toBe(true);
    expect(setsEqual(read("x = π/2 + kπ o x = kπ"), read("x = kπ/2"))).toBe(true);
    expect(setsEqual(read("x ≤ 2 ∨ x > 5"), read("(−∞; 2] ∪ (5; +∞)"))).toBe(true);
    expect(setsEqual(read("[1; 2] ∪ [2; 3]"), read("1 ≤ x ≤ 3"))).toBe(true);
    expect(setsEqual(read("x ≤ 2"), read("x < 2"))).toBe(false);
    expect(isCanonicalSet(read("[1; 2] ∪ [2; 3]"))).toBe(false);
    expect(isCanonicalSet(read("[3; 4] ∪ [1; 2]"))).toBe(false);
    expect(isCanonicalSet(read("[1; 2] ∪ [3; 4]"))).toBe(true);
    expect(setHasDecimal(read("(1,5; 3]")) && !setHasDecimal(read("(3/2; 3]"))).toBe(true);
    expect(parseSolutionSet("t > 0", { variable: "t" }).ok).toBe(true);
  });

  it.each([
    ["", "Scrivi l'insieme"],
    ["[1;", "non è completo"],
    ["[3; 1]", "più piccolo va a sinistra"],
    ["(2; 2)", "più piccolo va a sinistra"],
    ["[1; 2; 3]", "due estremi"],
    ["x < y", "devono essere numeri"],
    ["x^2 < 4", "da sola"],
    ["1 < x > 3", "stesso verso"],
    ["[1; 2] ∪", "Manca un pezzo"],
    ["{1; 2", "graffa"],
    ["[sqrt(-1); 2]", "non è un numero reale"],
    ["x = π/6 + k^2", "periodiche"],
    ["π/6 + 2kπ < x < 5π/6 + kπ", "stesso periodo"],
    ["x = π/6 + 2kπ ∨ x = 1", "non si può scrivere"],
    ["[1; #]", ""],
    ["x <", "Manca un estremo"],
  ])("testo non valido: «%s»", (text, fragment) => {
    const result = parseSolutionSet(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(fragment);
      expect(result.error.position).toBeGreaterThanOrEqual(0);
      expect(result.error.position).toBeLessThanOrEqual(text.length);
    }
  });

  it("un estremo ancora da finire non è un errore: l'insieme risulta incompleto", () => {
    const result = parseSolutionSet("[1; 2+]");
    expect(result.ok && !result.complete).toBe(true);
    expect(parseSolutionSet("x > 3/").ok).toBe(true);
    const full = parseSolutionSet("[1; 2]");
    expect(full.ok && full.complete).toBe(true);
  });

  it("a tappeto: non lancia mai, qualunque cosa si scriva", () => {
    const rng = new Rng("insiemi-lettura");
    const alphabet = ["[", "]", "(", ")", "{", "}", ";", ",", " ", "x", "k", "1", "2", "5", "π", "∞", "-", "+", "<", ">", "=", "≤", "∪", "∨", "∧", "±", "/", "o", "e", "U", "∅", "ℝ", "sqrt", "^", "."];
    let valid = 0;
    for (let round = 0; round < 3000; round++) {
      const text = Array.from({ length: rng.int(0, 12) }, () => rng.pick(alphabet)).join("");
      const result = parseSolutionSet(text);
      if (result.ok) {
        valid += 1;
        draws(setToLatex(result.value, { asWritten: true }));
        // Un insieme incompleto (con il segnaposto □) si può solo mostrare; uno completo ha sempre la forma canonica.
        if (result.complete) expect(() => canonicalSet(result.value)).not.toThrow();
      } else {
        expect(result.error.message.length).toBeGreaterThan(0);
      }
    }
    expect(valid).toBeGreaterThan(100);
  });
});

describe("revisione 4a: lettura degli insiemi, casi che sbagliavano", () => {
  const latex = (text: string, variable = "x"): string => {
    const result = parseSolutionSet(text, { variable });
    if (!result.ok) throw new Error(`${text}: ${result.error.message}`);
    return setToLatex(result.value, { asWritten: true, variable });
  };
  const message = (text: string): string => {
    const result = parseSolutionSet(text);
    return result.ok ? "(letto)" : result.error.message;
  };

  it.each([
    // Prima davano «Manca un estremo»: il numero e seguito da uno spazio era letto come la congiunzione «e».
    ["x ≤ e ∨ x ≥ e^2", "\\left(-\\infty; e\\right] \\cup \\left[e^{2}; +\\infty\\right)"],
    ["0 < x ≤ e ∨ x > 10", "\\left(0; e\\right] \\cup \\left(10; +\\infty\\right)"],
    ["x < e o x > 3", "\\left(-\\infty; e\\right) \\cup \\left(3; +\\infty\\right)"],
    ["x > e e x < 5", "\\left(e; 5\\right)"],
    ["x > 1 e x < e", "\\left(1; e\\right)"],
    ["x < 5 e e < x", "\\left(e; 5\\right)"],
    ["x > 1 e x < 3", "\\left(1; 3\\right)"],
    ["x ≥ 2 e x ≠ 3", "\\left[2; 3\\right) \\cup \\left(3; +\\infty\\right)"],
    ["(e; +∞) ∪ {1}", "\\left(e; +\\infty\\right) \\cup \\left\\{1\\right\\}"],
    ["x = 2 e + 1", "\\left\\{2e + 1\\right\\}"],
  ])("il numero e non è la congiunzione «e»: «%s»", (text, expected) => {
    // Le intersezioni escono in forma canonica, le unioni come sono scritte.
    expect(latex(text)).toBe(expected);
  });

  it("più soluzioni di un'equazione si possono separare con il punto e virgola o con la virgola e uno spazio", () => {
    expect(latex("x = 3; x = 5")).toBe("\\left\\{3; 5\\right\\}");
    expect(latex("x=1, x=2")).toBe("\\left\\{1; 2\\right\\}");
    expect(latex("3; 5")).toBe("\\left\\{3; 5\\right\\}");
    expect(latex("x = 1,5; x = 2")).toBe("\\left\\{1{,}5; 2\\right\\}");
    expect(setsEqual(read("x = π/6 + 2kπ; x = 5π/6 + 2kπ"), read("x = π/6 + 2kπ ∨ x = 5π/6 + 2kπ"))).toBe(true);
    // Con le disuguaglianze il punto e virgola resta ambiguo (unione o sistema?): non si indovina.
    expect(parseSolutionSet("x > 1; x < 3").ok).toBe(false);
    expect(message("x > 1; x < 3")).toContain("\\lor");
    drawsText(message("x > 1; x < 3"));
    // Dentro un intervallo il punto e virgola separa gli estremi, come sempre.
    expect(latex("(1; 3) ∪ {5; 6}")).toBe("\\left(1; 3\\right) \\cup \\left\\{5; 6\\right\\}");
    expect(latex("]1; 3[")).toBe("\\left(1; 3\\right)");
  });

  it("l'incognita si può scrivere con l'indice: x_1 = 2 ∨ x_2 = 3", () => {
    expect(latex("x_1 = 2 ∨ x_2 = 3")).toBe("\\left\\{2; 3\\right\\}");
    expect(latex("x1 = 2; x2 = 3")).toBe("\\left\\{2; 3\\right\\}");
    expect(latex("x₁ = -1 o x₂ = 1/2")).toBe("\\left\\{-1; \\frac{1}{2}\\right\\}");
    expect(latex("t_1 = 0; t_2 = 4", "t")).toBe("\\left\\{0; 4\\right\\}");
    // Un'altra lettera resta un errore.
    expect(parseSolutionSet("y_1 = 2").ok).toBe(false);
  });

  it("una parentesi quadra dalla parte dell'infinito è un errore, spiegato", () => {
    for (const text of ["[-∞; 2]", "(2; +∞]", "[-inf; +inf]", "x ∈ [−∞; 3)"]) {
      expect(parseSolutionSet(text).ok, text).toBe(false);
      expect(message(text), text).toContain("infinito");
    }
    // Le parentesi aperte, anche all'italiana, restano valide.
    expect(latex("(-∞; 2]")).toBe("\\left(-\\infty; 2\\right]");
    expect(latex("]-∞; 2]")).toBe("\\left(-\\infty; 2\\right]");
    expect(latex("[2; +∞[")).toBe("\\left[2; +\\infty\\right)");
  });

  it("{1,2} è ambiguo (due soluzioni o un decimale?): si chiede di scriverlo in modo chiaro", () => {
    expect(parseSolutionSet("{1,2}").ok).toBe(false);
    expect(message("{1,2}")).toContain("ambigu");
    drawsText(message("{1,2}"));
    // Le scritture chiare restano valide.
    expect(latex("{1; 2}")).toBe("\\left\\{1; 2\\right\\}");
    expect(latex("{1, 2}")).toBe("\\left\\{1; 2\\right\\}");
    expect(latex("{1,5; 2}")).toBe("\\left\\{1{,}5; 2\\right\\}");
    expect(latex("x = 1,2")).toBe("\\left\\{1{,}2\\right\\}");
  });

  it("«per ogni» e «non esiste» valgono con qualunque lettera dell'incognita", () => {
    expect(latex("∀t∈ℝ", "t")).toBe("\\mathbb{R}");
    expect(latex("∀ t ∈ R", "t")).toBe("\\mathbb{R}");
    expect(latex("∄t∈ℝ", "t")).toBe("\\emptyset");
    expect(latex("∀x∈ℝ")).toBe("\\mathbb{R}");
    expect(parseSolutionSet("∀y∈ℝ", { variable: "t" }).ok).toBe(false);
  });

  it("non lancia mai, nemmeno con testi enormi o parentesi annidate a migliaia", () => {
    for (const text of ["(".repeat(30000), "[" + "(".repeat(9000) + "1; 2]", "x = " + "√".repeat(9000) + "2", "{" + "1; ".repeat(5000) + "1}", "x < " + "2^".repeat(9000) + "2"]) {
      expect(() => parseSolutionSet(text), text.slice(0, 12)).not.toThrow();
    }
  });
});
