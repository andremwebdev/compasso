// Le visualizzazioni non ancora inserite in una lezione vera, in una lezione di prova
// (anteprima/visualizzazioni-prova.md), come le userebbe Andrea: Chrome senza finestra, schermo da
// telefono con il tocco, nei due temi, a 414 px (iPhone XR) e a 320 px, senza rete. Per ognuna: dentro
// lo schermo senza scorrimento orizzontale, aree di tocco da 44 px, colori dal tema, nessun errore; poi
// le maniglie trascinate col dito e i comandi toccati cambiano quello che devono cambiare.
// Con COMPASSO_FOTO=cartella le fotografie finiscono lì.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Chrome, findChrome, type ChromePage } from "../chrome";
import { previewPage } from "./anteprima/pagina";

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Il rettangolo del primo elemento che corrisponde al selettore dentro la visualizzazione `vis`. */
const box = (page: ChromePage, vis: string, selector: string): Promise<Box> =>
  page.evaluate<Box>(
    `(() => { const r = document.querySelector(${JSON.stringify(vis)}).querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
  );

/** Il LaTeX della prima formula che corrisponde al selettore dentro la visualizzazione `vis`. */
const latex = (page: ChromePage, vis: string, selector: string): Promise<string> =>
  page.evaluate<string>(`document.querySelector(${JSON.stringify(vis)}).querySelector(${JSON.stringify(selector)} + " annotation")?.textContent ?? ""`);

/** Trascina col dito da (x, y) di (dx, dy) pixel, a piccoli passi. */
async function drag(page: ChromePage, x: number, y: number, dx: number, dy: number): Promise<void> {
  await page.touch("start", x, y);
  for (let step = 1; step <= 8; step++) {
    await page.touch("move", x + (dx * step) / 8, y + (dy * step) / 8);
    await pause(20);
  }
  await page.touch("end", x + dx, y + dy);
  await pause(80);
}

/** Trascina col dito il centro della maniglia (il suo segno visibile) e controlla che la pagina non scorra. */
async function dragHandle(page: ChromePage, vis: string, selector: string, dx: number, dy: number): Promise<void> {
  await page.evaluate(`document.querySelector(${JSON.stringify(vis)}).querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center", behavior: "instant" })`);
  await pause(60);
  const scrollBefore = await page.evaluate<number>("scrollY");
  const grip = await box(page, vis, selector);
  await drag(page, grip.x + grip.width / 2, grip.y + grip.height / 2, dx, dy);
  expect(await page.evaluate<number>("scrollY"), "la pagina non scorre mentre si trascina").toBe(scrollBefore);
}

/** Il colore calcolato di una variabile del tema, nella stessa forma di getComputedStyle. */
const themeColor = (name: string) =>
  `(() => { const probe = document.createElement("i"); probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim(); document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; })()`;

/** Le visualizzazioni della lezione di prova, nell'ordine: il selettore del loro contenitore. */
const VIS = {
  transforms: ".vis:has(.vis-trasformazioni)",
} as const;

