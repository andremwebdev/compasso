// I file .md delle lezioni e le figure .svg accanto a loro si importano come testo: lo fanno esbuild
// (scripts/build.mjs) e Vitest (vitest.config.ts), ognuno con la sua regola.

declare module "*.md" {
  const text: string;
  export default text;
}

declare module "*.svg" {
  const text: string;
  export default text;
}
