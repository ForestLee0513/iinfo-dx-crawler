import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { showLoginRequired, openLoginForm } from "../src/ui";

describe("showLoginRequired", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("로그인 안내 패널과 로그인 버튼을 렌더링한다", () => {
    showLoginRequired();
    const host = document.getElementById("iidx-crawler-host");
    expect(host).toBeTruthy();
    const root = host!.shadowRoot!;
    expect(root.querySelector("#go")?.textContent).toContain("로그인");
    expect(root.textContent).toContain("로그인이 필요합니다");
    expect(root.textContent).toContain("다시 클릭");
  });

  it("재실행 시 기존 패널을 대체한다(중복 없음)", () => {
    showLoginRequired();
    showLoginRequired();
    expect(document.querySelectorAll("#iidx-crawler-host").length).toBe(1);
  });

  it("로그인 버튼 클릭 시 원본 사이트의 로그인 폼 함수를 호출하고 패널을 닫는다", () => {
    const show = vi.fn();
    window.ea_common_template = { login: { show_loginform: show } };
    showLoginRequired();
    (document.getElementById("iidx-crawler-host")!.shadowRoot!
      .getElementById("go") as HTMLElement).click();
    expect(show).toHaveBeenCalledTimes(1);
    expect(document.getElementById("iidx-crawler-host")).toBeNull();
    delete window.ea_common_template;
  });
});

describe("openLoginForm", () => {
  afterEach(() => {
    delete window.ea_common_template;
  });

  it("show_loginform 가 있으면 호출하고 true 를 반환한다", () => {
    const show = vi.fn();
    window.ea_common_template = { login: { show_loginform: show } };
    expect(openLoginForm()).toBe(true);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("함수가 없으면 false 를 반환한다(페이지 이동 없음)", () => {
    expect(openLoginForm()).toBe(false);
  });
});
