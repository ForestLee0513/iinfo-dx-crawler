import { buildUI, showLoginRequired } from "./ui";
import { crawl, crawlProfile, countByStyle } from "./crawler";
import { checkLogin } from "./auth";
import { installNavGuard } from "./guard";
import { LOGIN_URL } from "./constants";
import type { FullResult } from "./types";

declare global {
  interface Window {
    __iidxData?: FullResult;
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
  ui.log("로그인 확인됨" + (auth.konamiId ? " (" + auth.konamiId + ")" : ""), "ok");
  ui.log("페이지를 떠나면 진행 상황/결과가 사라집니다 (닫기로 해제)", "warn");

  // 프로필(스테이터스) 먼저 수집 후 성적 크롤
  ui.status("프로필 수집 중…");
  const profile = await crawlProfile({ onLog: ui.log });

  const scores = await crawl({
    onStatus: ui.status,
    onLog: ui.log,
    onProgress: ui.progress,
    onCounts: ui.counts,
  });

  const result: FullResult = { profile, ...scores };
  window.__iidxData = result;
  const sp = countByStyle(result.SP);
  const dp = countByStyle(result.DP);
  ui.status("완료 — SP " + sp + "곡 / DP " + dp + "곡");
  ui.log("완료! 총 " + (sp + dp) + "곡", "hi");
  ui.done(result);
  console.log("[IIDX] window.__iidxData:", result);
})();
