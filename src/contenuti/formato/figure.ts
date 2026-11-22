// Il blocco «figura» delle lezioni: una figura SVG scritta a mano (diagrammi di Venn, figure di
// geometria) in un file accanto alla lezione. Qui ci sono le regole del nome del file e il controllo
// del contenuto: SVG semplice, senza script né riferimenti esterni, colori solo dalle classi del tema.

/** Le classi che una figura può usare; i colori li danno le variabili del tema (styles.css). */
export const FIGURE_CLASSES = [
  "fig-linea", // contorno, inchiostro
  "fig-sottile", // linea di costruzione, sottile e chiara
  "fig-tratteggio", // linea tratteggiata
  "fig-accento", // contorno arancione (evidenza)
  "fig-area-1", // riempimento blu trasparente
  "fig-area-2", // riempimento arancione trasparente
  "fig-area-3", // riempimento verde trasparente
  "fig-pieno", // riempimento pieno inchiostro (punti, frecce)
  "fig-testo", // testo dell'interfaccia
  "fig-testo-corsivo", // lettere matematiche (A, B, x)
] as const;

export type FigureClass = (typeof FIGURE_CLASSES)[number];

/** Dimensione massima del file: una figura scritta a mano sta ben sotto. */
const MAX_BYTES = 30_000;

/** Elementi ammessi: forme, testo, gruppi, definizioni locali. */
const ELEMENTS = new Set([
  "svg", "g", "defs", "title", "desc", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse",
  "text", "tspan", "marker", "clipPath", "use", "pattern",
]);

/** Attributi che portano un colore: ammessi solo «none» e «currentColor». */
const COLOR_ATTRIBUTES = new Set(["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"]);

/** Il nome del file di una figura: il numero della lezione, un trattino, un nome (l02-venn-unione.svg). */
export function figureFileProblem(file: string, lessonCode: string): string | null {
  const lesson = lessonCode.split(".").pop()?.toLowerCase() ?? "";
  if (!/^l\d\d-[a-z0-9]+(-[a-z0-9]+)*\.svg$/.test(file)) {
    return `Il file «${file}» non va bene: si chiama come la lezione, un trattino e un nome in minuscolo, con estensione .svg (esempio: ${lesson}-venn-unione.svg).`;
  }
  if (!file.startsWith(`${lesson}-`)) return `Il file «${file}» deve cominciare con «${lesson}-»: le figure stanno accanto alla loro lezione.`;
  return null;
}

/** Dove sta una figura, relativo a src/contenuti: V1.M01.L02 e l02-venn.svg → v1/m01/l02-venn.svg. */
export function figurePath(lessonCode: string, file: string): string {
  const [volume = "", module = ""] = lessonCode.toLowerCase().split(".");
  return `${volume}/${module}/${file}`;
}

/**
 * Controlla il testo SVG di una figura e restituisce i problemi (vuoto se va bene). Non lancia mai.
 * Controlla: un solo elemento <svg> con viewBox e senza larghezza fissa, tag chiusi, solo elementi di
 * disegno (niente script, immagini, stili), nessun riferimento fuori dal file, nessun colore scritto
 * (solo le classi fig-…), id che cominciano con il nome del file (in una pagina gli id sono comuni).
 */
export function checkFigure(svg: string, file: string): string[] {
  const problems: string[] = [];
  const stem = file.replace(/\.svg$/, "");
  if (svg.length > MAX_BYTES) problems.push(`La figura è troppo grande (${svg.length} caratteri, al più ${MAX_BYTES}).`);
  const text = svg.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!text.startsWith("<svg")) problems.push("La figura deve cominciare con <svg (senza intestazione <?xml).");
  if (!text.endsWith("</svg>")) problems.push("La figura deve finire con </svg>.");
  if (/<!|<\?|&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(text)) problems.push("La figura contiene dichiarazioni o entità non ammesse.");

  const stack: string[] = [];
  let roots = 0;
  const tag = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let last = 0;
  for (let match = tag.exec(text); match; match = tag.exec(text)) {
    const between = text.slice(last, match.index);
    if (between.includes("<") || between.includes(">")) problems.push("C'è un tag scritto male (controlla virgolette e parentesi angolari).");
    last = match.index + match[0].length;
    const [, closing, name = "", attributes = "", selfClosing] = match;
    if (closing) {
      if (stack.pop() !== name) problems.push(`Il tag </${name}> non chiude il tag aperto prima.`);
      continue;
    }
    if (stack.length === 0) roots++;
    if (!ELEMENTS.has(name)) problems.push(`L'elemento <${name}> non è ammesso in una figura.`);
    const attrs = new Map<string, string>();
    for (const [, key = "", double, single] of attributes.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs.set(key, double ?? single ?? "");
    for (const [key, value] of attrs) {
      const lower = key.toLowerCase();
      if (lower.startsWith("on")) problems.push(`L'attributo «${key}» (codice) non è ammesso.`);
      else if (lower === "style") problems.push("L'attributo «style» non è ammesso: per l'aspetto si usano le classi fig-….");
      else if (COLOR_ATTRIBUTES.has(lower) && value !== "none" && value !== "currentColor") {
        problems.push(`Il colore «${key}="${value}"» non è ammesso: i colori vengono dal tema, con le classi ${FIGURE_CLASSES.join(", ")}.`);
      } else if ((lower === "href" || lower === "xlink:href") && !value.startsWith("#")) problems.push(`Il riferimento «${value}» esce dal file: non è ammesso.`);
      else if (lower === "class") {
        for (const name of value.split(/\s+/).filter(Boolean)) {
          if (!(FIGURE_CLASSES as readonly string[]).includes(name)) problems.push(`La classe «${name}» non esiste. Classi disponibili: ${FIGURE_CLASSES.join(", ")}.`);
        }
      } else if (lower === "id" && !value.startsWith(`${stem}-`)) problems.push(`L'id «${value}» deve cominciare con «${stem}-»: nella pagina gli id devono essere unici.`);
      if (/url\(\s*(?!#)/.test(value)) problems.push(`Il riferimento «${value}» esce dal file: non è ammesso.`);
    }
    if (name === "svg" && stack.length === 0) {
      if (!attrs.has("viewBox")) problems.push("L'elemento <svg> deve avere il viewBox (per esempio viewBox=\"0 0 320 200\").");
      if (attrs.has("width") || attrs.has("height")) problems.push("L'elemento <svg> non ha width né height: la figura si adatta alla larghezza dello schermo.");
    }
    if (!selfClosing) stack.push(name);
  }
  const tail = text.slice(last);
  if (tail.includes("<") || tail.includes(">")) problems.push("C'è un tag scritto male (controlla virgolette e parentesi angolari).");
  if (stack.length > 0) problems.push(`Il tag <${stack[stack.length - 1]}> non è chiuso.`);
  if (roots !== 1) problems.push("La figura deve contenere un solo elemento <svg>, che racchiude tutto.");
  if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(text.replace(/href="#[^"]*"|url\(#[^)]*\)/g, ""))) {
    problems.push("La figura contiene un codice di colore: i colori vengono dal tema, con le classi fig-….");
  }
  return [...new Set(problems)];
}
