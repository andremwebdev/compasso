import { useMemo, useRef, useState } from "preact/hooks";
import type { Evaluation, Level } from "../../esercizi";
import { generateExercise } from "../../esercizi";
import { loadLesson } from "../../contenuti";
import { findGenerator } from "../../generatori";
import { ExerciseView } from "../componenti/ExerciseView";
import { freshSeed } from "../risposta/seeds";
import { open, randomSeed, type Screen } from "../state";

type PracticeScreen = Extract<Screen, { kind: "practice" }>;

/** Una serie di esercizi dello stesso generatore: a livelli crescenti dopo una lezione, oppure libera dalla sezione Esercizi. */
export function Practice({ plan }: { plan: PracticeScreen }) {
  const generator = findGenerator(plan.generator);
  // Posizione nella serie, seme dell'esercizio mostrato, esiti degli esercizi già fatti.
  const [position, setPosition] = useState(0);
  const [seed, setSeed] = useState(randomSeed);
  const [results, setResults] = useState<readonly Evaluation["outcome"][]>([]);
  const [finished, setFinished] = useState(false);
  const level: Level = plan.levels[Math.min(position, plan.levels.length - 1)] ?? 1;
  const exercise = useMemo(() => (generator ? generateExercise(generator, level, seed) : null), [generator, level, seed]);
  // I testi degli esercizi già usciti: il prossimo seme ne deve dare uno diverso.
  const seen = useRef(new Set<string>());
  if (exercise) seen.current.add(exercise.prompt);
  const lessonExists = generator ? loadLesson(generator.lesson) !== null : false;
  const back = (): void => (plan.lesson ? open({ kind: "lesson", code: plan.lesson }, "teoria") : open({ kind: "home" }));

  if (!generator || !exercise) {
    return (
      <section class="section">
        <p>Questo esercizio non esiste ancora.</p>
      </section>
    );
  }

  const last = !plan.endless && position >= plan.levels.length - 1;
  const correct = results.filter((outcome) => outcome === "correct").length;

  return (
    <section class="section">
      <button type="button" class="back" onClick={back}>
        <span aria-hidden="true">‹</span> {plan.lesson ? "Lezione" : "Esercizi"}
      </button>
      <header class="lesson-header">
        <p class="eyebrow">{plan.endless ? `Livello ${level}` : `Esercizio ${Math.min(position + 1, plan.levels.length)} di ${plan.levels.length} · livello ${level}`}</p>
        <h1>{generator.title}</h1>
      </header>

      {finished ? (
        <div class="card card-done">
          <p class="verdict-title">Serie finita</p>
          <p>
            Risposte giuste: <strong>{correct}</strong> su {results.length}.
          </p>
          <div class="exercise-actions">
            <button
              type="button"
              class="button button-primary"
              onClick={() => {
                setPosition(0);
                setResults([]);
                setSeed(freshSeed(generator, plan.levels[0] ?? 1, seen.current, randomSeed));
                setFinished(false);
              }}
            >
              Un'altra serie
            </button>
            <button type="button" class="button" onClick={back}>
              {plan.lesson ? "Torna alla lezione" : "Torna agli esercizi"}
            </button>
          </div>
        </div>
      ) : (
        <ExerciseView
          key={`${position}-${seed}`}
          exercise={exercise}
          context={plan.context}
          onAnswered={(evaluation) => setResults([...results, evaluation.outcome])}
          // «Esercizio simile»: stessi livello e posizione, numeri nuovi.
          onSimilar={() => setSeed(freshSeed(generator, level, seen.current, randomSeed))}
          onLesson={lessonExists ? () => open({ kind: "lesson", code: generator.lesson }, "teoria") : undefined}
          onNext={() => {
            if (last) setFinished(true);
            else {
              setPosition(position + 1);
              setSeed(freshSeed(generator, plan.levels[position + 1] ?? level, seen.current, randomSeed));
            }
          }}
          nextLabel={last ? "Fine della serie" : "Avanti"}
        />
      )}
    </section>
  );
}
