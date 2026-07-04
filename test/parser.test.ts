import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { baseName, parseRow, parseDoc } from "../src/parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleHtml = readFileSync(join(__dirname, "fixtures/sample.html"), "utf8");
const docFrom = (html: string) => new JSDOM(html).window.document as unknown as Document;

describe("baseName", () => {
  it("이미지 src 에서 확장자 제거", () => {
    expect(baseName("./files/AAA.gif")).toBe("AAA");
    expect(baseName("https://x/clflg5.gif?y=1")).toBe("clflg5");
    expect(baseName("")).toBe("");
  });
});

describe("parseDoc (실제 fixture)", () => {
  const { rows, hasNext } = parseDoc(docFrom(sampleHtml));

  it("50곡을 파싱한다", () => {
    expect(rows.length).toBe(50);
  });

  it("navi-next 가 감지된다", () => {
    expect(hasNext).toBe(true);
  });

  it("첫 곡 구조가 스키마와 일치", () => {
    expect(rows[0]).toEqual({
      title: "Astra Blaze",
      difficulty: "ANOTHER",
      score: { lamp: "FAILED", exScore: 2076, grade: "B", pgreat: 783, great: 510 },
    });
  });

  it("램프가 모두 알려진 값", () => {
    const allowed = new Set([
      "NO-PLAY", "FAILED", "A-CLEAR", "E-CLEAR", "CLEAR", "H-CLEAR", "EXH-CLEAR", "F-COMBO",
    ]);
    for (const r of rows) expect(allowed.has(r.score.lamp as string)).toBe(true);
  });

  it("알파벳 점수는 F~AAA 또는 null", () => {
    const allowed = new Set(["F", "E", "D", "C", "B", "A", "AA", "AAA", null]);
    for (const r of rows) expect(allowed.has(r.score.grade as string)).toBe(true);
  });

  it("EX 점수는 정수 또는 null", () => {
    for (const r of rows) {
      const v = r.score.exScore;
      expect(v === null || Number.isInteger(v)).toBe(true);
    }
  });
});

describe("parseRow", () => {
  it("데이터 행이 아니면 null", () => {
    const doc = docFrom("<table><tr><th colspan='5'>SP LEVEL 12</th></tr></table>");
    const tr = doc.querySelector("tr")!;
    expect(parseRow(tr)).toBe(null);
  });
});
