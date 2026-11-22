# REGOLE

Ogni modello che lavora su Compasso legge questo file per primo. Lo scheletro è della sessione 0 (specifica, sezione 12); la sessione 1 aggiunge la parte tecnica; ogni sessione successiva lo aggiorna se impara qualcosa di utile.

La specifica completa è in `docs/SPECIFICA.md`: è la fonte di verità su cosa costruire. Lo stato del lavoro è in `STATO.md`. Com'è fatto il motore matematico (strutture dati, moduli, come si estende) è in `docs/ARCHITETTURA.md`.

## Prima di toccare qualsiasi cosa

1. Leggere questo file.
2. Leggere `STATO.md` (cosa è fatto, cosa manca, problemi noti).
3. Leggere le sezioni di `docs/SPECIFICA.md` che riguardano il lavoro. La sezione 0 dice cosa fare per le decisioni che la specifica non prende.
4. Fare **solo** il compito della sessione indicata nel messaggio. Il resto è di altre sessioni.
5. Non chiedere decisioni che la specifica già prende. Per le altre, seguire la sezione 0 e annotarle in `STATO.md`, nella parte «Decisioni da rivedere».

**Che cosa leggere, per compito.** Non serve leggere tutto il repository: per ogni compito bastano queste parti.

| Compito | In questo file | Altro da leggere | File da tenere aperto |
| --- | --- | --- | --- |
| Generatore nuovo | «Il motore in breve», «Come aggiungere un generatore», «Come replicare un generatore» | specifica 4 («Generatori») e 7; `docs/ARCHITETTURA.md` solo per la parte del motore che usi | il generatore di riferimento della tabella |
| Lezione nuova | «Come scrivere una lezione» | specifica 3 («Teoria») e 4 | `src/contenuti/v1/m06/l04.md` |
| Dimostrazione | «Come scrivere una dimostrazione» | specifica 4 («Dimostrazioni interattive»); `src/riserva/LEGGIMI.md` (teoremi già dimostrati) | la lezione che contiene il teorema |
| Visualizzazione | «Come aggiungere una visualizzazione» | specifica 11; `docs/VISUALIZZAZIONI.md` | `src/visualizzazioni/disequazioni-grafico.tsx` e `-math.ts` |
| Errore tipico nuovo | «Catalogo degli errori» | specifica 5 | `src/errori/catalog.ts` |
| Interfaccia | «L'app in breve», «Dati, padronanza e ripasso», «Note tecniche» | specifica 3, 7 e 10 | il componente da cambiare |

**Come si lavora in una sessione**

- Un compito per sessione, quello del messaggio. Un difetto trovato fuori dal compito si annota in `STATO.md` («Problemi noti»), non si corregge.
- Salvare su GitHub (commit e push sul ramo `main`) **dopo ogni parte completata**: la capacità può finire a metà, e il lavoro non caricato è perso.
- I test si eseguono in modo silenzioso, così l'output mostra solo quello che fallisce: `npm test -- --reporter=dot --silent`. Un solo file: `npx vitest run test/generatori/v1/m06/a04-g1.test.ts --reporter=dot`.
- Se un test fallisce, si legge il messaggio del rapporto (dice controllo, livello e seme) prima di cambiare qualcosa. Mai cambiare un test per farlo passare (vedi «Divieti»).
- Alla fine: `STATO.md` aggiornato in forma breve (fatto, problemi, prossimo passo) e controllo su GitHub verde (vedi «Quando un lavoro è finito»).

## Lingua

