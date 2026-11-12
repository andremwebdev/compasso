# Compasso — Specifica

Nov 11, 2026 · @Andrea Melis

## 0. Come leggere questo documento

Questa specifica dice **cosa** deve essere Compasso. Il **come** operativo (convenzioni di codice, procedure) sta in REGOLE.md, che nasce dalla sessione 1. Chi costruisce l'app legge prima questa specifica, poi REGOLE.md, poi STATO.md.

Compasso è un'app di studio della matematica, in italiano, per una sola persona: Andrea, 18 anni, quarta superiore AFM, che vuole entrare a Ingegneria Informatica al Politecnico di Milano. La costruiscono più modelli di Claude in sessioni separate: Fable 5.2 per le parti difficili, gli altri modelli per il resto.

**Regole di priorità**

1. In caso di conflitto sul *cosa*, vince questa specifica. Sul *come*, vince REGOLE.md.
2. Se qualcosa non è specificato, scegli l'opzione più semplice coerente con il resto. Annotala in STATO.md, nella sezione "Decisioni da rivedere", così Andrea la controlla.
3. Se una scelta è irreversibile o cambia il perimetro, non decidere da solo: scrivila in STATO.md come domanda aperta e prosegui con il resto.
4. Mai sacrificare la correttezza matematica per la velocità. Un esercizio sbagliato è peggio di un esercizio mancante.

**Termini usati in questa specifica**

| Termine | Significato |
| --- | --- |
| Volume | Uno dei tre blocchi di contenuto: Fondamenta, Analisi 1, Geometria e Algebra Lineare. |
| Modulo | Un capitolo di un volume (es. Disequazioni). |
| Lezione | Un'unità di studio da 10-20 minuti dentro un modulo. |
| Abilità | Un tipo di esercizio preciso (es. disequazioni fratte). È l'unità con cui si misura la padronanza. |
| Generatore | Il codice che crea esercizi sempre nuovi per un'abilità. |
| Seme | Il numero che determina un esercizio: stesso generatore, stesso seme, stesso livello = esercizio identico. |
| Risposta sbagliata prevista | Il risultato che si ottiene facendo un errore tipico preciso. Diventa un'opzione sbagliata nella scelta multipla e serve a riconoscere l'errore nelle risposte scritte. |
| Errore tipico | Una voce del catalogo unico degli errori, con un codice fisso. |
| Binario | Un percorso di lezioni in sequenza. Volume 1 = un binario; Volumi 2 e 3 = due binari che si alternano. |
| Fetta verticale | Un pezzo minimo ma completo dell'app che funziona dall'inizio alla fine (una lezione, i suoi esercizi, i progressi salvati). |
| Padronanza | Quanto Andrea domina un'abilità, espressa in quattro livelli. |

## 1. Obiettivo e perimetro

Compasso deve permettere ad Andrea di studiare la matematica dalle basi fino alla fine di Analisi 1 e di Geometria e Algebra Lineare **usando solo l'app**: teoria completa con dimostrazioni, esercizi sempre nuovi, ripasso e simulazioni del test d'ingresso. È un'app di matematica con una sezione test, non un'app per il test.

**Obiettivi misurabili**

1. **TOL anticipato con almeno 75/100.** Al Politecnico di Milano, 75 al penultimo anno dà l'immatricolazione senza graduatoria ai corsi in italiano. La sezione logica, matematica e statistica vale 65 punti su 100: è la parte che l'app copre.
2. **Primo semestre già visto.** Arrivare a Ingegneria Informatica avendo già studiato tutto il programma di Analisi Matematica 1 e di Geometria e Algebra Lineare, che al Poli sono entrambi al primo semestre.
3. **Uso quotidiano.** L'app deve rendere facile studiare ogni giorno da qui alla quinta superiore: la sessione Oggi conta quanto i contenuti.

**Cosa copre**

- **Volume 1, Fondamenta**: tutta la matematica del TOL, dalle basi (frazioni comprese).
- **Volume 2, Analisi 1**: teoria completa con dimostrazioni ed esercizi.
- **Volume 3, Geometria e Algebra Lineare**: teoria completa con dimostrazioni ed esercizi.
- **Sezione Test**: simulazioni della sezione di matematica del TOL e mini-test di modulo.
- **Funzioni oltre il nucleo**: dimostrazioni interattive, tastiera matematica, flashcard nel ripasso a intervalli, diario statistico degli errori, glossario, 11 visualizzazioni interattive.
- **Due versioni** dallo stesso codice: telefono (app installabile nella schermata Home, offline) e PC (file unico da aprire con doppio clic).

**Cosa è fuori, per ora**

- **Fisica e Analisi 2**: fuori, ma la struttura (volumi, codici, motore) deve poterle accogliere senza riscritture.
- **Funzioni escluse**: simulazione dell'esame universitario, risolutore libero di esercizi esterni, fogli stampabili, mappa dei prerequisiti navigabile, tutor AI, sincronizzazione su server, riconoscimento di foto o scrittura a mano, gamification pesante (punti, livelli, medaglie), versione come pagina su claude.ai.

**Contesto sul TOL**

- Quattro sezioni: logica, matematica e statistica (25 quesiti in 65 minuti, peso 2,6), comprensione verbale (5 in 10, peso 3), fisica (5 in 10, peso 2), inglese (30 in 15, peso 1/3). ([materie](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/tol-test-on-line/materie-del-tol), [punteggio](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/tol-test-on-line/come-prepararsi-al-tol/il-punteggio-del-tol))
- Punteggio per quesito: +1 se esatto, −0,25 se sbagliato, 0 se non dato. Minimo per la graduatoria: 30/100.
- Il TOL anticipato si può sostenere al massimo due volte, una per finestra; con 75 o più non si può ripetere. Nel 2026 le finestre erano 11 marzo-31 maggio e 1 giugno-16 luglio; le date per l'anno di Andrea vanno verificate. ([TOL anticipato](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/quando-iscriversi-al-tol/calendario-demo-tol-a-distanza/tol-anticipato))

## 2. Programma

Tre volumi, 35 moduli, ordinati per prerequisiti: ogni modulo usa solo quelli che lo precedono (o moduli del Volume 1, per i Volumi 2 e 3). L'elenco delle lezioni di ogni modulo si progetta dopo, con gli altri modelli (vedi sezione 14).

