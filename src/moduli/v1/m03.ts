// Modulo V1.M03 «Calcolo numerico»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import l01 from "../../contenuti/v1/m03/l01.md";
import l02 from "../../contenuti/v1/m03/l02.md";

export default defineModule("V1.M03", {
  lessons: {
    "V1.M03.L01": l01,
    "V1.M03.L02": l02,
  },
  generators: [],
});
