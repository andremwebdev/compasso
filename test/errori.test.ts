import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { errorCatalog, errorCategories, errorsInCategory, findError, isErrorCode, UNCLASSIFIED } from "../src/errori";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spec = readFileSync(path.join(root, "docs", "SPECIFICA.md"), "utf8");

/** Toglie gli escape di Markdown usati nella tabella della specifica. */
function unescapeCell(text: string): string {
  return text.trim().replace(/\\([_|[\]])/g, "$1");
}

interface SpecRow {
  code: string;
  name: string;
  reference: string;
}

/** Legge le righe della tabella "Catalogo iniziale" di docs/SPECIFICA.md. */
function readSpecCatalog(): SpecRow[] {
  const start = spec.indexOf("### Catalogo iniziale");
  expect(start, "sezione 'Catalogo iniziale' non trovata nella specifica").toBeGreaterThan(-1);
  const rows: SpecRow[] = [];
  for (const line of spec.slice(start).split("\n").slice(1)) {
    if (line.startsWith("##")) break; // inizia un'altra sezione
    if (!line.startsWith("| ")) continue;
    // Si divide sulle barre verticali non precedute da una barra rovescia (\| è un carattere del testo).
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== 4) continue;
    const [code, name, , reference] = cells.map(unescapeCell) as [string, string, string, string];
    if (code === "Codice" || code.startsWith("---")) continue;
    rows.push({ code, name, reference });
  }
  return rows;
}

/** Codici dei moduli elencati nella specifica (V1.M01 … V3.M09). */
function readSpecModules(): Set<string> {
  return new Set([...spec.matchAll(/^\d+\. \*\*(V\d\.M\d{2}) /gm)].map((m) => m[1] as string));
}

/** Le parti di testo tra $...$ di una stringa. */
function mathSegments(text: string): string[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1] as string);
}

describe("catalogo errori: coerenza con la specifica", () => {
  const specRows = readSpecCatalog();

  it("la tabella della specifica è stata letta (controllo del lettore)", () => {
    expect(specRows.length).toBeGreaterThanOrEqual(65);
  });

  it("contiene tutte le voci del catalogo iniziale, con lo stesso nome, categoria e rimando", () => {
    for (const row of specRows) {
      const entry = findError(row.code);
      expect(entry, `manca la voce ${row.code}`).toBeDefined();
      expect(entry?.name, `nome di ${row.code}`).toBe(row.name);
      expect(entry?.category, `categoria di ${row.code}`).toBe(row.code.split(".")[0]);
      expect(entry?.reference, `rimando di ${row.code}`).toBe(row.reference);
    }
  });

  it("le categorie sono le dodici della specifica", () => {
    expect(Object.keys(errorCategories)).toEqual([
      "CALC", "ALG", "COND", "DISEQ", "LOG", "FUNZ", "TRIG", "GEO", "STAT", "AN", "ALIN", "FORMA",
    ]);
  });
});

describe("catalogo errori: struttura", () => {
  it("i codici sono unici e nella forma CATEGORIA.NOME", () => {
    const codes = errorCatalog.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const entry of errorCatalog) {
      expect(entry.code).toMatch(/^[A-Z]+\.[A-Z0-9_]+$/);
      expect(entry.code.split(".")[0], `categoria di ${entry.code}`).toBe(entry.category);
      expect(Object.keys(errorCategories)).toContain(entry.category);
    }
  });

  it("i nomi sono unici (nessun errore registrato due volte con nomi diversi)", () => {
    const names = errorCatalog.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("ogni categoria ha almeno una voce", () => {
    for (const category of Object.keys(errorCategories) as (keyof typeof errorCategories)[]) {
      expect(errorsInCategory(category).length, category).toBeGreaterThan(0);
    }
  });

  it('i rimandi sono "tutte" oppure un modulo o una lezione che esiste nella specifica', () => {
    const modules = readSpecModules();
    expect(modules.size).toBe(35);
    for (const entry of errorCatalog) {
      if (entry.reference === "tutte") continue;
      expect(entry.reference, `rimando di ${entry.code}`).toMatch(/^V\d\.M\d{2}(\.L\d{2})?$/);
      const moduleCode = entry.reference.split(".").slice(0, 2).join(".");
      expect(modules.has(moduleCode), `${entry.code} rimanda a ${moduleCode}, che non esiste`).toBe(true);
    }
  });
});

describe("catalogo errori: testi ed esempi", () => {
  it("ogni voce ha una spiegazione e un esempio con almeno una formula", () => {
    for (const entry of errorCatalog) {
      expect(entry.explanation.trim().length, `spiegazione di ${entry.code}`).toBeGreaterThan(20);
      expect(entry.example.trim().length, `esempio di ${entry.code}`).toBeGreaterThan(20);
      expect(mathSegments(entry.example).length, `formule nell'esempio di ${entry.code}`).toBeGreaterThan(0);
    }
  });

  it("i simboli $ sono sempre a coppie", () => {
    for (const entry of errorCatalog) {
      for (const field of ["explanation", "example"] as const) {
        const dollars = entry[field].split("$").length - 1;
        expect(dollars % 2, `${field} di ${entry.code}`).toBe(0);
      }
    }
  });

  it("ogni formula si disegna con KaTeX in modalità rigorosa", () => {
    for (const entry of errorCatalog) {
      for (const field of ["explanation", "example"] as const) {
        for (const tex of mathSegments(entry[field])) {
          expect(
            () => katex.renderToString(tex, { throwOnError: true, strict: "error" }),
            `${field} di ${entry.code}: $${tex}$`,
          ).not.toThrow();
        }
      }
    }
  });
});

describe("catalogo errori: accesso", () => {
  it("trova una voce per codice", () => {
    expect(findError("DISEQ.VERSO_NON_INVERTITO")?.name).toBe("Verso non invertito");
    expect(findError("NON.ESISTE")).toBeUndefined();
  });

  it("riconosce i codici del catalogo", () => {
    expect(isErrorCode("FORMA.DECIMALE")).toBe(true);
    expect(isErrorCode(UNCLASSIFIED)).toBe(false);
    expect(isErrorCode("distrazione")).toBe(false);
  });

  it("NON_CLASSIFICATO non è una voce del catalogo", () => {
    expect(UNCLASSIFIED).toBe("NON_CLASSIFICATO");
    expect(findError(UNCLASSIFIED)).toBeUndefined();
  });
});
