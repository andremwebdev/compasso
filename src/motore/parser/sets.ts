// Lettura degli insiemi di soluzioni scritti da Andrea (specifica, sezioni 6 e 7):
// - intervalli: [1; 3), (−∞; 2], anche con le parentesi all'italiana ]1; 3[;
// - unioni con ∪ (o U tra due intervalli), ∨, «o», «oppure»; punti isolati {1; 2}; ∅ e ℝ;
// - disuguaglianze: x < 2, x ≥ 5, 1 < x ≤ 3, x = 3, x ≠ 2, unite da ∨ oppure messe a sistema con ∧;
// - soluzioni periodiche: x = π/6 + 2kπ, x = ±π/3 + 2kπ, π/6 + 2kπ < x < 5π/6 + 2kπ (con o senza «k ∈ ℤ»).
// Il separatore tra gli estremi è il punto e virgola; la virgola vale come separatore solo se non
// sta tra due cifre (lì è la virgola decimale: «1,5» è un numero, «1, 5» sono due estremi).
// Come il resto del parser non lancia mai: restituisce il risultato oppure l'errore in italiano.

import { simplify } from "../algebra/simplify";
import { equivalent } from "../equivalence/equivalence";
import { EngineError } from "../errors";
import { evaluate } from "../expr/evaluate";
import type { Expr } from "../expr/types";
import { isIncomplete, substitute, variables } from "../expr/walk";
import { Rational } from "../numbers/rational";
import { compareEndpoints, setIntersection, setUnion } from "../sets/operations";
import type { Endpoint, Interval, RealSet, SolutionSet } from "../sets/types";
import { parseExpression, type ParseResult } from "./parse";

export interface SetParseOptions {
  /** La lettera dell'incognita nelle disuguaglianze. Se manca: x. */
  readonly variable?: string;
}

/** Errore di lettura, con la posizione nel testo. */
class SetFailure extends Error {
  constructor(
    readonly reason: string,
    readonly position: number,
  ) {
    super(reason);
  }
}

/** Un estremo letto: un numero, oppure a + k·periodo. */
interface Bound {
  readonly value: Endpoint;
  readonly period: Expr | null;
}

/** Oltre questa lunghezza il testo non è una risposta: lo si rifiuta subito. */
const MAX_LENGTH = 2000;

const numberExpr = (value: number): Expr => ({ kind: "num", value: Rational.of(value) });
const EMPTY: RealSet = { kind: "realset", pieces: [] };
const ALL: RealSet = { kind: "realset", pieces: [{ lower: "-inf", upper: "+inf", lowerClosed: false, upperClosed: false }] };

const EMPTY_WORDS = new Set(["∅", "{}", "vuoto", "insiemevuoto", "nessunasoluzione", "impossibile", "mai", "∄x∈ℝ", "∄x∈r", "∄x"]);
const ALL_WORDS = new Set(["ℝ", "r", "tuttiireali", "sempre", "∀x∈ℝ", "∀x∈r", "∀x", "ognix"]);
const CLOSED_INFINITY = "L'infinito non è un numero e non può essere incluso: dalla sua parte la parentesi è sempre aperta.";
const PLUS_INFINITY = /^\+?(∞|inf|infinito|oo)$/i;
const MINUS_INFINITY = /^-(∞|inf|infinito|oo)$/i;
const RELATION = /(<=|>=|=<|=>|!=|≠|≤|≥|<|>|=)/;
const UNION = /∪|∨|\s+(?:o|oppure|or|vel)\s+/i;
// La congiunzione «e» sta tra due condizioni complete: prima c'è la fine di un numero o di una lettera, dopo
// l'inizio di un'altra condizione. Il numero e (di Nepero) invece segue un segno o un'operazione, oppure
// chiude la condizione: «x ≤ e ∨ x ≥ 3», «x > e e x < 5», «x = 2 e + 1».
const INTERSECTION = /∧|∩|(?<=[^\s<>=≤≥≠+\-*/^(;,[{·:])\s+(?:e|and|et)\s+(?=[^\s<>=≤≥≠+\-*/^);,\]}·:])/i;

type Operator = "<" | "<=" | ">" | ">=" | "=" | "!=";
const OPERATORS: Readonly<Record<string, Operator>> = {
  "<": "<", "<=": "<=", "=<": "<=", "≤": "<=", ">": ">", ">=": ">=", "=>": ">=", "≥": ">=", "=": "=", "!=": "!=", "≠": "!=",
};
const FLIPPED: Readonly<Record<Operator, Operator>> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=", "!=": "!=" };

