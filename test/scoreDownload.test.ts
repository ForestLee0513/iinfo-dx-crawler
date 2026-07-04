import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchScoreCsv, csvSongCount } from "../src/scoreDownload";
import { PaidFeatureError } from "../src/crawler";
import { CONFIG } from "../src/constants";
import type { FetchLike } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scoreHtml = readFileSync(
  join(__dirname, "fixtures/score_download.html"),
  "utf8",
);

const origin = "https://p.eagate.573.jp";

describe("fetchScoreCsv", () => {
  it("style 을 POST 하고 #score_data CSV 를 반환한다", async () => {
    let captured: { url: string; init?: unknown } | null = null;
    const fetchImpl: FetchLike = async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, url, text: async () => scoreHtml };
    };

    const csv = await fetchScoreCsv("SP", { origin, fetchImpl });
    // 올바른 URL + POST body(style=SP)
    expect(captured!.url).toBe(origin + CONFIG.scorePath);
    expect((captured!.init as { method: string }).method).toBe("POST");
    expect((captured!.init as { body: string }).body).toBe("style=SP");

    const lines = csv.replace(/^﻿/, "").trim().split("\n");
    expect(lines[0].split(",").length).toBe(41); // 헤더 41열
    expect(csv.startsWith("﻿")).toBe(true); // BOM
    expect(csvSongCount(csv)).toBe(2); // 데이터 2행
  });

  it("textarea 의 HTML 엔티티를 언이스케이프한다(&amp; → &)", async () => {
    const fetchImpl: FetchLike = async (url) => ({
      ok: true,
      status: 200,
      url,
      text: async () => scoreHtml,
    });
    const csv = await fetchScoreCsv("SP", { origin, fetchImpl });
    expect(csv).toContain("1st&substream"); // &amp; 가 & 로 복원
    expect(csv).not.toContain("&amp;");
  });

  it("error.html 리다이렉트 시 PaidFeatureError", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      url: origin + CONFIG.errorPath + "?err=5",
      text: async () => "<html></html>",
    });
    await expect(fetchScoreCsv("DP", { origin, fetchImpl })).rejects.toBeInstanceOf(
      PaidFeatureError,
    );
  });
});

describe("csvSongCount", () => {
  it("헤더/빈 줄 제외 데이터 행 수", () => {
    const csv = "﻿h1,h2\r\na,b\r\nc,d\r\n";
    expect(csvSongCount(csv)).toBe(2);
    expect(csvSongCount("﻿only,header\r\n")).toBe(0);
  });
});
