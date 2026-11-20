// Sezione Esercizi (specifica, sezione 3): tre schede. Esercizi: scelta di argomento (volume, modulo,
// lezione o abilità), difficoltà (automatica o 1, 2, 3) e quantità, ripasso misto su più moduli,
// controllo «Lo so già» del modulo scelto. Flashcard: ripasso a scelta. Dimostrazioni: le tre modalità.

import { signal } from "@preact/signals";
import { useState } from "preact/hooks";
import type { GeneratorCode, LessonCode, ModuleCode, SkillCode } from "../../codici";
import { findModule, lessonOfSkill, programme } from "../../contenuti/programma";
import { cardSchedules, dueCards } from "../../dati";
import type { GeneratorDefinition, Level } from "../../esercizi";
import { generators } from "../../generatori";
import { Choice, GroupTitle, Tabs } from "../componenti/Common";
import { allCards, allProofs } from "../ripasso/cards";
import { DRILL_MODES } from "../ripasso/drill";
import { generatorsOfModule, isWritten, knownModules, lessonCovered, lessonTitle } from "../programma";
import { open, reviews, today, type PracticeItem, type PracticePlan } from "../state";
import { knownCheckPlan } from "./checks";

type ExerciseTab = "esercizi" | "flashcard" | "dimostrazioni";
/** La scheda aperta resta quella anche tornando indietro da una serie. */
const currentTab = signal<ExerciseTab>("esercizi");

const TABS: readonly { id: ExerciseTab; label: string }[] = [
  { id: "esercizi", label: "Esercizi" },
  { id: "flashcard", label: "Flashcard" },
  { id: "dimostrazioni", label: "Dimostrazioni" },
];

export function Esercizi() {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Esercizi</h1>
      <Tabs tabs={TABS} current={currentTab.value} onChange={(id) => (currentTab.value = id)} label="Tipo di ripasso" />
      {currentTab.value === "esercizi" && <ExerciseChooser />}
      {currentTab.value === "flashcard" && <FlashcardChooser />}
      {currentTab.value === "dimostrazioni" && <ProofChooser />}
    </section>
  );
}

// ───────────────────────────── Esercizi ─────────────────────────────

type Difficulty = "auto" | 1 | 2 | 3;
const DIFFICULTIES: readonly { value: Difficulty; label: string }[] = [
  { value: "auto", label: "Automatica" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];
const QUANTITIES: readonly { value: number; label: string }[] = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
];

/** Mescola un elenco (il caso dell'app: qui non serve il seme). */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Gli esercizi di una serie: i generatori a turno (mescolati a ogni giro, così due esercizi di fila
 * sono di tipo diverso quando si può), al livello scelto o con la difficoltà automatica.
 */
export function seriesItems(pool: readonly GeneratorDefinition[], count: number, difficulty: Difficulty): PracticeItem[] {
  const items: PracticeItem[] = [];
  while (items.length < count && pool.length > 0) {
    for (const generator of shuffle(pool)) {
      if (items.length >= count) break;
      const level: Level | "auto" = difficulty === "auto" ? "auto" : generator.levels.includes(difficulty) ? difficulty : (Math.max(...generator.levels) as Level);
      items.push({ generator: generator.code, level });
    }
  }
  return items;
}

/** I moduli che hanno almeno un generatore. */
const modulesWithExercises = (): { code: ModuleCode; title: string }[] =>
  programme.flatMap((volume) => volume.modules.filter((module) => generatorsOfModule(module.code).length > 0).map((module) => ({ code: module.code, title: module.title })));

function startPlan(plan: PracticePlan): void {
  open({ kind: "practice", plan, key: `${plan.title}-${Date.now()}` });
}

