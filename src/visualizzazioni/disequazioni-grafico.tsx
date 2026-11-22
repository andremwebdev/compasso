// VIS.disequazioni-grafico (scheda in docs/VISUALIZZAZIONI.md): il grafico di f, la retta y = k che
// si trascina, il tratto di curva che risolve la disequazione, la soluzione sull'asse x e la tabella
// dei segni di f(x) − k, tutto collegato. Il grafico di base è quello dei grafici statici (graphToSvg);
// sopra, un secondo SVG con la stessa cornice disegna le parti che si muovono.

import { useMemo, useState } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH, graphToSvg, type Sign, type SignRelation } from "../motore/display";
import { evaluate, toLatex } from "../motore/expr";
import type { Rational } from "../motore/numbers/rational";
import { Slider, VisualizationBox, VisualizationProblem, pathOf, svgNumber, useDragHandle } from "./comuni";
import {
  RELATION_LATEX, RELATION_WORDS, RELATIONS, THRESHOLD_STEP, approximate, cellAt, frameOf, inequalityLatex, readInequalityParams,
  shiftedLatex, snapThreshold, solutionBars, solutionLatex, studyInequality, type InequalitySetup,
} from "./disequazioni-grafico-math";

export const TITLE = "Disequazioni e grafico";

/** Il raggio dell'area di tocco delle maniglie, in unità del disegno (circa 44 px anche a 320 px di schermo). */
const GRIP = 27;
/** Entro questa distanza (unità del disegno) la sonda si aggancia a un punto della tabella. */
const SNAP = 5;

const SIGN_LATEX: Readonly<Record<Sign, string>> = { "+": "+", "-": "-", "0": "0", undefined: "\\nexists" };

let instances = 0;

/** Il blocco della lezione: legge i parametri e, se vanno bene, mostra la visualizzazione. */
export function InequalityGraph({ params }: { params: Readonly<Record<string, string>> }) {
  const reading = useMemo(() => readInequalityParams(params), [params]);
  return (
    <VisualizationBox title={TITLE}>
      {reading.ok ? <InequalityGraphView setup={reading.setup} /> : <VisualizationProblem messages={reading.problems} />}
    </VisualizationBox>
  );
}

