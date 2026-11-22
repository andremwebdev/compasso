// Il riordino con le frecce su e giù (decisione 83): un elemento si scambia con il vicino spostabile,
// i fissi restano al loro posto. Lo usano la risposta `ordering` della schermata di esercizio e la
// modalità «riordina» delle dimostrazioni.

/** Quello che serve sapere di un elemento per spostarlo: se è fisso. */
export interface Movable {
  readonly fixed?: boolean | undefined;
}

/** Il posto in cui finisce l'elemento in posizione `from` spostandolo di uno nel verso dato; null se non si può. */
export function moveTarget(order: readonly number[], items: readonly Movable[], from: number, direction: -1 | 1): number | null {
  if (items[order[from] ?? -1]?.fixed) return null;
  let to = from + direction;
  while (to >= 0 && to < order.length && items[order[to] ?? -1]?.fixed) to += direction;
  return to < 0 || to >= order.length ? null : to;
}

/**
 * Sposta l'elemento in posizione `from` di uno su (−1) o giù (+1), saltando gli elementi fissi.
 * `order[k]` è l'indice (nell'elenco originale) dell'elemento al posto k. Se non si può, l'ordine resta com'è.
 */
export function moveItem(order: readonly number[], items: readonly Movable[], from: number, direction: -1 | 1): number[] {
  const out = [...order];
  const to = moveTarget(order, items, from, direction);
  if (to === null) return out;
  [out[from], out[to]] = [out[to] as number, out[from] as number];
  return out;
}

/** Quanti elementi sono al posto giusto. */
export const rightPlaces = (order: readonly number[]): number => order.filter((value, index) => value === index).length;
