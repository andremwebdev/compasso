# STATO

Ultimo aggiornamento: fine della sessione extra E1 (generatori difficili di Analisi, parte 1: limiti di successioni, limiti di funzioni, Taylor). La versione lunga di questo file, con la storia sessione per sessione, è nel commit `abfb3e3`; i dettagli delle revisioni in `docs/REVISIONE.md`.

## Fatto

Fasi 1, 2 e 3 della specifica (sezione 13) complete e riviste.

- **Impalcatura** (sessione 0): TypeScript, Preact, esbuild, Vitest, KaTeX; due build dallo stesso codice (`dist/telefono/` PWA offline, `dist/pc/compasso.html` file unico); controllo e pubblicazione su GitHub Pages a ogni push su `main`.
- **Motore** (sessioni 1-2, rivisto in 4a): numeri esatti, espressioni, LaTeX all'italiana, parser tollerante, equivalenza, vincoli di forma, `simplify`/`expand`, polinomi, derivate, matrici, complessi, insiemi di soluzioni, tabelle dei segni e di variazione, passaggi delle procedure. Architettura in `docs/ARCHITETTURA.md`.
- **Esercizi**: schema dei generatori, valutazione con riconoscimento degli errori, scelta multipla automatica, verifica automatica (nove controlli più avvisi di varietà) e verifica dei contenuti.
- **Cinque generatori di riferimento** (rivisti in 4b, controllati con sympy dal testo mostrato): `V1.M06.A04.g1` disequazioni fratte, `V1.M04.A07.g1` scomposizione, `V2.M06.A03.g1` derivate, `V3.M03.A01.g1` determinante, `V3.M02.A01.g1` sistemi con Gauss.
- **Tre generatori di Analisi** (sessione E1), tutti con risposta di tipo limite (numero, `+∞`, `−∞`, «non esiste»), tre livelli, verifica automatica senza problemi né avvisi, 750 esercizi ciascuno ricalcolati con sympy **dal testo mostrato**: `V2.M03.A01.g1` limiti di successioni (è il generatore di riferimento per le risposte di tipo limite), `V2.M04.A01.g1` limiti notevoli e forme indeterminate, `V2.M08.A01.g1` sviluppi di Taylor nei limiti (controllato anche con de l'Hôpital dal testo, nel suo test). Strumenti comuni nuovi in `src/generatori/comuni/`: `limits.ts` (scrittura del limite, `distinctWrongLimits`, prova numerica `confirmsLimit`) e `terms.ts` (polinomi scritti termine per termine).
- **Lezione di riferimento** `V1.M06.L04` «Disequazioni fratte».
- **Fetta verticale nell'app**: lezione a tratti con domande lampo, schermata di esercizio completa, tastiera matematica (Base, Insiemi, Funzioni), dati in IndexedDB con versione (`DATA_VERSION = 1`) e ripieghi, esercizi per generatore e livello.
- **Catalogo errori**: 77 voci in 12 categorie (5 aggiunte nella sessione E1 per limiti e Taylor: `AN.CONFRONTO_INFINITI`, `AN.FATTORE_LIMITATO`, `AN.LIMITE_NOTEVOLE`, `AN.SEGNO_INFINITO`, `AN.TAYLOR_SVILUPPO`), allineato alla tabella della specifica e verificato con sympy.
- **Regole** (sessione 4c): `REGOLE.md` completo per generatori, lezioni, dimostrazioni, visualizzazioni, catalogo, con le trappole emerse dalle revisioni.
- **Generatori di Analisi (sessione E1)*

53. Codici di abilità `V2.M03.A01`, `V2.M04.A01`, `V2.M08.A01` assegnati prima della scaletta; lezioni di riferimento proposte `V2.M03.L02`, `V2.M04.L03`, `V2.M08.L03` (E1).
54. Cinque errori tipici nuovi: `AN.CONFRONTO_INFINITI`, `AN.FATTORE_LIMITATO`, `AN.LIMITE_NOTEVOLE`, `AN.SEGNO_INFINITO`, `AN.TAYLOR_SVILUPPO`. L'ultimo è volutamente largo (fattoriale, segni, denominatori dimenticati, sostituzione di `ax` fatta a metà): se nel diario servirà distinguerli, va diviso (E1).
55. `AN.CONFRONTO_INFINITI` copre anche «la regola dei gradi usata in un punto finito»; `AN.SEGNO_INFINITO` copre sia il segno sbagliato sia `±∞` al posto di «non esiste» (e viceversa) (E1).
56. Verifica indipendente dei limiti = prova numerica vicino al punto (destra e sinistra, posti pari e dispari), non un calcolo simbolico: il motore non calcola limiti (specifica, sezione 6) (E1).
57. Il testo dei limiti chiede sempre «un numero in forma esatta, oppure +∞, −∞ o "non esiste"», anche quando la risposta è per forza un numero (Taylor): non suggerisce il tipo di risposta (E1).
58. Limite notevole `(1 + 1/t)^t → e` usato anche per `t → −∞` (con le basi negative), dichiarato nei passaggi: la lezione dovrà dimostrarlo o enunciarlo (E1).
59. Taylor: limiti di pulizia più larghi (interi e denominatori fino a 60) perché i coefficienti `1/24`, `1/48` sono propri dell'argomento; un errore di sviluppo che lascia termini non cancellati non diventa una risposta sbagliata prevista (chi se ne accorge si ferma) (E1).
60. `sin(−x)` e `cos(−x)` non compaiono; argomenti negativi solo per esponenziale e logaritmo. `arctan t / t → 1` è trattato come limite notevole dal livello 2 (E1).

*Dimostrazioni di riserva** (sessione 4d), in `src/riserva/`, nel formato delle dimostrazioni interattive, con enunciato completo, versioni sbagliate e motivi: teorema degli zeri e di Weierstrass (V2.M05), di Fermat, Rolle e Lagrange (V2.M06). Pronte da incollare nelle lezioni; come usarle: `src/riserva/LEGGIMI.md`.
- **Test**: 1.012 in 38 file, verdi in locale e su GitHub.

## In corso

Niente.

## Lavoro per i modelli successivi

In ordine. Ogni punto è il compito di una sessione (o di poche); «finita quando» dice quando chiuderla. Le fasi 4 e 5 possono procedere in parallelo (specifica, sezione 13), purché seguendo `REGOLE.md`. Segnati con ⚙ i punti che toccano motore, schema o formato dei dati: vanno a un modello capace, in una sessione dedicata.

**Fase 4 — involucro dell'app**

1. **Prova su iPhone** della versione su Pages (la fa Andrea, o la sessione la prepara come elenco di cose da toccare): tastiera di sistema che non si apre, tasti comodi, tabelle dei segni che scorrono, installazione e uso offline. I difetti trovati diventano il primo lavoro.
2. **Navigazione e sezioni**: cronologia del browser (tasto indietro), le cinque sezioni complete con i contenuti presenti (Oggi, Teoria, Esercizi, Test come segnaposto ordinato, Tu), avviso di prerequisiti mancanti con i link.
3. **Impostazioni e backup**: esportazione e ripristino dei dati (`exportData` esiste), avviso «versione nuova disponibile», risoluzione del tentativo perso all'avvio (problemi noti).
4. ⚙ **Tastiera completa**: livelli Analisi, Lineare, Complessi; cifre anche nel livello Funzioni; frazioni e potenze «a modello».
5. **Aspetto Compasso definitivo**: due temi, modalità lettura, valori di colori e caratteri (specifica, sezione 10).
6. **Flashcard, glossario, diario**: flashcard automatiche e manuali mostrate, glossario come pagina, diario degli errori.
7. ⚙ **Riordino e dimostrazioni interattive**: risposta `ordering` nella schermata di esercizio; le tre modalità (riordina, trova lo sbagliato, completa) ricavate dal blocco `dimostrazione`; scheda Dimostrazioni.
8. ⚙ **Impalcatura delle visualizzazioni** con la prima, `VIS.disequazioni-grafico`, e la sua scheda in `docs/VISUALIZZAZIONI.md` (`REGOLE.md`, «Come aggiungere una visualizzazione»); poi aggiungerla alla lezione `V1.M06.L04`.
9. ⚙ **Caricamento dei contenuti per modulo** nella versione telefono (specifica, sezione 12): `src/contenuti/index.ts` diviso per modulo.
   - Fase finita quando: tutte le sezioni funzionano con i contenuti presenti, e l'app è installata su iPhone e funziona offline.

**Fase 5 — Volume 1, Fondamenta** (moduli V1.M01-M14)

1. **Scaletta di ogni modulo** prima dei contenuti: lezioni e abilità con codici, prerequisiti, generatori previsti, termini del glossario, visualizzazione. Una sessione può fare la scaletta di più moduli; si rispettano i codici assegnati qui sotto. Proposta: in `docs/SCALETTA.md`.
2. **Completare V1.M06** per primo, attorno al riferimento: lezioni L01-L03 (primo grado, secondo grado, segno di un prodotto) con i loro generatori; poi prerequisiti e rimandi `[[…]]` della L04 (vedi sotto la tabella dei codici); sistemi di disequazioni, irrazionali, valore assoluto.
3. **Lezione `V1.M04.L07`** sulla scomposizione (il generatore esiste già) e il resto di V1.M04.
4. **Gli altri moduli in ordine di prerequisiti** (M01, M02, M03, M05, M07, … M14). Per ogni modulo, in quest'ordine: generatori (uno per sessione se complessi), lezioni, flashcard manuali, dimostrazioni dove servono, visualizzazione del modulo (M08, M09, M10, M12), controllo «Lo so già».
   - Prima di M02, M03, M10, M13: ⚙ estendere il parser (numeri periodici, notazione scientifica, gradi, fattoriale).
   - In M09: un generatore con estremi `e`, `e²`, `ln 2` per provare la lettura degli insiemi (`docs/REVISIONE.md`, punti da incrociare).
   - In M10: equazioni goniometriche con soluzioni tutte periodiche (trappole del motore in `REGOLE.md`).
5. ⚙ **Controllo «Lo so già»** nell'app (specifica, sezione 3), quando i primi moduli hanno contenuti.
   - Fase finita quando: ogni modulo ha lezioni, abilità con generatori verificati e controllo «Lo so già».

**Fase 6 — Volumi 2 e 3, in parallelo**

1. **Decidere prima**: `log` o `ln` per il naturale nel Volume 2 (decisione 5).
2. **Lezioni dei generatori già esistenti**: `V2.M06.L03` (regole di derivazione), `V3.M02.L01` (Gauss), `V3.M03.L01` (determinante).
3. ⚙ **Motore**: nodi per successioni e somme (prima delle lezioni di V2.M03 e di V2.M11; i generatori di limiti della sessione E1 non ne hanno avuto bisogno), fattoriale e radice n-esima, grafici statici (prima di V2.M07), campo `complex` nelle risposte `matrix` (prima dei complessi in V3).
4. **Scaletta, generatori, lezioni con dimostrazioni** (confrontate con un libro di testo; per V2.M05 e V2.M06 cinque sono già in `src/riserva/`: incollarle, cancellare il file di riserva, collegare con `[[…]]` i risultati usati), modulo per modulo, alternando i due binari; le sei visualizzazioni nei loro moduli (V2.M04, M06, M08, M09; V3.M05, M06).
   - Fase finita quando: come il Volume 1, più dimostrazioni interattive per i teoremi principali.

**Fase 7 — sezione Test**: prima la composizione della simulazione TOL e il numero di opzioni (da tarare sulla Demo TOL, specifica sezione 14), poi simulazione a tempo, mini-test di modulo, storico, analisi della penalità.

**Fase 8 — strato adattivo**: formula della padronanza (oggi solo conteggi), ripasso a intervalli, test d'ingresso, Oggi composto da padronanza ed errori.

**Fase 9 — rifinitura**: prestazioni misurate su iPhone XR (`app.js` oggi circa 560 KB), versione PC provata in Safari e Firefox, ritocchi.

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
| `V3.M02.L01`, `V3.M02.A01` | Lezione (da scrivere) e abilità: metodo di Gauss — generatore `V3.M02.A01.g1` |
| `V3.M03.L01`, `V3.M03.A01` | Lezione (da scrivere) e abilità: determinante — generatore `V3.M03.A01.g1` |
| `V2.M05.T01`, `V2.M05.T02` | Teorema degli zeri, teorema di Weierstrass (in `src/riserva/v2/m05/`) |
| `V2.M06.T01`, `V2.M06.T02`, `V2.M06.T03` | Teoremi di Fermat, Rolle, Lagrange (in `src/riserva/v2/m06/`); `T03` per Lagrange è quello degli esempi della specifica |

Per i tre generatori della sessione E1 i codici di **abilità** (`V2.M03.A01`, `V2.M04.A01`, `V2.M08.A01`) sono fissi; le **lezioni** indicate sono il campo `lesson` dei generatori (dove porta «Torna alla lezione»): la scaletta può mantenerle oppure spostare il rimando a un'altra lezione, purché quella lezione spieghi tutti i casi del livello 3 (numero `e` e fattori oscillanti per le successioni; limiti laterali per le funzioni; prodotti di sviluppi per Taylor). Le altre abilità di quei moduli partono da `A02`.

Liberi per la scaletta di V1.M06: `L01`-`L03` (primo grado, secondo grado, segno di un prodotto), `D01`, `A01`-`A03`. Quando esistono, `V1.M06.L04` prende i prerequisiti `V1.M06.L03` e `V1.M04.L07` (oggi `[]`, perché la verifica rifiuta lezioni che non ci sono), e i termini che oggi spiega a parole (zero di un polinomio, condizione di esistenza, tabella dei segni) diventano rimandi `[[…]]`.

## Problemi noti

Motore (fatto così di proposito; dettagli in `docs/REVISIONE.md` e in `REGOLE.md`, «Trappole del motore»):

- Identità goniometriche, esponenziali e logaritmiche decise solo dal confronto numerico (raramente sbagliato vicino a cancellazioni forti).
- Irriducibilità garantita fino al grado 5; angoli notevoli solo multipli di π/12; autovalori e `realZeros` solo con fattori di primo e secondo grado.
- Insiemi: unione tra soluzioni periodiche e punti o intervalli non rappresentabile (il messaggio parla di «intervallo» anche per un punto); `x = 1 e 2` vale ∅.
- `FORMA.DECIMALE` per valori approssimati solo nelle risposte costanti.
- Parser: niente fattoriale, gradi, numeri periodici, notazione `1E5`; il parser degli insiemi non completa i testi a metà (l'app prova le chiusure di `SET_ENDINGS`).
- Risposte `matrix`: caselle senza numeri complessi.
- Passaggi della scomposizione di un quadrato di binomio: `(x + 1)(x + 1)` prima di `(x + 1)²` (`src/motore/steps/factor.ts`).

Generatori e lezione:

- **«non esiste» non si può scrivere con la tastiera matematica** (non c'è il tasto; `∞` è solo nel livello Insiemi). Sul telefono i tre generatori di limiti si possono fare bene solo come scelta multipla (hanno sempre almeno tre risposte sbagliate previste). Da aggiungere con il livello Analisi della tastiera (fase 4, punto 4): tasti `+∞`, `−∞`, «non esiste», `e`, e la lettera `n` non serve (le risposte sono numeri).
- I limiti di successioni sono scritti come espressioni nella lettera `n`: per questi esercizi i nodi «successione» del motore (fase 6, punto 3) non servono; mancano ancora fattoriale e radice n-esima, quindi niente `n!` né `ⁿ√n` (criterio del rapporto, formula di Stirling).
- Nei limiti di funzioni non ci sono forme con il valore assoluto o con `√(x²) = |x|` per `x → −∞`: nel catalogo manca un errore tipico adatto (vedi «Domande aperte»).
- La prova numerica delle verifiche (`confirmsLimit`) lavora in virgola mobile, con tolleranza del 2 per mille: basta a distinguere la risposta giusta da quelle sbagliate, ma non è una dimostrazione. La garanzia vera è il ricalcolo con sympy dal testo, fatto a mano (script fuori dal repository, come per gli altri generatori).

- Al livello 1 scomposizione, Gauss e qualche derivata hanno due sole risposte sbagliate: niente scelta multipla per quegli esercizi.
- Derivate: una trentina di esercizi «classici» escono circa il 2% delle volte l'uno (sotto la soglia).
- La lezione V1.M06.L04 non ha ancora la visualizzazione `VIS.disequazioni-grafico`.
- Le cinque dimostrazioni di riserva seguono le strade classiche dei manuali di Analisi 1 (zeri per bisezione; Weierstrass con una successione che tende all'estremo superiore e Bolzano-Weierstrass; Fermat con il segno del rapporto incrementale; Rolle da Weierstrass e Fermat; Lagrange con la funzione ausiliaria), ma sono state scritte **senza un libro aperto**: il confronto con il libro di testo chiesto da `REGOLE.md` resta da fare quando entrano nelle lezioni.
- Nelle dimostrazioni di riserva i risultati dei moduli non ancora scritti (successioni monotone, Bolzano-Weierstrass, permanenza del segno, continuità per successioni…) sono citati a parole: diventano rimandi `[[…]]` quando le lezioni esistono (elenco in `src/riserva/LEGGIMI.md`). Il teorema dei valori intermedi (V2.M05) e quello di Cauchy (V2.M06) non sono in riserva.
- La prova con sympy dal testo mostrato non è nel repository né in CI: va rifatta a mano per ogni generatore nuovo (`REGOLE.md`).

App:

- Non provata su un iPhone vero.
- Niente cronologia del browser: si torna indietro solo con il pulsante in alto.
- `∀x ∈ ℝ` e `∄x ∈ ℝ` sono mostrati ma non si possono scrivere (si usano `ℝ` e `∅`); il livello Funzioni della tastiera non ha le cifre.
- Un tentativo fatto nei millisecondi prima che l'archivio dei dati sia aperto non viene salvato.
- Su telefono la riga finale dei passaggi delle disequazioni fratte va fatta scorrere di lato; le opzioni di scelta multipla di un insieme mostrano solo gli intervalli.
- `ordering` non è mostrato dalla schermata di esercizio; le dimostrazioni sono solo statiche; flashcard lette ma non mostrate.

Altro:

- Icone PNG provvisorie; `README.md` con il solo titolo.
- GitHub Actions avvisa che `actions/checkout@v4`, `setup-node@v4` e `upload-artifact@v4` usano Node 20, deprecato: passare alle versioni successive quando si tocca il workflow.
- Alcuni commit passati hanno il controllo rosso (corretti dai successivi): conta solo l'ultimo stato del ramo.

## Domande aperte (decide Andrea)

- **Errore tipico nuovo** «√(x²) = x anche per x negativo» (serve per `√(x² + ax) + x` con `x → −∞` e per i limiti con il valore assoluto): aggiungerlo permetterebbe quelle forme in `V2.M04.A01.g1`.
- **Copia della specifica nel Progetto di Claude**: la tabella degli errori ha cinque righe nuove (sessione E1), ma la sessione non ha avuto il permesso di scrivere nel Progetto: va ricaricato a mano `docs/SPECIFICA.md` (per il resto le due copie sono identiche).

- **Errore tipico nuovo** «zero doppio trattato come zero semplice» (`(x − 3)²` studiato come `x − 3`): aggiungerlo cambia catalogo e tabella della specifica.
- **Parentesi degli intervalli**: `(1; 3)` (oggi) oppure `]1; 3[` nella scrittura dell'app? In lettura valgono entrambe.
- **IndexedDB nella versione PC**: funziona in Chromium anche da file; da provare in Safari e Firefox (il ripiego esiste).

## Decisioni da rivedere

Prese seguendo la sezione 0 della specifica, dove il testo non decide. Il numero tra parentesi è la sessione.

*Scrittura e lettura*

1. Intervalli con punto e virgola e tonde per gli estremi esclusi, `(1; 3]`; in lettura anche `]1; 3[` e la virgola non tra cifre (2).
2. `(1,5)` è il numero 1,5; `{1,2}` è rifiutato come ambiguo (2, 4a).
3. Un numero da solo, in una risposta di tipo insieme, vale `x = numero` (2).
4. `[1; 2] ∪ [2; 3]` vale `[1; 3]`; la forma canonica si pretende solo con `canonicalForm: true`; estremo decimale per uno esatto = `FORMA.DECIMALE` (2).
5. `log` senza base = base 10, `ln` = naturale; per il Volume 2 da decidere (1).
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
34. Scaletta dei moduli proposta in `docs/SCALETTA.md` (4c).

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
