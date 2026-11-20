// Ripasso delle flashcard (autovalutazione con tre pulsanti) e dimostrazioni interattive nelle tre
// modalità. Il mazzo di flashcard si usa anche nella fase «Ripasso» di Oggi.

import { useMemo, useState } from "preact/hooks";
import type { LessonCode, TheoremCode } from "../../codici";
import { loadLesson } from "../../contenuti";
import { GRADE_LABELS } from "../../dati";
import { BackButton, Tabs } from "../componenti/Common";
import { RichText } from "../componenti/RichText";
import { findCard, proofsOfLesson } from "../ripasso/cards";
import { completeTask, DRILL_MODES, isInOrder, moveStep, shuffledOrder, wrongTask, type DrillMode } from "../ripasso/drill";
import { newId, recordReview } from "../state";

const KIND_LABELS = { definizione: "Definizione", teorema: "Teorema", manuale: "Flashcard" } as const;

/** Un mazzo di flashcard: davanti, «Mostra il retro», autovalutazione; ogni risposta si registra. */
export function FlashcardDeck({ cards, onFinished }: { cards: readonly string[]; onFinished: (count: number) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = findCard(cards[index] ?? "");
  if (!card) return <p class="muted">Nessuna flashcard da ripassare.</p>;
  const grade = (value: 0 | 1 | 2): void => {
    recordReview({ id: newId(), at: new Date().toISOString(), card: card.id, grade: value });
    setFlipped(false);
    if (index + 1 >= cards.length) onFinished(cards.length);
    else setIndex(index + 1);
  };
  return (
    <div class="flashcard">
      <p class="eyebrow">
        Flashcard {index + 1} di {cards.length} · {KIND_LABELS[card.kind]} · {card.lesson}
      </p>
      <div class="flashcard-face">
        <RichText text={card.front} />
      </div>
      {flipped ? (
        <>
          <div class="flashcard-face flashcard-back">
            <RichText text={card.back} />
          </div>
          <p class="field-label">Come è andata?</p>
          <div class="exercise-actions">
            {GRADE_LABELS.map((label, value) => (
              <button key={label} type="button" class={value === 2 ? "button button-primary" : "button"} onClick={() => grade(value as 0 | 1 | 2)}>
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div class="exercise-actions">
          <button type="button" class="button button-primary" onClick={() => setFlipped(true)}>
            Mostra il retro
          </button>
        </div>
      )}
    </div>
  );
}

/** La schermata di un mazzo aperto dalla scheda Flashcard. */
export function FlashcardsScreen({ title, cards }: { title: string; cards: readonly string[] }) {
  const [done, setDone] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  return (
    <section class="section">
      <BackButton label="Flashcard" />
      <header class="lesson-header">
        <h1>{title}</h1>
      </header>
      {done === null ? (
        <FlashcardDeck key={round} cards={cards} onFinished={setDone} />
      ) : (
        <div class="card card-done">
          <p class="verdict-title">
            <span aria-hidden="true">✓</span> Mazzo finito
          </p>
          <p>Flashcard ripassate: {done}. Ognuna tornerà quando è il suo momento.</p>
          <button
            type="button"
            class="button"
            onClick={() => {
              setDone(null);
              setRound(round + 1);
            }}
          >
            Ripassa di nuovo
          </button>
        </div>
      )}
    </section>
  );
}

/** Una dimostrazione nelle tre modalità interattive. */
export function ProofScreen({ lesson, theorem }: { lesson: LessonCode; theorem: TheoremCode }) {
  const proof = useMemo(() => {
    const source = loadLesson(lesson);
    return source ? proofsOfLesson(source).find((entry) => entry.theorem === theorem) : undefined;
  }, [lesson, theorem]);
  const [mode, setMode] = useState<DrillMode>("riordina");
  const [round, setRound] = useState(0);
  if (!proof) {
    return (
      <section class="section">
        <BackButton label="Dimostrazioni" />
        <p>Questa dimostrazione non esiste ancora.</p>
      </section>
    );
  }
  return (
    <section class="section">
      <BackButton label="Dimostrazioni" />
      <header class="lesson-header">
        <p class="eyebrow">{theorem}</p>
        <h1>{proof.name}</h1>
      </header>
      <div class="box box-theorem">
        <p class="box-label">Teorema</p>
        <RichText text={proof.statement} />
      </div>
      <Tabs tabs={DRILL_MODES} current={mode} onChange={setMode} label="Modalità" />
      {mode === "riordina" && <ReorderDrill key={round} steps={proof.steps} />}
      {mode === "sbagliato" && <WrongDrill key={round} steps={proof.steps} />}
      {mode === "completa" && <CompleteDrill key={round} steps={proof.steps} />}
      <div class="exercise-actions">
        <button type="button" class="button" onClick={() => setRound(round + 1)}>
          Ricomincia
        </button>
      </div>
    </section>
  );
}

type Steps = Parameters<typeof shuffledOrder>[0];

/** Un passaggio con la sua giustificazione, mostrata dopo la verifica. */
function StepText({ text, reason, showReason }: { text: string; reason: string; showReason: boolean }) {
  return (
    <span class="proof-step-body">
      <RichText text={text} />
      {showReason && <RichText text={reason} class="proof-reason" />}
    </span>
  );
}

function ReorderDrill({ steps }: { steps: Steps }) {
  const [order, setOrder] = useState(() => shuffledOrder(steps, Math.random));
  const [checked, setChecked] = useState(false);
  const right = isInOrder(order);
  return (
    <>
      <p class="muted">Rimetti i passaggi in ordine con le frecce. Quelli tratteggiati sono fissi.</p>
      {order.map((stepIndex, position) => {
        const step = steps[stepIndex];
        if (!step) return null;
        return (
          <div key={stepIndex} class={step.fixed ? "proof-step proof-step-fixed" : "proof-step"}>
            <span class="muted-inline">{position + 1}.</span>
            <StepText text={step.text} reason={step.reason} showReason={checked && right} />
            {!step.fixed && !(checked && right) && (
              <span class="proof-step-moves">
                <button type="button" class="key" aria-label="Sposta su" onClick={() => setOrder(moveStep(order, steps, position, -1))}>
                  ↑
                </button>
                <button type="button" class="key" aria-label="Sposta giù" onClick={() => setOrder(moveStep(order, steps, position, 1))}>
                  ↓
                </button>
              </span>
            )}
          </div>
        );
      })}
      <div class="exercise-actions">
        <button type="button" class="button button-primary" onClick={() => setChecked(true)}>
          Controlla
        </button>
      </div>
      {checked && (
        <div class={right ? "verdict verdict-correct" : "verdict verdict-wrong"} role="status">
          <p class="verdict-title">{right ? <><span aria-hidden="true">✓</span> Ordine giusto</> : <><span aria-hidden="true">✗</span> Non ancora</>}</p>
          {!right && <p>Passaggi al posto giusto: {order.filter((value, index) => value === index).length} su {order.length}. Sposta gli altri e controlla di nuovo.</p>}
        </div>
      )}
    </>
  );
}

function WrongDrill({ steps }: { steps: Steps }) {
  const task = useMemo(() => wrongTask(steps, Math.random), [steps]);
  const [chosen, setChosen] = useState<number | null>(null);
  if (!task) return <p class="muted">Questa dimostrazione non ha versioni sbagliate.</p>;
  return (
    <>
      <p class="muted">Uno dei passaggi è sbagliato: toccalo.</p>
      {steps.map((step, index) => {
        const text = index === task.index ? task.wrong.text : step.text;
        const state = chosen === null ? "" : index === task.index ? " option-right" : index === chosen ? " option-wrong" : "";
        return (
          <button key={index} type="button" class={`proof-step option${state}`} disabled={chosen !== null} onClick={() => setChosen(index)}>
            <span class="muted-inline">{index + 1}.</span>
            <StepText text={text} reason={step.reason} showReason={false} />
          </button>
        );
      })}
      {chosen !== null && (
        <div class={chosen === task.index ? "verdict verdict-correct" : "verdict verdict-wrong"} role="status">
          <p class="verdict-title">{chosen === task.index ? <><span aria-hidden="true">✓</span> Trovato</> : <><span aria-hidden="true">✗</span> Era il passaggio {task.index + 1}</>}</p>
          <RichText text={task.wrong.reason} />
          <p class="field-label">La versione giusta</p>
          <RichText text={steps[task.index]?.text ?? ""} />
        </div>
      )}
    </>
  );
}

function CompleteDrill({ steps }: { steps: Steps }) {
  const task = useMemo(() => completeTask(steps, Math.random), [steps]);
  const [chosen, setChosen] = useState<number | null>(null);
  if (!task) return <p class="muted">Questa dimostrazione non ha versioni sbagliate.</p>;
  const picked = chosen === null ? undefined : task.options[chosen];
  return (
    <>
      <p class="muted">Un passaggio è nascosto: scegli quello giusto.</p>
      {steps.map((step, index) => (
        <div key={index} class="proof-step">
          <span class="muted-inline">{index + 1}.</span>
          {index === task.index ? <span class="proof-step-body muted">…passaggio da completare…</span> : <StepText text={step.text} reason={step.reason} showReason={false} />}
        </div>
      ))}
      <div class="options">
        {task.options.map((option, index) => {
          const state = chosen === null ? "" : option.correct ? " option-right" : chosen === index ? " option-wrong" : "";
          return (
            <button key={index} type="button" class={`option${state}`} disabled={chosen !== null} onClick={() => setChosen(index)}>
              <span class="option-mark" aria-hidden="true">
                {chosen !== null && option.correct ? "✓" : chosen === index ? "✗" : ""}
              </span>
              <RichText text={option.text} inline />
            </button>
          );
        })}
      </div>
      {picked && (
        <div class={picked.correct ? "verdict verdict-correct" : "verdict verdict-wrong"} role="status">
          <p class="verdict-title">{picked.correct ? <><span aria-hidden="true">✓</span> Giusto</> : <><span aria-hidden="true">✗</span> Sbagliato</>}</p>
          <RichText text={picked.reason} />
        </div>
      )}
    </>
  );
}
