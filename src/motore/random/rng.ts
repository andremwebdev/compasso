// Generatore di numeri casuali con seme, deterministico: è l'unica fonte di casualità ammessa nel
// motore e nei generatori (mai Math.random, mai l'ora). Stesso seme, stessa sequenza, su ogni dispositivo.

import { EngineError } from "../errors";

/** Trasforma una stringa in quattro interi a 32 bit (funzione cyrb128). */
function hash128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  return [h1 >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/** Generatore sfc32: veloce, di buona qualità, solo operazioni intere a 32 bit. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  private readonly key: string;

  /** La chiave è una stringa qualsiasi: di solito "codice generatore|livello|seme". */
  constructor(key: string) {
    this.key = key;
    [this.a, this.b, this.c, this.d] = hash128(key);
    // Qualche giro a vuoto per mescolare bene lo stato iniziale.
    for (let i = 0; i < 12; i++) this.nextUint32();
  }

  /** Il generatore di un esercizio: dipende solo da codice del generatore, livello e seme. */
  static forExercise(generatorCode: string, level: number, seed: number): Rng {
    return new Rng(`${generatorCode}|${level}|${seed}`);
  }

  private nextUint32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Numero reale in [0, 1). */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Numero reale in [min, max). */
  real(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Intero tra min e max, estremi compresi. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new EngineError(`Rng.int: intervallo non valido [${min}, ${max}].`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Intero tra min e max diverso da zero e dai valori esclusi. */
  intExcept(min: number, max: number, excluded: readonly number[] = [0]): number {
    const allowed: number[] = [];
    for (let value = min; value <= max; value++) {
      if (!excluded.includes(value)) allowed.push(value);
    }
    return this.pick(allowed);
  }

  /** Vero con probabilità p. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** +1 oppure −1. */
  sign(): 1 | -1 {
    return this.bool() ? 1 : -1;
  }

  /** Un elemento a caso della lista. */
  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) throw new EngineError("Rng.pick: lista vuota.");
    return item;
  }

  /** Una copia mescolata della lista (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j] as T, result[i] as T];
    }
    return result;
  }

  /** k elementi distinti della lista, in ordine casuale. */
  sample<T>(items: readonly T[], k: number): T[] {
    if (k > items.length) throw new EngineError("Rng.sample: richiesti più elementi di quanti ce ne sono.");
    return this.shuffle(items).slice(0, k);
  }

  /**
   * Un generatore indipendente derivato da questo, identificato da un'etichetta. Serve a tenere
   * separate le parti di un esercizio: aggiungere un'estrazione in una parte non cambia le altre.
   */
  fork(label: string): Rng {
    return new Rng(`${this.key}/${label}`);
  }
}
