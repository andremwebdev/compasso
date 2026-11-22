// VIS.coniche-parametri (scheda in docs/VISUALIZZAZIONI.md): circonferenza, parabola, ellisse e
// iperbole con i coefficienti dell'equazione sui cursori; la conica, i fuochi, gli assi, la direttrice
// e gli asintoti si aggiornano, e sotto il disegno gli elementi esatti. I vertici dell'ellisse e
// dell'iperbole si trascinano. Sotto c'è il piano vuoto dei grafici statici; sopra, un SVG con la
// stessa cornice.

import { useMemo, useState } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphToSvg } from "../motore/display";
import { toLatex } from "../motore/expr";
import { Rational } from "../motore/numbers/rational";
import { Slider, VisualizationBox, VisualizationProblem, pathOf, svgNumber, useDragHandle } from "./comuni";
import { COEFFICIENTS, WINDOW, readConicParams, studyConic, type ConicKind, type ConicLine, type ConicSetup } from "./coniche-parametri-math";
import { emptyPlane, frameOf, snapToStep } from "./parametri";

export const TITLE = "Coniche e coefficienti";

/** Il raggio dell'area di tocco delle maniglie, in unità del disegno (45 px a 320 px di schermo). */
const GRIP = 29;

const NAMES: Readonly<Record<ConicKind, string>> = { circonferenza: "Circonferenza", parabola: "Parabola", ellisse: "Ellisse", iperbole: "Iperbole" };

let instances = 0;

/** Il blocco della lezione: legge i parametri e, se vanno bene, mostra la visualizzazione. */
export function Conics({ params }: { params: Readonly<Record<string, string>> }) {
  const reading = useMemo(() => readConicParams(params), [params]);
  return (
    <VisualizationBox title={TITLE}>
      {reading.ok ? <ConicsView setup={reading.setup} /> : <VisualizationProblem messages={reading.problems} />}
    </VisualizationBox>
  );
}

function ConicsView({ setup }: { setup: ConicSetup }) {
  const frame = frameOf(WINDOW);
  const id = useMemo(() => `vis-coniche-${++instances}`, []);
  const [kind, setKind] = useState<ConicKind>(setup.kind);
  const [all, setAll] = useState(setup.coefficients);
  const values = all[kind];
  const spec = COEFFICIENTS[kind];
  const base = useMemo(() => graphToSvg(emptyPlane(WINDOW), { label: "Piano cartesiano", idPrefix: `${id}-base` }), [id]);
  const study = useMemo(() => studyConic(kind, values), [kind, values]);

  const setValue = (index: number, value: Rational): void => setAll((old) => ({ ...old, [kind]: old[kind].map((item, k) => (k === index ? value : item)) }));
  const range = (index: number) => (spec[index] as (typeof spec)[number]).range;
  const gripA = useDragHandle((point) => setValue(0, snapToStep(Math.abs(frame.px(point.x)), range(0))));
  const gripB = useDragHandle((point) => setValue(1, snapToStep(Math.abs(frame.py(point.y)), range(1))));
  const withVertices = kind === "ellisse" || kind === "iperbole";
  const a = values[0]?.toNumber() ?? 1;
  const b = values[1]?.toNumber() ?? 1;
  const X = (x: number) => svgNumber(frame.sx(x));
  const Y = (y: number) => svgNumber(frame.sy(y));
  const linePath = (line: ConicLine): string =>
    line.kind === "vertical"
      ? `M${X(line.x)} ${frame.top}V${frame.bottom}`
      : `M${X(WINDOW.xMin)} ${Y(line.m * WINDOW.xMin + line.q)}L${X(WINDOW.xMax)} ${Y(line.m * WINDOW.xMax + line.q)}`;

  return (
    <div class="vis-coniche">
      {setup.kinds.length > 1 && (
        <div class="vis-scelta" role="group" aria-label="Conica">
          {setup.kinds.map((item) => (
            <button key={item} type="button" class="vis-pulsante" aria-pressed={item === kind} onClick={() => setKind(item)}>
              {NAMES[item]}
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
            {kind === "iperbole" && <rect class="vis-rettangolo" x={X(-a)} y={Y(b)} width={svgNumber(frame.sx(a) - frame.sx(-a))} height={svgNumber(frame.sy(-b) - frame.sy(b))} />}
            {study.lines.map((line, k) => (
              <path key={k} class={`vis-linea-${line.role}`} d={linePath(line)} />
            ))}
            <path class="vis-conica" d={pathOf(study.segments, frame.sx, frame.sy)} />
            {study.points.map((p) => (
              <circle key={p.name} class="vis-punto" cx={X(p.x)} cy={Y(p.y)} r="3.5" />
            ))}
            {study.foci.map((p) => (
              <circle key={p.name} class="vis-fuoco" cx={X(p.x)} cy={Y(p.y)} r="4.5" />
            ))}
          </g>
          {study.foci.map((p) => (
            <text key={p.name} x={svgNumber(frame.sx(p.x) + 6)} y={svgNumber(frame.sy(p.y) - 7)}>
              {p.name.replace("_", "")}
            </text>
          ))}
          {(kind === "circonferenza" || kind === "parabola") &&
            study.points.map((p) => (
              <text key={p.name} class="vis-nome" x={svgNumber(frame.sx(p.x) - 6)} y={svgNumber(frame.sy(p.y) + 15)} text-anchor="end">
                {p.name}
              </text>
            ))}
          {withVertices && (
            <g class="vis-maniglia vis-maniglia-a" {...gripA}>
              <circle class="vis-presa" cx={X(a)} cy={Y(0)} r={GRIP} />
              <circle class="vis-maniglia-segno" cx={X(a)} cy={Y(0)} r="6.5" />
            </g>
          )}
          {withVertices && (
            <g class="vis-maniglia vis-maniglia-b" {...gripB}>
              <circle class="vis-presa" cx={X(0)} cy={Y(b)} r={GRIP} />
              <circle class="vis-maniglia-segno" cx={X(0)} cy={Y(b)} r="6.5" />
            </g>
          )}
        </svg>
      </div>

      <RichText class="vis-formula" text={`$$${study.equation}$$`} />

      {kind === "iperbole" && (
        <div class="vis-scelta vis-versi" role="group" aria-label="Secondo membro">
          {[1, -1].map((sign) => (
            <button key={sign} type="button" class="vis-pulsante" aria-pressed={values[2]?.toNumber() === sign} onClick={() => setValue(2, Rational.of(sign))}>
              <RichText text={`$\\cdots = ${sign}$`} inline />
            </button>
          ))}
        </div>
      )}

      <div class="vis-cursori">
        {spec.map((item, index) =>
          kind === "iperbole" && index === 2 ? null : (
            <Slider
              key={`${kind}-${item.name}`}
              label={`Coefficiente ${item.name}`}
              min={item.range.min.toNumber()}
              max={item.range.max.toNumber()}
              step={item.range.step.toNumber()}
              value={values[index]?.toNumber() ?? 0}
              valueText={`$${item.name} = ${toLatex({ kind: "num", value: values[index] ?? Rational.ZERO })}$`}
              onInput={(value) => setValue(index, snapToStep(value, item.range))}
            />
          ),
        )}
      </div>

      <div class="vis-passi">
        <ul>
          {study.facts.map((fact, k) => (
            <li key={k}>
              <RichText text={fact} inline />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
