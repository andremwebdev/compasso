// Semi congelati: il testo di due semi fissi per ogni generatore e ogni livello.
//
// Stesso generatore, stesso livello, stesso seme = stesso esercizio, per sempre: il registro di Andrea
// salva solo queste tre cose. Se un testo qui sotto cambia, è cambiato l'ordine delle estrazioni (o una
// forma, o un peso) e gli esercizi già salvati non sono più gli stessi. Può essere voluto, ma va deciso:
// si aggiorna la riga e si scrive il motivo in docs/REVISIONE.md o in STATO.md.
//
// Chi aggiunge un generatore aggiunge qui le sue righe (due semi per livello).

import { describe, expect, it } from "vitest";
import { generateExercise, type Level } from "../../src/esercizi";
import { findGenerator, generators } from "../../src/generatori";

const frozen: readonly (readonly [code: string, level: Level, seed: number, prompt: string])[] = [
  ["V1.M04.A07.g1", 1, 1, "Scomponi completamente in fattori il polinomio $x^{2} + 2x + 1$."],
  ["V1.M04.A07.g1", 1, 2, "Scomponi completamente in fattori il polinomio $10x^{2} + 25x$."],
  ["V1.M04.A07.g1", 2, 1, "Scomponi completamente in fattori il polinomio $2x^{2} - 5x + 3$."],
  ["V1.M04.A07.g1", 2, 2, "Scomponi completamente in fattori il polinomio $8x^{3} - 1$."],
  ["V1.M04.A07.g1", 3, 1, "Scomponi completamente in fattori il polinomio $x^{3} + 3x^{2} + x + 3$."],
  ["V1.M04.A07.g1", 3, 2, "Scomponi completamente in fattori il polinomio $x^{4} - 20x^{2} + 64$."],
  ["V1.M06.A04.g1", 1, 1, "Risolvi la disequazione $\\frac{2x - 6}{x - 5} < 0$."],
  ["V1.M06.A04.g1", 1, 2, "Risolvi la disequazione $\\frac{x + 6}{x + 3} \\le 0$."],
  ["V1.M06.A04.g1", 2, 1, "Risolvi la disequazione $\\frac{x - 6}{x + 3} < -2$."],
  ["V1.M06.A04.g1", 2, 2, "Risolvi la disequazione $\\frac{x + 5}{x^{2} + 5x + 4} > 0$."],
  ["V1.M06.A04.g1", 3, 1, "Risolvi la disequazione $\\frac{3x - 7}{x - 5} \\le 3$."],
  ["V1.M06.A04.g1", 3, 2, "Risolvi la disequazione $\\frac{2}{x + 4} \\le \\frac{1}{x + 1}$."],
  ["V2.M03.A01.g1", 1, 1, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\frac{2n - 5}{n^{2} + 2n - 9}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M03.A01.g1", 1, 2, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\frac{-n^{2} - 9n}{5n - 3}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M03.A01.g1", 2, 1, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\left(1 + \\frac{2}{n}\\right)^{3n - 2}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M03.A01.g1", 2, 2, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\frac{5^{n} - 4n^{2}}{5 \\cdot 4^{n} - 5n^{2}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M03.A01.g1", 3, 1, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\left(\\sqrt{9n^{2} + 5n} - \\sqrt{9n^{2} + 9n}\\right)$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M03.A01.g1", 3, 2, "Calcola il limite della successione:\n\n$$\\lim_{n \\to +\\infty} \\left(\\sqrt{n^{2} + n} - \\sqrt{n^{2} + 4n}\\right)$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M06.A03.g1", 1, 1, "Calcola la derivata della funzione $f(x) = \\frac{x + 1}{x + 2}$."],
  ["V2.M06.A03.g1", 1, 2, "Calcola la derivata della funzione $f(x) = \\cos\\left(2x - 3\\right)$."],
  ["V2.M06.A03.g1", 2, 1, "Calcola la derivata della funzione $f(x) = \\frac{x^{2} - 4}{x + 1}$."],
  ["V2.M06.A03.g1", 2, 2, "Calcola la derivata della funzione $f(x) = \\sqrt{x^{2} + 3}$."],
  ["V2.M06.A03.g1", 3, 1, "Calcola la derivata della funzione $f(x) = e^{3x} \\sin 2x$."],
  ["V2.M06.A03.g1", 3, 2, "Calcola la derivata della funzione $f(x) = \\frac{\\left(3x + 1\\right)^{3}}{x^{2}}$."],
  ["V3.M02.A01.g1", 1, 1, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} -x - 3y = 5 \\\\ -x - 4y = 7 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$."],
  ["V3.M02.A01.g1", 1, 2, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} x + 2y = -1 \\\\ -x - y = 2 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$."],
  ["V3.M02.A01.g1", 2, 1, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} x + 2z = -5 \\\\ -2x + y - 2z = 10 \\\\ -x - y - 3z = 4 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$, $z$."],
  ["V3.M02.A01.g1", 2, 2, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} -x - y - 2z = 2 \\\\ -2x - 3y - 5z = 4 \\\\ -2x - 4y - 5z = 5 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$, $z$."],
  ["V3.M02.A01.g1", 3, 1, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} y + 3z = -5 \\\\ -x + y + 3z = -9 \\\\ x + 2y + 4z = -4 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$, $z$."],
  ["V3.M02.A01.g1", 3, 2, "Risolvi il sistema lineare con il metodo di Gauss:\n\n$$\\begin{cases} -y + z = -1 \\\\ -x - y - 3z = 2 \\\\ -3x - y - 9z = 6 \\end{cases}$$\n\nScrivi la soluzione nelle caselle, nell'ordine $x$, $y$, $z$."],
  ["V3.M03.A01.g1", 1, 1, "Calcola il determinante della matrice $A = \\begin{pmatrix} 5 & 4 \\\\ 4 & 4 \\end{pmatrix}$."],
  ["V3.M03.A01.g1", 1, 2, "Calcola il determinante della matrice $A = \\begin{pmatrix} 5 & 1 \\\\ 4 & 2 \\end{pmatrix}$."],
  ["V3.M03.A01.g1", 2, 1, "Calcola il determinante della matrice $A = \\begin{pmatrix} 2 & -2 & 2 \\\\ 2 & 1 & -3 \\\\ 3 & -1 & -4 \\end{pmatrix}$."],
  ["V3.M03.A01.g1", 2, 2, "Calcola il determinante della matrice $A = \\begin{pmatrix} -1 & 1 & 2 \\\\ -3 & 4 & 0 \\\\ 1 & -4 & 1 \\end{pmatrix}$."],
  ["V3.M03.A01.g1", 3, 1, "Calcola il determinante della matrice $A = \\begin{pmatrix} 0 & -3 & -1 & 2 \\\\ 0 & -1 & 1 & 3 \\\\ -1 & 0 & 0 & -1 \\\\ 2 & 1 & 3 & -3 \\end{pmatrix}$."],
  ["V3.M03.A01.g1", 3, 2, "Calcola il determinante della matrice $A = \\begin{pmatrix} -1 & -1 & 3 & -3 \\\\ 3 & 0 & -1 & 2 \\\\ 3 & 0 & 0 & -1 \\\\ -1 & -2 & 3 & -1 \\end{pmatrix}$."],
];

describe("semi congelati", () => {
  it("ogni seme fissato dà ancora lo stesso testo", () => {
    for (const [code, level, seed, prompt] of frozen) {
      const generator = findGenerator(code);
      if (!generator) throw new Error(`generatore sconosciuto: ${code}`);
      expect(generateExercise(generator, level, seed).prompt, `${code}, livello ${level}, seme ${seed}`).toBe(prompt);
    }
  });

  it("ogni generatore in elenco ha i suoi semi congelati, per ogni livello", () => {
    for (const generator of generators) {
      for (const level of generator.levels) {
        expect(frozen.filter(([code, frozenLevel]) => code === generator.code && frozenLevel === level).length, `${generator.code}, livello ${level}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
