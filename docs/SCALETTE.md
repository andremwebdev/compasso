# Scalette dei moduli

Proposta della sessione extra E4 (15 novembre 2026). **Si approva modulo per modulo**: sotto ogni modulo c'è lo stato (`proposta`, poi `approvata` con le eventuali correzioni di Andrea). Le lezioni di un modulo si scrivono solo dopo l'approvazione; da quel momento i suoi codici sono fissi (specifica, sezione 4: mai rinominati).

## Come si legge

- **Lezione**: codice, titolo, durata stimata (10-20 minuti), prerequisiti diretti (codici di lezione; quelli indiretti si ricavano dalla catena).
- **Abilità**: le abilità che la lezione introduce, con codice e descrizione breve. Ognuna diventerà un generatore `…g1` con `lesson` uguale alla lezione. Un'abilità è introdotta da una sola lezione.
- **Termini**: i termini del glossario che la lezione definisce. Ogni termine è definito una sola volta nei tre volumi; le lezioni successive lo usano come rimando `[[…]]`. Gli enti primitivi (punto, retta, piano) non si definiscono e non sono termini.
- **Teoremi**: «dim.» = dimostrato nella lezione (blocco `dimostrazione`, quindi anche dimostrazione interattiva); «enunciato» = solo enunciato, con il motivo. I codici `T` sono numerati nel modulo nell'ordine in cui compaiono, salvo quelli già assegnati.
- Una riga che manca (nessuna abilità, nessun termine, nessun teorema) vuol dire «niente».
- Le visualizzazioni (specifica, sezione 11) sono indicate nella lezione che le ospita.

## Codici già assegnati e rimandi dei generatori

Tutti i codici di `STATO.md` e del codice sono rispettati.

| Codice | Dove sta | Nota |
| --- | --- | --- |
| `V1.M06.L04`, `A04`, `D02`, `D03`, `F01`, `F02` | V1.M06.L04 | prerequisiti: `V1.M06.L03`, `V1.M04.L07` (come da `STATO.md`) più `V1.M05.L05` (equazioni fratte), da cui arriva `condizione-di-esistenza` |
| `V1.M04.L07`, `V1.M04.A07` | V1.M04.L07 | la lezione spiega tutte le tecniche del livello 3 (Ruffini, grado 3-4, fattori irriducibili) |
| `V2.M03.A01` | V2.M03.L02 | rimando mantenuto; i casi del livello 3 (numero e, fattori oscillanti) sono spiegati in L02 (vedi la lezione) |
| `V2.M04.A01` | V2.M04.L03 | rimando mantenuto; i limiti laterali sono in L01, prerequisito |
| `V2.M06.A03` | V2.M06.L03 | rimando mantenuto |
| `V2.M08.A01` | V2.M08.L03 | rimando mantenuto; i prodotti di sviluppi sono in L03 |
| `V2.M09.A01` | **V2.M09.L07** | rimando proposto `L04` **da spostare**: il livello 3 (fratti semplici, parti ripetute) chiede sostituzione, parti e funzioni razionali, che non stanno in una sola lezione di 20 minuti |
| `V2.M09.A02` | **V2.M09.L08** | rimando proposto `L05` **da spostare**, per lo stesso motivo |
| `V2.M10.A01` | V2.M10.L02 | rimando mantenuto |
| `V2.M11.A01` | **V2.M11.L05** | rimando proposto `L03` **da spostare**: il generatore usa anche Leibniz e la convergenza assoluta, che vengono dopo rapporto e radice |
| `V2.M12.A01`, `V2.M12.A02` | V2.M12.L02, V2.M12.L04 | rimandi mantenuti |
| `V3.M02.A01`, `V3.M03.A01` | V3.M02.L01, V3.M03.L01 | rimandi mantenuti; L01 di V3.M03 spiega lo sviluppo di Laplace (livello 3: ordine 4) |
| `V2.M05.T01`, `T02` | V2.M05.L03, L04 | teorema degli zeri, Weierstrass (in `src/riserva/`) |
| `V2.M06.T01`, `T02`, `T03` | V2.M06.L06, L07 | Fermat, Rolle, Lagrange (in `src/riserva/`) |

Spostare un rimando vuol dire cambiare il campo `lesson` del generatore: una riga, nessun esercizio cambia (i semi congelati guardano solo il testo). Si fa quando si scrive la lezione.

---

# Volume 1, Fondamenta

## V1.M01 Insiemi e logica

Stato: proposta.

#### V1.M01.L01 · Insiemi · 15 min
Prerequisiti: nessuno
- Abilità V1.M01.A01: riconoscere appartenenza e inclusione; passare tra elencazione e proprietà caratteristica.
- Termini: insieme, elemento, sottoinsieme, insieme-vuoto, diagramma-di-eulero-venn

#### V1.M01.L02 · Operazioni tra insiemi · 15 min
Prerequisiti: V1.M01.L01
- Abilità V1.M01.A02: unione, intersezione, differenza, complementare, prodotto cartesiano di insiemi dati.
- Termini: unione, intersezione, differenza-di-insiemi, complementare, insiemi-disgiunti, coppia-ordinata, prodotto-cartesiano

#### V1.M01.L03 · Contare con i diagrammi di Venn · 15 min
Prerequisiti: V1.M01.L02
- Abilità V1.M01.A03: problemi di conteggio con due o tre insiemi (quanti studenti fanno solo…).
- Termini: cardinalita
- Teorema V1.M01.T01 Principio di inclusione-esclusione per due insiemi — dim.

#### V1.M01.L04 · Proposizioni e connettivi · 15 min
Prerequisiti: V1.M01.L01
- Abilità V1.M01.A04: valore di verità di proposizioni composte, tavole di verità.
- Termini: proposizione, valore-di-verita, connettivo, negazione, congiunzione, disgiunzione, tavola-di-verita

#### V1.M01.L05 · Implicazione, condizione necessaria e sufficiente · 20 min
Prerequisiti: V1.M01.L04
- Abilità V1.M01.A05: riconoscere condizioni necessarie, sufficienti, necessarie e sufficienti.
- Abilità V1.M01.A06: inversa, contraria e contronominale di un'implicazione; quali sono equivalenti.
- Termini: implicazione, ipotesi, tesi, condizione-necessaria, condizione-sufficiente, doppia-implicazione, contronominale
- Teorema V1.M01.T02 Un'implicazione equivale alla sua contronominale — dim. (tavola di verità)

#### V1.M01.L06 · Quantificatori e negazioni · 15 min
Prerequisiti: V1.M01.L05
- Abilità V1.M01.A07: negare proposizioni con quantificatori e connettivi.
- Termini: predicato, quantificatore-universale, quantificatore-esistenziale, controesempio
- Teorema V1.M01.T03 Leggi di De Morgan — dim. (tavole di verità)

#### V1.M01.L07 · Dimostrazioni e ragionamento per assurdo · 15 min
Prerequisiti: V1.M01.L06
- Abilità V1.M01.A08: distinguere deduzioni valide da errori di deduzione.
- Termini: teorema, dimostrazione, dimostrazione-per-assurdo
- Teorema V1.M01.T04 Non esiste un numero naturale più grande di tutti — dim. (per assurdo, come primo esempio)

#### V1.M01.L08 · La logica nel linguaggio comune · 15 min
Prerequisiti: V1.M01.L07
- Abilità V1.M01.A09: tradurre e confrontare frasi con «se… allora», «solo se», «a meno che», «non tutti», «almeno uno» (quesiti di tipo TOL; per la simulazione si aggiunge la banca scritta a mano, specifica sezione 8).

## V1.M02 Numeri

Stato: proposta.

#### V1.M02.L01 · Numeri naturali e interi · 15 min
Prerequisiti: V1.M01.L02
- Abilità V1.M02.A01: confronto e operazioni con i numeri interi, regola dei segni.
- Termini: numero-naturale, numero-intero, opposto, insieme-numerico

#### V1.M02.L02 · Divisibilità e numeri primi · 15 min
Prerequisiti: V1.M02.L01
- Abilità V1.M02.A02: criteri di divisibilità, quoziente e resto.
- Abilità V1.M02.A03: scomposizione in fattori primi.
- Termini: divisione-con-resto, divisore, multiplo, numero-primo, numero-composto
- Teorema V1.M02.T01 I numeri primi sono infiniti — dim. (Euclide)
- Teorema V1.M02.T02 Teorema fondamentale dell'aritmetica — enunciato (l'unicità richiede strumenti fuori dal programma del TOL)

#### V1.M02.L03 · MCD e mcm · 15 min
Prerequisiti: V1.M02.L02
- Abilità V1.M02.A04: MCD e mcm, anche nei problemi.
- Termini: massimo-comune-divisore, minimo-comune-multiplo, numeri-coprimi
- Teorema V1.M02.T03 MCD(a, b) · mcm(a, b) = a · b — dim.
- Teorema V1.M02.T04 Algoritmo di Euclide — dim.

#### V1.M02.L04 · Numeri razionali · 15 min
Prerequisiti: V1.M02.L03
- Abilità V1.M02.A05: passare da frazione a numero decimale limitato e viceversa.
- Termini: frazione, numeratore, denominatore, frazione-irriducibile, numero-razionale, numero-decimale-limitato

#### V1.M02.L05 · Numeri periodici · 15 min
Prerequisiti: V1.M02.L04
- Abilità V1.M02.A06: frazione generatrice di un numero periodico (serve il parser dei numeri periodici, vedi in fondo).
- Termini: numero-periodico, periodo-di-un-numero-periodico, antiperiodo, frazione-generatrice
- Teorema V1.M02.T05 Regola della frazione generatrice — dim.

#### V1.M02.L06 · Numeri irrazionali e reali · 15 min
Prerequisiti: V1.M02.L05
- Abilità V1.M02.A07: riconoscere numeri razionali e irrazionali.
- Termini: numero-irrazionale, numero-reale, retta-reale
- Teorema V1.M02.T06 √2 è irrazionale — dim. (per assurdo)
- Teorema V1.M02.T07 Tra due razionali distinti c'è sempre un altro razionale — dim.

#### V1.M02.L07 · Ordinamento, valore assoluto e intervalli · 15 min
Prerequisiti: V1.M02.L06
- Abilità V1.M02.A08: confrontare e ordinare numeri reali (frazioni, decimali, radici quadrate semplici).
- Termini: valore-assoluto, intervallo

#### V1.M02.L08 · Basi diverse da dieci · 15 min
Prerequisiti: V1.M02.L01
- Abilità V1.M02.A09: conversioni tra base 10 e basi 2, 8, 16 (e una base qualsiasi).
- Termini: sistema-posizionale, base-di-numerazione, cifra

## V1.M03 Calcolo numerico

Stato: proposta.

#### V1.M03.L01 · Ordine delle operazioni · 10 min
Prerequisiti: V1.M02.L01
- Abilità V1.M03.A01: espressioni con interi e parentesi.
- Termini: espressione-numerica, precedenza-delle-operazioni

#### V1.M03.L02 · Frazioni: equivalenza e confronto · 15 min
Prerequisiti: V1.M03.L01, V1.M02.L04
- Abilità V1.M03.A02: ridurre ai minimi termini e confrontare frazioni.
- Termini: frazioni-equivalenti, minimo-comune-denominatore

#### V1.M03.L03 · Operazioni con le frazioni · 15 min
Prerequisiti: V1.M03.L02
- Abilità V1.M03.A03: espressioni con le frazioni.
- Termini: reciproco

#### V1.M03.L04 · Potenze · 15 min
Prerequisiti: V1.M03.L03
- Abilità V1.M03.A04: proprietà delle potenze, esponente zero e negativo.
- Termini: potenza, base-di-una-potenza, esponente
- Teorema V1.M03.T01 Proprietà delle potenze a esponente intero — dim.

#### V1.M03.L05 · Radicali · 20 min
Prerequisiti: V1.M03.L04, V1.M02.L06
- Abilità V1.M03.A05: semplificare radicali, portare fuori dalla radice, sommare radicali simili.
- Termini: radice-n-esima, radicando, indice-di-una-radice, radicale, radicali-simili
- Teorema V1.M03.T02 Prodotto e quoziente di radicali con lo stesso indice — dim.

#### V1.M03.L06 · Razionalizzazione e potenze a esponente razionale · 15 min
Prerequisiti: V1.M03.L05
- Abilità V1.M03.A06: razionalizzare il denominatore.
- Abilità V1.M03.A07: passare tra radicali e potenze a esponente razionale.
- Termini: razionalizzazione, potenza-a-esponente-razionale

