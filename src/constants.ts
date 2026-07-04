import type { Lamp, Grade, Dan } from "./types";

// clflg<n>.gif → 램프 이름 (0 = 미플레이, 1~7 = 사용자 지정 순서)
export const LAMP: Record<number, Lamp> = {
  0: "NO-PLAY",
  1: "FAILED",
  2: "A-CLEAR",
  3: "E-CLEAR",
  4: "CLEAR",
  5: "H-CLEAR",
  6: "EXH-CLEAR",
  7: "F-COMBO",
};

// 알파벳 점수로 인정할 값 (이미지 파일명 기준)
export const GRADES: Grade[] = ["F", "E", "D", "C", "B", "A", "AA", "AAA"];

// eagate 스코어데이터 CSV 의 난이도 컬럼 순서 (곡당 1행 · 5개 난이도)
export const CSV_DIFFICULTIES = [
  "BEGINNER",
  "NORMAL",
  "HYPER",
  "ANOTHER",
  "LEGGENDARIA",
] as const;

// 내부 램프 → eagate CSV "クリアタイプ" 표기
export const CLEAR_TYPE_CSV: Record<Lamp, string> = {
  "NO-PLAY": "NO PLAY",
  FAILED: "FAILED",
  "A-CLEAR": "ASSIST CLEAR",
  "E-CLEAR": "EASY CLEAR",
  CLEAR: "CLEAR",
  "H-CLEAR": "HARD CLEAR",
  "EXH-CLEAR": "EX HARD CLEAR",
  "F-COMBO": "FULLCOMBO CLEAR",
};

// 段位認定 라벨(일본어) → Dan enum. (iidx.org/dan/sparkleshower 기준)
export const DAN: Record<string, Dan> = {
  七級: "7TH_KYU",
  六級: "6TH_KYU",
  五級: "5TH_KYU",
  四級: "4TH_KYU",
  三級: "3RD_KYU",
  二級: "2ND_KYU",
  一級: "1ST_KYU",
  初段: "1ST_DAN",
  二段: "2ND_DAN",
  三段: "3RD_DAN",
  四段: "4TH_DAN",
  五段: "5TH_DAN",
  六段: "6TH_DAN",
  七段: "7TH_DAN",
  八段: "8TH_DAN",
  九段: "9TH_DAN",
  十段: "10TH_DAN",
  中伝: "CHUUDEN",
  皆伝: "KAIDEN",
};

export interface StyleDef {
  name: "SP" | "DP";
  style: 0 | 1;
}

export interface Config {
  path: string;
  statusPath: string;
  scorePath: string;
  errorPath: string;
  styles: StyleDef[];
  disp: number;
  step: number;
  delay: number;
  maxPages: number;
  levels: number;
}

export const CONFIG: Config = {
  path: "/game/2dx/33/djdata/music/difficulty.html",
  statusPath: "/game/2dx/33/djdata/status.html", // 프로필(스테이터스) 페이지
  // 공식 CSV 다운로드 페이지. style=SP|DP 로 POST 하면 응답 HTML 의
  // textarea#score_data 에 전체 CSV 가 들어온다. (구독 미가입 시 error.html?err=5 로 리다이렉트)
  scorePath: "/game/2dx/33/djdata/score_download.html",
  // 베이직 코스 미구독 시 eagate 가 리다이렉트하는 에러 페이지(경로만 비교).
  // 예: /game/2dx/33/error/error.html?err=1
  errorPath: "/game/2dx/33/error/error.html",
  styles: [
    { name: "SP", style: 0 },
    { name: "DP", style: 1 },
  ],
  disp: 1,
  step: 50, // 한 페이지당 곡 수
  delay: 400, // 페이지 사이 간격(ms)
  maxPages: 60, // 무한루프 방지
  levels: 12, // difficult 0~11
};

// e-amusement 로그인 페이지. (변경되면 이 값만 수정)
export const LOGIN_URL =
  "https://p.eagate.573.jp/gate/p/login.html?path=/game/2dx/33/";
