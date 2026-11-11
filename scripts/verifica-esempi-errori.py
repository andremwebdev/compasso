#!/usr/bin/env python3
"""Verifica la matematica degli esempi del catalogo errori (src/errori/catalog.ts).

Per ogni voce c'è un controllo che ricalcola con sympy (o con la sola aritmetica esatta)
tutto quello che l'esempio e la spiegazione affermano: sia il risultato giusto sia quello
sbagliato. Lo script fallisce anche se una voce del catalogo non ha il suo controllo.

Uso (non fa parte di `npm test`: richiede Python e sympy):
    pip install sympy
    python3 scripts/verifica-esempi-errori.py

Quando aggiungi o modifichi una voce del catalogo, aggiungi o aggiorna qui il controllo.
"""

import itertools
import re
import statistics
import sys
from math import comb, perm
from pathlib import Path

from sympy import (
    E, I, Abs, Integer, Interval, Matrix, Point, Rational, S, Sum, Union, atan, arg, cos,
    diff, div, eye, expand, expand_log, expand_trig, factor, factorint, ff, igcd, ilcm,
    integrate, limit, log, oo, pi, primerange, series, simplify, sin, solve, solveset,
    sqrt, symbols, tan, exp, Eq, zoo,
)
from sympy.geometry import Line
from sympy.solvers.inequalities import solve_univariate_inequality

x, y, t = symbols("x y t", real=True)
a, b, c, d = symbols("a b c d", positive=True)
r, h = symbols("r h", positive=True)
n = symbols("n", positive=True, integer=True)

CHECKS = {}


def check(code):
    """Registra la funzione come controllo della voce `code`."""

    def register(fn):
        assert code not in CHECKS, f"controllo doppio per {code}"
        CHECKS[code] = fn
        return fn

    return register


def eq(left, right):
    return simplify(left - right) == 0


def ne(left, right):
    return simplify(left - right) != 0


def ineq(expr):
    """Insieme delle soluzioni reali di una disequazione in x."""
    return solve_univariate_inequality(expr, x, relational=False)


def ruffini(coefficients, root):
    """Regola di Ruffini: (coefficienti del quoziente, resto) dividendo per x - root."""
    row = [coefficients[0]]
    for coefficient in coefficients[1:]:
        row.append(coefficient + root * row[-1])
    return row[:-1], row[-1]


# ───────────────────────────── CALC ─────────────────────────────


@check("CALC.MENO_PARENTESI")
def _():
    assert eq(5 * x - (2 * x - 3), 3 * x + 3)
    assert ne(5 * x - (2 * x - 3), 3 * x - 3)
    assert eq(-(a - b), -a + b) and ne(-(a - b), -a - b)


@check("CALC.PRECEDENZA")
def _():
    assert 4**2 == 16 and 3 * 16 == 48 and 2 + 48 == 50 and 2 + 3 * 4**2 == 50
    assert (2 + 3) * 4**2 == 80 != 50


@check("CALC.MENO_POTENZA")
def _():
    assert -(3**2) == -9 and (-3) ** 2 == 9
    assert eq(-(a**2), -a * a) and ne(-(a**2), (-a) ** 2)


@check("CALC.ESPONENTE_NEGATIVO")
def _():
    assert Integer(2) ** -3 == Rational(1, 8) != -8
    assert eq(a**-n, 1 / a**n)


@check("CALC.SOMMA_FRAZIONI")
def _():
    assert Rational(1, 2) + Rational(1, 3) == Rational(5, 6)
    wrong = Rational(1 + 1, 2 + 3)
    assert wrong == Rational(2, 5) and wrong < Rational(1, 2) and wrong != Rational(5, 6)
    assert eq(a / b + c / d, (a * d + b * c) / (b * d))


