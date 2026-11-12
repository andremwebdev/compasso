// Le pagine iniziali delle cinque sezioni, in questa fase: Teoria ed Esercizi funzionano sulla fetta
// verticale (una lezione, i generatori di riferimento); Oggi, Test e Tu mostrano quello che c'è.

import { lessonCodes, loadLesson } from "../../contenuti";
import { DATA_VERSION, skillSummaries } from "../../dati";
import type { Level } from "../../esercizi";
import { generators } from "../../generatori";
import { attempts, dataProblem, dataStore, lessonProgress, open } from "../state";

function lessonStatus(code: string): { label: string; mark: string } {
  const progress = lessonProgress.value[code];
  if (progress?.completed) return { label: "Completata", mark: "✓" };
  if (progress) return { label: "In corso", mark: "◐" };
  return { label: "Da iniziare", mark: "○" };
}

function LessonCard({ code }: { code: (typeof lessonCodes)[number] }) {
  const lesson = loadLesson(code);
  if (!lesson) return null;
  const status = lessonStatus(code);
  return (
    <button type="button" class="card card-link" onClick={() => open({ kind: "lesson", code }, "teoria")}>
      <span class="eyebrow">
        {code} · {lesson.meta.minutes} min
      </span>
      <span class="card-title">{lesson.meta.title}</span>
      <span class="card-text">{lesson.meta.goal}</span>
      <span class="status">
        <span aria-hidden="true">{status.mark}</span> {status.label}
      </span>
    </button>
  );
}

export function Oggi() {
  const next = lessonCodes.find((code) => !lessonProgress.value[code]?.completed) ?? lessonCodes[0];
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Oggi</h1>
      <p class="muted">La sessione guidata arriva più avanti. Per ora, da qui riprendi la lezione.</p>
      {next && <LessonCard code={next} />}
    </section>
  );
}

export function Teoria() {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Teoria</h1>
      <p class="muted">Le lezioni scritte finora. La mappa dei tre volumi arriva con i contenuti.</p>
      {lessonCodes.map((code) => (
        <LessonCard key={code} code={code} />
      ))}
    </section>
  );
}

export function Esercizi() {
  const summaries = new Map(skillSummaries(attempts.value).map((summary) => [summary.skill, summary]));
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Esercizi</h1>
      <p class="muted">Scegli un argomento e un livello: 1 applicazione diretta, 2 da verifica, 3 casi particolari.</p>
      {generators.map((generator) => {
        const summary = summaries.get(generator.skill);
        return (
          <div key={generator.code} class="card">
            <span class="eyebrow">{generator.skill}</span>
            <span class="card-title">{generator.title}</span>
            <span class="card-text">{summary ? `Giuste ${summary.correct} su ${summary.attempts}` : "Ancora nessun tentativo"}</span>
            <div class="level-buttons" role="group" aria-label={`Livello per ${generator.title}`}>
              {generator.levels.map((level) => (
                <button
                  key={level}
                  type="button"
                  class="button"
                  onClick={() => open({ kind: "practice", generator: generator.code, levels: [level as Level], endless: true, context: "esercizi", lesson: null })}
                >
                  Livello {level}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function Test() {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Test</h1>
      <p class="muted">In costruzione: mini-test di modulo e simulazioni del TOL.</p>
    </section>
  );
}

const STORE_NAMES = { indexeddb: "nella memoria del browser (IndexedDB)", localstorage: "nella memoria del browser (localStorage)", memory: "solo fino alla chiusura della pagina" } as const;

export function Tu() {
  const log = attempts.value;
  const counted = log.filter((attempt) => attempt.context !== "lampo");
  const completed = Object.values(lessonProgress.value).filter((progress) => progress.completed).length;
  const store = dataStore.value;
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Tu</h1>
      <div class="card">
        <span class="card-title">Finora</span>
        <ul class="plain-list">
          <li>
            Lezioni completate: <strong>{completed}</strong>
          </li>
          <li>
            Esercizi fatti: <strong>{counted.length}</strong>, giusti <strong>{counted.filter((attempt) => attempt.outcome === "correct").length}</strong>
          </li>
          <li>
            Domande lampo: <strong>{log.length - counted.length}</strong>
          </li>
        </ul>
      </div>
      <div class="card">
        <span class="card-title">Dati</span>
        {dataProblem.value ? (
          <p class="answer-problem">{dataProblem.value}</p>
        ) : (
          <p class="card-text">
            {store ? `Salvati ${STORE_NAMES[store.kind]}. Versione dei dati: ${store.version}.` : "Apertura dei dati in corso…"} Tentativi nel registro: {log.length}.
          </p>
        )}
        <p class="muted">Backup, diario degli errori e profilo arrivano più avanti (versione dei dati prevista dall'app: {DATA_VERSION}).</p>
      </div>
    </section>
  );
}
