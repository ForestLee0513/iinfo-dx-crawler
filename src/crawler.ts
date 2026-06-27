import { CONFIG } from "./constants";
import { parseDoc } from "./parser";
import type { CrawlOptions, CrawlResult, FetchLike, LevelBucket } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// URL 한 개를 받아 파싱된 Document 반환. fetchImpl 주입으로 테스트 가능.
export async function fetchDoc(
  url: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<Document> {
  const res = await fetchImpl(url, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const html = await res.text();
  return new DOMParser().parseFromString(html, "text/html");
}

export function buildUrl(
  origin: string,
  p: { style: number; difficult: number; offset: number }
): string {
  return (
    origin +
    CONFIG.path +
    "?difficult=" + p.difficult +
    "&style=" + p.style +
    "&disp=" + CONFIG.disp +
    "&offset=" + p.offset
  );
}

// 메인 크롤. 반환: { SP: {1..12:[]}, DP: {1..12:[]} }
export async function crawl(opts: CrawlOptions = {}): Promise<CrawlResult> {
  const {
    origin = typeof location !== "undefined" ? location.origin : "",
    fetchImpl = fetch as unknown as FetchLike,
    onStatus = () => {},
    onLog = () => {},
    onProgress = () => {},
    onCounts = () => {},
    delay = CONFIG.delay,
  } = opts;

  const result: CrawlResult = { SP: {}, DP: {} };
  const totals: Record<"SP" | "DP", number> = { SP: 0, DP: 0 };
  const totalUnits = CONFIG.styles.length * CONFIG.levels;
  onLog("크롤링 시작 (SP+DP, LV1~" + CONFIG.levels + ")", "hi");

  for (let s = 0; s < CONFIG.styles.length; s++) {
    const { name: styleName, style } = CONFIG.styles[s];
    const byLevel = result[styleName];
    onLog("===== " + styleName + " =====", "hi");

    for (let difficult = 0; difficult < CONFIG.levels; difficult++) {
      const level = difficult + 1;
      const bucket = (byLevel[level] = byLevel[level] || []); // 빈 레벨도 [] 보장
      let offset = 0;
      let page = 0;
      let levelCount = 0;
      onStatus(styleName + " · LV" + level + " 수집 중…");

      while (page < CONFIG.maxPages) {
        const url = buildUrl(origin, { style, difficult, offset });
        let parsed;
        try {
          const doc = await fetchDoc(url, fetchImpl);
          parsed = parseDoc(doc);
        } catch (e) {
          onLog("실패: " + styleName + " LV" + level + " — " + (e as Error).message, "warn");
          break;
        }

        for (const r of parsed.rows) {
          r.level = level;
          bucket.push(r);
        }
        levelCount += parsed.rows.length;
        totals[styleName] += parsed.rows.length;
        onCounts(totals.SP, totals.DP);

        if (!parsed.hasNext || parsed.rows.length === 0) break;
        offset += CONFIG.step;
        page++;
        if (delay) await sleep(delay);
      }

      onLog(styleName + " LV" + level + ": " + levelCount + "곡", "ok");
      onProgress((s * CONFIG.levels + level) / totalUnits);
      if (delay) await sleep(delay);
    }
  }

  return result;
}

// 한 style(레벨 객체) 안의 전체 곡 수
export function countByStyle(byLevel: LevelBucket): number {
  return Object.values(byLevel).reduce((a, arr) => a + arr.length, 0);
}
