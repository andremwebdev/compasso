# Architettura del motore

Scritto nella sessione 1 (fase 2, prima metà). Descrive il motore matematico per **l'intero perimetro** della specifica, sezione 6: quello che esiste già e quello che la sessione 2 deve aggiungere, con il posto dove va. Chi tocca il motore aggiorna questo documento.

Legenda: ✅ implementato e testato · 🔜 progettato qui, da implementare (sessione 2, salvo diversa indicazione).

## 1. Principi

1. **Esatto, sempre.** Nessun risultato passa per i numeri in virgola mobile. I `number` di JavaScript servono solo a confrontare risposte in punti di prova e a disegnare grafici.
2. **Dati semplici e immutabili.** Espressioni, insiemi, matrici ed esercizi sono oggetti senza metodi, distinti da un campo `kind`. Si salvano, si confrontano e si provano senza sorprese; le operazioni sono funzioni.
3. **L'albero è fedele alla scrittura.** Un'espressione conserva la forma in cui è stata scritta: `x + 0` resta `x + 0`. Solo così si può controllare la *forma* di una risposta e mostrare un passaggio esattamente com'è. Le forme canoniche si calcolano a parte, quando servono.
4. **Deterministico.** Nessuna funzione del motore usa l'ora o `Math.random`. L'unica casualità è `Rng`, che dipende da una chiave. Anche i punti di prova dell'equivalenza dipendono solo dalle due espressioni confrontate.
5. **Il compilatore come rete di sicurezza.** Le funzioni che visitano un'unione (`Expr`, `AnswerSpec`…) usano `switch` completi senza `default`: aggiungere un caso nuovo fa fallire la compilazione in ogni punto da aggiornare.
6. **Il motore non conosce l'interfaccia.** `src/motore/` non importa nulla da `app/`, `dati/`, `contenuti/`. Non conosce nemmeno il catalogo degli errori: quello lo usa `src/esercizi/`.
7. **Non è un sistema di calcolo simbolico universale** (specifica, sezione 6, «Cosa NON deve fare»). Non integra, non calcola limiti qualsiasi, non risolve equazioni arbitrarie: i generatori costruiscono all'indietro e il motore verifica.

## 2. Mappa dei moduli

```
src/
├─ codici.ts            ✅ forme dei codici fissi (lezione, abilità, generatore…) e loro controllo
├─ motore/
│  ├─ errors.ts         ✅ EngineError
│  ├─ numbers/          ✅ interi (bigint), Rational, Surd      🔜 complex.ts
│  ├─ random/           ✅ Rng con seme
│  ├─ expr/             ✅ albero, costruttori, visita, valutazione numerica, LaTeX
│  ├─ parser/           ✅ espressioni, equazioni e disequazioni  🔜 sets.ts (insiemi)
│  ├─ algebra/          ✅ forma normale (poly, normalize), polinomi in una variabile (upoly), specializzazione
│  │                    🔜 simplify, expand, factor, ruffini, division (con passaggi)
│  ├─ equivalence/      ✅ equivalenza esatta e numerica
│  ├─ form/             ✅ vincoli di forma
│  ├─ sets/             ✅ tipi                                  🔜 operazioni, confronto, LaTeX
│  ├─ linalg/           ✅ Matrix, confronto, LaTeX             🔜 operazioni, Gauss con passaggi, det, inversa, rango, autovalori
│  ├─ calculus/         ✅ valori di limite                      🔜 derive, successioni e somme
│  ├─ steps/            🔜 registrazione dei passaggi
│  └─ display/          🔜 tabelle dei segni e di variazione, sistemi con la graffa, grafici statici
├─ esercizi/            ✅ schema dei generatori, creazione dell'esercizio, valutazione delle risposte, opzioni
│                       🔜 verifica automatica dei generatori (specifica, sezione 12)
├─ generatori/          (dalla sessione 3) un file per generatore: v1/m06/a04-g1.ts
├─ contenuti/
│  └─ formato/          ✅ sintassi delle lezioni: tipi, lettura, controllo di una lezione
└─ errori/              ✅ catalogo unico (sessione 0)
```

