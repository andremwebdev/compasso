// Aspetto Compasso (specifica, sezione 10): i colori dei due temi letti da styles.css, il contrasto
// almeno AA di ogni coppia testo/fondo che l'app usa, i contorni dei comandi, il codice colore dei
// blocchi e i colori ripetuti fuori dal CSS (meta theme-color, manifest).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIGURE_CLASSES } from "../../src/contenuti/formato";
import { THEME_COLORS } from "../../src/app/state";

const root = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(root, "src/app/styles.css"), "utf8");

/** Le variabili di colore dichiarate in un blocco del CSS (il primo che comincia con `selector`). */
function variablesOf(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  expect(start, `manca il blocco ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/g)].map((m) => [m[1] ?? "", m[2] ?? ""]));
}

const light = variablesOf(":root {");
const darkSystem = variablesOf(':root:not([data-theme="light"])');
const darkChosen = variablesOf(':root[data-theme="dark"]');

/** Luminanza relativa (WCAG 2.x). */
function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Coppie testo/fondo usate dall'app: devono superare 4,5:1. */
const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ...["carta", "carta-alta", "def-fondo", "teo-fondo", "dim-fondo", "ese-fondo", "att-fondo"].flatMap((bg) => [
    ["inchiostro", bg] as const,
    ["inchiostro-secondario", bg] as const,
  ]),
  ["blu", "carta"],
  ["blu", "carta-alta"],
  ["blu", "def-fondo"],
  ["blu", "dim-fondo"],
  ["blu", "teo-fondo"],
  ["arancio", "carta"],
  ["arancio", "carta-alta"],
  ["arancio", "teo-fondo"],
  // Codice colore dei blocchi: l'etichetta del riquadro sul suo fondo.
  ["def", "def-fondo"],
  ["teo", "teo-fondo"],
  ["dim", "dim-fondo"],
  ["ese", "ese-fondo"],
  ["att", "att-fondo"],
  ["giusto", "giusto-fondo"],
  ["sbagliato", "sbagliato-fondo"],
  ["giusto", "carta-alta"],
  ["sbagliato", "carta-alta"],
  // Pulsante pieno e scheda attiva: testo color carta sul blu.
  ["carta", "blu"],
];

/** Contorni dei comandi e indicatore del fuoco: almeno 3:1 (WCAG 1.4.11). */
const UI_PAIRS: readonly (readonly [string, string])[] = [
  ["bordo", "carta"],
  ["bordo", "carta-alta"],
  ["arancio", "carta"],
  ["arancio", "carta-alta"],
  ["inchiostro-secondario", "carta-alta"],
  // Curve dei grafici (la terza è verde) e contorno del riquadro di un problema.
  ["blu", "carta-alta"],
  ["ese", "carta-alta"],
  ["att", "att-fondo"],
];

describe.each([
  ["chiaro", light],
  ["scuro (dal telefono)", darkSystem],
  ["scuro (scelto)", darkChosen],
])("tema %s", (_name, colors) => {
  it("dichiara tutti i colori usati", () => {
    for (const [a, b] of [...TEXT_PAIRS, ...UI_PAIRS]) {
      expect(colors[a], `manca --${a}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(colors[b], `manca --${b}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it.each(TEXT_PAIRS)("testo --%s su --%s: contrasto AA (4,5:1)", (text, background) => {
    expect(contrast(colors[text] ?? "", colors[background] ?? "")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("contorno --%s su --%s: almeno 3:1", (line, background) => {
    expect(contrast(colors[line] ?? "", colors[background] ?? "")).toBeGreaterThanOrEqual(3);
  });

  it("i cinque blocchi hanno cinque colori diversi", () => {
    const blocks = ["def", "teo", "dim", "ese", "att"].map((name) => colors[name]);
    expect(new Set(blocks).size).toBe(5);
  });
});

describe("aspetto", () => {
  it("il tema scuro è lo stesso, che lo scelga il telefono o Andrea", () => {
    expect(darkChosen).toEqual(darkSystem);
  });

  it("il colore della barra del telefono è la carta di ciascun tema", () => {
    expect(THEME_COLORS.light).toBe(light["carta"]);
    expect(THEME_COLORS.dark).toBe(darkSystem["carta"]);
    const html = readFileSync(path.join(root, "src/app/index.html"), "utf8");
    expect(html).toContain(`content="${light["carta"]}" media="(prefers-color-scheme: light)"`);
    expect(html).toContain(`content="${darkSystem["carta"]}" media="(prefers-color-scheme: dark)"`);
    const build = readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
    expect(build).toContain(`theme_color: "${light["carta"]}"`);
  });

  it("niente opacità sui testi: abbasserebbe il contrasto sotto AA", () => {
    // L'unica opacità ammessa è quella di elementi senza testo (quote, righello, aree delle figure).
    const withOpacity = [...css.matchAll(/([^{}]+)\{[^}]*\bopacity:/g)].map((m) => (m[1] ?? "").trim());
    expect(withOpacity.every((selector) => /h1::after|\.ruler-fill|\.fig-area-\d$/.test(selector))).toBe(true);
  });

  it("ogni classe delle figure e dei grafici ha la sua regola, con i colori del tema", () => {
    const classes = [...FIGURE_CLASSES, "graf-griglia", "graf-asse", "graf-freccia", "graf-asintoto", "graf-curva", "graf-curva-1", "graf-curva-2", "graf-curva-3", "graf-punto", "graf-buco"];
    for (const name of classes) expect(css, `.${name}`).toMatch(new RegExp(`\\.${name}[\\s,{]`));
    // Le regole dei grafici e delle figure non scrivono colori: solo variabili.
    const rules = [...css.matchAll(/([^{}]*\.(?:graf|fig|grafico|figura)-[^{}]*)\{([^}]*)\}/g)].map((m) => m[2] ?? "");
    for (const body of rules) expect(body).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i);
  });
});
