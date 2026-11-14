# STATO

Aggiornato alla fine di ogni sessione. Ultimo aggiornamento: fine della sessione 4b (revisione di generatori, lezione e app).

## Fatto

**Sessione 0 — impalcatura (fase 1)**

- Progetto TypeScript con Preact, @preact/signals, esbuild, Vitest, KaTeX. Due build dallo stesso codice (`dist/telefono/` PWA offline, `dist/pc/compasso.html` file unico). App vuota con le cinque sezioni.
- Workflow GitHub Actions: tipi, build, test a ogni push; pubblicazione su GitHub Pages dal ramo `main`.
- `docs/SPECIFICA.md`, catalogo errori in `src/errori/` (65 voci, 12 categorie) con verifica sympy degli esempi, `REGOLE.md` (scheletro).

**Sessione 1 — architettura e nucleo del motore (fase 2, prima metà)**

- **`docs/ARCHITETTURA.md`**: architettura del motore per l'intero perimetro della sezione 6 (tre volumi), con quello che è fatto (✅) e quello che resta alla sessione 2 (🔜) già collocato; come si estende ad analisi 2 e alla fisica.
- **Numeri esatti** (`src/motore/numbers/`): interi `bigint`, `Rational` (frazioni sempre ridotte, lettura e scrittura dei decimali con la virgola), `Surd` (numeri con radici quadrate: campo esatto con razionalizzazione e segno esatto). π ed e sono simboli.
- **Generatore casuale con seme** (`random/rng.ts`): deterministico, sequenza congelata da un test.
- **Espressioni** (`expr/`): albero immutabile fedele alla scrittura (12 tipi di nodo), costruttori, visita, sostituzione, valutazione numerica, equazioni e disequazioni come oggetti.
- **LaTeX** (`expr/latex.ts`): convenzioni italiane (virgola decimale, punto di moltiplicazione solo dove serve); ogni uscita provata con KaTeX rigoroso.
- **Parser tollerante** (`parser/`): moltiplicazione implicita, virgola o punto, `sqrt`/`√`, `x^2`/`x²`, `pi`/`π`, funzioni con o senza parentesi e con i nomi italiani (sen, tg, arcsen…), logaritmi con base, valore assoluto, percentuali, relazioni; testo incompleto completato con `□` per l'anteprima in tempo reale; errori in italiano con posizione; non lancia mai.
- **Forma normale ed equivalenza** (`algebra/poly.ts`, `algebra/normalize.ts`, `equivalence/`): confronto esatto con polinomi in più «atomi» a coefficienti `Surd` e prodotto in croce per le frazioni; ripiego numerico deterministico in punti casuali per le identità goniometriche, esponenziali e logaritmiche.
- **Polinomi in una variabile** (`algebra/upoly.ts`): divisione con resto, MCD, radici razionali, irriducibilità e scomposizione sui razionali (completa fino al grado 5); **restrizione a una retta** per i polinomi in più variabili (`algebra/specialize.ts`).
- **Vincoli di forma** (`form/`): `expanded`, `factored`, `reducedFraction`, `rationalized`, `simplifiedRadicals`, `algebraicForm`, `trigonometricForm`, ognuno con il motivo in italiano quando non è rispettato.
- **Tipi per il resto del perimetro**: insiemi di soluzioni (`sets/types.ts`), matrici e vettori con confronto e LaTeX (`linalg/matrix.ts`), valori di limite con lettura, confronto e LaTeX (`calculus/limit.ts`).
- **Schema dei generatori e valutazione** (`src/esercizi/`): tipi di generatore, esercizio, otto tipi di risposta con le risposte sbagliate previste tipizzate; `defineGenerator`, `generateExercise` (deterministico, controlla le regole di base), `evaluateResponse` (giusta / sbagliata con codice di errore o `NON_CLASSIFICATO` / non data / non valida; `FORMA.DECIMALE` e `FORMA.NON_RICHIESTA`), `choiceOptions` (qualunque esercizio con tre risposte sbagliate previste diventa scelta multipla).
- **Codici fissi** (`src/codici.ts`): tipi e controlli di forma per tutti i codici della sezione 4.
- **Formato delle lezioni** (`src/contenuti/formato/`): sintassi fissata, `parseLesson` (legge e controlla una lezione, con riga e motivo di ogni problema), `lessonReferences`, `splitInline`.
- **`REGOLE.md`, parte tecnica**: convenzioni del codice, il motore in breve, come si aggiunge un generatore, come si scrive una lezione. Un test controlla che gli esempi di REGOLE.md funzionino davvero.
- **Test**: 553 test in 15 file alla fine della sessione.

**Sessione 2 — motore completo e sistema di verifica (fase 2, seconda metà)**

