import { describe, expect, it } from "vitest";
import katex from "katex";
import { evaluate, toLatex, variables } from "../../src/motore/expr";
import { parseExpression, parseRelation } from "../../src/motore/parser";

/** LaTeX di quello che il parser ha capito (errore se il testo non è valido o è incompleto). */
function tex(text: string, options = {}): string {
  const result = parseExpression(text, options);
  if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
  if (!result.complete) throw new Error(`«${text}»: incompleto`);
  return toLatex(result.value);
}

function value(text: string, env = {}): number {
  const result = parseExpression(text);
  if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
  return evaluate(result.value, env);
}

describe("parser: numeri e operazioni", () => {
  it.each([
    ["2+3*4", "2 + 3 \\cdot 4"],
    ["2 − 3", "2 - 3"],
    ["6:2", "\\frac{6}{2}"],
    ["3·4", "3 \\cdot 4"],
    ["1,5", "1{,}5"],
    ["1.5", "1{,}5"],
    [",5 + 0,25", "0{,}5 + 0{,}25"],
    ["-3", "-3"],
    ["--3", "3"],
    ["2*-3", "2 \\cdot \\left(-3\\right)"],
    ["3/4", "\\frac{3}{4}"],
    ["-3/4", "-\\frac{3}{4}"],
    ["20%", "\\frac{20}{100}"],
    ["[2+(3-1)]*2", "\\left(2 + \\left(3 - 1\\right)\\right) \\cdot 2"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("rispetta le precedenze", () => {
    expect(value("2+3*4")).toBe(14);
    expect(value("-3^2")).toBe(-9);
    expect(value("(-3)^2")).toBe(9);
    expect(value("2^3^2")).toBe(512);
    expect(value("2^-1")).toBe(0.5);
    expect(value("8/2/2")).toBe(2);
    expect(value("8/2*4")).toBe(16);
    expect(value("1/2x", { x: 6 })).toBe(3);
    expect(value("2-3-4")).toBe(-5);
    expect(value("3²+4²")).toBe(25);
    expect(value("2⁻¹")).toBe(0.5);
  });
});

describe("parser: moltiplicazione implicita", () => {
  it.each([
    ["2x", "2x"],
    ["2(x+1)", "2\\left(x + 1\\right)"],
    ["(x+1)(x-1)", "\\left(x + 1\\right)\\left(x - 1\\right)"],
    ["xy", "xy"],
    ["x(x+1)", "x\\left(x + 1\\right)"],
    ["2pi", "2\\pi"],
    ["2πr", "2\\pi r"],
    ["3x^2y", "3x^{2}y"],
    ["-2x+1", "-2x + 1"],
    ["x-2y", "x - 2y"],
    ["2√3", "2\\sqrt{3}"],
    ["x2", "x \\cdot 2"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("due numeri vicini senza operazione sono un errore", () => {
    expect(parseExpression("2 3").ok).toBe(false);
  });
});

describe("parser: radici, potenze, funzioni", () => {
  it.each([
    ["sqrt(2)", "\\sqrt{2}"],
    ["√2", "\\sqrt{2}"],
    ["√(x+1)", "\\sqrt{x + 1}"],
    ["√2x", "\\sqrt{2}x"],
    ["sqrt2", "\\sqrt{2}"],
    ["∛x", "\\sqrt[3]{x}"],
    ["root(3; x+1)", "\\sqrt[3]{x + 1}"],
    ["root(4, x)", "\\sqrt[4]{x}"],
    ["3+2√5", "3 + 2\\sqrt{5}"],
    ["x^2", "x^{2}"],
    ["x^(1/2)", "x^{\\frac{1}{2}}"],
    ["e^x", "e^{x}"],
    ["e^(2x)", "e^{2x}"],
    ["e^2x", "e^{2}x"],
    ["exp(x)", "e^{x}"],
    ["sin(x)", "\\sin x"],
    ["sinx", "\\sin x"],
    ["sen x", "\\sin x"],
    ["sin 2x", "\\sin 2x"],
    ["sin2x+1", "\\sin 2x + 1"],
    ["sin x cos x", "\\sin x \\cdot \\cos x"],
    ["2sinxcosx", "2 \\sin x \\cdot \\cos x"],
    ["sin^2 x", "\\sin^{2} x"],
    ["sin²x", "\\sin^{2} x"],
    ["sin(x)^2", "\\sin^{2} x"],
    ["sin x^2", "\\sin x^{2}"],
    ["sin(x+1)", "\\sin\\left(x + 1\\right)"],
    ["sin -x", "\\sin\\left(-x\\right)"],
    ["tg x + cotg x", "\\tan x + \\cot x"],
    ["arcsen x", "\\arcsin x"],
    ["arctg(1)", "\\arctan 1"],
    ["ln x", "\\ln x"],
    ["ln(x+1)", "\\ln\\left(x + 1\\right)"],
    ["log x", "\\log x"],
    ["log_2 x", "\\log_{2} x"],
    ["log_2(x+1)", "\\log_{2}\\left(x + 1\\right)"],
    ["log(2; 8)", "\\log_{2} 8"],
    ["log(x)^2", "\\left(\\log x\\right)^{2}"],
    ["|x-1|", "\\left|x - 1\\right|"],
    ["abs(x)", "\\left|x\\right|"],
    ["|x||y|", "\\left|x\\right|\\left|y\\right|"],
    ["||x|-1|", "\\left|\\left|x\\right| - 1\\right|"],
    ["2|x|", "2\\left|x\\right|"],
    ["x_1 + x_2", "x_{1} + x_{2}"],
    ["α + beta", "\\alpha + \\beta"],
  ])("%s", (text, expected) => {
    expect(tex(text)).toBe(expected);
  });

  it("la virgola tra due cifre è decimale, altrimenti separa gli argomenti", () => {
    expect(tex("root(3,5)")).toBe("\\sqrt{3{,}5}");
    expect(tex("root(3, 5)")).toBe("\\sqrt[3]{5}");
  });

  it("i valori sono quelli attesi", () => {
    expect(value("sqrt(16)+∛27")).toBeCloseTo(7, 12);
    expect(value("log_2 8")).toBeCloseTo(3, 12);
    expect(value("log 1000")).toBeCloseTo(3, 12);
    expect(value("ln e^3")).toBeCloseTo(3, 12);
    expect(value("sin(pi/6)")).toBeCloseTo(0.5, 12);
    expect(value("cos π")).toBeCloseTo(-1, 12);
    expect(value("|-3|+|2-5|")).toBe(6);
  });

  it("la lettera i è l'unità immaginaria solo se richiesto", () => {
    const real = parseExpression("3+2i");
    expect(real.ok && variables(real.value)).toEqual(["i"]);
    expect(tex("3+2i", { complex: true })).toBe("3 + 2i");
    const complex = parseExpression("3+2i", { complex: true });
    expect(complex.ok && variables(complex.value)).toEqual([]);
  });
});

describe("parser: testo incompleto o sbagliato", () => {
  it.each(["2+", "sqrt(", "x^", "sin", "3·", "2/", "log_", "(", "2(x+"])("«%s» è incompleto ma disegnabile", (text) => {
    const result = parseExpression(text);
    expect(result.ok && !result.complete).toBe(true);
    if (result.ok) expect(toLatex(result.value)).toContain("\\square");
  });

  it.each(["()/()", "(x+1)/()", "x^()", "√()", "sin()", "e^()", "root(3; )", "2()"])("«%s»: una casella vuota tra parentesi è incompleta, non sbagliata", (text) => {
    const result = parseExpression(text);
    expect(result.ok && !result.complete).toBe(true);
    if (result.ok) expect(toLatex(result.value)).toContain("\\square");
  });

  it("le caselle riempite si leggono come le parentesi normali", () => {
    expect(tex("(x+1)/(x-2)")).toBe("\\frac{x + 1}{x - 2}");
    expect(tex("x^(2)")).toBe("x^{2}");
    expect(tex("sin(x)")).toBe(tex("sin x"));
  });

  it("parentesi e barre lasciate aperte si chiudono da sole", () => {
    const group = parseExpression("2(x+1");
    expect(group.ok && !group.complete && toLatex(group.value)).toBe("2\\left(x + 1\\right)");
    const bars = parseExpression("|x");
    expect(bars.ok && !bars.complete && toLatex(bars.value)).toBe("\\left|x\\right|");
  });

  it.each([
    ["", "Non hai scritto niente."],
    ["   ", "Non hai scritto niente."],
    ["x+1)", "C'è una parentesi chiusa in più."],
    ["2+*3", "Qui manca un numero o una lettera."],
    ["2 # 3", "Carattere non riconosciuto: «#»."],
    ["∀x", "«∀» (∀x vuol dire «tutti i numeri reali») si usa solo per scrivere un insieme di soluzioni, e qui la risposta non è un insieme."],
    ["(x-1)∄", "«∄» (∄x vuol dire «nessuna soluzione») si usa solo per scrivere un insieme di soluzioni, e qui la risposta non è un insieme."],
    ["x ∪ 2", "«∪» (l'unione di due insiemi) si usa solo per scrivere un insieme di soluzioni, e qui la risposta non è un insieme."],
    ["x = 3", "Qui serve un'espressione, non un'equazione o una disequazione."],
    ["∞", "L'infinito non è un numero: qui non si può usare."],
    ["root(x; 2)", "L'indice della radice deve essere un intero maggiore o uguale a 2: root(3; x)."],
  ])("«%s» dà un errore chiaro", (text, message) => {
    const result = parseExpression(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe(message);
  });

  it("indica la posizione dell'errore", () => {
    const result = parseExpression("2+3)");
    expect(!result.ok && result.error.position).toBe(3);
  });

  it("non lancia mai eccezioni, qualunque cosa si scriva", () => {
    const alphabet = "0123456789xyeπ+-*/^()|,.;√ sincolgtabqr_%²=<>";
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let n = 0; n < 3000; n++) {
      let text = "";
      const length = 1 + (next() % 12);
      for (let k = 0; k < length; k++) text += alphabet[next() % alphabet.length];
      expect(() => parseExpression(text)).not.toThrow();
      expect(() => parseRelation(text)).not.toThrow();
    }
  });
});

describe("parser: equazioni e disequazioni", () => {
  it.each([
    ["2x+1=0", "2x + 1 = 0"],
    ["x<=3", "x \\le 3"],
    ["x ≥ -2", "x \\ge -2"],
    ["x=<3", "x \\le 3"],
    ["x != 0", "x \\ne 0"],
    ["x≠0", "x \\ne 0"],
    ["x^2 > 4", "x^{2} > 4"],
  ])("%s", (text, expected) => {
    const result = parseRelation(text);
    expect(result.ok && toLatex(result.value)).toBe(expected);
  });

  it("senza segno di relazione è un errore", () => {
    expect(parseRelation("2x+1").ok).toBe(false);
  });
});

describe("revisione 4a: il parser non lancia mai e legge gli angoli come si scrivono", () => {
  it("un testo con migliaia di parentesi annidate dà un errore, non un'eccezione", () => {
    for (const text of ["(".repeat(20000), "√".repeat(20000) + "2", "-".repeat(50000) + "x", "2^".repeat(20000) + "2", "|(".repeat(8000)]) {
      let result: ReturnType<typeof parseExpression> | undefined;
      expect(() => (result = parseExpression(text))).not.toThrow();
      expect(() => parseRelation(text)).not.toThrow();
      // Qualunque sia l'esito, è un risultato ben formato.
      expect(result !== undefined && (result.ok || typeof result.error.message === "string")).toBe(true);
    }
  });

  it("un testo troppo lungo è rifiutato con un messaggio chiaro", () => {
    const result = parseExpression("x+".repeat(3000) + "1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/troppo lung/);
  });

  it("sin π/3 è il seno di π/3: con π nell'argomento, la divisione per un intero resta dentro", () => {
    expect(value("sin π/6")).toBeCloseTo(0.5, 12);
    expect(value("cos 2π/3")).toBeCloseTo(-0.5, 12);
    expect(value("tan -π/4")).toBeCloseTo(-1, 12);
    expect(value("2 sin π/6 cos π/3")).toBeCloseTo(0.5, 12);
    expect(value("sin^2 π/4")).toBeCloseTo(0.5, 12);
    expect(tex("cos π/3 + i sin π/3", { complex: true })).toBe("\\cos \\frac{\\pi}{3} + i \\sin \\frac{\\pi}{3}");
  });

  it("senza π la divisione resta fuori dall'argomento, come prima", () => {
    expect(tex("sin x/2")).toBe("\\frac{\\sin x}{2}");
    expect(tex("sin x / cos x")).toBe("\\frac{\\sin x}{\\cos x}");
    expect(tex("sin π/x")).toBe("\\frac{\\sin \\pi}{x}");
    expect(tex("sin π/2,5")).toBe("\\frac{\\sin \\pi}{2{,}5}");
    expect(value("sin(π)/2")).toBeCloseTo(0, 12);
    // Dopo l'intero non può continuare un'altra operazione che cambierebbe il senso: sin π/2^2 resta com'era.
    expect(tex("sin π/2^2")).toBe("\\frac{\\sin \\pi}{2^{2}}");
  });
});

describe("parser del Volume 1: periodici, notazione scientifica, gradi, fattoriale", () => {
  /** Risultato del parser anche per un testo da finire: LaTeX e completezza (errore se il testo non è valido). */
  function preview(text: string): { latex: string; complete: boolean } {
    const result = parseExpression(text);
    if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
    return { latex: toLatex(result.value), complete: result.complete };
  }
  const draws = (latex: string): void => {
    expect(() => katex.renderToString(latex, { throwOnError: true, strict: "error" }), latex).not.toThrow();
  };
  const exactValue = (text: string): string => {
    const result = parseExpression(text);
    if (!result.ok || result.value.kind !== "num") throw new Error(`«${text}» non è un numero`);
    return result.value.value.toString();
  };

  it.each([
    ["0,1(6)", "0{,}1\\overline{6}", "1/6"],
    ["0.1(6)", "0{,}1\\overline{6}", "1/6"],
    ["3,(3)", "3{,}\\overline{3}", "10/3"],
    ["0,(142857)", "0{,}\\overline{142857}", "1/7"],
    ["12,3(45)", "12{,}3\\overline{45}", "679/55"],
    ["0,(9)", "0{,}\\overline{9}", "1"],
    ["0,16̅", "0{,}1\\overline{6}", "1/6"],
  ])("numero periodico %s: LaTeX all'italiana e frazione generatrice", (text, latex, fraction) => {
    expect(tex(text)).toBe(latex);
    draws(latex);
    expect(exactValue(text)).toBe(fraction);
  });

  it("la lineetta su più cifre, anche con il macron; fuori posto è un errore spiegato", () => {
    expect(tex("0,12̅3̅")).toBe("0{,}1\\overline{23}");
    expect(tex("2,5̄")).toBe("2{,}\\overline{5}");
    const wrong = parseExpression("0,1̅6");
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.message).toContain("ultime cifre");
  });

  it("il periodo si legge solo attaccato ai decimali e con sole cifre: altrimenti la parentesi è un fattore", () => {
    expect(tex("2(3)")).toBe("2 \\cdot 3");
    expect(tex("0,5(x+1)")).toBe("0{,}5\\left(x + 1\\right)");
    expect(tex("0,5 (3)")).toBe("0{,}5 \\cdot 3");
    expect(tex("-0,(3)")).toBe("-0{,}\\overline{3}");
    expect(value("-0,(3)")).toBeCloseTo(-1 / 3, 12);
    expect(tex("0,(3)+1/3")).toBe("0{,}\\overline{3} + \\frac{1}{3}");
  });

  it("periodico a metà, nell'anteprima: la casella del periodo e il testo incompleto", () => {
    expect(preview("0,1(")).toEqual({ latex: "0{,}1\\overline{\\square}", complete: false });
    expect(preview("0,1()")).toEqual({ latex: "0{,}1\\overline{\\square}", complete: false });
    expect(preview("0,1(6")).toEqual({ latex: "0{,}1\\overline{6}", complete: false });
    expect(preview("3,(")).toEqual({ latex: "3{,}\\overline{\\square}", complete: false });
    expect(preview("0,1(6)")).toEqual({ latex: "0{,}1\\overline{6}", complete: true });
    draws("0{,}1\\overline{\\square}");
  });

  it.each([
    ["3,2E5", "3{,}2 \\cdot 10^{5}", 320000],
    ["3,2E-5", "3{,}2 \\cdot 10^{-5}", 0.000032],
    ["3.2E+5", "3{,}2 \\cdot 10^{5}", 320000],
    ["1E3", "1 \\cdot 10^{3}", 1000],
    ["3,2·10^5", "3{,}2 \\cdot 10^{5}", 320000],
    ["3,2*10^(-5)", "3{,}2 \\cdot 10^{-5}", 0.000032],
    ["6,02·10²³", "6{,}02 \\cdot 10^{23}", 6.02e23],
  ])("notazione scientifica %s", (text, latex, number) => {
    expect(tex(text)).toBe(latex);
    draws(latex);
    expect(value(text) / number).toBeCloseTo(1, 12);
  });

  it("notazione scientifica a metà, nell'anteprima; la e minuscola resta il numero di Nepero", () => {
    expect(preview("3,2E")).toEqual({ latex: "3{,}2 \\cdot 10^{\\square}", complete: false });
    expect(preview("3,2E-")).toEqual({ latex: "3{,}2 \\cdot 10^{-\\square}", complete: false });
    expect(preview("3,2·10^(")).toEqual({ latex: "3{,}2 \\cdot 10^{\\square}", complete: false });
    expect(tex("2e")).toBe("2e");
    // Una E non seguita da un esponente, in mezzo al testo, è una lettera.
    expect(variables(parseOk("3E+x"))).toEqual(["E", "x"]);
  });

  it.each([
    ["30°", "30^{\\circ}", Math.PI / 6],
    ["30º", "30^{\\circ}", Math.PI / 6],
    ["30°15'", "30^{\\circ}\\,15'", (30.25 * Math.PI) / 180],
    ["30°15′20″", "30^{\\circ}\\,15'\\,20''", ((30 + 15 / 60 + 20 / 3600) * Math.PI) / 180],
    ["30°15'20''", "30^{\\circ}\\,15'\\,20''", ((30 + 15 / 60 + 20 / 3600) * Math.PI) / 180],
    ["30°20\"", "30^{\\circ}\\,20''", ((30 + 20 / 3600) * Math.PI) / 180],
    ["45'", "45'", (0.75 * Math.PI) / 180],
    ["22,5°", "22{,}5^{\\circ}", Math.PI / 8],
    ["-30°", "-30^{\\circ}", -Math.PI / 6],
    ["sin 30°", "\\sin 30^{\\circ}", 0.5],
    ["cos(60°)", "\\cos 60^{\\circ}", 0.5],
    ["sin 30°15'", "\\sin 30^{\\circ}\\,15'", Math.sin((30.25 * Math.PI) / 180)],
    ["2·30°", "2 \\cdot 30^{\\circ}", Math.PI / 3],
    ["180°-x", "180^{\\circ} - x", NaN],
  ])("angolo in gradi %s (vale in radianti)", (text, latex, radians) => {
    expect(tex(text)).toBe(latex);
    draws(latex);
    if (!Number.isNaN(radians)) expect(value(text)).toBeCloseTo(radians, 12);
  });

  it("gradi a metà, nell'anteprima: il numero dopo i gradi o i primi è l'unità che si sta scrivendo", () => {
    expect(preview("30°15")).toEqual({ latex: "30^{\\circ}\\,15'", complete: false });
    expect(preview("30°15'20")).toEqual({ latex: "30^{\\circ}\\,15'\\,20''", complete: false });
    expect(preview("sin(30°")).toEqual({ latex: "\\sin 30^{\\circ}", complete: false });
    expect(preview("30°15'+")).toEqual({ latex: "30^{\\circ}\\,15' + \\square", complete: false });
    const alone = parseExpression("°");
    expect(alone.ok).toBe(false);
    if (!alone.ok) expect(alone.error.message).toContain("dopo un numero");
  });

  it.each([
    ["5!", "5!", 120],
    ["0!", "0!", 1],
    ["n!", "n!", NaN],
    ["(n+1)!", "\\left(n + 1\\right)!", NaN],
    ["3!^2", "\\left(3!\\right)^{2}", 36],
    ["2·3!", "2 \\cdot 3!", 12],
    ["2n!", "2n!", NaN],
    ["n!k", "n! \\cdot k", NaN],
    ["10!/(8!·2!)", "\\frac{10!}{8! \\cdot 2!}", 45],
    ["(5-2)!", "\\left(5 - 2\\right)!", 6],
  ])("fattoriale %s", (text, latex, number) => {
    expect(tex(text)).toBe(latex);
    draws(latex);
    if (!Number.isNaN(number)) expect(value(text)).toBe(number);
  });

  it("fattoriale a metà, nell'anteprima, e scritture sbagliate", () => {
    expect(preview("(n+1")).toEqual({ latex: "n + 1", complete: false });
    expect(preview("5!·(")).toEqual({ latex: "5! \\cdot \\square", complete: false });
    expect(preview("n!/(")).toEqual({ latex: "\\frac{n!}{\\square}", complete: false });
    const alone = parseExpression("!5");
    expect(alone.ok).toBe(false);
    if (!alone.ok) expect(alone.error.message).toContain("fattoriale");
    // «!=» resta il «diverso»: 5! = 120 si scrive con lo spazio.
    const relation = parseRelation("5!=120");
    expect(relation.ok && relation.value.op).toBe("!=");
    const factorialRelation = parseRelation("5! = 120");
    expect(factorialRelation.ok && factorialRelation.value.op).toBe("=");
  });
});

function parseOk(text: string) {
  const result = parseExpression(text);
  if (!result.ok) throw new Error(`«${text}»: ${result.error.message}`);
  return result.value;
}
