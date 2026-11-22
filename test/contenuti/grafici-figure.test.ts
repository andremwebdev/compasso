// I blocchi «grafico» e «figura» delle lezioni: lettura, controllo dei parametri e delle figure,
// verifica dei contenuti. Un parametro sbagliato è un problema della verifica ma non toglie il
// blocco dalla lezione (la lezione mostra il messaggio nel riquadro).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkFigure, figureFileProblem, figurePath, parseLesson, readGraph, verifyContents, type ContentCatalog, type ContentFile, type LessonBlock,
} from "../../src/contenuti/formato";

const here = path.dirname(fileURLToPath(import.meta.url));
const lessonText = readFileSync(path.join(here, "prova", "v1", "m01", "l99.md"), "utf8");
const vennText = readFileSync(path.join(here, "prova", "v1", "m01", "l99-venn-unione.svg"), "utf8");
const lessonFile: ContentFile = { path: "test/contenuti/prova/v1/m01/l99.md", text: lessonText };
const catalog: ContentCatalog = { generators: {}, visualizations: [], figures: { "v1/m01/l99-venn-unione.svg": vennText } };

/** La lezione di prova con il blocco grafico sostituito. */
const withGraph = (attributes: string): string => lessonText.replace(/:::grafico\{[^}]*\}/, `:::grafico{${attributes}}`);
const problemsOf = (text: string): string[] => parseLesson(text).problems.map((problem) => problem.message);
const graphBlock = (text: string): Extract<LessonBlock, { kind: "graph" }> | undefined =>
  parseLesson(text).lesson?.blocks.find((block): block is Extract<LessonBlock, { kind: "graph" }> => block.kind === "graph");

