// Pagina di prova per test/app/visualizzazioni-prova-chrome.test.ts: una lezione finta
// (visualizzazioni-prova.md, qui accanto) con le visualizzazioni che non sono ancora in una lezione
// vera, mostrate dai componenti veri (VisualizationBlock) con lo stile vero. Il tema si sceglie con
// #dark nell'indirizzo. Non entra nell'app.

import { render } from "preact";
import { RichText } from "../../../src/app/componenti/RichText";
import { parseLesson } from "../../../src/contenuti/formato";
import { VisualizationBlock } from "../../../src/visualizzazioni";
import lessonText from "./visualizzazioni-prova.md";

document.documentElement.setAttribute("data-theme", location.hash === "#dark" ? "dark" : "light");

const parsed = parseLesson(lessonText);
render(
  <main class="page">
    {parsed.lesson ? null : <p role="alert">{JSON.stringify(parsed)}</p>}
    {parsed.lesson?.blocks.map((block, index) =>
      block.kind === "text" ? (
        <RichText key={index} text={block.body} class="lesson-text" />
      ) : block.kind === "visualization" ? (
        <VisualizationBlock key={index} id={block.id} params={block.params} />
      ) : null,
    )}
  </main>,
  document.getElementById("app") as HTMLElement,
);
