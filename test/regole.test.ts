import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blockNames, parseLesson } from "../src/contenuti/formato";
import { equivalent } from "../src/motore/equivalence/equivalence";
import { simplify } from "../src/motore/algebra/simplify";
import { derive } from "../src/motore/calculus/derive";
import * as complex from "../src/motore/complex";
import * as display from "../src/motore/display";
import { signTable, solutionFromSigns } from "../src/motore/display";
import { add, div, mul, pi, pow, sin, sub, sym, toLatex } from "../src/motore/expr";
import { checkForm, formConstraints } from "../src/motore/form";
import * as linalg from "../src/motore/linalg";
import * as sets from "../src/motore/sets";
import { periodic, points, setsEqual, setToLatex } from "../src/motore/sets";
import * as steps from "../src/motore/steps";
import { factorPolynomial, stepText } from "../src/motore/steps";

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

  it("gli esempi del resto del motore danno i risultati scritti", () => {
    const x = sym("x");
    expect(toLatex(simplify(add(mul(1, x), 0)))).toBe("x");
    expect(toLatex(derive(mul(x, sin(x))))).toBe("\\sin x + x \\cos x");
    const table = signTable([{ expr: sub(x, 1) }, { expr: add(x, 2), role: "denominator" }]);
    expect(setToLatex(solutionFromSigns(table, ">="))).toBe("\\left(-\\infty; -2\\right) \\cup \\left[1; +\\infty\\right)");
    const factored = factorPolynomial(sub(pow(x, 2), 9));
    expect(toLatex(factored.result)).toBe("\\left(x + 3\\right)\\left(x - 3\\right)");
    expect(factored.steps.map((step) => ({ text: stepText(step) })).length).toBeGreaterThan(0);
    expect(setsEqual(periodic(points(div(pi, 6)), mul(2, pi)), periodic(points(div(mul(13, pi), 6)), mul(2, pi)))).toBe(true);
    // Le funzioni nominate nella tabella esistono davvero nelle cartelle indicate.
    const section = rules.slice(rules.indexOf("## Il motore in breve"), rules.indexOf("## Come aggiungere un generatore"));
    const modules: Record<string, Record<string, unknown>> = { sets, linalg, complex, steps, display };
    for (const [folder, module] of Object.entries(modules)) {
      const row = section.split("\n").find((line) => line.includes(`\`motore/${folder}\``));
      expect(row, folder).toBeDefined();
      const names = [...(row as string).split("|")[3]!.matchAll(/`([A-Za-z]+)[`(.]/g)].map((match) => match[1] as string);
      expect(names.length).toBeGreaterThan(4);
      for (const name of names) expect(module[name], `${folder}: ${name}`).toBeDefined();
    }
  });

  it("nomina tutti i blocchi e tutti i vincoli di forma che esistono", () => {
    for (const name of Object.keys(blockNames)) expect(lessonSection).toContain(`\`${name}\``);
    for (const constraint of formConstraints) expect(rules).toContain(`\`${constraint}\``);
  });
});
