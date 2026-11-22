// @vitest-environment jsdom
// Ogni lezione scritta si apre nell'app (LessonView in jsdom) e si percorre fino in fondo: a ogni tratto
// si risponde alla domanda lampo e si tocca «Continua». Alla fine ci sono tutti i tratti, il riepilogo,
// nessun messaggio di problema (figure, grafici, visualizzazioni) e nessuna formula disegnata in rosso.

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { LessonView } from "../../src/app/schermate/LessonView";
import { attempts, lessonProgress } from "../../src/app/state";
import { lessonChunks } from "../../src/app/lezione/chunks";
import { lessonCodes, loadLesson } from "../../src/contenuti";

let container: HTMLElement | null = null;

afterEach(() => {
  if (container) act(() => render(null, container as HTMLElement));
  container?.remove();
  container = null;
});

const buttons = (node: ParentNode): HTMLButtonElement[] => [...node.querySelectorAll("button")];
const named = (node: ParentNode, name: string): HTMLButtonElement | undefined => buttons(node).find((button) => button.textContent?.trim() === name);

function click(button: HTMLButtonElement | undefined): void {
  if (!button) throw new Error("pulsante mancante");
  act(() => button.click());
}

/** Risponde alla domanda dell'ultimo tratto aperto: «Non lo so» per quelle dei generatori, la prima opzione per le altre. */
function answerLastQuestion(node: HTMLElement): void {
  const chunk = [...node.querySelectorAll(".lesson-chunk")].at(-1);
  if (!chunk) return;
  const dontKnow = named(chunk, "Non lo so");
  if (dontKnow && !dontKnow.disabled) return click(dontKnow);
  const option = chunk.querySelector<HTMLButtonElement>("button[role='radio']:not([disabled])");
  if (!option) return;
  click(option);
  click(named(chunk, "Conferma"));
}

describe("le lezioni scritte si aprono nell'app", () => {
  it.each(lessonCodes.map((code) => [code]))("%s si percorre fino all'ultimo tratto", (code) => {
    attempts.value = [];
    lessonProgress.value = {};
    const lesson = loadLesson(code);
    if (!lesson) throw new Error(`${code} non letta`);
    const total = lessonChunks(lesson).length;
    container = document.createElement("div");
    document.body.append(container);
    act(() => render(h(LessonView, { code }), container as HTMLElement));
    const node = container;
    expect(node.querySelector(".lesson-header h1")?.textContent).toBe(lesson.meta.title);
    for (let guard = 0; guard < total; guard++) {
      answerLastQuestion(node);
      const next = named(node, "Continua");
      if (!next) break;
      expect(next.disabled, `${code}: «Continua» chiuso al tratto ${guard + 1}`).toBe(false);
      click(next);
    }
    expect(node.querySelector(".lesson-position")?.textContent).toBe(`Tratto ${total} di ${total}`);
    expect(node.querySelectorAll(".lesson-chunk").length).toBe(total);
    expect(node.textContent).toContain("In breve");
    expect(node.querySelectorAll("[role='alert']").length, `${code}: messaggi di problema`).toBe(0);
    expect(node.querySelectorAll(".katex-error").length, `${code}: formule in rosso`).toBe(0);
  });
});
