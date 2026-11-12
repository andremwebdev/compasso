// Prova end-to-end: compila le due versioni e le avvia in un DOM simulato (jsdom).
// Controlla che l'app parta davvero, che la barra abbia le cinque sezioni, che la lezione si apra
// dal suo file Markdown con le formule disegnate da KaTeX, che la schermata di esercizio abbia
// la tastiera matematica e che non ci siano richieste di rete esterne.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pcFile = path.join(root, "dist", "pc", "compasso.html");
const telefonoDir = path.join(root, "dist", "telefono");

beforeAll(() => {
  execFileSync(process.execPath, [path.join(root, "scripts", "build.mjs")], { cwd: root, stdio: "pipe" });
}, 120_000);

type Doc = Document;

const button = (doc: Doc, selector: string, text: string): HTMLElement => {
  const found = [...doc.querySelectorAll<HTMLElement>(selector)].find((element) => element.textContent?.includes(text));
  if (!found) throw new Error(`pulsante «${text}» non trovato (${selector})`);
  return found;
};

/** Lascia finire i ridisegni in sospeso. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

/** Controlli comuni alle due versioni, sul documento già avviato: avvio, lezione, esercizio. */
async function expectAppWorks(doc: Doc) {
  const labels = [...doc.querySelectorAll("nav.tab-bar button")].map((b) => b.textContent);
  expect(labels).toEqual(["Oggi", "Teoria", "Esercizi", "Test", "Tu"]);
  expect(doc.querySelector('nav.tab-bar button[aria-current="page"]')?.textContent).toBe("Oggi");

  // Teoria → la lezione, letta dal file Markdown: titolo, riquadri, formule.
  button(doc, "nav.tab-bar button", "Teoria").click();
  await settle();
  button(doc, ".card-link", "Disequazioni fratte").click();
  await settle();
  expect(doc.querySelector(".lesson-header h1")?.textContent).toBe("Disequazioni fratte");
  expect(doc.querySelector(".box-definition .box-label")?.textContent).toContain("Definizione");
  expect(doc.querySelector(".box-warning .box-label")?.textContent).toContain("Attenzione");
  expect(doc.querySelectorAll(".lesson .formula .katex").length).toBeGreaterThan(10);
  expect(doc.querySelector(".katex-error")).toBeNull();
  // Si vede solo il primo tratto, che finisce con una domanda lampo: senza risposta non si continua.
  expect(doc.querySelectorAll(".box-question").length).toBe(1);
  expect(doc.querySelector(".box-example")).toBeNull();
  const next = button(doc, ".lesson-footer button", "Continua") as HTMLButtonElement;
  expect(next.disabled).toBe(true);
  button(doc, ".box-question .option", "stesso segno").click();
  await settle();
  button(doc, ".box-question button", "Conferma").click();
  await settle();
  expect(doc.querySelector(".box-question .verdict-title")?.textContent).toContain("Giusta");
  (button(doc, ".lesson-footer button", "Continua") as HTMLButtonElement).click();
  await settle();
  expect(doc.querySelector(".box-example")).not.toBeNull();
  expect(doc.querySelector(".lesson-position")?.textContent).toContain("Tratto 2 di 5");

  // Esercizi → disequazioni fratte, livello 1: campo, anteprima, tastiera; «Non lo so» mostra la soluzione.
  button(doc, "nav.tab-bar button", "Esercizi").click();
  await settle();
  const card = [...doc.querySelectorAll(".card")].find((element) => element.textContent?.includes("Disequazioni fratte"));
  button(card as unknown as Doc, "button", "Livello 1").click();
  await settle();
  expect(doc.querySelector(".exercise-prompt .katex")).not.toBeNull();
  expect(doc.querySelector(".answer-input")?.getAttribute("inputmode")).toBe("none");
  expect(doc.querySelector('.keyboard-level[aria-selected="true"]')?.textContent).toBe("Insiemi");
  for (const label of ["x", "≥", "1"]) button(doc, ".keyboard-keys .key", label).click();
  await settle();
  expect((doc.querySelector(".answer-input") as HTMLInputElement).value).toBe("x ≥ 1");
  expect(doc.querySelector(".preview .katex")).not.toBeNull();
  button(doc, ".exercise-actions button", "Indizio 1 di 2").click();
  await settle();
  expect(doc.querySelectorAll(".hints li").length).toBe(1);
  button(doc, ".exercise-actions button", "Non lo so").click();
  await settle();
  expect(doc.querySelector(".verdict-title")?.textContent).toContain("Non data");
  expect(doc.querySelectorAll(".steps li").length).toBeGreaterThan(3);
  expect(doc.querySelector(".steps .katex")).not.toBeNull();
  expect(button(doc, ".exercise-actions button", "Esercizio simile")).toBeDefined();
  expect(button(doc, ".exercise-actions button", "Torna alla lezione")).toBeDefined();

  // Tu → il registro ha la domanda lampo e l'esercizio; la lezione risulta cominciata.
  button(doc, "nav.tab-bar button", "Tu").click();
  await settle();
  expect(doc.querySelector("main")?.textContent).toContain("Tentativi nel registro: 2");
  expect(doc.querySelector("main")?.textContent).toContain("Versione dei dati: 1");
}

