import { describe, expect, it } from "vitest";
import { lessonReferences, parseLesson, splitInline, unbalancedMath } from "../../src/contenuti/formato";

/** Lezione di prova: serve solo a provare la sintassi, non è un contenuto dell'app. */
const sample = String.raw`---
codice: V2.M06.L04
titolo: Il teorema di Lagrange
obiettivo: Enunciare e dimostrare il teorema di Lagrange e usarlo su una funzione concreta.
prerequisiti: [V2.M06.L03, V2.M05.L02]
durata: 15
abilita: [V2.M06.A04]
termini: [punto-di-lagrange, corda]
---

Hai già visto il [[V2.M06.T02]]. Ora togliamo l'ipotesi $f(a) = f(b)$: costa \$0, ma serve un'idea.

:::glossario{termine=corda nome="Corda di un grafico"}
Il segmento che unisce due punti del grafico di una funzione.
:::

:::definizione{id=V2.M06.D05 nome="Punto di Lagrange" termine=punto-di-lagrange}
Un punto $c \in (a, b)$ in cui $f'(c) = \dfrac{f(b)-f(a)}{b-a}$.
:::

:::teorema{id=V2.M06.T03 nome="Teorema di Lagrange"}
Se $f$ è continua in $[a, b]$ e derivabile in $(a, b)$, esiste almeno un [[punto-di-lagrange|punto di Lagrange]].
:::

:::dimostrazione{di=V2.M06.T03}
L'idea: togliere a $f$ la [[corda]].

::passo{fisso}
Poni $g(x) = f(x) - \dfrac{f(b)-f(a)}{b-a}(x-a)$.
::perche
È $f$ meno la retta per gli estremi.
::passo
$g(a) = g(b) = f(a)$.
::perche
Basta sostituire.
::sbagliato
$g(a) = g(b) = 0$.
::motivo
In $a$ il termine sottratto vale $0$, quindi $g(a) = f(a)$.
::passo
Esiste $c$ con $g'(c) = 0$.
::perche
Per il teorema di Rolle applicato a $g$.
::sbagliato
Esiste $c$ con $g(c) = 0$.
::motivo
Rolle parla della derivata, non della funzione.
::sbagliato
Per ogni $c$ vale $g'(c) = 0$.
::motivo
Rolle garantisce almeno un punto, non tutti.
:::

:::esempio{titolo="Una parabola"}
Per $f(x) = x^2$ in $[0, 2]$: $f'(c) = 2c = 2$, quindi $c = 1$.
:::

:::attenzione{errore=AN.HOPITAL_IPOTESI}
Le ipotesi contano: senza derivabilità il teorema non vale.
:::

:::domanda
Per $f(x) = x^2$ in $[1, 3]$ il punto di Lagrange è:

- [ ] $c = 1$
- [x] $c = 2$
- [ ] $c = 4$ {errore=AN.PUNTO_CRITICO}

::spiegazione
$2c = \dfrac{9-1}{3-1} = 4$, quindi $c = 2$.
:::

:::domanda{generatore=V2.M06.A04.g1 livello=2}
:::

:::visualizzazione{id=VIS.secante-tangente funzione="x^2" h=0.5}
:::

:::flashcard{id=V2.M06.F05}
Quali sono le ipotesi del teorema di Lagrange?
::retro
$f$ continua in $[a, b]$ e derivabile in $(a, b)$.
:::

:::riepilogo
Tra due punti del grafico c'è sempre un punto dove la tangente è parallela alla corda.
:::
`;

/** La lezione di prova con una modifica. */
const changed = (from: string, to: string): string => {
  if (!sample.includes(from)) throw new Error(`Testo non trovato: ${from}`);
  return sample.replace(from, to);
};
const problemsOf = (source: string): string[] => parseLesson(source).problems.map((problem) => problem.message);

