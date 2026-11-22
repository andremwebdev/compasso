// VIS.circonferenza-goniometrica (scheda in docs/VISUALIZZAZIONI.md): la circonferenza goniometrica
// con il punto P da trascinare, coseno e seno come segmenti sugli assi, la tangente sulla retta x = 1,
// gradi e radianti affiancati, valori esatti per i multipli di 15° e la tabella dei segni nei quadranti.
// Sotto c'è il piano vuoto dei grafici statici (assi e griglia); sopra, un SVG con la stessa cornice.

import { useMemo, useState } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphToSvg } from "../motore/display";
import { Slider, VisualizationBox, VisualizationProblem, svgNumber, useDragHandle } from "./comuni";
import { QUADRANT_SIGNS, WINDOW, angleLatex, quadrant, quadrantText, readCircleParams, snapAngle, trigValues, type CircleSetup } from "./circonferenza-goniometrica-math";
import { emptyPlane, frameOf } from "./parametri";

export const TITLE = "Circonferenza goniometrica";

/** Il raggio dell'area di tocco delle maniglie, in unità del disegno (45 px a 320 px di schermo). */
const GRIP = 29;

let instances = 0;

/** Il blocco della lezione: legge i parametri e, se vanno bene, mostra la visualizzazione. */
export function UnitCircle({ params }: { params: Readonly<Record<string, string>> }) {
  const reading = useMemo(() => readCircleParams(params), [params]);
  return (
    <VisualizationBox title={TITLE}>
      {reading.ok ? <UnitCircleView setup={reading.setup} /> : <VisualizationProblem messages={reading.problems} />}
    </VisualizationBox>
  );
}

const ROMAN = ["I", "II", "III", "IV"] as const;
const SIGN_LATEX = { "+": "+", "-": "-" } as const;

