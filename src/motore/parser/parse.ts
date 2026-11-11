// Parser tollerante: trasforma il testo scritto da Andrea in un'espressione del motore.
//
// Regole (documentate anche in docs/ARCHITETTURA.md):
// - moltiplicazione implicita: 2x, 2(x+1), (x+1)(x−1), xy, 2π;
// - precedenze: potenza, poi prodotti e divisioni da sinistra a destra (1/2x vale (1/2)·x), poi somme;
// - −x^2 vale −(x²); x^-1 e 2*-3 sono accettati;
// - funzioni con o senza parentesi: sin(x), sin x, sin 2x (= sin(2x)), sin^2 x, sin x cos x;
// - radici: √2, sqrt(2), ∛x, root(3; x); logaritmi: ln x, log x (base 10), log_2 x, log(2; x);
// - valore assoluto: |x| oppure abs(x); percentuali: 20% vale 20/100;
// - testo incompleto ("2+", "(x+1"): si completa con il segnaposto □ e si segnala `complete: false`,
//   così l'anteprima in tempo reale può disegnare anche quello che non è ancora finito.

import { EngineError } from "../errors";
import { abs, add, div, e, fn, i, log, mul, neg, num, pi, pow, relation, root, sym } from "../expr/build";
import { PLACEHOLDER, type Expr, type Relation, type RelationOp } from "../expr/types";
import { Rational } from "../numbers/rational";
import { tokenize, type LexOptions, type Operator, type Token } from "./tokenize";

export interface ParseError {
  /** Messaggio in italiano, da mostrare ad Andrea. */
  readonly message: string;
  /** Posizione nel testo (indice del carattere) dove si trova il problema. */
  readonly position: number;
}

export type ParseResult<T> =
  /** `complete` è falso se il testo era incompleto ed è stato chiuso con il segnaposto □. */
  | { readonly ok: true; readonly value: T; readonly complete: boolean }
  | { readonly ok: false; readonly error: ParseError };

export type ParseOptions = LexOptions;

class Failure extends Error {
  constructor(
    readonly reason: string,
    readonly position: number,
  ) {
    super(reason);
  }
}

const RELATION_OPS: readonly Operator[] = ["=", "!=", "<", "<=", ">", ">="];

class Parser {
  private index = 0;
  private barDepth = 0;
  complete = true;

  constructor(private readonly tokens: readonly Token[]) {}

  private get current(): Token {
    return this.tokens[this.index] as Token;
  }

  private isOp(op: Operator, token: Token = this.current): boolean {
    return token.type === "op" && token.op === op;
  }

  private advance(): Token {
    const token = this.current;
    if (token.type !== "end") this.index += 1;
    return token;
  }

  atEnd(): boolean {
    return this.current.type === "end";
  }

  position(): number {
    return this.current.pos;
  }

  isRelationOp(): boolean {
    const token = this.current;
    return token.type === "op" && RELATION_OPS.includes(token.op);
  }

  takeRelationOp(): RelationOp {
    const token = this.advance();
    return (token as { op: RelationOp }).op;
  }

  /** Segnaposto per un operando che manca perché il testo non è finito. */
  private placeholder(): Expr {
    this.complete = false;
    return sym(PLACEHOLDER);
  }

  /** somma := [segno] termine { (+|−) [segno] termine } */
  parseSum(): Expr {
    const terms: Expr[] = [];
    let negative = this.parseSigns();
    for (;;) {
      const term = this.parseTerm();
      terms.push(negative ? neg(term) : term);
      if (this.isOp("+") || this.isOp("-")) {
        negative = this.parseSigns();
        continue;
      }
      break;
    }
    return add(...terms);
  }

  /** Legge una sequenza di segni + e − e dice se il risultato è negativo. */
  private parseSigns(): boolean {
    let negative = false;
    while (this.isOp("+") || this.isOp("-")) {
      if (this.isOp("-")) negative = !negative;
      this.advance();
    }
    return negative;
  }

