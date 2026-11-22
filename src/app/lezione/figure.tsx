// I riquadri «grafico» e «figura» di una lezione. Il grafico lo disegna il motore dai parametri del
// blocco; la figura è un file SVG accanto alla lezione. In entrambi i casi i colori vengono dalle
// variabili del tema (classi graf-… e fig-… in styles.css). Un parametro sbagliato non rompe la
// lezione: il riquadro dice che cosa non va.

import { useMemo } from "preact/hooks";
import { checkFigure, graphSvg, readGraph, type LessonBlock } from "../../contenuti/formato";
import { graphPointToLatex, type GraphPointKind } from "../../motore/display";
import { toLatex } from "../../motore/expr";
import { RichText } from "../componenti/RichText";

type GraphBlockData = Extract<LessonBlock, { kind: "graph" }>;
type FigureBlockData = Extract<LessonBlock, { kind: "figure" }>;

const POINT_NAMES: Record<GraphPointKind, string> = {
  zero: "zero",
  intercept: "sull'asse $y$",
  point: "punto",
  hole: "escluso",
};

/** Il riquadro con il messaggio quando il blocco non si può mostrare. */
function Problem({ what, messages }: { what: string; messages: readonly string[] }) {
  return (
    <div class="figura-problema" role="alert">
      <p>
        <strong>Problema:</strong> {what} non si può mostrare.
      </p>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            <RichText text={message} untrusted />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Un grafico di funzioni disegnato dal motore, con legenda, punti notevoli e didascalia. */
export function GraphBlock({ block, lesson }: { block: GraphBlockData; lesson: string }) {
  const result = useMemo(() => {
    const reading = readGraph(block);
    if (!reading.ok) return reading;
    return { ...reading, svg: graphSvg(reading, block, `graf-${lesson.replaceAll(".", "-")}-${block.line}`) };
  }, [block, lesson]);

  return (
    <figure class="box box-figure grafico">
      <p class="box-label">Grafico</p>
      {!result.ok ? (
        <Problem what="il grafico" messages={result.problems} />
      ) : (
        <>
          <div class="grafico-disegno" dangerouslySetInnerHTML={{ __html: result.svg }} />
          <ul class="grafico-legenda">
            {result.functions.map((f, index) => (
              <li key={index}>
                <svg class="legenda-segno" viewBox="0 0 32 8" aria-hidden="true">
                  <path class={`graf-curva graf-curva-${index + 1}`} d="M2 4H30" />
                </svg>
                <RichText text={`$y = ${toLatex(f)}$`} inline />
              </li>
            ))}
          </ul>
          {result.graph.points.length > 0 && (
            <RichText
              class="grafico-punti"
              text={`Punti: ${result.graph.points.map((point) => `$${graphPointToLatex(point)}$ (${POINT_NAMES[point.kind]})`).join(", ")}.`}
            />
          )}
        </>
      )}
      {block.caption !== "" && (
        <figcaption>
          <RichText text={block.caption} />
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Una figura SVG scritta a mano, letta dal file accanto alla lezione. `source` è il testo del file
 * (di solito figureSource(lezione, file); undefined se il file manca).
 */
export function FigureBlock({ block, source }: { block: FigureBlockData; source: string | undefined }) {
  const result = useMemo(() => {
    if (source === undefined) return { ok: false as const, problems: [`Il file «${block.file}» non c'è, o non è nell'elenco del modulo.`] };
    const problems = checkFigure(source, block.file);
    return problems.length > 0 ? { ok: false as const, problems } : { ok: true as const, svg: source };
  }, [block, source]);

  return (
    <figure class="box box-figure figura">
      <p class="box-label">Figura</p>
      {result.ok ? <div class="figura-disegno" dangerouslySetInnerHTML={{ __html: result.svg }} /> : <Problem what="la figura" messages={result.problems} />}
      {block.caption !== "" && (
        <figcaption>
          <RichText text={block.caption} />
        </figcaption>
      )}
    </figure>
  );
}
