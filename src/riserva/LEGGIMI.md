# Dimostrazioni di riserva

Teoremi già enunciati e dimostrati nel formato delle dimostrazioni interattive (specifica, sezione 4), in attesa della lezione che li ospiterà. Non entrano nell'app: l'app legge solo `src/contenuti/`.

**Come si usano.** Ogni file `src/riserva/<volume>/<modulo>/tNN.md` contiene il blocco `teorema` e subito dopo il blocco `dimostrazione`. Chi scrive la lezione:

1. incolla il contenuto del file nella lezione, così com'è, nel punto del teorema;
2. **cancella il file di riserva** e la sua riga qui sotto (il test `test/contenuti/riserva.test.ts` fallisce finché il teorema esiste in due posti);
3. trasforma in rimandi `[[…]]` i risultati della colonna «Usa», quando le lezioni che li contengono esistono e sono tra i prerequisiti;
4. confronta la dimostrazione con il libro di testo di Andrea (`REGOLE.md`, «Come scrivere una dimostrazione») e lo annota in `STATO.md`.

I codici dei teoremi sono assegnati (`STATO.md`, «Codici assegnati»): non si rinominano.

| Teorema | File | Strada della dimostrazione | Usa (da collegare con `[[…]]`) |
| --- | --- | --- | --- |
| `V2.M05.T01` | `v2/m05/t01.md` — teorema degli zeri | bisezione | successioni monotone e limitate, limite di una differenza, continuità per successioni, permanenza del segno per le successioni (V2.M03, V2.M05) |
| `V2.M05.T02` | `v2/m05/t02.md` — teorema di Weierstrass | successione che tende all'estremo superiore, poi Bolzano-Weierstrass | estremo superiore e sue proprietà (V2.M01), teorema del confronto, Bolzano-Weierstrass, limite delle sottosuccessioni, unicità del limite (V2.M03), continuità per successioni (V2.M05) |
| `V2.M06.T01` | `v2/m06/t01.md` — teorema di Fermat | segno del rapporto incrementale a destra e a sinistra | punto di massimo e di minimo locale, derivata come limite del rapporto incrementale, limite destro e sinistro, permanenza del segno per i limiti (V2.M04, V2.M06) |
| `V2.M06.T02` | `v2/m06/t02.md` — teorema di Rolle | Weierstrass, poi Fermat nel punto di estremo interno | `[[V2.M05.T02]]` e `[[V2.M06.T01]]` (già collegati), derivata di una costante (V2.M06) |
| `V2.M06.T03` | `v2/m06/t03.md` — teorema di Lagrange | funzione ausiliaria $g$ e teorema di Rolle | `[[V2.M06.T02]]` (già collegato), continuità e derivabilità di somme e polinomi, derivata di una differenza (V2.M05, V2.M06) |
