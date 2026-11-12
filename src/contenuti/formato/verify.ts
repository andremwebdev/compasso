// Verifica automatica dei contenuti (specifica, sezione 12): i controlli tra un file e l'altro.
// parseLesson controlla una lezione alla volta; qui si guarda l'insieme: codici unici, prerequisiti
// esistenti e senza giri, rimandi a glossario, lezioni, definizioni, teoremi, errori, generatori e
// visualizzazioni che puntano a qualcosa che esiste, ogni termine del glossario definito una volta sola.

import { isErrorCode } from "../../errori";
import type { Lesson } from "./lesson";
import { lessonReferences, parseLesson } from "./parse";

/** Un file di lezione: il percorso (per i messaggi e per controllare che corrisponda al codice) e il testo. */
export interface ContentFile {
  readonly path: string;
  readonly text: string;
}

/** Quello che esiste fuori dalle lezioni e a cui le lezioni possono rimandare. */
export interface ContentCatalog {
  /** I generatori esistenti, con i livelli che supportano: { "V1.M06.A04.g1": [1, 2, 3] }. */
  readonly generators: Readonly<Record<string, readonly number[]>>;
  /** I codici delle visualizzazioni esistenti. */
  readonly visualizations: readonly string[];
}

export interface ContentProblem {
  readonly path: string;
  /** Riga del file; 0 se il problema riguarda il file intero. */
  readonly line: number;
  readonly message: string;
}

/** Una voce del glossario ricavata dalle lezioni. */
export interface GlossaryEntry {
  readonly term: string;
  readonly name: string;
  readonly definition: string;
  /** La lezione in cui il termine nasce. */
  readonly lesson: string;
}

export interface ContentReport {
  /** Lezioni lette senza problemi di intestazione. */
  readonly lessons: number;
  /** I problemi trovati. I contenuti sono validi solo se l'elenco è vuoto. */
  readonly problems: readonly ContentProblem[];
  /** Cose da guardare che non bloccano: per esempio un termine usato fuori dalla catena dei prerequisiti. */
  readonly warnings: readonly ContentProblem[];
  /** Il glossario ricavato dalle lezioni, in ordine alfabetico. */
  readonly glossary: readonly GlossaryEntry[];
  readonly ok: boolean;
}

interface Entry {
  readonly path: string;
  readonly lesson: Lesson;
}

/** Dove sta di casa una lezione: V1.M06.L04 → v1/m06/l04.md. */
export function lessonPath(code: string): string {
  return `${code.toLowerCase().split(".").join("/")}.md`;
}

