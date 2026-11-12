// Espressioni: punto di accesso.

export * from "./types";
export * from "./build";
export * from "./walk";
export { evaluate, literalRational, type Environment } from "./evaluate";
export { evaluateComplex, type ComplexValue } from "./evaluate-complex";
export { toLatex, rationalToLatex } from "./latex";
export { functionTable, functionNames, type FunctionDef } from "./functions";
