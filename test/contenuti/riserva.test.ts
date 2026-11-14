// Dimostrazioni di riserva (src/riserva/**/tNN.md): teorema e dimostrazione già scritti, in attesa della
// lezione che li ospiterà. Ogni file è un frammento da incollare così com'è: qui lo si mette dentro una
// lezione di prova e gli si applica la stessa verifica dei contenuti delle lezioni vere, più le regole
// di REGOLE.md, «Come scrivere una dimostrazione» (numero di passaggi, passaggi fissi, versioni sbagliate).

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { blockTexts, formatContentReport, parseLesson, splitInline, verifyContents, type ContentFile, type LessonBlock } from "../../src/contenuti/formato";
import { generatorLevels } from "../../src/generatori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const reserveFolder = path.join(root, "src", "riserva");
const lessonsFolder = path.join(root, "src", "contenuti");

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "formato" ? [] : markdownFiles(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

const relative = (file: string): string => path.relative(root, file).split(path.sep).join("/");

interface Reserve {
  /** Percorso nel repository: src/riserva/v2/m05/t01.md. */
  readonly path: string;
  /** Il codice del teorema, ricavato dal percorso: V2.M05.T01. */
  readonly theorem: string;
  readonly text: string;
  /** Il frammento dentro una lezione di prova. */
  readonly wrapped: ContentFile;
}

// Il file LEGGIMI.md non è un frammento: è l'elenco per chi scrive le lezioni.
const fragments = markdownFiles(reserveFolder).filter((file) => path.basename(file) !== "LEGGIMI.md").sort();

const perModule = new Map<string, number>();
const reserves: Reserve[] = fragments.map((file) => {
  const local = path.relative(reserveFolder, file).split(path.sep).join("/");
  const [volume = "", module = "", name = ""] = local.split("/");
  const theorem = `${volume}.${module}.${name.replace(".md", "")}`.toUpperCase();
  // Lezione di prova: codici dal 99 in giù, lontani da quelli delle lezioni vere.
  const index = perModule.get(`${volume}/${module}`) ?? 0;
  perModule.set(`${volume}/${module}`, index + 1);
  const number = 99 - index;
  const lesson = `${volume}.${module}.L${number}`.toUpperCase();
  const text = readFileSync(file, "utf8");
  const wrapped = [
    "---",
    `codice: ${lesson}`,
    `titolo: Riserva ${theorem}`,
    "obiettivo: Controllare una dimostrazione di riserva.",
    "prerequisiti: []",
    "durata: 10",
    "abilita: []",
    "termini: []",
    "---",
    "",
    text.trim(),
    "",
    ":::riepilogo",
    "Dimostrazione di riserva.",
    ":::",
    "",
  ].join("\n");
  // Il percorso finisce come quello che la verifica si aspetta per la lezione di prova, ma mostra il file vero.
  return { path: relative(file), theorem, text, wrapped: { path: `${relative(file)} → ${volume}/${module}/l${number}.md`, text: wrapped } };
});

const lessons: ContentFile[] = markdownFiles(lessonsFolder).map((file) => ({ path: relative(file), text: readFileSync(file, "utf8") }));

function blocksOf(reserve: Reserve): readonly LessonBlock[] {
  const { lesson, problems } = parseLesson(reserve.wrapped.text);
  if (!lesson) throw new Error(`${reserve.path}: ${problems.map((problem) => problem.message).join(" ")}`);
  return lesson.blocks;
}

const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

describe("dimostrazioni di riserva", () => {
  it("i file stanno al loro posto: src/riserva/<volume>/<modulo>/tNN.md", () => {
    for (const reserve of reserves) expect(reserve.path).toMatch(/^src\/riserva\/v\d\/m\d\d\/t\d\d\.md$/);
  });

  it("superano la verifica dei contenuti insieme alle lezioni vere, senza problemi e senza avvisi", () => {
    // Insieme alle lezioni vere: un teorema già entrato in una lezione non può restare anche in riserva.
    const report = verifyContents([...lessons, ...reserves.map((reserve) => reserve.wrapped)], { generators: generatorLevels(), visualizations: [] });
    expect(report.problems, formatContentReport(report)).toEqual([]);
    expect(report.warnings, formatContentReport(report)).toEqual([]);
    expect(report.lessons).toBe(lessons.length + reserves.length);
  });

  it("ogni file contiene un teorema e la sua dimostrazione, con il codice del nome del file", () => {
    for (const reserve of reserves) {
      const blocks = blocksOf(reserve);
      expect(blocks.map((block) => block.kind), reserve.path).toEqual(["theorem", "proof", "summary"]);
      const [theorem, proof] = blocks;
      if (theorem?.kind !== "theorem" || proof?.kind !== "proof") throw new Error(`${reserve.path}: blocchi inattesi`);
      expect(theorem.id, reserve.path).toBe(reserve.theorem);
      expect(proof.of, reserve.path).toBe(reserve.theorem);
    }
  });

  it("ogni dimostrazione rispetta le regole: da 4 a 10 passaggi, al più un terzo fissi, versioni sbagliate distinte", () => {
    for (const reserve of reserves) {
      const proof = blocksOf(reserve).find((block) => block.kind === "proof");
      if (proof?.kind !== "proof") throw new Error(`${reserve.path}: manca la dimostrazione`);
      const { steps } = proof;
      expect(steps.length, reserve.path).toBeGreaterThanOrEqual(4);
      expect(steps.length, reserve.path).toBeLessThanOrEqual(10);
      expect(steps.filter((step) => step.fixed).length * 3, `${reserve.path}: troppi passaggi fissi`).toBeLessThanOrEqual(steps.length);
      expect(steps.filter((step) => step.wrong.length > 0).length, reserve.path).toBeGreaterThanOrEqual(2);
      // Nessuna versione sbagliata coincide con un passaggio giusto o con un'altra versione sbagliata.
      const texts = [...steps.map((step) => squash(step.text)), ...steps.flatMap((step) => step.wrong.map((wrong) => squash(wrong.text)))];
      expect(new Set(texts).size, `${reserve.path}: due passaggi o versioni sbagliate hanno lo stesso testo`).toBe(texts.length);
      // Il passaggio non contiene parole che nascondono un conto.
      for (const step of steps) expect(step.text, reserve.path).not.toMatch(/analogamente|si ottiene facilmente/i);
    }
  });

  it("ogni formula si disegna con KaTeX in modalità rigorosa", () => {
    for (const reserve of reserves) {
      for (const block of blocksOf(reserve)) {
        for (const text of blockTexts(block)) {
          for (const segment of splitInline(text)) {
            if (segment.kind !== "math") continue;
            expect(() => katex.renderToString(segment.latex, { throwOnError: true, strict: "error", displayMode: segment.display }), `${reserve.path}, riga ${block.line}: ${segment.latex}`).not.toThrow();
          }
        }
      }
    }
  });

  it("l'elenco src/riserva/LEGGIMI.md nomina tutti e soli i teoremi presenti", () => {
    const index = readFileSync(path.join(reserveFolder, "LEGGIMI.md"), "utf8");
    const listed = [...index.matchAll(/^\| `(V\d\.M\d\d\.T\d\d)` \|/gm)].map((match) => match[1] as string).sort();
    expect(listed).toEqual(reserves.map((reserve) => reserve.theorem).sort());
  });
});
