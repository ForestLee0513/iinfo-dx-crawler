import type { Lamp, Grade } from "./types";

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

export interface StyleDef {
  name: "SP" | "DP";
  style: 0 | 1;
}

export interface Config {
  path: string;
  styles: StyleDef[];
  disp: number;
  step: number;
  delay: number;
  maxPages: number;
  levels: number;
}

export const CONFIG: Config = {
  path: "/game/2dx/33/djdata/music/difficulty.html",
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
export const LOGIN_URL = "https://my.konami.net/ko/signin?isWebView=false";