- Nel codice: nomi (variabili, funzioni, tipi, file) in **inglese**.
- Commenti, contenuti, interfaccia e messaggi di commit: in **italiano**.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm ci` | installa le dipendenze esattamente come da `package-lock.json` |
| `npm run typecheck` | controlla i tipi (app e service worker) |
| `npm run build` | produce `dist/telefono/` (PWA a più file) e `dist/pc/compasso.html` (file unico) |
| `npm test` | esegue tutti i test (Vitest); il test di build ricostruisce le due versioni, apre la PC in jsdom e la telefono in Chrome senza finestra (schermo di iPhone XR, anche offline) |
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
| `src/generatori/` | un file per generatore, `comuni/` con gli strumenti condivisi; `index.ts` legge i generatori (dati leggeri dall'indice, generatore vero dai moduli caricati) | `esercizi`, `motore`, `errori`, `codici`, `moduli` |
| `src/contenuti/` | lezioni in Markdown (`v1/m06/l04.md`) e loro figure SVG (`v1/m01/l02-venn.svg`); `index.ts` legge le lezioni (codici e titoli dall'indice, testo dai moduli caricati); in `formato/` il codice che le legge e le controlla | `codici`, `errori`, `moduli`, `motore` (solo `formato/graph.ts`, per leggere i grafici) |
| `src/moduli/` | **gli elenchi**: un file per modulo (`v1/m06.ts`) con le sue lezioni e i suoi generatori; `index.ts` registro fisso dei 35 moduli; `indice.ts` indice leggero; `caricamento.ts` moduli caricati (`ensureModules`) | `codici`, `contenuti`, `generatori`, `esercizi` |
| `src/riserva/` | teoremi con dimostrazione già scritti, in attesa della lezione (`LEGGIMI.md` dice come usarli); non entra nell'app | — |
| `src/dati/` | progressi, ripasso, registro, backup | `codici`, `errori`, `esercizi` (solo tipi) |
| `src/visualizzazioni/` | le visualizzazioni interattive: `index.ts` (elenco), `comuni.tsx` (pezzi comuni), una coppia di file per visualizzazione | `motore`, `contenuti/formato` (`readGraph`), `codici`, `app/componenti` (`RichText`) |
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
- Volume 1: `repeatingDecimal("0,1(6)")` (numero periodico, vale 1/6), `factorial(n)` (n!), `degrees(30, 15)` (30°15′, vale in radianti). Si leggono anche dal testo di Andrea (tabella in `docs/ARCHITETTURA.md`, sezione 5).
- `equivalent(a, b)`: uguali ovunque sono entrambe definite. `checkForm(expr, vincolo)`: guarda solo com'è scritta.
- Vincoli di forma disponibili: `expanded`, `factored`, `reducedFraction`, `rationalized`, `simplifiedRadicals`, `algebraicForm`, `trigonometricForm`, `exponentialForm`, `scientificNotation`, `degrees`, `radians`. Cosa controlla ciascuno: `docs/ARCHITETTURA.md`, sezione 8. Sono severi (`√(1/2)` non è razionalizzata, `2√2/2` non è ridotta, `√2·√3` non è un radicale semplificato): se la risposta giusta del generatore non li rispetta, la verifica lo dice.
- Non creare mai `sym("π")`, `sym("ℯ")`, `sym("ⅈ")`: le costanti sono `pi`, `e`, `I`.
- Punti fragili del motore e cose da sapere prima di scrivere un generatore: `docs/REVISIONE.md` (sessione 4a). I più importanti sono qui sotto.

**Trappole del motore** (dalla revisione 4a: il motore fa così di proposito, il generatore deve tenerne conto)

| Che cosa | Che cosa succede | Che cosa fare |
| --- | --- | --- |
| Vincoli di forma severi | `√(1/2)`, `2√2/2`, `√2·√3`, `(√2)³` violano `rationalized`, `reducedFraction`, `simplifiedRadicals` | la risposta giusta si scrive già nella forma finale (`√2/2`, `√2`, `√6`, `2√2`); la verifica automatica (controllo 4) lo segnala |
| Ordine dei fattori | `upFactor` ordina per grado e coefficienti; `factorPolynomial` per radice crescente | per mostrare fattori si usa `factorPolynomial`, oppure si ordinano a mano |
| `log` e `ln` | `log x` senza base è in base 10; `ln` è il naturale | nei testi del Volume 2 scrivere sempre `ln` (decisione aperta in `STATO.md`) |
| `i` | è l'unità immaginaria solo con l'opzione `complex` della risposta; altrove è una lettera | negli esercizi sui complessi dichiarare `complex`; le risposte `matrix` non la leggono ancora |
| `e` | è sempre il numero di Nepero | mai usare `e` come nome di variabile o parametro |
| `1/2x` | vale `(1/2)·x`; `sin x/2` vale `(sin x)/2`, ma `sin π/3` vale `sin(π/3)` | nei testi scrivere le frazioni con `\dfrac` e gli argomenti tra parentesi |
| Insiemi periodici | l'unione tra una famiglia periodica e un punto o un intervallo non si rappresenta; la forma canonica può spezzare un intervallo a cavallo dello zero | costruire le equazioni goniometriche con soluzioni tutte periodiche; per mostrare la soluzione scrivere la base a mano |
| Insiemi scritti da Andrea | `[−∞; 2]` e `{1,2}` sono testi non validi (non errori); `x = 1 e 2` vale ∅; `x = 3; x = 5` e `x_1 = 2 ∨ x_2 = 3` valgono «oppure» | negli indizi delle equazioni dire come si scrivono più soluzioni (`x = 3 ∨ x = 5`) |
| Confronto numerico | per funzioni goniometriche, esponenziali e logaritmi l'equivalenza si decide in punti casuali | evitare risposte con forti cancellazioni (`(1 − cos x)/x²`): scegliere una forma più stabile |
| Polinomi di grado alto | l'irriducibilità è garantita solo fino al grado 5 | nei generatori di scomposizione restare entro il grado 5 |
| Numeri periodici | `0,1(6)` (e `0,16̅`) vale esattamente 1/6 e non è un decimale: niente FORMA.DECIMALE; `0,5(3)` non è più 0,5·3. Un periodico resta periodico: `reducedFraction` lo rifiuta | si costruisce con `repeatingDecimal("0,1(6)")`; per «scrivi la frazione generatrice» dichiarare `reducedFraction`, altrimenti il periodico stesso è giusto |
| Notazione scientifica | `3,2E5` si legge `3,2·10^5` (solo E maiuscola; `2e5` è 2·e·5); `3,2·10^5` contiene un decimale: se la risposta giusta è l'intero 320000, è FORMA.DECIMALE | risposta giusta `mul(decimal("3,2"), pow(10, 5))` con `scientificNotation` |
| Gradi | `30°` è `fn("deg", 30)` e vale π/6 in radianti: `30°` e `π/6` sono equivalenti, `30°` e `30` no; `30°15′` è la somma di `deg` e `arcmin` | si costruisce con `degrees(30, 15)`; negli esercizi di conversione dichiarare `degrees` o `radians` |
| Fattoriale | `n!` è `fn("factorial", n)`: esatto sui naturali (fino a 300!), confrontato con Γ altrove; non si deriva; `5!=120` si legge 5 ≠ 120 | si costruisce con `factorial(n)`; nelle relazioni scrivere `5! = 120` con lo spazio |

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
| Grafici statici | `motore/display` | `plotGraph(funzioni, finestra, { points })` (curve, punti notevoli esatti, asintoti, tacche), `graphToSvg` (SVG con sole classi `graf-…`), `graphPointToLatex` |

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

**Prima di cominciare**

- Il codice dell'abilità e della lezione vengono dalla **scaletta del modulo** (`docs/SCALETTE.md`, da usare solo per i moduli con `Stato: approvata`). Se la scaletta del modulo non c'è, si scrive prima quella; i codici già assegnati sono in `STATO.md` e non si cambiano.
- Il **tipo di risposta** deve essere uno che l'app sa già mostrare e valutare: `number`, `expression`, `set`, `limit`, `matrix`, `choice`, `truefalse`, `ordering` (riordino con le frecce, dall'involucro parte 5; indicazioni sotto, in «Come replicare un generatore»).
- Si scrivono **a parole** i tre livelli e, per ogni forma di esercizio, gli errori tipici che può produrre (almeno tre dal livello 2). Se non se ne trovano tre credibili, la forma non va bene così.

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
- [ ] il generatore è nell'elenco del suo modulo (`src/moduli/vN/mNN.ts`) e il suo test sta nel percorso corrispondente (lo controlla `test/generatori/elenco.test.ts`);
- [ ] il test controlla anche il numero di risposte sbagliate e il riconoscimento degli errori scritti a mano;
- [ ] una ventina di esercizi per livello sono stati letti a occhio;
- [ ] il generatore non ha toccato `src/motore/` né `src/esercizi/`.

## Come replicare un generatore

I generatori di riferimento sono dieci: cinque scritti nella sessione 3, quello dei limiti nella sessione E1, tre nella sessione E2 (primitive, equazioni differenziali, scelta multipla «verdetto: criterio»), quello vero o falso con i generatori di V1.M01. Coprono i tipi di risposta più usati: ogni generatore nuovo parte da uno di loro.

| Se la risposta è… | Copia | Che cosa mostra |
| --- | --- | --- |
| un insieme di soluzioni (disequazioni, domini, equazioni con più soluzioni) | `src/generatori/v1/m06/a04-g1.ts` — disequazioni fratte | zeri scelti prima, tabella dei segni nei passaggi, errori fatti con `solutionFromSigns`, verifica per punti con conti esatti |
| un'espressione in una forma precisa («scomponi», «sviluppa», «semplifica») | `src/generatori/v1/m04/a07-g1.ts` — scomposizione | fattori scelti prima e moltiplicati, vincolo `form`, passaggi scritti dal motore, errori scritti fattore per fattore |
| un'espressione in qualunque forma equivalente (derivate, primitive, semplificazioni) | `src/generatori/v2/m06/a03-g1.ts` — derivate | modello a pezzi (`Part`), regola applicata per esteso, errori = la regola applicata male, doppia verifica (simbolica e numerica) |
| un numero esatto (determinanti, valori, limiti finiti, probabilità) | `src/generatori/v3/m03/a01-g1.ts` — determinante | estrazione ripetuta finché i numeri sono puliti e gli errori danno risultati tutti diversi, verifica con un altro algoritmo |
| una matrice o un vettore (sistemi, prodotti, inverse) | `src/generatori/v3/m02/a01-g1.ts` — sistemi con Gauss | costruzione `L·U` perché i conti restino interi, passaggi registrati dal motore, verifica `A·x = b` |
| il valore di un limite (numero, `+∞`, `−∞`, «non esiste») | `src/generatori/v2/m03/a01-g1.ts` — limiti di successioni | un modello per forma di esercizio e un «piano» (`planOf`) che dà espressione, limite, errori e passaggi; risposte sbagliate con `distinctWrongLimits`; verifica con la prova numerica `confirmsLimit` (`src/generatori/comuni/limits.ts`): valori vicino al punto, posti pari e dispari |
| una primitiva (vale qualunque costante abbia) | `src/generatori/v2/m09/a01-g1.ts` — integrali indefiniti | `check: { kind: "antiderivative" }`: la risposta si deriva; l'ultima sbagliata è la primitiva senza `+ c`; primitive sbagliate filtrate per derivata |
| la soluzione di un'equazione differenziale | `src/generatori/v2/m12/a02-g1.ts` — secondo ordine | `check: { kind: "differentialEquation" }`: sostituzione, numero di costanti, condizioni di Cauchy; sbagliate filtrate con `checkVerdict` e `sameUnderCheck`; verifica simbolica con `solvesSymbolically` |
| un verdetto con la sua giustificazione (convergenza, criteri) | `src/generatori/v2/m11/a01-g1.ts` — serie | `choice` «**Verdetto**: perché»; il modello dichiara il comportamento (esponente, rapporto) e `verify` lo controlla numericamente sulla funzione del testo |
| un'affermazione vera o falsa (appartenenza, inclusione, logica) | `src/generatori/v1/m01/a01-g1.ts` — appartenenza e inclusione | si sceglie prima il valore di verità, poi l'affermazione che lo ha; `error` solo sulle affermazioni nate da un errore tipico (`{a} ∈ A`, `∅ ⊆ A`), le altre danno `NON_CLASSIFICATO`; verità ricalcolata dalla definizione dei simboli (`holds`, numero per numero, in `comuni/natural-sets.ts`); il test controlla che vere e false siano circa metà e metà |

Per i riordini non c'è ancora un riferimento (per la scelta multipla scritta a mano c'è `V2.M11.A01.g1`): il primo generatore di quel tipo segue lo stesso schema in cinque parti e diventa lui il riferimento (va aggiunto a questa tabella). Per il riordino il primo vero sarà **`V1.M11.A08.g1`** (passi delle costruzioni con riga e compasso). Indicazioni per quei tipi:

- **`choice`** scritta a mano: solo quando la risposta non è un oggetto matematico (una proprietà, un metodo da scegliere). Ogni opzione sbagliata ha il suo codice di errore, come le risposte sbagliate previste.
- **`truefalse`**: un'affermazione costruita all'indietro, vera o falsa con la stessa probabilità; l'affermazione falsa è quella che nasce da un errore tipico, e il codice di chi risponde il contrario va nel campo `error` della risposta. Due soli esiti: niente scelta multipla.
- **`ordering`** (riordino). Come lo mostra l'app: gli elementi partono mescolati da `orderingStart` (deterministico dal seme, mai nell'ordine giusto, i fissi al loro posto), Andrea li sposta con le frecce ↑ e ↓ (`ReorderList`), conferma; giusta solo se l'ordine è esattamente quello di `items`; dopo la risposta vede ogni posto con ✓ o ✗ e l'ordine giusto. Niente scelta multipla, niente risposte sbagliate previste: un ordine sbagliato dà il codice del campo `error` (uno solo per esercizio) oppure `NON_CLASSIFICATO`. Esempio funzionante, solo per i test: `test/esercizi/fixtures/ordering-generator.ts` (ordine delle operazioni, `CALC.PRECEDENZA`). Indicazioni per **`V1.M11.A08.g1`**, che diventa il riferimento:
  - **Un solo ordine giusto.** Ogni passo deve dipendere da quello prima: nomina un punto, un arco o una retta costruiti al passo precedente («Con centro in $C$, lo stesso raggio…»). Due passi indipendenti (due archi con centri diversi e stesso raggio) si uniscono in un passo solo, oppure il secondo si segna `fixed`. È la stessa regola delle dimostrazioni («Riordina funziona solo se l'ordine giusto è uno»).
  - **Fissi**: di solito il primo («Sono dati il segmento $AB$…») e al più un terzo degli elementi; almeno due elementi spostabili (lo controlla `generateExercise`), meglio da tre a sei: più di sette passi su un telefono sono troppi da far scorrere.
  - **All'indietro**: il modello è la costruzione (quale delle quattro, quali lettere, quali dati); `draftOf` scrive i passi nell'ordine giusto. Il `rng` sceglie costruzione, lettere e formulazioni, non l'ordine: lo mescola l'app.
  - **Livelli**: 1 = una costruzione con tre o quattro passi, i nomi dei punti già nel testo; 2 = cinque o sei passi, punti da nominare lungo la strada; 3 = due costruzioni concatenate (prima la perpendicolare da un punto, poi la parallela), al più sette passi. Ogni elemento si usa: niente passi in più da scartare (non sarebbe più un riordino).
  - **Errore**: `error` è il codice dell'errore che fa chi sbaglia l'ordine. Il catalogo oggi non ha un errore adatto alle costruzioni: prima del generatore si aggiunge la voce in GEO (sezione «Catalogo degli errori»), per esempio «passo che usa un punto non ancora costruito». Non si usa un codice che parla d'altro.
  - **Testo e passi**: il testo dice che cosa ordinare («Metti in ordine i passi per costruire l'asse del segmento $AB$»); ogni elemento è una frase con le lettere in `$…$`; `steps` ripete i passi in ordine con il perché di ognuno (non solo il testo degli elementi); i due indizi orientano («da quale dato parti?», «quale punto serve per tracciare la retta finale?»).
  - **`verify`**: ricostruisce la costruzione con le coordinate (numeri esatti, `Rational` o `Surd`) seguendo gli elementi nell'ordine giusto e controlla il risultato (la retta trovata è davvero l'asse, la bisettrice, la perpendicolare, la parallela) e che ogni elemento usi solo punti costruiti prima.
  - **Test**: `verifyGenerator` senza problemi né avvisi; per ogni seme provato che l'ordine giusto sia accettato, che l'ordine di partenza (`orderingStart`) dia il codice dell'errore, che ogni scambio di due elementi vicini spostabili sia sbagliato (prova che l'ordine giusto è uno solo a meno di passi uguali, che non devono esserci); nessun elemento uguale a un altro.
  - Dopo il primo generatore vero, la riga «un riordino» va nella tabella qui sopra e il generatore di prova resta solo per i test dell'interfaccia.

**La struttura, uguale in tutti.** Un file ha sempre queste parti, in quest'ordine:

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
8. Aggiungi il generatore all'elenco **del suo modulo**, `src/moduli/<volume>/<modulo>.ts` (per `V1.M06.A04.g1`: `src/moduli/v1/m06.ts`): una riga di `import` (`import a04g1 from "../../generatori/v1/m06/a04-g1";`) e il nome in `generators`, in ordine di abilità. Nessun altro file da toccare: il registro dei moduli è fisso e l'indice leggero lo calcola la compilazione. Un generatore nell'elenco di un altro modulo fa fallire `test/generatori/elenco.test.ts`.
9. Esegui il test. Poi **leggi una ventina di esercizi** per livello, con risposte sbagliate e passaggi: la verifica automatica non vede un testo goffo, un esercizio banale o un errore poco credibile. Basta un test provvisorio che stampa `generateExercise(generator, livello, seme)` per i semi da 0 a 20.
10. Aggiungi le righe del generatore a `test/generatori/semi-congelati.test.ts` (due semi per livello): il test fallisce finché mancano.

**Che cosa deve contenere il test del generatore** (oltre a `verifyGenerator`): quante risposte sbagliate ha ogni esercizio (almeno tre dal livello 2, per **ogni** seme provato e non «quasi sempre», perché l'esercizio possa diventare una scelta multipla); che la risposta giusta **scritta come la scriverebbe Andrea** sia accettata da `evaluateResponse` e ogni risposta sbagliata sia riconosciuta con il suo codice; per i generatori con vincolo di forma, che la risposta equivalente ma nella forma sbagliata dia `FORMA.NON_RICHIESTA`. Un test che gira su centinaia di semi ha un tempo massimo esplicito (`}, 30_000);`): su GitHub i test vanno circa tre volte più piano che in locale, e il limite normale è di 5 secondi.

**Abitudini che evitano i difetti più comuni**

- **Numeri sotto controllo alla fonte.** Se una risposta (anche sbagliata) esce dai `limits`, non si allargano i limiti: si restringono i numeri estratti, oppure si estrae di nuovo finché l'esercizio va bene (come fa `draw` nel determinante), sempre con lo stesso `rng`.
- **Errori che coincidono.** Capita che per certi numeri due errori diano la stessa risposta, o la risposta giusta. Se capita di rado, basta `distinctWrong…`, che scarta il doppione. Se capita spesso, si cambia la costruzione in modo che non capiti (nelle disequazioni fratte la posizione del fattore comune dipende dal verso; nei sistemi si accettano solo i numeri per cui i tre errori danno tre vettori diversi).
- **Una forma, tanti errori possibili.** Una forma di esercizio che lascia meno di due errori credibili (per esempio una frazione con il denominatore sempre positivo) si limita ai casi in cui gli errori ci sono, oppure si toglie.
- **Scrittura a mano.** Le espressioni mostrate si scrivono come su un quaderno: `−x` e non `−1x`, il meno davanti alla frazione, niente parentesi doppie. Il generatore decide la forma che mostra; `simplify` da solo non basta sempre.
- **Semi congelati.** `test/generatori/semi-congelati.test.ts` controlla il testo di due semi fissi per ogni generatore e livello: se cambia, vuol dire che è cambiato l'ordine delle estrazioni (o una forma, o un peso), e gli esercizi già salvati nel registro di Andrea non sono più gli stessi. Cambiare si può, ma è una decisione: si aggiorna la riga e si scrive il motivo in `STATO.md`. Per aggiungere scelta a una forma senza toccare le altre, l'estrazione nuova va **dentro** il ramo di quella forma.
- **Varietà.** Ogni livello deve dare almeno 100 esercizi diversi, e nessun esercizio deve uscire in più del 4% dei semi: la verifica automatica lo conta e avvisa. Il difetto tipico è una forma con pochi esercizi possibili che pesa quanto le altre (`x⁴ − t⁴` ha cinque esercizi: con un quinto delle estrazioni, `x⁴ − 1` usciva una volta su quindici). Rimedi: ripetere nell'elenco di `rng.pick` le forme ricche (i pesi), allargare i numeri della forma povera, aggiungere una forma. Prima di chiudere, conta gli esercizi diversi per livello.
- **Passaggi completi.** La soluzione mostra ogni conto in cui si può sbagliare: niente «si calcola allo stesso modo» o «risolvi dal basso verso l'alto» senza i numeri. Se un errore tipico del generatore nasce in un passaggio (il segno nel trasporto, il segno di un trinomio), quel passaggio deve esserci, scritto per esteso.
- **Una riga, uno schermo.** Una formula a centro pagina più larga di un telefono scorre di lato e il risultato resta fuori vista: una matrice e il suo conto, o una catena di tre uguaglianze, si spezzano in due formule.
- **Stesso fattore, una potenza.** Nelle risposte costruite a pezzi (anche in quelle sbagliate) un fattore ripetuto si scrive come potenza: `(x + 3)²(x − 3)`, non `(x + 3)(x + 3)(x − 3)`.
- **Ogni forma, i suoi errori.** Ogni errore tipico che una forma di esercizio rende possibile deve avere la sua risposta sbagliata. Se compare `−x`, c'è il verso non invertito (`DISEQ.VERSO_NON_INVERTITO`); se c'è un denominatore, la condizione dimenticata; se c'è un trasporto, il segno. La revisione 4b ha trovato proprio questo buco nelle disequazioni fratte.
- **Tre risposte sbagliate per ogni seme, non «quasi sempre».** Dal livello 2 il test lo controlla su tutti i semi provati. Se per certi numeri restano due sole risposte, si cambia la costruzione in quei casi (nelle fratte: lo zero doppio con verso stretto prende l'uguale).
- **Il testo è quello che conta.** `verify` ricostruisce il modello dal seme, quindi non vede un testo scritto male da `draftOf` (un segno perso, un numero sbagliato nel LaTeX). Dopo aver letto gli esercizi a occhio, rifai il conto **a partire dal testo mostrato** per qualche centinaio di semi, con uno script sympy fuori dal repository (`pip install sympy`): legge il LaTeX del testo, risolve, confronta con la risposta. È la prova che ha controllato i 26.718 esercizi della revisione 4b; annota in `STATO.md` che l'hai fatta.
- **Risposte di tipo insieme con scritture nuove.** Se Andrea deve scrivere soluzioni di forma nuova (punti isolati, periodi, `e`, `ln 2`), aggiungi alcune risposte giuste del generatore al test di `test/app/moduli.test.ts` che le scrive un carattere alla volta: se l'anteprima dà per sbagliato un pezzo di risposta giusta, si aggiunge una chiusura a `SET_ENDINGS` (`src/app/risposta/preview.ts`).
- **Tempi su GitHub.** Un test che gira su centinaia di semi ha il suo tempo massimo (`}, 30_000);`). Senza, passa in locale e fallisce su GitHub: è successo nella sessione 4b.
- **Strumenti comuni.** `src/generatori/comuni/` contiene quello che serve a più generatori (`rationalAt` per il valore esatto in un punto, `distinctWrong…`; per i limiti `limitLatex`, `distinctWrongLimits`, `confirmsLimit` in `limits.ts`; per i polinomi scritti termine per termine `termWriter` in `terms.ts`). Nei test, `test/generatori/scrivi.ts` scrive una risposta come la scriverebbe Andrea (`limitText`, `plainText`).
- **Limiti.** Il motore non calcola limiti: il valore si legge dai dati scelti (coefficienti dominanti, sviluppi tenuti come frazioni esatte) e `verify` lo conferma con i valori vicino al punto. Con i numeri in virgola mobile un limite finito grande (`e¹²`) non va scambiato per un infinito, e le potenze che escono dalla portata (`(1 + 1/n)^(n²)`) vanno provate con `n` piccoli (`scales`). Una somma dopo `lim` va tra parentesi (lo fa `limitLatex`). Una funzione che serve a un secondo generatore si sposta lì; una funzione di matematica vera va nel motore, in una sessione dedicata, non dentro un generatore.

**Trappole emerse nella sessione E2.**

- `rng.intExcept(min, max, lista)` esclude **solo** la lista: lo zero va messo nella lista se non deve uscire.
- In `combinationLatex` (`comuni/ode.ts`) e simili, il coefficiente 1 si omette solo davanti a una lettera: un termine noto `±1` va scritto.
- Con un controllo speciale (`check`), una risposta sbagliata prevista che il controllo stesso riconosce (per esempio una soluzione con una costante sola) deve avere **quel** codice: filtrale con `checkVerdict` come in `V2.M12.A02.g1`.
- Valori esatti di integrali: `ExactSum` (`comuni/exact-sum.ts`) raccoglie i logaritmi spezzandoli nei primi; il numero si scrive con `toExpr()`.

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

**Prima di scrivere una lezione**

- La lezione è nella scaletta del modulo (`docs/SCALETTE.md`, modulo approvato), con codice, prerequisiti, abilità, termini e teoremi. I prerequisiti si scrivono solo se quelle lezioni **esistono già** (la verifica rifiuta un codice che non c'è): quelli che mancano si annotano in `STATO.md` e si aggiungono quando arrivano.
- Ogni abilità in `abilita` deve avere **già** il suo generatore `…g1`, con `lesson` uguale al codice della lezione (il test lo pretende). Quindi: prima il generatore, poi la lezione; oppure la lezione con `abilita: []` e l'abilità aggiunta quando il generatore c'è.
- Ogni lezione ha almeno una definizione, un esempio svolto, una domanda lampo, un riquadro attenzione e il riepilogo (`test/contenuti/lezioni.test.ts` lo controlla).
- Si guardano gli esercizi di livello 3 dei generatori della lezione: ogni caso che usano (zero doppio, polinomio senza zeri, parametro) deve essere spiegato nella lezione. Andrea li fa alla fine.

**Difetti trovati nella lezione di riferimento** (revisione 4b), da non ripetere:

- **Definizioni vere alla lettera.** «Si può sempre scrivere come $N/D$» era falso per una disequazione qualsiasi: la definizione deve dire le ipotesi («tra polinomi e frazioni di polinomi»). Una frase che vale «di solito» non va in un riquadro.
- **Niente «ha due zeri» quando non è sempre così.** Ogni affermazione generale si controlla sui casi limite: discriminante nullo o negativo, coefficiente negativo, denominatore costante.
- **Ogni esempio svolto ha tutti i passi del metodo**, con lo stesso nome («Passo 1», «Passo 2»…), anche quando un passo è banale.
- **Ogni simbolo si spiega alla prima comparsa** (`∨` si legge «oppure»), anche se sembra ovvio.
- **Durata ricalcolata** dopo ogni aggiunta: tra 10 e 20 minuti. Se si sfora, la lezione va divisa in due.
- **Controlla ogni numero**: gli esempi e le domande lampo scritte a mano si rifanno a parte (a mano o con sympy). Un esempio sbagliato insegna l'errore.

**Per aggiungere una lezione**: il file `.md` al suo posto, due righe nell'elenco **del suo modulo** `src/moduli/vN/mNN.ts` (per `V1.M06.L04`: `src/moduli/v1/m06.ts`, con `import l04 from "../../contenuti/v1/m06/l04.md";` e `"V1.M06.L04": l04,` in `lessons`), e `npm test` (il test `test/contenuti/lezioni.test.ts` esegue la verifica dei contenuti su tutte le lezioni vere, prova ogni formula con KaTeX e controlla che l'elenco sia completo). Le abilità dichiarate in `abilita` devono avere il loro generatore `…g1`, che rimanda a quella lezione.

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
| `grafico` | `funzioni`, `finestra`, `punti` (facoltativo) | didascalia (facoltativa) |
| `figura` | `file` (lNN-nome.svg, accanto alla lezione) | didascalia (obbligatoria) |
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

Dimostrazione: un'eventuale frase introduttiva, poi i passaggi. Ogni passaggio è `::passo` (con `{fisso}` se nella modalità «riordina» non si sposta) seguito da `::perche` (la giustificazione). **Almeno due passaggi** hanno una o due versioni sbagliate: `::sbagliato` seguito da `::motivo`. Da qui l'app ricava la dimostrazione statica e le tre modalità interattive (riordina, trova lo sbagliato, completa), che registrano i tentativi (contesto `dimostrazione`).

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

**Grafici e figure**

Un **grafico** lo disegna il motore (`plotGraph` e `graphToSvg` in `src/motore/display/graph.ts`): si scrivono solo le funzioni e la finestra.

```markdown
:::grafico{funzioni="(x-1)/(x+2); x/2 - 1" finestra="-6; 6; -4; 4" punti="4"}
La funzione $y = \dfrac{x-1}{x+2}$ e la retta $y = \dfrac{x}{2} - 1$.
:::
```

- `funzioni`: da una a tre funzioni di `x`, separate da `;`, scritte come le legge `parseExpression` (`sqrt(x)`, `ln(x)`, `2^x`, `sin(x)`). Si distinguono per colore **e** tratteggio (continua, a tratti, a punti); sotto il disegno compare la legenda con le formule.
- `finestra`: quattro numeri separati da `;`, nell'ordine x minimo; x massimo; y minimo; y massimo. Valgono anche costanti (`-2pi`, `3/2`, `1,5`).
- `punti` (facoltativo): ascisse di altri punti da segnare, separate da `;`, su ogni curva definita lì (un'intersezione tra due curve si scrive così).
- Il motore segna da solo, **esatti**: zeri e asintoti verticali delle funzioni razionali, buchi (punti esclusi con limite finito), intersezione con l'asse $y$. Per le altre funzioni (seno, logaritmo, radici) gli zeri non li cerca: se servono, vanno in `punti`. Le lettere A, B, C… vanno in ordine di ascissa e sotto il disegno c'è l'elenco con le coordinate.
- La curva è interrotta dove la funzione non è definita (anche ai poli della tangente, che il motore non conosce: lì non disegna l'asintoto).
- Un parametro sbagliato è un problema della verifica dei contenuti (`Grafico: …`); se arrivasse nell'app, il riquadro mostra il messaggio e la lezione continua.

Una **figura** è un file SVG scritto a mano, accanto alla lezione, per ciò che non è il grafico di una funzione (diagrammi di Venn in V1.M01, figure di geometria in V1.M11).

```markdown
:::figura{file=l02-venn-unione.svg}
L'unione $A \cup B$: tutta la parte colorata, dentro almeno uno dei due cerchi.
:::
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <title>Diagramma di Venn: l'unione di A e B</title>
  <rect class="fig-linea" x="8" y="8" width="304" height="184" rx="6"/>
  <circle class="fig-area-1 fig-linea" cx="125" cy="100" r="62"/>
  <circle class="fig-area-1 fig-linea" cx="195" cy="100" r="62"/>
  <text class="fig-testo-corsivo" x="88" y="104">A</text>
  <text class="fig-testo-corsivo" x="222" y="104">B</text>
