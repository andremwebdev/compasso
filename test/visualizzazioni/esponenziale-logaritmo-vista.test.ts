// @vitest-environment jsdom
// VIS.esponenziale-logaritmo, il componente in jsdom: si disegna con i parametri predefiniti e con
// quelli delle lezioni vere, il cursore della base cambia grafici e proprietà, il punto P si trascina,
// un parametro sbagliato mostra il messaggio.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { VisualizationBlock, findVisualization } from "../../src/visualizzazioni";
import { BASES, WINDOW } from "../../src/visualizzazioni/esponenziale-logaritmo-math";
import { frameOf } from "../../src/visualizzazioni/parametri";
import { lessonParams } from "./helpers";

const ID = "VIS.esponenziale-logaritmo";
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
const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

function setSlider(root: Element, index: number, value: number): void {
  const input = root.querySelectorAll<HTMLInputElement>(".vis-cursore input")[index] as HTMLInputElement;
  act(() => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VIS.esponenziale-logaritmo, il componente", () => {
  it("è nell'elenco e si disegna con i parametri predefiniti", () => {
    expect(findVisualization(ID)?.code).toBe(ID);
    const root = mount({});
    expect(root.querySelectorAll(".vis .grafico-disegno svg .graf-curva")).toHaveLength(3);
    expect(root.querySelectorAll(".vis-notevole")).toHaveLength(4);
    expect(root.querySelector(".vis-punto-simmetrico")).not.toBeNull();
    expect(text(root, ".vis-passi")).toContain("crescente");
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

  it("il cursore della base: decrescente sotto 1, costante e senza logaritmo a 1", () => {
    const root = mount({});
    setSlider(root, 0, 3); // 1/2
    expect(text(root, ".vis-passi")).toContain("decrescente");
    setSlider(root, 0, BASES.findIndex((b) => b.kind === "num" && b.value.eq(1)));
    expect(text(root, ".vis-passi")).toContain("non esiste");
    expect(root.querySelectorAll(".vis .grafico-disegno svg .graf-curva")).toHaveLength(2);
    expect(root.querySelector(".vis-simmetrico")).not.toBeNull();
  });

  it("senza logaritmo: una sola curva, niente P'", () => {
    const root = mount({ logaritmo: "no", base: "1/3" });
    expect(root.querySelectorAll(".vis .grafico-disegno svg .graf-curva")).toHaveLength(1);
    expect(root.querySelector(".vis-punto-simmetrico")).toBeNull();
    expect(text(root, ".vis-passi")).toContain("decrescente");
  });

  it("col dito: la maniglia sposta P", async () => {
    const root = mount({});
    const svg = root.querySelector(".vis-sopra") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: GRAPH_WIDTH, height: GRAPH_HEIGHT, right: GRAPH_WIDTH, bottom: GRAPH_HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
    const grip = root.querySelector(".vis-maniglia-sonda") as SVGGElement;
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: frameOf(WINDOW).sx(2), clientY: 220 }));
    });
    await act(waitFrame);
    expect(root.querySelector(".vis-punti annotation")?.textContent).toBe(String.raw`P\left(2;\, 4\right)`);
  });

  it("un parametro sbagliato mostra il messaggio", () => {
    const root = mount({ base: "-1" });
    expect(text(root, '[role="alert"]')).toContain("Base");
  });
});
