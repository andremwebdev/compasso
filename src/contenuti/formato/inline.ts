// Testo in riga: separa il testo normale dalle formule ($...$, $$...$$) e dai rimandi ([[...]]).
// La libreria Markdown riceve solo le parti di testo: così non tocca il LaTeX (dove _ e * hanno
// un altro significato) e i rimandi diventano termini toccabili.

export type InlineSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "math"; readonly latex: string; readonly display: boolean }
  /** Rimando a un termine del glossario, a una lezione, a una definizione o a un teorema. */
  | { readonly kind: "ref"; readonly target: string; readonly label?: string };

/**
 * Spezza un testo nelle sue parti. `\$` è un dollaro vero. Una formula non chiusa resta testo
 * (unbalancedMath lo segnala a chi controlla le lezioni).
 */
export function splitInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = "";
  const flush = (): void => {
    if (buffer !== "") segments.push({ kind: "text", text: buffer });
    buffer = "";
  };
  let pos = 0;
  while (pos < text.length) {
    const ch = text[pos] as string;
    if (ch === "\\" && text[pos + 1] === "$") {
      buffer += "$";
      pos += 2;
      continue;
    }
    if (ch === "$") {
      const display = text[pos + 1] === "$";
      const open = display ? 2 : 1;
      const end = findClosingDollar(text, pos + open, display);
      if (end >= 0) {
        flush();
        segments.push({ kind: "math", latex: text.slice(pos + open, end).trim(), display });
        pos = end + open;
        continue;
      }
    }
    if (ch === "[" && text[pos + 1] === "[") {
      const end = text.indexOf("]]", pos + 2);
      if (end >= 0 && !text.slice(pos + 2, end).includes("\n")) {
        const [target = "", label] = text.slice(pos + 2, end).split("|");
        flush();
        segments.push(label === undefined ? { kind: "ref", target: target.trim() } : { kind: "ref", target: target.trim(), label: label.trim() });
        pos = end + 2;
        continue;
      }
    }
    buffer += ch;
    pos += 1;
  }
  flush();
  return segments;
}

function findClosingDollar(text: string, from: number, display: boolean): number {
  for (let pos = from; pos < text.length; pos++) {
    if (text[pos] === "\\") {
      pos += 1;
      continue;
    }
    if (text[pos] === "$" && (!display || text[pos + 1] === "$")) return pos;
  }
  return -1;
}

/** Vero se nel testo c'è una formula aperta e non chiusa (un dollaro non protetto rimasto spaiato). */
export function unbalancedMath(text: string): boolean {
  const withoutEscaped = text.replace(/\\\$/g, "");
  const withoutDisplay = withoutEscaped.replace(/\$\$[\s\S]*?\$\$/g, "");
  const withoutInline = withoutDisplay.replace(/\$[^$]*\$/g, "");
  return withoutInline.includes("$");
}
