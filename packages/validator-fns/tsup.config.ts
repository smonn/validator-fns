import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  "format": ["cjs", "esm"],
  outDir: "dist",
  sourcemap: true,
  dts: true,
  ...options,
}));
