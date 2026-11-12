import { defineConfig } from "vitest/config";

export default defineConfig({
  // Le lezioni (.md) si importano come testo, come fa esbuild nella compilazione vera.
  plugins: [
    {
      name: "markdown-come-testo",
      transform(code: string, id: string) {
        return id.endsWith(".md") ? { code: `export default ${JSON.stringify(code)};`, map: null } : null;
      },
    },
  ],
  // Costanti che in produzione sostituisce esbuild (vedi scripts/build.mjs).
  define: {
    __TARGET__: JSON.stringify("pc"),
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
