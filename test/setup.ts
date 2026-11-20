// Prima di ogni file di test: tutti i moduli caricati, come nella versione PC dopo il primo uso.
// Il caricamento a richiesta vero si prova in test/moduli/caricamento.test.ts e nella prova della
// versione telefono (test/build.test.ts).

import { ensureModules } from "../src/moduli/caricamento";
import { moduleCodes } from "../src/moduli/index";

await ensureModules(moduleCodes);
