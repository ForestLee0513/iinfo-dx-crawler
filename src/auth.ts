import type { AuthStatus } from "./types";

// 로그인 여부 검증.
// 헤더에서 #id_nav_menu_3 + .ea-menu 가 동시에 적용된 div(내부에 .cl_old_h1 포함)를 찾고,
// 그 안의 <p> 속 konamiid 영역(span.cl_ea_variable_document[data-id="eavd_header_konamiid"])
// 내용이 비어 있으면 로그아웃, 채워져 있으면 로그인으로 판정한다.
export function checkLogin(doc: Document = document): AuthStatus {
  const menu = doc.querySelector<HTMLDivElement>("div#id_nav_menu_3.ea-menu");
  // .cl_old_h1 존재로 올바른 컨테이너인지 확인
  if (!menu || !menu.querySelector(".cl_old_h1")) {
    return { loggedIn: false, konamiId: null };
  }

  const konamiSpan = menu.querySelector(
    'p .cl_ea_variable_document[data-id="eavd_header_konamiid"]'
  );
  // 로그아웃 시 이 span 은 비어 있음(자식/텍스트 없음)
  const filled = !!konamiSpan && konamiSpan.textContent!.trim().length > 0;

  // KONAMI ID 텍스트는 .cl_pc_dsp 에 들어 있음 (로그인 시)
  let konamiId: string | null = null;
  if (filled) {
    const idEl = konamiSpan!.querySelector(".cl_nav_menu_span.cl_pc_dsp");
    const text = (idEl?.textContent || konamiSpan!.textContent || "").trim();
    konamiId = text || null;
  }

  return { loggedIn: filled, konamiId };
}
