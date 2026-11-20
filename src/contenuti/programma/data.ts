// FILE GENERATO da docs/SCALETTE.md con src/contenuti/programma/parse.ts: non modificarlo a mano.
// Per rigenerarlo: COMPASSO_SCRIVI=1 npx vitest run test/contenuti/programma.test.ts

import type { PlannedVolume } from "./parse";

export const programme: readonly PlannedVolume[] = [
 {
  "code": "V1",
  "title": "Fondamenta",
  "modules": [
   {
    "code": "V1.M01",
    "title": "Insiemi e logica",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M01.L01",
      "title": "Insiemi",
      "minutes": 15,
      "prerequisites": [],
      "skills": [
       {
        "code": "V1.M01.A01",
        "text": "riconoscere appartenenza e inclusione; passare tra elencazione e proprietà caratteristica."
       }
      ]
     },
     {
      "code": "V1.M01.L02",
      "title": "Operazioni tra insiemi",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L01"
      ],
      "skills": [
       {
        "code": "V1.M01.A02",
        "text": "unione, intersezione, differenza, complementare, prodotto cartesiano di insiemi dati."
       }
      ]
     },
     {
      "code": "V1.M01.L03",
      "title": "Contare con i diagrammi di Venn",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L02"
      ],
      "skills": [
       {
        "code": "V1.M01.A03",
        "text": "problemi di conteggio con due o tre insiemi (quanti studenti fanno solo…)."
       }
      ]
     },
     {
      "code": "V1.M01.L04",
      "title": "Proposizioni e connettivi",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L01"
      ],
      "skills": [
       {
        "code": "V1.M01.A04",
        "text": "valore di verità di proposizioni composte, tavole di verità."
       }
      ]
     },
     {
      "code": "V1.M01.L05",
      "title": "Implicazione, condizione necessaria e sufficiente",
      "minutes": 20,
      "prerequisites": [
       "V1.M01.L04"
      ],
      "skills": [
       {
        "code": "V1.M01.A05",
        "text": "riconoscere condizioni necessarie, sufficienti, necessarie e sufficienti."
       },
       {
        "code": "V1.M01.A06",
        "text": "inversa, contraria e contronominale di un'implicazione; quali sono equivalenti."
       }
      ]
     },
     {
      "code": "V1.M01.L06",
      "title": "Quantificatori e negazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L05"
      ],
      "skills": [
       {
        "code": "V1.M01.A07",
        "text": "negare proposizioni con quantificatori e connettivi."
       }
      ]
     },
     {
      "code": "V1.M01.L07",
      "title": "Dimostrazioni e ragionamento per assurdo",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L06"
      ],
      "skills": [
       {
        "code": "V1.M01.A08",
        "text": "distinguere deduzioni valide da errori di deduzione."
       }
      ]
     },
     {
      "code": "V1.M01.L08",
      "title": "La logica nel linguaggio comune",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L07"
      ],
      "skills": [
       {
        "code": "V1.M01.A09",
        "text": "tradurre e confrontare frasi con «se… allora», «solo se», «a meno che», «non tutti», «almeno uno» (quesiti di tipo TOL; per la simulazione si aggiunge la banca scritta a mano, specifica sezione 8)."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M02",
    "title": "Numeri",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M02.L01",
      "title": "Numeri naturali e interi",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L02"
      ],
      "skills": [
       {
        "code": "V1.M02.A01",
        "text": "confronto e operazioni con i numeri interi, regola dei segni."
       }
      ]
     },
     {
      "code": "V1.M02.L02",
      "title": "Divisibilità e numeri primi",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L01"
      ],
      "skills": [
       {
        "code": "V1.M02.A02",
        "text": "criteri di divisibilità, quoziente e resto."
       },
       {
        "code": "V1.M02.A03",
        "text": "scomposizione in fattori primi."
       }
      ]
     },
     {
      "code": "V1.M02.L03",
      "title": "MCD e mcm",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L02"
      ],
      "skills": [
       {
        "code": "V1.M02.A04",
        "text": "MCD e mcm, anche nei problemi."
       }
      ]
     },
     {
      "code": "V1.M02.L04",
      "title": "Numeri razionali",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L03"
      ],
      "skills": [
       {
        "code": "V1.M02.A05",
        "text": "passare da frazione a numero decimale limitato e viceversa."
       }
      ]
     },
     {
      "code": "V1.M02.L05",
      "title": "Numeri periodici",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L04"
      ],
      "skills": [
       {
        "code": "V1.M02.A06",
        "text": "frazione generatrice di un numero periodico (serve il parser dei numeri periodici, vedi in fondo)."
       }
      ]
     },
     {
      "code": "V1.M02.L06",
      "title": "Numeri irrazionali e reali",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L05"
      ],
      "skills": [
       {
        "code": "V1.M02.A07",
        "text": "riconoscere numeri razionali e irrazionali."
       }
      ]
     },
     {
      "code": "V1.M02.L07",
      "title": "Ordinamento, valore assoluto e intervalli",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L06"
      ],
      "skills": [
       {
        "code": "V1.M02.A08",
        "text": "confrontare e ordinare numeri reali (frazioni, decimali, radici quadrate semplici)."
       }
      ]
     },
     {
      "code": "V1.M02.L08",
      "title": "Basi diverse da dieci",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L01"
      ],
      "skills": [
       {
        "code": "V1.M02.A09",
        "text": "conversioni tra base 10 e basi 2, 8, 16 (e una base qualsiasi)."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M03",
    "title": "Calcolo numerico",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M03.L01",
      "title": "Ordine delle operazioni",
      "minutes": 10,
      "prerequisites": [
       "V1.M02.L01"
      ],
      "skills": [
       {
        "code": "V1.M03.A01",
        "text": "espressioni con interi e parentesi."
       }
      ]
     },
     {
      "code": "V1.M03.L02",
      "title": "Frazioni: equivalenza e confronto",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L01",
       "V1.M02.L04"
      ],
      "skills": [
       {
        "code": "V1.M03.A02",
        "text": "ridurre ai minimi termini e confrontare frazioni."
       }
      ]
     },
     {
      "code": "V1.M03.L03",
      "title": "Operazioni con le frazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L02"
      ],
      "skills": [
       {
        "code": "V1.M03.A03",
        "text": "espressioni con le frazioni."
       }
      ]
     },
     {
      "code": "V1.M03.L04",
      "title": "Potenze",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L03"
      ],
      "skills": [
       {
        "code": "V1.M03.A04",
        "text": "proprietà delle potenze, esponente zero e negativo."
       }
      ]
     },
     {
      "code": "V1.M03.L05",
      "title": "Radicali",
      "minutes": 20,
      "prerequisites": [
       "V1.M03.L04",
       "V1.M02.L06"
      ],
      "skills": [
       {
        "code": "V1.M03.A05",
        "text": "semplificare radicali, portare fuori dalla radice, sommare radicali simili."
       }
      ]
     },
     {
      "code": "V1.M03.L06",
      "title": "Razionalizzazione e potenze a esponente razionale",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L05"
      ],
      "skills": [
       {
        "code": "V1.M03.A06",
        "text": "razionalizzare il denominatore."
       },
       {
        "code": "V1.M03.A07",
        "text": "passare tra radicali e potenze a esponente razionale."
       }
      ]
     },
     {
      "code": "V1.M03.L07",
      "title": "Notazione scientifica, arrotondamenti e stime",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L04"
      ],
      "skills": [
       {
        "code": "V1.M03.A08",
        "text": "notazione scientifica e ordine di grandezza (serve il parser della notazione scientifica, vedi in fondo)."
       },
       {
        "code": "V1.M03.A09",
        "text": "stime e arrotondamenti senza calcolatrice."
       }
      ]
     },
     {
      "code": "V1.M03.L08",
      "title": "Percentuali",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L03"
      ],
      "skills": [
       {
        "code": "V1.M03.A10",
        "text": "percentuali, variazioni percentuali, percentuali successive."
       }
      ]
     },
     {
      "code": "V1.M03.L09",
      "title": "Disuguaglianze numeriche",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L06",
       "V1.M02.L07"
      ],
      "skills": [
       {
        "code": "V1.M03.A11",
        "text": "confrontare espressioni numeriche (radicali, potenze, frazioni) senza calcolatrice."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M04",
    "title": "Calcolo letterale",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M04.L01",
      "title": "Monomi",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L04"
      ],
      "skills": [
       {
        "code": "V1.M04.A01",
        "text": "operazioni con i monomi."
       }
      ]
     },
     {
      "code": "V1.M04.L02",
      "title": "Polinomi",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L01"
      ],
      "skills": [
       {
        "code": "V1.M04.A02",
        "text": "somma e prodotto di polinomi."
       }
      ]
     },
     {
      "code": "V1.M04.L03",
      "title": "Prodotti notevoli",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L02"
      ],
      "skills": [
       {
        "code": "V1.M04.A03",
        "text": "sviluppare quadrati, cubi, somma per differenza."
       }
      ]
     },
     {
      "code": "V1.M04.L04",
      "title": "Divisione tra polinomi",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L03"
      ],
      "skills": [
       {
        "code": "V1.M04.A04",
        "text": "divisione con quoziente e resto."
       }
      ]
     },
     {
      "code": "V1.M04.L05",
      "title": "Regola di Ruffini e teorema del resto",
      "minutes": 20,
      "prerequisites": [
       "V1.M04.L04"
      ],
      "skills": [
       {
        "code": "V1.M04.A05",
        "text": "divisione con Ruffini e ricerca degli zeri razionali."
       }
      ]
     },
     {
      "code": "V1.M04.L06",
      "title": "Raccoglimenti e prodotti notevoli al contrario",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L05"
      ],
      "skills": [
       {
        "code": "V1.M04.A06",
        "text": "raccoglimento totale e parziale, differenza di quadrati."
       }
      ]
     },
     {
      "code": "V1.M04.L07",
      "title": "Scomposizione di polinomi",
      "minutes": 20,
      "prerequisites": [
       "V1.M04.L06"
      ],
      "skills": [
       {
        "code": "V1.M04.A07",
        "text": "scomporre con la strategia completa (trinomi, cubi, Ruffini, grado 3-4). **Esiste**: `V1.M04.A07.g1`."
       }
      ]
     },
     {
      "code": "V1.M04.L08",
      "title": "MCD e mcm di polinomi",
      "minutes": 10,
      "prerequisites": [
       "V1.M04.L07",
       "V1.M02.L03"
      ],
      "skills": [
       {
        "code": "V1.M04.A08",
        "text": "MCD e mcm di polinomi scomposti."
       }
      ]
     },
     {
      "code": "V1.M04.L09",
      "title": "Frazioni algebriche",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L08"
      ],
      "skills": [
       {
        "code": "V1.M04.A09",
        "text": "condizioni di esistenza e semplificazione."
       }
      ]
     },
     {
      "code": "V1.M04.L10",
      "title": "Operazioni con le frazioni algebriche",
      "minutes": 20,
      "prerequisites": [
       "V1.M04.L09"
      ],
      "skills": [
       {
        "code": "V1.M04.A10",
        "text": "somme, prodotti e quozienti di frazioni algebriche."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M05",
    "title": "Equazioni",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M05.L01",
      "title": "Equazioni di primo grado",
      "minutes": 15,
      "prerequisites": [
       "V1.M04.L02"
      ],
      "skills": [
       {
        "code": "V1.M05.A01",
        "text": "equazioni di primo grado intere, anche con frazioni numeriche."
       }
      ]
     },
     {
      "code": "V1.M05.L02",
      "title": "Equazioni di secondo grado",
      "minutes": 20,
      "prerequisites": [
       "V1.M05.L01",
       "V1.M04.L07",
       "V1.M03.L05"
      ],
      "skills": [
       {
        "code": "V1.M05.A02",
        "text": "equazioni complete e incomplete con la formula risolutiva."
       }
      ]
     },
     {
      "code": "V1.M05.L03",
      "title": "Relazioni tra radici e coefficienti",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L02"
      ],
      "skills": [
       {
        "code": "V1.M05.A03",
        "text": "somma e prodotto delle soluzioni; scrivere l'equazione con soluzioni date."
       }
      ]
     },
     {
      "code": "V1.M05.L04",
      "title": "Equazioni di grado superiore",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L03"
      ],
      "skills": [
       {
        "code": "V1.M05.A04",
        "text": "annullamento del prodotto, biquadratiche, binomie, trinomie."
       }
      ]
     },
     {
      "code": "V1.M05.L05",
      "title": "Equazioni fratte",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L04",
       "V1.M04.L10"
      ],
      "skills": [
       {
        "code": "V1.M05.A05",
        "text": "equazioni fratte con condizioni di esistenza."
       }
      ]
     },
     {
      "code": "V1.M05.L06",
      "title": "Equazioni irrazionali",
      "minutes": 20,
      "prerequisites": [
       "V1.M05.L05"
      ],
      "skills": [
       {
        "code": "V1.M05.A06",
        "text": "equazioni con una o due radici quadrate, con verifica delle soluzioni (le disequazioni arrivano nel modulo dopo: il metodo con le condizioni si riprende in V1.M06.L06)."
       }
      ]
     },
     {
      "code": "V1.M05.L07",
      "title": "Equazioni con valore assoluto",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L05",
       "V1.M02.L07"
      ],
      "skills": [
       {
        "code": "V1.M05.A07",
        "text": "equazioni del tipo |A| = k, |A| = |B|, |A| = B (con verifica)."
       }
      ]
     },
     {
      "code": "V1.M05.L08",
      "title": "Equazioni parametriche e risolubilità",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L03"
      ],
      "skills": [
       {
        "code": "V1.M05.A08",
        "text": "per quali valori del parametro un'equazione ha soluzioni reali, coincidenti, con segni dati."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M06",
    "title": "Disequazioni",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M06.L01",
      "title": "Disequazioni di primo grado",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L01",
       "V1.M03.L09"
      ],
      "skills": [
       {
        "code": "V1.M06.A01",
        "text": "disequazioni di primo grado, soluzione come intervallo."
       }
      ]
     },
     {
      "code": "V1.M06.L02",
      "title": "Disequazioni di secondo grado",
      "minutes": 20,
      "prerequisites": [
       "V1.M06.L01",
       "V1.M05.L03"
      ],
      "skills": [
       {
        "code": "V1.M06.A02",
        "text": "segno di un trinomio di secondo grado nei tre casi del discriminante."
       }
      ]
     },
     {
      "code": "V1.M06.L03",
      "title": "Segno di un prodotto",
      "minutes": 15,
      "prerequisites": [
       "V1.M06.L02"
      ],
      "skills": [
       {
        "code": "V1.M06.A03",
        "text": "disequazioni prodotto e di grado superiore con la tabella dei segni."
       }
      ]
     },
     {
      "code": "V1.M06.L04",
      "title": "Disequazioni fratte",
      "minutes": 19,
      "prerequisites": [
       "V1.M06.L03",
       "V1.M04.L07",
       "V1.M05.L05"
      ],
      "skills": [
       {
        "code": "V1.M06.A04",
        "text": "disequazioni fratte con la tabella dei segni. **Esiste**: `V1.M06.A04.g1`."
       }
      ]
     },
     {
      "code": "V1.M06.L05",
      "title": "Sistemi di disequazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M06.L04"
      ],
      "skills": [
       {
        "code": "V1.M06.A05",
        "text": "sistemi di disequazioni."
       }
      ]
     },
     {
      "code": "V1.M06.L06",
      "title": "Disequazioni irrazionali",
      "minutes": 20,
      "prerequisites": [
       "V1.M06.L05",
       "V1.M05.L06"
      ],
      "skills": [
       {
        "code": "V1.M06.A06",
        "text": "disequazioni con una radice quadrata (i due schemi)."
       }
      ]
     },
     {
      "code": "V1.M06.L07",
      "title": "Disequazioni con valore assoluto",
      "minutes": 15,
      "prerequisites": [
       "V1.M06.L05",
       "V1.M05.L07"
      ],
      "skills": [
       {
        "code": "V1.M06.A07",
        "text": "disequazioni con un valore assoluto."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M07",
    "title": "Sistemi",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M07.L01",
      "title": "Sistemi lineari di due equazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M05.L01"
      ],
      "skills": [
       {
        "code": "V1.M07.A01",
        "text": "sostituzione e riduzione."
       }
      ]
     },
     {
      "code": "V1.M07.L02",
      "title": "Sistemi lineari con un parametro",
      "minutes": 15,
      "prerequisites": [
       "V1.M07.L01"
      ],
      "skills": [
       {
        "code": "V1.M07.A02",
        "text": "classificare un sistema 2×2 (anche con un parametro) dai rapporti dei coefficienti."
       }
      ]
     },
     {
      "code": "V1.M07.L03",
      "title": "Sistemi lineari di tre equazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M07.L01"
      ],
      "skills": [
       {
        "code": "V1.M07.A03",
        "text": "sistemi 3×3 con sostituzione e riduzione."
       }
      ]
     },
     {
      "code": "V1.M07.L04",
      "title": "Piano cartesiano e lettura geometrica",
      "minutes": 15,
      "prerequisites": [
       "V1.M07.L02"
      ],
      "skills": [
       {
        "code": "V1.M07.A04",
        "text": "riconoscere rette incidenti, parallele e coincidenti dal sistema (e viceversa)."
       }
      ]
     },
     {
      "code": "V1.M07.L05",
      "title": "Sistemi di secondo grado",
      "minutes": 20,
      "prerequisites": [
       "V1.M07.L04",
       "V1.M05.L02"
      ],
      "skills": [
       {
        "code": "V1.M07.A05",
        "text": "sistemi con un'equazione di secondo grado e sistemi simmetrici."
       }
      ]
     },
     {
      "code": "V1.M07.L06",
      "title": "Problemi con i sistemi",
      "minutes": 15,
      "prerequisites": [
       "V1.M07.L05"
      ],
      "skills": [
       {
        "code": "V1.M07.A06",
        "text": "tradurre un problema in un sistema e risolverlo."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M08",
    "title": "Funzioni",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M08.L01",
      "title": "Funzioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L02",
       "V1.M07.L04"
      ],
      "skills": [
       {
        "code": "V1.M08.A01",
        "text": "riconoscere una funzione (anche da un grafico) e calcolarne i valori."
       }
      ]
     },
     {
      "code": "V1.M08.L02",
      "title": "Dominio di una funzione reale",
      "minutes": 20,
      "prerequisites": [
       "V1.M08.L01",
       "V1.M06.L06"
      ],
      "skills": [
       {
        "code": "V1.M08.A02",
        "text": "dominio di funzioni con frazioni e radici."
       }
      ]
     },
     {
      "code": "V1.M08.L03",
      "title": "Immagine, iniettività e suriettività",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L01"
      ],
      "skills": [
       {
        "code": "V1.M08.A03",
        "text": "immagine; riconoscere funzioni iniettive, suriettive, biiettive."
       }
      ]
     },
     {
      "code": "V1.M08.L04",
      "title": "Composizione di funzioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L02"
      ],
      "skills": [
       {
        "code": "V1.M08.A04",
        "text": "funzione composta e suo dominio."
       }
      ]
     },
     {
      "code": "V1.M08.L05",
      "title": "Funzione inversa",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L03",
       "V1.M08.L04"
      ],
      "skills": [
       {
        "code": "V1.M08.A05",
        "text": "inversa di una funzione e suo dominio."
       }
      ]
     },
     {
      "code": "V1.M08.L06",
      "title": "Monotonia e parità",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L03"
      ],
      "skills": [
       {
        "code": "V1.M08.A06",
        "text": "riconoscere funzioni monotone, pari, dispari."
       }
      ]
     },
     {
      "code": "V1.M08.L07",
      "title": "Funzioni elementari",
      "minutes": 20,
      "prerequisites": [
       "V1.M08.L06"
      ],
      "skills": [
       {
        "code": "V1.M08.A07",
        "text": "grafici e proprietà di funzioni lineari, potenze, radici, 1/x, valore assoluto."
       }
      ]
     },
     {
      "code": "V1.M08.L08",
      "title": "Trasformazioni dei grafici",
      "minutes": 20,
      "prerequisites": [
       "V1.M08.L07"
      ],
      "skills": [
       {
        "code": "V1.M08.A08",
        "text": "grafico di a·f(b(x − c)) + d a partire da quello di f."
       }
      ]
     },
     {
      "code": "V1.M08.L09",
      "title": "Equazioni e disequazioni con i grafici",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L08",
       "V1.M06.L04"
      ],
      "skills": [
       {
        "code": "V1.M08.A09",
        "text": "risolvere f(x) = g(x) e f(x) > g(x) leggendo i grafici; contare le soluzioni."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M09",
    "title": "Esponenziali e logaritmi",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M09.L01",
      "title": "Funzione esponenziale",
      "minutes": 15,
      "prerequisites": [
       "V1.M08.L07",
       "V1.M03.L06"
      ],
      "skills": [
       {
        "code": "V1.M09.A01",
        "text": "proprietà e grafico di aˣ, confronto tra potenze."
       }
      ]
     },
     {
      "code": "V1.M09.L02",
      "title": "Equazioni esponenziali",
      "minutes": 15,
      "prerequisites": [
       "V1.M09.L01",
       "V1.M05.L04"
      ],
      "skills": [
       {
        "code": "V1.M09.A02",
        "text": "equazioni esponenziali (stessa base, sostituzione)."
       }
      ]
     },
     {
      "code": "V1.M09.L03",
      "title": "Logaritmi",
      "minutes": 15,
      "prerequisites": [
       "V1.M09.L02"
      ],
      "skills": [
       {
        "code": "V1.M09.A03",
        "text": "calcolare logaritmi con la definizione."
       }
      ]
     },
     {
      "code": "V1.M09.L04",
      "title": "Proprietà dei logaritmi",
      "minutes": 15,
      "prerequisites": [
       "V1.M09.L03"
      ],
      "skills": [
       {
        "code": "V1.M09.A04",
        "text": "espressioni con i logaritmi."
       }
      ]
     },
     {
      "code": "V1.M09.L05",
      "title": "Funzione logaritmica",
      "minutes": 15,
      "prerequisites": [
       "V1.M09.L04",
       "V1.M08.L05"
      ],
      "skills": [
       {
        "code": "V1.M09.A05",
        "text": "grafico e dominio di funzioni con logaritmi."
       }
      ]
     },
     {
      "code": "V1.M09.L06",
      "title": "Equazioni logaritmiche",
      "minutes": 15,
      "prerequisites": [
       "V1.M09.L05"
      ],
      "skills": [
       {
        "code": "V1.M09.A06",
        "text": "equazioni logaritmiche con condizioni di esistenza."
       }
      ]
     },
     {
      "code": "V1.M09.L07",
      "title": "Disequazioni esponenziali e logaritmiche",
      "minutes": 20,
      "prerequisites": [
       "V1.M09.L06",
       "V1.M06.L05"
      ],
      "skills": [
       {
        "code": "V1.M09.A07",
        "text": "disequazioni esponenziali e logaritmiche (estremi come `e`, `e²`, `ln 2`: prova della lettura degli insiemi, `STATO.md`)."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M10",
    "title": "Goniometria e trigonometria",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M10.L01",
      "title": "Angoli: gradi e radianti",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L03"
      ],
      "skills": [
       {
        "code": "V1.M10.A01",
        "text": "conversioni tra gradi e radianti (serve il parser dei gradi, vedi in fondo)."
       }
      ]
     },
     {
      "code": "V1.M10.L02",
      "title": "Circonferenza goniometrica, seno e coseno",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L01",
       "V1.M07.L04"
      ],
      "skills": [
       {
        "code": "V1.M10.A02",
        "text": "seno e coseno degli angoli notevoli e segni nei quadranti."
       }
      ]
     },
     {
      "code": "V1.M10.L03",
      "title": "Tangente",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L02"
      ],
      "skills": [
       {
        "code": "V1.M10.A03",
        "text": "tangente degli angoli notevoli; relazioni tra seno, coseno e tangente."
       }
      ]
     },
     {
      "code": "V1.M10.L04",
      "title": "Grafici delle funzioni goniometriche",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L03",
       "V1.M08.L08"
      ],
      "skills": [
       {
        "code": "V1.M10.A04",
        "text": "grafici, periodo e trasformazioni di seno, coseno, tangente."
       }
      ]
     },
     {
      "code": "V1.M10.L05",
      "title": "Funzioni goniometriche inverse",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L04",
       "V1.M08.L05"
      ],
      "skills": [
       {
        "code": "V1.M10.A05",
        "text": "valori di arcoseno, arcocoseno, arcotangente."
       }
      ]
     },
     {
      "code": "V1.M10.L06",
      "title": "Archi associati",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L03"
      ],
      "skills": [
       {
        "code": "V1.M10.A06",
        "text": "ricondurre al primo quadrante (angoli opposti, supplementari, complementari…)."
       }
      ]
     },
     {
      "code": "V1.M10.L07",
      "title": "Formule di addizione e duplicazione",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L06"
      ],
      "skills": [
       {
        "code": "V1.M10.A07",
        "text": "formule di addizione, sottrazione, duplicazione, bisezione."
       }
      ]
     },
     {
      "code": "V1.M10.L08",
      "title": "Identità goniometriche",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L07"
      ],
      "skills": [
       {
        "code": "V1.M10.A08",
        "text": "verificare identità e semplificare espressioni goniometriche."
       }
      ]
     },
     {
      "code": "V1.M10.L09",
      "title": "Equazioni goniometriche elementari",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L05",
       "V1.M10.L06"
      ],
      "skills": [
       {
        "code": "V1.M10.A09",
        "text": "sin x = a, cos x = a, tan x = a, con tutte le soluzioni periodiche."
       }
      ]
     },
     {
      "code": "V1.M10.L10",
      "title": "Altre equazioni goniometriche",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L09",
       "V1.M10.L08"
      ],
      "skills": [
       {
        "code": "V1.M10.A10",
        "text": "equazioni riconducibili a elementari, lineari in seno e coseno, omogenee di secondo grado."
       }
      ]
     },
     {
      "code": "V1.M10.L11",
      "title": "Disequazioni goniometriche",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L10",
       "V1.M06.L04"
      ],
      "skills": [
       {
        "code": "V1.M10.A11",
        "text": "disequazioni goniometriche in un periodo e su ℝ."
       }
      ]
     },
     {
      "code": "V1.M10.L12",
      "title": "Triangoli rettangoli",
      "minutes": 15,
      "prerequisites": [
       "V1.M10.L03"
      ],
      "skills": [
       {
        "code": "V1.M10.A12",
        "text": "risolvere un triangolo rettangolo."
       }
      ]
     },
     {
      "code": "V1.M10.L13",
      "title": "Teoremi dei seni e del coseno",
      "minutes": 20,
      "prerequisites": [
       "V1.M10.L12",
       "V1.M10.L07"
      ],
      "skills": [
       {
        "code": "V1.M10.A13",
        "text": "risolvere un triangolo qualsiasi; area con il seno."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M11",
    "title": "Geometria euclidea",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M11.L01",
      "title": "Segmenti, semirette e angoli",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L07",
       "V1.M10.L01"
      ],
      "skills": [
       {
        "code": "V1.M11.A01",
        "text": "angoli complementari, supplementari, opposti al vertice."
       }
      ]
     },
     {
      "code": "V1.M11.L02",
      "title": "Rette parallele e perpendicolari",
      "minutes": 15,
      "prerequisites": [
       "V1.M11.L01"
      ],
      "skills": [
       {
        "code": "V1.M11.A02",
        "text": "angoli formati da due parallele e una trasversale."
       }
      ]
     },
     {
      "code": "V1.M11.L03",
      "title": "Triangoli e congruenza",
      "minutes": 20,
      "prerequisites": [
       "V1.M11.L02"
      ],
      "skills": [
       {
        "code": "V1.M11.A03",
        "text": "classificare triangoli e usare i criteri di congruenza; punti notevoli."
       }
      ]
     },
     {
      "code": "V1.M11.L04",
      "title": "Teoremi di Pitagora e di Euclide",
      "minutes": 20,
      "prerequisites": [
       "V1.M11.L03",
       "V1.M10.L12"
      ],
      "skills": [
       {
        "code": "V1.M11.A04",
        "text": "lati e altezze di triangoli rettangoli con Pitagora ed Euclide."
       }
      ]
     },
     {
      "code": "V1.M11.L05",
      "title": "Similitudine e teorema di Talete",
      "minutes": 20,
      "prerequisites": [
       "V1.M11.L04"
      ],
      "skills": [
       {
        "code": "V1.M11.A05",
        "text": "lati, aree e volumi di figure simili."
       }
      ]
     },
     {
      "code": "V1.M11.L06",
      "title": "Circonferenza e cerchio",
      "minutes": 20,
      "prerequisites": [
       "V1.M11.L03",
       "V1.M10.L02"
      ],
      "skills": [
       {
        "code": "V1.M11.A06",
        "text": "angoli al centro e alla circonferenza, corde, tangenti."
       }
      ]
     },
     {
      "code": "V1.M11.L07",
      "title": "Poligoni, perimetri e aree",
      "minutes": 20,
      "prerequisites": [
       "V1.M11.L06",
       "V1.M11.L04"
      ],
      "skills": [
       {
        "code": "V1.M11.A07",
        "text": "perimetri e aree di poligoni, cerchio, settore circolare."
       }
      ]
     },
     {
      "code": "V1.M11.L08",
      "title": "Costruzioni con riga e compasso",
      "minutes": 10,
      "prerequisites": [
       "V1.M11.L06"
      ],
      "skills": [
       {
        "code": "V1.M11.A08",
        "text": "riconoscere e ordinare i passi delle costruzioni elementari (asse, bisettrice, perpendicolare, parallela)."
       }
      ]
     },
     {
      "code": "V1.M11.L09",
      "title": "Rette e piani nello spazio",
      "minutes": 15,
      "prerequisites": [
       "V1.M11.L02"
      ],
      "skills": [
       {
        "code": "V1.M11.A09",
        "text": "posizioni reciproche di rette e piani nello spazio."
       }
      ]
     },
     {
      "code": "V1.M11.L10",
      "title": "Poliedri",
      "minutes": 15,
      "prerequisites": [
       "V1.M11.L09",
       "V1.M11.L07"
      ],
      "skills": [
       {
        "code": "V1.M11.A10",
        "text": "superfici e volumi di prismi, parallelepipedi, piramidi."
       }
      ]
     },
     {
      "code": "V1.M11.L11",
      "title": "Solidi di rotazione e sfera",
      "minutes": 15,
      "prerequisites": [
       "V1.M11.L10"
      ],
      "skills": [
       {
        "code": "V1.M11.A11",
        "text": "superfici e volumi di cilindro, cono, sfera."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M12",
    "title": "Geometria analitica",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M12.L01",
      "title": "Punti e distanze",
      "minutes": 15,
      "prerequisites": [
       "V1.M07.L04",
       "V1.M11.L04"
      ],
      "skills": [
       {
        "code": "V1.M12.A01",
        "text": "distanza tra due punti, punto medio, baricentro."
       }
      ]
     },
     {
      "code": "V1.M12.L02",
      "title": "La retta",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L01",
       "V1.M08.L07"
      ],
      "skills": [
       {
        "code": "V1.M12.A02",
        "text": "equazione della retta per due punti o per un punto con coefficiente angolare dato."
       }
      ]
     },
     {
      "code": "V1.M12.L03",
      "title": "Parallelismo, perpendicolarità, distanza punto-retta",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L02"
      ],
      "skills": [
       {
        "code": "V1.M12.A03",
        "text": "rette parallele e perpendicolari, fasci di rette."
       },
       {
        "code": "V1.M12.A04",
        "text": "distanza di un punto da una retta."
       }
      ]
     },
     {
      "code": "V1.M12.L04",
      "title": "Luoghi geometrici",
      "minutes": 15,
      "prerequisites": [
       "V1.M12.L03"
      ],
      "skills": [
       {
        "code": "V1.M12.A05",
        "text": "equazione di un luogo (asse di un segmento, bisettrici, punti a distanza data)."
       }
      ]
     },
     {
      "code": "V1.M12.L05",
      "title": "La circonferenza",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L04"
      ],
      "skills": [
       {
        "code": "V1.M12.A06",
        "text": "equazione, centro e raggio; posizione e tangenti rispetto a una retta."
       }
      ]
     },
     {
      "code": "V1.M12.L06",
      "title": "La parabola",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L05",
       "V1.M06.L02"
      ],
      "skills": [
       {
        "code": "V1.M12.A07",
        "text": "vertice, fuoco, direttrice e asse; parabola e retta."
       }
      ]
     },
     {
      "code": "V1.M12.L07",
      "title": "L'ellisse",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L06"
      ],
      "skills": [
       {
        "code": "V1.M12.A08",
        "text": "semiassi, fuochi, eccentricità dall'equazione canonica."
       }
      ]
     },
     {
      "code": "V1.M12.L08",
      "title": "L'iperbole",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L07"
      ],
      "skills": [
       {
        "code": "V1.M12.A09",
        "text": "vertici, fuochi, asintoti; iperbole equilatera e funzione omografica."
       }
      ]
     },
     {
      "code": "V1.M12.L09",
      "title": "Coniche, equazioni e sistemi",
      "minutes": 15,
      "prerequisites": [
       "V1.M12.L08",
       "V1.M07.L05"
      ],
      "skills": [
       {
        "code": "V1.M12.A10",
        "text": "riconoscere la conica da un'equazione; leggere geometricamente equazioni e sistemi."
       }
      ]
     },
     {
      "code": "V1.M12.L10",
      "title": "Primi passi nello spazio",
      "minutes": 15,
      "prerequisites": [
       "V1.M12.L01",
       "V1.M11.L11"
      ],
      "skills": [
       {
        "code": "V1.M12.A11",
        "text": "distanze nello spazio, equazione della sfera, piani paralleli ai piani coordinati."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M13",
    "title": "Combinatoria e probabilità",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M13.L01",
      "title": "Principio fondamentale del calcolo combinatorio",
      "minutes": 15,
      "prerequisites": [
       "V1.M01.L03"
      ],
      "skills": [
       {
        "code": "V1.M13.A01",
        "text": "conteggi con il principio moltiplicativo e il fattoriale (serve il fattoriale nel parser, vedi in fondo)."
       }
      ]
     },
     {
      "code": "V1.M13.L02",
      "title": "Disposizioni e permutazioni",
      "minutes": 15,
      "prerequisites": [
       "V1.M13.L01"
      ],
      "skills": [
       {
        "code": "V1.M13.A02",
        "text": "disposizioni e permutazioni, semplici e con ripetizione."
       }
      ]
     },
     {
      "code": "V1.M13.L03",
      "title": "Combinazioni",
      "minutes": 20,
      "prerequisites": [
       "V1.M13.L02"
      ],
      "skills": [
       {
        "code": "V1.M13.A03",
        "text": "combinazioni; scegliere tra disposizioni e combinazioni."
       }
      ]
     },
     {
      "code": "V1.M13.L04",
      "title": "Eventi e probabilità classica",
      "minutes": 15,
      "prerequisites": [
       "V1.M13.L03"
      ],
      "skills": [
       {
        "code": "V1.M13.A04",
        "text": "probabilità come casi favorevoli su casi possibili, con i conteggi."
       }
      ]
     },
     {
      "code": "V1.M13.L05",
      "title": "Evento contrario e unione di eventi",
      "minutes": 15,
      "prerequisites": [
       "V1.M13.L04"
      ],
      "skills": [
       {
        "code": "V1.M13.A05",
        "text": "probabilità del contrario e dell'unione."
       }
      ]
     },
     {
      "code": "V1.M13.L06",
      "title": "Probabilità condizionata ed eventi indipendenti",
      "minutes": 20,
      "prerequisites": [
       "V1.M13.L05"
      ],
      "skills": [
       {
        "code": "V1.M13.A06",
        "text": "probabilità condizionata e dell'intersezione."
       }
      ]
     },
     {
      "code": "V1.M13.L07",
      "title": "Probabilità totale e prove ripetute",
      "minutes": 20,
      "prerequisites": [
       "V1.M13.L06"
      ],
      "skills": [
       {
        "code": "V1.M13.A07",
        "text": "probabilità totale, formula di Bayes, schema di Bernoulli."
       }
      ]
     }
    ]
   },
   {
    "code": "V1.M14",
    "title": "Statistica",
    "approved": true,
    "lessons": [
     {
      "code": "V1.M14.L01",
      "title": "Dati e frequenze",
      "minutes": 15,
      "prerequisites": [
       "V1.M03.L08"
      ],
      "skills": [
       {
        "code": "V1.M14.A01",
        "text": "frequenze assolute, relative, percentuali e cumulate."
       }
      ]
     },
     {
      "code": "V1.M14.L02",
      "title": "Diagrammi e istogrammi",
      "minutes": 15,
      "prerequisites": [
       "V1.M14.L01"
      ],
      "skills": [
       {
        "code": "V1.M14.A02",
        "text": "leggere e costruire diagrammi a barre, a torta, istogrammi (anche con classi di ampiezza diversa)."
       }
      ]
     },
     {
      "code": "V1.M14.L03",
      "title": "Media, moda e mediana",
      "minutes": 15,
      "prerequisites": [
       "V1.M14.L01"
      ],
      "skills": [
       {
        "code": "V1.M14.A03",
        "text": "media semplice e ponderata, moda, mediana."
       }
      ]
     },
     {
      "code": "V1.M14.L04",
      "title": "Varianza e deviazione standard",
      "minutes": 15,
      "prerequisites": [
       "V1.M14.L03"
      ],
      "skills": [
       {
        "code": "V1.M14.A04",
        "text": "varianza, deviazione standard, campo di variazione."
       }
      ]
     },
     {
      "code": "V1.M14.L05",
      "title": "Come cambiano gli indici",
      "minutes": 15,
      "prerequisites": [
       "V1.M14.L04",
       "V1.M14.L02"
      ],
      "skills": [
       {
        "code": "V1.M14.A05",
        "text": "effetto su media, mediana e varianza di aggiungere, togliere o trasformare dati (quesiti di tipo TOL)."
       }
      ]
     }
    ]
   }
  ]
 },
 {
  "code": "V2",
  "title": "Analisi 1",
  "modules": [
   {
    "code": "V2.M01",
    "title": "Numeri reali e induzione",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M01.L01",
      "title": "Maggioranti, minoranti, massimo e minimo",
      "minutes": 15,
      "prerequisites": [
       "V1.M02.L07",
       "V1.M01.L06"
      ],
      "skills": [
       {
        "code": "V2.M01.A01",
        "text": "maggioranti, minoranti, massimo e minimo di un insieme dato."
       }
      ]
     },
     {
      "code": "V2.M01.L02",
      "title": "Estremo superiore e completezza",
      "minutes": 20,
      "prerequisites": [
       "V2.M01.L01"
      ],
      "skills": [
       {
        "code": "V2.M01.A02",
        "text": "estremo superiore e inferiore (anche di insiemi come {1 − 1/n}), dire se sono massimo o minimo."
       }
      ]
     },
     {
      "code": "V2.M01.L03",
      "title": "Conseguenze della completezza",
      "minutes": 15,
      "prerequisites": [
       "V2.M01.L02"
      ],
      "skills": [
       {
        "code": "V2.M01.A03",
        "text": "vero o falso su estremi, proprietà di Archimede, densità."
       }
      ]
     },
     {
      "code": "V2.M01.L04",
      "title": "Principio di induzione",
      "minutes": 20,
      "prerequisites": [
       "V2.M01.L01"
      ],
      "skills": [
       {
        "code": "V2.M01.A04",
        "text": "completare e riordinare dimostrazioni per induzione; formule con le sommatorie."
       }
      ]
     },
     {
      "code": "V2.M01.L05",
      "title": "Binomio di Newton",
      "minutes": 15,
      "prerequisites": [
       "V2.M01.L04",
       "V1.M13.L03"
      ],
      "skills": [
       {
        "code": "V2.M01.A05",
        "text": "sviluppo di (a + b)ⁿ e coefficiente di un termine dato."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M02",
    "title": "Numeri complessi",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M02.L01",
      "title": "Forma algebrica",
      "minutes": 20,
      "prerequisites": [
       "V1.M05.L02",
       "V1.M07.L04"
      ],
      "skills": [
       {
        "code": "V2.M02.A01",
        "text": "operazioni in forma algebrica, quoziente compreso."
       }
      ]
     },
     {
      "code": "V2.M02.L02",
      "title": "Forma trigonometrica",
      "minutes": 20,
      "prerequisites": [
       "V2.M02.L01",
       "V1.M10.L05"
      ],
      "skills": [
       {
        "code": "V2.M02.A02",
        "text": "passare dalla forma algebrica alla trigonometrica e viceversa."
       }
      ]
     },
     {
      "code": "V2.M02.L03",
      "title": "Formula di De Moivre e forma esponenziale",
      "minutes": 15,
      "prerequisites": [
       "V2.M02.L02",
       "V2.M01.L04"
      ],
      "skills": [
       {
        "code": "V2.M02.A03",
        "text": "potenze di numeri complessi; passaggio alla forma esponenziale."
       }
      ]
     },
     {
      "code": "V2.M02.L04",
      "title": "Radici n-esime",
      "minutes": 20,
      "prerequisites": [
       "V2.M02.L03"
      ],
      "skills": [
       {
        "code": "V2.M02.A04",
        "text": "radici n-esime in forma trigonometrica e, quando si può, algebrica."
       }
      ]
     },
     {
      "code": "V2.M02.L05",
      "title": "Equazioni in campo complesso",
      "minutes": 15,
      "prerequisites": [
       "V2.M02.L04"
      ],
      "skills": [
       {
        "code": "V2.M02.A05",
        "text": "equazioni di secondo grado e binomie in ℂ."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M03",
    "title": "Successioni",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M03.L01",
      "title": "Successioni e limite",
      "minutes": 20,
      "prerequisites": [
       "V2.M01.L02",
       "V1.M08.L01"
      ],
      "skills": [
       {
        "code": "V2.M03.A02",
        "text": "verificare un limite con la definizione (da quale indice in poi |aₙ − ℓ| < ε)."
       }
      ]
     },
     {
      "code": "V2.M03.L02",
      "title": "Calcolo dei limiti di successioni",
      "minutes": 20,
      "prerequisites": [
       "V2.M03.L01"
      ],
      "skills": [
       {
        "code": "V2.M03.A01",
        "text": "limiti di successioni (forme indeterminate, gerarchia degli infiniti, fattori oscillanti, forma 1^∞). **Esiste**: `V2.M03.A01.g1`."
       }
      ]
     },
     {
      "code": "V2.M03.L03",
      "title": "Teoremi del confronto",
      "minutes": 15,
      "prerequisites": [
       "V2.M03.L02"
      ],
      "skills": [
       {
        "code": "V2.M03.A03",
        "text": "limiti con il teorema dei carabinieri e con il confronto."
       }
      ]
     },
     {
      "code": "V2.M03.L04",
      "title": "Successioni monotone",
      "minutes": 15,
      "prerequisites": [
       "V2.M03.L03"
      ],
      "skills": [
       {
        "code": "V2.M03.A04",
        "text": "studiare la monotonia di una successione e dedurne il limite."
       }
      ]
     },
     {
      "code": "V2.M03.L05",
      "title": "Il numero e",
      "minutes": 15,
      "prerequisites": [
       "V2.M03.L04",
       "V2.M01.L05"
      ],
      "skills": [
       {
        "code": "V2.M03.A05",
        "text": "limiti della forma 1^∞ con (1 + a/n)ⁿ."
       }
      ]
     },
     {
      "code": "V2.M03.L06",
      "title": "Sottosuccessioni",
      "minutes": 15,
      "prerequisites": [
       "V2.M03.L04"
      ],
      "skills": [
       {
        "code": "V2.M03.A06",
        "text": "mostrare che un limite non esiste con due sottosuccessioni."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M04",
    "title": "Limiti di funzioni",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M04.L01",
      "title": "Definizione di limite",
      "minutes": 20,
      "prerequisites": [
       "V2.M03.L03",
       "V1.M08.L02"
      ],
      "skills": [
       {
        "code": "V2.M04.A02",
        "text": "limiti, anche destro e sinistro, letti da un grafico e verificati con la definizione."
       }
      ]
     },
     {
      "code": "V2.M04.L02",
      "title": "Teoremi sui limiti",
      "minutes": 20,
      "prerequisites": [
       "V2.M04.L01"
      ],
      "skills": [
       {
        "code": "V2.M04.A03",
        "text": "limiti con il teorema del confronto (funzione limitata per infinitesima)."
       }
      ]
     },
     {
      "code": "V2.M04.L03",
      "title": "Limiti notevoli e forme indeterminate",
      "minutes": 20,
      "prerequisites": [
       "V2.M04.L02",
       "V1.M09.L05",
       "V1.M10.L04"
      ],
      "skills": [
       {
        "code": "V2.M04.A01",
        "text": "limiti notevoli e forme indeterminate, anche con limiti laterali. **Esiste**: `V2.M04.A01.g1`."
       }
      ]
     },
     {
      "code": "V2.M04.L04",
      "title": "Asintoti",
      "minutes": 15,
      "prerequisites": [
       "V2.M04.L03"
      ],
      "skills": [
       {
        "code": "V2.M04.A04",
        "text": "asintoti verticali, orizzontali e obliqui."
       }
      ]
     },
     {
      "code": "V2.M04.L05",
      "title": "Infinitesimi, infiniti e o-piccolo",
      "minutes": 20,
      "prerequisites": [
       "V2.M04.L03"
      ],
      "skills": [
       {
        "code": "V2.M04.A05",
        "text": "ordine di infinitesimo e di infinito; semplificare con gli o-piccolo."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M05",
    "title": "Continuità",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M05.L01",
      "title": "Funzioni continue",
      "minutes": 15,
      "prerequisites": [
       "V2.M04.L03"
      ],
      "skills": [
       {
        "code": "V2.M05.A01",
        "text": "continuità in un punto, anche al variare di un parametro."
       }
      ]
     },
     {
      "code": "V2.M05.L02",
      "title": "Punti di discontinuità",
      "minutes": 15,
      "prerequisites": [
       "V2.M05.L01"
      ],
      "skills": [
       {
        "code": "V2.M05.A02",
        "text": "classificare i punti di discontinuità."
       }
      ]
     },
     {
      "code": "V2.M05.L03",
      "title": "Teorema degli zeri",
      "minutes": 15,
      "prerequisites": [
       "V2.M05.L02",
       "V2.M03.L04"
      ],
      "skills": [
       {
        "code": "V2.M05.A03",
        "text": "esistenza di zeri in un intervallo; passi del metodo di bisezione."
       }
      ]
     },
     {
      "code": "V2.M05.L04",
      "title": "Teorema di Weierstrass",
      "minutes": 15,
      "prerequisites": [
       "V2.M05.L03",
       "V2.M03.L06"
      ],
      "skills": [
       {
        "code": "V2.M05.A04",
        "text": "dire se il teorema si applica; massimo e minimo assoluti."
       }
      ]
     },
     {
      "code": "V2.M05.L05",
      "title": "Valori intermedi e funzioni inverse",
      "minutes": 15,
      "prerequisites": [
       "V2.M05.L04"
      ],
      "skills": [
       {
        "code": "V2.M05.A05",
        "text": "immagine di una funzione continua su un intervallo."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M06",
    "title": "Derivate",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M06.L01",
      "title": "Derivata: definizione e significato geometrico",
      "minutes": 20,
      "prerequisites": [
       "V2.M05.L01",
       "V1.M12.L03"
      ],
      "skills": [
       {
        "code": "V2.M06.A01",
        "text": "derivata con il rapporto incrementale; retta tangente in un punto."
       }
      ]
     },
     {
      "code": "V2.M06.L02",
      "title": "Derivate delle funzioni elementari",
      "minutes": 15,
      "prerequisites": [
       "V2.M06.L01",
       "V2.M04.L03"
      ],
      "skills": [
       {
        "code": "V2.M06.A02",
        "text": "derivate fondamentali e linearità."
       }
      ]
     },
     {
      "code": "V2.M06.L03",
      "title": "Regole di derivazione",
      "minutes": 20,
      "prerequisites": [
       "V2.M06.L02"
      ],
      "skills": [
       {
        "code": "V2.M06.A03",
        "text": "derivate con prodotto, quoziente e funzione composta. **Esiste**: `V2.M06.A03.g1`."
       }
      ]
     },
     {
      "code": "V2.M06.L04",
      "title": "Derivata dell'inversa e derivate successive",
      "minutes": 15,
      "prerequisites": [
       "V2.M06.L03",
       "V2.M05.L05",
       "V1.M10.L05"
      ],
      "skills": [
       {
        "code": "V2.M06.A04",
        "text": "derivate di arcoseno, arcotangente, aˣ, logₐ x; derivate seconde."
       }
      ]
     },
     {
      "code": "V2.M06.L05",
      "title": "Punti di non derivabilità",
      "minutes": 15,
      "prerequisites": [
       "V2.M06.L03"
      ],
      "skills": [
       {
        "code": "V2.M06.A05",
        "text": "punti angolosi, cuspidi, flessi a tangente verticale."
       }
      ]
     },
     {
      "code": "V2.M06.L06",
      "title": "Teoremi di Fermat e di Rolle",
      "minutes": 15,
      "prerequisites": [
       "V2.M06.L05",
       "V2.M05.L04"
      ],
      "skills": [
       {
        "code": "V2.M06.A06",
        "text": "verificare le ipotesi di Rolle e trovare il punto."
       }
      ]
     },
     {
      "code": "V2.M06.L07",
      "title": "Teorema di Lagrange e conseguenze",
      "minutes": 20,
      "prerequisites": [
       "V2.M06.L06"
      ],
      "skills": [
       {
        "code": "V2.M06.A07",
        "text": "punto di Lagrange; monotonia dal segno della derivata."
       }
      ]
     },
     {
      "code": "V2.M06.L08",
      "title": "Teorema di Cauchy e regola di de l'Hôpital",
      "minutes": 20,
      "prerequisites": [
       "V2.M06.L07"
      ],
      "skills": [
       {
        "code": "V2.M06.A08",
        "text": "limiti con de l'Hôpital, controllando le ipotesi."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M07",
    "title": "Studio di funzione",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M07.L01",
      "title": "Massimi e minimi relativi",
      "minutes": 15,
      "prerequisites": [
       "V2.M06.L07"
      ],
      "skills": [
       {
        "code": "V2.M07.A01",
        "text": "estremi relativi dal segno della derivata prima."
       }
      ]
     },
     {
      "code": "V2.M07.L02",
      "title": "Massimi e minimi assoluti, ottimizzazione",
      "minutes": 20,
      "prerequisites": [
       "V2.M07.L01"
      ],
      "skills": [
       {
        "code": "V2.M07.A02",
        "text": "massimo e minimo assoluti su un intervallo chiuso."
       },
       {
        "code": "V2.M07.A03",
        "text": "problemi di ottimizzazione."
       }
      ]
     },
     {
      "code": "V2.M07.L03",
      "title": "Convessità e flessi",
      "minutes": 20,
      "prerequisites": [
       "V2.M07.L02",
       "V2.M06.L04"
      ],
      "skills": [
       {
        "code": "V2.M07.A04",
        "text": "intervalli di convessità e punti di flesso."
       }
      ]
     },
     {
      "code": "V2.M07.L04",
      "title": "Studio completo di una funzione",
      "minutes": 20,
      "prerequisites": [
       "V2.M07.L03",
       "V2.M04.L04"
      ],
      "skills": [
       {
        "code": "V2.M07.A05",
        "text": "studio di funzioni razionali e irrazionali, dal dominio al grafico (servono i grafici statici del motore)."
       }
      ]
     },
     {
      "code": "V2.M07.L05",
      "title": "Studio di funzioni trascendenti",
      "minutes": 20,
      "prerequisites": [
       "V2.M07.L04"
      ],
      "skills": [
       {
        "code": "V2.M07.A06",
        "text": "studio con esponenziali, logaritmi e valori assoluti."
       }
      ]
     },
     {
      "code": "V2.M07.L06",
      "title": "Quante soluzioni ha un'equazione",
      "minutes": 15,
      "prerequisites": [
       "V2.M07.L05"
      ],
      "skills": [
       {
        "code": "V2.M07.A07",
        "text": "numero di soluzioni di f(x) = k al variare di k."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M08",
    "title": "Formula di Taylor",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M08.L01",
      "title": "Polinomio di Taylor e resto di Peano",
      "minutes": 20,
      "prerequisites": [
       "V2.M06.L08",
       "V2.M04.L05"
      ],
      "skills": [
       {
        "code": "V2.M08.A02",
        "text": "polinomio di Taylor dalle derivate in un punto."
       }
      ]
     },
     {
      "code": "V2.M08.L02",
      "title": "Sviluppi notevoli",
      "minutes": 20,
      "prerequisites": [
       "V2.M08.L01"
      ],
      "skills": [
       {
        "code": "V2.M08.A03",
        "text": "sviluppi di funzioni composte e di prodotti fino a un ordine dato."
       }
      ]
     },
     {
      "code": "V2.M08.L03",
      "title": "Sviluppi di Taylor nel calcolo dei limiti",
      "minutes": 20,
      "prerequisites": [
       "V2.M08.L02"
      ],
      "skills": [
       {
        "code": "V2.M08.A01",
        "text": "limiti con gli sviluppi, anche di prodotti. **Esiste**: `V2.M08.A01.g1`."
       }
      ]
     },
     {
      "code": "V2.M08.L04",
      "title": "Resto di Lagrange e approssimazioni",
      "minutes": 15,
      "prerequisites": [
       "V2.M08.L02",
       "V2.M06.L08"
      ],
      "skills": [
       {
        "code": "V2.M08.A04",
        "text": "stimare l'errore di un'approssimazione."
       }
      ]
     },
     {
      "code": "V2.M08.L05",
      "title": "Taylor e studio locale",
      "minutes": 15,
      "prerequisites": [
       "V2.M08.L03",
       "V2.M07.L03"
      ],
      "skills": [
       {
        "code": "V2.M08.A05",
        "text": "natura di un punto stazionario con le derivate successive."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M09",
    "title": "Integrali",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M09.L01",
      "title": "Integrale di Riemann",
      "minutes": 20,
      "prerequisites": [
       "V2.M01.L02",
       "V2.M05.L04"
      ],
      "skills": [
       {
        "code": "V2.M09.A03",
        "text": "somme inferiori e superiori di funzioni semplici; integrali da aree note."
       }
      ]
     },
     {
      "code": "V2.M09.L02",
      "title": "Proprietà dell'integrale e teorema della media",
      "minutes": 15,
      "prerequisites": [
       "V2.M09.L01"
      ],
      "skills": [
       {
        "code": "V2.M09.A04",
        "text": "valor medio di una funzione su un intervallo."
       }
      ]
     },
     {
      "code": "V2.M09.L03",
      "title": "Funzione integrale e teorema fondamentale",
      "minutes": 20,
      "prerequisites": [
       "V2.M09.L02",
       "V2.M06.L07"
      ],
      "skills": [
       {
        "code": "V2.M09.A05",
        "text": "derivata di una funzione integrale, anche con estremi variabili."
       }
      ]
     },
     {
      "code": "V2.M09.L04",
      "title": "Integrali indefiniti e integrali immediati",
      "minutes": 15,
      "prerequisites": [
       "V2.M09.L03"
      ],
      "skills": [
       {
        "code": "V2.M09.A06",
        "text": "primitive immediate e di f(ax + b)."
       }
      ]
     },
     {
      "code": "V2.M09.L05",
      "title": "Integrazione per sostituzione",
      "minutes": 15,
      "prerequisites": [
       "V2.M09.L04"
      ],
      "skills": [
       {
        "code": "V2.M09.A07",
        "text": "integrali per sostituzione."
       }
      ]
     },
     {
      "code": "V2.M09.L06",
      "title": "Integrazione per parti",
      "minutes": 15,
      "prerequisites": [
       "V2.M09.L04"
      ],
      "skills": [
       {
        "code": "V2.M09.A08",
        "text": "integrali per parti, anche ripetute e cicliche."
       }
      ]
     },
     {
      "code": "V2.M09.L07",
      "title": "Integrazione delle funzioni razionali",
      "minutes": 20,
      "prerequisites": [
       "V2.M09.L05",
       "V2.M09.L06",
       "V1.M04.L07"
      ],
      "skills": [
       {
        "code": "V2.M09.A01",
        "text": "integrali indefiniti con tutte le tecniche (fratti semplici, divisione, parti ripetute). **Esiste**: `V2.M09.A01.g1` (rimando già qui)."
       }
      ]
     },
     {
      "code": "V2.M09.L08",
      "title": "Integrali definiti e aree",
      "minutes": 20,
      "prerequisites": [
       "V2.M09.L07"
      ],
      "skills": [
       {
        "code": "V2.M09.A02",
        "text": "integrali definiti, anche con cambio degli estremi. **Esiste**: `V2.M09.A02.g1` (rimando già qui)."
       },
       {
        "code": "V2.M09.A09",
        "text": "area della regione tra due curve."
       }
      ]
     },
     {
      "code": "V2.M09.L09",
      "title": "Studio della funzione integrale",
      "minutes": 15,
      "prerequisites": [
       "V2.M09.L08",
       "V2.M07.L04"
      ],
      "skills": [
       {
        "code": "V2.M09.A10",
        "text": "dominio, monotonia e limiti di una funzione integrale."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M10",
    "title": "Integrali impropri",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M10.L01",
      "title": "Integrali impropri",
      "minutes": 20,
      "prerequisites": [
       "V2.M09.L08",
       "V2.M04.L03"
      ],
      "skills": [
       {
        "code": "V2.M10.A02",
        "text": "integrali impropri calcolati con la definizione."
       }
      ]
     },
     {
      "code": "V2.M10.L02",
      "title": "Criteri di convergenza",
      "minutes": 20,
      "prerequisites": [
       "V2.M10.L01",
       "V2.M04.L05"
      ],
      "skills": [
       {
        "code": "V2.M10.A01",
        "text": "convergenza con il criterio giusto. **Esiste**: `V2.M10.A01.g1`."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M11",
    "title": "Serie numeriche",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M11.L01",
      "title": "Serie numeriche",
      "minutes": 20,
      "prerequisites": [
       "V2.M03.L02"
      ],
      "skills": [
       {
        "code": "V2.M11.A02",
        "text": "somma di serie geometriche e telescopiche."
       }
      ]
     },
     {
      "code": "V2.M11.L02",
      "title": "Serie a termini positivi e confronto",
      "minutes": 20,
      "prerequisites": [
       "V2.M11.L01",
       "V2.M03.L04"
      ],
      "skills": [
       {
        "code": "V2.M11.A03",
        "text": "confronto e confronto asintotico."
       }
      ]
     },
     {
      "code": "V2.M11.L03",
      "title": "Criterio dell'integrale",
      "minutes": 15,
      "prerequisites": [
       "V2.M11.L02",
       "V2.M10.L02"
      ],
      "skills": [
       {
        "code": "V2.M11.A04",
        "text": "serie armonica generalizzata e serie con logaritmi."
       }
      ]
     },
     {
      "code": "V2.M11.L04",
      "title": "Criteri del rapporto e della radice",
      "minutes": 15,
      "prerequisites": [
       "V2.M11.L02"
      ],
      "skills": [
       {
        "code": "V2.M11.A05",
        "text": "serie con potenze, esponenziali e fattoriali (serve il fattoriale nel motore)."
       }
      ]
     },
     {
      "code": "V2.M11.L05",
      "title": "Serie a segni alterni e convergenza assoluta",
      "minutes": 20,
      "prerequisites": [
       "V2.M11.L03",
       "V2.M11.L04"
      ],
      "skills": [
       {
        "code": "V2.M11.A01",
        "text": "verdetto di convergenza con il criterio giusto. **Esiste**: `V2.M11.A01.g1` (rimando già qui)."
       }
      ]
     },
     {
      "code": "V2.M11.L06",
      "title": "Serie di potenze (varia)",
      "minutes": 20,
      "prerequisites": [
       "V2.M11.L05"
      ],
      "skills": [
       {
        "code": "V2.M11.A06",
        "text": "raggio e intervallo di convergenza."
       }
      ]
     }
    ]
   },
   {
    "code": "V2.M12",
    "title": "Equazioni differenziali",
    "approved": false,
    "lessons": [
     {
      "code": "V2.M12.L01",
      "title": "Equazioni differenziali e variabili separabili",
      "minutes": 20,
      "prerequisites": [
       "V2.M09.L07"
      ],
      "skills": [
       {
        "code": "V2.M12.A03",
        "text": "dire se una funzione data risolve un'equazione o un problema di Cauchy."
       }
      ]
     },
     {
      "code": "V2.M12.L02",
      "title": "Equazioni lineari del primo ordine",
      "minutes": 20,
      "prerequisites": [
       "V2.M12.L01"
      ],
      "skills": [
       {
        "code": "V2.M12.A01",
        "text": "equazioni del primo ordine (separabili e lineari) e problemi di Cauchy. **Esiste**: `V2.M12.A01.g1`."
       }
      ]
     },
     {
      "code": "V2.M12.L03",
      "title": "Lineari del secondo ordine omogenee",
      "minutes": 20,
      "prerequisites": [
       "V2.M12.L02",
       "V2.M02.L03"
      ],
      "skills": [
       {
        "code": "V2.M12.A04",
        "text": "equazioni omogenee nei tre casi del discriminante."
       }
      ]
     },
     {
      "code": "V2.M12.L04",
      "title": "Lineari del secondo ordine complete",
      "minutes": 20,
      "prerequisites": [
       "V2.M12.L03"
      ],
      "skills": [
       {
        "code": "V2.M12.A02",
        "text": "equazioni complete (somiglianza, risonanza) e problemi di Cauchy. **Esiste**: `V2.M12.A02.g1`."
       }
      ]
     }
    ]
   }
  ]
 },
 {
  "code": "V3",
  "title": "Geometria e Algebra Lineare",
  "modules": [
   {
    "code": "V3.M01",
    "title": "Vettori geometrici",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M01.L01",
      "title": "Vettori e operazioni",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L10",
       "V1.M10.L03"
      ],
      "skills": [
       {
        "code": "V3.M01.A01",
        "text": "somma, differenza, prodotto per uno scalare, in componenti nel piano e nello spazio."
       }
      ]
     },
     {
      "code": "V3.M01.L02",
      "title": "Prodotto scalare",
      "minutes": 15,
      "prerequisites": [
       "V3.M01.L01",
       "V1.M10.L13"
      ],
      "skills": [
       {
        "code": "V3.M01.A02",
        "text": "prodotto scalare, angolo tra vettori, ortogonalità, proiezione."
       }
      ]
     },
     {
      "code": "V3.M01.L03",
      "title": "Prodotto vettoriale",
      "minutes": 20,
      "prerequisites": [
       "V3.M01.L02"
      ],
      "skills": [
       {
        "code": "V3.M01.A03",
        "text": "prodotto vettoriale in componenti; area di un parallelogramma e di un triangolo."
       }
      ]
     },
     {
      "code": "V3.M01.L04",
      "title": "Prodotto misto",
      "minutes": 15,
      "prerequisites": [
       "V3.M01.L03"
      ],
      "skills": [
       {
        "code": "V3.M01.A04",
        "text": "volume di un parallelepipedo; vettori complanari."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M02",
    "title": "Sistemi lineari e matrici",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M02.L01",
      "title": "Sistemi lineari e metodo di Gauss",
      "minutes": 20,
      "prerequisites": [
       "V1.M07.L03"
      ],
      "skills": [
       {
        "code": "V3.M02.A01",
        "text": "risolvere un sistema con la riduzione a scala. **Esiste**: `V3.M02.A01.g1`."
       }
      ]
     },
     {
      "code": "V3.M02.L02",
      "title": "Sistemi con infinite soluzioni o impossibili",
      "minutes": 15,
      "prerequisites": [
       "V3.M02.L01"
      ],
      "skills": [
       {
        "code": "V3.M02.A02",
        "text": "soluzioni in forma parametrica di un sistema a scala; riconoscere i sistemi impossibili."
       }
      ]
     },
     {
      "code": "V3.M02.L03",
      "title": "Operazioni tra matrici",
      "minutes": 15,
      "prerequisites": [
       "V3.M02.L01"
      ],
      "skills": [
       {
        "code": "V3.M02.A03",
        "text": "somma, prodotto per uno scalare, trasposta."
       }
      ]
     },
     {
      "code": "V3.M02.L04",
      "title": "Prodotto righe per colonne",
      "minutes": 20,
      "prerequisites": [
       "V3.M02.L03"
      ],
      "skills": [
       {
        "code": "V3.M02.A04",
        "text": "prodotto tra matrici e tra matrice e vettore."
       }
      ]
     },
     {
      "code": "V3.M02.L05",
      "title": "Rango di una matrice",
      "minutes": 15,
      "prerequisites": [
       "V3.M02.L02",
       "V3.M02.L04"
      ],
      "skills": [
       {
        "code": "V3.M02.A05",
        "text": "rango con la riduzione a scala."
       }
      ]
     },
     {
      "code": "V3.M02.L06",
      "title": "Teorema di Rouché-Capelli",
      "minutes": 20,
      "prerequisites": [
       "V3.M02.L05"
      ],
      "skills": [
       {
        "code": "V3.M02.A06",
        "text": "discutere un sistema al variare di un parametro."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M03",
    "title": "Determinanti e matrice inversa",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M03.L01",
      "title": "Determinante e sviluppo di Laplace",
      "minutes": 20,
      "prerequisites": [
       "V3.M02.L04"
      ],
      "skills": [
       {
        "code": "V3.M03.A01",
        "text": "determinante di ordine 2, 3 e 4 (sviluppo lungo la linea con più zeri). **Esiste**: `V3.M03.A01.g1`."
       }
      ]
     },
     {
      "code": "V3.M03.L02",
      "title": "Proprietà del determinante",
      "minutes": 20,
      "prerequisites": [
       "V3.M03.L01"
      ],
      "skills": [
       {
        "code": "V3.M03.A02",
        "text": "determinante con le operazioni sulle righe; matrici triangolari; det(kA)."
       }
      ]
     },
     {
      "code": "V3.M03.L03",
      "title": "Matrice inversa",
      "minutes": 20,
      "prerequisites": [
       "V3.M03.L02"
      ],
      "skills": [
       {
        "code": "V3.M03.A03",
        "text": "inversa di matrici 2×2 e 3×3 (con i complementi algebrici e con Gauss-Jordan)."
       }
      ]
     },
     {
      "code": "V3.M03.L04",
      "title": "Regola di Cramer",
      "minutes": 15,
      "prerequisites": [
       "V3.M03.L03",
       "V3.M02.L06"
      ],
      "skills": [
       {
        "code": "V3.M03.A04",
        "text": "risolvere un sistema con la regola di Cramer."
       }
      ]
     },
     {
      "code": "V3.M03.L05",
      "title": "Rango con i minori",
      "minutes": 15,
      "prerequisites": [
       "V3.M03.L04"
      ],
      "skills": [
       {
        "code": "V3.M03.A05",
        "text": "rango con il metodo degli orlati, anche con un parametro."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M04",
    "title": "Spazi vettoriali",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M04.L01",
      "title": "Spazi vettoriali",
      "minutes": 20,
      "prerequisites": [
       "V3.M02.L04",
       "V3.M01.L01"
      ],
      "skills": [
       {
        "code": "V3.M04.A01",
        "text": "riconoscere se un insieme con due operazioni è uno spazio vettoriale."
       }
      ]
     },
     {
      "code": "V3.M04.L02",
      "title": "Sottospazi",
      "minutes": 15,
      "prerequisites": [
       "V3.M04.L01"
      ],
      "skills": [
       {
        "code": "V3.M04.A02",
        "text": "riconoscere i sottospazi (anche di polinomi e matrici)."
       }
      ]
     },
     {
      "code": "V3.M04.L03",
      "title": "Combinazioni lineari e generatori",
      "minutes": 15,
      "prerequisites": [
       "V3.M04.L02",
       "V3.M02.L06"
      ],
      "skills": [
       {
        "code": "V3.M04.A03",
        "text": "dire se un vettore è combinazione lineare di altri; sistemi di generatori."
       }
      ]
     },
     {
      "code": "V3.M04.L04",
      "title": "Indipendenza lineare",
      "minutes": 20,
      "prerequisites": [
       "V3.M04.L03",
       "V3.M02.L05"
      ],
      "skills": [
       {
        "code": "V3.M04.A04",
        "text": "indipendenza lineare con il rango."
       }
      ]
     },
     {
      "code": "V3.M04.L05",
      "title": "Basi e dimensione",
      "minutes": 20,
      "prerequisites": [
       "V3.M04.L04"
      ],
      "skills": [
       {
        "code": "V3.M04.A05",
        "text": "base e dimensione di un sottospazio dato con generatori o con equazioni."
       }
      ]
     },
     {
      "code": "V3.M04.L06",
      "title": "Coordinate",
      "minutes": 15,
      "prerequisites": [
       "V3.M04.L05"
      ],
      "skills": [
       {
        "code": "V3.M04.A06",
        "text": "coordinate di un vettore rispetto a una base."
       }
      ]
     },
     {
      "code": "V3.M04.L07",
      "title": "Somma di sottospazi e formula di Grassmann",
      "minutes": 20,
      "prerequisites": [
       "V3.M04.L05"
      ],
      "skills": [
       {
        "code": "V3.M04.A07",
        "text": "dimensione di somma e intersezione; somma diretta."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M05",
    "title": "Applicazioni lineari",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M05.L01",
      "title": "Applicazioni lineari",
      "minutes": 15,
      "prerequisites": [
       "V3.M04.L06",
       "V1.M08.L03"
      ],
      "skills": [
       {
        "code": "V3.M05.A01",
        "text": "riconoscere un'applicazione lineare."
       }
      ]
     },
     {
      "code": "V3.M05.L02",
      "title": "Matrice associata",
      "minutes": 20,
      "prerequisites": [
       "V3.M05.L01"
      ],
      "skills": [
       {
        "code": "V3.M05.A02",
        "text": "matrice associata nelle basi canoniche e in basi date."
       }
      ]
     },
     {
      "code": "V3.M05.L03",
      "title": "Nucleo e immagine",
      "minutes": 20,
      "prerequisites": [
       "V3.M05.L02"
      ],
      "skills": [
       {
        "code": "V3.M05.A03",
        "text": "basi di nucleo e immagine."
       }
      ]
     },
     {
      "code": "V3.M05.L04",
      "title": "Teorema della dimensione",
      "minutes": 15,
      "prerequisites": [
       "V3.M05.L03"
      ],
      "skills": [
       {
        "code": "V3.M05.A04",
        "text": "dimensioni di nucleo e immagine; iniettività e suriettività."
       }
      ]
     },
     {
      "code": "V3.M05.L05",
      "title": "Cambiamento di base",
      "minutes": 20,
      "prerequisites": [
       "V3.M05.L04",
       "V3.M03.L03"
      ],
      "skills": [
       {
        "code": "V3.M05.A05",
        "text": "matrice del cambiamento di base; matrice associata in una nuova base."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M06",
    "title": "Autovalori e diagonalizzazione",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M06.L01",
      "title": "Autovalori e autovettori",
      "minutes": 20,
      "prerequisites": [
       "V3.M05.L05"
      ],
      "skills": [
       {
        "code": "V3.M06.A01",
        "text": "verificare se un vettore è autovettore; autovalori di matrici 2×2."
       }
      ]
     },
     {
      "code": "V3.M06.L02",
      "title": "Polinomio caratteristico",
      "minutes": 20,
      "prerequisites": [
       "V3.M06.L01",
       "V1.M04.L07"
      ],
      "skills": [
       {
        "code": "V3.M06.A02",
        "text": "autovalori e autospazi di matrici 3×3."
       }
      ]
     },
     {
      "code": "V3.M06.L03",
      "title": "Molteplicità algebrica e geometrica",
      "minutes": 15,
      "prerequisites": [
       "V3.M06.L02",
       "V2.M02.L05"
      ],
      "skills": [
       {
        "code": "V3.M06.A03",
        "text": "molteplicità algebrica e geometrica di ogni autovalore."
       }
      ]
     },
     {
      "code": "V3.M06.L04",
      "title": "Diagonalizzazione",
      "minutes": 20,
      "prerequisites": [
       "V3.M06.L03"
      ],
      "skills": [
       {
        "code": "V3.M06.A04",
        "text": "decidere se una matrice è diagonalizzabile e trovare P e D."
       }
      ]
     },
     {
      "code": "V3.M06.L05",
      "title": "Potenze di una matrice",
      "minutes": 15,
      "prerequisites": [
       "V3.M06.L04"
      ],
      "skills": [
       {
        "code": "V3.M06.A05",
        "text": "calcolare Aⁿ con la diagonalizzazione."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M07",
    "title": "Prodotto scalare e ortogonalità",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M07.L01",
      "title": "Prodotto scalare in ℝⁿ",
      "minutes": 15,
      "prerequisites": [
       "V3.M04.L05",
       "V3.M01.L02"
      ],
      "skills": [
       {
        "code": "V3.M07.A01",
        "text": "norma, distanza, angolo e ortogonalità in ℝⁿ."
       }
      ]
     },
     {
      "code": "V3.M07.L02",
      "title": "Basi ortonormali e proiezioni",
      "minutes": 20,
      "prerequisites": [
       "V3.M07.L01"
      ],
      "skills": [
       {
        "code": "V3.M07.A02",
        "text": "proiezione ortogonale su un sottospazio; complemento ortogonale."
       }
      ]
     },
     {
      "code": "V3.M07.L03",
      "title": "Procedimento di Gram-Schmidt",
      "minutes": 15,
      "prerequisites": [
       "V3.M07.L02"
      ],
      "skills": [
       {
        "code": "V3.M07.A03",
        "text": "base ortonormale di un sottospazio con Gram-Schmidt."
       }
      ]
     },
     {
      "code": "V3.M07.L04",
      "title": "Matrici ortogonali",
      "minutes": 15,
      "prerequisites": [
       "V3.M07.L03",
       "V3.M03.L03"
      ],
      "skills": [
       {
        "code": "V3.M07.A04",
        "text": "riconoscere matrici ortogonali; rotazioni e simmetrie del piano."
       }
      ]
     },
     {
      "code": "V3.M07.L05",
      "title": "Teorema spettrale",
      "minutes": 20,
      "prerequisites": [
       "V3.M07.L04",
       "V3.M06.L04",
       "V2.M02.L01"
      ],
      "skills": [
       {
        "code": "V3.M07.A05",
        "text": "diagonalizzare una matrice simmetrica con una base ortonormale."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M08",
    "title": "Geometria analitica dello spazio",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M08.L01",
      "title": "Rette nello spazio",
      "minutes": 20,
      "prerequisites": [
       "V3.M01.L03",
       "V1.M12.L10"
      ],
      "skills": [
       {
        "code": "V3.M08.A01",
        "text": "equazioni parametriche e cartesiane di una retta."
       }
      ]
     },
     {
      "code": "V3.M08.L02",
      "title": "Piani nello spazio",
      "minutes": 20,
      "prerequisites": [
       "V3.M08.L01",
       "V3.M02.L06"
      ],
      "skills": [
       {
        "code": "V3.M08.A02",
        "text": "equazione di un piano per tre punti o per un punto con vettore normale dato."
       }
      ]
     },
     {
      "code": "V3.M08.L03",
      "title": "Posizioni reciproche",
      "minutes": 20,
      "prerequisites": [
       "V3.M08.L02"
      ],
      "skills": [
       {
        "code": "V3.M08.A03",
        "text": "posizioni reciproche di rette e piani (con Rouché-Capelli)."
       }
      ]
     },
     {
      "code": "V3.M08.L04",
      "title": "Distanze",
      "minutes": 20,
      "prerequisites": [
       "V3.M08.L03"
      ],
      "skills": [
       {
        "code": "V3.M08.A04",
        "text": "distanza punto-piano, punto-retta, tra rette sghembe."
       }
      ]
     },
     {
      "code": "V3.M08.L05",
      "title": "Angoli",
      "minutes": 15,
      "prerequisites": [
       "V3.M08.L03"
      ],
      "skills": [
       {
        "code": "V3.M08.A05",
        "text": "angoli tra due rette, tra retta e piano, tra due piani."
       }
      ]
     }
    ]
   },
   {
    "code": "V3.M09",
    "title": "Coniche",
    "approved": false,
    "lessons": [
     {
      "code": "V3.M09.L01",
      "title": "Coniche e matrici",
      "minutes": 20,
      "prerequisites": [
       "V1.M12.L09",
       "V3.M07.L05"
      ],
      "skills": [
       {
        "code": "V3.M09.A01",
        "text": "matrice associata a una conica; coniche degeneri."
       }
      ]
     },
     {
      "code": "V3.M09.L02",
      "title": "Classificazione delle coniche",
      "minutes": 20,
      "prerequisites": [
       "V3.M09.L01"
      ],
      "skills": [
       {
        "code": "V3.M09.A02",
        "text": "classificare una conica dai determinanti (anche con un parametro)."
       }
      ]
     },
     {
      "code": "V3.M09.L03",
      "title": "Forma canonica",
      "minutes": 20,
      "prerequisites": [
       "V3.M09.L02"
      ],
      "skills": [
       {
        "code": "V3.M09.A03",
        "text": "rotazione e traslazione fino alla forma canonica; centro e assi."
       }
      ]
     },
     {
      "code": "V3.M09.L04",
      "title": "Quadriche (varia)",
      "minutes": 20,
      "prerequisites": [
       "V3.M09.L03",
       "V3.M08.L02"
      ],
      "skills": [
       {
        "code": "V3.M09.A04",
        "text": "riconoscere una quadrica dalla forma canonica."
       }
      ]
     }
    ]
   }
  ]
 }
];
