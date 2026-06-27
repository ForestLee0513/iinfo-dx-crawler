import { buildUI } from "./ui";
import { crawl, crawlProfile, countByStyle } from "./crawler";
import { checkLogin } from "./auth";
import type { FetchLike } from "./types";
import sampleHtml from "../test/fixtures/sample.html?raw";
import statusHtml from "../test/fixtures/status.html?raw";

// 로컬 개발용: eagate 에 접속하지 않고 fixture HTML 로 UI/로직을 테스트.
const endHtml = sampleHtml.replace(/<div class="navi-next">[\s\S]*?<\/div>/, "");

const mockFetch: FetchLike = async (url) => {
  await new Promise((r) => setTimeout(r, 30));
  // 스테이터스(프로필) 페이지 요청이면 status fixture 반환
  if (url.includes("status.html")) {
    return { ok: true, status: 200, text: async () => statusHtml };
  }
  const isFirst = /offset=0(\b|&|$)/.test(url);
  return {
    ok: true,
    status: 200,
    text: async () => (isFirst ? sampleHtml : endHtml),
  };
};

(async function () {
  // index.html 에 심어둔 로그인 헤더로 checkLogin 동작 확인
  const auth = checkLogin();
  const ui = buildUI();
  ui.log(
    "[DEV] checkLogin → " + (auth.loggedIn ? "로그인" : "로그아웃") +
      (auth.konamiId ? " (" + auth.konamiId + ")" : ""),
    auth.loggedIn ? "ok" : "warn"
  );

  const profile = await crawlProfile({
    origin: "https://p.eagate.573.jp",
    fetchImpl: mockFetch,
    onLog: ui.log,
  });

  const scores = await crawl({
    origin: "https://p.eagate.573.jp",
    fetchImpl: mockFetch,
    delay: 0,
    onStatus: ui.status,
    onLog: ui.log,
    onProgress: ui.progress,
    onCounts: ui.counts,
  });

  const result = { profile, ...scores };
  (window as unknown as { __iidxData: unknown }).__iidxData = result;
  ui.status("[DEV] 완료 — SP " + countByStyle(result.SP) + " / DP " + countByStyle(result.DP));
  ui.log("[DEV] mock 크롤 완료", "hi");
  ui.done(result);
  console.log("[IIDX][DEV]", result);
})();
