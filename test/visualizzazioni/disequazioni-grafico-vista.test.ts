// @vitest-environment jsdom
// VIS.disequazioni-grafico, il componente in jsdom: si disegna con i parametri predefiniti e con
// quelli di ogni lezione vera, risponde a pulsanti, cursori e trascinamento col dito, mostra un
// messaggio (senza rompersi) se i parametri sono sbagliati. Dal blocco della lezione arriva al
// componente giusto attraverso l'elenco src/visualizzazioni/index.ts.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { VisualizationBlock, checkVisualizationParams, findVisualization, visualizationCodes } from "../../src/visualizzazioni";
import { lessonParams as lessonsUsing } from "./helpers";

const lessonParams = () => lessonsUsing("VIS.disequazioni-grafico");

const ID = "VIS.disequazioni-grafico";
let container: HTMLElement | null = null;

function mount(params: Record<string, string>): HTMLElement {
  container = document.createElement("div");
  document.body.append(container);
  act(() => render(h(VisualizationBlock, { id: ID, params }), container as HTMLElement));
  return container;
}

afterEach(() => {
  if (container) render(null, container);
  container?.remove();
  container = null;
});

const text = (root: Element, selector: string): string => root.querySelector(selector)?.textContent ?? "";
const solution = (root: Element): string => root.querySelector(".vis-soluzione .katex-mathml annotation")?.textContent ?? "";
const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

function setSlider(root: Element, index: number, value: number): void {
  const input = root.querySelectorAll<HTMLInputElement>(".vis-cursore input")[index] as HTMLInputElement;
  act(() => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VIS.disequazioni-grafico, il componente", () => {
  it("è nell'elenco delle visualizzazioni", () => {
    expect(visualizationCodes).toContain(ID);
    expect(findVisualization(ID)?.code).toBe(ID);
    expect(checkVisualizationParams("VIS.non-esiste", {})).toHaveLength(1);
  });

  it("si disegna con i parametri predefiniti: grafico, retta, tabella, soluzione", () => {
    const root = mount({});
    expect(root.querySelector(".vis .grafico-disegno svg .graf-curva")).not.toBeNull();
    expect(root.querySelector(".vis-sopra .vis-soglia")).not.toBeNull();
    expect(root.querySelectorAll(".vis-maniglia .vis-presa")).toHaveLength(2);
    // Due righe (N e D) più la frazione, più la riga x e la riga «soluzione».
    expect(root.querySelectorAll(".vis-tabella tr")).toHaveLength(5);
    expect(solution(root)).toBe(String.raw`S = \left(-\infty; -2\right) \cup \left(1; +\infty\right)`);
    expect(root.querySelectorAll(".katex-error")).toHaveLength(0);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it("si disegna con i parametri di ogni lezione che la usa", () => {
    for (const params of lessonParams()) {
      const root = mount(params);
      expect(root.querySelector('[role="alert"]'), JSON.stringify(params)).toBeNull();
      expect(root.querySelectorAll(".katex-error")).toHaveLength(0);
      render(null, root);
      root.remove();
      container = null;
    }
  });

  it("i pulsanti cambiano verso e funzione", () => {
    const root = mount({ funzione: "(x-1)/(x+2); (x+1)/(x-2)", verso: ">=" });
    expect(solution(root)).toContain(String.raw`\left[1; +\infty\right)`);
    const relations = root.querySelectorAll<HTMLButtonElement>(".vis-versi button");
    expect(relations).toHaveLength(4);
    act(() => relations[2]?.click()); // <
    expect(solution(root)).toBe(String.raw`S = \left(-2; 1\right)`);
    expect(relations[2]?.getAttribute("aria-pressed")).toBe("true");
    const functions = root.querySelectorAll<HTMLButtonElement>(".vis-scelta:not(.vis-versi) button");
    act(() => functions[1]?.click());
    expect(solution(root)).toBe(String.raw`S = \left(-1; 2\right)`);
  });

  it("il cursore della soglia sposta la retta e cambia la soluzione e la tabella", () => {
    const root = mount({ funzione: "(x+1)/(x-2)" });
    const before = root.querySelector(".vis-soglia")?.getAttribute("d");
    setSlider(root, 0, 1);
    expect(root.querySelector(".vis-soglia")?.getAttribute("d")).not.toBe(before);
    expect(solution(root)).toBe(String.raw`S = \left(2; +\infty\right)`);
    // f(x) − 1 = 3/(x − 2): la prima riga della tabella è 3.
    expect(text(root, ".vis-tabella tr:nth-child(2) th")).toContain("3");
  });

  it("il cursore della sonda si aggancia ai punti della tabella e dice se x è una soluzione", () => {
    const root = mount({ verso: ">=" });
    setSlider(root, 1, 1.01);
    expect(root.querySelector(".vis-tabella td.vis-cella-sonda.vis-cella-punto")).not.toBeNull();
    expect(text(root, ".vis-sonda-testo")).toContain("sulla retta");
    expect(text(root, ".vis-sonda-testo")).toContain("è una soluzione ✓");
    setSlider(root, 1, -2);
    expect(text(root, ".vis-sonda-testo")).toContain("non è definita");
    setSlider(root, 1, 0);
    expect(text(root, ".vis-sonda-testo")).toContain("sotto la retta");
    expect(text(root, ".vis-sonda-testo")).toContain("non è una soluzione ✗");
  });

  it("col dito: trascinare la maniglia della retta cambia la soglia", async () => {
    const root = mount({ funzione: "(x+1)/(x-2)" });
    const svg = root.querySelector(".vis-sopra") as SVGSVGElement;
    // Il disegno occupa 320 × 240 px a partire da (0, 0): coordinate dello schermo = coordinate del disegno.
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: GRAPH_WIDTH, height: GRAPH_HEIGHT, right: GRAPH_WIDTH, bottom: GRAPH_HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
    const grip = root.querySelector(".vis-maniglia-soglia") as SVGGElement;
    // y = 1 nella finestra predefinita (−4…4) sta a 240 − 6 − (5/8)·228 = 91,5.
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 300, clientY: 120 }));
      grip.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 300, clientY: 91.5 }));
    });
    await act(waitFrame);
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 300, clientY: 91.5 }));
    });
    expect(text(root, ".vis-cursore-valore")).toContain("k=1");
    expect(solution(root)).toBe(String.raw`S = \left(2; +\infty\right)`);

    // La maniglia della sonda: la sonda va dove c'è il dito.
    const probe = root.querySelector(".vis-maniglia-sonda") as SVGGElement;
    act(() => {
      probe.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 30, clientY: 220 }));
    });
    await act(waitFrame);
    expect(text(root, ".vis-sonda-testo")).toContain("sotto la retta");
  });

  it("un parametro sbagliato mostra il messaggio e non rompe niente", () => {
    const root = mount({ funzione: "x^3" });
    expect(text(root, '[role="alert"]')).toContain("grado maggiore di 2");
    expect(root.querySelector(".vis-sopra")).toBeNull();
  });

  it("un codice che non esiste mostra il messaggio", () => {
    container = document.createElement("div");
    act(() => render(h(VisualizationBlock, { id: "VIS.non-esiste", params: {} }), container as HTMLElement));
    expect(text(container, '[role="alert"]')).toContain("VIS.non-esiste");
  });
});
