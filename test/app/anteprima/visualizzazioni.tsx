// Pagina di prova per test/app/visualizzazioni-chrome.test.ts: la lezione vera V1.M06.L04, con il
// testo e i blocchi «visualizzazione» mostrati dai componenti veri (VisualizationBlock, come in
// LessonView) e lo stile vero. Il tema si sceglie con #dark nell'indirizzo. Non entra nell'app.

import { render } from "preact";
import { RichText } from "../../../src/app/componenti/RichText";
import { parseLesson } from "../../../src/contenuti/formato";
import lessonText from "../../../src/contenuti/v1/m06/l04.md";
import { VisualizationBlock } from "../../../src/visualizzazioni";

document.documentElement.setAttribute("data-theme", location.hash === "#dark" ? "dark" : "light");

const lesson = parseLesson(lessonText).lesson;
render(
  <main class="page">
    {lesson?.blocks.map((block, index) =>
      block.kind === "text" ? (
        <RichText key={index} text={block.body} class="lesson-text" />
      ) : block.kind === "visualization" ? (
        <VisualizationBlock key={index} id={block.id} params={block.params} />
      ) : null,
    )}
  </main>,
  document.getElementById("app") as HTMLElement,
);
