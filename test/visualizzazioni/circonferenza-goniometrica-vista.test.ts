// @vitest-environment jsdom
// VIS.circonferenza-goniometrica, il componente in jsdom: si disegna con i parametri predefiniti e con
// quelli delle lezioni vere, il cursore e il punto P trascinato cambiano angolo, valori e quadrante,
// senza tangente non c'è la riga della tangente, un parametro sbagliato mostra il messaggio.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../../src/motore/display";
import { VisualizationBlock, findVisualization } from "../../src/visualizzazioni";
import { WINDOW } from "../../src/visualizzazioni/circonferenza-goniometrica-math";
import { frameOf } from "../../src/visualizzazioni/parametri";
import { lessonParams } from "./helpers";

const ID = "VIS.circonferenza-goniometrica";
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
const tex = (root: Element, selector: string): string => root.querySelector(`${selector} annotation`)?.textContent ?? "";
const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 40));

function setSlider(root: Element, value: number): void {
  const input = root.querySelector<HTMLInputElement>(".vis-cursore input") as HTMLInputElement;
  act(() => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("VIS.circonferenza-goniometrica, il componente", () => {
  it("è nell'elenco e si disegna con i parametri predefiniti", () => {
    expect(findVisualization(ID)?.code).toBe(ID);
    const root = mount({});
    expect(root.querySelector(".vis-circonferenza-linea")).not.toBeNull();
    expect(root.querySelector(".vis-seg-tan")).not.toBeNull();
    expect(tex(root, ".vis-cursore-valore")).toBe(String.raw`\alpha = 30^\circ = \frac{\pi}{6}`);
    expect(tex(root, ".vis-valore-sin")).toBe(String.raw`\sin\alpha = \frac{1}{2}`);
    expect(text(root, ".vis-quadrante-testo")).toContain("I quadrante");
    expect(root.querySelectorAll(".vis-tabella tr")).toHaveLength(4);
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

  it("il cursore: 90° la tangente non esiste, 210° terzo quadrante", () => {
    const root = mount({});
    setSlider(root, 90);
    expect(text(root, ".vis-valore-tan")).toContain("non esiste");
    expect(root.querySelector(".vis-seg-tan")).toBeNull();
    setSlider(root, 210);
    expect(tex(root, ".vis-valore-cos")).toBe(String.raw`\cos\alpha = -\frac{\sqrt{3}}{2}`);
    expect(text(root, ".vis-quadrante-testo")).toContain("III quadrante");
    expect(root.querySelector(".vis-tabella td.vis-cella-soluzione")?.textContent).toContain("III");
  });

  it("col dito: P trascinato vicino a 120° si aggancia a 120°", async () => {
    const root = mount({});
    const svg = root.querySelector(".vis-sopra") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: GRAPH_WIDTH, height: GRAPH_HEIGHT, right: GRAPH_WIDTH, bottom: GRAPH_HEIGHT, x: 0, y: 0, toJSON: () => ({}) });
    const frame = frameOf(WINDOW);
    const grip = root.querySelector(".vis-maniglia-angolo") as SVGGElement;
    const rad = (122 * Math.PI) / 180;
    act(() => {
      grip.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: frame.sx(0.8 * Math.cos(rad)), clientY: frame.sy(0.8 * Math.sin(rad)) }));
    });
    await act(waitFrame);
    expect(tex(root, ".vis-cursore-valore")).toBe(String.raw`\alpha = 120^\circ = \frac{2\pi}{3}`);
    expect(tex(root, ".vis-valore-tan")).toBe(String.raw`\tan\alpha = -\sqrt{3}`);
  });

  it("senza tangente: niente retta x = 1 e niente riga della tangente", () => {
    const root = mount({ tangente: "no" });
    expect(root.querySelector(".vis-retta-tangente")).toBeNull();
    expect(root.querySelector(".vis-valore-tan")).toBeNull();
    expect(root.querySelectorAll(".vis-tabella tr")).toHaveLength(3);
  });

  it("un parametro sbagliato mostra il messaggio", () => {
    expect(text(mount({ angolo: "-10" }), '[role="alert"]')).toContain("Angolo");
  });
});