Dipendenze ammesse, dall'alto verso il basso: `app` → `esercizi`, `contenuti/formato`, `dati` → `motore`, `errori`, `codici`. Dentro il motore: `numbers` e `random` non dipendono da nulla; `expr` da `numbers`; `parser`, `algebra` da `expr`; `equivalence` da `algebra`; `form` da `algebra` ed `equivalence`; `sets`, `linalg`, `calculus` da tutto il precedente.

## 3. Numeri esatti ✅

| Tipo | File | Cosa rappresenta | Note |
| --- | --- | --- | --- |
| `bigint` | `numbers/integers.ts` | interi di qualsiasi grandezza | MCD, mcm, radice intera, `extractPower` (72 = 6²·2), divisori, fattore primo più piccolo |
| `Rational` | `numbers/rational.ts` | frazioni, **sempre ridotte**, denominatore positivo | legge e scrive i decimali con la virgola (`parseDecimal`, `toDecimalString`) |
| `Surd` | `numbers/surd.ts` | combinazioni razionali di radici quadrate: 3+2√5, √2/2, √2+√3 | è un **campo**: somma, prodotto, reciproco (razionalizzazione automatica) e segno sono esatti; la scrittura è unica |

**Perché `Surd`.** I numeri del tipo «razionale + radici quadrate» sono chiusi rispetto alle quattro operazioni e hanno una forma normale unica: due numeri sono uguali se e solo se hanno gli stessi termini. Sono i coefficienti della forma normale (sezione 6), così `1/(1+√2)` e `√2−1` risultano uguali senza valutazioni approssimate. Il segno si decide in virgola mobile quando è netto e con 40 cifre esatte quando c'è cancellazione.

**π ed e** non sono numeri del motore: sono simboli (`const`), trattati come indeterminate. Lo stesso vale per le **radici di indice superiore** (∛2) e per le radici di espressioni: sono «atomi» con una regola di riduzione (sezione 6).

**Decimali.** Un decimale è un `Rational` con accanto il numero di cifre scritte (`decimals`): 1,50 vale esattamente 3/2 ma si ricorda di essere un decimale. Serve a mostrarlo com'era e a riconoscere `FORMA.DECIMALE`.

**Numeri complessi** 🔜 `numbers/complex.ts`. La forma algebrica è già coperta: `i` è una costante delle espressioni e la forma normale applica `i² = −1`, quindi `(1+i)² = 2i` è un'uguaglianza esatta. Da aggiungere:

- `Complex` = coppia di `Surd` (parte reale e immaginaria) con le quattro operazioni, modulo al quadrato, coniugato, potenze intere;
- **angoli notevoli**: tabella esatta dei multipli di π/12 con seno e coseno come `Surd`; serve al passaggio tra forma algebrica e forme trigonometrica/esponenziale e alle radici n-esime. I generatori costruiscono all'indietro (scelgono modulo e argomento notevole), quindi la tabella basta;
- forma trigonometrica ed esponenziale restano **espressioni** (`ρ(cos θ + i sin θ)`, `ρ·e^{iθ}`): la forma si controlla con i vincoli `trigonometricForm` (✅) ed `exponentialForm` (🔜);
- `evaluateComplex` (valutazione numerica complessa), da usare nel confronto numerico quando un'espressione contiene `i` fuori dalla forma polinomiale (per esempio `e^{iπ}`).

## 4. Espressioni ✅

`expr/types.ts`. Dodici tipi di nodo:

| Nodo | Significato | Nodo | Significato |
| --- | --- | --- | --- |
| `num` | razionale esatto (con eventuale `decimals`) | `pow` | potenza |
| `sym` | variabile o parametro | `root` | radice di indice intero ≥ 2 |
| `const` | π, e, i | `abs` | valore assoluto |
| `add` | somma di n termini | `fn` | sin, cos, tan, cot, arcsin, arccos, arctan, ln |
| `neg` | opposto | `log` | logaritmo in base qualsiasi |
| `mul` | prodotto di n fattori | `div` | quoziente (frazione) |

Scelte:

