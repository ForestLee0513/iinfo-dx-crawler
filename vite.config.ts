/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// API_BASE 환경변수 미지정 시 빌드 타임 오류를 내지 않고 http://localhost:8000으로 둔다.
// CI에서 API_BASE=https://api.example.com/api/v1 로 넘기면 번들에 하드코딩된다.
const apiBase = process.env.API_BASE ?? "http://localhost:8000";

export default defineConfig({
  define: {
    __API_BASE__: JSON.stringify(apiBase),
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
});
