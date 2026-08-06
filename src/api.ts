/**
 * IInfoDX 백엔드 API 클라이언트.
 *
 * 북마크릿은 p.eagate.573.jp 컨텍스트에서 실행되므로 모든 요청이 크로스 오리진.
 * 백엔드 CORS_ORIGINS에 https://p.eagate.573.jp 가 포함돼 있어야 한다.
 * 인증은 X-Upload-Token 헤더 (발급: POST /iidx/scores/token).
 */

import { API_BASE } from "./constants";
import type { ApiUploadResult, Profile } from "./types";

function headers(token: string, extra?: Record<string, string>): Record<string, string> {
  return { "X-Upload-Token": token, ...extra };
}

/**
 * eagate 성적 CSV를 업로드한다.
 *
 * profile 을 함께 넘기면 성적·프로필을 이 한 번의 요청에서 동기화한다
 * (multipart 의 `profile` 필드에 크롤러 Profile JSON 문자열로 전송).
 * 별도의 프로필 동기화 호출은 더 이상 필요 없다.
 *
 * @param token 업로드 토큰
 * @param style "SP" | "DP"
 * @param csvText CSV 문자열 (BOM 포함 가능)
 * @param profile 함께 동기화할 크롤러 프로필 (선택)
 */
export async function uploadCsv(
  token: string,
  style: "SP" | "DP",
  csvText: string,
  profile?: Profile | null,
): Promise<ApiUploadResult> {
  const form = new FormData();
  const blob = new Blob([csvText], { type: "text/csv; charset=utf-8" });
  form.append("file", blob, `${style}.csv`);
  if (profile) form.append("profile", JSON.stringify(profile));

  const res = await fetch(`${API_BASE}/iidx/scores/upload?style=${style}`, {
    method: "POST",
    headers: headers(token),
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json.detail) detail = String(json.detail);
    } catch {
      /* 무시 */
    }
    throw new Error(`CSV 업로드 실패 (${style}): ${detail}`);
  }

  return (await res.json()) as ApiUploadResult;
}