- **Pulizia e sviluppo** (`algebra/simplify.ts`, `algebra/expand.ts`): `simplify` (coefficienti, segni, una sola linea di frazione, potenze, termini simili, radicali numerici in forma normale, potenze di `i`; non sviluppa e non scompone) ed `expand` (sviluppo dalla forma normale); passaggio tra espressioni e polinomi in una variabile.
- **Derivate simboliche** (`calculus/derive.ts`): somma, prodotto, quoziente, potenza, esponenziale, composizione, tutte le funzioni elementari; regole usate per i passaggi; verifica delle primitive derivandole (`isAntiderivative`).
- **Matrici esatte** (`linalg/`): somma, prodotto, potenza, trasposta, traccia, determinante (Laplace senza divisioni), inversa, rango, nucleo, sistemi lineari (una, nessuna, infinite soluzioni); **riduzione di Gauss con ogni operazione elementare registrata** e scritta in LaTeX; polinomio caratteristico, autovalori (razionali, con radicali, complessi), autovettori, diagonalizzabilità, costruzione all'indietro `P·D·P⁻¹`. Funziona con numeri esatti, complessi e parametri.
- **Numeri complessi** (`numbers/complex.ts`, `complex/`): aritmetica esatta, angoli notevoli (multipli di π/12), le tre forme (algebrica, trigonometrica, esponenziale) e il passaggio dall'una all'altra, potenze (De Moivre), radici n-esime; valutazione numerica complessa (`evaluateComplex`) usata dall'equivalenza; vincolo di forma `exponentialForm`.
- **Insiemi di soluzioni** (`sets/`, `parser/sets.ts`): intervalli, unioni, punti isolati, ∅, ℝ, soluzioni periodiche; forma canonica, unione, intersezione, complementare, differenza, appartenenza, confronto per struttura (anche tra periodi scritti in modo diverso); LaTeX con le convenzioni italiane; lettura di quello che scrive Andrea (intervalli, disuguaglianze, `x = π/6 + 2kπ`, `±`). Le risposte di tipo insieme ora **si valutano** e diventano scelta multipla.
- **Tabelle e passaggi** (`display/`, `steps/`): tabella dei segni (dati, LaTeX, soluzione della disequazione, passaggi dello studio del segno), tabella di variazione (andamento, massimi e minimi), sistemi con la graffa; passaggi di formula risolutiva (anche con soluzioni complesse), Ruffini con la tabella, divisione tra polinomi, scomposizione (raccoglimento, prodotti notevoli, trinomio speciale, Ruffini); mcm di polinomi.
- **Verifica automatica dei generatori** (`esercizi/verify.ts`): i **nove controlli** della specifica, sezione 12, su 2.000 semi per livello, con rapporto in italiano (controllo, livello, seme) e avvisi. Provata sul **generatore minimo di prova** (`test/esercizi/fixtures/sample-generator.ts`, una disequazione di primo grado): lo supera, e per ogni controllo una variante difettosa dimostra che il difetto viene scoperto.
- **Verifica automatica dei contenuti** (`contenuti/formato/verify.ts`): intestazioni, posto dei file, codici unici, prerequisiti (esistenti, senza giri), rimandi a glossario, lezioni, definizioni, teoremi, errori, generatori e visualizzazioni, termini definiti una volta sola; ricava il glossario. Provata su lezioni minime di prova.
- **Documenti**: `docs/ARCHITETTURA.md` aggiornato a quello che esiste; `REGOLE.md` con il motore completo e la procedura di verifica di un generatore (gli esempi sono provati da un test).
- **Test**: 872 test in 24 file, verdi in locale e su GitHub. Tempi: la verifica del generatore di prova (4.000 esercizi) richiede meno di un secondo; generare un esercizio di prova circa 0,02 ms.

**Sessione 3 — generatori di riferimento e fetta verticale (fase 3)**

- **Cinque generatori di riferimento** in `src/generatori/` (il quarto punto della specifica, «determinanti e sistemi lineari», è diventato due generatori, uno per modulo), ognuno con tre livelli, verifica indipendente e test che chiama `verifyGenerator` (2.000 semi per livello, zero problemi e zero avvisi):
  - `V1.M06.A04.g1` disequazioni fratte (risposta: insieme). Tabella dei segni nei passaggi; risposte sbagliate per `DISEQ.SEGNO_DENOMINATORE`, `DISEQ.UNIONE_INTERSEZIONE`, `DISEQ.ESTREMI`, `COND.DENOMINATORE`, più `CALC.MENO_PARENTESI` e `DISEQ.SECONDO_GRADO`. Verifica: la disequazione provata con conti esatti in un centinaio di punti.
  - `V1.M04.A07.g1` scomposizione di polinomi (espressione con vincolo di forma `factored`). Passaggi di `factorPolynomial`.
  - `V2.M06.A03.g1` derivate: prodotto, quoziente, funzione composta (espressione libera); al livello 3 due regole insieme.
  - `V3.M03.A01.g1` calcolo del determinante, ordine 2, 3 e 4 (numero esatto).
  - `V3.M02.A01.g1` sistemi lineari con Gauss, 2×2 e 3×3, al livello 3 con scambio di righe (vettore colonna).
