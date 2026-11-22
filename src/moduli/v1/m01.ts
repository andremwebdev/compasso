// Modulo V1.M01 «Insiemi e logica»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m01/l01.md";
import l01VennSottoinsieme from "../../contenuti/v1/m01/l01-venn-sottoinsieme.svg";
import l02 from "../../contenuti/v1/m01/l02.md";
import l02VennOperazioni from "../../contenuti/v1/m01/l02-venn-operazioni.svg";

export default defineModule("V1.M01", {
  lessons: {
    "V1.M01.L01": l01,
    "V1.M01.L02": l02,
  },
  figures: {
    "v1/m01/l01-venn-sottoinsieme.svg": l01VennSottoinsieme,
    "v1/m01/l02-venn-operazioni.svg": l02VennOperazioni,
  },
  generators: [],
});
