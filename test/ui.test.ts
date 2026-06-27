import { describe, it, expect, beforeEach } from "vitest";
import { showLoginRequired } from "../src/ui";

describe("showLoginRequired", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("로그인 안내 패널과 이동 버튼을 렌더링한다", () => {
    showLoginRequired("https://p.eagate.573.jp/gate/p/login.html");
    const host = document.getElementById("iidx-crawler-host");
    expect(host).toBeTruthy();
    const root = host!.shadowRoot!;
    expect(root.querySelector("#go")?.textContent).toContain("로그인 페이지로 이동");
    expect(root.textContent).toContain("로그인이 필요합니다");
    expect(root.textContent).toContain("다시 클릭");
  });

  it("재실행 시 기존 패널을 대체한다(중복 없음)", () => {
    showLoginRequired("https://x");
    showLoginRequired("https://x");
    expect(document.querySelectorAll("#iidx-crawler-host").length).toBe(1);
  });
});