describe("lettura di una lezione", () => {
  const { lesson, problems } = parseLesson(sample);

  it("la lezione di prova è valida", () => {
    expect(problems).toEqual([]);
  });

  it("legge l'intestazione", () => {
    expect(lesson?.meta).toEqual({
      code: "V2.M06.L04",
      title: "Il teorema di Lagrange",
      goal: "Enunciare e dimostrare il teorema di Lagrange e usarlo su una funzione concreta.",
      prerequisites: ["V2.M06.L03", "V2.M05.L02"],
      minutes: 15,
      skills: ["V2.M06.A04"],
      terms: ["punto-di-lagrange", "corda"],
    });
  });

  it("riconosce i blocchi nell'ordine", () => {
    expect(lesson?.blocks.map((block) => block.kind)).toEqual([
      "text", "glossary", "definition", "theorem", "proof", "example", "warning", "question", "question", "visualization", "flashcard", "summary",
    ]);
  });

  it("legge definizione, teorema, attenzione, esempio", () => {
    const [, glossary, definition, theorem, , example, warning] = lesson?.blocks ?? [];
    expect(glossary).toMatchObject({ kind: "glossary", term: "corda", name: "Corda di un grafico" });
    expect(definition).toMatchObject({ kind: "definition", id: "V2.M06.D05", name: "Punto di Lagrange", term: "punto-di-lagrange" });
    expect(theorem).toMatchObject({ kind: "theorem", id: "V2.M06.T03", name: "Teorema di Lagrange" });
    expect(example).toMatchObject({ kind: "example", title: "Una parabola" });
    expect(warning).toMatchObject({ kind: "warning", error: "AN.HOPITAL_IPOTESI", line: 58 });
  });

  it("legge la dimostrazione con passaggi, giustificazioni e versioni sbagliate", () => {
    const proof = lesson?.blocks[4];
    expect(proof?.kind).toBe("proof");
    if (proof?.kind !== "proof") return;
    expect(proof.of).toBe("V2.M06.T03");
    expect(proof.intro).toBe("L'idea: togliere a $f$ la [[corda]].");
    expect(proof.steps.map((step) => [step.fixed, step.wrong.length])).toEqual([[true, 0], [false, 1], [false, 2]]);
    expect(proof.steps[1]).toEqual({
      text: "$g(a) = g(b) = f(a)$.",
      reason: "Basta sostituire.",
      fixed: false,
      wrong: [{ text: "$g(a) = g(b) = 0$.", reason: "In $a$ il termine sottratto vale $0$, quindi $g(a) = f(a)$." }],
    });
  });

  it("legge le domande lampo, scritte a mano e da generatore", () => {
    const [manual, generated] = (lesson?.blocks ?? []).filter((block) => block.kind === "question");
    expect(manual?.kind === "question" && manual.source).toEqual({
      type: "manual",
      prompt: "Per $f(x) = x^2$ in $[1, 3]$ il punto di Lagrange è:",
      options: [
        { content: "$c = 1$", correct: false },
        { content: "$c = 2$", correct: true },
        { content: "$c = 4$", correct: false, error: "AN.PUNTO_CRITICO" },
      ],
      explanation: String.raw`$2c = \dfrac{9-1}{3-1} = 4$, quindi $c = 2$.`,
    });
    expect(generated?.kind === "question" && generated.source).toEqual({ type: "generator", generator: "V2.M06.A04.g1", level: 2 });
  });

  it("legge visualizzazione (con parametri) e flashcard", () => {
    expect(lesson?.blocks[9]).toMatchObject({ kind: "visualization", id: "VIS.secante-tangente", params: { funzione: "x^2", h: "0.5" } });
    expect(lesson?.blocks[10]).toMatchObject({
      kind: "flashcard",
      id: "V2.M06.F05",
      front: "Quali sono le ipotesi del teorema di Lagrange?",
      back: "$f$ continua in $[a, b]$ e derivabile in $(a, b)$.",
    });
  });

  it("elenca tutto ciò a cui la lezione rimanda", () => {
    expect(lesson && lessonReferences(lesson)).toEqual({
      terms: ["corda", "punto-di-lagrange"],
      lessons: ["V2.M05.L02", "V2.M06.L03"],
      definitions: [],
      theorems: ["V2.M06.T02", "V2.M06.T03"],
      errors: ["AN.HOPITAL_IPOTESI", "AN.PUNTO_CRITICO"],
      generators: ["V2.M06.A04.g1"],
      visualizations: ["VIS.secante-tangente"],
    });
  });

  it("accetta i fine riga di Windows e ignora :: e ::: dentro i blocchi di codice", () => {
    expect(parseLesson(sample.replace(/\n/g, "\r\n")).problems).toEqual([]);
    const withCode = changed("Hai già visto", "```\n:::non-un-blocco\n::nemmeno\n```\n\nHai già visto");
    expect(parseLesson(withCode).problems).toEqual([]);
  });
});

