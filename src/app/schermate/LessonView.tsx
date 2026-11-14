import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { isLessonCode, type LessonCode } from "../../codici";
import { loadLesson } from "../../contenuti";
import type { LessonBlock, QuestionOption } from "../../contenuti/formato";
import { findError } from "../../errori";
import { generateExercise } from "../../esercizi";
import { findGenerator } from "../../generatori";
import { ExerciseView } from "../componenti/ExerciseView";
import { RichText } from "../componenti/RichText";
import { lessonChunks } from "../lezione/chunks";
import { glossaryItem, type GlossaryItem } from "../lezione/glossary";
import { freshSeed } from "../risposta/seeds";
import { lessonProgress, newId, open, randomSeed, recordAttempt, saveLessonProgress } from "../state";

/** Una lezione letta dal suo file Markdown, a tratti: ogni tratto finisce con una domanda lampo. */
export function LessonView({ code }: { code: LessonCode }) {
  const lesson = useMemo(() => loadLesson(code), [code]);
  const chunks = useMemo(() => (lesson ? lessonChunks(lesson) : []), [lesson]);
  const saved = lessonProgress.value[code];
  // Si riprende dal tratto dove ci si era fermati.
  const [reached, setReached] = useState(() => Math.min(Math.max(saved?.reached ?? 1, 1), Math.max(chunks.length, 1)));
  // Le domande a cui è stata data una risposta in questa visita (per riga del blocco).
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
  const [term, setTerm] = useState<GlossaryItem | null>(null);
  const newest = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const save = (next: number, completed: boolean): void => {
    const now = new Date().toISOString();
    saveLessonProgress({
      code,
      reached: next,
      completed: completed || (saved?.completed ?? false),
      startedAt: saved?.startedAt ?? now,
      updatedAt: now,
      completedAt: completed ? now : (saved?.completedAt ?? null),
    });
  };

  // Aprire la lezione la segna come cominciata.
  useEffect(() => {
    if (!saved && lesson) save(reached, false);
  }, []);

  // Quando si apre un tratto nuovo, la pagina scorre fino al suo inizio.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    newest.current?.scrollIntoView?.({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }, [reached]);

  if (!lesson) {
    return (
      <section class="section">
        <BackButton />
        <p>Questa lezione non esiste ancora.</p>
      </section>
    );
  }

  const lastChunk = chunks[reached - 1] ?? [];
  const lastBlock = lastChunk.at(-1);
  // Per andare avanti bisogna aver risposto alla domanda che chiude il tratto (se c'è).
  const gateOpen = lastBlock?.kind !== "question" || answered.has(lastBlock.line);
  const atEnd = reached >= chunks.length;
  const completed = saved?.completed ?? false;
  const skill = lesson.meta.skills[0];
  const generator = skill ? findGenerator(`${skill}.g1`) : undefined;

  // Un rimando toccato: un termine del glossario apre la sua definizione, una lezione si apre.
  const onRef = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement | null)?.closest?.("[data-ref]")?.getAttribute("data-ref");
    if (!target) return;
    const item = glossaryItem(target);
    if (item) setTerm(item);
    else if (isLessonCode(target) && loadLesson(target)) open({ kind: "lesson", code: target });
  };

  return (
    <section class="section lesson" onClick={onRef}>
      <BackButton />
      <header class="lesson-header">
        <p class="eyebrow">
          {lesson.meta.code} · circa {lesson.meta.minutes} minuti
        </p>
        <h1>{lesson.meta.title}</h1>
        <p class="lesson-goal">
          <span class="lesson-goal-label">Alla fine saprai</span> {lesson.meta.goal}
        </p>
      </header>

      {chunks.slice(0, reached).map((chunk, index) => (
        <div key={index} class="lesson-chunk" ref={index === reached - 1 ? newest : undefined}>
          {chunk.map((block) => (
            <BlockView key={block.line} block={block} lesson={code} onAnswered={(line) => setAnswered(new Set([...answered, line]))} />
          ))}
        </div>
      ))}

      <div class="lesson-footer">
        <p class="lesson-position" aria-live="polite">
          Tratto {reached} di {chunks.length}
        </p>
        {!atEnd && (
          <button
            type="button"
            class="button button-primary"
            disabled={!gateOpen}
            onClick={() => {
              setReached(reached + 1);
              save(reached + 1, false);
            }}
          >
            Continua
          </button>
        )}
        {!atEnd && !gateOpen && <p class="muted">Rispondi alla domanda qui sopra per continuare.</p>}
        {atEnd && !completed && (
          <button type="button" class="button button-primary" onClick={() => save(reached, true)}>
            Ho finito la lezione
          </button>
        )}
        {atEnd && completed && (
          <div class="card card-done">
            <p class="verdict-title">
              <span aria-hidden="true">✓</span> Lezione completata
            </p>
            {generator ? (
              <>
                <p>Ora mettila alla prova: cinque esercizi, dal più semplice al più difficile.</p>
                <button
                  type="button"
                  class="button button-primary"
                  onClick={() => open({ kind: "practice", generator: generator.code, levels: [1, 1, 2, 2, 3], endless: false, context: "lezione", lesson: code })}
                >
                  Fai gli esercizi della lezione
                </button>
              </>
            ) : (
              <p class="muted">Gli esercizi di questa lezione non sono ancora pronti.</p>
            )}
          </div>
        )}
      </div>

      {term && (
        <div class="sheet-backdrop" onClick={() => setTerm(null)}>
          <div class="sheet" role="dialog" aria-modal="true" aria-label={term.name} onClick={(event) => event.stopPropagation()}>
            <p class="eyebrow">Glossario · {term.lesson}</p>
            <h2>{term.name}</h2>
            <RichText text={term.body} />
            <button type="button" class="button" onClick={() => setTerm(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BackButton() {
  return (
    <button type="button" class="back" onClick={() => open({ kind: "home" })}>
      <span aria-hidden="true">‹</span> Teoria
    </button>
  );
}

/** Un riquadro con l'etichetta a parole (mai solo il colore). */
function Box({ kind, label, title, children }: { kind: string; label: string; title?: string | undefined; children: preact.ComponentChildren }) {
  return (
    <div class={`box box-${kind}`}>
      <p class="box-label">
        {label}
        {title && <span class="box-title"> · {title}</span>}
      </p>
      {children}
    </div>
  );
}

function BlockView({ block, lesson, onAnswered }: { block: LessonBlock; lesson: LessonCode; onAnswered: (line: number) => void }) {
  switch (block.kind) {
    case "text":
      return <RichText text={block.body} class="lesson-text" />;
    case "definition":
      return (
        <Box kind="definition" label="Definizione" title={block.name}>
          <RichText text={block.body} />
        </Box>
      );
    case "theorem":
      return (
        <Box kind="theorem" label="Teorema" title={block.name}>
          <RichText text={block.body} />
        </Box>
      );
    case "proof":
      return (
        <Box kind="proof" label="Dimostrazione">
          <RichText text={block.intro} />
          <ol class="steps">
            {block.steps.map((step, index) => (
              <li key={index}>
                <RichText text={step.text} />
                <RichText text={step.reason} class="proof-reason" />
              </li>
            ))}
          </ol>
        </Box>
      );
    case "example":
      return (
        <Box kind="example" label="Esempio svolto" title={block.title}>
          <RichText text={block.body} />
        </Box>
      );
    case "warning":
      return (
        <Box kind="warning" label="Attenzione" title={findError(block.error)?.name}>
          <RichText text={block.body} />
        </Box>
      );
    case "summary":
      return (
        <Box kind="summary" label="In breve">
          <RichText text={block.body} />
        </Box>
      );
    case "visualization":
      return (
        <Box kind="proof" label="Visualizzazione">
          <p class="muted">Le visualizzazioni interattive arrivano in una fase successiva.</p>
        </Box>
      );
    case "question":
      return block.source.type === "manual" ? (
        <ManualQuestion lesson={lesson} line={block.line} prompt={block.source.prompt} options={block.source.options} explanation={block.source.explanation} onAnswered={() => onAnswered(block.line)} />
      ) : (
        <GeneratorQuestion generator={block.source.generator} level={block.source.level} onAnswered={() => onAnswered(block.line)} />
      );
    case "flashcard":
    case "glossary":
      return null;
  }
}

/** Una domanda lampo presa da un generatore: se può, si mostra come scelta multipla. */
function GeneratorQuestion({ generator, level, onAnswered }: { generator: string; level: 1 | 2 | 3; onAnswered: () => void }) {
  const [seed, setSeed] = useState(randomSeed);
  const definition = findGenerator(generator);
  const exercise = useMemo(() => (definition ? generateExercise(definition, level, seed) : null), [definition, level, seed]);
  // «Esercizio simile» non ripropone un esercizio già uscito in questa domanda.
  const seen = useRef(new Set<string>());
  if (!definition || !exercise) return null;
  seen.current.add(exercise.prompt);
  return (
    <Box kind="question" label="Domanda lampo">
      <ExerciseView key={seed} exercise={exercise} context="lampo" preferChoice onAnswered={onAnswered} onSimilar={() => setSeed(freshSeed(definition, level, seen.current, randomSeed))} />
    </Box>
  );
}

interface ManualQuestionProps {
  lesson: LessonCode;
  line: number;
  prompt: string;
  options: readonly QuestionOption[];
  explanation: string;
  onAnswered: () => void;
}

/** Una domanda lampo scritta a mano nella lezione: scelta, esito, spiegazione. Si registra, ma non conta per la padronanza. */
function ManualQuestion({ lesson, line, prompt, options, explanation, onAnswered }: ManualQuestionProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const startedAt = useRef(performance.now());
  const picked = chosen === null ? undefined : options[chosen];
  const error = confirmed && picked && !picked.correct && picked.error ? findError(picked.error) : undefined;

  const confirm = (): void => {
    if (!picked) return;
    setConfirmed(true);
    recordAttempt({
      id: newId(),
      at: new Date().toISOString(),
      skill: null,
      generator: null,
      seed: null,
      level: null,
      lesson,
      question: line,
      outcome: picked.correct ? "correct" : "wrong",
      error: picked.correct ? null : (picked.error ?? "NON_CLASSIFICATO"),
      distraction: false,
      hints: 0,
      millis: Math.round(performance.now() - startedAt.current),
      context: "lampo",
    });
    onAnswered();
  };

  return (
    <Box kind="question" label="Domanda lampo">
      <RichText text={prompt} class="exercise-prompt" />
      <div class="options" role="radiogroup" aria-label="Risposte possibili">
        {options.map((option, index) => {
          const state = !confirmed ? (chosen === index ? " option-chosen" : "") : option.correct ? " option-right" : chosen === index ? " option-wrong" : "";
          return (
            <button key={index} type="button" role="radio" aria-checked={chosen === index} disabled={confirmed} class={`option${state}`} onClick={() => setChosen(index)}>
              <span class="option-mark" aria-hidden="true">
                {confirmed && option.correct ? "✓" : confirmed && chosen === index ? "✗" : ""}
              </span>
              <RichText text={option.content} inline />
              {confirmed && option.correct && <span class="visually-hidden"> (risposta giusta)</span>}
            </button>
          );
        })}
      </div>
      {!confirmed && (
        <div class="exercise-actions">
          <button type="button" class="button button-primary" disabled={chosen === null} onClick={confirm}>
            Conferma
          </button>
        </div>
      )}
      {confirmed && (
        <div class={picked?.correct ? "verdict verdict-correct" : "verdict verdict-wrong"} role="status">
          <p class="verdict-title">{picked?.correct ? <><span aria-hidden="true">✓</span> Giusta</> : <><span aria-hidden="true">✗</span> Sbagliata</>}</p>
          {error && <p class="verdict-error">Errore riconosciuto: {error.name}</p>}
          <RichText text={explanation} />
        </div>
      )}
    </Box>
  );
}
