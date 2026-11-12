import { useState } from "preact/hooks";
import { KEYBOARD, KEYBOARD_LEVELS, type Key, type KeyboardLevel } from "../risposta/keys";

interface MathKeyboardProps {
  /** Il livello aperto all'inizio: dipende dal tipo di risposta. */
  initialLevel: KeyboardLevel;
  onKey: (key: Key) => void;
}

/** La tastiera matematica: una riga di livelli e una griglia di tasti. Non toglie il cursore dal campo. */
export function MathKeyboard({ initialLevel, onKey }: MathKeyboardProps) {
  const [level, setLevel] = useState<KeyboardLevel>(initialLevel);
  // Toccare un tasto non deve togliere il fuoco al campo in cui si sta scrivendo.
  const keepFocus = (event: Event): void => event.preventDefault();
  return (
    <div class="keyboard" aria-label="Tastiera matematica">
      <div class="keyboard-levels" role="tablist" aria-label="Livelli della tastiera">
        {KEYBOARD_LEVELS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === level}
            class={id === level ? "keyboard-level keyboard-level-active" : "keyboard-level"}
            onPointerDown={keepFocus}
            onClick={() => setLevel(id)}
          >
            {KEYBOARD[id].label}
          </button>
        ))}
      </div>
      <div class="keyboard-keys">
        {KEYBOARD[level].keys.map((key) => (
          <button
            key={key.label}
            type="button"
            class={key.service ? "key key-service" : "key"}
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
