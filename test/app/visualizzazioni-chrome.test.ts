// Le visualizzazioni come le usa Andrea: la lezione vera V1.M06.L04 con VIS.disequazioni-grafico, in
// Chrome senza finestra, schermo da telefono con il tocco, nei due temi, a 414 px (iPhone XR) e a
// 320 px, senza rete. Si trascina col dito la retta e la sonda, si toccano pulsanti e cursori, e si
// controlla che tutto si aggiorni, che le aree di tocco siano grandi abbastanza, che il disegno stia
// nello schermo e prenda i colori dal tema. Con COMPASSO_FOTO=cartella le fotografie finiscono lì.

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

/** Il rettangolo (coordinate della pagina visibile) del primo elemento che corrisponde al selettore. */
const box = (page: ChromePage, selector: string): Promise<Box> =>
  page.evaluate<Box>(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);

const read = (page: ChromePage, selector: string): Promise<string> =>
  page.evaluate<string>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ""`);

/** La soluzione mostrata, come LaTeX (dall'annotazione di KaTeX). */
const solution = (page: ChromePage): Promise<string> => read(page, ".vis-soluzione annotation");

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Trascina col dito da (x, y) di `dy` pixel in verticale e `dx` in orizzontale, a piccoli passi. */
async function drag(page: ChromePage, x: number, y: number, dx: number, dy: number): Promise<void> {
  await page.touch("start", x, y);
  for (let step = 1; step <= 8; step++) {
    await page.touch("move", x + (dx * step) / 8, y + (dy * step) / 8);
    await pause(20);
  }
  await page.touch("end", x + dx, y + dy);
  await pause(80);
}

describe("visualizzazioni in Chrome (lezione V1.M06.L04)", () => {
  const executable = findChrome();
  if (!executable && process.env.CI) throw new Error("Chrome non trovato: imposta CHROME_PATH");
  const maybe = executable ? it : it.skip;
  if (!executable) console.warn("Chrome non trovato (CHROME_PATH): prova delle visualizzazioni saltata in locale.");

  let chrome: Chrome | null = null;
  let folder = "";
  let url = "";

  beforeAll(async () => {
    folder = mkdtempSync(path.join(tmpdir(), "compasso-vis-"));
    const file = path.join(folder, "prova.html");
    writeFileSync(file, await previewPage("test/app/anteprima/visualizzazioni.tsx"));
    url = pathToFileURL(file).href;
    if (executable) chrome = await Chrome.launch(executable);
  }, 60_000);

  afterAll(async () => {
    await chrome?.close();
    rmSync(folder, { recursive: true, force: true });
  });

  const cases = [414, 320].flatMap((width) => (["light", "dark"] as const).map((theme) => [width, theme] as const));

  maybe.each(cases)(
    "a %i px, tema %s: col dito e con i cursori, dentro lo schermo, colori dal tema",
    async (width, theme) => {
      const page = await chrome!.newPage(width, 896);
      await page.goOffline();
      await page.goto(`${url}#${theme}`);
      // La visualizzazione al centro dello schermo, come quando Andrea ci arriva leggendo.
      await page.evaluate(`document.querySelector(".vis").scrollIntoView({ block: "center" })`);
      await pause(100);

      const layout = await page.evaluate<{
        scroll: number; visCount: number; problems: number; katexErrors: number; external: string[];
        base: Box; over: Box; box: Box; grips: number[]; buttons: number[]; sliders: number[];
        lineColor: string; orange: string; barColor: string; green: string;
      }>(`(() => {
        const rect = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const rgb = (value) => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; };
        const style = getComputedStyle(document.documentElement);
        return {
          scroll: document.documentElement.scrollWidth,
          visCount: document.querySelectorAll(".vis").length,
          problems: document.querySelectorAll(".vis [role=alert]").length,
          katexErrors: document.querySelectorAll(".katex-error").length,
          external: performance.getEntriesByType("resource").map((e) => e.name).filter((name) => !name.startsWith("data:") && !name.startsWith("file:")),
          base: rect(document.querySelector(".vis-piano .grafico-disegno svg")),
          over: rect(document.querySelector(".vis-sopra")),
          box: rect(document.querySelector(".vis")),
          grips: [...document.querySelectorAll(".vis-presa")].map((node) => node.getBoundingClientRect().width),
          buttons: [...document.querySelectorAll(".vis-pulsante")].map((node) => node.getBoundingClientRect().height),
          sliders: [...document.querySelectorAll(".vis-cursore input")].map((node) => node.getBoundingClientRect().height),
          lineColor: getComputedStyle(document.querySelector(".vis-soglia")).stroke,
          orange: rgb(style.getPropertyValue("--arancio").trim()),
          barColor: getComputedStyle(document.querySelector(".vis-barra")).stroke,
          green: rgb(style.getPropertyValue("--ese").trim()),
        };
      })()`);

      expect(layout.visCount).toBe(1);
      expect(layout.problems).toBe(0);
      expect(layout.katexErrors).toBe(0);
      expect(layout.external).toEqual([]);
      expect(layout.scroll, "scorrimento orizzontale").toBeLessThanOrEqual(width);
      // Il disegno che si muove sta esattamente sopra il grafico di base, dentro il riquadro.
      expect(Math.abs(layout.over.x - layout.base.x)).toBeLessThan(0.5);
      expect(Math.abs(layout.over.width - layout.base.width)).toBeLessThan(0.5);
      expect(Math.abs(layout.over.height - layout.base.height)).toBeLessThan(0.5);
      expect(layout.base.x + layout.base.width).toBeLessThanOrEqual(layout.box.x + layout.box.width + 0.5);
      // Aree di tocco da almeno 44 px: maniglie, pulsanti, cursori.
      for (const size of [...layout.grips, ...layout.buttons, ...layout.sliders]) expect(size).toBeGreaterThanOrEqual(43.5);
      expect(layout.grips).toHaveLength(2);
      expect(layout.buttons).toHaveLength(7); // tre funzioni e quattro versi
      // Colori dal tema.
      expect(layout.lineColor).toBe(layout.orange);
      expect(layout.barColor).toBe(layout.green);

      // Situazione iniziale: (x − 1)/(x + 2) ≥ 0.
      expect(await solution(page)).toBe(String.raw`S = \left(-\infty; -2\right) \cup \left[1; +\infty\right)`);

      // Col dito: la maniglia della retta trascinata verso l'alto alza la soglia, e la pagina non scorre.
      const scrollBefore = await page.evaluate<number>("scrollY");
      const grip = await box(page, ".vis-maniglia-soglia .vis-maniglia-segno");
      const unit = layout.base.height / 240; // pixel per unità del disegno
      const perHalf = (228 / 10 / 2) * unit; // mezza unità di y nella finestra −5…5
      await drag(page, grip.x + grip.width / 2, grip.y + grip.height / 2, 0, -2 * perHalf);
      expect(await read(page, ".vis-cursore-valore")).toContain("k=1");
      expect(await page.evaluate<number>("scrollY")).toBe(scrollBefore);
      // (x − 1)/(x + 2) ≥ 1 ⇔ −3/(x + 2) ≥ 0 ⇔ x < −2.
      expect(await solution(page)).toBe(String.raw`S = \left(-\infty; -2\right)`);

      // Pulsanti: la seconda funzione e il verso «>»: ritrova l'esempio (x + 1)/(x − 2) > 1.
      await page.evaluate(`document.querySelectorAll(".vis-scelta:not(.vis-versi) .vis-pulsante")[1].click()`);
      await page.evaluate(`document.querySelectorAll(".vis-versi .vis-pulsante")[0].click()`);
      await pause(50);
      expect(await solution(page)).toBe(String.raw`S = \left(2; +\infty\right)`);
      expect(await read(page, ".vis-tabella tr:nth-child(2) th annotation")).toBe("3");

      // Cursore della soglia, toccato col dito all'inizio della corsa: k = −5.
      const slider = await box(page, ".vis-cursore:nth-child(1) input");
      await page.touch("start", slider.x + 2, slider.y + slider.height / 2);
      await page.touch("end", slider.x + 2, slider.y + slider.height / 2);
      await pause(80);
      expect(await read(page, ".vis-cursore-valore")).toContain("k=−5");

      // La sonda trascinata col dito verso sinistra: la colonna della tabella segue.
      const probe = await box(page, ".vis-maniglia-sonda .vis-maniglia-segno");
      const columnBefore = await page.evaluate<number>(`[...document.querySelector(".vis-tabella-x").children].findIndex((cell) => cell.classList.contains("vis-cella-sonda"))`);
      await drag(page, probe.x + probe.width / 2, probe.y + probe.height / 2, -layout.base.width * 0.6, 0);
      const columnAfter = await page.evaluate<number>(`[...document.querySelector(".vis-tabella-x").children].findIndex((cell) => cell.classList.contains("vis-cella-sonda"))`);
      expect(columnAfter).toBeGreaterThan(0);
      expect(columnAfter).not.toBe(columnBefore);
      expect(await read(page, ".vis-sonda-testo")).toMatch(/sopra la retta|sotto la retta|sulla retta|non è definita/);
      expect(await page.evaluate<number>("document.documentElement.scrollWidth")).toBeLessThanOrEqual(width);

      if (process.env.COMPASSO_FOTO) {
        mkdirSync(process.env.COMPASSO_FOTO, { recursive: true });
        await page.evaluate(`document.querySelector(".vis").scrollIntoView({ block: "start" })`);
        writeFileSync(path.join(process.env.COMPASSO_FOTO, `vis-disequazioni-${width}-${theme}.png`), await page.screenshot());
      }
    },
    60_000,
  );
});
