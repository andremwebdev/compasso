# STATO

Ultimo aggiornamento: parser del Volume 1 ed errore `ALG.RADICE_DEL_QUADRATO` (22 novembre 2026). Prima: visualizzazioni parte 2, le altre quattro del Volume 1. Prima: visualizzazioni parte 1, impalcatura e `VIS.disequazioni-grafico`. Prima: involucro parte 4, figure e grafici. Prima: involucro parte 3, caricamento dei contenuti per modulo. Prima: involucro parte 2, aspetto definitivo e tastiera. Prima: involucro parte 1, sezioni e navigazione. Prima: decisioni di Andrea sulle domande aperte. Prima: sessione extra E4 (scalette dei 35 moduli in `docs/SCALETTE.md`). Prima: sessione E2 (generatori difficili di Analisi, parte 2). La versione lunga di questo file, con la storia sessione per sessione, è nel commit `abfb3e3`; i dettagli delle revisioni in `docs/REVISIONE.md`.

## Fatto

Fasi 1, 2 e 3 della specifica (sezione 13) complete e riviste.

- **Impalcatura** (sessione 0): TypeScript, Preact, esbuild, Vitest, KaTeX; due build dallo stesso codice (`dist/telefono/` PWA offline, `dist/pc/compasso.html` file unico); controllo e pubblicazione su GitHub Pages a ogni push su `main`.
- **Motore** (sessioni 1-2, rivisto in 4a): numeri esatti, espressioni, LaTeX all'italiana, parser tollerante, equivalenza, vincoli di forma, `simplify`/`expand`, polinomi, derivate, matrici, complessi, insiemi di soluzioni, tabelle dei segni e di variazione, passaggi delle procedure. Architettura in `docs/ARCHITETTURA.md`.
- **Esercizi**: schema dei generatori, valutazione con riconoscimento degli errori, scelta multipla automatica, verifica automatica (nove controlli più avvisi di varietà) e verifica dei contenuti.
- **Cinque generatori di riferimento** (rivisti in 4b, controllati con sympy dal testo mostrato): `V1.M06.A04.g1` disequazioni fratte, `V1.M04.A07.g1` scomposizione, `V2.M06.A03.g1` derivate, `V3.M03.A01.g1` determinante, `V3.M02.A01.g1` sistemi con Gauss.
- **Tre generatori di Analisi** (sessione E1), tutti con risposta di tipo limite (numero, `+∞`, `−∞`, «non esiste»), tre livelli, verifica automatica senza problemi né avvisi, 750 esercizi ciascuno ricalcolati con sympy **dal testo mostrato**: `V2.M03.A01.g1` limiti di successioni (è il generatore di riferimento per le risposte di tipo limite), `V2.M04.A01.g1` limiti notevoli e forme indeterminate, `V2.M08.A01.g1` sviluppi di Taylor nei limiti (controllato anche con de l'Hôpital dal testo, nel suo test). Strumenti comuni nuovi in `src/generatori/comuni/`: `limits.ts` (scrittura del limite, `distinctWrongLimits`, prova numerica `confirmsLimit`) e `terms.ts` (polinomi scritti termine per termine).
- **Lezione di riferimento** `V1.M06.L04` «Disequazioni fratte».
- **Fetta verticale nell'app**: lezione a tratti con domande lampo, schermata di esercizio completa, tastiera matematica (Base, Insiemi, Funzioni), dati in IndexedDB con versione (`DATA_VERSION = 1`) e ripieghi, esercizi per generatore e livello.
- **Catalogo errori**: 97 voci in 12 categorie (5 aggiunte nella sessione E1 per limiti e Taylor, 18 nella sessione E2 per integrali, convergenza ed equazioni differenziali, `DISEQ.ZERO_DOPPIO` e `ALG.RADICE_DEL_QUADRATO` su decisione di Andrea il 20 novembre 2026), allineato alla tabella della specifica (anche la copia nel Progetto di Claude, aggiornata il 22 novembre) e verificato con sympy.
- **Regole** (sessione 4c): `REGOLE.md` completo per generatori, lezioni, dimostrazioni, visualizzazioni, catalogo, con le trappole emerse dalle revisioni.
- **Dimostrazioni di riserva** (sessione 4d), in `src/riserva/`, nel formato delle dimostrazioni interattive, con enunciato completo, versioni sbagliate e motivi: teorema degli zeri e di Weierstrass (V2.M05), di Fermat, Rolle e Lagrange (V2.M06). Pronte da incollare nelle lezioni; come usarle: `src/riserva/LEGGIMI.md`.
- **Sei generatori di Analisi** (sessione E2), tre livelli, verifica automatica senza problemi né avvisi, ricalcolati con sympy o mpmath **dal testo mostrato**:
  - `V2.M09.A01.g1` integrali indefiniti (immediati, sostituzione, parti, fratti semplici, divisione, parti ripetute e cicliche): la primitiva scritta si **deriva**, qualunque costante abbia; senza costante è `AN.COSTANTE_INTEGRAZIONE`, `ln x` al posto di `ln|x|` è `COND.LOGARITMO`;
  - `V2.M09.A02.g1` integrali definiti (`F(b) − F(a)` con somme esatte, logaritmi raccolti; verifica con Simpson);
  - `V2.M10.A01.g1` convergenza di integrali impropri e `V2.M11.A01.g1` convergenza delle serie: **scelta multipla** verdetto + criterio, opzioni sbagliate sui criteri usati male; la verifica controlla numericamente il comportamento negli estremi (o del termine generale);
  - `V2.M12.A01.g1` primo ordine (separabili, lineari, Cauchy) e `V2.M12.A02.g1` secondo ordine lineari a coefficienti costanti (tre casi, termine noto, risonanza, Cauchy): la soluzione si **sostituisce** nell'equazione, si contano le costanti indipendenti e si controllano le condizioni.
  - Nuovo nello schema degli esercizi: controllo speciale `check` per le risposte `expression` (`antiderivative`, `differentialEquation`, in `src/esercizi/checks.ts`). Comuni nuovi: `writing.ts`, `exact-sum.ts`, `convergence.ts`, `ode.ts`. Tastiera: tasti `c`, `c₁`, `c₂`, `k` nel livello Funzioni.
- **Scalette dei 35 moduli** (sessione E4) in `docs/SCALETTE.md`, **proposta da approvare modulo per modulo**: 230 lezioni con durata e prerequisiti, 237 abilità, 505 termini del glossario (ognuno definito una volta), 225 teoremi (205 dimostrati). Codici già assegnati rispettati; controllata con uno script (codici unici, prerequisiti esistenti e all'indietro, termini unici, durate). In fondo al file: che cosa serve al motore prima di certi moduli e le scelte da confermare.
- **Involucro, parte 1** (sezioni e navigazione):
  - **Oggi**: durata scelta ogni giorno (20/40/60, proposta quella delle impostazioni), cinque fasi nell'ordine con la taratura della specifica, binari alternati giorno per giorno, lezione che non sta nel tempo continua il giorno dopo, sessione salvata e riprendibile, chiusura con riepilogo, errori nuovi, serie e promemoria del backup.
  - **Teoria**: volume → modulo → lezione con lo stato; le 230 lezioni delle scalette compaiono, quelle non scritte «in arrivo» (programma generato da `docs/SCALETTE.md`); avviso sui prerequisiti mancanti con i link; glossario toccabile e come pagina; «Lo so già» per modulo.
  - **Esercizi**: schede Esercizi (argomento, difficoltà automatica o 1-3, quantità, ripasso misto, «Lo so già»), Flashcard (automatiche e manuali, autovalutazione), Dimostrazioni (riordina, trova lo sbagliato, completa; nessuna lezione scritta ne ha ancora).
  - **Test**: schermata «in arrivo». **Tu**: serie con giorni liberi, padronanza in quattro livelli, diario degli errori, impostazioni (binari, tema, durata), backup (esporta, condividi, importa, unisci, promemoria).
  - Dati alla versione 2 con migrazione; cronologia del browser; avviso «versione nuova disponibile»; il tentativo fatto prima dell'apertura dei dati ora si salva. Formule di padronanza e ripasso in `REGOLE.md`.
  - Provata in Chrome a 414×896 (iPhone XR): tutte le sezioni, tema scuro, niente scorrimento orizzontale, ricarica senza rete dopo il service worker.
- **Involucro, parte 2** (aspetto e tastiera):
  - **Aspetto definitivo** (specifica 10): colori esatti dei due temi in `styles.css`, contrasto AA di ogni coppia testo/fondo e 3:1 dei contorni controllato da `test/app/aspetto.test.ts`; codice colore dei blocchi; caratteri IBM Plex Sans e Mono incorporati (4 file woff2, circa 85 KB); spaziature a passi di 4 px; quota sotto i titoli e quadrettatura da disegno tecnico; stato delle lezioni disegnato in CSS (niente più «◐»); barra del telefono col colore del tema scelto; icone PNG 180, 192, 512 definitive (compasso su tavola blu).
  - **Tastiera completa** (specifica 7): sei livelli, apertura sul livello del tipo di esercizio, frazioni/potenze/radici/funzioni a modello con ⇥, «non esiste», `±`, `k`, `π`, `∀x`, `∄x`, cifre anche in Funzioni; matrici e vettori con caselle tra parentesi, passaggio di casella e anteprima della matrice intera.
  - Provata in Chrome a 414×896 e 320 px, nei due temi: niente scorrimento orizzontale.
- **Involucro, parte 3** (caricamento per modulo, specifica 12):
  - **Elenchi per modulo**: `src/moduli/vN/mNN.ts`, 35 file (uno per modulo, quelli senza contenuti con elenchi vuoti) con le lezioni e i generatori del modulo; `src/contenuti/index.ts` e `src/generatori/index.ts` non sono più elenchi. Registro fisso `src/moduli/index.ts`. Come aggiungere le righe: `REGOLE.md`.
  - **Indice leggero** calcolato dalla compilazione (`__CONTENT_INDEX__`, circa 6 KB oggi): codici, titoli, livelli, errori, termini, flashcard. Navigazione, Oggi, Esercizi, diario e «Lo so già» lavorano su questo; lezione, serie di esercizi, mazzo di flashcard, glossario e dimostrazioni caricano prima i loro moduli («Caricamento…»).
  - **Telefono**: moduli ES; `moduli/vN/mNN.js` letto solo quando serve, codice comune in `chunks/`. All'avvio si leggono `app.js` più tre file comuni (circa 640 KB, prima 853 KB), nessun modulo. **PC**: file unico come prima.
  - **Prova in Chrome senza finestra** (schermo 414×896, tocco) dentro `test/build.test.ts`: lo stesso percorso della prova PC, all'avvio nessun file di modulo, poi solo `moduli/v1/m06.js`; poi a server spento si riapre dal service worker, la lezione si legge e un esercizio di V2.M06 (mai aperto) carica il suo modulo dalla copia salvata.
- **Involucro, parte 4** (figure e grafici nelle lezioni):
  - **Motore**: `plotGraph` e `graphToSvg` (`src/motore/display/graph.ts`): da una a tre funzioni di $x$ e una finestra; curve interrotte dove la funzione non è definita (anche ai poli non noti, come la tangente); tacche tonde con numeri all'italiana; punti notevoli **esatti** (zeri e asintoti verticali delle funzioni razionali, buchi con l'ordinata esatta, intersezione con l'asse $y$, punti chiesti, angoli notevoli); SVG con sole classi `graf-…`.
  - **Lezioni**: blocchi `grafico` (`funzioni`, `finestra`, `punti`, letti con `parseExpression`) e `figura` (file `lNN-nome.svg` accanto alla lezione, elencato in `figures` del modulo, didascalia obbligatoria). La verifica dei contenuti controlla parametri, nome e contenuto del file (niente script, colori scritti, riferimenti esterni; solo le classi `fig-…`); un blocco sbagliato resta nella lezione e il riquadro mostra il messaggio. Sintassi ed esempi in `REGOLE.md`.
  - **Prova**: lezione di prova `test/contenuti/prova/v1/m01/l99.md` (non entra nell'app) in Chrome senza rete, nei due temi, a 414 e 320 px (`test/app/grafici-chrome.test.ts`): disegni presenti, dentro lo schermo, colori dal tema.
- **Visualizzazioni, parte 1** (impalcatura e `VIS.disequazioni-grafico`):
  - **Scheda** in `docs/VISUALIZZAZIONI.md` (nuovo; tabella delle undici con lo stato).
  - **Impalcatura** `src/visualizzazioni/`: `index.ts` (elenco codice → componente e controllo dei parametri; da qui `visualizationCodes` e `checkVisualizationParams` alla verifica dei contenuti, che ora controlla anche i parametri, e `VisualizationBlock` a `LessonView`); `comuni.tsx` (riquadro, messaggio, cursore, maniglie col dito con `requestAnimationFrame`). Nel motore: `graphFrame` (la cornice di `graphToSvg`, riusata per disegnare sopra il grafico statico) e le funzioni razionali N/D senza semplificare (`display/rational-function.ts`).
  - **La visualizzazione**: grafico di $f$ (quello dei grafici statici), retta $y = k$ da trascinare (soglia a passi di ½, esatta), quattro versi, scelta tra più funzioni, sonda; curva ripassata dove vale la disequazione, soluzione sull'asse $x$ con estremi pieni o vuoti, $f(x) - k$ come una frazione, tabella dei segni con le colonne della soluzione (✓) e quella della sonda, soluzione $S$ esatta. Ogni cosa che si trascina ha anche un cursore.
  - **Nella lezione `V1.M06.L04`**, nuova sezione «La stessa cosa, vista sul grafico» dopo i tre esempi svolti, con le loro tre funzioni (durata 19 → 20).
  - **Prove**: matematica confrontata con i valori della funzione per ogni soglia del cursore, ogni verso e ogni funzione delle lezioni; componente in jsdom (pulsanti, cursori, trascinamento); Chrome col dito (`test/app/visualizzazioni-chrome.test.ts`, lezione vera) nei due temi, a 414 e 320 px, senza rete: maniglie da 45 px, la pagina non scorre mentre si trascina, nessuno scorrimento orizzontale, colori dal tema. Fotografie guardate a occhio.
  - `REGOLE.md`, «Come aggiungere una visualizzazione», riscritto con quello che la prima fissa; `docs/ARCHITETTURA.md` aggiornato.
- **Visualizzazioni, parte 2** (le altre quattro del Volume 1, copiate da `VIS.disequazioni-grafico`; schede in `docs/VISUALIZZAZIONI.md`):
  - `VIS.trasformazioni-funzioni`: $y = a\,f(b(x - c)) + d$ con cursori a passi di ½ ($a$, $b$ mai 0), punto $P'$ da trascinare (trasla), grafico di partenza tratteggiato, formula, $P \mapsto P'$ esatti, trasformazioni in ordine con il verso della traslazione a parole. Parametri `funzione` (1-4), `a`, `b`, `c`, `d`, `cursori`, `finestra`.
  - `VIS.esponenziale-logaritmo`: base sul cursore (14 valori esatti, $e$ compreso, e $1$ con il suo messaggio), $a^x$, $\log_a x$ e $y = x$ con unità uguali, $P$ e $P'$ simmetrici, punti esatti, proprietà. Parametri `base`, `punto`, `logaritmo`.
  - `VIS.circonferenza-goniometrica`: $P$ da trascinare (aggancio ai multipli di 15°), coseno, seno e tangente come segmenti con il nome, gradi e radianti affiancati, valori esatti ai multipli di 15°, tabella dei segni con il quadrante. Parametri `angolo`, `tangente`.
  - `VIS.coniche-parametri`: circonferenza, parabola, ellisse, iperbole con i coefficienti sui cursori, vertici di ellisse e iperbole da trascinare; fuochi, assi, direttrice, asintoti; elementi esatti (radici semplificate) e casi particolari. Parametri `coniche`, `conica`, `coefficienti`.
  - Comuni nuovi: `src/visualizzazioni/parametri.ts` (lettura dei parametri, numeri a passi esatti, finestra con unità uguali, piano vuoto).
  - **Non inserite in lezioni** (lo faranno le lezioni). Prova in Chrome con la lezione finta `test/app/anteprima/visualizzazioni-prova.md` (`test/app/visualizzazioni-prova-chrome.test.ts`): due temi, 414 e 320 px, senza rete, col dito; fotografie guardate. Controlli a tappeto: trasformata = $a f(b(x-c)) + d$ per ogni posizione dei cursori; logaritmo simmetrico dell'esponenziale per ogni base; seno, coseno, tangente e segni per ogni grado; per ogni coefficiente delle coniche i punti disegnati soddisfano l'equazione e la definizione con i fuochi calcolati.
- **Parser del Volume 1** (⚙ fase 5, punto 5):
  - Il parser legge **numeri periodici** (`0,1(6)`, `3,(3)`, con la lineetta `0,16̅`): valgono la frazione generatrice, si mostrano `0{,}1\overline{6}` e non sono decimali (niente FORMA.DECIMALE); **notazione scientifica** `3,2E5` (come `3,2·10^5`); **gradi** `30°`, `30°15′20″` (valgono in radianti: `30° = π/6`, `sin 30° = 1/2`); **fattoriale** `5!`, `n!`, `(n+1)!` (esatto sui naturali, Γ nel confronto numerico). Ogni scrittura si vede anche a metà nell'anteprima (`0,1(`, `3,2E-`, `30°15`).
  - Costruttori `repeatingDecimal`, `factorial`, `degrees`; vincoli di forma nuovi `scientificNotation`, `degrees`, `radians`; `reducedFraction` rifiuta un periodico (frazione generatrice).
  - Tastiera: Base con `n!`, `·10ⁿ`, «periodo», `n`, `k` (una riga in più); Funzioni con `°`, `′`, `″`, α, β, θ (una riga in più). Gradi aprono Funzioni, il fattoriale Base.
  - Voce di catalogo `ALG.RADICE_DEL_QUADRATO` «√(x²) = x anche per x negativo» (rimando V1.M03), in `docs/SPECIFICA.md` e nel controllo sympy.
- **Test**: 1.431, verdi in locale e su GitHub.

## In corso

Niente.

## Lavoro per i modelli successivi

In ordine. Ogni punto è il compito di una sessione (o di poche); «finita quando» dice quando chiuderla. Le fasi 4 e 5 possono procedere in parallelo (specifica, sezione 13), purché seguendo `REGOLE.md`. Segnati con ⚙ i punti che toccano motore, schema o formato dei dati: vanno a un modello capace, in una sessione dedicata.

**Fase 4 — involucro dell'app**

1. **Prova su iPhone** della versione su Pages (la fa Andrea, o la sessione la prepara come elenco di cose da toccare): tastiera di sistema che non si apre, tasti comodi, tabelle dei segni che scorrono, installazione e uso offline. I difetti trovati diventano il primo lavoro.
2. ~~Navigazione e sezioni~~ e 3. ~~Impostazioni e backup~~: fatti (involucro parte 1). Restano da provare su iPhone vero: download del backup dall'app installata, condivisione, scelta del file.
4. ~~Tastiera completa~~ e 5. ~~Aspetto definitivo~~: fatti (involucro parte 2). Resta la **modalità lettura** (citata qui in passato, non nella specifica): da decidere se serve.
6. ~~Flashcard, glossario, diario~~: fatti (involucro parte 1).
7. ⚙ **Risposta `ordering`** nella schermata di esercizio (le tre modalità delle dimostrazioni e la scheda esistono già, fuori da `ExerciseView`, e non registrano tentativi).
8. ~~Impalcatura delle visualizzazioni~~: fatta (visualizzazioni parte 1).
9. ~~Caricamento dei contenuti per modulo~~: fatto (involucro parte 3).
   - Fase finita quando: tutte le sezioni funzionano con i contenuti presenti, e l'app è installata su iPhone e funziona offline.

**Fase 5 — Volume 1, Fondamenta** (moduli V1.M01-M14). Piano deciso con Andrea il 20 novembre 2026. Andrea ha l'ordine delle lezioni e dei generatori, uno per sessione, **prima la lezione e poi il suo generatore**. Scalette del Volume 1 approvate: i codici sono fissi.

*Prima di cominciare* (sessioni tecniche ⚙, in quest'ordine; nessuna dipende dai contenuti):

1. ~~Caricamento dei contenuti per modulo~~: fatto (involucro parte 3). Lezioni e generatori nuovi si aggiungono nel file del loro modulo, `src/moduli/vN/mNN.ts`.
2. ~~Figure e grafici nelle lezioni~~: fatto (involucro parte 4). Sintassi in `REGOLE.md`, «Grafici e figure».
3. ~~Impalcatura delle visualizzazioni con `VIS.disequazioni-grafico`~~: fatta (visualizzazioni parte 1). Le altre si copiano da questa (`REGOLE.md`).
4. ~~Le altre quattro visualizzazioni del Volume 1~~: fatte (visualizzazioni parte 2). Le inseriscono le lezioni che le prevedono (V1.M08.L08, V1.M09.L01, V1.M10.L02, V1.M12.L06 e L08), con i parametri delle schede; quando una entra in una lezione vera, il suo blocco si toglie dalla lezione finta e il caso Chrome passa alla prova con la lezione vera.
5. ~~Parser e catalogo~~: fatto (parser del Volume 1). Le forme `√(x² + ax) + x` con `x → −∞` e con il valore assoluto in `V2.M04.A01.g1` restano alla fase 6 (cambiano semi congelati: annotarlo); i generatori del Volume 1 su radicali e valore assoluto possono già usare `ALG.RADICE_DEL_QUADRATO`.
6. ⚙ **Risposta `ordering`** nella schermata di esercizio (punto 7 della fase 4): serve a V1.M11.A08 e alle dimostrazioni.

*Poi le lezioni e i generatori, in modo lineare*, con queste regole:

- La **lezione** si scrive con `abilita: []` e solo domande lampo scritte a mano (la verifica rifiuta un'abilità senza generatore). La sessione del **generatore** aggiunge l'abilità all'intestazione della lezione e le domande lampo prese dal generatore (livello 1 a metà, livello 2 verso la fine), poi ricalcola la durata.
- **Già fatti, da saltare**: la lezione `V1.M06.L04` e il generatore `V1.M06.A04.g1`; il generatore `V1.M04.A07.g1` (la lezione `V1.M04.L07` si scrive e dichiara subito `abilita: [V1.M04.A07]`).
- **V1.M01**: il primo generatore vero o falso diventa il riferimento (tabella di `REGOLE.md`). `V1.M01.A02` (operazioni tra insiemi, prodotto cartesiano) è a **scelta multipla**: il motore non scrive insiemi di elementi né coppie.
- **Unico passo in mezzo**: subito dopo il generatore di `V1.M06.L03`, una sessione breve aggiorna `V1.M06.L04`: prerequisiti `V1.M06.L03`, `V1.M04.L07`, `V1.M05.L05` e rimandi `[[…]]` ai termini che oggi spiega a parole (vedi «Codici assegnati»). Se un generatore di V1.M06 deve usare `DISEQ.ZERO_DOPPIO` in `V1.M06.A04.g1`, cambiano i semi congelati: decisione da annotare.
- **Dentro le sessioni, senza passi a parte**: in V1.M09 almeno un generatore con estremi `e`, `e²`, `ln 2`, con le risposte aggiunte al test di `test/app/moduli.test.ts`; in V1.M10 equazioni goniometriche con soluzioni tutte periodiche (trappole del motore in `REGOLE.md`).
- **Chiusura della fase**: ogni modulo ha lezioni, abilità con generatori verificati e «Lo so già»; prova completa sull'iPhone.

In parallelo, senza bloccare niente: la prova sull'iPhone della versione su Pages (la fa Andrea); i difetti trovati diventano sessioni sull'involucro.

**Fase 6 — Volumi 2 e 3, in parallelo**

1. ⚙ **Prima**: `log` senza base rifiutato negli esercizi del Volume 2 (decisione 5, presa da Andrea).
2. **Lezioni dei generatori già esistenti**: `V2.M06.L03` (regole di derivazione), `V3.M02.L01` (Gauss), `V3.M03.L01` (determinante).
3. ⚙ **Motore**: nodi per successioni e somme (prima delle lezioni di V2.M03 e di V2.M11; i generatori di limiti della sessione E1 non ne hanno avuto bisogno), radice n-esima di `n` (il fattoriale c'è), grafici statici nelle **soluzioni** degli esercizi (nelle lezioni ci sono già), campo `complex` nelle risposte `matrix` (prima dei complessi in V3).
4. **Scaletta, generatori, lezioni con dimostrazioni** (confrontate con un libro di testo; per V2.M05 e V2.M06 cinque sono già in `src/riserva/`: incollarle, cancellare il file di riserva, collegare con `[[…]]` i risultati usati), modulo per modulo, alternando i due binari; le sei visualizzazioni nei loro moduli (V2.M04, M06, M08, M09; V3.M05, M06).
   - Fase finita quando: come il Volume 1, più dimostrazioni interattive per i teoremi principali.

**Fase 7 — sezione Test**: prima la composizione della simulazione TOL e il numero di opzioni (da tarare sulla Demo TOL, specifica sezione 14), poi simulazione a tempo, mini-test di modulo, storico, analisi della penalità.

**Fase 8 — strato adattivo**: formula della padronanza (oggi solo conteggi), ripasso a intervalli, test d'ingresso, Oggi composto da padronanza ed errori.

**Fase 9 — rifinitura**: prestazioni misurate su iPhone XR (all'avvio oggi circa 640 KB di JavaScript, senza contenuti), versione PC provata in Safari e Firefox, ritocchi.

## Codici assegnati (la scaletta deve rispettarli)

| Codice | Che cos'è |
|---|---|
| `V1.M06.L04` | Lezione «Disequazioni fratte» |
| `V1.M06.A04` | Abilità: disequazione fratta — generatore `V1.M06.A04.g1` |
| `V1.M06.D02`, `V1.M06.D03` | Definizioni «Disequazione fratta» (`disequazione-fratta`), «Regola dei segni per una frazione» (`segno-di-una-frazione`) |
| `V1.M06.F01`, `V1.M06.F02` | Flashcard della lezione V1.M06.L04 |
| `V1.M04.L07`, `V1.M04.A07` | Lezione (da scrivere) e abilità: scomposizione — generatore `V1.M04.A07.g1` |
| `V2.M03.A01`, `V2.M03.L02` | Abilità: limiti di successioni — generatore `V2.M03.A01.g1` (sessione E1); lezione di riferimento proposta `V2.M03.L02` «Calcolo dei limiti di successioni» (da scrivere) |
| `V2.M04.A01`, `V2.M04.L03` | Abilità: limiti notevoli e forme indeterminate — generatore `V2.M04.A01.g1` (sessione E1); lezione di riferimento proposta `V2.M04.L03` «Limiti notevoli e forme indeterminate» (da scrivere) |
| `V2.M06.L03`, `V2.M06.A03` | Lezione (da scrivere) e abilità: regole di derivazione — generatore `V2.M06.A03.g1` |
| `V2.M08.A01`, `V2.M08.L03` | Abilità: sviluppi di Taylor nei limiti — generatore `V2.M08.A01.g1` (sessione E1); lezione di riferimento proposta `V2.M08.L03` «Sviluppi di Taylor nel calcolo dei limiti» (da scrivere) |
| `V2.M09.A01`, `V2.M09.L07` | Abilità: integrali indefiniti — generatore `V2.M09.A01.g1` (E2); lezione `V2.M09.L07` (spostata da L04 in E4) |
| `V2.M09.A02`, `V2.M09.L08` | Abilità: integrali definiti — generatore `V2.M09.A02.g1` (E2); lezione `V2.M09.L08` (spostata da L05 in E4) |
| `V2.M10.A01`, `V2.M10.L02` | Abilità: convergenza di integrali impropri — generatore `V2.M10.A01.g1` (E2); lezione proposta `V2.M10.L02` |
| `V2.M11.A01`, `V2.M11.L05` | Abilità: convergenza delle serie — generatore `V2.M11.A01.g1` (E2); lezione `V2.M11.L05` (spostata da L03 in E4) |
| `V2.M12.A01`, `V2.M12.L02` | Abilità: equazioni del primo ordine — generatore `V2.M12.A01.g1` (E2); lezione proposta `V2.M12.L02` |
| `V2.M12.A02`, `V2.M12.L04` | Abilità: equazioni lineari del secondo ordine — generatore `V2.M12.A02.g1` (E2); lezione proposta `V2.M12.L04` |
| `V3.M02.L01`, `V3.M02.A01` | Lezione (da scrivere) e abilità: metodo di Gauss — generatore `V3.M02.A01.g1` |
| `V3.M03.L01`, `V3.M03.A01` | Lezione (da scrivere) e abilità: determinante — generatore `V3.M03.A01.g1` |
| `V2.M05.T01`, `V2.M05.T02` | Teorema degli zeri, teorema di Weierstrass (in `src/riserva/v2/m05/`) |
| `V2.M06.T01`, `V2.M06.T02`, `V2.M06.T03` | Teoremi di Fermat, Rolle, Lagrange (in `src/riserva/v2/m06/`); `T03` per Lagrange è quello degli esempi della specifica |

**Rimandi spostati** (E4, approvati da Andrea): il campo `lesson` di `V2.M09.A01.g1` è ora `V2.M09.L07`, di `V2.M09.A02.g1` `V2.M09.L08`, di `V2.M11.A01.g1` `V2.M11.L05`. Nessun esercizio cambia.

Per i generatori delle sessioni E1 ed E2 i codici di **abilità** (`V2.M03.A01`, `V2.M04.A01`, `V2.M08.A01`) sono fissi; le **lezioni** indicate sono il campo `lesson` dei generatori (dove porta «Torna alla lezione»): la scaletta può mantenerle oppure spostare il rimando a un'altra lezione, purché quella lezione spieghi tutti i casi del livello 3 (numero `e` e fattori oscillanti per le successioni; limiti laterali per le funzioni; prodotti di sviluppi per Taylor). Le altre abilità di quei moduli partono da `A02`.

Liberi per la scaletta di V1.M06: `L01`-`L03` (primo grado, secondo grado, segno di un prodotto), `D01`, `A01`-`A03`. Quando esistono, `V1.M06.L04` prende i prerequisiti `V1.M06.L03` e `V1.M04.L07` (oggi `[]`, perché la verifica rifiuta lezioni che non ci sono), e i termini che oggi spiega a parole (zero di un polinomio, condizione di esistenza, tabella dei segni) diventano rimandi `[[…]]`.

## Problemi noti

Motore (fatto così di proposito; dettagli in `docs/REVISIONE.md` e in `REGOLE.md`, «Trappole del motore»):

- Identità goniometriche, esponenziali e logaritmiche decise solo dal confronto numerico (raramente sbagliato vicino a cancellazioni forti).
- Irriducibilità garantita fino al grado 5; angoli notevoli solo multipli di π/12; autovalori e `realZeros` solo con fattori di primo e secondo grado.
- Insiemi: unione tra soluzioni periodiche e punti o intervalli non rappresentabile (il messaggio parla di «intervallo» anche per un punto); `x = 1 e 2` vale ∅.
- `FORMA.DECIMALE` per valori approssimati solo nelle risposte costanti.
- Parser: il parser degli insiemi non completa i testi a metà (l'app prova le chiusure di `SET_ENDINGS`). Fattoriale, gradi, periodici e notazione scientifica si leggono, con i limiti scritti in `REGOLE.md` («Trappole del motore»): solo `E` maiuscola, `5!=120` è «diverso», il fattoriale non si deriva, nessun vincolo «scrivi come periodico».
- Risposte `matrix`: caselle senza numeri complessi.
- Passaggi della scomposizione di un quadrato di binomio: `(x + 1)(x + 1)` prima di `(x + 1)²` (`src/motore/steps/factor.ts`).

Grafici e figure (involucro parte 4):

- Gli zeri esatti si trovano solo per le funzioni razionali con fattori di grado al più 2; per seno, logaritmo, radici vanno scritti in `punti`. Gli asintoti verticali non razionali (tangente) non si disegnano: la curva è solo interrotta. Nessun asintoto orizzontale od obliquo, nessun massimo o minimo segnato.
- Il testo dentro le figure SVG non passa da KaTeX: solo lettere e numeri semplici (le formule nella didascalia).

Generatori e lezione:

- I limiti di successioni sono scritti come espressioni nella lettera `n`: per questi esercizi i nodi «successione» del motore (fase 6, punto 3) non servono; il fattoriale ora c'è (`n!` confrontato con Γ nei reali), manca `ⁿ√n`.
- Nei limiti di funzioni non ci sono forme con il valore assoluto o con `√(x²) = |x|` per `x → −∞`: l'errore tipico adatto ora c'è (`ALG.RADICE_DEL_QUADRATO`), le forme si aggiungono a `V2.M04.A01.g1` nella fase 6.
- La prova numerica delle verifiche (`confirmsLimit`) lavora in virgola mobile, con tolleranza del 2 per mille: basta a distinguere la risposta giusta da quelle sbagliate, ma non è una dimostrazione. La garanzia vera è il ricalcolo con sympy dal testo, fatto a mano (script fuori dal repository, come per gli altri generatori).

- Al livello 1 scomposizione, Gauss e qualche derivata hanno due sole risposte sbagliate: niente scelta multipla per quegli esercizi.
- Serie di potenze (V2.M11, «varia») non coperte: nessun generatore per il raggio di convergenza (E2).
- Equazioni differenziali: niente equazioni lineari del primo ordine con coefficiente non costante oltre `n/x`, niente termine noto trigonometrico nel secondo ordine; la sostituzione numerica scarta i punti fuori dominio (per `c/x` con `x = 0`) (E2).
- Il controllo delle primitive accetta qualunque funzione con la derivata giusta, anche scritta su un dominio più piccolo, salvo i logaritmi dichiarati dal generatore (`COND.LOGARITMO`) (E2).
- Derivate: una trentina di esercizi «classici» escono circa il 2% delle volte l'uno (sotto la soglia).
- `VIS.disequazioni-grafico` accetta solo funzioni razionali con numeratore e denominatore di grado al più 2 (perché gli zeri di $N - kD$ restino esatti per ogni soglia): niente valore assoluto, radici o esponenziali. Gli asintoti orizzontali non si disegnano (come nei grafici statici).
- Le maniglie delle visualizzazioni non sono ancora provate su un iPhone vero (la prova è in Chrome con il tocco simulato).
- `VIS.trasformazioni-funzioni`: la funzione di partenza deve avere un valore esatto in 1, 2, 0 o −1 (per il punto $P$); con funzioni non razionali gli asintoti verticali si vedono solo se il motore li trova (come nei grafici statici).
- `VIS.coniche-parametri`: solo coniche in forma canonica (ellisse e iperbole con centro nell'origine, parabola con asse verticale); niente traslazioni né parabola con asse orizzontale.
- Le cinque dimostrazioni di riserva seguono le strade classiche dei manuali di Analisi 1 (zeri per bisezione; Weierstrass con una successione che tende all'estremo superiore e Bolzano-Weierstrass; Fermat con il segno del rapporto incrementale; Rolle da Weierstrass e Fermat; Lagrange con la funzione ausiliaria), ma sono state scritte **senza un libro aperto**: il confronto con il libro di testo chiesto da `REGOLE.md` resta da fare quando entrano nelle lezioni.
- Nelle dimostrazioni di riserva i risultati dei moduli non ancora scritti (successioni monotone, Bolzano-Weierstrass, permanenza del segno, continuità per successioni…) sono citati a parole: diventano rimandi `[[…]]` quando le lezioni esistono (elenco in `src/riserva/LEGGIMI.md`). Il teorema dei valori intermedi (V2.M05) e quello di Cauchy (V2.M06) non sono in riserva.
- La prova con sympy dal testo mostrato non è nel repository né in CI: va rifatta a mano per ogni generatore nuovo (`REGOLE.md`).

App:

- Non provata su un iPhone vero.
- Su telefono la riga finale dei passaggi delle disequazioni fratte va fatta scorrere di lato; le opzioni di scelta multipla di un insieme mostrano solo gli intervalli.
- `ordering` non è mostrato dalla schermata di esercizio. Nella lezione le dimostrazioni restano statiche; le modalità interattive sono nella scheda Dimostrazioni.
- Tastiera a 320 px: nel livello Funzioni (7 colonne) i tasti sono larghi circa 37 px, sotto i 44 consigliati; su iPhone XR (414 px) sono 50 px. Base e Funzioni hanno una riga in più (parser del Volume 1): Funzioni è alta circa 350 px, da guardare sull'iPhone.
- Il valore assoluto non è a modello (il tasto scrive una barra sola): `||` vuoto il parser lo legge come due valori assoluti annidati.
- Esportazione del backup su iPhone dall'app installata non provata: c'è anche «Condividi il backup» (foglio di condivisione) dove il browser lo permette.

Altro:

- `README.md` con il solo titolo.
- GitHub Actions avvisa che `actions/checkout@v4`, `setup-node@v4` e `upload-artifact@v4` usano Node 20, deprecato: passare alle versioni successive quando si tocca il workflow.
- Alcuni commit passati hanno il controllo rosso (corretti dai successivi): conta solo l'ultimo stato del ramo.

## Domande aperte (decide Andrea)

- **Scalette dei Volumi 2 e 3** (`docs/SCALETTE.md`): ancora `proposta`; Andrea le guarderà quando si avvicinano, da confrontare con il libro di testo. Il Volume 1 è approvato (vedi «Decisioni di Andrea», punto 6).

## Decisioni di Andrea (20 novembre 2026)

Prese in chat sulle domande aperte; da eseguire nelle sessioni indicate, non ancora fatte.

1. **Errore tipico nuovo «√(x²) = x anche per x negativo»: sì. Fatto** (22 novembre): `ALG.RADICE_DEL_QUADRATO` nel catalogo, in `docs/SPECIFICA.md`, nella copia del Progetto e nello script sympy. Restano le forme `√(x² + ax) + x` con `x → −∞` e con il valore assoluto in `V2.M04.A01.g1` (cambiano alcuni semi congelati: annotarlo). Utile anche nel Volume 1 (radicali, valore assoluto).
2. **Errore tipico nuovo «zero doppio trattato come zero semplice»: sì. Fatto**: `DISEQ.ZERO_DOPPIO` nel catalogo, in `docs/SPECIFICA.md` e nello script sympy. Anche la copia della specifica nel Progetto di Claude è aggiornata (sostituita con `docs/SPECIFICA.md`, con l'autorizzazione di Andrea, 20 novembre 2026). Resta da usarlo nei generatori di V1.M06 (segno di un prodotto; `V1.M06.A04.g1` lo può aggiungere solo decidendo il cambio dei semi congelati).
3. **Intervalli: tonde, `(1; 3)`** (com'è oggi). Le lezioni scrivono gli intervalli così; in lettura resta valido anche `]1; 3[`.
4. **IndexedDB nella versione PC**: la prova in Safari e Firefox resta alla fase 9.
5. **`log` senza base nel Volume 2: rifiutato** come testo ambiguo, con un messaggio che chiede `ln` o la base (⚙ parser, prima delle lezioni del Volume 2). Nel Volume 1 `log` resta in base 10. I testi del Volume 2 scrivono sempre `ln`.
6. **Scalette del Volume 1 approvate** tutte e 14 (V1.M01-M14), senza correzioni, con le scelte da confermare in fondo a `docs/SCALETTE.md`: i codici delle lezioni del Volume 1 sono fissi e le lezioni si possono scrivere.

## Decisioni da rivedere

Prese seguendo la sezione 0 della specifica, dove il testo non decide. Il numero tra parentesi è la sessione.

*Involucro, parte 1 (I1)*

74. Binario attivo all'inizio: solo Fondamenta (decisione di Andrea di partire da V1.M01); gli altri si attivano nelle impostazioni. Tema predefinito «come il telefono», durata proposta 40 minuti.
75. Formula della padronanza, ripasso a intervalli (gradini 1-3-7-16-35-90 giorni), decadimento a 60 giorni: in `REGOLE.md`, «Dati, padronanza e ripasso»; da tarare nella fase 8.
76. «Lo so già»: 5 esercizi ai livelli 2, 2, 2, 3, 3 sui generatori del modulo a turno; superato con 4 giuste; vale per tutte le abilità del modulo (anche senza generatore) e fa saltare le sue lezioni a Oggi. Contesto nuovo dei tentativi: `controllo`.
77. Oggi: un esercizio stimato 2 minuti, una flashcard mezzo; nel ripasso metà tempo alle flashcard; le fasi vuote si saltano da sole; la lezione ha un righello del tempo e, finito il tempo, «Continua domani»; il giorno conta quando si arriva alla chiusura.
78. Alternanza dei binari: dopo il binario dell'ultimo giorno completato viene il successivo tra gli attivi; ma se in quel binario c'è una lezione a metà, si continua quella.
79. Esercizi sulla lezione senza lezione del giorno (o non finita): abilità delle ultime lezioni completate del binario, altrimenti dei generatori del volume, difficoltà automatica.
80. Serie: i giorni liberi coprono ma non allungano la serie; si usano solo con una serie in corso.
81. Diario: le domande lampo non entrano (come per la padronanza); `NON_CLASSIFICATO` sta negli errori di concetto ma non alimenta i punti deboli.
82. Backup: file JSON `compasso-backup-AAAA-MM-GG.json`; importare sostituisce tutto (con conferma) tranne la sessione di Oggi; unire somma i registri, prende il punto più avanti di ogni lezione e tiene impostazioni e sessione del dispositivo; promemoria anche se il backup non è mai stato fatto, appena c'è una lezione o una sessione completata.
83. Riordino delle dimostrazioni con le frecce su/giù invece del trascinamento (più sicuro sul telefono); le dimostrazioni interattive non registrano tentativi.
85. Oggi: «Esci e riprendi dopo» lascia la sessione in pausa (fase, esercizi fatti e tratto della lezione restano salvati); riaprendo l'app la sessione di oggi parte sempre dalla schermata «Sessione in pausa», non dentro la fase. Della lezione si salva l'ultimo tratto aperto: la domanda lampo del tratto torna senza risposta (decisione 35).
86. Aspetto: palette definitiva (chiaro: carta `#f4efe0`, inchiostro `#132a4c`, blu `#1c4d87`, arancio `#a3460a`; scuro: tavola `#0d1a31`, testo `#e9eef9`, blu `#8fbbff`, arancio `#ffa862`), tutti i valori in cima a `styles.css`. Proposta della specifica accolta: **IBM Plex** Sans (400, corsivo, 600 anche per il grassetto) e Mono (400), solo sottoinsieme latino; titoli nello stesso carattere del testo (il serif di prima stonava con KaTeX). Dipendenza nuova `@fontsource/ibm-plex-sans` e `-mono` (solo per la build: copia i file dei caratteri, licenza OFL).
87. Icona: compasso avorio che traccia un cerchio arancione su tavola blu quadrettata, disegno dentro il cerchio centrale (non si taglia se Android la ritaglia tonda); niente icona `maskable` dichiarata.
88. Tastiera: sei livelli; «Matrici» solo con risposte `matrix`, «ℂ» solo con `complex`; apertura: insieme → Insiemi, limite → Analisi, matrice → Matrici, complessi → ℂ, risposta con funzioni, π, e o costanti c → Funzioni, altrimenti Base. Il tasto `∧` è uscito dal livello Insiemi (resta scrivibile da tastiera fisica) per fare posto a `±`, `k`, `π`, `∀x`, `∄x`.
89. Frazione a modello: dopo un numero, una lettera o una parentesi chiusa quello diventa il numeratore (`3/(□)`), con una selezione la selezione, altrimenti `(□)/(□)`. ⇥ dal numeratore entra nel denominatore.
90. ⚙ Parser: `()` vuota = casella da riempire (□, incompleto) invece di «parentesi chiusa in più»; anche dentro `root(3; )`.
91. Matrici: Invio conferma anche dalle caselle (come prima); il passaggio di casella è sui tasti «◂ casella», «casella ▸» e sul tasto Tab della tastiera fisica.
92. ⚙ Parser: i simboli che servono solo agli insiemi (∀, ∄, ∅, ℝ, ∪, ∨, ∧) scritti in un'espressione danno un messaggio che dice che cosa vogliono dire e che lì la risposta non è un insieme (decisione di Andrea, 20 novembre 2026: la tastiera continua a mostrare tutti i livelli in ogni esercizio, riconoscere quale simbolo usare fa parte dello studio).
*Involucro, parte 3 (I3)*

93. Elenchi dei moduli in una cartella nuova, `src/moduli/` (la specifica non la prevede); i 35 file esistono già, anche vuoti, così il registro non si tocca più.
94. L'indice leggero non è un file nel repository: lo calcolano la compilazione e Vitest a ogni avvio (niente file generato da tenere allineato).
95. Versione telefono a moduli ES (`<script type="module">`) invece di un solo script: iOS li supporta da anni; il codice comune lo divide esbuild in `chunks/`.
96. Il test della versione telefono non gira più in jsdom (che non sa eseguire moduli ES) ma in Chrome senza finestra, guidato con il protocollo DevTools da `test/chrome.ts`, senza dipendenze nuove; su GitHub c'è sempre, in locale senza Chrome si salta con un avviso.
97. La pagina del glossario, le dimostrazioni e un termine toccato in una lezione caricano i moduli che servono quando si aprono; le flashcard in scadenza e i loro elenchi vengono dall'indice.

*Involucro, parte 4 (I4)*

98. `src/contenuti/formato/graph.ts` importa dal motore (parser e grafici): la verifica dei contenuti deve leggere le funzioni come le legge il motore. Tabella delle cartelle in `REGOLE.md` aggiornata.
99. Grafico: al più tre funzioni, distinte da colore e tratteggio; finestra in un solo attributo («x min; x max; y min; y max»); disegno 320×240 che si adatta alla larghezza (scale degli assi indipendenti); punti notevoli con lettere in ordine di ascissa e coordinate esatte elencate sotto il disegno, con la legenda delle funzioni.
100. Figura: file `lNN-nome.svg` nella cartella della lezione, elencato in `figures` del modulo; didascalia obbligatoria; colori solo dalle dieci classi `fig-…` (aree trasparenti, unica opacità ammessa oltre a quote e righello).
101. Un blocco grafico o figura sbagliato resta nella lezione con il messaggio «Problema: …» nel riquadro (gli altri blocchi sbagliati, come prima, spariscono); la verifica dei contenuti lo boccia comunque.

*Visualizzazioni, parte 1 (V1)*

102. `VIS.disequazioni-grafico`: soglia a passi di ½ (esatta), parametri `funzione` (da 1 a 4, separate da `;`), `soglia`, `verso`, `finestra`; funzioni razionali con gradi al più 2. Sonda in più rispetto alla specifica, per collegare un punto del grafico a una colonna della tabella.
103. Colori fissati dalla prima visualizzazione: retta e maniglie arancioni, curva ripassata blu più spessa, soluzione sull'asse verde, caselle della soluzione con fondo blu chiaro e ✓.
104. La tabella della visualizzazione mostra le righe di $N - kD$ e di $D$ ridotti a coefficienti interi (con $k = 0$ e le funzioni della lezione coincidono con le tabelle degli esempi); $D$ costante non ha riga.
105. Nuova cartella `src/visualizzazioni/` nella tabella di `REGOLE.md`: importa da `motore`, `contenuti/formato` (per `readGraph`) e `app/componenti` (`RichText`); `index.ts` è scritto con `h()` per restare `.ts`.
106. La verifica dei contenuti riceve anche il controllo dei parametri (`visualizationParams`, facoltativo): un parametro sbagliato è un problema con la riga.

*Visualizzazioni, parte 2 (V1)*

107. Intervalli dei cursori scelti qui: trasformazioni $a, b \in [-3; 3] \setminus \{0\}$, $c, d \in [-5; 5]$, passo ½; basi dell'esponenziale $\tfrac15 … 5$ più $e$ e $1$; angolo in gradi interi con aggancio ai multipli di 15° entro 4°; coniche: circonferenza $a, b \in [-6; 6]$, $c \in [-12; 12]$ interi, parabola $a$ a passi di ½ in $[-3; 3]$, $b, c$ interi in $[-6; 6]$, semiassi a passi di ½ in $[\tfrac12; 6]$.
108. Esponenziale, circonferenza e coniche hanno la finestra fissa con unità uguali (niente parametro `finestra`): forme e simmetrie si vedono giuste.
109. Parametri in più rispetto alla specifica: `cursori` (trasformazioni), `logaritmo` (esponenziale: V1.M09.L01 viene prima dei logaritmi), `tangente` (circonferenza: la tangente è in V1.M10.L03), `coniche` (quali coniche mostrare).
110. Colori: curva trasformata e conica blu, fuochi e tangente arancioni, coseno blu e seno verde (sempre anche con il nome scritto), logaritmo arancione tratteggiato, $y = x$ verde a puntini.
111. Sopra il disegno solo comandi che non cambiano altezza (le formule stanno sotto): regola aggiunta a `REGOLE.md`.

*Parser del Volume 1 (P1)*

112. Periodo tra parentesi **attaccate** ai decimali e fatte di sole cifre: `0,5(3)` ora è il periodico 0,5333…, non 0,5·3 (`0,5 (3)` con lo spazio e `0,5(x+1)` restano prodotti); `2(3)` resta 2·3. Lineetta accettata (U+0305, U+0304) sulle ultime cifre; il periodo 9 è ammesso (`0,(9)` vale 1, mostrato com'è scritto).
113. Un periodico non è un decimale: mai FORMA.DECIMALE, ed è giusto dove serve il valore (`0,1(6)` per 1/6). Dove serve la frazione generatrice il generatore dichiara `reducedFraction`, che rifiuta i periodici (FORMA.NON_RICHIESTA). Nessun vincolo «scrivi come periodico».
114. Notazione scientifica: solo `E` maiuscola subito dopo il numero (`2e5` resta 2·e·5); `3,2E5` diventa gli stessi nodi di `3,2·10^5`. `3,2·10^5` contro la risposta intera 320000 è FORMA.DECIMALE come ogni decimale: gli esercizi di notazione scientifica scrivono la risposta giusta con il decimale e dichiarano `scientificNotation`.
115. Gradi come funzioni del motore (`deg`, `arcmin`, `arcsec`) che valgono in radianti: `30°` è equivalente a `π/6` e non a `30`; negli esercizi di conversione si dichiara `degrees` o `radians`. Un numero in fondo al testo dopo i gradi o i primi è l'unità successiva da scrivere (`30°15` incompleto). `º` vale come `°`, `'` e `’` come `′`, `''` e `"` come `″`. `degrees` vuole primi e secondi minori di 60 e ognuno una volta sola, in ordine.
116. Fattoriale come funzione `factorial`: lega più del prodotto (`2n! = 2·(n!)`); esatto per i naturali fino a 300, poi atomo; nei reali vale Γ(x + 1), solo per il confronto numerico (così `n!/(n−1)! = n`); non si deriva (`EngineError`). `!=` resta «diverso» (`5!=120` è 5 ≠ 120).
117. Tastiera: una riga in più in Base (`n!`, `·10ⁿ` a modello, «periodo» largo due che scrive `(‸)`, `n`, `k`) e in Funzioni (`°` largo due, `′`, `″`, α, β, θ). Gradi aprono Funzioni (dove c'è π), il fattoriale Base.
118. `ALG.RADICE_DEL_QUADRATO`: categoria ALG (come `ALG.RADICE_SOMMA`), rimando V1.M03 (radicali), finché le lezioni non esistono.

84. Programma generato in `src/contenuti/programma/data.ts` dalle scalette, con un test di allineamento; nuova cartella `src/contenuti/programma/`.

*Scrittura e lettura*

1. Intervalli con punto e virgola e tonde per gli estremi esclusi, `(1; 3]`; in lettura anche `]1; 3[` e la virgola non tra cifre (2).
2. `(1,5)` è il numero 1,5; `{1,2}` è rifiutato come ambiguo (2, 4a).
3. Un numero da solo, in una risposta di tipo insieme, vale `x = numero` (2).
4. `[1; 2] ∪ [2; 3]` vale `[1; 3]`; la forma canonica si pretende solo con `canonicalForm: true`; estremo decimale per uno esatto = `FORMA.DECIMALE` (2).
5. `log` senza base = base 10, `ln` = naturale; nel Volume 2 `log` senza base è rifiutato (deciso da Andrea, 20 novembre 2026; da fare) (1).
6. `1/2x` = `(1/2)·x`; `sin π/3` = `sin(π/3)`, ma `sin x/2` = `(sin x)/2` (1, 4a).
7. `i` è l'unità immaginaria solo negli esercizi sui complessi; `e` è sempre il numero di Nepero (1).
8. `[−∞; 2]` è testo non valido, non un errore `DISEQ.ESTREMI` (4a).
9. `;` tra più soluzioni vale «oppure» solo tra uguaglianze o numeri (4a).
10. Limiti di lunghezza: 1.000 caratteri per un'espressione, 2.000 per un insieme (parser), 200 nei campi dell'app (4a, 4b).

*Valutazione*

11. «Equivalenti» = uguali dove entrambe sono definite; le condizioni di esistenza si chiedono con una risposta di tipo insieme (1).
12. Un decimale è `FORMA.DECIMALE` anche quando è esatto, salvo risposte decimali o approssimazioni chieste; un decimale approssimato è riconosciuto se è arrotondamento o troncamento della giusta (1).
13. Testo non interpretabile = esito `invalid`, non registrato (1).
14. Scelta multipla da qualunque esercizio con almeno tre risposte sbagliate previste; cinque opzioni con quattro o più (1). Da allineare al TOL vero.
15. Confronto numerico: 12 punti concordi, tolleranza relativa 10⁻⁸ (1).
16. «Scomposta» = irriducibile sui razionali fino al grado 5; accettati `(x+1)(x+1)` e fattori irrazionali (1).
17. Vincoli di forma severi: `simplifiedRadicals` rifiuta `√2·√3` e `(√2)³`; `rationalized` la frazione sotto radice; `reducedFraction` vede l'intero comune tra i radicali (4a). `algebraicForm` accetta parti reali con termini non sommabili (2).

*Generatori e verifica*

18. Aggiunte allo schema: `title`, `limits`, `verify`, `canonicalForm`; tipo di risposta in più `limit` (1, 2).
19. Soglie della verifica: 50 ms al massimo e 5 ms in media per esercizio; limiti di pulizia anche per le sbagliate; confronto «non deciso» = problema; varietà: almeno 100 esercizi diversi per livello e nessuno oltre il 4% dei semi (2, 4b).
20. `Rng` sfc32 con chiave `codice|livello|seme`, congelato (1).
21. Esercizi cambiati per alcuni semi nella revisione 4b (scomposizione livelli 2-3, derivate livello 2, Gauss livello 1, fratte livello 3): un vecchio tentativo su quei semi mostra l'esercizio nuovo (4b).
22. Zero doppio con verso stretto: la disequazione prende l'uguale, per avere tre risposte sbagliate (4b).
23. Risposte sbagliate diverse con lo stesso codice di errore ammesse (3).
24. «Determinanti e sistemi lineari» = due generatori in due moduli (3).
25. Scomposizioni: fattori di primo grado per radice crescente; `simplify` con una sola linea di frazione e lettere in ordine alfabetico (2).
26. Matrici: polinomio caratteristico `det(A − λI)`; pivot = primo elemento non nullo; con i parametri rango «generico» (2).
27. Complessi: argomento principale in (−π, π]; radici con argomenti `(θ + 2kπ)/n` (2). Da allineare al libro di Analisi 1.

*Contenuti*

28. Sintassi delle lezioni perfezionata (obiettivo, riepilogo ultimo, blocco glossario, `nome` obbligatorio, `::sezioni`, `[[termine|testo]]`, blocchi non annidati, durata 10-20 imposta) (1).
29. Ogni dimostrazione a passaggi, con almeno due versioni sbagliate (1).
30. Termine usato fuori dalla catena dei prerequisiti = avviso; abilità dichiarata da due lezioni = errore (2).
31. Prerequisiti di V1.M06.L04 vuoti finché le lezioni precedenti non esistono (3).
32. Glossario ricavato dalle lezioni; la cartella `src/glossario/` resta vuota e si può togliere (3).
33. Visualizzazioni: SVG con Preact senza librerie, file in `src/visualizzazioni/`, scheda di ognuna in `docs/VISUALIZZAZIONI.md` prima del codice (4c, proposta in `REGOLE.md`: la fissa la prima visualizzazione).
34. Scalette dei moduli in `docs/SCALETTE.md` (nome dato dal compito della sessione E4; prima proposto `SCALETTA.md`) (4c, E4).

*App e dati*

35. Lezione a tratti: il tratto successivo si apre dopo la risposta alla domanda lampo; riaprendo, le domande già viste tornano senza risposta (3).
36. Cinque esercizi dopo la lezione, livelli 1, 1, 2, 2, 3 (3).
37. Tastiera come testo (`/`, `^`, `√(`), livello Funzioni già presente (3).
38. Distrazioni contate come errori, con un conteggio a parte; nessuna formula di padronanza ancora (3, 4b).
39. «Esercizio simile» e «Avanti» scartano i testi già usciti nella serie (fino a 12 tentativi) (4b).
40. Risposta sbagliata non riconosciuta: la soluzione si apre da sola; campo vuoto di un insieme: l'anteprima mostra come si scrive (4b).
41. Formule dei testi ingrandite dal foglio di stile (3).

*Tecnica*

42. Dipendenze alle ultime maggiori (Preact 11, TypeScript 7, Vitest 5, esbuild 0.28, KaTeX 0.19), CI con Node 22; Markdown con `marked` (0, 1).
43. Service worker senza `skipWaiting`; percorsi relativi; solo caratteri KaTeX woff2 (0).
44. Catalogo errori come file TypeScript; rimandi a livello di modulo; `NON_CLASSIFICATO` costante; verifica sympy fuori da CI (0).
45. `ALG.SOMMA_QUADRATI` limitato a `x² + 9` (`x⁴ + 4` si scompone): la specifica andrebbe precisata (0).
46. Cartelle in più: `src/esercizi/`, `src/codici.ts`, `src/contenuti/formato/`, `motore/complex/`, `motore/steps/`, `motore/display/` (1, 2).
47. Rimandati: grafici statici e nodi per successioni e somme (2); sono nel piano, fase 6.

*Dimostrazioni di riserva*

48. Cartella nuova `src/riserva/<volume>/<modulo>/tNN.md`: un file per teorema, con solo i blocchi `teorema` e `dimostrazione`; fuori da `src/contenuti/` perché lì ogni file deve essere una lezione. Il test le verifica dentro una lezione di prova (codici `L99`, `L98`…) (4d).
49. Codici dei teoremi assegnati prima della scaletta: `V2.M05.T01`-`T02`, `V2.M06.T01`-`T03` (4d).
50. Teorema degli zeri dimostrato per bisezione (non con l'estremo superiore): richiede le successioni di V2.M03, che nel programma vengono prima (4d).
51. Enunciati su un intervallo `[a; b]` con `a < b`; Fermat su un intervallo aperto `(a; b)`; il caso del minimo ricondotto al massimo passando a `−f`, scritto per esteso nell'ultimo passaggio (4d).
52. Nella modalità «riordina» l'ultimo passaggio non è sempre fisso: dove l'ordine è già obbligato, si sono segnati fissi i passaggi che altrimenti si potrebbero scambiare (i due lati in Fermat, le due proprietà di `g` in Lagrange), restando entro un terzo (4d).
53. Codici di abilità `V2.M03.A01`, `V2.M04.A01`, `V2.M08.A01` assegnati prima della scaletta; lezioni di riferimento proposte `V2.M03.L02`, `V2.M04.L03`, `V2.M08.L03` (E1).
54. Cinque errori tipici nuovi: `AN.CONFRONTO_INFINITI`, `AN.FATTORE_LIMITATO`, `AN.LIMITE_NOTEVOLE`, `AN.SEGNO_INFINITO`, `AN.TAYLOR_SVILUPPO`. L'ultimo è volutamente largo (fattoriale, segni, denominatori dimenticati, sostituzione di `ax` fatta a metà): se nel diario servirà distinguerli, va diviso (E1).
55. `AN.CONFRONTO_INFINITI` copre anche «la regola dei gradi usata in un punto finito»; `AN.SEGNO_INFINITO` copre sia il segno sbagliato sia `±∞` al posto di «non esiste» (e viceversa) (E1).
56. Verifica indipendente dei limiti = prova numerica vicino al punto (destra e sinistra, posti pari e dispari), non un calcolo simbolico: il motore non calcola limiti (specifica, sezione 6) (E1).
57. Il testo dei limiti chiede sempre «un numero in forma esatta, oppure +∞, −∞ o "non esiste"», anche quando la risposta è per forza un numero (Taylor): non suggerisce il tipo di risposta (E1).
58. Limite notevole `(1 + 1/t)^t → e` usato anche per `t → −∞` (con le basi negative), dichiarato nei passaggi: la lezione dovrà dimostrarlo o enunciarlo (E1).
59. Taylor: limiti di pulizia più larghi (interi e denominatori fino a 60) perché i coefficienti `1/24`, `1/48` sono propri dell'argomento; un errore di sviluppo che lascia termini non cancellati non diventa una risposta sbagliata prevista (chi se ne accorge si ferma) (E1).
60. `sin(−x)` e `cos(−x)` non compaiono; argomenti negativi solo per esponenziale e logaritmo. `arctan t / t → 1` è trattato come limite notevole dal livello 2 (E1).
61. Schema degli esercizi esteso (in `src/esercizi/`, non nel motore): risposta `expression` con `check` opzionale; con il controllo, `correct` è la scrittura mostrata e deve superarlo; i vincoli di forma non si usano (E2).
62. Primitive: senza costante arbitraria è `AN.COSTANTE_INTEGRAZIONE` anche se la derivata è giusta; l'ultima opzione sbagliata è sempre la primitiva giusta senza `+ c` (E2).
63. Equazioni differenziali: le costanti si contano come rango numerico delle derivate rispetto alle lettere (`c₁eˣ + c₂eˣ` ne ha una); nei problemi di Cauchy sia «costanti lasciate» sia «condizioni non rispettate» sono `AN.CAUCHY_CONDIZIONI` (E2).
64. Convergenza (V2.M10, V2.M11) come scelta multipla «verdetto: giustificazione»: un'opzione con il verdetto giusto ma il criterio sbagliato è sbagliata. Per le serie a segni alterni i verdetti sono «converge assolutamente», «converge, ma non assolutamente», «non converge» (E2).
65. Diciotto errori tipici nuovi (`AN.PRIMITIVA_ELEMENTARE`, `AN.SOSTITUZIONE_FATTORE`, `AN.INTEGRAZIONE_PARTI`, `AN.INTEGRALE_PRODOTTO`, `AN.FRATTI_SEMPLICI`, `AN.ESTREMI_INTEGRALE`, `AN.SOGLIA_CONVERGENZA`, `AN.IMPROPRIO_SINGOLARITA`, `AN.CRITERIO_INCONCLUDENTE`, `AN.CONFRONTO_VERSO`, `AN.LEIBNIZ_IPOTESI`, `AN.CONVERGENZA_ASSOLUTA`, `AN.EDO_COSTANTE`, `AN.EDO_SEPARAZIONE`, `AN.EDO_FATTORE_INTEGRANTE`, `AN.EDO_CARATTERISTICA`, `AN.EDO_PARTICOLARE`, `AN.CAUCHY_CONDIZIONI`), con esempi verificati in `scripts/verifica-esempi-errori.py` (E2).
66. Tastiera: tasti `c`, `c₁`, `c₂`, `k`, `x²`, `y` aggiunti al livello Funzioni (scrivono `c_1`, `c_2`): senza, primitive ed equazioni differenziali non si potevano scrivere dal telefono (E2).
67. Integrali definiti: logaritmi raccolti in uno solo quando l'argomento resta piccolo (`4 ln(4/3)`), altrimenti un logaritmo per primo (`11 ln 2 − 3 ln 5`); un errore sugli estremi è sempre tra le opzioni (E2).

*Scalette (E4)*

68. Rimandi di tre generatori spostati alla lezione che spiega tutti i casi del livello 3: `V2.M09.A01.g1` → L07, `V2.M09.A02.g1` → L08, `V2.M11.A01.g1` → L05 (E4; fatto, scelta lasciata da Andrea al modello).
69. `V1.M06.L04` prende anche il prerequisito `V1.M05.L05` (equazioni fratte), da cui arriva `condizione-di-esistenza` (E4).
70. Goniometria (V1.M10) usa Pitagora prima della sua dimostrazione (V1.M11.L04) e definisce `circonferenza`, `raggio`, `angolo`, `triangolo-rettangolo`, `cateto`, `ipotenusa`; il piano cartesiano nasce in V1.M07.L04 (E4).
71. Equazioni irrazionali e con valore assoluto (V1.M05) risolte con la verifica, perché le disequazioni vengono dopo (E4).
72. Il limite (1 + a/n)ⁿ → eᵃ si usa in V2.M03.L02 e si dimostra in L05 (E4).
73. Venti teoremi solo enunciati, con il motivo; enti primitivi senza voce di glossario; ogni lezione ha almeno un'abilità (E4).
