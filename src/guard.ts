// 크롤(수집) 중 실수로 페이지를 떠나면 주입 스크립트 컨텍스트가 통째로 사라진다.
// beforeunload 핸들러를 설치해 링크 클릭·새로고침·탭 닫기 시 브라우저 기본 확인창을
// 띄워 실수 이탈을 막는다. (진짜 이동을 강제로 막을 수는 없고 확인창만 띄울 수 있다.)
//
// 반환값은 가드 해제 함수. 수집이 끝나면(성공/실패) 반드시 호출해 해제한다.
type GuardTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export function installNavGuard(
  target: GuardTarget = window
): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    // 일부 브라우저는 returnValue 가 설정돼야 확인창을 띄운다. (메시지 내용은 무시됨)
    e.returnValue = "";
    return "";
  };
  target.addEventListener("beforeunload", handler as EventListener);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    target.removeEventListener("beforeunload", handler as EventListener);
  };
}
