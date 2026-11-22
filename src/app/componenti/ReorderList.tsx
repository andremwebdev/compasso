// Un elenco da rimettere in ordine con le frecce su e giù (decisione 83: più sicuro del trascinamento
// sul telefono). Gli elementi fissi sono tratteggiati e non hanno frecce. Lo usano la risposta
// `ordering` della schermata di esercizio e la modalità «riordina» delle dimostrazioni.

import type { ComponentChildren } from "preact";
import { moveItem, moveTarget } from "../risposta/ordering";
import { RichText } from "./RichText";

export interface ReorderItem {
  readonly content: string;
  readonly fixed?: boolean | undefined;
}

interface ReorderListProps {
  items: readonly ReorderItem[];
  /** order[k] è l'indice (in `items`) dell'elemento mostrato al posto k. */
  order: readonly number[];
  /** Assente: l'elenco è bloccato (dopo la risposta) e le frecce spariscono. */
  onChange?: ((order: number[]) => void) | undefined;
  /** Dopo la risposta: ogni posto segnato giusto (✓) o sbagliato (✗), mai solo con il colore. */
  marks?: boolean | undefined;
  /** Qualcosa sotto il testo di un elemento (la giustificazione di un passaggio). */
  extra?: ((item: number) => ComponentChildren) | undefined;
  label: string;
}

/** L'elenco da riordinare: numero del posto, testo, frecce (o il segno ✓/✗ dopo la risposta). */
export function ReorderList({ items, order, onChange, marks = false, extra, label }: ReorderListProps) {
  return (
    <ol class="reorder" aria-label={label}>
      {order.map((itemIndex, position) => {
        const item = items[itemIndex];
        if (!item) return null;
        const right = itemIndex === position;
        const state = marks ? (right ? " reorder-right" : " reorder-wrong") : "";
        const canUp = moveTarget(order, items, position, -1) !== null;
        const canDown = moveTarget(order, items, position, 1) !== null;
        return (
          <li key={itemIndex} class={`proof-step${item.fixed ? " proof-step-fixed" : ""}${state}`} data-item={itemIndex}>
            <span class="muted-inline reorder-place">{position + 1}.</span>
            <span class="proof-step-body">
              <RichText text={item.content} />
              {extra?.(itemIndex)}
            </span>
            {marks ? (
              <span class="reorder-mark" aria-label={right ? "al posto giusto" : "fuori posto"}>
                {right ? "✓" : "✗"}
              </span>
            ) : (
              onChange &&
              !item.fixed && (
                <span class="proof-step-moves">
                  <button type="button" class="key" aria-label={`Sposta su il passaggio ${position + 1}`} disabled={!canUp} onClick={() => onChange(moveItem(order, items, position, -1))}>
                    ↑
                  </button>
                  <button type="button" class="key" aria-label={`Sposta giù il passaggio ${position + 1}`} disabled={!canDown} onClick={() => onChange(moveItem(order, items, position, 1))}>
                    ↓
                  </button>
                </span>
              )
            )}
          </li>
        );
      })}
    </ol>
  );
}
