import { LAMP, GRADES, DAN } from "./constants";
import type {
  Dan,
  Grade,
  Lamp,
  ParsedPage,
  Profile,
  RadarValues,
  SongEntry,
} from "./types";

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

// ── 프로필 파싱 (djdata/status.html) ──
// 키는 영어로, 값은 원본(일본어) 표기를 그대로 보존한다.

// 요소의 trim 된 텍스트
function txt(el: Element | null | undefined): string {
  return (el?.textContent || "").trim();
}

// 문자열에서 첫 숫자(콤마 제거, 소수 허용)를 추출. 없으면 0.
function numFrom(s: string): number {
  const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

// .dj-rank 섹션들 중 .cat-name 이 keyword 로 시작/포함하는 것을 찾는다.
function findSection(root: Element, keyword: string): Element | null {
  const ranks = Array.from(root.querySelectorAll(".dj-rank"));
  return (
    ranks.find((r) => txt(r.querySelector(".cat-name")).includes(keyword)) ||
    null
  );
}

// .dj-profile 표를 라벨(일본어) → 값 셀(td) 맵으로 변환
function profileTable(root: Element): Map<string, Element> {
  const map = new Map<string, Element>();
  root.querySelectorAll(".dj-profile table tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 2) map.set(txt(tds[0]), tds[1]);
  });
  return map;
}

// 노츠레이더 <ul>(NOTES…합계 순) → RadarValues
function parseRadar(ul: Element | null | undefined): RadarValues {
  const v: number[] = [];
  ul?.querySelectorAll("li").forEach((li) => {
    const ps = li.querySelectorAll("p");
    v.push(numFrom(txt(ps[1])));
  });
  return {
    notes: v[0] ?? 0,
    chord: v[1] ?? 0,
    peak: v[2] ?? 0,
    charge: v[3] ?? 0,
    scratch: v[4] ?? 0,
    softLan: v[5] ?? 0,
    total: v[6] ?? 0,
  };
}

// SP/DP 두 .rank-cat 의 "값 div"(두 번째 직계 div) 텍스트를 뽑는다. (段位認定/アリーナクラス)
function spDpRankCat(section: Element | null): { SP: string; DP: string } {
  const out = { SP: "", DP: "" };
  section?.querySelectorAll(".rank-cat").forEach((rc) => {
    const style = txt(rc.querySelector("div span"));
    const valDiv = rc.querySelectorAll(":scope > div")[1];
    if (style === "SP" || style === "DP") out[style] = txt(valDiv);
  });
  return out;
}

// 段位認定 라벨 → Dan enum. 미취득("--"/"---" 등 매핑에 없는 값)은 null.
function toDan(label: string): Dan | null {
  return DAN[label] ?? null;
}

// 문서 → Profile. .dj-status 가 없으면 null.
export function parseProfile(doc: Document): Profile | null {
  const root = doc.querySelector(".dj-status");
  if (!root) return null;

  // 커뮤니티 닉네임: 헤더(#log-on)의 on-name 목록에서 추출
  let communityNickname = "";
  doc.querySelectorAll("#log-on .on-name").forEach((ul) => {
    const lis = ul.querySelectorAll("li");
    if (txt(lis[0]).includes("ニックネーム")) communityNickname = txt(lis[1]);
  });

  // 기본 프로필 표 (DJ NAME / IIDX ID / プレー回数)
  const t = profileTable(root);
  const djName = txt(t.get("DJ NAME"));
  const iidxId = txt(t.get("IIDX ID"));
  const playCount = numFrom(txt(t.get("プレー回数"))); // "397回" → 397

  // 노츠레이더 (SP/DP)
  const radar: { SP: RadarValues; DP: RadarValues } = {
    SP: parseRadar(null),
    DP: parseRadar(null),
  };
  findSection(root, "ノーツレーダー")
    ?.querySelectorAll(".rank-cat")
    .forEach((rc) => {
      const style = txt(rc.querySelector("div span"));
      if (style === "SP" || style === "DP")
        radar[style] = parseRadar(rc.querySelector("ul"));
    });

  // 段位認定: 라벨을 Dan enum 으로 매핑 (미취득은 null)
  const danRaw = spDpRankCat(findSection(root, "段位認定"));

  return {
    communityNickname,
    djName,
    iidxId,
    playCount,
    notesRadar: radar,
    dan: { SP: toDan(danRaw.SP), DP: toDan(danRaw.DP) },
    arenaClass: spDpRankCat(findSection(root, "アリーナクラス")),
  };
}
