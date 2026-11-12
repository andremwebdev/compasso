# Architettura del motore

Scritto nella sessione 1 e completato nella sessione 2 (fase 2). Descrive il motore matematico per **l'intero perimetro** della specifica, sezione 6. Chi tocca il motore aggiorna questo documento.

Legenda: ✅ implementato e testato · 🔜 progettato qui, da implementare quando serve (dice quando).

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
│  ├─ numbers/          ✅ interi (bigint), Rational, Surd, Complex (con gli angoli notevoli)
│  ├─ random/           ✅ Rng con seme
│  ├─ expr/             ✅ albero, costruttori, visita, valutazione numerica reale e complessa, LaTeX
│  ├─ parser/           ✅ espressioni, equazioni e disequazioni (parse.ts), insiemi di soluzioni (sets.ts)
│  ├─ algebra/          ✅ forma normale (poly, normalize), polinomi in una variabile (upoly), specializzazione,
│  │                       pulizia (simplify), sviluppo e ritorno dalla forma normale (expand)
│  ├─ equivalence/      ✅ equivalenza esatta e numerica (reale e complessa)
│  ├─ form/             ✅ vincoli di forma
│  ├─ sets/             ✅ tipi, costruttori, forma canonica, operazioni, confronto, LaTeX
│  ├─ linalg/           ✅ Matrix, operazioni, Gauss con i passaggi, determinante, inversa, rango, sistemi, autovalori
│  ├─ complex/          ✅ le tre forme dei numeri complessi, potenze, radici n-esime
│  ├─ calculus/         ✅ valori di limite, derivata simbolica            🔜 successioni e somme (V2.M03, V2.M11)
│  ├─ steps/            ✅ passaggi: formula risolutiva, Ruffini, divisione, scomposizione
│  └─ display/          ✅ tabelle dei segni e di variazione, sistemi con la graffa   🔜 grafici statici (fase 4, con le visualizzazioni)
├─ esercizi/            ✅ schema dei generatori, creazione dell'esercizio, valutazione delle risposte, opzioni,
│                          verifica automatica dei generatori (verify.ts)
├─ generatori/          ✅ index.ts (elenco: codice → generatore), comuni/ (strumenti condivisi) e i cinque
│                          generatori di riferimento: v1/m04/a07-g1, v1/m06/a04-g1, v2/m06/a03-g1, v3/m02/a01-g1, v3/m03/a01-g1
├─ contenuti/
│  ├─ index.ts          ✅ elenco delle lezioni (i .md entrano come testo), loadLesson
│  ├─ v1/m06/l04.md     ✅ la lezione di riferimento (disequazioni fratte)
│  └─ formato/          ✅ sintassi delle lezioni: tipi, lettura, controllo di una lezione, verifica tra le lezioni
├─ dati/                ✅ registro dei tentativi e progressi delle lezioni: IndexedDB con versione (DATA_VERSION),
│                          ripiego su localStorage e memoria, migrazioni, riassunto per abilità
├─ app/                 ✅ fetta verticale: stato (state.ts), testo ricco (testo/), anteprima e tastiera (risposta/),
│                          schermata di esercizio e tastiera (componenti/), lezione a tratti e serie di esercizi (schermate/)
└─ errori/              ✅ catalogo unico (sessione 0)
```

Dipendenze ammesse, dall'alto verso il basso: `app` → `esercizi`, `contenuti/formato`, `dati` → `motore`, `errori`, `codici`. Dentro il motore: `numbers` e `random` non dipendono da nulla; `expr` da `numbers`; `parser`, `algebra` da `expr`; `equivalence` da `algebra`; `form` da `algebra` ed `equivalence`; `sets`, `linalg`, `complex`, `calculus` da tutto il precedente; `steps` e `display` da tutti gli altri (e `display` da `steps` solo per il tipo `Step`). `parser/sets.ts` usa `sets`.

## 3. Numeri esatti ✅

| Tipo | File | Cosa rappresenta | Note |
| --- | --- | --- | --- |
| `bigint` | `numbers/integers.ts` | interi di qualsiasi grandezza | MCD, mcm, radice intera, `extractPower` (72 = 6²·2), divisori, fattore primo più piccolo |
| `Rational` | `numbers/rational.ts` | frazioni, **sempre ridotte**, denominatore positivo | legge e scrive i decimali con la virgola (`parseDecimal`, `toDecimalString`) |
| `Surd` | `numbers/surd.ts` | combinazioni razionali di radici quadrate: 3+2√5, √2/2, √2+√3 | è un **campo**: somma, prodotto, reciproco (razionalizzazione automatica) e segno sono esatti; la scrittura è unica |

**Perché `Surd`.** I numeri del tipo «razionale + radici quadrate» sono chiusi rispetto alle quattro operazioni e hanno una forma normale unica: due numeri sono uguali se e solo se hanno gli stessi termini. Sono i coefficienti della forma normale (sezione 6), così `1/(1+√2)` e `√2−1` risultano uguali senza valutazioni approssimate. Il segno si decide in virgola mobile quando è netto e con 40 cifre esatte quando c'è cancellazione.

**π ed e** non sono numeri del motore: sono simboli (`const`), trattati come indeterminate. Lo stesso vale per le **radici di indice superiore** (∛2) e per le radici di espressioni: sono «atomi» con una regola di riduzione (sezione 6).

**Decimali.** Un decimale è un `Rational` con accanto il numero di cifre scritte (`decimals`): 1,50 vale esattamente 3/2 ma si ricorda di essere un decimale. Serve a mostrarlo com'era e a riconoscere `FORMA.DECIMALE`.

**Numeri complessi** ✅ `numbers/complex.ts` e `complex/forms.ts`. La forma algebrica è coperta già dalle espressioni: `i` è una costante e la forma normale applica `i² = −1`, quindi `(1+i)² = 2i` è un'uguaglianza esatta. In più:

- `Complex` = coppia di `Surd` (parte reale e immaginaria) con le quattro operazioni, coniugato, quadrato del modulo (`norm`), modulo quando è un `Surd`, potenze intere;
- **angoli notevoli**: seno e coseno esatti dei multipli di π/12, calcolati una volta come potenze di `cos 15° + i sin 15°`. Un angolo è un `Rational` q che sta per qπ. `notableUnit(q)`, `argumentOf(z)` (argomento principale in **(−π, π]**), `fromPolar(ρ, q)`. I generatori costruiscono all'indietro (scelgono modulo e argomento notevole), quindi la tabella basta;
- forma trigonometrica ed esponenziale sono **espressioni** (`trigonometricForm(ρ, q)` = `ρ(cos θ + i sin θ)`, `exponentialForm(ρ, q)` = `ρ·e^{iθ}`): la forma si controlla con i vincoli `trigonometricForm` ed `exponentialForm`;
- `exactComplex(expr)` dà il valore esatto di un'espressione costante in qualunque delle tre forme (sostituisce seno, coseno ed `e^{iθ}` degli angoli notevoli con i loro valori, poi usa la forma normale); `polarForm(z)` dà modulo e argomento;
- potenze: esatte con `Complex.pow`, in modulo e argomento con `polarPower` (De Moivre). Radici n-esime: `complexRoots(z, n)` dà per ognuna modulo `ⁿ√ρ`, argomento `(θ + 2kπ)/n` (k = 0…n−1, θ principale) e, quando l'argomento è notevole e il modulo è un `Surd`, la forma algebrica esatta;
- `evaluateComplex` (`expr/evaluate-complex.ts`): valutazione numerica complessa, usata dal confronto numerico quando compare `i` fuori dalla forma polinomiale (`e^{iπ} = −1`). Dove l'espressione è reale e definita nei reali coincide con `evaluate` (un test a tappeto lo controlla); `√(−4)` vale `2i`, come nella forma normale.

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

**I costruttori non semplificano.** `mul(1, x)` si mostra `1x`. La pulizia per mostrare i risultati è `algebra/simplify.ts` ✅ (sezione 6 bis): i generatori la chiamano sul risultato prima di mostrarlo, e *non* sui passaggi dove la forma grezza è voluta.

### Successioni e somme 🔜 (quando si scrivono V2.M03 e V2.M11)

Due nodi nuovi in `Expr`, da aggiungere quando servono: `sum { index, from, to, body }` (sommatoria; `to` può essere +∞) e, per i termini generali, basta `sym("n")`. Servono per *mostrare* e per valutare somme finite; la convergenza la conosce il generatore. Aggiungere un nodo significa: tipo in `types.ts`, e poi il compilatore indica `children`, `mapChildren`, `exprKey`, `evaluate`, `evaluateComplex`, `latex`, `normalize` (dove diventa un atomo opaco), `simplify` e `derive`.

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

**Insiemi di soluzioni** ✅ `parser/sets.ts`: `parseSolutionSet(testo, { variable })`, con le stesse garanzie (non lancia mai, errore in italiano con posizione, `complete: false` se un estremo è ancora da finire). Usa `parseExpression` per gli estremi. Legge:

| Scrittura | Vale |
| --- | --- |
| `[1; 3)` `(−∞; 2]` `]1; 3[` | intervalli; `]` e `[` «al contrario» sono parentesi aperte, all'italiana |
| `;` tra gli estremi | separatore; la virgola vale solo se non sta tra due cifre (`(1, 5)` è un intervallo, `(1,5)` è il numero 1,5) |
| `∪`, `U` tra due intervalli, `∨`, `o`, `oppure` | unione |
| `∧`, `∩`, `e` | intersezione (ha la precedenza sull'unione) |
| `{1; 2}`, `3` | punti isolati (un numero da solo è la soluzione `x = 3`) |
| `∅` `vuoto` `nessuna soluzione` `impossibile` · `ℝ` `R` `sempre` `∀x∈ℝ` | insieme vuoto · tutti i reali |
| `x < 2`, `2 > x`, `1 < x ≤ 3`, `x = 3`, `x ≠ 2` | disuguaglianze nell'incognita |
| `x = π/6 + 2kπ`, `π/6 + 2kπ < x < 5π/6 + 2kπ`, `x = ±π/3 + 2kπ` | soluzioni periodiche: l'estremo deve essere di primo grado in `k`; `k ∈ ℤ` in fondo è facoltativo |
| `x ∈ […]`, `S = […]` | prefissi accettati e ignorati |

L'insieme letto **resta com'è scritto**: i pezzi di un'unione non vengono riordinati né fusi, così si può controllare la forma canonica. I valori di limite (`+∞`, `−∞`, «non esiste») sono letti da `calculus/limit.ts`.

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

## 6 bis. Pulizia e sviluppo ✅

**`simplify(expr)`** (`algebra/simplify.ts`) pulisce un'espressione per mostrarla; il risultato è sempre equivalente all'originale e ripulirlo di nuovo non lo cambia (due test a tappeto). Lavora dal basso verso l'alto e scrive ogni prodotto o quoziente come *coefficiente razionale × potenze di fattori distinti*:

- numeri moltiplicati tra loro, coefficienti 1 nascosti, zeri tolti, segno portato davanti (`−3(x+1)`, `x − y + z` per `x − (y − z)`);
- **una sola linea di frazione**, con la frazione numerica ridotta: `6x/4` → `3x/2`, `(x/y)/z` → `x/(yz)`; i fattori uguali sopra e sotto si semplificano;
- fattori uguali riuniti in potenze (`x·x` → `x²`, `x²/x` → `x`, `(2x)²` → `4x²`, `(x²)³` → `x⁶`, `eˣ·eˣ` → `e^{2x}`);
- **radicali numerici in forma normale**: `√8` → `2√2`, `√(1/2)` e `1/√2` → `√2/2`, `⁶√8` → `√2`, `∛(−8)` → `−2`, `(√x)²` → `x`;
- potenze di `i` ridotte (`i³` → `−i`, `1/i` → `−i`);
- termini simili sommati (`2x + 3x`, `√8 + √2` → `3√2`, `π/6 + 2π` → `13π/6`);
- pochi valori esatti (`sin 0`, `cos 0`, `ln 1`, `ln e^k`, `log_b b`) e la parità (`sin(−x)` → `−sin x`, `|−x|` → `|x|`);
- ordine dei fattori: numero, radicali numerici, π ed e, `i`, lettere in ordine alfabetico, potenze ed esponenziali, somme tra parentesi, funzioni (`2√3·π·x·eˣ·(x+1)·sin x`).

**Non sviluppa e non scompone**: `(x+1)(x−1)` resta com'è. Una divisione per zero scritta in chiaro lancia `EngineError` (è un difetto del generatore).

**`expand(expr)`** (`algebra/expand.ts`) sviluppa passando dalla forma normale e tornando a un'espressione: somma di monomi in ordine di grado decrescente (l'unità immaginaria per ultima, così un numero complesso esce come `a + bi`), oppure un solo quoziente di polinomi sviluppati (ridotto ai minimi termini quando c'è una sola lettera). Lo stesso file contiene il ritorno dalla forma normale usato da matrici e complessi (`polyToExpr`, `ratioToExpr`, `surdToExpr`, `complexToExpr`) e il passaggio tra espressioni e polinomi in una variabile (`exprToUPoly`, `upolyToExpr`). Un numero con più radicali e denominatori si scrive con una sola frazione: `(1 + √5)/2`.

## 7. Equivalenza ✅

`equivalence/equivalence.ts`: `equivalent(a, b)` e `compare(a, b)` (che dice anche come ha deciso).

1. **Esatto.** Si normalizzano `a` e `b` nello stesso contesto e si guarda se la differenza è zero. Se è zero: equivalenti. Se non è zero e tutti gli atomi sono indipendenti (variabili, π, e, i): **non** equivalenti, con certezza.
2. **Numerico**, quando ci sono atomi con identità che la forma normale non conosce (`sin²x + cos²x`, proprietà dei logaritmi, `√(x²) = |x|`). Si valutano entrambe in punti casuali, ignorando quelli dove una delle due non è definita. Servono 12 punti validi concordi (tolleranza relativa 10⁻⁸); un solo punto discorde basta per dire «diverse». I punti si cercano prima vicino all'origine (dove gli errori di arrotondamento sono piccoli) e poi lontano (per i domini come `x > 100`). Con meno di 4 punti validi il risultato è `undecided` e vale come non equivalente. Se una delle due espressioni contiene `i`, i valori nei punti sono complessi (`evaluateComplex`) e si confrontano parte reale e parte immaginaria.

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
| `exponentialForm` | «scrivi in forma esponenziale» | `ρ·e^{iθ}` con `ρ > 0` e l'esponente della forma `iθ` |

`algebraicForm` accetta una parte reale con più termini quando non si possono sommare tra loro (`1 + √2 + i` sì, `1 + 2 + i` no).

**Irriducibilità.** `algebra/upoly.ts` contiene i polinomi in una variabile a coefficienti razionali: divisione con resto, MCD, radici razionali, ricerca dei fattori di secondo grado (metodo di Kronecker), scomposizione sui razionali. Il test è **completo fino al grado 5**; dal grado 6 un polinomio senza fattori di primo e secondo grado è considerato irriducibile (limite dichiarato: non si incontra negli esercizi previsti).

**Più variabili.** Invece di un MCD in più variabili, `algebra/specialize.ts` restringe i polinomi a una **retta casuale** (ogni variabile diventa `a·t + b`, con interi piccoli scelti da un `Rng` che dipende dal polinomio). Se il polinomio ristretto mantiene il grado ed è irriducibile, lo è anche l'originale; se due polinomi ristretti sono primi tra loro, lo sono anche gli originali. Il viceversa vale per quasi tutte le rette: si provano più rette. `x²−y²` risulta riducibile su ogni retta; `x²+y²` irriducibile già sulla prima.

La forma canonica degli intervalli non è un vincolo di `checkForm`: è un'opzione della risposta di tipo insieme (`canonicalForm`, sezioni 10 e 14).

## 9. Casualità ✅

`random/rng.ts`. `Rng.forExercise(codiceGeneratore, livello, seme)` crea il generatore di un esercizio: la chiave è la stringa `codice|livello|seme`, trasformata in stato iniziale con `cyrb128` e fatta avanzare con `sfc32` (solo operazioni intere a 32 bit: identico su ogni dispositivo).

Metodi: `int`, `intExcept` (diverso da zero o da valori dati), `real`, `bool`, `sign`, `pick`, `shuffle`, `sample`, `fork(etichetta)` (generatore indipendente per una parte dell'esercizio: aggiungere un'estrazione in una parte non cambia le altre).

**La sequenza è congelata** da un test: cambiare l'algoritmo cambierebbe tutti gli esercizi già visti, segnalati o in ripasso.

## 10. Insiemi di soluzioni ✅

`sets/types.ts`:

```ts
type Endpoint = Expr | "-inf" | "+inf";
interface Interval { lower: Endpoint; upper: Endpoint; lowerClosed: boolean; upperClosed: boolean }
interface RealSet { kind: "realset"; pieces: Interval[] }               // ∅ = nessun pezzo; punto isolato = [a; a]
interface PeriodicSet { kind: "periodic"; base: RealSet; period: Expr } // unione su k intero di (base + k·periodo)
type SolutionSet = RealSet | PeriodicSet;
```

Un solo tipo `RealSet` copre intervalli aperti, chiusi, illimitati, unioni, punti isolati, ∅ e ℝ. `PeriodicSet` copre sia `x = π/6 + 2kπ` (base = punti) sia le disequazioni goniometriche (base = intervalli).

- **Costruttori** (`sets/build.ts`): `closed`, `open`, `closedOpen`, `openClosed`, `lessThan`, `atMost`, `greaterThan`, `atLeast`, `points`, `realSet(...)`, `emptySet`, `allReals`, `periodic(base, periodo)`. Come per le espressioni, **non mettono in forma canonica**: l'insieme resta com'è scritto.
- **Ordine degli estremi** (`compareConstants`): esatto con `Surd` quando gli estremi sono fatti di razionali e radici quadrate; con il valore numerico negli altri casi (π, e), dove però l'uguaglianza la decide sempre `equivalent`.
- **Forma canonica** (`canonicalSet`): pezzi non vuoti, ordinati, disgiunti, fusi quando si toccano. Per i periodici la base si riporta in `[0; periodo)` (un pezzo a cavallo di un multiplo del periodo rientra da sinistra); una base che ricopre un periodo intero dà ℝ, una base vuota dà ∅.
- **Operazioni**: `setUnion`, `setIntersection`, `setComplement`, `setDifference`, `setContains`, `isEmptySet`, `isAllReals`, `isCanonicalSet`. Tra due insiemi periodici si passa al periodo comune (il minimo comune multiplo: serve che il rapporto tra i periodi sia razionale). L'intersezione tra soluzioni periodiche e un insieme limitato dà le soluzioni che cadono nell'insieme (`x ∈ [0; 2π]`). Quello che non si può scrivere come `SolutionSet` (periodico ∪ intervallo, periodi incommensurabili) lancia `EngineError`.
- **Confronto per struttura** (`setsEqual`): stesse forme canoniche, cioè stessi estremi per valore e stessi estremi inclusi. Per i periodici, stesse soluzioni anche con base o periodo scritti in un altro modo (`π/2 + kπ` contro `π/2 + 2kπ ∨ 3π/2 + 2kπ`, `−π/3 + 2kπ` contro `5π/3 + 2kπ`).
- **LaTeX** (`sets/latex.ts`): `setToLatex` scrive gli insiemi di reali come intervalli, **sempre con il punto e virgola** tra gli estremi (`[1{,}5; 3]`), parentesi tonde per gli estremi esclusi, `∪`, `∅`, `ℝ`, punti isolati tra graffe; le soluzioni periodiche come condizioni (`x = π/6 + 2kπ ∨ …, k ∈ ℤ`), lasciando la base dove l'ha scritta il generatore. `setToInequalityLatex` usa le disuguaglianze (`x < 2 ∨ x ≥ 5`, `∀x ∈ ℝ`, `∄x ∈ ℝ`).
- **Da disequazione a insieme**: la tabella dei segni (sezione 13) dà la soluzione con `solutionFromSigns`.

## 11. Vettori e matrici ✅

`linalg/matrix.ts`: `Matrix { kind: "matrix", rows: Expr[][] }`; un vettore è una matrice con una colonna. Elementi esatti (`Expr`), anche complessi o con parametri.

**Come si fanno i conti** (`linalg/grid.ts`): ogni elemento diventa la sua forma normale (`Ratio`, sezione 6) in un contesto comune, e si torna a espressioni pulite solo alla fine (`ratioToExpr`). Così numeri razionali, radicali, numeri complessi e parametri si trattano con lo stesso codice, sempre esatto. I quozienti con denominatore complesso si riportano subito alla forma `a + bi`. Con i parametri uno zero è tale solo se è *identicamente* zero: il rango e la riduzione sono quelli «generici», e i valori particolari dei parametri li discute il generatore.

- `linalg/operations.ts`: `matAdd`, `matSub`, `matScale`, `matMul`, `matPower`, `transpose`, `trace`, `identity`, `zeroMatrix`; `determinant` (sviluppo di Laplace **senza divisioni**, con i minori calcolati una volta per insieme di colonne: esatto anche con i parametri, fino all'ordine 8); `laplaceExpansion` e `minorMatrix` (i dati per mostrare lo sviluppo); `rank`; `inverse` (Gauss-Jordan su `[A | I]`, `null` se non esiste); `nullSpace` (base del nucleo, con componenti intere senza fattori comuni quando sono razionali); `solveLinearSystem(A, b)` → una soluzione, nessuna, oppure infinite (soluzione particolare più direzioni).
- `linalg/gauss.ts`: `gaussElimination(m, { reduced, columns })` restituisce la matrice a scala (o a scala ridotta), le colonne dei pivot, il rango, il numero di scambi e **i passaggi**: ogni operazione elementare è un dato (`swap`, `scale`, `combine`) con la matrice che si ottiene dopo. `rowOperationToLatex` la scrive (`R_2 → R_2 − 3R_1`). Il pivot è il primo elemento non nullo della colonna: le righe si scambiano solo quando serve. `columns` limita le colonne che possono avere un pivot (matrice completa `[A | b]`); `augment(A, B)` affianca due matrici.
- `linalg/eigen.ts`: `characteristicPolynomial` (`det(A − λI)`, sviluppato), `eigenvalues` (con la molteplicità algebrica), `eigenvectors(A, λ)` (base dell'autospazio), `eigenspaces`, `isEigenpair` (controlla `A·v = λ·v` e che `v` non sia nullo), `isDiagonalizable` (sui reali o sui complessi), `matrixFromEigen(P, autovalori)` = `P·D·P⁻¹` per costruire all'indietro. Gli autovalori si trovano scomponendo il polinomio caratteristico sui razionali (`upFactor`): sono razionali, oppure radici di un fattore di secondo grado (con radicale, o complesse coniugate). Un fattore irriducibile di grado maggiore lancia `EngineError`: quella matrice non è stata costruita all'indietro.

## 12. Analisi

- ✅ `calculus/limit.ts`: valore di un limite = numero finito (`Expr`), `+∞`, `−∞`, «non esiste»; lettura, confronto, LaTeX.
- ✅ `calculus/derive.ts`: `derive(expr, variabile)` è la derivata simbolica per ricorsione sull'albero (somma, costante per funzione, prodotto di n fattori, quoziente, potenza, esponenziale, `f^g`, radice, valore assoluto, tutte le funzioni della tabella, logaritmo in base qualsiasi, composizione con la regola della catena), seguita da `simplify`. Le lettere diverse dalla variabile sono costanti. `deriveWithSteps` restituisce anche le regole usate, dalla più esterna, ognuna con la parte derivata e la sua derivata (`derivativeRules` dà il nome italiano della regola). `isAntiderivative(F, f)` **verifica le primitive**: deriva `F` e la confronta con `f` (`equivalent`), quindi la costante di integrazione non conta.
- Taylor, studi di funzione, integrali: nessun algoritmo generale (specifica, «Cosa NON deve fare»). Il generatore sa il risultato; il motore offre derivata, valutazione e tabelle.

## 13. Passaggi e cose da mostrare ✅

**Passaggi** (`steps/`). Un passaggio è `Step { text, formula? }`: testo in italiano con le formule in riga tra `$...$`, più un'eventuale formula a centro pagina. `stepText(step)` lo trasforma nel testo unico usato nelle soluzioni degli esercizi. Le procedure standard restituiscono risultato e passaggi:

- `solveQuadratic(a, b, c)`: discriminante, soluzioni reali esatte in ordine crescente (anche con radicali), e con `complex: true` le due soluzioni complesse coniugate;
- `ruffini(p, r)`: le tre righe della tabella come dati, quoziente, resto, e la tabella in LaTeX (`ruffiniTableToLatex`);
- `dividePolynomials(a, b)`: divisione con resto, un termine del quoziente per giro;
- `factorPolynomial(p)`: scomposizione sui razionali con le tecniche che si usano a mano, nell'ordine: raccoglimento totale, differenza di quadrati, quadrato di binomio, trinomio speciale (somma e prodotto), formula risolutiva, somma o differenza di cubi, Ruffini su una radice razionale (con la tabella), prodotto di polinomi di grado più alto. Il risultato rispetta il vincolo `factored`; i fattori di primo grado sono scritti per radice crescente;
- la riduzione di Gauss e la derivata registrano i passaggi nei loro moduli (`gaussElimination`, `deriveWithSteps`); lo studio del segno in `display` (`signStudySteps`).

I polinomi delle procedure sono `UPoly` (coefficienti razionali, `algebra/upoly.ts`, dove ci sono anche `upGcd` e `upLcm`); `exprToUPoly` e `upolyToExpr` fanno la conversione.

**Tabelle** (`display/`), come dati più LaTeX (`array`):

- `sign-table.ts`: `signTable(fattori)` costruisce la tabella dei segni di un prodotto o di un quoziente: i punti in ordine, una riga per fattore, la riga del risultato; ogni riga ha 2n + 1 caselle (intervallo, punto, intervallo, …) con valori `+`, `-`, `0`, `undefined` (denominatore nullo o funzione non definita). Gli zeri di un fattore polinomiale li trova il motore (`realZeros`: razionali o di secondo grado); per gli altri fattori li indica il generatore (`zeros`). Il segno su un intervallo si legge in un punto di prova, ed è sicuro perché tutti gli zeri sono punti della tabella: uno zero non dichiarato lancia `EngineError`. `solutionFromSigns(tabella, verso)` dà l'insieme soluzione; `signStudySteps` i passaggi; `signTableToLatex` il disegno.
- `variation-table.ts`: `variationTable(f, { points })` dà segno della derivata e andamento su ogni intervallo, e per ogni punto valore della funzione, derivata e natura (massimo, minimo, flesso a tangente orizzontale, fuori dal dominio). `extrema` elenca massimi e minimi; `variationTableToLatex` disegna.
- `system.ts`: `systemToLatex` mette equazioni e disequazioni a sistema con la graffa.
- 🔜 `plot.ts` (fase 3-4, insieme all'interfaccia che lo mostra): grafico statico di una funzione come SVG (campionamento con `evaluate`, interruzione nei punti non definiti), riusabile da lezioni e soluzioni.

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

**Insiemi di soluzioni**: stessi passi, con `parseSolutionSet` e `setsEqual` al posto di `parseExpression` ed `equivalent`. Un decimale negli estremi dove la risposta giusta non ne ha è `FORMA.DECIMALE`; con `canonicalForm: true` un insieme giusto ma non scritto in forma canonica è `FORMA.NON_RICHIESTA`.

### Verifica automatica dei generatori ✅

`esercizi/verify.ts` (specifica, sezione 12): `verifyGenerator(definizione, opzioni)` prova 2.000 semi per ogni livello e restituisce un rapporto (`problems`, `failures` per controllo, `warnings`, tempi). `formatReport` lo scrive in italiano, con livello e seme di ogni problema. È uno strumento dei test: l'app non lo importa (per questo non sta in `esercizi/index.ts`).

| N. | Controllo | Come |
| --- | --- | --- |
| 1 | produce un esercizio senza errori e in pochi millisecondi | genera con `definition.generate`; eccezioni, regole di base dello schema (`draftProblems`), tempo per esercizio (limite 50 ms, misura ripetuta per scartare le pause del sistema) e tempo medio (limite 5 ms) |
| 2 | stesso seme, stesso esercizio | genera due volte e confronta le impronte (JSON dell'esercizio intero) |
| 3 | la risposta giusta è giusta | è ben definita (numero definito, espressione valutabile, insieme con forma canonica…) e supera `definition.verify` |
| 4 | vincoli di forma | `checkForms` sulla risposta giusta; `isCanonicalSet` se `canonicalForm` |
| 5 | sbagliate diverse dalla giusta e tra loro, **come valore** | `equivalent`, `setsEqual`, `limitsEqual`, `matricesEquivalent`; con l'approssimazione, distanza oltre la tolleranza; un confronto «non deciso» conta come problema |
| 6 | codici di errore | esistono nel catalogo e sono dichiarati in `errors` (anche quelli solo dichiarati devono esistere) |
| 7 | limiti di pulizia | ogni numero scritto nella risposta giusta e nelle sbagliate: numeratore entro `maxInteger`, denominatore entro `maxDenominator` |
| 8 | KaTeX | testo, passaggi, indizi (formule tra `$`, dollari bilanciati) e risposte, in modalità rigorosa |
| 9 | passaggi e indizi | almeno un passaggio non vuoto; due indizi non vuoti e diversi |

Gli **avvisi** non bocciano: `verify` mancante, codici dichiarati ma mai prodotti, pochissimi esercizi diversi per livello. Il generatore minimo di prova (`test/esercizi/fixtures/sample-generator.ts`) supera la verifica, e per ogni controllo una sua variante difettosa dimostra che il difetto viene scoperto.

## 15. Lezioni: formato ✅

`src/contenuti/formato/`. La sintassi (intestazione, blocchi `:::nome{attributi}`, sezioni `::nome`, rimandi `[[...]]`) è descritta in `REGOLE.md`, «Come scrivere una lezione»; qui c'è come è fatta la lettura.

- `parse.ts`: `parseLesson(testo)` restituisce `{ lesson, problems }`. Non lancia mai: ogni problema ha riga e messaggio in italiano. La lezione letta è un elenco di blocchi tipizzati (`LessonBlock`: testo, definizione, teorema, dimostrazione a passaggi, esempio, attenzione, domanda, visualizzazione, flashcard, glossario, riepilogo). Controlla **una lezione alla volta**: intestazione, attributi, codici ben formati e del modulo giusto, errori esistenti nel catalogo, termini definiti una volta sola, dimostrazione dopo il suo teorema, riepilogo in fondo, formule chiuse.
- `lessonReferences(lesson)`: tutto ciò a cui la lezione rimanda (termini, lezioni, definizioni, teoremi, errori, generatori, visualizzazioni).
- `verify.ts` ✅: `verifyContents(file, catalogo)` è la **verifica dei contenuti** tra file (specifica, sezione 12). Riceve i file delle lezioni (percorso e testo) e il catalogo di ciò che esiste fuori dalle lezioni (generatori con i loro livelli, visualizzazioni): così `contenuti` non importa da `esercizi`. Controlla: problemi di ogni lezione (`parseLesson`), posto del file, codici unici (lezioni, abilità, definizioni, teoremi, flashcard), prerequisiti esistenti e senza giri, rimandi che puntano a qualcosa che esiste (termini, lezioni, definizioni, teoremi, errori, generatori con il livello chiesto, visualizzazioni), termini del glossario definiti in una sola lezione. Un termine usato da una lezione che non ha tra i prerequisiti (anche indiretti) quella che lo definisce è un **avviso**. Restituisce anche il glossario ricavato dalle lezioni.
- `inline.ts`: `splitInline(testo)` separa testo, formule e rimandi.

**Markdown.** Il parser di Compasso si occupa solo della struttura propria (blocchi, sezioni, rimandi, formule). Il Markdown ordinario dentro i testi (paragrafi, grassetto, elenchi, tabelle) lo trasforma una libreria: **`marked`**, da installare quando l'app mostra la prima lezione (fase 3). L'ordine è fisso: prima `splitInline` toglie formule e rimandi, poi `marked` lavora sulle sole parti di testo. Così il LaTeX non viene mai toccato dal Markdown (in LaTeX `_` e `*` hanno un altro significato), e le formule si possono disegnare man mano che si scorre.

Dalle lezioni si ricavano senza riscrivere nulla: le **flashcard automatiche** (ogni blocco definizione o teorema: `nome` davanti, enunciato dietro), il **glossario** (blocchi definizione con `termine` e blocchi glossario), le **dimostrazioni interattive** (i passaggi con le versioni sbagliate).

## 15 bis. Generatori, dati e app (sessione 3) ✅

**Generatori** (`src/generatori/`). Ogni generatore è un modulo con `export default defineGenerator(...)`; `index.ts` li elenca (`generators`, `findGenerator`, `generatorLevels` per la verifica dei contenuti). Tutti hanno la stessa struttura: un **modello** con i pochi dati che definiscono l'esercizio, `buildModel(level, rng)` che è l'unico punto con la casualità, `draftOf(model)` che ricava risposta, errori, passaggi e indizi, e `verify` che ricostruisce il modello dal seme e controlla la risposta per un'altra strada. `comuni/wrong.ts` tiene le risposte sbagliate che hanno senso (diverse dalla giusta e tra loro); `comuni/exact.ts` valuta un'espressione razionale in un punto con conti esatti. Come si replica un generatore: `REGOLE.md`.

**Dati** (`src/dati/`). `AttemptRecord` è una riga del registro (specifica, sezione 7); `LessonProgress` dice fino a quale tratto è arrivata una lezione. `DataStore` è l'interfaccia; `openStore()` prova IndexedDB (base `compasso`, magazzini `attempts` e `lessons`, versione della base = `DATA_VERSION`), poi localStorage (un solo valore JSON `{ version, attempts, lessons }`), poi la sola memoria. Dati di una versione più nuova di quella che l'app conosce non si aprono (`DataVersionError`): mai scrivere sopra dati che non si capiscono. `skillSummaries` ricava i conteggi per abilità dal registro; la formula della padronanza (fase 8) partirà da lì. In Chromium IndexedDB funziona anche nel file aperto con doppio clic.

**App** (`src/app/`). Preact con segnali. Una sola schermata di esercizio (`ExerciseView`) per tutti i contesti: sceglie il modo di rispondere dal tipo di risposta (campo con anteprima, caselle per matrici e vettori, scelta multipla quando è chiesta e l'esercizio ha tre risposte sbagliate previste, vero o falso), valuta con `evaluateResponse`, mostra l'errore riconosciuto con la spiegazione del catalogo e registra il tentativo. L'anteprima usa gli stessi parser della valutazione. La lezione (`LessonView`) si mostra a tratti che finiscono con una domanda lampo (`lessonChunks`): le formule di un tratto si disegnano solo quando il tratto si apre. Il testo ricco passa da `renderRichText`: formule e rimandi vengono tolti prima di dare il testo a marked e rimessi dopo.

## 16. Come si estende

| Cosa si aggiunge | Dove | Cosa tocca |
| --- | --- | --- |
| Una funzione elementare (es. `sinh`) | `expr/functions.ts` + `FunctionName` | parser, LaTeX e valutazione reale la leggono dalla tabella; il compilatore chiede la sua riga in `derive` (`outerDerivative`) e in `evaluateComplex` |
| Un tipo di nodo (es. `sum`) | `expr/types.ts` | il compilatore elenca i `switch` da completare |
| Un vincolo di forma | `form/constraints.ts` + tipo `FormConstraint` | un caso nel `switch` di `checkForm` |
| Un tipo di risposta | `esercizi/schema.ts` (`AnswerSpec`, `Response`) | un caso in `evaluateResponse`, `choiceOptions`, `errorCodesOf` e nei `switch` di `verify.ts` |
| Una procedura con i passaggi | un file in `steps/` | restituisce il risultato e una lista di `Step`; un test controlla che ogni passaggio si disegni |
| Un blocco delle lezioni | `contenuti/formato/lesson.ts` (`LessonBlock`, `blockNames`) | un caso in `buildBlock` e `blockTexts`; una riga in `REGOLE.md` (un test controlla che ci sia) |
| Un oggetto matematico nuovo | una cartella nuova in `motore/` | tipi, confronto, LaTeX, test; nessuna modifica al nucleo |

**Analisi 2.** Le espressioni sono già in più variabili. La derivata parziale è `derive(f, "y")` (già funziona: le altre lettere sono costanti); il gradiente è un vettore (`Matrix`) di derivate; l'hessiana una matrice; gli insiemi del piano e gli integrali multipli sono oggetti nuovi in cartelle nuove. Nulla del nucleo cambia.

**Fisica.** Una grandezza è un valore esatto più un'unità: `Quantity { value: Expr, unit: Unit }`, con `Unit` = vettore di sette esponenti razionali (dimensioni SI) più un fattore di scala esatto. Va in `motore/units/`: prodotto e quoziente sommano e sottraggono gli esponenti, la somma richiede dimensioni uguali, il confronto converte all'unità di base e usa `equivalent`. Si aggiunge un tipo di risposta `quantity` (valore con tolleranza + unità) e il parser delle unità riusa `parseExpression` per la parte numerica. I codici (`V4…`), lo schema dei generatori e il catalogo degli errori (categoria nuova) non cambiano forma.

## 17. Test

Ogni modulo ha il suo file in `test/motore/`, `test/esercizi/`, `test/contenuti/`. Oltre ai casi singoli ci sono controlli «a tappeto», con dati generati da un `Rng` a chiave fissa:

- il parser (espressioni e insiemi) non lancia mai eccezioni su migliaia di testi casuali; ogni LaTeX prodotto si disegna con KaTeX in modalità rigorosa; la sequenza dell'`Rng` è congelata; il confronto resta sotto una soglia di tempo;
- `simplify` dà un risultato equivalente e stabile su espressioni casuali; `expand` rispetta il vincolo `expanded`;
- la derivata coincide con il rapporto incrementale (differenza centrale di ordine 4) in punti casuali;
- matrici: `det(AB) = det A · det B`, `A·A⁻¹ = I`; ogni passaggio di Gauss registrato è l'operazione applicata alla matrice precedente; le soluzioni dei sistemi risolvono il sistema; le matrici costruite da autovalori e autovettori scelti li restituiscono;
- complessi: le tre forme vanno e tornano; le radici n-esime, elevate a n, ridanno il numero; `evaluateComplex` coincide con `evaluate` dove l'espressione è reale;
- insiemi: unione, intersezione, complementare e differenza rispettano l'appartenenza punto per punto;
- passaggi: Ruffini e divisione tornano indietro (`A = B·Q + R`); i polinomi costruiti all'indietro tornano scomposti e nella forma `factored`; le soluzioni della formula risolutiva annullano il trinomio;
- tabelle: la soluzione letta dalla tabella dei segni coincide con il segno calcolato punto per punto; massimi e minimi della tabella di variazione sono davvero tali;
- la verifica automatica supera il generatore di prova e scopre ognuno dei nove difetti.

Gli aiuti comuni sono in `test/motore/helpers.ts`.

## 18. Limiti noti

- Irriducibilità completa solo fino al grado 5; fattori con coefficienti irrazionali non controllati oltre il primo grado.
- La forma normale non conosce le identità goniometriche, esponenziali e logaritmiche: le copre il confronto numerico (che non è una dimostrazione, ma con 12 punti casuali concordi un falso positivo non è realistico).
- `simplify` non sviluppa, non scompone e non applica identità goniometriche o proprietà dei logaritmi; non riunisce esponenziali con la stessa base ed esponenti diversi (`e^{2x}/e^{x}` resta così); non porta fuori da una radice i fattori letterali (`√(4x)` resta così).
- Angoli notevoli: solo i multipli di π/12. Le radici n-esime con argomento non notevole (radici quinte dell'unità) hanno modulo e argomento, non la forma algebrica.
- Autovalori: solo matrici di numeri razionali il cui polinomio caratteristico si scompone in fattori di primo e secondo grado.
- Con i parametri, rango e riduzione di Gauss sono quelli «generici»: i valori particolari dei parametri li discute il generatore.
- Insiemi: l'unione tra soluzioni periodiche e un intervallo, e le operazioni tra periodi con rapporto irrazionale, non sono rappresentabili (lanciano `EngineError`). Gli estremi non fatti di razionali e radici quadrate (π, e, logaritmi) si ordinano con il valore numerico.
- `realZeros` trova gli zeri dei polinomi che si scompongono in fattori di primo e secondo grado; negli altri casi li indica il generatore.
- Il decimale approssimato (`FORMA.DECIMALE`) si riconosce solo per risposte costanti, non per espressioni con coefficienti decimali approssimati (`0,33x`), e negli insiemi solo quando l'estremo decimale è esatto (`0,5` per `1/2`).
- Fattoriale, gradi (`30°`), numeri periodici e notazione scientifica con `E` non sono letti dal parser: quando un modulo li richiede si aggiungono al parser, non ai generatori.
- Non ancora fatti, perché nessuno li usa ancora: i nodi per successioni e somme (sezione 4) e i grafici statici (sezione 13).
