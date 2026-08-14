import { defineConfig } from "vitest/config";
import path from "node:path";

// Rules tests require the Firestore emulator running (npm run test:rules).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
});
