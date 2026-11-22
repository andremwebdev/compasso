// Modulo V1.M01 «Insiemi e logica»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m01/l01.md";
import l01VennSottoinsieme from "../../contenuti/v1/m01/l01-venn-sottoinsieme.svg";
import l02 from "../../contenuti/v1/m01/l02.md";
import l02VennOperazioni from "../../contenuti/v1/m01/l02-venn-operazioni.svg";
import l03 from "../../contenuti/v1/m01/l03.md";
import l03VennLingue from "../../contenuti/v1/m01/l03-venn-lingue.svg";
import l03VennSport from "../../contenuti/v1/m01/l03-venn-sport.svg";
import l04 from "../../contenuti/v1/m01/l04.md";

export default defineModule("V1.M01", {
  lessons: {
    "V1.M01.L01": l01,
    "V1.M01.L02": l02,
    "V1.M01.L03": l03,
    "V1.M01.L04": l04,
  },
  figures: {
    "v1/m01/l01-venn-sottoinsieme.svg": l01VennSottoinsieme,
    "v1/m01/l02-venn-operazioni.svg": l02VennOperazioni,
    "v1/m01/l03-venn-lingue.svg": l03VennLingue,
    "v1/m01/l03-venn-sport.svg": l03VennSport,
  },
  generators: [],
});
