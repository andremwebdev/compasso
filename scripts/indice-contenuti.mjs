// Calcola l'indice leggero dei contenuti (src/moduli/indice.ts) leggendo tutti i file dei moduli.
// La compilazione (scripts/build.mjs) e Vitest (vitest.config.ts) lo inseriscono come costante
// __CONTENT_INDEX__: così l'app conosce codici, titoli, livelli ed errori senza caricare i moduli.

import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** L'indice di tutti i moduli, come oggetto JavaScript. */
export async function computeContentIndex() {
  const result = await build({
    stdin: {
      contents: 'export { indexAllModules } from "./src/moduli/indicizza";',
      resolveDir: root,
      loader: "ts",
      sourcefile: "indice-contenuti.ts",
    },
    tsconfig: path.join(root, "tsconfig.json"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    write: false,
    logLevel: "warning",
    // Le librerie restano fuori: il file temporaneo sta dentro node_modules e le trova da lì.
    packages: "external",
    loader: { ".md": "text" },
    define: { __TARGET__: '"pc"', __CONTENT_INDEX__: "[]" },
  });
  const dir = path.join(root, "node_modules", ".cache", "compasso");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `indice-${process.pid}-${Date.now()}.mjs`);
  await writeFile(file, result.outputFiles[0].text);
  try {
    const { indexAllModules } = await import(pathToFileURL(file).href);
    return await indexAllModules();
  } finally {
    await rm(file, { force: true });
  }
}

/** L'indice come testo, pronto per il campo define di esbuild e di Vitest. */
export async function contentIndexDefine() {
  return JSON.stringify(await computeContentIndex());
}