/** Verifica un insieme di lezioni contro il catalogo di generatori e visualizzazioni. */
export function verifyContents(files: readonly ContentFile[], catalog: ContentCatalog): ContentReport {
  const problems: ContentProblem[] = [];
  const warnings: ContentProblem[] = [];
  const entries: Entry[] = [];

  // 1. Ogni lezione da sola: intestazione, blocchi, formule (parseLesson).
  for (const file of files) {
    const { lesson, problems: found } = parseLesson(file.text);
    for (const problem of found) problems.push({ path: file.path, line: problem.line, message: problem.message });
    if (!lesson) continue;
    entries.push({ path: file.path, lesson });
    const expected = lessonPath(lesson.meta.code);
    if (!file.path.replaceAll("\\", "/").toLowerCase().endsWith(expected)) {
      problems.push({ path: file.path, line: 1, message: `La lezione ${lesson.meta.code} deve stare nel file ${expected}.` });
    }
  }

  // 2. Codici unici in tutto il progetto: lezioni, definizioni, teoremi, flashcard, abilità.
  const owners = new Map<string, { path: string; line: number }>();
  const claim = (code: string, what: string, path: string, line: number): void => {
    const owner = owners.get(code);
    if (owner) problems.push({ path, line, message: `${what} ${code} esiste già in ${owner.path}${owner.line > 0 ? ` (riga ${owner.line})` : ""}: i codici sono unici.` });
    else owners.set(code, { path, line });
  };
  for (const { path, lesson } of entries) {
    claim(lesson.meta.code, "La lezione", path, 1);
    for (const skill of lesson.meta.skills) claim(skill, "L'abilità", path, 1);
    for (const block of lesson.blocks) {
      if (block.kind === "definition") claim(block.id, "La definizione", path, block.line);
      if (block.kind === "theorem") claim(block.id, "Il teorema", path, block.line);
      if (block.kind === "flashcard") claim(block.id, "La flashcard", path, block.line);
    }
  }

  // 3. Glossario: ogni termine è definito in una sola lezione.
  const lessons = new Map<string, Entry>();
  for (const entry of entries) if (!lessons.has(entry.lesson.meta.code)) lessons.set(entry.lesson.meta.code, entry);
  const termOwner = new Map<string, string>();
  const glossary: GlossaryEntry[] = [];
  for (const { path, lesson } of entries) {
    for (const term of lesson.meta.terms) {
      const owner = termOwner.get(term);
      if (owner && owner !== lesson.meta.code) {
        problems.push({ path, line: 1, message: `Il termine «${term}» è già definito nella lezione ${owner}: un termine si definisce una volta sola, altrove si rimanda con [[${term}]].` });
        continue;
      }
      termOwner.set(term, lesson.meta.code);
      for (const block of lesson.blocks) {
        const defines = (block.kind === "definition" || block.kind === "glossary") && block.term === term;
        if (defines) glossary.push({ term, name: block.name, definition: block.body.trim(), lesson: lesson.meta.code });
      }
    }
  }

  // 4. Prerequisiti: esistono e non fanno giri (che una lezione non sia prerequisito di se stessa lo controlla parseLesson).
  for (const { path, lesson } of entries) {
    for (const prerequisite of lesson.meta.prerequisites) {
      if (prerequisite !== lesson.meta.code && !lessons.has(prerequisite)) problems.push({ path, line: 1, message: `Il prerequisito ${prerequisite} non esiste.` });
    }
  }
  /** Tutte le lezioni che vengono prima lungo i prerequisiti; null se si torna al punto di partenza. */
  const ancestors = (start: string): Set<string> | null => {
    const seen = new Set<string>();
    const queue = [...(lessons.get(start)?.lesson.meta.prerequisites ?? [])];
    while (queue.length > 0) {
      const code = queue.pop() as string;
      if (code === start) return null;
      if (seen.has(code)) continue;
      seen.add(code);
      queue.push(...(lessons.get(code)?.lesson.meta.prerequisites ?? []));
    }
    return seen;
  };
  const before = new Map<string, Set<string>>();
  for (const [code, { path, lesson }] of lessons) {
    const found = ancestors(code);
    if (found) before.set(code, found);
    // Una lezione prerequisito di se stessa l'ha già segnalata parseLesson.
    else if (!(lesson.meta.prerequisites as readonly string[]).includes(code)) problems.push({ path, line: 1, message: `I prerequisiti di ${code} fanno un giro: seguendoli si torna a ${code}.` });
  }

  // 5. Rimandi: tutto ciò a cui una lezione punta deve esistere.
  const visualizations = new Set(catalog.visualizations);
  for (const { path, lesson } of entries) {
    const references = lessonReferences(lesson);
    const code = lesson.meta.code;
    for (const term of references.terms) {
      const owner = termOwner.get(term);
      if (!owner) {
        problems.push({ path, line: 0, message: `Il rimando [[${term}]] punta a un termine che nessuna lezione definisce.` });
      } else if (owner !== code && before.has(code) && !before.get(code)?.has(owner)) {
        warnings.push({ path, line: 0, message: `Il termine «${term}» è definito in ${owner}, che non è tra i prerequisiti di ${code}: chi arriva qui potrebbe non averlo ancora incontrato.` });
      }
    }
    for (const target of references.lessons) {
      // Un prerequisito che non esiste è già stato segnalato sopra.
      if (!lessons.has(target) && !(lesson.meta.prerequisites as readonly string[]).includes(target)) problems.push({ path, line: 0, message: `Il rimando [[${target}]] punta a una lezione che non esiste.` });
    }
    for (const target of references.definitions) {
      if (!owners.has(target)) problems.push({ path, line: 0, message: `Il rimando [[${target}]] punta a una definizione che non esiste.` });
    }
    for (const target of references.theorems) {
      if (!owners.has(target)) problems.push({ path, line: 0, message: `Il rimando a ${target} punta a un teorema che non esiste.` });
    }
    for (const error of references.errors) {
      if (!isErrorCode(error)) problems.push({ path, line: 0, message: `Il codice di errore ${error} non esiste nel catalogo.` });
    }
    for (const visualization of references.visualizations) {
      if (!visualizations.has(visualization)) problems.push({ path, line: 0, message: `La visualizzazione ${visualization} non esiste.` });
    }
    for (const block of lesson.blocks) {
      if (block.kind !== "question" || block.source.type !== "generator") continue;
      const levels = catalog.generators[block.source.generator];
      if (!levels) problems.push({ path, line: block.line, message: `Il generatore ${block.source.generator} non esiste.` });
      else if (!levels.includes(block.source.level)) {
        problems.push({ path, line: block.line, message: `Il generatore ${block.source.generator} non ha il livello ${block.source.level} (ha: ${levels.join(", ")}).` });
      }
    }
  }

  glossary.sort((a, b) => a.term.localeCompare(b.term, "it"));
  return { lessons: entries.length, problems, warnings, glossary, ok: problems.length === 0 };
}

/** Il rapporto in italiano, da mostrare quando un test fallisce. */
export function formatContentReport(report: ContentReport): string {
  const line = (item: ContentProblem): string => `  ${item.path}${item.line > 0 ? `:${item.line}` : ""} — ${item.message}`;
  return [
    `Verifica dei contenuti: ${report.lessons} lezioni, ${report.glossary.length} termini del glossario.`,
    report.ok ? "Nessun problema." : `Problemi trovati: ${report.problems.length}.`,
    ...report.problems.map(line),
    ...report.warnings.map((item) => `  Avviso: ${line(item).trim()}`),
  ].join("\n");
}
