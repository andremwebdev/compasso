// La schermata di una serie di esercizi aperta da Teoria o da Esercizi: dopo una lezione, scelta
// libera, ripasso misto, «Allenati su questo» del diario, controllo «Lo so già».

import { useState } from "preact/hooks";
import type { KnownCheck } from "../../dati";
import { lessonOfSkill, skillText } from "../../contenuti/programma";
import { BackButton } from "../componenti/Common";
import { ExerciseSeries, type SeriesResult } from "../componenti/ExerciseSeries";
import { isWritten, lessonTitle } from "../programma";
import { goBack, newId, open, recordCheck, type PracticePlan } from "../state";
import { CHECK_PASS, checkRecord } from "./checks";

export function Practice({ plan }: { plan: PracticePlan }) {
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState<readonly SeriesResult[] | null>(null);
  const [check, setCheck] = useState<KnownCheck | null>(null);
  const backLabel = plan.lesson ? "Lezione" : plan.check ? "Modulo" : "Indietro";

  const finish = (results: readonly SeriesResult[]): void => {
    setFinished(results);
    if (plan.check) {
      const record = checkRecord(plan.check, results, newId(), new Date().toISOString());
      recordCheck(record);
      setCheck(record);
    }
  };

  return (
    <section class="section">
      <BackButton label={backLabel} />
      <header class="lesson-header">
        <h1>{plan.title}</h1>
      </header>
      {finished ? (
        <div class="card card-done">
          {check ? <CheckOutcome check={check} correct={finished.filter((r) => r.outcome === "correct").length} total={finished.length} /> : (
            <>
              <p class="verdict-title">Serie finita</p>
              <p>
                Risposte giuste: <strong>{finished.filter((r) => r.outcome === "correct").length}</strong> su {finished.length}.
              </p>
            </>
          )}
          <div class="exercise-actions">
            {!plan.check && (
              <button
                type="button"
                class="button button-primary"
                onClick={() => {
                  setFinished(null);
                  setRound(round + 1);
                }}
              >
                Un'altra serie
              </button>
            )}
            <button type="button" class="button" onClick={() => goBack()}>
              Torna indietro
            </button>
          </div>
        </div>
      ) : (
        <ExerciseSeries key={round} items={plan.items} endless={plan.endless} context={plan.context} onFinished={finish} />
      )}
    </section>
  );
}

/** L'esito del controllo «Lo so già»: superato, oppure le abilità da rivedere con le loro lezioni. */
function CheckOutcome({ check, correct, total }: { check: KnownCheck; correct: number; total: number }) {
  if (check.passed) {
    return (
      <>
        <p class="verdict-title">
          <span aria-hidden="true">✓</span> Controllo superato
        </p>
        <p>
          Giuste {correct} su {total}. Le abilità del modulo partono da «consolidato» ed entrano nel ripasso; Oggi salta le sue lezioni.
        </p>
      </>
    );
  }
  return (
    <>
      <p class="verdict-title">
        <span aria-hidden="true">✗</span> Controllo non superato
      </p>
      <p>
        Giuste {correct} su {total}: ne servivano almeno {CHECK_PASS}. Da rivedere:
      </p>
      <ul class="plain-list">
        {check.failed.map((skill) => {
          const lesson = lessonOfSkill(skill);
          return (
            <li key={skill}>
              {skillText(skill) ?? skill}{" "}
              {lesson &&
                (isWritten(lesson.code) ? (
                  <button type="button" class="link" onClick={() => open({ kind: "lesson", code: lesson.code }, "teoria")}>
                    {lessonTitle(lesson.code)}
                  </button>
                ) : (
                  <span class="muted-inline">({lessonTitle(lesson.code)}, in arrivo)</span>
                ))}
            </li>
          );
        })}
      </ul>
    </>
  );
}
