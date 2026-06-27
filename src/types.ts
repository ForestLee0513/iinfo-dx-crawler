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

// 段位認定 등급 (낮은→높은 순). iidx.org/dan/sparkleshower 기준.
// 미취득("--"/"---")은 null 로 표현한다.
export type Dan =
  | "7TH_KYU"
  | "6TH_KYU"
  | "5TH_KYU"
  | "4TH_KYU"
  | "3RD_KYU"
  | "2ND_KYU"
  | "1ST_KYU"
  | "1ST_DAN"
  | "2ND_DAN"
  | "3RD_DAN"
  | "4TH_DAN"
  | "5TH_DAN"
  | "6TH_DAN"
  | "7TH_DAN"
  | "8TH_DAN"
  | "9TH_DAN"
  | "10TH_DAN"
  | "CHUUDEN"
  | "KAIDEN";

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

// ── 프로필(djdata/status.html) 도메인 타입 ──
// 키는 영어, 값은 원본(일본어) 표기를 그대로 유지한다. (예: area="韓国", dan.SP="十段")

// 노츠레이더 6지표 + 합계 (수치이므로 number)
export interface RadarValues {
  notes: number;
  chord: number;
  peak: number;
  charge: number;
  scratch: number;
  softLan: number;
  total: number;
}

export interface Profile {
  communityNickname: string; // 커뮤니티 닉네임 (#log-on)
  djName: string;
  iidxId: string;
  playCount: number; // プレー回数 (숫자만: "397回" → 397)
  notesRadar: { SP: RadarValues; DP: RadarValues };
  dan: { SP: Dan | null; DP: Dan | null }; // 段位認定 (미취득은 null)
  arenaClass: { SP: string; DP: string }; // アリーナクラス (미취득은 "---")
}

// window.__iidxData 에 실리는 최종 결과 (성적 + 프로필)
export interface FullResult extends CrawlResult {
  profile: Profile | null;
}

export interface ParsedPage {
  rows: SongEntry[];
  hasNext: boolean;
}

// 테스트에서 가짜 구현을 주입하기 쉽게, 사용하는 멤버만 요구한다.
export type FetchLike = (
  url: string,
  init?: { credentials?: RequestCredentials }
) => Promise<{
  ok: boolean;
  status: number;
  // 리다이렉트를 따라간 최종 URL. 베이직 코스 미구독(error.html 리다이렉트) 감지에 사용.
  url?: string;
  text: () => Promise<string>;
}>;

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

export interface ProfileCrawlOptions {
  origin?: string;
  fetchImpl?: FetchLike;
  onLog?: (text: string, cls?: LogClass) => void;
}

export type LogClass = "ok" | "warn" | "hi";

export interface UIHandle {
  host: HTMLElement;
  status: (text: string) => void;
  progress: (fraction: number) => void;
  counts: (sp: number, dp: number) => void;
  log: (text: string, cls?: LogClass) => void;
  done: (data: unknown) => void;
  fail: (msg?: string) => void; // 오류 상태(빨간 점)로 전환 + 선택적 상태 문구
}
