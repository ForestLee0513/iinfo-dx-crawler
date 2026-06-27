import { CONFIG } from "./constants";
import { parseDoc, parseProfile } from "./parser";
import type {
  CrawlOptions,
  CrawlResult,
  FetchLike,
  LevelBucket,
  Profile,
  ProfileCrawlOptions,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// 베이직 코스(구독) 미구독으로 eagate 가 error.html 로 리다이렉트했을 때 던지는 예외.
// fetchDoc 에서 발생 → crawl 은 전체 크롤을 중단하고, crawlProfile 은 null 을 반환한다.
export class PaidFeatureError extends Error {
  requestedUrl?: string;
  constructor(requestedUrl?: string) {
    super("베이직 코스(구독)이 필요한 페이지입니다 — error.html 로 리다이렉트됨");
    this.name = "PaidFeatureError";
    this.requestedUrl = requestedUrl;
  }
}

// URL 한 개를 받아 파싱된 Document 반환. fetchImpl 주입으로 테스트 가능.
export async function fetchDoc(
  url: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<Document> {
  const res = await fetchImpl(url, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  // 베이직 코스 미구독 시 eagate 는 error.html 로 리다이렉트한다. fetch 는 기본적으로
  // 리다이렉트를 따라가 200(에러 페이지)을 주므로, 최종 URL(res.url)로 감지한다.
  if (res.url && res.url.includes(CONFIG.errorPath)) {
    throw new PaidFeatureError(url);
  }
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
          // 베이직 코스 미구독이면 모든 레벨이 동일하게 막히므로 전체 크롤을 중단한다.
          if (e instanceof PaidFeatureError) {
            onLog("베이직 코스(구독)이 필요합니다 — 성적표 페이지에 접근할 수 없습니다.", "warn");
            throw e;
          }
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

// 프로필(스테이터스) 페이지 한 장을 fetch + 파싱. 실패 시 null.
export async function crawlProfile(
  opts: ProfileCrawlOptions = {}
): Promise<Profile | null> {
  const {
    origin = typeof location !== "undefined" ? location.origin : "",
    fetchImpl = fetch as unknown as FetchLike,
    onLog = () => {},
  } = opts;

  try {
    const doc = await fetchDoc(origin + CONFIG.statusPath, fetchImpl);
    const profile = parseProfile(doc);
    if (!profile) {
      onLog("프로필을 찾지 못했습니다 (.dj-status 없음)", "warn");
      return null;
    }
    onLog(
      "프로필 수집 완료" + (profile.djName ? " (" + profile.djName + ")" : ""),
      "ok"
    );
    return profile;
  } catch (e) {
    // 프로필은 선택 정보이므로 베이직 코스 미구독이어도 중단하지 않고 null 만 반환한다.
    if (e instanceof PaidFeatureError) {
      onLog("프로필: 베이직 코스 미구독으로 접근할 수 없습니다.", "warn");
      return null;
    }
    onLog("프로필 실패: " + (e as Error).message, "warn");
    return null;
  }
}

// 한 style(레벨 객체) 안의 전체 곡 수
export function countByStyle(byLevel: LevelBucket): number {
  return Object.values(byLevel).reduce((a, arr) => a + arr.length, 0);
}