@check("CALC.PROPRIETA_POTENZE")
def _():
    assert (2**3) ** 2 == 2 ** (3 * 2) == 64
    assert 2 ** (3 + 2) == 32 != 64 and 2**3 * 2**2 == 2**5 == 32
    for m, k in itertools.product(range(1, 5), repeat=2):
        assert 3**m * 3**k == 3 ** (m + k) and (3**m) ** k == 3 ** (m * k)


@check("CALC.PERCENTUALI_SUCCESSIVE")
def _():
    factor_up, factor_down = Rational(12, 10), Rational(8, 10)
    assert factor_up * factor_down == Rational("0.96") == Rational(24, 25)
    assert 100 * factor_up * factor_down == 96 != 100
    assert 1 - factor_up * factor_down == Rational(4, 100)


@check("CALC.PERIODICO")
def _():
    value = Rational(16 - 1, 90)
    assert value == Rational(1, 6)
    # 0,1(6): una cifra prima del periodo, periodo "6" → 0,1 + 0,0666… = 1/10 + (6/9)/10
    assert Rational(1, 10) + Rational(6, 9) / 10 == value
    assert (value * 10**6).floor() == 166666  # le cifre sono davvero 0,166666…
    assert Rational(16, 90) == Rational(8, 45) != value
    assert Rational(16 - 1, 99) == Rational(5, 33) != value


@check("CALC.RAZIONALIZZAZIONE")
def _():
    assert eq(1 / (sqrt(3) + 1), (sqrt(3) - 1) / 2)
    assert expand((sqrt(3) - 1) * (sqrt(3) + 1)) == 2  # 3 - 1
    assert eq(expand((sqrt(3) + 1) ** 2), 4 + 2 * sqrt(3))
    assert eq(1 / (sqrt(3) + 1), (sqrt(3) + 1) / (4 + 2 * sqrt(3)))
    assert eq(1 / (sqrt(a) + sqrt(b)), (sqrt(a) - sqrt(b)) / (a - b))


# ───────────────────────────── ALG ─────────────────────────────


@check("ALG.QUADRATO_BINOMIO")
def _():
    assert expand((x + 3) ** 2) == x**2 + 6 * x + 9
    assert (1 + 3) ** 2 == 16 and 1**2 + 9 == 10
    assert expand((a + b) ** 2) == a**2 + 2 * a * b + b**2
    assert expand((a - b) ** 2) == a**2 - 2 * a * b + b**2


@check("ALG.RADICE_SOMMA")
def _():
    assert sqrt(9 + 16) == 5 and sqrt(9) + sqrt(16) == 7
    assert eq(sqrt(a * b), sqrt(a) * sqrt(b))
    assert ne(sqrt(a + b), sqrt(a) + sqrt(b))


@check("ALG.SEMPLIFICAZIONE_ADDENDI")
def _():
    assert ((x + 2) / 2).subs(x, 4) == 3 and (x + 1).subs(x, 4) == 5
    assert eq((2 * x + 4) / 2, x + 2)


@check("ALG.SOMMA_QUADRATI")
def _():
    assert expand((x + 3) * (x - 3)) == x**2 - 9
    assert factor(x**2 + 9) == x**2 + 9  # irriducibile
    assert solveset(x**2 + 9, x, S.Reals) == S.EmptySet  # nessuna radice reale
    assert ineq(x**2 + 9 >= 9) == S.Reals
    assert (0**2 + 9, (0 + 3) * (0 - 3)) == (9, -9)


@check("ALG.RUFFINI_SEGNO")
def _():
    p = x**3 + 2 * x**2 - x - 2
    quotient, remainder = div(p, x + 2, x)
    assert quotient == x**2 - 1 and remainder == 0
    assert ruffini([1, 2, -1, -2], -2) == ([1, 0, -1], 0)
    assert ruffini([1, 2, -1, -2], 2) == ([1, 4, 7], 12)
    assert p.subs(x, 2) == 12


