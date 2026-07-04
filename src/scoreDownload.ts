import { CONFIG } from "./constants";
import { PaidFeatureError } from "./crawler";
import type { FetchLike } from "./types";

// score_download.html 에서 공식 CSV 를 직접 받아온다.
// 폼은 히든 필드 없이 style=SP|DP submit 뿐 → 단순 POST 로 충분하다.
// 응답 HTML 의 textarea#score_data 에 전체 CSV 가 담겨 있으며,
// textarea.value 로 읽으면 HTML 엔티티(&amp; 등)가 자동 언이스케이프된다.
//
// 구독 미가입이면 error.html?err=5 로 리다이렉트된다 → fetch 는 리다이렉트를
// 따라가므로 최종 URL(res.url)로 감지해 PaidFeatureError 를 던진다.
// (호출부에서 이 예외를 잡아 기존 난이도표 크롤 플로우로 폴백한다.)

export interface ScoreDownloadOptions {
  origin?: string;
  fetchImpl?: FetchLike;
  onLog?: (text: string, cls?: "ok" | "warn" | "hi") => void;
}

// 한 style(SP/DP) 의 CSV 문자열을 반환. 구독 미가입 시 PaidFeatureError.
export async function fetchScoreCsv(
  style: "SP" | "DP",
  opts: ScoreDownloadOptions = {},
): Promise<string> {
  const {
    origin = typeof location !== "undefined" ? location.origin : "",
    fetchImpl = fetch as unknown as FetchLike,
    onLog = () => {},
  } = opts;

  const url = origin + CONFIG.scorePath;
  const res = await fetchImpl(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "style=" + style,
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  // 구독 미가입 → error.html?err=5 리다이렉트 (경로만 비교)
  if (res.url && res.url.includes(CONFIG.errorPath)) {
    throw new PaidFeatureError(url);
  }

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const ta = doc.querySelector("#score_data") as HTMLTextAreaElement | null;
  const raw = ta ? ta.value || ta.textContent || "" : "";
  if (!raw.trim()) {
    onLog(style + "플레이 기록이 비어 있습니다", "warn");
    return "";
  }

  // eagate 네이티브 다운로드 파일은 BOM + LF 개행이다. textarea.value 도 LF 로
  // 정규화되므로, 혹시 모를 CRLF 만 LF 로 맞추고 BOM 만 붙이면 원본과 바이트 동일해진다.
  let csv = raw.replace(/\r\n/g, "\n");
  if (!csv.startsWith("\uFEFF")) csv = "\uFEFF" + csv;
  return csv;
}

// CSV 의 곡(데이터 행) 수 — 헤더/빈 줄 제외. 카운트 칩 표시에 사용.
export function csvSongCount(csv: string): number {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/);
  // 첫 줄은 헤더
  return lines.slice(1).filter((l) => l.trim() !== "").length;
}
