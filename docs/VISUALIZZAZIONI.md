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
