import { useRef, useState } from "preact/hooks";
import { pressKey, type Key, type KeyboardLevel } from "../risposta/keys";
import { previewText, type FieldKind, type Preview } from "../risposta/preview";
import { renderMath } from "../testo/render";
import { MathKeyboard } from "./MathKeyboard";

interface AnswerEditorProps {
  /** Che cosa si scrive in ogni casella. */
  field: FieldKind;
  /** Il testo delle caselle, per righe. Una risposta normale è una griglia 1×1. */
  cells: readonly (readonly string[])[];
  /** Etichette delle righe (per i vettori soluzione: x, y, z). */
  rowLabels?: readonly string[] | undefined;
  onChange: (cells: string[][]) => void;
  /** Invio sulla tastiera del computer. */
  onConfirm: () => void;
  /** Messaggio da mostrare sotto il campo dopo un «Conferma» non riuscito. */
  problem: string | null;
  /** Quello che sta tra l'anteprima e la tastiera: indizi e pulsanti, che devono restare a portata di dito. */
  children?: preact.ComponentChildren;
}

/** Il campo (o la griglia di caselle) in cui si scrive la risposta, con l'anteprima e la tastiera matematica. */
export function AnswerEditor({ field, cells, rowLabels, onChange, onConfirm, problem, children }: AnswerEditorProps) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const [active, setActive] = useState("0-0");
  const single = cells.length === 1 && cells[0]?.length === 1;

  const setCell = (row: number, col: number, text: string): void => onChange(cells.map((line, r) => line.map((value, c) => (r === row && c === col ? text : value))));

  // Un tasto della tastiera matematica scrive nella casella attiva, dove sta il cursore.
  const onKey = (key: Key): void => {
    const input = inputs.current.get(active) ?? inputs.current.get("0-0");
    if (!input) return;
    const [row = 0, col = 0] = (inputs.current.has(active) ? active : "0-0").split("-").map(Number);
    const next = pressKey({ text: input.value, start: input.selectionStart ?? input.value.length, end: input.selectionEnd ?? input.value.length }, key);
    input.value = next.text;
    input.setSelectionRange(next.start, next.end);
    setCell(row, col, next.text);
  };

  const preview: Preview = single ? previewText(field, cells[0]?.[0] ?? "") : { kind: "empty" };
  const level: KeyboardLevel = field.kind === "set" ? "insiemi" : "base";

  return (
    <div class="answer-editor">
      <div class={single ? "answer-fields" : "answer-fields answer-grid"} style={single ? undefined : { gridTemplateColumns: `${rowLabels ? "auto " : ""}repeat(${cells[0]?.length ?? 1}, minmax(3.5rem, 6rem))` }}>
        {cells.map((line, row) => (
          <>
            {!single && rowLabels && <span class="answer-row-label" dangerouslySetInnerHTML={{ __html: renderMath(`${rowLabels[row] ?? ""} =`) }} />}
            {line.map((value, col) => {
              const id = `${row}-${col}`;
              return (
                <input
                  key={id}
                  ref={(element) => {
                    if (element) inputs.current.set(id, element);
                    else inputs.current.delete(id);
                  }}
                  class="answer-input"
                  type="text"
                  // La tastiera del telefono non serve: si scrive con quella matematica qui sotto.
                  inputMode="none"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck={false}
                  aria-label={single ? "La tua risposta" : `Casella ${rowLabels?.[row] ?? `riga ${row + 1}, colonna ${col + 1}`}`}
                  value={value}
                  onFocus={() => setActive(id)}
                  onInput={(event) => setCell(row, col, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onConfirm();
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      {single && <PreviewLine preview={preview} />}
      {problem && (
        <p class="answer-problem" role="alert">
          {problem}
        </p>
      )}
      {children}
      <MathKeyboard initialLevel={level} onKey={onKey} />
    </div>
  );
}

/** L'anteprima: quello che l'app ha capito del testo scritto, disegnato come formula. */
function PreviewLine({ preview }: { preview: Preview }) {
  switch (preview.kind) {
    case "empty":
      return <p class="preview preview-empty">Qui vedrai la risposta mentre la scrivi.</p>;
    case "typing":
      return <p class="preview preview-empty">Continua a scrivere…</p>;
    case "error":
      return <p class="preview preview-error">{preview.message}</p>;
    case "ok":
      return (
        <p class={preview.complete ? "preview" : "preview preview-partial"} aria-live="polite">
          <span class="preview-label">{preview.complete ? "Anteprima" : "Da completare"}</span>
          <span class="preview-formula" dangerouslySetInnerHTML={{ __html: renderMath(preview.latex) }} />
        </p>
      );
  }
}
