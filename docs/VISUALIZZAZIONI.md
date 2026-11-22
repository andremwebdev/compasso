# Visualizzazioni

Le schede delle undici visualizzazioni interattive (specifica, sezioni 11 e 14). Una sezione per codice, scritta **prima** del codice. Come si costruisce una visualizzazione: `REGOLE.md`, «Come aggiungere una visualizzazione».

Ogni scheda dice: che cosa si manipola, che cosa si vede, i parametri che una lezione può passare (nome, significato, valore predefinito, valori ammessi), che cosa deve far capire (dalla tabella della specifica), le lezioni che la usano.

| Codice | Modulo | Stato |
| --- | --- | --- |
| `VIS.disequazioni-grafico` | V1.M06 | fatta (visualizzazioni parte 1) |
| `VIS.trasformazioni-funzioni` | V1.M08 | da fare |
| `VIS.esponenziale-logaritmo` | V1.M09 | da fare |
| `VIS.circonferenza-goniometrica` | V1.M10 | da fare |
| `VIS.coniche-parametri` | V1.M12 | da fare |
| `VIS.limite-epsilon-delta` | V2.M04 | da fare |
| `VIS.secante-tangente` | V2.M06 | da fare |
| `VIS.taylor` | V2.M08 | da fare |
| `VIS.riemann` | V2.M09 | da fare |
| `VIS.trasformazione-lineare` | V3.M05 | da fare |
| `VIS.autovettori` | V3.M06 | da fare |

## VIS.disequazioni-grafico

**Che cosa deve far capire** (specifica 11): le soluzioni di $f(x) > k$ sono le ascisse dove il grafico di $f$ sta **sopra** la retta $y = k$ (sotto, per $<$); e la tabella dei segni dice la stessa cosa a parole: la frazione $f(x) - k$ è positiva proprio dove la curva sta sopra la retta.

**Che cosa si manipola**

- **La soglia** $k$: si trascina col dito la maniglia della retta orizzontale $y = k$ (a destra del disegno) oppure si usa il cursore «Soglia». Passo $\tfrac12$: la soglia è sempre un numero esatto, così zeri e soluzione restano esatti.
- **La funzione**: se la lezione ne passa più di una, si sceglie con i pulsanti sopra il disegno.
- **Il verso**: quattro pulsanti, $>$, $\ge$, $<$, $\le$.
- **La sonda**: un punto che si trascina lungo l'asse $x$ (maniglia in basso) oppure con il cursore «Sonda». Mostra $x$, $f(x)$ (con $\approx$) e se in quel punto la curva sta sopra, sotto o sulla retta; nella tabella si illumina la colonna in cui cade.

**Che cosa si vede**

- Il grafico di $f$ disegnato dal motore come i grafici statici (`plotGraph`, `graphToSvg`): assi, griglia, asintoti verticali tratteggiati, buchi.
- La retta $y = k$, arancione, con la sua maniglia e il valore.
- Il tratto della curva che risolve la disequazione, ripassato più spesso (il resto resta sottile): «sopra» o «sotto» si vede.
- I punti in cui la curva incontra la retta ($f(x) = k$), esatti.
- Sull'asse $x$ la soluzione come barre spesse, con gli estremi pieni (inclusi) o vuoti (esclusi). Gli asintoti e i buchi non sono mai inclusi.
- Sotto il disegno: $f(x) - k$ ridotta a una sola frazione $\dfrac{N(x)}{D(x)}$, la **tabella dei segni** di $N$ e $D$ con l'ultima riga, le colonne della soluzione segnate (sfondo e simbolo ✓, mai solo il colore), la soluzione $S$ scritta come insieme.
- Tutto si aggiorna mentre si trascina.

**Parametri della lezione** (nel blocco `:::visualizzazione{id=VIS.disequazioni-grafico …}`)

