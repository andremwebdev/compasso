// Un esercizio di riordino dall'inizio alla fine, come lo farebbe Andrea sul telefono: Chrome senza
// finestra, schermo da 414 px (iPhone XR) e da 320 px, tocco, nei due temi, senza rete. Pagina di prova
// anteprima/riordino.tsx (la schermata di esercizio vera con il generatore di prova). Si rimette in
// ordine toccando le frecce, si conferma (giusta, tentativo registrato), si passa a un esercizio simile,
// si conferma l'ordine di partenza (sbagliata, errore riconosciuto, tentativo registrato).
// Con COMPASSO_FOTO=cartella le fotografie finiscono lì.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Chrome, findChrome, type ChromePage } from "../chrome";
import { previewPage } from "./anteprima/pagina";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Un tocco col dito al centro del primo elemento che corrisponde al selettore (portato prima nello schermo). */
async function tap(page: ChromePage, selector: string): Promise<void> {
  const center = await page.evaluate<{ x: number; y: number } | null>(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    node.scrollIntoView({ block: "center", behavior: "instant" });
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!center) throw new Error(`niente da toccare: ${selector}`);
  await pause(30);
  await page.touch("start", center.x, center.y);
  await page.touch("end", center.x, center.y);
  await pause(80);
}

/** L'ordine mostrato: l'indice originale di ogni elemento, dall'alto in basso. */
const shownOrder = (page: ChromePage): Promise<number[]> =>
  page.evaluate<number[]>(`[...document.querySelectorAll(".reorder li")].map((li) => Number(li.dataset.item))`);

/** Il pulsante con quel testo, come selettore (gli diamo un attributo per trovarlo). */
const buttonNamed = (page: ChromePage, name: string): Promise<string> =>
  page.evaluate<string>(`(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(name)});
    if (!button) return "#manca";
    button.setAttribute("data-prova", ${JSON.stringify(name)});
    return '[data-prova="' + ${JSON.stringify(name)} + '"]';
  })()`);

describe("esercizio di riordino in Chrome (telefono simulato)", () => {
  const executable = findChrome();
  if (!executable && process.env.CI) throw new Error("Chrome non trovato: imposta CHROME_PATH");
  const maybe = executable ? it : it.skip;
  if (!executable) console.warn("Chrome non trovato (CHROME_PATH): prova del riordino saltata in locale.");

  let chrome: Chrome | null = null;
  let folder = "";
  let url = "";

  beforeAll(async () => {
    folder = mkdtempSync(path.join(tmpdir(), "compasso-riordino-"));
    const file = path.join(folder, "riordino.html");
    writeFileSync(file, await previewPage("test/app/anteprima/riordino.tsx"));
    url = pathToFileURL(file).href;
    if (executable) chrome = await Chrome.launch(executable);
  }, 60_000);

  afterAll(async () => {
    await chrome?.close();
    rmSync(folder, { recursive: true, force: true });
  });

  const cases = [414, 320].flatMap((width) => (["light", "dark"] as const).map((theme) => [width, theme] as const));

  maybe.each(cases)(
    "a %i px, tema %s: si riordina col dito, si conferma, si passa al simile",
    async (width, theme) => {
      const page = await chrome!.newPage(width, 896);
      await page.goOffline();
      await page.goto(`${url}#${theme}`);
      await pause(100);

      const layout = await page.evaluate<{ scroll: number; katexErrors: number; arrows: { width: number; height: number }[]; items: number }>(`(() => ({
        scroll: document.documentElement.scrollWidth,
        katexErrors: document.querySelectorAll(".katex-error").length,
        arrows: [...document.querySelectorAll(".proof-step-moves .key")].map((node) => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
        items: document.querySelectorAll(".reorder li").length,
      }))()`);
      expect(layout.scroll, "niente scorrimento orizzontale").toBeLessThanOrEqual(width);
      expect(layout.katexErrors).toBe(0);
      expect(layout.items).toBe(5);
      expect(layout.arrows).toHaveLength(8);
      for (const arrow of layout.arrows) {
        expect(arrow.width).toBeGreaterThanOrEqual(44);
        expect(arrow.height).toBeGreaterThanOrEqual(44);
      }

      // Rimette in ordine toccando le frecce «su».
      for (let item = 1; item < layout.items; item++) {
        for (let guard = 0; guard < layout.items && (await shownOrder(page)).indexOf(item) > item; guard++) {
          await tap(page, `.reorder li[data-item="${item}"] button[aria-label^="Sposta su"]`);
        }
      }
      expect(await shownOrder(page)).toEqual([0, 1, 2, 3, 4]);
      await tap(page, await buttonNamed(page, "Conferma"));
      expect(await page.evaluate<boolean>(`!!document.querySelector(".verdict-correct")`)).toBe(true);
      let log = await page.evaluate<{ outcome: string; error: string | null; seed: number }[]>("compassoAttempts()");
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ outcome: "correct", error: null, seed: 4 });

      const photos = process.env.COMPASSO_FOTO;
      if (photos) {
        mkdirSync(photos, { recursive: true });
        writeFileSync(path.join(photos, `riordino-giusta-${width}-${theme}.png`), await page.screenshot());
      }

      // Esercizio simile: si conferma l'ordine di partenza, che non è mai quello giusto.
      await tap(page, await buttonNamed(page, "Esercizio simile"));
      expect(await page.evaluate<boolean>(`!!document.querySelector(".reorder .proof-step-moves")`)).toBe(true);
      await tap(page, await buttonNamed(page, "Conferma"));
      expect(await page.evaluate<string>(`document.querySelector(".verdict-error")?.textContent ?? ""`)).toContain("Ordine delle operazioni sbagliato");
      expect(await page.evaluate<number>(`document.querySelectorAll(".reorder-wrong").length`)).toBeGreaterThan(0);
      log = await page.evaluate("compassoAttempts()");
      expect(log).toHaveLength(2);
      expect(log[1]).toMatchObject({ outcome: "wrong", error: "CALC.PRECEDENZA", seed: 5 });
      expect(await page.evaluate<number>("document.documentElement.scrollWidth"), "niente scorrimento orizzontale").toBeLessThanOrEqual(width);
      if (photos) writeFileSync(path.join(photos, `riordino-sbagliata-${width}-${theme}.png`), await page.screenshot());
    },
    60_000,
  );
});
