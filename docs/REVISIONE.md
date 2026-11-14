# Revisione del motore (sessione 4a)

Revisione critica di `src/motore` e dei suoi test, fatta come la farebbe un revisore esterno: lettura di tutto il codice, più prove a tappeto contro modelli indipendenti (valutazione numerica, forza bruta, conti rifatti in un altro modo). Dice che cosa è stato controllato, che cosa è stato corretto, che cosa resta di fragile e che cosa devono sapere le altre parti (generatori, app).

Stato: **finita**. Il motore è stato rivisto per intero, le correzioni hanno i loro test, il controllo su GitHub è verde.

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
4. Alla fine: tipi, build e tutti i 976 test verdi, e il confronto degli esercizi generati prima e dopo.

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

**Fuori dal motore, una riga sola.** Le correzioni 14, 15 e 17 cambiano che cosa è «scritto a metà»: in `src/app/risposta/preview.ts` l'elenco `SET_ENDINGS` ha quattro chiusure in più (`{1,5` → `{1,5; 0}`, `x = 3; x` → `x = 3; x = 0`, `x_` → `x_1 = 0`), così l'anteprima non mostra un errore mentre Andrea sta ancora scrivendo. La quadra sull'infinito invece è segnalata subito, già a `[−∞`, con il motivo giusto.

## Che cosa resta

Niente di aperto tra i difetti trovati: tutti corretti e coperti da test. Restano questi punti fragili, noti e non corretti di proposito (cambiarli è una decisione, non una riparazione):

1. **Confronto numerico vicino alle cancellazioni.** Quando la forma normale non basta (funzioni goniometriche, esponenziali, logaritmi), `equivalent` valuta in punti casuali con tolleranza relativa 10⁻⁸. Due scritture equivalenti che perdono cifre in modo diverso (`(1 − cos x)/x²` contro `sin²x/(x²(1 + cos x))` per x molto piccolo) possono risultare diverse se capita un punto sfortunato: probabilità per coppia stimata sotto 1 su 1.000, e il punto dipende solo dalle due espressioni, quindi il caso è riproducibile. Nelle 240.000 coppie provate non è mai successo. Il falso positivo richiederebbe 12 punti concordi su due funzioni diverse: non realistico.
2. **Irriducibilità in più variabili** (`form` · `factored`): si decide restringendo il polinomio a rette casuali (fino a 8). Un polinomio irriducibile potrebbe in teoria risultare «ancora da scomporre» se tutte le rette danno una restrizione riducibile: stimato sotto 1 su un milione per polinomio, mai visto. Oltre il grado 5 in una variabile l'irriducibilità non è garantita (limite già noto).
3. **Il parser degli insiemi non completa i testi a metà** (problema noto dalla sessione 3): l'app prova delle chiusure. Va bene finché `SET_ENDINGS` segue le scritture accettate dal parser; la soluzione pulita resta nel parser.
4. **`x = 1 e 2`** si legge `x = 1 ∧ x = 2`, cioè ∅: è la lettura rigorosa, e l'anteprima lo mostra, ma in italiano parlato «le soluzioni sono 1 e 2» vuol dire «oppure». Lasciato così.
5. **`sin x/2`** resta `(sin x)/2` (solo con π la divisione entra nell'argomento). L'anteprima lo mostra; la tastiera dovrebbe inserire sempre `sin(`.
6. **Forma canonica degli insiemi periodici**: un intervallo a cavallo dello zero esce spezzato in due (`[0; π/3] ∪ (5π/6; 2π)` più il periodo). Giusto, brutto da mostrare.
7. **Nomi che coincidono con le chiavi interne**: `sym("π")`, `sym("ℯ")`, `sym("ⅈ")` verrebbero confusi con le costanti nella forma normale. Il parser non li produce mai; un generatore non deve crearli (usare `pi`, `e`, `I`).
8. **`simplifiedRadicals` guarda solo i radicandi numerici**: `√(4x)`, `√2 + √2` (termini simili: li vede `expanded`) non sono segnalati. `expanded` non considera simili `x√2` e `x` né `πx` e `x`.
9. **`factored` su una somma irriducibile**: `x(x+1) + 2` (cioè `x² + x + 2`, irriducibile) passa il vincolo. Non riguarda gli esercizi «scomponi», dove il polinomio è riducibile.

## Punti da incrociare con le altre parti

**Generatori**

- I vincoli di forma sono più severi (correzioni 6, 7, 9): una risposta giusta scritta come `√(1/2)`, `2√2/2`, `√2·√3` o `(√2)³` ora viola `rationalized`, `reducedFraction`, `simplifiedRadicals`. La verifica automatica (punto 4) lo segnala; i cinque generatori esistenti non sono toccati (passano tutti).
- L'ordine dei fattori di `upFactor` è cambiato per i fattori di primo grado (ora per termine noto crescente). `factorPolynomial` aveva già il suo ordine e non cambia; gli esercizi congelati nei test sono identici. Chi usa `upFactor` direttamente per mostrare qualcosa deve ordinare da sé.
- Risposte di tipo insieme: Andrea ora può scrivere `x = 3; x = 5`, `x_1 = 2 ∨ x_2 = 3`, `3; 5`. Per le equazioni (V1.M05) conviene dirlo negli indizi o nel testo d'aiuto della tastiera. `[−∞; 2]` e `{1,2}` non arrivano più alla valutazione: sono testi non validi.
- Disequazioni con e (V1.M09): `x ≤ e ∨ x ≥ e²` ora si legge. Vale la pena un generatore di prova con estremi `e`, `e²`, `ln 2` quando si fa il modulo.
- Unione tra soluzioni periodiche e punti isolati (`x = 0 ∨ x = π/2 + kπ`) resta non rappresentabile: il messaggio parla di «intervallo» anche quando è un punto. Le equazioni goniometriche vanno costruite con soluzioni tutte periodiche.
- Matrici con elementi complessi: `src/esercizi/evaluate.ts` legge le caselle senza l'opzione `complex`, quindi `i` in una casella è una lettera. Quando V3 userà matrici complesse serve un campo `complex` anche nella risposta `matrix`.
- Per mostrare un insieme periodico ottenuto da `setUnion`/`setComplement`, il generatore scriva la base a mano (punto 6 sopra).
- Niente `sym("π")`, `sym("ℯ")`, `sym("ⅈ")` (punto 7 sopra).

**App**

- `SET_ENDINGS` in `preview.ts` va tenuto allineato al parser degli insiemi (punto 3 sopra).
- La tastiera dovrebbe inserire le funzioni con la parentesi (`sin(`), e sul livello Insiemi avere `;` e `∨` in evidenza: sono le due scritture su cui il parser non indovina.
- I messaggi nuovi del parser contengono formule tra `$…$` (`$\lor$`, `$\left\{1; 2\right\}$`): l'anteprima deve disegnarli come gli altri motivi.
- Oltre 1.000 caratteri (espressioni) o 2.000 (insiemi) il testo è rifiutato con «Il testo è troppo lungo.»: nessun campo dell'app dovrebbe arrivarci.

**Dati e progressi**

- Nessun formato cambiato. Gli esercizi sono identici a prima: i 45.000 esercizi dei cinque generatori (3 livelli, semi da 1 a 3000) generati prima e dopo la revisione coincidono byte per byte (testo, risposta, risposte sbagliate previste, passaggi, indizi). I tentativi salvati restano validi.
