/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // 단일 IIFE 번들 → <script src> 주입 시 즉시 실행
    lib: {
      entry: "src/main.ts",
      name: "IIDXCrawler",
      formats: ["iife"],
      fileName: () => "iidx-crawler.js",
    },
    minify: "terser",
    terserOptions: { compress: true, mangle: true },
    rollupOptions: {
      output: { entryFileNames: "iidx-crawler.js", inlineDynamicImports: true },
    },
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
