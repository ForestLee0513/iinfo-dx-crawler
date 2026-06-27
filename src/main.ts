import { buildUI, showLoginRequired } from "./ui";
import { crawl, countByStyle } from "./crawler";
import { checkLogin } from "./auth";
import { LOGIN_URL } from "./constants";
import type { CrawlResult } from "./types";

declare global {
  interface Window {
    __iidxData?: CrawlResult;
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

  const ui = buildUI();
  ui.log("로그인 확인됨" + (auth.konamiId ? " (" + auth.konamiId + ")" : ""), "ok");

  const result = await crawl({
    onStatus: ui.status,
    onLog: ui.log,
    onProgress: ui.progress,
    onCounts: ui.counts,
  });

  window.__iidxData = result;
  const sp = countByStyle(result.SP);
  const dp = countByStyle(result.DP);
  ui.status("완료 — SP " + sp + "곡 / DP " + dp + "곡");
  ui.log("완료! 총 " + (sp + dp) + "곡", "hi");
  ui.done(result);
  console.log("[IIDX] window.__iidxData:", result);
})();