describe("controllo di una lezione", () => {
  it.each([
    ["senza intestazione", sample.replace(/^---\n/, ""), "La lezione deve cominciare con l'intestazione, tra due righe «---»."],
    ["codice malformato", changed("codice: V2.M06.L04", "codice: V2.M6.L4"), "«V2.M6.L4» non è un codice di lezione (esempio: V1.M06.L04)."],
    ["chiave mancante", changed("durata: 15\n", ""), "Nell'intestazione manca «durata»."],
    ["chiave sconosciuta", changed("durata: 15", "durata: 15\nautore: Fable"), "Chiave sconosciuta nell'intestazione: «autore»."],
    ["durata fuori misura", changed("durata: 15", "durata: 45"), "La durata deve essere un numero intero di minuti tra 10 e 20."],
    ["prerequisito malformato", changed("[V2.M06.L03, V2.M05.L02]", "[V2.M06.A03]"), "«V2.M06.A03» non è un codice di lezione."],
    ["elenco senza quadre", changed("abilita: [V2.M06.A04]", "abilita: V2.M06.A04"), "«abilita» deve essere un elenco tra parentesi quadre, anche vuoto: []."],
    ["abilità di un altro modulo", changed("abilita: [V2.M06.A04]", "abilita: [V2.M05.A04]"), "L'abilità V2.M05.A04 non è del modulo della lezione."],
    ["blocco sconosciuto", changed(":::esempio{titolo=\"Una parabola\"}", ":::esempi"), "Blocco sconosciuto: «esempi». Blocchi disponibili: definizione, teorema, dimostrazione, esempio, attenzione, domanda, visualizzazione, flashcard, glossario, riepilogo."],
    ["blocco non chiuso", changed("senza derivabilità il teorema non vale.\n:::", "senza derivabilità il teorema non vale."), "Il blocco «attenzione» aperto alla riga 58 non è chiuso: i blocchi non si annidano."],
    ["chiusura in più", changed(":::riepilogo", ":::\n\n:::riepilogo"), "C'è una chiusura «:::» senza un blocco aperto."],
    ["attributo sconosciuto", changed("{id=V2.M06.T03 nome=\"Teorema di Lagrange\"}", "{id=V2.M06.T03 nome=\"Teorema di Lagrange\" autore=Lagrange}"), "Il blocco «teorema» non ha l'attributo «autore»."],
    ["attributo mancante", changed("{id=V2.M06.T03 nome=\"Teorema di Lagrange\"}", "{id=V2.M06.T03}"), "Nel blocco «teorema» manca il valore dell'attributo «nome»."],
    ["codice di un altro modulo", changed("id=V2.M06.D05", "id=V2.M05.D05"), "Il codice V2.M05.D05 non appartiene al modulo della lezione (V2.M06)."],
    ["codice ripetuto", changed(":::esempio{titolo=\"Una parabola\"}", ":::teorema{id=V2.M06.T03 nome=\"Doppione\"}"), "Il codice V2.M06.T03 è già usato alla riga 21."],
    ["errore inesistente", changed("errore=AN.HOPITAL_IPOTESI", "errore=AN.INVENTATO"), "Il codice di errore «AN.INVENTATO» non esiste nel catalogo."],
    ["termine non dichiarato", changed("termini: [punto-di-lagrange, corda]", "termini: [punto-di-lagrange]"), "Il termine «corda» non è tra i «termini» dell'intestazione."],
    ["termine non definito", changed(" termine=punto-di-lagrange}", "}"), "Il termine «punto-di-lagrange» è nell'intestazione ma nessun blocco lo definisce (definizione con termine=… oppure glossario)."],
    ["dimostrazione senza teorema", changed("di=V2.M06.T03", "di=V2.M06.T09"), "La dimostrazione di V2.M06.T09 deve venire dopo il suo teorema, nella stessa lezione."],
    ["passaggio senza giustificazione", changed("::perche\nBasta sostituire.\n", ""), "Sezione «::sbagliato» fuori posto. In una dimostrazione l'ordine è: ::passo, ::perche, poi eventuali coppie ::sbagliato e ::motivo."],
    ["versione sbagliata senza motivo", changed("::motivo\nRolle garantisce almeno un punto, non tutti.\n", ""), "L'ultima versione sbagliata non ha il motivo (::motivo)."],
    ["una sola versione sbagliata in tutto", changed("::sbagliato\n$g(a) = g(b) = 0$.\n::motivo\nIn $a$ il termine sottratto vale $0$, quindi $g(a) = f(a)$.\n", ""), "Almeno due passaggi della dimostrazione devono avere una versione sbagliata (::sbagliato con ::motivo)."],
    ["domanda senza opzione giusta", changed("- [x] $c = 2$", "- [ ] $c = 2$"), "Una domanda ha esattamente un'opzione giusta, segnata con [x]."],
    ["domanda senza spiegazione", changed("::spiegazione\n$2c = \\dfrac{9-1}{3-1} = 4$, quindi $c = 2$.\n", ""), "La domanda non ha la spiegazione (sezione «::spiegazione»)."],
    ["livello non valido", changed("livello=2", "livello=5"), "Il livello di una domanda deve essere 1, 2 o 3."],
    ["generatore malformato", changed("generatore=V2.M06.A04.g1", "generatore=V2.M06.A04"), "«V2.M06.A04» non è un codice di generatore (esempio: V1.M06.A04.g1)."],
    ["flashcard senza retro", changed("::retro\n$f$ continua in $[a, b]$ e derivabile in $(a, b)$.\n", ""), "La flashcard non ha il dietro (sezione «::retro»)."],
    ["senza riepilogo", changed(":::riepilogo\nTra due punti del grafico c'è sempre un punto dove la tangente è parallela alla corda.\n:::\n", ""), "La lezione deve avere esattamente un blocco «riepilogo»."],
    ["riepilogo non in fondo", sample + "\nUna frase dopo il riepilogo.\n", "Il «riepilogo» deve essere l'ultimo blocco della lezione."],
    ["formula non chiusa", changed("quindi $c = 1$.", "quindi $c = 1."), "C'è una formula aperta e non chiusa (un $ spaiato). Un dollaro vero si scrive \\$."],
    ["rimando non riconoscibile", changed("[[corda]]", "[[La Corda]]"), "Il rimando [[La Corda]] non è un termine del glossario né un codice di lezione, definizione o teorema."],
    ["blocco vuoto", changed("Le ipotesi contano: senza derivabilità il teorema non vale.\n", ""), "Il blocco «attenzione» è vuoto."],
  ])("segnala: %s", (_name, source, message) => {
    expect(problemsOf(source)).toContain(message);
  });

  it("indica la riga del problema", () => {
    const { problems } = parseLesson(changed("errore=AN.HOPITAL_IPOTESI", "errore=AN.INVENTATO"));
    expect(problems).toEqual([{ line: 58, message: "Il codice di errore «AN.INVENTATO» non esiste nel catalogo." }]);
  });
});

