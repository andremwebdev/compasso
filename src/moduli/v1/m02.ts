// Modulo V1.M02 «Numeri»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m02/l01.md";
import l02 from "../../contenuti/v1/m02/l02.md";
import l03 from "../../contenuti/v1/m02/l03.md";
import l04 from "../../contenuti/v1/m02/l04.md";
import l05 from "../../contenuti/v1/m02/l05.md";
import l06 from "../../contenuti/v1/m02/l06.md";
import l07 from "../../contenuti/v1/m02/l07.md";
import l08 from "../../contenuti/v1/m02/l08.md";

export default defineModule("V1.M02", {
  lessons: {
    "V1.M02.L01": l01,
    "V1.M02.L02": l02,
    "V1.M02.L03": l03,
    "V1.M02.L04": l04,
    "V1.M02.L05": l05,
    "V1.M02.L06": l06,
    "V1.M02.L07": l07,
    "V1.M02.L08": l08,
  },
  generators: [],
});
