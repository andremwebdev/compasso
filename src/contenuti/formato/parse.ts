// Lettura e controllo di un file di lezione. La sintassi è descritta in REGOLE.md.
//
// Questo modulo conosce solo la struttura di Compasso: intestazione, blocchi speciali (:::nome{...}),
// sezioni interne (::nome), rimandi. Il Markdown normale dentro i testi non viene interpretato qui.
// Controlla una lezione alla volta; i controlli tra file (codici unici, prerequisiti e rimandi che
// esistono) sono della verifica dei contenuti, che parte da lessonReferences.

import {
  isDefinitionCode, isFlashcardCode, isGeneratorCode, isGlossaryTerm, isLessonCode, isSkillCode, isTheoremCode,
  isVisualizationCode, moduleOf, type LessonCode,
} from "../../codici";
import { isErrorCode, type ErrorCode } from "../../errori";
import { splitInline, unbalancedMath } from "./inline";
import {
  blockNames, type Lesson, type LessonBlock, type LessonMeta, type LessonProblem, type ProofStep, type QuestionOption, type RichText,
} from "./lesson";

export interface LessonParseResult {
  /** La lezione letta; null se l'intestazione non è utilizzabile. */
  readonly lesson: Lesson | null;
  /** I problemi trovati. Una lezione è valida solo se l'elenco è vuoto. */
  readonly problems: readonly LessonProblem[];
}

type Attributes = Map<string, string | true>;

interface Section {
  readonly name: string;
  readonly attrs: Attributes;
  readonly line: number;
  readonly lines: string[];
}

interface RawBlock {
  readonly name: string;
  readonly attrs: Attributes;
  readonly line: number;
  readonly sections: Section[];
}

const HEADER_KEYS = ["codice", "titolo", "obiettivo", "prerequisiti", "durata", "abilita", "termini"] as const;
const MIN_MINUTES = 10;
const MAX_MINUTES = 20;

const OPEN = /^:::([a-z]+)(\{.*\})?\s*$/;
const CLOSE = /^:::\s*$/;
const SECTION = /^::([a-z]+)(\{.*\})?\s*$/;
const OPTION = /^\s*[-*]\s*\[( |x|X)\]\s*(.+?)(?:\s*\{errore=([^}\s]+)\})?\s*$/;

export function parseLesson(source: string): LessonParseResult {
  const problems: LessonProblem[] = [];
  const report = (line: number, message: string): void => {
    problems.push({ line, message });
  };
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  const header = readHeader(lines, report);
  if (!header) return { lesson: null, problems };
  const { meta, bodyStart } = header;

  const blocks: LessonBlock[] = [];
  for (const raw of readBlocks(lines, bodyStart, report)) {
    const block = buildBlock(raw, meta, report);
    if (block) blocks.push(block);
  }
  checkLesson(meta, blocks, report);
  return { lesson: { meta, blocks }, problems: problems.sort((a, b) => a.line - b.line) };
}

// ───────────────────────────── intestazione ─────────────────────────────

