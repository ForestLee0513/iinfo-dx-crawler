import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { crawl, buildUrl, countByStyle } from "../src/crawler";
import type { FetchLike } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleHtml = readFileSync(join(__dirname, "fixtures/sample.html"), "utf8");
const endHtml = sampleHtml.replace(/<div class="navi-next">[\s\S]*?<\/div>/, "");

describe("buildUrl", () => {
  it("쿼리 파라미터를 올바르게 구성", () => {
    const url = buildUrl("https://p.eagate.573.jp", { style: 1, difficult: 5, offset: 100 });
    expect(url).toBe(
      "https://p.eagate.573.jp/game/2dx/33/djdata/music/difficulty.html?difficult=5&style=1&disp=1&offset=100"
    );
  });
});

describe("crawl (mock fetch)", () => {
  it("SP/DP 를 레벨별 객체로 수집하고 navi-next 로 페이지네이션한다", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (url) => {
      const isFirst = /offset=0(\b|&|$)/.test(url);
      return { ok: true, status: 200, text: async () => (isFirst ? sampleHtml : endHtml) };
    });

    const progress: number[] = [];
    const result = await crawl({
      origin: "https://p.eagate.573.jp",
      fetchImpl,
      delay: 0,
      onProgress: (f) => progress.push(f),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(48); // 2 style × 12 level × 2 page

    expect(Object.keys(result.SP).map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(Object.keys(result.DP).length).toBe(12);

    expect(result.SP[1].length).toBe(100);
    expect(result.SP[12].length).toBe(100);
    expect(countByStyle(result.SP)).toBe(1200);
    expect(countByStyle(result.DP)).toBe(1200);

    expect(result.SP[1][0].level).toBe(1);
    expect(result.DP[12].at(-1)!.level).toBe(12);

    expect(progress.at(-1)).toBeCloseTo(1.0, 5);
  });

  it("fetch 실패 시 해당 레벨을 건너뛰고 계속 진행한다(빈 레벨은 [])", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => ({
      ok: false, status: 500, text: async () => "",
    }));
    const warns: string[] = [];
    const result = await crawl({
      origin: "https://p.eagate.573.jp",
      fetchImpl,
      delay: 0,
      onLog: (msg, cls) => { if (cls === "warn") warns.push(msg); },
    });
    expect(countByStyle(result.SP)).toBe(0);
    expect(countByStyle(result.DP)).toBe(0);
    expect(result.SP[5]).toEqual([]);
    expect(warns.length).toBeGreaterThan(0);
  });
});