</svg>
```

- **File**: `src/contenuti/vN/mNN/lNN-nome.svg` (per `V1.M01.L02`: `l02-…`, minuscolo e trattini). Va nell'elenco del modulo, come la lezione: `import l02Venn from "../../contenuti/v1/m01/l02-venn-unione.svg";` e `figures: { "v1/m01/l02-venn-unione.svg": l02Venn }` in `defineModule`.
- **Didascalia obbligatoria**: dice che cosa mostra la figura, anche a chi non la vede.
- **Regole del file** (le controlla `checkFigure`): comincia con `<svg` e ha il `viewBox`, senza `width` né `height` (si adatta allo schermo; disegnare su una larghezza di circa 320); solo forme, testo, gruppi, `defs`, `marker`, `clipPath`, `use`; niente `script`, `style`, immagini, `foreignObject`, riferimenti fuori dal file; gli `id` cominciano con il nome del file (`l02-venn-unione-freccia`); nel testo `<` e `>` si scrivono `&lt;` e `&gt;`.
- **Colori solo dalle classi** (mai `fill="…"`, `stroke="…"` o codici di colore; ammessi solo `none` e `currentColor`): `fig-linea` (contorno d'inchiostro), `fig-sottile` (linea di costruzione), `fig-tratteggio`, `fig-accento` (contorno arancione), `fig-area-1`/`-2`/`-3` (riempimento trasparente blu, arancione, verde: le sovrapposizioni si vedono), `fig-pieno` (punti, frecce), `fig-testo`, `fig-testo-corsivo` (lettere matematiche). Una forma senza classe è un contorno d'inchiostro senza riempimento. L'elenco è `FIGURE_CLASSES` in `src/contenuti/formato/figure.ts`; le regole sono in `styles.css` e seguono il tema.
- Le formule vere non stanno nella figura (il testo SVG non passa da KaTeX): lettere e numeri semplici sì, il resto va nella didascalia.

Una figura che nessuna lezione usa è un avviso della verifica. La prova in Chrome di grafici e figure (`test/app/grafici-chrome.test.ts`) usa la lezione di prova `test/contenuti/prova/v1/m01/l99.md`, che non entra nell'app; con `COMPASSO_FOTO=cartella` salva le fotografie nei due temi a 414 e 320 px.

**Nel testo**

- Markdown normale: paragrafi, **grassetto**, *corsivo*, elenchi, tabelle, titoli da `##` in giù (il titolo della lezione è nell'intestazione).
- Formule: `$...$` in riga, `$$...$$` a centro pagina. Virgola decimale dentro una formula: `1{,}5`. Dollaro vero: `\$`.
- Rimandi: `[[termine-del-glossario]]` (termine toccabile), `[[termine|testo mostrato]]` per plurali e forme flesse (`[[segno-di-una-frazione|i segni]]`), `[[V1.M06.L03]]` per una lezione, `[[V2.M06.T03]]` per un teorema, `[[V1.M06.D02]]` per una definizione.