| Nome | Significato | Predefinito | Valori ammessi |
| --- | --- | --- | --- |
| `funzione` | la funzione $f$, oppure da 2 a 4 funzioni separate da `;` (la prima è quella iniziale) | `(x-1)/(x+2)` | funzioni razionali di $x$ (frazioni di polinomi) con numeratore e denominatore di grado al più 2, non costanti; scritte come le legge `parseExpression` |
| `soglia` | il valore iniziale di $k$ | `0` | un multiplo di $\tfrac12$ (`1`, `-3/2`, `2,5`) compreso tra y minimo e y massimo della finestra |
| `verso` | il verso iniziale | `>` | `>`, `>=`, `<`, `<=` (anche `≥`, `≤`) |
| `finestra` | la parte di piano mostrata, come nel blocco `grafico` | `-6; 6; -4; 4` | quattro numeri: x minimo; x massimo; y minimo; y massimo |

Il grado al più 2 garantisce che gli zeri di $N(x) - k\,D(x)$ il motore li trovi sempre esatti, per ogni soglia del cursore. Un parametro sbagliato è un problema della verifica dei contenuti; se arrivasse nell'app, il riquadro mostra il messaggio e la lezione continua.

**Lezioni che la usano**

- `V1.M06.L04` «Disequazioni fratte», dopo gli esempi svolti: le tre funzioni degli esempi ($\dfrac{x-1}{x+2}$, $\dfrac{x+1}{x-2}$, $\dfrac{x^2-5x+6}{x+1}$), verso $\ge$, soglia $0$.
- Candidate (da decidere nelle loro sessioni): le lezioni di V1.M06 sulle disequazioni di secondo grado e sul segno di un prodotto (`V1.M06.L02`, `V1.M06.L03`), con funzioni polinomiali.

## VIS.trasformazioni-funzioni

