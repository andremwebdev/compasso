import katex from "katex";
import { useMemo } from "preact/hooks";

interface FormulaProps {
  /** Formula in LaTeX. */
  tex: string;
  /** Se vera, la formula sta su una riga a sé e scorre di lato quando è lunga. */
  display?: boolean;
}

/** Disegna una formula con KaTeX (caratteri incorporati: funziona offline). */
export function Formula({ tex, display = false }: FormulaProps) {
  const html = useMemo(
    // Con throwOnError false una formula sbagliata si vede in rosso invece di rompere la pagina.
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false }),
    [tex, display],
  );
  return (
    <span
      class={display ? "formula formula-display" : "formula"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