#### V1.M03.L07 · Notazione scientifica, arrotondamenti e stime · 15 min
Prerequisiti: V1.M03.L04
- Abilità V1.M03.A08: notazione scientifica e ordine di grandezza (serve il parser della notazione scientifica, vedi in fondo).
- Abilità V1.M03.A09: stime e arrotondamenti senza calcolatrice.
- Termini: notazione-scientifica, ordine-di-grandezza, arrotondamento, cifre-significative

#### V1.M03.L08 · Percentuali · 15 min
Prerequisiti: V1.M03.L03
- Abilità V1.M03.A10: percentuali, variazioni percentuali, percentuali successive.
- Termini: percentuale, variazione-percentuale

#### V1.M03.L09 · Disuguaglianze numeriche · 15 min
Prerequisiti: V1.M03.L06, V1.M02.L07
- Abilità V1.M03.A11: confrontare espressioni numeriche (radicali, potenze, frazioni) senza calcolatrice.
- Termini: disuguaglianza
- Teorema V1.M03.T03 Proprietà delle disuguaglianze (somma, prodotto per un positivo e per un negativo) — dim.
- Teorema V1.M03.T04 Per a, b ≥ 0: a < b se e solo se aⁿ < bⁿ — dim.

## V1.M04 Calcolo letterale

Stato: proposta.

#### V1.M04.L01 · Monomi · 15 min
Prerequisiti: V1.M03.L04
- Abilità V1.M04.A01: operazioni con i monomi.
- Termini: espressione-letterale, monomio, coefficiente-di-un-monomio, parte-letterale, grado-di-un-monomio, monomi-simili

#### V1.M04.L02 · Polinomi · 15 min
Prerequisiti: V1.M04.L01
- Abilità V1.M04.A02: somma e prodotto di polinomi.
- Termini: polinomio, grado-di-un-polinomio, termine-noto

#### V1.M04.L03 · Prodotti notevoli · 15 min
Prerequisiti: V1.M04.L02
- Abilità V1.M04.A03: sviluppare quadrati, cubi, somma per differenza.
- Termini: prodotto-notevole, triangolo-di-tartaglia
- Teorema V1.M04.T01 Formule dei prodotti notevoli — dim. (sviluppo)

#### V1.M04.L04 · Divisione tra polinomi · 15 min
Prerequisiti: V1.M04.L03
- Abilità V1.M04.A04: divisione con quoziente e resto.
- Termini: divisione-tra-polinomi

#### V1.M04.L05 · Regola di Ruffini e teorema del resto · 20 min
Prerequisiti: V1.M04.L04
- Abilità V1.M04.A05: divisione con Ruffini e ricerca degli zeri razionali.
- Termini: zero-di-un-polinomio, regola-di-ruffini
- Teorema V1.M04.T02 Teorema del resto — dim.
- Teorema V1.M04.T03 Teorema di Ruffini: x − a divide P(x) se e solo se P(a) = 0 — dim.
- Teorema V1.M04.T04 Gli zeri razionali di un polinomio a coefficienti interi sono della forma p/q, con p divisore del termine noto e q del primo coefficiente — dim.

#### V1.M04.L06 · Raccoglimenti e prodotti notevoli al contrario · 15 min
Prerequisiti: V1.M04.L05
- Abilità V1.M04.A06: raccoglimento totale e parziale, differenza di quadrati.
- Termini: scomposizione-in-fattori, raccoglimento, polinomio-irriducibile

#### V1.M04.L07 · Scomposizione di polinomi · 20 min
Prerequisiti: V1.M04.L06
- Abilità V1.M04.A07: scomporre con la strategia completa (trinomi, cubi, Ruffini, grado 3-4). **Esiste**: `V1.M04.A07.g1`.
- Teorema V1.M04.T05 Un polinomio di grado n ha al più n zeri — dim. (da Ruffini)

#### V1.M04.L08 · MCD e mcm di polinomi · 10 min
Prerequisiti: V1.M04.L07, V1.M02.L03
- Abilità V1.M04.A08: MCD e mcm di polinomi scomposti.

#### V1.M04.L09 · Frazioni algebriche · 15 min
Prerequisiti: V1.M04.L08
- Abilità V1.M04.A09: condizioni di esistenza e semplificazione.
- Termini: frazione-algebrica, condizione-di-esistenza

#### V1.M04.L10 · Operazioni con le frazioni algebriche · 20 min
Prerequisiti: V1.M04.L09
- Abilità V1.M04.A10: somme, prodotti e quozienti di frazioni algebriche.

## V1.M05 Equazioni

Stato: proposta.

#### V1.M05.L01 · Equazioni di primo grado · 15 min
Prerequisiti: V1.M04.L02
- Abilità V1.M05.A01: equazioni di primo grado intere, anche con frazioni numeriche.
- Termini: equazione, incognita, soluzione-di-un-equazione, insieme-delle-soluzioni, equazioni-equivalenti, equazione-impossibile, equazione-indeterminata
- Teorema V1.M05.T01 Principi di equivalenza delle equazioni — dim.

#### V1.M05.L02 · Equazioni di secondo grado · 20 min
Prerequisiti: V1.M05.L01, V1.M04.L07, V1.M03.L05
- Abilità V1.M05.A02: equazioni complete e incomplete con la formula risolutiva.
- Termini: equazione-di-secondo-grado, discriminante
- Teorema V1.M05.T02 Formula risolutiva — dim. (completamento del quadrato)

#### V1.M05.L03 · Relazioni tra radici e coefficienti · 15 min
Prerequisiti: V1.M05.L02
- Abilità V1.M05.A03: somma e prodotto delle soluzioni; scrivere l'equazione con soluzioni date.
- Teorema V1.M05.T03 Somma e prodotto delle soluzioni: −b/a e c/a — dim.

#### V1.M05.L04 · Equazioni di grado superiore · 15 min
Prerequisiti: V1.M05.L03
- Abilità V1.M05.A04: annullamento del prodotto, biquadratiche, binomie, trinomie.
- Termini: legge-di-annullamento-del-prodotto, equazione-biquadratica
- Teorema V1.M05.T04 Legge di annullamento del prodotto — dim.

#### V1.M05.L05 · Equazioni fratte · 15 min
Prerequisiti: V1.M05.L04, V1.M04.L10
- Abilità V1.M05.A05: equazioni fratte con condizioni di esistenza.
- Termini: equazione-fratta

#### V1.M05.L06 · Equazioni irrazionali · 20 min
Prerequisiti: V1.M05.L05
- Abilità V1.M05.A06: equazioni con una o due radici quadrate, con verifica delle soluzioni (le disequazioni arrivano nel modulo dopo: il metodo con le condizioni si riprende in V1.M06.L06).
- Termini: equazione-irrazionale, soluzione-estranea

#### V1.M05.L07 · Equazioni con valore assoluto · 15 min
Prerequisiti: V1.M05.L05, V1.M02.L07
- Abilità V1.M05.A07: equazioni del tipo |A| = k, |A| = |B|, |A| = B (con verifica).

#### V1.M05.L08 · Equazioni parametriche e risolubilità · 15 min
Prerequisiti: V1.M05.L03
- Abilità V1.M05.A08: per quali valori del parametro un'equazione ha soluzioni reali, coincidenti, con segni dati.
- Termini: parametro, equazione-parametrica

## V1.M06 Disequazioni

Stato: proposta.

#### V1.M06.L01 · Disequazioni di primo grado · 15 min
Prerequisiti: V1.M05.L01, V1.M03.L09
- Abilità V1.M06.A01: disequazioni di primo grado, soluzione come intervallo.
- Termini: disequazione, disequazioni-equivalenti
- Teorema V1.M06.T01 Principi di equivalenza delle disequazioni — dim.

#### V1.M06.L02 · Disequazioni di secondo grado · 20 min
Prerequisiti: V1.M06.L01, V1.M05.L03
- Abilità V1.M06.A02: segno di un trinomio di secondo grado nei tre casi del discriminante.
- Teorema V1.M06.T02 Segno del trinomio di secondo grado — dim. (dalla scomposizione e dal completamento del quadrato)

#### V1.M06.L03 · Segno di un prodotto · 15 min
Prerequisiti: V1.M06.L02
- Abilità V1.M06.A03: disequazioni prodotto e di grado superiore con la tabella dei segni.
- Termini: tabella-dei-segni

#### V1.M06.L04 · Disequazioni fratte · 19 min
Prerequisiti: V1.M06.L03, V1.M04.L07, V1.M05.L05
- Abilità V1.M06.A04: disequazioni fratte con la tabella dei segni. **Esiste**: `V1.M06.A04.g1`.
- Termini: disequazione-fratta, segno-di-una-frazione (lezione già scritta; gli altri termini che oggi spiega a parole diventano rimandi: `zero-di-un-polinomio`, `condizione-di-esistenza`, `tabella-dei-segni`)
- Visualizzazione: VIS.disequazioni-grafico

#### V1.M06.L05 · Sistemi di disequazioni · 15 min
Prerequisiti: V1.M06.L04
- Abilità V1.M06.A05: sistemi di disequazioni.
- Termini: sistema-di-disequazioni

#### V1.M06.L06 · Disequazioni irrazionali · 20 min
Prerequisiti: V1.M06.L05, V1.M05.L06
- Abilità V1.M06.A06: disequazioni con una radice quadrata (i due schemi).
- Teorema V1.M06.T03 √A < B e √A > B equivalgono ai due sistemi — dim.

#### V1.M06.L07 · Disequazioni con valore assoluto · 15 min
Prerequisiti: V1.M06.L05, V1.M05.L07
- Abilità V1.M06.A07: disequazioni con un valore assoluto.
- Teorema V1.M06.T04 Con a > 0: |x| < a ⇔ −a < x < a; |x| > a ⇔ x < −a ∨ x > a — dim.

## V1.M07 Sistemi

Stato: proposta.

#### V1.M07.L01 · Sistemi lineari di due equazioni · 15 min
Prerequisiti: V1.M05.L01
- Abilità V1.M07.A01: sostituzione e riduzione.
- Termini: sistema-di-equazioni, soluzione-di-un-sistema, sistema-determinato, sistema-impossibile, sistema-indeterminato

#### V1.M07.L02 · Sistemi lineari con un parametro · 15 min
Prerequisiti: V1.M07.L01
- Abilità V1.M07.A02: classificare un sistema 2×2 (anche con un parametro) dai rapporti dei coefficienti.

#### V1.M07.L03 · Sistemi lineari di tre equazioni · 15 min
Prerequisiti: V1.M07.L01
- Abilità V1.M07.A03: sistemi 3×3 con sostituzione e riduzione.

#### V1.M07.L04 · Piano cartesiano e lettura geometrica · 15 min
Prerequisiti: V1.M07.L02
- Abilità V1.M07.A04: riconoscere rette incidenti, parallele e coincidenti dal sistema (e viceversa).
- Termini: piano-cartesiano, coordinate-cartesiane, grafico-di-un-equazione

#### V1.M07.L05 · Sistemi di secondo grado · 20 min
Prerequisiti: V1.M07.L04, V1.M05.L02
- Abilità V1.M07.A05: sistemi con un'equazione di secondo grado e sistemi simmetrici.
- Termini: grado-di-un-sistema

#### V1.M07.L06 · Problemi con i sistemi · 15 min
Prerequisiti: V1.M07.L05
- Abilità V1.M07.A06: tradurre un problema in un sistema e risolverlo.

## V1.M08 Funzioni

Stato: proposta.

#### V1.M08.L01 · Funzioni · 15 min
Prerequisiti: V1.M01.L02, V1.M07.L04
- Abilità V1.M08.A01: riconoscere una funzione (anche da un grafico) e calcolarne i valori.
- Termini: funzione, dominio, codominio, immagine-di-un-elemento, grafico-di-una-funzione

#### V1.M08.L02 · Dominio di una funzione reale · 20 min
Prerequisiti: V1.M08.L01, V1.M06.L06
- Abilità V1.M08.A02: dominio di funzioni con frazioni e radici.
- Termini: funzione-reale-di-variabile-reale, dominio-naturale

#### V1.M08.L03 · Immagine, iniettività e suriettività · 15 min
Prerequisiti: V1.M08.L01
- Abilità V1.M08.A03: immagine; riconoscere funzioni iniettive, suriettive, biiettive.
- Termini: insieme-immagine, controimmagine, funzione-iniettiva, funzione-suriettiva, funzione-biiettiva

#### V1.M08.L04 · Composizione di funzioni · 15 min
Prerequisiti: V1.M08.L02
- Abilità V1.M08.A04: funzione composta e suo dominio.
- Termini: funzione-composta

