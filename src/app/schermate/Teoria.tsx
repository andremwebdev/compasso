// Sezione Teoria (specifica, sezione 3): volume → modulo → lezione, con lo stato di ogni lezione.
// Le lezioni previste dalle scalette ma non ancora scritte compaiono come «in arrivo». C'è anche il
// glossario, con i termini definiti dalle lezioni scritte.

import { useState } from "preact/hooks";
import type { ModuleCode } from "../../codici";
import { findModule, findVolume, programme, skillsOfModule } from "../../contenuti/programma";
import type { TrackId } from "../../dati";
import { BackButton, GroupTitle, MasteryBadge } from "../componenti/Common";
import { RichText } from "../componenti/RichText";
import { allGlossaryItems, type GlossaryItem } from "../lezione/glossary";
import { generatorsOfModule, groupLevel, isWritten, knownModules, lessonState, LESSON_STATE_MARKS, lessonTitle } from "../programma";
import { checks, masteries, open } from "../state";
import { knownCheckPlan } from "./checks";

/** Quante lezioni di un gruppo sono scritte e quante completate. */
function counts(lessons: readonly { code: string }[]): { total: number; written: number; done: number } {
  const states = lessons.map((lesson) => (isWritten(lesson.code) ? lessonState(lesson.code) : "in arrivo"));
  return { total: lessons.length, written: states.filter((s) => s !== "in arrivo").length, done: states.filter((s) => s === "completata").length };
}

export function TeoriaHome() {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Teoria</h1>
      {programme.map((volume) => {
        const lessons = volume.modules.flatMap((module) => module.lessons);
        const c = counts(lessons);
        const skills = volume.modules.flatMap((module) => skillsOfModule(module.code));
        return (
          <button key={volume.code} type="button" class="card card-link" onClick={() => open({ kind: "volume", code: volume.code })}>
            <span class="eyebrow">
              Volume {volume.code.slice(1)} · {volume.modules.length} moduli
            </span>
            <span class="card-title">{volume.title}</span>
            <span class="card-text">
              {c.written} lezioni scritte su {c.total} · {c.done} completate
            </span>
            <MasteryBadge level={groupLevel(skills, masteries.value)} />
          </button>
        );
      })}
      <button type="button" class="card card-link" onClick={() => open({ kind: "glossary" })}>
        <span class="eyebrow">Glossario</span>
        <span class="card-title">Termini definiti nelle lezioni</span>
        <span class="card-text">{allGlossaryItems().length} termini finora</span>
      </button>
    </section>
  );
}

export function VolumeView({ code }: { code: TrackId }) {
  const volume = findVolume(code);
  const known = knownModules();
  if (!volume) return null;
  return (
    <section class="section">
      <BackButton label="Teoria" />
      <header class="lesson-header">
        <p class="eyebrow">Volume {code.slice(1)}</p>
        <h1>{volume.title}</h1>
      </header>
      {volume.modules.map((module) => {
        const c = counts(module.lessons);
        return (
          <button key={module.code} type="button" class="card card-link" onClick={() => open({ kind: "module", code: module.code })}>
            <span class="eyebrow">{module.code}</span>
            <span class="card-title">{module.title}</span>
            <span class="card-text">
              {c.written === 0 ? `${c.total} lezioni in arrivo` : `${c.written} lezioni scritte su ${c.total} · ${c.done} completate`}
            </span>
            <span class="row-between">
              <MasteryBadge level={groupLevel(skillsOfModule(module.code), masteries.value)} />
              {known.has(module.code) && <span class="tag">Lo so già</span>}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export function ModuleView({ code }: { code: ModuleCode }) {
  const module = findModule(code);
  if (!module) return null;
  const known = knownModules().has(code);
  const lastCheck = [...checks.value].reverse().find((check) => check.module === code);
  const canCheck = generatorsOfModule(code).length > 0;
  return (
    <section class="section">
      <BackButton label={`Volume ${code.slice(1, 2)}`} fallback={{ kind: "volume", code: code.slice(0, 2) as TrackId }} />
      <header class="lesson-header">
        <p class="eyebrow">{code}</p>
        <h1>{module.title}</h1>
        {!module.approved && <p class="muted">Scaletta ancora da approvare: titoli e lezioni possono cambiare.</p>}
      </header>

      <GroupTitle>Lezioni</GroupTitle>
      {module.lessons.map((lesson) => {
        const state = isWritten(lesson.code) ? lessonState(lesson.code) : "in arrivo";
        const body = (
          <>
            <span class="eyebrow">
              {lesson.code} · {lesson.minutes} min
            </span>
            <span class="card-title">{lessonTitle(lesson.code)}</span>
            <span class="status">
              <span aria-hidden="true">{LESSON_STATE_MARKS[state]}</span> {state === "in arrivo" ? "In arrivo" : state[0]?.toUpperCase() + state.slice(1)}
            </span>
          </>
        );
        return isWritten(lesson.code) ? (
          <button key={lesson.code} type="button" class="card card-link" onClick={() => open({ kind: "lesson", code: lesson.code })}>
            {body}
          </button>
        ) : (
          <div key={lesson.code} class="card card-coming" aria-disabled="true">
            {body}
          </div>
        );
      })}

      <GroupTitle>Lo so già</GroupTitle>
      <div class="card">
        {known ? (
          <p class="card-text">
            <span aria-hidden="true">✓</span> Controllo superato: le abilità del modulo partono da «consolidato» e sono nel ripasso.
          </p>
        ) : (
          <p class="card-text">Se questo modulo lo sai già, un controllo rapido di 5 esercizi te lo fa saltare. Le lezioni restano aperte.</p>
        )}
        {lastCheck && !lastCheck.passed && <p class="muted">L'ultimo controllo non è stato superato: guarda le lezioni indicate e riprova quando vuoi.</p>}
        {canCheck ? (
          <button type="button" class="button" onClick={() => open({ kind: "practice", plan: knownCheckPlan(code), key: `check-${Date.now()}` })}>
            {known ? "Rifai il controllo" : "Lo so già"}
          </button>
        ) : (
          <p class="muted">Il controllo arriva quando il modulo ha i suoi esercizi.</p>
        )}
      </div>
    </section>
  );
}

export function GlossaryView() {
  const [term, setTerm] = useState<GlossaryItem | null>(null);
  const items = allGlossaryItems();
  return (
    <section class="section">
      <BackButton label="Teoria" />
      <header class="lesson-header">
        <h1>Glossario</h1>
        <p class="muted">I termini definiti nelle lezioni scritte. Tocca un termine per leggerne la definizione.</p>
      </header>
      <div class="list">
        {items.map((item) => (
          <button key={item.term} type="button" class="list-row" onClick={() => setTerm(item)}>
            <span>{item.name}</span>
            <span class="muted-inline">{item.lesson}</span>
          </button>
        ))}
      </div>
      {term && <GlossarySheet item={term} onClose={() => setTerm(null)} />}
    </section>
  );
}

/** La definizione di un termine in un foglio che sale dal basso. */
export function GlossarySheet({ item, onClose }: { item: GlossaryItem; onClose: () => void }) {
  const lesson = item.lesson;
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={item.name} onClick={(event) => event.stopPropagation()}>
        <p class="eyebrow">Glossario · {item.lesson}</p>
        <h2>{item.name}</h2>
        <RichText text={item.body} />
        <div class="exercise-actions">
          {isWritten(lesson) && (
            <button
              type="button"
              class="button"
              onClick={() => {
                onClose();
                open({ kind: "lesson", code: lesson }, "teoria");
              }}
            >
              Apri la lezione
            </button>
          )}
          <button type="button" class="button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