describe("lezione di prova", () => {
  it("si legge senza problemi e supera la verifica dei contenuti", () => {
    expect(problemsOf(lessonText)).toEqual([]);
    const report = verifyContents([lessonFile], catalog);
    expect(report.problems).toEqual([]);
    expect(report.warnings).toEqual([]);
    const kinds = parseLesson(lessonText).lesson?.blocks.map((block) => block.kind);
    expect(kinds).toEqual(["text", "graph", "question", "figure", "summary"]);
  });

  it("il grafico ha le due curve e i punti notevoli", () => {
    const block = graphBlock(lessonText);
    expect(block).toMatchObject({ functions: "(x-1)/(x+2); x/2 - 1", window: "-6; 6; -4; 4", points: "4" });
    const reading = readGraph(block as NonNullable<typeof block>);
    expect(reading.ok).toBe(true);
    if (reading.ok) {
      expect(reading.graph.curves).toHaveLength(2);
      expect(reading.graph.points.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("blocco grafico", () => {
  it("un parametro sbagliato è un problema, ma il blocco resta nella lezione", () => {
    const text = withGraph('funzioni="(x-1/(x+2)" finestra="-5; 5; -3; 3"');
    expect(problemsOf(text).some((message) => message.startsWith("Grafico: Funzione 1:"))).toBe(true);
    expect(graphBlock(text)).toBeDefined();
    expect(readGraph(graphBlock(text) as NonNullable<ReturnType<typeof graphBlock>>).ok).toBe(false);
  });

  it("dice che cosa non va nella finestra e nei punti", () => {
    expect(problemsOf(withGraph('funzioni="x^2"'))).toContain('Grafico: Manca «finestra»: per esempio finestra="-5; 5; -3; 3" (x minimo; x massimo; y minimo; y massimo).');
    expect(problemsOf(withGraph('funzioni="x^2" finestra="-5; 5; 3"'))).toContain("Grafico: La finestra ha 3 valori: ne servono 4 (x minimo; x massimo; y minimo; y massimo).");
    expect(problemsOf(withGraph('funzioni="x^2" finestra="-5; a; -3; 3"'))).toContain("Grafico: Finestra, x massimo: «a» deve essere un numero, senza lettere.");
    expect(problemsOf(withGraph('funzioni="x^2" finestra="5; -5; -3; 3"'))).toContain("Grafico: Nella finestra il primo estremo di x deve essere minore del secondo.");
    expect(problemsOf(withGraph('funzioni="sqrt(x)" finestra="-5; 5; -3; 3" punti="-1"'))).toContain("Grafico: Nel punto $x = -1$ nessuna funzione del grafico è definita.");
    expect(problemsOf(withGraph('funzioni="a x" finestra="-5; 5; -3; 3"'))).toContain("Grafico: La funzione 1 contiene la lettera «a»: nei grafici l'unica variabile è $x$.");
    expect(problemsOf(withGraph('funzioni="x" finestra="-5; 5; -3; 3" colore=blu'))).toContain("Il blocco «grafico» non ha l'attributo «colore» (attributi: funzioni, finestra, punti).");
  });

  it("la finestra accetta costanti: 2pi, 1/2, decimali con la virgola", () => {
    expect(problemsOf(withGraph('funzioni="sin(x); cos(x)" finestra="-2pi; 2pi; -1,5; 3/2" punti="pi/3"'))).toEqual([]);
  });

  it("readGraph non lancia mai, qualunque cosa ci sia scritto", () => {
    const junk = ["", ";", ";;;", "x^", ")(", "1/0", "x; x; x; x", "√", "∞", "pi pi", "1e400", "x/(x-x)", "ln(-1)"];
    for (const functions of junk) {
      for (const window of junk) {
        for (const points of ["", ...junk.slice(0, 5)]) expect(() => readGraph({ functions, window, points })).not.toThrow();
      }
    }
  });
});

describe("blocco figura", () => {
  it("il file si chiama come la lezione e sta accanto a lei", () => {
    expect(figureFileProblem("l99-venn-unione.svg", "V1.M01.L99")).toBeNull();
    expect(figureFileProblem("l02-venn.svg", "V1.M01.L99")).toBe("Il file «l02-venn.svg» deve cominciare con «l99-»: le figure stanno accanto alla loro lezione.");
    expect(figureFileProblem("Venn.SVG", "V1.M01.L99")).toMatch(/non va bene/);
    expect(figureFileProblem("../l99-x.svg", "V1.M01.L99")).toMatch(/non va bene/);
    expect(figurePath("V1.M01.L99", "l99-venn-unione.svg")).toBe("v1/m01/l99-venn-unione.svg");
  });

  it("serve la didascalia, e il file deve esistere", () => {
    const noCaption = lessonText.replace(/(:::figura\{[^}]*\}\n)[^\n]*\n/, "$1");
    expect(problemsOf(noCaption)).toContain("La figura non ha la didascalia: scrivila dentro il blocco (dice che cosa mostra, anche a chi non la vede).");
    const report = verifyContents([lessonFile], { ...catalog, figures: {} });
    expect(report.problems.map((problem) => problem.message)).toEqual(["La figura v1/m01/l99-venn-unione.svg non esiste (o non è nell'elenco del modulo, «figures»)."]);
  });

  it("una figura che nessuna lezione usa è un avviso", () => {
    const report = verifyContents([lessonFile], { ...catalog, figures: { ...catalog.figures, "v1/m01/l99-dimenticata.svg": vennText } });
    expect(report.warnings.map((warning) => warning.message)).toEqual(["La figura v1/m01/l99-dimenticata.svg non è usata da nessuna lezione."]);
  });

  it("la verifica controlla il contenuto della figura", () => {
    const report = verifyContents([lessonFile], { ...catalog, figures: { "v1/m01/l99-venn-unione.svg": vennText.replace('class="fig-linea" x="8"', 'stroke="#ff0000" x="8"') } });
    expect(report.problems.map((problem) => problem.message)).toContain(
      "Figura v1/m01/l99-venn-unione.svg: Il colore «stroke=\"#ff0000\"» non è ammesso: i colori vengono dal tema, con le classi fig-linea, fig-sottile, fig-tratteggio, fig-accento, fig-area-1, fig-area-2, fig-area-3, fig-pieno, fig-testo, fig-testo-corsivo.",
    );
  });
});

describe("controllo del contenuto SVG", () => {
  const file = "l99-prova.svg";
  const svg = (inside: string, root = 'viewBox="0 0 100 100"'): string => `<svg xmlns="http://www.w3.org/2000/svg" ${root}>${inside}</svg>`;

  it("una figura semplice va bene", () => {
    expect(checkFigure(vennText, "l99-venn-unione.svg")).toEqual([]);
    expect(checkFigure(svg('<defs><marker id="l99-prova-freccia"><path class="fig-pieno" d="M0 0L5 5"/></marker></defs><line class="fig-linea" x1="0" y1="0" x2="9" y2="9" fill="none"/>'), file)).toEqual([]);
  });

  it("niente codice, immagini, stili o riferimenti esterni", () => {
    expect(checkFigure(svg("<script>alert(1)</script>"), file)).toContain("L'elemento <script> non è ammesso in una figura.");
    expect(checkFigure(svg('<circle class="fig-linea" r="3" onclick="x()"/>'), file)).toContain("L'attributo «onclick» (codice) non è ammesso.");
    expect(checkFigure(svg('<image href="https://example.com/a.png"/>'), file)).toContain("L'elemento <image> non è ammesso in una figura.");
    expect(checkFigure(svg('<use href="https://example.com/a.svg#b"/>'), file)).toContain("Il riferimento «https://example.com/a.svg#b» esce dal file: non è ammesso.");
    expect(checkFigure(svg("<style>circle{fill:red}</style>"), file)).toContain("L'elemento <style> non è ammesso in una figura.");
    expect(checkFigure(svg('<rect style="fill:red"/>'), file)).toContain("L'attributo «style» non è ammesso: per l'aspetto si usano le classi fig-….");
    expect(checkFigure(svg("<foreignObject></foreignObject>"), file)).toContain("L'elemento <foreignObject> non è ammesso in una figura.");
  });

  it("niente colori scritti, solo le classi della figura", () => {
    expect(checkFigure(svg('<rect fill="red"/>'), file)[0]).toMatch(/^Il colore «fill="red"» non è ammesso/);
    expect(checkFigure(svg('<rect class="fig-linea rosso"/>'), file)[0]).toMatch(/^La classe «rosso» non esiste/);
    expect(checkFigure(svg('<rect clip-path="url(#l99-prova-a)" class="fig-linea"/>'), file)).toEqual([]);
  });

  it("struttura: un solo <svg> con viewBox, senza misure fisse, tag chiusi, id con il nome del file", () => {
    expect(checkFigure(svg("", 'width="100" height="80" viewBox="0 0 1 1"'), file)).toContain("L'elemento <svg> non ha width né height: la figura si adatta alla larghezza dello schermo.");
    expect(checkFigure(svg("", ""), file)).toContain('L\'elemento <svg> deve avere il viewBox (per esempio viewBox="0 0 320 200").');
    expect(checkFigure(svg('<g class="fig-linea">'), file).join(" ")).toMatch(/non chiude|non è chiuso/);
    expect(checkFigure(svg('<path id="freccia" class="fig-linea"/>'), file)).toContain("L'id «freccia» deve cominciare con «l99-prova-»: nella pagina gli id devono essere unici.");
    expect(checkFigure(`<?xml version="1.0"?>${svg("")}`, file)).toContain("La figura deve cominciare con <svg (senza intestazione <?xml).");
    expect(checkFigure("non è una figura", file).length).toBeGreaterThan(0);
  });
});
