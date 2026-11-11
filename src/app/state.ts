import { signal } from "@preact/signals";
import type { SectionId } from "./sections";

/** Sezione attualmente aperta. All'avvio si parte sempre da "Oggi". */
export const currentSection = signal<SectionId>("oggi");
