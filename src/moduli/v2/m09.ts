// Modulo V2.M09 «Integrali»: le sue lezioni e i suoi generatori.
// Una lezione o un generatore nuovi di questo modulo si aggiungono QUI: una riga di import e una
// riga nell'elenco (REGOLE.md, «Per aggiungere una lezione» e «Come replicare un generatore»).

import { defineModule } from "../definizione";
import a01g1 from "../../generatori/v2/m09/a01-g1";
import a02g1 from "../../generatori/v2/m09/a02-g1";

export default defineModule("V2.M09", {
  lessons: {},
  generators: [
    a01g1,
    a02g1,
  ],
});
