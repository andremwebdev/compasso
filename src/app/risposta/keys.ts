// I tasti della tastiera matematica, per livello (specifica, sezione 7). Ogni tasto inserisce un
// pezzo di testo che il parser sa leggere, oppure fa un'azione (cancella, sposta il cursore, passa
// alla casella successiva). Frazioni, potenze, radici e funzioni si scrivono «a modello»: il tasto
// mette le parentesi già chiuse con il cursore dentro (`sin(‸)`), e il tasto ⇥ porta fuori dalla
// casella o in quella dopo (dal numeratore al denominatore). Una casella vuota, `()`, per il parser
// è un pezzo che manca (□): il testo è incompleto, non sbagliato.

export type KeyAction =
  | "backspace"
  | "left"
  | "right"
  /** ⇥: esce dalla casella in cui sta il cursore, o entra nella prossima casella vuota. */
  | "next"
  /** Frazione a modello: dopo un numero o una parentesi chiusa quello diventa il numeratore. */
  | "fraction"
  /** Caselle di una matrice o di un vettore: le gestisce il campo, non il testo. */
  | "prevCell"
  | "nextCell";

export interface Key {
  /** Quello che si vede sul tasto. */
  readonly label: string;
  /** Il testo che inserisce (se non è un'azione); `‸` segna dove va il cursore (se manca, alla fine). */
  readonly insert?: string;
  readonly action?: KeyAction;
  /** Il nome letto dalle tecnologie assistive, quando il simbolo da solo non basta. */
  readonly name?: string;
  /** Tasto di servizio (cancella, frecce, ⇥): si disegna in modo diverso. */
  readonly service?: boolean;
  /** Quante colonne occupa (normalmente una). */
  readonly span?: number;
  /** Etichetta lunga (una parola): si scrive più piccola. */
  readonly word?: boolean;
}

export type KeyboardLevel = "base" | "funzioni" | "insiemi" | "analisi" | "lineare" | "complessi";

/** Il segno del cursore dentro un `insert`. */
export const CURSOR = "‸";

const t = (label: string, insert = label, name?: string): Key => (name ? { label, insert, name } : { label, insert });
/** Un tasto con un nome lungo (sin, arcsin, ln…): etichetta più piccola. */
const w = (label: string, insert: string, name?: string): Key => ({ ...t(label, insert, name), word: true });
const BACKSPACE: Key = { label: "⌫", action: "backspace", name: "Cancella", service: true };
const LEFT: Key = { label: "←", action: "left", name: "Cursore a sinistra", service: true };
const RIGHT: Key = { label: "→", action: "right", name: "Cursore a destra", service: true };
const NEXT: Key = { label: "⇥", action: "next", name: "Esci dalla casella o vai alla prossima", service: true };
const FRACTION: Key = { label: "a⁄b", action: "fraction", name: "Frazione" };
const POWER = t("xⁿ", `^(${CURSOR})`, "Potenza");
const SQUARE = t("x²", "^2", "Al quadrato");
const SQRT = t("√", `√(${CURSOR})`, "Radice quadrata");
const NTH_ROOT = t("ⁿ√", `root(${CURSOR}; )`, "Radice n-esima: prima l'indice, poi ⇥ e il radicando");
const MINUS = t("−", "-", "Meno");
const TIMES = t("·", "·", "Per");
const COMMA = t(",", ",", "Virgola");
const digits = (from: string): Key[] => [...from].map((digit) => t(digit));

/** Un livello: il nome sulla linguetta e i tasti, riga per riga, su `columns` colonne. */
export interface KeyboardLevelDef {
  readonly label: string;
  /** Il nome completo, per le tecnologie assistive. */
  readonly name: string;
  readonly columns: number;
  readonly keys: readonly Key[];
}