- **La sottrazione non esiste**: `a − b` è `add(a, neg(b))`. Una regola in meno ovunque; la stampa rimette il segno meno.
- **La divisione esiste**, distinta dalla potenza −1: serve a distinguere `1/x` da `x⁻¹` e a controllare le forme (frazione ridotta, razionalizzata).
- **Somme e prodotti hanno n argomenti**: `a+b+c` è un solo nodo. Una somma dentro una somma è una parentesi scritta apposta.
- **Le funzioni stanno in una tabella** (`expr/functions.ts`): nome, LaTeX, sinonimi italiani (sen, tg, cotg, arcsen…), valutazione. Aggiungere una funzione elementare è una riga, più il nome nel tipo `FunctionName`.
- `log` senza base è il **logaritmo in base 10** (convenzione dei testi italiani delle superiori); il naturale è `ln`.

**Equazioni e disequazioni** sono oggetti a parte: `Relation { op, left, right }`.

Funzioni: costruttori (`expr/build.ts`: `add`, `sub`, `mul`, `div`, `pow`, `sqrt`, `frac`, `decimal`…), visita (`expr/walk.ts`: `children`, `mapChildren`, `variables`, `substitute`, `sameStructure`, `containsDecimal`, `isIncomplete`), valutazione numerica reale (`expr/evaluate.ts`: `NaN` dove non è definita), LaTeX (`expr/latex.ts`).

**I costruttori non semplificano.** `mul(1, x)` si mostra `1x`. La pulizia per mostrare risultati (coefficienti 1 nascosti, frazioni ridotte, segni sistemati, radicali in forma normale) è `algebra/simplify.ts` 🔜: i generatori la chiamano sul risultato prima di mostrarlo, e *non* sui passaggi dove la forma grezza è voluta.

### Successioni e somme 🔜

Due nodi nuovi in `Expr`, da aggiungere quando servono (V2.M03, V2.M11): `sum { index, from, to, body }` (sommatoria; `to` può essere +∞) e, per i termini generali, basta `sym("n")`. Servono per *mostrare* e per valutare somme finite; la convergenza la conosce il generatore. Aggiungere un nodo significa: tipo in `types.ts`, e poi il compilatore indica `children`, `mapChildren`, `evaluate`, `latex`, `normalize` (dove diventa un atomo opaco).

## 5. Lettura di quello che scrive Andrea ✅

`parser/tokenize.ts` spezza il testo, `parser/parse.ts` costruisce l'albero (discesa ricorsiva). `parseExpression` e `parseRelation` non lanciano mai errori: restituiscono `{ ok: true, value, complete }` oppure `{ ok: false, error: { message, position } }`, con il messaggio in italiano.

Regole fissate (la tastiera matematica della fase 4 deve produrre testo che le rispetta):

| Scrittura | Vale | Nota |
| --- | --- | --- |
| `2x`, `2(x+1)`, `(x+1)(x−1)`, `xy`, `2π` | moltiplicazione implicita | |
| `1,5` `1.5` `,5` | decimali | la virgola è decimale solo **tra due cifre** |
| `*` `·` `×` | prodotto | |
| `/` `:` `÷` | quoziente | `1/2x` vale `(1/2)·x`: prodotti e divisioni da sinistra a destra |
| `^` `**` `x²` `x⁻¹` | potenza | `−x^2` vale `−(x²)`; `2^3^2` vale `2^(3^2)` |
| `√2` `sqrt(2)` `sqrt2` `∛x` `root(3; x)` | radici | `√2x` vale `√2·x` |
| `sin x` `sin(x)` `sen x` `sin 2x` `sin^2 x` `sin²x` | funzioni | senza parentesi l'argomento è un prodotto di numeri e lettere e si ferma a `+`, `−` e alla funzione successiva |
| `ln x` `log x` `log_2 x` `log(2; x)` | logaritmi | `log` = base 10 |
| `|x|` `abs(x)` | valore assoluto | |
| `e^x` `exp(x)` `pi` `π` | costanti | `e` è sempre il numero di Nepero |
| `20%` | 20/100 | |
| `( )` `[ ]` `{ }` | parentesi | equivalenti tra loro |
| `=` `≠` `!=` `<` `≤` `<=` `>` `≥` `>=` | relazioni | solo in `parseRelation` |
| `i` | unità immaginaria | solo con l'opzione `complex`; altrimenti è una variabile |
| `x_1`, `alpha`, `θ` | variabili con indice, lettere greche | |