- **Elenco dei generatori** (`src/generatori/index.ts`) e **strumenti comuni** (`src/generatori/comuni/`); un test controlla che ogni file sia in elenco e abbia il suo test.
- **Catalogo errori: 7 voci nuove** (72 in tutto), anche nella tabella di `docs/SPECIFICA.md` e nei controlli sympy: `CALC.SEGNO_TRASPORTO`, `ALG.RACCOGLIMENTO`, `ALG.SEGNI_FATTORI`, `AN.DERIVATA_QUOZIENTE`, `ALIN.GAUSS_TERMINE_NOTO`, `ALIN.DET_SEGNI`, `ALIN.DET_DIAGONALE`.
- **Lezione `V1.M06.L04` «Disequazioni fratte»** (`src/contenuti/v1/m06/l04.md`): due definizioni, tre esempi svolti con la tabella dei segni, quattro riquadri attenzione, quattro domande lampo (due scritte a mano, due dal generatore), due flashcard, riepilogo. `src/contenuti/index.ts` elenca le lezioni; un test esegue `verifyContents` su tutte le lezioni vere contro l'elenco dei generatori veri.
- **Strato dei dati** (`src/dati/`): registro dei tentativi e progressi delle lezioni in **IndexedDB con numero di versione dei dati** (`DATA_VERSION = 1`), ripiego su localStorage e poi memoria, migrazioni, dati di versione futura rifiutati. Provato con `fake-indexeddb`.
- **Fetta verticale nell'app**:
  - Teoria: la lezione letta dal Markdown, mostrata a tratti che finiscono con una domanda lampo; si riprende dal tratto raggiunto; alla fine, cinque esercizi a livelli crescenti (1, 1, 2, 2, 3).
  - Schermata di esercizio completa: risposta scritta con anteprima in tempo reale, scelta multipla, caselle per i vettori, «Non lo so», due indizi, esito con icona e parola, errore riconosciuto con nome, spiegazione ed esempio dal catalogo, risposta giusta, soluzione passo passo, «Esercizio simile», «Torna alla lezione», «Segna come distrazione»; codice del generatore, livello e seme nell'angolo.
  - Tastiera matematica con i livelli Base, Insiemi e Funzioni; sul telefono la tastiera di sistema non si apre, sul computer si scrive con quella fisica e Invio conferma.
  - Esercizi: i cinque generatori, per livello. Tu: conteggi e stato dei dati. Oggi: scorciatoia alla lezione. Test: segnaposto.
  - Primo abbozzo dello stile Compasso: carta avorio con quadrettatura, blu progetto, accenti arancioni, riquadri per tipo con etichetta a parole, tema chiaro e scuro secondo il sistema.
- **`REGOLE.md`**: «Come replicare un generatore» (tabella dei riferimenti, struttura in cinque parti, procedura, abitudini), la lezione di riferimento, «L'app in breve». **`docs/ARCHITETTURA.md`**: sezione 15 bis.
- **Prove fatte**: percorso completo in un telefono simulato (Chromium con le misure di un iPhone 11, tema chiaro e scuro): lezione dall'inizio alla fine, esercizi, dati che restano dopo il ricaricamento, nessun errore in console, nessuno scorrimento orizzontale. Versione PC aperta come file in Chromium: funziona, IndexedDB compresa. **Non è stata fatta una prova su un iPhone vero**: è la prima cosa da fare.
- **Test**: 941 test in 33 file. La prova end-to-end percorre lezione ed esercizio nelle due versioni compilate.

**Sessione 4a — revisione del motore**

- Tutto `src/motore` riletto e provato a tappeto contro modelli indipendenti (dettagli, metodo e numeri in `docs/REVISIONE.md`). Solidi e senza difetti: numeri, forma normale, `simplify`, `expand`, equivalenza, derivate, operazioni sugli insiemi, matrici, complessi, tabelle, passaggi.
- **19 correzioni**, ognuna con il suo test: LaTeX rotto per `1 + (−x)y`; parser che poteva lanciare; segno «esatto» dei radicali che non lo era sempre; cinque vincoli di forma che accettavano risposte sbagliate (`√(1/2)`, `2√2/2`, `(√2)³`) o rifiutavano risposte giuste (`3 + 2√2`, `((x+1)(x−1))²`); ordine dei fattori che dipendeva dalla lingua del dispositivo; il numero e letto come congiunzione negli insiemi (`x ≤ e ∨ x ≥ e²`); `[−∞; 2]` e `{1,2}` accettati o fraintesi in silenzio.
- Fuori dal motore solo `SET_ENDINGS` in `src/app/risposta/preview.ts` (quattro chiusure in più, per restare allineati al parser).
- **Test**: 976 in 33 file. I 45.000 esercizi dei cinque generatori (3 livelli, semi 1-3000) sono identici, byte per byte, a prima della revisione.