**Ordine di una lezione** (specifica, sezione 3): spiegazione a blocchi brevi con una domanda lampo ogni uno o due blocchi; esempi svolti; riquadri di definizione e teorema con la dimostrazione subito sotto; riquadri «attenzione» dove l'errore nasce; visualizzazione dove prevista; riepilogo.

**Tono**: rigoroso ma informale, dando del tu. Ogni termine tecnico si spiega alla prima comparsa; un termine già spiegato in una lezione precedente non si rispiega: si scrive `[[termine]]`. Volumi 2 e 3: definizioni precise, enunciati completi di ipotesi. Molti esempi, niente riempitivi.

**Glossario**: prima di definire un termine, cercarlo nelle lezioni esistenti (`termini:` delle intestazioni). Se esiste già, si rimanda; se no, lo definisce la lezione in cui compare per la prima volta lungo i prerequisiti.

**Controllo**: `parseLesson(testo)` restituisce l'elenco dei problemi di una lezione. I controlli tra file li fa `verifyContents(file, catalogo)` (in `src/contenuti/formato/`): posto del file (`v1/m06/l04.md` per `V1.M06.L04`), codici unici, prerequisiti che esistono e non fanno giri, rimandi a glossario, lezioni, definizioni, teoremi, errori, generatori (con il livello chiesto) e visualizzazioni, ogni termine definito in una sola lezione. Una lezione entra nell'app solo se `verifyContents` non trova problemi; un termine usato fuori dalla catena dei prerequisiti è un avviso da guardare. Il test che la esegue su tutte le lezioni vere nasce con la prima lezione (sessione 3).

