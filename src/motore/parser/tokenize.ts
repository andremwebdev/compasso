// Analisi lessicale: spezza il testo scritto da Andrea in simboli (numeri, nomi, operatori).
// È tollerante: accetta virgola o punto decimale, i simboli della tastiera matematica (√, π, ·, −, ≤…)
// e le scritture da tastiera fisica (sqrt, pi, ^, *, <=…).

import { functionNames, functionTable } from "../expr/functions";
import type { FunctionName, RepeatingDigits } from "../expr/types";

export type Token =
  /**
   * Numero. Se `repeating` c'è, è un numero periodico (0,1(6), 0,16̅); `open` dice che il periodo
   * non è ancora chiuso («0,1(6» mentre si scrive): il testo è incompleto.
   */
  | { readonly type: "num"; readonly text: string; readonly pos: number; readonly repeating?: RepeatingDigits; readonly open?: boolean }
  | { readonly type: "sym"; readonly name: string; readonly pos: number }
  | { readonly type: "const"; readonly name: "pi" | "e" | "i"; readonly pos: number }
  | { readonly type: "fn"; readonly name: FunctionName; readonly pos: number }
  /** Parole speciali: radici, valore assoluto, esponenziale, logaritmo con base. */
  | { readonly type: "word"; readonly name: "sqrt" | "cbrt" | "root" | "abs" | "exp" | "log"; readonly pos: number }
  /** Esponente scritto in apice (x², x⁻¹): vale come ^ seguito dal numero. */
  | { readonly type: "sup"; readonly text: string; readonly pos: number }
  /** Radice scritta con il simbolo: √ (indice 2), ∛ (3), ∜ (4). */
  | { readonly type: "radical"; readonly index: number; readonly pos: number }
  | { readonly type: "op"; readonly op: Operator; readonly pos: number }
  | { readonly type: "end"; readonly pos: number };

export type Operator =
  | "+" | "-" | "*" | "/" | "^" | "(" | ")" | "|" | ";" | "_" | "%"
  /** Dopo l'argomento: fattoriale, gradi, primi, secondi. */
  | "!" | "°" | "′" | "″"
  | "=" | "!=" | "<" | "<=" | ">" | ">=";

export interface LexError {
  readonly message: string;
  readonly position: number;
}

/** Nomi di lettere greche accettati come variabili. */
const GREEK_NAMES = ["alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu", "rho", "sigma", "tau", "phi", "omega"];
const GREEK_LETTERS: Readonly<Record<string, string>> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", θ: "theta", λ: "lambda", μ: "mu", ρ: "rho", σ: "sigma", τ: "tau", φ: "phi", ω: "omega",
};

type WordToken =
  | { type: "fn"; name: FunctionName }
  | { type: "word"; name: "sqrt" | "cbrt" | "root" | "abs" | "exp" | "log" }
  | { type: "const"; name: "pi" }
  | { type: "sym"; name: string };

/** I simboli della tastiera Insiemi che in un'espressione non hanno senso, con il loro significato. */
const SET_ONLY_SYMBOLS: Readonly<Record<string, string>> = {
  "∀": "∀x vuol dire «tutti i numeri reali»",
  "∄": "∄x vuol dire «nessuna soluzione»",
  "∅": "l'insieme vuoto",
  "ℝ": "tutti i numeri reali",
  "∪": "l'unione di due insiemi",
  "∨": "«oppure» tra due condizioni",
  "∧": "«e» tra due condizioni",
};

