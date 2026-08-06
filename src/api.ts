/**
 * IInfoDX 백엔드 API 클라이언트.
 *
 * 북마크릿은 p.eagate.573.jp 컨텍스트에서 실행되므로 모든 요청이 크로스 오리진.
 * 백엔드 CORS_ORIGINS에 https://p.eagate.573.jp 가 포함돼 있어야 한다.
 * 인증은 X-Upload-Token 헤더 (발급: POST /iidx/scores/token).
 */

import { API_BASE } from "./constants";
import type { ApiMultiUploadResult, ApiUploadResult, Profile } from "./types";

function headers(token: string, extra?: Record<string, string>): Record<string, string> {
  return { "X-Upload-Token": token, ...extra };
}

/**
 * eagate 성적을 SP/DP 한 번의 JSON 요청으로 업로드한다.
 *
 * `csv.SP` / `csv.DP` 중 있는 스타일만 처리되며(최소 하나 필수), profile 을 함께
 * 넘기면 성적·프로필을 이 한 번의 요청에서 동기화한다. 스타일별로 두 번 호출하지
 * 않으므로 첫 호출에서 토큰이 만료돼 두 번째가 실패하던 문제가 없다.
 *
 * @param token 업로드 토큰
 * @param csv 스타일별 CSV 문자열 (BOM 포함 가능, 최소 하나)
 * @param profile 함께 동기화할 크롤러 프로필 (선택)
 * @param source CSV 출처 참고용 라벨 (선택, 백엔드는 저장에 사용하지 않음)
 * @returns 업로드된 스타일별 결과 목록
 */
export async function uploadScores(
  token: string,
  csv: { SP?: string; DP?: string },
  profile?: Profile | null,
  source?: string,
): Promise<ApiUploadResult[]> {
  const body: {
    csv: { SP?: string; DP?: string };
    profile?: Profile;
    source?: string;
  } = { csv };
  if (profile) body.profile = profile;
  if (source) body.source = source;

  const res = await fetch(`${API_BASE}/iidx/scores/upload`, {
    method: "POST",
    headers: headers(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json.detail) detail = String(json.detail);
    } catch {
      /* 무시 */
    }
    throw new Error(`성적 업로드 실패: ${detail}`);
  }

  const json = (await res.json()) as ApiMultiUploadResult;
  return json.results;
}
