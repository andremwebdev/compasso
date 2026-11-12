import { useMemo, useRef, useState } from "preact/hooks";
import { skillOf } from "../../codici";
import type { AttemptContext } from "../../dati";
import { findError, UNCLASSIFIED } from "../../errori";
import { choiceOptions, evaluateResponse, type Evaluation, type Exercise, type Response } from "../../esercizi";
import { limitToLatex } from "../../motore/calculus/limit";
import { EngineError } from "../../motore/errors";
import { toLatex } from "../../motore/expr";
import { matrixSize, matrixToLatex } from "../../motore/linalg";
import { setToInequalityLatex, setToLatex } from "../../motore/sets";
import { fieldKindOf, previewText } from "../risposta/preview";
import { markDistraction, newId, recordAttempt } from "../state";
import { AnswerEditor } from "./AnswerEditor";
import { RichText } from "./RichText";

interface ExerciseViewProps {
  exercise: Exercise;
  /** Dove viene fatto l'esercizio: finisce nel registro dei tentativi. */
  context: AttemptContext;
  /** Se vero, quando l'esercizio ha le opzioni si mostra come scelta multipla (domande lampo). */
  preferChoice?: boolean;
  /** «Esercizio simile»: stesso generatore e livello, numeri nuovi. */
  onSimilar?: (() => void) | undefined;
  /** «Torna alla lezione»: assente se la lezione dell'abilità non è ancora scritta. */
  onLesson?: (() => void) | undefined;
  /** «Avanti», dopo la risposta. */
  onNext?: (() => void) | undefined;
  nextLabel?: string | undefined;
  /** Chiamata una volta, quando la risposta è stata data (giusta, sbagliata o «Non lo so»). */
  onAnswered?: ((evaluation: Evaluation) => void) | undefined;
}

type Done = { readonly evaluation: Evaluation; readonly attemptId: string; readonly given: string | null };

const NAMES = ["x", "y", "z", "t"] as const;

/** La risposta giusta, come testo ricco da mostrare. */
function correctAnswerText(exercise: Exercise): string {
  const { answer } = exercise;
  switch (answer.kind) {
    case "choice":
      return answer.correct;
    case "number":
    case "expression":
      return `$${toLatex(answer.correct)}$`;
    case "set":
      // Per un insieme di numeri reali: prima le disuguaglianze, poi gli intervalli.
      return answer.correct.kind === "realset"
        ? `$${setToInequalityLatex(answer.correct, { variable: answer.variable })}$, cioè $S = ${setToLatex(answer.correct, { variable: answer.variable })}$`
        : `$${setToLatex(answer.correct, { variable: answer.variable })}$`;
    case "limit":
      return `$${limitToLatex(answer.correct)}$`;
    case "matrix":
      return `$${matrixToLatex(answer.correct)}$`;
    case "truefalse":
      return answer.correct ? "Vero" : "Falso";
    case "ordering":
      return "l'ordine mostrato nella soluzione";
  }
}

/**
 * La schermata di un esercizio (specifica, sezione 3): testo, risposta con anteprima, «Non lo so»,
 * indizi, esito con l'errore riconosciuto, soluzione passo passo, esercizio simile, ritorno alla
 * lezione, «segna come distrazione». Ogni risposta data finisce nel registro dei tentativi.
 */
