// Modulo V1.M06 «Disequazioni»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m06/l01.md";
import l02 from "../../contenuti/v1/m06/l02.md";
import l03 from "../../contenuti/v1/m06/l03.md";
import l04 from "../../contenuti/v1/m06/l04.md";
import a04g1 from "../../generatori/v1/m06/a04-g1";

export default defineModule("V1.M06", {
  lessons: {
    "V1.M06.L01": l01,
    "V1.M06.L02": l02,
    "V1.M06.L03": l03,
    "V1.M06.L04": l04,
  },
  generators: [
    a04g1,
  ],
});