function readHeader(
  lines: readonly string[],
  report: (line: number, message: string) => void,
): { meta: LessonMeta; bodyStart: number } | null {
  if (lines[0]?.trim() !== "---") {
    report(1, "La lezione deve cominciare con l'intestazione, tra due righe «---».");
    return null;
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) {
    report(1, "L'intestazione non è chiusa: manca la seconda riga «---».");
    return null;
  }
  const values = new Map<string, { text: string; line: number }>();
  for (let index = 1; index < end; index++) {
    const line = lines[index] as string;
    if (line.trim() === "") continue;
    const match = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!match) {
      report(index + 1, "Riga dell'intestazione non valida: serve «chiave: valore».");
      continue;
    }
    const [, key = "", text = ""] = match;
    if (!(HEADER_KEYS as readonly string[]).includes(key)) report(index + 1, `Chiave sconosciuta nell'intestazione: «${key}».`);
    else if (values.has(key)) report(index + 1, `La chiave «${key}» è ripetuta.`);
    else values.set(key, { text: text.trim(), line: index + 1 });
  }
  for (const key of HEADER_KEYS) {
    if (!values.has(key)) report(1, `Nell'intestazione manca «${key}».`);
  }

  const text = (key: string): string => values.get(key)?.text ?? "";
  const lineOf = (key: string): number => values.get(key)?.line ?? 1;
  const list = (key: string): string[] => {
    const raw = text(key);
    if (!values.has(key)) return [];
    if (!/^\[.*\]$/.test(raw)) {
      report(lineOf(key), `«${key}» deve essere un elenco tra parentesi quadre, anche vuoto: [].`);
      return [];
    }
    return raw.slice(1, -1).split(",").map((item) => item.trim()).filter((item) => item !== "");
  };
  const checked = <T extends string>(key: string, test: (item: string) => item is T, what: string): T[] =>
    list(key).filter((item): item is T => {
      if (!test(item)) report(lineOf(key), `«${item}» non è ${what}.`);
      return test(item);
    });

  const code = text("codice");
  if (!isLessonCode(code)) {
    if (values.has("codice")) report(lineOf("codice"), `«${code}» non è un codice di lezione (esempio: V1.M06.L04).`);
    return null;
  }
  if (values.has("titolo") && text("titolo") === "") report(lineOf("titolo"), "Il titolo è vuoto.");
  if (values.has("obiettivo") && text("obiettivo") === "") report(lineOf("obiettivo"), "L'obiettivo è vuoto.");
  const minutes = Number(text("durata"));
  if (values.has("durata") && !(Number.isInteger(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES)) {
    report(lineOf("durata"), `La durata deve essere un numero intero di minuti tra ${MIN_MINUTES} e ${MAX_MINUTES}.`);
  }
  const prerequisites = checked("prerequisiti", isLessonCode, "un codice di lezione");
  if (prerequisites.includes(code)) report(lineOf("prerequisiti"), "Una lezione non può essere prerequisito di se stessa.");
  const skills = checked("abilita", isSkillCode, "un codice di abilità (esempio: V1.M06.A04)");
  for (const skill of skills) {
    if (moduleOf(skill) !== moduleOf(code)) report(lineOf("abilita"), `L'abilità ${skill} non è del modulo della lezione.`);
  }
  const terms = checked("termini", isGlossaryTerm, "un termine del glossario (minuscole e trattini: segno-di-una-frazione)");

  return {
    meta: { code, title: text("titolo"), goal: text("obiettivo"), prerequisites, minutes, skills, terms },
    bodyStart: end + 1,
  };
}

// ───────────────────────────── blocchi ─────────────────────────────

function parseAttributes(text: string | undefined, line: number, report: (line: number, message: string) => void): Attributes {
  const attrs: Attributes = new Map();
  if (!text) return attrs;
  let rest = text.slice(1, -1);
  const pattern = /^\s*([a-zA-Z_][a-zA-Z0-9_-]*)(?:=(?:"([^"]*)"|([^\s"]+)))?/;
  for (let match = pattern.exec(rest); match; match = pattern.exec(rest)) {
    const [whole, key = "", quoted, bare] = match;
    if (attrs.has(key)) report(line, `L'attributo «${key}» è ripetuto.`);
    attrs.set(key, quoted ?? bare ?? true);
    rest = rest.slice(whole.length);
  }
  if (rest.trim() !== "") report(line, `Attributi non validi: «${rest.trim()}». Si scrivono così: {chiave=valore altra="valore con spazi"}.`);
  return attrs;
}

