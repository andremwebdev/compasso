// Tipi di scripts/indice-contenuti.mjs, per vitest.config.ts.

import type { ModuleInfo } from "../src/moduli/indice";

export function computeContentIndex(): Promise<ModuleInfo[]>;
export function contentIndexDefine(): Promise<string>;
