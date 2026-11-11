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
| `src/generatori/` | un file per generatore | `esercizi`, `motore`, `errori`, `codici` |
| `src/contenuti/` | lezioni in Markdown; in `formato/` il codice che le legge e le controlla | `codici`, `errori` |
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

**Matematica nel testo**

- Formule tra `$...$` (in riga) e `$$...$$` (a centro pagina). Un dollaro vero si scrive `\$`.
- Nei file TypeScript il LaTeX si scrive con `String.raw` (o `tex` nel catalogo errori) per non raddoppiare le barre.
- Il LaTeX di un oggetto del motore **non si scrive a mano**: si ottiene con `toLatex(expr)`, `matrixToLatex`, `limitToLatex`. Così le convenzioni italiane (virgola decimale `1{,}5`, punto di moltiplicazione solo dove serve) sono sempre le stesse.

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

- I costruttori **non semplificano**: `mul(1, x)` si mostra `1x`, `add(x, 0)` si mostra `x + 0`. Un generatore costruisce l'espressione già nella forma in cui vuole mostrarla (o, dalla sessione 2, la ripulisce con `simplify`).
- `frac(6, 8)` è il numero 3/4 (ridotto); `div(6, 8)` è la frazione scritta 6/8. `decimal("1,50")` è 3/2 mostrato come 1,50.
- `a − b` si costruisce con `sub(a, b)`; l'opposto con `neg(a)`.
- `equivalent(a, b)`: uguali ovunque sono entrambe definite. `checkForm(expr, vincolo)`: guarda solo com'è scritta.
- Vincoli di forma disponibili: `expanded`, `factored`, `reducedFraction`, `rationalized`, `simplifiedRadicals`, `algebraicForm`, `trigonometricForm`.

**Se al motore manca qualcosa** (una funzione, un vincolo, un tipo di risposta): non lo si aggira dentro un generatore e non si modifica il motore mentre si lavora sul generatore. Si annota in `STATO.md` («Problemi noti») e si passa a un altro generatore.

## Come aggiungere un generatore

*La sessione 2 aggiunge la verifica automatica; la sessione 3 aggiunge i quattro generatori di riferimento da copiare e completa questa sezione.* Lo schema è già fisso: `src/esercizi/schema.ts`.

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
4. **Tipo di risposta** (`answer.kind`): `choice`, `number`, `expression`, `set`, `limit`, `matrix`, `truefalse`, `ordering`. Si sceglie quello naturale per l'esercizio: se ha almeno tre risposte sbagliate previste, l'app può comunque mostrarlo come scelta multipla.
5. **Modalità** (solo `number`): `mode: exact` oppure `mode: approx(0.005)`. Il testo deve dirlo («arrotonda a due decimali»).
6. **Vincoli di forma**: `form: ["factored"]` solo se il testo chiede quella forma («scomponi»). La risposta giusta deve rispettarli.
7. **Risposte sbagliate previste** (`answer.wrong`): ognuna è il risultato di **un** errore tipico preciso, fatto davvero sui numeri dell'esercizio, con il suo codice. Non devono essere equivalenti alla giusta né tra loro. Almeno tre quando l'esercizio può finire in una simulazione. Se per certi numeri un errore dà per caso il risultato giusto, quella risposta si scarta (o si cambiano i numeri).
8. **Codici di errore**: devono esistere in `src/errori/` (il compilatore lo controlla) ed essere dichiarati in `errors`. Prima di aggiungerne uno nuovo: sezione «Catalogo degli errori».
9. **Passaggi** (`steps`): la soluzione completa, un'idea per passaggio, con le formule ottenute da `toLatex`. **Indizi** (`hints`): esattamente due; il primo orienta («che tipo di disequazione è?»), il secondo dice come cominciare. Nessuno dei due dà la risposta.
10. **Testo** (`prompt`): in italiano, dando del tu, con la richiesta chiara e la forma voluta.

**Lista di controllo prima di salvare**

- [ ] `npm run typecheck` passa (schema rispettato, codici di errore esistenti);
- [ ] il test del generatore prova molti semi per ogni livello (dalla sessione 2: la verifica automatica, 2.000 semi);
- [ ] la risposta giusta supera `verify` e `checkForm` per ogni vincolo dichiarato;
- [ ] nessuna risposta sbagliata è equivalente alla giusta o a un'altra sbagliata;
- [ ] testo, risposte, passaggi e indizi si disegnano con KaTeX;
- [ ] il generatore non ha toccato `src/motore/` né `src/esercizi/`.

## Come scrivere una lezione

*La sessione 3 aggiunge la lezione di riferimento e le indicazioni sul tono viste all'opera.* La sintassi è fissa; la legge e la controlla `src/contenuti/formato/` (`parseLesson`), che dice riga e motivo di ogni problema.

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

**Controllo**: `parseLesson(testo)` restituisce l'elenco dei problemi; una lezione entra nell'app solo se l'elenco è vuoto. I controlli tra file (codici unici, prerequisiti, rimandi, generatori e visualizzazioni che esistono) li fa la verifica dei contenuti (specifica, sezione 12), che parte da `lessonReferences`.

## Catalogo degli errori

Il catalogo è in `src/errori/` (`catalog.ts`): 65 voci iniziali in 12 categorie, dalla specifica, sezione 5.

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