/** I livelli, nell'ordine delle linguette. Ogni riga è piena: la somma degli `span` è un multiplo di `columns`. */
export const KEYBOARD: Readonly<Record<KeyboardLevel, KeyboardLevelDef>> = {
  base: {
    label: "Base",
    name: "Base: cifre, operazioni, frazione, potenza, radici, fattoriale, notazione scientifica, periodo",
    columns: 6,
    keys: [
      ...digits("789"), t("("), t(")"), BACKSPACE,
      ...digits("456"), t("+"), MINUS, LEFT,
      ...digits("123"), TIMES, t(":", ":", "Diviso"), RIGHT,
      t("0"), COMMA, t("x"), t("y"), FRACTION, NEXT,
      SQRT, NTH_ROOT, POWER, SQUARE, t(";", "; ", "Punto e virgola"), t("="),
      // Volume 1: fattoriale (V1.M13), notazione scientifica (V1.M03), numeri periodici (V1.M02):
      // il periodo si scrive tra parentesi subito dopo le cifre decimali, 0,1(6).
      t("n!", "!", "Fattoriale"), t("·10ⁿ", `·10^(${CURSOR})`, "Per dieci alla…"),
      { ...w("periodo", `(${CURSOR})`, "Periodo: dopo le cifre decimali, le cifre che si ripetono"), span: 2 }, t("n"), t("k"),
    ],
  },
  funzioni: {
    label: "Funzioni",
    name: "Funzioni: goniometriche, logaritmi, esponenziale, valore assoluto, costanti, gradi",
    columns: 7,
    keys: [
      w("sin", `sin(${CURSOR})`), w("cos", `cos(${CURSOR})`), w("tan", `tan(${CURSOR})`), t("("), t(")"), NEXT, BACKSPACE,
      w("arcsin", `arcsin(${CURSOR})`), w("arccos", `arccos(${CURSOR})`), w("arctan", `arctan(${CURSOR})`), ...digits("789"), LEFT,
      w("ln", `ln(${CURSOR})`), w("log", `log(${CURSOR})`), t("eˣ", `e^(${CURSOR})`, "e elevato"), ...digits("456"), RIGHT,
      t("e"), t("π"), t("|x|", "|", "Valore assoluto"), ...digits("123"), TIMES,
      t("x"), t("y"), POWER, t("0"), COMMA, t("+"), MINUS,
      // Costanti arbitrarie: integrali indefiniti ed equazioni differenziali (V2.M09, V2.M12).
      t("c", "c", "Costante c"), t("c₁", "c_1", "Costante c uno"), t("c₂", "c_2", "Costante c due"), t("k"), SQUARE, FRACTION, SQRT,
      // Angoli in gradi sessagesimali (V1.M10): 30°15′20″; lettere greche per gli angoli.
      { ...t("°", "°", "Gradi"), span: 2 }, t("′", "′", "Primi"), t("″", "″", "Secondi"), t("α", "α", "Alfa"), t("β", "β", "Beta"), t("θ", "θ", "Teta"),
    ],
  },
  insiemi: {
    label: "Insiemi",
    name: "Insiemi: intervalli, unione, disuguaglianze, soluzioni periodiche",
    columns: 7,
    keys: [
      t("["), t("]"), t("("), t(")"), t(";", "; ", "Punto e virgola"), t("∪", " ∪ ", "Unione"), BACKSPACE,
      ...digits("789"), t("<", " < ", "Minore"), t("≤", " ≤ ", "Minore o uguale"), t("∞", "∞", "Infinito"), LEFT,
      ...digits("456"), t(">", " > ", "Maggiore"), t("≥", " ≥ ", "Maggiore o uguale"), t("∨", " ∨ ", "Oppure"), RIGHT,
      ...digits("123"), t("=", " = "), t("≠", " ≠ ", "Diverso"), t("±", "±", "Più o meno"), t("∅", "∅", "Insieme vuoto"),
      // Negli estremi degli intervalli frazione e radice si scrivono senza modello: 1/3, √2.
      t("0"), COMMA, MINUS, t("+"), t("/", "/", "Fratto"), t("x"), t("ℝ", "ℝ", "Tutti i numeri reali"),
      t("π"), t("√", "√", "Radice quadrata"), t("k", "k", "k intero"), t("e"), w("ln", "ln "), t("∀x", "∀x", "Per ogni x"), t("∄x", "∄x", "Non esiste x"),
    ],
  },
  analisi: {
    label: "Analisi",
    name: "Analisi: infiniti, «non esiste», e, logaritmo",
    columns: 6,
    keys: [
      t("+∞", "+∞", "Più infinito"), t("−∞", "-∞", "Meno infinito"), { ...w("non esiste", "non esiste"), name: "Non esiste" }, t("("), t(")"), BACKSPACE,
      ...digits("789"), t("e"), t("π"), LEFT,
      ...digits("456"), w("ln", `ln(${CURSOR})`), SQRT, RIGHT,
      ...digits("123"), POWER, FRACTION, NEXT,
      t("0"), COMMA, t("+"), MINUS, TIMES, t("x"),
    ],
  },
  lineare: {
    label: "Matrici",
    name: "Matrici e vettori: cifre, frazioni e passaggio da una casella all'altra",
    columns: 6,
    keys: [
      ...digits("789"), t("("), t(")"), BACKSPACE,
      ...digits("456"), t("+"), MINUS, LEFT,
      ...digits("123"), TIMES, FRACTION, RIGHT,
      t("0"), COMMA, SQRT, t("π"), POWER, NEXT,
      { label: "◂ casella", action: "prevCell", name: "Casella precedente", service: true, span: 3, word: true },
      { label: "casella ▸", action: "nextCell", name: "Casella successiva", service: true, span: 3, word: true },
    ],
  },
  complessi: {
    label: "ℂ",
    name: "Numeri complessi",
    columns: 6,
    keys: [
      t("i", "i", "Unità immaginaria"), t("π"), t("eⁱ", `e^(i${CURSOR})`, "e elevato i per…"), t("("), t(")"), BACKSPACE,
      ...digits("789"), w("cos", `cos(${CURSOR})`), w("sin", `sin(${CURSOR})`), LEFT,
      ...digits("456"), SQRT, POWER, RIGHT,
      ...digits("123"), TIMES, FRACTION, NEXT,
      t("0"), COMMA, t("+"), MINUS, t("|z|", "|", "Modulo"), t(":", ":", "Diviso"),
    ],
  },
};

