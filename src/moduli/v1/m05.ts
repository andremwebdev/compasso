// Modulo V1.M05 «Equazioni»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m05/l01.md";
import l02 from "../../contenuti/v1/m05/l02.md";
import l03 from "../../contenuti/v1/m05/l03.md";
import l04 from "../../contenuti/v1/m05/l04.md";
import l05 from "../../contenuti/v1/m05/l05.md";
import l06 from "../../contenuti/v1/m05/l06.md";
import l07 from "../../contenuti/v1/m05/l07.md";

export default defineModule("V1.M05", {
  lessons: {
    "V1.M05.L01": l01,
    "V1.M05.L02": l02,
    "V1.M05.L03": l03,
    "V1.M05.L04": l04,
    "V1.M05.L05": l05,
    "V1.M05.L06": l06,
    "V1.M05.L07": l07,
  },
  generators: [],
});