function UnitCircleView({ setup }: { setup: CircleSetup }) {
  const frame = frameOf(WINDOW);
  const id = useMemo(() => `vis-circ-${++instances}`, []);
  const [degrees, setDegrees] = useState(setup.degrees);
  const { showTangent } = setup;
  const base = useMemo(() => graphToSvg(emptyPlane(WINDOW), { label: "Piano cartesiano con la circonferenza goniometrica", idPrefix: `${id}-base` }), [id]);
  const grip = useDragHandle((point) => setDegrees((old) => snapAngle(frame.px(point.x), frame.py(point.y), old)));

  const values = trigValues(degrees);
  const c = values.cos.value;
  const s = values.sin.value;
  const q = quadrant(degrees);
  const X = (x: number) => svgNumber(frame.sx(x));
  const Y = (y: number) => svgNumber(frame.sy(y));
  const radius = frame.sx(1) - frame.sx(0);
  // L'arco dell'angolo, piccolo, in verso antiorario (nel disegno y va verso il basso).
  const arcR = 0.28;
  const rad = (degrees * Math.PI) / 180;
  const arc =
    degrees === 0
      ? ""
      : degrees === 360
        ? `M${X(arcR)} ${Y(0)}A${svgNumber(arcR * radius)} ${svgNumber(arcR * radius)} 0 1 0 ${X(-arcR)} ${Y(0)}A${svgNumber(arcR * radius)} ${svgNumber(arcR * radius)} 0 1 0 ${X(arcR)} ${Y(0)}`
        : `M${X(arcR)} ${Y(0)}A${svgNumber(arcR * radius)} ${svgNumber(arcR * radius)} 0 ${degrees > 180 ? 1 : 0} 0 ${X(arcR * Math.cos(rad))} ${Y(arcR * Math.sin(rad))}`;
  const tanValue = values.tan?.value ?? null;
  const tanShown = showTangent && tanValue !== null;

  return (
    <div class="vis-circonferenza">
      <div class="vis-piano">
        <div class="grafico-disegno" dangerouslySetInnerHTML={{ __html: base }} />
        <svg class="vis-sopra" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-area`}>
              <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} />
            </clipPath>
          </defs>
          <g clip-path={`url(#${id}-area)`}>
            <circle class="vis-circonferenza-linea" cx={X(0)} cy={Y(0)} r={svgNumber(radius)} />
            {showTangent && <path class="vis-retta-tangente" d={`M${X(1)} ${frame.top}V${frame.bottom}`} />}
            {tanShown && <path class="vis-freccia" d={`M${X(0)} ${Y(0)}L${X(1)} ${Y(tanValue)}`} />}
            {tanShown && <path class="vis-seg-tan" d={`M${X(1)} ${Y(0)}L${X(1)} ${Y(tanValue)}`} />}
            <path class="vis-freccia" d={`M${X(c)} ${Y(s)}L${X(0)} ${Y(s)}`} />
            <path class="vis-raggio" d={`M${X(0)} ${Y(0)}L${X(c)} ${Y(s)}`} />
            {arc && <path class="vis-arco" d={arc} />}
            <path class="vis-seg-cos" d={`M${X(0)} ${Y(0)}L${X(c)} ${Y(0)}`} />
            <path class="vis-seg-sin" d={`M${X(c)} ${Y(0)}L${X(c)} ${Y(s)}`} />
            {tanShown && <circle class="vis-punto-tan" cx={X(1)} cy={Y(tanValue)} r="4" />}
          </g>
          {ROMAN.map((name, k) => (
            <text key={name} class={`vis-quadrante${q === k + 1 ? " vis-quadrante-attivo" : ""}`} x={X(k === 0 || k === 3 ? 1.45 : -1.45)} y={Y(k < 2 ? 1.12 : -1.22)} text-anchor="middle">
              {name}
            </text>
          ))}
          {/* Sotto l'asse solo nel I quadrante: a sinistra, sotto, c'è la «O» dell'origine. */}
          {Math.abs(c) > 0.12 && (
            <text class="vis-nome-cos" x={X(c / 2)} y={svgNumber(frame.sy(0) + (c > 0 && s >= 0 ? 15 : -7))} text-anchor="middle">
              cos
            </text>
          )}
          {Math.abs(s) > 0.12 && (
            <text class="vis-nome-sin" x={svgNumber(frame.sx(c) + (c >= 0 ? 5 : -5))} y={Y(s / 2)} text-anchor={c >= 0 ? "start" : "end"}>
              sin
            </text>
          )}
          {tanShown && Math.abs(tanValue) > 0.12 && Math.abs(tanValue) < 1.3 && (
            <text class="vis-nome-tan" x={svgNumber(frame.sx(1) + 5)} y={Y(tanValue / 2)}>
              tan
            </text>
          )}
          {tanShown && Math.abs(tanValue) < 1.3 && (
            <text class="vis-nome-tan" x={svgNumber(frame.sx(1) + 7)} y={svgNumber(frame.sy(tanValue) + (tanValue >= 0 ? -6 : 14))}>
              T
            </text>
          )}
          <text class="vis-nome" x={svgNumber(frame.sx(c) + (c >= 0 ? 9 : -9))} y={svgNumber(frame.sy(s) + (s >= 0 ? -8 : 16))} text-anchor={c >= 0 ? "start" : "end"}>
            P
          </text>
          <g class="vis-maniglia vis-maniglia-angolo" {...grip}>
            <circle class="vis-presa" cx={X(c)} cy={Y(s)} r={GRIP} />
            <circle class="vis-maniglia-segno" cx={X(c)} cy={Y(s)} r="7" />
          </g>
        </svg>
      </div>

      <div class="vis-cursori">
        <Slider label="Angolo" min={0} max={360} step={1} value={degrees} valueText={`$\\alpha = ${angleLatex(degrees)}$`} onInput={(value) => setDegrees(Math.round(value))} />
      </div>

      <div class="vis-valori">
        <RichText class="vis-riga vis-valore-cos" text={`$\\cos\\alpha ${values.cos.latex}$`} />
        <RichText class="vis-riga vis-valore-sin" text={`$\\sin\\alpha ${values.sin.latex}$`} />
        {showTangent && (
          <RichText class="vis-riga vis-valore-tan" text={values.tan ? `$\\tan\\alpha ${values.tan.latex}$` : "$\\tan\\alpha$ non esiste: la retta $OP$ non incontra $x = 1$"} />
        )}
      </div>

      <div class="vis-tabella">
        <table>
          <tbody>
            <tr class="vis-tabella-x">
              <th scope="row">quadrante</th>
              {ROMAN.map((name, k) => (
                <td key={name} class={q === k + 1 ? "vis-cella-soluzione" : undefined}>
                  {name}
                  {q === k + 1 && <span aria-label="qui c'è P"> ✓</span>}
                </td>
              ))}
            </tr>
            {(showTangent ? (["sin", "cos", "tan"] as const) : (["sin", "cos"] as const)).map((name) => (
              <tr key={name}>
                <th scope="row">
                  <RichText text={`$\\${name}\\alpha$`} inline />
                </th>
                {QUADRANT_SIGNS[name].map((sign, k) => (
                  <td key={k} class={q === k + 1 ? "vis-cella-soluzione" : undefined}>
                    <RichText text={`$${SIGN_LATEX[sign]}$`} inline />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RichText class="vis-punti vis-quadrante-testo" text={quadrantText(degrees, showTangent)} />
    </div>
  );
}