describe("visualizzazioni in Chrome (lezione di prova)", () => {
  const executable = findChrome();
  if (!executable && process.env.CI) throw new Error("Chrome non trovato: imposta CHROME_PATH");
  const maybe = executable ? it : it.skip;
  if (!executable) console.warn("Chrome non trovato (CHROME_PATH): prova delle visualizzazioni saltata in locale.");

  let chrome: Chrome | null = null;
  let folder = "";
  let url = "";

  beforeAll(async () => {
    folder = mkdtempSync(path.join(tmpdir(), "compasso-vis-prova-"));
    const file = path.join(folder, "prova.html");
    writeFileSync(file, await previewPage("test/app/anteprima/visualizzazioni-prova.tsx"));
    url = pathToFileURL(file).href;
    if (executable) chrome = await Chrome.launch(executable);
  }, 60_000);

  afterAll(async () => {
    await chrome?.close();
    rmSync(folder, { recursive: true, force: true });
  });

  const cases = [414, 320].flatMap((width) => (["light", "dark"] as const).map((theme) => [width, theme] as const));

  maybe.each(cases)(
    "a %i px, tema %s: dentro lo schermo, col dito e con i comandi, colori dal tema",
    async (width, theme) => {
      const page = await chrome!.newPage(width, 896);
      await page.goOffline();
      await page.goto(`${url}#${theme}`);
      await pause(100);

      // Tutte insieme: niente errori, niente rete, niente scorrimento orizzontale, aree di tocco grandi.
      const layout = await page.evaluate<{
        scroll: number; visCount: number; problems: number; katexErrors: number; external: string[];
        boxes: { base: Box; over: Box; box: Box }[]; grips: number[]; buttons: number[]; sliders: number[];
      }>(`(() => {
        const rect = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return {
          scroll: document.documentElement.scrollWidth,
          visCount: document.querySelectorAll(".vis").length,
          problems: document.querySelectorAll("[role=alert]").length,
          katexErrors: document.querySelectorAll(".katex-error").length,
          external: performance.getEntriesByType("resource").map((e) => e.name).filter((name) => !name.startsWith("data:") && !name.startsWith("file:")),
          boxes: [...document.querySelectorAll(".vis")].map((vis) => ({ base: rect(vis.querySelector(".vis-piano .grafico-disegno svg")), over: rect(vis.querySelector(".vis-sopra")), box: rect(vis) })),
          grips: [...document.querySelectorAll(".vis-presa")].map((node) => node.getBoundingClientRect().width),
          buttons: [...document.querySelectorAll(".vis-pulsante")].map((node) => node.getBoundingClientRect().height),
          sliders: [...document.querySelectorAll(".vis-cursore input")].map((node) => node.getBoundingClientRect().height),
        };
      })()`);
      expect(layout.visCount).toBe(Object.keys(VIS).length);
      expect(layout.problems).toBe(0);
      expect(layout.katexErrors).toBe(0);
      expect(layout.external).toEqual([]);
      expect(layout.scroll, "scorrimento orizzontale").toBeLessThanOrEqual(width);
      for (const { base, over, box: frame } of layout.boxes) {
        // Il disegno che si muove sta esattamente sopra quello di base, dentro il riquadro.
        expect(Math.abs(over.x - base.x)).toBeLessThan(0.5);
        expect(Math.abs(over.width - base.width)).toBeLessThan(0.5);
        expect(Math.abs(over.height - base.height)).toBeLessThan(0.5);
        expect(base.x + base.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5);
      }
      for (const size of [...layout.grips, ...layout.buttons, ...layout.sliders]) expect(size).toBeGreaterThanOrEqual(43.5);

      // ── VIS.trasformazioni-funzioni: c = 1 all'inizio; P' trascinato di 2 unità a destra e 1 in basso.
      {
        const vis = VIS.transforms;
        expect(await latex(page, vis, ".vis-formula")).toBe(String.raw`y = \left(x - 1\right)^{2}`);
        const colors = await page.evaluate<{ curve: string; blue: string; grip: string; orange: string }>(`({
          curve: getComputedStyle(document.querySelector("${vis} .vis-curva-trasformata")).stroke, blue: ${themeColor("--blu")},
          grip: getComputedStyle(document.querySelector("${vis} .vis-maniglia-segno")).fill, orange: ${themeColor("--arancio")},
        })`);
        expect(colors.curve).toBe(colors.blue);
        expect(colors.grip).toBe(colors.orange);
        const unit = (await box(page, vis, ".vis-piano .grafico-disegno svg")).width / 320 * (308 / 12); // pixel per unità di x
        await dragHandle(page, vis, ".vis-maniglia-punto .vis-maniglia-segno", 2 * unit, (228 / 8) * (unit / (308 / 12)));
        expect(await latex(page, vis, ".vis-formula")).toBe(String.raw`y = \left(x - 3\right)^{2} - 1`);
        expect(await page.evaluate<string>(`document.querySelector("${vis} .vis-passi").textContent`)).toContain("verso destra");
        // Un pulsante: la funzione 1/x, con il suo asintoto spostato.
        await page.evaluate(`document.querySelectorAll("${vis} .vis-pulsante")[3].click()`);
        await pause(50);
        expect(await latex(page, vis, ".vis-formula")).toBe(String.raw`y = \frac{1}{x - 3} - 1`);
        expect(await page.evaluate<number>(`document.querySelectorAll("${vis} .vis-sopra .vis-asintoto").length`)).toBe(1);
      }

      expect(await page.evaluate<number>("document.documentElement.scrollWidth")).toBeLessThanOrEqual(width);
      if (process.env.COMPASSO_FOTO) {
        mkdirSync(process.env.COMPASSO_FOTO, { recursive: true });
        for (const [name, selector] of Object.entries(VIS)) {
          await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "start", behavior: "instant" })`);
          await pause(60);
          writeFileSync(path.join(process.env.COMPASSO_FOTO, `vis-${name}-${width}-${theme}.png`), await page.screenshot());
        }
      }
    },
    90_000,
  );
});
