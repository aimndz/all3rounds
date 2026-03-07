import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["src/components/ui/**", "src/**/*.test.*", "src/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
