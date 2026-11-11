# STATO

Aggiornato alla fine di ogni sessione. Ultimo aggiornamento: sessione 1 (architettura e nucleo del motore).

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
- **Test**: 553 test in 15 file, tutti verdi in locale e su GitHub (controllo e pubblicazione su Pages verdi sull'ultimo push).

## In corso

Niente. Il lavoro della sessione 1 è completo e caricato su GitHub (ramo `main`).

## Prossimo passo

**Sessione 2 — resto del motore (fase 2, seconda metà).** L'elenco preciso, con il posto di ogni cosa, è in `docs/ARCHITETTURA.md` (voci 🔜):

1. `algebra/simplify.ts`: pulizia per mostrare i risultati (coefficienti 1, segni, frazioni ridotte, radicali in forma normale). **Serve subito ai generatori**: oggi i costruttori non semplificano.
2. Espandere, scomporre, dividere, Ruffini, MCD e mcm di polinomi **con i passaggi** (la base è già in `algebra/upoly.ts`).
3. `calculus/derive.ts`: derivata simbolica (anche per verificare le primitive).
4. `sets/`: forma canonica, unione, intersezione, confronto per struttura, soluzioni periodiche, LaTeX, lettura (`parser/sets.ts`); poi il caso `set` in `evaluateResponse` e `choiceOptions` (oggi lanciano «non ancora implementato»).
5. `linalg/`: operazioni, Gauss con passaggi, determinante, inversa, rango, autovalori per matrici costruite all'indietro.
6. `numbers/complex.ts`: forma trigonometrica ed esponenziale, angoli notevoli, potenze e radici, `evaluateComplex`, vincolo `exponentialForm`.
7. `steps/` e `display/`: registrazione dei passaggi, tabelle dei segni e di variazione, sistemi con la graffa, grafici statici.
8. `esercizi/verify.ts`: verifica automatica dei generatori (specifica, sezione 12), fatta girare su un generatore di prova.

## Decisioni da rivedere

Decisioni prese seguendo la sezione 0 della specifica, dove il testo non decide.

*Sessione 1*

1. **Cartelle in più rispetto all'albero della specifica**: `src/esercizi/` (schema dei generatori e valutazione: sta fuori dal motore perché usa il catalogo errori), `src/codici.ts`, `src/contenuti/formato/` (codice che legge le lezioni, accanto alle lezioni).
2. **`log` senza base = logaritmo in base 10**, `ln` = naturale (convenzione dei testi delle superiori). In Analisi 1 molti testi scrivono `log` per il naturale: da decidere se nel Volume 2 cambiare convenzione o scrivere sempre `ln`.
3. **`1/2x` vale `(1/2)·x`** (prodotti e divisioni da sinistra a destra). L'anteprima mostra subito come è stato capito.
4. **«Equivalenti» = uguali dove entrambe sono definite**: `(x²−1)/(x−1)` e `x+1` sono equivalenti. Le condizioni di esistenza vanno chieste con una risposta di tipo insieme.
5. **Un decimale è `FORMA.DECIMALE` anche quando è esatto** (0,5 al posto di 1/2), salvo quando la risposta giusta stessa è scritta con i decimali o l'esercizio chiede un'approssimazione.
6. **Decimale approssimato riconosciuto** se è l'arrotondamento o il troncamento della risposta giusta alle cifre scritte (1,41 e 1,414 per √2 sì; 1,42 no).
7. **Tipo di risposta in più: `limit`** (numero, +∞, −∞, «non esiste»). Non è nella tabella della sezione 7 ma la sezione 6 lo richiede.
8. **Esito `invalid`**: un testo non interpretabile o incompleto non è un tentativo, non si registra: Andrea lo corregge.
9. **Scelta multipla da qualunque esercizio** con almeno tre risposte sbagliate previste (serve alla simulazione TOL); con quattro o più le opzioni sono cinque. Da allineare al numero di opzioni del TOL vero.
10. **Aggiunte allo schema dei generatori**: `title` (nome dell'abilità), `limits` (limiti di pulizia dei numeri), `verify` (verifica indipendente).
11. **Lezioni, perfezionamenti alla sintassi proposta**: `obiettivo` nell'intestazione; blocco `riepilogo` obbligatorio e ultimo; blocco `glossario` per i termini senza riquadro; `nome` obbligatorio per definizioni e teoremi (serve alle flashcard automatiche); sezioni interne con `::nome`; rimandi `[[termine|testo mostrato]]`; blocchi non annidabili; codici di definizioni, teoremi e flashcard del modulo della lezione; durata tra 10 e 20 minuti imposta dal controllo.
12. **Ogni dimostrazione è a passaggi**, con almeno due passaggi con versione sbagliata (come dice la specifica). Se per le dimostrazioni brevi è troppo, si allenta il controllo in `readProofSteps`.
13. **Libreria Markdown: `marked`**, da installare nella fase 3 quando l'app mostra la prima lezione. Il parser di Compasso toglie prima formule e rimandi, così il Markdown non tocca il LaTeX.
14. **«Scomposta»**: irriducibilità sui razionali, completa fino al grado 5. Sono accettati `(x+1)(x+1)` al posto di `(x+1)²` e fattori con coefficienti frazionari o irrazionali (`(x−√2)(x+√2)`).
15. **`i` è l'unità immaginaria solo negli esercizi sui complessi** (opzione `complex`); altrove è una variabile. `e` è sempre il numero di Nepero.
16. **Confronto numerico**: 12 punti concordi, tolleranza relativa 10⁻⁸, punti che dipendono solo dalle due espressioni.
17. **`Rng`**: sfc32 con chiave `codice|livello|seme`. Congelato: cambiarlo cambia tutti gli esercizi.

*Sessione 0*

18. **Versioni delle dipendenze**: ultime maggiori (Preact 11, TypeScript 7, Vitest 5, esbuild 0.28, KaTeX 0.19, jsdom 31), fissate da `package-lock.json`. CI con Node 22.
19. **Service worker senza `skipWaiting`**; l'avviso «versione nuova disponibile» è della fase 4.
20. **Percorsi relativi ovunque** (Pages serve sotto `/compasso/`).
21. **Solo caratteri KaTeX woff2.**
22. **Aspetto provvisorio** (palette, icona): il vero aspetto è della fase 4.
23. **Catalogo errori come file TypeScript**: `ErrorCode` è l'unione dei codici, un codice inesistente non compila.
24. **Rimandi del catalogo a livello di modulo**, da affinare quando ci sono le lezioni.
25. **`ALG.SOMMA_QUADRATI`**: la specifica generalizza («a²+b² non si scompone»), ma `x⁴+4` si scompone; nel catalogo l'esempio è limitato a `x²+9`. La specifica andrebbe precisata.
26. **`NON_CLASSIFICATO`** è una costante, non una voce del catalogo.
27. **Verifica sympy fuori da CI**: va eseguita a mano quando si cambiano gli esempi del catalogo.

## Domande aperte

- **IndexedDB nella versione PC** (specifica, sezione 12): non verificato; da provare a mano su `compasso.html` aperto con doppio clic quando esiste lo strato dei dati (fase 3). Ripiego previsto: localStorage.
- **Glossario**: la specifica chiede per ogni termine codice, nome, definizione breve e lezione. Con la sintassi fissata si ricava tutto dalle lezioni (blocchi `definizione` con `termine` e blocchi `glossario`); la cartella `src/glossario/` resterebbe per il codice che lo costruisce. Da confermare nella sessione 3.

## Problemi noti

Limiti del nucleo (dettagli in `docs/ARCHITETTURA.md`, sezione 18):

- La forma normale non conosce le identità goniometriche, esponenziali e logaritmiche: lì decide il confronto numerico.
- Il confronto numerico è reale: espressioni con `i` fuori dalla forma polinomiale (`e^{iπ}`) aspettano `evaluateComplex` (sessione 2).
- Irriducibilità completa solo fino al grado 5.
- `FORMA.DECIMALE` per valori approssimati si riconosce solo nelle risposte costanti, non in espressioni con coefficienti decimali (`0,33x`).
- Il parser non legge fattoriale, gradi (`30°`), numeri periodici, notazione scientifica con `E`: si aggiungono al parser quando un modulo li richiede.
- Risposte di tipo insieme: i tipi esistono, lettura e confronto no (sessione 2).

Altro:

- Icone PNG provvisorie; `README.md` contiene solo il titolo.
- GitHub Actions avvisa che `actions/checkout@v4`, `setup-node@v4` e `upload-artifact@v4` usano Node 20, deprecato: funziona ancora, ma conviene passare alle versioni successive delle azioni quando si tocca il workflow.
