import { describe, it, expect } from "vitest";
import { buildStyleCsv, CSV_HEADER } from "../src/csv";
import type { LevelBucket, SongEntry } from "../src/types";

// 편의: SongEntry 생성기
function song(
  title: string,
  difficulty: string,
  level: number,
  score: Partial<SongEntry["score"]> = {}
): SongEntry {
  return {
    title,
    difficulty,
    level,
    score: {
      lamp: null,
      exScore: null,
      grade: null,
      pgreat: null,
      great: null,
      ...score,
    },
  };
}

// CSV 한 줄 → 셀 배열 (따옴표 처리 없는 단순 케이스용)
function cells(line: string): string[] {
  return line.split(",");
}

describe("buildStyleCsv", () => {
  const byLevel: LevelBucket = {
    8: [
      song("Foo", "ANOTHER", 8, {
        lamp: "H-CLEAR",
        exScore: 1514,
        grade: "AAA",
        pgreat: 680,
        great: 154,
      }),
    ],
    4: [song("Foo", "NORMAL", 4, { lamp: "A-CLEAR", exScore: 335, grade: "B", pgreat: 129, great: 77 })],
    12: [song("Bar, Baz", "ANOTHER", 12)], // 미플레이 + 쉼표 타이틀
  };
  const csv = buildStyleCsv(byLevel);
  const lines = csv.replace(/^﻿/, "").trimEnd().split("\r\n");

  it("BOM 으로 시작한다", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("헤더가 41열이며 스키마와 일치", () => {
    expect(cells(lines[0]).length).toBe(41);
    expect(cells(lines[0])).toEqual(CSV_HEADER);
  });

  it("타이틀 기준 오름차순 정렬 (곡 수 = 행 수)", () => {
    expect(lines.length).toBe(1 + 2); // 헤더 + Bar,Baz + Foo
    // "Bar, Baz" 는 쉼표 때문에 따옴표로 감싸진다
    expect(lines[1].startsWith('-,"Bar, Baz",-,-,-,')).toBe(true);
  });

  it("여러 난이도 차트를 한 행에 병합한다", () => {
    const foo = cells(lines[2]);
    // NORMAL 컬럼(12~18): 難易度4, スコア335, PGreat129, Great77, ミス-, ASSIST CLEAR, B
    expect(foo.slice(12, 19)).toEqual(["4", "335", "129", "77", "-", "ASSIST CLEAR", "B"]);
    // ANOTHER 컬럼(26~32): 難易度8, スコア1514, 680, 154, -, HARD CLEAR, AAA
    expect(foo.slice(26, 33)).toEqual(["8", "1514", "680", "154", "-", "HARD CLEAR", "AAA"]);
    // BEGINNER(5~11)는 차트 없음 → 0/0/0/0/-/NO PLAY/---
    expect(foo.slice(5, 12)).toEqual(["0", "0", "0", "0", "-", "NO PLAY", "---"]);
  });

  it("곡 단위 미수집 컬럼은 '-' (버전/장르/아티스트/플레이횟수/최종플레이일시)", () => {
    const foo = cells(lines[2]);
    expect(foo[0]).toBe("-"); // 버전
    expect(foo[2]).toBe("-"); // 장르
    expect(foo[3]).toBe("-"); // 아티스트
    expect(foo[4]).toBe("-"); // 플레이횟수
    expect(foo[40]).toBe("-"); // 최종플레이일시
  });
});
