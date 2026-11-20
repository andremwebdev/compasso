// Modulo V2.M11 «Serie numeriche»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import a01g1 from "../../generatori/v2/m11/a01-g1";

export default defineModule("V2.M11", {
  lessons: {},
  generators: [
    a01g1,
  ],
});
