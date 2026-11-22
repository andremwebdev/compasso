// Compila Compasso in due versioni dallo stesso codice:
//   telefono → dist/telefono/   PWA a più file (manifest, service worker, caratteri, icone); il
//              contenuto di ogni modulo (lezioni e generatori) è un file a parte, moduli/vN/mNN.js,
//              che l'app legge solo quando serve
//   pc       → dist/pc/compasso.html   file unico con tutto incorporato
//
// Uso: node scripts/build.mjs [telefono|pc]   (senza argomenti compila entrambe)

import { build, transform } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentIndexDefine } from "./indice-contenuti.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcApp = path.join(root, "src", "app");
const katexDist = path.join(root, "node_modules", "katex", "dist");
const fontsource = path.join(root, "node_modules", "@fontsource");

// Caratteri dell'interfaccia (specifica, sezione 10): IBM Plex Sans per il testo, Plex Mono per i
// codici e per il campo di risposta. Solo il sottoinsieme latino (basta per l'italiano) in woff2;
// i simboli matematici fuori da questo insieme li disegna KaTeX o il carattere di sistema.
const UI_FONTS = [
  { family: "Compasso Sans", weight: "400", style: "normal", file: "ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2" },
  { family: "Compasso Sans", weight: "400", style: "italic", file: "ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2" },
  // Il 600 fa anche da grassetto: un file in meno da scaricare.
  { family: "Compasso Sans", weight: "600 700", style: "normal", file: "ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2" },
  { family: "Compasso Mono", weight: "400", style: "normal", file: "ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2" },
];
const UNICODE_LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

/** Le regole @font-face dei caratteri dell'interfaccia, con i file nella cartella fonts/. */
function uiFontsCss() {
  return UI_FONTS.map(
    (font) =>
      `@font-face{font-family:"${font.family}";font-style:${font.style};font-weight:${font.weight};font-display:swap;` +
      `src:url(fonts/${path.basename(font.file)}) format("woff2");unicode-range:${UNICODE_LATIN}}`,
  ).join("");
}

/** Dove sta il file di un carattere citato nel CSS: KaTeX oppure i caratteri dell'interfaccia. */
function fontSource(name) {
  const ui = UI_FONTS.find((font) => path.basename(font.file) === name);
  return ui ? path.join(fontsource, ui.file) : path.join(katexDist, "fonts", name);
}
const dist = path.join(root, "dist");

const TARGETS = ["telefono", "pc"];

// Colori del manifest: la carta del tema chiaro (--carta in src/app/styles.css).
const MANIFEST = {
  name: "Compasso",
  short_name: "Compasso",
  description: "Studio della matematica, dalle basi ad Analisi 1 e Geometria e Algebra Lineare.",
  lang: "it",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#f4efe0",
  theme_color: "#f4efe0",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
};

// L'indice leggero dei contenuti (src/moduli/indice.ts), calcolato una volta dai file dei moduli.
let contentIndex = null;
async function contentIndexOnce() {
  contentIndex ??= await contentIndexDefine();
  return contentIndex;
}

/** Opzioni comuni alle due versioni. */
async function appOptions(target) {
  return {
    tsconfig: path.join(root, "tsconfig.json"),
    bundle: true,
    minify: true,
    target: "es2020",
    write: false,
    legalComments: "none",
    logLevel: "warning",
    // Le lezioni sono file Markdown, le loro figure file SVG: entrano nel codice come testo.
    loader: { ".md": "text", ".svg": "text" },
    define: {
      __TARGET__: JSON.stringify(target),
      __CONTENT_INDEX__: await contentIndexOnce(),
      "process.env.NODE_ENV": '"production"',
    },
  };
}

/** Versione PC: tutto il codice in un solo file JavaScript (IIFE); gli import() dei moduli restano dentro. */
async function bundleAppSingle() {
  const result = await build({ ...(await appOptions("pc")), entryPoints: [path.join(srcApp, "main.tsx")], format: "iife" });
  return result.outputFiles[0].text;
}

/** I file dei moduli (src/moduli/vN/mNN.ts), come percorsi di uscita «moduli/vN/mNN» → file sorgente. */
async function moduleEntries() {
  const entries = {};
  for (const volume of (await readdir(path.join(root, "src", "moduli"), { withFileTypes: true })).filter((entry) => entry.isDirectory())) {
    for (const file of (await readdir(path.join(root, "src", "moduli", volume.name))).filter((name) => name.endsWith(".ts"))) {
      entries[`moduli/${volume.name}/${file.replace(/\.ts$/, "")}`] = path.join(root, "src", "moduli", volume.name, file);
    }
  }
  return entries;
}

/**
 * Versione telefono: moduli ES divisi. app.js è l'avvio (interfaccia, motore, indice leggero);
 * ogni modulo dei contenuti è un file moduli/vN/mNN.js caricato con import() solo quando serve;
 * il codice in comune tra più file sta in chunks/. Restituisce [percorso relativo, testo].
 */
async function bundleAppSplit(outDir) {
  const result = await build({
    ...(await appOptions("telefono")),
    entryPoints: { app: path.join(srcApp, "main.tsx"), ...(await moduleEntries()) },
    format: "esm",
    splitting: true,
    outdir: outDir,
    chunkNames: "chunks/[name]-[hash]",
  });
  return result.outputFiles.map((file) => [path.relative(outDir, file.path).split(path.sep).join("/"), file.text]);
}

/** CSS di KaTeX senza i formati woff e ttf: i browser moderni leggono tutti woff2. */
async function katexCss() {
  const css = await readFile(path.join(katexDist, "katex.min.css"), "utf8");
  return css
    .replace(/,url\(fonts\/[^)]+\.woff\) format\("woff"\)/g, "")
    .replace(/,url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g, "");
}

