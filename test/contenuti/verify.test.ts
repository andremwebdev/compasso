import { describe, expect, it } from "vitest";
import { formatContentReport, lessonPath, parseLesson, verifyContents, type ContentCatalog, type ContentFile } from "../../src/contenuti/formato";
import sample from "../esercizi/fixtures/sample-generator";

/** Una lezione minima di prova (non è un contenuto dell'app). */
function lesson(options: { code: string; prerequisites?: string[]; skills?: string[]; terms?: string[]; body?: string; path?: string }): ContentFile {
  const { code, prerequisites = [], skills = [], terms = [], body = "Una frase di spiegazione." } = options;
  const glossary = terms.map((term) => `:::glossario{termine=${term} nome="${term.replaceAll("-", " ")}"}\nLa definizione breve di ${term.replaceAll("-", " ")}.\n:::`);
  const text = [
    "---",
    `codice: ${code}`,
    `titolo: Lezione di prova ${code}`,
    "obiettivo: Provare la verifica dei contenuti.",
    `prerequisiti: [${prerequisites.join(", ")}]`,
    "durata: 12",
    `abilita: [${skills.join(", ")}]`,
    `termini: [${terms.join(", ")}]`,
    "---",
    "",
    body,
    "",
    ...glossary.flatMap((block) => [block, ""]),
    ":::riepilogo",
    "Il punto da ricordare.",
    ":::",
    "",
  ].join("\n");
  return { path: options.path ?? `src/contenuti/${lessonPath(code)}`, text };
}

const catalog: ContentCatalog = {
  // Il catalogo dei generatori si ricava dalle loro definizioni: qui c'è il generatore minimo di prova.
  generators: { [sample.code]: sample.levels },
  visualizations: ["VIS.disequazioni-grafico"],
};

const first = lesson({ code: "V1.M06.L01", skills: ["V1.M06.A01"], terms: ["disequazione", "verso"] });
const second = lesson({
  code: "V1.M06.L02",
  prerequisites: ["V1.M06.L01"],
  skills: ["V1.M06.A99"],
  terms: ["segno-di-una-frazione"],
  body: [
    "Riprendi la [[disequazione]] e il suo [[verso|verso]] dalla lezione [[V1.M06.L01]].",
    "",
    ':::definizione{id=V1.M06.D01 nome="Disequazione fratta"}',
    "Una disequazione con l'incognita al denominatore.",
    ":::",
    "",
    ':::teorema{id=V1.M06.T01 nome="Regola dei segni"}',
    "Il segno di un quoziente è il prodotto dei segni.",
    ":::",
    "",
    ":::attenzione{errore=DISEQ.SEGNO_DENOMINATORE}",
    "Non moltiplicare per il denominatore se non ne conosci il segno.",
    ":::",
    "",
    `:::domanda{generatore=${sample.code} livello=1}`,
    ":::",
    "",
    ":::visualizzazione{id=VIS.disequazioni-grafico}",
    ":::",
    "",
    ":::flashcard{id=V1.M06.F01}",
    "Quando si inverte il verso?",
    "::retro",
    "Quando si moltiplica o si divide per un numero negativo.",
    ":::",
  ].join("\n"),
});
const third = lesson({
  code: "V1.M06.L03",
  prerequisites: ["V1.M06.L02"],
  body: "Usa [[V1.M06.D01]], [[V1.M06.T01]], la [[disequazione]] e il [[segno-di-una-frazione]].",
});
const valid = [first, second, third];

const messages = (files: ContentFile[], other: ContentCatalog = catalog): string[] => verifyContents(files, other).problems.map((problem) => problem.message);
const replaced = (file: ContentFile, from: string, to: string): ContentFile => {
  if (!file.text.includes(from)) throw new Error(`Testo non trovato: ${from}`);
  return { ...file, text: file.text.replace(from, to) };
};

