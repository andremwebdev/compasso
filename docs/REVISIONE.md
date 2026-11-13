# Revisione del motore (sessione 4a)

Revisione critica di `src/motore` e dei suoi test, fatta come la farebbe un revisore esterno: lettura di tutto il codice, più prove a tappeto contro modelli indipendenti (valutazione numerica, forza bruta, conti rifatti in un altro modo). Questo documento si aggiorna mentre il lavoro procede.

Stato: **in corso** — fatta la parte 1 (numeri, espressioni, LaTeX, parser).

## Come è stata fatta

1. Lettura di ogni file di `src/motore` (6.800 righe), cercando: errori di matematica, casi limite, promesse non mantenute («non lancia mai», «esatto», «deterministico»), differenze dalla specifica (sezioni 6 e 7).
2. Prove a tappeto fuori dai test esistenti, con espressioni e dati casuali più cattivi di quelli di `randomExpr` (esponenti frazionari, radici cubiche, radicandi negativi, logaritmi, potenze con esponente variabile):
   - `simplify` ed `expand` contro la valutazione numerica diretta, 60.000 espressioni;
   - `compare` contro la valutazione numerica: nessun «equivalenti» falso e nessun «diverse» falso su 240.000 coppie;
   - derivate contro il rapporto incrementale, 50.000 punti;
   - insiemi (unione, intersezione, complementare, differenza, forma canonica, uguaglianza) contro l'appartenenza a forza bruta, 20.000 coppie di insiemi reali e 6.000 di insiemi periodici;
   - matrici contro conti razionali rifatti a parte (determinante, inversa, rango, sistemi, nucleo), 4.000 matrici; autovalori e autovettori di matrici costruite all'indietro e di matrici 2×2 qualsiasi;
   - parser: 200.000 testi casuali, testi enormi, parentesi annidate a migliaia;
   - ogni LaTeX prodotto, disegnato con KaTeX rigoroso.
3. Ogni difetto trovato è diventato prima un test che fallisce, poi la correzione (i test nuovi sono nei file del modulo, in blocchi `revisione 4a: …`).

## Che cosa è risultato solido

Nessun difetto trovato, né leggendo né con le prove, in: `Rational`, interi, `Rng`, valutazione numerica reale e complessa, forma normale (`poly`, `normalize`), `simplify`, `expand`, `equivalent`/`compare`, polinomi in una variabile (divisione, MCD, radici, Kronecker), derivate, operazioni sugli insiemi, matrici (determinante, Gauss, inversa, rango, sistemi, autovalori), numeri complessi, tabelle dei segni e di variazione.

## Correzioni

### Parte 1 — numeri, espressioni, LaTeX, parser

| # | Dove | Difetto | Correzione |
| --- | --- | --- | --- |
| 1 | `expr/latex.ts` | **LaTeX rotto** per una somma con un prodotto che comincia con un fattore negativo tra parentesi: `1 + (−x)y` usciva `1 - left(-x\right)y`. Bastava che Andrea scrivesse `1 + (-x)y` per far fallire l'anteprima; succedeva anche con le espressioni dei generatori (127 casi su 20.000 espressioni casuali). | Il segno si decide sul testo prodotto, non sull'albero: `1 + (−x)y`. Stessa regola per l'opposto: `−(−x)y`. |
| 2 | `parser/parse.ts` | `parseExpression` **poteva lanciare** (`RangeError`) con migliaia di parentesi annidate, contro la promessa «non lancia mai». | Testo oltre 1.000 caratteri rifiutato con un messaggio; qualunque errore imprevisto diventa un risultato di errore. |
| 3 | `numbers/surd.ts` | Il **segno «esatto»** di un numero con radici usava 40 cifre fisse: con cancellazioni più forti poteva sbagliare (`(√5 − 2)^91` risultava negativo). Non raggiungibile con i numeri degli esercizi, ma la funzione promette un segno esatto. | Le cifre raddoppiano finché il totale supera l'errore massimo possibile: il segno è dimostrato, non stimato. |
| 4 | `parser/parse.ts` | `sin π/3` valeva `(sin π)/3`, cioè zero. È la scrittura più naturale per gli angoli (forma trigonometrica dei complessi, goniometria) e nessuno intende `(sin π)/3`. | Se l'argomento senza parentesi contiene π, la divisione per un intero resta nell'argomento: `sin π/3 = sin(π/3)`, `cos 2π/3`, `tan −π/4`. Senza π resta la regola di prima (`sin x/2 = (sin x)/2`). Decisione annotata in `STATO.md`. |

## Che cosa resta

(da completare a fine revisione)

## Punti da incrociare con le altre parti

(da completare a fine revisione)
