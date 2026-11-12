// Le lezioni vere dell'app (src/contenuti/**.md): verifica dei contenuti su tutte, contro l'elenco
// dei generatori veri. Una lezione entra nell'app solo se qui non ci sono problemi né avvisi.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { lessonCodes, lessonSources, loadLesson } from "../../src/contenuti";
import { blockTexts, formatContentReport, lessonPath, splitInline, verifyContents, type ContentFile } from "../../src/contenuti/formato";
import { findGenerator, generatorLevels } from "../../src/generatori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const folder = path.join(root, "src", "contenuti");

function markdownFiles(dir = folder): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "formato" ? [] : markdownFiles(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

const files: ContentFile[] = markdownFiles().map((file) => ({ path: path.relative(root, file).split(path.sep).join("/"), text: readFileSync(file, "utf8") }));

describe("lezioni dell'app", () => {
  it("superano la verifica dei contenuti, senza problemi e senza avvisi", () => {
    const report = verifyContents(files, { generators: generatorLevels(), visualizations: [] });
    expect(report.problems, formatContentReport(report)).toEqual([]);
    expect(report.warnings, formatContentReport(report)).toEqual([]);
    expect(report.lessons).toBe(files.length);
  });

  it("ogni file è nell'elenco src/contenuti/index.ts, con lo stesso testo", () => {
    expect(files.map((file) => file.path).sort()).toEqual(lessonCodes.map((code) => `src/contenuti/${lessonPath(code)}`).sort());
    for (const code of lessonCodes) {
      const file = files.find((item) => item.path.endsWith(lessonPath(code)));
      expect(lessonSources[code]).toBe(file?.text);
      expect(loadLesson(code)?.meta.code).toBe(code);
    }
    expect(loadLesson("V9.M99.L99")).toBeNull();
  });

  it("ogni formula si disegna con KaTeX in modalità rigorosa", () => {
    for (const code of lessonCodes) {
      const lesson = loadLesson(code);
      if (!lesson) throw new Error(`lezione ${code} non letta`);
      for (const block of lesson.blocks) {
        for (const text of blockTexts(block)) {
          for (const segment of splitInline(text)) {
            if (segment.kind !== "math") continue;
            expect(() => katex.renderToString(segment.latex, { throwOnError: true, strict: "error", displayMode: segment.display }), `${code}, riga ${block.line}: ${segment.latex}`).not.toThrow();
          }
        }
      }
    }
  });

  it("ogni lezione rispetta la struttura minima: definizione, esempio svolto, domanda lampo, attenzione, riepilogo", () => {
    for (const code of lessonCodes) {
      const kinds = new Set(loadLesson(code)?.blocks.map((block) => block.kind));
      for (const kind of ["definition", "example", "question", "warning", "summary"]) expect(kinds.has(kind as never), `${code}: manca un blocco «${kind}»`).toBe(true);
    }
  });

  it("le abilità di una lezione hanno almeno un generatore, che rimanda a quella lezione", () => {
    for (const code of lessonCodes) {
      const lesson = loadLesson(code);
      for (const skill of lesson?.meta.skills ?? []) {
        const generator = findGenerator(`${skill}.g1`);
        expect(generator, `${skill} non ha il generatore ${skill}.g1`).toBeDefined();
        expect(generator?.lesson).toBe(code);
      }
    }
  });
});
