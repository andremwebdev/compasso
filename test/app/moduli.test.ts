// I moduli dell'app senza interfaccia: testo ricco, anteprima della risposta, tastiera, tratti della lezione.

import { describe, expect, it } from "vitest";
import { lessonChunks } from "../../src/app/lezione/chunks";
import { KEYBOARD, KEYBOARD_LEVELS, pressKey, type FieldState, type Key, type KeyboardLevel } from "../../src/app/risposta/keys";
import { keyboardFor } from "../../src/app/risposta/levels";
import { fieldKindOf, gridPreview, previewText } from "../../src/app/risposta/preview";
import { freshSeed } from "../../src/app/risposta/seeds";
import { renderRichText } from "../../src/app/testo/render";
import { loadLesson } from "../../src/contenuti";
import { choiceOptions, exact, generateExercise } from "../../src/esercizi";
import { loadedGenerators } from "../../src/generatori";
import { parseLimitValue } from "../../src/motore/calculus/limit";
import { degrees, factorial, toLatex } from "../../src/motore/expr";
import { parseExpression } from "../../src/motore/parser";
import { parseSolutionSet } from "../../src/motore/parser/sets";
import { setToInequalityLatex, setToLatex } from "../../src/motore/sets";

// Tutti i generatori: test/setup.ts carica tutti i moduli prima di ogni file di test.
const generators = loadedGenerators();

