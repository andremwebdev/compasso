// Prova end-to-end: compila le due versioni e le avvia. La versione PC (file unico) gira in un DOM
// simulato (jsdom); la versione telefono, fatta di moduli ES caricati a richiesta e di un service
// worker, gira in un Chrome senza finestra con lo schermo di un iPhone XR (test/chrome.ts), anche
// senza rete. Si controlla che l'app parta davvero, che la barra abbia le cinque sezioni, che la
// lezione si apra dal suo file Markdown con le formule disegnate da KaTeX, che la schermata di
// esercizio abbia la tastiera matematica, che non ci siano richieste di rete esterne e che i moduli
// dei contenuti siano file separati, letti solo quando servono.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { moduleCodes } from "../src/moduli/index";
import { Chrome, findChrome, type ChromePage } from "./chrome";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pcFile = path.join(root, "dist", "pc", "compasso.html");
const telefonoDir = path.join(root, "dist", "telefono");

beforeAll(() => {
  execFileSync(process.execPath, [path.join(root, "scripts", "build.mjs")], { cwd: root, stdio: "pipe" });
}, 120_000);

// ───────────────────────────── guida dell'app, uguale per jsdom e Chrome ─────────────────────────────

/** Le azioni sulla pagina: ognuna gira dentro la pagina (jsdom o Chrome) e restituisce un valore semplice. */
interface Ui {
  /** Tocca il primo elemento del selettore che contiene il testo, poi aspetta che l'app abbia finito. */
  click(selector: string, text: string): Promise<void>;
  text(selector: string): Promise<string | null>;
  texts(selector: string): Promise<string[]>;
  count(selector: string): Promise<number>;
  attr(selector: string, name: string): Promise<string | null>;
  value(selector: string): Promise<string | null>;
  disabled(selector: string, text: string): Promise<boolean>;
  exists(selector: string, text: string): Promise<boolean>;
  /** Aspetta i ridisegni in sospeso e la fine di ogni «Caricamento…». */
  settle(): Promise<void>;
}

/** Il codice che si installa nella pagina (testo: deve girare tale e quale anche in Chrome). */
const UI_SOURCE = `window.__ui = {
  find(selector, text) {
    const found = [...document.querySelectorAll(selector)].find((element) => (element.textContent || "").includes(text));
    if (!found) throw new Error("elemento «" + text + "» non trovato (" + selector + ")");
    return found;
  },
  click(selector, text) { this.find(selector, text).click(); return this.settle(); },
  text(selector) { const element = document.querySelector(selector); return element ? element.textContent : null; },
  texts(selector) { return [...document.querySelectorAll(selector)].map((element) => element.textContent); },
  count(selector) { return document.querySelectorAll(selector).length; },
  attr(selector, name) { const element = document.querySelector(selector); return element ? element.getAttribute(name) : null; },
  value(selector) { const element = document.querySelector(selector); return element ? element.value : null; },
  disabled(selector, text) { return this.find(selector, text).disabled; },
  exists(selector, text) { try { this.find(selector, text); return true; } catch { return false; } },
  settle() {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => (document.querySelector(".loading") && Date.now() - start < 10000 ? setTimeout(tick, 20) : setTimeout(() => resolve(null), 30));
      setTimeout(tick, 30);
    });
  },
};`;

/** Una guida sopra una funzione che valuta un'espressione nella pagina. */
function makeUi(evaluate: (expression: string) => Promise<unknown>): Ui {
  const call = <T>(method: string, ...args: string[]): Promise<T> =>
    evaluate(`(() => { if (!window.__ui) { ${UI_SOURCE} } return window.__ui.${method}(${args.map((arg) => JSON.stringify(arg)).join(", ")}); })()`) as Promise<T>;
  return {
    click: async (selector, text) => {
      await call("click", selector, text);
    },
    text: (selector) => call("text", selector),
    texts: (selector) => call("texts", selector),
    count: (selector) => call("count", selector),
    attr: (selector, name) => call("attr", selector, name),
    value: (selector) => call("value", selector),
    disabled: (selector, text) => call("disabled", selector, text),
    exists: (selector, text) => call("exists", selector, text),
    settle: async () => {
      await call("settle");
    },
  };
}

