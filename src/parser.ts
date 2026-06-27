import { LAMP, GRADES } from "./constants";
import type { Grade, Lamp, ParsedPage, SongEntry } from "./types";

// 이미지 src 에서 파일명(확장자 제거)만 추출
export function baseName(src: string | null | undefined): string {
  if (!src) return "";
  const name = src.split("?")[0].split("/").pop() || "";
  return name.replace(/\.[a-z0-9]+$/i, "");
}

// <tr> 한 행 → 데이터 객체 (데이터 행이 아니면 null)
export function parseRow(tr: Element): SongEntry | null {
  const link = tr.querySelector("a.music_info");
  if (!link) return null; // 헤더(th)·여백 행 제외

  const tds = tr.querySelectorAll("td");
  if (tds.length < 5) return null;

  const title = (link.textContent || "").trim();
  const difficulty = (tds[1].textContent || "").trim();

  // 알파벳 점수: 이미지 파일명(F~AAA), 없거나 미인정이면 null
  const gImg = tds[2].querySelector("img");
  const gradeName = gImg ? baseName(gImg.getAttribute("src")) : "";
  const grade: Grade | null = (GRADES as string[]).includes(gradeName)
    ? (gradeName as Grade)
    : null;

  // 숫자 점수: <br> 앞의 정수 (EX SCORE), 없으면 null
  const m = (tds[3].textContent || "").trim().match(/\d+/);
  const exScore = m ? parseInt(m[0], 10) : null;

  // 램프: clflg<n>.gif
  const lImg = tds[4].querySelector("img");
  let lamp: Lamp | null = null;
  if (lImg) {
    const lm = baseName(lImg.getAttribute("src")).match(/clflg(\d+)/i);
    if (lm) lamp = LAMP[parseInt(lm[1], 10)] ?? null;
  }

  return { title, difficulty, score: { lamp, exScore, grade } };
}

// 문서 전체 → { rows, hasNext }
export function parseDoc(doc: Document): ParsedPage {
  const rows: SongEntry[] = [];
  doc.querySelectorAll("div.series-difficulty table tr").forEach((tr) => {
    const r = parseRow(tr);
    if (r) rows.push(r);
  });
  const hasNext = !!doc.querySelector(".navi-next a");
  return { rows, hasNext };
}
