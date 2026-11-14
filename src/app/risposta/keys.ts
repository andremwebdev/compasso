// I tasti della tastiera matematica, per livello (specifica, sezione 9). Ogni tasto inserisce un
// pezzo di testo che il parser sa leggere, oppure fa un'azione (cancella, sposta il cursore).
// In questa fase ci sono i livelli Base, Insiemi e Funzioni; Analisi, Lineare e Complessi arrivano
// con la tastiera completa (fase 4).

export type KeyAction = "backspace" | "left" | "right";

export interface Key {
  /** Quello che si vede sul tasto. */
  readonly label: string;
  /** Il testo che inserisce (se non è un'azione). */
  readonly insert?: string;
  readonly action?: KeyAction;
  /** Il nome letto dalle tecnologie assistive, quando il simbolo da solo non basta. */
  readonly name?: string;
  /** Tasto di servizio (cancella, frecce): si disegna in modo diverso. */
  readonly service?: boolean;
}

export type KeyboardLevel = "base" | "insiemi" | "funzioni";

const t = (label: string, insert = label, name?: string): Key => (name ? { label, insert, name } : { label, insert });
const BACKSPACE: Key = { label: "⌫", action: "backspace", name: "Cancella", service: true };
const LEFT: Key = { label: "←", action: "left", name: "Cursore a sinistra", service: true };
const RIGHT: Key = { label: "→", action: "right", name: "Cursore a destra", service: true };

/** I livelli nell'ordine in cui compaiono; ogni livello è una griglia di 6 colonne. */
export const KEYBOARD: Readonly<Record<KeyboardLevel, { readonly label: string; readonly keys: readonly Key[] }>> = {
  base: {
    label: "Base",
    keys: [
      t("7"), t("8"), t("9"), t("("), t(")"), BACKSPACE,
      t("4"), t("5"), t("6"), t("+"), t("−", "-", "Meno"), LEFT,
      t("1"), t("2"), t("3"), t("·", "·", "Per"), t(":", ":", "Diviso"), RIGHT,
      t("0"), t(",", ",", "Virgola"), t("x"), t("y"), t("a⁄b", "/", "Frazione"), t("xⁿ", "^", "Potenza"),
      t("√", "√(", "Radice quadrata"), t("ⁿ√", "root(", "Radice n-esima: indice; radicando"), t("x²", "^2", "Al quadrato"), t(";", "; ", "Punto e virgola"), t("="), t("k"),
    ],
  },
  insiemi: {
    label: "Insiemi",
    keys: [
      t("["), t("]"), t("("), t(")"), t(";", "; ", "Punto e virgola"), BACKSPACE,
      t("7"), t("8"), t("9"), t("∪", " ∪ ", "Unione"), t("∞", "∞", "Infinito"), LEFT,
      t("4"), t("5"), t("6"), t("<", " < ", "Minore"), t("≤", " ≤ ", "Minore o uguale"), RIGHT,
      t("1"), t("2"), t("3"), t(">", " > ", "Maggiore"), t("≥", " ≥ ", "Maggiore o uguale"), t("∨", " ∨ ", "Oppure"),
      t("0"), t(",", ",", "Virgola"), t("−", "-", "Meno"), t("+"), t("a⁄b", "/", "Frazione"), t("x"),
      t("∅", "∅", "Insieme vuoto"), t("ℝ", "ℝ", "Tutti i numeri reali"), t("≠", " ≠ ", "Diverso"), t("="), t("∧", " ∧ ", "E"), t("√", "√(", "Radice quadrata"),
    ],
  },
  funzioni: {
    label: "Funzioni",
    keys: [
      t("sin", "sin("), t("cos", "cos("), t("tan", "tan("), t("("), t(")"), BACKSPACE,
      t("ln", "ln("), t("log", "log("), t("eˣ", "e^(", "e elevato"), t("e"), t("π"), LEFT,
      t("arcsin", "arcsin("), t("arccos", "arccos("), t("arctan", "arctan("), t("|x|", "|", "Valore assoluto"), t("xⁿ", "^", "Potenza"), RIGHT,
      t("x"), t("+"), t("−", "-", "Meno"), t("·", "·", "Per"), t("a⁄b", "/", "Frazione"), t("√", "√(", "Radice quadrata"),
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

/** Applica un tasto a un campo: restituisce il nuovo testo e la nuova posizione del cursore. */
export function pressKey(field: FieldState, key: Key): FieldState {
  const { text, start, end } = field;
  if (key.insert !== undefined) {
    // Niente doppio spazio quando un tasto con gli spazi attorno segue un altro spazio.
    const insert = key.insert.startsWith(" ") && (start === 0 || text[start - 1] === " ") ? key.insert.slice(1) : key.insert;
    const at = start + insert.length;
    return { text: text.slice(0, start) + insert + text.slice(end), start: at, end: at };
  }
  switch (key.action) {
    case "backspace": {
      if (start !== end) return { text: text.slice(0, start) + text.slice(end), start, end: start };
      if (start === 0) return field;
      // Un nome di funzione con la sua parentesi («sin(», «root(», «√(») si cancella tutto insieme, come
      // i simboli con gli spazi attorno (« ∪ »). Solo i nomi che la tastiera scrive: in «2x(» la x resta.
      const before = text.slice(0, start);
      const chunk = /(?:(?:arcsin|arccos|arctan|sin|cos|tan|ln|log|root)\(|√\(|\s[^\s]\s|; )$/.exec(before)?.[0] ?? before.slice(-1);
      const at = start - chunk.length;
      return { text: text.slice(0, at) + text.slice(end), start: at, end: at };
    }
    case "left": {
      const at = Math.max(0, start - 1);
      return { text, start: at, end: at };
    }
    case "right": {
      const at = Math.min(text.length, end + 1);
      return { text, start: at, end: at };
    }
    case undefined:
      return field;
  }
}