const jsdomUi = (dom: JSDOM): Ui => makeUi(async (expression) => dom.window.eval(expression) as unknown);
const chromeUi = (page: ChromePage): Ui => makeUi((expression) => page.evaluate(expression));

/** Controlli comuni alle due versioni, sull'app già avviata: avvio, lezione, esercizio. */
async function expectAppWorks(ui: Ui) {
  const labels = await ui.texts("nav.tab-bar button");
  expect(labels).toEqual(["Oggi", "Teoria", "Esercizi", "Test", "Tu"]);
  expect((await ui.text('nav.tab-bar button[aria-current="page"]'))).toBe("Oggi");

  // Oggi: durata da scegliere, binario e lezione del giorno; la sessione parte dalla lezione (niente da ripassare).
  expect(await ui.texts(".choice-item")).toEqual(["20 min", "40 min", "60 min"]);
  expect((await ui.text('.choice-item[aria-checked="true"]'))).toBe("40 min");
  expect((await ui.text("main"))).toContain("Fondamenta");
  await ui.click(".choice-item", "20 min");
  await ui.click("main button", "Inizia la sessione");
  expect((await ui.text(".phase-current"))).toContain("Lezione nuova");
  // La lezione del giorno è la prima lezione scritta del binario Fondamenta.
  expect((await ui.text(".lesson-header h1"))).toBe("Insiemi");
  // Si esce dalla lezione del giorno senza perdere nulla, e si riprende dallo stesso punto.
  await ui.click("main button", "Esci e riprendi dopo");
  expect((await ui.text("main"))).toContain("Sessione in pausa");
  expect((await ui.text("main"))).toContain("Lezione nuova");
  await ui.click("main button", "Riprendi la sessione");
  expect((await ui.text(".phase-current"))).toContain("Lezione nuova");

  // Teoria → volume → modulo → la lezione, letta dal file Markdown: titolo, riquadri, formule.
  await ui.click("nav.tab-bar button", "Teoria");
  await ui.click(".card-link", "Fondamenta");
  await ui.click(".card-link", "V1.M06");
  // Le lezioni non ancora scritte ci sono, come «in arrivo».
  expect((await ui.text(".card-coming"))).toContain("In arrivo");
  await ui.click(".card-link", "Disequazioni fratte");
  // I prerequisiti mancanti sono segnalati, ma la lezione si apre.
  expect((await ui.text(".notice"))).toContain("Prerequisiti non ancora fatti");
  expect((await ui.text(".lesson-header h1"))).toBe("Disequazioni fratte");
  expect((await ui.text(".box-definition .box-label"))).toContain("Definizione");
  expect((await ui.text(".box-warning .box-label"))).toContain("Attenzione");
  expect((await ui.count(".lesson .formula .katex"))).toBeGreaterThan(10);
  expect(await ui.count(".katex-error")).toBe(0);
  // Si vede solo il primo tratto, che finisce con una domanda lampo: senza risposta non si continua.
  expect((await ui.count(".box-question"))).toBe(1);
  expect(await ui.count(".box-example")).toBe(0);
  expect(await ui.disabled(".lesson-footer button", "Continua")).toBe(true);
  await ui.click(".box-question .option", "stesso segno");
  await ui.click(".box-question button", "Conferma");
  expect((await ui.text(".box-question .verdict-title"))).toContain("Giusta");
  await ui.click(".lesson-footer button", "Continua");
  expect(await ui.count(".box-example")).toBeGreaterThan(0);
  expect((await ui.text(".lesson-position"))).toContain("Tratto 2 di 5");

  // Esercizi: tre schede; le flashcard della lezione; poi disequazioni fratte con la difficoltà
  // automatica (abilità nuova: livello 1): campo, anteprima, tastiera; «Non lo so» mostra la soluzione.
  await ui.click("nav.tab-bar button", "Esercizi");
  expect(await ui.texts(".tabs-item")).toEqual(["Esercizi", "Flashcard", "Dimostrazioni"]);
  await ui.click(".tabs-item", "Flashcard");
  expect((await ui.text("main"))).toContain("4 flashcard");
  await ui.click(".tabs-item", "Esercizi");
  await ui.click(".list-row", "Disequazioni fratte");
  expect((await ui.text(".series-position"))).toContain("livello 1 (automatico)");
  expect(await ui.count(".exercise-prompt .katex")).toBeGreaterThan(0);
  expect((await ui.attr(".answer-input", "inputmode"))).toBe("none");
  expect((await ui.text('.keyboard-level[aria-selected="true"]'))).toBe("Insiemi");
  for (const label of ["x", "≥", "1"]) await ui.click(".keyboard-keys .key", label);
  expect((await ui.value(".answer-input"))).toBe("x ≥ 1");
  expect(await ui.count(".preview .katex")).toBeGreaterThan(0);
  await ui.click(".exercise-actions button", "Indizio 1 di 2");
  expect((await ui.count(".hints li"))).toBe(1);
  await ui.click(".exercise-actions button", "Non lo so");
  expect((await ui.text(".verdict-title"))).toContain("Non data");
  expect((await ui.count(".steps li"))).toBeGreaterThan(3);
  expect(await ui.count(".steps .katex")).toBeGreaterThan(0);
  expect(await ui.exists(".exercise-actions button", "Esercizio simile")).toBe(true);
  expect(await ui.exists(".exercise-actions button", "Torna alla lezione")).toBe(true);

  // Tu → il registro ha la domanda lampo e l'esercizio; la lezione risulta cominciata.
  await ui.click("nav.tab-bar button", "Tu");
  expect((await ui.text("main"))).toContain("Tentativi nel registro: 2");
  expect((await ui.text("main"))).toContain("Versione dei dati: 3");
  // Tu: serie, padronanza, diario, impostazioni, backup.
  const tu = (await ui.text("main")) ?? "";
  for (const title of ["Serie di giorni", "Padronanza", "Diario degli errori", "Impostazioni", "Backup"]) expect(tu).toContain(title);
  for (const label of ["Esporta", "Importa", "Unisci"]) expect(await ui.exists(".exercise-actions button", label)).toBe(true);
  // Il diario si apre, e il pulsante in alto (la cronologia) riporta indietro.
  await ui.click("main button", "Apri il diario");
  expect((await ui.text(".lesson-header h1"))).toBe("Diario degli errori");
  await ui.click("main button.back", "Tu");
  expect((await ui.text("main h1"))).toBe("Tu");
  // Test: per ora «in arrivo».
  await ui.click("nav.tab-bar button", "Test");
  expect((await ui.text("main"))).toContain("Simulazione del TOL");
}