describe("versione PC (file unico)", () => {
  it("si avvia, mostra la lezione e la schermata di esercizio", async () => {
    const html = readFileSync(pcFile, "utf8");
    const dom = new JSDOM(html, { runScripts: "dangerously", url: "file:///compasso.html", pretendToBeVisual: true });
    await settle();
    await expectAppWorks(dom.window.document);
  });

  it("è davvero un file unico, senza riferimenti esterni", () => {
    const html = readFileSync(pcFile, "utf8");
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelectorAll("script[src], link[href], img[src], iframe[src]").length).toBe(0);
    expect(html).not.toMatch(/@import/);
    // Ogni url() nel CSS deve essere un dato incorporato. (Si guarda solo dentro <style>: nel codice
    // JavaScript «url(» è anche il nome di una funzione della libreria Markdown.)
    const css = [...doc.querySelectorAll("style")].map((style) => style.textContent ?? "").join("\n");
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1] ?? "");
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u) => !u.startsWith("data:"))).toEqual([]);
  });

  it("incorpora i caratteri di KaTeX (funziona offline)", () => {
    const html = readFileSync(pcFile, "utf8");
    expect(html.match(/data:font\/woff2;base64,/g)?.length).toBe(20);
  });
});

describe("versione telefono (PWA)", () => {
  it("si avvia, mostra la lezione e la schermata di esercizio", async () => {
    const dom = await JSDOM.fromFile(path.join(telefonoDir, "index.html"), {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    await new Promise<void>((resolve) => {
      if (dom.window.document.readyState === "complete") resolve();
      else dom.window.addEventListener("load", () => resolve());
    });
    await settle();
    await expectAppWorks(dom.window.document);
  });

  it("ha un manifest valido, con le icone PNG richieste", () => {
    const manifest = JSON.parse(readFileSync(path.join(telefonoDir, "manifest.webmanifest"), "utf8"));
    expect(manifest.name).toBe("Compasso");
    expect(manifest.lang).toBe("it");
    expect(manifest.display).toBe("standalone");
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      expect(readPngSize(path.join(telefonoDir, icon.src))).toBe(icon.sizes);
    }
    expect(readPngSize(path.join(telefonoDir, "icons", "icon-180.png"))).toBe("180x180");
  });

  it("la pagina collega manifest e icona per iOS", () => {
    const html = readFileSync(path.join(telefonoDir, "index.html"), "utf8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon" href="icons/icon-180.png"');
  });

  it("il service worker salva tutti i file e questi esistono", () => {
    const sw = readFileSync(path.join(telefonoDir, "sw.js"), "utf8");
    const match = sw.match(/\["\.\/"[^\]]*\]/);
    expect(match).not.toBeNull();
    const precache = JSON.parse(match![0]) as string[];
    for (const required of ["./", "index.html", "app.js", "app.css", "manifest.webmanifest"]) {
      expect(precache).toContain(required);
    }
    // Il service worker non salva sé stesso, ma ogni altro file sì.
    expect(precache).not.toContain("sw.js");
    for (const file of precache.filter((f) => f !== "./")) {
      expect(existsSync(path.join(telefonoDir, file)), `manca ${file}`).toBe(true);
    }
    expect(precache.filter((f) => f.endsWith(".woff2")).length).toBe(20);
  });

  it("il CSS cita solo caratteri che esistono nella cartella fonts", () => {
    const css = readFileSync(path.join(telefonoDir, "app.css"), "utf8");
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1] ?? "");
    expect(urls.length).toBe(20);
    for (const url of urls) {
      expect(url).toMatch(/^fonts\/[^/]+\.woff2$/);
      expect(existsSync(path.join(telefonoDir, url)), `manca ${url}`).toBe(true);
    }
  });
});

/** Legge larghezza e altezza dall'intestazione di un PNG. */
function readPngSize(file: string): string {
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}