/** Tutte le parole riconosciute dentro una sequenza di lettere, dalla più lunga alla più corta. */
const WORDS: readonly (readonly [string, WordToken])[] = (() => {
  const words = new Map<string, WordToken>();
  for (const name of functionNames) {
    words.set(name, { type: "fn", name });
    for (const alias of functionTable[name].aliases) words.set(alias, { type: "fn", name });
  }
  for (const alias of ["sqrt", "radq", "rad"]) words.set(alias, { type: "word", name: "sqrt" });
  words.set("cbrt", { type: "word", name: "cbrt" });
  for (const alias of ["root", "radice"]) words.set(alias, { type: "word", name: "root" });
  words.set("abs", { type: "word", name: "abs" });
  words.set("exp", { type: "word", name: "exp" });
  for (const alias of ["log", "lg"]) words.set(alias, { type: "word", name: "log" });
  words.set("pi", { type: "const", name: "pi" });
  for (const name of GREEK_NAMES) words.set(name, { type: "sym", name });
  return [...words.entries()].sort(([a], [b]) => b.length - a.length);
})();

const SUPERSCRIPTS: Readonly<Record<string, string>> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-",
};

const SINGLE_OPERATORS: Readonly<Record<string, Operator>> = {
  "+": "+",
  "-": "-", "−": "-", "–": "-", "—": "-",
  "*": "*", "·": "*", "⋅": "*", "∙": "*", "×": "*",
  "/": "/", ":": "/", "÷": "/",
  "^": "^",
  "(": "(", "[": "(", "{": "(",
  ")": ")", "]": ")", "}": ")",
  "|": "|",
  ";": ";",
  "_": "_",
  "%": "%",
  "!": "!",
  // Il grado; «º» (indicatore ordinale) è quello che molte tastiere scrivono al suo posto.
  "°": "°", "º": "°",
  "′": "′", "'": "′", "’": "′",
  "″": "″", '"': "″",
  "=": "=", "≠": "!=", "<": "<", ">": ">", "≤": "<=", "≥": ">=",
};

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";
/** Lineetta combinante (sopralineato o macron): 0,16̅ è il periodico 0,1(6). */
const isOverline = (ch: string | undefined): boolean => ch === "\u0305" || ch === "\u0304";
const isLetter = (ch: string | undefined): boolean => ch !== undefined && /\p{L}/u.test(ch);

export interface LexOptions {
  /** Se vero, la lettera i è l'unità immaginaria; altrimenti è una variabile qualsiasi. */
  readonly complex?: boolean;
}

export function tokenize(text: string, options: LexOptions = {}): { tokens: Token[] } | { error: LexError } {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < text.length) {
    const ch = text[pos] as string;
    const next = text[pos + 1];

    if (/\s/.test(ch)) {
      pos += 1;
      continue;
    }

    // Numeri: cifre, con virgola o punto decimale solo se seguiti subito da un'altra cifra
    // (o dal periodo: 0,(3)); poi l'eventuale periodo e l'eventuale notazione scientifica (3,2E5).
    if (isDigit(ch) || ((ch === "," || ch === ".") && isDigit(next) && !isDigit(text[pos - 1]))) {
      const number = readNumber(text, pos);
      if ("error" in number) return number;
      tokens.push(...number.tokens);
      pos = number.end;
      continue;
    }

    // Una virgola che non è decimale separa gli argomenti, come il punto e virgola: root(3, x).
    if (ch === ",") {
      tokens.push({ type: "op", op: ";", pos });
      pos += 1;
      continue;
    }

    if (ch in SUPERSCRIPTS) {
      let end = pos;
      let value = "";
      while (text[end] !== undefined && (text[end] as string) in SUPERSCRIPTS) {
        value += SUPERSCRIPTS[text[end] as string];
        end += 1;
      }
      if (!/^-?\d+$/.test(value)) return { error: { message: "Esponente non valido.", position: pos } };
      tokens.push({ type: "sup", text: value, pos });
      pos = end;
      continue;
    }

    if (ch === "√" || ch === "∛" || ch === "∜") {
      tokens.push({ type: "radical", index: ch === "√" ? 2 : ch === "∛" ? 3 : 4, pos });
      pos += 1;
      continue;
    }

    if (ch === "π") {
      tokens.push({ type: "const", name: "pi", pos });
      pos += 1;
      continue;
    }

    if (ch === "∞") return { error: { message: "L'infinito non è un numero: qui non si può usare.", position: pos } };

    // Simboli che servono solo a scrivere un insieme di soluzioni: in un'espressione non sono un
    // carattere sconosciuto, sono al posto sbagliato. Il messaggio lo dice e ricorda che cosa vogliono dire.
    const setSymbol = SET_ONLY_SYMBOLS[ch];
    if (setSymbol !== undefined) {
      return { error: { message: `«${ch}» (${setSymbol}) si usa solo per scrivere un insieme di soluzioni, e qui la risposta non è un insieme.`, position: pos } };
    }

    // Operatori di due caratteri. «!=» è sempre «diverso»: 5!=120 si legge 5 ≠ 120 (per il fattoriale: 5! = 120).
    const pair = ch + (next ?? "");
    const double: Operator | "**" | undefined =
      pair === "<=" || pair === "=<"
        ? "<="
        : pair === ">=" || pair === "=>"
          ? ">="
          : pair === "!=" || pair === "<>"
            ? "!="
            : pair === "**"
              ? "**"
              : pair === "''" || pair === "′′" || pair === "’’"
                ? "″"
                : undefined;
    if (double !== undefined) {
      tokens.push({ type: "op", op: double === "**" ? "^" : double, pos });
      pos += 2;
      continue;
    }

    const single = SINGLE_OPERATORS[ch];
    if (single !== undefined) {
      tokens.push({ type: "op", op: single, pos });
      pos += 1;
      continue;
    }

    if (isLetter(ch)) {
      pos = readLetters(text, pos, tokens, options);
      continue;
    }

    return { error: { message: `Carattere non riconosciuto: «${ch}».`, position: pos } };
  }
  tokens.push({ type: "end", pos: text.length });
  return { tokens };
}

