import { buildUI } from "./ui";
import { crawlProfile } from "./crawler";
import { fetchScoreCsv, csvSongCount } from "./scoreDownload";
import { checkLogin } from "./auth";
import { installNavGuard } from "./guard";
import type { DonePayload, FetchLike } from "./types";
import sampleHtml from "../test/fixtures/sample.html?raw";
import statusHtml from "../test/fixtures/status.html?raw";
import scoreHtml from "../test/fixtures/score_download.html?raw";

// 로컬 개발용: eagate 에 접속하지 않고 fixture HTML 로 UI/로직을 테스트.
const endHtml = sampleHtml.replace(
  /<div class="navi-next">[\s\S]*?<\/div>/,
  "",
);

const mockFetch: FetchLike = async (url) => {
  await new Promise((r) => setTimeout(r, 30));
  // 공식 CSV 다운로드 페이지 → score_download fixture 반환 (1차 경로 미리보기)
  if (url.includes("score_download.html")) {
    return { ok: true, status: 200, url, text: async () => scoreHtml };
  }
  // 스테이터스(프로필) 페이지 요청이면 status fixture 반환
  if (url.includes("status.html")) {
    return { ok: true, status: 200, url, text: async () => statusHtml };
  }
  // (폴백 경로용) 난이도표 페이지
  const isFirst = /offset=0(\b|&|$)/.test(url);
  return {
    ok: true,
    status: 200,
    url,
    text: async () => (isFirst ? sampleHtml : endHtml),
  };
};

const origin = "https://p.eagate.573.jp";

(async function () {
  // 북마크릿 시작 즉시 가드 설치, 패널 닫기로 해제 (프로덕션과 동일)
  const releaseGuard = installNavGuard();
  // index.html 에 심어둔 로그인 헤더로 checkLogin 동작 확인
  const auth = checkLogin();
  const ui = buildUI(releaseGuard);
  ui.log(
    "[DEV] checkLogin → " +
      (auth.loggedIn ? "로그인" : "로그아웃") +
      (auth.konamiId ? " (" + auth.konamiId + ")" : ""),
    auth.loggedIn ? "ok" : "warn",
  );

  // 프로덕션과 동일하게 토큰 입력 + [데이터 갱신] 클릭 전에는 시작하지 않는다.
  ui.log("[DEV] 아무 토큰이나 입력하고 [데이터 갱신]을 눌러보세요", "hi");
  await ui.waitForStart();

  const profile = await crawlProfile({
    origin,
    fetchImpl: mockFetch,
    onLog: ui.log,
  });

  // 1차: score_download 미리보기 (fixture)
  ui.status("[DEV] score_download CSV 다운로드…");
  const SP = await fetchScoreCsv("SP", {
    origin,
    fetchImpl: mockFetch,
    onLog: ui.log,
  });
  const DP = await fetchScoreCsv("DP", {
    origin,
    fetchImpl: mockFetch,
    onLog: ui.log,
  });

  const json = { profile, source: "score_download", csv: { SP, DP } };
  (window as unknown as { __iidxData: unknown }).__iidxData = json;
  ui.counts(csvSongCount(SP), csvSongCount(DP));
  ui.progress(1);
  ui.status(
    "[DEV] 완료 — SP " + csvSongCount(SP) + " / DP " + csvSongCount(DP),
  );
  ui.log("[DEV] mock score_download 완료", "hi");
  const payload: DonePayload = { csv: { SP, DP }, json };
  ui.done(payload);
  console.log("[IIDX][DEV]", json);
})();
