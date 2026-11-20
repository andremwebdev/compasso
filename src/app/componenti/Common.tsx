// Piccoli componenti comuni alle schermate: pulsante «indietro», livello di padronanza, schede.

import type { ComponentChildren } from "preact";
import { MASTERY_LABELS, MASTERY_LEVELS, type MasteryLevel } from "../../dati";
import { goBack, type Screen } from "../state";

/** Il pulsante in alto per tornare indietro (come il tasto «indietro» del telefono). */
export function BackButton({ label, fallback }: { label: string; fallback?: Screen }) {
  return (
    <button type="button" class="back" onClick={() => goBack(fallback)}>
      <span aria-hidden="true">‹</span> {label}
    </button>
  );
}

/** Il livello di padronanza: quattro tacche e la parola (mai solo il colore). */
export function MasteryBadge({ level }: { level: MasteryLevel }) {
  const index = MASTERY_LEVELS.indexOf(level);
  return (
    <span class={`mastery mastery-${level}`}>
      <span class="mastery-marks" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} class={n <= index ? "mastery-mark mastery-mark-on" : "mastery-mark"} />
        ))}
      </span>
      {MASTERY_LABELS[level]}
    </span>
  );
}

/** Schede orizzontali dentro una sezione (Esercizi, Flashcard, Dimostrazioni…). */
export function Tabs<T extends string>({ tabs, current, onChange, label }: { tabs: readonly { id: T; label: string }[]; current: T; onChange: (id: T) => void; label: string }) {
  return (
    <div class="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={tab.id === current} class={tab.id === current ? "tabs-item tabs-item-active" : "tabs-item"} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Un gruppo di scelte a pulsanti, una sola attiva (durata, difficoltà, quantità). */
export function Choice<T extends string | number>({ options, value, onChange, label }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div class="choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={String(option.value)} type="button" role="radio" aria-checked={option.value === value} class={option.value === value ? "choice-item choice-item-active" : "choice-item"} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Un titoletto di gruppo dentro una pagina. */
export const GroupTitle = ({ children }: { children: ComponentChildren }) => <h2 class="group-title">{children}</h2>;
