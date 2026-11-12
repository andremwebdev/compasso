// L'elenco dei generatori (src/generatori/index.ts): completo, senza doppioni, ogni file al suo posto.

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findGenerator, generatorLevels, generators } from "../../src/generatori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const folder = path.join(root, "src", "generatori");

/** I file dei generatori: tutti i .ts sotto src/generatori/v*, con il percorso relativo. */
function generatorFiles(dir = folder): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return dir === folder && !/^v\d+$/.test(name) ? [] : generatorFiles(full);
    return dir !== folder && name.endsWith(".ts") ? [path.relative(folder, full).split(path.sep).join("/")] : [];
  });
}

/** Dove deve stare un generatore: V1.M06.A04.g1 → v1/m06/a04-g1.ts. */
const fileOf = (code: string): string => {
  const [volume, module, skill, variant] = code.toLowerCase().split(".");
  return `${volume}/${module}/${skill}-${variant}.ts`;
};

describe("elenco dei generatori", () => {
  it("i codici sono unici e si ritrovano", () => {
    const codes = generators.map((generator) => generator.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const generator of generators) expect(findGenerator(generator.code)).toBe(generator);
    expect(findGenerator("V9.M99.A99.g9")).toBeUndefined();
    expect(Object.keys(generatorLevels()).sort()).toEqual([...codes].sort());
  });

  it("ogni file di src/generatori è in elenco, nel posto che corrisponde al suo codice", () => {
    expect(generatorFiles().sort()).toEqual(generators.map((generator) => fileOf(generator.code)).sort());
  });

  it("ogni generatore ha il suo test, che chiama la verifica automatica", () => {
    for (const generator of generators) {
      const test = path.join(root, "test", "generatori", fileOf(generator.code).replace(/\.ts$/, ".test.ts"));
      expect(statSync(test).isFile(), `manca ${test}`).toBe(true);
    }
  });
});
