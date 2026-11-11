// Analisi lessicale: spezza il testo scritto da Andrea in simboli (numeri, nomi, operatori).
// È tollerante: accetta virgola o punto decimale, i simboli della tastiera matematica (√, π, ·, −, ≤…)
// e le scritture da tastiera fisica (sqrt, pi, ^, *, <=…).

import { functionNames, functionTable } from "../expr/functions";
import type { FunctionName } from "../expr/types";

export type Token =
  | { readonly type: "num"; readonly text: string; readonly pos: number }
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
  "=": "=", "≠": "!=", "<": "<", ">": ">", "≤": "<=", "≥": ">=",
};

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";
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

    // Numeri: cifre, con virgola o punto decimale solo se seguiti subito da un'altra cifra.
    if (isDigit(ch) || ((ch === "," || ch === ".") && isDigit(next) && !isDigit(text[pos - 1]))) {
      let end = pos;
      while (isDigit(text[end])) end += 1;
      if ((text[end] === "," || text[end] === ".") && isDigit(text[end + 1])) {
        end += 1;
        while (isDigit(text[end])) end += 1;
      }
      tokens.push({ type: "num", text: text.slice(pos, end), pos });
      pos = end;
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

    // Operatori di due caratteri.
    const pair = ch + (next ?? "");
    const double: Operator | "**" | undefined =
      pair === "<=" || pair === "=<" ? "<=" : pair === ">=" || pair === "=>" ? ">=" : pair === "!=" || pair === "<>" ? "!=" : pair === "**" ? "**" : undefined;
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
