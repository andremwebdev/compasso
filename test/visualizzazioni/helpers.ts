// Aiuti comuni ai test delle visualizzazioni.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLesson } from "../../src/contenuti/formato";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** I parametri di ogni blocco della visualizzazione `id` nelle lezioni vere (src/contenuti). */
export function lessonParams(id: string): Record<string, string>[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? (name === "formato" ? [] : walk(full)) : name.endsWith(".md") ? [full] : [];
    });
  return walk(path.join(root, "src", "contenuti")).flatMap((file) =>
    (parseLesson(readFileSync(file, "utf8")).lesson?.blocks ?? []).flatMap((block) =>
      block.kind === "visualization" && block.id === id ? [{ ...block.params }] : [],
    ),
  );
}
