import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { parseProfile } from "../src/parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const statusHtml = readFileSync(join(__dirname, "fixtures/status.html"), "utf8");
const docFrom = (html: string) =>
  new JSDOM(html).window.document as unknown as Document;

describe("parseProfile (실제 status fixture)", () => {
  const profile = parseProfile(docFrom(statusHtml))!;

  it(".dj-status 가 있으면 객체를 반환", () => {
    expect(profile).not.toBeNull();
  });

  it("기본 정보 — 키는 영어, 값은 원본(일본어) 유지", () => {
    expect(profile.communityNickname).toBe("ForestLee");
    expect(profile.djName).toBe("FRST-E");
    expect(profile.iidxId).toBe("5858-2916");
    expect(profile.playCount).toBe(397); // "397回" → 397 (숫자만)
  });

  it("노츠레이더 SP/DP 합계", () => {
    expect(profile.notesRadar.SP).toEqual({
      notes: 108.18,
      chord: 112.98,
      peak: 111.02,
      charge: 126.15,
      scratch: 119.04,
      softLan: 112.33,
      total: 689.7,
    });
    expect(profile.notesRadar.DP.total).toBe(0.19);
  });

  it("段位認定은 Dan enum 으로, 미취득은 null", () => {
    expect(profile.dan).toEqual({ SP: "10TH_DAN", DP: null });
  });

  it("アリーナクラス — 원본 그대로(미취득 '---')", () => {
    expect(profile.arenaClass).toEqual({ SP: "B4", DP: "---" });
  });

  it("제외 필드는 객체에 존재하지 않는다", () => {
    for (const key of [
      "area",
      "lime",
      "tension",
      "vDisc",
      "medals",
      "djPoint",
      "weeklyRankingRating",
      "pilgrimage",
      "comment",
    ]) {
      expect(profile).not.toHaveProperty(key);
    }
  });
});

describe("parseProfile (빈 문서)", () => {
  it(".dj-status 가 없으면 null", () => {
    expect(parseProfile(docFrom("<div>nope</div>"))).toBeNull();
  });
});
