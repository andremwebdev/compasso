// Pezzi comuni delle visualizzazioni: il riquadro, il messaggio per i parametri sbagliati, il
// cursore con il suo valore, le maniglie da trascinare col dito (eventi pointer, aggiornamento dentro
// requestAnimationFrame). Le visualizzazioni nuove li riusano invece di riscriverli.

import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { RichText } from "../app/componenti/RichText";
import { GRAPH_HEIGHT, GRAPH_WIDTH } from "../motore/display";

/** Il riquadro di una visualizzazione nella lezione. */
export function VisualizationBox({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <figure class="box box-figure vis">
      <p class="box-label">
        Visualizzazione<span class="box-title"> · {title}</span>
      </p>
      {children}
    </figure>
  );
}

/** Il messaggio quando i parametri della lezione sono sbagliati: la lezione continua. */
export function VisualizationProblem({ messages }: { messages: readonly string[] }) {
  return (
    <div class="figura-problema" role="alert">
      <p>
        <strong>Problema:</strong> la visualizzazione non si può mostrare.
      </p>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            <RichText text={message} untrusted />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Il valore mostrato accanto al nome (testo ricco: formule tra $...$). */
  valueText: string;
  onInput: (value: number) => void;
}

/** Un cursore con nome e valore: ogni cosa che si trascina si può muovere anche da qui. */
export function Slider({ label, min, max, step, value, valueText, onInput }: SliderProps) {
  return (
    <label class="vis-cursore">
      <span class="vis-cursore-testa">
        <span class="vis-cursore-nome">{label}</span>
        <RichText text={valueText} inline class="vis-cursore-valore" />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText.replaceAll("$", "")}
        onInput={(event) => onInput(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>
  );
}

/** Un fotogramma: requestAnimationFrame dove c'è (sempre nei browser), altrimenti un attimo dopo. */
const nextFrame = (callback: () => void): number =>
  typeof requestAnimationFrame === "function" ? requestAnimationFrame(callback) : (setTimeout(callback, 16) as unknown as number);
const cancelFrame = (handle: number): void => {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
  else clearTimeout(handle);
};

/** Un punto nelle coordinate del disegno (viewBox GRAPH_WIDTH × GRAPH_HEIGHT). */
export interface DrawingPoint {
  readonly x: number;
  readonly y: number;
}

/** Da coordinate dello schermo a coordinate del disegno, con il rettangolo dell'SVG. */
export function toDrawing(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): DrawingPoint {
  return {
    x: rect.width > 0 ? ((clientX - rect.left) / rect.width) * GRAPH_WIDTH : 0,
    y: rect.height > 0 ? ((clientY - rect.top) / rect.height) * GRAPH_HEIGHT : 0,
  };
}

/**
 * Le proprietà di una maniglia da trascinare (un elemento dentro l'SVG). `onDrag` riceve il punto nel
 * disegno, al più una volta per fotogramma. La maniglia cattura il puntatore: il dito può uscire
 * dall'area senza perderla.
 */
export function useDragHandle(onDrag: (point: DrawingPoint) => void) {
  const latest = useRef(onDrag);
  latest.current = onDrag;
  const pending = useRef<DrawingPoint | null>(null);
  const frame = useRef(0);
  const active = useRef<number | null>(null);
  useEffect(() => () => cancelFrame(frame.current), []);

  const schedule = (event: PointerEvent): void => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    pending.current = toDrawing(event.clientX, event.clientY, svg.getBoundingClientRect());
    if (frame.current) return;
    frame.current = nextFrame(() => {
      frame.current = 0;
      if (pending.current) latest.current(pending.current);
    });
  };

  return {
    // Sul telefono il dito sulla maniglia trascina, non scorre la pagina (touch-action nel CSS non
    // basta sugli elementi SVG in tutti i browser).
    onTouchStart: (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    },
    onPointerDown: (event: PointerEvent) => {
      active.current = event.pointerId;
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
      event.preventDefault();
      schedule(event);
    },
    onPointerMove: (event: PointerEvent) => {
      if (active.current === event.pointerId) schedule(event);
    },
    onPointerUp: (event: PointerEvent) => {
      if (active.current === event.pointerId) active.current = null;
    },
    onPointerCancel: () => {
      active.current = null;
    },
  };
}

/** Un numero per gli attributi SVG, con un decimale. */
export const svgNumber = (value: number): string => String(Math.round(value * 10) / 10);

/** Il tratto SVG di una spezzata in coordinate del disegno. */
export function pathOf(segments: readonly (readonly (readonly [number, number])[])[], sx: (x: number) => number, sy: (y: number) => number): string {
  return segments.map((segment) => segment.map(([x, y], k) => `${k === 0 ? "M" : "L"}${svgNumber(sx(x))} ${svgNumber(sy(y))}`).join("")).join("");
}
