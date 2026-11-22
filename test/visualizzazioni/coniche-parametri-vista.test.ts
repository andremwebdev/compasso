// @vitest-environment jsdom
// VIS.coniche-parametri, il componente in jsdom: si disegna con i parametri predefiniti e con quelli
// delle lezioni vere, pulsanti e cursori cambiano conica ed elementi, i vertici si trascinano, un
// parametro sbagliato mostra il messaggio.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { VisualizationBlock, findVisualization } from "../../src/visualizzazioni";
import { WINDOW } from "../../src/visualizzazioni/coniche-parametri-math";
import { frameOf } from "../../src/visualizzazioni/parametri";
import { lessonParams } from "./helpers";

const ID = "VIS.coniche-parametri";
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
const equation = (root: Element): string => root.querySelector(".vis-formula annotation")?.textContent ?? "";
const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

function setSlider(root: Element, index: number, value: number): void {
  const input = root.querySelectorAll<HTMLInputElement>(".vis-cursore input")[index] as HTMLInputElement;
  act(() => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VIS.coniche-parametri, il componente", () => {
  it("è nell'elenco e si disegna con i parametri predefiniti", () => {
    expect(findVisualization(ID)?.code).toBe(ID);
    const root = mount({});
    expect(root.querySelector(".vis-conica")?.getAttribute("d")).toBeTruthy();
    expect(root.querySelectorAll(".vis-scelta .vis-pulsante")).toHaveLength(4);
    expect(root.querySelectorAll(".vis-cursore input")).toHaveLength(3);
    expect(equation(root)).toBe("x^{2} + y^{2} - 2x + 2y - 7 = 0");
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

  it("pulsanti e cursori: parabola, poi iperbole con il secondo membro −1", () => {
    const root = mount({});
    const buttons = root.querySelectorAll<HTMLButtonElement>(".vis-coniche > .vis-scelta .vis-pulsante");
    act(() => buttons[1]?.click());
    expect(root.querySelector(".vis-linea-direttrice")).not.toBeNull();
    setSlider(root, 0, -1);
    expect(text(root, ".vis-passi")).toContain("il basso");
    act(() => buttons[3]?.click());
    expect(root.querySelectorAll(".vis-cursore input")).toHaveLength(2);
    expect(root.querySelectorAll(".vis-linea-asintoto")).toHaveLength(2);
    act(() => root.querySelectorAll<HTMLButtonElement>(".vis-versi .vis-pulsante")[1]?.click());
    expect(equation(root)).toContain("= -1");
    expect(text(root, ".vis-passi")).toContain("asse y");
    // La parabola ricorda i suoi coefficienti.
    act(() => buttons[1]?.click());
    expect(equation(root)).toBe("y = -x^{2} - x - 2");
  });

  it("col dito: il vertice dell'ellisse cambia a", async () => {
    const root = mount({ coniche: "ellisse" });
    const svg = root.querySelector(".vis-sopra") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: GRAPH_WIDTH, height: GRAPH_HEIGHT, right: GRAPH_WIDTH, bottom: GRAPH_HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
    const frame = frameOf(WINDOW);
    const grip = root.querySelector(".vis-maniglia-a") as SVGGElement;
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: frame.sx(5.1), clientY: frame.sy(0) }));
    });
    await act(waitFrame);
    expect(equation(root)).toBe(String.raw`\frac{x^{2}}{25} + \frac{y^{2}}{4} = 1`);
    expect(text(root, ".vis-passi")).toContain("Fuochi");
  });

  it("un parametro sbagliato mostra il messaggio", () => {
    expect(text(mount({ coniche: "retta" }), '[role="alert"]')).toContain("retta");
  });
});
