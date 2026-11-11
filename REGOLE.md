# REGOLE

Ogni modello che lavora su Compasso legge questo file per primo. Lo scheletro è della sessione 0 (specifica, sezione 12); la sessione 1 aggiunge la parte tecnica; ogni sessione successiva lo aggiorna se impara qualcosa di utile.

La specifica completa è in `docs/SPECIFICA.md`: è la fonte di verità su cosa costruire. Lo stato del lavoro è in `STATO.md`.

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

## Come aggiungere un generatore

*Da completare nella sessione 3, con i quattro generatori di riferimento.* Qui andranno: il modello di riferimento da copiare, la lista di controllo e la verifica automatica da superare (specifica, sezione 12, «Verifica automatica dei generatori»).

Regole già valide:

- i generatori vivono in `src/generatori/<volume>/<modulo>/`, con gli stessi codici dei contenuti;
- ogni codice di errore usato da un generatore deve esistere in `src/errori/`;
- il motore matematico (`src/motore/`) non si modifica mentre si lavora su un generatore: se ha un limite, si annota in `STATO.md`.

## Come scrivere una lezione

*Da completare nelle sessioni 1 e 3, quando esistono il parser e la prima lezione di riferimento.* Qui andranno: la sintassi dei blocchi speciali (specifica, sezione 4), il tono, l'uso del glossario, l'intestazione.

Regole già valide:

- le lezioni sono file Markdown in `src/contenuti/<volume>/<modulo>/<lezione>.md`;
- un termine del glossario si definisce in una sola lezione;
- i rimandi a errori, glossario, generatori e visualizzazioni devono puntare a elementi che esistono.

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