describe("testo ricco", () => {
  it("il Markdown diventa HTML e le formule passano da KaTeX senza essere toccate da Markdown", () => {
    const html = renderRichText("Un testo **forte** con $a_1 * b_2 * c$ e basta.");
    expect(html).toContain("<strong>forte</strong>");
    expect(html).toContain('class="katex"');
    // Gli asterischi e i trattini bassi della formula non sono diventati corsivo.
    expect(html).not.toContain("<em>");
  });

  it("una formula a centro pagina sta in un blocco che scorre, fuori dai paragrafi", () => {
    const html = renderRichText("Prima.\n\n$$x^2 + 1$$\n\nDopo.");
    expect(html).toContain('<div class="formula formula-display">');
    expect(html).not.toMatch(/<p>\s*<div/);
    expect(renderRichText("Riga con $$x$$ in mezzo.", { inline: true })).not.toContain("<div");
  });

  it("i rimandi diventano pulsanti con il loro bersaglio", () => {
    const html = renderRichText("Vedi [[disequazione-fratta]] e [[segno-di-una-frazione|la regola dei segni]].");
    expect(html).toContain('data-ref="disequazione-fratta">disequazione fratta</button>');
    expect(html).toContain('data-ref="segno-di-una-frazione">la regola dei segni</button>');
  });

  it("la punteggiatura resta attaccata a una formula breve, non a una lunga", () => {
    const html = renderRichText("in $x = 3$ la frazione vale $0$.", { inline: true });
    expect(html).toMatch(/<span class="math-tail"><span class="formula.*<\/span>\.<\/span>$/);
    expect(html.match(/math-tail/g)).toHaveLength(1);
    // Una formula lunga deve poter andare a capo al suo interno: niente blocco unico.
    expect(renderRichText("Vale $x^{2} - 5x + 6 = (x - 2)(x - 3)$.", { inline: true })).not.toContain("math-tail");
  });

  it("in riga non produce paragrafi; un dollaro vero resta un dollaro", () => {
    expect(renderRichText("Costa 5 \\$ e $x$.", { inline: true })).not.toContain("<p>");
    expect(renderRichText("Costa 5 \\$.", { inline: true })).toContain("5 $");
  });

  it("i passaggi e gli indizi di tutti i generatori si disegnano senza segnaposto rimasti né formule in errore", () => {
    for (const generator of generators) {
      for (const level of generator.levels) {
        for (let seed = 0; seed < 15; seed++) {
          const exercise = generateExercise(generator, level, seed);
          for (const text of [exercise.prompt, ...exercise.steps.map((step) => step.text), ...exercise.hints]) {
            const html = renderRichText(text);
            expect(html, `${generator.code} L${level} s${seed}`).not.toMatch(/@@[DM]\d+@@/);
            expect(html, `${generator.code} L${level} s${seed}: ${text}`).not.toContain("katex-error");
          }
        }
      }
    }
  });
});

describe("anteprima della risposta", () => {
  const set = { kind: "set", variable: "x" } as const;
  const expression = { kind: "expression", complex: false } as const;

  it("campo vuoto, testo completo, testo incompleto, testo sbagliato", () => {
    expect(previewText(expression, "  ")).toEqual({ kind: "empty" });
    expect(previewText(expression, "3x^2")).toEqual({ kind: "ok", latex: "3x^{2}", complete: true });
    const partial = previewText(expression, "(x+1)/");
    expect(partial).toMatchObject({ kind: "ok", complete: false });
    expect(partial.kind === "ok" && partial.latex).toContain("\\square");
    expect(previewText(expression, "3 +* 2").kind).toBe("error");
  });

  it("un insieme si vede come è stato scritto", () => {
    expect(previewText(set, "(-∞; -2) ∪ [1; +∞)")).toEqual({ kind: "ok", latex: String.raw`\left(-\infty; -2\right) \cup \left[1; +\infty\right)`, complete: true });
    expect(previewText(set, "x < -2 ∨ x ≥ 1")).toMatchObject({ kind: "ok", complete: true });
    // Un insieme scritto a metà non è un errore: Andrea sta ancora scrivendo.
    for (const partial of ["x", "[1; ", "(-∞", "(-∞;", "(-∞; -2) ∪", "x <", "x < -2 ∨", "[", "{1; 2", "-2 < x <", "[1; +∞"]) {
      expect(previewText(set, partial), partial).toEqual({ kind: "typing" });
    }
    // Revisione 4a: le scritture che il parser ora legge (più soluzioni con «;», incognita con l'indice,
    // decimali tra graffe) non devono dare errore a metà strada.
    for (const partial of ["{1,", "{1,5", "{1,5;", "x = 3;", "x = 3; x", "x = 3; x =", "x_", "x_1", "x_1 =", "x ≤ e ∨"]) {
      expect(previewText(set, partial), partial).toEqual({ kind: "typing" });
    }
    // Una quadra dalla parte dell'infinito è un errore da correggere subito, con il motivo giusto.
    for (const wrong of ["[-∞", "[-∞; 2", "[-∞; 2]", "(2; +∞]"]) {
      expect(previewText(set, wrong), wrong).toMatchObject({ kind: "error", message: expect.stringContaining("infinito") });
    }
    // Un testo che nessuna chiusura può salvare resta un errore, con il motivo.
    expect(previewText(set, "(1; 3) ∪ ∪").kind).toBe("error");
    expect(previewText(set, "x + ) 2").kind).toBe("error");
  });

  it("ogni tipo di risposta scritta ha il suo campo, e ogni scelta multipla le sue opzioni", () => {
    for (const generator of generators) {
      const exercise = generateExercise(generator, 1, 0);
      const { answer } = exercise;
      // Le risposte a scelta (scelta multipla, vero o falso, riordino) non si scrivono: niente campo.
      if (answer.kind === "choice") expect(choiceOptions(exercise), generator.code).not.toBeNull();
      else if (answer.kind !== "truefalse" && answer.kind !== "ordering") expect(fieldKindOf(answer), generator.code).not.toBeNull();
    }
  });
});

describe("tastiera matematica", () => {
  const empty: FieldState = { text: "", start: 0, end: 0 };
  const type = (keys: readonly Key[], labels: string, from = empty): FieldState =>
    // «non esiste» è un tasto solo: lo spazio dentro l'etichetta non separa due tasti.
    labels.replaceAll("non esiste", "non\u00a0esiste").split(" ").reduce((field, label) => {
      const key = keys.find((item) => item.label === label.replaceAll("\u00a0", " "));
      if (!key) throw new Error(`tasto «${label}» non trovato`);
      return pressKey(field, key);
    }, from);

  it("ogni livello è una griglia piena, con cancella e frecce, senza tasti doppi", () => {
    expect(KEYBOARD_LEVELS).toEqual(["base", "funzioni", "insiemi", "analisi", "lineare", "complessi"]);
    for (const level of KEYBOARD_LEVELS) {
      const { keys, columns } = KEYBOARD[level];
      const cells = keys.reduce((sum, key) => sum + (key.span ?? 1), 0);
      expect(cells % columns, level).toBe(0);
      const actions = keys.filter((key) => key.action).map((key) => key.action);
      for (const needed of ["backspace", "left", "right"] as const) expect(actions, `${level}: ${needed}`).toContain(needed);
      expect(new Set(keys.map((key) => key.label)).size, level).toBe(keys.length);
      // Ogni tasto o inserisce un testo o fa un'azione, mai tutte e due.
      for (const key of keys) expect((key.insert === undefined) !== (key.action === undefined), `${level}: ${key.label}`).toBe(true);
    }
  });

  it("i tasti della specifica ci sono tutti, ognuno nel suo livello", () => {
    const labels = (level: KeyboardLevel): string[] => KEYBOARD[level].keys.map((key) => key.label);
    // Base: cifre, virgola, + − · :, frazione, potenza, radice quadrata e n-esima, parentesi, x e y, cancella, frecce.
    for (const needed of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "+", "−", "·", ":", "a⁄b", "xⁿ", "√", "ⁿ√", "(", ")", "x", "y", "⌫", "←", "→"]) {
      expect(labels("base"), needed).toContain(needed);
    }
    // Funzioni: sin, cos, tan, le inverse, log, ln, eˣ, π, e, valore assoluto; e anche le cifre.
    for (const needed of ["sin", "cos", "tan", "arcsin", "arccos", "arctan", "log", "ln", "eˣ", "π", "e", "|x|", "0", "5", "9", ","]) {
      expect(labels("funzioni"), needed).toContain(needed);
    }
    // Insiemi: quadre e tonde, ∪, ∅, ℝ, ∞, ±, punto e virgola, k intero.
    for (const needed of ["[", "]", "(", ")", "∪", "∅", "ℝ", "∞", "±", ";", "k", "<", "≤", ">", "≥", "π"]) expect(labels("insiemi"), needed).toContain(needed);
    // Analisi: i valori di un limite. Complessi: i.
    for (const needed of ["+∞", "−∞", "non esiste", "e"]) expect(labels("analisi"), needed).toContain(needed);
    expect(labels("complessi")).toContain("i");
    expect(KEYBOARD.lineare.keys.map((key) => key.action)).toEqual(expect.arrayContaining(["prevCell", "nextCell"]));
  });

  it("frazione a modello: dopo un numero quello è il numeratore, altrimenti due caselle; ⇥ passa al denominatore", () => {
    expect(type(KEYBOARD.base.keys, "3 a⁄b 4")).toEqual({ text: "3/(4)", start: 4, end: 4 });
    let field = type(KEYBOARD.base.keys, "a⁄b");
    expect(field).toEqual({ text: "()/()", start: 1, end: 1 });
    expect(parseExpression(field.text)).toMatchObject({ ok: true, complete: false });
    field = type(KEYBOARD.base.keys, "x + 1 ⇥ x − 2 ⇥ x²", field);
    expect(field.text).toBe("(x+1)/(x-2)^2");
    expect(parseExpression(field.text)).toMatchObject({ ok: true, complete: true });
    // Con una selezione, la selezione va al numeratore.
    expect(type(KEYBOARD.base.keys, "a⁄b", { text: "x+1", start: 0, end: 3 })).toEqual({ text: "(x+1)/()", start: 7, end: 7 });
    // Dopo una parentesi chiusa, la parentesi è il numeratore.
    expect(type(KEYBOARD.base.keys, "( x + 1 ) a⁄b 2").text).toBe("(x+1)/(2)");
  });

  it("potenze, radici e funzioni a modello: si scrive dentro, ⇥ porta fuori", () => {
    const power = type(KEYBOARD.base.keys, "x xⁿ 2 x ⇥ + 1");
    expect(power.text).toBe("x^(2x)+1");
    expect(parseExpression(power.text)).toMatchObject({ ok: true, complete: true });
    const root = type(KEYBOARD.base.keys, "ⁿ√ 3 ⇥ x ⇥ − 1");
    expect(root.text).toBe("root(3; x)-1");
    expect(parseExpression(root.text)).toMatchObject({ ok: true, complete: true });
    const functions = type(KEYBOARD.funzioni.keys, "sin x ⇥ · eˣ 2 x ⇥");
    expect(functions.text).toBe("sin(x)·e^(2x)");
    expect(parseExpression(functions.text)).toMatchObject({ ok: true, complete: true });
    // Le costanti arbitrarie delle equazioni differenziali: c₁ e c₂ si leggono come due lettere distinte.
    const constants = type(KEYBOARD.funzioni.keys, "c₁ · eˣ x ⇥ + c₂ · x · eˣ x ⇥");
    expect(constants.text).toBe("c_1·e^(x)+c_2·x·e^(x)");
    expect(parseExpression(constants.text)).toMatchObject({ ok: true, complete: true });
    // A metà, le caselle vuote sono pezzi che mancano, non errori.
    for (const half of ["sin", "√", "xⁿ"]) {
      const keys = half === "sin" ? KEYBOARD.funzioni.keys : KEYBOARD.base.keys;
      expect(parseExpression(type(keys, `2 ${half}`).text), half).toMatchObject({ ok: true, complete: false });
    }
  });

  it("livelli Analisi e Complessi: valori di un limite e numeri complessi si scrivono e si leggono", () => {
    for (const [labels, expected] of [["+∞", "+∞"], ["−∞", "-∞"], ["non esiste", "non esiste"], ["e xⁿ 2", "e^(2)"]] as const) {
      const field = type(KEYBOARD.analisi.keys, labels);
      expect(field.text).toBe(expected);
      expect(parseLimitValue(field.text), labels).toMatchObject({ ok: true, complete: true });
    }
    const algebraic = type(KEYBOARD.complessi.keys, "3 − 2 · i");
    expect(parseExpression(algebraic.text, { complex: true })).toMatchObject({ ok: true, complete: true });
    const exponential = type(KEYBOARD.complessi.keys, "2 eⁱ π a⁄b 3 ⇥ ⇥");
    expect(exponential.text).toBe("2e^(iπ/(3))");
    expect(parseExpression(exponential.text, { complex: true })).toMatchObject({ ok: true, complete: true });
  });

  it("livello Insiemi: intervalli, disuguaglianze, soluzioni periodiche, «per ogni x» e «non esiste x»", () => {
    const interval = type(KEYBOARD.insiemi.keys, "( − ∞ ; − 2 ) ∪ [ 1 / 3 ; + ∞ )");
    expect(interval.text).toBe("(-∞; -2) ∪ [1/3; +∞)");
    expect(parseSolutionSet(interval.text)).toMatchObject({ ok: true, complete: true });
    const inequality = type(KEYBOARD.insiemi.keys, "x < − √ 2 ∨ x ≥ 1");
    expect(inequality.text).toBe("x < -√2 ∨ x ≥ 1");
    expect(parseSolutionSet(inequality.text)).toMatchObject({ ok: true, complete: true });
    const periodic = type(KEYBOARD.insiemi.keys, "x = ± π / 3 + 2 k π");
    expect(periodic.text).toBe("x = ±π/3+2kπ");
    expect(parseSolutionSet(periodic.text)).toMatchObject({ ok: true, complete: true });
    for (const words of ["∀x", "∄x", "∅", "ℝ"]) expect(parseSolutionSet(type(KEYBOARD.insiemi.keys, words).text), words).toMatchObject({ ok: true, complete: true });
  });

  it("il cursore: si scrive in mezzo, si cancella un tasto intero alla volta, la selezione viene sostituita", () => {
    let field = type(KEYBOARD.base.keys, "1 2 ← 5");
    expect(field).toEqual({ text: "152", start: 2, end: 2 });
    field = type(KEYBOARD.base.keys, "⌫ ⌫ ⌫ ⌫", field);
    expect(field).toEqual({ text: "2", start: 0, end: 0 });
    expect(type(KEYBOARD.base.keys, "→ → →", field)).toEqual({ text: "2", start: 1, end: 1 });
    // Un modello vuoto («√()», «sin()», «()/()») e « ∪ » sono un tasto solo: si cancellano in un colpo.
    expect(type(KEYBOARD.base.keys, "√ ⌫").text).toBe("");
    expect(type(KEYBOARD.base.keys, "a⁄b ⌫").text).toBe("");
    expect(type(KEYBOARD.base.keys, "3 a⁄b ⌫").text).toBe("3");
    expect(type(KEYBOARD.base.keys, "x xⁿ ⌫").text).toBe("x");
    expect(type(KEYBOARD.insiemi.keys, "] ∪ ⌫").text).toBe("]");
    expect(type(KEYBOARD.funzioni.keys, "sin ⌫").text).toBe("");
    expect(type(KEYBOARD.analisi.keys, "non esiste ⌫").text).toBe("");
    expect(type(KEYBOARD.funzioni.keys, "c₁ ⌫").text).toBe("");
    expect(pressKey({ text: "abc", start: 0, end: 3 }, KEYBOARD.base.keys[0] as Key)).toEqual({ text: "7", start: 1, end: 1 });
    // Solo i nomi di funzione se ne vanno con la parentesi: in «2x(» si cancella la parentesi, la x resta.
    expect(type(KEYBOARD.base.keys, "2 x ( ⌫").text).toBe("2x");
    expect(type(KEYBOARD.funzioni.keys, "x arctan ⌫").text).toBe("x");
    // Dentro una casella piena si cancella un carattere alla volta.
    expect(type(KEYBOARD.funzioni.keys, "sin x ⌫").text).toBe("sin()");
  });

  it("tasti del Volume 1: fattoriale, notazione scientifica e periodo in Base, gradi in Funzioni; il testo si legge", () => {
    const read = (field: FieldState): string => {
      const result = parseExpression(field.text);
      if (!result.ok) throw new Error(`${field.text}: ${result.error.message}`);
      return `${toLatex(result.value)}${result.complete ? "" : " …"}`;
    };
    expect(read(type(KEYBOARD.base.keys, "n n!"))).toBe("n!");
    expect(read(type(KEYBOARD.base.keys, "( n + 1 ) n!"))).toBe("\\left(n + 1\\right)!");
    expect(read(type(KEYBOARD.base.keys, "1 0 n! a⁄b 8 n! · 2 n! ⇥"))).toBe("\\frac{10!}{8! \\cdot 2!}");
    const scientific = type(KEYBOARD.base.keys, "3 , 2 ·10ⁿ");
    expect(scientific).toEqual({ text: "3,2·10^()", start: 8, end: 8 });
    expect(read(scientific)).toBe("3{,}2 \\cdot 10^{\\square} …");
    expect(read(type(KEYBOARD.base.keys, "− 5 ⇥", scientific))).toBe("3{,}2 \\cdot 10^{-5}");
    expect(type(KEYBOARD.base.keys, "⌫", scientific).text).toBe("3,2");
    const periodic = type(KEYBOARD.base.keys, "0 , 1 periodo");
    expect(periodic).toEqual({ text: "0,1()", start: 4, end: 4 });
    expect(read(periodic)).toBe("0{,}1\\overline{\\square} …");
    expect(read(type(KEYBOARD.base.keys, "6", periodic))).toBe("0{,}1\\overline{6}");
    expect(type(KEYBOARD.base.keys, "⌫", periodic).text).toBe("0,1");
    const angle = type(KEYBOARD.funzioni.keys, "3 0 ° 1 5");
    expect(read(angle)).toBe("30^{\\circ}\\,15' …");
    expect(read(type(KEYBOARD.funzioni.keys, "′ 2 0 ″", angle))).toBe("30^{\\circ}\\,15'\\,20''");
    expect(read(type(KEYBOARD.funzioni.keys, "sin 3 0 ° ⇥"))).toBe("\\sin 30^{\\circ}");
    expect(read(type(KEYBOARD.funzioni.keys, "π a⁄b 6"))).toBe("\\frac{\\pi}{6}");
    // Dopo 5! la frazione prende 5! come numeratore.
    expect(type(KEYBOARD.base.keys, "5 n! a⁄b 2").text).toBe("5!/(2)");
    // Gradi in Funzioni (con π), fattoriale in Base.
    expect(keyboardFor({ kind: "number", correct: degrees(30), mode: exact, wrong: [] }).initial).toBe("funzioni");
    expect(keyboardFor({ kind: "number", correct: factorial(5), mode: exact, wrong: [] }).initial).toBe("base");
  });

  it("la tastiera si apre sul livello che serve al tipo di esercizio", () => {
    const opened = (code: string): string => {
      const generator = generators.find((item) => item.code === code);
      if (!generator) throw new Error(code);
      return keyboardFor(generateExercise(generator, 2, 0).answer).initial;
    };
    expect(opened("V1.M06.A04.g1")).toBe("insiemi");
    expect(opened("V1.M04.A07.g1")).toBe("base");
    expect(opened("V2.M06.A03.g1")).toBe("funzioni");
    expect(opened("V2.M09.A01.g1")).toBe("funzioni");
    expect(opened("V2.M03.A01.g1")).toBe("analisi");
    expect(opened("V3.M02.A01.g1")).toBe("lineare");
    expect(opened("V3.M03.A01.g1")).toBe("base");
    // Ogni livello di apertura è tra quelli mostrati; «Matrici» solo con le caselle.
    for (const generator of generators) {
      const setup = keyboardFor(generateExercise(generator, 1, 0).answer);
      expect(setup.levels, generator.code).toContain(setup.initial);
      expect(setup.levels.includes("lineare"), generator.code).toBe(generator.code.startsWith("V3.M02"));
    }
  });

  it("l'anteprima di una matrice: □ nelle caselle vuote, il motivo con riga e colonna", () => {
    const field = { kind: "expression", complex: false } as const;
    expect(gridPreview(field, [["", ""], ["", ""]])).toEqual({ kind: "empty" });
    expect(gridPreview(field, [["1", ""], ["", "2/3"]])).toEqual({ kind: "ok", latex: "\\begin{pmatrix} 1 & \\square \\\\ \\square & \\frac{2}{3} \\end{pmatrix}", complete: false });
    expect(gridPreview(field, [["1", "0"], ["0", "1"]])).toMatchObject({ kind: "ok", complete: true });
    expect(gridPreview(field, [["1", "0"], ["2+*3", "1"]])).toEqual({ kind: "error", message: "Riga 2, colonna 1: Qui manca un numero o una lettera." });
    expect(gridPreview(field, [["1"], ["x+1)"]])).toEqual({ kind: "error", message: "Casella 2: C'è una parentesi chiusa in più." });
  });
});