  /** termine := fattore { (·|/) fattore con segno | fattore (moltiplicazione implicita) } */
  private parseTerm(): Expr {
    let factors: Expr[] = [this.parseFactor()];
    for (;;) {
      if (this.isOp("*")) {
        this.advance();
        factors.push(this.parseSignedFactor());
      } else if (this.isOp("/")) {
        this.advance();
        factors = [div(mul(...factors), this.parseSignedFactor())];
      } else if (this.startsOperand()) {
        const previous = this.tokens[this.index - 1];
        if (this.current.type === "num" && previous?.type === "num") {
          throw new Failure("Tra due numeri manca un'operazione.", this.current.pos);
        }
        factors.push(this.parseFactor());
      } else {
        break;
      }
    }
    return mul(...factors);
  }

  /** Dopo · e / è ammesso un segno: 2·−3. */
  private parseSignedFactor(): Expr {
    if (this.isOp("-")) {
      this.advance();
      return neg(this.parseSignedFactor());
    }
    if (this.isOp("+")) {
      this.advance();
      return this.parseSignedFactor();
    }
    return this.parseFactor();
  }

  /** Vero se il simbolo corrente può cominciare un operando (serve per la moltiplicazione implicita). */
  private startsOperand(): boolean {
    const token = this.current;
    switch (token.type) {
      case "num":
      case "sym":
      case "const":
      case "fn":
      case "word":
      case "radical":
        return true;
      case "op":
        // Una barra apre un valore assoluto solo se non ce n'è già uno aperto da chiudere.
        return token.op === "(" || (token.op === "|" && this.barDepth === 0);
      default:
        return false;
    }
  }

  /** fattore := base { apice | % } [ ^ esponente ] */
  private parseFactor(): Expr {
    return this.parsePowerOf(this.parsePrimary());
  }

  private parsePowerOf(base: Expr): Expr {
    let result = base;
    for (;;) {
      const token = this.current;
      if (token.type === "sup") {
        this.advance();
        result = pow(result, num(BigInt(token.text)));
      } else if (this.isOp("%")) {
        this.advance();
        result = div(result, 100);
      } else if (this.isOp("^")) {
        this.advance();
        result = pow(result, this.parseExponent());
      } else {
        return result;
      }
    }
  }

  /** L'esponente è un fattore, anche con segno: x^-1, x^2^3 = x^(2^3). */
  private parseExponent(): Expr {
    if (this.isOp("-")) {
      this.advance();
      return neg(this.parseExponent());
    }
    if (this.isOp("+")) {
      this.advance();
      return this.parseExponent();
    }
    return this.parseFactor();
  }

  private parsePrimary(): Expr {
    const token = this.current;
    switch (token.type) {
      case "num":
        this.advance();
        return parseNumber(token.text);
      case "sym":
        this.advance();
        return sym(token.name);
      case "const":
        this.advance();
        return token.name === "pi" ? pi : token.name === "e" ? e : i;
      case "radical":
        this.advance();
        return root(token.index, this.parseRadicand());
      case "fn": {
        this.advance();
        return this.parseFunctionCall((arg) => fn(token.name, arg));
      }
      case "word":
        this.advance();
        return this.parseWord(token.name, token.pos);
      case "op":
        if (token.op === "(") return this.parseGroup();
        if (token.op === "|") {
          this.advance();
          this.barDepth += 1;
          const inner = this.parseSum();
          this.barDepth -= 1;
          if (this.isOp("|")) this.advance();
          else if (this.atEnd()) this.complete = false;
          else throw new Failure("Manca la barra che chiude il valore assoluto.", this.current.pos);
          return abs(inner);
        }
        if (token.op === ")") throw new Failure("C'è una parentesi chiusa in più.", token.pos);
        if (token.op === ";") throw new Failure("Qui la virgola o il punto e virgola non hanno senso.", token.pos);
        throw new Failure("Qui manca un numero o una lettera.", token.pos);
      case "sup":
        throw new Failure("L'esponente non ha una base.", token.pos);
      case "end":
        return this.placeholder();
    }
  }