**Sessione 4b — revisione di generatori, lezione e app**

- Cinque generatori, lezione `V1.M06.L04` e fetta verticale riletti e provati (metodo, tabella delle 23 correzioni e numeri in `docs/REVISIONE.md`, seconda parte). **Nessuna risposta giusta sbagliata**: 26.718 esercizi diversi rifatti con sympy a partire dal testo mostrato, zero problemi.
- **Generatori**: varietà della scomposizione (livello 3 da 78 a 193 esercizi diversi; `x⁴ − 1` non esce più una volta su quindici); errore «verso non invertito» nelle disequazioni fratte e almeno tre risposte sbagliate in ogni esercizio dei livelli 2 e 3; passaggi completi (segno dei trinomi, sostituzione all'indietro in Gauss, minori di ordine 3); niente sistemi 2×2 banali. La verifica automatica ora avvisa sulla poca varietà; semi congelati per tutti i generatori.
- **Lezione**: definizione precisa, zero doppio e polinomio senza zeri spiegati (gli esercizi di livello 3 li usano), passo 1 nel terzo esempio, `∨` spiegato. 19 minuti.
- **App**: l'anteprima non dà più per sbagliato un pezzo di risposta giusta (`-4 <`, `[2`); i motivi del parser con le formule si disegnano; le distrazioni restano errori; la soluzione si apre da sola quando l'errore non è riconosciuto; «Esercizio simile» non ripete; piccoli difetti di tastiera, salvataggio e a capo.
- `REGOLE.md`: abitudini nuove in «Come replicare un generatore» (varietà, passaggi completi, una riga uno schermo, semi congelati). **Test**: 985 in 34 file.

## In corso

Niente. La sessione 4b è completa e caricata su GitHub (ramo `main`), controllo verde.

## Codici assegnati (la scaletta futura deve rispettarli)

| Codice | Che cos'è |
|---|---|
| `V1.M06.L04` | Lezione «Disequazioni fratte» (`src/contenuti/v1/m06/l04.md`) |
| `V1.M06.A04` | Abilità: risolvere una disequazione fratta — generatore `V1.M06.A04.g1` |
| `V1.M06.D02` | Definizione «Disequazione fratta» — termine di glossario `disequazione-fratta` |
| `V1.M06.D03` | Definizione «Regola dei segni per una frazione» — termine `segno-di-una-frazione` |
| `V1.M06.F01`, `V1.M06.F02` | Flashcard della lezione V1.M06.L04 |
| `V1.M04.L07` | Lezione (da scrivere) sulla scomposizione di polinomi: è il rimando del generatore |
| `V1.M04.A07` | Abilità: scomporre completamente un polinomio — generatore `V1.M04.A07.g1` |
| `V2.M06.L03` | Lezione (da scrivere) sulle regole di derivazione: prodotto, quoziente, composta |
| `V2.M06.A03` | Abilità: derivare con le regole di calcolo — generatore `V2.M06.A03.g1` |
| `V3.M02.L01` | Lezione (da scrivere) sul metodo di Gauss |
| `V3.M02.A01` | Abilità: risolvere un sistema lineare con Gauss — generatore `V3.M02.A01.g1` |
| `V3.M03.L01` | Lezione (da scrivere) sul calcolo del determinante |
| `V3.M03.A01` | Abilità: calcolare un determinante — generatore `V3.M03.A01.g1` |

Restano liberi per la scaletta: `V1.M06.L01`–`L03` (le lezioni che precedono le fratte: primo grado, secondo grado, studio del segno di un prodotto), `V1.M06.D01`, `V1.M06.A01`–`A03`. La lezione V1.M06.L04 ha per ora `prerequisiti: []` perché le lezioni precedenti non esistono (la verifica dei contenuti rifiuta un prerequisito che non c'è): quando esistono, vanno messi `V1.M06.L03` e `V1.M04.L07`, e i termini che la lezione oggi spiega a parole (zero di un polinomio, condizione di esistenza, tabella dei segni) diventano rimandi `[[…]]` al glossario.

## Prossimo passo

**Fase 4 — involucro dell'app** (specifica, sezione 13), e in parallelo le prime lezioni del Volume 1 seguendo `REGOLE.md`:

1. **Prova su iPhone** della versione su Pages: lezione ed esercizi dall'inizio alla fine. In particolare: che la tastiera di sistema non si apra toccando il campo di risposta, che i tasti siano comodi, che le tabelle dei segni scorrano di lato.
2. Le cinque sezioni complete, navigazione (oggi non c'è la cronologia del browser: si torna indietro solo con il pulsante in alto), impostazioni, backup (`exportData` esiste già).
3. Tastiera matematica completa: livelli Analisi, Lineare, Complessi; frazioni e potenze «a modello» invece che come testo.
4. Aspetto Compasso definitivo con i due temi e la modalità lettura.
5. Flashcard (le due della lezione sono lette ma non ancora mostrate), glossario come pagina, diario degli errori.
6. Prima di scrivere i contenuti: la scaletta delle lezioni e delle abilità di ogni modulo, rispettando i codici assegnati qui sopra.

## Decisioni da rivedere

Decisioni prese seguendo la sezione 0 della specifica, dove il testo non decide.

*Sessione 2*

1. **Intervalli**: si scrivono sempre con il punto e virgola tra gli estremi e con le parentesi tonde per gli estremi esclusi, `(1; 3]`. In lettura sono accettate anche le parentesi all'italiana `]1; 3[` e la virgola come separatore se non sta tra due cifre. Se a scuola Andrea usa `]1; 3[`, si può cambiare la sola scrittura in `sets/latex.ts`.
2. **`(1,5)` è il numero 1,5**, non l'intervallo da 1 a 5 (che si scrive `(1; 5)` o `(1, 5)` con lo spazio). È la conseguenza della virgola decimale.
3. **Un numero da solo**, come risposta a un esercizio di tipo insieme, vale `x = numero` (un punto isolato).
4. **Insiemi e forma**: senza richieste nel testo, `[1; 2] ∪ [2; 3]` vale quanto `[1; 3]`. La forma canonica si pretende solo se il generatore mette `canonicalForm: true` (aggiunto allo schema). Un estremo decimale dove la risposta giusta è esatta (`x > 0,5` per `x > 1/2`) è `FORMA.DECIMALE`.
5. **Numeri complessi**: argomento principale in **(−π, π]**; le radici n-esime hanno argomenti `(θ + 2kπ)/n` con `k = 0, …, n−1`, non riportati nell'intervallo principale. Angoli notevoli: i multipli di π/12. Da allineare al libro di Analisi 1 che userà Andrea.
6. **`algebraicForm` allentato** (vincolo della sessione 1): una parte reale con più termini è accettata se i termini non si possono sommare (`1 + √2 + i` sì, `1 + 2 + i` no). Prima era rifiutata.
7. **Come pulisce `simplify`**: una sola linea di frazione (`3x/2`, non `(3/2)x`; `(1 + √5)/2`, non `1/2 + √5/2`); lettere in ordine alfabetico nei prodotti; segno davanti; non sviluppa e non scompone.
8. **Scomposizioni**: i fattori di primo grado si scrivono per radice crescente, quindi `(x + 3)(x − 3)` e `(x − 2)(x − 3)`.
9. **Matrici**: polinomio caratteristico come `det(A − λI)`; nella riduzione di Gauss il pivot è il primo elemento non nullo e le righe si scambiano solo se serve; con i parametri rango e riduzione sono quelli «generici» (i valori particolari li discute il generatore).
10. **Verifica dei generatori, soglie**: 50 ms al massimo per esercizio e 5 ms in media; i limiti di pulizia valgono anche per le risposte sbagliate previste (una sbagliata con numeri brutti si riconosce come sbagliata nella scelta multipla); un confronto «non deciso» tra due risposte conta come problema. Gli avvisi (verifica indipendente mancante, codici dichiarati mai prodotti, poca varietà) non bocciano, ma `REGOLE.md` chiede che un generatore finito non ne abbia.
11. **Verifica dei contenuti**: un termine usato da una lezione che non ha tra i prerequisiti quella che lo definisce è un avviso, non un errore; un'abilità dichiarata da due lezioni è un errore.
12. **Cartelle e file in più**: `motore/complex/` (le forme dei numeri complessi; il tipo `Complex` sta in `numbers/`), `motore/steps/`, `motore/display/`; `esercizi/verify.ts` non è esportato da `esercizi/index.ts` perché è uno strumento dei test.
13. **Rimandati**: i grafici statici di funzioni e i nodi per successioni e somme. Erano nell'elenco di `ARCHITETTURA.md` per la sessione 2 ma non nel compito della sessione; nessuno li usa ancora.

*Sessione 1*

14. **Cartelle in più rispetto all'albero della specifica**: `src/esercizi/` (schema dei generatori e valutazione: sta fuori dal motore perché usa il catalogo errori), `src/codici.ts`, `src/contenuti/formato/` (codice che legge le lezioni, accanto alle lezioni).
15. **`log` senza base = logaritmo in base 10**, `ln` = naturale (convenzione dei testi delle superiori). In Analisi 1 molti testi scrivono `log` per il naturale: da decidere se nel Volume 2 cambiare convenzione o scrivere sempre `ln`.
16. **`1/2x` vale `(1/2)·x`** (prodotti e divisioni da sinistra a destra). L'anteprima mostra subito come è stato capito.
17. **«Equivalenti» = uguali dove entrambe sono definite**: `(x²−1)/(x−1)` e `x+1` sono equivalenti. Le condizioni di esistenza vanno chieste con una risposta di tipo insieme.
18. **Un decimale è `FORMA.DECIMALE` anche quando è esatto** (0,5 al posto di 1/2), salvo quando la risposta giusta stessa è scritta con i decimali o l'esercizio chiede un'approssimazione.
19. **Decimale approssimato riconosciuto** se è l'arrotondamento o il troncamento della risposta giusta alle cifre scritte (1,41 e 1,414 per √2 sì; 1,42 no).
20. **Tipo di risposta in più: `limit`** (numero, +∞, −∞, «non esiste»). Non è nella tabella della sezione 7 ma la sezione 6 lo richiede.
21. **Esito `invalid`**: un testo non interpretabile o incompleto non è un tentativo, non si registra: Andrea lo corregge.
22. **Scelta multipla da qualunque esercizio** con almeno tre risposte sbagliate previste (serve alla simulazione TOL); con quattro o più le opzioni sono cinque. Da allineare al numero di opzioni del TOL vero.
23. **Aggiunte allo schema dei generatori**: `title` (nome dell'abilità), `limits` (limiti di pulizia dei numeri), `verify` (verifica indipendente).
24. **Lezioni, perfezionamenti alla sintassi proposta**: `obiettivo` nell'intestazione; blocco `riepilogo` obbligatorio e ultimo; blocco `glossario` per i termini senza riquadro; `nome` obbligatorio per definizioni e teoremi (serve alle flashcard automatiche); sezioni interne con `::nome`; rimandi `[[termine|testo mostrato]]`; blocchi non annidabili; codici di definizioni, teoremi e flashcard del modulo della lezione; durata tra 10 e 20 minuti imposta dal controllo.
25. **Ogni dimostrazione è a passaggi**, con almeno due passaggi con versione sbagliata (come dice la specifica). Se per le dimostrazioni brevi è troppo, si allenta il controllo in `readProofSteps`.
26. **Libreria Markdown: `marked`**, da installare nella fase 3 quando l'app mostra la prima lezione. Il parser di Compasso toglie prima formule e rimandi, così il Markdown non tocca il LaTeX.
27. **«Scomposta»**: irriducibilità sui razionali, completa fino al grado 5. Sono accettati `(x+1)(x+1)` al posto di `(x+1)²` e fattori con coefficienti frazionari o irrazionali (`(x−√2)(x+√2)`).
28. **`i` è l'unità immaginaria solo negli esercizi sui complessi** (opzione `complex`); altrove è una variabile. `e` è sempre il numero di Nepero.
29. **Confronto numerico**: 12 punti concordi, tolleranza relativa 10⁻⁸, punti che dipendono solo dalle due espressioni.
30. **`Rng`**: sfc32 con chiave `codice|livello|seme`. Congelato: cambiarlo cambia tutti gli esercizi.

*Sessione 0*

31. **Versioni delle dipendenze**: ultime maggiori (Preact 11, TypeScript 7, Vitest 5, esbuild 0.28, KaTeX 0.19, jsdom 31), fissate da `package-lock.json`. CI con Node 22.
32. **Service worker senza `skipWaiting`**; l'avviso «versione nuova disponibile» è della fase 4.
33. **Percorsi relativi ovunque** (Pages serve sotto `/compasso/`).
34. **Solo caratteri KaTeX woff2.**
35. **Aspetto provvisorio** (palette, icona): il vero aspetto è della fase 4.
36. **Catalogo errori come file TypeScript**: `ErrorCode` è l'unione dei codici, un codice inesistente non compila.
37. **Rimandi del catalogo a livello di modulo**, da affinare quando ci sono le lezioni.
38. **`ALG.SOMMA_QUADRATI`**: la specifica generalizza («a²+b² non si scompone»), ma `x⁴+4` si scompone; nel catalogo l'esempio è limitato a `x²+9`. La specifica andrebbe precisata.
39. **`NON_CLASSIFICATO`** è una costante, non una voce del catalogo.
40. **Verifica sympy fuori da CI**: va eseguita a mano quando si cambiano gli esempi del catalogo.

41. **«Determinanti e sistemi lineari» = due generatori** (`V3.M03.A01.g1` e `V3.M02.A01.g1`), perché sono due abilità in due moduli; così ci sono anche i riferimenti per le risposte «numero» e «matrice».
42. **Sette voci nuove nel catalogo errori** (elenco in «Fatto», sessione 3): sono nella tabella di `docs/SPECIFICA.md` e nella copia della specifica dentro il Progetto di Claude. Dal 12 novembre le due copie sono identiche (anche la riga della sezione 6 su «fisica e analisi 2»).
43. **Risposte sbagliate con lo stesso codice**: uno stesso errore può manifestarsi in due modi (per esempio `CALC.SEGNO_TRASPORTO` in due punti diversi della sostituzione all'indietro); i generatori lo usano per arrivare a tre risposte sbagliate.
44. **Lezione a tratti**: il tratto successivo si apre solo dopo aver risposto alla domanda lampo (qualunque risposta, anche «Non lo so»). Riaprendo la lezione le domande dei tratti già visti tornano senza risposta.
45. **Prerequisiti di V1.M06.L04 vuoti** finché le lezioni precedenti non esistono (dettagli sotto la tabella dei codici).
46. **Tastiera come testo**: i tasti inseriscono testo che il parser legge (`/` per la frazione, `^` per la potenza, `√(`); l'anteprima mostra la formula. La tastiera «a modello» è della fase 4.
47. **Livello Funzioni della tastiera** aggiunto già ora (serve alle derivate), oltre a Base e Insiemi chiesti.
48. **Esercizi dopo la lezione**: cinque, ai livelli 1, 1, 2, 2, 3. La difficoltà automatica arriva con la padronanza (fase 8).
49. **Glossario**: confermato che si ricava dalle lezioni (`src/app/lezione/glossary.ts`); la cartella `src/glossario/` resta vuota e si può togliere.
50. **Padronanza**: non c'è ancora una formula; `skillSummaries` dà solo conteggi per abilità (le domande lampo non contano; dalla sessione 4b le distrazioni contano come errori, come dice la specifica, con un conteggio a parte).
51. **Formule dei testi degli esercizi ingrandite** dal foglio di stile, perché le frazioni in riga erano piccole; in alternativa i generatori potrebbero scrivere la disequazione a centro pagina.

*Sessione 4a (revisione del motore)*

52. **`sin π/3` = `sin(π/3)`**: con π nell'argomento senza parentesi, la divisione per un intero resta dentro. Senza π resta `sin x/2` = `(sin x)/2`. Alternativa: lasciare tutto com'era e contare sulla parentesi inserita dalla tastiera.
53. **`[−∞; 2]` è un testo non valido** (con il motivo), non una risposta sbagliata: Andrea lo corregge prima di confermare e non entra nel diario come `DISEQ.ESTREMI`. Alternativa: accettarlo come scritto e valutarlo sbagliato.
54. **`{1,2}` è rifiutato come ambiguo** (due soluzioni o il decimale 1,2?), perché l'anteprima lo disegnava uguale nei due casi. `(1,5)` resta il numero 1,5 (decisione della sessione 2).
55. **`;` tra più soluzioni vale «oppure» solo tra uguaglianze o numeri** (`x = 3; x = 5`); tra disuguaglianze è un errore spiegato, perché potrebbe voler dire sistema.
56. **Vincoli di forma più severi**: `simplifiedRadicals` rifiuta `√2·√3` (vuole `√6`) e `(√2)³`; `rationalized` rifiuta la frazione sotto radice; `reducedFraction` vede l'intero comune tra i radicali.
57. **Limite di lunghezza delle risposte scritte**: 1.000 caratteri per un'espressione, 2.000 per un insieme.

*Sessione 4b (revisione di generatori, lezione e app)*

58. **Esercizi cambiati per alcuni semi**: scomposizione livelli 2 e 3, derivate livello 2 (una forma), Gauss livello 1 (i sistemi con uno zero), disequazioni fratte livello 3 (solo il verso, nel 4% dei casi). Numeri in `docs/REVISIONE.md`, «Esercizi cambiati». Un vecchio tentativo su quei semi, riaperto, mostrerebbe l'esercizio nuovo. Alternativa scartata: tenere gli esercizi vecchi e la poca varietà.
59. **Soglie di varietà** nella verifica automatica: almeno 100 esercizi diversi per livello, nessun esercizio oltre il 4% dei semi. Sono avvisi, ma i test dei generatori pretendono zero avvisi.
60. **Zero doppio con verso stretto**: quando restano solo due errori possibili la disequazione prende l'uguale (≤ o ≥), per avere sempre tre risposte sbagliate.
61. **«Esercizio simile» e «Avanti»** scartano i semi che ridanno un testo già uscito nella serie in corso (fino a 12 tentativi).
62. **Campo vuoto di un insieme**: l'anteprima mostra come si scrive (intervalli oppure disuguaglianze). La risposta sbagliata non riconosciuta apre da sola la soluzione passo passo.
63. **Campi di risposta**: 200 caratteri al massimo.

## Domande aperte

- **Errore tipico nuovo?** «Zero doppio trattato come uno zero semplice» (`(x − 3)²` studiato come `x − 3`): è l'errore naturale di una forma del livello 3 delle disequazioni fratte, ma nel catalogo non c'è (e `DISEQ.SECONDO_GRADO` parla d'altro). Aggiungerlo cambia il catalogo e la tabella della specifica: decide Andrea.

- **IndexedDB nella versione PC**: in Chromium funziona anche nel file aperto con doppio clic (provato). Da provare in Safari e Firefox; il ripiego su localStorage e poi sulla memoria esiste ed è testato.
- **Parentesi degli intervalli**: `(1; 3)` oppure `]1; 3[` nella scrittura dell'app? Oggi `(1; 3)`; in lettura valgono entrambe (decisione 1 della sessione 2).
- **Grafici statici**: la lezione sulle disequazioni fratte non ne usa; si fanno nella fase 4 con le visualizzazioni.
- **Riordino** (`ordering`): la schermata di esercizio non lo mostra ancora; serve con le dimostrazioni interattive.

## Problemi noti

Limiti del motore (dettagli in `docs/ARCHITETTURA.md`, sezione 18):

- La forma normale e `simplify` non conoscono le identità goniometriche, esponenziali e logaritmiche: per l'equivalenza decide il confronto numerico; nei risultati mostrati il generatore scrive lui la forma che vuole.
- Irriducibilità completa solo fino al grado 5.
- Angoli notevoli solo multipli di π/12; autovalori solo per matrici razionali con polinomio caratteristico scomponibile in fattori di primo e secondo grado; zeri automatici (`realZeros`) solo per polinomi scomponibili allo stesso modo.
- Insiemi: l'unione tra soluzioni periodiche e un intervallo non è rappresentabile.
- `FORMA.DECIMALE` per valori approssimati si riconosce solo nelle risposte costanti, non in espressioni con coefficienti decimali (`0,33x`) né negli estremi approssimati di un insieme.
- Il parser non legge fattoriale, gradi (`30°`), numeri periodici, notazione scientifica con `E`: si aggiungono al parser quando un modulo li richiede.

Della sessione 4a (punti fragili rimasti, spiegati in `docs/REVISIONE.md`, «Che cosa resta»):

- Il confronto numerico può, molto raramente, dare «diverse» per due scritture equivalenti vicino a una cancellazione numerica.
- `x = 1 e 2` si legge come ∅ (lettura rigorosa di «e»); `sin x/2` resta `(sin x)/2`.
- Risposta `matrix`: le caselle si leggono senza numeri complessi (serve un campo `complex` quando V3 li userà).
- L'unione tra soluzioni periodiche e un punto isolato dà un messaggio che parla di «intervallo».

Della sessione 4b (dettagli in `docs/REVISIONE.md`, seconda parte, «Che cosa resta»):

- Derivate: una trentina di esercizi «classici» escono circa il 2% delle volte l'uno.
- Al livello 1 scomposizione, Gauss e qualche derivata hanno due sole risposte sbagliate: niente scelta multipla per quegli esercizi.
- Nei passaggi della scomposizione di un quadrato di binomio il motore scrive `(x + 1)(x + 1)` prima di `(x + 1)²` (`src/motore/steps/factor.ts`).
- `∀x ∈ ℝ` e `∄x ∈ ℝ` sono mostrati ma non si possono scrivere: si usano `ℝ` e `∅`.
- La lezione V1.M06.L04 non ha ancora la visualizzazione `VIS.disequazioni-grafico` (non esiste).
- Il livello Funzioni della tastiera non ha le cifre.
- Un tentativo fatto prima che l'archivio dei dati sia aperto (pochi millisecondi all'avvio) non viene salvato.
- La prova con sympy sugli esercizi non è nel repository né in CI: va rifatta a mano per un generatore nuovo.

Della sessione 3:

- Il parser degli insiemi non completa i testi scritti a metà (dà un errore invece dei quadratini): l'anteprima dell'app lo aggira provando alcune chiusure plausibili (`src/app/risposta/preview.ts`). La soluzione vera è nel parser.
- Nei passaggi delle disequazioni fratte la riga finale (disuguaglianze e intervalli sulla stessa riga) su telefono va fatta scorrere di lato.
- Le opzioni di scelta multipla di un insieme mostrano solo gli intervalli, non le disuguaglianze.
- `app.js` pesa circa 560 KB (KaTeX, motore, marked): va bene per ora, da misurare sul telefono nella fase 9.

Altro:

- Il commit `6f7577b` (verifica dei generatori) ha il controllo su GitHub rosso per un errore di tipo in un test, corretto dal commit successivo: l'ultimo stato del ramo è verde.
- I commit della sessione 4b da `b2d9086` a `d1564a8` hanno il controllo su GitHub rosso o annullato per un solo motivo: un test nuovo (2.000 semi per due livelli) superava i 5 secondi sulla macchina di GitHub. Corretto dal commit successivo (meno semi, tempo massimo esplicito): l'ultimo stato del ramo è verde.
- Icone PNG provvisorie; `README.md` contiene solo il titolo.
- GitHub Actions avvisa che `actions/checkout@v4`, `setup-node@v4` e `upload-artifact@v4` usano Node 20, deprecato: funziona ancora, ma conviene passare alle versioni successive delle azioni quando si tocca il workflow.
