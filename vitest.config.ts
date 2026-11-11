import { defineConfig } from "vitest/config";

export default defineConfig({
  // Costanti che in produzione sostituisce esbuild (vedi scripts/build.mjs).
  define: {
    __TARGET__: JSON.stringify("pc"),
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
