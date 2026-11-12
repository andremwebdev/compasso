# STATO

Aggiornato alla fine di ogni sessione. Ultimo aggiornamento: sessione 2 (motore completo e sistema di verifica).

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

## In corso

Niente. Il lavoro della sessione 2 è completo e caricato su GitHub (ramo `main`). **La fase 2 (motore matematico) è chiusa**: esiste `docs/ARCHITETTURA.md`, ogni parte del motore ha test superati, il sistema di verifica gira su un generatore di prova.

## Prossimo passo

**Sessione 3 — fetta verticale (fase 3).** Dalla specifica, sezione 13:

1. Quattro **generatori di riferimento** in `src/generatori/`, ognuno con il test che chiama `verifyGenerator`: disequazioni fratte (V1.M06), scomposizione di polinomi (V1.M04), derivate (V2.M06), determinanti e sistemi lineari (V3.M02-M03). Il motore ha già quello che serve: `signTable` e `solutionFromSigns`, `factorPolynomial`, `derive` e `deriveWithSteps`, `determinant`, `gaussElimination`, `solveLinearSystem`. Il generatore di prova in `test/esercizi/fixtures/` mostra la forma.
2. La **lezione sulle disequazioni fratte** in Markdown (`src/contenuti/v1/m06/…`), con un test che esegue `verifyContents` su tutte le lezioni vere e sul catalogo dei generatori veri (va costruito un elenco dei generatori: codice → livelli).
3. L'app che mostra la lezione e la schermata di esercizio completa (anteprima in tempo reale con `parseExpression` e `parseSolutionSet`, riconoscimento degli errori con `evaluateResponse`), progressi in IndexedDB. Qui si installa `marked`.
4. Completare `REGOLE.md`: i quattro generatori e la lezione come modelli da copiare.

Restano da fare quando servono (non bloccano la sessione 3): grafici statici di funzioni (`display/plot.ts`), nodi per successioni e somme (V2.M03, V2.M11).

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

## Domande aperte

- **IndexedDB nella versione PC** (specifica, sezione 12): non verificato; da provare a mano su `compasso.html` aperto con doppio clic quando esiste lo strato dei dati (fase 3). Ripiego previsto: localStorage.
- **Glossario**: la specifica chiede per ogni termine codice, nome, definizione breve e lezione. `verifyContents` lo ricava già dalle lezioni (blocchi `definizione` con `termine` e blocchi `glossario`); la cartella `src/glossario/` resterebbe per il codice che lo mostra. Da confermare nella sessione 3.
- **Parentesi degli intervalli**: `(1; 3)` oppure `]1; 3[` nella scrittura dell'app? Oggi `(1; 3)`; in lettura valgono entrambe (decisione 1 della sessione 2).
- **Grafici statici**: vanno fatti nella fase 3 (se la lezione sulle disequazioni fratte ne mostra uno) o nella fase 4 con le visualizzazioni?

## Problemi noti

Limiti del motore (dettagli in `docs/ARCHITETTURA.md`, sezione 18):

- La forma normale e `simplify` non conoscono le identità goniometriche, esponenziali e logaritmiche: per l'equivalenza decide il confronto numerico; nei risultati mostrati il generatore scrive lui la forma che vuole.
- Irriducibilità completa solo fino al grado 5.
- Angoli notevoli solo multipli di π/12; autovalori solo per matrici razionali con polinomio caratteristico scomponibile in fattori di primo e secondo grado; zeri automatici (`realZeros`) solo per polinomi scomponibili allo stesso modo.
- Insiemi: l'unione tra soluzioni periodiche e un intervallo non è rappresentabile.
- `FORMA.DECIMALE` per valori approssimati si riconosce solo nelle risposte costanti, non in espressioni con coefficienti decimali (`0,33x`) né negli estremi approssimati di un insieme.
- Il parser non legge fattoriale, gradi (`30°`), numeri periodici, notazione scientifica con `E`: si aggiungono al parser quando un modulo li richiede.

Altro:

- Il commit `6f7577b` (verifica dei generatori) ha il controllo su GitHub rosso per un errore di tipo in un test, corretto dal commit successivo: l'ultimo stato del ramo è verde.
- Icone PNG provvisorie; `README.md` contiene solo il titolo.
- GitHub Actions avvisa che `actions/checkout@v4`, `setup-node@v4` e `upload-artifact@v4` usano Node 20, deprecato: funziona ancora, ma conviene passare alle versioni successive delle azioni quando si tocca il workflow.
