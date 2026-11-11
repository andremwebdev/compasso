# STATO

Aggiornato alla fine di ogni sessione. Ultimo aggiornamento: sessione 0 (impalcatura).

## Fatto

**Sessione 0 — impalcatura (fase 1, parte standard)**

- Progetto TypeScript con Preact, @preact/signals, esbuild, Vitest, KaTeX. Struttura delle cartelle della specifica, sezione 12 (le cartelle ancora vuote hanno un `.gitkeep`).
- Due build dallo stesso codice (`npm run build`):
  - **telefono**: `dist/telefono/` a più file (circa 576 KB), con manifest, icone, service worker con salvataggio anticipato di tutti i file per l'uso offline;
  - **pc**: `dist/pc/compasso.html`, file unico di circa 646 KB, con tutto incorporato (20 caratteri KaTeX in base64, nessun riferimento esterno).
- App vuota con la barra delle cinque sezioni (Oggi, Teoria, Esercizi, Test, Tu) e una formula di prova (formula risolutiva) disegnata con KaTeX nella sezione Oggi, in entrambe le versioni.
- Workflow GitHub Actions (`.github/workflows/ci.yml`): a ogni push controlla i tipi, compila ed esegue i test; sul ramo `main`, se è tutto verde, pubblica la versione telefono su GitHub Pages e allega il file PC come artefatto scaricabile.
- `docs/SPECIFICA.md`: copia identica della specifica.
- Catalogo errori in `src/errori/`: 65 voci in 12 categorie, con tutti i campi della sezione 5 e un esempio concreto per ogni voce.
  - Verifica della matematica degli esempi: `scripts/verifica-esempi-errori.py` (sympy), 65 esempi su 65 verificati.
  - `test/errori.test.ts`: il catalogo coincide con la tabella della specifica (codici, nomi, categorie, rimandi), codici e nomi sono unici, i rimandi puntano a moduli esistenti, ogni formula si disegna con KaTeX in modalità rigorosa.
- Test: 25 test in 4 file (sezioni, formula, build end-to-end in jsdom, catalogo errori), tutti verdi in locale.
- `REGOLE.md` (scheletro della sezione 12) e questo file.

## In corso

Niente. Il lavoro della sessione 0 è in locale e completo, ma **non è stato caricato su GitHub**: vedi «Problemi noti».

## Prossimo passo

1. Chi gestisce il repository deve sbloccare il caricamento (vedi «Problemi noti») e attivare Pages (Settings → Pages → Source: **GitHub Actions**).
2. Dopo il primo push, controllare che il controllo su GitHub sia verde e che l'app vuota compaia su https://andremwebdev.github.io/compasso/. La sessione 0 non è davvero finita finché questo non è vero (REGOLE.md, «Quando un lavoro è finito»).
3. Poi **sessione 1**: motore matematico, architettura e schema dei generatori (fase 2 della specifica), con `docs/ARCHITETTURA.md` e la parte tecnica di `REGOLE.md`. Scelta della libreria Markdown (la specifica dice «sessione 0 o 1»: non è stata ancora fatta).

## Decisioni da rivedere

Decisioni prese seguendo la sezione 0 della specifica, dove il testo non decide.

1. **Versioni delle dipendenze**: installate le ultime maggiori disponibili (Preact 11, TypeScript 7, Vitest 5, esbuild 0.28, KaTeX 0.19, jsdom 31). Il `package-lock.json` le fissa. CI con Node 22.
2. **Service worker senza `skipWaiting`**: una versione nuova si usa dalla riapertura successiva, come chiede la specifica. L'avviso «versione nuova disponibile» (sezione 12) **non è ancora costruito**: è lavoro della fase 4.
3. **Percorsi relativi ovunque**, perché Pages serve il sito sotto `/compasso/`.
4. **Solo caratteri KaTeX in formato woff2** (20 file): i browser dell'iPhone XR e dei PC attuali li leggono; si evitano i formati vecchi per risparmiare spazio. Se servisse supportare browser molto vecchi, si aggiungono woff/ttf in `scripts/build.mjs`.
5. **Aspetto provvisorio**: palette (carta crema, tema chiaro e scuro automatico con `prefers-color-scheme`) e icona a compasso sono segnaposto. Il vero aspetto Compasso con i due temi e la scelta manuale è della fase 4.
6. **Catalogo errori come file TypeScript** (`as const satisfies`), non JSON: il tipo `ErrorCode` è l'unione dei codici, così un generatore che usa un codice inesistente non compila. La matematica sta in `$...$`; la virgola decimale in una formula si scrive `{,}`.
7. **Rimandi del catalogo a livello di modulo** (per esempio `V1.M04`), non di lezione, perché le lezioni non esistono ancora; «tutte» per `FORMA.*`. Si affineranno quando ci sono le lezioni.
8. **`ALG.SOMMA_QUADRATI`**: la tabella della specifica generalizza («a²+b² non si scompone nei reali»), ma non è sempre vero (`x⁴+4 = (x²+2x+2)(x²−2x+2)`). La spiegazione e l'esempio nel catalogo sono limitati al caso `x²+9`, che è corretto. La specifica andrebbe precisata in questo punto; il codice resta lo stesso.
9. **`NON_CLASSIFICATO`** è una costante esportata da `src/errori/`, non una voce del catalogo.
10. **Verifica sympy fuori da CI**: lo script Python non gira su GitHub per non aggiungere Python al controllo; va eseguito a mano quando si cambiano gli esempi (REGOLE.md lo dice).

## Domande aperte

- **IndexedDB nella versione PC** (specifica, sezione 12, «Da verificare nella sessione 0»): **non verificato**: serve un browser vero con un file aperto con doppio clic, e nella sessione 0 non c'è ancora nessun dato da salvare. Da provare a mano su un file `compasso.html` aperto con doppio clic (Safari/Chrome/Firefox) quando c'è lo strato di accesso ai dati (fase 3); altrimenti si adotta il ripiego localStorage previsto dalla specifica.
- Libreria Markdown: da scegliere nella sessione 1 (vedi sopra).

## Problemi noti

- **Push su GitHub rifiutato (HTTP 403)**: l'app Claude di GitHub non risulta installata per l'account `andremwebdev`, quindi il lavoro è solo in commit locali. Da fare: installare l'app su https://github.com/apps/claude/installations/select_target (con accesso in scrittura a `compasso`) oppure ricollegare GitHub dai connettori di claude.ai, poi rilanciare il push.
- **Controllo su GitHub e Pages mai eseguiti**: il workflow è scritto e la sintassi controllata, ma finché non c'è un push non si sa se è verde. Se la pubblicazione fallisce con un errore su Pages, quasi sempre manca l'attivazione (Settings → Pages → Source: GitHub Actions).
- Icone PNG generate con uno script (`npm run icone`): funzionali, ma provvisorie.
- `README.md` contiene solo il titolo.