class SetReader {
  complete = true;
  private readonly variablePattern: RegExp;

  constructor(private readonly variable: string) {
    this.variablePattern = new RegExp(`^${variable}(?:_?\\d+|[₀-₉]+)?$`);
  }

  /** Spezza un testo con un separatore, tenendo la posizione di ogni pezzo nel testo di partenza. */
  private split(text: string, offset: number, separator: RegExp): { text: string; offset: number }[] {
    const parts: { text: string; offset: number }[] = [];
    const pattern = new RegExp(separator.source, separator.flags.includes("g") ? separator.flags : `${separator.flags}g`);
    let start = 0;
    for (const match of text.matchAll(pattern)) {
      parts.push({ text: text.slice(start, match.index), offset: offset + start });
      start = match.index + match[0].length;
    }
    parts.push({ text: text.slice(start), offset: offset + start });
    return parts;
  }

  /** Un estremo: infinito, numero, oppure a + k·periodo. */
  private bound(text: string, offset: number): Bound {
    const compact = text.replace(/\s+/g, "");
    if (compact === "") throw new SetFailure("Manca un estremo.", offset);
    if (PLUS_INFINITY.test(compact)) return { value: "+inf", period: null };
    if (MINUS_INFINITY.test(compact)) return { value: "-inf", period: null };
    const parsed = parseExpression(text);
    if (!parsed.ok) throw new SetFailure(parsed.error.message, offset + parsed.error.position);
    if (!parsed.complete || isIncomplete(parsed.value)) this.complete = false;
    const expr = parsed.value;
    const names = variables(expr);
    if (names.length === 0) {
      if (this.complete && Number.isNaN(evaluate(expr))) throw new SetFailure("Questo estremo non è un numero reale.", offset);
      return { value: expr, period: null };
    }
    if (names.length === 1 && names[0] === "k") {
      // Soluzione periodica: l'estremo deve essere a + k·periodo, cioè di primo grado in k.
      const at = (k: number): Expr => simplify(substitute(expr, { k: numberExpr(k) }));
      const base = at(0);
      let period = simplify({ kind: "add", terms: [at(1), { kind: "neg", arg: base }] });
      const linear = equivalent(at(2), { kind: "add", terms: [base, { kind: "mul", factors: [numberExpr(2), period] }] });
      const size = evaluate(period);
      if (!linear || Number.isNaN(size) || size === 0 || Number.isNaN(evaluate(base))) {
        throw new SetFailure("Le soluzioni periodiche si scrivono come $a + k \\cdot T$, con $k$ intero.", offset);
      }
      if (size < 0) period = simplify({ kind: "neg", arg: period });
      return { value: base, period };
    }
    if (names.includes(this.variable)) throw new SetFailure(`Scrivi la soluzione con $${this.variable}$ da sola, per esempio $${this.variable} > 2$.`, offset);
    throw new SetFailure(`Gli estremi devono essere numeri: qui l'incognita è $${this.variable}$.`, offset);
  }

  /** Costruisce l'insieme di un pezzo, controllando che gli estremi periodici abbiano lo stesso periodo. */
  private piece(lower: Bound, upper: Bound, lowerClosed: boolean, upperClosed: boolean, offset: number): SolutionSet {
    const interval: Interval = {
      lower: lower.value,
      upper: upper.value,
      lowerClosed: lowerClosed && typeof lower.value !== "string",
      upperClosed: upperClosed && typeof upper.value !== "string",
    };
    const real: RealSet = { kind: "realset", pieces: [interval] };
    const period = lower.period ?? upper.period;
    if (!period) return real;
    const finite = typeof lower.value !== "string" && typeof upper.value !== "string";
    if (!finite || !lower.period || !upper.period || !equivalent(lower.period, upper.period)) {
      throw new SetFailure("I due estremi devono avere lo stesso periodo.", offset);
    }
    return { kind: "periodic", base: real, period };
  }

