// Sezione Tu (specifica, sezione 3): serie di giorni, padronanza in livelli, diario degli errori,
// impostazioni, backup (esporta, importa, unisci, promemoria). Più la sezione Test, per ora «in arrivo».

import { useRef, useState } from "preact/hooks";
import type { ModuleCode, SkillCode } from "../../codici";
import { findModule, programme, skillsOfModule, skillText } from "../../contenuti/programma";
import {
  backupDue, backupFileName, backupFileText, DATA_VERSION, diaryCategories, diaryEntries, FREE_DAYS_PER_WEEK, MASTERY_LABELS, MASTERY_LEVELS, masteryOf,
  mergeData, readBackupFile, SESSION_MINUTES, streakInfo, TRACKS, type DiaryEntry, type DiaryView, type StoredData, type ThemeChoice, type Trend,
} from "../../dati";
import { errorCategories, findError, type ErrorCategory } from "../../errori";
import { generatorInfos as generators } from "../../generatori";
import { BackButton, Choice, GroupTitle, MasteryBadge, Tabs } from "../componenti/Common";
import { RichText } from "../componenti/RichText";
import { generatorOfSkill, groupLevel, isWritten, lessonTitle } from "../programma";
import {
  attempts, backupInfo, currentData, dataProblem, dataStore, days, lessonProgress, masteries, open, replaceAllData, saveBackupInfo, saveSettings, settings,
  today,
} from "../state";
import { skillPlan } from "./Esercizi";

const STORE_NAMES = { indexeddb: "nella memoria del browser (IndexedDB)", localstorage: "nella memoria del browser (localStorage)", memory: "solo fino alla chiusura della pagina" } as const;
const TREND_LABELS: Readonly<Record<Trend, string>> = { migliora: "↘ migliora", stabile: "→ stabile", peggiora: "↗ peggiora" };

