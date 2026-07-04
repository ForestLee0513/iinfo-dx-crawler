import { buildUI, showLoginRequired } from "./ui";
import { crawl, crawlProfile, countByStyle, PaidFeatureError } from "./crawler";
import { fetchScoreCsv, csvSongCount } from "./scoreDownload";
import { buildStyleCsv } from "./csv";
import { checkLogin } from "./auth";
import { installNavGuard } from "./guard";
import { LOGIN_URL } from "./constants";
import type { DonePayload } from "./types";

declare global {
  interface Window {
    __iidxData?: unknown;
  }
}

// eagate 페이지에 주입되어 실행되는 실제 로직.
(async function () {
  if (!location.hostname.endsWith("eagate.573.jp")) {
    alert("p.eagate.573.jp 에서 실행해 주세요.");
    return;
  }

  // 로그인 검증 — 로그아웃이면 로그인 페이지로 유도 후 중단 (자동 재시작 불가)
  const auth = checkLogin();
  if (!auth.loggedIn) {
    showLoginRequired(LOGIN_URL);
    return;
  }

  // 북마크릿이 시작되는 즉시 네비게이션 가드 설치 —
  // 실수로 링크 클릭·새로고침 시 컨텍스트(주입 스크립트)가 사라지는 것을 막는다.
  // 패널을 닫으면(×) 해제되어 자유롭게 이동할 수 있다.
  const releaseGuard = installNavGuard();
  const ui = buildUI(releaseGuard);
  ui.log(
    "로그인 확인됨" + (auth.konamiId ? " (" + auth.konamiId + ")" : ""),
    "ok",
  );
  ui.log("페이지를 떠나면 진행 상황/결과가 사라집니다 (닫기로 해제)", "warn");

  // 프로필(스테이터스) 먼저 수집
  ui.status("프로필 수집 중…");
  const profile = await crawlProfile({ onLog: ui.log });

  let csv: { SP?: string; DP?: string };
  let json: unknown;

  try {
    // ── 1차: 공식 score_download.html 에서 CSV 직접 다운로드 (원본과 100% 동일) ──
    ui.status("CSV 다운로드 중… (score_download)");
    ui.log("score_download.html 에서 CSV 다운로드 요청", "hi");
    const SP = await fetchScoreCsv("SP", { onLog: ui.log });
    ui.progress(0.5);
    const DP = await fetchScoreCsv("DP", { onLog: ui.log });
    ui.progress(1);

    csv = { SP, DP };
    json = { profile, source: "score_download", csv: { SP, DP } };
    ui.counts(csvSongCount(SP), csvSongCount(DP));
    ui.log("score_download 다운로드 완료", "hi");
  } catch (e) {
    if (!(e instanceof PaidFeatureError)) throw e;

    // score_download 는 구독 미가입(error.html?err=5) → 기존 난이도표 크롤로 폴백.
    ui.log(
      "score_download 접근 불가(구독 필요) → 난이도표 크롤로 대체합니다",
      "warn",
    );
    ui.progress(0);
    try {
      const scores = await crawl({
        onStatus: ui.status,
        onLog: ui.log,
        onProgress: ui.progress,
        onCounts: ui.counts,
      });
      csv = {
        SP: buildStyleCsv(scores.SP),
        DP: buildStyleCsv(scores.DP),
      };
      json = { profile, source: "difficulty_crawl", ...scores };
      ui.counts(countByStyle(scores.SP), countByStyle(scores.DP));
    } catch (e2) {
      // 난이도표마저 구독 미가입으로 막힘 → 안내 후 중단(주입 스크립트라 자동 재시도 불가).
      if (e2 instanceof PaidFeatureError) {
        ui.fail("베이직 코스(구독)이 필요합니다");
        ui.log(
          "성적표 페이지는 e-Amusement 베이직 코스 구독이 필요합니다. 구독 후 다시 실행해 주세요.",
          "warn",
        );
        return;
      }
      throw e2;
    }
  }

  window.__iidxData = json;
  const payload: DonePayload = { csv, json };
  const spN = csv.SP ? csvSongCount(csv.SP) : 0;
  const dpN = csv.DP ? csvSongCount(csv.DP) : 0;
  ui.status("완료 — SP " + spN + "곡 / DP " + dpN + "곡");
  ui.log("완료! 총 " + (spN + dpN) + "곡", "hi");
  ui.done(payload);
  console.log("[IIDX] window.__iidxData:", json);
})();
