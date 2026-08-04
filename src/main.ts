import { buildUI, showLoginRequired } from "./ui";
import { crawl, crawlProfile, countByStyle, PaidFeatureError } from "./crawler";
import { fetchScoreCsv, csvSongCount } from "./scoreDownload";
import { buildStyleCsv } from "./csv";
import { checkLogin } from "./auth";
import { installNavGuard } from "./guard";
import { LOGIN_URL } from "./constants";
import { uploadCsv, syncProfile } from "./api";
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

  const auth = checkLogin();
  if (!auth.loggedIn) {
    showLoginRequired(LOGIN_URL);
    return;
  }

  const releaseGuard = installNavGuard();
  const ui = buildUI(releaseGuard);
  ui.log(
    "로그인 확인됨" + (auth.konamiId ? " (" + auth.konamiId + ")" : ""),
    "ok",
  );
  ui.log("페이지를 떠나면 진행 상황/결과가 사라집니다 (닫기로 해제)", "warn");

  ui.status("프로필 수집 중…");
  const profile = await crawlProfile({ onLog: ui.log });

  let csv: { SP?: string; DP?: string };
  let json: unknown;

  try {
    // ── 1차: 공식 score_download.html 에서 CSV 직접 다운로드 ──
    ui.status("CSV 다운로드 중… (공식)");
    ui.log("공식 CSV 다운로드 요청", "hi");
    const SP = await fetchScoreCsv("SP", { onLog: ui.log });
    ui.progress(0.5);
    const DP = await fetchScoreCsv("DP", { onLog: ui.log });
    ui.progress(1);

    csv = { SP, DP };
    json = { profile, source: "score_download", csv: { SP, DP } };
    ui.counts(csvSongCount(SP), csvSongCount(DP));
    ui.log("공식 CSV 다운로드 완료", "hi");
  } catch (e) {
    if (!(e instanceof PaidFeatureError)) throw e;

    ui.log(
      "공식 CSV 다운로드 페이지 접근 불가(프리미엄 코스 구독 필요) → 순회 크롤링 방식으로 변경",
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

  // ── 업로드 토큰이 입력된 경우 서버에 자동 업로드 ──
  const token = ui.getToken();
  if (token) {
    ui.log("── 서버 업로드 시작 ──", "hi");

    // CSV 업로드 (SP → DP 순)
    for (const style of ["SP", "DP"] as const) {
      const text = csv[style];
      if (!text || !text.trim()) continue;
      try {
        ui.status(style + " 업로드 중…");
        const result = await uploadCsv(token, style, text);
        if (result.changed) {
          ui.log(
            style + " 업로드 완료 (" + result.song_count + "곡, id: " + result.upload_id.slice(0, 8) + "…)",
            "ok",
          );
        } else {
          ui.log(style + " 업로드: 이전과 동일한 내용 — 스냅샷 미생성", "warn");
        }
      } catch (err) {
        ui.log(String(err), "warn");
      }
    }

    // 프로필 동기화
    if (profile) {
      try {
        ui.status("프로필 동기화 중…");
        await syncProfile(token, profile);
        ui.log("프로필 동기화 완료 (DJ NAME: " + (profile.djName || "?") + ")", "ok");
      } catch (err) {
        ui.log(String(err), "warn");
      }
    }

    ui.status("서버 업로드 완료");
    ui.log("── 업로드 완료 ──", "hi");
  }

  console.log("[IIDX] window.__iidxData:", json);
})();