describe("versione PC (file unico)", () => {
  it("si avvia, mostra la lezione e la schermata di esercizio", async () => {
    const html = readFileSync(pcFile, "utf8");
    const dom = new JSDOM(html, { runScripts: "dangerously", url: "file:///compasso.html", pretendToBeVisual: true });
    const ui = jsdomUi(dom);
    await ui.settle();
    await expectAppWorks(ui);
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

  it("incorpora i caratteri di KaTeX e dell'interfaccia (funziona offline)", () => {
    const html = readFileSync(pcFile, "utf8");
    // 20 di KaTeX più 4 dell'interfaccia (Plex Sans 400, 400 corsivo, 600; Plex Mono 400).
    expect(html.match(/data:font\/woff2;base64,/g)?.length).toBe(24);
  });
});

describe("versione telefono (PWA)", () => {
  it("i moduli dei contenuti sono file separati, e l'avvio non ne contiene nessuno", () => {
    const files = ["v1", "v2", "v3"].flatMap((volume) => readdirSync(path.join(telefonoDir, "moduli", volume)).map((name) => `${volume}/${name}`));
    expect(files.sort()).toEqual(moduleCodes.map((code) => `${code.toLowerCase().replace(".", "/")}.js`).sort());
    const app = readFileSync(path.join(telefonoDir, "app.js"), "utf8");
    const m06 = readFileSync(path.join(telefonoDir, "moduli", "v1", "m06.js"), "utf8");
    const m09 = readFileSync(path.join(telefonoDir, "moduli", "v2", "m09.js"), "utf8");
    // Il testo della lezione e il codice dei generatori sono nel file del loro modulo, non altrove.
    const generatorText = "Risolvi la disequazione";
    const lessonText = "in cui l'incognita compare in almeno un denominatore";
    expect(m06).toContain(generatorText);
    expect(m06).toContain(lessonText);
    expect(m09).toContain("V2.M09.A01.g1");
    const others = [app, ...readdirSync(path.join(telefonoDir, "chunks")).map((name) => readFileSync(path.join(telefonoDir, "chunks", name), "utf8"))];
    for (const text of others) {
      expect(text).not.toContain(generatorText);
      expect(text).not.toContain(lessonText);
    }
    // app.js li chiede con import(), uno per modulo.
    for (const code of moduleCodes) expect(app).toContain(`./moduli/${code.toLowerCase().replace(".", "/")}.js`);
    // La pagina avvia app.js come modulo ES.
    expect(readFileSync(path.join(telefonoDir, "index.html"), "utf8")).toContain('<script type="module" src="app.js"></script>');
  });

  it("il file PC resta unico e contiene tutti i moduli", () => {
    const html = readFileSync(pcFile, "utf8");
    expect(html).toContain("in cui l'incognita compare in almeno un denominatore");
    expect(html).toContain("V2.M09.A01.g1");
    expect(html).not.toContain("moduli/v1/m06.js");
  });

  describe("in Chrome con lo schermo di un iPhone XR", () => {
    const executable = findChrome();
    // Su GitHub Chrome c'è sempre: lì la prova non si salta mai.
    if (!executable && process.env.CI) throw new Error("Chrome non trovato: imposta CHROME_PATH");
    const maybe = executable ? it : it.skip;
    if (!executable) console.warn("Chrome non trovato (CHROME_PATH): prova della versione telefono saltata in locale.");

    let server: Server;
    let base = "";
    let chrome: Chrome | null = null;

    beforeAll(async () => {
      server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const file = path.join(telefonoDir, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
        if (!file.startsWith(telefonoDir) || !existsSync(file)) {
          response.writeHead(404).end();
          return;
        }
        const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2" };
        response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
      if (executable) chrome = await Chrome.launch(executable);
    }, 60_000);

    afterAll(async () => {
      await chrome?.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    });

    /** I file dei moduli che la pagina ha letto finora. */
    const loadedModuleFiles = (page: ChromePage): Promise<string[]> =>
      page.evaluate('[...new Set(performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("/moduli/")).map((name) => name.slice(name.indexOf("moduli/"))))].sort()');

    maybe(
      "si avvia senza leggere i moduli, li legge uno alla volta, e funziona offline",
      async () => {
        const page = await chrome!.newPage();
        const ui = chromeUi(page);
        await page.goto(base);
        await ui.settle();
        expect(await page.evaluate("innerWidth")).toBe(414);
        // Avvio: la pagina Oggi c'è, e nessun modulo dei contenuti è stato letto.
        expect(await ui.texts("nav.tab-bar button")).toEqual(["Oggi", "Teoria", "Esercizi", "Test", "Tu"]);
        expect(await loadedModuleFiles(page)).toEqual([]);

        // Il service worker ha salvato tutti i file, moduli compresi.
        const saved = await page.evaluate<string[]>(
          'navigator.serviceWorker.ready.then(async () => { const name = (await caches.keys()).find((key) => key.startsWith("compasso-")); const cache = await caches.open(name); return (await cache.keys()).map((request) => new URL(request.url).pathname.slice(1)); })',
        );
        for (const code of moduleCodes) expect(saved).toContain(`moduli/${code.toLowerCase().replace(".", "/")}.js`);

        // Lo stesso percorso della versione PC: usa solo i moduli V1.M01 (lezione del giorno) e V1.M06 (lezione e disequazioni fratte).
        await expectAppWorks(ui);
        expect(await loadedModuleFiles(page)).toEqual(["moduli/v1/m01.js", "moduli/v1/m06.js"]);

        // Senza rete: il server si spegne, la pagina si riapre dal service worker.
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await page.reload();
        await ui.settle();
        expect(await page.evaluate("navigator.serviceWorker.controller !== null")).toBe(true);
        expect(await ui.text('nav.tab-bar button[aria-current="page"]')).toBe("Oggi");
        // La lezione, offline.
        await ui.click("nav.tab-bar button", "Teoria");
        await ui.click(".card-link", "Fondamenta");
        await ui.click(".card-link", "V1.M06");
        await ui.click(".card-link", "Disequazioni fratte");
        expect(await ui.text(".lesson-header h1")).toBe("Disequazioni fratte");
        expect(await ui.count(".lesson .formula .katex")).toBeGreaterThan(10);
        // Un esercizio di un altro modulo, mai aperto prima: il suo file arriva dalla copia salvata.
        await ui.click("nav.tab-bar button", "Esercizi");
        await ui.click(".list-row", "Derivate");
        expect(await ui.count(".exercise-prompt .katex")).toBeGreaterThan(0);
        expect(await ui.count(".katex-error")).toBe(0);
        expect(await loadedModuleFiles(page)).toEqual(["moduli/v1/m06.js", "moduli/v2/m06.js"]);
      },
      120_000,
    );

    maybe(
      "dopo una nuova pubblicazione l'app avvisa, si aggiorna con «Aggiorna» e i dati salvati restano",
      async () => {
        // Due pubblicazioni: A è la compilazione vera, B la stessa con una lezione cambiata
        // (titolo nuovo) e quindi un sw.js con una versione nuova.
        const work = mkdtempSync(path.join(tmpdir(), "compasso-pubblicazioni-"));
        const dirA = path.join(work, "a");
        const dirB = path.join(work, "b");
        cpSync(telefonoDir, dirA, { recursive: true });
        cpSync(telefonoDir, dirB, { recursive: true });
        const oldTitle = "Disequazioni fratte";
        const newTitle = "Disequazioni fratte, edizione nuova";
        // Il titolo sta nell'indice (app.js), nel programma (codice comune) e nel file del modulo.
        const changed = readdirSync(dirB, { recursive: true, encoding: "utf8" }).filter((file) => {
          if (!file.endsWith(".js") || file === "sw.js") return false;
          const text = readFileSync(path.join(dirB, file), "utf8");
          if (!text.includes(oldTitle)) return false;
          writeFileSync(path.join(dirB, file), text.replaceAll(oldTitle, newTitle));
          return true;
        });
        expect(changed).toContain("app.js");
        expect(changed).toContain(path.join("moduli", "v1", "m06.js"));
        const swA = readFileSync(path.join(dirA, "sw.js"), "utf8");
        const versionA = [...new Set([...swA.matchAll(/"([0-9a-f]{12})"/g)].map((match) => match[1]))];
        expect(versionA).toHaveLength(1);
        writeFileSync(path.join(dirB, "sw.js"), swA.replaceAll(`"${versionA[0]}"`, '"b00000000000"'));
        writeFileSync(
          path.join(dirB, "index.html"),
          readFileSync(path.join(dirB, "index.html"), "utf8").replace("<head>", '<head>\n<meta name="pubblicazione" content="B">'),
        );

        // Il sito: risponde dalla pubblicazione corrente, con la cache HTTP di GitHub Pages (10 minuti).
        let current = dirA;
        const site = createServer((request, response) => {
          const url = new URL(request.url ?? "/", "http://localhost");
          const file = path.join(current, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
          if (!file.startsWith(current) || !existsSync(file)) {
            response.writeHead(404).end();
            return;
          }
          const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2" };
          response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "max-age=600" }).end(readFileSync(file));
        });
        await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", () => resolve()));
        const siteBase = `http://127.0.0.1:${(site.address() as AddressInfo).port}/`;

        /** Aspetta che un'espressione nella pagina diventi vera (anche attraverso una ricarica). */
        const waitFor = async (page: ChromePage, expression: string, what: string) => {
          const start = Date.now();
          while (Date.now() - start < 20_000) {
            try {
              if (await page.evaluate<boolean>(expression)) return;
            } catch {
              // pagina in ricarica: si riprova
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error(`non arriva: ${what}`);
        };
        /** Tutto quello che c'è in IndexedDB (i dati di Andrea), magazzino per magazzino. */
        const savedData = (page: ChromePage) =>
          page.evaluate<Record<string, unknown[]>>(`new Promise((resolve, reject) => {
            const request = indexedDB.open("compasso");
            request.onerror = () => reject(request.error);
            request.onsuccess = async () => {
              const db = request.result;
              const out = {};
              for (const name of [...db.objectStoreNames]) {
                out[name] = await new Promise((done) => { const r = db.transaction(name).objectStore(name).getAll(); r.onsuccess = () => done(r.result); });
              }
              db.close();
              resolve(out);
            };
          })`);
        const cacheNames = (page: ChromePage) => page.evaluate<string[]>("caches.keys()");
        const banner = '[...document.querySelectorAll(".update-banner")].some((element) => element.textContent.includes("Versione nuova disponibile"))';

        try {
          const page = await chrome!.newPage();
          const ui = chromeUi(page);
          await page.goto(siteBase);
          await ui.settle();
          await waitFor(page, "navigator.serviceWorker.controller !== null", "il service worker della pubblicazione A");
          expect(await cacheNames(page)).toEqual([`compasso-${versionA[0]}`]);
          expect(await page.evaluate(banner)).toBe(false);

          // Andrea studia: una lezione cominciata, un esercizio nel registro.
          await ui.click("nav.tab-bar button", "Teoria");
          await ui.click(".card-link", "Fondamenta");
          await ui.click(".card-link", "V1.M06");
          await ui.click(".card-link", oldTitle);
          await ui.click(".box-question .option", "stesso segno");
          await ui.click(".box-question button", "Conferma");
          await ui.click(".lesson-footer button", "Continua");
          await ui.click("nav.tab-bar button", "Esercizi");
          await ui.click(".list-row", oldTitle);
          await ui.click(".exercise-actions button", "Non lo so");
          await ui.click("nav.tab-bar button", "Tu");
          expect(await ui.text("main")).toContain("Tentativi nel registro: 2");
          const before = await savedData(page);
          expect(before.attempts).toHaveLength(2);
          expect(before.lessons?.length).toBeGreaterThan(0);

          // Nuova pubblicazione. L'app torna in primo piano: controlla, scarica B e avvisa.
          current = dirB;
          await page.evaluate('document.dispatchEvent(new Event("visibilitychange")), true');
          await waitFor(page, banner, "l'avviso dopo il ritorno in primo piano");
          // Finché Andrea non tocca «Aggiorna», resta la versione A, intera.
          expect(await page.evaluate("document.querySelector('meta[name=pubblicazione]') === null")).toBe(true);
          expect((await cacheNames(page)).sort()).toEqual(["compasso-b00000000000", `compasso-${versionA[0]}`].sort());

          // Riaprendo l'app (senza aver aggiornato) l'avviso c'è di nuovo, subito.
          await page.reload();
          await ui.settle();
          await waitFor(page, banner, "l'avviso alla riapertura");
          expect(await page.evaluate("document.querySelector('meta[name=pubblicazione]') === null")).toBe(true);

          // «Aggiorna»: la versione B prende il comando e la pagina si ricarica da sola.
          await page.evaluate('[...document.querySelectorAll(".update-banner button")].find((b) => b.textContent.includes("Aggiorna")).click(), true');
          await waitFor(page, "document.readyState === 'complete' && document.querySelector('meta[name=pubblicazione]') !== null", "la pagina della pubblicazione B");
          await ui.settle();
          expect(await page.evaluate(banner)).toBe(false);
          // La copia vecchia è cancellata solo ora, dopo che la nuova è pronta e attiva.
          expect(await cacheNames(page)).toEqual(["compasso-b00000000000"]);

          // La lezione nuova c'è, e si apre dal file del modulo nuovo.
          await ui.click("nav.tab-bar button", "Teoria");
          await ui.click(".card-link", "Fondamenta");
          await ui.click(".card-link", "V1.M06");
          await ui.click(".card-link", newTitle);
          expect(await ui.text(".lesson-header h1")).toBe(newTitle);

          // I dati salvati sono gli stessi di prima, uno per uno.
          await ui.click("nav.tab-bar button", "Tu");
          expect(await ui.text("main")).toContain("Tentativi nel registro: 2");
          const after = await savedData(page);
          expect(after.attempts).toEqual(before.attempts);
          expect(after.lessons).toEqual(before.lessons);
          expect(after.checks).toEqual(before.checks);
          expect(after.reviews).toEqual(before.reviews);
        } finally {
          site.closeAllConnections();
          await new Promise((resolve) => site.close(resolve));
          rmSync(work, { recursive: true, force: true });
        }
      },
      120_000,
    );
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
    expect(precache.filter((f) => f.endsWith(".woff2")).length).toBe(24);
  });

  it("il CSS cita solo caratteri che esistono nella cartella fonts", () => {
    const css = readFileSync(path.join(telefonoDir, "app.css"), "utf8");
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1] ?? "");
    expect(urls.length).toBe(24);
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
