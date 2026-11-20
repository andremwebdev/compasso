// Registro dei moduli: per ogni modulo del programma, come caricarne il contenuto. È fisso: i 35
// moduli ci sono già tutti, e le righe nuove si aggiungono nel file del modulo (src/moduli/vN/mNN.ts),
// non qui. Nella versione telefono ogni import() diventa un file JavaScript a parte (moduli/vN/mNN.js),
// letto solo quando serve; nella versione PC esbuild li incorpora tutti nel file unico.

import type { ModuleCode } from "../codici";
import type { ModuleContent } from "./definizione";

export type { ModuleContent } from "./definizione";

export const moduleLoaders: Readonly<Record<ModuleCode, () => Promise<{ readonly default: ModuleContent }>>> = {
  "V1.M01": () => import("./v1/m01"),
  "V1.M02": () => import("./v1/m02"),
  "V1.M03": () => import("./v1/m03"),
  "V1.M04": () => import("./v1/m04"),
  "V1.M05": () => import("./v1/m05"),
  "V1.M06": () => import("./v1/m06"),
  "V1.M07": () => import("./v1/m07"),
  "V1.M08": () => import("./v1/m08"),
  "V1.M09": () => import("./v1/m09"),
  "V1.M10": () => import("./v1/m10"),
  "V1.M11": () => import("./v1/m11"),
  "V1.M12": () => import("./v1/m12"),
  "V1.M13": () => import("./v1/m13"),
  "V1.M14": () => import("./v1/m14"),
  "V2.M01": () => import("./v2/m01"),
  "V2.M02": () => import("./v2/m02"),
  "V2.M03": () => import("./v2/m03"),
  "V2.M04": () => import("./v2/m04"),
  "V2.M05": () => import("./v2/m05"),
  "V2.M06": () => import("./v2/m06"),
  "V2.M07": () => import("./v2/m07"),
  "V2.M08": () => import("./v2/m08"),
  "V2.M09": () => import("./v2/m09"),
  "V2.M10": () => import("./v2/m10"),
  "V2.M11": () => import("./v2/m11"),
  "V2.M12": () => import("./v2/m12"),
  "V3.M01": () => import("./v3/m01"),
  "V3.M02": () => import("./v3/m02"),
  "V3.M03": () => import("./v3/m03"),
  "V3.M04": () => import("./v3/m04"),
  "V3.M05": () => import("./v3/m05"),
  "V3.M06": () => import("./v3/m06"),
  "V3.M07": () => import("./v3/m07"),
  "V3.M08": () => import("./v3/m08"),
  "V3.M09": () => import("./v3/m09"),
};

/** I codici di tutti i moduli, in ordine di programma. */
export const moduleCodes = Object.keys(moduleLoaders) as ModuleCode[];
