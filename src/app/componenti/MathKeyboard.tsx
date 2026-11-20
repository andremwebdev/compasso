import { useState } from "preact/hooks";
import { KEYBOARD, type Key, type KeyboardLevel } from "../risposta/keys";

interface MathKeyboardProps {
  /** Le linguette da mostrare, nell'ordine. */
  levels: readonly KeyboardLevel[];
  /** Il livello aperto all'inizio: dipende dal tipo di risposta. */
  initialLevel: KeyboardLevel;
  onKey: (key: Key) => void;
}

/** La tastiera matematica: una riga di livelli e una griglia di tasti. Non toglie il cursore dal campo. */
export function MathKeyboard({ levels, initialLevel, onKey }: MathKeyboardProps) {
  const [chosen, setLevel] = useState<KeyboardLevel>(initialLevel);
  const level = levels.includes(chosen) ? chosen : (levels[0] ?? "base");
  const def = KEYBOARD[level];
  // Toccare un tasto non deve togliere il fuoco al campo in cui si sta scrivendo.
  const keepFocus = (event: Event): void => event.preventDefault();
  return (
    <div class="keyboard" aria-label="Tastiera matematica">
      <div class="keyboard-levels" role="tablist" aria-label="Livelli della tastiera">
        {levels.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === level}
            aria-label={KEYBOARD[id].name}
            class={id === level ? "keyboard-level keyboard-level-active" : "keyboard-level"}
            onPointerDown={keepFocus}
            onClick={() => setLevel(id)}
          >
            {KEYBOARD[id].label}
          </button>
        ))}
      </div>
      <div class="keyboard-keys" role="tabpanel" aria-label={def.name} style={{ gridTemplateColumns: `repeat(${def.columns}, 1fr)` }}>
        {def.keys.map((key) => (
          <button
            key={key.label}
            type="button"
            class={["key", key.service && "key-service", key.word && "key-word"].filter(Boolean).join(" ")}
            style={key.span ? { gridColumn: `span ${key.span}` } : undefined}
            aria-label={key.name}
            onPointerDown={keepFocus}
            onClick={() => onKey(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
