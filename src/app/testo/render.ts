// Da testo ricco (Markdown con formule e rimandi) a HTML.
// Le formule e i rimandi si tolgono prima di passare il testo a marked, lasciando dei segnaposto:
// così la libreria Markdown non tocca il LaTeX (dove _ e * hanno un altro significato). Poi i
// segnaposto vengono sostituiti con il disegno di KaTeX e con i termini toccabili.
// Entra qui solo testo dell'app (lezioni, generatori, catalogo errori): mai testo scritto da Andrea.

import katex from "katex";
import { marked } from "marked";
import { splitInline } from "../../contenuti/formato";

const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Disegna una formula. Con throwOnError false una formula sbagliata si vede in rosso invece di rompere la pagina. */
export function renderMath(latex: string, display = false): string {
  const html = katex.renderToString(latex, { displayMode: display, throwOnError: false });
  // Le formule a centro pagina scorrono di lato quando sono lunghe, invece di rimpicciolirsi.
  return display ? `<div class="formula formula-display">${html}</div>` : `<span class="formula">${html}</span>`;
}

/** Fin qui una formula in riga è «breve» (conta il sorgente LaTeX): $0$, $x = 3$, $x \\ne -1$. */
const SHORT_FORMULA = 16;

/**
 * L'HTML di un testo ricco. Con `inline` il risultato non ha paragrafi (per titoli, opzioni, etichette).
 * I rimandi [[…]] diventano pulsanti con l'attributo data-ref: chi mostra il testo decide che cosa aprono.
 */
export function renderRichText(text: string, options: { readonly inline?: boolean } = {}): string {
  const pieces: string[] = [];
  // Le formule brevi in riga: la punteggiatura che le segue non deve andare a capo da sola.
  const short = new Set<number>();
  const hold = (html: string, display: boolean): string => {
    pieces.push(html);
    const token = `@@${display ? "D" : "M"}${pieces.length - 1}@@`;
    // Una formula a centro pagina sta in un paragrafo suo.
    return display ? `\n\n${token}\n\n` : token;
  };
  const source = splitInline(text)
    .map((segment) => {
      switch (segment.kind) {
        case "text":
          return segment.text;
        case "math":
          if (segment.latex.length <= SHORT_FORMULA && !(segment.display && !options.inline)) short.add(pieces.length);
          return hold(renderMath(segment.latex, segment.display && !options.inline), segment.display && !options.inline);
        case "ref":
          return hold(`<button type="button" class="ref" data-ref="${escapeHtml(segment.target)}">${escapeHtml(segment.label ?? segment.target.replaceAll("-", " "))}</button>`, false);
      }
    })
    .join("");
  const html = options.inline ? (marked.parseInline(source, { async: false }) as string) : (marked.parse(source, { async: false }) as string);
  return html
    .replace(/<p>@@D(\d+)@@<\/p>/g, (_, index: string) => pieces[Number(index)] ?? "")
    // «…la frazione vale 0.»: il punto resta attaccato alla formula. Solo per le formule brevi: una lunga
    // deve poter andare a capo al suo interno, altrimenti la riga esce dallo schermo del telefono.
    .replace(/@@M(\d+)@@([.,;:!?»)]+)/g, (whole: string, index: string, tail: string) => (short.has(Number(index)) ? `<span class="math-tail">${pieces[Number(index)] ?? ""}${tail}</span>` : whole))
    .replace(/@@[DM](\d+)@@/g, (_, index: string) => pieces[Number(index)] ?? "");
}
