// @vitest-environment jsdom
// La risposta `ordering` nella schermata di esercizio (ExerciseView), con il generatore di prova
// test/esercizi/fixtures/ordering-generator.ts: si parte da un ordine mescolato e mai giusto, le frecce
// spostano gli elementi saltando quelli fissi, la conferma valuta, l'errore tipico è riconosciuto e il
// tentativo finisce nel registro come gli altri. Il generatore di prova supera la verifica automatica.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExerciseView } from "../../src/app/componenti/ExerciseView";
import { moveItem, moveTarget, rightPlaces } from "../../src/app/risposta/ordering";
import { attempts } from "../../src/app/state";
import { evaluateResponse, generateExercise, orderingStart, type Exercise } from "../../src/esercizi";
import { formatReport, verifyGenerator } from "../../src/esercizi/verify";
import generator from "../esercizi/fixtures/ordering-generator";

let container: HTMLElement | null = null;

function mount(exercise: Exercise): HTMLElement {
  container = document.createElement("div");
  document.body.append(container);
  act(() => render(h(ExerciseView, { exercise, context: "esercizi" }), container as HTMLElement));
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

/** L'ordine mostrato: l'indice originale di ogni elemento, dall'alto in basso. */
const shownOrder = (root: Element): number[] => [...root.querySelectorAll(".reorder li")].map((li) => Number(li.getAttribute("data-item")));

function click(button: Element | null | undefined): void {
  if (!button) throw new Error("pulsante mancante");
  act(() => (button as HTMLButtonElement).click());
}

const buttonNamed = (root: Element, name: string) => [...root.querySelectorAll("button")].find((button) => button.textContent?.trim() === name);

/** Rimette in ordine toccando solo le frecce «su», come farebbe Andrea. Restituisce i tocchi fatti. */
function sortWithArrows(root: Element): number {
  let taps = 0;
  const count = shownOrder(root).length;
  for (let item = 0; item < count; item++) {
    for (let guard = 0; guard < count && shownOrder(root).indexOf(item) > item; guard++) {
      const li = root.querySelector(`.reorder li[data-item="${item}"]`);
      click(li?.querySelector("button[aria-label^='Sposta su']"));
      taps++;
    }
  }
  return taps;
}

describe("riordino con le frecce", () => {
  const items = [{ fixed: true }, {}, {}, { fixed: true }, {}];

  it("lo spostamento salta i fissi e non tocca mai un fisso", () => {
    expect(moveItem([0, 1, 2, 3, 4], items, 2, 1)).toEqual([0, 1, 4, 3, 2]);
    expect(moveItem([0, 1, 2, 3, 4], items, 1, -1)).toEqual([0, 1, 2, 3, 4]);
    expect(moveItem([0, 1, 2, 3, 4], items, 3, 1)).toEqual([0, 1, 2, 3, 4]);
    expect(moveTarget([0, 1, 2, 3, 4], items, 4, 1)).toBeNull();
    expect(rightPlaces([0, 2, 1, 3, 4])).toBe(3);
  });
});

describe("risposta ordering nella schermata di esercizio", () => {
  it("il generatore di prova supera la verifica automatica", () => {
    const report = verifyGenerator(generator, { seeds: 200 });
    expect(report.problems, formatReport(report)).toEqual([]);
  });

  it("l'ordine di partenza è mescolato, mai giusto, con i fissi al loro posto, e uguale per lo stesso esercizio", () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const exercise = generateExercise(generator, level, seed);
        const start = orderingStart(exercise);
        expect(start.every((value, index) => value === index)).toBe(false);
        expect(start[0]).toBe(0);
        expect(orderingStart(exercise)).toEqual(start);
      }
    }
  });

  it("si riordina con le frecce, si conferma, è giusta e il tentativo si registra", () => {
    const exercise = generateExercise(generator, 2, 7);
    const root = mount(exercise);
    expect(shownOrder(root)).toEqual(orderingStart(exercise));
    // Il fisso è tratteggiato e senza frecce; gli altri ne hanno due ciascuno.
    const fixed = root.querySelector('.reorder li[data-item="0"]');
    expect(fixed?.classList.contains("proof-step-fixed")).toBe(true);
    expect(fixed?.querySelectorAll("button")).toHaveLength(0);
    expect(root.querySelectorAll(".reorder button")).toHaveLength(2 * (shownOrder(root).length - 1));

    expect(sortWithArrows(root)).toBeGreaterThan(0);
    expect(shownOrder(root)).toEqual([0, 1, 2, 3, 4]);
    click(buttonNamed(root, "Conferma"));

    expect(root.querySelector(".verdict-correct")).not.toBeNull();
    expect(root.textContent).toContain("Ordine giusto");
    expect(attempts.value).toHaveLength(1);
    expect(attempts.value[0]).toMatchObject({ generator: "V1.M03.A99.g1", skill: "V1.M03.A99", seed: 7, level: 2, outcome: "correct", error: null, context: "esercizi" });
  });

  it("un ordine sbagliato: errore riconosciuto, posti segnati ✓ e ✗, ordine giusto mostrato, tentativo registrato", () => {
    const exercise = generateExercise(generator, 1, 3);
    const root = mount(exercise);
    const start = shownOrder(root);
    click(buttonNamed(root, "Conferma"));

    expect(root.querySelector(".verdict-wrong")).not.toBeNull();
    expect(root.querySelector(".verdict-error")?.textContent).toContain("Ordine delle operazioni sbagliato");
    const marks = [...root.querySelectorAll(".reorder-mark")].map((mark) => mark.textContent);
    expect(marks.slice(0, start.length)).toEqual(start.map((value, index) => (value === index ? "✓" : "✗")));
    expect(root.textContent).toContain(`al posto giusto ${rightPlaces(start)} su ${start.length}`);
    // Dopo la risposta niente più frecce.
    expect(root.querySelectorAll(".proof-step-moves")).toHaveLength(0);
    expect(attempts.value[0]).toMatchObject({ outcome: "wrong", error: "CALC.PRECEDENZA" });
    expect(evaluateResponse(exercise, { kind: "ordering", order: start })).toMatchObject({ outcome: "wrong", error: "CALC.PRECEDENZA" });
  });

  it("«Non lo so» registra una risposta non data e mostra la soluzione", () => {
    const root = mount(generateExercise(generator, 3, 11));
    click(buttonNamed(root, "Non lo so"));
    expect(root.querySelector(".verdict-skipped")).not.toBeNull();
    expect(root.querySelector(".steps")).not.toBeNull();
    expect(attempts.value[0]).toMatchObject({ outcome: "skipped", error: null });
  });
});
