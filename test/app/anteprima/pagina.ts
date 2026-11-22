// La pagina di prova per le prove in Chrome dei riquadri delle lezioni: un file .tsx di
// test/app/anteprima compilato con esbuild, con script, stili veri (styles.css) e caratteri di KaTeX
// dentro il file (nessuna richiesta esterna).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { contentIndexDefine } from "../../../scripts/indice-contenuti.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const katexDist = path.join(root, "node_modules", "katex", "dist");

/** La pagina HTML che mostra `entry` (percorso relativo alla radice del repository). */
export async function previewPage(entry: string): Promise<string> {
  const result = await build({
    entryPoints: [path.join(root, entry)],
    tsconfig: path.join(root, "tsconfig.json"),
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    logLevel: "error",
    loader: { ".md": "text", ".svg": "text" },
    define: { __TARGET__: '"pc"', __CONTENT_INDEX__: await contentIndexDefine(), "process.env.NODE_ENV": '"production"' },
  });
  const js = (result.outputFiles[0]?.text ?? "").replaceAll("</script", "<\\/script");
  let katexCss = readFileSync(path.join(katexDist, "katex.min.css"), "utf8")
    .replace(/,url\(fonts\/[^)]+\.woff\) format\("woff"\)/g, "")
    .replace(/,url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g, "");
  for (const name of new Set([...katexCss.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)].map((m) => m[1] as string))) {
    katexCss = katexCss.replaceAll(`url(fonts/${name})`, `url(data:font/woff2;base64,${readFileSync(path.join(katexDist, "fonts", name)).toString("base64")})`);
  }
  const css = readFileSync(path.join(root, "src", "app", "styles.css"), "utf8");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${katexCss}${css}</style></head><body><div id="app"></div><script>${js}</script></body></html>`;
}

