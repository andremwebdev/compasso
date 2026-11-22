// VIS.esponenziale-logaritmo (scheda in docs/VISUALIZZAZIONI.md): i grafici di a^x, log_a x e della
// retta y = x con le unità uguali, la base da cambiare col cursore, il punto P sull'esponenziale e il
// suo simmetrico P' sul logaritmo. Il grafico di base è quello dei grafici statici (cambia con la
// base); sopra, un secondo SVG con la stessa cornice per i punti e la maniglia.

import { useMemo, useState } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphToSvg } from "../motore/display";
import { toLatex } from "../motore/expr";
import { Slider, VisualizationBox, VisualizationProblem, svgNumber, useDragHandle } from "./comuni";
import { approximateLatex } from "./disequazioni-grafico-math";
import {
  BASES, POINT_RANGE, WINDOW, compareWithOne, expLatex, expLogGraph, logLatex, mirrorPoints, notablePoints, properties, readExpLogParams, type ExpLogSetup,
} from "./esponenziale-logaritmo-math";
import { frameOf, snapToStep } from "./parametri";

export const TITLE = "Esponenziale e logaritmo";

/** Il raggio dell'area di tocco delle maniglie, in unità del disegno (45 px a 320 px di schermo). */
const GRIP = 29;

let instances = 0;

/** Il blocco della lezione: legge i parametri e, se vanno bene, mostra la visualizzazione. */
export function ExpLog({ params }: { params: Readonly<Record<string, string>> }) {
  const reading = useMemo(() => readExpLogParams(params), [params]);
  return (
    <VisualizationBox title={TITLE}>
      {reading.ok ? <ExpLogView setup={reading.setup} /> : <VisualizationProblem messages={reading.problems} />}
    </VisualizationBox>
  );
}

function ExpLogView({ setup }: { setup: ExpLogSetup }) {
  const frame = frameOf(WINDOW);
  const id = useMemo(() => `vis-esplog-${++instances}`, []);
  const [index, setIndex] = useState(setup.base);
  const [t, setT] = useState(setup.point);
  const base = BASES[index] ?? (BASES[0] as (typeof BASES)[number]);
  const { showLog } = setup;
  const constant = compareWithOne(base) === 0;

  const drawing = useMemo(
    () => graphToSvg(expLogGraph(base, showLog), { label: showLog ? `Grafici di ${expLatex(base)}, del logaritmo e di y = x` : `Grafico di ${expLatex(base)}`, idPrefix: `${id}-base` }),
    [base, showLog, id],
  );
  const points = notablePoints(base, showLog);
  const { p, q } = mirrorPoints(base, t);
  const inside = ([px, py]: readonly [number, number]) => px >= WINDOW.xMin && px <= WINDOW.xMax && py >= WINDOW.yMin && py <= WINDOW.yMax;
  const moveT = (value: number) => setT(snapToStep(value, POINT_RANGE).toNumber());
  const grip = useDragHandle((point) => moveT(frame.px(point.x)));
  const a = toLatex(base);
  const ty = approximateLatex(p[1]);
  const tx = approximateLatex(t);

  return (
    <div class="vis-esplog">
      <div class="vis-piano">
        <div class="grafico-disegno" dangerouslySetInnerHTML={{ __html: drawing }} />
        <svg class="vis-sopra" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-area`}>
              <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} />
            </clipPath>
          </defs>
          <g clip-path={`url(#${id}-area)`}>
            {showLog && constant && <path class="vis-simmetrico" d={`M${svgNumber(frame.sx(1))} ${frame.top}V${frame.bottom}`} />}
            {showLog && (inside(p) || inside(q)) && (
              <path class="vis-freccia" d={`M${svgNumber(frame.sx(p[0]))} ${svgNumber(frame.sy(p[1]))}L${svgNumber(frame.sx(q[0]))} ${svgNumber(frame.sy(q[1]))}`} />
            )}
            {points.map((point, k) => (
              <circle key={k} class={`vis-notevole vis-notevole-${point.curve}`} cx={svgNumber(frame.sx(point.x))} cy={svgNumber(frame.sy(point.y))} r="3.5" />
            ))}
            {showLog && inside(q) && <circle class="vis-punto vis-punto-simmetrico" cx={svgNumber(frame.sx(q[0]))} cy={svgNumber(frame.sy(q[1]))} r="5" />}
            {showLog && <circle class="vis-medio" cx={svgNumber(frame.sx((p[0] + q[0]) / 2))} cy={svgNumber(frame.sy((p[1] + q[1]) / 2))} r="3" />}
            {inside(p) && <circle class="vis-punto" cx={svgNumber(frame.sx(p[0]))} cy={svgNumber(frame.sy(p[1]))} r="5" />}
            <path class="vis-sonda-linea" d={`M${svgNumber(frame.sx(t))} ${frame.bottom}V${svgNumber(Math.max(frame.top, Math.min(frame.bottom, frame.sy(p[1]))))}`} />
          </g>
          {inside(p) && (
            <text class="vis-nome" x={svgNumber(frame.sx(p[0]) - 8)} y={svgNumber(frame.sy(p[1]) - 8)} text-anchor="end">
              P
            </text>
          )}
          {showLog && inside(q) && (
            <text x={svgNumber(frame.sx(q[0]) + 8)} y={svgNumber(frame.sy(q[1]) + 14)}>
              P'
            </text>
          )}
          <g class="vis-maniglia vis-maniglia-sonda" {...grip}>
            <circle class="vis-presa" cx={svgNumber(frame.sx(t))} cy={frame.bottom - 12} r={GRIP} />
            <path class="vis-maniglia-segno" d={`M${svgNumber(frame.sx(t))} ${frame.bottom - 20}l7 12h-14z`} />
          </g>
        </svg>
      </div>
      <ul class="vis-legenda">
        <li>
          <span class="legenda-segno vis-legenda-exp" aria-hidden="true" />
          <RichText text={`$${expLatex(base)}$`} inline />
        </li>
        {showLog && !constant && (
          <li>
            <span class="legenda-segno vis-legenda-log" aria-hidden="true" />
            <RichText text={`$${logLatex(base)}$`} inline />
          </li>
        )}
        {showLog && (
          <li>
            <span class="legenda-segno vis-legenda-bisettrice" aria-hidden="true" />
            <RichText text="$y = x$" inline />
          </li>
        )}
      </ul>

      <div class="vis-cursori">
        <Slider label="Base" min={0} max={BASES.length - 1} step={1} value={index} valueText={`$a = ${a}$`} onInput={(value) => setIndex(Math.round(value))} />
        <Slider label="Punto" min={POINT_RANGE.min.toNumber()} max={POINT_RANGE.max.toNumber()} step={POINT_RANGE.step.toNumber()} value={t} valueText={`$t = ${tx}$`} onInput={moveT} />
      </div>

      <RichText
        class="vis-punti"
        text={
          showLog && !constant
            ? `$P\\left(${tx};\\, ${ty}\\right)$ e $P'\\left(${ty};\\, ${tx}\\right)$: le coordinate si scambiano, $P$ e $P'$ sono simmetrici rispetto a $y = x$.`
            : `$P\\left(${tx};\\, ${ty}\\right)$, cioè $a^{t} \\approx ${ty}$.`
        }
      />
      <RichText
        class="vis-punti"
        text={`Punti esatti: ${points.map((point) => `$${point.latex}$`).join(", ")}.`}
      />
      <div class="vis-passi">
        <ul>
          {properties(base, showLog).map((line, k) => (
            <li key={k}>
              <RichText text={line} inline />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
