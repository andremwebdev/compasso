// Grafici e figure come li vede Andrea: la lezione di prova (test/contenuti/prova) con i riquadri veri
// dell'app e lo stile vero, in Chrome senza finestra, nei due temi, a 414 px (iPhone XR) e a 320 px,
// senza rete. Si controlla che il disegno ci sia, stia nello schermo, prenda i colori dal tema e che
// un parametro sbagliato mostri il messaggio senza rompere la pagina. Con COMPASSO_FOTO=cartella le
// fotografie delle pagine finiscono lì, per guardarle a occhio.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Chrome, findChrome } from "../chrome";
import { previewPage } from "./anteprima/pagina";

describe("grafici e figure in Chrome (lezione di prova)", () => {
  const executable = findChrome();
  if (!executable && process.env.CI) throw new Error("Chrome non trovato: imposta CHROME_PATH");
  const maybe = executable ? it : it.skip;
  if (!executable) console.warn("Chrome non trovato (CHROME_PATH): prova di grafici e figure saltata in locale.");

  let chrome: Chrome | null = null;
  let folder = "";
  let url = "";

  beforeAll(async () => {
    folder = mkdtempSync(path.join(tmpdir(), "compasso-figure-"));
    const file = path.join(folder, "prova.html");
    writeFileSync(file, await previewPage("test/app/anteprima/figure.tsx"));
    url = pathToFileURL(file).href;
    if (executable) chrome = await Chrome.launch(executable);
  }, 60_000);

  afterAll(async () => {
    await chrome?.close();
    rmSync(folder, { recursive: true, force: true });
  });

  const cases = [414, 320].flatMap((width) => (["light", "dark"] as const).map((theme) => [width, theme] as const));

  maybe.each(cases)(
    "a %i px, tema %s: si vedono, stanno nello schermo, prendono i colori dal tema",
    async (width, theme) => {
      const page = await chrome!.newPage(width, 896);
      await page.goOffline();
      const address = `${url}#${theme}`;
      await page.goto(address);
      const state = await page.evaluate<{
        width: number; scroll: number; curves: number; asymptotes: number; points: number; circles: number;
        problems: string[]; katexErrors: number; svgWidths: number[]; boxWidth: number;
        curveColor: string; blue: string; paper: string; areaColor: string; external: string[]; legend: number;
      }>(`(() => {
        const rgb = (value) => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; };
        const rootStyle = getComputedStyle(document.documentElement);
        const curve = document.querySelector(".grafico-disegno .graf-curva-1");
        const area = document.querySelector(".figura-disegno .fig-area-1");
        const box = document.querySelector(".box-figure");
        return {
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          curves: document.querySelectorAll(".grafico-disegno .graf-curva").length,
          asymptotes: document.querySelectorAll(".grafico-disegno .graf-asintoto").length,
          points: document.querySelectorAll(".grafico-disegno .graf-punto").length,
          circles: document.querySelectorAll(".figura-disegno circle").length,
          problems: [...document.querySelectorAll(".figura-problema")].map((node) => node.textContent),
          katexErrors: document.querySelectorAll(".katex-error").length,
          svgWidths: [...document.querySelectorAll(".grafico-disegno svg, .figura-disegno svg")].map((svg) => svg.getBoundingClientRect().right),
          boxWidth: box ? box.getBoundingClientRect().right : 0,
          curveColor: curve ? getComputedStyle(curve).stroke : "",
          blue: rgb(rootStyle.getPropertyValue("--blu").trim()),
          paper: getComputedStyle(document.body).backgroundColor,
          areaColor: area ? getComputedStyle(area).fill : "",
          legend: document.querySelectorAll(".grafico-legenda li .katex").length,
          external: performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => !name.startsWith("data:") && !name.startsWith("file:")),
        };
      })()`);

      expect(state.width).toBe(width);
      expect(state.scroll, "scorrimento orizzontale").toBeLessThanOrEqual(width);
      expect(state.curves).toBe(2);
      expect(state.asymptotes).toBe(1);
      expect(state.points).toBeGreaterThanOrEqual(3);
      expect(state.circles).toBe(2);
      expect(state.legend).toBe(2);
      expect(state.katexErrors).toBe(0);
      for (const right of state.svgWidths) expect(right).toBeLessThanOrEqual(state.boxWidth + 0.5);
      // I colori vengono dal tema: la curva è il --blu del tema scelto.
      expect(state.curveColor).toBe(state.blue);
      expect(state.areaColor).toBe(state.blue);
      expect(state.external).toEqual([]);
      // I due blocchi sbagliati mostrano il messaggio, gli altri no.
      expect(state.problems).toHaveLength(2);
      expect(state.problems[0]).toContain("il grafico non si può mostrare");
      expect(state.problems[1]).toContain("l99-manca.svg");

      if (process.env.COMPASSO_FOTO) {
        mkdirSync(process.env.COMPASSO_FOTO, { recursive: true });
        writeFileSync(path.join(process.env.COMPASSO_FOTO, `figure-${width}-${theme}.png`), await page.screenshot());
      }
    },
    60_000,
  );

  maybe("i due temi hanno colori diversi (il disegno non ha colori fissi)", async () => {
    const colors: string[] = [];
    for (const theme of ["light", "dark"]) {
      const page = await chrome!.newPage(414, 896);
      await page.goto(`${url}#${theme}`);
      colors.push(await page.evaluate<string>('getComputedStyle(document.querySelector(".grafico-disegno .graf-asse")).stroke'));
    }
    expect(colors[0]).not.toBe(colors[1]);
  }, 60_000);
});