**Anteprima in tempo reale.** Un testo incompleto (`2+`, `(x+1`, `sqrt(`) non è un errore: il parser lo completa con il segnaposto `□` e chiude le parentesi aperte, segnalando `complete: false`. L'interfaccia disegna sempre `toLatex(value)`; una risposta con `complete: false` non si può confermare.

Un argomento separato da punto e virgola (`root(3; x)`) segue la convenzione italiana degli intervalli; la virgola seguita da spazio o da una non-cifra è accettata come separatore.

🔜 `parser/sets.ts`: intervalli e insiemi (`[1; 3)`, `(−∞; 2] ∪ {5}`, `∅`, `ℝ`, `x < 2 ∨ x ≥ 5`, `x = π/6 + 2kπ`), che usa `parseExpression` per gli estremi. I valori di limite (`+∞`, `−∞`, «non esiste») sono già letti da `calculus/limit.ts`.

## 6. Forma normale ✅

`algebra/poly.ts`, `algebra/normalize.ts`. È il cuore del confronto esatto.

Ogni espressione si trasforma in un **quoziente di due polinomi** (`Ratio`) i cui coefficienti sono `Surd` e le cui indeterminate sono **atomi**:

- variabili (`x`), π, e: atomi *indipendenti*;
- l'unità immaginaria, con la regola `i² = −1`;
- ogni sottoespressione non polinomiale, identificata dalla chiave canonica del suo argomento: `sin(x+1)` e `sin(1+x)` sono lo stesso atomo. Alcuni hanno una **regola di riduzione**: `(ⁿ√P)ⁿ = P`, `|P|² = P²`.

Riduzioni applicate durante la normalizzazione (ognuna vale ovunque le due scritture sono definite):

- radici di razionali: `√8 = 2√2` (dentro i coefficienti), `∛54 = 3·∛2`, `⁶√8 = √2`, `∛(−8) = −2`, `√(−4) = 2i`;
- esponenti razionali: `x^(p/q) = (q√x)^p`; esponenti interi negativi: reciproco;
- parità: `sin(−x) = −sin x`, `cos(−x) = cos x`, `|−x| = |x|`;
- cambio di base: `log_b(a) = ln a / ln b`; `ln e = 1`, `ln 1 = 0`, `sin 0 = 0`, `cos 0 = 1`;
- denominatori numerici e monomi semplificati subito.

Le frazioni **non** si riducono con il MCD: per l'uguaglianza basta il prodotto in croce (`a/b = c/d` se e solo se `ad − bc = 0`), che è esatto e non richiede MCD in più variabili.

Limiti di sicurezza: oltre 800 termini o esponenti oltre 200 si lancia `ComplexityError`, e chi confronta ripiega sui valori numerici.

## 7. Equivalenza ✅

`equivalence/equivalence.ts`: `equivalent(a, b)` e `compare(a, b)` (che dice anche come ha deciso).

1. **Esatto.** Si normalizzano `a` e `b` nello stesso contesto e si guarda se la differenza è zero. Se è zero: equivalenti. Se non è zero e tutti gli atomi sono indipendenti (variabili, π, e, i): **non** equivalenti, con certezza.
2. **Numerico**, quando ci sono atomi con identità che la forma normale non conosce (`sin²x + cos²x`, proprietà dei logaritmi, `√(x²) = |x|`). Si valutano entrambe in punti casuali, ignorando quelli dove una delle due non è definita. Servono 12 punti validi concordi (tolleranza relativa 10⁻⁸); un solo punto discorde basta per dire «diverse». I punti si cercano prima vicino all'origine (dove gli errori di arrotondamento sono piccoli) e poi lontano (per i domini come `x > 100`). Con meno di 4 punti validi il risultato è `undecided` e vale come non equivalente.

«Equivalenti» significa **uguali dove entrambe sono definite** (specifica, sezione 6): `(x²−1)/(x−1)` e `x+1` sono equivalenti. Le condizioni di esistenza si chiedono con un tipo di risposta a parte (insieme), non con l'equivalenza.