function ExerciseChooser() {
  const withExercises = modulesWithExercises();
  const [volume, setVolume] = useState<string>(programme[0]?.code ?? "V1");
  const modules = withExercises.filter((module) => module.code.startsWith(`${volume}.`));
  const [module, setModule] = useState<string>("");
  const chosenModule = (modules.find((m) => m.code === module) ?? modules[0])?.code;
  const moduleGenerators = chosenModule ? generatorsOfModule(chosenModule) : [];
  // Dentro il modulo: tutto il modulo, oppure una lezione, oppure un'abilità.
  const [topic, setTopic] = useState<string>("tutto");
  const lessons = [...new Set(moduleGenerators.map((g) => g.lesson))];
  const pool = topic === "tutto" ? moduleGenerators : moduleGenerators.filter((g) => g.lesson === topic || g.skill === topic);
  const [difficulty, setDifficulty] = useState<Difficulty>("auto");
  const [quantity, setQuantity] = useState(10);

  return (
    <>
      <div class="card">
        <span class="card-title">Scegli l'argomento</span>
        <label class="field-label" for="scelta-volume">
          Volume
        </label>
        <select
          id="scelta-volume"
          class="select"
          value={volume}
          onChange={(event) => {
            setVolume((event.target as HTMLSelectElement).value);
            setModule("");
            setTopic("tutto");
          }}
        >
          {programme.map((v) => (
            <option key={v.code} value={v.code}>
              {v.title}
            </option>
          ))}
        </select>
        {modules.length === 0 ? (
          <p class="muted">Questo volume non ha ancora esercizi.</p>
        ) : (
          <>
            <label class="field-label" for="scelta-modulo">
              Modulo
            </label>
            <select
              id="scelta-modulo"
              class="select"
              value={chosenModule}
              onChange={(event) => {
                setModule((event.target as HTMLSelectElement).value);
                setTopic("tutto");
              }}
            >
              {modules.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} · {m.title}
                </option>
              ))}
            </select>
            <label class="field-label" for="scelta-argomento">
              Lezione o abilità
            </label>
            <select id="scelta-argomento" class="select" value={topic} onChange={(event) => setTopic((event.target as HTMLSelectElement).value)}>
              <option value="tutto">Tutto il modulo</option>
              {lessons.map((lesson) => (
                <option key={lesson} value={lesson}>
                  Lezione: {lessonTitle(lesson)}
                </option>
              ))}
              {moduleGenerators.map((g) => (
                <option key={g.code} value={g.skill}>
                  Abilità: {g.title}
                </option>
              ))}
            </select>
            <span class="field-label">Difficoltà</span>
            <Choice options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} label="Difficoltà" />
            <p class="muted">Automatica: parte dalla tua padronanza, scende dopo due errori di fila, sale dopo tre risposte giuste di fila.</p>
            <span class="field-label">Quantità</span>
            <Choice options={QUANTITIES} value={quantity} onChange={setQuantity} label="Quantità" />
            <div class="exercise-actions">
              <button
                type="button"
                class="button button-primary"
                disabled={pool.length === 0}
                onClick={() =>
                  startPlan({
                    title: topic === "tutto" ? (findModule(chosenModule ?? "")?.title ?? "Esercizi") : pool.length === 1 ? (pool[0]?.title ?? "Esercizi") : lessonTitle(topic as LessonCode),
                    items: seriesItems(pool, quantity, difficulty),
                    endless: false,
                    context: "esercizi",
                    lesson: null,
                    check: null,
                  })
                }
              >
                Inizia
              </button>
              {chosenModule && (
                <button type="button" class="button" onClick={() => open({ kind: "practice", plan: knownCheckPlan(chosenModule), key: `check-${Date.now()}` })}>
                  Lo so già
                </button>
              )}
            </div>
            {chosenModule && knownModules().has(chosenModule) && <p class="muted">Questo modulo è già segnato «Lo so già».</p>}
          </>
        )}
      </div>
      <MixedReview modules={withExercises} />
      <SkillList />
    </>
  );
}

/** Ripasso misto: esercizi da più moduli, mescolati, per allenarsi a riconoscere che esercizio si ha davanti. */
function MixedReview({ modules }: { modules: readonly { code: ModuleCode; title: string }[] }) {
  const [chosen, setChosen] = useState<ReadonlySet<ModuleCode>>(new Set());
  const [quantity, setQuantity] = useState(10);
  const pool = modules.filter((m) => chosen.has(m.code)).flatMap((m) => generatorsOfModule(m.code));
  return (
    <div class="card">
      <span class="card-title">Ripasso misto</span>
      <p class="card-text">Esercizi da più moduli, mescolati, con la difficoltà automatica: il tipo di esercizio non te lo dice nessuno.</p>
      {modules.map((m) => (
        <label key={m.code} class="check-row">
          <input
            type="checkbox"
            checked={chosen.has(m.code)}
            onChange={(event) => {
              const next = new Set(chosen);
              if ((event.target as HTMLInputElement).checked) next.add(m.code);
              else next.delete(m.code);
              setChosen(next);
            }}
          />
          <span>
            {m.title} <span class="muted-inline">{m.code}</span>
          </span>
        </label>
      ))}
      <span class="field-label">Quantità</span>
      <Choice options={QUANTITIES} value={quantity} onChange={setQuantity} label="Quantità del ripasso misto" />
      <button
        type="button"
        class="button button-primary"
        disabled={chosen.size < 2}
        onClick={() => startPlan({ title: "Ripasso misto", items: seriesItems(pool, quantity, "auto"), endless: false, context: "esercizi", lesson: null, check: null })}
      >
        Inizia il ripasso misto
      </button>
      {chosen.size < 2 && <p class="muted">Scegli almeno due moduli.</p>}
    </div>
  );
}