describe("verifica dei contenuti", () => {
  it("le lezioni di prova, prese una per una, sono valide", () => {
    for (const file of valid) expect(parseLesson(file.text).problems, file.path).toEqual([]);
    expect(lessonPath("V1.M06.L04")).toBe("v1/m06/l04.md");
  });

  it("un insieme coerente di lezioni non ha problemi, e se ne ricava il glossario", () => {
    const report = verifyContents(valid, catalog);
    expect(report.problems, formatContentReport(report)).toEqual([]);
    expect(report).toMatchObject({ ok: true, lessons: 3, warnings: [] });
    expect(report.glossary).toEqual([
      { term: "disequazione", name: "disequazione", definition: "La definizione breve di disequazione.", lesson: "V1.M06.L01" },
      { term: "segno-di-una-frazione", name: "segno di una frazione", definition: "La definizione breve di segno di una frazione.", lesson: "V1.M06.L02" },
      { term: "verso", name: "verso", definition: "La definizione breve di verso.", lesson: "V1.M06.L01" },
    ]);
    expect(formatContentReport(report)).toContain("3 lezioni, 3 termini del glossario");
    expect(verifyContents([], catalog)).toMatchObject({ ok: true, lessons: 0 });
  });

  it("intestazione non valida: i problemi della singola lezione arrivano con file e riga", () => {
    const report = verifyContents([replaced(first, "durata: 12", "durata: 45"), second, third], catalog);
    expect(report.ok).toBe(false);
    expect(report.problems[0]).toMatchObject({ path: "src/contenuti/v1/m06/l01.md" });
    expect(report.problems[0]?.line).toBeGreaterThan(0);
    expect(formatContentReport(report)).toMatch(/l01\.md:\d+ — /);
    const broken = verifyContents([{ path: "src/contenuti/v1/m06/l09.md", text: "Senza intestazione." }], catalog);
    expect(broken).toMatchObject({ ok: false, lessons: 0 });
  });

  it("il file deve stare nel posto che corrisponde al codice", () => {
    expect(messages([{ ...first, path: "src/contenuti/v1/m06/l07.md" }])).toEqual(["La lezione V1.M06.L01 deve stare nel file v1/m06/l01.md."]);
    expect(messages([{ ...first, path: "C:\\compasso\\src\\contenuti\\V1\\M06\\L01.md" }])).toEqual([]);
  });

  it("codici unici: lezioni, abilità, definizioni, teoremi, flashcard", () => {
    expect(messages([first, { ...first, path: "copia/v1/m06/l01.md" }])).toEqual([
      "La lezione V1.M06.L01 esiste già in src/contenuti/v1/m06/l01.md (riga 1): i codici sono unici.",
      "L'abilità V1.M06.A01 esiste già in src/contenuti/v1/m06/l01.md (riga 1): i codici sono unici.",
    ]);
    const copy = lesson({ code: "V1.M06.L04", body: second.text.slice(second.text.indexOf(":::definizione"), second.text.indexOf(":::attenzione")) + "\n:::flashcard{id=V1.M06.F01}\nDavanti.\n::retro\nDietro.\n:::" });
    const found = messages([...valid, copy]);
    expect(found).toHaveLength(3);
    expect(found[0]).toMatch(/^La definizione V1\.M06\.D01 esiste già in src\/contenuti\/v1\/m06\/l02\.md \(riga \d+\)/);
    expect(found[1]).toMatch(/^Il teorema V1\.M06\.T01 esiste già/);
    expect(found[2]).toMatch(/^La flashcard V1\.M06\.F01 esiste già/);
  });

  it("prerequisiti: devono esistere e non fare giri", () => {
    expect(messages([second, third])).toContain("Il prerequisito V1.M06.L01 non esiste.");
    const loop = [replaced(first, "prerequisiti: []", "prerequisiti: [V1.M06.L03]"), second, third];
    const found = messages(loop);
    expect(found).toHaveLength(3);
    expect(found).toContain("I prerequisiti di V1.M06.L01 fanno un giro: seguendoli si torna a V1.M06.L01.");
    expect(messages([replaced(first, "prerequisiti: []", "prerequisiti: [V1.M06.L01]")])).toEqual(["Una lezione non può essere prerequisito di se stessa."]);
  });

  it("glossario: un termine si definisce in una sola lezione e i rimandi devono trovarlo", () => {
    const twice = lesson({ code: "V1.M06.L04", prerequisites: ["V1.M06.L01"], terms: ["verso"] });
    expect(messages([...valid, twice])).toEqual([
      "Il termine «verso» è già definito nella lezione V1.M06.L01: un termine si definisce una volta sola, altrove si rimanda con [[verso]].",
    ]);
    expect(messages([first, lesson({ code: "V1.M06.L05", body: "Parla di [[intervallo]]." })])).toEqual(["Il rimando [[intervallo]] punta a un termine che nessuna lezione definisce."]);
  });

  it("un termine usato fuori dalla catena dei prerequisiti è un avviso, non un errore", () => {
    const outside = lesson({ code: "V1.M06.L06", body: "Qui serve il [[segno-di-una-frazione]]." });
    const report = verifyContents([...valid, outside], catalog);
    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual([
      { path: "src/contenuti/v1/m06/l06.md", line: 0, message: "Il termine «segno-di-una-frazione» è definito in V1.M06.L02, che non è tra i prerequisiti di V1.M06.L06: chi arriva qui potrebbe non averlo ancora incontrato." },
    ]);
    expect(formatContentReport(report)).toContain("Avviso:");
    // Lungo i prerequisiti, anche indiretti, va bene: la terza lezione usa un termine della prima.
    expect(verifyContents(valid, catalog).warnings).toEqual([]);
  });

  it("rimandi a lezioni, definizioni e teoremi che non esistono", () => {
    const dangling = lesson({ code: "V1.M06.L07", body: "Vedi [[V1.M06.L88]], [[V1.M06.D77]] e [[V1.M06.T66]]." });
    expect(messages([dangling])).toEqual([
      "Il rimando [[V1.M06.L88]] punta a una lezione che non esiste.",
      "Il rimando [[V1.M06.D77]] punta a una definizione che non esiste.",
      "Il rimando a V1.M06.T66 punta a un teorema che non esiste.",
    ]);
  });

  it("generatori e visualizzazioni devono esistere, con il livello richiesto", () => {
    expect(messages(valid, { generators: {}, visualizations: [] })).toEqual([
      "La visualizzazione VIS.disequazioni-grafico non esiste.",
      `Il generatore ${sample.code} non esiste.`,
    ]);
    const levelThree = [first, replaced(second, "livello=1", "livello=3"), third];
    expect(messages(levelThree)).toEqual([`Il generatore ${sample.code} non ha il livello 3 (ha: 1, 2).`]);
    const report = verifyContents(levelThree, catalog);
    expect(report.problems[0]?.line).toBeGreaterThan(10);
  });
});