export function Tu() {
  const t = today();
  const streak = streakInfo(days.value, t);
  const log = attempts.value;
  const counted = log.filter((attempt) => attempt.context !== "lampo" && attempt.context !== "dimostrazione");
  const proofs = log.filter((attempt) => attempt.context === "dimostrazione");
  const completed = Object.values(lessonProgress.value).filter((progress) => progress.completed).length;
  const store = dataStore.value;
  const top = diaryEntries(log, new Date(), "concetto").slice(0, 3);
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Tu</h1>

      <div class="card">
        <span class="card-title">Serie di giorni</span>
        <div class="stats">
          <div>
            <span class="big-number">{streak.current}</span>
            <span class="stat-label">serie attuale</span>
          </div>
          <div>
            <span class="big-number">{streak.longest}</span>
            <span class="stat-label">la più lunga</span>
          </div>
          <div>
            <span class="big-number">
              {streak.freeUsedThisWeek}/{FREE_DAYS_PER_WEEK}
            </span>
            <span class="stat-label">giorni liberi usati questa settimana</span>
          </div>
        </div>
        <p class="muted">
          Un giorno conta se completi la sessione di Oggi. Un giorno saltato è coperto da un giorno libero (al più due a settimana, mai di fila).
          {streak.doneToday ? " Oggi è già fatto." : ""}
        </p>
      </div>

      <div class="card">
        <span class="card-title">Padronanza</span>
        {programme.map((volume) => (
          <div key={volume.code} class="row-between">
            <span>{volume.title}</span>
            <MasteryBadge level={groupLevel(volume.modules.flatMap((m) => skillsOfModule(m.code)), masteries.value)} />
          </div>
        ))}
        <button type="button" class="button" onClick={() => open({ kind: "mastery" })}>
          Per modulo, lezione e abilità
        </button>
      </div>

      <div class="card">
        <span class="card-title">Diario degli errori</span>
        {top.length === 0 ? (
          <p class="card-text">Ancora nessun errore registrato.</p>
        ) : (
          <ul class="plain-list">
            {top.map((entry) => (
              <li key={entry.code}>
                {findError(entry.code)?.name ?? "Risposte non classificate"} <span class="muted-inline">× {entry.count}</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" class="button" onClick={() => open({ kind: "diary" })}>
          Apri il diario
        </button>
      </div>

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
            Domande lampo: <strong>{log.filter((attempt) => attempt.context === "lampo").length}</strong>
          </li>
          {proofs.length > 0 && (
            <li>
              Dimostrazioni provate: <strong>{proofs.length}</strong>, giuste <strong>{proofs.filter((attempt) => attempt.outcome === "correct").length}</strong>
            </li>
          )}
        </ul>
      </div>

      <SettingsCard />
      <BackupCard />

      <div class="card">
        <span class="card-title">Dati</span>
        {dataProblem.value ? (
          <p class="answer-problem">{dataProblem.value}</p>
        ) : (
          <p class="card-text">
            {store ? `Salvati ${STORE_NAMES[store.kind]}. Versione dei dati: ${store.version}.` : "Apertura dei dati in corso…"} Tentativi nel registro: {log.length}.
          </p>
        )}
      </div>
    </section>
  );
}

// ───────────────────────────── impostazioni ─────────────────────────────

const THEMES: readonly { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Come il telefono" },
  { value: "light", label: "Chiaro" },
  { value: "dark", label: "Scuro" },
];

function SettingsCard() {
  const current = settings.value;
  return (
    <div class="card">
      <span class="card-title">Impostazioni</span>
      <span class="field-label">Binari attivi</span>
      <p class="muted">Con più binari, la lezione nuova di Oggi li alterna giorno per giorno.</p>
      {programme.map((volume) => {
        const active = current.tracks.includes(volume.code);
        const only = active && current.tracks.length === 1;
        return (
          <label key={volume.code} class="check-row">
            <input
              type="checkbox"
              checked={active}
              disabled={only}
              onChange={(event) => {
                const on = (event.target as HTMLInputElement).checked;
                const tracks = TRACKS.filter((track) => (track === volume.code ? on : current.tracks.includes(track)));
                if (tracks.length > 0) saveSettings({ ...current, tracks });
              }}
            />
            <span>
              {volume.title} {only && <span class="muted-inline">(almeno un binario resta attivo)</span>}
            </span>
          </label>
        );
      })}
      <span class="field-label">Tema</span>
      <Choice options={THEMES} value={current.theme} onChange={(theme) => saveSettings({ ...current, theme })} label="Tema" />
      <span class="field-label">Durata proposta per Oggi</span>
      <Choice options={SESSION_MINUTES.map((m) => ({ value: m, label: `${m} min` }))} value={current.defaultMinutes} onChange={(defaultMinutes) => saveSettings({ ...current, defaultMinutes })} label="Durata proposta" />
    </div>
  );
}

// ───────────────────────────── backup ─────────────────────────────

/** Scarica un file di testo (funziona anche nel file unico aperto con doppio clic). */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
};

function BackupCard() {
  const info = backupInfo.value;
  const t = today();
  const completed = Object.values(lessonProgress.value).filter((progress) => progress.completed).length;
  const due = backupDue(info, completed, days.value.length, t);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ data: StoredData; exportedAt: string | null } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const mergeInput = useRef<HTMLInputElement>(null);

  const exportNow = async (share: boolean): Promise<void> => {
    const now = new Date().toISOString();
    const data = await currentData();
    const text = backupFileText({ ...data, backup: { lastAt: now, lessonsAtLast: completed } }, now);
    const name = backupFileName(t);
    if (share) {
      const file = new File([text], name, { type: "application/json" });
      try {
        await navigator.share({ files: [file], title: "Backup di Compasso" });
      } catch {
        setMessage("Condivisione annullata: il backup non è stato salvato.");
        return;
      }
    } else download(name, text);
    saveBackupInfo({ lastAt: now, lessonsAtLast: completed });
    setMessage(`Backup pronto: ${name}. Tienilo in un posto sicuro (File, iCloud, una mail a te stesso).`);
  };

  const readFile = async (input: HTMLInputElement | null): Promise<{ data: StoredData; exportedAt: string | null } | null> => {
    const file = input?.files?.[0];
    if (!file || !input) return null;
    input.value = "";
    const result = readBackupFile(await file.text());
    if (!result.ok) {
      setMessage(result.message);
      return null;
    }
    return { data: result.data, exportedAt: result.exportedAt };
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function" && (() => {
    try {
      return navigator.canShare({ files: [new File(["{}"], "prova.json", { type: "application/json" })] });
    } catch {
      return false;
    }
  })();

  return (
    <div class="card">
      <span class="card-title">Backup</span>
      <p class="card-text">
        {info.lastAt ? `Ultimo backup: ${formatDate(info.lastAt)}.` : "Nessun backup ancora."} I dati stanno solo su questo dispositivo: il backup è la rete di sicurezza.
      </p>
      {due && (
        <p class="notice-title" role="status">
          È ora di fare un backup.
        </p>
      )}
      <div class="exercise-actions">
        <button type="button" class="button button-primary" onClick={() => void exportNow(false)}>
          Esporta
        </button>
        {canShare && (
          <button type="button" class="button" onClick={() => void exportNow(true)}>
            Condividi il backup
          </button>
        )}
        <button type="button" class="button" onClick={() => importInput.current?.click()}>
          Importa
        </button>
        <button type="button" class="button" onClick={() => mergeInput.current?.click()}>
          Unisci
        </button>
      </div>
      <p class="muted">Importa sostituisce i dati di questo dispositivo con quelli del file. Unisci li somma senza perdere nulla (per due dispositivi).</p>
      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        aria-label="File da importare"
        onChange={async () => {
          const read = await readFile(importInput.current);
          if (read) setPending(read);
        }}
      />
      <input
        ref={mergeInput}
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        aria-label="File da unire"
        onChange={async () => {
          const read = await readFile(mergeInput.current);
          if (!read) return;
          const local = await currentData();
          const merged = mergeData(local, read.data);
          await replaceAllData(merged);
          setMessage(`Dati uniti: ${merged.attempts.length - local.attempts.length} tentativi e ${merged.days.length - local.days.length} giorni di studio in più.`);
        }}
      />
      {pending && (
        <div class="notice" role="alertdialog" aria-label="Conferma dell'importazione">
          <p class="notice-title">Sostituire i dati?</p>
          <p class="card-text">
            Il file {pending.exportedAt ? `è del ${formatDate(pending.exportedAt)} e ` : ""}contiene {pending.data.attempts.length} tentativi e{" "}
            {pending.data.lessons.filter((l) => l.completed).length} lezioni completate. I dati attuali di questo dispositivo verranno sostituiti. Se vuoi tenerli tutti e due, usa «Unisci».
          </p>
          <div class="exercise-actions">
            <button
              type="button"
              class="button button-primary"
              onClick={async () => {
                await replaceAllData({ ...pending.data, session: null });
                setPending(null);
                setMessage("Dati importati.");
              }}
            >
              Sostituisci
            </button>
            <button type="button" class="button" onClick={() => setPending(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}
      {message && (
        <p class="card-text" role="status">
          {message}
        </p>
      )}
      <p class="muted">Versione dei dati di questa app: {DATA_VERSION}.</p>
    </div>
  );
}

// ───────────────────────────── padronanza ─────────────────────────────

export function MasteryScreen() {
  const map = masteries.value;
  return (
    <section class="section">
      <BackButton label="Tu" />
      <header class="lesson-header">
        <h1>Padronanza</h1>
        <p class="muted">Quattro livelli: {MASTERY_LEVELS.map((level) => MASTERY_LABELS[level]).join(", ")}. Contano gli esercizi recenti, la difficoltà e gli indizi usati; le domande lampo no.</p>
      </header>
      {programme.map((volume) => (
        <div key={volume.code}>
          <GroupTitle>{volume.title}</GroupTitle>
          {volume.modules.map((module) => (
            <ModuleMastery key={module.code} code={module.code} />
          ))}
        </div>
      ))}
      <p class="muted">{[...map.values()].length} abilità toccate finora.</p>
    </section>
  );
}

function ModuleMastery({ code }: { code: ModuleCode }) {
  const module = findModule(code);
  const map = masteries.value;
  if (!module) return null;
  return (
    <details class="card">
      <summary class="row-between">
        <span>
          <span class="eyebrow">{code}</span> {module.title}
        </span>
        <MasteryBadge level={groupLevel(skillsOfModule(code), map)} />
      </summary>
      {module.lessons.map((lesson) => (
        <div key={lesson.code}>
          <p class="field-label row-between">
            <span>{lessonTitle(lesson.code)}</span>
            <MasteryBadge level={groupLevel(lesson.skills.map((s) => s.code), map)} />
          </p>
          {lesson.skills.map((skill) => (
            <SkillRow key={skill.code} skill={skill.code} />
          ))}
        </div>
      ))}
    </details>
  );
}

function SkillRow({ skill }: { skill: SkillCode }) {
  const generator = generatorOfSkill(skill);
  const mastery = masteries.value.get(skill);
  return (
    <div class="row-between skill-row">
      <span class="card-text">
        {skillText(skill) ?? skill}
        {mastery?.due && <span class="muted-inline"> · ripasso dal {mastery.due.split("-").reverse().join("/")}</span>}
      </span>
      <span class="row-between">
        <MasteryBadge level={masteryOf(masteries.value, skill)} />
        {generator && (
          <button type="button" class="button" onClick={() => open({ kind: "practice", plan: skillPlan(skill, generator.code, generator.title), key: `${skill}-${Date.now()}` })}>
            Allenati
          </button>
        )}
      </span>
    </div>
  );
}

// ───────────────────────────── diario ─────────────────────────────

const VIEWS: readonly { id: DiaryView; label: string }[] = [
  { id: "concetto", label: "Concetto" },
  { id: "forma", label: "Forma" },
  { id: "distrazione", label: "Distrazioni" },
];

export function DiaryScreen() {
  const [view, setView] = useState<DiaryView>("concetto");
  const entries = diaryEntries(attempts.value, new Date(), view);
  const categories = diaryCategories(entries);
  return (
    <section class="section">
      <BackButton label="Tu" />
      <header class="lesson-header">
        <h1>Diario degli errori</h1>
        <p class="muted">Gli errori recenti pesano di più (il peso si dimezza ogni 30 giorni). L'andamento confronta gli ultimi 30 giorni con i 30 precedenti.</p>
      </header>
      <Tabs tabs={VIEWS} current={view} onChange={setView} label="Tipo di errore" />
      {entries.length === 0 ? (
        <p class="muted">Nessun errore in questa vista.</p>
      ) : (
        <>
          <GroupTitle>Per categoria</GroupTitle>
          <div class="list">
            {categories.map((category) => (
              <div key={category.category} class="list-row">
                <span>{errorCategories[category.category as ErrorCategory] ?? "Non classificati"}</span>
                <span class="muted-inline">
                  × {category.count} · {TREND_LABELS[category.trend]}
                </span>
              </div>
            ))}
          </div>
          <GroupTitle>Errori</GroupTitle>
          {entries.map((entry) => (
            <DiaryCard key={entry.code} entry={entry} />
          ))}
        </>
      )}
    </section>
  );
}

function DiaryCard({ entry }: { entry: DiaryEntry }) {
  const error = findError(entry.code);
  const trainers = generators.filter((g) => g.errors.includes(entry.code as (typeof g.errors)[number]));
  const reference = error?.reference ?? "";
  const lessonRef = isWritten(reference) ? reference : null;
  const moduleRef = findModule(reference) ? reference : null;
  return (
    <div class="card">
      <span class="eyebrow">
        {error ? `${errorCategories[error.category]} · ${error.code}` : "Non classificato"}
      </span>
      <span class="card-title">{error?.name ?? "Risposte sbagliate non riconosciute"}</span>
      <span class="card-text">
        {entry.count} volte · ultimi 30 giorni {entry.last30}, i 30 prima {entry.previous30} · {TREND_LABELS[entry.trend]}
      </span>
      {error && (
        <details>
          <summary>Perché è sbagliato</summary>
          <RichText text={error.explanation} />
          <RichText text={`Esempio: ${error.example}`} class="muted" />
        </details>
      )}
      <div class="exercise-actions">
        {trainers.length > 0 && (
          <button
            type="button"
            class="button button-primary"
            onClick={() => {
              const generator = trainers[Math.floor(Math.random() * trainers.length)];
              if (generator) open({ kind: "practice", plan: { ...skillPlan(generator.skill, generator.code, `Allenati: ${error?.name ?? entry.code}`), lesson: null }, key: `${entry.code}-${Date.now()}` });
            }}
          >
            Allenati su questo
          </button>
        )}
        {lessonRef && (
          <button type="button" class="button" onClick={() => open({ kind: "lesson", code: lessonRef }, "teoria")}>
            Rivedi la lezione
          </button>
        )}
        {!lessonRef && moduleRef && (
          <button type="button" class="button" onClick={() => open({ kind: "module", code: moduleRef as ModuleCode }, "teoria")}>
            Rivedi il modulo
          </button>
        )}
      </div>
    </div>
  );
}


// ───────────────────────────── Test ─────────────────────────────

export function Test() {
  return (
    <section class="section" aria-labelledby="section-title">
      <h1 id="section-title">Test</h1>
      <div class="card card-coming">
        <span class="eyebrow">In arrivo</span>
        <span class="card-title">Simulazione del TOL</span>
        <span class="card-text">25 quesiti di logica, matematica e statistica in 65 minuti, con il punteggio vero (+1, −0,25, 0) e l'analisi della penalità.</span>
      </div>
      <div class="card card-coming">
        <span class="eyebrow">In arrivo</span>
        <span class="card-title">Mini-test di modulo</span>
        <span class="card-text">10 quesiti sulle abilità di un modulo, con il timer facoltativo.</span>
      </div>
      <div class="card card-coming">
        <span class="eyebrow">In arrivo</span>
        <span class="card-title">Storico dei punteggi</span>
        <span class="card-text">L'andamento delle simulazioni nel tempo, totale e per area.</span>
      </div>
      <p class="muted">Ogni tanto fai anche la Demo TOL ufficiale e gli esercizi del Politest: confrontarsi con i quesiti veri resta utile.</p>
    </section>
  );
}
