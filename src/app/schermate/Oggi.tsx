// Sezione Oggi (specifica, sezione 3): si sceglie la durata, poi le cinque fasi nell'ordine (ripasso,
// lezione nuova, esercizi sulla lezione, punti deboli, chiusura). La sessione in corso è salvata:
// se l'app si chiude a metà, si riprende dalla fase e dall'esercizio dove si era arrivati.

import { signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import type { LessonCode } from "../../codici";
import { findPlannedLesson, findVolume, lessonsOfVolume } from "../../contenuti/programma";
import { backupDue, dueSkills, SESSION_MINUTES, streakInfo, weakestErrors, type SessionMinutes, type TodaySession, type TrackId } from "../../dati";
import type { GeneratorDefinition, Level } from "../../esercizi";
import { findError } from "../../errori";
import { generators } from "../../generatori";
import { Choice, GroupTitle } from "../componenti/Common";
import { ExerciseSeries } from "../componenti/ExerciseSeries";
import { CLOSING_PHASE, exerciseCount, PHASE_NAMES, phaseMinutes, rampLevels, reviewPlan, trackForToday } from "../oggi/plan";
import { generatorOfSkill, generatorsOfLesson, generatorsOfModule, isWritten, lessonState, lessonTitle, nextLessonOfTrack } from "../programma";
import {
  attempts, backupInfo, dataLoaded, days, lessonProgress, masteries, open, recordDay, reviews, saveTodaySession, settings, today, todaySession, type PracticeItem,
} from "../state";
import { dueFlashcards } from "./Esercizi";
import { LessonView } from "./LessonView";
import { FlashcardDeck } from "./Ripasso";

/**
 * Vero mentre Andrea sta facendo la sessione. Si esce con «Esci e riprendi dopo» (o riaprendo l'app):
 * i progressi restano salvati e Oggi mostra da dove si riparte invece di rientrare subito nella fase.
 */
const sessionActive = signal(false);

const trackName = (track: TrackId | null): string => (track ? (findVolume(track)?.title ?? track) : "nessuno");

/** Vero se nel binario c'è una lezione cominciata e non finita. */
function hasLessonInProgress(track: TrackId): boolean {
  return lessonsOfVolume(track).some((lesson) => lessonProgress.value[lesson.code] !== undefined && !lessonProgress.value[lesson.code]?.completed);
}

/** Il generatore più vicino al livello voluto tra quelli che offre. */
const clampLevel = (generator: GeneratorDefinition, level: Level): Level =>
  (generator.levels.includes(level) ? level : ([...generator.levels].sort((a, b) => Math.abs(a - level) - Math.abs(b - level))[0] ?? 1)) as Level;

// ───────────────────────────── contenuto delle fasi ─────────────────────────────

/** Ripasso: flashcard in scadenza e un esercizio per ogni abilità in scadenza (difficoltà automatica). */
function reviewContent(budget: number): { cards: string[]; items: PracticeItem[] } {
  const cards = dueFlashcards();
  const skills = dueSkills(masteries.value, today()).flatMap((m) => {
    const generator = generatorOfSkill(m.skill);
    return generator ? [generator] : [];
  });
  const plan = reviewPlan(budget, cards.length, skills.length);
  return { cards: cards.slice(0, plan.cards), items: skills.slice(0, plan.exercises).map((g) => ({ generator: g.code, level: "auto" })) };
}

/**
 * Esercizi sulla lezione: le abilità della lezione del giorno, a difficoltà crescente. Se la lezione
 * non c'è o non è finita, le abilità delle ultime lezioni completate del binario (o del suo volume),
 * con la difficoltà automatica.
 */
function lessonExercises(session: TodaySession, budget: number): PracticeItem[] {
  const n = exerciseCount(budget);
  const lesson = session.lesson;
  if (lesson && lessonProgress.value[lesson]?.completed) {
    const planned = findPlannedLesson(lesson);
    const pool = [...new Set([...(planned ? generatorsOfLesson(planned) : []), ...generators.filter((g) => g.lesson === lesson)])];
    if (pool.length > 0) return rampLevels(n).map((level, i) => {
      const generator = pool[i % pool.length] as GeneratorDefinition;
      return { generator: generator.code, level: clampLevel(generator, level) };
    });
  }
  const track = session.track;
  if (!track) return [];
  const completed = lessonsOfVolume(track)
    .filter((l) => lessonProgress.value[l.code]?.completed)
    .sort((a, b) => (lessonProgress.value[b.code]?.completedAt ?? "").localeCompare(lessonProgress.value[a.code]?.completedAt ?? ""));
  let pool = completed.flatMap((l) => generatorsOfLesson(l));
  if (pool.length === 0) pool = (findVolume(track)?.modules ?? []).flatMap((m) => generatorsOfModule(m.code));
  return Array.from({ length: pool.length === 0 ? 0 : n }, (_, i) => ({ generator: (pool[i % pool.length] as GeneratorDefinition).code, level: "auto" as const }));
}

/** Punti deboli: esercizi dai generatori che producono gli errori di concetto più frequenti del diario. */
function weakExercises(budget: number): PracticeItem[] {
  const pools = weakestErrors(attempts.value, new Date(), 3)
    .map((code) => generators.filter((g) => g.errors.includes(code as (typeof g.errors)[number])))
    .filter((pool) => pool.length > 0);
  if (pools.length === 0) return [];
  return Array.from({ length: exerciseCount(budget) }, (_, i) => {
    const pool = pools[i % pools.length] ?? [];
    const generator = pool[Math.floor(Math.random() * pool.length)] as GeneratorDefinition;
    return { generator: generator.code, level: "auto" as const };
  });
}

/** Vero se una fase ha qualcosa da fare (le fasi vuote si saltano). */
function phaseHasWork(phase: number, session: TodaySession): boolean {
  const budget = phaseMinutes(session.minutes, session.lesson !== null)[phase] ?? 0;
  switch (phase) {
    case 0: {
      const content = reviewContent(budget);
      return content.cards.length + content.items.length > 0;
    }
    case 1:
      return session.lesson !== null;
    case 2:
      return lessonExercises(session, budget).length > 0;
    case 3:
      return budget > 0 && weakExercises(budget).length > 0;
    default:
      return true;
  }
}

/** La prima fase con qualcosa da fare dopo `from` (la chiusura c'è sempre). */
function nextPhase(session: TodaySession, from: number): number {
  for (let phase = from + 1; phase < CLOSING_PHASE; phase += 1) if (phaseHasWork(phase, session)) return phase;
  return CLOSING_PHASE;
}

function goTo(session: TodaySession, phase: number): void {
  saveTodaySession({ ...session, phase, doneInPhase: 0 });
}

// ───────────────────────────── schermate ─────────────────────────────

export function Oggi() {
  const t = today();
  const session = todaySession.value;
  if (!dataLoaded.value) {
    return (
      <section class="section" aria-labelledby="section-title">
        <h1 id="section-title">Oggi</h1>
        <p class="muted">Apertura dei dati…</p>
      </section>
    );
  }
  if (session && session.date === t) {
    if (session.phase < CLOSING_PHASE && !sessionActive.value) return <SessionPaused session={session} />;
    return <SessionView session={session} />;
  }
  return <SessionStart />;
}

function SessionStart() {
  const [minutes, setMinutes] = useState<SessionMinutes>(settings.value.defaultMinutes);
  const t = today();
  const track = trackForToday(settings.value.tracks, days.value, t, hasLessonInProgress);
  const lesson = track ? nextLessonOfTrack(track) : null;
  const doneToday = days.value.some((day) => day.date === t);
  const streak = streakInfo(days.value, t);
  const budgets = phaseMinutes(minutes, lesson !== null);
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Oggi</h1>
      {doneToday && (
        <div class="card card-done">
          <p class="verdict-title">
            <span aria-hidden="true">✓</span> Sessione di oggi fatta
          </p>
          <p>Serie: {streak.current} giorni. Se vuoi, puoi farne un'altra, oppure allenarti nella sezione Esercizi.</p>
        </div>
      )}
      <div class="card">
        <span class="card-title">Quanto tempo hai oggi?</span>
        <Choice options={SESSION_MINUTES.map((m) => ({ value: m, label: `${m} min` }))} value={minutes} onChange={setMinutes} label="Durata della sessione" />
        <p class="card-text">
          Binario di oggi: <strong>{trackName(track)}</strong>
        </p>
        <p class="card-text">
          {lesson ? (
            <>
              Lezione nuova: <strong>{lessonTitle(lesson)}</strong> ({lessonState(lesson) === "in corso" ? "da riprendere" : `${findPlannedLesson(lesson)?.minutes ?? "?"} min`})
            </>
          ) : (
            "Nessuna lezione nuova da fare in questo binario: il suo tempo va agli esercizi."
          )}
        </p>
        <ol class="phases">
          {PHASE_NAMES.map((name, index) => (
            <li key={name} class="phase">
              <span>{name}</span>
              <span class="muted-inline">{budgets[index] ? `${budgets[index]} min` : "—"}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          class="button button-primary"
          onClick={() => {
            const session: TodaySession = { date: t, minutes, track, lesson, phase: 0, doneInPhase: 0, startedAt: new Date().toISOString() };
            saveTodaySession({ ...session, phase: phaseHasWork(0, session) ? 0 : nextPhase(session, 0) });
            sessionActive.value = true;
          }}
        >
          Inizia la sessione
        </button>
      </div>
      {streak.current > 0 && !doneToday && <p class="muted">Serie in corso: {streak.current} giorni. Completa la sessione di oggi per allungarla.</p>}
    </section>
  );
}

/** La sessione di oggi lasciata a metà: dove si è arrivati e il pulsante per riprendere. */
function SessionPaused({ session }: { session: TodaySession }) {
  const lesson = session.lesson;
  const progress = lesson ? lessonProgress.value[lesson] : undefined;
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Oggi</h1>
      <div class="card">
        <span class="card-title">Sessione in pausa</span>
        <p class="card-text">
          Sessione da {session.minutes} minuti, arrivata alla fase «{PHASE_NAMES[session.phase]}»
          {session.phase === 1 && lesson ? `: ${lessonTitle(lesson)}, tratto ${progress?.reached ?? 1}` : session.doneInPhase > 0 ? `, ${session.doneInPhase} esercizi fatti` : ""}. I
          progressi sono salvati.
        </p>
        <button type="button" class="button button-primary" onClick={() => (sessionActive.value = true)}>
          Riprendi la sessione
        </button>
      </div>
    </section>
  );
}

function SessionView({ session }: { session: TodaySession }) {
  const budgets = phaseMinutes(session.minutes, session.lesson !== null);
  const budget = budgets[session.phase] ?? 0;
  const advance = (): void => goTo(session, nextPhase(session, session.phase));
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Oggi</h1>
      <p class="eyebrow">
        Sessione da {session.minutes} minuti · binario {trackName(session.track)}
      </p>
      <ol class="phases">
        {PHASE_NAMES.map((name, index) => (
          <li key={name} class={index === session.phase ? "phase phase-current" : index < session.phase ? "phase phase-done" : "phase"} aria-current={index === session.phase ? "step" : undefined}>
            <span>
              <span aria-hidden="true">{index < session.phase ? "✓ " : index === session.phase ? "▸ " : ""}</span>
              {name}
            </span>
            <span class="muted-inline">{budgets[index] ? `${budgets[index]} min` : "—"}</span>
          </li>
        ))}
      </ol>
      {session.phase === 0 && <ReviewPhase key={`0-${session.startedAt}`} budget={budget} onDone={advance} />}
      {session.phase === 1 && session.lesson && <LessonPhase key={`1-${session.lesson}`} lesson={session.lesson} budget={budget} onDone={advance} />}
      {session.phase === 2 && <ExercisePhase key={`2-${session.startedAt}`} session={session} title="Esercizi sulla lezione" items={lessonExercises(session, budget)} onDone={advance} />}
      {session.phase === 3 && <ExercisePhase key={`3-${session.startedAt}`} session={session} title="Punti deboli" items={weakExercises(budget)} onDone={advance} />}
      {session.phase >= CLOSING_PHASE && <Closing session={session} />}
      {session.phase < CLOSING_PHASE && (
        <div class="exercise-actions">
          <button type="button" class="button" onClick={() => (sessionActive.value = false)}>
            Esci e riprendi dopo
          </button>
          <button type="button" class="button" onClick={advance}>
            Salta questa fase
          </button>
        </div>
      )}
    </section>
  );
}

function ReviewPhase({ budget, onDone }: { budget: number; onDone: () => void }) {
  // Il contenuto si fissa all'inizio della fase: le flashcard ripassate non devono sparire sotto le dita.
  const [content] = useState(() => reviewContent(budget));
  const [cardsDone, setCardsDone] = useState(content.cards.length === 0);
  return (
    <div class="card">
      <span class="card-title">Ripasso</span>
      <p class="card-text">
        {content.cards.length} flashcard e {content.items.length} esercizi in scadenza.
      </p>
      {!cardsDone ? (
        <FlashcardDeck cards={content.cards} onFinished={() => (content.items.length > 0 ? setCardsDone(true) : onDone())} />
      ) : (
        <ExerciseSeries items={content.items} endless={false} context="oggi" onFinished={onDone} finishLabel="Fine del ripasso" />
      )}
    </div>
  );
}

function LessonPhase({ lesson, budget, onDone }: { lesson: LessonCode; budget: number; onDone: () => void }) {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 60_000), 15_000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const over = elapsed >= budget;
  return (
    <>
      <div class="card">
        <span class="card-title">Lezione nuova</span>
        <p class="card-text">
          Tempo previsto: {budget} minuti{elapsed >= 1 ? `, passati ${Math.floor(elapsed)}` : ""}.
        </p>
        <div class="ruler" role="img" aria-label={`Tempo della lezione: ${Math.floor(elapsed)} minuti su ${budget}`}>
          <span class="ruler-fill" style={{ width: `${Math.min(100, (elapsed / Math.max(budget, 1)) * 100)}%` }} />
        </div>
        {over && (
          <div class="notice" role="status">
            <p class="notice-title">Il tempo della lezione è finito</p>
            <p class="card-text">La riprendi domani da dove sei arrivato. Se vuoi, finiscila ora.</p>
            <button type="button" class="button" onClick={onDone}>
              Continua domani
            </button>
          </div>
        )}
      </div>
      {isWritten(lesson) ? <LessonView code={lesson} embedded={{ onDone, doneLabel: "Vai agli esercizi" }} /> : <p class="muted">Questa lezione non è ancora scritta.</p>}
    </>
  );
}