export function ExerciseView({ exercise, context, preferChoice = false, onSimilar, onLesson, onNext, nextLabel, onAnswered }: ExerciseViewProps) {
  const { answer } = exercise;
  const options = useMemo(() => (preferChoice || answer.kind === "choice" ? choiceOptions(exercise) : null), [exercise, preferChoice]);
  const field = fieldKindOf(answer);
  const size = answer.kind === "matrix" ? matrixSize(answer.correct) : { rows: 1, cols: 1 };

  const [cells, setCells] = useState<string[][]>(() => Array.from({ length: size.rows }, () => Array.from({ length: size.cols }, () => "")));
  const [chosen, setChosen] = useState<number | null>(null);
  const [truth, setTruth] = useState<boolean | null>(null);
  const [hints, setHints] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [distraction, setDistraction] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const startedAt = useRef(performance.now());

  /** Quello che Andrea ha preparato, come risposta da valutare; null se non c'è ancora niente. */
  const currentResponse = (): Response | null => {
    if (options) return chosen === null ? null : { kind: "choice", index: chosen };
    switch (answer.kind) {
      case "truefalse":
        return truth === null ? null : { kind: "truefalse", value: truth };
      case "matrix":
        return { kind: "matrix", cells };
      case "number":
      case "expression":
      case "set":
      case "limit":
        return (cells[0]?.[0] ?? "").trim() === "" ? null : { kind: "text", text: cells[0]?.[0] ?? "" };
      case "choice":
      case "ordering":
        return null;
    }
  };

  /** Come mostrare la risposta data, dopo la valutazione. */
  const givenText = (response: Response): string | null => {
    switch (response.kind) {
      case "text": {
        const preview = field ? previewText(field, response.text) : null;
        return preview?.kind === "ok" ? `$${preview.latex}$` : null;
      }
      case "choice":
        return options?.find((option) => option.index === response.index)?.content ?? null;
      case "matrix":
        return response.cells.flat().every((cell) => previewText({ kind: "expression", complex: false }, cell).kind === "ok")
          ? `$\\begin{pmatrix} ${response.cells.map((row) => row.map((cell) => { const preview = previewText({ kind: "expression", complex: false }, cell); return preview.kind === "ok" ? preview.latex : ""; }).join(" & ")).join(" \\\\ ")} \\end{pmatrix}$`
          : null;
      case "truefalse":
        return response.value ? "Vero" : "Falso";
      case "ordering":
      case "skip":
        return null;
    }
  };

  const finish = (response: Response): void => {
    let evaluation: Evaluation;
    try {
      evaluation = evaluateResponse(exercise, response);
    } catch (error) {
      if (!(error instanceof EngineError)) throw error;
      evaluation = { outcome: "invalid", message: error.message };
    }
    if (evaluation.outcome === "invalid") {
      // Testo che non si legge o incompleto: non è un tentativo, si corregge e si riprova.
      setProblem(evaluation.message);
      return;
    }
    const attemptId = newId();
    recordAttempt({
      id: attemptId,
      at: new Date().toISOString(),
      skill: skillOf(exercise.generator),
      generator: exercise.generator,
      seed: exercise.seed,
      level: exercise.level,
      lesson: null,
      question: null,
      outcome: evaluation.outcome,
      error: evaluation.outcome === "wrong" ? evaluation.error : null,
      distraction: false,
      hints,
      millis: Math.round(performance.now() - startedAt.current),
      context,
    });
    setProblem(null);
    setDone({ evaluation, attemptId, given: givenText(response) });
    // Chi non sapeva rispondere vede subito la soluzione.
    if (evaluation.outcome === "skipped") setShowSteps(true);
    onAnswered?.(evaluation);
  };

  const confirm = (): void => {
    const response = currentResponse();
    if (!response) {
      setProblem(options || answer.kind === "truefalse" ? "Scegli una risposta, oppure tocca «Non lo so»." : "Scrivi la risposta, oppure tocca «Non lo so».");
      return;
    }
    finish(response);
  };

  // Indizi e pulsanti: con una risposta scritta stanno sopra la tastiera, altrimenti in fondo.
  const writing = !options && answer.kind !== "truefalse" && field !== null;
  const controls = (
    <>
      {hints > 0 && (
        <ol class="hints" aria-label="Indizi">
          {exercise.hints.slice(0, hints).map((hint, index) => (
            <li key={index}>
              <RichText text={hint} />
            </li>
          ))}
        </ol>
      )}

      <div class="exercise-actions">
        <button type="button" class="button button-primary" onClick={confirm}>
          Conferma
        </button>
        <button type="button" class="button" disabled={hints >= exercise.hints.length} onClick={() => setHints(hints + 1)}>
          {hints >= exercise.hints.length ? "Indizi finiti" : `Indizio ${hints + 1} di ${exercise.hints.length}`}
        </button>
        <button type="button" class="button" onClick={() => finish({ kind: "skip" })}>
          Non lo so
        </button>
      </div>
    </>
  );

  return (
    <article class="exercise">
      <RichText text={exercise.prompt} class="exercise-prompt" />

      {!done && (
        <>
          {options ? (
            <div class="options" role="radiogroup" aria-label="Risposte possibili">
              {options.map((option) => (
                <button
                  key={option.index}
                  type="button"
                  role="radio"
                  aria-checked={chosen === option.index}
                  class={chosen === option.index ? "option option-chosen" : "option"}
                  onClick={() => {
                    setChosen(option.index);
                    setProblem(null);
                  }}
                >
                  <span class="option-mark" aria-hidden="true" />
                  <RichText text={option.content} inline />
                </button>
              ))}
            </div>
          ) : answer.kind === "truefalse" ? (
            <div class="options options-two" role="radiogroup" aria-label="Vero o falso">
              {[true, false].map((value) => (
                <button key={String(value)} type="button" role="radio" aria-checked={truth === value} class={truth === value ? "option option-chosen" : "option"} onClick={() => setTruth(value)}>
                  <span class="option-mark" aria-hidden="true" />
                  {value ? "Vero" : "Falso"}
                </button>
              ))}
            </div>
          ) : field ? (
            <AnswerEditor
              field={field}
              cells={cells}
              rowLabels={answer.kind === "matrix" && size.cols === 1 ? NAMES.slice(0, size.rows) : undefined}
              onChange={(next) => {
                setCells(next);
                setProblem(null);
              }}
              onConfirm={confirm}
              problem={problem}
            >
              {controls}
            </AnswerEditor>
          ) : (
            <p class="muted">Questo tipo di esercizio (riordino) arriva con le dimostrazioni interattive.</p>
          )}
          {(options || answer.kind === "truefalse") && problem && (
            <p class="answer-problem" role="alert">
              {problem}
            </p>
          )}

          {!writing && controls}
        </>
      )}

      {done && (
        <>
          <Verdict evaluation={done.evaluation} />
          {done.given && done.evaluation.outcome === "wrong" && (
            <p class="answer-line">
              <span class="answer-line-label">La tua risposta</span> <RichText text={done.given} inline />
            </p>
          )}
          <p class="answer-line">
            <span class="answer-line-label">Risposta giusta</span> <RichText text={correctAnswerText(exercise)} inline />
          </p>

          {done.evaluation.outcome === "wrong" && (
            <label class="distraction">
              <input
                type="checkbox"
                checked={distraction}
                onChange={(event) => {
                  setDistraction(event.currentTarget.checked);
                  markDistraction(done.attemptId, event.currentTarget.checked);
                }}
              />
              <span>
                Segna come distrazione <span class="muted-inline">(sapevo farlo: non pesa sulla diagnosi)</span>
              </span>
            </label>
          )}

          <div class="exercise-actions">
            {onNext && (
              <button type="button" class="button button-primary" onClick={onNext}>
                {nextLabel ?? "Avanti"}
              </button>
            )}
            <button type="button" class="button" aria-expanded={showSteps} onClick={() => setShowSteps(!showSteps)}>
              {showSteps ? "Nascondi la soluzione" : "Soluzione passo passo"}
            </button>
            {onSimilar && (
              <button type="button" class="button" onClick={onSimilar}>
                Esercizio simile
              </button>
            )}
            {onLesson && (
              <button type="button" class="button" onClick={onLesson}>
                Torna alla lezione
              </button>
            )}
          </div>

          {showSteps && (
            <ol class="steps" aria-label="Soluzione passo passo">
              {exercise.steps.map((step, index) => (
                <li key={index}>
                  <RichText text={step.text} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <p class="exercise-code">
        {exercise.generator} · livello {exercise.level} · seme {exercise.seed}
      </p>
    </article>
  );
}

/** L'esito: sempre un'icona e una parola, mai solo il colore. Per un errore riconosciuto, il suo nome e la spiegazione. */
function Verdict({ evaluation }: { evaluation: Evaluation }) {
  switch (evaluation.outcome) {
    case "correct":
      return (
        <div class="verdict verdict-correct" role="status">
          <p class="verdict-title">
            <span aria-hidden="true">✓</span> Giusta
          </p>
        </div>
      );
    case "skipped":
      return (
        <div class="verdict verdict-skipped" role="status">
          <p class="verdict-title">
            <span aria-hidden="true">–</span> Non data
          </p>
          <p>Va bene così: guarda la soluzione qui sotto, poi prova un esercizio simile.</p>
        </div>
      );
    case "wrong": {
      const entry = evaluation.error === UNCLASSIFIED ? undefined : findError(evaluation.error);
      return (
        <div class="verdict verdict-wrong" role="status">
          <p class="verdict-title">
            <span aria-hidden="true">✗</span> Sbagliata
          </p>
          {evaluation.message && <RichText text={evaluation.message} />}
          {entry ? (
            <>
              <p class="verdict-error">Errore riconosciuto: {entry.name}</p>
              <RichText text={entry.explanation} />
              <RichText text={`Esempio: ${entry.example}`} class="verdict-example" />
            </>
          ) : (
            <p>Non riconosco un errore tipico in questa risposta: confrontala con la soluzione passo passo.</p>
          )}
        </div>
      );
    }
    case "invalid":
      return null;
  }
}
