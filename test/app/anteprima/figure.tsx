// Pagina di prova per test/app/grafici-chrome.test.ts: la lezione di prova (test/contenuti/prova)
// con i riquadri veri dell'app per grafico e figura, e lo stile vero (styles.css). Il tema si sceglie
// con #dark nell'indirizzo. Non entra nell'app.

import { render } from "preact";
import { parseLesson } from "../../../src/contenuti/formato";
import { FigureBlock, GraphBlock } from "../../../src/app/lezione/figure";
import lessonText from "../../contenuti/prova/v1/m01/l99.md";
import venn from "../../contenuti/prova/v1/m01/l99-venn-unione.svg";

if (location.hash === "#dark") document.documentElement.setAttribute("data-theme", "dark");
else document.documentElement.setAttribute("data-theme", "light");

const lesson = parseLesson(lessonText).lesson;
const figures: Record<string, string> = { "l99-venn-unione.svg": venn };
const root = document.getElementById("app") as HTMLElement;
render(
  <main class="lesson">
    {lesson?.blocks.map((block) =>
      block.kind === "graph" ? (
        <GraphBlock block={block} lesson={lesson.meta.code} />
      ) : block.kind === "figure" ? (
        <FigureBlock block={block} source={figures[block.file]} />
      ) : null,
    )}
    {/* Un parametro sbagliato: il riquadro mostra il messaggio, la pagina resta in piedi. */}
    <GraphBlock block={{ kind: "graph", line: 0, functions: "(x-1/(x+2)", window: "-5; 5; -3; 3", points: "", caption: "Un grafico con un parametro sbagliato." }} lesson="V1.M01.L99" />
    <FigureBlock block={{ kind: "figure", line: 0, file: "l99-manca.svg", caption: "Una figura che non c'è." }} source={undefined} />
  </main>,
  root,
);
