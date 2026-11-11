// Prova end-to-end: compila le due versioni e le avvia in un DOM simulato (jsdom).
// Controlla che l'app parta davvero, che la barra abbia le cinque sezioni, che la formula
// KaTeX venga disegnata e che non ci siano richieste di rete esterne.

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

/** Controlli comuni alle due versioni, sul documento già avviato. */
function expectAppStarted(doc: Document) {
  const labels = [...doc.querySelectorAll("nav.tab-bar button")].map((b) => b.textContent);
  expect(labels).toEqual(["Oggi", "Teoria", "Esercizi", "Test", "Tu"]);
  expect(doc.querySelector(".formula .katex")).not.toBeNull();
  expect(doc.querySelector('nav.tab-bar button[aria-current="page"]')?.textContent).toBe("Oggi");
}

describe("versione PC (file unico)", () => {
  it("si avvia e disegna la formula", () => {
    const html = readFileSync(pcFile, "utf8");
    const dom = new JSDOM(html, { runScripts: "dangerously", url: "file:///compasso.html" });
    expectAppStarted(dom.window.document);
  });

  it("è davvero un file unico, senza riferimenti esterni", () => {
    const html = readFileSync(pcFile, "utf8");
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelectorAll("script[src], link[href], img[src], iframe[src]").length).toBe(0);
    expect(html).not.toMatch(/@import/);
    // Ogni url() nel CSS deve essere un dato incorporato.
    const urls = [...html.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1] ?? "");
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u) => !u.startsWith("data:"))).toEqual([]);
  });

  it("incorpora i caratteri di KaTeX (funziona offline)", () => {
    const html = readFileSync(pcFile, "utf8");
    expect(html.match(/data:font\/woff2;base64,/g)?.length).toBe(20);
  });
});

describe("versione telefono (PWA)", () => {
  it("si avvia e disegna la formula", async () => {
    const dom = await JSDOM.fromFile(path.join(telefonoDir, "index.html"), {
      runScripts: "dangerously",
      resources: "usable",
    });
    await new Promise<void>((resolve) => {
      if (dom.window.document.readyState === "complete") resolve();
      else dom.window.addEventListener("load", () => resolve());
    });
    expectAppStarted(dom.window.document);
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