/** Divide il corpo della lezione in blocchi speciali e pezzi di testo normale. */
function readBlocks(lines: readonly string[], start: number, report: (line: number, message: string) => void): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  let text: Section | null = null;
  let fenced = false;

  const closeText = (): void => {
    if (text && text.lines.some((line) => line.trim() !== "")) {
      blocks.push({ name: "testo", attrs: new Map(), line: text.line, sections: [text] });
    }
    text = null;
  };

  for (let index = start; index < lines.length; index++) {
    const line = lines[index] as string;
    const number = index + 1;
    // Dentro un blocco di codice (```) niente è speciale.
    if (/^\s*```/.test(line)) fenced = !fenced;
    const open = fenced ? null : OPEN.exec(line);
    const section = fenced ? null : SECTION.exec(line);

    if (open) {
      if (current) report(number, `Il blocco «${current.name}» aperto alla riga ${current.line} non è chiuso: i blocchi non si annidano.`);
      closeText();
      const [, name = "", attrs] = open;
      current = { name, attrs: parseAttributes(attrs, number, report), line: number, sections: [{ name: "", attrs: new Map(), line: number, lines: [] }] };
      blocks.push(current);
    } else if (!fenced && CLOSE.test(line)) {
      if (current) current = null;
      else report(number, "C'è una chiusura «:::» senza un blocco aperto.");
    } else if (section && current) {
      const [, name = "", attrs] = section;
      current.sections.push({ name, attrs: parseAttributes(attrs, number, report), line: number, lines: [] });
    } else if (current) {
      (current.sections[current.sections.length - 1] as Section).lines.push(line);
    } else {
      if (section) report(number, `La sezione «::${section[1]}» ha senso solo dentro un blocco.`);
      text ??= { name: "", attrs: new Map(), line: number, lines: [] };
      text.lines.push(line);
    }
  }
  if (current) report(current.line, `Il blocco «${current.name}» non è chiuso: manca la riga «:::».`);
  closeText();
  return blocks;
}

const bodyOf = (section: Section | undefined): RichText => (section?.lines ?? []).join("\n").trim();

function buildBlock(raw: RawBlock, meta: LessonMeta, report: (line: number, message: string) => void): LessonBlock | null {
  const { line, attrs } = raw;
  const main = raw.sections[0] as Section;
  const body = bodyOf(main);
  if (raw.name === "testo") return { kind: "text", line, body };

  if (!(raw.name in blockNames)) {
    report(line, `Blocco sconosciuto: «${raw.name}». Blocchi disponibili: ${Object.keys(blockNames).join(", ")}.`);
    return null;
  }
  const kind = blockNames[raw.name as keyof typeof blockNames];

  let valid = true;
  const problem = (message: string, at = line): void => {
    valid = false;
    report(at, message);
  };
  const used = new Set<string>();
  /** Legge un attributo di testo; segnala se manca (quando è obbligatorio). */
  const attr = (key: string, required = true): string | undefined => {
    used.add(key);
    const value = attrs.get(key);
    if (typeof value === "string" && value !== "") return value;
    if (required || value !== undefined) problem(`Nel blocco «${raw.name}» manca il valore dell'attributo «${key}».`);
    return undefined;
  };
  const code = <T extends string>(key: string, test: (value: string) => value is T, what: string): T | undefined => {
    const value = attr(key);
    if (value === undefined) return undefined;
    if (!test(value)) {
      problem(`«${value}» non è ${what}.`);
      return undefined;
    }
    return value;
  };
  const inModule = <T extends string>(value: T | undefined): T | undefined => {
    if (value !== undefined && moduleOf(value as LessonCode) !== moduleOf(meta.code)) {
      problem(`Il codice ${value} non appartiene al modulo della lezione (${moduleOf(meta.code)}).`);
    }
    return value;
  };
  const errorCode = (value: string | undefined, at = line): ErrorCode | undefined => {
    if (value === undefined) return undefined;
    if (!isErrorCode(value)) {
      problem(`Il codice di errore «${value}» non esiste nel catalogo.`, at);
      return undefined;
    }
    return value;
  };
  const noSections = (): void => {
    for (const section of raw.sections.slice(1)) problem(`Il blocco «${raw.name}» non ha la sezione «::${section.name}».`, section.line);
  };
  const needBody = (): void => {
    if (body === "") problem(`Il blocco «${raw.name}» è vuoto.`);
  };
  const finish = <B extends LessonBlock>(build: () => B): B | null => {
    for (const key of attrs.keys()) {
      if (!used.has(key)) problem(`Il blocco «${raw.name}» non ha l'attributo «${key}».`);
    }
    return valid ? build() : null;
  };

  switch (kind) {
    case "definition": {
      const id = inModule(code("id", isDefinitionCode, "un codice di definizione (esempio: V1.M06.D02)"));
      const name = attr("nome");
      const term = attrs.has("termine") ? code("termine", isGlossaryTerm, "un termine del glossario") : undefined;
      noSections();
      needBody();
      return finish(() => ({ kind, line, id: id as NonNullable<typeof id>, name: name as string, ...(term ? { term } : {}), body }));
    }
    case "theorem": {
      const id = inModule(code("id", isTheoremCode, "un codice di teorema (esempio: V2.M06.T03)"));
      const name = attr("nome");
      noSections();
      needBody();
      return finish(() => ({ kind, line, id: id as NonNullable<typeof id>, name: name as string, body }));
    }
    case "proof": {
      const of = code("di", isTheoremCode, "un codice di teorema (esempio: V2.M06.T03)");
      const steps = readProofSteps(raw.sections.slice(1), problem);
      return finish(() => ({ kind, line, of: of as NonNullable<typeof of>, intro: body, steps }));
    }
    case "example": {
      const title = attrs.has("titolo") ? attr("titolo") : undefined;
      noSections();
      needBody();
      return finish(() => ({ kind, line, ...(title ? { title } : {}), body }));
    }
    case "warning": {
      const error = errorCode(attr("errore"));
      noSections();
      needBody();
      return finish(() => ({ kind, line, error: error as ErrorCode, body }));
    }
    case "question": {
      if (attrs.has("generatore") || attrs.has("livello")) {
        const generator = code("generatore", isGeneratorCode, "un codice di generatore (esempio: V1.M06.A04.g1)");
        const level = Number(attr("livello"));
        if (![1, 2, 3].includes(level)) problem("Il livello di una domanda deve essere 1, 2 o 3.");
        if (body !== "") problem("Una domanda presa da un generatore non ha testo: il blocco resta vuoto.");
        noSections();
        return finish(() => ({ kind, line, source: { type: "generator", generator: generator as NonNullable<typeof generator>, level: level as 1 | 2 | 3 } }));
      }
      const promptLines: string[] = [];
      const options: QuestionOption[] = [];
      main.lines.forEach((text, offset) => {
        const option = OPTION.exec(text);
        if (option) {
          const error = errorCode(option[3], main.line + 1 + offset);
          options.push({ content: (option[2] as string).trim(), correct: option[1] !== " ", ...(error ? { error } : {}) });
        } else if (options.length === 0) promptLines.push(text);
        else if (text.trim() !== "") problem("Dopo le opzioni di una domanda può esserci solo la sezione «::spiegazione».", main.line + 1 + offset);
      });
      const prompt = promptLines.join("\n").trim();
      if (prompt === "") problem("La domanda non ha il testo.");
      if (options.length < 2) problem("Una domanda scritta a mano ha almeno due opzioni, scritte come «- [ ] testo» e «- [x] testo».");
      if (options.filter((option) => option.correct).length !== 1) problem("Una domanda ha esattamente un'opzione giusta, segnata con [x].");
      if (options.some((option) => option.correct && option.error)) problem("L'opzione giusta non ha un codice di errore.");
      const explanation = raw.sections.find((section) => section.name === "spiegazione");
      for (const section of raw.sections.slice(1)) {
        if (section.name !== "spiegazione") problem(`Il blocco «domanda» non ha la sezione «::${section.name}».`, section.line);
      }
      if (bodyOf(explanation) === "") problem("La domanda non ha la spiegazione (sezione «::spiegazione»).");
      return finish(() => ({ kind, line, source: { type: "manual", prompt, options, explanation: bodyOf(explanation) } }));
    }
    case "visualization": {
      const id = code("id", isVisualizationCode, "un codice di visualizzazione (esempio: VIS.disequazioni-grafico)");
      const params: Record<string, string> = {};
      for (const [key, value] of attrs) {
        if (key === "id") continue;
        used.add(key);
        if (typeof value === "string") params[key] = value;
        else problem(`Il parametro «${key}» della visualizzazione non ha un valore.`);
      }
      if (body !== "") problem("Il blocco «visualizzazione» resta vuoto: i parametri iniziali si scrivono tra le graffe.");
      noSections();
      return finish(() => ({ kind, line, id: id as NonNullable<typeof id>, params }));
    }
    case "flashcard": {
      const id = inModule(code("id", isFlashcardCode, "un codice di flashcard (esempio: V2.M06.F05)"));
      const back = raw.sections.find((section) => section.name === "retro");
      for (const section of raw.sections.slice(1)) {
        if (section.name !== "retro") problem(`Il blocco «flashcard» non ha la sezione «::${section.name}».`, section.line);
      }
      if (body === "") problem("La flashcard non ha il davanti.");
      if (bodyOf(back) === "") problem("La flashcard non ha il dietro (sezione «::retro»).");
      return finish(() => ({ kind, line, id: id as NonNullable<typeof id>, front: body, back: bodyOf(back) }));
    }
    case "glossary": {
      const term = code("termine", isGlossaryTerm, "un termine del glossario");
      const name = attr("nome");
      noSections();
      needBody();
      return finish(() => ({ kind, line, term: term as string, name: name as string, body }));
    }
    case "summary":
      noSections();
      needBody();
      return finish(() => ({ kind, line, body }));
  }
}