type NumberRead = { readonly tokens: Token[]; readonly end: number } | { readonly error: LexError };

/**
 * Legge un numero a partire da `pos`: intero o decimale, poi
 * - il periodo tra parentesi, attaccato alle cifre decimali: 0,1(6), 3,(3), 0.1(6). Dentro le
 *   parentesi solo cifre; con altro (0,5(x + 1)) le parentesi sono un fattore, come sempre. Un periodo
 *   non chiuso in fondo al testo («0,1(», «0,1(6») è un periodico ancora da finire;
 * - oppure il periodo con la lineetta sulle cifre (0,16̅): le cifre sopralineate devono essere le ultime;
 * - oppure la notazione scientifica con la E maiuscola: 3,2E5 vale 3,2·10⁵, 1E-3 vale 1·10⁻³. Si
 *   restituisce come 3,2 · 10 ^ 5, così si mostra e si valuta come la scrittura con la potenza.
 */
function readNumber(text: string, pos: number): NumberRead {
  let end = pos;
  while (isDigit(text[end])) end += 1;
  const integer = text.slice(pos, end);
  let fraction = "";
  const separator = text[end];
  const hasFraction = (separator === "," || separator === ".") && isDigit(text[end + 1]);
  const periodOnly = (separator === "," || separator === ".") && text[end + 1] === "(" && integer !== "" && periodAhead(text, end + 2);
  if (hasFraction) {
    end += 1;
    while (isDigit(text[end])) {
      fraction += text[end] as string;
      end += 1;
      if (isOverline(text[end])) {
        // Cifra sopralineata: si segna; che le cifre segnate siano le ultime si controlla dopo.
        fraction += "\u0305";
        end += 1;
        while (isOverline(text[end])) end += 1;
      }
    }
  } else if (periodOnly) {
    end += 1;
  }

  // Periodo con la lineetta.
  if (fraction.includes("\u0305")) {
    const marks = [...fraction.matchAll(/\d(\u0305)?/g)].map((match) => match[1] !== undefined);
    const digitsOnly = fraction.replace(/\u0305/g, "");
    const first = marks.indexOf(true);
    if (marks.slice(first).some((marked) => !marked)) {
      return { error: { message: "La lineetta del periodo va sulle ultime cifre, tutte di seguito: 0,16̅ oppure 0,1(6).", position: pos } };
    }
    const repeating = { integer: integer || "0", antiperiod: digitsOnly.slice(0, first), period: digitsOnly.slice(first) };
    return { tokens: [{ type: "num", text: text.slice(pos, end), pos, repeating }], end };
  }

  // Periodo tra parentesi.
  if ((hasFraction || periodOnly) && text[end] === "(" && periodAhead(text, end + 1)) {
    let close = end + 1;
    while (isDigit(text[close])) close += 1;
    const period = text.slice(end + 1, close);
    const open = text[close] !== ")";
    const stop = open ? close : close + 1;
    const repeating = { integer: integer || "0", antiperiod: fraction, period };
    if (!open && period === "") {
      // «0,1()»: la casella del periodo è vuota, il testo è da finire.
      return { tokens: [{ type: "num", text: text.slice(pos, stop), pos, repeating, open: true }], end: stop };
    }
    return { tokens: [{ type: "num", text: text.slice(pos, stop), pos, repeating, ...(open ? { open } : {}) }], end: stop };
  }

  const tokens: Token[] = [{ type: "num", text: text.slice(pos, end), pos }];
  // Notazione scientifica: E maiuscola subito dopo il numero, poi un esponente intero (anche da finire).
  if (text[end] === "E" && !isLetter(text[end + 1])) {
    const ePos = end;
    let cursor = end + 1;
    const sign = text[cursor] === "-" || text[cursor] === "−" || text[cursor] === "+" ? (text[cursor] as string) : "";
    if (sign !== "") cursor += 1;
    const digitsStart = cursor;
    while (isDigit(text[cursor])) cursor += 1;
    const exponent = text.slice(digitsStart, cursor);
    // «3E» o «3E-» valgono solo in fondo al testo (si sta scrivendo); altrimenti la E è una lettera.
    if (exponent !== "" || cursor === text.length) {
      tokens.push({ type: "op", op: "*", pos: ePos }, { type: "num", text: "10", pos: ePos }, { type: "op", op: "^", pos: ePos });
      if (sign === "-" || sign === "−") tokens.push({ type: "op", op: "-", pos: ePos + 1 });
      if (exponent !== "") tokens.push({ type: "num", text: exponent, pos: digitsStart });
      return { tokens, end: cursor };
    }
  }
  return { tokens, end };
}