describe("testo in riga", () => {
  it("separa testo, formule e rimandi", () => {
    expect(splitInline("Se $a_1 > 0$ vedi [[segno-di-una-frazione|il segno]] e [[V1.M06.L03]]: $$x^2$$ fine.")).toEqual([
      { kind: "text", text: "Se " },
      { kind: "math", latex: "a_1 > 0", display: false },
      { kind: "text", text: " vedi " },
      { kind: "ref", target: "segno-di-una-frazione", label: "il segno" },
      { kind: "text", text: " e " },
      { kind: "ref", target: "V1.M06.L03" },
      { kind: "text", text: ": " },
      { kind: "math", latex: "x^2", display: true },
      { kind: "text", text: " fine." },
    ]);
  });

  it("il dollaro protetto è un dollaro vero", () => {
    expect(splitInline(String.raw`Costa \$5 e $x = \$$ no`)).toEqual([
      { kind: "text", text: "Costa $5 e " },
      { kind: "math", latex: String.raw`x = \$`, display: false },
      { kind: "text", text: " no" },
    ]);
    expect(unbalancedMath(String.raw`Costa \$5`)).toBe(false);
    expect(unbalancedMath("Costa $5")).toBe(true);
    expect(unbalancedMath("$a$ e $$b$$")).toBe(false);
  });
});