**Fonti del programma.** Il Volume 1 segue il programma ufficiale del TOL più le basi che lo reggono. Per i Volumi 2 e 3 il programma ufficiale del Poli non è stato trovato online: sono costruiti sui programmi degli stessi corsi di ingegneria in altri atenei, che sul nucleo coincidono ([Analisi 1 Sapienza](https://www.sbai.uniroma1.it/sites/default/files/AM1prog12CFU_2021-22.pdf), [Analisi 1 Pisa](https://pagine.dm.unipi.it/berselli/dida/2024-25/Programma24-25.pdf), [Geometria e Algebra Tor Vergata](<https://www.mat.uniroma2.it/~gavarini/page-web_files/mat-didat_data/Geometria-Algebra_(INF)/programmi/Geo-Alg-PROG_2023-2024.pdf>), [Algebra Lineare e Geometria Padova](https://stem.elearning.unipd.it/mod/resource/view.php?id=747881)). I punti segnati "(varia)" li fanno alcuni professori e altri no: vanno inclusi comunque. All'iscrizione Andrea confronterà i volumi con il programma del suo professore.

### Volume 1, Fondamenta (V1)

1. **V1.M01 Insiemi e logica**: operazioni tra insiemi, proposizioni, connettivi, quantificatori, ipotesi e tesi, condizione necessaria e sufficiente, negazione, ragionamento per assurdo, errori di deduzione, locuzioni con valore logico ("se… allora", "per ogni", "esiste almeno un").
2. **V1.M02 Numeri**: naturali, interi, razionali, reali; divisibilità, scomposizione in fattori primi, MCD e mcm; rappresentazione in basi diverse dal 10; numeri periodici; razionali e irrazionali; ordinamento e confronto.
3. **V1.M03 Calcolo numerico**: frazioni (equivalenza, confronto, operazioni), potenze, radicali e razionalizzazione, notazione scientifica, arrotondamenti e stime, percentuali, disuguaglianze numeriche.
4. **V1.M04 Calcolo letterale**: monomi, polinomi, prodotti notevoli, divisione tra polinomi e regola di Ruffini, scomposizioni, MCD e mcm di polinomi, legame tra fattorizzazione e radici, frazioni algebriche.
5. **V1.M05 Equazioni**: primo e secondo grado, relazioni tra radici e coefficienti, grado superiore riconducibile, fratte, irrazionali, con valore assoluto, parametriche semplici, risolubilità in casi particolari.
6. **V1.M06 Disequazioni**: primo e secondo grado, studio del segno, fratte, sistemi di disequazioni, irrazionali, con valore assoluto.
7. **V1.M07 Sistemi**: lineari e di secondo grado, con lettura geometrica.
8. **V1.M08 Funzioni**: definizione, dominio, immagine, iniettività e suriettività, composizione, inversa, monotonia, parità, trasformazioni dei grafici, funzioni elementari (potenze, valore assoluto).
9. **V1.M09 Esponenziali e logaritmi**: funzioni, proprietà, equazioni e disequazioni.
10. **V1.M10 Goniometria e trigonometria**: gradi e radianti, circonferenza goniometrica, funzioni goniometriche, identità e formule, equazioni e disequazioni, risoluzione dei triangoli.
11. **V1.M11 Geometria euclidea**: piano e spazio, parallelismo e ortogonalità, triangoli, similitudine, teoremi di Pitagora ed Euclide, circonferenza e cerchio, poligoni e poliedri, sfera, costruzioni elementari, perimetri, aree, superfici e volumi.
12. **V1.M12 Geometria analitica**: punti e distanze, retta, circonferenza, parabola, ellisse, iperbole, luoghi geometrici, interpretazione geometrica di equazioni e sistemi, primo assaggio dello spazio (sfera, piani) come richiesto dal TOL.
13. **V1.M13 Combinatoria e probabilità**: permutazioni, disposizioni, combinazioni, probabilità calcolata con i conteggi.
14. **V1.M14 Statistica**: media, moda, mediana, varianza, deviazione standard, frequenze assolute e relative, percentuali e frequenze, diagrammi e istogrammi.

### Volume 2, Analisi 1 (V2)

1. **V2.M01 Numeri reali e induzione**: estremo superiore e inferiore, completezza, principio di induzione, binomio di Newton.
2. **V2.M02 Numeri complessi**: forma algebrica, trigonometrica ed esponenziale, formula di De Moivre, radici, equazioni, enunciato del teorema fondamentale dell'algebra.
3. **V2.M03 Successioni**: limiti, teoremi del confronto, successioni monotone, il numero e, sottosuccessioni.
4. **V2.M04 Limiti di funzioni**: definizioni, teoremi, limiti notevoli, forme indeterminate, asintoti, confronto tra infiniti e infinitesimi (o-piccolo).
5. **V2.M05 Continuità**: discontinuità, teorema degli zeri, teorema di Weierstrass, teorema dei valori intermedi.
6. **V2.M06 Derivate**: definizione, regole di calcolo, teoremi di Fermat, Rolle, Lagrange e Cauchy, regola di de l'Hôpital.
7. **V2.M07 Studio di funzione**: massimi e minimi, convessità, flessi, grafico completo.
8. **V2.M08 Formula di Taylor**: resto di Peano e di Lagrange, sviluppi notevoli, uso nei limiti.
9. **V2.M09 Integrali**: integrale di Riemann, teorema della media, teorema fondamentale del calcolo, integrazione per parti e per sostituzione, funzioni razionali, funzione integrale.
10. **V2.M10 Integrali impropri**: criteri di convergenza.
11. **V2.M11 Serie numeriche**: geometrica e armonica, criteri del confronto, del rapporto, della radice e di Leibniz, convergenza assoluta; serie di potenze (varia).
12. **V2.M12 Equazioni differenziali**: primo ordine (a variabili separabili, lineari), secondo ordine lineari a coefficienti costanti, problema di Cauchy.

### Volume 3, Geometria e Algebra Lineare (V3)

1. **V3.M01 Vettori geometrici**: operazioni, prodotto scalare, vettoriale e misto.
2. **V3.M02 Sistemi lineari e matrici**: metodo di Gauss, operazioni tra matrici, rango, teorema di Rouché-Capelli.
3. **V3.M03 Determinanti e matrice inversa**: proprietà, sviluppo di Laplace, regola di Cramer.
4. **V3.M04 Spazi vettoriali**: sottospazi, combinazioni lineari, indipendenza lineare, basi, dimensione, coordinate, formula di Grassmann.
5. **V3.M05 Applicazioni lineari**: nucleo, immagine, teorema della dimensione, matrice associata, cambiamento di base.
6. **V3.M06 Autovalori e diagonalizzazione**: polinomio caratteristico, molteplicità algebrica e geometrica, criteri di diagonalizzabilità.
7. **V3.M07 Prodotto scalare e ortogonalità**: procedimento di Gram-Schmidt, proiezioni, matrici ortogonali, teorema spettrale.
8. **V3.M08 Geometria analitica dello spazio**: rette e piani, posizioni reciproche, distanze, angoli.
9. **V3.M09 Coniche**: classificazione con le matrici; quadriche (varia).

### Collegamenti tra volumi

Nessun doppione: un argomento si spiega in un posto solo e gli altri rimandano lì.

- **Funzioni in generale**: solo nel Volume 1 (V1.M08). Il Volume 2 rimanda.
- **Sistemi lineari**: le basi in V1.M07, la teoria completa in V3.M02.
- **Coniche**: le equazioni in V1.M12, la classificazione in V3.M09.
- **Numeri complessi**: solo in V2.M02; il Volume 3 li richiama.

### Regole sui prerequisiti

- Ogni lezione dichiara i suoi prerequisiti (codici di lezione).
- Le lezioni sono **libere**, mai bloccate: se mancano prerequisiti, l'app mostra un avviso con il link alle lezioni mancanti.
- La rete dei prerequisiti serve al controllo "Lo so già", al futuro test d'ingresso e allo strato adattivo.

## 3. Esperienza d'uso

Cinque sezioni nella barra in basso: **Oggi, Teoria, Esercizi, Test, Tu**. L'app è pensata prima per il telefono, poi per il PC.

### Primo avvio e "Lo so già"

- Ogni modulo ha un pulsante **"Lo so già"**: parte un controllo rapido di 5 esercizi sulle abilità del modulo.
- Superato il controllo, le abilità del modulo partono dal livello "consolidato" ed entrano nel ripasso normale. Se non lo supera, l'app mostra quali abilità hanno fallito e le lezioni da fare.
- Quando arriverà lo strato adattivo (fase 8 dell'ordine di costruzione), un test d'ingresso vero sostituirà questo controllo.

### Oggi: la sessione giornaliera

Andrea sceglie la durata **ogni giorno**, tra 20, 40 e 60 minuti (la più usata sarà 40). L'app riempie la sessione sempre in quest'ordine:

1. **Ripasso**: flashcard ed esercizi in scadenza nel ripasso a intervalli. Va per primo, a mente fresca.
2. **Lezione nuova**: la prossima lezione del binario del giorno.
3. **Esercizi sulla lezione**: sulle abilità appena viste, a difficoltà crescente.
4. **Punti deboli**: esercizi mirati sugli errori più frequenti del diario.
5. **Chiusura**: riepilogo (risultati, errori nuovi, serie di giorni) e promemoria del backup se dovuto.

**Taratura iniziale del tempo** (regolabile in REGOLE.md quando si avranno dati veri):

| Fase | 20 min | 40 min | 60 min |
| --- | --- | --- | --- |
| Ripasso | 5 | 8 | 10 |
| Lezione nuova | 9 | 16 | 22 |
| Esercizi sulla lezione | 4 | 9 | 15 |
| Punti deboli | 1 | 5 | 10 |
| Chiusura | 1 | 2 | 3 |

- **Lezioni riprendibili.** Una lezione si può interrompere a metà e riprendere dal blocco dove ci si era fermati. Se la lezione non sta nel tempo della sessione, continua il giorno dopo.
- **Binari.** Il Volume 1 è un binario unico. Analisi 1 e Geometria e Algebra Lineare sono due binari distinti. Se sono attivi più binari, la lezione nuova **alterna i binari giorno per giorno** (una sola lezione nuova al giorno). I binari attivi si scelgono nelle impostazioni.
- Se il binario del giorno non ha lezioni nuove (finito o tutto segnato "Lo so già"), il tempo della lezione passa agli esercizi.

### Teoria

Navigazione per volume → modulo → lezione, con lo stato di ogni lezione (non iniziata, in corso, completata). Ogni lezione contiene, in quest'ordine:

- **Obiettivo**: cosa saprai fare alla fine.
- **Spiegazione a blocchi brevi**, con le **domande lampo** tra un blocco e l'altro per controllare la comprensione.
- **Esempi svolti**.
- **Riquadri** per definizioni e teoremi, con la dimostrazione apribile sotto il teorema.
- **Riquadri "Attenzione"** sugli errori tipici dell'argomento.
- **Visualizzazione**, dove prevista.
- **Riepilogo finale** e flashcard della lezione.

I termini tecnici già spiegati in lezioni precedenti sono **toccabili**: un tocco apre la definizione del glossario, senza rispiegarla nel testo. Lezioni libere, con avviso se mancano prerequisiti.

### La schermata di esercizio

- **Tipi di risposta**: scelta multipla, numero, espressione scritta con la tastiera matematica, intervallo o insieme di soluzioni, vero o falso, riordino dei passaggi (dimostrazioni). Dettagli nella sezione 7.
- **Pulsante "Non lo so"**: conta come risposta non data. Allena a non tirare a indovinare.
- **Indizi progressivi**: due livelli. Usarli riduce il merito dell'esercizio nel calcolo della padronanza.
- **Dopo la risposta**:
  - giusta: conferma e avanti;
  - sbagliata e riconosciuta come errore tipico: l'app nomina l'errore, spiega perché è sbagliato e come evitarlo;
  - sbagliata e non riconosciuta: mostra la soluzione e registra "non classificato";
  - giusta come valore ma nella forma sbagliata (es. decimale invece della forma esatta): "valore giusto, ma serve la forma esatta", registrato come errore di forma.
- **Sempre disponibili dopo la risposta**: soluzione passo passo, "Esercizio simile" (stesso generatore, nuovo seme, stesso livello), "Torna alla lezione".
- **Etichetta "distrazione"**: Andrea può segnare un errore come distrazione. Conta comunque come errore per la padronanza, ma nel diario resta separato dagli errori di concetto.

In un angolo della schermata, in modo discreto, sono visibili codice del generatore, livello e seme: servono ad Andrea per segnalare un esercizio sbagliato.

### Esercizi

Tre schede: **Esercizi, Flashcard, Dimostrazioni**.

- Si sceglie argomento (volume, modulo, lezione o abilità), difficoltà (automatica oppure 1, 2, 3) e quantità.
- **Ripasso misto**: pesca da più moduli scelti, mescolando i tipi di esercizio. Allena a riconoscere che esercizio si ha davanti.
- Le flashcard compaiono anche da sole nel ripasso di Oggi; la scheda serve per ripassarle a scelta.

**Difficoltà automatica**: nuovo → livello 1, in apprendimento → livello 2, consolidato e padroneggiato → livello 3. Dopo due errori di fila il livello scende di uno; dopo tre risposte giuste di fila sale di uno.

### Test

Simulazione TOL, mini-test di modulo e storico dei punteggi. Dettagli nella sezione 8.

### Tu

- **Padronanza** per volume, modulo, lezione e abilità, in livelli (sezione 9).
- **Diario degli errori**: errori più frequenti per categoria e specifici, andamento nel tempo, separazione tra errori di concetto, di forma e distrazioni, pulsante "Allenati su questo" (sezione 5).
- **Serie di giorni** e giorni liberi usati nella settimana.
- **Impostazioni**: binari attivi, tema chiaro o scuro, durata predefinita proposta nella scelta di Oggi.
- **Backup**: esporta, importa, unisci (sezione 9).

## 4. Formato dei contenuti

Il formato dei contenuti è il contratto che tutti i modelli seguono. Le lezioni sono testo (Markdown), i generatori sono codice: così chi scrive una lezione non può rompere l'app, e Andrea può leggere e correggere le lezioni come documenti.

### Codici fissi

Ogni elemento ha un codice che **non si rinomina mai**: progressi, prerequisiti, collegamenti e diario puntano ai codici. Se un elemento si sposta, il codice resta.

| Elemento | Forma del codice | Esempio |
| --- | --- | --- |
| Modulo | V{volume}.M{nn} | V1.M06 |
| Lezione | V{v}.M{nn}.L{nn} | V1.M06.L04 |
| Abilità | V{v}.M{nn}.A{nn} | V1.M06.A04 |
| Generatore | codice abilità + .g{n} | V1.M06.A04.g1 |
| Definizione | V{v}.M{nn}.D{nn} | V2.M04.D01 |
| Teorema | V{v}.M{nn}.T{nn} | V2.M06.T03 |
| Flashcard manuale | V{v}.M{nn}.F{nn} | V2.M06.F05 |
| Errore tipico | CATEGORIA.NOME | DISEQ.VERSO\_NON\_INVERTITO |
| Termine del glossario | nome-con-trattini | segno-di-una-frazione |
| Visualizzazione | VIS.nome | VIS.circonferenza-goniometrica |

Di norma un'abilità ha un solo generatore; più generatori per la stessa abilità sono ammessi come varianti.

### Lezioni

- Un file Markdown per lezione, con formule in LaTeX. Durata **10-20 minuti**.
- **Intestazione** in cima: codice, titolo, prerequisiti (codici di lezione), durata stimata in minuti, abilità che la lezione introduce, termini del glossario che la lezione definisce.
- **Blocchi speciali** disponibili: definizione, teorema, dimostrazione, esempio svolto, domanda lampo, visualizzazione, attenzione (collegato a un codice di errore), flashcard manuale.
- **Domande lampo**: o scritte a mano nel file (testo, opzioni, risposta, spiegazione), o un riferimento a un generatore con un livello.

Sintassi proposta, che la sessione 1 può perfezionare e poi fissa in REGOLE.md:

```markdown
---
codice: V1.M06.L04
titolo: Disequazioni fratte
prerequisiti: [V1.M06.L03, V1.M04.L07]
durata: 15
abilita: [V1.M06.A04]
termini: [segno-di-una-frazione]
---

:::definizione{id=V1.M06.D02 termine=segno-di-una-frazione}
...
:::

:::teorema{id=V2.M06.T03 nome="Teorema di Lagrange"}
...
:::

:::dimostrazione{di=V2.M06.T03}
...
:::

:::attenzione{errore=DISEQ.SEGNO_DENOMINATORE}
...
:::

:::domanda{generatore=V1.M06.A04.g1 livello=1}
:::

:::visualizzazione{id=VIS.disequazioni-grafico}
:::

Testo con un rimando al glossario: [[segno-di-una-frazione]].
```

### Tono delle lezioni

- **Rigoroso ma informale**, dando del tu. Linguaggio matematico corretto, mai approssimativo.
- **Ogni termine tecnico si spiega alla prima comparsa**, senza dare nulla per scontato.
- **Un termine già spiegato non si rispiega**: si rimanda al glossario con un termine toccabile.
- Volumi 2 e 3: rigore universitario (definizioni precise, enunciati completi di ipotesi), con le stesse regole di spiegazione.
- Molti esempi, niente riempitivi.

### Glossario

- Ogni termine ha: codice, nome, definizione breve (1-2 frasi), lezione in cui nasce.
- Il termine si definisce **una sola volta**, nella lezione dove compare per la prima volta lungo i prerequisiti. Nelle lezioni successive diventa toccabile e apre la definizione.
- Regola per i modelli: prima di definire un termine, controllare il glossario. Se una lezione usa un termine non definito in nessuno dei suoi prerequisiti, lo definisce lei.

### Generatori

Codice TypeScript con uno schema fisso, che la sessione 1 traduce in tipi. Il generatore costruisce l'esercizio **all'indietro**: sceglie prima la soluzione, poi l'esercizio intorno, così i numeri sono puliti e la soluzione è garantita.

**Riceve**: livello di difficoltà (1, 2, 3) e seme.

**Restituisce sempre**:

- testo dell'esercizio (con formule);
- tipo di risposta (sezione 7);
- risposta giusta;
- modalità di valutazione: forma esatta oppure approssimazione con tolleranza dichiarata nel testo;
- vincoli di forma, se l'esercizio li richiede (es. "fattorizzata");
- **risposte sbagliate previste**, ognuna con il codice dell'errore tipico che la produce: diventano le opzioni sbagliate della scelta multipla e servono a riconoscere l'errore nelle risposte scritte;
- passaggi della soluzione;
- due indizi progressivi.

**Dichiara**: codice, abilità, lezione di riferimento, livelli supportati, codici di errore che può produrre.

**Regole**:

- Deterministico: stesso seme e stesso livello danno sempre lo stesso esercizio. Serve per segnalare problemi ("V1.M06.A04.g1, livello 2, seme 4821"), per i test automatici e per il ripasso.
- "Esercizio simile" = stesso generatore, seme nuovo, stesso livello.
- Ogni generatore deve superare la verifica automatica (sezione 12) prima di entrare nell'app.

**Livelli di difficoltà**, uguali per tutti i generatori: **1** = applicazione diretta, numeri semplici, uno o due passaggi; **2** = livello tipico di verifica e di TOL, più passaggi; **3** = casi particolari, parametri, più tecniche insieme, livello d'esame.

### Dimostrazioni interattive

- Una dimostrazione si scrive una volta come **elenco di passaggi**, ognuno con testo e giustificazione.
- Per almeno due passaggi si aggiungono una o due **versioni sbagliate**, ognuna con il motivo per cui è sbagliata.
- Da questo l'app ricava tre modalità:
  - **riordina**: passaggi mescolati da rimettere in ordine (alcuni passaggi possono essere marcati come fissi);
  - **trova lo sbagliato**: un passaggio è sostituito da una sua versione sbagliata;
  - **completa**: un passaggio è nascosto e va scelto tra la versione giusta e quelle sbagliate.
- La stessa sorgente alimenta sia la dimostrazione statica dentro la lezione sia la scheda Dimostrazioni.

### Flashcard

- **Automatiche**: ogni riquadro di definizione o teorema diventa una flashcard. Davanti: "Definisci …" o "Enuncia il teorema …"; dietro: l'enunciato.
- **Manuali**: si aggiungono nel file della lezione con un blocco apposito, per formule, ipotesi di un teorema, controesempi.
- Nessuna flashcard si scrive due volte.

## 5. Errori tipici

Un **catalogo unico** per tutta l'app, non uno per modulo: gli stessi errori tornano tra volumi diversi (le condizioni d'esistenza si dimenticano nelle equazioni come negli integrali), e solo un catalogo unico permette al diario di vederlo.

### Struttura di una voce

- **Codice** fisso, nella forma CATEGORIA.NOME.
- **Nome breve**, mostrato ad Andrea.
- **Categoria**.
- **Spiegazione**: perché è sbagliato e come evitarlo.
- **Esempio** concreto.
- **Lezione di riferimento** (finché le lezioni non esistono, il modulo).

Due livelli: categoria ed errore specifico. Il diario mostra entrambi.

### Categorie

CALC calcolo · ALG algebra · COND condizioni e domini · DISEQ disequazioni · LOG logica e lettura · FUNZ funzioni e grafici · TRIG trigonometria · GEO geometria · STAT combinatoria, probabilità e statistica · AN analisi · ALIN algebra lineare · FORMA forma della risposta.

### Come si riconosce un errore

- **Scelta multipla**: ogni opzione sbagliata è una risposta sbagliata prevista, con il suo codice.
- **Risposta scritta** (numero, espressione, intervallo): il motore confronta la risposta con quella giusta e, se non coincide, con tutte le risposte sbagliate previste. Se coincide con una di queste, l'errore è riconosciuto.
- **Valore giusto in forma sbagliata**: registrato come FORMA.DECIMALE o FORMA.NON\_RICHIESTA.
- **Nessuna corrispondenza**: registrato come NON\_CLASSIFICATO.
- **Etichetta "distrazione"**: messa da Andrea dopo la risposta. L'errore conta per la padronanza, ma il diario lo tiene separato.

### Diario degli errori

- Frequenza di ogni errore e di ogni categoria, **pesando di più quelli recenti** (proposta: peso che si dimezza ogni 30 giorni).
- Andamento: ultimi 30 giorni rispetto ai 30 precedenti (migliora, stabile, peggiora).
- Viste separate: errori di concetto, di forma, distrazioni.
- **"Allenati su questo"**: genera esercizi dai generatori che dichiarano quel codice di errore.
- Ogni voce porta alla lezione di riferimento.
- Gli errori più frequenti alimentano la fase "Punti deboli" di Oggi.

### Come cresce il catalogo

Chi crea un generatore può aggiungere errori nuovi, ma prima controlla che l'errore non esista già con un altro nome. Nessun doppione, nessun codice rinominato. La regola sta anche in REGOLE.md.

### Catalogo iniziale

| Codice | Nome | Perché è sbagliato | Rimanda a |
| --- | --- | --- | --- |
| CALC.MENO\_PARENTESI | Meno davanti a parentesi non distribuito | −(a−b) = −a+b, non −a−b | V1.M04 |
| CALC.PRECEDENZA | Ordine delle operazioni sbagliato | Prima potenze, poi prodotti e divisioni, poi somme | V1.M03 |
| CALC.MENO\_POTENZA | −a² confuso con (−a)² | −3² = −9, mentre (−3)² = 9 | V1.M03 |
| CALC.ESPONENTE\_NEGATIVO | a⁻ⁿ preso come −aⁿ | a⁻ⁿ = 1/aⁿ | V1.M03 |
| CALC.SOMMA\_FRAZIONI | Numeratori e denominatori sommati | a/b + c/d = (ad+bc)/(bd) | V1.M03 |
| CALC.PROPRIETA\_POTENZE | Proprietà delle potenze confuse | aᵐ·aⁿ = aᵐ⁺ⁿ, mentre (aᵐ)ⁿ = aᵐⁿ | V1.M03 |
| CALC.PERCENTUALI\_SUCCESSIVE | Percentuali successive sommate | +20% e poi −20% danno 1,2 × 0,8 = 0,96, non il valore iniziale | V1.M03 |
| CALC.PERIODICO | Frazione generatrice sbagliata | 0,1(6) = (16−1)/90 = 1/6 | V1.M02 |
| CALC.RAZIONALIZZAZIONE | Fattore razionalizzante sbagliato | 1/(√a+√b) si moltiplica per (√a−√b)/(√a−√b) | V1.M03 |
| CALC.SEGNO\_TRASPORTO | Segno non cambiato nel trasporto | Un termine che cambia membro cambia segno: x+5 = 2 dà x = −3 | V1.M05 |
| ALG.QUADRATO\_BINOMIO | (a+b)² = a²+b² | Manca il doppio prodotto 2ab | V1.M04 |
| ALG.RADICE\_SOMMA | √(a+b) = √a+√b | La radice non si distribuisce sulla somma | V1.M03 |
| ALG.SEMPLIFICAZIONE\_ADDENDI | Semplificati degli addendi | Si semplificano solo fattori: (x+2)/2 ≠ x+1 | V1.M04 |
| ALG.SOMMA\_QUADRATI | a²+b² scomposto | a²+b² non si scompone nei reali | V1.M04 |
| ALG.RUFFINI\_SEGNO | Ruffini con la radice di segno sbagliato | Dividendo per x−a si usa a, per x+a si usa −a | V1.M04 |
| ALG.MCD\_MCM | MCD e mcm scambiati | mcm: fattori comuni e non comuni con esponente massimo | V1.M04 |
| ALG.DIVISIONE\_PER\_INCOGNITA | Divisione per un'espressione che può valere zero | Dividendo per x si perde la soluzione x = 0 | V1.M05 |
| ALG.FORMULA\_RISOLUTIVA | Formula risolutiva con segni sbagliati | x = (−b ± √(b²−4ac))/(2a): errori tipici su −b e su 2a | V1.M05 |
| ALG.LOG\_SOMMA | log(a+b) = log a + log b | È log(ab) a valere log a + log b; log(a+b) non si spezza | V1.M09 |
| ALG.ESPONENZIALE\_SOMMA | aˣ⁺ʸ = aˣ + aʸ | aˣ⁺ʸ = aˣ · aʸ | V1.M09 |
| ALG.RACCOGLIMENTO | Raccoglimento con un termine non diviso | Ogni termine va diviso per il fattore raccolto: 6x²+9x = 3x(2x+3) | V1.M04 |
| ALG.SEGNI\_FATTORI | Segni sbagliati nei fattori | Radice r, fattore (x−r): x²−5x+6 = (x−2)(x−3) | V1.M04 |
| COND.DENOMINATORE | Denominatore nullo non escluso | Le soluzioni che annullano un denominatore vanno scartate | V1.M05 |
| COND.RADICE\_PARI | Condizione sul radicando dimenticata | Radice di indice pari: radicando ≥ 0 | V1.M05 |
| COND.SOLUZIONI\_ESTRANEE | Soluzioni estranee non controllate | Elevare al quadrato può aggiungere soluzioni: vanno verificate | V1.M05 |
| COND.LOGARITMO | Condizioni del logaritmo dimenticate | Argomento > 0; base > 0 e ≠ 1 | V1.M09 |
| COND.DOMINIO\_COMPOSTA | Dominio della composta guardando solo la funzione esterna | Serve x nel dominio di g e g(x) nel dominio di f | V1.M08 |
| DISEQ.VERSO\_NON\_INVERTITO | Verso non invertito | Moltiplicando o dividendo per un negativo il verso si inverte | V1.M06 |
| DISEQ.SEGNO\_DENOMINATORE | Moltiplicato per il denominatore | Il suo segno non è noto: si studia il segno di numeratore e denominatore | V1.M06 |
| DISEQ.UNIONE\_INTERSEZIONE | Unione e intersezione scambiate | Sistema: intersezione; prodotto o quoziente: tabella dei segni | V1.M06 |
| DISEQ.ESTREMI | Estremi inclusi o esclusi in modo sbagliato | Con ≤ si includono gli zeri del numeratore, mai quelli del denominatore | V1.M06 |
| DISEQ.SECONDO\_GRADO | Intervallo interno ed esterni scambiati | Con a > 0 e Δ > 0, ax²+bx+c > 0 vale fuori dalle radici | V1.M06 |
| DISEQ.VALORE\_ASSOLUTO | Valore assoluto risolto male | Con a > 0: \|x\| < a vale per −a < x < a; \|x\| > a per x < −a o x > a | V1.M06 |
| LOG.NEGAZIONE\_PER\_OGNI | Negazione di "per ogni" sbagliata | non(per ogni x vale P) = esiste un x per cui P non vale | V1.M01 |
| LOG.NECESSARIA\_SUFFICIENTE | Necessaria e sufficiente scambiate | In "se A allora B", A è sufficiente per B e B è necessaria per A | V1.M01 |
| LOG.INVERSA | Implicazione invertita | Da "se A allora B" non segue "se B allora A", né "se non A allora non B" | V1.M01 |
| LOG.DE\_MORGAN | Negazione di "e" e "o" sbagliata | non(A e B) = non A o non B; non(A o B) = non A e non B | V1.M01 |
| FUNZ.TRASLAZIONE\_ORIZZONTALE | Traslazione orizzontale al contrario | f(x+a) con a > 0 trasla verso sinistra | V1.M08 |
| FUNZ.INVERSA\_RECIPROCO | Inversa confusa con il reciproco | f⁻¹ è la funzione inversa, non 1/f | V1.M08 |
| FUNZ.ORDINE\_COMPOSIZIONE | Ordine della composizione scambiato | (f∘g)(x) = f(g(x)): prima g, poi f | V1.M08 |
| TRIG.GRADI\_RADIANTI | Gradi e radianti confusi | 180° = π radianti | V1.M10 |
| TRIG.PERIODICITA | Periodicità dimenticata | Le soluzioni si ripetono: + 2kπ (+ kπ per la tangente) | V1.M10 |
| TRIG.SOLUZIONI\_PERSE | Seconda soluzione nel periodo persa | sin x = a con \|a\| < 1 ha due soluzioni in \[0, 2π) | V1.M10 |
| TRIG.SOMMA\_ARGOMENTI | sin(a+b) = sin a + sin b | Servono le formule di addizione | V1.M10 |
| GEO.SIMILITUDINE | Aree e volumi scalati come le lunghezze | Con rapporto k: aree × k², volumi × k³ | V1.M11 |
| GEO.FORMULA\_SOLIDO | Formule di area o volume confuse | Es. volume del cono = (1/3)πr²h, non πr²h | V1.M11 |
| GEO.DISTANZA\_PUNTO\_RETTA | Distanza punto-retta calcolata male | Retta in forma implicita e valore assoluto al numeratore | V1.M12 |
| STAT.EVENTI\_NON\_DISGIUNTI | Probabilità dell'unione sommata | P(A∪B) = P(A)+P(B)−P(A∩B) | V1.M13 |
| STAT.ORDINE\_CONTA | Disposizioni e combinazioni scambiate | Ordine che conta: disposizioni; altrimenti combinazioni | V1.M13 |
| STAT.MEDIANA | Mediana senza ordinare i dati | Prima si ordinano i dati | V1.M14 |
| STAT.MEDIA\_PONDERATA | Media semplice al posto della ponderata | Con frequenze diverse ogni valore va pesato | V1.M14 |
| AN.COMPLESSI\_ARGOMENTO | Argomento nel quadrante sbagliato | arctan(b/a) va corretto quando a < 0 | V2.M02 |
| AN.FORMA\_INDETERMINATA | Forma indeterminata trattata come determinata | 1^∞ non vale 1; ∞−∞ non vale 0 | V2.M04 |
| AN.HOPITAL\_IPOTESI | de l'Hôpital senza ipotesi | Serve una forma 0/0 o ∞/∞, più le altre ipotesi del teorema | V2.M06 |
| AN.DERIVATA\_COMPOSTA | Derivata della composta senza catena | (f(g(x)))′ = f′(g(x)) · g′(x) | V2.M06 |
| AN.DERIVATA\_PRODOTTO | Derivata del prodotto sbagliata | (fg)′ = f′g + fg′ | V2.M06 |
| AN.DERIVATA\_QUOZIENTE | Derivata del quoziente sbagliata | (f/g)′ = (f′g − fg′)/g² | V2.M06 |
| AN.PUNTO\_CRITICO | Derivata nulla presa come estremo | f′(x₀) = 0 non garantisce un massimo o un minimo (x³ in 0) | V2.M07 |
| AN.TAYLOR\_ORDINE | Sviluppo troncato troppo presto | L'ordine va scelto per non perdere il termine dominante | V2.M08 |
| AN.COSTANTE\_INTEGRAZIONE | Costante di integrazione dimenticata | Un integrale indefinito è una famiglia di funzioni: + c | V2.M09 |
| AN.TERMINE\_GENERALE | Termine generale → 0 preso come prova di convergenza | È necessario, non sufficiente: la serie armonica diverge | V2.M11 |
| ALIN.PRODOTTO\_COMMUTATIVO | Prodotto di matrici trattato come commutativo | In generale AB ≠ BA | V3.M02 |
| ALIN.RANGO\_DIMENSIONE | Rango confuso con dimensione o numero di colonne | Il rango è la dimensione dello spazio generato dalle colonne | V3.M02 |
| ALIN.GAUSS\_TERMINE\_NOTO | Operazione sulle righe non applicata ai termini noti | Ogni operazione di Gauss vale per tutta la riga, termine noto compreso | V3.M02 |
| ALIN.DET\_SOMMA | det(A+B) = det A + det B | Il determinante non è additivo | V3.M03 |
| ALIN.DET\_MULTIPLO | det(kA) = k · det A | Per A di ordine n: det(kA) = kⁿ · det A | V3.M03 |
| ALIN.INVERSA\_PRODOTTO | (AB)⁻¹ = A⁻¹B⁻¹ | (AB)⁻¹ = B⁻¹A⁻¹ | V3.M03 |
| ALIN.DET\_SEGNI | Segni sbagliati nel determinante | Ordine 2: ad − bc; Laplace: segno (−1)^(i+j) | V3.M03 |
| ALIN.DET\_DIAGONALE | Determinante come prodotto della diagonale | Vale solo per le matrici triangolari | V3.M03 |
| ALIN.AUTOVETTORE\_NULLO | Vettore nullo preso come autovettore | Un autovettore è non nullo per definizione | V3.M06 |
| FORMA.DECIMALE | Decimale al posto della forma esatta | Se è richiesta la forma esatta: √2, non 1,414 | tutte |
| FORMA.NON\_RICHIESTA | Equivalente ma non nella forma richiesta | "Scomponi x²−1": serve (x−1)(x+1) | tutte |

Oltre al catalogo esistono due stati speciali, che non sono errori del catalogo: **NON\_CLASSIFICATO** (risposta sbagliata non riconosciuta) e l'etichetta **distrazione**.

## 6. Motore matematico

Il motore si progetta **una volta sola per l'intero perimetro** dei tre volumi, anche se alcune parti si implementano dopo. Questa sezione dice cosa deve fare; l'architettura interna (strutture dati, algoritmi, semplificazione) la decide chi lo costruisce, e la documenta.

### Cosa deve rappresentare

- **Numeri esatti**: interi, frazioni sempre ridotte, radicali (es. 3+2√5), π ed e come simboli, numeri complessi in forma algebrica, trigonometrica ed esponenziale. I decimali solo quando l'esercizio chiede un'approssimazione.
- **Espressioni**: polinomi in più variabili, frazioni algebriche, potenze e radici di qualsiasi indice, valore assoluto, esponenziali, logaritmi (base qualsiasi e naturale), funzioni goniometriche e inverse, composizioni.
- **Equazioni e disequazioni** come oggetti.
- **Insiemi di soluzioni**: intervalli aperti, chiusi e illimitati, unioni di intervalli, punti isolati, insieme vuoto, tutto ℝ, soluzioni periodiche (es. x = π/6 + 2kπ, con k intero).
- **Valori di limiti**: un numero, +∞, −∞, "non esiste".
- **Vettori e matrici** con elementi esatti (anche complessi dove serve).
- **Successioni e somme** in notazione con sommatoria, per mostrare termini generali e serie.

### Cosa deve fare

- **Aritmetica esatta** su tutti i numeri sopra, senza errori di arrotondamento.
- **Espandere** e **fattorizzare** polinomi (almeno con radici razionali, raccoglimenti e prodotti notevoli), **dividere** polinomi e applicare **Ruffini**, calcolare MCD e mcm di polinomi.
- **Semplificare quanto basta** per mostrare risultati puliti: frazioni ridotte, segni sistemati, coefficienti 1 nascosti, radicali portati in forma normale.
- **Derivare** in modo simbolico, con le regole di prodotto, quoziente e composizione.
- **Matrici**: somma, prodotto, trasposta, determinante, inversa, rango, riduzione di Gauss **con registrazione dei passaggi**; autovalori e autovettori almeno per le matrici costruite all'indietro dai generatori.
- **Numeri complessi**: operazioni, passaggio tra le tre forme, potenze, radici n-esime.
- **Operazioni sugli insiemi di soluzioni**: unione, intersezione, confronto.
- **Registrare i passaggi** delle procedure standard, per costruire le soluzioni passo passo: Gauss, Ruffini, scomposizioni, studio del segno, formula risolutiva.
- **Riconoscere risposte equivalenti**: valutare due espressioni in molti punti scelti a caso (ignorando quelli dove non sono definite), più confronti esatti dove possibile. Gli insiemi di soluzioni si confrontano per struttura (estremi, inclusione degli estremi, periodo).
- **Controllare la forma**, quando l'esercizio la richiede: fattorizzata, espansa, frazione ridotta, razionalizzata, forma algebrica a+bi, forma trigonometrica, intervallo scritto in forma canonica. L'equivalenza da sola non basta.
- **Generatore di numeri casuali con seme**, deterministico, usato da tutti i generatori.

### Cosa deve mostrare

- Ogni oggetto si trasforma in LaTeX, disegnato con KaTeX (caratteri incorporati, funziona offline).
- Sistemi con la graffa, matrici, **tabelle dei segni** per le disequazioni, tabelle di variazione per gli studi di funzione.
- Grafici semplici di funzioni (statici), riusabili da lezioni e soluzioni.
- **Convenzioni italiane**: virgola decimale (1,5); negli intervalli il separatore è il punto e virgola quando ci sono decimali (es. \[1,5; 3\]); punto di moltiplicazione · dove serve.

### Lettura di quello che scrive Andrea

- Un **parser tollerante** trasforma quello che Andrea scrive (con la tastiera matematica o, su PC, con la tastiera fisica) in un'espressione del motore.
- Moltiplicazione implicita: 2x vale 2·x, 2(x+1) vale 2·(x+1).
- Accetta virgola e punto come separatore decimale, e scritture testuali come sqrt(2), x^2, pi.
- Mostra in tempo reale l'anteprima disegnata di quello che si sta scrivendo, così gli errori di battitura si vedono prima di confermare.

### Cosa NON deve fare

- **Integrare da solo.** Gli integrali sono costruiti all'indietro: il generatore parte dalla primitiva. Per verificare una primitiva scritta da Andrea, il motore la **deriva** e controlla che sia equivalente alla funzione integranda.
- **Calcolare limiti qualsiasi**: i generatori li costruiscono conoscendo il risultato.
- **Dimostrare teoremi** o essere un sistema di calcolo simbolico universale.
- **Risolvere esercizi inseriti liberamente** (funzione esclusa, sezione 14).

### Vincoli

- Gira **offline** e **fluido su un iPhone XR**: generare un esercizio o controllare una risposta deve richiedere al massimo qualche decina di millisecondi.
- **Deterministico**: niente dipende dall'ora o da stati casuali non seminati.
- **Estendibile**: aggiungere in futuro la fisica (es. grandezze con unità di misura) e analisi 2 non deve richiedere di riscrivere il nucleo.
- Ogni parte del motore ha i suoi test automatici.

## 7. Risposte e valutazione

Lo standard è rigoroso: **forma esatta per default**, e ogni esercizio dichiara in modo esplicito come viene valutato.

### Tipi di risposta

| Tipo | Come risponde Andrea | Come si valuta |
| --- | --- | --- |
| Scelta multipla | Tocca un'opzione (4 o 5) | Opzione giusta; le sbagliate sono risposte sbagliate previste con codice di errore |
| Numero | Tastiera matematica | Valore esatto, o entro la tolleranza se è un'approssimazione |
| Espressione | Tastiera matematica | Equivalenza con la risposta giusta più eventuali vincoli di forma |
| Intervallo o insieme | Tastiera matematica, livello insiemi | Confronto di struttura: estremi, estremi inclusi o esclusi, unioni, periodo |
| Matrice o vettore | Griglia di caselle | Elemento per elemento, in forma esatta |
| Vero o falso | Due pulsanti | Diretto |
| Riordino | Trascinamento dei passaggi | Ordine giusto (con eventuali passaggi fissi) |

Nella simulazione TOL il numero di opzioni è quello del TOL vero, da verificare sulla Demo TOL del Politecnico.

### Forma esatta e approssimazione

- **Forma esatta** (il caso normale): si accetta solo la forma esatta. 1,414 non è √2: è un altro numero, e gli errori si accumulano nei passaggi successivi ((√2)² = 2, mentre 1,414² = 1,999396).
- Se Andrea scrive un decimale giusto come valore: messaggio "valore giusto, ma serve la forma esatta", risposta valutata sbagliata, errore registrato come FORMA.DECIMALE.
- **Approssimazione**: solo quando il testo lo dice esplicitamente, con la tolleranza scritta (es. "arrotonda a due decimali" accetta lo scarto entro 0,005).
- Il testo di ogni esercizio deve rendere chiaro quale delle due modalità vale.

### Vincoli di forma

- Quando l'esercizio chiede una forma ("scomponi", "razionalizza", "riduci ai minimi termini", "scrivi in forma algebrica"), la risposta deve essere equivalente **e** nella forma richiesta.
- Equivalente ma nella forma sbagliata: messaggio che spiega quale forma serve, errore FORMA.NON\_RICHIESTA.
- Senza vincoli di forma, qualunque risposta equivalente è giusta.

### Tastiera matematica

Una tastiera dell'app, al posto di quella del telefono, a livelli:

- **Base**: cifre, virgola, + − · :, frazione, potenza, radice quadrata e n-esima, parentesi, x e y, cancella, frecce per muoversi nell'espressione.
- **Funzioni**: sin, cos, tan, le inverse, log, ln, eˣ, π, e, valore assoluto.
- **Insiemi**: parentesi quadre e tonde per gli intervalli, ∪, ∅, ℝ, ∞, ±, punto e virgola, k intero per le soluzioni periodiche.
- **Complessi**: i.

La tastiera apre per primo il livello che serve al tipo di esercizio. Sopra c'è l'anteprima disegnata in tempo reale. Su PC si può scrivere anche con la tastiera fisica (sezione 6, parser tollerante).

### Altri elementi della valutazione

- **"Non lo so"**: risposta non data. Nessuna penalità nel calcolo del punteggio TOL, ma per la padronanza conta come esercizio non riuscito.
- **Indizi**: due livelli; ogni indizio usato riduce il merito della risposta giusta (sezione 9).
- **Distrazione**: etichetta messa da Andrea; conta come errore (sezione 5).

## 8. Sezione Test

La sezione Test contiene tre cose: la simulazione della sezione di logica, matematica e statistica del TOL, i mini-test di modulo e lo storico dei punteggi. Comprensione verbale, fisica e inglese non sono nell'app.

### Simulazione TOL

- **25 quesiti in 65 minuti**, a scelta multipla, con timer visibile.
- Quesiti presi dai generatori del Volume 1, distribuiti sulle aree del programma ufficiale: logica, aritmetica, algebra, geometria, trigonometria, funzioni, statistica. La distribuzione precisa e il mix di difficoltà si decidono dopo, confrontandoli con il Politest e la Demo TOL (sezione 14). Fino ad allora: distribuzione circa uniforme sulle aree, con prevalenza di livello 2.
- **Logica**: oltre ai generatori di V1.M01, è ammessa una banca di quesiti scritti a mano e verificati, perché la logica in linguaggio naturale si genera male.
- Si può passare da una domanda all'altra e tornare indietro, come nella Demo TOL (comportamento da verificare sulla Demo).
- **Segnalino "dubbio"** su ogni domanda: Andrea segna quelle a cui risponde senza essere sicuro.
- **Punteggio vero**: +1 esatta, −0,25 sbagliata, 0 non data. Si mostrano il punteggio grezzo (su 25) e il contributo al totale TOL (× 2,6, su 65).

**Analisi a fine prova**

- Punteggio, risposte giuste, sbagliate e non date, area per area.
- Tempo per domanda, con le domande su cui si è perso più tempo.
- **Strategia della penalità**: punteggio reale confrontato con quello che avrebbe ottenuto lasciando in bianco le domande segnate "dubbio". Così Andrea impara quando gli conviene rispondere e quando no.
- Gli errori della simulazione entrano nel diario come tutti gli altri.

### Mini-test di modulo

- 10 quesiti sulle abilità di un modulo, timer facoltativo.
- Il risultato aggiorna la padronanza delle abilità coinvolte.

### Storico

- Grafico dei punteggi delle simulazioni nel tempo, totale e per area.
- Elenco dei mini-test con data e risultato.
- Promemoria fisso nella sezione: ogni tanto fare anche la Demo TOL ufficiale e gli esercizi del Politest, per confrontarsi con quesiti veri.

## 9. Progressi e ripasso

La padronanza si misura per **abilità**; lezioni, moduli e volumi mostrano l'aggregato delle abilità che contengono. I dati restano solo sul dispositivo, senza server.

### Livelli di padronanza

Quattro livelli, mai percentuali (spingono a fissarsi sul numero): **nuovo, in apprendimento, consolidato, padroneggiato**.

Cosa entra nel calcolo:

- i risultati recenti contano più di quelli vecchi;
- la difficoltà dell'esercizio (livello 1, 2, 3);
- gli indizi usati riducono il merito di una risposta giusta;
- "Non lo so" conta come esercizio non riuscito;
- le distrazioni contano come errori.

La formula precisa la sceglie chi costruisce il motore dei progressi e la documenta in REGOLE.md.

Le domande lampo dentro le lezioni si registrano ma **non** contano per la padronanza: servono a controllare la comprensione mentre si legge. Contano invece gli esercizi di Oggi, di Esercizi, dei mini-test e delle simulazioni.

### Ripasso a intervalli

- Vale sia per le **abilità** sia per le **flashcard**.
- Risposta giusta: l'intervallo prima del prossimo ripasso si allunga. Risposta sbagliata: l'intervallo riparte da capo.
- Flashcard: Andrea si autovaluta con tre pulsanti (non la sapevo, a fatica, subito).
- L'algoritmo preciso (famiglia SM-2 o simile) lo sceglie la sessione che lo implementa e lo documenta.
- **Decadimento**: un'abilità non toccata da molto tempo scende di livello e torna nel ripasso, anche se era padroneggiata.
- Le abilità superate con "Lo so già" partono da consolidato ed entrano nel ripasso normale.

### Registro dei tentativi

Per ogni esercizio fatto si salva: data e ora, abilità, generatore, seme, livello, esito (giusta, sbagliata, non data), codice di errore o NON\_CLASSIFICATO, etichetta distrazione, indizi usati, tempo impiegato, contesto (Oggi, Esercizi, simulazione, mini-test). Dal registro escono diario, statistiche e padronanza.

### Salvataggio dei dati

- Archivio **IndexedDB** del browser, più robusto di localStorage, perché il registro cresce negli anni.
- I dati hanno un **numero di versione**. Mai cambiare il formato senza una conversione automatica dei dati esistenti: Andrea non deve perdere progressi.
- iOS può cancellare i dati dei siti non usati da tempo; la versione installata nella schermata Home è più protetta, ma il backup resta la rete di sicurezza.

### Backup

- **Esporta**: scarica un file con tutti i dati.
- **Importa**: carica un file.
- **Unisci**: fonde i dati di due dispositivi senza perdere nulla (i tentativi si uniscono, i duplicati si scartano), come nelle altre app di Andrea.
- **Promemoria**: ogni 10 lezioni completate, oppure se l'ultimo backup ha più di 7 giorni, la chiusura di Oggi ricorda di fare il backup.

### Serie di giorni

- Un giorno conta se Andrea completa la sessione di Oggi, di qualsiasi durata. L'obiettivo giornaliero è proprio questo.
- **Giorni liberi**: fino a **due a settimana** (da lunedì a domenica), **mai di fila**. Un giorno saltato viene coperto in automatico da un giorno libero, se ne restano nella settimana e se il giorno prima non era già un giorno libero; altrimenti la serie riparte da zero.
- La sezione Tu mostra la serie attuale, la più lunga e i giorni liberi usati nella settimana.

Il giorno è la data locale del dispositivo.

## 10. Aspetto

L'identità è **Compasso: il tavolo da disegno tecnico**. Carta avorio, linee di costruzione sottili sullo sfondo, blu da cianografia con accenti arancioni, quote e righelli come dettagli dell'interfaccia. Richiama l'ingegneria e la precisione, ed è diversa dalle altre app di Andrea (Occhio, Officina, Campione, Vento, Terminale).

### Decisioni fisse

- **Tema chiaro e scuro.** Chiaro: carta avorio, inchiostro blu scuro. Scuro: tavola blu notte da cianografia, linee e testo chiari. Si sceglie nelle impostazioni, con default che segue il sistema.
- **Codice colore fisso per i blocchi delle lezioni**, uguale ovunque:
  - definizione: blu cianografia;
  - teorema: arancione;
  - dimostrazione: neutro (grigio-blu), subordinato al teorema;
  - esempio svolto: verde;
  - attenzione: rosso.
- **Formule** con il carattere classico della matematica (quello di KaTeX). Il carattere dell'interfaccia si sceglie perché ci stia bene accanto, incorporato per l'uso offline (proposta da valutare: una famiglia sans e mono tecnica, come IBM Plex).
- **Formule grandi e leggibili sul telefono**; quelle lunghe scorrono di lato invece di rimpicciolirsi.
- **Giusto e sbagliato** mai solo col colore: sempre anche un'icona e una parola.
- **Contrasto** almeno al livello AA delle linee guida di accessibilità, in entrambi i temi.
- **Icona in PNG**, non in SVG (con un'icona SVG l'iPhone rischia di mostrare un'icona generica nella schermata Home): 180×180 per iOS, 192×192 e 512×512 per il manifest.
- **Telefono prima di tutto**: margini laterali di 16 px, niente scorrimento orizzontale della pagina, pulsanti grandi abbastanza da toccare.
- Animazioni brevi e sobrie, mai d'intralcio.

I valori esatti (codici dei colori, caratteri, spaziature) si fissano nella fase dell'involucro, non prima (sezione 14).

## 11. Visualizzazioni

Undici visualizzazioni interattive: tutte e cinque del Volume 1, le quattro principali di Analisi e le due principali di Geometria e Algebra Lineare. Le specifiche dettagliate di ognuna si scrivono quando l'involucro esiste (sezione 14); qui c'è cosa devono far capire.

| Codice | Modulo | Cosa si manipola | Cosa deve far capire |
| --- | --- | --- | --- |
| VIS.circonferenza-goniometrica | V1.M10 | Si trascina il punto sulla circonferenza | Seno, coseno e tangente come segmenti e coordinate; segni nei quadranti; gradi e radianti affiancati |
| VIS.trasformazioni-funzioni | V1.M08 | Cursori su a, b, c, d in a·f(b(x−c))+d, scelta di f | Traslazioni, dilatazioni e simmetrie dei grafici, compreso il verso della traslazione orizzontale |
| VIS.coniche-parametri | V1.M12 | Coefficienti dell'equazione | Come cambiano forma, assi e fuochi di circonferenza, parabola, ellisse e iperbole |
| VIS.esponenziale-logaritmo | V1.M09 | La base a | Simmetria rispetto a y = x, crescenza per a > 1 e decrescenza per 0 < a < 1, domini e immagini |
| VIS.disequazioni-grafico | V1.M06 | La funzione e la soglia | Le soluzioni sono dove il grafico sta sopra o sotto; legame con la tabella dei segni |
| VIS.limite-epsilon-delta | V2.M04 | Si sceglie ε | L'app trova un δ adatto e mostra le due fasce: perché la definizione di limite funziona |
| VIS.secante-tangente | V2.M06 | h che tende a 0 | La secante diventa tangente; il rapporto incrementale tende alla derivata |
| VIS.taylor | V2.M08 | Grado n e punto x₀ | L'approssimazione migliora vicino a x₀ e peggiora lontano, grado dopo grado |
| VIS.riemann | V2.M09 | Numero di rettangoli e tipo di somma | Le somme convergono all'integrale, con i valori numerici a fianco |
| VIS.trasformazione-lineare | V3.M05 | Matrice 2×2 o immagini dei vettori di base trascinabili | La griglia del piano si deforma; il determinante è l'area con segno; con determinante 0 il piano collassa |
| VIS.autovettori | V3.M06 | Matrice 2×2 e un vettore che ruota | Le direzioni che restano sulla propria retta; l'autovalore come fattore di scala |

**Vincoli comuni**

- Solo **2D**: il 3D sul telefono si manovra male e costa molto.
- Comandi pensati per il tocco, con cursori e punti trascinabili abbastanza grandi.
- Fluide su iPhone XR, offline.
- Inseribili in una lezione con il blocco visualizzazione, anche con parametri iniziali diversi da lezione a lezione.

## 12. Tecnica e file

Lo stack è lo stesso delle altre app di Andrea, più TypeScript, test automatici e un archivio dati più robusto. Il repository è pubblico su GitHub, si chiama **compasso** e la versione da telefono si pubblica con GitHub Pages.

### Stack

- **Preact** con **@preact/signals** per l'interfaccia.
- **esbuild** per il build.
- **TypeScript** in tutto il progetto: con più modelli al lavoro, un generatore che non rispetta lo schema fa fallire la compilazione invece di rompersi davanti ad Andrea.
- **Vitest** per i test automatici.
- **KaTeX** per le formule, con i caratteri incorporati.
- Un parser **Markdown** con supporto ai blocchi speciali della sezione 4 (scelta della libreria alla sessione 0 o 1).
- **IndexedDB** per i progressi, con un piccolo strato di accesso.
- **Service worker** per l'uso offline della versione da telefono.
- **Lingua**: nomi nel codice in inglese; commenti, contenuti e interfaccia in italiano.

### Due versioni dallo stesso codice

- **Telefono**: app installabile (PWA) a più file, tutti salvati per l'uso offline dal service worker. I contenuti si caricano **un modulo alla volta**, quando servono: aprire l'app non deve leggere tutti i megabyte dei contenuti.
- **PC**: un **file unico** compasso.html, con tutto incorporato, che si apre con doppio clic.
- Le formule di una lezione si disegnano man mano che si scorre, non tutte all'apertura.

Quando esce una versione nuova, l'app da telefono la scarica in background e la usa dalla riapertura successiva, mostrando un avviso "versione nuova disponibile". I progressi non si toccano.

**Da verificare nella sessione 0**: alcuni browser limitano IndexedDB nei file aperti con doppio clic. Se nella versione PC non funziona in modo affidabile, la versione PC usa localStorage come ripiego, con lo stesso formato dei dati e lo stesso backup.

**Nessuna richiesta di rete esterna e nessun tracciamento**: niente analisi d'uso, niente caratteri o librerie caricati da internet. Tutto è incorporato o salvato sul dispositivo.

### Struttura del repository

```
compasso/
├─ REGOLE.md          ← ogni modello lo legge per primo
├─ STATO.md           ← cosa è fatto, cosa manca, decisioni da rivedere
├─ docs/
│  ├─ SPECIFICA.md    ← questo documento
│  └─ ARCHITETTURA.md ← scritto nella sessione 1
├─ src/
│  ├─ motore/         ← matematica pura, nessuna dipendenza dall'interfaccia
│  ├─ app/            ← interfaccia, sezioni, componenti, tastiera
│  ├─ dati/           ← progressi, ripasso, registro, backup
│  ├─ generatori/     ← v1/m06/..., stessi codici dei contenuti
│  ├─ contenuti/      ← lezioni in Markdown: v1/m06/l04.md
│  ├─ errori/         ← il catalogo unico
│  ├─ glossario/
│  └─ visualizzazioni/
├─ test/
├─ .github/workflows/ ← controllo automatico e pubblicazione
└─ dist/              ← telefono/ e pc/compasso.html
```

### REGOLE.md

Lo scheletro qui sotto lo crea la sessione 0; la sessione 1 aggiunge la parte tecnica; ogni sessione successiva lo aggiorna se impara qualcosa di utile.

- **Prima di toccare qualsiasi cosa**: leggere REGOLE.md, STATO.md e la parte della specifica che riguarda il lavoro.
- **Come aggiungere un generatore**: modello di riferimento da copiare, lista di controllo, verifica da superare.
- **Come scrivere una lezione**: sintassi dei blocchi, tono, uso del glossario, intestazione.
- **Catalogo degli errori**: controllare che un errore non esista già prima di aggiungerlo.
- **Quando un lavoro è finito**: compilazione e tutti i test superati, controllo automatico verde, STATO.md aggiornato. Senza tutte e tre le cose il lavoro non è finito.
- **Divieti**: mai rinominare un codice; mai cambiare il formato dei dati salvati senza conversione e test; mai modificare il motore mentre si lavora su un generatore (se il motore ha un limite, si annota in STATO.md); mai indebolire o saltare un test per farlo passare.

### STATO.md

Aggiornato alla fine di ogni sessione, con queste sezioni: fatto, in corso, prossimo passo, decisioni da rivedere (per Andrea), domande aperte, problemi noti (con generatore, livello e seme quando serve).

### Verifica automatica dei generatori

Per ogni generatore e ogni livello, i test provano migliaia di semi (proposta: 2.000) e controllano che:

1. il generatore produca un esercizio senza errori e in pochi millisecondi;
2. lo stesso seme dia due volte lo stesso esercizio;
3. la risposta giusta sia davvero giusta, con una verifica indipendente dal modo in cui è stata costruita quando possibile (sostituire le soluzioni nell'equazione, derivare la primitiva, controllare che A·x = b);
4. la risposta giusta rispetti i vincoli di forma che l'esercizio richiede;
5. ogni risposta sbagliata prevista **non** sia equivalente alla giusta, e le sbagliate siano diverse tra loro anche come valore, non solo come testo;
6. ogni codice di errore esista nel catalogo;
7. i numeri restino entro i limiti di "pulizia" dichiarati dal generatore;
8. testo, risposte e passaggi si disegnino in KaTeX senza errori;
9. passaggi della soluzione e due indizi siano presenti.

### Verifica automatica dei contenuti

Un controllo sui file delle lezioni verifica che: l'intestazione sia valida, i codici siano unici, i prerequisiti esistano, i rimandi a glossario, errori, generatori e visualizzazioni puntino a elementi esistenti, ogni termine del glossario sia definito in una sola lezione.

### Controllo automatico su GitHub

- A ogni modifica caricata, GitHub Actions compila il progetto ed esegue tutti i test. Se qualcosa si rompe, compare una X rossa.
- Quando i controlli sono verdi, la versione da telefono si pubblica in automatico su GitHub Pages.
- Si lavora sul ramo principale con modifiche piccole e descrizioni chiare.

### Prestazioni previste

Stime da verificare sull'app vera: base dell'app (Preact, motore, interfaccia) qualche centinaio di KB; caratteri delle formule 0,5-1 MB; contenuti completi 5-8 MB. Il peso non è un problema per un iPhone XR. I rischi sono avvio lento, lezioni con molte formule e dati cancellati da iOS, e si evitano con il caricamento per moduli, il disegno progressivo delle formule e il backup.

## 13. Ordine di costruzione

L'ordine lo decidono le dipendenze tecniche: ogni pezzo si costruisce solo quando quello su cui poggia è solido e testato. Fable 5.2 fa le fasi 1-3 (parte tecnica) e, se avanza capacità, la teoria di riserva; il resto lo fanno gli altri modelli seguendo REGOLE.md e i generatori di riferimento. Chi fa cosa, sessione per sessione, è nella guida operativa.

1. **Regole e impalcatura.** Cartelle, build, Vitest, controllo automatico su GitHub, app vuota che si avvia, scheletro di REGOLE.md e STATO.md, catalogo degli errori trasformato in file.
   - Finita quando: il progetto si compila, un test di prova passa, il controllo su GitHub è verde.
2. **Motore matematico.** Architettura per l'intero perimetro e schema dei generatori in TypeScript; poi nucleo (numeri esatti, espressioni, parser tollerante, LaTeX, equivalenza, vincoli di forma) e resto (derivate, matrici, complessi, insiemi di soluzioni, tabelle dei segni, registrazione dei passaggi); sistema di verifica dei generatori.
   - Finita quando: esiste docs/ARCHITETTURA.md, ogni parte del motore ha test superati, il sistema di verifica gira su un generatore di prova.
3. **Fetta verticale.** Quattro generatori di riferimento (disequazioni fratte V1.M06, scomposizione di polinomi V1.M04, derivate V2.M06, determinanti e sistemi lineari V3.M02-M03) e la lezione sulle disequazioni fratte in Markdown, mostrata dall'app con schermata di esercizio completa, riconoscimento degli errori, progressi salvati in IndexedDB.
   - Finita quando: su telefono si fa la lezione e i suoi esercizi dall'inizio alla fine, i quattro generatori superano la verifica, REGOLE.md spiega come replicarli.
4. **Involucro dell'app.** Le cinque sezioni, navigazione, impostazioni, tastiera matematica completa, aspetto Compasso con i due temi, backup.
   - Finita quando: tutte le sezioni esistono e funzionano con i contenuti presenti, e l'app è installabile su iPhone e funziona offline.
5. **Volume 1, Fondamenta.** Elenco delle lezioni, lezioni, generatori, flashcard, dimostrazioni dove servono, le cinque visualizzazioni del volume.
   - Finita quando: ogni modulo ha lezioni, abilità con generatori verificati e controllo "Lo so già".
6. **Volumi 2 e 3, in parallelo.** Teoria completa con dimostrazioni (da confrontare con un libro di testo), generatori, dimostrazioni interattive, le sei visualizzazioni.
   - Finita quando: come il Volume 1, più dimostrazioni interattive per i teoremi principali.
7. **Sezione Test.** Simulazione TOL, mini-test, storico, analisi della penalità.
   - Finita quando: una simulazione completa si fa a tempo, con punteggio e analisi corretti.
8. **Strato adattivo.** Test d'ingresso, padronanza raffinata, ripasso a intervalli e punti deboli calibrati sui dati veri.
   - Finita quando: il test d'ingresso sostituisce il controllo "Lo so già" e Oggi si compone in base a padronanza ed errori.
9. **Rifinitura.** Ritocchi di interfaccia, prestazioni misurate su iPhone XR, versione PC in file unico verificata.
   - Finita quando: avvio e lezioni sono fluidi sul telefono e la versione PC si apre con doppio clic.

Alcune parti delle fasi 4, 5 e 9 possono partire appena la fase 3 è chiusa (ad esempio l'aspetto e le prime lezioni del Volume 1), purché seguano REGOLE.md.

## 14. Fuori perimetro e decisioni rimandate

### Escluso, con il motivo

| Cosa | Perché è fuori |
| --- | --- |
| Fisica, Analisi 2 | Non servono ora; la struttura deve accoglierle dopo |
| Simulazione dell'esame universitario | Utile solo più avanti; la teoria scritta non si corregge in automatico |
| Risolutore libero di esercizi esterni | È la parte più complessa di un motore; ha senso solo con un motore maturo |
| Fogli di esercizi stampabili | Lavoro di impaginazione in più, non necessario ora |
| Mappa dei prerequisiti navigabile | Un grafo grande sul telefono si legge male |
| Tutor AI dentro l'app | Richiede connessione e costi, rompe il funzionamento offline |
| Sincronizzazione su server | Richiede un server e porta i dati fuori dal dispositivo; basta il backup |
| Foto o scrittura a mano | Complessissimo offline, guadagno piccolo |
| Gamification pesante | Distrae dalla matematica; restano solo serie di giorni e obiettivo giornaliero |
| Versione come pagina su claude.ai | Manutenzione in più senza vantaggi rispetto a telefono e PC |

### Rimandato a dopo le sessioni di Fable

- **Elenco delle lezioni di ogni modulo** e **catalogo dei generatori** per lezione: si progettano modulo per modulo con gli altri modelli, prima di scrivere i contenuti.
- **Composizione della simulazione TOL**: distribuzione dei quesiti per area e mix di difficoltà, da tarare sul Politest e sulla Demo TOL.
- **Specifica di ogni visualizzazione**: quando l'involucro esiste.
- **Algoritmo del test d'ingresso**: quando ci sono contenuti.
- **Valori esatti dell'aspetto**: colori, caratteri, spaziature, nella fase dell'involucro.
- **Taratura dei tempi di Oggi**: dopo qualche settimana di uso reale.

### Da verificare

- Le date del TOL anticipato per l'anno di Andrea.
- Numero di opzioni per quesito e navigazione tra le domande nel TOL vero, sulla Demo TOL.
- Il programma di Analisi 1 e di Geometria e Algebra Lineare del professore di Andrea, all'iscrizione: allineare i Volumi 2 e 3.

### Fonti

- [Materie del TOL – Politecnico di Milano](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/tol-test-on-line/materie-del-tol)
- [Il punteggio del TOL – Politecnico di Milano](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/tol-test-on-line/come-prepararsi-al-tol/il-punteggio-del-tol)
- [TOL anticipato – Politecnico di Milano](https://www.polimi.it/futuri-studenti/test-e-ammissione/laurea/ingegneria/quando-iscriversi-al-tol/calendario-demo-tol-a-distanza/tol-anticipato)
- [Esperienza studente, Ingegneria Informatica – Politecnico di Milano](https://www.ingindinf.polimi.it/fileadmin/user_upload/upload/formazione/esperienza_studente/Esperienza_Studente_INF_LT.pdf)
- [Programma di Analisi Matematica 1, Ing. Informatica e Automatica – Sapienza](https://www.sbai.uniroma1.it/sites/default/files/AM1prog12CFU_2021-22.pdf)
- [Programma di Analisi Matematica I, Ing. Informatica – Università di Pisa](https://pagine.dm.unipi.it/berselli/dida/2024-25/Programma24-25.pdf)
- [Programma di Geometria e Algebra, Informatica – Tor Vergata](<https://www.mat.uniroma2.it/~gavarini/page-web_files/mat-didat_data/Geometria-Algebra_(INF)/programmi/Geo-Alg-PROG_2023-2024.pdf>)
- [Programma di Fondamenti di Algebra Lineare e Geometria – Università di Padova](https://stem.elearning.unipd.it/mod/resource/view.php?id=747881)
