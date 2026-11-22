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
import l05 from "../../contenuti/v1/m01/l05.md";
import l06 from "../../contenuti/v1/m01/l06.md";
import l07 from "../../contenuti/v1/m01/l07.md";
import l08 from "../../contenuti/v1/m01/l08.md";
import a01g1 from "../../generatori/v1/m01/a01-g1";
import a02g1 from "../../generatori/v1/m01/a02-g1";
import a03g1 from "../../generatori/v1/m01/a03-g1";

export default defineModule("V1.M01", {
  lessons: {
    "V1.M01.L01": l01,
    "V1.M01.L02": l02,
    "V1.M01.L03": l03,
    "V1.M01.L04": l04,
    "V1.M01.L05": l05,
    "V1.M01.L06": l06,
    "V1.M01.L07": l07,
    "V1.M01.L08": l08,
  },
  figures: {
    "v1/m01/l01-venn-sottoinsieme.svg": l01VennSottoinsieme,
    "v1/m01/l02-venn-operazioni.svg": l02VennOperazioni,
    "v1/m01/l03-venn-lingue.svg": l03VennLingue,
    "v1/m01/l03-venn-sport.svg": l03VennSport,
  },
  generators: [a01g1, a02g1, a03g1],
});
