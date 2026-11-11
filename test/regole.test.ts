import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blockNames, parseLesson } from "../src/contenuti/formato";
import { equivalent } from "../src/motore/equivalence/equivalence";
import { add, mul, pow, sub, sym, toLatex } from "../src/motore/expr";
import { checkForm, formConstraints } from "../src/motore/form";

// Gli esempi di REGOLE.md sono il modello che gli altri modelli copiano: devono funzionare davvero.

const rules = readFileSync(new URL("../REGOLE.md", import.meta.url), "utf8");
const lessonSection = rules.slice(rules.indexOf("## Come scrivere una lezione"), rules.indexOf("## Catalogo degli errori"));
const examples = [...lessonSection.matchAll(/```markdown\n([\s\S]*?)```/g)].map((match) => match[1] as string);

describe("gli esempi di REGOLE.md", () => {
  it("messi insieme formano una lezione valida", () => {
    const [header, ...blocks] = examples;
    expect(header?.startsWith("---\ncodice: V1.M06.L04")).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    const lesson = [
      header,
      "Una frase con un rimando: [[segno-di-una-frazione|i segni]] e [[V1.M06.L03]].",
      ':::definizione{id=V1.M06.D02 nome="Segno di una frazione" termine=segno-di-una-frazione}\nIl segno di $\\dfrac{N}{D}$ dipende dai segni di $N$ e di $D$.\n:::',
      ':::teorema{id=V1.M06.T03 nome="Teorema di prova"}\nEnunciato.\n:::',
      // Gli esempi di dimostrazione usano un teorema del Volume 2: qui lo si porta nel modulo della lezione.
      ...blocks.map((block) => block.replaceAll("V2.M06.T03", "V1.M06.T03")),
      ":::riepilogo\nI punti da ricordare.\n:::",
    ].join("\n\n");
    expect(parseLesson(lesson).problems).toEqual([]);
    expect(parseLesson(lesson).lesson?.blocks.map((block) => block.kind)).toEqual([
      "text", "definition", "theorem", "question", "question", "proof", "visualization", "flashcard", "summary",
    ]);
  });

  it("l'esempio del motore dà i risultati scritti", () => {
    const x = sym("x");
    const p = add(mul(2, pow(x, 2)), mul(-3, x), 1);
    expect(toLatex(p)).toBe("2x^{2} - 3x + 1");
    expect(equivalent(p, mul(sub(mul(2, x), 1), sub(x, 1)))).toBe(true);
    expect(checkForm(p, "factored").ok).toBe(false);
    expect(checkForm(mul(sub(mul(2, x), 1), sub(x, 1)), "factored").ok).toBe(true);
  });

  it("nomina tutti i blocchi e tutti i vincoli di forma che esistono", () => {
    for (const name of Object.keys(blockNames)) expect(lessonSection).toContain(`\`${name}\``);
    for (const constraint of formConstraints) expect(rules).toContain(`\`${constraint}\``);
  });
});
