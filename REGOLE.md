# REGOLE

Ogni modello che lavora su Compasso legge questo file per primo. Lo scheletro è della sessione 0 (specifica, sezione 12); la sessione 1 aggiunge la parte tecnica; ogni sessione successiva lo aggiorna se impara qualcosa di utile.

La specifica completa è in `docs/SPECIFICA.md`: è la fonte di verità su cosa costruire. Lo stato del lavoro è in `STATO.md`. Com'è fatto il motore matematico (strutture dati, moduli, come si estende) è in `docs/ARCHITETTURA.md`.

## Prima di toccare qualsiasi cosa

1. Leggere questo file.
2. Leggere `STATO.md` (cosa è fatto, cosa manca, problemi noti).
3. Leggere le sezioni di `docs/SPECIFICA.md` che riguardano il lavoro. La sezione 0 dice cosa fare per le decisioni che la specifica non prende.
4. Fare **solo** il compito della sessione indicata nel messaggio. Il resto è di altre sessioni.
5. Non chiedere decisioni che la specifica già prende. Per le altre, seguire la sezione 0 e annotarle in `STATO.md`, nella parte «Decisioni da rivedere».

## Lingua

- Nel codice: nomi (variabili, funzioni, tipi, file) in **inglese**.
- Commenti, contenuti, interfaccia e messaggi di commit: in **italiano**.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm ci` | installa le dipendenze esattamente come da `package-lock.json` |
| `npm run typecheck` | controlla i tipi (app e service worker) |
| `npm run build` | produce `dist/telefono/` (PWA a più file) e `dist/pc/compasso.html` (file unico) |
| `npm test` | esegue tutti i test (Vitest); il test di build ricostruisce e apre le due versioni in jsdom |
| `npm run icone` | rigenera le icone PNG in `public/icons/` |
| `python3 scripts/verifica-esempi-errori.py` | verifica con sympy la matematica degli esempi del catalogo errori (serve `pip install sympy`; non fa parte del controllo su GitHub) |

## Convenzioni del codice

**Dove sta cosa**

| Cartella | Contenuto | Può importare da |
| --- | --- | --- |
| `src/codici.ts` | forme dei codici fissi e funzioni di controllo (`isLessonCode`…) | niente |
| `src/errori/` | catalogo unico degli errori | niente |
| `src/motore/` | matematica pura: numeri, espressioni, parser, equivalenza, forma, insiemi, matrici | solo se stesso |
| `src/esercizi/` | schema dei generatori, creazione dell'esercizio, valutazione delle risposte | `motore`, `errori`, `codici` |
| `src/generatori/` | un file per generatore, `index.ts` con l'elenco, `comuni/` con gli strumenti condivisi | `esercizi`, `motore`, `errori`, `codici` |
| `src/contenuti/` | lezioni in Markdown (`v1/m06/l04.md`), `index.ts` con l'elenco; in `formato/` il codice che le legge e le controlla | `codici`, `errori` |
| `src/dati/` | progressi, ripasso, registro, backup | `codici`, `errori`, `esercizi` (solo tipi) |
| `src/app/` | interfaccia | tutto |

Il motore non importa mai da `app`, `dati`, `contenuti`, `esercizi`, `errori`.

**Stile**

- TypeScript rigoroso (`strict`, `noUncheckedIndexedAccess`): niente `any`, niente `// @ts-ignore`. `as` solo dove un commento spiega perché è sicuro.
- **Dati semplici e immutabili**: oggetti con un campo `kind`, proprietà `readonly`, nessuna modifica dopo la creazione. Le operazioni sono funzioni.
- **`switch` completi senza `default`** sulle unioni (`Expr`, `AnswerSpec`, `LessonBlock`…): quando si aggiunge un caso, il compilatore indica ogni punto da aggiornare.
- **Niente `Math.random`, niente `Date`** nel motore, negli esercizi e nei generatori: l'unica casualità è l'`Rng` ricevuto.
- **Mai numeri in virgola mobile per un risultato**: `Rational`, `Surd`, `Expr`. I `number` vanno bene per contare, per i livelli e per `evaluate` (confronti e grafici).
- Il motore segnala un uso sbagliato lanciando `EngineError` con un messaggio in italiano. Le funzioni che ricevono testo scritto da Andrea (`parseExpression`, `evaluateResponse`, `parseLesson`) **non lanciano mai**: restituiscono un risultato che descrive il problema.
- I messaggi che Andrea può leggere sono frasi complete in italiano, con le formule tra `$...$`.
- Un file fa una cosa; in cima un commento di due o tre righe dice quale. Ogni funzione esportata ha un commento `/** ... */` in italiano.
- File in `kebab-case` o una parola (`rational.ts`, `sign-table.ts`); tipi in `PascalCase`; funzioni e variabili in `camelCase`; codici di Compasso sempre come stringhe letterali.
- Ogni cartella con più file ha un `index.ts` che dice cosa è pubblico. Da fuori si importa dall'`index` (`from "../motore/expr"`).

**Test**