  private interval(text: string, offset: number): SolutionSet {
    const inner = text.slice(1, -1);
    // Separatore: il punto e virgola; altrimenti una virgola che non sia decimale. Dentro le parentesi tonde non si spezza.
    const cuts: number[] = [];
    const commas: number[] = [];
    let depth = 0;
    for (let index = 0; index < inner.length; index++) {
      const char = inner[index] as string;
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      else if (depth === 0 && char === ";") cuts.push(index);
      else if (depth === 0 && char === "," && !(/\d/.test(inner[index - 1] ?? "") && /\d/.test(inner[index + 1] ?? ""))) commas.push(index);
    }
    const separators = cuts.length > 0 ? cuts : commas;
    if (separators.length !== 1) throw new SetFailure("Un intervallo ha due estremi, separati da un punto e virgola.", offset);
    const cut = separators[0] as number;
    const lower = this.bound(inner.slice(0, cut), offset + 1);
    const upper = this.bound(inner.slice(cut + 1), offset + cut + 2);
    const lowerClosed = text.startsWith("[");
    const upperClosed = text.endsWith("]");
    if ((lowerClosed && typeof lower.value === "string") || (upperClosed && typeof upper.value === "string")) {
      throw new SetFailure(CLOSED_INFINITY, offset);
    }
    if (this.complete) {
      const order = compareEndpoints(lower.value, upper.value);
      const single = order === 0 && lowerClosed && upperClosed && typeof lower.value !== "string";
      if (order > 0 || (order === 0 && !single)) throw new SetFailure("In un intervallo l'estremo più piccolo va a sinistra.", offset);
    }
    return this.piece(lower, upper, lowerClosed, upperClosed, offset);
  }

  private pointSet(text: string, offset: number): SolutionSet {
    // {1,2}: due soluzioni o il decimale 1,2? Scritto così si disegna allo stesso modo: meglio chiedere.
    const ambiguous = /^\s*(\d+),(\d+)\s*$/.exec(text.slice(1, -1));
    if (ambiguous) {
      const [, first, second] = ambiguous;
      throw new SetFailure(
        `Qui la virgola è ambigua: per due soluzioni scrivi $\\left\\{${first}; ${second}\\right\\}$, per il numero decimale scrivi $${this.variable} = ${first}{,}${second}$.`,
        offset,
      );
    }
    const elements = this.split(text.slice(1, -1), offset + 1, /;|,(?!\d)|(?<!\d),/);
    let result: SolutionSet = EMPTY;
    let pieces: Interval[] = [];
    for (const element of elements) {
      const bound = this.bound(element.text, element.offset);
      if (typeof bound.value === "string") throw new SetFailure("Tra le graffe vanno dei numeri.", element.offset);
      const point = this.piece(bound, bound, true, true, element.offset);
      if (point.kind === "realset") pieces = [...pieces, ...point.pieces];
      else result = setUnion(result, point);
    }
    if (result.kind === "realset") return { kind: "realset", pieces };
    if (pieces.length > 0) throw new SetFailure("Scrivi tutte le soluzioni con il periodo, oppure nessuna.", offset);
    return result;
  }

  private condition(text: string, offset: number): SolutionSet {
    const tokens = text.split(RELATION);
    const sides: { text: string; offset: number }[] = [];
    const operators: Operator[] = [];
    let position = offset;
    tokens.forEach((token, index) => {
      if (index % 2 === 0) sides.push({ text: token, offset: position });
      else operators.push(OPERATORS[token] as Operator);
      position += token.length;
    });
    // L'incognita, anche con l'indice delle soluzioni: x, x_1, x1, x₂.
    const isVariable = (side: { text: string }): boolean => this.variablePattern.test(side.text.trim());
    if (sides.length === 2) {
      const [left, right] = sides as [{ text: string; offset: number }, { text: string; offset: number }];
      if (isVariable(left) === isVariable(right)) throw new SetFailure(`Scrivi la soluzione con $${this.variable}$ da sola, per esempio $${this.variable} > 2$.`, offset);
      const operator = isVariable(left) ? (operators[0] as Operator) : FLIPPED[operators[0] as Operator];
      const bound = isVariable(left) ? this.bound(right.text, right.offset) : this.bound(left.text, left.offset);
      if (typeof bound.value === "string") throw new SetFailure("Qui serve un numero, non un infinito.", offset);
      const minus: Bound = { value: "-inf", period: null };
      const plus: Bound = { value: "+inf", period: null };
      switch (operator) {
        case "=":
          return this.piece(bound, bound, true, true, offset);
        case "!=":
          if (bound.period) throw new SetFailure("Con le soluzioni periodiche usa $=$, $<$ oppure $>$.", offset);
          return { kind: "realset", pieces: [...(this.piece(minus, bound, false, false, offset) as RealSet).pieces, ...(this.piece(bound, plus, false, false, offset) as RealSet).pieces] };
        case "<":
        case "<=":
          if (bound.period) throw new SetFailure("Una disuguaglianza periodica ha due estremi: $a + kT < x < b + kT$.", offset);
          return this.piece(minus, bound, false, operator === "<=", offset);
        case ">":
        case ">=":
          if (bound.period) throw new SetFailure("Una disuguaglianza periodica ha due estremi: $a + kT < x < b + kT$.", offset);
          return this.piece(bound, plus, operator === ">=", false, offset);
      }
    }
    if (sides.length === 3 && isVariable(sides[1] as { text: string })) {
      const [first, second] = operators as [Operator, Operator];
      const increasing = (first === "<" || first === "<=") && (second === "<" || second === "<=");
      const decreasing = (first === ">" || first === ">=") && (second === ">" || second === ">=");
      if (!increasing && !decreasing) throw new SetFailure("Le due disuguaglianze devono avere lo stesso verso: $a < x < b$.", offset);
      const left = this.bound((sides[0] as { text: string }).text, (sides[0] as { offset: number }).offset);
      const right = this.bound((sides[2] as { text: string }).text, (sides[2] as { offset: number }).offset);
      const [lower, upper, lowerOp, upperOp] = increasing ? [left, right, first, second] : [right, left, second, first];
      const result = this.piece(lower, upper, lowerOp.length === 2, upperOp.length === 2, offset);
      // a < x < b con a ≥ b non ha soluzioni: lo dice la forma canonica, non serve un errore.
      return result;
    }
    throw new SetFailure(`Non capisco questa condizione: scrivila come $${this.variable} > 2$ oppure $1 < ${this.variable} \\le 3$.`, offset);
  }

