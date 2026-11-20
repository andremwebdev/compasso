import { defineConfig } from "vitest/config";
import { contentIndexDefine } from "./scripts/indice-contenuti.mjs";

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
  // Costanti che in produzione sostituisce esbuild (vedi scripts/build.mjs). L'indice dei contenuti
  // si calcola dai file dei moduli, come nella compilazione.
  define: {
    __TARGET__: JSON.stringify("pc"),
    __CONTENT_INDEX__: await contentIndexDefine(),
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Prima di ogni file di test si caricano tutti i moduli (test/setup.ts).
    setupFiles: ["test/setup.ts"],
  },
});
