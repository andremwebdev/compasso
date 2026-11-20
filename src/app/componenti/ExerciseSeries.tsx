// Una serie di esercizi: usata dalla sezione Esercizi, dagli esercizi dopo la lezione, dal controllo
// «Lo so già» e dalle fasi di Oggi. Ogni esercizio è un generatore con un livello fisso oppure con la
// difficoltà automatica (specifica, sezione 3): si parte dal livello che corrisponde alla padronanza,
// si scende di uno dopo due errori di fila, si sale di uno dopo tre risposte giuste di fila.

import { useMemo, useRef, useState } from "preact/hooks";
import type { GeneratorCode, SkillCode } from "../../codici";
import { masteryOf, nextAutoLevel, startingLevel, type AttemptContext } from "../../dati";
import { generateExercise, type Evaluation, type GeneratorDefinition, type Level } from "../../esercizi";
import { findGenerator } from "../../generatori";
import { modulesOf, WithModules } from "../caricamento";
import { isWritten } from "../programma";
import { freshSeed } from "../risposta/seeds";
import { masteries, open, randomSeed, type PracticeItem } from "../state";
import { ExerciseView } from "./ExerciseView";

export interface SeriesResult {
  readonly generator: GeneratorCode;
  readonly skill: SkillCode;
  readonly level: Level;
  readonly outcome: Exclude<Evaluation["outcome"], "invalid">;
}

interface ExerciseSeriesProps {
  readonly items: readonly PracticeItem[];
  /** Senza fine: finiti gli esercizi previsti, si continua con l'ultimo generatore. */
  readonly endless: boolean;
  readonly context: AttemptContext;
  /** Da dove si riparte (esercizi già fatti, per una sessione di Oggi ripresa). */
  readonly startAt?: number;
  /** Chiamata dopo ogni risposta, con quante risposte sono state date nella serie. */
  readonly onAnswered?: (result: SeriesResult, answered: number) => void;
  /** Chiamata alla fine della serie (solo se non è senza fine). */
  readonly onFinished: (results: readonly SeriesResult[]) => void;
  /** Il testo del pulsante dopo l'ultimo esercizio. */
  readonly finishLabel?: string;
}

/** Il livello iniziale della difficoltà automatica per un generatore. */
function autoStart(generator: GeneratorDefinition): Level {
  const wanted = startingLevel(masteryOf(masteries.value, generator.skill));
  return nextAutoLevel(wanted, [], generator.levels);
}

/** La serie, dopo aver caricato i moduli dei suoi generatori (versione telefono: un modulo alla volta). */
export function ExerciseSeries(props: ExerciseSeriesProps) {
  return <WithModules modules={modulesOf(props.items.map((item) => item.generator))}>{() => <Series {...props} />}</WithModules>;
}

function Series({ items, endless, context, startAt = 0, onAnswered, onFinished, finishLabel = "Fine della serie" }: ExerciseSeriesProps) {
  // Stato della difficoltà automatica per generatore: livello attuale ed esiti dall'ultimo cambio.
  const auto = useRef(new Map<string, { level: Level; recent: boolean[] }>());
  const levelFor = (item: PracticeItem, generator: GeneratorDefinition): Level => {
    if (item.level !== "auto") return item.level;
    const state = auto.current.get(generator.code) ?? { level: autoStart(generator), recent: [] };
    auto.current.set(generator.code, state);
    return state.level;
  };
  const itemAt = (index: number): PracticeItem | undefined => items[Math.min(index, items.length - 1)];
  const [current, setCurrent] = useState(() => {
    const item = itemAt(startAt);
    const generator = item ? findGenerator(item.generator) : undefined;
    return { index: startAt, level: item && generator ? levelFor(item, generator) : (1 as Level), seed: randomSeed() };
  });
  const [results, setResults] = useState<readonly SeriesResult[]>([]);
  const item = itemAt(current.index);
  const generator = item ? findGenerator(item.generator) : undefined;
  const exercise = useMemo(() => (generator ? generateExercise(generator, current.level, current.seed) : null), [generator, current]);
  // I testi già usciti: «Esercizio simile» e «Avanti» ne danno uno diverso.
  const seen = useRef(new Set<string>());
  if (exercise) seen.current.add(exercise.prompt);

  if (!item || !generator || !exercise) return <p class="muted">Questo esercizio non esiste ancora.</p>;

  const last = !endless && current.index >= items.length - 1;
  const advance = (): void => {
    if (last) {
      onFinished(results);
      return;
    }
    const nextIndex = current.index + 1;
    const nextItem = itemAt(nextIndex);
    const nextGenerator = nextItem ? findGenerator(nextItem.generator) : undefined;
    if (!nextItem || !nextGenerator) {
      onFinished(results);
      return;
    }
    const level = levelFor(nextItem, nextGenerator);
    setCurrent({ index: nextIndex, level, seed: freshSeed(nextGenerator, level, seen.current, randomSeed) });
  };

  const remaining = endless ? null : items.length - current.index;
  return (
    <div class="series">
      <p class="eyebrow series-position">
        {endless ? `Esercizio ${current.index + 1}` : `Esercizio ${current.index + 1} di ${items.length}`} · livello {current.level}
        {item.level === "auto" && " (automatico)"} · {generator.title}
      </p>
      <ExerciseView
        key={`${current.index}-${current.seed}`}
        exercise={exercise}
        context={context}
        onAnswered={(evaluation) => {
          if (evaluation.outcome === "invalid") return;
          const result: SeriesResult = { generator: generator.code, skill: generator.skill, level: current.level, outcome: evaluation.outcome };
          const next = [...results, result];
          setResults(next);
          if (item.level === "auto") {
            const state = auto.current.get(generator.code) ?? { level: current.level, recent: [] };
            const recent = [...state.recent, evaluation.outcome === "correct"];
            const level = nextAutoLevel(state.level, recent, generator.levels);
            auto.current.set(generator.code, { level, recent: level === state.level ? recent : [] });
          }
          onAnswered?.(result, current.index + 1);
        }}
        onSimilar={() => setCurrent({ ...current, seed: freshSeed(generator, current.level, seen.current, randomSeed) })}
        onLesson={isWritten(generator.lesson) ? () => open({ kind: "lesson", code: generator.lesson }, "teoria") : undefined}
        onNext={advance}
        nextLabel={last ? finishLabel : remaining === 1 ? finishLabel : "Avanti"}
      />
    </div>
  );
}