  /** Un pezzo senza unioni né intersezioni. */
  private atom(text: string, offset: number): SolutionSet {
    const lead = text.length - text.trimStart().length;
    const body = text.trim();
    const start = offset + lead;
    if (body === "") throw new SetFailure("Manca un pezzo dell'insieme.", offset);
    if (body.includes("±")) {
      // ± vale per due: una volta con il più, una con il meno.
      const plus = /(^|[=<>≤≥≠(;{,[\]]\s*)±/.test(body) ? body.replace(/±\s*/, "") : body.replace("±", "+");
      return setUnionAsWritten(this.atom(plus, start), this.atom(body.replace("±", "-"), start));
    }
    // Le parole note sono scritte con la x: l'incognita dell'esercizio vale come lei («∀t ∈ ℝ»).
    const name = this.variable.toLowerCase();
    const compact = body
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/^(∀|∄|ogni)(.+?)(∈[ℝr])?$/, (whole, quantifier: string, letter: string, tail: string | undefined) =>
        letter === name ? `${quantifier}x${tail ?? ""}` : letter === "x" ? `${quantifier}?${tail ?? ""}` : whole,
      );
    if (EMPTY_WORDS.has(compact)) return EMPTY;
    if (ALL_WORDS.has(compact)) return ALL;
    // «x ∈ [1; 3)» vale «[1; 3)».
    const membership = new RegExp(`^${this.variable}\\s*(?:∈|in\\s|appartiene\\s+a\\s)\\s*`).exec(body);
    if (membership) return this.atom(body.slice(membership[0].length), start + membership[0].length);
    if (body.startsWith("{")) {
      if (!body.endsWith("}")) throw new SetFailure("Manca la graffa di chiusura.", start + body.length);
      return this.pointSet(body, start);
    }
    if (RELATION.test(body)) return this.condition(body, start);
    if (/^[[(\]]/.test(body) && /[\])[]$/.test(body) && /[;,]/.test(body)) {
      const isNumberInParentheses = body.startsWith("(") && body.endsWith(")") && !body.includes(";") && !/,(?!\d)|(?<!\d),/.test(body);
      if (!isNumberInParentheses) return this.interval(body, start);
    }
    // Una quadra che include l'infinito è sbagliata già mentre si scrive: lo si dice subito, senza aspettare la chiusura.
    if (/^\[\s*[-+]?\s*(∞|inf|infinito|oo)/i.test(body)) throw new SetFailure(CLOSED_INFINITY, start);
    if (/^[[\]]/.test(body) || /[[\]]$/.test(body)) throw new SetFailure("L'intervallo non è completo: servono due estremi e due parentesi.", start);
    // Un numero da solo è la soluzione x = numero.
    const bound = this.bound(body, start);
    if (typeof bound.value === "string") throw new SetFailure("Un infinito da solo non è una soluzione.", start);
    return this.piece(bound, bound, true, true, start);
  }

  read(text: string): SolutionSet {
    let result: SolutionSet | null = null;
    for (const part of this.split(text, 0, UNION)) {
      let current: SolutionSet | null = null;
      for (const factor of this.split(part.text, part.offset, INTERSECTION)) {
        const set = this.atom(factor.text, factor.offset);
        current = current === null ? set : setIntersection(current, set);
      }
      result = result === null ? (current as SolutionSet) : setUnionAsWritten(result, current as SolutionSet);
    }
    return result as SolutionSet;
  }
}

/** Unione che conserva la scrittura: tra insiemi di numeri reali i pezzi restano nell'ordine in cui sono stati scritti. */
function setUnionAsWritten(a: SolutionSet, b: SolutionSet): SolutionSet {
  if (a.kind === "realset" && b.kind === "realset") return { kind: "realset", pieces: [...a.pieces, ...b.pieces] };
  if (a.kind === "periodic" && b.kind === "periodic" && equivalent(a.period, b.period)) {
    return { kind: "periodic", base: { kind: "realset", pieces: [...a.base.pieces, ...b.base.pieces] }, period: a.period };
  }
  return setUnion(a, b);
}

/**
 * Le posizioni dei separatori fuori da ogni parentesi: il punto e virgola, e la virgola che non è
 * decimale (non sta tra due cifre). null se le parentesi non tornano (per esempio con quelle
 * all'italiana, «]1; 3[»): lì non si tocca niente.
 */
function topLevelSeparators(text: string): number[] | null {
  const cuts: number[] = [];
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] as string;
    if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;
    else if (depth === 0 && char === ";") cuts.push(index);
    else if (depth === 0 && char === "," && !(/\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? ""))) cuts.push(index);
    if (depth < 0) return null;
  }
  return depth === 0 ? cuts : null;
}

