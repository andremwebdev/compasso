// @vitest-environment jsdom
// Le tre modalità delle dimostrazioni interattive registrano i tentativi (decisione 119): contesto
// «dimostrazione», teorema e modalità, nessuna abilità. Nel riordino conta il primo «Controlla» di ogni
// giro; «Ricomincia» apre un giro nuovo. Dimostrazione di prova: Lagrange di riserva.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proofsOfLesson } from "../../src/app/ripasso/cards";
import { ProofDrills } from "../../src/app/schermate/Ripasso";
import { attempts } from "../../src/app/state";
import { parseLesson } from "../../src/contenuti/formato";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function lagrangeProof() {
  const text = readFileSync(path.join(root, "src/riserva/v2/m06/t03.md"), "utf8");
  const source = ["---", "codice: V2.M06.L99", "titolo: Prova", "obiettivo: Prova.", "prerequisiti: []", "durata: 10", "abilita: []", "termini: []", "---", "", text, "", ":::riepilogo", "Fine.", ":::", ""].join("\n");
  const lesson = parseLesson(source).lesson;
  const proof = lesson ? proofsOfLesson(lesson)[0] : undefined;
  if (!proof) throw new Error("dimostrazione di prova non letta");
  return proof;
}

let container: HTMLElement | null = null;

function mount(): HTMLElement {
  container = document.createElement("div");
  document.body.append(container);
  act(() => render(h(ProofDrills, { lesson: "V2.M06.L99", theorem: "V2.M06.T03", proof: lagrangeProof() }), container as HTMLElement));
  return container;
}

beforeEach(() => {
  attempts.value = [];
});

afterEach(() => {
  if (container) render(null, container);
  container?.remove();
  container = null;
});

function click(button: Element | null | undefined): void {
  if (!button) throw new Error("pulsante mancante");
  act(() => (button as HTMLButtonElement).click());
}

const buttonNamed = (node: Element, name: string) => [...node.querySelectorAll("button")].find((button) => button.textContent?.trim() === name);
const shownOrder = (node: Element): number[] => [...node.querySelectorAll(".reorder li")].map((li) => Number(li.getAttribute("data-item")));

function sortWithArrows(node: Element): void {
  const count = shownOrder(node).length;
  for (let item = 0; item < count; item++) {
    for (let guard = 0; guard < count && shownOrder(node).indexOf(item) > item; guard++) {
      click(node.querySelector(`.reorder li[data-item="${item}"] button[aria-label^='Sposta su']`));
    }
  }
}

const shape = { context: "dimostrazione", skill: null, generator: null, seed: null, level: null, lesson: "V2.M06.L99", hints: 0, distraction: false };

describe("dimostrazioni interattive: tentativi registrati", () => {
  it("riordina: conta il primo «Controlla» del giro; «Ricomincia» ne apre un altro", () => {
    const node = mount();
    click(buttonNamed(node, "Controlla"));
    expect(node.textContent).toContain("Non ancora");
    expect(attempts.value).toEqual([expect.objectContaining({ ...shape, outcome: "wrong", error: "NON_CLASSIFICATO", proof: { theorem: "V2.M06.T03", mode: "riordina" } })]);

    // Si corregge e si ricontrolla: giusto, ma il tentativo resta quello di prima.
    sortWithArrows(node);
    // Spostando, l'esito di prima sparisce: l'ordine giusto non si scopre senza controllare.
    expect(node.querySelector(".verdict")).toBeNull();
    click(buttonNamed(node, "Controlla"));
    expect(node.textContent).toContain("Ordine giusto");
    expect(node.querySelectorAll(".proof-reason").length).toBeGreaterThan(0);
    expect(attempts.value).toHaveLength(1);

    click(buttonNamed(node, "Ricomincia"));
    sortWithArrows(node);
    click(buttonNamed(node, "Controlla"));
    expect(attempts.value).toHaveLength(2);
    expect(attempts.value[1]).toMatchObject({ ...shape, outcome: "correct", error: null, proof: { theorem: "V2.M06.T03", mode: "riordina" } });
  });

  it("trova lo sbagliato: un tentativo per il passaggio toccato", () => {
    const node = mount();
    click(buttonNamed(node, "Trova lo sbagliato"));
    const steps = [...node.querySelectorAll("button.proof-step")];
    click(steps[0]);
    const right = node.textContent?.includes("Trovato") ?? false;
    expect(attempts.value).toEqual([expect.objectContaining({ ...shape, outcome: right ? "correct" : "wrong", proof: { theorem: "V2.M06.T03", mode: "sbagliato" } })]);
    // I passaggi sono bloccati: un secondo tocco non registra niente.
    click(steps[1]);
    expect(attempts.value).toHaveLength(1);
  });

  it("completa: un tentativo per l'opzione scelta, giusta o sbagliata", () => {
    const node = mount();
    click(buttonNamed(node, "Completa"));
    click(node.querySelector(".options .option"));
    const right = node.querySelector(".verdict-correct") !== null;
    expect(attempts.value).toEqual([expect.objectContaining({ ...shape, outcome: right ? "correct" : "wrong", error: right ? null : "NON_CLASSIFICATO", proof: { theorem: "V2.M06.T03", mode: "completa" } })]);
  });
});