#### V1.M08.L05 · Funzione inversa · 15 min
Prerequisiti: V1.M08.L03, V1.M08.L04
- Abilità V1.M08.A05: inversa di una funzione e suo dominio.
- Termini: funzione-inversa, funzione-identita
- Teorema V1.M08.T01 Una funzione è invertibile se e solo se è biiettiva — dim.
- Teorema V1.M08.T02 Il grafico dell'inversa è il simmetrico rispetto alla retta y = x — dim.

#### V1.M08.L06 · Monotonia e parità · 15 min
Prerequisiti: V1.M08.L03
- Abilità V1.M08.A06: riconoscere funzioni monotone, pari, dispari.
- Termini: funzione-crescente, funzione-decrescente, funzione-monotona, funzione-pari, funzione-dispari
- Teorema V1.M08.T03 Una funzione strettamente monotona è iniettiva — dim.

#### V1.M08.L07 · Funzioni elementari · 20 min
Prerequisiti: V1.M08.L06
- Abilità V1.M08.A07: grafici e proprietà di funzioni lineari, potenze, radici, 1/x, valore assoluto.
- Termini: funzione-lineare, funzione-potenza, funzione-valore-assoluto

#### V1.M08.L08 · Trasformazioni dei grafici · 20 min
Prerequisiti: V1.M08.L07
- Abilità V1.M08.A08: grafico di a·f(b(x − c)) + d a partire da quello di f.
- Termini: traslazione, dilatazione, simmetria-rispetto-a-un-asse
- Visualizzazione: VIS.trasformazioni-funzioni

#### V1.M08.L09 · Equazioni e disequazioni con i grafici · 15 min
Prerequisiti: V1.M08.L08, V1.M06.L04
- Abilità V1.M08.A09: risolvere f(x) = g(x) e f(x) > g(x) leggendo i grafici; contare le soluzioni.

## V1.M09 Esponenziali e logaritmi

Stato: proposta.

#### V1.M09.L01 · Funzione esponenziale · 15 min
Prerequisiti: V1.M08.L07, V1.M03.L06
- Abilità V1.M09.A01: proprietà e grafico di aˣ, confronto tra potenze.
- Termini: funzione-esponenziale, numero-di-nepero
- Visualizzazione: VIS.esponenziale-logaritmo

#### V1.M09.L02 · Equazioni esponenziali · 15 min
Prerequisiti: V1.M09.L01, V1.M05.L04
- Abilità V1.M09.A02: equazioni esponenziali (stessa base, sostituzione).
- Termini: equazione-esponenziale

#### V1.M09.L03 · Logaritmi · 15 min
Prerequisiti: V1.M09.L02
- Abilità V1.M09.A03: calcolare logaritmi con la definizione.
- Termini: logaritmo, logaritmo-naturale, logaritmo-decimale

#### V1.M09.L04 · Proprietà dei logaritmi · 15 min
Prerequisiti: V1.M09.L03
- Abilità V1.M09.A04: espressioni con i logaritmi.
- Teorema V1.M09.T01 Logaritmo di un prodotto, di un quoziente, di una potenza — dim.
- Teorema V1.M09.T02 Formula del cambiamento di base — dim.

#### V1.M09.L05 · Funzione logaritmica · 15 min
Prerequisiti: V1.M09.L04, V1.M08.L05
- Abilità V1.M09.A05: grafico e dominio di funzioni con logaritmi.
- Termini: funzione-logaritmica

#### V1.M09.L06 · Equazioni logaritmiche · 15 min
Prerequisiti: V1.M09.L05
- Abilità V1.M09.A06: equazioni logaritmiche con condizioni di esistenza.
- Termini: equazione-logaritmica

#### V1.M09.L07 · Disequazioni esponenziali e logaritmiche · 20 min
Prerequisiti: V1.M09.L06, V1.M06.L05
- Abilità V1.M09.A07: disequazioni esponenziali e logaritmiche (estremi come `e`, `e²`, `ln 2`: prova della lettura degli insiemi, `STATO.md`).

## V1.M10 Goniometria e trigonometria

Stato: proposta.

#### V1.M10.L01 · Angoli: gradi e radianti · 15 min
Prerequisiti: V1.M03.L03
- Abilità V1.M10.A01: conversioni tra gradi e radianti (serve il parser dei gradi, vedi in fondo).
- Termini: angolo, angolo-orientato, grado-sessagesimale, radiante

#### V1.M10.L02 · Circonferenza goniometrica, seno e coseno · 20 min
Prerequisiti: V1.M10.L01, V1.M07.L04
- Abilità V1.M10.A02: seno e coseno degli angoli notevoli e segni nei quadranti.
- Termini: circonferenza, raggio, circonferenza-goniometrica, seno, coseno
- Teorema V1.M10.T01 sin²α + cos²α = 1 — dim. (usa il teorema di Pitagora, richiamato dalla scuola media e dimostrato in V1.M11.L04)
- Visualizzazione: VIS.circonferenza-goniometrica

#### V1.M10.L03 · Tangente · 15 min
Prerequisiti: V1.M10.L02
- Abilità V1.M10.A03: tangente degli angoli notevoli; relazioni tra seno, coseno e tangente.
- Termini: tangente-goniometrica

#### V1.M10.L04 · Grafici delle funzioni goniometriche · 15 min
Prerequisiti: V1.M10.L03, V1.M08.L08
- Abilità V1.M10.A04: grafici, periodo e trasformazioni di seno, coseno, tangente.
- Termini: funzione-periodica, periodo-di-una-funzione

#### V1.M10.L05 · Funzioni goniometriche inverse · 15 min
Prerequisiti: V1.M10.L04, V1.M08.L05
- Abilità V1.M10.A05: valori di arcoseno, arcocoseno, arcotangente.
- Termini: arcoseno, arcocoseno, arcotangente

#### V1.M10.L06 · Archi associati · 15 min
Prerequisiti: V1.M10.L03
- Abilità V1.M10.A06: ricondurre al primo quadrante (angoli opposti, supplementari, complementari…).
- Termini: archi-associati

#### V1.M10.L07 · Formule di addizione e duplicazione · 20 min
Prerequisiti: V1.M10.L06
- Abilità V1.M10.A07: formule di addizione, sottrazione, duplicazione, bisezione.
- Teorema V1.M10.T02 Formula di sottrazione del coseno — dim.
- Teorema V1.M10.T03 Formule di addizione e di duplicazione — dim. (dalla T02)

#### V1.M10.L08 · Identità goniometriche · 15 min
Prerequisiti: V1.M10.L07
- Abilità V1.M10.A08: verificare identità e semplificare espressioni goniometriche.
- Termini: identita-goniometrica

#### V1.M10.L09 · Equazioni goniometriche elementari · 20 min
Prerequisiti: V1.M10.L05, V1.M10.L06
- Abilità V1.M10.A09: sin x = a, cos x = a, tan x = a, con tutte le soluzioni periodiche.
- Termini: equazione-goniometrica

#### V1.M10.L10 · Altre equazioni goniometriche · 20 min
Prerequisiti: V1.M10.L09, V1.M10.L08
- Abilità V1.M10.A10: equazioni riconducibili a elementari, lineari in seno e coseno, omogenee di secondo grado.

#### V1.M10.L11 · Disequazioni goniometriche · 20 min
Prerequisiti: V1.M10.L10, V1.M06.L04
- Abilità V1.M10.A11: disequazioni goniometriche in un periodo e su ℝ.

