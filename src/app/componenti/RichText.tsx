import { useMemo } from "preact/hooks";
import { renderRichText } from "../testo/render";

interface RichTextProps {
  /** Markdown con formule tra $...$ e rimandi tra [[...]]. */
  text: string;
  /** Se vero il testo sta in riga, senza paragrafi (titoli, opzioni, etichette). */
  inline?: boolean;
  class?: string;
}

/** Mostra un testo ricco dell'app. Le formule si disegnano quando il testo compare, non prima. */
export function RichText({ text, inline = false, class: className }: RichTextProps) {
  const html = useMemo(() => renderRichText(text, { inline }), [text, inline]);
  const Tag = inline ? "span" : "div";
  return <Tag class={className ? `rich ${className}` : "rich"} dangerouslySetInnerHTML={{ __html: html }} />;
}