/** Legge le sezioni di una dimostrazione: ::passo, ::perche e, facoltative, coppie ::sbagliato / ::motivo. */
function readProofSteps(sections: readonly Section[], problem: (message: string, at?: number) => void): ProofStep[] {
  const steps: { text: RichText; reason: RichText; fixed: boolean; wrong: { text: RichText; reason: RichText }[]; line: number }[] = [];
  let expected: "passo" | "perche" | "dopo-perche" | "motivo" = "passo";
  for (const section of sections) {
    const content = bodyOf(section);
    const last = steps[steps.length - 1];
    if (content === "") problem(`La sezione «::${section.name}» è vuota.`, section.line);
    for (const key of section.attrs.keys()) {
      if (!(section.name === "passo" && key === "fisso")) problem(`La sezione «::${section.name}» non ha l'attributo «${key}».`, section.line);
    }
    if (section.name === "passo" && (expected === "passo" || expected === "dopo-perche")) {
      steps.push({ text: content, reason: "", fixed: section.attrs.has("fisso"), wrong: [], line: section.line });
      expected = "perche";
    } else if (section.name === "perche" && expected === "perche" && last) {
      last.reason = content;
      expected = "dopo-perche";
    } else if (section.name === "sbagliato" && expected === "dopo-perche" && last) {
      last.wrong.push({ text: content, reason: "" });
      expected = "motivo";
    } else if (section.name === "motivo" && expected === "motivo" && last) {
      (last.wrong[last.wrong.length - 1] as { reason: RichText }).reason = content;
      expected = "dopo-perche";
    } else {
      problem(
        `Sezione «::${section.name}» fuori posto. In una dimostrazione l'ordine è: ::passo, ::perche, poi eventuali coppie ::sbagliato e ::motivo.`,
        section.line,
      );
    }
  }
  if (expected === "perche") problem("L'ultimo passaggio della dimostrazione non ha la giustificazione (::perche).");
  if (expected === "motivo") problem("L'ultima versione sbagliata non ha il motivo (::motivo).");
  if (steps.length < 2) problem("Una dimostrazione ha almeno due passaggi (::passo).");
  for (const step of steps) {
    if (step.wrong.length > 2) problem("Un passaggio ha al più due versioni sbagliate.", step.line);
  }
  if (steps.length >= 2 && steps.filter((step) => step.wrong.length > 0).length < 2) {
    problem("Almeno due passaggi della dimostrazione devono avere una versione sbagliata (::sbagliato con ::motivo).");
  }
  return steps.map(({ text, reason, fixed, wrong }) => ({ text, reason, fixed, wrong }));
}