Costo: decimi di millisecondo per le espressioni tipiche (c'è un test che lo controlla).

## 8. Vincoli di forma ✅

`form/constraints.ts`: `checkForm(expr, constraint)` restituisce `{ ok: true }` oppure `{ ok: false, reason }`, con il motivo in italiano da mostrare ad Andrea. I vincoli guardano **l'albero così com'è scritto**; l'equivalenza si controlla prima, a parte.

| Vincolo | Richiesta nel testo | Cosa controlla |
| --- | --- | --- |
| `expanded` | «sviluppa», «riduci a forma normale» | somma di monomi, senza prodotti di somme né potenze di somme, termini simili già sommati |
| `factored` | «scomponi» | prodotto di fattori ciascuno **irriducibile** sui razionali e senza fattori numerici o letterali da raccogliere |
| `reducedFraction` | «riduci ai minimi termini» | frazioni numeriche ridotte; in una frazione algebrica numeratore e denominatore senza fattori comuni |
| `rationalized` | «razionalizza» | nessuna radice (né esponente frazionario) in un denominatore |
| `simplifiedRadicals` | «porta fuori dal segno di radice» | sotto radice nessun fattore che sia una potenza perfetta, nessuna frazione, indice non riducibile |
| `algebraicForm` | «scrivi in forma algebrica» | `a + bi` con `a`, `b` reali, `i` non al denominatore né sotto potenza |
| `trigonometricForm` | «scrivi in forma trigonometrica» | `ρ(cos θ + i sin θ)` con `ρ > 0` e lo stesso `θ` |

**Irriducibilità.** `algebra/upoly.ts` contiene i polinomi in una variabile a coefficienti razionali: divisione con resto, MCD, radici razionali, ricerca dei fattori di secondo grado (metodo di Kronecker), scomposizione sui razionali. Il test è **completo fino al grado 5**; dal grado 6 un polinomio senza fattori di primo e secondo grado è considerato irriducibile (limite dichiarato: non si incontra negli esercizi previsti).

**Più variabili.** Invece di un MCD in più variabili, `algebra/specialize.ts` restringe i polinomi a una **retta casuale** (ogni variabile diventa `a·t + b`, con interi piccoli scelti da un `Rng` che dipende dal polinomio). Se il polinomio ristretto mantiene il grado ed è irriducibile, lo è anche l'originale; se due polinomi ristretti sono primi tra loro, lo sono anche gli originali. Il viceversa vale per quasi tutte le rette: si provano più rette. `x²−y²` risulta riducibile su ogni retta; `x²+y²` irriducibile già sulla prima.

🔜 `exponentialForm` (`ρ·e^{iθ}`) con i complessi; la forma canonica degli intervalli è un'opzione della risposta di tipo insieme (sezione 10).

## 9. Casualità ✅

`random/rng.ts`. `Rng.forExercise(codiceGeneratore, livello, seme)` crea il generatore di un esercizio: la chiave è la stringa `codice|livello|seme`, trasformata in stato iniziale con `cyrb128` e fatta avanzare con `sfc32` (solo operazioni intere a 32 bit: identico su ogni dispositivo).

Metodi: `int`, `intExcept` (diverso da zero o da valori dati), `real`, `bool`, `sign`, `pick`, `shuffle`, `sample`, `fork(etichetta)` (generatore indipendente per una parte dell'esercizio: aggiungere un'estrazione in una parte non cambia le altre).

**La sequenza è congelata** da un test: cambiare l'algoritmo cambierebbe tutti gli esercizi già visti, segnalati o in ripasso.

## 10. Insiemi di soluzioni (tipi ✅, operazioni 🔜)

`sets/types.ts`:

```ts
type Endpoint = Expr | "-inf" | "+inf";
interface Interval { lower: Endpoint; upper: Endpoint; lowerClosed: boolean; upperClosed: boolean }
interface RealSet { kind: "realset"; pieces: Interval[] }               // ∅ = nessun pezzo; punto isolato = [a; a]
interface PeriodicSet { kind: "periodic"; base: RealSet; period: Expr } // unione su k intero di (base + k·periodo)
type SolutionSet = RealSet | PeriodicSet;
```

Un solo tipo `RealSet` copre intervalli aperti, chiusi, illimitati, unioni, punti isolati, ∅ e ℝ. `PeriodicSet` copre sia `x = π/6 + 2kπ` (base = punti) sia le disequazioni goniometriche (base = intervalli).

Da implementare in `sets/`:

- **forma canonica**: pezzi ordinati, disgiunti, fusi quando si toccano. Gli estremi sono costanti esatte, ordinate con `Surd` quando possibile e con la valutazione numerica altrimenti (π, e);
- **operazioni**: unione, intersezione, complementare, appartenenza;
- **confronto per struttura**: due insiemi sono uguali se le forme canoniche hanno gli stessi estremi (confrontati con `equivalent`) e le stesse inclusioni. Per i periodici la base si riporta in `[0, periodo)` e si accettano periodi multipli equivalenti (`π/2 + kπ` contro `π/2 + 2kπ ∪ 3π/2 + 2kπ`);
- **LaTeX** con le convenzioni italiane: punto e virgola come separatore (`[1{,}5; 3]`), `∪`, `∅`, `ℝ`, `k ∈ ℤ`; e la scrittura come disequazione (`x < 2 ∨ x ≥ 5`);
- **da disequazione a insieme** per i casi che servono ai generatori (prodotto di fattori lineari con segno: tabella dei segni).

## 11. Vettori e matrici (tipi ✅, operazioni 🔜)

`linalg/matrix.ts`: `Matrix { kind: "matrix", rows: Expr[][] }`; un vettore è una matrice con una colonna. Elementi esatti (`Expr`), anche complessi. ✅ costruzione, confronto elemento per elemento, LaTeX.

Da implementare in `linalg/`: somma, prodotto, trasposta; **riduzione di Gauss con registrazione dei passaggi** (operazioni elementari come dati: scambio, moltiplicazione, combinazione); determinante (Gauss e Laplace, con passaggi), inversa, rango; soluzione di sistemi lineari con parametri liberi; autovalori e autovettori **per matrici costruite all'indietro** (il generatore sceglie autovalori e base, il motore verifica `A·v = λ·v` e scompone il polinomio caratteristico con `upoly`).

Le operazioni lavorano su elementi `Surd` quando la matrice è numerica (veloce ed esatto) e passano dalla forma normale quando ci sono parametri.

## 12. Analisi

- ✅ `calculus/limit.ts`: valore di un limite = numero finito (`Expr`), `+∞`, `−∞`, «non esiste»; lettura, confronto, LaTeX.
- 🔜 `calculus/derive.ts`: derivata simbolica per ricorsione sull'albero (somma, prodotto, quoziente, potenza, composizione, tutte le funzioni della tabella), seguita da `simplify`. Serve ai generatori di derivate e a **verificare le primitive**: la risposta di Andrea si deriva e si confronta con l'integranda (`equivalent`), quindi la costante di integrazione non conta. Una variante registra la regola usata a ogni passo, per le soluzioni.
- 🔜 Taylor, studi di funzione, integrali: nessun algoritmo generale. Il generatore sa il risultato; il motore offre derivata, valutazione, tabelle e grafici.

## 13. Passaggi e cose da mostrare 🔜

- `steps/`: un passaggio è `{ text: RichText, formula?: string }`. Le procedure standard hanno una variante «con passaggi» che restituisce risultato e lista: formula risolutiva, Ruffini, divisione tra polinomi, scomposizioni (raccoglimento, prodotti notevoli, trinomio), Gauss, studio del segno. I generatori compongono i passaggi della soluzione da queste liste.
- `display/signTable.ts`: tabella dei segni come dato (zeri ordinati, riga per fattore, riga del risultato) + LaTeX (`array`). Stessa struttura per le tabelle di variazione.
- `display/system.ts`: sistemi con la graffa (`\begin{cases}`).
- `display/plot.ts`: grafico statico di una funzione come SVG (campionamento con `evaluate`, interruzione ai punti non definiti), riusabile da lezioni e soluzioni.

Tutto ciò che il motore mostra passa da LaTeX (KaTeX, caratteri incorporati) o da SVG generato in locale.

## 14. Esercizi: schema, valutazione ✅

`src/esercizi/` (fuori dal motore perché conosce il catalogo degli errori e i codici).

- `schema.ts`: i tipi. Un generatore è un `GeneratorDefinition` (codice, abilità, lezione, livelli, errori che può produrre, limiti di pulizia, funzione `generate`, verifica indipendente facoltativa). `generate` riceve `{ level, seed, rng }` e restituisce un `ExerciseDraft`: testo, risposta (`AnswerSpec`), passaggi, due indizi.
- `AnswerSpec` è un'unione per tipo di risposta: `choice`, `number`, `expression`, `set`, `limit`, `matrix`, `truefalse`, `ordering`. Ogni variante porta la risposta giusta e le **risposte sbagliate previste** dello stesso tipo, ognuna con il suo codice di errore: il compilatore impedisce di dare a un esercizio di espressioni una risposta sbagliata che non sia un'espressione, o un codice di errore che non esiste.
- `generate.ts`: `defineGenerator` (controlla la definizione) e `generateExercise(def, level, seed)` (crea l'`Rng`, chiama il generatore, controlla le regole di base, aggiunge l'identità `generatore, livello, seme`).
- `evaluate.ts`: `evaluateResponse(exercise, response)` → `correct`, `wrong` (con codice di errore o `NON_CLASSIFICATO` e il motivo), `skipped` («Non lo so»), `invalid` (testo non interpretabile: non si registra, si chiede di correggere).
- `choices.ts`: `choiceOptions(exercise)` trasforma qualunque esercizio con almeno tre risposte sbagliate previste in una scelta multipla, con ordine deterministico (serve alla simulazione TOL).

Ordine dei controlli per una risposta scritta (specifica, sezioni 5 e 7):

1. si legge il testo → se non si capisce o è incompleto: `invalid`;
2. è equivalente alla risposta giusta?
   - sì, ma contiene decimali e l'esercizio chiede la forma esatta → sbagliata, `FORMA.DECIMALE`;
   - sì, ma non rispetta un vincolo di forma → sbagliata, `FORMA.NON_RICHIESTA`, con il motivo;
   - sì → giusta;
3. è equivalente a una risposta sbagliata prevista? → sbagliata, con quel codice;
4. è un decimale che approssima la risposta giusta? → sbagliata, `FORMA.DECIMALE`;
5. altrimenti → sbagliata, `NON_CLASSIFICATO`.

In modalità **approssimazione** (solo tipo `number`, tolleranza dichiarata) si confrontano i valori entro la tolleranza e i decimali sono ammessi.

🔜 `verify.ts`: la verifica automatica dei generatori (specifica, sezione 12) usa `generateExercise`, `evaluateResponse`, `equivalent`, `checkForm` e la verifica indipendente del generatore.

## 15. Lezioni: formato ✅

`src/contenuti/formato/`. La sintassi (intestazione, blocchi `:::nome{attributi}`, sezioni `::nome`, rimandi `[[...]]`) è descritta in `REGOLE.md`, «Come scrivere una lezione»; qui c'è come è fatta la lettura.

- `parse.ts`: `parseLesson(testo)` restituisce `{ lesson, problems }`. Non lancia mai: ogni problema ha riga e messaggio in italiano. La lezione letta è un elenco di blocchi tipizzati (`LessonBlock`: testo, definizione, teorema, dimostrazione a passaggi, esempio, attenzione, domanda, visualizzazione, flashcard, glossario, riepilogo). Controlla **una lezione alla volta**: intestazione, attributi, codici ben formati e del modulo giusto, errori esistenti nel catalogo, termini definiti una volta sola, dimostrazione dopo il suo teorema, riepilogo in fondo, formule chiuse.
- `lessonReferences(lesson)`: tutto ciò a cui la lezione rimanda (termini, lezioni, teoremi, errori, generatori, visualizzazioni). È il punto di partenza della **verifica dei contenuti** tra file (specifica, sezione 12), da costruire nella fase 3.
- `inline.ts`: `splitInline(testo)` separa testo, formule e rimandi.

**Markdown.** Il parser di Compasso si occupa solo della struttura propria (blocchi, sezioni, rimandi, formule). Il Markdown ordinario dentro i testi (paragrafi, grassetto, elenchi, tabelle) lo trasforma una libreria: **`marked`**, da installare quando l'app mostra la prima lezione (fase 3). L'ordine è fisso: prima `splitInline` toglie formule e rimandi, poi `marked` lavora sulle sole parti di testo. Così il LaTeX non viene mai toccato dal Markdown (in LaTeX `_` e `*` hanno un altro significato), e le formule si possono disegnare man mano che si scorre.

Dalle lezioni si ricavano senza riscrivere nulla: le **flashcard automatiche** (ogni blocco definizione o teorema: `nome` davanti, enunciato dietro), il **glossario** (blocchi definizione con `termine` e blocchi glossario), le **dimostrazioni interattive** (i passaggi con le versioni sbagliate).

## 16. Come si estende

| Cosa si aggiunge | Dove | Cosa tocca |
| --- | --- | --- |
| Una funzione elementare (es. `sinh`) | `expr/functions.ts` + `FunctionName` | nient'altro: parser, LaTeX, valutazione la leggono dalla tabella; `derive` avrà la sua riga |
| Un tipo di nodo (es. `sum`) | `expr/types.ts` | il compilatore elenca i `switch` da completare |
| Un vincolo di forma | `form/constraints.ts` + tipo `FormConstraint` | un caso nel `switch` di `checkForm` |
| Un tipo di risposta | `esercizi/schema.ts` (`AnswerSpec`, `Response`) | un caso in `evaluateResponse`, `choiceOptions`, `errorCodesOf` |
| Un blocco delle lezioni | `contenuti/formato/lesson.ts` (`LessonBlock`, `blockNames`) | un caso in `buildBlock` e `blockTexts`; una riga in `REGOLE.md` (un test controlla che ci sia) |
| Un oggetto matematico nuovo | una cartella nuova in `motore/` | tipi, confronto, LaTeX, test; nessuna modifica al nucleo |

**Analisi 2.** Le espressioni sono già in più variabili. La derivata parziale è `derive` rispetto a un simbolo; il gradiente è un vettore (`Matrix`) di derivate; l'hessiana una matrice; gli insiemi del piano e gli integrali multipli sono oggetti nuovi in cartelle nuove. Nulla del nucleo cambia.

**Fisica.** Una grandezza è un valore esatto più un'unità: `Quantity { value: Expr, unit: Unit }`, con `Unit` = vettore di sette esponenti razionali (dimensioni SI) più un fattore di scala esatto. Va in `motore/units/`: prodotto e quoziente sommano e sottraggono gli esponenti, la somma richiede dimensioni uguali, il confronto converte all'unità di base e usa `equivalent`. Si aggiunge un tipo di risposta `quantity` (valore con tolleranza + unità) e il parser delle unità riusa `parseExpression` per la parte numerica. I codici (`V4…`), lo schema dei generatori e il catalogo degli errori (categoria nuova) non cambiano forma.

## 17. Test

Ogni modulo ha il suo file in `test/motore/`, `test/esercizi/`, `test/contenuti/`. Oltre ai casi singoli ci sono controlli «a tappeto»: il parser non lancia mai eccezioni su migliaia di testi casuali; ogni LaTeX prodotto si disegna con KaTeX in modalità rigorosa; le identità algebriche si provano su espressioni generate; la sequenza dell'`Rng` è congelata; il confronto resta sotto una soglia di tempo.

## 18. Limiti noti del nucleo

- Irriducibilità completa solo fino al grado 5; fattori con coefficienti irrazionali non controllati oltre il primo grado.
- La forma normale non conosce le identità goniometriche, esponenziali e logaritmiche: le copre il confronto numerico (che non è una dimostrazione, ma con 12 punti casuali concordi un falso positivo non è realistico).
- Il confronto numerico è reale: le espressioni con `i` fuori dalla forma polinomiale aspettano `evaluateComplex`.
- Il decimale approssimato (`FORMA.DECIMALE`) si riconosce solo per risposte costanti, non per espressioni con coefficienti decimali approssimati (`0,33x`).
- Fattoriale, gradi (`30°`), numeri periodici e notazione scientifica con `E` non sono letti dal parser: quando un modulo li richiede si aggiungono al parser, non ai generatori.