describe("mentre Andrea scrive, l'anteprima non dà per sbagliato un pezzo di risposta giusta", () => {
  /** Il LaTeX di un insieme riscritto come lo si scrive con la tastiera. */
  const typed = (latex: string): string =>
    latex.replace(/\\left|\\right/g, "").replace(/\\infty/g, "∞").replace(/\\cup/g, "∪").replace(/\\emptyset/g, "∅").replace(/\\mathbb\{R\}/g, "ℝ")
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2").replace(/\\\{/g, "{").replace(/\\\}/g, "}")
      .replace(/\\lor/g, "∨").replace(/\\le\b/g, "≤").replace(/\\ge\b/g, "≥").replace(/\\ne\b/g, "≠").replace(/\s+/g, " ").trim();

  it("le risposte delle disequazioni fratte, un carattere alla volta: intervalli (con e senza spazi) e disuguaglianze", () => {
    const set = { kind: "set", variable: "x" } as const;
    const generator = generators.find((item) => item.code === "V1.M06.A04.g1");
    if (!generator) throw new Error("manca il generatore delle disequazioni fratte");
    let texts = 0;
    for (const level of generator.levels) {
      for (let seed = 0; seed < 60; seed++) {
        const { answer } = generateExercise(generator, level, seed);
        if (answer.kind !== "set") throw new Error("tipo di risposta inatteso");
        for (const value of [answer.correct, ...answer.wrong.map((wrong) => wrong.value)]) {
          const interval = typed(setToLatex(value));
          // «∀x ∈ ℝ» e «∄x ∈ ℝ» non si scrivono con la tastiera: lì si usano ℝ e ∅.
          const forms = [interval, interval.replace(/; /g, ";").replace(/ ∪ /g, "∪"), typed(setToInequalityLatex(value))].filter((text) => !/[∀∄\\]/.test(text));
          for (const text of forms) {
            texts += 1;
            expect(previewText(set, text), text).toMatchObject({ kind: "ok", complete: true });
            for (let length = 1; length < text.length; length++) {
              expect(previewText(set, text.slice(0, length)).kind, `«${text.slice(0, length)}», scrivendo «${text}»`).not.toBe("error");
            }
          }
        }
      }
    }
    expect(texts).toBeGreaterThan(1500);
  }, 30_000);

  it("i motivi del parser contengono formule, e l'app le disegna", () => {
    const preview = previewText({ kind: "set", variable: "x" }, "x < 1; x > 2");
    if (preview.kind !== "error") throw new Error("mi aspettavo un motivo");
    expect(preview.message).toContain("$\\lor$");
    const html = renderRichText(preview.message, { inline: true, untrusted: true });
    expect(html).toContain("katex");
    expect(html).not.toContain("$");
    // Un motivo può citare quello che ha scritto Andrea: fuori dalle formule non deve diventare HTML.
    const quoted = renderRichText("Carattere non riconosciuto: «<img src=x onerror=alert(1)>». Usa $<$.", { inline: true, untrusted: true });
    expect(quoted).not.toContain("<img");
    expect(quoted).toContain("&lt;img");
    expect(quoted).toContain("katex");
  });
});