// ───────────────────────────── controlli sulla lezione intera ─────────────────────────────

/** Tutti i testi di un blocco. */
export function blockTexts(block: LessonBlock): RichText[] {
  switch (block.kind) {
    case "text":
    case "definition":
    case "theorem":
    case "example":
    case "warning":
    case "glossary":
    case "summary":
      return [block.body];
    case "proof":
      return [block.intro, ...block.steps.flatMap((step) => [step.text, step.reason, ...step.wrong.flatMap((wrong) => [wrong.text, wrong.reason])])];
    case "question":
      return block.source.type === "manual"
        ? [block.source.prompt, ...block.source.options.map((option) => option.content), block.source.explanation]
        : [];
    case "flashcard":
      return [block.front, block.back];
    case "visualization":
      return [];
  }
}

function checkLesson(meta: LessonMeta, blocks: readonly LessonBlock[], report: (line: number, message: string) => void): void {
  // Codici unici dentro la lezione.
  const ids = new Map<string, number>();
  for (const block of blocks) {
    if (block.kind !== "definition" && block.kind !== "theorem" && block.kind !== "flashcard") continue;
    if (ids.has(block.id)) report(block.line, `Il codice ${block.id} è già usato alla riga ${ids.get(block.id)}.`);
    else ids.set(block.id, block.line);
  }

  // Ogni termine dichiarato nell'intestazione è definito una volta sola, e viceversa.
  const defined = new Map<string, number>();
  for (const block of blocks) {
    const term = block.kind === "definition" ? block.term : block.kind === "glossary" ? block.term : undefined;
    if (term === undefined) continue;
    if (!meta.terms.includes(term)) report(block.line, `Il termine «${term}» non è tra i «termini» dell'intestazione.`);
    if (defined.has(term)) report(block.line, `Il termine «${term}» è già definito alla riga ${defined.get(term)}: un termine si definisce una volta sola.`);
    else defined.set(term, block.line);
  }
  for (const term of meta.terms) {
    if (!defined.has(term)) report(1, `Il termine «${term}» è nell'intestazione ma nessun blocco lo definisce (definizione con termine=… oppure glossario).`);
  }

  // Una dimostrazione segue il suo teorema, nella stessa lezione.
  const theorems = new Set<string>();
  for (const block of blocks) {
    if (block.kind === "theorem") theorems.add(block.id);
    if (block.kind === "proof" && !theorems.has(block.of)) {
      report(block.line, `La dimostrazione di ${block.of} deve venire dopo il suo teorema, nella stessa lezione.`);
    }
  }

  // Il riepilogo chiude la lezione.
  const summaries = blocks.filter((block) => block.kind === "summary");
  if (summaries.length !== 1) report(summaries[1]?.line ?? 1, "La lezione deve avere esattamente un blocco «riepilogo».");
  else if (blocks[blocks.length - 1]?.kind !== "summary") report(summaries[0]?.line ?? 1, "Il «riepilogo» deve essere l'ultimo blocco della lezione.");

  // Formule chiuse e rimandi riconoscibili.
  for (const block of blocks) {
    for (const text of blockTexts(block)) {
      if (unbalancedMath(text)) report(block.line, "C'è una formula aperta e non chiusa (un $ spaiato). Un dollaro vero si scrive \\$.");
      for (const segment of splitInline(text)) {
        if (segment.kind !== "ref") continue;
        const { target } = segment;
        if (!isGlossaryTerm(target) && !isLessonCode(target) && !isDefinitionCode(target) && !isTheoremCode(target)) {
          report(block.line, `Il rimando [[${target}]] non è un termine del glossario né un codice di lezione, definizione o teorema.`);
        }
      }
    }
  }
}

