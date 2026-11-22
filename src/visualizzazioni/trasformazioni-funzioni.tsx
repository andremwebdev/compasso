// VIS.trasformazioni-funzioni (scheda in docs/VISUALIZZAZIONI.md): il grafico di f (sottile,
// tratteggiato) e quello di y = a·f(b(x − c)) + d (blu, spesso), con i cursori su a, b, c, d, il punto
// P' da trascinare (traslazione) e l'elenco delle trasformazioni nell'ordine in cui si applicano.
// Il grafico di base è quello dei grafici statici; sopra, un secondo SVG con la stessa cornice.

import { useMemo, useState } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphToSvg } from "../motore/display";
import { evaluate, toLatex } from "../motore/expr";
import { Slider, VisualizationBox, VisualizationProblem, pathOf, svgNumber, useDragHandle } from "./comuni";
import { frameOf, snapToStep } from "./parametri";
import {
  LETTERS, RANGES, formulaLatex, imagePoint, pointsLatex, rationalLatex, readTransformParams, transformSteps, transformedGraph,
  type TransformLetter, type TransformSetup, type TransformValues,
} from "./trasformazioni-funzioni-math";

export const TITLE = "Trasformazioni dei grafici";

/** Il raggio dell'area di tocco delle maniglie, in unità del disegno (45 px a 320 px di schermo). */
const GRIP = 29;

let instances = 0;

/** Il blocco della lezione: legge i parametri e, se vanno bene, mostra la visualizzazione. */
export function FunctionTransforms({ params }: { params: Readonly<Record<string, string>> }) {
  const reading = useMemo(() => readTransformParams(params), [params]);
  return (
    <VisualizationBox title={TITLE}>
      {reading.ok ? <FunctionTransformsView setup={reading.setup} /> : <VisualizationProblem messages={reading.problems} />}
    </VisualizationBox>
  );
}

