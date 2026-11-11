import katex from "katex";
import { describe, expect, it } from "vitest";

describe("KaTeX", () => {
  it("disegna la formula di prova senza errori (modalità rigorosa)", () => {
    const tex = String.raw`x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;
    const html = katex.renderToString(tex, { throwOnError: true, strict: "error" });
    expect(html).toContain('class="katex"');
  });

  it("segnala una formula sbagliata invece di ignorarla", () => {
    expect(() => katex.renderToString(String.raw`\frac{1}{`, { throwOnError: true })).toThrow();
  });
});