@check("ALG.MCD_MCM")
def _():
    assert factorint(12) == {2: 2, 3: 1} and factorint(18) == {2: 1, 3: 2}
    assert igcd(12, 18) == 6 == 2 * 3
    assert ilcm(12, 18) == 36 == 2**2 * 3**2


@check("ALG.DIVISIONE_PER_INCOGNITA")
def _():
    assert set(solve(Eq(x**2, 3 * x), x)) == {0, 3}
    assert solve(Eq(x, 3), x) == [3]  # dividendo per x si perde x = 0
    assert factor(x**2 - 3 * x) == x * (x - 3)


@check("ALG.FORMULA_RISOLUTIVA")
def _():
    p = x**2 - 5 * x + 6
    assert set(solve(p, x)) == {2, 3}
    right = {(5 + s * sqrt(25 - 24)) / 2 for s in (1, -1)}
    assert right == {3, 2}
    wrong = {(-5 + s * sqrt(25 - 24)) / 2 for s in (1, -1)}
    assert wrong == {-2, -3} and all(p.subs(x, v) != 0 for v in wrong)
    # la formula in generale, confrontata con la soluzione simbolica di sympy
    qa, qb, qc = symbols("qa qb qc")
    formula = [(-qb + s * sqrt(qb**2 - 4 * qa * qc)) / (2 * qa) for s in (1, -1)]
    solutions = solve(qa * x**2 + qb * x + qc, x)
    assert len(solutions) == 2 and all(any(eq(sol, f) for f in formula) for sol in solutions)


@check("ALG.LOG_SOMMA")
def _():
    assert log(2, 2) == 1 and log(1, 2) == 0
    assert log(1 + 1, 2) == 1 and log(1, 2) + log(1, 2) == 0
    assert eq(expand_log(log(a * b), force=True), log(a) + log(b))


@check("ALG.ESPONENZIALE_SOMMA")
def _():
    assert 2 ** (3 + 2) == 32 == 2**3 * 2**2 == 8 * 4
    assert 2**3 + 2**2 == 12
    assert eq(a ** (x + y), a**x * a**y)


# ───────────────────────────── COND ─────────────────────────────


@check("COND.DENOMINATORE")
def _():
    assert set(solve(x**2 - 4, x)) == {-2, 2}
    assert (x - 2).subs(x, 2) == 0 and (x - 2).subs(x, -2) != 0
    assert solve(Eq((x**2 - 4) / (x - 2), 0), x) == [-2]


@check("COND.RADICE_PARI")
def _():
    assert ineq(x - 3 >= 0) == Interval(3, oo)
    assert 1 - 3 == -2 and sqrt(-2).is_real is False


@check("COND.SOLUZIONI_ESTRANEE")
def _():
    assert expand((x - 2) * (x + 1)) == x**2 - x - 2
    assert set(solve(Eq(x + 2, x**2), x)) == {2, -1}
    assert sqrt(2 + 2) == 2  # x = 2 è soluzione
    assert sqrt(-1 + 2) == 1 != -1  # x = -1 è estranea
    assert solve(Eq(sqrt(x + 2), x), x) == [2]


@check("COND.LOGARITMO")
def _():
    # x > 0 e x - 2 > 0 insieme equivalgono a x > 2
    assert Interval.open(0, oo).intersect(ineq(x - 2 > 0)) == Interval.open(2, oo)
    assert factor(x * (x - 2) - 8) == (x - 4) * (x + 2)
    assert set(solve(x * (x - 2) - 8, x)) == {4, -2}
    assert log(4, 2) + log(4 - 2, 2) == 3  # x = 4 verifica l'equazione
    assert not (-2 > 2)  # x = -2 viola le condizioni


@check("COND.DOMINIO_COMPOSTA")
def _():
    f = lambda value: sqrt(value)
    g = lambda value: 1 / value
    for good in (Rational(1, 2), Integer(3)):
        assert f(g(good)).is_real is True
    for bad in (Integer(-2), Rational(-1, 2)):
        assert f(g(bad)).is_real is False
    assert g(S.Zero) is zoo  # in x = 0 la funzione interna non è definita
    assert ineq(1 / x >= 0) == Interval.open(0, oo)