async function appCss() {
  const css = uiFontsCss() + (await readFile(path.join(srcApp, "styles.css"), "utf8"));
  return (await transform(css, { loader: "css", minify: true })).code;
}

/** Nomi dei file woff2 citati nel CSS (KaTeX e interfaccia). */
function fontFiles(css) {
  return [...new Set([...css.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)].map((m) => m[1]))];
}

/** Sostituisce ogni url(fonts/X.woff2) con il file incorporato come data URI. */
async function inlineFonts(css) {
  let out = css;
  for (const name of fontFiles(css)) {
    const data = await readFile(fontSource(name));
    out = out.replaceAll(`url(fonts/${name})`, `url(data:font/woff2;base64,${data.toString("base64")})`);
  }
  return out;
}

/** Compone la pagina HTML dal modello src/app/index.html. */
async function renderHtml({ head, style, script }) {
  const template = await readFile(path.join(srcApp, "index.html"), "utf8");
  return template.replace("%%HEAD%%", () => head).replace("%%STYLE%%", () => style).replace("%%SCRIPT%%", () => script);
}

/** Versione PC: un solo file, nessun riferimento esterno. */
async function buildPc() {
  const outDir = path.join(dist, "pc");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const js = await bundleAppSingle();
  const css = await inlineFonts((await katexCss()) + (await appCss()));
  // Dentro un <script> la sequenza "</script" chiuderebbe il tag prima del tempo.
  const safeJs = js.replaceAll("</script", "<\\/script").replaceAll("<!--", "<\\!--");

  const html = await renderHtml({
    head: "",
    style: `<style>${css}</style>`,
    script: `<script>${safeJs}</script>`,
  });
  const file = path.join(outDir, "compasso.html");
  await writeFile(file, html);
  return [{ file: path.relative(root, file), bytes: Buffer.byteLength(html) }];
}

/** Elenco ricorsivo dei file di una cartella, con percorsi relativi e separatore "/". */
async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else files.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return files.sort();
}

/** Versione telefono: PWA a più file, con service worker per l'uso offline. */
async function buildTelefono() {
  const outDir = path.join(dist, "telefono");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "fonts"), { recursive: true });

  // Caratteri (KaTeX e interfaccia, solo woff2) e icone.
  const css = (await katexCss()) + (await appCss());
  for (const name of fontFiles(css)) {
    await cp(fontSource(name), path.join(outDir, "fonts", name));
  }
  await cp(path.join(root, "public", "icons"), path.join(outDir, "icons"), { recursive: true });

  for (const [name, text] of await bundleAppSplit(outDir)) {
    await mkdir(path.dirname(path.join(outDir, name)), { recursive: true });
    await writeFile(path.join(outDir, name), text);
  }
  await writeFile(path.join(outDir, "app.css"), css);
  await writeFile(path.join(outDir, "manifest.webmanifest"), JSON.stringify(MANIFEST, null, 2) + "\n");

  const head = [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">',
    '<link rel="apple-touch-icon" href="icons/icon-180.png">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Compasso">',
  ].join("\n");
  const html = await renderHtml({
    head,
    style: '<link rel="stylesheet" href="app.css">',
    // Modulo ES: si avvia dopo la lettura della pagina, come con defer.
    script: '<script type="module" src="app.js"></script>',
  });
  await writeFile(path.join(outDir, "index.html"), html);

  // Il service worker salva tutti i file; la versione cambia se cambia anche un solo byte.
  const files = await listFiles(outDir);
  const hash = createHash("sha256");
  for (const name of files) {
    hash.update(name);
    hash.update(await readFile(path.join(outDir, name)));
  }
  const version = hash.digest("hex").slice(0, 12);
  const precache = ["./", ...files];

  const sw = await build({
    entryPoints: [path.join(srcApp, "sw.ts")],
    tsconfig: path.join(root, "tsconfig.sw.json"),
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    write: false,
    legalComments: "none",
    logLevel: "warning",
    define: {
      __PRECACHE__: JSON.stringify(precache),
      __CACHE_VERSION__: JSON.stringify(version),
    },
  });
  await writeFile(path.join(outDir, "sw.js"), sw.outputFiles[0].text);

  const all = await listFiles(outDir);
  const out = [];
  for (const name of all) {
    const { size } = await stat(path.join(outDir, name));
    out.push({ file: path.join("dist", "telefono", name), bytes: size });
  }
  return out;
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const requested = process.argv[2];
if (requested && !TARGETS.includes(requested)) {
  console.error(`Versione sconosciuta "${requested}". Usa: ${TARGETS.join(" | ")} (o nessun argomento).`);
  process.exit(1);
}

for (const target of requested ? [requested] : TARGETS) {
  const built = target === "pc" ? await buildPc() : await buildTelefono();
  const total = built.reduce((sum, f) => sum + f.bytes, 0);
  console.log(`\n${target}: ${built.length} file, ${formatKb(total)}`);
  const quiet = (file) => [`${path.sep}fonts${path.sep}`, `${path.sep}moduli${path.sep}`, `${path.sep}chunks${path.sep}`].some((dir) => file.includes(dir));
  const modules = built.filter((f) => f.file.includes(`${path.sep}moduli${path.sep}`));
  if (modules.length > 0) console.log(`  ${modules.length} moduli in dist/telefono/moduli, ${formatKb(modules.reduce((sum, f) => sum + f.bytes, 0))}`);
  for (const f of built.filter((f) => !quiet(f.file))) {
    console.log(`  ${f.file}  ${formatKb(f.bytes)}`);
  }
}
