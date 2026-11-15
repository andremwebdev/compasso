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

<!-- SEGUE: VOLUME 2 -->