  /** Gruppo tra parentesi (tonde, quadre o graffe). Dentro un gruppo le barre ripartono da zero. */
  private parseGroup(): Expr {
    this.advance();
    const outerBars = this.barDepth;
    this.barDepth = 0;
    const inner = this.parseSum();
    this.barDepth = outerBars;
    this.closeGroup();
    return inner;
  }

  private closeGroup(): void {
    if (this.isOp(")")) this.advance();
    else if (this.atEnd()) this.complete = false;
    else throw new Failure("Qui serve una parentesi chiusa.", this.current.pos);
  }

  /** Il radicando di √ scritto senza parentesi è un solo elemento: √2x vale √2·x. */
  private parseRadicand(): Expr {
    if (this.isOp("(")) return this.parseGroup();
    const token = this.current;
    if (token.type === "num" || token.type === "sym" || token.type === "const" || token.type === "radical") {
      return this.parsePrimary();
    }
    if (this.atEnd()) return this.placeholder();
    throw new Failure("Dopo il simbolo di radice serve un numero, una lettera o una parentesi.", token.pos);
  }

  /**
   * Chiamata di funzione, con o senza parentesi, con eventuale esponente attaccato al nome (sin^2 x).
   * Senza parentesi l'argomento è un prodotto di numeri e lettere: sin 2x = sin(2x), e si ferma
   * davanti a +, −, a un'altra funzione o a una parentesi.
   */
  private parseFunctionCall(build: (arg: Expr) => Expr): Expr {
    let exponent: Expr | null = null;
    const token = this.current;
    if (token.type === "sup") {
      this.advance();
      exponent = num(BigInt(token.text));
    } else if (this.isOp("^")) {
      this.advance();
      exponent = this.parseExponentAtom();
    }

    let value: Expr;
    if (this.isOp("(")) {
      value = build(this.parseGroup());
    } else {
      value = build(this.parseBareArgument());
    }
    return exponent ? pow(value, exponent) : value;
  }

  /** Esponente attaccato al nome di una funzione: un numero, una lettera o un gruppo, anche con segno. */
  private parseExponentAtom(): Expr {
    if (this.isOp("-")) {
      this.advance();
      return neg(this.parseExponentAtom());
    }
    const token = this.current;
    if (token.type === "num" || token.type === "sym" || token.type === "const" || this.isOp("(")) return this.parsePrimary();
    throw new Failure("Dopo ^ serve un esponente.", token.pos);
  }

  private parseBareArgument(): Expr {
    const negative = this.isOp("-");
    if (negative) this.advance();
    const factors: Expr[] = [];
    for (;;) {
      const token = this.current;
      const simple = token.type === "num" || token.type === "sym" || token.type === "const" || token.type === "radical";
      const bar = this.isOp("|") && this.barDepth === 0 && factors.length === 0;
      if (!simple && !bar) break;
      if (token.type === "num" && factors.length > 0) break;
      factors.push(this.parseFactor());
    }
    if (factors.length === 0) {
      if (this.atEnd()) return this.placeholder();
      throw new Failure("Dopo il nome della funzione serve l'argomento.", this.current.pos);
    }
    const product = mul(...factors);
    return negative ? neg(product) : product;
  }

  /** Argomenti tra parentesi separati da punto e virgola: root(3; x), log(2; x). */
  private parseArguments(): Expr[] {
    this.advance();
    const outerBars = this.barDepth;
    this.barDepth = 0;
    const args = [this.parseSum()];
    while (this.isOp(";")) {
      this.advance();
      args.push(this.parseSum());
    }
    this.barDepth = outerBars;
    this.closeGroup();
    return args;
  }