**Che cosa deve far capire** (specifica 11): come cambia il grafico di $y = a\,f\big(b(x - c)\big) + d$ rispetto a quello di $f$: traslazioni, dilatazioni e simmetrie, **compreso il verso della traslazione orizzontale** (in $f(x - 2)$ c'è un meno, ma il grafico va a destra).

**Che cosa si manipola**

- **I quattro numeri** $a$, $b$, $c$, $d$, ognuno con il suo cursore (passo $\tfrac12$: sono sempre numeri esatti). $a$ e $b$ non sono mai $0$ (il cursore lo salta).
- **Il punto $P'$**: si trascina col dito l'immagine del punto di riferimento $P$ del grafico di $f$; trascinarlo cambia $c$ e $d$ (traslazione), a passi di $\tfrac12$.
- **La funzione** $f$: se la lezione ne passa più di una, si sceglie con i pulsanti sopra il disegno.

**Che cosa si vede**

- Il grafico di $f$ sottile e tratteggiato (il grafico di partenza) e, sopra, quello di $y = a\,f\big(b(x - c)\big) + d$, blu e spesso, con i suoi asintoti verticali; dove la funzione non è definita la curva si interrompe.
- Il punto $P\big(x_0; f(x_0)\big)$ sul grafico di partenza, la freccia tratteggiata e la sua immagine $P'\big(c + \tfrac{x_0}{b};\ a\,f(x_0) + d\big)$, esatti (scritti sotto il disegno).
- La formula della funzione trasformata con i numeri al posto delle lettere.
- L'elenco delle trasformazioni, **nell'ordine in cui si applicano**: dilatazione orizzontale (e simmetria rispetto all'asse $y$ se $b < 0$), traslazione orizzontale con il verso a parole, dilatazione verticale (e simmetria rispetto all'asse $x$ se $a < 0$), traslazione verticale. Se tutti i numeri sono «neutri» ($a = b = 1$, $c = d = 0$) lo dice.

**Parametri della lezione** (nel blocco `:::visualizzazione{id=VIS.trasformazioni-funzioni …}`)

| Nome | Significato | Predefinito | Valori ammessi |
| --- | --- | --- | --- |
| `funzione` | la funzione $f$ di partenza, oppure da 2 a 4 funzioni separate da `;` (la prima è quella iniziale) | `x^2; abs(x); sqrt(x); 1/x` | funzioni di $x$ che il blocco `grafico` sa disegnare, definite (con un valore esatto) in almeno uno dei punti $1$, $2$, $0$, $-1$: il primo dei quattro è $x_0$ |
| `a`, `b` | i valori iniziali di $a$ e $b$ | `1` | multipli di $\tfrac12$ tra $-3$ e $3$, diversi da $0$ |
| `c`, `d` | i valori iniziali di $c$ e $d$ | `0` | multipli di $\tfrac12$ tra $-5$ e $5$ |
| `cursori` | quali cursori mostrare (gli altri numeri restano al valore iniziale) | `a; b; c; d` | da una a quattro lettere tra `a`, `b`, `c`, `d`, separate da `;`; senza `c` e `d` il punto $P'$ non si trascina |
| `finestra` | la parte di piano mostrata, come nel blocco `grafico` | `-6; 6; -4; 4` | quattro numeri: x minimo; x massimo; y minimo; y massimo |

**Lezioni che la usano**

- `V1.M08.L08` «Trasformazioni dei grafici» (quando sarà scritta): per esempio prima solo `cursori="c; d"` con $f(x) = x^2$ (traslazioni, il verso di $c$), poi tutti e quattro con le funzioni elementari di `V1.M08.L07`.
- Candidata: `V1.M10.L04` (grafici di seno e coseno trasformati), con `funzione="sin(x); cos(x)"` e una finestra più larga.

## VIS.esponenziale-logaritmo

**Che cosa deve far capire** (specifica 11): i grafici di $y = a^x$ e di $y = \log_a x$ sono **simmetrici rispetto alla retta $y = x$** (uno scambia le coordinate dell'altro); per $a > 1$ entrambe le funzioni sono crescenti, per $0 < a < 1$ entrambe decrescenti; dominio e immagine dell'una sono immagine e dominio dell'altra; con $a = 1$ non c'è niente da invertire.

**Che cosa si manipola**

- **La base** $a$, con un cursore che passa per valori esatti: $\tfrac15, \tfrac14, \tfrac13, \tfrac12, \tfrac23, \tfrac34, 1, \tfrac43, \tfrac32, 2, e, 3, 4, 5$.
- **Il punto $P$** sul grafico dell'esponenziale: si trascina col dito la maniglia in basso (lungo l'asse $x$) oppure si usa il cursore «Punto» ($t$ tra $-3$ e $3$, a passi di $0{,}1$).

**Che cosa si vede**

- Il grafico di $y = a^x$ (blu, continuo), quello di $y = \log_a x$ (arancione, tratteggiato) e la retta $y = x$ (verde, a puntini), disegnati dal motore come i grafici statici, con le **unità uguali sui due assi** (altrimenti la simmetria non si vede).
- I punti esatti $(0; 1)$ e $(1; a)$ sull'esponenziale, $(1; 0)$ e $(a; 1)$ sul logaritmo.
- $P(t; a^t)$, il suo simmetrico $P'(a^t; t)$ sul logaritmo, il segmento $PP'$ tratteggiato (perpendicolare a $y = x$) e il suo punto medio sulla retta; i valori approssimati con $\approx$.
- Sotto il disegno: crescente o decrescente (a parole, con il motivo: $a > 1$ o $0 < a < 1$), dominio, immagine e asintoto di ognuna delle due funzioni.
- Con $a = 1$: $y = 1^x = 1$ è costante, il suo simmetrico è la retta verticale $x = 1$, che non è il grafico di una funzione: il logaritmo in base $1$ non esiste (scritto sotto il disegno).

**Parametri della lezione** (nel blocco `:::visualizzazione{id=VIS.esponenziale-logaritmo …}`)

| Nome | Significato | Predefinito | Valori ammessi |
| --- | --- | --- | --- |
| `base` | la base iniziale $a$ | `2` | uno dei valori del cursore: `1/5`, `1/4`, `1/3`, `1/2`, `2/3`, `3/4`, `1`, `4/3`, `3/2`, `2`, `e`, `3`, `4`, `5` |
| `punto` | la posizione iniziale $t$ di $P$ | `1` | un multiplo di $0{,}1$ tra $-3$ e $3$ |
| `logaritmo` | se mostrare il logaritmo (e la retta $y = x$, il punto $P'$, la simmetria) | `sì` | `sì` oppure `no` |

La finestra non è un parametro: è fissa (x tra $-4$ e $6$), con le unità uguali sui due assi.

**Lezioni che la usano**

- `V1.M09.L01` «Funzione esponenziale» (quando sarà scritta), con `logaritmo=no`: solo $a^x$, crescenza e decrescenza al variare della base.
- Candidata: `V1.M09.L03` «Logaritmi» (o la lezione sulla funzione logaritmica), con il logaritmo e la simmetria.

## VIS.circonferenza-goniometrica

**Che cosa deve far capire** (specifica 11): il coseno e il seno di un angolo sono l'**ascissa** e l'**ordinata** del punto $P$ della circonferenza goniometrica (segmenti sugli assi); la tangente è l'ordinata del punto in cui la retta $OP$ incontra la retta $x = 1$; i **segni** dipendono dal quadrante; gradi e radianti sono due misure dello stesso angolo.

**Che cosa si manipola**

- **Il punto $P$** sulla circonferenza: si trascina col dito. Vicino ai multipli di $15^\circ$ (entro $4^\circ$) si aggancia a loro, altrove va a gradi interi.
- **L'angolo** con il cursore «Angolo», da $0^\circ$ a $360^\circ$ a passi di $1^\circ$.

**Che cosa si vede**

- La circonferenza di raggio $1$ con centro nell'origine, con le unità uguali sui due assi, i numeri dei quadranti (I, II, III, IV).
- Il raggio $OP$ e l'arco dell'angolo $\alpha$ a partire dal semiasse positivo delle $x$, in verso antiorario.
- Il **coseno** come segmento sull'asse $x$ (blu) e il **seno** come segmento verticale fino a $P$ (verde), con il nome scritto accanto (non solo il colore); le proiezioni tratteggiate.
- La **tangente** (se la lezione la mostra): la retta $x = 1$, il punto $T$ in cui la retta $OP$ la incontra e il segmento da $(1; 0)$ a $T$ (arancione). A $90^\circ$ e $270^\circ$ la retta $OP$ è parallela a $x = 1$: la tangente non esiste, e lo dice.
- Sotto il disegno: $\alpha$ in gradi e in radianti affiancati ($30^\circ = \tfrac{\pi}{6}$), $\cos\alpha$, $\sin\alpha$, $\tan\alpha$ **esatti** per i multipli di $15^\circ$ (dal motore), approssimati con $\approx$ negli altri casi; la tabella dei segni nei quattro quadranti con la colonna del quadrante di $P$ segnata (fondo e ✓), e la frase «$P$ è nel II quadrante: …» oppure «$P$ è sull'asse …».

**Parametri della lezione** (nel blocco `:::visualizzazione{id=VIS.circonferenza-goniometrica …}`)

| Nome | Significato | Predefinito | Valori ammessi |
| --- | --- | --- | --- |
| `angolo` | l'angolo iniziale, in gradi | `30` | un numero intero da `0` a `360` |
| `tangente` | se mostrare la tangente (retta $x = 1$, punto $T$, riga nella tabella) | `sì` | `sì` oppure `no` |

La finestra non è un parametro: è fissa, con le unità uguali sui due assi.

**Lezioni che la usano**

- `V1.M10.L02` «Circonferenza goniometrica, seno e coseno» (quando sarà scritta), con `tangente=no`.
- Candidata: `V1.M10.L03` «Tangente», con la tangente.

## VIS.coniche-parametri

**Che cosa deve far capire** (specifica 11): come cambiano **forma, assi e fuochi** di circonferenza, parabola, ellisse e iperbole quando cambiano i coefficienti della loro equazione.

**Che cosa si manipola**

- **La conica**: se la lezione ne lascia più di una, si sceglie con i pulsanti sopra il disegno.
- **I coefficienti**, ognuno con il suo cursore, sempre numeri esatti:
  - circonferenza $x^2 + y^2 + ax + by + c = 0$: $a$, $b$ interi tra $-6$ e $6$, $c$ intero tra $-12$ e $12$;
  - parabola $y = ax^2 + bx + c$: $a$ multiplo di $\tfrac12$ tra $-3$ e $3$, mai $0$; $b$, $c$ interi tra $-6$ e $6$;
  - ellisse $\dfrac{x^2}{a^2} + \dfrac{y^2}{b^2} = 1$: $a$, $b$ multipli di $\tfrac12$ tra $\tfrac12$ e $6$;
  - iperbole $\dfrac{x^2}{a^2} - \dfrac{y^2}{b^2} = \pm 1$: $a$, $b$ come l'ellisse, più due pulsanti per il secondo membro ($1$: fuochi sull'asse $x$; $-1$: fuochi sull'asse $y$).
- **I vertici** dell'ellisse e dell'iperbole sugli assi: si trascinano col dito e cambiano $a$ e $b$.

**Che cosa si vede**

- La conica (blu, spessa) nel piano dei grafici statici, con le **unità uguali** sui due assi (una circonferenza è rotonda).
- I fuochi (arancioni, con il nome), il centro o il vertice, gli assi di simmetria tratteggiati, la direttrice della parabola, gli asintoti dell'iperbole.
- Sotto il disegno: l'equazione con i numeri, e gli elementi **esatti** dal motore: centro e raggio; vertice, fuoco, direttrice, asse e concavità; vertici, fuochi ($c = \sqrt{a^2 - b^2}$ o $\sqrt{a^2 + b^2}$, con la radice semplificata) ed eccentricità; asintoti. I casi particolari sono detti a parole: circonferenza con $r^2 < 0$ (nessun punto) o $r^2 = 0$ (un punto), ellisse con $a = b$ (è una circonferenza), iperbole equilatera.

**Parametri della lezione** (nel blocco `:::visualizzazione{id=VIS.coniche-parametri …}`)

| Nome | Significato | Predefinito | Valori ammessi |
| --- | --- | --- | --- |
| `coniche` | le coniche tra cui scegliere, separate da `;` | `circonferenza; parabola; ellisse; iperbole` | da una a quattro tra `circonferenza`, `parabola`, `ellisse`, `iperbole`, senza ripetizioni |
| `conica` | la conica iniziale | la prima di `coniche` | una di quelle in `coniche` |
| `coefficienti` | i coefficienti iniziali della conica iniziale, separati da `;` | circonferenza `-2; 2; -7`, parabola `1/2; -1; -2`, ellisse `4; 2`, iperbole `2; 1; 1` | tre numeri per circonferenza e parabola ($a$; $b$; $c$), due per l'ellisse ($a$; $b$), tre per l'iperbole ($a$; $b$; `1` oppure `-1`), negli intervalli dei cursori |

Le altre coniche partono dai loro valori predefiniti. La finestra non è un parametro: è fissa (x tra $-7$ e $7$), con le unità uguali.

**Lezioni che la usano**

- `V1.M12.L06` «La parabola» (quando sarà scritta), con `coniche=parabola`.
- `V1.M12.L08` «L'iperbole», con tutte e quattro e `conica=iperbole`.