/** Tutte le abilità con un generatore, per allenarsi su una sola senza fine. */
function SkillList() {
  return (
    <>
      <GroupTitle>Tutte le abilità</GroupTitle>
      <div class="list">
        {generators.map((generator) => (
          <button
            key={generator.code}
            type="button"
            class="list-row"
            onClick={() => startPlan({ title: generator.title, items: [{ generator: generator.code, level: "auto" }], endless: true, context: "esercizi", lesson: null, check: null })}
          >
            <span>{generator.title}</span>
            <span class="muted-inline">{generator.skill}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Una serie su un'abilità, con la difficoltà automatica (usata da «Allenati su questo» e dalla padronanza). */
export function skillPlan(skill: SkillCode, generator: GeneratorCode, title: string): PracticePlan {
  return { title, items: Array.from({ length: 5 }, () => ({ generator, level: "auto" as const })), endless: false, context: "esercizi", lesson: lessonOfSkill(skill)?.code ?? null, check: null };
}


// ───────────────────────────── Flashcard ─────────────────────────────

/** Le flashcard da ripassare oggi: quelle delle lezioni completate (o dei moduli «Lo so già»). */
export function dueFlashcards(): string[] {
  const known = knownModules();
  const ready = allCards().filter((card) => lessonCovered(card.lesson, known)).map((card) => card.id);
  return dueCards(ready, cardSchedules(reviews.value), today());
}

function FlashcardChooser() {
  const cards = allCards();
  const due = dueFlashcards();
  const byLesson = [...new Set(cards.map((card) => card.lesson))];
  if (cards.length === 0) return <p class="muted">Le flashcard arrivano con le lezioni.</p>;
  return (
    <>
      <div class="card">
        <span class="card-title">In scadenza</span>
        <p class="card-text">
          {due.length === 0 ? "Nessuna flashcard da ripassare oggi." : `${due.length} da ripassare oggi, dalle lezioni completate.`} Le flashcard compaiono anche nel ripasso di Oggi.
        </p>
        <button type="button" class="button button-primary" disabled={due.length === 0} onClick={() => open({ kind: "flashcards", title: "Flashcard in scadenza", cards: due })}>
          Ripassa
        </button>
      </div>
      <GroupTitle>Per lezione</GroupTitle>
      <div class="list">
        {byLesson.map((lesson) => {
          const ofLesson = cards.filter((card) => card.lesson === lesson).map((card) => card.id);
          return (
            <button key={lesson} type="button" class="list-row" onClick={() => open({ kind: "flashcards", title: lessonTitle(lesson), cards: ofLesson })}>
              <span>{lessonTitle(lesson)}</span>
              <span class="muted-inline">{ofLesson.length} flashcard</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ───────────────────────────── Dimostrazioni ─────────────────────────────

function ProofChooser() {
  const proofs = allProofs();
  if (proofs.length === 0) {
    return (
      <div class="card">
        <span class="card-title">In arrivo</span>
        <p class="card-text">
          Le dimostrazioni interattive compaiono qui quando sono scritte le lezioni con i teoremi dimostrati (le prime nei moduli di Analisi). Per ognuna: riordina i passaggi, trova
          quello sbagliato, completa quello mancante.
        </p>
      </div>
    );
  }
  return (
    <div class="list">
      {proofs.map((proof) => (
        <button key={proof.theorem} type="button" class="list-row" onClick={() => open({ kind: "proof", lesson: proof.lesson, theorem: proof.theorem })}>
          <span>{proof.name}</span>
          <span class="muted-inline">{isWritten(proof.lesson) ? proof.theorem : ""}</span>
        </button>
      ))}
      <p class="muted">Modalità: {DRILL_MODES.map((mode) => mode.label).join(", ")}.</p>
    </div>
  );
}
