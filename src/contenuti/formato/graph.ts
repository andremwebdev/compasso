// Il blocco «grafico» delle lezioni: legge il testo dei parametri (funzioni, finestra, punti) con il
// parser del motore e prepara il grafico. Non lancia mai: un parametro sbagliato diventa un messaggio
// in italiano, che la verifica dei contenuti segnala e la lezione mostra dentro il riquadro.

import { graphToSvg, plotGraph, type Graph, type GraphWindow } from "../../motore/display";
import { EngineError } from "../../motore/errors";
import { evaluate, type Expr } from "../../motore/expr";
import { variables } from "../../motore/expr";
import { parseExpression } from "../../motore/parser";

/** I parametri del blocco come sono scritti nel file. */
export interface GraphParams {
  readonly functions: string;
  readonly window: string;
  readonly points: string;
}

export type GraphReading =
  | { readonly ok: true; readonly graph: Graph; readonly functions: readonly Expr[] }
  | { readonly ok: false; readonly problems: readonly string[] };

/** Divide un elenco separato da punto e virgola: «x^2; 2x + 1». */
const items = (text: string): string[] => text.split(";").map((item) => item.trim());

/** Una costante scritta a mano (−2, 3/2, 2pi): il suo valore, oppure il motivo per cui non va. */
function readConstant(text: string, what: string): { value: Expr; number: number } | string {
  if (text === "") return `${what}: manca il valore.`;
  const parsed = parseExpression(text);
  if (!parsed.ok || !parsed.complete) return `${what}: «${text}» non si legge (${parsed.ok ? "testo incompleto" : parsed.error.message})`;
  if (variables(parsed.value).length > 0) return `${what}: «${text}» deve essere un numero, senza lettere.`;
  const number = evaluate(parsed.value);
  if (!Number.isFinite(number)) return `${what}: «${text}» non è un numero reale.`;
  return { value: parsed.value, number };
}

/** Legge i parametri e calcola il grafico. Non lancia mai. */
export function readGraph(params: GraphParams): GraphReading {
  const problems: string[] = [];

  const functions: Expr[] = [];
  if (params.functions.trim() === "") problems.push("Manca «funzioni»: per esempio funzioni=\"x^2 - 1\".");
  else {
    items(params.functions).forEach((text, index) => {
      const parsed = parseExpression(text);
      if (text === "") problems.push(`Funzione ${index + 1}: è vuota (c'è un «;» di troppo?).`);
      else if (!parsed.ok) problems.push(`Funzione ${index + 1}: «${text}» non si legge (${parsed.error.message})`);
      else if (!parsed.complete) problems.push(`Funzione ${index + 1}: «${text}» è incompleta.`);
      else functions.push(parsed.value);
    });
  }

  let window: GraphWindow | null = null;
  const bounds = items(params.window);
  if (params.window.trim() === "") problems.push("Manca «finestra»: per esempio finestra=\"-5; 5; -3; 3\" (x minimo; x massimo; y minimo; y massimo).");
  else if (bounds.length !== 4) problems.push(`La finestra ha ${bounds.length} valori: ne servono 4 (x minimo; x massimo; y minimo; y massimo).`);
  else {
    const names = ["x minimo", "x massimo", "y minimo", "y massimo"];
    const values = bounds.map((text, index) => readConstant(text, `Finestra, ${names[index]}`));
    const numbers = values.flatMap((value) => (typeof value === "string" ? [] : [value.number]));
    for (const value of values) if (typeof value === "string") problems.push(value);
    if (numbers.length === 4) {
      const [xMin, xMax, yMin, yMax] = numbers as [number, number, number, number];
      window = { xMin, xMax, yMin, yMax };
    }
  }

  const points: Expr[] = [];
  if (params.points.trim() !== "") {
    for (const text of items(params.points)) {
      const value = readConstant(text, "Punti");
      if (typeof value === "string") problems.push(value);
      else points.push(value.value);
    }
  }

  if (problems.length > 0 || !window) return { ok: false, problems };
  try {
    return { ok: true, graph: plotGraph(functions, window, { points }), functions };
  } catch (error) {
    if (error instanceof EngineError) return { ok: false, problems: [error.message] };
    throw error;
  }
}

/** Il grafico in SVG, pronto da mettere nella pagina (solo classi: i colori vengono dal tema). */
export function graphSvg(reading: Extract<GraphReading, { ok: true }>, params: GraphParams, idPrefix: string): string {
  return graphToSvg(reading.graph, { label: `Grafico di ${items(params.functions).map((f) => `y = ${f}`).join(" e ")}`, idPrefix });
}
