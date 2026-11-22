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
import { findGenerator, loadedGenerators } from "../../src/generatori";

// Tutti i generatori: test/setup.ts carica tutti i moduli prima di ogni file di test.
const generators = loadedGenerators();

const frozen: readonly (readonly [code: string, level: Level, seed: number, prompt: string])[] = [
  ["V1.M01.A01.g1", 1, 1, "Sia $A = \\{2, 8, 10, 13, 15\\}$. L'affermazione $\\{10, 13, 17\\} \\subseteq A$ è vera o falsa?"],
  ["V1.M01.A01.g1", 1, 2, "Sia $A = \\{3, 5, 11, 14, 15\\}$. L'affermazione $4 \\in A$ è vera o falsa?"],
  ["V1.M01.A01.g1", 2, 1, "Sia $A = \\{x \\in \\mathbb{N} \\mid 2 \\le x < 6\\}$. L'affermazione $7 \\notin A$ è vera o falsa?"],
  ["V1.M01.A01.g1", 2, 2, "Sia $A = \\{x \\in \\mathbb{N} \\mid x \\text{ è pari e } x < 13\\}$. L'affermazione $A = \\{0, 2, 4, 6, 8, 10, 12\\}$ è vera o falsa?"],
  ["V1.M01.A01.g1", 3, 1, "Sia $A = \\{x \\in \\mathbb{N} \\mid x^2 < 5\\}$. L'affermazione $\\{0\\} \\in A$ è vera o falsa?"],
  ["V1.M01.A01.g1", 3, 2, "Siano $A = \\{x \\in \\mathbb{N} \\mid x \\text{ è multiplo di } 3 \\text{ e } 0 < x < 25\\}$ e $B = \\{x \\in \\mathbb{N} \\mid x \\text{ è multiplo di } 6 \\text{ e } 0 < x < 25\\}$. L'affermazione $B \\subset A$ è vera o falsa?"],
  ["V1.M01.A02.g1", 1, 1, "Siano $A = \\{2, 3, 4, 5, 7\\}$ e $B = \\{5, 6, 7\\}$. Quale insieme è $A \\setminus B$?"],
  ["V1.M01.A02.g1", 1, 2, "Siano $A = \\{3, 7, 9\\}$ e $B = \\{1, 4, 7\\}$. Quale insieme è $A \\cap B$?"],
  ["V1.M01.A02.g1", 2, 1, "Siano $A = \\{1, 5, 6, 7, 9\\}$, $B = \\{1, 2, 7, 9\\}$ e $C = \\{3, 6, 8, 9\\}$. Quale insieme è $(A \\cup B) \\setminus C$?"],
  ["V1.M01.A02.g1", 2, 2, "Siano $A = \\{1, 2, 4, 6\\}$, $B = \\{2, 3, 4, 5, 9\\}$ e $C = \\{1, 3, 7\\}$. Quale insieme è $(A \\setminus B) \\cup C$?"],
  ["V1.M01.A02.g1", 3, 1, "Nell'insieme universo $U = \\{1, 2, 3, 4, 5, 6, 7\\}$ siano $A = \\{1, 2, 3, 4\\}$ e $B = \\{3, 4, 6, 7\\}$. Quale insieme è $\\overline{A} \\cap B$?"],
  ["V1.M01.A02.g1", 3, 2, "Nell'insieme universo $U = \\{1, 2, 3, 4, 5, 6, 7, 8\\}$ siano $A = \\{1, 3, 5\\}$ e $B = \\{2, 3, 5, 8\\}$. Quale insieme è $\\overline{A \\cup B}$?"],
  ["V1.M01.A03.g1", 1, 1, "In una scuola, $23$ studiano inglese, $24$ francese e $9$ tutte e due. Quanti studenti studiano una sola delle due lingue? Rispondi con un numero intero."],
  ["V1.M01.A03.g1", 1, 2, "In un condominio, $9$ hanno un'auto, $19$ una bicicletta e $4$ tutti e due. Quante famiglie hanno uno solo dei due mezzi? Rispondi con un numero intero."],
  ["V1.M01.A03.g1", 2, 1, "In una scuola, $14$ studiano inglese, $19$ francese e $14$ spagnolo; $6$ inglese e francese, $3$ inglese e spagnolo, $4$ francese e spagnolo; $1$ tutte e tre le lingue. Quanti studenti studiano solo inglese? Rispondi con un numero intero."],
  ["V1.M01.A03.g1", 2, 2, "In una scuola di musica, $17$ suonano il pianoforte, $15$ la chitarra e $21$ il violino; $7$ il pianoforte e la chitarra, $6$ il pianoforte e il violino, $6$ la chitarra e il violino; $2$ tutti e tre gli strumenti. Quanti allievi suonano almeno uno dei tre strumenti? Rispondi con un numero intero."],
  ["V1.M01.A03.g1", 3, 1, "In una scuola con $52$ studenti, $20$ studiano inglese, $17$ francese e $11$ spagnolo; $8$ inglese e francese, $5$ inglese e spagnolo, $7$ francese e spagnolo; $3$ tutte e tre le lingue. Quanti studenti non studiano nessuna delle tre lingue? Rispondi con un numero intero."],
  ["V1.M01.A03.g1", 3, 2, "In una scuola di musica con $57$ allievi, $16$ suonano il pianoforte, $21$ la chitarra e $19$ il violino; $6$ il pianoforte e la chitarra, $2$ il pianoforte e il violino, $6$ la chitarra e il violino; $1$ tutti e tre gli strumenti. Quanti allievi suonano esattamente due dei tre strumenti? Rispondi con un numero intero."],
  ["V1.M01.A04.g1", 1, 1, "Siano $A$ = «$18$ è multiplo di $6$» e $B$ = «$14$ è un quadrato perfetto». La proposizione $\\neg A \\wedge B$ è vera o falsa?"],
  ["V1.M01.A04.g1", 1, 2, "Siano $A$ = «$-8 > -3$» e $B$ = «$29$ è pari». La proposizione $\\neg A \\vee \\neg B$ è vera o falsa?"],
  ["V1.M01.A04.g1", 2, 1, "Siano $A$ = «$-6 > -15$», $B$ = «$4$ è un quadrato perfetto» e $C$ = «$9$ è un quadrato perfetto». La proposizione $C \\vee (\\neg B \\vee A)$ è vera o falsa?"],
  ["V1.M01.A04.g1", 2, 2, "Siano $A$ = «$23$ è multiplo di $4$», $B$ = «$17$ è pari» e $C$ = «$15$ è un numero primo». La proposizione $\\neg B \\wedge (A \\vee C)$ è vera o falsa?"],
  ["V1.M01.A04.g1", 3, 1, "Considera la proposizione $P = (\\neg A \\vee \\neg B) \\wedge \\neg C$. Nella sua tavola di verità, $P$ è vera in esattamente $3$ righe: vero o falso?"],
  ["V1.M01.A04.g1", 3, 2, "Considera la proposizione $P = \\neg (\\neg A \\wedge C) \\vee B$. Nella sua tavola di verità, $P$ è vera in esattamente $7$ righe: vero o falso?"],
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
  ["V2.M04.A01.g1", 1, 1, "Calcola il limite:\n\n$$\\lim_{x \\to -3} \\frac{3x^{2} - 27}{x^{2} + 3x}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M04.A01.g1", 1, 2, "Calcola il limite:\n\n$$\\lim_{x \\to +\\infty} \\frac{-2x^{2} - 5x - 4}{-5x + 5}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M04.A01.g1", 2, 1, "Calcola il limite:\n\n$$\\lim_{x \\to 0} \\frac{\\sin x}{e^{2x} - 1}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M04.A01.g1", 2, 2, "Calcola il limite:\n\n$$\\lim_{x \\to 0} \\frac{1 - \\cos 2x}{5x^{2}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M04.A01.g1", 3, 1, "Calcola il limite:\n\n$$\\lim_{x \\to 0} \\frac{\\ln\\left(1 + 4x\\right) - e^{6x} + 1}{3x}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M04.A01.g1", 3, 2, "Calcola il limite:\n\n$$\\lim_{x \\to 0} \\frac{\\sin 7x - \\ln\\left(1 + 5x\\right)}{6x}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M06.A03.g1", 1, 1, "Calcola la derivata della funzione $f(x) = \\frac{x + 1}{x + 2}$."],
  ["V2.M06.A03.g1", 1, 2, "Calcola la derivata della funzione $f(x) = \\cos\\left(2x - 3\\right)$."],
  ["V2.M06.A03.g1", 2, 1, "Calcola la derivata della funzione $f(x) = \\frac{x^{2} - 4}{x + 1}$."],
  ["V2.M06.A03.g1", 2, 2, "Calcola la derivata della funzione $f(x) = \\sqrt{x^{2} + 3}$."],
  ["V2.M06.A03.g1", 3, 1, "Calcola la derivata della funzione $f(x) = e^{3x} \\sin 2x$."],
  ["V2.M06.A03.g1", 3, 2, "Calcola la derivata della funzione $f(x) = \\frac{\\left(3x + 1\\right)^{3}}{x^{2}}$."],
  ["V2.M08.A01.g1", 1, 1, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{x - \\sin x}{8x^{3}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M08.A01.g1", 1, 2, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{1 - \\cos x}{4x^{2}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M08.A01.g1", 2, 1, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{1 - \\cos 2x - 2x^{2}}{5x^{4}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M08.A01.g1", 2, 2, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{2 - e^{x} - \\cos x + x}{5x^{3}}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M08.A01.g1", 3, 1, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{1 - \\cos x}{x \\ln\\left(1 + x\\right)}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M08.A01.g1", 3, 2, "Calcola il limite usando gli sviluppi di Taylor:\n\n$$\\lim_{x \\to 0} \\frac{e^{-x} - 1 + x}{x - \\ln\\left(1 + x\\right)}$$\n\nRispondi con un numero in forma esatta, oppure con $+\\infty$, $-\\infty$ o «non esiste»."],
  ["V2.M09.A01.g1", 1, 1, "Calcola l'integrale indefinito:\n\n$$\\int \\left(6x^{3} - 4x^{2} - 6x\\right)\\,dx$$"],
  ["V2.M09.A01.g1", 1, 2, "Calcola l'integrale indefinito:\n\n$$\\int \\frac{5}{4x - 2}\\,dx$$"],
  ["V2.M09.A01.g1", 2, 1, "Calcola l'integrale indefinito:\n\n$$\\int \\left(x - 3\\right)e^{2x}\\,dx$$"],
  ["V2.M09.A01.g1", 2, 2, "Calcola l'integrale indefinito:\n\n$$\\int 4x^{3} \\ln x\\,dx$$"],
  ["V2.M09.A01.g1", 3, 1, "Calcola l'integrale indefinito:\n\n$$\\int 4x^{3}e^{x^{2}}\\,dx$$"],
  ["V2.M09.A01.g1", 3, 2, "Calcola l'integrale indefinito:\n\n$$\\int \\frac{x^{2} - 11}{x + 4}\\,dx$$"],
  ["V2.M09.A02.g1", 1, 1, "Calcola l'integrale definito:\n\n$$\\int_{1}^{2} \\left(2x^{2} + 4x + 1\\right)\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M09.A02.g1", 1, 2, "Calcola l'integrale definito:\n\n$$\\int_{-1}^{0} \\left(-3x^{2} + x\\right)\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M09.A02.g1", 2, 1, "Calcola l'integrale definito:\n\n$$\\int_{1}^{e} 2x^{2} \\ln x\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M09.A02.g1", 2, 2, "Calcola l'integrale definito:\n\n$$\\int_{0}^{\\frac{\\pi}{2}} \\left(x + 2\\right) \\sin x\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M09.A02.g1", 3, 1, "Calcola l'integrale definito:\n\n$$\\int_{0}^{4} \\frac{-4x + 2}{x^{2} + 16}\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M09.A02.g1", 3, 2, "Calcola l'integrale definito:\n\n$$\\int_{0}^{1} 3x^{2}e^{3x}\\,dx$$\n\nScrivi il risultato in forma esatta."],
  ["V2.M10.A01.g1", 1, 1, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{0}^{2} \\frac{3}{x\\sqrt[3]{x}}\\,dx$$"],
  ["V2.M10.A01.g1", 1, 2, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{2}^{+\\infty} \\frac{3}{\\sqrt[3]{x^{2}}}\\,dx$$"],
  ["V2.M10.A01.g1", 2, 1, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{0}^{1} \\frac{e^{x}}{\\sqrt{x}}\\,dx$$"],
  ["V2.M10.A01.g1", 2, 2, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{1}^{+\\infty} \\frac{4 + \\sin x}{x}\\,dx$$"],
  ["V2.M10.A01.g1", 3, 1, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{0}^{+\\infty} \\frac{1}{x\\sqrt{x}\\left(1 + \\sqrt{x}\\right)}\\,dx$$"],
  ["V2.M10.A01.g1", 3, 2, "Stabilisci se l'integrale improprio converge o diverge, scegliendo la giustificazione corretta:\n\n$$\\int_{-3}^{-1} \\frac{3}{\\sqrt[3]{\\left(x + 2\\right)^{2}}}\\,dx$$"],
  ["V2.M11.A01.g1", 1, 1, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=0}^{+\\infty} 3\\left(-\\frac{3}{2}\\right)^{n}$$"],
  ["V2.M11.A01.g1", 1, 2, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=1}^{+\\infty} \\frac{1}{n\\sqrt[3]{n}}$$"],
  ["V2.M11.A01.g1", 2, 1, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=1}^{+\\infty} \\frac{5n + 2}{n^{3} + 4}$$"],
  ["V2.M11.A01.g1", 2, 2, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=1}^{+\\infty} \\frac{4^{n}}{n^{2}}$$"],
  ["V2.M11.A01.g1", 3, 1, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=1}^{+\\infty} \\left(e^{\\frac{1}{\\sqrt{n}}} - 1\\right)$$"],
  ["V2.M11.A01.g1", 3, 2, "Stabilisci il comportamento della serie, scegliendo la giustificazione corretta:\n\n$$\\sum_{n=1}^{+\\infty} \\ln\\left(1 + \\frac{1}{n^{2}}\\right)$$"],
  ["V2.M12.A01.g1", 1, 1, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y' = y - 3$$\n\nScrivi $y$ in funzione di $x$, con una costante arbitraria (per esempio $c$)."],
  ["V2.M12.A01.g1", 1, 2, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y' - 4y = 8$$\n\nScrivi $y$ in funzione di $x$, con una costante arbitraria (per esempio $c$)."],
  ["V2.M12.A01.g1", 2, 1, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y' + 2y = 3e^{x}$$\n\nScrivi $y$ in funzione di $x$, con una costante arbitraria (per esempio $c$)."],
  ["V2.M12.A01.g1", 2, 2, "Risolvi il problema di Cauchy:\n\n$$\\begin{cases} y' = -3y - 6 \\\\ y(0) = 1 \\end{cases}$$\n\nScrivi $y$ in funzione di $x$."],
  ["V2.M12.A01.g1", 3, 1, "Risolvi il problema di Cauchy:\n\n$$\\begin{cases} y' - 3y = 4e^{-x} \\\\ y(0) = -2 \\end{cases}$$\n\nScrivi $y$ in funzione di $x$."],
  ["V2.M12.A01.g1", 3, 2, "Risolvi il problema di Cauchy:\n\n$$\\begin{cases} y' - 2y = -10e^{-3x} \\\\ y(0) = 5 \\end{cases}$$\n\nScrivi $y$ in funzione di $x$."],
  ["V2.M12.A02.g1", 1, 1, "Trova l'integrale generale dell'equazione differenziale:\n\n$$2y'' - 2y' - 4y = 0$$\n\nScrivi $y$ in funzione di $x$, con due costanti arbitrarie (per esempio $c_1$ e $c_2$)."],
  ["V2.M12.A02.g1", 1, 2, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y'' - 9y = 0$$\n\nScrivi $y$ in funzione di $x$, con due costanti arbitrarie (per esempio $c_1$ e $c_2$)."],
  ["V2.M12.A02.g1", 2, 1, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y'' + 4y' + 3y = 6x + 14$$\n\nScrivi $y$ in funzione di $x$, con due costanti arbitrarie (per esempio $c_1$ e $c_2$)."],
  ["V2.M12.A02.g1", 2, 2, "Trova l'integrale generale dell'equazione differenziale:\n\n$$y'' + 6y' + 9y = 18x + 30$$\n\nScrivi $y$ in funzione di $x$, con due costanti arbitrarie (per esempio $c_1$ e $c_2$)."],
  ["V2.M12.A02.g1", 3, 1, "Risolvi il problema di Cauchy:\n\n$$\\begin{cases} y'' - 2y' + 2y = 0 \\\\ y(0) = -2 \\\\ y'(0) = 0 \\end{cases}$$\n\nScrivi $y$ in funzione di $x$."],
  ["V2.M12.A02.g1", 3, 2, "Risolvi il problema di Cauchy:\n\n$$\\begin{cases} y'' + 4y' + 8y = 0 \\\\ y(0) = -2 \\\\ y'(0) = 10 \\end{cases}$$\n\nScrivi $y$ in funzione di $x$."],
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
