import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { checkLogin } from "../src/auth";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(__dirname, "fixtures", f), "utf8");
const docFrom = (html: string) => new JSDOM(html).window.document as unknown as Document;

describe("checkLogin", () => {
  it("로그인 상태를 감지하고 KONAMI ID 를 추출한다", () => {
    const res = checkLogin(docFrom(read("header-loggedin.html")));
    expect(res.loggedIn).toBe(true);
    expect(res.konamiId).toBe("fores_xwhap75k3cwjth");
  });

  it("로그아웃 상태(빈 konamiid span)를 감지한다", () => {
    const res = checkLogin(docFrom(read("header-loggedout.html")));
    expect(res.loggedIn).toBe(false);
    expect(res.konamiId).toBe(null);
  });

  it("헤더가 없으면 로그아웃으로 간주한다", () => {
    const res = checkLogin(docFrom("<!DOCTYPE html><body><div>no header</div></body>"));
    expect(res.loggedIn).toBe(false);
    expect(res.konamiId).toBe(null);
  });

  it("id 만 있고 .cl_old_h1 가 없으면 컨테이너로 인정하지 않는다", () => {
    const html =
      '<!DOCTYPE html><body><div id="id_nav_menu_3" class="ea-menu"><p>' +
      '<span class="cl_ea_variable_document" data-id="eavd_header_konamiid">x</span></p></div></body>';
    expect(checkLogin(docFrom(html)).loggedIn).toBe(false);
  });
});