# ───────────────────────────── DISEQ ─────────────────────────────


@check("DISEQ.VERSO_NON_INVERTITO")
def _():
    assert ineq(-2 * x < 6) == Interval.open(-3, oo)
    assert (-2 * 0 < 6) and (0 > -3) and not (0 < -3)


@check("DISEQ.SEGNO_DENOMINATORE")
def _():
    assert ineq((x + 1) / (x - 2) > 1) == Interval.open(2, oo)
    assert eq((x + 1) / (x - 2) - 1, 3 / (x - 2))
    assert ineq(3 / (x - 2) > 0) == Interval.open(2, oo)
    assert simplify((x + 1) - (x - 2)) == 3  # x+1 > x-2 è sempre vera: la strada sbagliata
    assert not (Rational(0 + 1, 0 - 2) > 1)  # x = 0 non è soluzione


@check("DISEQ.UNIONE_INTERSEZIONE")
def _():
    assert Interval.open(1, oo).intersect(Interval.open(-oo, 4)) == Interval.open(1, 4)
    assert Union(Interval.open(1, oo), Interval.open(-oo, 4)) == S.Reals


@check("DISEQ.ESTREMI")
def _():
    solution = ineq((x - 1) / (x + 2) >= 0)
    assert solution == Union(Interval.open(-oo, -2), Interval(1, oo))
    assert solution.contains(1) is S.true and solution.contains(-2) is S.false


@check("DISEQ.SECONDO_GRADO")
def _():
    assert set(solve(x**2 - 5 * x + 6, x)) == {2, 3}
    assert ineq(x**2 - 5 * x + 6 > 0) == Union(Interval.open(-oo, 2), Interval.open(3, oo))
    assert ineq(x**2 - 5 * x + 6 < 0) == Interval.open(2, 3)
    p = x**2 - 5 * x + 6
    assert p.subs(x, 0) == 6 and p.subs(x, Rational(5, 2)) == Rational(-1, 4)


@check("DISEQ.VALORE_ASSOLUTO")
def _():
    assert ineq(Abs(x - 1) < 2) == Interval.open(-1, 3)
    assert ineq(Abs(x - 1) > 2) == Union(Interval.open(-oo, -1), Interval.open(3, oo))
    assert ineq(Abs(x) < 3) == Interval.open(-3, 3)
    assert ineq(Abs(x) > 3) == Union(Interval.open(-oo, -3), Interval.open(3, oo))


# ───────────────────────────── LOG ─────────────────────────────


@check("LOG.NEGAZIONE_PER_OGNI")
def _():
    primes = list(primerange(2, 500))
    assert not all(p % 2 == 1 for p in primes)  # «tutti i primi sono dispari» è falsa
    assert [p for p in primes if p % 2 == 0] == [2]  # la negazione è vera, per p = 2
    assert not all(p % 2 == 0 for p in primes)  # «tutti i primi sono pari» è falsa


@check("LOG.NECESSARIA_SUFFICIENTE")
def _():
    numbers = range(1, 1001)
    assert all(m % 2 == 0 for m in numbers if m % 6 == 0)  # multiplo di 6 → pari
    assert 4 % 2 == 0 and 4 % 6 != 0  # pari non basta per essere multiplo di 6


@check("LOG.INVERSA")
def _():
    numbers = range(1, 1001)
    A_ = lambda m: m % 4 == 0
    B_ = lambda m: m % 2 == 0
    assert all((not A_(m)) or B_(m) for m in numbers)  # se A allora B
    assert not all((not B_(m)) or A_(m) for m in numbers) and B_(6) and not A_(6)  # viceversa
    assert not all(A_(m) or not B_(m) for m in numbers) and (not A_(6)) and B_(6)  # se non A allora non B
    assert all(B_(m) or not A_(m) for m in numbers)  # se non B allora non A


