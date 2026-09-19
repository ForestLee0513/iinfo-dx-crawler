/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase =
    process.env.API_BASE ??
    env.API_BASE ??
    "https://iinfo-dx-api-dev.forestlee.me/api/v1";

  return {
    define: {
      __API_BASE__: JSON.stringify(apiBase.replace(/\/+$/, "")),
    },
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
  };
});