function FunctionTransformsView({ setup }: { setup: TransformSetup }) {
  const { window } = setup;
  const frame = frameOf(window);
  const id = useMemo(() => `vis-trasf-${++instances}`, []);
  const [chosen, setChosen] = useState(0);
  const [values, setValues] = useState<TransformValues>(setup.values);
  const current = setup.functions[chosen] ?? (setup.functions[0] as TransformSetup["functions"][number]);

  // Il grafico di partenza cambia solo con la funzione (senza punti né lettere).
  const base = useMemo(
    () => graphToSvg({ ...current.graph, points: [] }, { label: `Grafico di partenza y = ${current.text}`, idPrefix: `${id}-base` }),
    [current, id],
  );
  const moved = useMemo(() => transformedGraph(current.expr, values, window), [current, values, window]);
  const image = imagePoint(current, values);
  const imageX = image.x.toNumber();
  const imageY = evaluate(image.y);
  const startX = current.x0.toNumber();
  const startY = evaluate(current.y0);

  const set = (letter: TransformLetter, value: number): void => setValues((old) => ({ ...old, [letter]: snapToStep(value, RANGES[letter]) }));
  const canTranslate = setup.sliders.includes("c") || setup.sliders.includes("d");
  // Trascinare P' trasla il grafico: cambiano c e d (solo quelli che hanno il cursore).
  const grip = useDragHandle((point) =>
    setValues((old) => ({
      ...old,
      c: setup.sliders.includes("c") ? snapToStep(frame.px(point.x) - startX / old.b.toNumber(), RANGES.c) : old.c,
      d: setup.sliders.includes("d") ? snapToStep(frame.py(point.y) - old.a.toNumber() * startY, RANGES.d) : old.d,
    })),
  );
  const steps = transformSteps(values);
  const inside = (px: number, py: number) => px >= window.xMin && px <= window.xMax && py >= window.yMin && py <= window.yMax;

  return (
    <div class="vis-trasformazioni">
      {setup.functions.length > 1 && (
        <div class="vis-scelta" role="group" aria-label="Funzione di partenza">
          {setup.functions.map((f, index) => (
            <button key={index} type="button" class="vis-pulsante" aria-pressed={index === chosen} onClick={() => setChosen(index)}>
              <RichText text={`$f(x) = ${toLatex(f.expr)}$`} inline />
            </button>
          ))}
        </div>
      )}

      <div class="vis-piano">
        <div class="grafico-disegno" dangerouslySetInnerHTML={{ __html: base }} />
        <svg class="vis-sopra" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-area`}>
              <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} />
            </clipPath>
          </defs>
          <g clip-path={`url(#${id}-area)`}>
            {moved.asymptotes.map((asymptote, index) => (
              <path key={index} class="vis-asintoto" d={`M${svgNumber(frame.sx(evaluate(asymptote.x)))} ${frame.top}V${frame.bottom}`} />
            ))}
            <path class="vis-curva-trasformata" d={pathOf(moved.curves[0]?.segments ?? [], frame.sx, frame.sy)} />
            {inside(startX, startY) && inside(imageX, imageY) && (
              <path class="vis-freccia" d={`M${svgNumber(frame.sx(startX))} ${svgNumber(frame.sy(startY))}L${svgNumber(frame.sx(imageX))} ${svgNumber(frame.sy(imageY))}`} />
            )}
            {inside(startX, startY) && <circle class="vis-punto-partenza" cx={svgNumber(frame.sx(startX))} cy={svgNumber(frame.sy(startY))} r="4" />}
          </g>
          {inside(startX, startY) && (
            <text x={svgNumber(frame.sx(startX) - 7)} y={svgNumber(frame.sy(startY) - 7)} text-anchor="end" class="vis-nome-partenza">
              P
            </text>
          )}
          {inside(imageX, imageY) && (
            <g class={`vis-maniglia vis-maniglia-punto${canTranslate ? "" : " vis-ferma"}`} {...(canTranslate ? grip : {})}>
              {canTranslate && <circle class="vis-presa" cx={svgNumber(frame.sx(imageX))} cy={svgNumber(frame.sy(imageY))} r={GRIP} />}
              <circle class="vis-maniglia-segno" cx={svgNumber(frame.sx(imageX))} cy={svgNumber(frame.sy(imageY))} r="7" />
              <text x={svgNumber(frame.sx(imageX) + 10)} y={svgNumber(frame.sy(imageY) - 9)}>
                P'
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Sotto il disegno: sopra, un'altezza che cambia sposterebbe il disegno sotto il dito. */}
      <RichText class="vis-formula" text={`$$${formulaLatex(current.expr, values)}$$`} />
      <div class="vis-cursori">
        {LETTERS.filter((letter) => setup.sliders.includes(letter)).map((letter) => (
          <Slider
            key={letter}
            label={`Numero ${letter}`}
            min={RANGES[letter].min.toNumber()}
            max={RANGES[letter].max.toNumber()}
            step={RANGES[letter].step.toNumber()}
            value={values[letter].toNumber()}
            valueText={`$${letter} = ${rationalLatex(values[letter])}$`}
            onInput={(value) => set(letter, value)}
          />
        ))}
      </div>

      <RichText class="vis-punti" text={`$${pointsLatex(current, values)}$`} />
      {inside(imageX, imageY) ? null : <RichText class="vis-nota" text="Il punto $P'$ è fuori dalla finestra: avvicina i numeri ai valori iniziali." />}
      <div class="vis-passi">
        <RichText class="vis-passi-titolo" text="Dal grafico di $f$ a quello nuovo, in quest'ordine:" />
        {steps.length === 0 ? (
          <RichText text="Nessuna trasformazione: con $a = b = 1$ e $c = d = 0$ il grafico resta quello di $f$." />
        ) : (
          <ol>
            {steps.map((step, index) => (
              <li key={index}>
                <RichText text={step} inline />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