describe("semi per gli esercizi nuovi", () => {
  it("«Esercizio simile» e «Avanti» non ripropongono un esercizio già uscito nella serie", () => {
    const generator = generators.find((item) => item.code === "V1.M04.A07.g1");
    if (!generator) throw new Error("manca il generatore della scomposizione");
    const prompt = (seed: number): string => generateExercise(generator, 1, seed).prompt;
    // I semi «a caso» escono in quest'ordine: i primi due danno esercizi già visti.
    const queue = [1, 2, 3, 4];
    const random = (): number => queue.shift() ?? 99;
    expect(freshSeed(generator, 1, new Set([prompt(1), prompt(2)]), random)).toBe(3);
    // Niente di già visto: va bene il primo.
    expect(freshSeed(generator, 1, new Set(), () => 7)).toBe(7);
    // Se non ce n'è uno nuovo ci si ferma lo stesso (qui dopo tre tentativi).
    let calls = 0;
    expect(freshSeed(generator, 1, new Set([prompt(5)]), () => ((calls += 1), 5), 3)).toBe(5);
    expect(calls).toBe(3);
  });
});

describe("tratti della lezione", () => {
  it("ogni tratto finisce con una domanda, tranne l'ultimo che finisce con il riepilogo", () => {
    const lesson = loadLesson("V1.M06.L04");
    if (!lesson) throw new Error("lezione non trovata");
    const chunks = lessonChunks(lesson);
    expect(chunks.length).toBe(5);
    for (const chunk of chunks.slice(0, -1)) expect(chunk.at(-1)?.kind).toBe("question");
    expect(chunks.at(-1)?.at(-1)?.kind).toBe("summary");
    // Le flashcard non compaiono nel testo.
    expect(chunks.flat().some((block) => block.kind === "flashcard")).toBe(false);
    expect(chunks.flat().length).toBe(lesson.blocks.filter((block) => block.kind !== "flashcard").length);
  });
});