@check("LOG.DE_MORGAN")
def _():
    values = range(-50, 51)
    P = lambda v: v % 2 == 0
    Q = lambda v: v > 10
    assert all((not (P(v) and Q(v))) == ((not P(v)) or (not Q(v))) for v in values)
    assert all((not (P(v) or Q(v))) == ((not P(v)) and (not Q(v))) for v in values)
    # la versione sbagliata «dispari e ≤ 10» non coincide: per x = 4 l'originale è falso
    assert not (P(4) and Q(4)) and not ((not P(4)) and (not Q(4)))
    assert any((not (P(v) and Q(v))) != ((not P(v)) and (not Q(v))) for v in values)
    assert all((not Q(v)) == (v <= 10) for v in values)  # per gli interi, non(x > 10) è x ≤ 10


# ───────────────────────────── FUNZ ─────────────────────────────


@check("FUNZ.TRASLAZIONE_ORIZZONTALE")
def _():
    g = (x**2).subs(x, x + 2)  # f(x+2) con f(x) = x²
    assert g == (x + 2) ** 2
    assert solve(diff(g, x), x) == [-2] and g.subs(x, -2) == 0  # vertice in (-2, 0)
    assert -2 < 0  # a sinistra del vertice di x², che sta in 0


@check("FUNZ.INVERSA_RECIPROCO")
def _():
    f = lambda value: 2 * value + 1
    finv = lambda value: (value - 1) / 2
    assert solve(Eq(y, f(x)), x) == [finv(y)]
    assert eq(finv(f(x)), x) and eq(f(finv(x)), x)
    assert ne(finv(x), 1 / f(x))


@check("FUNZ.ORDINE_COMPOSIZIONE")
def _():
    f = lambda value: value + 1
    g = lambda value: value**2
    assert expand(f(g(x))) == x**2 + 1
    assert expand(g(f(x))) == x**2 + 2 * x + 1
    assert ne(f(g(x)), g(f(x)))


# ───────────────────────────── TRIG ─────────────────────────────


@check("TRIG.GRADI_RADIANTI")
def _():
    assert 180 * pi / 180 == pi
    assert 45 * pi / 180 == pi / 4 and 45 * pi != pi / 4
    assert (pi / 6) * 180 / pi == 30


@check("TRIG.PERIODICITA")
def _():
    assert set(solveset(Eq(cos(x), Rational(1, 2)), x, Interval.Ropen(0, 2 * pi))) == {pi / 3, 5 * pi / 3}
    assert -pi / 3 + 2 * pi == 5 * pi / 3  # ±π/3 + 2kπ copre entrambe
    for k in range(-3, 4):
        assert simplify(cos(pi / 3 + 2 * k * pi) - Rational(1, 2)) == 0
        assert simplify(cos(-pi / 3 + 2 * k * pi) - Rational(1, 2)) == 0
        assert simplify(tan(pi / 4 + k * pi) - 1) == 0


@check("TRIG.SOLUZIONI_PERSE")
def _():
    window = Interval.Ropen(0, 2 * pi)
    assert set(solveset(Eq(sin(x), Rational(1, 2)), x, window)) == {pi / 6, 5 * pi / 6}
    assert pi - pi / 6 == 5 * pi / 6
    for value in (Rational(-9, 10), Rational(-1, 2), Integer(0), Rational(3, 4)):
        assert len(solveset(Eq(sin(x), value), x, window)) == 2  # |a| < 1: due soluzioni


@check("TRIG.SOMMA_ARGOMENTI")
def _():
    assert expand_trig(sin(a + b)) == sin(a) * cos(b) + cos(a) * sin(b)
    assert expand_trig(cos(a + b)) == cos(a) * cos(b) - sin(a) * sin(b)
    assert sin(pi / 6 + pi / 3) == sin(pi / 2) == 1
    assert eq(sin(pi / 6) + sin(pi / 3), (1 + sqrt(3)) / 2) and ne((1 + sqrt(3)) / 2, 1)


