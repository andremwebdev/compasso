// Modulo V3.M02 «Sistemi lineari e matrici»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import a01g1 from "../../generatori/v3/m02/a01-g1";

export default defineModule("V3.M02", {
  lessons: {},
  generators: [
    a01g1,
  ],
});
