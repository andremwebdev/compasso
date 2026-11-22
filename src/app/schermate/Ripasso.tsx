// Ripasso delle flashcard (autovalutazione con tre pulsanti) e dimostrazioni interattive nelle tre
// modalità. Il mazzo di flashcard si usa anche nella fase «Ripasso» di Oggi.

import { useMemo, useRef, useState } from "preact/hooks";
import { moduleOf, type LessonCode, type TheoremCode } from "../../codici";
import { loadLesson } from "../../contenuti";
import { GRADE_LABELS } from "../../dati";
import { modulesOf, WithModules } from "../caricamento";
import { BackButton, Tabs } from "../componenti/Common";
import { ReorderList } from "../componenti/ReorderList";
import { RichText } from "../componenti/RichText";
import { findCard, proofsOfLesson, type ProofEntry } from "../ripasso/cards";
import { completeTask, DRILL_MODES, isInOrder, proofAttempt, shuffledOrder, wrongTask, type DrillMode } from "../ripasso/drill";
import { rightPlaces } from "../risposta/ordering";
import { newId, recordAttempt, recordReview } from "../state";

const KIND_LABELS = { definizione: "Definizione", teorema: "Teorema", manuale: "Flashcard" } as const;

interface DeckProps {
  cards: readonly string[];
  onFinished: (count: number) => void;
}

/** Il mazzo, dopo aver caricato i moduli delle sue flashcard (il codice di una flashcard dice il modulo). */
export function FlashcardDeck(props: DeckProps) {
  return <WithModules modules={modulesOf(props.cards.filter((id) => id !== ""))}>{() => <Deck {...props} />}</WithModules>;
}

/** Un mazzo di flashcard: davanti, «Mostra il retro», autovalutazione; ogni risposta si registra. */
function Deck({ cards, onFinished }: DeckProps) {
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

interface ProofScreenProps {
  lesson: LessonCode;
  theorem: TheoremCode;
}

/** Una dimostrazione, dopo aver caricato il modulo della sua lezione. */
export function ProofScreen(props: ProofScreenProps) {
  return <WithModules modules={[moduleOf(props.lesson)]}>{() => <Proof {...props} />}</WithModules>;
}

/** Una dimostrazione cercata nella sua lezione (il modulo è già caricato). */
function Proof({ lesson, theorem }: ProofScreenProps) {
  const proof = useMemo(() => {
    const source = loadLesson(lesson);
    return source ? proofsOfLesson(source).find((entry) => entry.theorem === theorem) : undefined;
  }, [lesson, theorem]);
  return <ProofDrills lesson={lesson} theorem={theorem} proof={proof} />;
}

/** Una dimostrazione nelle tre modalità interattive; ogni giro registra un tentativo. */
export function ProofDrills({ lesson, theorem, proof }: ProofScreenProps & { proof: ProofEntry | undefined }) {
  const [mode, setMode] = useState<DrillMode>("riordina");
  const [round, setRound] = useState(0);
  // Ogni giro (modalità aperta o «Ricomincia») dà un tentativo nel registro, alla prima risposta.
  const answered = (drill: DrillMode) => (correct: boolean, millis: number) =>
    recordAttempt(proofAttempt({ id: newId(), at: new Date().toISOString(), lesson, theorem, mode: drill, correct, millis }));
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
      {mode === "riordina" && <ReorderDrill key={round} steps={proof.steps} onAnswered={answered("riordina")} />}
      {mode === "sbagliato" && <WrongDrill key={round} steps={proof.steps} onAnswered={answered("sbagliato")} />}
      {mode === "completa" && <CompleteDrill key={round} steps={proof.steps} onAnswered={answered("completa")} />}
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

/** Chiamata una volta per giro, alla prima risposta: giusta o no, e dopo quanto tempo. */
type OnAnswered = (correct: boolean, millis: number) => void;

/** Il tempo dall'apertura del giro, per il registro. */
function useStartTime() {
  const startedAt = useRef(performance.now());
  return () => performance.now() - startedAt.current;
}

function ReorderDrill({ steps, onAnswered }: { steps: Steps; onAnswered: OnAnswered }) {
  const [order, setOrder] = useState(() => shuffledOrder(steps, Math.random));
  // L'esito dell'ultimo «Controlla»; si cancella appena si sposta un passaggio (non si scopre l'ordine giusto senza controllare).
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [recorded, setRecorded] = useState(false);
  const elapsed = useStartTime();
  const done = verdict === true;
  const items = useMemo(() => steps.map((step) => ({ content: step.text, fixed: step.fixed })), [steps]);
  const check = (): void => {
    const right = isInOrder(order);
    setVerdict(right);
    // Conta il primo «Controlla»: dopo un errore si può correggere, ma il tentativo resta quello.
    if (!recorded) {
      setRecorded(true);
      onAnswered(right, elapsed());
    }
  };
  return (
    <>
      <p class="muted">Rimetti i passaggi in ordine con le frecce. Quelli tratteggiati sono fissi.</p>
      <ReorderList
        items={items}
        order={order}
        onChange={
          done
            ? undefined
            : (next) => {
                setOrder(next);
                setVerdict(null);
              }
        }
        extra={(index) => (done ? <RichText text={steps[index]?.reason ?? ""} class="proof-reason" /> : null)}
        label="Passaggi da riordinare"
      />
      {!done && (
        <div class="exercise-actions">
          <button type="button" class="button button-primary" onClick={check}>
            Controlla
          </button>
        </div>
      )}
      {verdict !== null && (
        <div class={verdict ? "verdict verdict-correct" : "verdict verdict-wrong"} role="status">
          <p class="verdict-title">{verdict ? <><span aria-hidden="true">✓</span> Ordine giusto</> : <><span aria-hidden="true">✗</span> Non ancora</>}</p>
          {!verdict && <p>Passaggi al posto giusto: {rightPlaces(order)} su {order.length}. Sposta gli altri e controlla di nuovo.</p>}
        </div>
      )}
    </>
  );
}

function WrongDrill({ steps, onAnswered }: { steps: Steps; onAnswered: OnAnswered }) {
  const task = useMemo(() => wrongTask(steps, Math.random), [steps]);
  const [chosen, setChosen] = useState<number | null>(null);
  const elapsed = useStartTime();
  if (!task) return <p class="muted">Questa dimostrazione non ha versioni sbagliate.</p>;
  return (
    <>
      <p class="muted">Uno dei passaggi è sbagliato: toccalo.</p>
      {steps.map((step, index) => {
        const text = index === task.index ? task.wrong.text : step.text;
        const state = chosen === null ? "" : index === task.index ? " option-right" : index === chosen ? " option-wrong" : "";
        return (
          <button key={index} type="button" class={`proof-step option${state}`} disabled={chosen !== null} onClick={() => {
            setChosen(index);
            onAnswered(index === task.index, elapsed());
          }}>
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

function CompleteDrill({ steps, onAnswered }: { steps: Steps; onAnswered: OnAnswered }) {
  const task = useMemo(() => completeTask(steps, Math.random), [steps]);
  const [chosen, setChosen] = useState<number | null>(null);
  const elapsed = useStartTime();
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
            <button key={index} type="button" class={`option${state}`} disabled={chosen !== null} onClick={() => {
              setChosen(index);
              onAnswered(option.correct, elapsed());
            }}>
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
