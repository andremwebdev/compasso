// Conti della sessione di Oggi: taratura dei tempi, ripasso, difficoltà crescente, alternanza dei binari.

import { describe, expect, it } from "vitest";
import type { DayRecord } from "../../src/dati";
import { exerciseCount, PHASE_MINUTES, phaseMinutes, rampLevels, reviewPlan, trackForToday } from "../../src/app/oggi/plan";

const day = (date: string, track: DayRecord["track"]): DayRecord => ({ date, minutes: 40, track, completedAt: `${date}T18:00:00.000Z` });

describe("sessione di Oggi", () => {
  it("la taratura della specifica: ogni durata somma i suoi minuti", () => {
    expect(PHASE_MINUTES[20]).toEqual([5, 9, 4, 1, 1]);
    expect(PHASE_MINUTES[40]).toEqual([8, 16, 9, 5, 2]);
    expect(PHASE_MINUTES[60]).toEqual([10, 22, 15, 10, 3]);
    for (const minutes of [20, 40, 60] as const) expect(PHASE_MINUTES[minutes].reduce((a, b) => a + b, 0)).toBe(minutes);
  });

  it("senza lezione nuova il tempo della lezione passa agli esercizi", () => {
    expect(phaseMinutes(40, false)).toEqual([8, 0, 25, 5, 2]);
    expect(phaseMinutes(40, true)).toEqual([8, 16, 9, 5, 2]);
    expect([exerciseCount(1), exerciseCount(4), exerciseCount(9), exerciseCount(15)]).toEqual([1, 2, 5, 8]);
  });

  it("ripasso: metà del tempo alle flashcard, quello che avanza all'altra parte", () => {
    expect(reviewPlan(8, 20, 1)).toEqual({ cards: 12, exercises: 1 });
    expect(reviewPlan(8, 2, 5)).toEqual({ cards: 2, exercises: 3 });
    expect(reviewPlan(8, 0, 0)).toEqual({ cards: 0, exercises: 0 });
    expect(reviewPlan(5, 30, 30)).toEqual({ cards: 6, exercises: 1 });
  });

  it("esercizi sulla lezione a difficoltà crescente", () => {
    expect(rampLevels(5)).toEqual([1, 1, 2, 2, 3]);
    expect(rampLevels(2)).toEqual([1, 2]);
    expect(rampLevels(1)).toEqual([2]);
  });

  it("i binari attivi si alternano giorno per giorno; una lezione a metà continua il giorno dopo", () => {
    const none = (): boolean => false;
    expect(trackForToday(["V2", "V3"], [], "2026-11-20", none)).toBe("V2");
    expect(trackForToday(["V2", "V3"], [day("2026-11-18", "V3"), day("2026-11-19", "V2")], "2026-11-20", none)).toBe("V3");
    expect(trackForToday(["V2", "V3"], [day("2026-11-19", "V3")], "2026-11-20", none)).toBe("V2");
    // La sessione di oggi già fatta non cambia il binario di oggi.
    expect(trackForToday(["V2", "V3"], [day("2026-11-19", "V2"), day("2026-11-20", "V3")], "2026-11-20", none)).toBe("V3");
    expect(trackForToday(["V2", "V3"], [day("2026-11-19", "V2")], "2026-11-20", (track) => track === "V2")).toBe("V2");
    expect(trackForToday(["V1"], [day("2026-11-19", "V1")], "2026-11-20", none)).toBe("V1");
    expect(trackForToday(["V1"], [day("2026-11-19", "V3")], "2026-11-20", none)).toBe("V1");
  });
});