  private parseWord(name: "sqrt" | "cbrt" | "root" | "abs" | "exp" | "log", pos: number): Expr {
    switch (name) {
      case "sqrt":
      case "cbrt":
        return root(name === "sqrt" ? 2 : 3, this.parseRadicand());
      case "abs":
        return this.parseFunctionCall((arg) => abs(arg));
      case "exp":
        return this.parseFunctionCall((arg) => pow(e, arg));
      case "root": {
        if (!this.isOp("(")) {
          if (this.atEnd()) return root(2, this.placeholder());
          throw new Failure("La radice si scrive root(indice; radicando), per esempio root(3; x).", pos);
        }
        const args = this.parseArguments();
        const [first, second] = args;
        if (args.length === 1 && first !== undefined) return root(2, first);
        const index = first?.kind === "num" && first.value.isInteger() ? Number(first.value.n) : NaN;
        if (args.length !== 2 || second === undefined || !(index >= 2 && index <= 99)) {
          throw new Failure("L'indice della radice deve essere un intero maggiore o uguale a 2: root(3; x).", pos);
        }
        return root(index, second);
      }
      case "log": {
        // log_2 x, log_2(x), log_(a+1)(x): la base dopo il trattino basso.
        if (this.isOp("_")) {
          this.advance();
          const base = this.isOp("(") ? this.parseGroup() : this.parseBaseAtom();
          return this.parseFunctionCall((arg) => log(base, arg));
        }
        if (this.isOp("(")) {
          const start = this.index;
          const args = this.parseArguments();
          const [first, second] = args;
          if (args.length === 2 && first !== undefined && second !== undefined) return log(first, second);
          if (args.length > 2) throw new Failure("Il logaritmo si scrive log(base; argomento).", pos);
          // Un solo argomento: si rilegge come chiamata normale, così log(x)^2 e simili seguono le regole solite.
          this.index = start;
        }
        return this.parseFunctionCall((arg) => log(10, arg));
      }
    }
  }

  private parseBaseAtom(): Expr {
    const token = this.current;
    if (token.type === "num" || token.type === "sym" || token.type === "const") return this.parsePrimary();
    if (this.atEnd()) return this.placeholder();
    throw new Failure("Dopo log_ serve la base del logaritmo.", token.pos);
  }
}

function parseNumber(text: string): Expr {
  const { value, decimals } = Rational.parseDecimal(text);
  // Un decimale resta segnato come tale: serve a riconoscere FORMA.DECIMALE.
  return text.includes(",") || text.includes(".") ? { kind: "num", value, decimals } : { kind: "num", value };
}

function run<T>(text: string, options: ParseOptions, body: (parser: Parser) => T): ParseResult<T> {
  const lexed = tokenize(text, options);
  if ("error" in lexed) return { ok: false, error: lexed.error };
  const parser = new Parser(lexed.tokens);
  if (parser.atEnd()) return { ok: false, error: { message: "Non hai scritto niente.", position: 0 } };
  try {
    const value = body(parser);
    if (!parser.atEnd()) {
      const stray = lexed.tokens.find((token) => token.pos === parser.position());
      const message =
        stray?.type === "op" && stray.op === ")"
          ? "C'è una parentesi chiusa in più."
          : stray?.type === "op" && RELATION_OPS.includes(stray.op)
            ? "Qui serve un'espressione, non un'equazione o una disequazione."
            : "Questa parte non si capisce.";
      return { ok: false, error: { message, position: parser.position() } };
    }
    return { ok: true, value, complete: parser.complete };
  } catch (failure) {
    if (failure instanceof Failure) return { ok: false, error: { message: failure.reason, position: failure.position } };
    if (failure instanceof EngineError) return { ok: false, error: { message: failure.message, position: 0 } };
    throw failure;
  }
}

/** Legge un'espressione. Non lancia mai errori: il risultato dice se il testo è valido e completo. */
export function parseExpression(text: string, options: ParseOptions = {}): ParseResult<Expr> {
  return run(text, options, (parser) => parser.parseSum());
}

/** Legge un'equazione o una disequazione: due espressioni con in mezzo =, ≠, <, ≤, >, ≥. */
export function parseRelation(text: string, options: ParseOptions = {}): ParseResult<Relation> {
  return run(text, options, (parser) => {
    const left = parser.parseSum();
    if (!parser.isRelationOp()) {
      throw new Failure("Manca il segno di uguale o di disuguaglianza.", parser.position());
    }
    const op = parser.takeRelationOp();
    return relation(left, op, parser.parseSum());
  });
}