## Come scrivere una dimostrazione

La sintassi è in «Come scrivere una lezione» (blocco `dimostrazione`, esempio di Lagrange). Qui c'è come farla **bene**, perché dalla stessa sorgente l'app ricava la dimostrazione statica e tre esercizi (specifica, sezione 4): **riordina**, **trova lo sbagliato**, **completa**. Nella lezione l'app mostra la versione statica; le tre modalità sono nella scheda Dimostrazioni (sezione Esercizi), funzionano sulle dimostrazioni scritte così come sono e registrano un tentativo per giro.

**Dove e quando**

- Dentro la lezione del teorema, subito dopo il blocco `teorema`, con `di=` uguale al suo `id` (la verifica lo controlla).
- Si dimostrano i teoremi principali dei Volumi 2 e 3 e, nel Volume 1, solo dove il ragionamento è parte del programma (per assurdo, induzione, Pitagora). Un teorema senza dimostrazione si enuncia comunque completo.
- Una dimostrazione usa solo definizioni e teoremi delle lezioni che sono tra i prerequisiti (o della lezione stessa), citati con `[[V2.M06.T02]]` nella giustificazione.
- **Prima di scrivere una dimostrazione, guardare la riserva**: `src/riserva/<volume>/<modulo>/tNN.md` contiene teoremi già enunciati e dimostrati (sessione 4d: zeri, Weierstrass, Fermat, Rolle, Lagrange). Il file si incolla nella lezione così com'è e poi **si cancella**, insieme alla sua riga in `src/riserva/LEGGIMI.md`: il test `test/contenuti/riserva.test.ts` verifica i file di riserva insieme alle lezioni vere e fallisce se un teorema sta in due posti. Una dimostrazione nuova scritta prima della sua lezione va lì, con lo stesso formato (solo il blocco `teorema` e il blocco `dimostrazione`).
- La dimostrazione si **confronta con un libro di testo** universitario (specifica, sezione 13, fase 6) e la fonte si annota in `STATO.md`. Una dimostrazione inventata da capo non entra.

**I passaggi**

