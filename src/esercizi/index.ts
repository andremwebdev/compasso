// Esercizi: schema dei generatori, creazione, valutazione. Punto di accesso.

export * from "./schema";
export { defineGenerator, draftProblems, generateExercise, errorCodesOf, type DraftProblem } from "./generate";
export { evaluateResponse } from "./evaluate";
export { checkVerdict, matchesWrong, sameUnderCheck, checkErrorCodes, type CheckVerdict } from "./checks";
export { choiceOptions, orderingStart, type ChoiceOption } from "./choices";