# ───────────────────────────── GEO ─────────────────────────────


@check("GEO.SIMILITUDINE")
def _():
    k = Rational(4, 2)
    assert k == 2
    assert 4**2 == 16 and 2**2 == 4 and Rational(16, 4) == k**2 == 4
    assert 4**3 == 64 and 2**3 == 8 and Rational(64, 8) == k**3 == 8


@check("GEO.FORMULA_SOLIDO")
def _():
    cone = integrate(pi * (r * t / h) ** 2, (t, 0, h))  # sezioni circolari di raggio r·t/h
    assert eq(cone, pi * r**2 * h / 3)
    cylinder = pi * r**2 * h
    assert eq(cone / cylinder, Rational(1, 3))
    assert cone.subs({r: 3, h: 4}) == 12 * pi and cylinder.subs({r: 3, h: 4}) == 36 * pi
    assert Rational(36, 12) == 3


@check("GEO.DISTANZA_PUNTO_RETTA")
def _():
    assert Abs(3 * 1 + 4 * 2 - 5) / sqrt(3**2 + 4**2) == Rational(6, 5)
    # la stessa retta scritta come y = -3/4 x + 5/4
    assert eq(3 * x + 4 * (-Rational(3, 4) * x + Rational(5, 4)) - 5, 0)
    # verifica indipendente: distanza minima dai punti della retta
    s = symbols("s", real=True)
    squared = (s - 1) ** 2 + ((5 - 3 * s) / 4 - 2) ** 2
    best = solve(diff(squared, s), s)
    assert len(best) == 1 and sqrt(squared.subs(s, best[0])) == Rational(6, 5)
    # e con la geometria di sympy
    line = Line(Point(0, Rational(5, 4)), Point(Rational(5, 3), 0))
    assert line.distance(Point(1, 2)) == Rational(6, 5)


# ───────────────────────────── STAT ─────────────────────────────


@check("STAT.EVENTI_NON_DISGIUNTI")
def _():
    A_, B_ = {2, 4, 6}, {4, 5, 6}
    P = lambda event: Rational(len(event), 6)
    assert P(A_) == P(B_) == Rational(3, 6) and P(A_ & B_) == Rational(2, 6)
    assert P(A_ | B_) == Rational(4, 6) == Rational(2, 3)
    assert P(A_) + P(B_) - P(A_ & B_) == P(A_ | B_)
    assert P(A_) + P(B_) == 1 != P(A_ | B_)  # sommando senza togliere l'intersezione si avrebbe 1


@check("STAT.ORDINE_CONTA")
def _():
    assert comb(10, 2) == 45 == len(list(itertools.combinations(range(10), 2)))
    assert perm(10, 2) == 90 == len(list(itertools.permutations(range(10), 2)))
    assert ff(10, 2) == 90 == Integer(3628800) / Integer(40320)  # 10!/(10-2)!
    assert comb(10, 2) == perm(10, 2) // 2  # D = C · k!, con k = 2