function InequalityGraphView({ setup }: { setup: InequalitySetup }) {
  const { window } = setup;
  const frame = frameOf(window);
  const id = useMemo(() => `vis-diseq-${++instances}`, []);
  const [chosen, setChosen] = useState(0);
  const [threshold, setThreshold] = useState<Rational>(setup.threshold);
  const [relation, setRelation] = useState<SignRelation>(setup.relation);
  const initialProbe = Math.round((window.xMin + (window.xMax - window.xMin) * 0.7) * 4) / 4;
  const [probe, setProbe] = useState(initialProbe);

  const current = setup.functions[chosen] ?? (setup.functions[0] as InequalitySetup["functions"][number]);
  // Il disegno di base cambia solo con la funzione: assi, griglia, curva, asintoti e buchi (niente lettere).
  const base = useMemo(
    () => graphToSvg({ ...current.graph, points: current.graph.points.filter((point) => point.kind === "hole") }, { label: `Grafico di y = ${current.text}`, idPrefix: `${id}-base` }),
    [current, id],
  );
  const study = useMemo(() => studyInequality(current.rational, threshold, relation), [current, threshold, relation]);
  const bars = useMemo(() => solutionBars(study.solution, window), [study, window]);
  const pointValues = useMemo(() => study.table.points.map((point) => evaluate(point)), [study]);

  /** La sonda, agganciata a un punto della tabella se ci è abbastanza vicina. */
  const moveProbe = (x: number): void => {
    const clamped = Math.min(window.xMax, Math.max(window.xMin, x));
    const near = pointValues.find((value) => Math.abs(frame.sx(value) - frame.sx(clamped)) <= SNAP);
    setProbe(near ?? clamped);
  };
  const thresholdGrip = useDragHandle((point) => setThreshold(snapThreshold(frame.py(point.y), setup.thresholdMin, setup.thresholdMax)));
  const probeGrip = useDragHandle((point) => moveProbe(frame.px(point.x)));

  const k = threshold.toNumber();
  const ky = frame.sy(k);
  const axisY = frame.sy(Math.min(window.yMax, Math.max(window.yMin, 0)));
  const above = relation === ">" || relation === ">=";
  const curvePath = pathOf(current.graph.curves[0]?.segments ?? [], frame.sx, frame.sy);
  const probeCell = cellAt(study.table, probe, 1e-9);
  const probeSign = study.table.result.cells[probeCell] as Sign;
  const probeY = evaluate(current.expr, { x: probe });
  const probeInside = Number.isFinite(probeY) && probeY >= window.yMin && probeY <= window.yMax;
  const kLatex = toLatex({ kind: "num", value: threshold });
  const onPoint = probeCell % 2 === 1;
  const probeXText = onPoint ? `x = ${toLatex(study.table.points[(probeCell - 1) / 2] as never)}` : `x \\approx ${approximate(probe).replace("−", "-")}`;

  return (
    <div class="vis-disequazioni">
      {setup.functions.length > 1 && (
        <div class="vis-scelta" role="group" aria-label="Funzione">
          {setup.functions.map((f, index) => (
            <button key={index} type="button" class="vis-pulsante" aria-pressed={index === chosen} onClick={() => setChosen(index)}>
              <RichText text={`$y = ${toLatex(f.expr)}$`} inline />
            </button>
          ))}
        </div>
      )}

      <div class="vis-scelta vis-versi" role="group" aria-label="Verso della disequazione">
        {RELATIONS.map((item) => (
          <button key={item} type="button" class="vis-pulsante" aria-pressed={item === relation} aria-label={RELATION_WORDS[item]} onClick={() => setRelation(item)}>
            <RichText text={`$f(x) ${RELATION_LATEX[item]} k$`} inline />
          </button>
        ))}
      </div>

      <RichText class="vis-disequazione" text={`$$${inequalityLatex(current.expr, threshold, relation)}$$`} />

      <div class="vis-piano">
        <div class="grafico-disegno" dangerouslySetInnerHTML={{ __html: base }} />
        <svg class="vis-sopra" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} aria-hidden="true">
          <defs>
            <clipPath id={`${id}-semipiano`}>
              <rect x={frame.left} width={frame.right - frame.left} y={above ? frame.top : ky} height={Math.max(0, above ? ky - frame.top : frame.bottom - ky)} />
            </clipPath>
            <clipPath id={`${id}-area`}>
              <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} />
            </clipPath>
          </defs>
          <g clip-path={`url(#${id}-area)`}>
            {/* Il tratto di curva che risolve la disequazione: sopra (o sotto) la retta. */}
            <path class="vis-curva-soluzione" d={curvePath} clip-path={`url(#${id}-semipiano)`} />
            <path class="vis-soglia" d={`M${frame.left} ${svgNumber(ky)}H${frame.right}`} />
            {/* La soluzione sull'asse x. */}
            {bars.map((bar, index) =>
              bar.from === bar.to ? null : <path key={`b${index}`} class="vis-barra" d={`M${svgNumber(frame.sx(bar.from))} ${svgNumber(axisY)}H${svgNumber(frame.sx(bar.to))}`} />,
            )}
            {bars.flatMap((bar, index) => [
              bar.fromClosed === null ? null : <circle key={`f${index}`} class={bar.fromClosed ? "vis-estremo-pieno" : "vis-estremo-vuoto"} cx={svgNumber(frame.sx(bar.from))} cy={svgNumber(axisY)} r="4" />,
              bar.toClosed === null || bar.from === bar.to ? null : <circle key={`t${index}`} class={bar.toClosed ? "vis-estremo-pieno" : "vis-estremo-vuoto"} cx={svgNumber(frame.sx(bar.to))} cy={svgNumber(axisY)} r="4" />,
            ])}
            {study.crossings.map((point, index) => (
              <circle key={`c${index}`} class="vis-incontro" cx={svgNumber(frame.sx(evaluate(point)))} cy={svgNumber(ky)} r="4" />
            ))}
            {/* La sonda. */}
            <path class="vis-sonda-linea" d={`M${svgNumber(frame.sx(probe))} ${frame.top}V${frame.bottom}`} />
            {probeInside && <circle class="vis-sonda-punto" cx={svgNumber(frame.sx(probe))} cy={svgNumber(frame.sy(probeY))} r="4.5" />}
          </g>
          <text class="vis-soglia-nome" x={frame.left + 4} y={svgNumber(ky < frame.top + 16 ? ky + 14 : ky - 5)}>
            {`y = ${approximate(k)}`}
          </text>
          {/* Le maniglie: un cerchio visibile e un'area di tocco più grande, trasparente. */}
          <g class="vis-maniglia vis-maniglia-soglia" {...thresholdGrip}>
            <circle class="vis-presa" cx={frame.right - 14} cy={svgNumber(ky)} r={GRIP} />
            <circle class="vis-maniglia-segno" cx={frame.right - 14} cy={svgNumber(ky)} r="8" />
            <path class="vis-maniglia-frecce" d={`M${frame.right - 18} ${svgNumber(ky - 2)}l4 -4l4 4M${frame.right - 18} ${svgNumber(ky + 2)}l4 4l4 -4`} />
          </g>
          <g class="vis-maniglia vis-maniglia-sonda" {...probeGrip}>
            <circle class="vis-presa" cx={svgNumber(frame.sx(probe))} cy={frame.bottom - 12} r={GRIP} />
            <path class="vis-maniglia-segno" d={`M${svgNumber(frame.sx(probe))} ${frame.bottom - 20}l7 12h-14z`} />
          </g>
        </svg>
      </div>

      <div class="vis-cursori">
        <Slider
          label="Soglia"
          min={setup.thresholdMin.toNumber()}
          max={setup.thresholdMax.toNumber()}
          step={THRESHOLD_STEP.toNumber()}
          value={k}
          valueText={`$k = ${kLatex}$`}
          onInput={(value) => setThreshold(snapThreshold(value, setup.thresholdMin, setup.thresholdMax))}
        />
        <Slider
          label="Sonda"
          min={window.xMin}
          max={window.xMax}
          step={(window.xMax - window.xMin) / 400}
          value={probe}
          valueText={`$${probeXText}$`}
          onInput={moveProbe}
        />
      </div>

      <RichText class="vis-sonda-testo" text={probeText(probeSign, probeY, relation)} />

      <RichText class="vis-frazione" text={`$$${shiftedLatex(current.expr, threshold, study)}$$`} />
      <div class="vis-tabella">
        <table>
          <tbody>
            <tr class="vis-tabella-x">
              <th scope="row">
                <RichText text="$x$" inline />
              </th>
              {study.table.result.cells.map((_, cell) => (
                <td key={cell} class={cellClass(cell, study.solutionCells, probeCell)}>
                  {cell % 2 === 1 && <RichText text={`$${toLatex(study.table.points[(cell - 1) / 2] as never)}$`} inline />}
                </td>
              ))}
            </tr>
            {[...study.table.rows, study.table.result].map((row, index) => (
              <tr key={index} class={index === study.table.rows.length ? "vis-tabella-risultato" : undefined}>
                <th scope="row">
                  <RichText text={`$${row.label}$`} inline />
                </th>
                {row.cells.map((sign, cell) => (
                  <td key={cell} class={cellClass(cell, study.solutionCells, probeCell)}>
                    <RichText text={`$${SIGN_LATEX[sign]}$`} inline />
                  </td>
                ))}
              </tr>
            ))}
            <tr class="vis-tabella-soluzione">
              <th scope="row">soluzione</th>
              {study.solutionCells.map((inside, cell) => (
                <td key={cell} class={cellClass(cell, study.solutionCells, probeCell)}>
                  {inside ? <span aria-label="sì">✓</span> : <span class="vis-no" aria-label="no">·</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <RichText class="vis-soluzione" text={`$${solutionLatex(study.solution)}$`} />
    </div>
  );
}

function cellClass(cell: number, solution: readonly boolean[], probe: number): string {
  const classes = [cell % 2 === 1 ? "vis-cella-punto" : "vis-cella-intervallo"];
  if (solution[cell]) classes.push("vis-cella-soluzione");
  if (cell === probe) classes.push("vis-cella-sonda");
  return classes.join(" ");
}

/** Che cosa dice la sonda: dove sta la curva rispetto alla retta, e se x è una soluzione (con parola e simbolo, non solo colore). */
function probeText(sign: Sign, y: number, relation: SignRelation): string {
  if (sign === "undefined") return "Sonda: qui $f$ non è definita, quindi $x$ **non** è una soluzione ✗.";
  const where = sign === "+" ? "sopra la retta" : sign === "-" ? "sotto la retta" : "sulla retta";
  const wanted = relation === ">" || relation === ">=" ? "+" : "-";
  const inside = sign === wanted || (sign === "0" && (relation === ">=" || relation === "<="));
  const value = sign === "0" ? "" : `, $f(x) \\approx ${approximate(y).replace("−", "-")}$`;
  return `Sonda: la curva sta **${where}**${value}: $x$ ${inside ? "è una soluzione ✓" : "**non** è una soluzione ✗"}.`;
}