/** Tutto ciò a cui una lezione rimanda: serve alla verifica dei contenuti, che controlla che esista. */
export interface LessonReferences {
  readonly terms: readonly string[];
  readonly lessons: readonly string[];
  readonly definitions: readonly string[];
  readonly theorems: readonly string[];
  readonly errors: readonly string[];
  readonly generators: readonly string[];
  readonly visualizations: readonly string[];
}

export function lessonReferences(lesson: Lesson): LessonReferences {
  const sets = { terms: new Set<string>(), lessons: new Set<string>(), definitions: new Set<string>(), theorems: new Set<string>(), errors: new Set<string>(), generators: new Set<string>(), visualizations: new Set<string>() };
  for (const code of lesson.meta.prerequisites) sets.lessons.add(code);
  for (const block of lesson.blocks) {
    if (block.kind === "warning") sets.errors.add(block.error);
    if (block.kind === "visualization") sets.visualizations.add(block.id);
    if (block.kind === "proof") sets.theorems.add(block.of);
    if (block.kind === "question") {
      if (block.source.type === "generator") sets.generators.add(block.source.generator);
      else for (const option of block.source.options) if (option.error) sets.errors.add(option.error);
    }
    for (const text of blockTexts(block)) {
      for (const segment of splitInline(text)) {
        if (segment.kind !== "ref") continue;
        const { target } = segment;
        if (isLessonCode(target)) sets.lessons.add(target);
        else if (isDefinitionCode(target)) sets.definitions.add(target);
        else if (isTheoremCode(target)) sets.theorems.add(target);
        else if (isGlossaryTerm(target)) sets.terms.add(target);
      }
    }
  }
  const sorted = (set: Set<string>): string[] => [...set].sort();
  return {
    terms: sorted(sets.terms), lessons: sorted(sets.lessons), definitions: sorted(sets.definitions), theorems: sorted(sets.theorems),
    errors: sorted(sets.errors), generators: sorted(sets.generators), visualizations: sorted(sets.visualizations),
  };
}
