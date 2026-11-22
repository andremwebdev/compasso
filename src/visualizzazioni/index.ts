// L'elenco delle visualizzazioni (specifica, sezione 11): codice → componente e controllo dei
// parametri. Le visualizzazioni sono poche e restano nel file principale, non nei moduli. Da qui la
// verifica dei contenuti riceve i codici esistenti e il controllo dei parametri, e LessonView
// sceglie il componente (VisualizationBlock).

import { h, type ComponentType } from "preact";
import type { VisualizationCode } from "../codici";
import { VisualizationBox, VisualizationProblem } from "./comuni";
import { InequalityGraph } from "./disequazioni-grafico";
import { checkInequalityParams } from "./disequazioni-grafico-math";

/** Una visualizzazione: il componente (riceve i parametri della lezione, come testo) e il loro controllo. */
export interface VisualizationDefinition {
  readonly code: VisualizationCode;
  readonly component: ComponentType<{ params: Readonly<Record<string, string>> }>;
  /** I problemi dei parametri della lezione; vuoto se vanno bene. Non lancia mai. */
  readonly checkParams: (params: Readonly<Record<string, string>>) => readonly string[];
}

/** Le visualizzazioni che esistono. Una nuova si aggiunge qui (REGOLE.md, «Come aggiungere una visualizzazione»). */
export const VISUALIZATIONS: readonly VisualizationDefinition[] = [
  { code: "VIS.disequazioni-grafico", component: InequalityGraph, checkParams: checkInequalityParams },
];

/** I codici delle visualizzazioni esistenti (per la verifica dei contenuti). */
export const visualizationCodes: readonly string[] = VISUALIZATIONS.map((item) => item.code);

/** La visualizzazione con quel codice, se esiste. */
export const findVisualization = (code: string): VisualizationDefinition | undefined => VISUALIZATIONS.find((item) => item.code === code);

/** Il controllo dei parametri per la verifica dei contenuti (ContentCatalog.visualizationParams). */
export function checkVisualizationParams(code: string, params: Readonly<Record<string, string>>): readonly string[] {
  const found = findVisualization(code);
  return found ? found.checkParams(params) : [`la visualizzazione ${code} non esiste.`];
}

/** Il blocco «visualizzazione» di una lezione: il componente giusto, o un messaggio se il codice non esiste. */
export function VisualizationBlock({ id, params }: { id: string; params: Readonly<Record<string, string>> }) {
  const found = findVisualization(id);
  // Scritto con h(): questo file resta .ts, come gli altri index.
  if (!found) return h(VisualizationBox, { title: id }, h(VisualizationProblem, { messages: [`La visualizzazione ${id} non esiste.`] }));
  return h(found.component, { params });
}
