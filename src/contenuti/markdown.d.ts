// I file .md delle lezioni si importano come testo: lo fanno esbuild (scripts/build.mjs) e Vitest
// (vitest.config.ts), ognuno con la sua regola.

declare module "*.md" {
  const text: string;
  export default text;
}
