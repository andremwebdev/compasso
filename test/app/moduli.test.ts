// I moduli dell'app senza interfaccia: testo ricco, anteprima della risposta, tastiera, tratti della lezione.

import { describe, expect, it } from "vitest";
import { lessonChunks } from "../../src/app/lezione/chunks";
import { KEYBOARD, KEYBOARD_LEVELS, pressKey, type FieldState, type Key } from "../../src/app/risposta/keys";
import { fieldKindOf, previewText } from "../../src/app/risposta/preview";
import { freshSeed } from "../../src/app/risposta/seeds";
import { renderRichText } from "../../src/app/testo/render";
import { loadLesson } from "../../src/contenuti";
import { generateExercise } from "../../src/esercizi";
import { generators } from "../../src/generatori";
import { parseExpression } from "../../src/motore/parser";
import { parseSolutionSet } from "../../src/motore/parser/sets";
import { setToInequalityLatex, setToLatex } from "../../src/motore/sets";

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

  it("ogni tipo di risposta scritta ha il suo campo", () => {
    for (const generator of generators) {
      const { answer } = generateExercise(generator, 1, 0);
      expect(fieldKindOf(answer), generator.code).not.toBeNull();
    }
  });
});

describe("tastiera matematica", () => {
  const empty: FieldState = { text: "", start: 0, end: 0 };
  const type = (keys: readonly Key[], labels: string, from = empty): FieldState =>
    labels.split(" ").reduce((field, label) => {
      const key = keys.find((item) => item.label === label);
      if (!key) throw new Error(`tasto «${label}» non trovato`);
      return pressKey(field, key);
    }, from);

  it("ogni livello è una griglia piena di sei colonne, con cancella e frecce", () => {
    expect(KEYBOARD_LEVELS).toEqual(["base", "insiemi", "funzioni"]);
    for (const level of KEYBOARD_LEVELS) {
      const { keys } = KEYBOARD[level];
      expect(keys.length % 6, level).toBe(0);
      expect(keys.filter((key) => key.action).map((key) => key.action)).toEqual(["backspace", "left", "right"]);
      expect(new Set(keys.map((key) => key.label)).size, level).toBe(keys.length);
    }
  });

  it("livello base: cifre, virgola, operazioni, frazione, potenza, radici, parentesi, x e y", () => {
    const labels = KEYBOARD.base.keys.map((key) => key.label);
    for (const needed of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "+", "−", "·", ":", "a⁄b", "xⁿ", "√", "ⁿ√", "(", ")", "x", "y", "⌫", "←", "→"]) {
      expect(labels, needed).toContain(needed);
    }
  });

  it("livello insiemi: parentesi tonde e quadre, punto e virgola, unione, infinito, vuoto, ℝ, disuguaglianze", () => {
    const labels = KEYBOARD.insiemi.keys.map((key) => key.label);
    for (const needed of ["[", "]", "(", ")", ";", "∪", "∞", "∅", "ℝ", "<", "≤", ">", "≥"]) expect(labels, needed).toContain(needed);
  });

  it("quello che si scrive con i tasti si legge: un insieme, una disuguaglianza, una frazione con potenza", () => {
    const interval = type(KEYBOARD.insiemi.keys, "( − ∞ ; − 2 ) ∪ [ 1 ; + ∞ )");
    expect(interval.text).toBe("(-∞; -2) ∪ [1; +∞)");
    expect(parseSolutionSet(interval.text)).toMatchObject({ ok: true, complete: true });
    const inequality = type(KEYBOARD.insiemi.keys, "x < − 2 ∨ x ≥ 1");
    expect(inequality.text).toBe("x < -2 ∨ x ≥ 1");
    expect(parseSolutionSet(inequality.text)).toMatchObject({ ok: true, complete: true });
    const fraction = type(KEYBOARD.base.keys, "( x + 1 ) a⁄b ( x − 2 ) x²");
    expect(fraction.text).toBe("(x+1)/(x-2)^2");
    expect(parseExpression(fraction.text)).toMatchObject({ ok: true, complete: true });
    const root = type(KEYBOARD.base.keys, "ⁿ√ 3 ; x )");
    expect(parseExpression(root.text)).toMatchObject({ ok: true, complete: true });
    const functions = type(KEYBOARD.funzioni.keys, "sin x ) · eˣ x )");
    expect(parseExpression(functions.text)).toMatchObject({ ok: true, complete: true });
  });

  it("il cursore: si scrive in mezzo, si cancella un tasto intero alla volta, la selezione viene sostituita", () => {
    let field = type(KEYBOARD.base.keys, "1 2 ← 5");
    expect(field).toEqual({ text: "152", start: 2, end: 2 });
    field = type(KEYBOARD.base.keys, "⌫ ⌫ ⌫ ⌫", field);
    expect(field).toEqual({ text: "2", start: 0, end: 0 });
    expect(type(KEYBOARD.base.keys, "→ → →", field)).toEqual({ text: "2", start: 1, end: 1 });
    // «√(» e « ∪ » sono un tasto solo: si cancellano in un colpo.
    expect(type(KEYBOARD.base.keys, "√ ⌫").text).toBe("");
    expect(type(KEYBOARD.insiemi.keys, "] ∪ ⌫").text).toBe("]");
    expect(type(KEYBOARD.funzioni.keys, "sin ⌫").text).toBe("");
    expect(pressKey({ text: "abc", start: 0, end: 3 }, KEYBOARD.base.keys[0] as Key)).toEqual({ text: "7", start: 1, end: 1 });
    // Solo i nomi di funzione se ne vanno con la parentesi: in «2x(» si cancella la parentesi, la x resta.
    expect(type(KEYBOARD.base.keys, "2 x ( ⌫").text).toBe("2x");
    expect(type(KEYBOARD.funzioni.keys, "x arctan ⌫").text).toBe("x");
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
  });

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