function ExercisePhase({ session, title, items, onDone }: { session: TodaySession; title: string; items: readonly PracticeItem[]; onDone: () => void }) {
  // Esercizi e punto di partenza si fissano all'apertura della fase (anche dopo una ripresa).
  const [frozen] = useState(items);
  const [start] = useState(() => Math.min(session.doneInPhase, Math.max(frozen.length - 1, 0)));
  return (
    <div class="card">
      <span class="card-title">{title}</span>
      <ExerciseSeries
        items={frozen}
        endless={false}
        context="oggi"
        startAt={start}
        onAnswered={(_, answered) => {
          // Si salva quanti esercizi sono fatti: riaprendo l'app si riparte dal successivo.
          const current = todaySession.value;
          if (current) saveTodaySession({ ...current, doneInPhase: answered });
        }}
        onFinished={onDone}
        finishLabel="Fase successiva"
      />
    </div>
  );
}

function Closing({ session }: { session: TodaySession }) {
  const t = today();
  // Entrare nella chiusura vuol dire aver completato la sessione: il giorno conta per la serie.
  useEffect(() => {
    if (!days.value.some((day) => day.date === t)) recordDay({ date: t, minutes: session.minutes, track: session.track, completedAt: new Date().toISOString() });
  }, []);
  const done = attempts.value.filter((a) => a.context === "oggi" && a.at >= session.startedAt);
  const before = new Set(attempts.value.filter((a) => a.at < session.startedAt && a.error).map((a) => a.error));
  const newErrors = [...new Set(done.filter((a) => a.outcome === "wrong" && a.error && !before.has(a.error)).map((a) => a.error as string))];
  const cards = reviews.value.filter((r) => r.at >= session.startedAt).length;
  const streak = streakInfo(days.value, t);
  const completedLessons = Object.values(lessonProgress.value).filter((p) => p.completed).length;
  const remindBackup = backupDue(backupInfo.value, completedLessons, days.value.length, t);
  return (
    <div class="card card-done">
      <p class="verdict-title">
        <span aria-hidden="true">✓</span> Sessione completata
      </p>
      <div class="stats">
        <div>
          <span class="big-number">{done.filter((a) => a.outcome === "correct").length}</span>
          <span class="stat-label">giuste su {done.length} esercizi</span>
        </div>
        <div>
          <span class="big-number">{cards}</span>
          <span class="stat-label">flashcard ripassate</span>
        </div>
        <div>
          <span class="big-number">{streak.current}</span>
          <span class="stat-label">giorni di serie</span>
        </div>
      </div>
      {session.lesson && (
        <p>
          Lezione: {lessonTitle(session.lesson)} — {lessonProgress.value[session.lesson]?.completed ? "completata" : "da riprendere domani"}.
        </p>
      )}
      <GroupTitle>Errori nuovi</GroupTitle>
      {newErrors.length === 0 ? (
        <p class="muted">Nessun errore nuovo oggi.</p>
      ) : (
        <ul class="plain-list">
          {newErrors.map((code) => (
            <li key={code}>{findError(code)?.name ?? "Risposta non classificata"}</li>
          ))}
        </ul>
      )}
      {remindBackup && (
        <div class="notice" role="note">
          <p class="notice-title">È ora di fare un backup</p>
          <p class="card-text">I dati stanno solo su questo dispositivo: un file di backup li mette al sicuro.</p>
          <button type="button" class="button" onClick={() => open({ kind: "home" }, "tu")}>
            Vai al backup
          </button>
        </div>
      )}
    </div>
  );
}