- Un file di test per modulo: `test/motore/<modulo>.test.ts`, `test/esercizi/…`, `test/contenuti/…`, `test/generatori/…`.
- Nomi dei test in italiano, che dicono il comportamento («la divisione torna indietro: a = q·b + r»).
- Oltre ai casi singoli, dove ha senso un controllo a tappeto con dati generati da un `Rng` con chiave fissa.
- Ogni LaTeX prodotto dal codice si prova con KaTeX in modalità rigorosa (`throwOnError: true, strict: true`).
- Un difetto trovato diventa prima un test che fallisce, poi la correzione.
- Gli aiuti comuni dei test del motore sono in `test/motore/helpers.ts` (`parse`, `draws`, `drawsText`, `randomExpr`).
- Prima di salvare: `npm run typecheck && npm run build && npm test`, e si guarda che **ogni** comando sia finito bene (in una catena con `| tail` l'errore del primo comando si perde).

**Matematica nel testo**

- Formule tra `$...$` (in riga) e `$$...$$` (a centro pagina). Un dollaro vero si scrive `\$`.
- Nei file TypeScript il LaTeX si scrive con `String.raw` (o `tex` nel catalogo errori) per non raddoppiare le barre.
- Il LaTeX di un oggetto del motore **non si scrive a mano**: si ottiene con `toLatex(expr)`, `matrixToLatex`, `limitToLatex`, `setToLatex`, `signTableToLatex`, `variationTableToLatex`, `systemToLatex`. Così le convenzioni italiane (virgola decimale `1{,}5`, punto e virgola negli intervalli, punto di moltiplicazione solo dove serve) sono sempre le stesse.

## Il motore in breve

Dettagli e motivazioni in `docs/ARCHITETTURA.md`. Quello che serve a chi scrive generatori:

```ts
import { add, sub, mul, div, pow, sqrt, root, abs, neg, num, frac, decimal, sym, pi, e, sin, cos, ln, log,
         toLatex, evaluate, substitute, variables } from "../../../motore/expr";
import { Rational } from "../../../motore/numbers/rational";
import { equivalent } from "../../../motore/equivalence/equivalence";
import { checkForm } from "../../../motore/form";
import { parseExpression } from "../../../motore/parser";

const x = sym("x");
const p = add(mul(2, pow(x, 2)), mul(-3, x), 1);   // 2x² − 3x + 1
toLatex(p);                                         // "2x^{2} - 3x + 1"
equivalent(p, mul(sub(mul(2, x), 1), sub(x, 1)));   // true
checkForm(p, "factored");                           // { ok: false, reason: "…" }
```

- I costruttori **non semplificano**: `mul(1, x)` si mostra `1x`, `add(x, 0)` si mostra `x + 0`. Un generatore costruisce l'espressione già nella forma in cui vuole mostrarla, oppure la ripulisce con `simplify` (coefficienti, segni, frazioni, radicali, termini simili: non sviluppa e non scompone).
- `frac(6, 8)` è il numero 3/4 (ridotto); `div(6, 8)` è la frazione scritta 6/8. `decimal("1,50")` è 3/2 mostrato come 1,50.
- `a − b` si costruisce con `sub(a, b)`; l'opposto con `neg(a)`.
- `equivalent(a, b)`: uguali ovunque sono entrambe definite. `checkForm(expr, vincolo)`: guarda solo com'è scritta.
- Vincoli di forma disponibili: `expanded`, `factored`, `reducedFraction`, `rationalized`, `simplifiedRadicals`, `algebraicForm`, `trigonometricForm`, `exponentialForm`. Cosa controlla ciascuno: `docs/ARCHITETTURA.md`, sezione 8. Sono severi (`√(1/2)` non è razionalizzata, `2√2/2` non è ridotta, `√2·√3` non è un radicale semplificato): se la risposta giusta del generatore non li rispetta, la verifica lo dice.
- Non creare mai `sym("π")`, `sym("ℯ")`, `sym("ⅈ")`: le costanti sono `pi`, `e`, `I`.
- Punti fragili del motore e cose da sapere prima di scrivere un generatore: `docs/REVISIONE.md` (sessione 4a).

Il resto del motore, per cartella (ogni cartella ha un `index.ts` da cui importare, salvo `algebra` e `calculus` che si importano per file):

| Serve | Da dove | Cosa usare |
| --- | --- | --- |
| Pulire, sviluppare | `motore/algebra/simplify`, `motore/algebra/expand` | `simplify(e)`, `expand(e)`, `upolyToExpr`, `exprToUPoly`, `surdToExpr` |
| Derivare, verificare una primitiva | `motore/calculus/derive` | `derive(e, "x")`, `deriveWithSteps`, `isAntiderivative(F, f)` |
| Insiemi di soluzioni | `motore/sets` | `closed(1, 3)`, `lessThan(2)`, `points(1, 2)`, `realSet(...)`, `periodic(base, periodo)`, `setUnion`, `setIntersection`, `setComplement`, `setsEqual`, `setToLatex`, `setToInequalityLatex` |
| Matrici | `motore/linalg` | `matrix([[1, 2], [3, 4]])`, `matAdd`, `matMul`, `transpose`, `determinant`, `inverse`, `rank`, `gaussElimination` (con i passaggi), `solveLinearSystem`, `eigenvalues`, `eigenvectors`, `matrixFromEigen` |
| Numeri complessi | `motore/complex` | `Complex.of(1, 2)`, `fromPolar`, `polarForm`, `complexExpr`, `trigonometricForm`, `exponentialForm`, `complexRoots`, `exactComplex` |
| Passaggi delle procedure | `motore/steps` | `solveQuadratic`, `ruffini`, `dividePolynomials`, `factorPolynomial`; ogni passaggio diventa testo con `stepText` |
| Tabelle e sistemi | `motore/display` | `signTable`, `solutionFromSigns`, `signStudySteps`, `signTableToLatex`, `variationTable`, `variationTableToLatex`, `systemToLatex` |

```ts
import { simplify } from "../../../motore/algebra/simplify";
import { derive } from "../../../motore/calculus/derive";
import { signTable, solutionFromSigns } from "../../../motore/display";
import { setToLatex } from "../../../motore/sets";
import { factorPolynomial, stepText } from "../../../motore/steps";

toLatex(simplify(add(mul(1, x), 0)));                       // "x"
toLatex(derive(mul(x, sin(x))));                            // "\\sin x + x \\cos x"
const table = signTable([{ expr: sub(x, 1) }, { expr: add(x, 2), role: "denominator" }]);
setToLatex(solutionFromSigns(table, ">="));                 // (−∞; −2) ∪ [1; +∞)
const scomposto = factorPolynomial(sub(pow(x, 2), 9));
toLatex(scomposto.result);                                  // "\\left(x + 3\\right)\\left(x - 3\\right)"
const steps = scomposto.steps.map((step) => ({ text: stepText(step) }));   // passaggi pronti per la soluzione
```

- Le **matrici** e i **numeri complessi** costruiti all'indietro (autovalori scelti, modulo e argomento scelti) restano esatti: non si usa mai la virgola mobile.
- Gli **insiemi** restano come sono scritti (`realSet(closed(3, 4), closed(1, 2))` non viene riordinato): `setsEqual` confronta le forme canoniche, `setToLatex` mostra la forma canonica.
- Le **soluzioni periodiche** sono `periodic(base, periodo)`: `x = π/6 + 2kπ` è `periodic(points(div(pi, 6)), mul(2, pi))`.

**Se al motore manca qualcosa** (una funzione, un vincolo, un tipo di risposta): non lo si aggira dentro un generatore e non si modifica il motore mentre si lavora sul generatore. Si annota in `STATO.md` («Problemi noti») e si passa a un altro generatore.

## Come aggiungere un generatore

Lo schema è fisso (`src/esercizi/schema.ts`) e la verifica automatica esiste (`src/esercizi/verify.ts`). **Un generatore nuovo non si scrive da zero: si copia quello di riferimento più vicino** e lo si adatta, seguendo «Come replicare un generatore» qui sotto.

**Dove**: `src/generatori/<volume>/<modulo>/<abilità>-<variante>.ts`, in minuscolo: il generatore `V1.M06.A04.g1` sta in `src/generatori/v1/m06/a04-g1.ts`. Il suo test in `test/generatori/v1/m06/a04-g1.test.ts`.

**Forma**

```ts
import { defineGenerator, exact } from "../../../esercizi";

export default defineGenerator({
  code: "V1.M06.A04.g1",            // mai rinominare
  skill: "V1.M06.A04",              // il codice senza «.g1»
  lesson: "V1.M06.L04",             // lezione di riferimento
  title: "Disequazioni fratte",
  levels: [1, 2, 3],
  errors: ["DISEQ.SEGNO_DENOMINATORE", "COND.DENOMINATORE"],   // tutti e soli quelli che può produrre
  limits: { maxInteger: 60, maxDenominator: 12 },               // «pulizia» dei numeri nelle risposte
  generate({ level, rng }) {
    // 1. scegli la SOLUZIONE (numeri puliti), 2. costruisci l'esercizio intorno,
    // 3. calcola le risposte sbagliate facendo davvero l'errore tipico.
    return { prompt, answer, steps, hints };
  },
  verify(exercise) {
    // Controllo indipendente da come è stata costruita la risposta: sostituire, derivare, moltiplicare.
    return true;
  },
});
```

**Regole**

1. **All'indietro**: prima la soluzione, poi l'esercizio. Mai generare numeri a caso e poi risolvere.
2. **Deterministico**: solo `rng`. Stesso seme e stesso livello → stesso esercizio, per sempre. Cambiare l'ordine delle estrazioni di un generatore già pubblicato cambia gli esercizi salvati: se serve una parte nuova, usare `rng.fork("nome")`.
3. **Livelli** (uguali per tutti): 1 = applicazione diretta, numeri semplici, uno o due passaggi; 2 = livello tipico di verifica e di TOL; 3 = casi particolari, parametri, più tecniche insieme.
4. **Tipo di risposta** (`answer.kind`): `choice`, `number`, `expression`, `set`, `limit`, `matrix`, `truefalse`, `ordering`. Si sceglie quello naturale per l'esercizio: se ha almeno tre risposte sbagliate previste, l'app può comunque mostrarlo come scelta multipla. Una risposta `set` dichiara la `variable` e si confronta per struttura; con `canonicalForm: true` deve anche essere scritta in forma canonica (solo se il testo lo chiede).
5. **Modalità** (solo `number`): `mode: exact` oppure `mode: approx(0.005)`. Il testo deve dirlo («arrotonda a due decimali»).
6. **Vincoli di forma**: `form: ["factored"]` solo se il testo chiede quella forma («scomponi»). La risposta giusta deve rispettarli.
7. **Risposte sbagliate previste** (`answer.wrong`): ognuna è il risultato di **un** errore tipico preciso, fatto davvero sui numeri dell'esercizio, con il suo codice. Non devono essere equivalenti alla giusta né tra loro. Almeno tre quando l'esercizio può finire in una simulazione. Se per certi numeri un errore dà per caso il risultato giusto, quella risposta si scarta (o si cambiano i numeri).
8. **Codici di errore**: devono esistere in `src/errori/` (il compilatore lo controlla) ed essere dichiarati in `errors`. Prima di aggiungerne uno nuovo: sezione «Catalogo degli errori».
9. **Passaggi** (`steps`): la soluzione completa, un'idea per passaggio, con le formule ottenute da `toLatex`. **Indizi** (`hints`): esattamente due; il primo orienta («che tipo di disequazione è?»), il secondo dice come cominciare. Nessuno dei due dà la risposta.
10. **Testo** (`prompt`): in italiano, dando del tu, con la richiesta chiara e la forma voluta.

**Verifica automatica** (specifica, sezione 12). Ogni generatore ha un test che la chiama e pretende zero problemi:

```ts
import { expect, it } from "vitest";
import { formatReport, verifyGenerator } from "../../../../src/esercizi/verify";
import generator from "../../../../src/generatori/v1/m06/a04-g1";

it("V1.M06.A04.g1 supera la verifica automatica", () => {
  const report = verifyGenerator(generator);            // 2.000 semi per ogni livello
  expect(report.problems, formatReport(report)).toEqual([]);
  expect(report.warnings).toEqual([]);
});
```

`verifyGenerator` fa i nove controlli della specifica su ogni esercizio; se qualcosa non va, il rapporto dice **quale controllo, quale livello e quale seme** (per rivedere l'esercizio: `generateExercise(generator, livello, seme)`):

1. il generatore non si interrompe, rispetta lo schema, impiega pochi millisecondi;
2. stesso seme, stesso esercizio;
3. la risposta giusta è ben definita e supera `verify` (la verifica indipendente del generatore);
4. la risposta giusta rispetta i vincoli di forma dichiarati (`form`, `canonicalForm`);
5. nessuna risposta sbagliata prevista vale quanto la giusta, e le sbagliate hanno valori diversi tra loro;
6. i codici di errore esistono nel catalogo e sono dichiarati in `errors`;
7. i numeri delle risposte (giusta e sbagliate) stanno entro `limits`;
8. testo, risposte, passaggi e indizi si disegnano con KaTeX;
9. ci sono i passaggi e due indizi diversi.

Gli **avvisi** (`report.warnings`) non bocciano da soli, ma un generatore finito non ne ha: `verify` mancante, codici dichiarati in `errors` ma mai prodotti, pochissimi esercizi diversi. Se il rapporto segnala un problema si corregge **il generatore**: non si allargano i limiti e non si tolgono risposte sbagliate solo per far passare il controllo.

**Come scrivere `verify`**: una strada diversa da quella usata per costruire la risposta. Sostituire la soluzione nell'equazione, provare la disequazione in punti dentro e fuori dall'insieme, derivare la primitiva (`isAntiderivative`), moltiplicare i fattori (`equivalent(expand(risposta), polinomio)`), controllare `A·x = b` (`matMul`) o `A·v = λ·v` (`isEigenpair`). I conti si fanno esatti (`Rational`, `equivalent`), non in virgola mobile: sul bordo di un intervallo un numero approssimato sbaglia.

**Lista di controllo prima di salvare**

- [ ] `npm run typecheck` passa (schema rispettato, codici di errore esistenti);
- [ ] il test del generatore chiama `verifyGenerator` e non trova problemi né avvisi;
- [ ] il generatore ha la sua `verify`, indipendente dalla costruzione;
- [ ] il testo dice che forma è richiesta e, se serve un'approssimazione, con quale arrotondamento;
- [ ] il generatore è in `src/generatori/index.ts` e il suo test sta nel percorso corrispondente (lo controlla `test/generatori/elenco.test.ts`);
- [ ] il test controlla anche il numero di risposte sbagliate e il riconoscimento degli errori scritti a mano;
- [ ] una ventina di esercizi per livello sono stati letti a occhio;
- [ ] il generatore non ha toccato `src/motore/` né `src/esercizi/`.

## Come replicare un generatore

I generatori di riferimento sono cinque, scritti nella sessione 3. Coprono i tipi di risposta più usati: ogni generatore nuovo parte da uno di loro.

| Se la risposta è… | Copia | Che cosa mostra |
| --- | --- | --- |
| un insieme di soluzioni (disequazioni, domini, equazioni con più soluzioni) | `src/generatori/v1/m06/a04-g1.ts` — disequazioni fratte | zeri scelti prima, tabella dei segni nei passaggi, errori fatti con `solutionFromSigns`, verifica per punti con conti esatti |
| un'espressione in una forma precisa («scomponi», «sviluppa», «semplifica») | `src/generatori/v1/m04/a07-g1.ts` — scomposizione | fattori scelti prima e moltiplicati, vincolo `form`, passaggi scritti dal motore, errori scritti fattore per fattore |
| un'espressione in qualunque forma equivalente (derivate, primitive, semplificazioni) | `src/generatori/v2/m06/a03-g1.ts` — derivate | modello a pezzi (`Part`), regola applicata per esteso, errori = la regola applicata male, doppia verifica (simbolica e numerica) |
| un numero esatto (determinanti, valori, limiti finiti, probabilità) | `src/generatori/v3/m03/a01-g1.ts` — determinante | estrazione ripetuta finché i numeri sono puliti e gli errori danno risultati tutti diversi, verifica con un altro algoritmo |
| una matrice o un vettore (sistemi, prodotti, inverse) | `src/generatori/v3/m02/a01-g1.ts` — sistemi con Gauss | costruzione `L·U` perché i conti restino interi, passaggi registrati dal motore, verifica `A·x = b` |

Per vero o falso, scelta multipla scritta a mano, limiti e riordini non c'è ancora un riferimento: il primo generatore di quel tipo segue lo stesso schema in cinque parti e diventa lui il riferimento (va aggiunto a questa tabella).

**La struttura, uguale in tutti e cinque.** Un file ha sempre queste parti, in quest'ordine:

1. **Commento in cima**: che cosa allena, come è costruito all'indietro, che cosa cambia tra i tre livelli.
2. **Il modello** (`interface Model`): i pochi dati che definiscono un esercizio (gli zeri, i fattori, i pezzi della funzione, la matrice). Tutto il resto si ricava da lì.
3. **`buildModel(level, rng)`**: sceglie la soluzione e costruisce il modello. È l'**unico** punto che usa `rng`. Ogni livello ha la sua funzione (`buildLevel1`, …); dentro un livello, `rng.pick([...] as const)` sceglie la «forma» dell'esercizio e uno `switch` la costruisce.
4. **`draftOf(model)`**: dal modello ricava risposta giusta, risposte sbagliate, passaggi, indizi, testo. Non usa `rng`.
5. **`verify(exercise)`**: ricostruisce il modello con `buildModel(exercise.level, Rng.forExercise(exercise.generator, exercise.level, exercise.seed))` e controlla la risposta per una strada diversa da quella di `draftOf`.

**Procedura**

1. Scegli il riferimento dalla tabella e copialo nel posto del nuovo codice (`src/generatori/<volume>/<modulo>/<abilità>-g1.ts`); copia anche il suo test in `test/generatori/…` con lo stesso percorso.
2. Cambia `code`, `skill`, `lesson`, `title`. I codici di lezione e di abilità si prendono dalla scaletta (o da `STATO.md`): non si inventano.
3. Riscrivi il **modello** e `buildModel` per il nuovo argomento. Decidi prima a parole i tre livelli e scrivili nel commento in cima.
4. Elenca gli **errori tipici** dell'argomento, guardando il catalogo (`src/errori/catalog.ts`). Per ognuno scrivi nel commento come si manifesta («moltiplica per il denominatore: resta numeratore ⋛ 0») e poi il codice che **rifà il conto con quell'errore**. Se l'errore giusto nel catalogo non c'è, lo aggiungi (sezione «Catalogo degli errori»): non si usa un codice che parla d'altro, perché la spiegazione che Andrea leggerebbe sarebbe sbagliata.
5. Passa i candidati a `distinctWrongSets`, `distinctWrongExpressions` o `distinctWrongMatrices` (`src/generatori/comuni/wrong.ts`): tengono solo le risposte diverse dalla giusta e tra loro. Un candidato che per certi numeri non ha senso vale `null`. L'ordine conta: i primi quattro diventano le opzioni della scelta multipla, quindi gli errori più importanti vanno per primi.
6. Scrivi passaggi e indizi. Dove il motore sa già scrivere i passaggi (`factorPolynomial`, `gaussElimination`, `signStudySteps`, `solveQuadratic`, `ruffini`), si usano i suoi.
7. Scrivi `verify` (vedi sotto «Come scrivere `verify`»).
8. Aggiungi il generatore a `src/generatori/index.ts` (una riga di `import` e il nome nell'elenco).
9. Esegui il test. Poi **leggi una ventina di esercizi** per livello, con risposte sbagliate e passaggi: la verifica automatica non vede un testo goffo, un esercizio banale o un errore poco credibile. Basta un test provvisorio che stampa `generateExercise(generator, livello, seme)` per i semi da 0 a 20.

**Che cosa deve contenere il test del generatore** (oltre a `verifyGenerator`): quante risposte sbagliate ha ogni esercizio (almeno tre dal livello 2, perché l'esercizio possa diventare una scelta multipla); che la risposta giusta **scritta come la scriverebbe Andrea** sia accettata da `evaluateResponse` e ogni risposta sbagliata sia riconosciuta con il suo codice; per i generatori con vincolo di forma, che la risposta equivalente ma nella forma sbagliata dia `FORMA.NON_RICHIESTA`.

**Abitudini che evitano i difetti più comuni**

- **Numeri sotto controllo alla fonte.** Se una risposta (anche sbagliata) esce dai `limits`, non si allargano i limiti: si restringono i numeri estratti, oppure si estrae di nuovo finché l'esercizio va bene (come fa `draw` nel determinante), sempre con lo stesso `rng`.
- **Errori che coincidono.** Capita che per certi numeri due errori diano la stessa risposta, o la risposta giusta. Se capita di rado, basta `distinctWrong…`, che scarta il doppione. Se capita spesso, si cambia la costruzione in modo che non capiti (nelle disequazioni fratte la posizione del fattore comune dipende dal verso; nei sistemi si accettano solo i numeri per cui i tre errori danno tre vettori diversi).
- **Una forma, tanti errori possibili.** Una forma di esercizio che lascia meno di due errori credibili (per esempio una frazione con il denominatore sempre positivo) si limita ai casi in cui gli errori ci sono, oppure si toglie.
- **Scrittura a mano.** Le espressioni mostrate si scrivono come su un quaderno: `−x` e non `−1x`, il meno davanti alla frazione, niente parentesi doppie. Il generatore decide la forma che mostra; `simplify` da solo non basta sempre.
- **Semi congelati.** Un test controlla il testo di due o tre semi fissi: se cambia, vuol dire che è cambiato l'ordine delle estrazioni, e gli esercizi già salvati nel registro di Andrea non sono più gli stessi.
- **Strumenti comuni.** `src/generatori/comuni/` contiene quello che serve a più generatori (`rationalAt` per il valore esatto in un punto, `distinctWrong…`). Una funzione che serve a un secondo generatore si sposta lì; una funzione di matematica vera va nel motore, in una sessione dedicata, non dentro un generatore.

## Come scrivere una lezione

La sintassi è fissa; la legge e la controlla `src/contenuti/formato/` (`parseLesson`), che dice riga e motivo di ogni problema. **La lezione di riferimento è `src/contenuti/v1/m06/l04.md` (disequazioni fratte): una lezione nuova si scrive tenendola aperta accanto.**

**Che cosa mostra la lezione di riferimento**

- Comincia da quello che Andrea sa già e dice subito che cosa cambia. Niente premesse.
- Prima di dare il metodo fa vedere **perché serve**: un conto semplice che, fatto nel modo spontaneo, dà un risultato falso (e lo si controlla con un numero).
- Ogni termine nuovo ha la sua definizione in un riquadro; ogni errore tipico ha il suo riquadro `attenzione` con il codice del catalogo, messo **dove quell'errore si fa**, non in fondo.
- Il metodo è un elenco numerato di passi, e gli esempi svolti ripetono gli stessi passi con le stesse parole («Passo 1», «Passo 2»…).
- Gli esempi vanno dal più semplice al più ricco, e ognuno aggiunge una sola difficoltà.
- L'app mostra la lezione **a tratti: ogni tratto finisce con una domanda lampo**, e il tratto seguente si apre dopo la risposta. Quindi le domande vanno messe ogni due o tre blocchi, subito dopo l'idea che controllano; quello che sta dopo l'ultima domanda è la chiusura (riepilogo).
- Domande lampo di due tipi: scritte a mano per controllare un'idea (con il codice di errore sulle opzioni sbagliate tipiche), prese dal generatore per provare il metodo (livello 1 a metà lezione, livello 2 verso la fine).
- Frasi brevi, dando del tu, senza punti esclamativi né complimenti. Il rigore non si abbassa: le condizioni si scrivono sempre.

**Per aggiungere una lezione**: il file `.md` al suo posto, una riga in `src/contenuti/index.ts`, e `npm test` (il test `test/contenuti/lezioni.test.ts` esegue la verifica dei contenuti su tutte le lezioni vere, prova ogni formula con KaTeX e controlla che l'elenco sia completo). Le abilità dichiarate in `abilita` devono avere il loro generatore `…g1`, che rimanda a quella lezione.

**Dove**: `src/contenuti/<volume>/<modulo>/<lezione>.md`, in minuscolo: la lezione `V1.M06.L04` sta in `src/contenuti/v1/m06/l04.md`.

**Intestazione** (obbligatoria, tutte le chiavi):

```markdown
---
codice: V1.M06.L04
titolo: Disequazioni fratte
obiettivo: Risolvere una disequazione fratta studiando il segno di numeratore e denominatore.
prerequisiti: [V1.M06.L03, V1.M04.L07]
durata: 15
abilita: [V1.M06.A04]
termini: [segno-di-una-frazione]
---
```

- `obiettivo`: una frase, «cosa saprai fare alla fine»;
- `durata`: minuti, da 10 a 20;
- `prerequisiti`, `abilita`, `termini`: elenchi tra quadre, anche vuoti (`[]`). Le abilità sono del modulo della lezione;
- `termini`: i termini del glossario che **questa** lezione definisce. Ognuno deve avere, nella lezione, esattamente un blocco che lo definisce.

**Blocchi speciali**. Un blocco si apre con `:::nome{attributi}` e si chiude con `:::` su una riga a sé. I blocchi **non si annidano**. Gli attributi si scrivono `chiave=valore` oppure `chiave="valore con spazi"`.

| Blocco | Attributi | Contenuto |
| --- | --- | --- |
| `definizione` | `id` (V1.M06.D02), `nome`, `termine` (facoltativo) | l'enunciato. Con `termine`, è anche la voce del glossario |
| `teorema` | `id` (V2.M06.T03), `nome` | l'enunciato, completo di ipotesi |
| `dimostrazione` | `di` (codice del teorema) | passaggi (vedi sotto). Va dopo il suo teorema, nella stessa lezione |
| `esempio` | `titolo` (facoltativo) | esempio svolto |
| `attenzione` | `errore` (codice del catalogo) | l'errore tipico e come evitarlo |
| `domanda` | `generatore`, `livello` **oppure** nessuno | domanda lampo (vedi sotto) |
| `visualizzazione` | `id` (VIS.nome) + parametri iniziali | vuoto |
| `flashcard` | `id` (V2.M06.F05) | davanti, poi `::retro`, poi dietro |
| `glossario` | `termine`, `nome` | definizione breve (1-2 frasi) di un termine che non merita un riquadro |
| `riepilogo` | nessuno | i punti da ricordare. Uno solo, **ultimo blocco** della lezione |

I codici `id` di definizioni, teoremi e flashcard sono del modulo della lezione. `nome` è quello mostrato ad Andrea e usato nelle flashcard automatiche («Definisci…», «Enuncia…»): ogni definizione e ogni teorema diventa una flashcard da solo, non va riscritto.

**Dentro un blocco, le sezioni** si aprono con `::nome` su una riga a sé.

Domanda lampo scritta a mano: testo, opzioni (una sola giusta, `[x]`), spiegazione. Un'opzione sbagliata può dichiarare l'errore tipico:

```markdown
:::domanda
Il segno di $\dfrac{x-1}{x+2}$ per $x = 0$ è:

- [ ] positivo {errore=DISEQ.SEGNO_DENOMINATORE}
- [x] negativo
- [ ] nullo

::spiegazione
Il numeratore vale $-1$, il denominatore $2$: segni discordi.
:::
```

Domanda lampo da un generatore (il blocco resta vuoto):

```markdown
:::domanda{generatore=V1.M06.A04.g1 livello=1}
:::
```

Dimostrazione: un'eventuale frase introduttiva, poi i passaggi. Ogni passaggio è `::passo` (con `{fisso}` se nella modalità «riordina» non si sposta) seguito da `::perche` (la giustificazione). **Almeno due passaggi** hanno una o due versioni sbagliate: `::sbagliato` seguito da `::motivo`. Da qui l'app ricava la dimostrazione statica e le tre modalità interattive (riordina, trova lo sbagliato, completa).

```markdown
:::dimostrazione{di=V2.M06.T03}
::passo{fisso}
Poni $g(x) = f(x) - \dfrac{f(b)-f(a)}{b-a}(x-a)$.
::perche
È $f$ meno la retta per gli estremi.
::passo
$g(a) = g(b)$.
::perche
Basta sostituire.
::sbagliato
$g(a) = g(b) = 0$.
::motivo
In $a$ il termine sottratto vale $0$, quindi $g(a) = f(a)$.
::passo
Esiste $c \in (a, b)$ con $g'(c) = 0$.
::perche
Per il teorema di Rolle applicato a $g$.
::sbagliato
Esiste $c \in (a, b)$ con $g(c) = 0$.
::motivo
Rolle parla della derivata, non della funzione.
:::
```

Visualizzazione con parametri iniziali, flashcard manuale:

```markdown
:::visualizzazione{id=VIS.disequazioni-grafico funzione="(x-1)/(x+2)" soglia=0}
:::

:::flashcard{id=V1.M06.F02}
Quando si può moltiplicare una disequazione per il denominatore?
::retro
Solo se il segno del denominatore è noto: se è negativo il verso si inverte.
:::
```

**Nel testo**

- Markdown normale: paragrafi, **grassetto**, *corsivo*, elenchi, tabelle, titoli da `##` in giù (il titolo della lezione è nell'intestazione).
- Formule: `$...$` in riga, `$$...$$` a centro pagina. Virgola decimale dentro una formula: `1{,}5`. Dollaro vero: `\$`.
- Rimandi: `[[termine-del-glossario]]` (termine toccabile), `[[termine|testo mostrato]]` per plurali e forme flesse (`[[segno-di-una-frazione|i segni]]`), `[[V1.M06.L03]]` per una lezione, `[[V2.M06.T03]]` per un teorema, `[[V1.M06.D02]]` per una definizione.

**Ordine di una lezione** (specifica, sezione 3): spiegazione a blocchi brevi con una domanda lampo ogni uno o due blocchi; esempi svolti; riquadri di definizione e teorema con la dimostrazione subito sotto; riquadri «attenzione» dove l'errore nasce; visualizzazione dove prevista; riepilogo.

**Tono**: rigoroso ma informale, dando del tu. Ogni termine tecnico si spiega alla prima comparsa; un termine già spiegato in una lezione precedente non si rispiega: si scrive `[[termine]]`. Volumi 2 e 3: definizioni precise, enunciati completi di ipotesi. Molti esempi, niente riempitivi.

**Glossario**: prima di definire un termine, cercarlo nelle lezioni esistenti (`termini:` delle intestazioni). Se esiste già, si rimanda; se no, lo definisce la lezione in cui compare per la prima volta lungo i prerequisiti.

**Controllo**: `parseLesson(testo)` restituisce l'elenco dei problemi di una lezione. I controlli tra file li fa `verifyContents(file, catalogo)` (in `src/contenuti/formato/`): posto del file (`v1/m06/l04.md` per `V1.M06.L04`), codici unici, prerequisiti che esistono e non fanno giri, rimandi a glossario, lezioni, definizioni, teoremi, errori, generatori (con il livello chiesto) e visualizzazioni, ogni termine definito in una sola lezione. Una lezione entra nell'app solo se `verifyContents` non trova problemi; un termine usato fuori dalla catena dei prerequisiti è un avviso da guardare. Il test che la esegue su tutte le lezioni vere nasce con la prima lezione (sessione 3).

## Catalogo degli errori

Il catalogo è in `src/errori/` (`catalog.ts`): 65 voci iniziali in 12 categorie, dalla specifica, sezione 5, più quelle aggiunte con i generatori (7 nella sessione 3: oggi sono 72).

- **Prima di aggiungere un errore, controllare che non esista già**: cercare per nome e per descrizione, non solo per codice. Due voci per lo stesso errore spezzano i dati di Andrea.
- Un codice ha la forma `CATEGORIA.NOME` (maiuscole, cifre e trattino basso). La categoria deve essere una delle dodici di `errorCategories`.
- Ogni voce ha tutti i campi: codice, nome, categoria, spiegazione, esempio concreto, rimando (modulo, lezione o «tutte»).
- La matematica nei testi sta tra `$...$` (LaTeX). La virgola decimale dentro una formula si scrive `{,}` (esempio: `1{,}414`).
- Ogni esempio nuovo va **verificato** (in `scripts/verifica-esempi-errori.py` si aggiunge un controllo con `@check("CODICE")`; lo script controlla anche che nessuna voce resti senza controllo).
- Il test `test/errori.test.ts` confronta il catalogo con la tabella di `docs/SPECIFICA.md`: se si aggiunge una voce al catalogo, si aggiunge anche alla tabella della specifica (e viceversa).
- `NON_CLASSIFICATO` non è una voce: è lo stato di una risposta sbagliata che non corrisponde a nessun errore.

## Quando un lavoro è finito

Un lavoro è finito solo se **tutte e tre** le cose sono vere:

1. compilazione (`npm run typecheck` e `npm run build`) e tutti i test (`npm test`) superati;
2. controllo automatico su GitHub verde;
3. `STATO.md` aggiornato.

Senza tutte e tre, il lavoro non è finito.

Il lavoro si salva su GitHub (commit e push) dopo ogni parte completata, non solo alla fine: la capacità di una sessione può finire a metà. Modifiche piccole, descrizioni chiare, ramo principale.

## Divieti

- **Mai rinominare un codice** (errori, moduli, lezioni, generatori): progressi, diario e generatori puntano ai codici.
- **Mai cambiare il formato dei dati salvati** senza conversione e test.
- **Mai modificare il motore** mentre si lavora su un generatore: se il motore ha un limite, si annota in `STATO.md`.
- **Mai indebolire o saltare un test** per farlo passare: se un test è sbagliato lo si corregge dicendo perché, se il codice è sbagliato si corregge il codice.
- **Nessuna richiesta di rete esterna e nessun tracciamento**: niente analisi d'uso, niente caratteri o librerie caricati da internet. Tutto è incorporato o salvato sul dispositivo (i test della build lo controllano per la versione PC).

## Note tecniche dell'impalcatura

- Le due versioni nascono dallo stesso codice con `scripts/build.mjs`; la costante `__TARGET__` (`"telefono"` o `"pc"`) distingue i due casi nel codice. Il service worker si registra solo nella versione telefono.
- Il service worker (`src/app/sw.ts`) salva in anticipo tutti i file della build; la versione della cache è un hash del contenuto. Una versione nuova si usa dalla riapertura successiva (nessun `skipWaiting`, per non cambiare l'app sotto gli occhi di chi sta studiando).
- GitHub Pages serve l'app sotto `/compasso/`: nell'app si usano solo percorsi relativi.
- `src/app/sw.ts` ha un suo `tsconfig.sw.json` (libreria WebWorker) ed è escluso dal `tsconfig.json` principale.
- I file `.md` delle lezioni si importano come testo: `loader: { ".md": "text" }` in `scripts/build.mjs`, un piccolo plugin in `vitest.config.ts`, la dichiarazione in `src/contenuti/markdown.d.ts`.

## L'app in breve (fetta verticale)

- `src/app/state.ts`: sezione aperta, schermata aperta (`open(...)`), dati di Andrea in segnali (`attempts`, `lessonProgress`), `recordAttempt`, `markDistraction`, `saveLessonProgress`.
- `src/app/testo/render.ts`: `renderRichText` trasforma il testo ricco (Markdown, `$formule$`, `[[rimandi]]`) in HTML con marked e KaTeX. Ci passa solo testo dell'app, mai testo scritto da Andrea.
- `src/app/risposta/`: `preview.ts` (anteprima in tempo reale con gli stessi parser della valutazione), `keys.ts` (i tasti della tastiera matematica per livello e `pressKey`, la funzione che applica un tasto a testo e cursore).
- `src/app/componenti/ExerciseView.tsx`: **l'unica** schermata di esercizio, usata dappertutto (domande lampo, esercizi dopo la lezione, sezione Esercizi). Riceve un `Exercise` e il contesto; registra da sola il tentativo. Un tipo di risposta nuovo si aggiunge qui e in `preview.ts`.
- `src/app/schermate/`: `LessonView` (la lezione a tratti), `Practice` (una serie di esercizi), `Sections` (le pagine iniziali delle cinque sezioni).
- `src/dati/`: `openStore()` apre IndexedDB (ripiego: localStorage, poi memoria). `DATA_VERSION` è la versione della struttura dei dati: **quando si cambia un tipo in `types.ts` il numero sale di uno**, si aggiunge il passo in `upgrade` (`store.ts`) e in `STEPS` (`migrate.ts`), con un test che parte da dati della versione precedente.
- Il campo di risposta è un `<input inputmode="none">`: sul telefono non apre la tastiera di sistema (si scrive con quella matematica), sul computer accetta la tastiera fisica e Invio conferma.
