import { describe, expect, it } from "vitest";
import { sections } from "../src/app/sections";

describe("sezioni dell'app", () => {
  it("sono cinque, nell'ordine della specifica", () => {
    expect(sections.map((s) => s.label)).toEqual(["Oggi", "Teoria", "Esercizi", "Test", "Tu"]);
  });

  it("hanno identificatori unici", () => {
    const ids = sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
