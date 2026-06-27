// 도메인 타입 정의

export type Lamp =
  | "NO-PLAY"
  | "FAILED"
  | "A-CLEAR"
  | "E-CLEAR"
  | "CLEAR"
  | "H-CLEAR"
  | "EXH-CLEAR"
  | "F-COMBO";

export type Grade = "F" | "E" | "D" | "C" | "B" | "A" | "AA" | "AAA";

export interface Score {
  lamp: Lamp | null;
  exScore: number | null; // EX SCORE
  grade: Grade | null; // 중도 종료 시 null
}

export interface SongEntry {
  title: string;
  difficulty: string; // ANOTHER / HYPER / LEGGENDARIA ...
  level?: number; // difficult + 1 (버킷 키와 동일, 편의용)
  score: Score;
}

// 레벨(1~12) → 곡 배열
export type LevelBucket = Record<number, SongEntry[]>;

export interface CrawlResult {
  SP: LevelBucket;
  DP: LevelBucket;
}

export interface ParsedPage {
  rows: SongEntry[];
  hasNext: boolean;
}

// 테스트에서 가짜 구현을 주입하기 쉽게, 사용하는 멤버만 요구한다.
export type FetchLike = (
  url: string,
  init?: { credentials?: RequestCredentials }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export interface AuthStatus {
  loggedIn: boolean;
  konamiId: string | null;
}

export interface CrawlOptions {
  origin?: string;
  fetchImpl?: FetchLike;
  delay?: number;
  onStatus?: (text: string) => void;
  onLog?: (text: string, cls?: LogClass) => void;
  onProgress?: (fraction: number) => void;
  onCounts?: (sp: number, dp: number) => void;
}

export type LogClass = "ok" | "warn" | "hi";

export interface UIHandle {
  host: HTMLElement;
  status: (text: string) => void;
  progress: (fraction: number) => void;
  counts: (sp: number, dp: number) => void;
  log: (text: string, cls?: LogClass) => void;
  done: (data: unknown) => void;
}
