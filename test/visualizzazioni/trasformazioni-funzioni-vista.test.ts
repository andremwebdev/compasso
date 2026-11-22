// @vitest-environment jsdom
// VIS.trasformazioni-funzioni, il componente in jsdom: si disegna con i parametri predefiniti e con
// quelli delle lezioni vere, risponde a pulsanti, cursori e trascinamento di P', mostra un messaggio
// (senza rompersi) se i parametri sono sbagliati.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphFrame } from "../../src/motore/display";
import { VisualizationBlock, findVisualization } from "../../src/visualizzazioni";
import { lessonParams } from "./helpers";

const ID = "VIS.trasformazioni-funzioni";
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
const formula = (root: Element): string => root.querySelector(".vis-formula annotation")?.textContent ?? "";
const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

function setSlider(root: Element, index: number, value: number): void {
  const input = root.querySelectorAll<HTMLInputElement>(".vis-cursore input")[index] as HTMLInputElement;
  act(() => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VIS.trasformazioni-funzioni, il componente", () => {
  it("è nell'elenco e si disegna con i parametri predefiniti", () => {
    expect(findVisualization(ID)?.code).toBe(ID);
    const root = mount({});
    expect(root.querySelector(".vis .grafico-disegno svg .graf-curva")).not.toBeNull();
    expect(root.querySelector(".vis-sopra .vis-curva-trasformata")).not.toBeNull();
    expect(root.querySelectorAll(".vis-cursore input")).toHaveLength(4);
    expect(root.querySelectorAll(".vis-scelta .vis-pulsante")).toHaveLength(4);
    expect(root.querySelectorAll(".vis-maniglia .vis-presa")).toHaveLength(1);
    expect(formula(root)).toBe("y = x^{2}");
    expect(text(root, ".vis-passi")).toContain("Nessuna trasformazione");
    expect(root.querySelectorAll(".katex-error")).toHaveLength(0);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it("si disegna con i parametri di ogni lezione che la usa", () => {
    for (const params of lessonParams(ID)) {
      const root = mount(params);
      expect(root.querySelector('[role="alert"]'), JSON.stringify(params)).toBeNull();
      render(null, root);
      root.remove();
      container = null;
    }
  });

  it("i cursori cambiano formula, curva e trasformazioni; i pulsanti la funzione", () => {
    const root = mount({});
    const before = root.querySelector(".vis-curva-trasformata")?.getAttribute("d");
    setSlider(root, 2, 2); // c = 2
    expect(formula(root)).toBe(String.raw`y = \left(x - 2\right)^{2}`);
    expect(root.querySelector(".vis-curva-trasformata")?.getAttribute("d")).not.toBe(before);
    expect(text(root, ".vis-passi")).toContain("verso destra");
    setSlider(root, 0, 0); // a = 0 non si può: diventa 1/2
    expect(text(root, ".vis-cursore:nth-child(1) .vis-cursore-valore annotation")).toBe(String.raw`a = \frac{1}{2}`);
    act(() => root.querySelectorAll<HTMLButtonElement>(".vis-scelta .vis-pulsante")[3]?.click());
    expect(formula(root)).toBe(String.raw`y = \frac{1}{2} \cdot \frac{1}{x - 2}`);
    expect(root.querySelectorAll(".vis-sopra .vis-asintoto")).toHaveLength(1);
  });

  it("col dito: trascinare P' trasla il grafico (cambiano c e d)", async () => {
    const root = mount({ funzione: "x^2" });
    const svg = root.querySelector(".vis-sopra") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: GRAPH_WIDTH, height: GRAPH_HEIGHT, right: GRAPH_WIDTH, bottom: GRAPH_HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
    const frame = graphFrame({ xMin: -6, xMax: 6, yMin: -4, yMax: 4 });
    const grip = root.querySelector(".vis-maniglia-punto") as SVGGElement;
    // P(1; 1) portato in (3; 0): c = 2, d = −1.
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: frame.sx(1), clientY: frame.sy(1) }));
      grip.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: frame.sx(3), clientY: frame.sy(0) }));
    });
    await act(waitFrame);
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });
    expect(formula(root)).toBe(String.raw`y = \left(x - 2\right)^{2} - 1`);
    expect(root.querySelector(".vis-punti annotation")?.textContent).toContain(String.raw`P'\left(3;\, 0\right)`);
  });

  it("con i soli cursori c e d mostra due cursori; senza c e d P' non si trascina", () => {
    expect(mount({ cursori: "c; d" }).querySelectorAll(".vis-cursore input")).toHaveLength(2);
    render(null, container!);
    container!.remove();
    const root = mount({ cursori: "a" });
    expect(root.querySelectorAll(".vis-presa")).toHaveLength(0);
  });

  it("un parametro sbagliato mostra il messaggio e non rompe niente", () => {
    const root = mount({ a: "0" });
    expect(text(root, '[role="alert"]')).toContain("non può essere 0");
    expect(root.querySelector(".vis-sopra")).toBeNull();
  });
});