/**
 * Legge un insieme di soluzioni. Non lancia mai. L'insieme resta com'è stato scritto (i pezzi di
 * un'unione non vengono riordinati né fusi), così se ne può controllare la forma.
 */
export function parseSolutionSet(text: string, options: SetParseOptions = {}): ParseResult<SolutionSet> {
  let source = text.replace(/[−–—]/g, "-").replace(/\s+$/, "");
  // «k ∈ ℤ» in fondo si può scrivere o no.
  source = source.replace(/[,;]?\s*(?:con\s+|per\s+ogni\s+|∀\s*)?k\s*(?:∈|in|appartiene\s+a)\s*(?:ℤ|Z)\s*$/i, "");
  source = source.replace(/[,;]?\s*(?:con\s+|per\s+)?k\s+intero\s*$/i, "");
  // U tra due intervalli vale ∪.
  source = source.replace(/([\])[}])\s*[Uu]\s*([[(\]{])/g, "$1∪$2");
  // «S = …» davanti all'insieme si può scrivere o no.
  source = source.replace(/^\s*S\s*=\s*/, (prefix) => " ".repeat(prefix.length));
  if (source.trim() === "") return { ok: false, error: { message: "Scrivi l'insieme delle soluzioni.", position: 0 } };
  if (source.length > MAX_LENGTH) return { ok: false, error: { message: "Il testo è troppo lungo.", position: MAX_LENGTH } };
  // Più soluzioni di un'equazione separate da «;» (o da virgola e spazio): «x = 1; x = 2», «3; 5».
  // Con le disuguaglianze il separatore sarebbe ambiguo (unione o sistema?): lì si chiede ∨ oppure ∧.
  const cuts = topLevelSeparators(source) ?? [];
  if (cuts.length > 0) {
    if (/[<>≤≥≠]|!=/.test(source)) {
      const message = "Tra due disuguaglianze scrivi $\\lor$ (oppure) o $\\land$ (e): il punto e virgola da solo è ambiguo.";
      return { ok: false, error: { message, position: cuts[0] as number } };
    }
    // Sostituzione carattere per carattere: le posizioni degli errori restano quelle del testo scritto.
    let rebuilt = "";
    let from = 0;
    for (const cut of cuts) {
      rebuilt += `${source.slice(from, cut)}∨`;
      from = cut + 1;
    }
    source = rebuilt + source.slice(from);
  }
  const reader = new SetReader(options.variable ?? "x");
  try {
    const value = reader.read(source);
    return { ok: true, value, complete: reader.complete };
  } catch (error) {
    if (error instanceof SetFailure) return { ok: false, error: { message: error.reason, position: Math.min(error.position, text.length) } };
    if (error instanceof EngineError) return { ok: false, error: { message: error.message, position: 0 } };
    // Qualunque altro errore non deve uscire da qui: chi legge quello che scrive Andrea si aspetta sempre un risultato.
    return { ok: false, error: { message: "Questa scrittura è troppo complicata da leggere.", position: 0 } };
  }
}
