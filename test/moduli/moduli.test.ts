// I moduli dei contenuti (src/moduli): registro completo e fisso, un file per modulo, indice leggero
// uguale ai contenuti veri, caricamento a richiesta (un modulo alla volta).

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { cardsOfLesson } from "../../src/app/ripasso/cards";
import { loadLesson } from "../../src/contenuti";
import { programme } from "../../src/contenuti/programma";
import { loadedModules } from "../../src/moduli/caricamento";
import { moduleCodes, moduleLoaders } from "../../src/moduli/index";
import { contentIndex } from "../../src/moduli/indice";
import { indexModule } from "../../src/moduli/indicizza";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("registro dei moduli", () => {
  it("ha tutti i moduli del programma, nel suo ordine", () => {
    expect(moduleCodes).toEqual(programme.flatMap((volume) => volume.modules.map((module) => module.code)));
  });

  it("ogni modulo ha il suo file src/moduli/vN/mNN.ts, e non ce ne sono altri", () => {
    const files = ["v1", "v2", "v3"].flatMap((volume) => readdirSync(path.join(root, "src", "moduli", volume)).map((name) => `${volume}/${name}`));
    expect(files.sort()).toEqual(moduleCodes.map((code) => `${code.toLowerCase().replace(".", "/")}.ts`).sort());
    // Il registro punta al file giusto: il codice dichiarato nel file è quello del registro.
    for (const module of loadedModules()) expect(moduleLoaders[module.code]).toBeDefined();
    expect(loadedModules().map((module) => module.code).sort()).toEqual([...moduleCodes].sort());
  });
});

describe("indice leggero", () => {
  it("è uguale a quello calcolato dai contenuti veri", () => {
    const byCode = new Map(loadedModules().map((module) => [module.code, module]));
    expect(contentIndex.map((module) => module.code)).toEqual(moduleCodes);
    for (const info of contentIndex) expect(info).toEqual(indexModule(byCode.get(info.code)!));
  });

  it("ha le stesse flashcard di cardsOfLesson", () => {
    for (const module of contentIndex) {
      for (const lesson of module.lessons) {
        const parsed = loadLesson(lesson.code);
        expect(parsed, lesson.code).not.toBeNull();
        expect(lesson.cards).toEqual(cardsOfLesson(parsed!).map((card) => card.id));
      }
    }
  });

  it("non contiene il testo delle lezioni né il codice dei generatori", () => {
    // Solo codici e titoli: nessun testo lungo.
    const strings: string[] = [];
    JSON.stringify(contentIndex, (_key, value: unknown) => {
      if (typeof value === "string") strings.push(value);
      return value;
    });
    expect(strings.filter((text) => text.length > 120)).toEqual([]);
    // Il limite totale cresce con i contenuti: oggi circa 300 caratteri per lezione o generatore, quindi
    // a programma completo (230 lezioni, 237 generatori) circa 140.000. Il controllo che conta è quello
    // sopra (nessun testo lungo); questo ferma solo una crescita fuori scala (prima era 20.000, superato
    // con i generatori di V1.M03).
    expect(JSON.stringify(contentIndex).length).toBeLessThan(200_000);
  });
});

describe("caricamento a richiesta", () => {
  it("prima di ensureModules non c'è nulla; poi solo il modulo chiesto", async () => {
    // Copie nuove dei file, senza i moduli caricati da test/setup.ts.
    vi.resetModules();
    const caricamento = await import("../../src/moduli/caricamento");
    const contenuti = await import("../../src/contenuti");
    const generatori = await import("../../src/generatori");

    expect(caricamento.loadedModules()).toEqual([]);
    // L'indice c'è già: codici e titoli senza caricare nulla.
    expect(contenuti.lessonCodes).toContain("V1.M06.L04");
    expect(contenuti.lessonInfo("V1.M06.L04")?.title).toBe("Disequazioni fratte");
    expect(generatori.findGeneratorInfo("V2.M06.A03.g1")?.skill).toBe("V2.M06.A03");
    // Il testo e il codice no.
    expect(contenuti.loadLesson("V1.M06.L04")).toBeNull();
    expect(generatori.findGenerator("V1.M06.A04.g1")).toBeUndefined();

    let notified = 0;
    caricamento.onModuleLoaded(() => notified++);
    await Promise.all([caricamento.ensureModules(["V1.M06"]), caricamento.ensureModules(["V1.M06"])]);
    expect(notified).toBe(1);
    expect(caricamento.loadedModules().map((module) => module.code)).toEqual(["V1.M06"]);
    expect(contenuti.loadLesson("V1.M06.L04")?.meta.title).toBe("Disequazioni fratte");
    expect(generatori.findGenerator("V1.M06.A04.g1")?.code).toBe("V1.M06.A04.g1");
    // Gli altri moduli restano da caricare.
    expect(generatori.findGenerator("V2.M06.A03.g1")).toBeUndefined();
    expect(caricamento.isModuleLoaded("V2.M06")).toBe(false);
    expect(caricamento.areModulesLoaded(["V1.M06", "V2.M06"])).toBe(false);

    // Un codice sconosciuto non rompe nulla.
    await caricamento.ensureModules(["V9.M99"]);
    expect(caricamento.areModulesLoaded(["V9.M99"])).toBe(true);
  });
});
