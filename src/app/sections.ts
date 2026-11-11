// Le cinque sezioni della barra in basso (specifica, sezione 3), nell'ordine in cui compaiono.

export const sections = [
  { id: "oggi", label: "Oggi" },
  { id: "teoria", label: "Teoria" },
  { id: "esercizi", label: "Esercizi" },
  { id: "test", label: "Test" },
  { id: "tu", label: "Tu" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