#### V1.M10.L12 · Triangoli rettangoli · 15 min
Prerequisiti: V1.M10.L03
- Abilità V1.M10.A12: risolvere un triangolo rettangolo.
- Termini: triangolo-rettangolo, cateto, ipotenusa
- Teorema V1.M10.T04 In un triangolo rettangolo ogni cateto è l'ipotenusa per il seno dell'angolo opposto (o per il coseno dell'angolo adiacente) — dim.

#### V1.M10.L13 · Teoremi dei seni e del coseno · 20 min
Prerequisiti: V1.M10.L12, V1.M10.L07
- Abilità V1.M10.A13: risolvere un triangolo qualsiasi; area con il seno.
- Teorema V1.M10.T05 Area di un triangolo = ½ · a · b · sin γ — dim.
- Teorema V1.M10.T06 Teorema dei seni — dim.
- Teorema V1.M10.T07 Teorema del coseno — dim.

## V1.M11 Geometria euclidea

Stato: proposta.

#### V1.M11.L01 · Segmenti, semirette e angoli · 15 min
Prerequisiti: V1.M01.L07, V1.M10.L01
- Abilità V1.M11.A01: angoli complementari, supplementari, opposti al vertice.
- Termini: assioma, segmento, semiretta, angoli-complementari, angoli-supplementari, angoli-opposti-al-vertice
- Teorema V1.M11.T01 Angoli opposti al vertice sono congruenti — dim.

#### V1.M11.L02 · Rette parallele e perpendicolari · 15 min
Prerequisiti: V1.M11.L01
- Abilità V1.M11.A02: angoli formati da due parallele e una trasversale.
- Termini: rette-parallele, rette-perpendicolari
- Teorema V1.M11.T02 Due parallele tagliate da una trasversale formano angoli alterni interni congruenti — enunciato (equivale al postulato delle parallele)
- Teorema V1.M11.T03 La somma degli angoli interni di un triangolo è un angolo piatto — dim.

#### V1.M11.L03 · Triangoli e congruenza · 20 min
Prerequisiti: V1.M11.L02
- Abilità V1.M11.A03: classificare triangoli e usare i criteri di congruenza; punti notevoli.
- Termini: triangolo, triangolo-isoscele, triangolo-equilatero, figure-congruenti, altezza-di-un-triangolo, mediana-di-un-triangolo, bisettrice, asse-di-un-segmento
- Teorema V1.M11.T04 Criteri di congruenza dei triangoli — enunciato (il primo è un postulato)
- Teorema V1.M11.T05 In un triangolo isoscele gli angoli alla base sono congruenti — dim.
- Teorema V1.M11.T06 Disuguaglianza triangolare — enunciato

#### V1.M11.L04 · Teoremi di Pitagora e di Euclide · 20 min
Prerequisiti: V1.M11.L03, V1.M10.L12
- Abilità V1.M11.A04: lati e altezze di triangoli rettangoli con Pitagora ed Euclide.
- Termini: proiezione-di-un-segmento
- Teorema V1.M11.T07 Teorema di Pitagora — dim.
- Teorema V1.M11.T08 Primo teorema di Euclide — dim.
- Teorema V1.M11.T09 Secondo teorema di Euclide — dim.

#### V1.M11.L05 · Similitudine e teorema di Talete · 20 min
Prerequisiti: V1.M11.L04
- Abilità V1.M11.A05: lati, aree e volumi di figure simili.
- Termini: figure-simili, rapporto-di-similitudine
- Teorema V1.M11.T10 Teorema di Talete — enunciato (il caso generale chiede i numeri reali in modo rigoroso)
- Teorema V1.M11.T11 Criteri di similitudine dei triangoli — enunciato
- Teorema V1.M11.T12 Il rapporto tra le aree di due figure simili è il quadrato del rapporto di similitudine — dim. (per i triangoli)

#### V1.M11.L06 · Circonferenza e cerchio · 20 min
Prerequisiti: V1.M11.L03, V1.M10.L02
- Abilità V1.M11.A06: angoli al centro e alla circonferenza, corde, tangenti.
- Termini: cerchio, diametro, corda, arco, angolo-al-centro, angolo-alla-circonferenza, retta-tangente-a-una-circonferenza
- Teorema V1.M11.T13 L'angolo al centro è il doppio dell'angolo alla circonferenza che insiste sullo stesso arco — dim.
- Teorema V1.M11.T14 La tangente è perpendicolare al raggio nel punto di contatto — dim.

#### V1.M11.L07 · Poligoni, perimetri e aree · 20 min
Prerequisiti: V1.M11.L06, V1.M11.L04
- Abilità V1.M11.A07: perimetri e aree di poligoni, cerchio, settore circolare.
- Termini: poligono, poligono-regolare, apotema, poligono-inscritto, poligono-circoscritto, settore-circolare
- Teorema V1.M11.T15 Area del triangolo come metà base per altezza — dim.

#### V1.M11.L08 · Costruzioni con riga e compasso · 10 min
Prerequisiti: V1.M11.L06
- Abilità V1.M11.A08: riconoscere e ordinare i passi delle costruzioni elementari (asse, bisettrice, perpendicolare, parallela).
- Termini: costruzione-con-riga-e-compasso

#### V1.M11.L09 · Rette e piani nello spazio · 15 min
Prerequisiti: V1.M11.L02
- Abilità V1.M11.A09: posizioni reciproche di rette e piani nello spazio.
- Termini: rette-sghembe, piani-paralleli, retta-perpendicolare-a-un-piano
- Teorema V1.M11.T16 Teorema delle tre perpendicolari — enunciato

#### V1.M11.L10 · Poliedri · 15 min
Prerequisiti: V1.M11.L09, V1.M11.L07
- Abilità V1.M11.A10: superfici e volumi di prismi, parallelepipedi, piramidi.
- Termini: poliedro, prisma, parallelepipedo, piramide
- Teorema V1.M11.T17 Relazione di Eulero per i poliedri convessi — enunciato

#### V1.M11.L11 · Solidi di rotazione e sfera · 15 min
Prerequisiti: V1.M11.L10
- Abilità V1.M11.A11: superfici e volumi di cilindro, cono, sfera.
- Termini: solido-di-rotazione, cilindro, cono, sfera
- Teorema V1.M11.T18 Principio di Cavalieri — enunciato
- Teorema V1.M11.T19 Volume della sfera — dim. (con il principio di Cavalieri)

## V1.M12 Geometria analitica

Stato: proposta.

#### V1.M12.L01 · Punti e distanze · 15 min
Prerequisiti: V1.M07.L04, V1.M11.L04
- Abilità V1.M12.A01: distanza tra due punti, punto medio, baricentro.
- Termini: punto-medio
- Teorema V1.M12.T01 Formula della distanza tra due punti — dim.

#### V1.M12.L02 · La retta · 20 min
Prerequisiti: V1.M12.L01, V1.M08.L07
- Abilità V1.M12.A02: equazione della retta per due punti o per un punto con coefficiente angolare dato.
- Termini: coefficiente-angolare, equazione-esplicita-della-retta, equazione-implicita-della-retta
- Teorema V1.M12.T02 Ogni equazione di primo grado in x e y rappresenta una retta, e viceversa — dim.

#### V1.M12.L03 · Parallelismo, perpendicolarità, distanza punto-retta · 20 min
Prerequisiti: V1.M12.L02
- Abilità V1.M12.A03: rette parallele e perpendicolari, fasci di rette.
- Abilità V1.M12.A04: distanza di un punto da una retta.
- Termini: fascio-di-rette
- Teorema V1.M12.T03 Due rette non verticali sono perpendicolari se e solo se m·m′ = −1 — dim.
- Teorema V1.M12.T04 Formula della distanza punto-retta — dim.

#### V1.M12.L04 · Luoghi geometrici · 15 min
Prerequisiti: V1.M12.L03
- Abilità V1.M12.A05: equazione di un luogo (asse di un segmento, bisettrici, punti a distanza data).
- Termini: luogo-geometrico

#### V1.M12.L05 · La circonferenza · 20 min
Prerequisiti: V1.M12.L04
- Abilità V1.M12.A06: equazione, centro e raggio; posizione e tangenti rispetto a una retta.
- Termini: retta-secante

#### V1.M12.L06 · La parabola · 20 min
Prerequisiti: V1.M12.L05, V1.M06.L02
- Abilità V1.M12.A07: vertice, fuoco, direttrice e asse; parabola e retta.
- Termini: parabola, fuoco-di-una-parabola, direttrice, vertice-di-una-parabola
- Visualizzazione: VIS.coniche-parametri (sulla parabola)

#### V1.M12.L07 · L'ellisse · 20 min
Prerequisiti: V1.M12.L06
- Abilità V1.M12.A08: semiassi, fuochi, eccentricità dall'equazione canonica.
- Termini: ellisse, semiassi, eccentricita

#### V1.M12.L08 · L'iperbole · 20 min
Prerequisiti: V1.M12.L07
- Abilità V1.M12.A09: vertici, fuochi, asintoti; iperbole equilatera e funzione omografica.
- Termini: iperbole, asintoti-dell-iperbole, iperbole-equilatera, funzione-omografica
- Visualizzazione: VIS.coniche-parametri (tutte e quattro le coniche)

#### V1.M12.L09 · Coniche, equazioni e sistemi · 15 min
Prerequisiti: V1.M12.L08, V1.M07.L05
- Abilità V1.M12.A10: riconoscere la conica da un'equazione; leggere geometricamente equazioni e sistemi.
- Termini: conica

#### V1.M12.L10 · Primi passi nello spazio · 15 min
Prerequisiti: V1.M12.L01, V1.M11.L11
- Abilità V1.M12.A11: distanze nello spazio, equazione della sfera, piani paralleli ai piani coordinati.
- Termini: coordinate-nello-spazio, piano-coordinato

## V1.M13 Combinatoria e probabilità

Stato: proposta.

#### V1.M13.L01 · Principio fondamentale del calcolo combinatorio · 15 min
Prerequisiti: V1.M01.L03
- Abilità V1.M13.A01: conteggi con il principio moltiplicativo e il fattoriale (serve il fattoriale nel parser, vedi in fondo).
- Termini: principio-fondamentale-del-calcolo-combinatorio, fattoriale

#### V1.M13.L02 · Disposizioni e permutazioni · 15 min
Prerequisiti: V1.M13.L01
- Abilità V1.M13.A02: disposizioni e permutazioni, semplici e con ripetizione.
- Termini: disposizione-semplice, disposizione-con-ripetizione, permutazione, permutazione-con-ripetizione
- Teorema V1.M13.T01 Numero delle disposizioni semplici — dim.

#### V1.M13.L03 · Combinazioni · 20 min
Prerequisiti: V1.M13.L02
- Abilità V1.M13.A03: combinazioni; scegliere tra disposizioni e combinazioni.
- Termini: combinazione-semplice, coefficiente-binomiale
- Teorema V1.M13.T02 Numero delle combinazioni semplici — dim.
- Teorema V1.M13.T03 Simmetria e formula di Stifel per i coefficienti binomiali — dim.

#### V1.M13.L04 · Eventi e probabilità classica · 15 min
Prerequisiti: V1.M13.L03
- Abilità V1.M13.A04: probabilità come casi favorevoli su casi possibili, con i conteggi.
- Termini: esperimento-aleatorio, spazio-campionario, evento, evento-certo, evento-impossibile, eventi-incompatibili, probabilita-classica

#### V1.M13.L05 · Evento contrario e unione di eventi · 15 min
Prerequisiti: V1.M13.L04
- Abilità V1.M13.A05: probabilità del contrario e dell'unione.
- Termini: evento-contrario
- Teorema V1.M13.T04 P(non A) = 1 − P(A) — dim.
- Teorema V1.M13.T05 P(A ∪ B) = P(A) + P(B) − P(A ∩ B) — dim.

#### V1.M13.L06 · Probabilità condizionata ed eventi indipendenti · 20 min
Prerequisiti: V1.M13.L05
- Abilità V1.M13.A06: probabilità condizionata e dell'intersezione.
- Termini: probabilita-condizionata, eventi-indipendenti
- Teorema V1.M13.T06 Teorema del prodotto — dim.

#### V1.M13.L07 · Probabilità totale e prove ripetute · 20 min
Prerequisiti: V1.M13.L06
- Abilità V1.M13.A07: probabilità totale, formula di Bayes, schema di Bernoulli.
- Termini: schema-di-bernoulli
- Teorema V1.M13.T07 Teorema della probabilità totale — dim.
- Teorema V1.M13.T08 Formula di Bayes — dim.
- Teorema V1.M13.T09 Probabilità di k successi in n prove — dim.

## V1.M14 Statistica

Stato: proposta.

#### V1.M14.L01 · Dati e frequenze · 15 min
Prerequisiti: V1.M03.L08
- Abilità V1.M14.A01: frequenze assolute, relative, percentuali e cumulate.
- Termini: popolazione-statistica, carattere-statistico, frequenza-assoluta, frequenza-relativa, frequenza-percentuale, frequenza-cumulata

#### V1.M14.L02 · Diagrammi e istogrammi · 15 min
Prerequisiti: V1.M14.L01
- Abilità V1.M14.A02: leggere e costruire diagrammi a barre, a torta, istogrammi (anche con classi di ampiezza diversa).
- Termini: diagramma-a-barre, diagramma-a-torta, classe-di-frequenza, istogramma, densita-di-frequenza

#### V1.M14.L03 · Media, moda e mediana · 15 min
Prerequisiti: V1.M14.L01
- Abilità V1.M14.A03: media semplice e ponderata, moda, mediana.
- Termini: media-aritmetica, media-ponderata, moda, mediana
- Teorema V1.M14.T01 La somma degli scarti dalla media è zero — dim.

#### V1.M14.L04 · Varianza e deviazione standard · 15 min
Prerequisiti: V1.M14.L03
- Abilità V1.M14.A04: varianza, deviazione standard, campo di variazione.
- Termini: scarto-dalla-media, varianza, deviazione-standard, campo-di-variazione
- Teorema V1.M14.T02 Varianza = media dei quadrati − quadrato della media — dim.

#### V1.M14.L05 · Come cambiano gli indici · 15 min
Prerequisiti: V1.M14.L04, V1.M14.L02
- Abilità V1.M14.A05: effetto su media, mediana e varianza di aggiungere, togliere o trasformare dati (quesiti di tipo TOL).
- Teorema V1.M14.T03 Media e varianza di a·x + b — dim.

---

# Volume 2, Analisi 1

Rigore universitario: definizioni precise, enunciati con tutte le ipotesi (specifica, sezione 4). Le dimostrazioni dei teoremi principali vanno confrontate con un libro di testo quando si scrive la lezione.

## V2.M01 Numeri reali e induzione

Stato: proposta.

#### V2.M01.L01 · Maggioranti, minoranti, massimo e minimo · 15 min
Prerequisiti: V1.M02.L07, V1.M01.L06
- Abilità V2.M01.A01: maggioranti, minoranti, massimo e minimo di un insieme dato.
- Termini: maggiorante, minorante, insieme-limitato, funzione-limitata, massimo-di-un-insieme, minimo-di-un-insieme
- Teorema V2.M01.T01 Il massimo di un insieme, se esiste, è unico — dim.

#### V2.M01.L02 · Estremo superiore e completezza · 20 min
Prerequisiti: V2.M01.L01
- Abilità V2.M01.A02: estremo superiore e inferiore (anche di insiemi come {1 − 1/n}), dire se sono massimo o minimo.
- Termini: estremo-superiore, estremo-inferiore, assioma-di-completezza
- Teorema V2.M01.T02 Caratterizzazione dell'estremo superiore con ε — dim.

#### V2.M01.L03 · Conseguenze della completezza · 15 min
Prerequisiti: V2.M01.L02
- Abilità V2.M01.A03: vero o falso su estremi, proprietà di Archimede, densità.
- Teorema V2.M01.T03 Proprietà di Archimede — dim.
- Teorema V2.M01.T04 Densità di ℚ in ℝ — dim.
- Teorema V2.M01.T05 Ogni numero reale positivo ha una e una sola radice quadrata positiva — enunciato (si dà l'idea con l'estremo superiore)

#### V2.M01.L04 · Principio di induzione · 20 min
Prerequisiti: V2.M01.L01
- Abilità V2.M01.A04: completare e riordinare dimostrazioni per induzione; formule con le sommatorie.
- Termini: sommatoria, principio-di-induzione, passo-base, passo-induttivo
- Teorema V2.M01.T06 Somma dei primi n numeri naturali e somma geometrica — dim. (per induzione)
- Teorema V2.M01.T07 Disuguaglianza di Bernoulli — dim.

#### V2.M01.L05 · Binomio di Newton · 15 min
Prerequisiti: V2.M01.L04, V1.M13.L03
- Abilità V2.M01.A05: sviluppo di (a + b)ⁿ e coefficiente di un termine dato.
- Teorema V2.M01.T08 Formula del binomio di Newton — dim. (induzione e formula di Stifel)

## V2.M02 Numeri complessi

Stato: proposta.

#### V2.M02.L01 · Forma algebrica · 20 min
Prerequisiti: V1.M05.L02, V1.M07.L04
- Abilità V2.M02.A01: operazioni in forma algebrica, quoziente compreso.
- Termini: numero-complesso, unita-immaginaria, parte-reale, parte-immaginaria, complesso-coniugato, modulo-di-un-numero-complesso, piano-di-gauss
- Teorema V2.M02.T01 Proprietà del coniugato e del modulo — dim.

#### V2.M02.L02 · Forma trigonometrica · 20 min
Prerequisiti: V2.M02.L01, V1.M10.L05
- Abilità V2.M02.A02: passare dalla forma algebrica alla trigonometrica e viceversa.
- Termini: argomento-di-un-numero-complesso, argomento-principale, forma-trigonometrica
- Teorema V2.M02.T02 Prodotto e quoziente in forma trigonometrica — dim.

#### V2.M02.L03 · Formula di De Moivre e forma esponenziale · 15 min
Prerequisiti: V2.M02.L02, V2.M01.L04
- Abilità V2.M02.A03: potenze di numeri complessi; passaggio alla forma esponenziale.
- Termini: formula-di-eulero, forma-esponenziale
- Teorema V2.M02.T03 Formula di De Moivre — dim. (per induzione)

#### V2.M02.L04 · Radici n-esime · 20 min
Prerequisiti: V2.M02.L03
- Abilità V2.M02.A04: radici n-esime in forma trigonometrica e, quando si può, algebrica.
- Termini: radice-n-esima-complessa
- Teorema V2.M02.T04 Un numero complesso non nullo ha esattamente n radici n-esime distinte — dim.

#### V2.M02.L05 · Equazioni in campo complesso · 15 min
Prerequisiti: V2.M02.L04
- Abilità V2.M02.A05: equazioni di secondo grado e binomie in ℂ.
- Termini: molteplicita-di-una-radice
- Teorema V2.M02.T05 Teorema fondamentale dell'algebra — enunciato (dimostrazione fuori dal programma del corso)
- Teorema V2.M02.T06 Le radici non reali di un polinomio a coefficienti reali vengono in coppie coniugate — dim.

## V2.M03 Successioni

Stato: proposta.

#### V2.M03.L01 · Successioni e limite · 20 min
Prerequisiti: V2.M01.L02, V1.M08.L01
- Abilità V2.M03.A02: verificare un limite con la definizione (da quale indice in poi |aₙ − ℓ| < ε).
- Termini: successione, termine-generale, definitivamente, limite-di-una-successione, successione-convergente, successione-divergente, successione-irregolare, successione-limitata
- Teorema V2.M03.T01 Unicità del limite — dim.
- Teorema V2.M03.T02 Una successione convergente è limitata — dim.

#### V2.M03.L02 · Calcolo dei limiti di successioni · 20 min
Prerequisiti: V2.M03.L01
- Abilità V2.M03.A01: limiti di successioni (forme indeterminate, gerarchia degli infiniti, fattori oscillanti, forma 1^∞). **Esiste**: `V2.M03.A01.g1`.
- Termini: successione-infinitesima, forma-indeterminata, gerarchia-degli-infiniti
- Teorema V2.M03.T03 Algebra dei limiti (somma, prodotto, quoziente, casi con ∞) — dim. per somma e prodotto
- Teorema V2.M03.T04 Una successione limitata per una infinitesima è infinitesima — dim.
- Il limite (1 + a/n)^(bn) → e^(ab), che il livello 3 del generatore usa, è dato qui come limite notevole e dimostrato in L05 (T09, T10).

#### V2.M03.L03 · Teoremi del confronto · 15 min
Prerequisiti: V2.M03.L02
- Abilità V2.M03.A03: limiti con il teorema dei carabinieri e con il confronto.
- Teorema V2.M03.T05 Permanenza del segno — dim.
- Teorema V2.M03.T06 Teorema dei carabinieri — dim.
- Teorema V2.M03.T07 Confronto per le successioni divergenti — dim.

#### V2.M03.L04 · Successioni monotone · 15 min
Prerequisiti: V2.M03.L03
- Abilità V2.M03.A04: studiare la monotonia di una successione e dedurne il limite.
- Termini: successione-monotona
- Teorema V2.M03.T08 Una successione monotona ha limite; se è limitata, converge — dim. (completezza)

#### V2.M03.L05 · Il numero e · 15 min
Prerequisiti: V2.M03.L04, V2.M01.L05
- Abilità V2.M03.A05: limiti della forma 1^∞ con (1 + a/n)ⁿ.
- Teorema V2.M03.T09 (1 + 1/n)ⁿ è crescente e limitata — dim. (binomio di Newton e Bernoulli)
- Teorema V2.M03.T10 (1 + a/n)ⁿ → eᵃ per ogni a reale — dim. per a intero; il caso generale segue da V2.M04.T09

#### V2.M03.L06 · Sottosuccessioni · 15 min
Prerequisiti: V2.M03.L04
- Abilità V2.M03.A06: mostrare che un limite non esiste con due sottosuccessioni.
- Termini: sottosuccessione
- Teorema V2.M03.T11 Le sottosuccessioni di una successione che ha limite hanno lo stesso limite — dim.
- Teorema V2.M03.T12 Teorema di Bolzano-Weierstrass — dim. (per bisezione; serve a V2.M05.T02)

## V2.M04 Limiti di funzioni

Stato: proposta.

#### V2.M04.L01 · Definizione di limite · 20 min
Prerequisiti: V2.M03.L03, V1.M08.L02
- Abilità V2.M04.A02: limiti, anche destro e sinistro, letti da un grafico e verificati con la definizione.
- Termini: intorno, punto-di-accumulazione, limite-di-una-funzione, limite-destro, limite-sinistro
- Teorema V2.M04.T01 Il limite esiste se e solo se il limite destro e il sinistro esistono e sono uguali — dim.
- Visualizzazione: VIS.limite-epsilon-delta

#### V2.M04.L02 · Teoremi sui limiti · 20 min
Prerequisiti: V2.M04.L01
- Abilità V2.M04.A03: limiti con il teorema del confronto (funzione limitata per infinitesima).
- Teorema V2.M04.T02 Teorema ponte: limiti di funzioni e limiti di successioni — dim.
- Teorema V2.M04.T03 Unicità del limite — dim. (dal ponte)
- Teorema V2.M04.T04 Permanenza del segno — dim.
- Teorema V2.M04.T05 Teorema del confronto — dim. (dal ponte)
- Teorema V2.M04.T06 Algebra dei limiti di funzioni — dim. (dal ponte)

#### V2.M04.L03 · Limiti notevoli e forme indeterminate · 20 min
Prerequisiti: V2.M04.L02, V1.M09.L05, V1.M10.L04
- Abilità V2.M04.A01: limiti notevoli e forme indeterminate, anche con limiti laterali. **Esiste**: `V2.M04.A01.g1`.
- Termini: limite-notevole
- Teorema V2.M04.T07 Limite della funzione composta — dim.
- Teorema V2.M04.T08 sin x / x → 1 per x → 0 — dim.
- Teorema V2.M04.T09 (1 + 1/x)ˣ → e per x → ±∞ — dim. (dalle successioni)
- Teorema V2.M04.T10 ln(1 + x)/x, (eˣ − 1)/x, ((1 + x)^α − 1)/x per x → 0 — dim.

#### V2.M04.L04 · Asintoti · 15 min
Prerequisiti: V2.M04.L03
- Abilità V2.M04.A04: asintoti verticali, orizzontali e obliqui.
- Termini: asintoto-verticale, asintoto-orizzontale, asintoto-obliquo

#### V2.M04.L05 · Infinitesimi, infiniti e o-piccolo · 20 min
Prerequisiti: V2.M04.L03
- Abilità V2.M04.A05: ordine di infinitesimo e di infinito; semplificare con gli o-piccolo.
- Termini: infinitesimo, infinito, ordine-di-infinitesimo, o-piccolo, funzioni-asintotiche
- Teorema V2.M04.T11 Algebra degli o-piccolo — dim.
- Teorema V2.M04.T12 Principio di sostituzione degli infinitesimi — dim.

## V2.M05 Continuità

Stato: proposta.

#### V2.M05.L01 · Funzioni continue · 15 min
Prerequisiti: V2.M04.L03
- Abilità V2.M05.A01: continuità in un punto, anche al variare di un parametro.
- Termini: funzione-continua
- Teorema V2.M05.T03 Somme, prodotti, quozienti e composte di funzioni continue sono continue — dim.
- Teorema V2.M05.T04 Le funzioni elementari sono continue nel loro dominio — dim. per polinomi, seno ed esponenziale; le inverse seguono da T07

#### V2.M05.L02 · Punti di discontinuità · 15 min
Prerequisiti: V2.M05.L01
- Abilità V2.M05.A02: classificare i punti di discontinuità.
- Termini: discontinuita-eliminabile, discontinuita-di-salto, discontinuita-di-seconda-specie

#### V2.M05.L03 · Teorema degli zeri · 15 min
Prerequisiti: V2.M05.L02, V2.M03.L04
- Abilità V2.M05.A03: esistenza di zeri in un intervallo; passi del metodo di bisezione.
- Termini: metodo-di-bisezione
- Teorema V2.M05.T01 Teorema degli zeri — dim. (in `src/riserva/`)

#### V2.M05.L04 · Teorema di Weierstrass · 15 min
Prerequisiti: V2.M05.L03, V2.M03.L06
- Abilità V2.M05.A04: dire se il teorema si applica; massimo e minimo assoluti.
- Termini: massimo-assoluto, minimo-assoluto
- Teorema V2.M05.T02 Teorema di Weierstrass — dim. (in `src/riserva/`)

#### V2.M05.L05 · Valori intermedi e funzioni inverse · 15 min
Prerequisiti: V2.M05.L04
- Abilità V2.M05.A05: immagine di una funzione continua su un intervallo.
- Teorema V2.M05.T05 Teorema dei valori intermedi — dim. (dal teorema degli zeri)
- Teorema V2.M05.T06 Una funzione continua e iniettiva su un intervallo è strettamente monotona — enunciato
- Teorema V2.M05.T07 L'inversa di una funzione continua e strettamente monotona su un intervallo è continua — enunciato

## V2.M06 Derivate

Stato: proposta.

#### V2.M06.L01 · Derivata: definizione e significato geometrico · 20 min
Prerequisiti: V2.M05.L01, V1.M12.L03
- Abilità V2.M06.A01: derivata con il rapporto incrementale; retta tangente in un punto.
- Termini: rapporto-incrementale, derivata, funzione-derivabile, retta-tangente-al-grafico
- Teorema V2.M06.T04 Una funzione derivabile in un punto è continua in quel punto — dim.
- Visualizzazione: VIS.secante-tangente

#### V2.M06.L02 · Derivate delle funzioni elementari · 15 min
Prerequisiti: V2.M06.L01, V2.M04.L03
- Abilità V2.M06.A02: derivate fondamentali e linearità.
- Teorema V2.M06.T05 Derivate di xⁿ, sin x, cos x, eˣ, ln x — dim. (dai limiti notevoli)
- Teorema V2.M06.T06 Linearità della derivata — dim.

#### V2.M06.L03 · Regole di derivazione · 20 min
Prerequisiti: V2.M06.L02
- Abilità V2.M06.A03: derivate con prodotto, quoziente e funzione composta. **Esiste**: `V2.M06.A03.g1`.
- Teorema V2.M06.T07 Derivata del prodotto e del quoziente — dim.
- Teorema V2.M06.T08 Derivata della funzione composta — dim.

#### V2.M06.L04 · Derivata dell'inversa e derivate successive · 15 min
Prerequisiti: V2.M06.L03, V2.M05.L05, V1.M10.L05
- Abilità V2.M06.A04: derivate di arcoseno, arcotangente, aˣ, logₐ x; derivate seconde.
- Termini: derivata-seconda, derivate-successive
- Teorema V2.M06.T09 Derivata della funzione inversa — dim.

#### V2.M06.L05 · Punti di non derivabilità · 15 min
Prerequisiti: V2.M06.L03
- Abilità V2.M06.A05: punti angolosi, cuspidi, flessi a tangente verticale.
- Termini: derivata-destra, derivata-sinistra, punto-angoloso, cuspide, flesso-a-tangente-verticale

#### V2.M06.L06 · Teoremi di Fermat e di Rolle · 15 min
Prerequisiti: V2.M06.L05, V2.M05.L04
- Abilità V2.M06.A06: verificare le ipotesi di Rolle e trovare il punto.
- Termini: punto-di-massimo-relativo, punto-di-minimo-relativo, punto-stazionario
- Teorema V2.M06.T01 Teorema di Fermat — dim. (in `src/riserva/`)
- Teorema V2.M06.T02 Teorema di Rolle — dim. (in `src/riserva/`)

#### V2.M06.L07 · Teorema di Lagrange e conseguenze · 20 min
Prerequisiti: V2.M06.L06
- Abilità V2.M06.A07: punto di Lagrange; monotonia dal segno della derivata.
- Teorema V2.M06.T03 Teorema di Lagrange — dim. (in `src/riserva/`)
- Teorema V2.M06.T10 Una funzione con derivata nulla su un intervallo è costante — dim.
- Teorema V2.M06.T11 Criterio di monotonia — dim.

#### V2.M06.L08 · Teorema di Cauchy e regola di de l'Hôpital · 20 min
Prerequisiti: V2.M06.L07
- Abilità V2.M06.A08: limiti con de l'Hôpital, controllando le ipotesi.
- Teorema V2.M06.T12 Teorema di Cauchy — dim.
- Teorema V2.M06.T13 Regola di de l'Hôpital — dim. per 0/0 in un punto finito; enunciato negli altri casi

## V2.M07 Studio di funzione

Stato: proposta.

#### V2.M07.L01 · Massimi e minimi relativi · 15 min
Prerequisiti: V2.M06.L07
- Abilità V2.M07.A01: estremi relativi dal segno della derivata prima.
- Teorema V2.M07.T01 Test della derivata prima — dim.

#### V2.M07.L02 · Massimi e minimi assoluti, ottimizzazione · 20 min
Prerequisiti: V2.M07.L01
- Abilità V2.M07.A02: massimo e minimo assoluti su un intervallo chiuso.
- Abilità V2.M07.A03: problemi di ottimizzazione.

#### V2.M07.L03 · Convessità e flessi · 20 min
Prerequisiti: V2.M07.L02, V2.M06.L04
- Abilità V2.M07.A04: intervalli di convessità e punti di flesso.
- Termini: funzione-convessa, funzione-concava, punto-di-flesso
- Teorema V2.M07.T02 Convessità e segno della derivata seconda — dim.
- Teorema V2.M07.T03 Test della derivata seconda per gli estremi — dim.

#### V2.M07.L04 · Studio completo di una funzione · 20 min
Prerequisiti: V2.M07.L03, V2.M04.L04
- Abilità V2.M07.A05: studio di funzioni razionali e irrazionali, dal dominio al grafico (servono i grafici statici del motore).
- Termini: tabella-di-variazione

#### V2.M07.L05 · Studio di funzioni trascendenti · 20 min
Prerequisiti: V2.M07.L04
- Abilità V2.M07.A06: studio con esponenziali, logaritmi e valori assoluti.

#### V2.M07.L06 · Quante soluzioni ha un'equazione · 15 min
Prerequisiti: V2.M07.L05
- Abilità V2.M07.A07: numero di soluzioni di f(x) = k al variare di k.

## V2.M08 Formula di Taylor

Stato: proposta.

#### V2.M08.L01 · Polinomio di Taylor e resto di Peano · 20 min
Prerequisiti: V2.M06.L08, V2.M04.L05
- Abilità V2.M08.A02: polinomio di Taylor dalle derivate in un punto.
- Termini: polinomio-di-taylor, polinomio-di-mac-laurin, resto-di-peano
- Teorema V2.M08.T01 Formula di Taylor con resto di Peano — dim. (de l'Hôpital ripetuto)
- Visualizzazione: VIS.taylor

#### V2.M08.L02 · Sviluppi notevoli · 20 min
Prerequisiti: V2.M08.L01
- Abilità V2.M08.A03: sviluppi di funzioni composte e di prodotti fino a un ordine dato.
- Teorema V2.M08.T02 Sviluppi di eˣ, sin x, cos x, ln(1 + x), (1 + x)^α — dim. (dalla T01); lo sviluppo di arctan x è enunciato

#### V2.M08.L03 · Sviluppi di Taylor nel calcolo dei limiti · 20 min
Prerequisiti: V2.M08.L02
- Abilità V2.M08.A01: limiti con gli sviluppi, anche di prodotti. **Esiste**: `V2.M08.A01.g1`.
- Termini: parte-principale

#### V2.M08.L04 · Resto di Lagrange e approssimazioni · 15 min
Prerequisiti: V2.M08.L02, V2.M06.L08
- Abilità V2.M08.A04: stimare l'errore di un'approssimazione.
- Termini: resto-di-lagrange
- Teorema V2.M08.T03 Formula di Taylor con resto di Lagrange — dim. (dal teorema di Cauchy)

#### V2.M08.L05 · Taylor e studio locale · 15 min
Prerequisiti: V2.M08.L03, V2.M07.L03
- Abilità V2.M08.A05: natura di un punto stazionario con le derivate successive.
- Teorema V2.M08.T04 Criterio delle derivate successive — dim.

## V2.M09 Integrali

Stato: proposta.

#### V2.M09.L01 · Integrale di Riemann · 20 min
Prerequisiti: V2.M01.L02, V2.M05.L04
- Abilità V2.M09.A03: somme inferiori e superiori di funzioni semplici; integrali da aree note.
- Termini: partizione, somma-inferiore, somma-superiore, funzione-integrabile, integrale-definito
- Teorema V2.M09.T01 Le funzioni monotone su [a; b] sono integrabili — dim.
- Teorema V2.M09.T02 Le funzioni continue su [a; b] sono integrabili — enunciato (serve la continuità uniforme, che il programma non fa)
- Visualizzazione: VIS.riemann

#### V2.M09.L02 · Proprietà dell'integrale e teorema della media · 15 min
Prerequisiti: V2.M09.L01
- Abilità V2.M09.A04: valor medio di una funzione su un intervallo.
- Termini: valor-medio-integrale
- Teorema V2.M09.T03 Linearità, additività e monotonia dell'integrale — dim. della monotonia, enunciato il resto
- Teorema V2.M09.T04 Teorema della media integrale — dim.

#### V2.M09.L03 · Funzione integrale e teorema fondamentale · 20 min
Prerequisiti: V2.M09.L02, V2.M06.L07
- Abilità V2.M09.A05: derivata di una funzione integrale, anche con estremi variabili.
- Termini: funzione-integrale, primitiva
- Teorema V2.M09.T05 Teorema fondamentale del calcolo integrale — dim.
- Teorema V2.M09.T06 Due primitive su un intervallo differiscono per una costante — dim.
- Teorema V2.M09.T07 Formula fondamentale del calcolo integrale — dim.

#### V2.M09.L04 · Integrali indefiniti e integrali immediati · 15 min
Prerequisiti: V2.M09.L03
- Abilità V2.M09.A06: primitive immediate e di f(ax + b).
- Termini: integrale-indefinito, costante-di-integrazione

#### V2.M09.L05 · Integrazione per sostituzione · 15 min
Prerequisiti: V2.M09.L04
- Abilità V2.M09.A07: integrali per sostituzione.
- Teorema V2.M09.T08 Formula di integrazione per sostituzione — dim.

#### V2.M09.L06 · Integrazione per parti · 15 min
Prerequisiti: V2.M09.L04
- Abilità V2.M09.A08: integrali per parti, anche ripetute e cicliche.
- Teorema V2.M09.T09 Formula di integrazione per parti — dim.

#### V2.M09.L07 · Integrazione delle funzioni razionali · 20 min
Prerequisiti: V2.M09.L05, V2.M09.L06, V1.M04.L07
- Abilità V2.M09.A01: integrali indefiniti con tutte le tecniche (fratti semplici, divisione, parti ripetute). **Esiste**: `V2.M09.A01.g1` (rimando da spostare qui).
- Termini: fratti-semplici

#### V2.M09.L08 · Integrali definiti e aree · 20 min
Prerequisiti: V2.M09.L07
- Abilità V2.M09.A02: integrali definiti, anche con cambio degli estremi. **Esiste**: `V2.M09.A02.g1` (rimando da spostare qui).
- Abilità V2.M09.A09: area della regione tra due curve.

#### V2.M09.L09 · Studio della funzione integrale · 15 min
Prerequisiti: V2.M09.L08, V2.M07.L04
- Abilità V2.M09.A10: dominio, monotonia e limiti di una funzione integrale.

## V2.M10 Integrali impropri

Stato: proposta.

#### V2.M10.L01 · Integrali impropri · 20 min
Prerequisiti: V2.M09.L08, V2.M04.L03
- Abilità V2.M10.A02: integrali impropri calcolati con la definizione.
- Termini: integrale-improprio, integrale-convergente, integrale-divergente
- Teorema V2.M10.T01 Integrali di riferimento di 1/xᵖ, all'infinito e vicino a 0 — dim.

#### V2.M10.L02 · Criteri di convergenza · 20 min
Prerequisiti: V2.M10.L01, V2.M04.L05
- Abilità V2.M10.A01: convergenza con il criterio giusto. **Esiste**: `V2.M10.A01.g1`.
- Termini: integrale-assolutamente-convergente
- Teorema V2.M10.T02 Criterio del confronto — dim.
- Teorema V2.M10.T03 Criterio del confronto asintotico — dim.
- Teorema V2.M10.T04 La convergenza assoluta implica la convergenza — dim.

## V2.M11 Serie numeriche

Stato: proposta.

#### V2.M11.L01 · Serie numeriche · 20 min
Prerequisiti: V2.M03.L02
- Abilità V2.M11.A02: somma di serie geometriche e telescopiche.
- Termini: serie, somma-parziale, serie-convergente, serie-divergente, serie-indeterminata, serie-geometrica, serie-telescopica
- Teorema V2.M11.T01 Somma della serie geometrica — dim.
- Teorema V2.M11.T02 Condizione necessaria per la convergenza — dim.

#### V2.M11.L02 · Serie a termini positivi e confronto · 20 min
Prerequisiti: V2.M11.L01, V2.M03.L04
- Abilità V2.M11.A03: confronto e confronto asintotico.
- Termini: serie-a-termini-positivi, serie-armonica
- Teorema V2.M11.T03 Una serie a termini positivi converge o diverge — dim.
- Teorema V2.M11.T04 Criterio del confronto — dim.
- Teorema V2.M11.T05 Criterio del confronto asintotico — dim.
- Teorema V2.M11.T06 La serie armonica diverge — dim.

#### V2.M11.L03 · Criterio dell'integrale · 15 min
Prerequisiti: V2.M11.L02, V2.M10.L02
- Abilità V2.M11.A04: serie armonica generalizzata e serie con logaritmi.
- Termini: serie-armonica-generalizzata
- Teorema V2.M11.T07 Criterio dell'integrale — dim.
- Teorema V2.M11.T08 Convergenza della serie armonica generalizzata — dim.

#### V2.M11.L04 · Criteri del rapporto e della radice · 15 min
Prerequisiti: V2.M11.L02
- Abilità V2.M11.A05: serie con potenze, esponenziali e fattoriali (serve il fattoriale nel motore).
- Teorema V2.M11.T09 Criterio del rapporto — dim.
- Teorema V2.M11.T10 Criterio della radice — dim.

#### V2.M11.L05 · Serie a segni alterni e convergenza assoluta · 20 min
Prerequisiti: V2.M11.L03, V2.M11.L04
- Abilità V2.M11.A01: verdetto di convergenza con il criterio giusto. **Esiste**: `V2.M11.A01.g1` (rimando da spostare qui).
- Termini: serie-a-segni-alterni, serie-assolutamente-convergente
- Teorema V2.M11.T11 Criterio di Leibniz — dim.
- Teorema V2.M11.T12 Una serie assolutamente convergente converge — dim.

#### V2.M11.L06 · Serie di potenze (varia) · 20 min
Prerequisiti: V2.M11.L05
- Abilità V2.M11.A06: raggio e intervallo di convergenza.
- Termini: serie-di-potenze, raggio-di-convergenza
- Teorema V2.M11.T13 Esistenza del raggio di convergenza — dim.
- Teorema V2.M11.T14 Raggio di convergenza con il criterio del rapporto — dim.

## V2.M12 Equazioni differenziali

Stato: proposta.

#### V2.M12.L01 · Equazioni differenziali e variabili separabili · 20 min
Prerequisiti: V2.M09.L07
- Abilità V2.M12.A03: dire se una funzione data risolve un'equazione o un problema di Cauchy.
- Termini: equazione-differenziale, ordine-di-un-equazione-differenziale, integrale-generale, problema-di-cauchy, equazione-a-variabili-separabili
- Teorema V2.M12.T01 Esistenza e unicità per il problema di Cauchy — enunciato (la dimostrazione è di Analisi 2)

#### V2.M12.L02 · Equazioni lineari del primo ordine · 20 min
Prerequisiti: V2.M12.L01
- Abilità V2.M12.A01: equazioni del primo ordine (separabili e lineari) e problemi di Cauchy. **Esiste**: `V2.M12.A01.g1`.
- Termini: equazione-differenziale-lineare
- Teorema V2.M12.T02 Formula risolutiva delle equazioni lineari del primo ordine — dim.

#### V2.M12.L03 · Lineari del secondo ordine omogenee · 20 min
Prerequisiti: V2.M12.L02, V2.M02.L03
- Abilità V2.M12.A04: equazioni omogenee nei tre casi del discriminante.
- Termini: equazione-omogenea, equazione-caratteristica
- Teorema V2.M12.T03 Le soluzioni di un'equazione lineare omogenea del secondo ordine formano uno spazio di dimensione 2 — dim. della linearità; la dimensione segue da T01
- Teorema V2.M12.T04 Soluzioni nei tre casi del discriminante — dim.

#### V2.M12.L04 · Lineari del secondo ordine complete · 20 min
Prerequisiti: V2.M12.L03
- Abilità V2.M12.A02: equazioni complete (somiglianza, risonanza) e problemi di Cauchy. **Esiste**: `V2.M12.A02.g1`.
- Termini: soluzione-particolare, risonanza
- Teorema V2.M12.T05 Soluzione generale = soluzione dell'omogenea associata + una soluzione particolare — dim.

---

# Volume 3, Geometria e Algebra Lineare

Stesso rigore del Volume 2. I numeri complessi si richiamano da V2.M02 (unico prerequisito preso dal Volume 2, come da specifica, sezione 2).

## V3.M01 Vettori geometrici

Stato: proposta.

#### V3.M01.L01 · Vettori e operazioni · 20 min
Prerequisiti: V1.M12.L10, V1.M10.L03
- Abilità V3.M01.A01: somma, differenza, prodotto per uno scalare, in componenti nel piano e nello spazio.
- Termini: vettore-geometrico, modulo-di-un-vettore, versore, vettori-paralleli, componenti-di-un-vettore

#### V3.M01.L02 · Prodotto scalare · 15 min
Prerequisiti: V3.M01.L01, V1.M10.L13
- Abilità V3.M01.A02: prodotto scalare, angolo tra vettori, ortogonalità, proiezione.
- Termini: prodotto-scalare, vettori-ortogonali, proiezione-ortogonale-di-un-vettore
- Teorema V3.M01.T01 Il prodotto scalare in componenti è la somma dei prodotti delle componenti — dim. (teorema del coseno)

#### V3.M01.L03 · Prodotto vettoriale · 20 min
Prerequisiti: V3.M01.L02
- Abilità V3.M01.A03: prodotto vettoriale in componenti; area di un parallelogramma e di un triangolo.
- Termini: prodotto-vettoriale, regola-della-mano-destra
- Teorema V3.M01.T02 Il modulo del prodotto vettoriale è l'area del parallelogramma — dim.

#### V3.M01.L04 · Prodotto misto · 15 min
Prerequisiti: V3.M01.L03
- Abilità V3.M01.A04: volume di un parallelepipedo; vettori complanari.
- Termini: prodotto-misto, vettori-complanari
- Teorema V3.M01.T03 Il valore assoluto del prodotto misto è il volume del parallelepipedo — dim.

## V3.M02 Sistemi lineari e matrici

Stato: proposta.

#### V3.M02.L01 · Sistemi lineari e metodo di Gauss · 20 min
Prerequisiti: V1.M07.L03
- Abilità V3.M02.A01: risolvere un sistema con la riduzione a scala. **Esiste**: `V3.M02.A01.g1`.
- Termini: matrice, matrice-dei-coefficienti, matrice-completa, operazioni-elementari-sulle-righe, matrice-a-scala, pivot
- Teorema V3.M02.T01 Le operazioni elementari sulle righe trasformano un sistema in uno equivalente — dim.

#### V3.M02.L02 · Sistemi con infinite soluzioni o impossibili · 15 min
Prerequisiti: V3.M02.L01
- Abilità V3.M02.A02: soluzioni in forma parametrica di un sistema a scala; riconoscere i sistemi impossibili.
- Termini: variabile-libera

#### V3.M02.L03 · Operazioni tra matrici · 15 min
Prerequisiti: V3.M02.L01
- Abilità V3.M02.A03: somma, prodotto per uno scalare, trasposta.
- Termini: matrice-quadrata, matrice-nulla, matrice-identita, matrice-diagonale, matrice-triangolare, matrice-trasposta, matrice-simmetrica

#### V3.M02.L04 · Prodotto righe per colonne · 20 min
Prerequisiti: V3.M02.L03
- Abilità V3.M02.A04: prodotto tra matrici e tra matrice e vettore.
- Termini: prodotto-righe-per-colonne
- Teorema V3.M02.T02 Il prodotto è associativo e distributivo, ma non commutativo — dim. (controesempio per la commutatività)
- Teorema V3.M02.T03 (AB)ᵀ = BᵀAᵀ — dim.

#### V3.M02.L05 · Rango di una matrice · 15 min
Prerequisiti: V3.M02.L02, V3.M02.L04
- Abilità V3.M02.A05: rango con la riduzione a scala.
- Termini: rango
- Teorema V3.M02.T04 Il numero di pivot non dipende dalle operazioni elementari scelte — enunciato qui, dimostrato in V3.M04.L05 (V3.M04.T05)

#### V3.M02.L06 · Teorema di Rouché-Capelli · 20 min
Prerequisiti: V3.M02.L05
- Abilità V3.M02.A06: discutere un sistema al variare di un parametro.
- Termini: sistema-omogeneo, sistema-compatibile
- Teorema V3.M02.T05 Teorema di Rouché-Capelli, con il numero di parametri liberi — dim.

## V3.M03 Determinanti e matrice inversa

Stato: proposta.

#### V3.M03.L01 · Determinante e sviluppo di Laplace · 20 min
Prerequisiti: V3.M02.L04
- Abilità V3.M03.A01: determinante di ordine 2, 3 e 4 (sviluppo lungo la linea con più zeri). **Esiste**: `V3.M03.A01.g1`.
- Termini: determinante, minore, minore-complementare, complemento-algebrico
- Teorema V3.M03.T01 Lo sviluppo di Laplace dà lo stesso valore lungo qualunque riga o colonna — enunciato (la dimostrazione chiede le permutazioni, fuori dal programma comune)

#### V3.M03.L02 · Proprietà del determinante · 20 min
Prerequisiti: V3.M03.L01
- Abilità V3.M03.A02: determinante con le operazioni sulle righe; matrici triangolari; det(kA).
- Teorema V3.M03.T02 Effetto delle operazioni elementari sul determinante — dim. (dallo sviluppo di Laplace)
- Teorema V3.M03.T03 Il determinante di una matrice triangolare è il prodotto della diagonale — dim.
- Teorema V3.M03.T04 Teorema di Binet — enunciato

#### V3.M03.L03 · Matrice inversa · 20 min
Prerequisiti: V3.M03.L02
- Abilità V3.M03.A03: inversa di matrici 2×2 e 3×3 (con i complementi algebrici e con Gauss-Jordan).
- Termini: matrice-invertibile, matrice-inversa
- Teorema V3.M03.T05 Una matrice quadrata è invertibile se e solo se il determinante non è nullo — dim. (con Binet)
- Teorema V3.M03.T06 Formula dell'inversa con i complementi algebrici — dim.
- Teorema V3.M03.T07 (AB)⁻¹ = B⁻¹A⁻¹ — dim.

#### V3.M03.L04 · Regola di Cramer · 15 min
Prerequisiti: V3.M03.L03, V3.M02.L06
- Abilità V3.M03.A04: risolvere un sistema con la regola di Cramer.
- Termini: sistema-di-cramer
- Teorema V3.M03.T08 Regola di Cramer — dim.

#### V3.M03.L05 · Rango con i minori · 15 min
Prerequisiti: V3.M03.L04
- Abilità V3.M03.A05: rango con il metodo degli orlati, anche con un parametro.
- Termini: minore-orlato
- Teorema V3.M03.T09 Teorema degli orlati (di Kronecker) — enunciato

## V3.M04 Spazi vettoriali

Stato: proposta.

#### V3.M04.L01 · Spazi vettoriali · 20 min
Prerequisiti: V3.M02.L04, V3.M01.L01
- Abilità V3.M04.A01: riconoscere se un insieme con due operazioni è uno spazio vettoriale.
- Termini: spazio-vettoriale, vettore, spazio-rn

#### V3.M04.L02 · Sottospazi · 15 min
Prerequisiti: V3.M04.L01
- Abilità V3.M04.A02: riconoscere i sottospazi (anche di polinomi e matrici).
- Termini: sottospazio-vettoriale
- Teorema V3.M04.T01 Criterio di sottospazio — dim.
- Teorema V3.M04.T02 L'intersezione di due sottospazi è un sottospazio; l'unione in generale no — dim.

#### V3.M04.L03 · Combinazioni lineari e generatori · 15 min
Prerequisiti: V3.M04.L02, V3.M02.L06
- Abilità V3.M04.A03: dire se un vettore è combinazione lineare di altri; sistemi di generatori.
- Termini: combinazione-lineare, sottospazio-generato, sistema-di-generatori

#### V3.M04.L04 · Indipendenza lineare · 20 min
Prerequisiti: V3.M04.L03, V3.M02.L05
- Abilità V3.M04.A04: indipendenza lineare con il rango.
- Termini: vettori-linearmente-indipendenti, vettori-linearmente-dipendenti
- Teorema V3.M04.T03 Dei vettori sono dipendenti se e solo se uno è combinazione lineare degli altri — dim.

#### V3.M04.L05 · Basi e dimensione · 20 min
Prerequisiti: V3.M04.L04
- Abilità V3.M04.A05: base e dimensione di un sottospazio dato con generatori o con equazioni.
- Termini: base-di-uno-spazio-vettoriale, base-canonica, dimensione-di-uno-spazio-vettoriale
- Teorema V3.M04.T04 Tutte le basi di uno spazio hanno lo stesso numero di elementi — dim. (lemma dello scambio)
- Teorema V3.M04.T05 Il rango è la dimensione dello spazio generato dalle colonne e da quello generato dalle righe — dim.
- Teorema V3.M04.T06 Ogni insieme di vettori indipendenti si completa a una base — enunciato (dimostrazione corta, ma la si dà come esempio svolto)

#### V3.M04.L06 · Coordinate · 15 min
Prerequisiti: V3.M04.L05
- Abilità V3.M04.A06: coordinate di un vettore rispetto a una base.
- Termini: coordinate-rispetto-a-una-base
- Teorema V3.M04.T07 Le coordinate rispetto a una base sono uniche — dim.

#### V3.M04.L07 · Somma di sottospazi e formula di Grassmann · 20 min
Prerequisiti: V3.M04.L05
- Abilità V3.M04.A07: dimensione di somma e intersezione; somma diretta.
- Termini: somma-di-sottospazi, somma-diretta
- Teorema V3.M04.T08 Formula di Grassmann — dim.

## V3.M05 Applicazioni lineari

Stato: proposta.

#### V3.M05.L01 · Applicazioni lineari · 15 min
Prerequisiti: V3.M04.L06, V1.M08.L03
- Abilità V3.M05.A01: riconoscere un'applicazione lineare.
- Termini: applicazione-lineare
- Teorema V3.M05.T01 Un'applicazione lineare manda lo zero nello zero — dim.
- Teorema V3.M05.T02 Un'applicazione lineare è determinata dalle immagini di una base — dim.

#### V3.M05.L02 · Matrice associata · 20 min
Prerequisiti: V3.M05.L01
- Abilità V3.M05.A02: matrice associata nelle basi canoniche e in basi date.
- Termini: matrice-associata
- Teorema V3.M05.T03 Alla composizione di applicazioni corrisponde il prodotto delle matrici — dim.
- Visualizzazione: VIS.trasformazione-lineare

#### V3.M05.L03 · Nucleo e immagine · 20 min
Prerequisiti: V3.M05.L02
- Abilità V3.M05.A03: basi di nucleo e immagine.
- Termini: nucleo
- Teorema V3.M05.T04 Nucleo e immagine sono sottospazi — dim.
- Teorema V3.M05.T05 Un'applicazione lineare è iniettiva se e solo se il nucleo contiene solo lo zero — dim.

#### V3.M05.L04 · Teorema della dimensione · 15 min
Prerequisiti: V3.M05.L03
- Abilità V3.M05.A04: dimensioni di nucleo e immagine; iniettività e suriettività.
- Termini: isomorfismo
- Teorema V3.M05.T06 Teorema della dimensione (nullità più rango) — dim.
- Teorema V3.M05.T07 Un endomorfismo di uno spazio di dimensione finita è iniettivo se e solo se è suriettivo — dim. (dalla T06)

#### V3.M05.L05 · Cambiamento di base · 20 min
Prerequisiti: V3.M05.L04, V3.M03.L03
- Abilità V3.M05.A05: matrice del cambiamento di base; matrice associata in una nuova base.
- Termini: matrice-del-cambiamento-di-base, matrici-simili
- Teorema V3.M05.T08 Matrici associate alla stessa applicazione in basi diverse sono simili: B = P⁻¹AP — dim.

## V3.M06 Autovalori e diagonalizzazione

Stato: proposta.

#### V3.M06.L01 · Autovalori e autovettori · 20 min
Prerequisiti: V3.M05.L05
- Abilità V3.M06.A01: verificare se un vettore è autovettore; autovalori di matrici 2×2.
- Termini: autovalore, autovettore, autospazio
- Visualizzazione: VIS.autovettori

#### V3.M06.L02 · Polinomio caratteristico · 20 min
Prerequisiti: V3.M06.L01, V1.M04.L07
- Abilità V3.M06.A02: autovalori e autospazi di matrici 3×3.
- Termini: polinomio-caratteristico
- Teorema V3.M06.T01 λ è autovalore se e solo se det(A − λI) = 0 — dim.
- Teorema V3.M06.T02 Matrici simili hanno lo stesso polinomio caratteristico — dim. (con Binet)

#### V3.M06.L03 · Molteplicità algebrica e geometrica · 15 min
Prerequisiti: V3.M06.L02, V2.M02.L05
- Abilità V3.M06.A03: molteplicità algebrica e geometrica di ogni autovalore.
- Termini: molteplicita-algebrica, molteplicita-geometrica
- Teorema V3.M06.T03 1 ≤ molteplicità geometrica ≤ molteplicità algebrica — dim.
- Teorema V3.M06.T04 Autovettori di autovalori distinti sono linearmente indipendenti — dim.

#### V3.M06.L04 · Diagonalizzazione · 20 min
Prerequisiti: V3.M06.L03
- Abilità V3.M06.A04: decidere se una matrice è diagonalizzabile e trovare P e D.
- Termini: matrice-diagonalizzabile
- Teorema V3.M06.T05 Criterio di diagonalizzabilità — dim.
- Teorema V3.M06.T06 Una matrice n×n con n autovalori distinti è diagonalizzabile — dim. (corollario)

#### V3.M06.L05 · Potenze di una matrice · 15 min
Prerequisiti: V3.M06.L04
- Abilità V3.M06.A05: calcolare Aⁿ con la diagonalizzazione.
- Teorema V3.M06.T07 Aⁿ = P·Dⁿ·P⁻¹ — dim.

## V3.M07 Prodotto scalare e ortogonalità

Stato: proposta.

#### V3.M07.L01 · Prodotto scalare in ℝⁿ · 15 min
Prerequisiti: V3.M04.L05, V3.M01.L02
- Abilità V3.M07.A01: norma, distanza, angolo e ortogonalità in ℝⁿ.
- Termini: prodotto-scalare-euclideo, norma
- Teorema V3.M07.T01 Disuguaglianza di Cauchy-Schwarz — dim.
- Teorema V3.M07.T02 Disuguaglianza triangolare per la norma — dim.

#### V3.M07.L02 · Basi ortonormali e proiezioni · 20 min
Prerequisiti: V3.M07.L01
- Abilità V3.M07.A02: proiezione ortogonale su un sottospazio; complemento ortogonale.
- Termini: base-ortogonale, base-ortonormale, complemento-ortogonale, proiezione-su-un-sottospazio
- Teorema V3.M07.T03 Vettori non nulli a due a due ortogonali sono indipendenti — dim.
- Teorema V3.M07.T04 Coordinate in una base ortonormale come prodotti scalari — dim.

#### V3.M07.L03 · Procedimento di Gram-Schmidt · 15 min
Prerequisiti: V3.M07.L02
- Abilità V3.M07.A03: base ortonormale di un sottospazio con Gram-Schmidt.
- Teorema V3.M07.T05 Il procedimento di Gram-Schmidt produce una base ortonormale dello stesso sottospazio — dim.

#### V3.M07.L04 · Matrici ortogonali · 15 min
Prerequisiti: V3.M07.L03, V3.M03.L03
- Abilità V3.M07.A04: riconoscere matrici ortogonali; rotazioni e simmetrie del piano.
- Termini: matrice-ortogonale
- Teorema V3.M07.T06 Una matrice è ortogonale se e solo se le sue colonne sono una base ortonormale, se e solo se conserva il prodotto scalare — dim.
- Teorema V3.M07.T07 Il determinante di una matrice ortogonale vale ±1 — dim.

#### V3.M07.L05 · Teorema spettrale · 20 min
Prerequisiti: V3.M07.L04, V3.M06.L04, V2.M02.L01
- Abilità V3.M07.A05: diagonalizzare una matrice simmetrica con una base ortonormale.
- Termini: matrice-ortogonalmente-diagonalizzabile
- Teorema V3.M07.T08 Gli autovalori di una matrice simmetrica reale sono reali — dim. (con i numeri complessi)
- Teorema V3.M07.T09 Autovettori di autovalori distinti di una matrice simmetrica sono ortogonali — dim.
- Teorema V3.M07.T10 Teorema spettrale — dim. per le matrici 2×2; enunciato nel caso generale (l'induzione sulla dimensione supera i 20 minuti)

## V3.M08 Geometria analitica dello spazio

Stato: proposta.

#### V3.M08.L01 · Rette nello spazio · 20 min
Prerequisiti: V3.M01.L03, V1.M12.L10
- Abilità V3.M08.A01: equazioni parametriche e cartesiane di una retta.
- Termini: vettore-direttore, equazioni-parametriche-della-retta

#### V3.M08.L02 · Piani nello spazio · 20 min
Prerequisiti: V3.M08.L01, V3.M02.L06
- Abilità V3.M08.A02: equazione di un piano per tre punti o per un punto con vettore normale dato.
- Termini: vettore-normale, equazione-cartesiana-del-piano
- Teorema V3.M08.T01 Ogni equazione ax + by + cz = d con (a, b, c) ≠ 0 rappresenta un piano di vettore normale (a, b, c) — dim.

#### V3.M08.L03 · Posizioni reciproche · 20 min
Prerequisiti: V3.M08.L02
- Abilità V3.M08.A03: posizioni reciproche di rette e piani (con Rouché-Capelli).
- Termini: fascio-di-piani

#### V3.M08.L04 · Distanze · 20 min
Prerequisiti: V3.M08.L03
- Abilità V3.M08.A04: distanza punto-piano, punto-retta, tra rette sghembe.
- Teorema V3.M08.T02 Formula della distanza di un punto da un piano — dim.

#### V3.M08.L05 · Angoli · 15 min
Prerequisiti: V3.M08.L03
- Abilità V3.M08.A05: angoli tra due rette, tra retta e piano, tra due piani.

## V3.M09 Coniche

Stato: proposta.

#### V3.M09.L01 · Coniche e matrici · 20 min
Prerequisiti: V1.M12.L09, V3.M07.L05
- Abilità V3.M09.A01: matrice associata a una conica; coniche degeneri.
- Termini: matrice-associata-a-una-conica, conica-degenere

#### V3.M09.L02 · Classificazione delle coniche · 20 min
Prerequisiti: V3.M09.L01
- Abilità V3.M09.A02: classificare una conica dai determinanti (anche con un parametro).
- Termini: invarianti-ortogonali
- Teorema V3.M09.T01 Classificazione delle coniche con gli invarianti — dim. (dal teorema spettrale)

#### V3.M09.L03 · Forma canonica · 20 min
Prerequisiti: V3.M09.L02
- Abilità V3.M09.A03: rotazione e traslazione fino alla forma canonica; centro e assi.
- Termini: forma-canonica-di-una-conica, centro-di-una-conica

#### V3.M09.L04 · Quadriche (varia) · 20 min
Prerequisiti: V3.M09.L03, V3.M08.L02
- Abilità V3.M09.A04: riconoscere una quadrica dalla forma canonica.
- Termini: quadrica, ellissoide, iperboloide, paraboloide

---

# Riepilogo e note

## Numeri

| Volume | Moduli | Lezioni | Abilità | Termini | Teoremi (dimostrati) |
| --- | --- | --- | --- | --- | --- |
| V1 Fondamenta | 14 | 118 | 123 | 294 | 75 (66) |
| V2 Analisi 1 | 12 | 66 | 68 | 123 | 97 (91) |
| V3 Geometria e Algebra Lineare | 9 | 46 | 46 | 88 | 53 (48) |
| **Totale** | **35** | **230** | **237** | **505** | **225 (205)** |

Con una lezione nuova al giorno sono circa 230 giorni di lezioni, più ripasso ed esercizi.

Controlli fatti sulla scaletta (con uno script, fuori dal repository): codici di lezione, abilità e teoremi unici; ogni prerequisito esiste, viene prima nel modulo o in un modulo precedente, e i Volumi 2 e 3 usano solo il Volume 1 (più V2.M02 per il Volume 3); termini del glossario unici e scritti con i trattini; durate tra 10 e 20 minuti; abilità e teoremi nel modulo della loro lezione.

## Che cosa serve prima di scrivere certi moduli

Dal motore e dall'app (punti ⚙ di `STATO.md`):

- **Parser**: numeri periodici (V1.M02.L05), notazione scientifica (V1.M03.L07), gradi (V1.M10.L01), fattoriale (V1.M13.L01, V2.M11.L04).
- **Risposta `ordering`** nella schermata di esercizio: serve alle abilità sulle dimostrazioni e sui passi di un procedimento (V1.M11.A08, V2.M01.A04) e alle dimostrazioni interattive.
- **Grafici statici**: V1.M08 (grafici e trasformazioni), V2.M07 (studio di funzione).
- **Nodi per successioni e somme**: V2.M01.L04 (sommatorie), V2.M03, V2.M11.
- **Risposte `matrix` con elementi complessi**: V3.M06 (autovalori complessi), V3.M07.L05.
- **Vettori nello spazio come risposta**: V3.M01, V3.M08 (risposta `matrix` a una colonna, che esiste già).

## Scelte da confermare (anche in `STATO.md`, «Decisioni da rivedere»)

1. **Rimandi spostati** di tre generatori: `V2.M09.A01.g1` → `V2.M09.L07`, `V2.M09.A02.g1` → `V2.M09.L08`, `V2.M11.A01.g1` → `V2.M11.L05` (motivi nella tabella in cima).
2. **Prerequisito in più per V1.M06.L04**: `V1.M05.L05` (equazioni fratte), perché `condizione-di-esistenza` nasca lungo la catena dei prerequisiti.
3. **Pitagora prima della sua dimostrazione**: V1.M10.L02 usa il teorema di Pitagora (noto dalla scuola media) per sin² + cos² = 1; la dimostrazione è in V1.M11.L04, che nell'ordine dei moduli viene dopo. Per lo stesso motivo `circonferenza`, `raggio`, `angolo`, `triangolo-rettangolo`, `cateto`, `ipotenusa` nascono nel modulo di goniometria.
4. **Piano cartesiano in V1.M07.L04**: nasce con la lettura geometrica dei sistemi, perché serve già a funzioni (M08) e goniometria (M10), che vengono prima della geometria analitica (M12).
5. **Equazioni irrazionali e con valore assoluto in V1.M05** risolte con la verifica delle soluzioni: le disequazioni (M06) vengono dopo; il metodo con le condizioni torna in V1.M06.L06 e L07.
6. **Limite (1 + a/n)ⁿ → eᵃ usato in V2.M03.L02 e dimostrato in L05**: il generatore `V2.M03.A01.g1` lo usa al livello 3 e il suo rimando resta L02.
7. **Teoremi solo enunciati** (20): nel Volume 1 sono risultati di geometria che il TOL usa senza dimostrazione (criteri di congruenza e similitudine, Talete, Cavalieri, Eulero); negli altri volumi il motivo è scritto accanto. I principali: Laplace, Binet, teorema fondamentale dell'algebra, esistenza e unicità per Cauchy, integrabilità delle continue, teorema spettrale nel caso generale.
8. **Enti primitivi** (punto, retta, piano) senza voce di glossario.
9. **Ogni lezione ha almeno un'abilità**; sette lezioni ne hanno due, perché allenano due esercizi diversi.
10. **Abilità «misti» e abilità di tecnica**: in V2.M09 il generatore esistente `A01` (tutte le tecniche) è l'abilità della lezione che chiude il percorso; le lezioni delle singole tecniche hanno abilità proprie (`A06`-`A08`), da generatori più stretti.