export const KEYBOARD_LEVELS = Object.keys(KEYBOARD) as KeyboardLevel[];

/** Il testo di un campo con la posizione del cursore (o la selezione). */
export interface FieldState {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** Inserisce `piece` al posto della selezione; `‸` dice dove resta il cursore. */
function insertAt(field: FieldState, piece: string): FieldState {
  const { text, start, end } = field;
  // Niente doppio spazio quando un tasto con gli spazi attorno segue un altro spazio.
  const trimmed = piece.startsWith(" ") && (start === 0 || text[start - 1] === " ") ? piece.slice(1) : piece;
  const marker = trimmed.indexOf(CURSOR);
  const clean = trimmed.replace(CURSOR, "");
  const at = start + (marker >= 0 ? marker : clean.length);
  return { text: text.slice(0, start) + clean + text.slice(end), start: at, end: at };
}

/** Vero se il testo finisce con qualcosa che può fare da numeratore: un numero, una lettera, una parentesi chiusa, 5!, 30°. */
const endsWithOperand = (before: string): boolean => /[0-9a-zA-Zπ∞)|²³!°′″]$/.test(before);

/** Nomi che la tastiera scrive e che si cancellano in un colpo solo, con la loro parentesi se c'è. */
const OPENING = /(?:(?:arcsin|arccos|arctan|sin|cos|tan|ln|log|root|e\^|√|·10\^|\^)\(|e\^\(i)$/;

/** Applica un tasto a un campo: restituisce il nuovo testo e la nuova posizione del cursore. */
export function pressKey(field: FieldState, key: Key): FieldState {
  const { text, start, end } = field;
  if (key.insert !== undefined) return insertAt(field, key.insert);
  switch (key.action) {
    case "fraction": {
      // Con una selezione, la selezione diventa il numeratore; dopo un numero, una lettera o una
      // parentesi chiusa, è quello il numeratore (3 → 3/□); altrimenti tutte e due le caselle.
      if (start !== end) return insertAt(field, `(${text.slice(start, end)})/(${CURSOR})`);
      return insertAt(field, endsWithOperand(text.slice(0, start)) ? `/(${CURSOR})` : `(${CURSOR})/()`);
    }
    case "next": {
      let at = end;
      if (text[at] === ";") {
        // Dall'indice della radice al radicando.
        at += text[at + 1] === " " ? 2 : 1;
      } else if (text[at] === ")") {
        // Fuori dalla casella; dal numeratore si entra direttamente nel denominatore.
        at += 1;
        if (text.startsWith("/(", at)) at += 2;
      } else {
        const slot = text.indexOf("()", at);
        const close = text.indexOf(")", at);
        at = slot >= 0 ? slot + 1 : close >= 0 ? close + 1 : text.length;
      }
      return { text, start: at, end: at };
    }
    case "backspace": {
      if (start !== end) return { text: text.slice(0, start) + text.slice(end), start, end: start };
      if (start === 0) return field;
      const before = text.slice(0, start);
      const after = text.slice(start);
      // Una frazione con le caselle vuote se ne va tutta; un denominatore vuoto se ne va con la sua barra.
      if (before.endsWith("(") && after.startsWith(")/()")) return remove(text, start - 1, start + 4);
      if (before.endsWith("()/(") && after.startsWith(")")) return remove(text, start - 4, start + 1);
      if (before.endsWith("/(") && after.startsWith(")")) return remove(text, start - 2, start + 1);
      // Una casella vuota con il suo nome («sin(‸)», «√(‸)», «^(‸)») se ne va tutta.
      const opening = OPENING.exec(before)?.[0];
      if (opening && after.startsWith(")")) return remove(text, start - opening.length, start + 1);
      if (before.endsWith("(") && after.startsWith(")")) return remove(text, start - 1, start + 1);
      // Altrimenti un tasto intero: un nome di funzione con la sua parentesi, un simbolo con gli
      // spazi attorno (« ∪ »), «non esiste», le costanti c₁ e c₂. Solo i nomi che la tastiera scrive:
      // in «2x(» la x resta.
      const chunk =
        /(?:(?:arcsin|arccos|arctan|sin|cos|tan|ln|log|root|e\^)\(|e\^\(i|√\(|·10\^\(|\^\(|ln |non esiste|c_[12]|∀x|∄x|[+-]∞|\s[^\s]\s|; )$/.exec(before)?.[0] ??
        before.slice(-1);
      return remove(text, start - chunk.length, start);
    }
    case "left": {
      const at = Math.max(0, start - 1);
      return { text, start: at, end: at };
    }
    case "right": {
      const at = Math.min(text.length, end + 1);
      return { text, start: at, end: at };
    }
    case "prevCell":
    case "nextCell":
    case undefined:
      return field;
  }
}

/** Toglie il pezzo [from, to) e lascia lì il cursore. */
function remove(text: string, from: number, to: number): FieldState {
  return { text: text.slice(0, from) + text.slice(to), start: from, end: from };
}
