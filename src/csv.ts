import { CSV_DIFFICULTIES, CLEAR_TYPE_CSV } from "./constants";
import type { LevelBucket, SongEntry } from "./types";

// eagate "스코어데이터" CSV 형식으로 변환한다. (곡당 1행 · 5개 난이도 컬럼)
//
// difficulty 페이지에서 얻을 수 없는 곡 단위 컬럼(버전/장르/아티스트/플레이횟수/
// 최종플레이일시)과 미스카운트는 데이터가 없으므로 전부 '-' 로 채운다.
// 존재하지 않는 난이도 슬롯은 eagate 원본과 동일하게 0 / NO PLAY / --- 로 표기한다.

const DASH = "-";
const BOM = "\uFEFF"; // Excel 이 UTF-8 로 인식하게 하는 바이트 순서 표식

// 난이도별 반복 컬럼
const PER_DIFF = [
  "難易度",
  "スコア",
  "PGreat",
  "Great",
  "ミスカウント",
  "クリアタイプ",
  "DJ LEVEL",
];

// 41열 헤더 (버전/타이틀/장르/아티스트/플레이횟수 + 난이도×7 + 최종플레이일시)
export const CSV_HEADER: string[] = [
  "バージョン",
  "タイトル",
  "ジャンル",
  "アーティスト",
  "プレー回数",
  ...CSV_DIFFICULTIES.flatMap((d) => PER_DIFF.map((p) => d + " " + p)),
  "最終プレー日時",
];

// CSV 필드 이스케이프: 쉼표·따옴표·개행 포함 시 "" 로 감싸고 내부 " 는 "" 로.
function csvField(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// 한 style(레벨 버킷) → 타이틀별 { 난이도라벨 → SongEntry } 그룹.
// 곡당 난이도 라벨은 유일하므로 라벨을 컬럼 키로 쓴다.
// (동명 이곡은 드물게 병합될 수 있으나, 더 나은 키가 없어 타이틀로 묶는다.)
function groupByTitle(byLevel: LevelBucket): Map<string, Map<string, SongEntry>> {
  const groups = new Map<string, Map<string, SongEntry>>();
  for (const arr of Object.values(byLevel)) {
    for (const e of arr) {
      let m = groups.get(e.title);
      if (!m) {
        m = new Map();
        groups.set(e.title, m);
      }
      m.set(e.difficulty, e);
    }
  }
  return groups;
}

// 한 난이도 슬롯 → CSV 셀 7개
function diffCells(e: SongEntry | undefined): (string | number)[] {
  if (!e) return [0, 0, 0, 0, DASH, "NO PLAY", "---"];
  return [
    e.level ?? 0,
    e.score.exScore ?? 0,
    e.score.pgreat ?? 0,
    e.score.great ?? 0,
    DASH, // 미스카운트: difficulty 페이지에 없음
    e.score.lamp ? CLEAR_TYPE_CSV[e.score.lamp] : "NO PLAY",
    e.score.grade ?? "---",
  ];
}

// 한 style(SP 또는 DP)의 레벨 버킷 → CSV 문자열 (UTF-8 BOM + CRLF).
// Excel 호환을 위해 BOM 을 붙이고 줄바꿈은 CRLF 로 맞춘다.
export function buildStyleCsv(byLevel: LevelBucket): string {
  const groups = groupByTitle(byLevel);
  const titles = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  const lines = [CSV_HEADER.map(csvField).join(",")];
  for (const title of titles) {
    const charts = groups.get(title)!;
    const cells: (string | number)[] = [DASH, title, DASH, DASH, DASH];
    for (const diff of CSV_DIFFICULTIES) cells.push(...diffCells(charts.get(diff)));
    cells.push(DASH); // 최종플레이일시
    lines.push(cells.map(csvField).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}