@check("STAT.MEDIANA")
def _():
    data = [7, 1, 9, 3, 5]
    assert data[len(data) // 2] == 9  # valore centrale senza ordinare
    assert sorted(data) == [1, 3, 5, 7, 9] and statistics.median(data) == 5


@check("STAT.MEDIA_PONDERATA")
def _():
    assert Rational(4 + 8, 2) == 6
    assert Rational(4 * 1 + 8 * 3, 1 + 3) == 7
    assert Rational(sum([4, 8, 8, 8]), 4) == 7  # la stessa media sui dati ripetuti


# ───────────────────────────── AN ─────────────────────────────


@check("AN.COMPLESSI_ARGOMENTO")
def _():
    z = -1 + I
    assert arg(z) == 3 * pi / 4 and Abs(z) == sqrt(2)
    assert atan(Rational(1, -1)) == -pi / 4 and -pi / 4 + pi == 3 * pi / 4
    assert simplify(sqrt(2) * (cos(3 * pi / 4) + I * sin(3 * pi / 4)) - z) == 0


@check("AN.FORMA_INDETERMINATA")
def _():
    assert limit((1 + 1 / n) ** n, n, oo) == E  # forma 1^∞, non vale 1
    assert limit(x**2 - x, x, oo) == oo  # forma ∞ - ∞, non vale 0
    assert limit(x**2, x, oo) == oo and limit(x, x, oo) == oo


@check("AN.HOPITAL_IPOTESI")
def _():
    assert limit((x + 1) / (x + 2), x, 0) == Rational(1, 2)
    assert (x + 1).subs(x, 0) != 0  # non è una forma 0/0
    assert diff(x + 1, x) / diff(x + 2, x) == 1 != Rational(1, 2)


@check("AN.DERIVATA_COMPOSTA")
def _():
    assert eq(diff(sin(x**2), x), 2 * x * cos(x**2))
    assert ne(diff(sin(x**2), x), cos(x**2))


@check("AN.DERIVATA_PRODOTTO")
def _():
    assert eq(diff(x * exp(x), x), (x + 1) * exp(x))
    assert ne(diff(x * exp(x), x), exp(x))


@check("AN.PUNTO_CRITICO")
def _():
    f = x**3
    assert diff(f, x).subs(x, 0) == 0 and diff(f, x) == 3 * x**2
    assert ineq(3 * x**2 >= 0) == S.Reals
    # x³ è strettamente crescente su tutto R, quindi 0 non è né massimo né minimo.
    # (is_strictly_increasing di sympy dà "non so" perché la derivata si annulla in 0.)
    # Dimostrazione: q³ - p³ = (q - p)(p² + pq + q²) e p² + pq + q² = (p + q/2)² + 3q²/4,
    # che è positivo se p e q non sono entrambi nulli, cioè sempre quando p < q.
    p, q = symbols("p q", real=True)
    assert expand((q - p) * (p**2 + p * q + q**2)) == q**3 - p**3
    assert expand((p + q / 2) ** 2 + 3 * q**2 / 4 - (p**2 + p * q + q**2)) == 0
    assert all(i**3 < j**3 for i in range(-6, 7) for j in range(-6, 7) if i < j)


@check("AN.TAYLOR_ORDINE")
def _():
    assert limit((sin(x) - x) / x**3, x, 0) == Rational(-1, 6)
    assert series(sin(x), x, 0, 4).removeO() == x - x**3 / 6
    assert series(sin(x) - x, x, 0, 6).removeO() == -(x**3) / 6 + x**5 / 120  # primo termine: x³


@check("AN.COSTANTE_INTEGRAZIONE")
def _():
    assert diff(x**2, x) == 2 * x and diff(x**2 + 5, x) == 2 * x
    assert integrate(2 * x, x) == x**2  # sympy omette il + c, che nel testo va scritto


@check("AN.TERMINE_GENERALE")
def _():
    k = symbols("k", positive=True, integer=True)
    assert limit(1 / n, n, oo) == 0
    assert Sum(1 / k, (k, 1, oo)).is_convergent() is S.false
    assert Sum(1 / k, (k, 1, oo)).doit() == oo


# ───────────────────────────── ALIN ─────────────────────────────

A = Matrix([[1, 1], [0, 1]])
B = Matrix([[1, 0], [1, 1]])


@check("ALIN.PRODOTTO_COMMUTATIVO")
def _():
    assert A * B == Matrix([[2, 1], [1, 1]])
    assert B * A == Matrix([[1, 1], [1, 2]])
    assert A * B != B * A


@check("ALIN.RANGO_DIMENSIONE")
def _():
    M = Matrix([[1, 2, 3], [2, 4, 6]])
    assert M.shape == (2, 3) and M.rank() == 1
    assert len(M.columnspace()) == 1
    assert M.row(1) == 2 * M.row(0)


@check("ALIN.DET_SOMMA")
def _():
    assert (eye(2) + eye(2)).det() == 4 and eye(2).det() + eye(2).det() == 2
    for P_, Q_ in [(A, B), (Matrix([[2, 1], [0, 3]]), Matrix([[1, 4], [2, 5]]))]:
        assert (P_ * Q_).det() == P_.det() * Q_.det()  # moltiplicativo
    assert (A + B).det() != A.det() + B.det()


@check("ALIN.DET_MULTIPLO")
def _():
    k = symbols("k")
    generic = Matrix(3, 3, symbols("m0:9"))
    assert expand((k * generic).det() - k**3 * generic.det()) == 0
    M = Matrix([[2, 0, 0], [0, 1, 0], [0, 0, 1]])
    assert M.det() == 2 and (2 * M).det() == 16 == 2**3 * 2 != 2 * 2


@check("ALIN.INVERSA_PRODOTTO")
def _():
    assert (A * B).inv() == Matrix([[1, -1], [-1, 2]])
    assert B.inv() * A.inv() == (A * B).inv()
    assert A.inv() * B.inv() == Matrix([[2, -1], [-1, 1]]) != (A * B).inv()


@check("ALIN.AUTOVETTORE_NULLO")
def _():
    M = Matrix([[2, 0], [0, 3]])
    zero = Matrix([0, 0])
    assert M * zero == 2 * zero == 3 * zero  # il vettore nullo «va bene» per ogni λ
    assert M.eigenvals() == {2: 1, 3: 1}
    vectors = {value: vs for value, _mult, vs in M.eigenvects()}
    assert vectors[2] == [Matrix([1, 0])] and vectors[3] == [Matrix([0, 1])]
    assert 0 in Matrix([[0, 0], [0, 1]]).eigenvals()  # λ = 0 può essere un autovalore


# ───────────────────────────── FORMA ─────────────────────────────


@check("FORMA.DECIMALE")
def _():
    assert sqrt(2) ** 2 == 2
    assert Rational("1.414") ** 2 == Rational("1.999396") != 2


@check("FORMA.NON_RICHIESTA")
def _():
    assert expand((x - 1) * (x + 1)) == x**2 - 1
    assert factor(x**2 - 1) == (x - 1) * (x + 1)
    assert (x**2 - 1) != (x - 1) * (x + 1)  # stessa funzione, forma diversa


# ───────────────────────────── esecuzione ─────────────────────────────


def catalog_codes():
    source = (Path(__file__).resolve().parent.parent / "src" / "errori" / "catalog.ts").read_text(encoding="utf-8")
    return re.findall(r'^\s+code: "([A-Z]+\.[A-Z0-9_]+)"', source, flags=re.MULTILINE)


def main():
    codes = catalog_codes()
    missing = [c for c in codes if c not in CHECKS]
    extra = [c for c in CHECKS if c not in codes]
    failures = []
    for code in codes:
        fn = CHECKS.get(code)
        if fn is None:
            continue
        try:
            fn()
        except Exception as error:  # noqa: BLE001 - si segnala qualsiasi problema
            failures.append((code, f"{type(error).__name__}: {error}"))
    for code in missing:
        print(f"MANCA il controllo per {code}")
    for code in extra:
        print(f"CONTROLLO senza voce nel catalogo: {code}")
    for code, message in failures:
        print(f"ERRORE in {code}: {message}")
    ok = len(codes) - len(missing) - len(failures)
    print(f"\n{ok}/{len(codes)} esempi verificati")
    return 1 if (missing or extra or failures) else 0


if __name__ == "__main__":
    sys.exit(main())