- Da 4 a 10 passaggi. Ogni passaggio è **una sola mossa logica** (una definizione applicata, un teorema usato, un conto), con il risultato scritto per intero: mai «analogamente» o «si ottiene facilmente».
- `::perche` dice **che cosa** giustifica il passaggio (l'ipotesi, il teorema, la definizione), in una frase. Ogni ipotesi del teorema deve essere usata in almeno un passaggio, e la giustificazione lo dice («perché $f$ è continua in $[a, b]$»).
- **Riordina funziona solo se l'ordine giusto è uno.** Due passaggi che si possono scambiare (due fatti indipendenti) si uniscono in un passaggio solo, oppure il secondo si segna `{fisso}`. Altrimenti Andrea riordina bene e risulta sbagliato.
- `{fisso}` anche per i passaggi che non ha senso spostare: di solito il primo («Poni…», «Supponi per assurdo…») e l'ultimo («Quindi…»). Non più di un terzo dei passaggi.

**Le versioni sbagliate** (`::sbagliato` e `::motivo`, almeno due passaggi, al più due versioni per passaggio)

- Ogni versione sbagliata è un **errore che uno studente fa davvero**: implicazione rovesciata, ipotesi dimenticata, `f` scambiata con `f'`, `<` al posto di `≤`, quantificatori scambiati («esiste» per «per ogni»), conclusione presa per ipotesi, caso limite dimenticato. Niente frasi assurde che si scartano senza pensare.
- Deve essere **falsa nel contesto**, non solo diversa: una strada alternativa ma corretta non è una versione sbagliata (in «trova lo sbagliato» Andrea non avrebbe niente da trovare).
- Deve **somigliare** alla giusta (stessa lunghezza, stessa forma), perché in «completa» si sceglie tra giusta e sbagliate: se si riconosce dall'aspetto, l'esercizio non allena niente.
- Le versioni sbagliate dello stesso passaggio sono diverse tra loro, e nessuna coincide con un altro passaggio della dimostrazione.
- `::motivo` dice in una o due frasi **perché** è sbagliata, nominando l'ipotesi o la regola violata, e se possibile mostra il controesempio.

**Controllo prima di salvare**: `npm test` (la verifica controlla struttura, teorema, numero di versioni sbagliate e ogni formula con KaTeX); poi si legge la dimostrazione tre volte, come la vedrebbe Andrea nelle tre modalità: mescolata (c'è un solo ordine giusto?), con un passaggio sostituito (si capisce che è sbagliato?), con un passaggio nascosto (le opzioni sono credibili?).

## Come aggiungere una visualizzazione

Le visualizzazioni sono undici, con codici fissi (specifica, sezione 11): non se ne aggiungono altre senza una decisione di Andrea (`STATO.md`, «Domande aperte»). La prima, `VIS.disequazioni-grafico`, ha costruito l'impalcatura: **le successive la copiano**, come i generatori copiano il generatore di riferimento. File da tenere aperti: `src/visualizzazioni/disequazioni-grafico.tsx` (componente), `src/visualizzazioni/disequazioni-grafico-math.ts` (matematica), i loro test in `test/visualizzazioni/` e `test/app/visualizzazioni-chrome.test.ts`.

**Prima di scrivere codice**: la scheda della visualizzazione in `docs/VISUALIZZAZIONI.md` (una sezione per codice, sul modello di quella di `VIS.disequazioni-grafico`): che cosa si manipola, che cosa si vede, i parametri iniziali che una lezione può passare (nome, significato, valore predefinito, valori ammessi), che cosa deve far capire (dalla tabella della specifica), le lezioni che la usano. Si aggiorna anche la riga «Stato» della tabella in cima.

**Dove**

- `src/visualizzazioni/<nome>.tsx` (il codice senza `VIS.`: `VIS.disequazioni-grafico` → `disequazioni-grafico.tsx`) per il componente; la matematica in `<nome>-math.ts`, senza Preact, così si prova da sola. **Mai due file con lo stesso nome e estensione diversa** (`.ts` e `.tsx`): l'import senza estensione diventa ambiguo.
- `src/visualizzazioni/index.ts`: l'elenco `VISUALIZATIONS` (codice, componente, `checkParams`). Una riga per visualizzazione; le visualizzazioni sono poche e restano nel file principale, non nei moduli. Da qui arrivano `visualizationCodes` e `checkVisualizationParams` alla verifica dei contenuti, e `VisualizationBlock` a `LessonView`.
- `src/visualizzazioni/comuni.tsx`: `VisualizationBox` (il riquadro «Visualizzazione · titolo»), `VisualizationProblem` (il messaggio per i parametri sbagliati), `Slider` (cursore con nome e valore in KaTeX), `useDragHandle` (maniglia col dito), `toDrawing`, `pathOf`, `svgNumber`. Si usano questi, non si riscrivono.
- Test: `test/visualizzazioni/<nome>.test.ts` (matematica), `test/visualizzazioni/<nome>-vista.test.ts` (componente in jsdom), un caso nella prova in Chrome: `test/app/visualizzazioni-chrome.test.ts` (lezione vera) oppure, finché nessuna lezione vera la usa, `test/app/visualizzazioni-prova-chrome.test.ts` con la lezione finta `test/app/anteprima/visualizzazioni-prova.md` (quando una lezione vera la inserisce, il blocco si toglie da lì e il caso passa alla prova con la lezione vera). `test/visualizzazioni/helpers.ts` ha `lessonParams(codice)`: i parametri di quella visualizzazione in tutte le lezioni vere.

**Come è fatta** (`VIS.disequazioni-grafico`)

- **Il grafico di base è quello dei grafici statici**: `readGraph` (che controlla anche la finestra) e `graphToSvg` disegnano assi, griglia, curva, asintoti e buchi; sopra c'è un secondo `<svg class="vis-sopra">` con lo stesso `viewBox` (`GRAPH_WIDTH × GRAPH_HEIGHT`) per le parti che si muovono. Le coordinate vengono da `graphFrame(finestra)` (`sx`, `sy` e le inverse `px`, `py`), la stessa cornice di `graphToSvg`: i due disegni coincidono (la prova in Chrome lo controlla).
- **Matematica esatta dove si mostra un risultato.** I numeri che si trascinano e finiscono in un risultato esatto vanno a passi esatti (la soglia a passi di $\tfrac12$, `snapThreshold`), e da lì il motore lavora con `Rational`: zeri, tabella dei segni (`signTable`), soluzione (`solutionFromSigns`, `setToLatex`). I parametri della lezione sono limitati a quello che il motore risolve esatto per **ogni** posizione dei cursori (qui: numeratore e denominatore di grado al più 2), e il test lo prova posizione per posizione. Le grandezze solo da guardare (la sonda) sono in virgola mobile e si scrivono con `≈`.
- **Funzioni razionali**: `rationalFunction`, `subtractConstant` (f − k come una sola frazione) e gli altri in `src/motore/display/rational-function.ts`. Non semplificano i fattori comuni: dove si annullano la funzione non esiste.
- **Parametri**: `read…Params(params)` legge il testo con `parseExpression`, non lancia mai, restituisce l'impostazione o l'elenco dei problemi in italiano; un parametro sconosciuto è un problema. `check…Params` dà solo i problemi, per `checkParams` nell'elenco. La verifica dei contenuti li segnala con riga (`Visualizzazione VIS.…: …`); se arrivassero nell'app, il riquadro mostra il messaggio e la lezione continua.

**Regole**

- **Solo 2D, in SVG**, con Preact: nessuna libreria nuova di grafici, nessun file caricato da internet. Tutto offline.
- **Tocco prima di tutto**: le maniglie hanno un cerchio visibile e un'area di tocco trasparente (`vis-presa`) di raggio **29 unità del disegno** (a 320 px di schermo il disegno è largo circa 250 px: 45 px di diametro); pulsanti e cursori alti almeno `var(--tocco)`. Le maniglie usano `useDragHandle`: eventi `pointer` con cattura del puntatore, aggiornamento al più una volta per fotogramma (`requestAnimationFrame`), e `touchstart` con `preventDefault` (con il solo `touch-action: none` il dito sulla maniglia faceva anche scorrere la pagina). Fuori dalle maniglie il dito scorre la pagina come sempre.
- **Larghezza da 320 px in su senza scorrimento orizzontale della pagina.** Formule e tabelle larghe stanno in un contenitore che scorre di lato; meglio ancora tenerle corte (la riga di f(x) − k mostra solo il risultato). I pulsanti hanno etichette brevi (il verso è il solo simbolo, con `aria-label` a parole).
- **Fluida su iPhone XR**: al più qualche centinaio di punti per curva; quello che non cambia mentre si trascina (il grafico di base) si calcola con `useMemo` solo quando cambia la funzione.
- **I parametri della lezione sono testo**: si leggono con `parseExpression` (che non lancia mai) e si controllano. Il test della visualizzazione legge **tutti** i parametri usati nelle lezioni vere.
- **Grafici**: dove la funzione non è definita o salta la curva si interrompe (lo fa già `plotGraph`): mai un segmento verticale che unisce i due rami. Zeri e punti notevoli mostrati vengono dal motore, esatti.
- **Numeri mostrati**: con la virgola decimale e, se approssimati, con `≈`. Dentro una formula la virgola si scrive `{,}` (`approximateLatex`): «−4, 98» con lo spazio è l'errore da non fare. Le formule con KaTeX, ottenute da `toLatex`, `setToLatex`.
- **Temi**: colori solo dalle variabili CSS dell'app (classi `vis-…` in `styles.css`), così funzionano il tema chiaro e quello scuro. Uso fissato dalla prima: retta e maniglie mobili in `--arancio`, curva ripassata in `--blu` più spessa, soluzione sull'asse in `--ese`, sonda in `--inchiostro`; nella tabella le caselle della soluzione hanno fondo `--def-fondo` **e** il simbolo ✓ (mai solo il colore).
- **Si usa anche senza trascinare**: ogni grandezza che si trascina ha anche un cursore (`Slider`) con il valore scritto.
- **Sopra il disegno solo cose che non cambiano altezza mentre si trascina** (pulsanti di scelta): formule, valori e testi che cambiano vanno sotto. Se sopra qualcosa cresce (una frazione che compare), il disegno scivola sotto il dito e la maniglia salta (visualizzazioni parte 2).
- **Formule lunghe a pezzi**: in un elenco di punti ogni punto è una formula a sé (`$A(1; 0)$, $B(0; 2)$`), così la riga va a capo; una sola formula lunga allarga la pagina a 320 px.
- **Unità uguali sui due assi** quando contano forme o simmetrie (circonferenze, coniche, $y = x$): finestra fissa con `equalScaleWindow`; il piano vuoto (assi, griglia) è `graphToSvg(emptyPlane(finestra))`.
- **Pezzi comuni per i parametri** in `src/visualizzazioni/parametri.ts`: `unknownParams`, `readStepRational` (numero a passi esatti in un intervallo, anche senza lo zero), `snapToStep`, `stepValues` (per i controlli a tappeto), `readYesNo`. Valori esatti di costanti (radici, angoli notevoli): `exactConstant` in `trasformazioni-funzioni-math.ts`.

**Nella lezione**: il blocco `:::visualizzazione{id=VIS.nome parametro=valore …}` con `:::` subito sotto, dopo gli esempi a cui si collega, con prima un paragrafo che dice che cosa provare («trascina…, guarda…»). La durata della lezione si ricalcola (un minuto in più).

**Test**: la matematica con casi singoli (gli esempi svolti della lezione si ritrovano) e un controllo a tappeto contro i valori della funzione per ogni posizione dei cursori e ogni parametro delle lezioni; il componente in jsdom (`// @vitest-environment jsdom` in cima, `act` da `preact/test-utils`, `getBoundingClientRect` finto per il trascinamento) con i parametri predefiniti, quelli di ogni lezione, pulsanti, cursori, maniglie e un parametro sbagliato; la prova in Chrome (pagina `test/app/anteprima/visualizzazioni.tsx` con la lezione vera) col dito (`page.touch`), nei due temi, a 414 e 320 px, senza rete. Con `COMPASSO_FOTO=cartella` salva le fotografie: guardarle prima di chiudere. Un file di test non si importa da un altro (ne ripeterebbe i test): gli aiuti comuni vanno in `helpers.ts`.

## Catalogo degli errori

Il catalogo è in `src/errori/` (`catalog.ts`): 65 voci iniziali in 12 categorie, dalla specifica, sezione 5, più quelle aggiunte con i generatori (7 nella sessione 3, 5 nella sessione E1 per limiti e Taylor, 18 nella sessione E2 per integrali, convergenza ed equazioni differenziali, 2 su decisione di Andrea, 4 di logica e insiemi con le lezioni di V1.M01 e 3 con i loro generatori: oggi sono 104).

- **Prima di aggiungere un errore, controllare che non esista già**: cercare per nome e per descrizione, non solo per codice. Due voci per lo stesso errore spezzano i dati di Andrea.
- Un codice ha la forma `CATEGORIA.NOME` (maiuscole, cifre e trattino basso). La categoria deve essere una delle dodici di `errorCategories`.
- Ogni voce ha tutti i campi: codice, nome, categoria, spiegazione, esempio concreto, rimando (modulo, lezione o «tutte»).
- La matematica nei testi sta tra `$...$` (LaTeX). La virgola decimale dentro una formula si scrive `{,}` (esempio: `1{,}414`).
- Ogni esempio nuovo va **verificato** (in `scripts/verifica-esempi-errori.py` si aggiunge un controllo con `@check("CODICE")`; lo script controlla anche che nessuna voce resti senza controllo).
- Il test `test/errori.test.ts` confronta il catalogo con la tabella di `docs/SPECIFICA.md`: se si aggiunge una voce al catalogo, si aggiunge anche alla tabella della specifica (e viceversa).
- `NON_CLASSIFICATO` non è una voce: è lo stato di una risposta sbagliata che non corrisponde a nessun errore.
- Il codice che parla di **un altro errore** non si usa, nemmeno se somiglia: Andrea leggerebbe la spiegazione sbagliata. La revisione 4b aveva lasciato fuori «zero doppio trattato come zero semplice» proprio perché `DISEQ.SECONDO_GRADO` parla d'altro: ora ha la sua voce, `DISEQ.ZERO_DOPPIO`.
- La tabella degli errori della specifica ha una seconda copia nel Progetto di Claude («Compasso — Specifica»): se la sessione può scriverci, la aggiorna; altrimenti lo annota in `STATO.md` perché Andrea la aggiorni.

**Per aggiungere una voce, in ordine**: la voce in `src/errori/catalog.ts`; la riga nella tabella di `docs/SPECIFICA.md`, sezione 5; il controllo `@check("CODICE")` in `scripts/verifica-esempi-errori.py`, eseguito; `npm test`; il numero di voci aggiornato qui sopra e in `STATO.md`.

## Quando un lavoro è finito

Un lavoro è finito solo se **tutte e tre** le cose sono vere:

1. compilazione (`npm run typecheck` e `npm run build`) e tutti i test (`npm test`) superati;
2. controllo automatico su GitHub verde;
3. `STATO.md` aggiornato.

Senza tutte e tre, il lavoro non è finito.

Per guardare il controllo su GitHub: `gh run list --repo andremwebdev/compasso --limit 3` (il primo deve essere `completed success` sull'ultimo commit) e, se è rosso, `gh run view <numero> --log-failed`. Su GitHub i test vanno circa tre volte più piano che in locale: un test che in locale impiega più di un secondo e mezzo ha bisogno di un tempo massimo esplicito.

Il lavoro si salva su GitHub (commit e push) dopo ogni parte completata, non solo alla fine: la capacità di una sessione può finire a metà. Modifiche piccole, descrizioni chiare, ramo principale.

## Divieti

- **Mai rinominare un codice** (errori, moduli, lezioni, generatori): progressi, diario e generatori puntano ai codici.
- **Mai cambiare il formato dei dati salvati** senza conversione e test.
- **Mai modificare il motore** mentre si lavora su un generatore: se il motore ha un limite, si annota in `STATO.md`.
- **Mai indebolire o saltare un test** per farlo passare: se un test è sbagliato lo si corregge dicendo perché, se il codice è sbagliato si corregge il codice.
- **Mai cambiare gli esercizi di un generatore già pubblicato senza deciderlo**: se cambia una riga dei semi congelati, il motivo va in `STATO.md` («Decisioni da rivedere»).
- **Mai chiudere una sessione con il controllo su GitHub rosso.**
- **Nessuna dipendenza nuova** (`npm install`) senza un motivo scritto in `STATO.md`: ogni libreria pesa sul telefono e deve funzionare offline.
- **Nessuna richiesta di rete esterna e nessun tracciamento**: niente analisi d'uso, niente caratteri o librerie caricati da internet. Tutto è incorporato o salvato sul dispositivo (i test della build lo controllano per la versione PC).

## Note tecniche dell'impalcatura

- Le due versioni nascono dallo stesso codice con `scripts/build.mjs`; la costante `__TARGET__` (`"telefono"` o `"pc"`) distingue i due casi nel codice. Il service worker si registra solo nella versione telefono.
- Il service worker (`src/app/sw.ts`) salva in anticipo tutti i file della build; la versione della cache è un hash del contenuto. Una versione nuova si usa dalla riapertura successiva (nessun `skipWaiting`, per non cambiare l'app sotto gli occhi di chi sta studiando).
- GitHub Pages serve l'app sotto `/compasso/`: nell'app si usano solo percorsi relativi.
- `src/app/sw.ts` ha un suo `tsconfig.sw.json` (libreria WebWorker) ed è escluso dal `tsconfig.json` principale.
- I file `.md` delle lezioni e le figure `.svg` si importano come testo: `loader` in `scripts/build.mjs` e `scripts/indice-contenuti.mjs`, due piccoli plugin in `vitest.config.ts`, le dichiarazioni in `src/contenuti/markdown.d.ts`.
- **Contenuti per modulo** (specifica, sezione 12). Ogni modulo ha un file `src/moduli/vN/mNN.ts` con le sue lezioni e i suoi generatori; il registro `src/moduli/index.ts` li carica con `import()` ed è **fisso** (35 righe, una per modulo: non si tocca). Versione telefono: moduli ES (`<script type="module">`, `splitting`), ogni modulo diventa `dist/telefono/moduli/vN/mNN.js` e si legge solo quando serve; il codice in comune sta in `chunks/`; il service worker salva tutto per l'uso offline. Versione PC: gli `import()` restano dentro il file unico.
- **Indice leggero** (`src/moduli/indice.ts`): per ogni modulo codici e titoli delle lezioni, prerequisiti dichiarati, termini del glossario, codici delle flashcard, e dei generatori codice, abilità, lezione, titolo, livelli, errori. Non si scrive a mano: lo calcola `scripts/indice-contenuti.mjs` (con `indexModule` di `src/moduli/indicizza.ts`) e la compilazione e Vitest lo inseriscono come costante `__CONTENT_INDEX__`. Se serve un dato nuovo senza caricare i moduli, si aggiunge lì (con il test in `test/moduli/moduli.test.ts`).
- **Due modi di leggere i contenuti**. Senza caricare nulla (indice): `lessonCodes`, `lessonInfo`, `generatorInfos`, `findGeneratorInfo`, `isWritten`, `generatorsOfModule`… bastano per navigazione, Oggi, Esercizi, diario, «Lo so già». Con il modulo caricato: `loadLesson`, `lessonSource`, `findGenerator`, `loadedGenerators` restituiscono `null`/`undefined` finché il modulo non c'è. Una schermata che ha bisogno del testo di una lezione o di generare esercizi si avvolge in `<WithModules modules={…}>{() => …}</WithModules>` (`src/app/caricamento.tsx`, mostra «Caricamento…»), come fanno `LessonView`, `ExerciseSeries`, il mazzo di flashcard, glossario e dimostrazioni. Il codice di una lezione, di un generatore, di una definizione o di una flashcard dice il suo modulo (`moduleOf`, `modulesOf`).
- Nei test `test/setup.ts` carica tutti i moduli prima di ogni file: lì `loadLesson` e `findGenerator` funzionano sempre. Il caricamento a richiesta vero lo provano `test/moduli/moduli.test.ts` e la prova in Chrome di `test/build.test.ts` (all'avvio nessun file `moduli/`, poi solo quelli usati, e tutto anche senza rete).
- La prova in Chrome usa il protocollo DevTools da `test/chrome.ts` (nessuna dipendenza): Chrome si cerca in `CHROME_PATH` o tra i nomi soliti; su GitHub c'è sempre, in locale senza Chrome quella prova si salta con un avviso.

## L'app in breve

- `src/app/state.ts`: sezione e schermata aperte (`open(...)`, `goBack()`; ogni `open` entra nella cronologia del browser, così il tasto «indietro» funziona), dati di Andrea in segnali (`attempts`, `lessonProgress`, `days`, `reviews`, `checks`, `settings`, `backupInfo`, `todaySession`), `masteries` (padronanza calcolata), e le funzioni che scrivono (`recordAttempt`, `saveLessonProgress`, `recordDay`, `recordReview`, `recordCheck`, `saveSettings`, `saveBackupInfo`, `saveTodaySession`, `replaceAllData`). Un tipo di schermata nuovo si aggiunge a `Screen` e allo `switch` di `App.tsx`.
- `src/app/programma.ts`: lezioni scritte o «in arrivo», stato di ogni lezione, moduli «Lo so già», prerequisiti mancanti, prossima lezione di un binario. Il programma viene da `src/contenuti/programma/data.ts`, **generato** da `docs/SCALETTE.md`: se cambi le scalette, rigenera con `COMPASSO_SCRIVI=1 npx vitest run test/contenuti/programma.test.ts` (il test fallisce finché il file non è allineato).
- `src/app/schermate/`: `Oggi` (sessione a cinque fasi; i conti in `src/app/oggi/plan.ts`), `Teoria` (volume, modulo, glossario), `LessonView` (la lezione a tratti; con `embedded` dentro Oggi), `Esercizi` (tre schede), `Practice` (una serie aperta da qualunque parte), `Ripasso` (mazzo di flashcard, dimostrazioni interattive), `Tu` (serie, padronanza, diario, impostazioni, backup) e `Test` (in arrivo), `checks.ts` (controllo «Lo so già»).
- `src/app/componenti/ExerciseSeries.tsx`: **l'unica** serie di esercizi (difficoltà fissa o automatica), usata da Practice e da Oggi. `ExerciseView.tsx`: **l'unica** schermata di esercizio; registra da sola il tentativo. Un tipo di risposta nuovo si aggiunge qui e in `preview.ts`.
- **Riordino**: `ReorderList.tsx` (elenco con le frecce ↑ e ↓, i fissi tratteggiati, ✓ e ✗ dopo la risposta) e `src/app/risposta/ordering.ts` (`moveItem`, `moveTarget`, `rightPlaces`) servono sia alla risposta `ordering` di `ExerciseView` sia a «riordina» delle dimostrazioni. Prove: `test/app/riordino-vista.test.ts` (jsdom) e `test/app/riordino-chrome.test.ts` (telefono simulato, pagina `test/app/anteprima/riordino.tsx`).
- `src/app/ripasso/`: `cards.ts` (flashcard automatiche da definizioni e teoremi più le manuali; dimostrazioni delle lezioni), `drill.ts` (le tre modalità: riordina, trova lo sbagliato, completa; `proofAttempt` scrive la riga del registro). Il componente `ProofDrills` (`Ripasso.tsx`) registra un tentativo per giro: alla prima risposta, e nel riordino al primo «Controlla» (spostando un passaggio l'esito sparisce: l'ordine giusto non si scopre senza controllare).
- `src/app/testo/render.ts`: `renderRichText` trasforma il testo ricco (Markdown, `$formule$`, `[[rimandi]]`) in HTML con marked e KaTeX. I motivi del parser, che possono citare quello che ha scritto Andrea, passano con `untrusted`.
- `src/app/risposta/`: `preview.ts` (anteprima con gli stessi parser della valutazione; `gridPreview` per matrici e vettori), `keys.ts` (i sei livelli della tastiera matematica e `pressKey`), `levels.ts` (`keyboardFor`: quali livelli mostrare e quale aprire per un tipo di risposta), `seeds.ts` (`freshSeed`: un seme che non ridà un esercizio già uscito nella serie).
- **Tastiera**: livelli Base, Funzioni, Insiemi, Analisi (+∞, −∞, «non esiste»), Matrici (solo con le caselle: «◂ casella», «casella ▸»), ℂ (solo con `complex`). Frazioni, potenze, radici e funzioni si scrivono **a modello**: il tasto mette le parentesi chiuse con il cursore dentro (`‸` nell'`insert`), ⇥ esce dalla casella o passa alla prossima (numeratore → denominatore, indice → radicando). Il parser legge `()` come casella vuota (□, testo incompleto). Negli Insiemi frazione e radice restano senza modello (`1/3`, `√2`). Base ha anche `n!`, `·10ⁿ` (a modello) e «periodo» (`(‸)`, dopo le cifre decimali); Funzioni ha `°`, `′`, `″` e le lettere α, β, θ. Un tasto nuovo: in `keys.ts`, con un caso nel test «la tastiera» di `test/app/moduli.test.ts` che lo scrive e lo rilegge.
- **Aspetto**: tutti i valori (colori dei due temi, caratteri, scala delle spaziature `--s-1`…`--s-7`, raggi, area di tocco) sono variabili in cima a `styles.css`; nei componenti si usano solo le variabili. `test/app/aspetto.test.ts` controlla il contrasto AA delle coppie testo/fondo e 3:1 dei contorni dei comandi (`--bordo`): una coppia nuova si aggiunge lì. Niente `opacity` sui testi. I caratteri dell'interfaccia (IBM Plex) li incorpora `scripts/build.mjs` (`UI_FONTS`); le icone le disegna `npm run icone`.
- `SET_ENDINGS` in `preview.ts` dice quando un insieme è «scritto a metà» e non sbagliato. Un test in `test/app/moduli.test.ts` scrive le risposte delle disequazioni fratte un carattere alla volta: quando un generatore nuovo ha risposte di tipo insieme con scritture nuove, aggiungi lì le sue risposte.
- Il campo di risposta è un `<input inputmode="none">`: sul telefono non apre la tastiera di sistema, sul computer accetta la tastiera fisica e Invio conferma.
- Tema: `settings.theme` mette `data-theme` sulla pagina e colora i meta `theme-color` (`THEME_COLORS` in `state.ts`, uguali a `--carta`); in `styles.css` i colori scuri valgono con `prefers-color-scheme: dark` (se non è scelto «chiaro») e con `data-theme="dark"`: i due blocchi scuri devono restare identici (il test lo controlla).

## Dati, padronanza e ripasso

- `src/dati/`: `openStore()` apre IndexedDB (ripiego: localStorage, poi memoria). `DATA_VERSION` (oggi **3**) è la versione della struttura dei dati: **quando si cambia un tipo in `types.ts` il numero sale di uno**, si aggiunge il passo in `upgrade` (`store.ts`) e in `STEPS` (`migrate.ts`), con un test che parte da dati della versione precedente. La 2 ha aggiunto giorni di studio, ripassi delle flashcard, controlli «Lo so già», impostazioni, stato del backup e sessione di Oggi (magazzino `meta` per i valori singoli). La 3 ha aggiunto i tentativi sulle dimostrazioni: contesto `dimostrazione` e campo facoltativo `proof` (teorema e modalità); nessun magazzino nuovo, i dati vecchi restano come sono.
- **Tutto si ricava dai registri** (tentativi, ripassi, controlli, giorni): padronanza, scadenze, serie e diario non sono salvati a parte. Così l'unione di due backup (`mergeData`) dà gli stessi risultati di un solo dispositivo.
- **Dimostrazioni** (contesto `dimostrazione`): nel registro con teorema e modalità, `skill` null, `error` `NON_CLASSIFICATO` se sbagliate. Non entrano nella padronanza delle abilità (un teorema non è un'abilità), nel riassunto per abilità né nel diario (le versioni sbagliate non hanno codici del catalogo); in Tu sono contate a parte. Servono alla fase 8, se si vorrà un indicatore per teorema.
- **Padronanza** (`mastery.ts`, taratura della fase 8 da fare sui dati veri): contano i tentativi tranne le domande lampo e le dimostrazioni. Merito di una risposta giusta: livello 1 = 0,7, 2 = 0,9, 3 = 1, moltiplicato per 1 / 0,75 / 0,5 con 0 / 1 / 2 indizi; sbagliate, «Non lo so» e distrazioni valgono 0. Peso di ogni risultato `0,5^(giorni/30)`; punteggio = media pesata. Livelli: nuovo (nessun risultato); consolidato con punteggio ≥ 0,65, almeno 4 risultati e una giusta di livello ≥ 2; padroneggiato con ≥ 0,85, almeno 6 risultati e due giuste di livello 3; altrimenti in apprendimento. Decadimento: oltre 60 giorni senza attività si scende di un livello (mai sotto «in apprendimento»). «Lo so già» superato vale quattro giuste di livello 2 per ogni abilità del modulo. Lezioni, moduli e volumi: media dei livelli delle abilità, per difetto.
- **Ripasso a intervalli** (abilità e flashcard): gradini 1, 3, 7, 16, 35, 90 giorni. Abilità: una giusta sale di un gradino (una volta al giorno), una sbagliata riparte da 1 giorno; «Lo so già» porta a 7. Flashcard: «subito» sale, «a fatica» resta, «non la sapevo» riparte; le mai viste delle lezioni completate sono in scadenza subito.
- **Difficoltà automatica**: dal livello di padronanza (nuovo 1, in apprendimento 2, oltre 3); in una serie scende dopo due errori di fila e sale dopo tre giuste di fila (contati dall'ultimo cambio).
- **Serie** (`streak.ts`): conta i giorni con la sessione di Oggi completata; i giorni liberi (al più due da lunedì a domenica, mai di fila) tengono la serie ma non la allungano.
- **Diario** (`diary.ts`): esclude le domande lampo e le dimostrazioni; peso che si dimezza ogni 30 giorni; andamento «stabile» se la differenza è al più 1 o un quinto.
- **Oggi** (`src/app/oggi/plan.ts`): taratura della specifica in `PHASE_MINUTES`; un esercizio vale 2 minuti, una flashcard mezzo; le fasi vuote si saltano; il binario alterna quelli attivi dopo l'ultimo giorno completato, salvo una lezione rimasta a metà.
