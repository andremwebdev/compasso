# Revisione del motore (sessione 4a)

Revisione critica di `src/motore` e dei suoi test, fatta come la farebbe un revisore esterno: lettura di tutto il codice, più prove a tappeto contro modelli indipendenti (valutazione numerica, forza bruta, conti rifatti in un altro modo). Questo documento si aggiorna mentre il lavoro procede.

Stato: **in corso** — fatte le parti 1 (numeri, espressioni, LaTeX, parser), 2 (algebra, equivalenza, forma, derivate, passaggi) e 3 (insiemi, matrici, complessi, tabelle); restano i documenti.

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

### Parte 2 — algebra, vincoli di forma, passaggi

| # | Dove | Difetto | Correzione |
| --- | --- | --- | --- |
| 5 | `form` · `expanded` | **Risposta giusta rifiutata**: `3 + 2√2` (lo sviluppo di `(1 + √2)²`) e `√2 + √3` erano «termini simili ancora da sommare», perché ogni costante contava come termine noto. | Due termini sono simili solo se hanno la stessa parte letterale **e lo stesso radicale**: `2√2 + 3√2` sì, `3 + 2√2` no. |
| 6 | `form` · `rationalized` | **Risposta non razionalizzata accettata**: `√(1/2)`, `(1/2)^(1/2)`, `√0,5`, `√(x/2)` passavano il controllo (la radice non era scritta in un denominatore). | Una frazione sotto radice (o sotto esponente frazionario) è rifiutata, con il motivo. |
| 7 | `form` · `reducedFraction`, `factored` | Un fattore intero comune non si vedeva in mezzo ai radicali: `2√2/2`, `(2 + 2√3)/4`, `√8/2` erano «ridotte»; in `(2x + 2√2)` non si chiedeva di raccogliere 2. | `integerContent` guarda i numeri davanti alle radici. |
| 8 | `form` · `factored` | **Risposta giusta rifiutata**: `((x+1)(x−1))²` risultava «non scomposta». | La potenza di un prodotto si controlla fattore per fattore. |
| 9 | `form` · `simplifiedRadicals` | Accettava `(√2)³`, `(√2)²`, `√2·√2`, `√2·√3`, `√0`. | Rifiutate: potenza di una radice numerica con esponente ≥ indice, prodotto di radici numeriche con lo stesso indice, radice di zero. |
| 10 | `form` · `trigonometricForm` | Rifiutava `ρ(i sin θ + cos θ)`: stessa forma, addendi scambiati. | I due addendi valgono in qualunque ordine. Con la correzione 4, `2(cos π/3 + i sin π/3)` scritto senza parentesi è accettato. |
| 11 | `algebra/upoly.ts` | L'ordine dei fattori di `upFactor` usava `localeCompare`, che **dipende dalla lingua del dispositivo**: contro il principio «deterministico» (l'ordine entra nei passaggi di scomposizione e negli autovalori complessi). | Ordine per grado e poi per coefficienti confrontati come numeri. Un test controlla che in `src/motore` non ci siano `localeCompare`, `Intl`, `Math.random`, `Date`. |
| 12 | `steps/quadratic.ts` | Nel calcolo del discriminante una frazione al quadrato usciva `\frac{1}{2}^{2}`, senza parentesi. | `\left(\frac{1}{2}\right)^{2}`. |

### Parte 3 — insiemi di soluzioni (lettura)

Operazioni, forma canonica, confronto, matrici, complessi, tabelle e passaggi hanno retto a tutte le prove: le correzioni di questa parte sono tutte in `parser/sets.ts`.

| # | Difetto | Correzione |
| --- | --- | --- |
| 13 | **Il numero e letto come la congiunzione «e»**: `x ≤ e ∨ x ≥ e²` e `0 < x ≤ e ∨ x > 10` davano «Manca un estremo»; `x > e e x < 5` pure. Sono le risposte tipiche delle disequazioni con logaritmi ed esponenziali (V1.M09). | «e» è una congiunzione solo tra due condizioni complete (dopo la fine di un numero o di una lettera, prima dell'inizio di un'altra condizione). `x = 2 e + 1` resta un numero. |
| 14 | Due soluzioni di un'equazione si potevano scrivere solo con `∨` o tra graffe: `x = 3; x = 5`, `x=1, x=2`, `3; 5` erano errori. | Fuori dalle parentesi, `;` (o virgola e spazio) tra **uguaglianze o numeri** vale «oppure». Con le disuguaglianze resta un errore, ma spiegato: lì `;` sarebbe ambiguo (unione o sistema?). |
| 15 | `x_1 = 2 ∨ x_2 = 3` era un errore («scrivi la soluzione con x da sola»). | L'incognita vale anche con l'indice: `x_1`, `x1`, `x₁`. |
| 16 | `[−∞; 2]` e `(2; +∞]` erano accettati in silenzio come se le parentesi fossero aperte: è proprio l'errore `DISEQ.ESTREMI` che lo standard rigoroso non deve lasciar passare. | Testo non valido, con il motivo («l'infinito non può essere incluso»): Andrea lo corregge prima di confermare. |
| 17 | `{1,2}` era letto come il solo numero 1,2 e **l'anteprima lo disegnava identico a come l'aveva scritto**: chi intendeva «1 e 2» non poteva accorgersene. | Testo non valido, con il modo giusto di scrivere i due casi. `{1; 2}`, `{1, 2}`, `{1,5; 2}`, `x = 1,2` restano validi. |
| 18 | `∀x ∈ ℝ` e `∄x ∈ ℝ` valevano solo con la lettera x. | Valgono con l'incognita dell'esercizio. |
| 19 | `parseSolutionSet` poteva lanciare con testi enormi (stessa causa della correzione 2). | Limite di lunghezza e nessuna eccezione verso l'esterno. |

## Che cosa resta

(da completare a fine revisione)

## Punti da incrociare con le altre parti

(da completare a fine revisione)