/** Vero se da `from` ci sono solo cifre fino a una parentesi chiusa o alla fine del testo: è un periodo. */
function periodAhead(text: string, from: number): boolean {
  let at = from;
  while (isDigit(text[at])) at += 1;
  return text[at] === ")" || at === text.length;
}

/** Legge un nome all'inizio di una sequenza di lettere: una parola nota (la più lunga possibile) o una lettera sola. */
function readLetters(text: string, pos: number, tokens: Token[], options: LexOptions): number {
  let runEnd = pos;
  while (isLetter(text[runEnd])) runEnd += 1;
  const rest = text.slice(pos, runEnd).toLowerCase();

  for (const [word, token] of WORDS) {
    if (rest.startsWith(word)) {
      tokens.push({ ...token, pos } as Token);
      return pos + word.length;
    }
  }

  const letter = text[pos] as string;
  if (letter === "e") {
    tokens.push({ type: "const", name: "e", pos });
    return pos + 1;
  }
  if (letter === "i" && options.complex) {
    tokens.push({ type: "const", name: "i", pos });
    return pos + 1;
  }

  // Variabile di una lettera, con eventuale indice: x_1, x_max.
  let name = GREEK_LETTERS[letter] ?? letter;
  let end = pos + 1;
  if (text[end] === "_" && (isDigit(text[end + 1]) || isLetter(text[end + 1]))) {
    let subEnd = end + 1;
    while (isDigit(text[subEnd]) || isLetter(text[subEnd])) subEnd += 1;
    name += `_${text.slice(end + 1, subEnd)}`;
    end = subEnd;
  }
  tokens.push({ type: "sym", name, pos });
  return end;
}
