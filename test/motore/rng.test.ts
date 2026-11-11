import { describe, expect, it } from "vitest";
import { Rng } from "../../src/motore/random/rng";

describe("generatore casuale con seme", () => {
  it("stesso seme, stessa sequenza", () => {
    const a = Rng.forExercise("V1.M06.A04.g1", 2, 4821);
    const b = Rng.forExercise("V1.M06.A04.g1", 2, 4821);
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(Array.from({ length: 50 }, () => b.next()));
  });

  it("la sequenza è fissata per sempre (un cambio romperebbe tutti gli esercizi salvati)", () => {
    const rng = Rng.forExercise("V1.M06.A04.g1", 2, 4821);
    expect(Array.from({ length: 6 }, () => rng.int(-9, 9))).toMatchInlineSnapshot(`
      [
        9,
        -6,
        -9,
        0,
        5,
        -5,
      ]
    `);
  });

  it("seme, livello o generatore diversi danno sequenze diverse", () => {
    const first = (code: string, level: number, seed: number) => {
      const rng = Rng.forExercise(code, level, seed);
      return Array.from({ length: 8 }, () => rng.int(0, 1000)).join(",");
    };
    const base = first("V1.M06.A04.g1", 2, 1);
    expect(first("V1.M06.A04.g1", 2, 2)).not.toBe(base);
    expect(first("V1.M06.A04.g1", 3, 1)).not.toBe(base);
    expect(first("V1.M06.A04.g2", 2, 1)).not.toBe(base);
  });

  it("gli interi restano nell'intervallo e lo coprono tutto in modo uniforme", () => {
    const rng = new Rng("uniformità");
    const counts = new Map<number, number>();
    for (let i = 0; i < 21000; i++) {
      const value = rng.int(-3, 3);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((x, y) => x - y)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    for (const count of counts.values()) expect(Math.abs(count - 3000)).toBeLessThan(300);
  });

  it("intExcept esclude lo zero e i valori indicati", () => {
    const rng = new Rng("esclusi");
    for (let i = 0; i < 500; i++) {
      const value = rng.intExcept(-3, 3, [0, 1]);
      expect(value === 0 || value === 1).toBe(false);
    }
  });

  it("mescola senza perdere elementi e senza toccare l'originale", () => {
    const rng = new Rng("mescola");
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(new Set(rng.sample(items, 5)).size).toBe(5);
  });

  it("i generatori derivati sono indipendenti dall'ordine delle estrazioni", () => {
    const a = new Rng("base");
    const b = new Rng("base");
    a.next();
    a.next();
    expect(a.fork("testo").int(0, 1e6)).toBe(b.fork("testo").int(0, 1e6));
    expect(a.fork("testo").int(0, 1e6)).not.toBe(a.fork("opzioni").int(0, 1e6));
  });

  it("rifiuta le richieste impossibili", () => {
    const rng = new Rng("errori");
    expect(() => rng.int(3, 1)).toThrow();
    expect(() => rng.pick([])).toThrow();
    expect(() => rng.sample([1, 2], 3)).toThrow();
  });
});
