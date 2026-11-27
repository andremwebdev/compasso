// Modulo V1.M04 «Calcolo letterale»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m04/l01.md";
import l02 from "../../contenuti/v1/m04/l02.md";
import l03 from "../../contenuti/v1/m04/l03.md";
import l04 from "../../contenuti/v1/m04/l04.md";
import l05 from "../../contenuti/v1/m04/l05.md";
import l06 from "../../contenuti/v1/m04/l06.md";
import l07 from "../../contenuti/v1/m04/l07.md";
import l08 from "../../contenuti/v1/m04/l08.md";
import a07g1 from "../../generatori/v1/m04/a07-g1";

export default defineModule("V1.M04", {
  lessons: {
    "V1.M04.L01": l01,
    "V1.M04.L02": l02,
    "V1.M04.L03": l03,
    "V1.M04.L04": l04,
    "V1.M04.L05": l05,
    "V1.M04.L06": l06,
    "V1.M04.L07": l07,
    "V1.M04.L08": l08,
  },
  generators: [
    a07g1,
  ],
});
